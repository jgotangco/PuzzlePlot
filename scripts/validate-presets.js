import { PresetPuzzles } from '../js/data/presets.js';
import { verifyFullPuzzle } from './verify_grid.mjs';

console.log('============================================================');
console.log('PUZZLEPLOT AUTOMATED PRESET DATA INTEGRITY VALIDATION SUITE');
console.log('============================================================\n');

let passCount = 0;
let failCount = 0;

for (const puzzle of PresetPuzzles) {
  try {
    const res = verifyFullPuzzle(puzzle);
    console.log(`[PASS] ${puzzle.id} (${puzzle.size}x${puzzle.size} ${puzzle.language}): ${res.acrossCount} Across, ${res.downCount} Down - 100% Validated`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${puzzle.id} (${puzzle.size}x${puzzle.size} ${puzzle.language}): ${err.message}`);
    failCount++;
  }
}

console.log('\n------------------------------------------------------------');
console.log(`Summary: ${passCount} Passed, ${failCount} Failed (Total: ${PresetPuzzles.length})`);
console.log('------------------------------------------------------------\n');

if (failCount > 0) {
  console.error('Validation failed! Exiting with code 1.');
  process.exit(1);
} else {
  console.log('All built-in presets successfully verified! Exiting with code 0.');
  process.exit(0);
}
