import { CrosswordUtils } from '../js/engine/crosswordUtils.js';

export function getGridWords(gridArray) {
  const size = gridArray.length;
  const grid = CrosswordUtils.createEmptyGrid(size, size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = gridArray[r][c];
      if (v === '#' || v === '.') {
        grid[r][c].isBlock = true;
        grid[r][c].value = '';
      } else {
        grid[r][c].isBlock = false;
        grid[r][c].value = v;
      }
    }
  }
  return CrosswordUtils.validateGrid(grid);
}

export function verifyFullPuzzle(puzzle) {
  const size = puzzle.size;
  const result = CrosswordUtils.validatePuzzleIntegrity(puzzle, {
    requiredSymmetry: '180',
    checkClues: true,
    allowIncompleteLetters: false
  });

  if (!result.isValid) {
    const firstErr = result.errors[0];
    throw new Error(firstErr.message);
  }

  console.log(`[PASS] ${puzzle.id} (${size}x${size} ${puzzle.language}): ${result.acrossWords.length} Across, ${result.downWords.length} Down - grid and clue coverage checks passed.`);
  return {
    ...result.metrics,
    acrossWords: result.acrossWords,
    downWords: result.downWords,
    acrossCount: result.acrossWords.length,
    downCount: result.downWords.length
  };
}
