import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PresetPuzzles } from '../js/data/presets.js';
import { verifyFullPuzzle, getGridWords } from './verify_grid.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('============================================================');
console.log('PUZZLEPLOT AUTOMATED PRESET DATA INTEGRITY & SYNC VALIDATION');
console.log('============================================================\n');

let passCount = 0;
let failCount = 0;

// Known fabricated strings denylist for release safety
const FABRICATED_STRINGS_DENYLIST = [
  'TIBIAEODEABMHOS',
  'USEAVITHU',
  'ASOOSYLGE',
  'NGMHALSUADUNONG',
  'TARIFFNWAOCAMPO',
  'WWFABCKNG'
];

const QUARANTINED_PRESET_IDS = [
  'en-13-1',
  'fil-13-1',
  'en-21-1',
  'fil-21-1'
];

// -----------------------------------------------------------------------------
// 1. Validate Authoritative Modular Presets (js/data/presets.js)
// -----------------------------------------------------------------------------
console.log('--- 1. Validating Authoritative Production Presets (js/data/presets.js) ---');
for (const puzzle of PresetPuzzles) {
  try {
    const res = verifyFullPuzzle(puzzle);
    console.log(`[PASS] ${puzzle.id} (${puzzle.size}x${puzzle.size} ${puzzle.language}): ${res.acrossCount} Across, ${res.downCount} Down - structurally validated`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${puzzle.id} (${puzzle.size}x${puzzle.size} ${puzzle.language}): ${err.message}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// 2. Extract and Validate Production Bundle Presets (js/puzzleplot.bundle.js)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Validating Runtime Bundle Presets (js/puzzleplot.bundle.js) ---');
const bundlePath = path.join(rootDir, 'js', 'puzzleplot.bundle.js');
let bundledPresets = null;
let bundleContent = '';

try {
  bundleContent = fs.readFileSync(bundlePath, 'utf8');
  const sectionPattern = /\/\/\s*4\.\s*BUILT-IN PRESET PUZZLES[\s\S]*?const PresetPuzzles = ([\s\S]*?);\r?\n\s*\/\/\s*={10,}\r?\n\s*\/\/\s*5\.\s*CROSSWORD PLAYER ENGINE/;
  const match = bundleContent.match(sectionPattern);
  if (!match) {
    throw new Error('Could not locate Section 4 (PresetPuzzles) in bundle file.');
  }
  bundledPresets = JSON.parse(match[1]);
} catch (err) {
  console.error(`[FAIL] Failed to extract bundled presets from ${bundlePath}: ${err.message}`);
  failCount++;
}

if (bundledPresets) {
  for (const puzzle of bundledPresets) {
    try {
      const res = verifyFullPuzzle(puzzle);
      console.log(`[PASS] Bundled ${puzzle.id} (${puzzle.size}x${puzzle.size} ${puzzle.language}): ${res.acrossCount} Across, ${res.downCount} Down - structurally validated`);
      passCount++;
    } catch (err) {
      console.error(`[FAIL] Bundled ${puzzle.id} (${puzzle.size}x${puzzle.size} ${puzzle.language}): ${err.message}`);
      failCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Exact Serialized Deep Comparison (Modular vs Bundled)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Verifying Modular vs Bundled Serialization Sync ---');
  const modularStr = JSON.stringify(PresetPuzzles);
  const bundledStr = JSON.stringify(bundledPresets);

  if (modularStr === bundledStr) {
    console.log('[PASS] Exact serialized-data equality check confirmed between modular source and runtime bundle.');
    passCount++;
  } else {
    console.error('[FAIL] Modular presets (js/data/presets.js) and bundled presets (js/puzzleplot.bundle.js) diverge!');
    failCount++;
  }

  if (PresetPuzzles.length !== bundledPresets.length) {
    console.error(`[FAIL] Preset count mismatch: modular has ${PresetPuzzles.length}, bundled has ${bundledPresets.length}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// 4. Safety Denylist & Quarantine Check
// -----------------------------------------------------------------------------
console.log('\n--- 4. Verifying Safety Denylist & Quarantine Integrity ---');

let denylistPassed = true;
const allProdPuzzles = [...PresetPuzzles, ...(bundledPresets || [])];

for (const puzzle of allProdPuzzles) {
  const val = getGridWords(puzzle.grid);
  const allWords = [...val.acrossWords, ...val.downWords].map(w => w.letters.toUpperCase());

  for (const denied of FABRICATED_STRINGS_DENYLIST) {
    if (allWords.includes(denied)) {
      console.error(`[FAIL] Fabricated string "${denied}" detected in production preset "${puzzle.id}"!`);
      denylistPassed = false;
      failCount++;
    }
  }
}

for (const denied of FABRICATED_STRINGS_DENYLIST) {
  if (bundleContent.includes(denied)) {
    console.error(`[FAIL] Fabricated string "${denied}" detected in js/puzzleplot.bundle.js!`);
    denylistPassed = false;
    failCount++;
  }
}

if (denylistPassed) {
  console.log('[PASS] Safety denylist passed: 0 known fabricated strings found in production presets or bundle.');
  passCount++;
}

let quarantineIdCheck = true;
for (const qId of QUARANTINED_PRESET_IDS) {
  if (PresetPuzzles.some(p => p.id === qId)) {
    console.error(`[FAIL] Quarantined preset ID "${qId}" found in js/data/presets.js!`);
    quarantineIdCheck = false;
    failCount++;
  }
  if (bundledPresets && bundledPresets.some(p => p.id === qId)) {
    console.error(`[FAIL] Quarantined preset ID "${qId}" found in js/puzzleplot.bundle.js!`);
    quarantineIdCheck = false;
    failCount++;
  }
}

if (quarantineIdCheck) {
  console.log('[PASS] Quarantined preset IDs (en-13-1, fil-13-1, en-21-1, fil-21-1) are successfully excluded from production.');
  passCount++;
}

const draftPath = path.join(rootDir, 'js', 'data', 'draft-presets.js');
try {
  if (!fs.existsSync(draftPath)) {
    throw new Error('js/data/draft-presets.js not found.');
  }
  const draftContent = fs.readFileSync(draftPath, 'utf8');
  const hasDisclaimer = draftContent.includes('EXCLUDED from the production Puzzle Library');
  if (!hasDisclaimer) {
    throw new Error('js/data/draft-presets.js is missing the prominent exclusion/review disclaimer.');
  }
  console.log('[PASS] Draft presets file (js/data/draft-presets.js) exists with prominent quarantine notice.');
  passCount++;
} catch (err) {
  console.error(`[FAIL] Draft presets file check failed: ${err.message}`);
  failCount++;
}

// -----------------------------------------------------------------------------
// 5. Runtime Browser DOM & Player Engine Simulation
// -----------------------------------------------------------------------------
console.log('\n--- 5. In-Browser Runtime Execution & Completion Verification ---');

const elements = new Map();
function createMockElement(id = '', tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    dataset: {},
    style: {},
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); },
      toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); }
    },
    listeners: {},
    addEventListener(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
    },
    removeEventListener(event, fn) {
      if (!this.listeners[event]) return;
      this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    },
    dispatchEvent(event, data) {
      const list = this.listeners[event] || [];
      list.forEach(fn => fn(data || { target: this, stopPropagation: () => {} }));
    },
    innerHTML: '',
    textContent: '',
    children: [],
    appendChild(child) { this.children.push(child); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    closest() { return this; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 600, height: 600 }; },
    scrollIntoView() {},
    focus() {},
    setAttribute() {},
    getAttribute() { return null; }
  };
}

function getOrCreateElement(id) {
  if (!elements.has(id)) elements.set(id, createMockElement(id));
  return elements.get(id);
}

const windowListeners = {};

global.window = {
  scrollTo: () => {},
  addEventListener(event, fn) {
    if (!windowListeners[event]) windowListeners[event] = [];
    windowListeners[event].push(fn);
  },
  removeEventListener(event, fn) {
    if (!windowListeners[event]) return;
    windowListeners[event] = windowListeners[event].filter(f => f !== fn);
  },
  AudioContext: class {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.state = 'running';
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
    resume() {}
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v.toString(); },
    removeItem(k) { delete this._data[k]; }
  }
};

global.document = {
  readyState: 'complete',
  documentElement: createMockElement('html', 'html'),
  body: createMockElement('body', 'body'),
  addEventListener(event, fn) { global.window.addEventListener(event, fn); },
  getElementById: (id) => getOrCreateElement(id),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: (tag) => createMockElement('', tag)
};

global.localStorage = global.window.localStorage;

eval(bundleContent);

const app = global.window.PuzzlePlot;
if (app && bundledPresets) {
  for (const preset of bundledPresets) {
    try {
      app.startPlayer(preset);
      const player = app.player;

      // Validate clue rendering
      const acrossHtml = player.renderClueList('across');
      const downHtml = player.renderClueList('down');

      if (/Clue for/i.test(acrossHtml) || /Placeholder/i.test(acrossHtml)) {
        throw new Error(`Across clues contain placeholder text in ${preset.id}`);
      }
      if (/Clue for/i.test(downHtml) || /Placeholder/i.test(downHtml)) {
        throw new Error(`Down clues contain placeholder text in ${preset.id}`);
      }

      // Simulate navigation
      const firstAcross = player.acrossWords[0];
      player.cursor = { row: firstAcross.row, col: firstAcross.col };
      player.direction = 'across';
      const activeAcross = player.getActiveWord();
      if (!activeAcross || activeAcross.number !== firstAcross.number) {
        throw new Error(`Cursor across navigation failed for ${preset.id}`);
      }

      // Simulate complete solve
      for (let r = 0; r < preset.size; r++) {
        for (let c = 0; c < preset.size; c++) {
          if (!player.processedGrid[r][c].isBlock) {
            player.userGrid[r][c].value = player.processedGrid[r][c].value;
          }
        }
      }

      const completed = player.checkPuzzleCompletion();
      if (!completed || player.isCompleted !== true) {
        throw new Error(`Victory completion check failed for ${preset.id}`);
      }

      console.log(`[PASS] Runtime simulation of ${preset.id} (${preset.title}): Navigation, Clues, & Victory passed.`);
      passCount++;
    } catch (err) {
      console.error(`[FAIL] Runtime simulation of ${preset.id}: ${err.message}`);
      failCount++;
    }
  }
}

console.log('\n------------------------------------------------------------');
console.log(`Summary: ${passCount} Checks Passed, ${failCount} Failed`);
console.log('------------------------------------------------------------\n');

if (failCount > 0) {
  console.error('Validation failed! Exiting with code 1.');
  process.exit(1);
} else {
  console.log('All modular & runtime bundle presets structurally validated, synchronized, and executable! Exiting with code 0.');
  process.exit(0);
}
