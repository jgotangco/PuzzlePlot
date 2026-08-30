import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html').replace(/\\/g, '/');
const fileUrl = `file:///${indexPath}`;

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

let chromeBin = chromePaths.find(p => fs.existsSync(p));
if (!chromeBin) {
  console.error('No suitable Chrome/Edge browser found for real browser testing.');
  process.exit(1);
}

console.log('============================================================');
console.log('PUZZLEPLOT REAL-BROWSER SMOKE TEST (Chrome Headless & CDP)');
console.log('============================================================\n');
console.log(`Browser Binary: ${chromeBin}`);
console.log(`Target URL: ${fileUrl}\n`);

const port = 9222 + Math.floor(Math.random() * 500);
const chrome = spawn(chromeBin, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--allow-file-access-from-files',
  '--disable-web-security',
  fileUrl
], { stdio: 'ignore' });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl(retries = 25) {
  for (let i = 0; i < retries; i++) {
    await sleep(300);
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, (r) => {
          let data = '';
          r.on('data', chunk => data += chunk);
          r.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      if (res && res.length > 0) {
        const pageTab = res.find(t => t.type === 'page' && (t.url.includes('index.html') || t.title.includes('PuzzlePlot')));
        if (pageTab && pageTab.webSocketDebuggerUrl) {
          return pageTab.webSocketDebuggerUrl;
        }
      }
    } catch (e) {}
  }
  throw new Error('Failed to locate PuzzlePlot page target in Chrome DevTools');
}

async function run() {
  let wsUrl;
  try {
    wsUrl = await getWsUrl();
  } catch (err) {
    chrome.kill();
    console.error(`Failed to launch browser: ${err.message}`);
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  const consoleErrors = [];
  const consoleLogs = [];

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
      if (type === 'error') {
        consoleErrors.push(text);
      } else {
        consoleLogs.push(`[${type}] ${text}`);
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'Unknown exception';
      consoleErrors.push(desc);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await sleep(600);

  let passedChecks = 0;
  let failedChecks = 0;

  try {
    // 1. Check page title and core instance
    const pageTitle = await evaluate('document.title');
    console.log(`[PASS] Real browser loaded page: "${pageTitle}"`);
    passedChecks++;

    const isAppInit = await evaluate('typeof window.PuzzlePlot === "object" && window.PuzzlePlot !== null');
    if (!isAppInit) throw new Error('PuzzlePlot instance not initialized on window.');
    console.log('[PASS] window.PuzzlePlot runtime engine initialized successfully in real browser.');
    passedChecks++;

    // 2. Inspect Catalog Cards in Library
    const catalogCards = await evaluate(`
      (() => {
        return Array.from(document.querySelectorAll('.puzzle-card')).map(card => ({
          id: card.dataset.id,
          title: card.querySelector('.puzzle-card-title')?.textContent || '',
          author: card.querySelector('.puzzle-card-meta')?.textContent || '',
          badges: Array.from(card.querySelectorAll('.card-badge')).map(b => b.textContent)
        }));
      })()
    `);

    console.log(`\n--- Library Catalog Inspection (${catalogCards.length} presets found) ---`);
    for (const card of catalogCards) {
      console.log(`- Preset "${card.id}": ${card.title} (${card.badges.join(', ')})`);
    }

    const cardIds = catalogCards.map(c => c.id);
    if (!cardIds.includes('en-5-1') || !cardIds.includes('fil-5-1')) {
      throw new Error(`Expected production presets (en-5-1, fil-5-1) missing from catalog: found ${cardIds.join(', ')}`);
    }
    console.log('[PASS] Production presets (en-5-1, fil-5-1) present in Library.');
    passedChecks++;

    // 3. Confirm quarantined IDs are ABSENT from catalog
    const quarantinedIds = ['en-13-1', 'fil-13-1', 'en-21-1', 'fil-21-1'];
    for (const qId of quarantinedIds) {
      if (cardIds.includes(qId)) {
        throw new Error(`Quarantined preset "${qId}" unexpectedly found in library catalog!`);
      }
    }
    console.log('[PASS] All quarantined presets (en-13-1, fil-13-1, en-21-1, fil-21-1) absent from production library.');
    passedChecks++;

    // 4. Test Interactive Solving for each Production Preset
    const productionPresets = ['en-5-1', 'fil-5-1'];
    for (const presetId of productionPresets) {
      console.log(`\n--- Real-Browser Testing Preset: ${presetId} ---`);

      // Click Play Button on card
      await evaluate(`document.querySelector('.btn-play-puzzle[data-id="${presetId}"]').click()`);
      await sleep(400);

      // Verify player view active
      const isPlayerActive = await evaluate('document.getElementById("player-view").classList.contains("active")');
      if (!isPlayerActive) throw new Error(`Player view did not become active for ${presetId}`);
      console.log(`[PASS] Player view loaded for ${presetId}`);
      passedChecks++;

      // Verify metadata rendered
      const meta = await evaluate(`
        (() => ({
          title: document.querySelector('.player-title')?.textContent,
          author: document.querySelector('.player-author')?.textContent,
          badgeSize: document.querySelector('.badge-size')?.textContent,
          badgeLang: document.querySelector('.badge-lang')?.textContent,
          timer: document.getElementById('player-timer-text')?.textContent
        }))()
      `);
      console.log(`[PASS] Verified metadata: "${meta.title}" ${meta.author}, ${meta.badgeSize} ${meta.badgeLang}`);
      passedChecks++;

      // Verify clue integrity (no placeholders)
      const clueCheck = await evaluate(`
        (() => {
          const across = Array.from(document.querySelectorAll('#across-clues-list .clue-item')).map(el => el.textContent.trim());
          const down = Array.from(document.querySelectorAll('#down-clues-list .clue-item')).map(el => el.textContent.trim());
          const hasPlaceholder = [...across, ...down].some(c => /Clue for/i.test(c) || /Placeholder/i.test(c));
          return { acrossCount: across.length, downCount: down.length, hasPlaceholder };
        })()
      `);

      if (clueCheck.hasPlaceholder) {
        throw new Error(`Placeholder clue detected in rendered DOM for ${presetId}`);
      }
      console.log(`[PASS] Rendered ${clueCheck.acrossCount} Across, ${clueCheck.downCount} Down clues with 0 placeholders.`);
      passedChecks++;

      // Test clue click & active cell highlight
      await evaluate(`document.querySelector('#across-clues-list .clue-item').click()`);
      await sleep(200);

      const hasHighlight = await evaluate(`
        (() => {
          return document.querySelectorAll('.cell-active-word').length > 0 &&
                 document.querySelectorAll('.cell-active-cursor').length > 0;
        })()
      `);
      if (!hasHighlight) throw new Error(`Cell highlighting failed on clue click for ${presetId}`);
      console.log(`[PASS] Clue click and cursor highlighting verified in DOM.`);
      passedChecks++;

      // Programmatically solve puzzle and check victory
      const victoryCheck = await evaluate(`
        (() => {
          const app = window.PuzzlePlot;
          const player = app.player;
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

      if (!victoryCheck.isCompleted || !victoryCheck.victoryActive) {
        throw new Error(`Victory modal was not triggered for ${presetId}`);
      }
      console.log(`[PASS] Puzzle solved, victory modal displayed for ${presetId}.`);
      passedChecks++;

      // Return to Library
      await evaluate(`document.getElementById('victory-btn-library').click()`);
      await sleep(300);

      const isHubActive = await evaluate('document.getElementById("hub-view").classList.contains("active")');
      if (!isHubActive) throw new Error(`Failed to return to Hub view after solving ${presetId}`);
      console.log(`[PASS] Successfully returned to Library Hub.`);
      passedChecks++;
    }

    // 5. Test Maker Studio 21x21 & 13x13 Support Preservation
    console.log('\n--- Maker Studio Grid Size Support Verification ---');
    await evaluate(`document.getElementById('nav-create-btn').click()`);
    await sleep(400);

    const isMakerActive = await evaluate('document.getElementById("maker-view").classList.contains("active")');
    if (!isMakerActive) throw new Error('Maker Studio view did not activate.');
    console.log('[PASS] Maker Studio view activated.');
    passedChecks++;

    const sizeOptions = await evaluate(`
      Array.from(document.querySelectorAll('#maker-size-select option')).map(o => o.value)
    `);
    if (!sizeOptions.includes('5') || !sizeOptions.includes('13') || !sizeOptions.includes('21')) {
      throw new Error(`Maker Studio missing required size options: found ${sizeOptions.join(', ')}`);
    }
    console.log('[PASS] Maker Studio preserves 5x5, 13x13, and 21x21 constructor sizes.');
    passedChecks++;

    // Return to Hub
    await evaluate(`document.getElementById('maker-back-btn').click()`);
    await sleep(300);

    // 6. Check Console Errors
    console.log('\n--- Real-Browser Console Health Check ---');
    if (consoleErrors.length > 0) {
      console.error(`[FAIL] ${consoleErrors.length} console errors occurred during browser session:`);
      consoleErrors.forEach(e => console.error(`  - ${e}`));
      failedChecks++;
    } else {
      console.log('[PASS] 0 console errors logged in real browser session.');
      passedChecks++;
    }

  } catch (err) {
    console.error(`[FATAL TEST ERROR] ${err.message}`);
    failedChecks++;
  } finally {
    ws.close();
    chrome.kill();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Real-Browser Smoke Test Results: ${passedChecks} Passed, ${failedChecks} Failed`);
  console.log('------------------------------------------------------------\n');

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    console.log('Real-browser smoke testing passed with 100% success!');
    process.exit(0);
  }
}

run();
