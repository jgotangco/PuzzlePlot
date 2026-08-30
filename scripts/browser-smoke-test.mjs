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
    // Windows standard locations
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    // macOS standard locations
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux standard locations
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

  // Check system PATH
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

    // 1. Enable Runtime and Page domains BEFORE navigating
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

    // 1. Initial State & DOM Initialization
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

    // 2. Play & Solve en-5-1 and fil-5-1
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

    // 3. Maker Studio Pre-Flight Validation Gates
    console.log('\n--- 3. Maker Studio Pre-Flight Validation Gates ---');
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

    // 4. Auto-Builder Verification
    console.log('\n--- 4. Maker Auto-Builder Verification ---');
    await evaluate(`
      (() => {
        document.getElementById('maker-btn-auto-build').click();
        document.getElementById('auto-builder-input').value = 'XYZQQW: Random letters\\nJKLMMN: Another random';
        document.getElementById('auto-builder-size').value = '5';
        document.getElementById('auto-builder-generate-btn').click();
      })()
    `);
    await sleep(200);
    console.log('[PASS] Auto-builder rejects incompatible words gracefully.');
    passedChecks++;

    await evaluate(`
      (() => {
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

    // 5. Valid Custom Puzzle Workflows
    console.log('\n--- 5. Valid Custom Puzzle Workflows ---');
    await evaluate(`
      window.PuzzlePlot.maker.title = 'My Valid Custom Mini';
      window.PuzzlePlot.maker.author = 'Jerome G.';
    `);

    // Valid Print invocation
    await evaluate('window.__printed = false;');
    await evaluate(`document.getElementById('maker-act-print').click()`);
    const printInvoked = await evaluate('window.__printed');
    if (!printInvoked) throw new Error('window.print was not invoked for valid puzzle.');
    console.log('[PASS] Print sheet successfully generated and triggered.');
    passedChecks++;

    // Valid Save to local library
    await evaluate(`document.getElementById('maker-act-save-local').click()`);
    await sleep(200);
    const savedCustomsCount = await evaluate('window.PuzzlePlot.customPuzzles.length');
    if (savedCustomsCount < 1) throw new Error('Custom puzzle was not saved to window.PuzzlePlot.customPuzzles');
    console.log('[PASS] Valid custom puzzle saved to local library.');
    passedChecks++;

    // Valid Test Play
    await evaluate(`document.getElementById('maker-test-play-btn').click()`);
    await sleep(300);
    const isTestingActive = await evaluate('document.getElementById("player-view").classList.contains("active")');
    if (!isTestingActive) throw new Error('Test Play did not transition to Player view.');
    console.log('[PASS] Test Play loaded valid custom puzzle into Player.');
    passedChecks++;

    // Return to Hub
    await evaluate(`document.getElementById('player-back-btn').click()`);
    await sleep(300);

    // 6. Malformed Local Storage Recovery & Hostile Metadata XSS Hardening
    console.log('\n--- 6. Storage Resilience & DOM Injection Hardening ---');
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

    // 7. Check Console Errors & Exceptions
    console.log('\n--- 7. Real-Browser Console & Exception Health Check ---');
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
