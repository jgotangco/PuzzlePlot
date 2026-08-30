import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PresetPuzzles } from '../js/data/presets.js';
import { DraftPresetPuzzles } from '../js/data/draft-presets.js';
import { CrosswordUtils } from '../js/engine/crosswordUtils.js';
import { SoundEngine, AudioManager } from '../js/engine/audioManager.js';
import { DictionarySearch } from '../js/data/dictionaries.js';
import { CrosswordPlayer } from '../js/player/crosswordPlayer.js';
import { CrosswordMaker } from '../js/maker/crosswordMaker.js';
import { PuzzlePlotApp } from '../js/app.js';
import { generateBundleContent } from './build-bundle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('============================================================');
console.log('PUZZLEPLOT P1 ARCHITECTURE, INTEGRITY & DATA-SAFETY TESTS');
console.log('============================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

function assertThrows(fn, message, expectedSnippet = null) {
  let threw = false;
  let errMsg = '';
  try {
    fn();
  } catch (e) {
    threw = true;
    errMsg = e.message;
  }
  if (expectedSnippet) {
    assert(threw && errMsg.includes(expectedSnippet), `${message} (Error: ${errMsg})`);
  } else {
    assert(threw, message);
  }
}

// -----------------------------------------------------------------------------
// 1. Modular Source & Audio API Consistency
// -----------------------------------------------------------------------------
console.log('--- 1. Testing Modular Source & Audio API Consistency ---');
assert(typeof SoundEngine === 'object' && SoundEngine !== null, 'SoundEngine singleton is exported from audioManager.js');
assert(AudioManager === SoundEngine, 'AudioManager alias points to SoundEngine instance');
assert(typeof SoundEngine.toggleMute === 'function', 'SoundEngine has toggleMute method');
assert(typeof SoundEngine.playKeySound === 'function', 'SoundEngine has playKeySound method');
assert(typeof SoundEngine.playVictorySound === 'function', 'SoundEngine has playVictorySound method');
assert(typeof SoundEngine.playErrorSound === 'function', 'SoundEngine has playErrorSound method');
assert(typeof SoundEngine.playWordCompleteSound === 'function', 'SoundEngine has playWordCompleteSound method');

// -----------------------------------------------------------------------------
// 2. Full Source vs Runtime Bundle Consistency
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Source vs Runtime Bundle Consistency ---');
const bundlePath = path.join(rootDir, 'js', 'puzzleplot.bundle.js');
const onDiskBundle = fs.readFileSync(bundlePath, 'utf8').replace(/\r\n/g, '\n');
const generatedBundle = generateBundleContent().replace(/\r\n/g, '\n');
assert(onDiskBundle === generatedBundle, 'js/puzzleplot.bundle.js exactly matches generated content from js/ modular sources');

// -----------------------------------------------------------------------------
// 3. P0 Baseline & Quarantine Verification
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing P0 Baseline & Quarantine Protections ---');
assert(PresetPuzzles.length === 2, `Production library contains exactly 2 verified presets (found ${PresetPuzzles.length})`);
assert(PresetPuzzles.every(p => p.id === 'en-5-1' || p.id === 'fil-5-1'), 'Production presets are strictly en-5-1 and fil-5-1');

const quarantinedIds = ['en-13-1', 'fil-13-1', 'en-21-1', 'fil-21-1'];
quarantinedIds.forEach(id => {
  assert(!PresetPuzzles.some(p => p.id === id), `Quarantined ID "${id}" is absent from production presets`);
  assert(!onDiskBundle.includes(`"id": "${id}"`), `Quarantined ID "${id}" is absent from runtime bundle`);
  assert(DraftPresetPuzzles.some(p => p.id === id), `Quarantined ID "${id}" is preserved in draft-presets.js`);
});

const denylist = ['TIBIAEODEABMHOS', 'USEAVITHU', 'ASOOSYLGE', 'NGMHALSUADUNONG', 'TARIFFNWAOCAMPO', 'WWFABCKNG'];
denylist.forEach(denied => {
  assert(!onDiskBundle.includes(denied), `Fabricated string "${denied}" is absent from bundle`);
});

// -----------------------------------------------------------------------------
// 4. Supported Sizes Policy (5, 13, 21)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Testing Supported Sizes (5, 13, 21) Policy ---');
assert(Array.isArray(CrosswordUtils.SUPPORTED_SIZES), 'CrosswordUtils.SUPPORTED_SIZES is an array');
assert(
  CrosswordUtils.SUPPORTED_SIZES.length === 3 &&
  CrosswordUtils.SUPPORTED_SIZES.includes(5) &&
  CrosswordUtils.SUPPORTED_SIZES.includes(13) &&
  CrosswordUtils.SUPPORTED_SIZES.includes(21),
  'CrosswordUtils.SUPPORTED_SIZES strictly defines [5, 13, 21]'
);

// Acceptance of supported sizes
[5, 13, 21].forEach(size => {
  assert(CrosswordUtils.isSupportedSize(size), `Size ${size} is accepted as supported`);
});

// Rejection of unsupported sizes
[3, 4, 6, 12, 20, 22, 35, '5', null, undefined].forEach(badSize => {
  assert(!CrosswordUtils.isSupportedSize(badSize), `Unsupported size ${badSize} is rejected`);
  const testPuz = { size: badSize, grid: [], clues: { across: {}, down: {} } };
  const val = CrosswordUtils.validatePuzzleIntegrity(testPuz);
  assert(!val.isValid && val.errors.some(e => e.rule === 'SIZE_UNSUPPORTED'), `validatePuzzleIntegrity rejects unsupported size ${badSize}`);
  assertThrows(() => CrosswordUtils.validateAndNormalizeImport(testPuz), `validateAndNormalizeImport rejects unsupported size ${badSize}`);
});

// -----------------------------------------------------------------------------
// 5. Resource Limits Before Parsing & Processing
// -----------------------------------------------------------------------------
console.log('\n--- 5. Testing Resource Limits ---');

// Reject oversized JSON payload (>1MB)
const oversizedJson = JSON.stringify({ size: 5, payload: 'x'.repeat(1024 * 1024 + 100) });
assertThrows(() => CrosswordUtils.importFromJSON(oversizedJson), 'Oversized JSON payload (>1MB) is rejected before processing', 'exceeds maximum');

// Reject excessive clue counts (>200)
const valid5x5 = PresetPuzzles.find(p => p.id === 'en-5-1');
const excessCluesObj = { across: {}, down: {} };
for (let i = 1; i <= 205; i++) {
  excessCluesObj.across[i.toString()] = `Clue ${i}`;
}
const excessCluesPuz = { ...valid5x5, clues: excessCluesObj };
assertThrows(() => CrosswordUtils.validateAndNormalizeImport(excessCluesPuz), 'Excessive clue count (>200) is rejected', 'exceeds maximum limit');

// Reject excessively long clue key (>10 chars)
const longKeyCluesPuz = {
  ...valid5x5,
  clues: {
    across: { '12345678901': 'Long key clue' },
    down: {}
  }
};
assertThrows(() => CrosswordUtils.validateAndNormalizeImport(longKeyCluesPuz), 'Excessively long clue key (>10 chars) is rejected', 'exceeds maximum allowed length');

// -----------------------------------------------------------------------------
// 6. Strict Structural Validation on Imported Puzzles
// -----------------------------------------------------------------------------
console.log('\n--- 6. Testing Full Structural Validation on Untrusted Imports ---');

// Valid 5x5 export/import round-trip
const validExport = CrosswordUtils.exportToJSON(valid5x5);
const validImported = CrosswordUtils.importFromJSON(validExport);
assert(validImported.size === 5 && validImported.title === valid5x5.title, 'Valid PuzzlePlot JSON export imports cleanly and passes validation');

// Syntactically valid JSON with disconnected grid rejected on import
const discJson = JSON.stringify({
  id: 'disc-puz',
  title: 'Disc',
  size: 5,
  grid: [
    ['C', 'A', 'T', '#', '#'],
    ['A', 'R', 'E', '#', '#'],
    ['T', 'E', 'A', '#', '#'],
    ['#', '#', '#', '#', '#'],
    ['#', '#', '#', 'D', 'O']
  ],
  clues: { across: { '1': 'Feline' }, down: { '1': 'Feline' } }
});
assertThrows(() => CrosswordUtils.importFromJSON(discJson), 'Structurally disconnected puzzle JSON is rejected on import', 'Imported puzzle failed structural validation');

// Syntactically valid JSON with unchecked cells rejected on import
const unchJson = JSON.stringify({
  id: 'unch-puz',
  title: 'Unchecked',
  size: 5,
  grid: [
    ['C', 'A', 'T', '#', '#'],
    ['#', '#', '#', '#', '#'],
    ['#', '#', '#', '#', '#'],
    ['#', '#', '#', '#', '#'],
    ['#', '#', '#', '#', '#']
  ],
  clues: { across: { '1': 'Feline' }, down: {} }
});
assertThrows(() => CrosswordUtils.importFromJSON(unchJson), 'Puzzle JSON with unchecked cells is rejected on import', 'Imported puzzle failed structural validation');

// Syntactically valid JSON with short entries (<3 letters) rejected on import
const shortJson = JSON.stringify({
  id: 'short-puz',
  title: 'Short',
  size: 5,
  grid: [
    ['O', 'N', '#', '#', '#'],
    ['N', 'O', '#', '#', '#'],
    ['#', '#', '#', '#', '#'],
    ['#', '#', '#', '#', '#'],
    ['#', '#', '#', '#', '#']
  ],
  clues: { across: { '1': 'Short entry' }, down: { '1': 'Short entry' } }
});
assertThrows(() => CrosswordUtils.importFromJSON(shortJson), 'Puzzle JSON with short entries (<3 letters) is rejected on import', 'Imported puzzle failed structural validation');

// Syntactically valid JSON with empty playable cells rejected on import
const emptyCellJson = JSON.stringify({
  id: 'empty-cell-puz',
  title: 'Empty Cell',
  size: 5,
  grid: [
    ['H', 'E', 'A', 'R', 'T'],
    ['E', 'M', 'B', 'E', 'R'],
    ['A', 'B', ' ', 'S', 'E'],
    ['R', 'E', 'S', 'I', 'N'],
    ['T', 'R', 'E', 'N', 'D']
  ],
  clues: valid5x5.clues
});
assertThrows(() => CrosswordUtils.importFromJSON(emptyCellJson), 'Puzzle JSON with empty playable cells is rejected on import', 'Empty playable cell');

// Syntactically valid JSON with missing clues rejected on import
const missingClueJson = JSON.stringify({
  id: 'missing-clue-puz',
  title: 'Missing Clue',
  size: 5,
  grid: valid5x5.grid,
  clues: {
    across: { '1': 'Valid Across 1' }, // Missing 6, 7, 8, 9
    down: valid5x5.clues.down
  }
});
assertThrows(() => CrosswordUtils.importFromJSON(missingClueJson), 'Puzzle JSON with missing clues is rejected on import', 'Missing clue definition');

// Syntactically valid JSON with extra clue assignments rejected on import
const extraClueJson = JSON.stringify({
  id: 'extra-clue-puz',
  title: 'Extra Clue',
  size: 5,
  grid: valid5x5.grid,
  clues: {
    across: { ...valid5x5.clues.across, '99': 'Bogus extra clue' },
    down: valid5x5.clues.down
  }
});
assertThrows(() => CrosswordUtils.importFromJSON(extraClueJson), 'Puzzle JSON with extra clue assignments is rejected on import', 'Extra Across clue #99');

// Syntactically valid JSON with placeholder clues rejected on import
const placeholderClueJson = JSON.stringify({
  id: 'placeholder-clue-puz',
  title: 'Placeholder Clue',
  size: 5,
  grid: valid5x5.grid,
  clues: {
    across: { ...valid5x5.clues.across, '1': 'Clue for HEART' },
    down: valid5x5.clues.down
  }
});
assertThrows(() => CrosswordUtils.importFromJSON(placeholderClueJson), 'Puzzle JSON with placeholder clues is rejected on import', 'Placeholder clue detected');

// -----------------------------------------------------------------------------
// 7. Auto-Builder Symmetry & Layout Safety
// -----------------------------------------------------------------------------
console.log('\n--- 7. Testing Auto-Builder Symmetry & Layout Safety ---');

// Successful word placement
const autoInputValid = 'HEART: Center of emotion\nEMBER: Glowing fragment\nABUSE: Mishandle\nRESIN: Sticky substance\nTREND: Current craze';
const autoResult = CrosswordUtils.autoGenerateCrossword({
  rawInputWords: autoInputValid,
  size: 5,
  symmetry: '180'
});

assert(autoResult && autoResult.grid, 'Auto-builder successfully generates 5x5 layout');
// Check letters are placed accurately
const placedGridLetters = autoResult.grid.map(row => row.map(c => c.value).join(''));
assert(placedGridLetters[0] === 'HEART', 'Placed row 0 letters match input word "HEART"');
assert(placedGridLetters[1] === 'EMBER', 'Placed row 1 letters match input word "EMBER"');
assert(placedGridLetters[2] === 'ABUSE', 'Placed row 2 letters match input word "ABUSE"');
assert(placedGridLetters[3] === 'RESIN', 'Placed row 3 letters match input word "RESIN"');
assert(placedGridLetters[4] === 'TREND', 'Placed row 4 letters match input word "TREND"');

// Check that validation against output passes 100% of rules
const autoIntegrity = CrosswordUtils.validatePuzzleIntegrity({
  size: 5,
  grid: autoResult.grid.map(row => row.map(c => c.isBlock ? '#' : c.value)),
  clues: autoResult.clues
}, { requiredSymmetry: '180', checkClues: true });
assert(autoIntegrity.isValid, 'Auto-generated crossword satisfies 100% of strict integrity rules (0 unchecked, min length >= 3, 1 connected region, 180° symmetry, 0 placeholders)');

// Graceful failure for incompatible word set
assertThrows(() => {
  CrosswordUtils.autoGenerateCrossword({
    rawInputWords: 'ABCDE: Clue 1\nFGHIJ: Clue 2',
    size: 5,
    symmetry: '180'
  });
}, 'Auto-builder fails gracefully when no valid symmetrical layout can be formed without unclued crossings', 'Unable to generate a valid symmetrical crossword');

// -----------------------------------------------------------------------------
// 8. DOM-Injection & XSS Hardening Across Catalog & Card Rendering
// -----------------------------------------------------------------------------
console.log('\n--- 8. Testing Complete Hostile Puzzle Card DOM-Injection Hardening ---');

const hostileCustomPuzzle = {
  id: 'xss" onmouseover="alert(1)"',
  title: 'Evil <script>alert("title-xss")</script>',
  author: 'Hacker <img src=x onerror=alert("author-xss")>',
  description: '"><svg onload=alert("desc-xss")>',
  language: 'en',
  size: 5,
  difficulty: '"><iframe src="evil.html" onload=alert(4)>',
  grid: valid5x5.grid,
  clues: valid5x5.clues
};

const appInstance = new PuzzlePlotApp();
const renderedCardHtml = appInstance.renderPuzzleCard(hostileCustomPuzzle, true);

// Verify no executable HTML elements are present in rendered markup
assert(!renderedCardHtml.includes('<script>'), 'Rendered card contains 0 raw <script> tags');
assert(!renderedCardHtml.includes('<img'), 'Rendered card contains 0 raw <img tags');
assert(!renderedCardHtml.includes('<svg onload'), 'Rendered card contains 0 raw <svg onload tags');
assert(!renderedCardHtml.includes('<iframe'), 'Rendered card contains 0 raw <iframe tags');

// Verify all hostile markup is safely escaped as entity text
assert(renderedCardHtml.includes('&lt;script&gt;alert(&quot;title-xss&quot;)&lt;/script&gt;'), 'Title is rendered as safe inert text');
assert(renderedCardHtml.includes('&lt;img src=x onerror=alert(&quot;author-xss&quot;)&gt;'), 'Author is rendered as safe inert text');
assert(renderedCardHtml.includes('&quot;&gt;&lt;svg onload=alert(&quot;desc-xss&quot;)&gt;'), 'Description is rendered as safe inert text');

// Verify difficulty is safely normalized and escaped
assert(!renderedCardHtml.includes('evil.html'), 'Hostile difficulty markup is normalized/escaped');

// Verify quotes cannot break out of data-id attribute
assert(!renderedCardHtml.includes('data-id="xss" onmouseover='), 'Quotes cannot break out of data-* attributes');

console.log('\n------------------------------------------------------------');
console.log(`Summary: ${passCount} Checks Passed, ${failCount} Failed`);
console.log('------------------------------------------------------------\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('All P1 architecture, integrity, and data-safety tests passed with 100% success!');
  process.exit(0);
}
