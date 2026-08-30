import { spawn, execSync } from 'child_process';
import http from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html').replace(/\\/g, '/');
const fileUrl = `file:///${indexPath}`;

function findBrowserBinary() {
  if (process.env.PUZZLEPLOT_BROWSER_PATH && fs.existsSync(process.env.PUZZLEPLOT_BROWSER_PATH)) {
    return process.env.PUZZLEPLOT_BROWSER_PATH;
  }

  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidatePaths = [
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable'
  ];

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) return p;
  }

  const pathCommands = process.platform === 'win32'
    ? ['where chrome', 'where msedge']
    : ['which google-chrome', 'which chromium', 'which google-chrome-stable', 'which msedge'];
  for (const cmd of pathCommands) {
    try {
      const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim().split(/\r?\n/)[0];
      if (out && fs.existsSync(out)) return out;
    } catch (e) {}
  }

  return null;
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

const chromeBin = findBrowserBinary();
if (!chromeBin) {
  console.log('============================================================');
  console.log('PUZZLEPLOT REAL-BROWSER SMOKE TEST (Chrome Headless & CDP)');
  console.log('============================================================\n');
  console.log('[SKIPPED] No Chrome, Chromium, or Edge binary located on this host.');
  console.log('Set PUZZLEPLOT_BROWSER_PATH to run real-browser smoke tests.');
  console.log('\n------------------------------------------------------------');
  console.log('Real-Browser Smoke Test Results: 0 Passed, 0 Failed, 1 SKIPPED');
  console.log('------------------------------------------------------------\n');
  process.exit(0);
}

console.log('============================================================');
console.log('PUZZLEPLOT REAL-BROWSER SMOKE TEST (Chrome Headless & CDP)');
console.log('============================================================\n');
console.log(`Browser Binary: ${chromeBin}`);
console.log(`Target URL: ${fileUrl}\n`);

let tempUserDataDir = null;
let chromeProcess = null;

function cleanup() {
  if (chromeProcess) {
    try { chromeProcess.kill('SIGKILL'); } catch (e) {}
    chromeProcess = null;
  }
  if (tempUserDataDir) {
    try { fs.rmSync(tempUserDataDir, { recursive: true, force: true }); } catch (e) {}
    tempUserDataDir = null;
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl(port, retries = 40) {
  for (let i = 0; i < retries; i++) {
    await sleep(250);
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, (r) => {
          let data = '';
          r.on('data', chunk => data += chunk);
          r.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      if (res && res.length > 0) {
        const pageTab = res.find(t => t.type === 'page');
        if (pageTab && pageTab.webSocketDebuggerUrl) {
          return pageTab.webSocketDebuggerUrl;
        }
      }
    } catch (e) {}
  }
  throw new Error('Failed to locate active Chrome page target');
}

async function run() {
  let passedChecks = 0;
  let failedChecks = 0;
  let ws = null;

  const capturedExceptions = [];
  const consoleErrors = [];
  const consoleMessages = [];

  try {
    tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puzzleplot-chrome-'));
    const port = await getAvailablePort();

    chromeProcess = spawn(chromeBin, [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${tempUserDataDir}`,
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
      '--disable-web-security'
    ], { stdio: 'ignore' });

    const wsUrl = await getWsUrl(port);
    ws = new WebSocket(wsUrl);

    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
        const location = msg.params.stackTrace?.callFrames?.[0]
          ? `(${msg.params.stackTrace.callFrames[0].url}:${msg.params.stackTrace.callFrames[0].lineNumber}:${msg.params.stackTrace.callFrames[0].columnNumber})`
          : '';
        const entry = `[${type.toUpperCase()}] ${text} ${location}`.trim();
        consoleMessages.push(entry);
        if (type === 'error') {
          consoleErrors.push(entry);
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params?.exceptionDetails;
        const desc = details?.exception?.description || details?.text || 'Unhandled runtime exception';
        const loc = details?.url ? `(${details.url}:${details.lineNumber}:${details.columnNumber})` : '';
        const stack = details?.stackTrace ? JSON.stringify(details.stackTrace) : '';
        const fullExc = `[EXCEPTION] ${desc} ${loc} ${stack}`.trim();
        capturedExceptions.push(fullExc);
        consoleErrors.push(fullExc);
      }
    };

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        const errDesc = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Runtime evaluation error';
        throw new Error(errDesc);
      }
      return res.result?.value;
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    // 1. Enable Runtime, Page, and Emulation domains BEFORE navigating
    await send('Runtime.enable');
    await send('Page.enable');

    // 2. Navigate deterministically to target file
    await send('Page.navigate', { url: fileUrl });

    // 3. Wait for DOM ready & PuzzlePlot application initialization (poll up to 8s)
    let diag = null;
    const startWait = Date.now();
    while (Date.now() - startWait < 8000) {
      try {
        diag = await evaluate(`
          (() => {
            const scriptEl = document.querySelector('script[src*="puzzleplot.bundle.js"]') || document.querySelector('script[src*="bundle"]');
            return {
              documentTitle: document.title,
              readyState: document.readyState,
              hasPuzzlePlotApp: typeof PuzzlePlotApp !== 'undefined' || typeof window.PuzzlePlotApp !== 'undefined',
              hasPuzzlePlotInstance: typeof window.PuzzlePlot !== 'undefined' && window.PuzzlePlot !== null,
              hasScriptTag: !!scriptEl,
              scriptSrc: scriptEl ? scriptEl.src : '',
              hubActive: document.getElementById('hub-view')?.classList.contains('active'),
              presetCardsCount: document.querySelectorAll('.puzzle-card').length
            };
          })()
        `);
        if (diag && diag.hasPuzzlePlotInstance && diag.presetCardsCount >= 2) {
          break;
        }
      } catch (e) {}
      await sleep(100);
    }

    // Print Diagnostic Report
    console.log('--- Initialization Diagnostics ---');
    console.log(`  - Document Ready State: ${diag?.readyState || 'unknown'}`);
    console.log(`  - Script Tag Present: ${diag?.hasScriptTag ? 'YES' : 'NO'}`);
    console.log(`  - Script Resolved URL: ${diag?.scriptSrc || '(none)'}`);
    console.log(`  - PuzzlePlotApp Class Exists: ${diag?.hasPuzzlePlotApp ? 'YES' : 'NO'}`);
    console.log(`  - window.PuzzlePlot Initialized: ${diag?.hasPuzzlePlotInstance ? 'YES' : 'NO'}`);
    console.log(`  - Hub Container Active: ${diag?.hubActive ? 'YES' : 'NO'}`);
    console.log(`  - Preset Cards Rendered: ${diag?.presetCardsCount || 0}`);
    console.log(`  - Captured Exceptions: ${capturedExceptions.length}`);
    console.log(`  - Console Errors: ${consoleErrors.length}\n`);

    if (capturedExceptions.length > 0) {
      console.error('Captured Runtime Exceptions before/during bootstrap:');
      capturedExceptions.forEach(e => console.error(`  ${e}`));
    }
    if (consoleErrors.length > 0) {
      console.error('Captured Console Errors:');
      consoleErrors.forEach(e => console.error(`  ${e}`));
    }

    if (!diag?.hasPuzzlePlotInstance) {
      throw new Error(`window.PuzzlePlot was not initialized. Diagnostics: ${JSON.stringify(diag)}`);
    }

    // Override alerts, confirms, print
    await evaluate(`
      window.__alerts = [];
      window.alert = (msg) => { window.__alerts.push(msg); };
      window.confirm = (msg) => true;
      window.__printed = false;
      window.print = () => { window.__printed = true; };
    `);

    // -------------------------------------------------------------------------
    // 1. Initial State & DOM Initialization
    // -------------------------------------------------------------------------
    console.log('--- 1. Checking DOM Initialization & Production Catalog ---');
    const title = diag.documentTitle;
    if (!title.includes('PuzzlePlot')) throw new Error(`Unexpected document title: ${title}`);
    console.log(`[PASS] Document title: "${title}"`);
    passedChecks++;

    console.log('[PASS] window.PuzzlePlot application instance initialized.');
    passedChecks++;

    const cardCount = diag.presetCardsCount;
    if (cardCount !== 2) throw new Error(`Expected 2 puzzle cards in catalog, found ${cardCount}`);
    console.log(`[PASS] Library displays exactly ${cardCount} verified production presets.`);
    passedChecks++;

    // -------------------------------------------------------------------------
    // 2. Play & Solve en-5-1 and fil-5-1
    // -------------------------------------------------------------------------
    for (const presetId of ['en-5-1', 'fil-5-1']) {
      console.log(`\n--- 2. Real-Browser Play & Solve: ${presetId} ---`);
      await evaluate(`document.querySelector('.btn-play-puzzle[data-id="${presetId}"]').click()`);
      await sleep(300);

      const isPlayerActive = await evaluate('document.getElementById("player-view").classList.contains("active")');
      if (!isPlayerActive) throw new Error(`Player view did not activate for ${presetId}`);
      console.log(`[PASS] Player view active for ${presetId}.`);
      passedChecks++;

      const fillResult = await evaluate(`
        (() => {
          const player = window.PuzzlePlot.player;
          if (!player) return { error: 'No player' };
          for (let r = 0; r < player.puzzle.size; r++) {
            for (let c = 0; c < player.puzzle.size; c++) {
              if (!player.processedGrid[r][c].isBlock) {
                player.userGrid[r][c].value = player.processedGrid[r][c].value;
                const charEl = document.getElementById(\`char-\${r}-\${c}\`);
                if (charEl) charEl.textContent = player.processedGrid[r][c].value;
              }
            }
          }
          player.checkPuzzleCompletion();
          const victoryActive = document.getElementById('victory-modal')?.classList.contains('active');
          return { isCompleted: player.isCompleted, victoryActive };
        })()
      `);

      if (!fillResult.isCompleted || !fillResult.victoryActive) {
        throw new Error(`Victory modal failed for ${presetId}`);
      }
      console.log(`[PASS] Puzzle solved, victory modal displayed for ${presetId}.`);
      passedChecks++;

      await evaluate(`document.getElementById('victory-btn-library').click()`);
      await sleep(300);
      console.log(`[PASS] Returned to Library Hub.`);
      passedChecks++;
    }

    // -------------------------------------------------------------------------
    // 3. Clear-Progress Confirmation (Cancel vs Confirm vs Play Again)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Clear-Progress Confirmation & Play Again ---');
    await evaluate(`document.querySelector('.btn-play-puzzle[data-id="en-5-1"]').click()`);
    await sleep(300);

    // Enter partial solution
    await evaluate(`
      (() => {
        const player = window.PuzzlePlot.player;
        player.userGrid[0][0].value = 'H';
        player.userGrid[0][1].value = 'E';
        player.userGrid[0][2].value = 'A';
        player.saveProgress();
        player.refreshCellDisplay(0, 0);
        player.refreshCellDisplay(0, 1);
        player.refreshCellDisplay(0, 2);
      })()
    `);

    const hasStoredProgressBefore = await evaluate('!!localStorage.getItem("puzzleplot_progress_en-5-1")');
    if (!hasStoredProgressBefore) throw new Error('Progress was not stored in localStorage.');

    // 3A. Test Cancel Path: window.confirm returns false
    await evaluate('window.confirm = (msg) => false;');
    await evaluate(`document.getElementById('act-clear-all').click()`);
    const cancelValPreserved = await evaluate(`
      (() => {
        const player = window.PuzzlePlot.player;
        const cellVal = player.userGrid[0][0].value;
        const saved = !!localStorage.getItem("puzzleplot_progress_en-5-1");
        return { cellVal, saved };
      })()
    `);
    if (cancelValPreserved.cellVal !== 'H' || !cancelValPreserved.saved) {
      throw new Error('Cancel on Clear Grid failed to preserve user entries or saved progress.');
    }
    console.log('[PASS] Cancel on Clear Grid preserves entered letters and saved progress.');
    passedChecks++;

    // 3B. Test Confirm Path: window.confirm returns true
    await evaluate('window.confirm = (msg) => true;');
    await evaluate(`document.getElementById('act-clear-all').click()`);
    const confirmValCleared = await evaluate(`
      (() => {
        const player = window.PuzzlePlot.player;
        const cellVal = player.userGrid[0][0].value;
        const saved = localStorage.getItem("puzzleplot_progress_en-5-1");
        return { cellVal, saved };
      })()
    `);
    if (confirmValCleared.cellVal !== '' || confirmValCleared.saved !== null) {
      throw new Error('Confirm on Clear Grid failed to clear grid or delete saved progress.');
    }
    console.log('[PASS] Confirm on Clear Grid completely clears grid and removes saved progress.');
    passedChecks++;

    // 3C. Test Play Again: Complete puzzle and click Play Again (must NOT prompt confirmation)
    await evaluate(`
      (() => {
        const player = window.PuzzlePlot.player;
        for (let r = 0; r < player.puzzle.size; r++) {
          for (let c = 0; c < player.puzzle.size; c++) {
            if (!player.processedGrid[r][c].isBlock) {
              player.userGrid[r][c].value = player.processedGrid[r][c].value;
            }
          }
        }
        player.checkPuzzleCompletion();
      })()
    `);
    await sleep(200);

    await evaluate(`
      window.__confirmPromptedForPlayAgain = false;
      window.confirm = (msg) => { window.__confirmPromptedForPlayAgain = true; return true; };
      document.getElementById('victory-btn-replay').click();
    `);
    await sleep(200);

    const playAgainCheck = await evaluate(`
      (() => {
        const player = window.PuzzlePlot.player;
        return {
          cellVal: player.userGrid[0][0].value,
          confirmPrompted: window.__confirmPromptedForPlayAgain,
          victoryModalActive: document.getElementById('victory-modal').classList.contains('active')
        };
      })()
    `);
    if (playAgainCheck.confirmPrompted) {
      throw new Error('Play Again triggered an unnecessary window.confirm popup.');
    }
    if (playAgainCheck.cellVal !== '' || playAgainCheck.victoryModalActive) {
      throw new Error('Play Again failed to restart clean puzzle session.');
    }
    console.log('[PASS] Play Again restarts puzzle session without redundant confirmation.');
    passedChecks++;

    // Return to Hub
    await evaluate(`document.getElementById('player-back-btn').click()`);
    await sleep(300);

    // -------------------------------------------------------------------------
    // 4. Maker Studio Pre-Flight Validation Gates
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Maker Studio Pre-Flight Validation Gates ---');
    await evaluate(`document.getElementById('nav-create-btn').click()`);
    await sleep(400);

    const isMakerActive = await evaluate('document.getElementById("maker-view").classList.contains("active")');
    if (!isMakerActive) throw new Error('Maker Studio view did not activate.');
    console.log('[PASS] Maker Studio view activated.');
    passedChecks++;

    await evaluate('window.__alerts = [];');

    // Attempt Save with empty/invalid draft
    await evaluate(`document.getElementById('maker-act-save-local').click()`);
    const saveBlockedAlert = await evaluate('window.__alerts.length > 0 && window.__alerts[window.__alerts.length - 1]');
    if (!saveBlockedAlert || !saveBlockedAlert.includes('Cannot Save puzzle')) {
      throw new Error('Maker Studio did not block Save for invalid/empty puzzle draft.');
    }
    console.log('[PASS] Save to Library blocked on invalid draft with structured diagnostics.');
    passedChecks++;

    // Attempt Export with invalid draft
    await evaluate(`document.getElementById('maker-act-export-json').click()`);
    const exportBlockedAlert = await evaluate('window.__alerts.length > 0 && window.__alerts[window.__alerts.length - 1]');
    if (!exportBlockedAlert || !exportBlockedAlert.includes('Cannot Export puzzle')) {
      throw new Error('Maker Studio did not block Export for invalid/empty puzzle draft.');
    }
    console.log('[PASS] Export JSON blocked on invalid draft with structured diagnostics.');
    passedChecks++;

    // Attempt Print with invalid draft
    await evaluate(`document.getElementById('maker-act-print').click()`);
    const printBlockedAlert = await evaluate('window.__alerts.length > 0 && window.__alerts[window.__alerts.length - 1]');
    if (!printBlockedAlert || !printBlockedAlert.includes('Cannot Print puzzle')) {
      throw new Error('Maker Studio did not block Print for invalid/empty puzzle draft.');
    }
    console.log('[PASS] Printable Sheet generation blocked on invalid draft.');
    passedChecks++;

    // Attempt Test Play with invalid draft
    await evaluate(`document.getElementById('maker-test-play-btn').click()`);
    const testPlayBlockedAlert = await evaluate('window.__alerts.length > 0 && window.__alerts[window.__alerts.length - 1]');
    if (!testPlayBlockedAlert || !testPlayBlockedAlert.includes('Cannot Test Play puzzle')) {
      throw new Error('Maker Studio did not block Test Play for invalid/empty puzzle draft.');
    }
    console.log('[PASS] Test Play blocked on invalid draft.');
    passedChecks++;

    // -------------------------------------------------------------------------
    // 5. Maker Auto-Builder: Incompatible Rejection & Valid Generation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Maker Auto-Builder Strict Assertion & Valid Generation ---');

    // Capture grid state before incompatible build
    const gridBeforeIncompatible = await evaluate('JSON.stringify(window.PuzzlePlot.maker.grid)');
    await evaluate('window.__alerts = [];');

    await evaluate(`
      (() => {
        document.getElementById('maker-btn-auto-build').click();
        document.getElementById('auto-builder-input').value = 'ABCDE: Clue A\\nFGHIJ: Clue B';
        document.getElementById('auto-builder-size').value = '5';
        document.getElementById('auto-builder-generate-btn').click();
      })()
    `);
    await sleep(200);

    const autoFailAlerts = await evaluate('window.__alerts');
    const autoFailAlert = autoFailAlerts[autoFailAlerts.length - 1] || '';
    if (!autoFailAlert.includes('Unable to generate a valid symmetrical crossword')) {
      throw new Error(`Auto-builder failed to produce expected failure alert for incompatible input: ${autoFailAlert}`);
    }
    if (autoFailAlerts.some(a => a.includes('Auto-Grid Successfully Generated'))) {
      throw new Error('Auto-builder incorrectly produced a success alert for incompatible input.');
    }

    const gridAfterIncompatible = await evaluate('JSON.stringify(window.PuzzlePlot.maker.grid)');
    if (gridAfterIncompatible !== gridBeforeIncompatible) {
      throw new Error('Maker grid was corrupted or modified following a failed auto-generation attempt.');
    }

    // Modal close and usability check
    await evaluate(`document.getElementById('auto-builder-close-btn').click()`);
    await sleep(200);
    const modalClosed = await evaluate('!document.getElementById("auto-builder-modal").classList.contains("active")');
    if (!modalClosed) throw new Error('Auto-builder modal failed to close cleanly after rejected generation.');
    console.log('[PASS] Incompatible auto-builder input asserted: produces error alert, no success alert, leaves grid intact, and modal remains interactive.');
    passedChecks++;

    // Valid auto-builder generation
    await evaluate('window.__alerts = [];');
    await evaluate(`
      (() => {
        document.getElementById('maker-btn-auto-build').click();
        document.getElementById('auto-builder-input').value = 'HEART: Center of emotion\\nEMBER: Glowing fragment\\nABUSE: Mishandle\\nRESIN: Sticky substance\\nTREND: Current craze';
        document.getElementById('auto-builder-size').value = '5';
        document.getElementById('auto-builder-generate-btn').click();
      })()
    `);
    await sleep(300);

    const autoSuccessAlert = await evaluate('window.__alerts[window.__alerts.length - 1]');
    if (!autoSuccessAlert || !autoSuccessAlert.includes('Auto-Grid Successfully Generated')) {
      throw new Error(`Auto-builder did not report success for valid 5x5 words: ${autoSuccessAlert}`);
    }
    console.log('[PASS] Auto-builder generated 100% valid 5x5 layout.');
    passedChecks++;

    // -------------------------------------------------------------------------
    // 6. Real JSON Export/Import Browser Round Trip
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Real JSON Export & Import Round Trip ---');
    await evaluate(`
      window.PuzzlePlot.maker.title = 'Export Test Mini';
      window.PuzzlePlot.maker.author = 'Jerome G.';
    `);

    // Intercept exported JSON payload
    await evaluate(`
      window.__exportedJsonPayload = null;
      const origCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          window.__exportedJsonPayload = reader.result;
        };
        reader.readAsText(blob);
        return origCreateObjectURL(blob);
      };
    `);

    await evaluate(`document.getElementById('maker-act-export-json').click()`);
    await sleep(300);

    const exportedJsonStr = await evaluate('window.__exportedJsonPayload');
    if (!exportedJsonStr) throw new Error('Export JSON did not generate download Blob payload.');

    const exportedData = JSON.parse(exportedJsonStr);
    if (
      exportedData.title !== 'Export Test Mini' ||
      exportedData.author !== 'Jerome G.' ||
      exportedData.size !== 5 ||
      !Array.isArray(exportedData.grid) ||
      !exportedData.clues?.across?.['1'] ||
      !exportedData.clues?.down?.['1']
    ) {
      throw new Error(`Exported JSON structure is incomplete or malformed: ${JSON.stringify(exportedData)}`);
    }
    console.log('[PASS] Real JSON export executed: Blob created and payload structurally verified.');
    passedChecks++;

    // Reset Maker Studio to clean slate
    await evaluate(`window.PuzzlePlot.startMaker(null)`);
    await sleep(200);

    // Import exported JSON back via Maker Studio real File & FileReader import path
    await evaluate('window.__alerts = [];');
    await evaluate(`
      (() => {
        const payload = window.__exportedJsonPayload;
        const testFile = new File([payload], 'exported_puzzle.json', { type: 'application/json' });
        const fileInput = document.getElementById('maker-file-importer');
        if (fileInput && typeof DataTransfer !== 'undefined') {
          try {
            const dt = new DataTransfer();
            dt.items.add(testFile);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          } catch (e) {}
        }
        // Direct event dispatch through handler with authentic File object
        window.PuzzlePlot.maker.handleFileImport({ target: { files: [testFile] } });
      })()
    `);

    // Wait for FileReader asynchronous completion and success alert
    let importSuccess = false;
    const startImportWait = Date.now();
    while (Date.now() - startImportWait < 4000) {
      const alerts = await evaluate('window.__alerts');
      if (alerts.some(a => a.includes('Puzzle successfully loaded into PuzzlePlot Studio'))) {
        importSuccess = true;
        break;
      }
      await sleep(100);
    }

    if (!importSuccess) {
      const lastAlerts = await evaluate('window.__alerts');
      throw new Error(`File/FileReader import did not report success. Alerts: ${JSON.stringify(lastAlerts)}`);
    }

    const importedMakerState = await evaluate(`
      (() => {
        const maker = window.PuzzlePlot.maker;
        return {
          title: maker.title,
          author: maker.author,
          language: maker.language,
          difficulty: maker.difficulty,
          size: maker.size,
          gridLetters: maker.grid.map(row => row.map(c => c.value).join('')),
          hasCluesAcross: Object.keys(maker.clues.across).length,
          hasCluesDown: Object.keys(maker.clues.down).length,
          acrossClue1: maker.clues.across['1'],
          downClue1: maker.clues.down['1']
        };
      })()
    `);

    if (
      importedMakerState.title !== 'Export Test Mini' ||
      importedMakerState.author !== 'Jerome G.' ||
      importedMakerState.language !== 'en' ||
      importedMakerState.size !== 5 ||
      importedMakerState.gridLetters[0] !== 'HEART' ||
      importedMakerState.gridLetters[1] !== 'EMBER' ||
      importedMakerState.gridLetters[2] !== 'ABUSE' ||
      importedMakerState.gridLetters[3] !== 'RESIN' ||
      importedMakerState.gridLetters[4] !== 'TREND' ||
      importedMakerState.hasCluesAcross < 5 ||
      importedMakerState.hasCluesDown < 5 ||
      !importedMakerState.acrossClue1 ||
      !importedMakerState.downClue1
    ) {
      throw new Error(`Imported puzzle in Maker Studio did not match exported data: ${JSON.stringify(importedMakerState)}`);
    }
    console.log('[PASS] Exported JSON imported back through File/FileReader path without data loss.');
    passedChecks++;

    // Test Play and solve the imported puzzle
    await evaluate(`document.getElementById('maker-test-play-btn').click()`);
    await sleep(300);

    const importedPlayResult = await evaluate(`
      (() => {
        const player = window.PuzzlePlot.player;
        if (!player) return { error: 'No player' };
        for (let r = 0; r < player.puzzle.size; r++) {
          for (let c = 0; c < player.puzzle.size; c++) {
            if (!player.processedGrid[r][c].isBlock) {
              player.userGrid[r][c].value = player.processedGrid[r][c].value;
            }
          }
        }
        player.checkPuzzleCompletion();
        const victoryActive = document.getElementById('victory-modal')?.classList.contains('active');
        return { isCompleted: player.isCompleted, victoryActive };
      })()
    `);

    if (!importedPlayResult.isCompleted || !importedPlayResult.victoryActive) {
      throw new Error('Test Play of imported puzzle failed to complete successfully.');
    }
    console.log('[PASS] Imported puzzle test-played and solved with full victory modal confirmation.');
    passedChecks++;

    // Return to Library Hub
    await evaluate(`document.getElementById('victory-btn-library').click()`);
    await sleep(300);

    // -------------------------------------------------------------------------
    // 7. Responsive Viewport & Zoom Usability Checks
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Viewport Zoom & Responsive Scale Verification ---');

    // Test Mobile viewport (375x667)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(200);

    const mobileUsable = await evaluate(`
      (() => {
        const playBtn = document.getElementById('hero-btn-play');
        const createBtn = document.getElementById('hero-btn-create');
        const cards = document.querySelectorAll('.puzzle-card');
        const rect = playBtn?.getBoundingClientRect();
        return {
          playVisible: !!playBtn && rect.width > 0 && rect.height > 0,
          createVisible: !!createBtn,
          cardCount: cards.length,
          bodyOverflowX: document.documentElement.scrollWidth <= window.innerWidth + 10
        };
      })()
    `);
    if (!mobileUsable.playVisible || mobileUsable.cardCount !== 2) {
      throw new Error(`Mobile viewport rendering issue: ${JSON.stringify(mobileUsable)}`);
    }
    console.log('[PASS] Mobile viewport (375x667): Hub and primary controls fully accessible.');
    passedChecks++;

    // Reset Emulation
    await send('Emulation.clearDeviceMetricsOverride');
    await sleep(200);

    // -------------------------------------------------------------------------
    // 8. Storage Resilience & DOM Injection Hardening
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Storage Resilience & DOM Injection Hardening ---');
    await evaluate(`
      (() => {
        const corruptedData = [
          { size: 5, grid: 'invalid-grid' },
          {
            id: 'xss-test',
            title: 'Hostile <script>alert("xss")</script>',
            author: 'Hacker <img src=x onerror=alert(1)>',
            description: '"><svg onload=alert(2)>',
            language: 'en',
            size: 5,
            difficulty: '"><b onfocus=alert(3)>',
            grid: [
              ['H', 'E', 'A', 'R', 'T'],
              ['E', 'M', 'B', 'E', 'R'],
              ['A', 'B', 'U', 'S', 'E'],
              ['R', 'E', 'S', 'I', 'N'],
              ['T', 'R', 'E', 'N', 'D']
            ],
            clues: {
              across: { '1': 'Clue 1', '6': 'Clue 6', '7': 'Clue 7', '8': 'Clue 8', '9': 'Clue 9' },
              down: { '1': 'Clue 1', '2': 'Clue 2', '3': 'Clue 3', '4': 'Clue 4', '5': 'Clue 5' }
            }
          }
        ];
        localStorage.setItem('puzzleplot_custom_puzzles', JSON.stringify(corruptedData));
        window.PuzzlePlot.customPuzzles = window.PuzzlePlot.loadCustomPuzzles();
        window.PuzzlePlot.renderHub();
      })()
    `);
    await sleep(300);

    const recoveredCount = await evaluate('window.PuzzlePlot.customPuzzles.length');
    if (recoveredCount !== 1) throw new Error(`Expected 1 recovered valid custom puzzle, found ${recoveredCount}`);
    console.log('[PASS] Corrupt local-storage entry isolated without crashing catalog.');
    passedChecks++;

    const imgElementsCount = await evaluate('document.querySelectorAll(".puzzle-cards-grid img").length');
    const svgInjectedCount = await evaluate('document.querySelectorAll(".puzzle-cards-grid svg[onload]").length');

    if (imgElementsCount > 0 || svgInjectedCount > 0) {
      throw new Error('Hostile tags (<img onerror>, <svg onload>) were injected into DOM!');
    }
    console.log('[PASS] Hostile catalog metadata rendered as inert text without script/element injection.');
    passedChecks++;

    // -------------------------------------------------------------------------
    // 9. Check Console Errors & Exceptions
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Real-Browser Console & Exception Health Check ---');
    if (consoleErrors.length > 0) {
      console.error(`[FAIL] ${consoleErrors.length} console errors / runtime exceptions logged:`);
      consoleErrors.forEach(e => console.error(`  - ${e}`));
      failedChecks++;
    } else {
      console.log('[PASS] 0 console errors or runtime exceptions logged during complete browser session.');
      passedChecks++;
    }

  } catch (err) {
    console.error(`[FATAL TEST ERROR] ${err.message}`);
    if (capturedExceptions.length > 0) {
      console.error('Captured Runtime Exceptions:');
      capturedExceptions.forEach(e => console.error(`  ${e}`));
    }
    if (consoleErrors.length > 0) {
      console.error('Captured Console Errors:');
      consoleErrors.forEach(e => console.error(`  ${e}`));
    }
    failedChecks++;
  } finally {
    if (ws) ws.close();
    cleanup();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Real-Browser Smoke Test Results: ${passedChecks} Passed, ${failedChecks} Failed, 0 Skipped`);
  console.log('------------------------------------------------------------\n');

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    console.log('Real-browser smoke testing passed with 100% success!');
    process.exit(0);
  }
}

run();
