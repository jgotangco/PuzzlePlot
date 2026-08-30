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
  const val = CrosswordUtils.validateGrid(grid);
  return val;
}

export function verifyFullPuzzle(puzzle) {
  const size = puzzle.size;
  const grid = CrosswordUtils.createEmptyGrid(size, size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = puzzle.grid[r][c];
      if (v === '#' || v === '.') {
        grid[r][c].isBlock = true;
        grid[r][c].value = '';
      } else {
        grid[r][c].isBlock = false;
        grid[r][c].value = v;
      }
    }
  }

  // 1. Dimensions
  if (puzzle.grid.length !== size || puzzle.grid.some(row => row.length !== size)) {
    throw new Error(`Dimension mismatch: expected ${size}x${size}`);
  }

  // 2. Character validity
  const validChars = /^[A-ZÑ]$/;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c].isBlock) {
        if (!validChars.test(grid[r][c].value)) {
          throw new Error(`Invalid character at (${r},${c}): "${grid[r][c].value}"`);
        }
      }
    }
  }

  // 3. 180° Symmetry
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].isBlock !== grid[size - 1 - r][size - 1 - c].isBlock) {
        throw new Error(`180° symmetry broken at (${r},${c}) and (${size-1-r},${size-1-c})`);
      }
    }
  }

  // 4. Validate connectivity & unchecked cells & numbering
  const val = CrosswordUtils.validateGrid(grid);
  if (!val.isConnected) {
    throw new Error(`Grid is disconnected (isolated letter islands exist)`);
  }
  if (val.uncheckedCells.length > 0) {
    throw new Error(`Found ${val.uncheckedCells.length} unchecked cells: ` + JSON.stringify(val.uncheckedCells[0]));
  }

  // 5. Min entry length >= 3
  const shortAcross = val.acrossWords.filter(w => w.length < 3);
  if (shortAcross.length > 0) {
    throw new Error(`Short Across entry: ${shortAcross[0].number} (${shortAcross[0].letters}) length ${shortAcross[0].length}`);
  }
  const shortDown = val.downWords.filter(w => w.length < 3);
  if (shortDown.length > 0) {
    throw new Error(`Short Down entry: ${shortDown[0].number} (${shortDown[0].letters}) length ${shortDown[0].length}`);
  }

  // 6. Clue integrity (1:1 correspondence, non-empty, no placeholders)
  const acrossClueKeys = Object.keys(puzzle.clues?.across || {});
  const downClueKeys = Object.keys(puzzle.clues?.down || {});
  const compAcrossNums = val.acrossWords.map(w => w.number.toString());
  const compDownNums = val.downWords.map(w => w.number.toString());

  for (let w of val.acrossWords) {
    const clue = puzzle.clues?.across?.[w.number.toString()];
    if (!clue || clue.trim() === '') {
      throw new Error(`Missing Across clue for ${w.number} (${w.letters})`);
    }
    if (/^Clue for/i.test(clue.trim())) {
      throw new Error(`Placeholder Across clue for ${w.number}: "${clue}"`);
    }
  }

  for (let key of acrossClueKeys) {
    if (!compAcrossNums.includes(key)) {
      throw new Error(`Extra Across clue ${key} not in grid`);
    }
  }

  for (let w of val.downWords) {
    const clue = puzzle.clues?.down?.[w.number.toString()];
    if (!clue || clue.trim() === '') {
      throw new Error(`Missing Down clue for ${w.number} (${w.letters})`);
    }
    if (/^Clue for/i.test(clue.trim())) {
      throw new Error(`Placeholder Down clue for ${w.number}: "${clue}"`);
    }
  }

  for (let key of downClueKeys) {
    if (!compDownNums.includes(key)) {
      throw new Error(`Extra Down clue ${key} not in grid`);
    }
  }

  console.log(`[PASS] ${puzzle.id} (${size}x${size} ${puzzle.language}): ${val.acrossCount} Across, ${val.downCount} Down, 100% valid!`);
  return val;
}
