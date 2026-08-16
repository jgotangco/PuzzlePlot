/**
 * PuzzlePlot Crossword Utility Engine & Auto-Generator
 * Core algorithms for crossword grid generation, auto-numbering, symmetry, validation,
 * and automatic word layout placement with grid blocks.
 */

export const CrosswordUtils = {
  createEmptyGrid(width, height) {
    const grid = [];
    for (let r = 0; r < height; r++) {
      const row = [];
      for (let c = 0; c < width; c++) {
        row.push({
          row: r,
          col: c,
          isBlock: false,
          value: '',
          number: null,
          acrossClueNumber: null,
          downClueNumber: null
        });
      }
      grid.push(row);
    }
    return grid;
  },

  cloneGrid(grid) {
    return grid.map(row => row.map(cell => ({ ...cell })));
  },

  getSymmetricCoordinates(row, col, width, height, mode = '180') {
    const coords = [{ row, col }];
    if (mode === 'none') return coords;

    if (mode === '180') {
      const symRow = height - 1 - row;
      const symCol = width - 1 - col;
      if (symRow !== row || symCol !== col) {
        coords.push({ row: symRow, col: symCol });
      }
    } else if (mode === '90') {
      if (width === height) {
        const c1 = { row: col, col: width - 1 - row };
        const c2 = { row: height - 1 - row, col: width - 1 - col };
        const c3 = { row: height - 1 - col, col: row };
        [c1, c2, c3].forEach(c => {
          if (!coords.some(existing => existing.row === c.row && existing.col === c.col)) {
            coords.push(c);
          }
        });
      } else {
        return this.getSymmetricCoordinates(row, col, width, height, '180');
      }
    } else if (mode === 'horizontal') {
      const symCol = width - 1 - col;
      if (symCol !== col) coords.push({ row, col: symCol });
    } else if (mode === 'vertical') {
      const symRow = height - 1 - row;
      if (symRow !== row) coords.push({ row: symRow, col });
    }

    return coords;
  },

  computeNumbersAndWords(grid) {
    const height = grid.length;
    const width = grid[0].length;
    let currentNumber = 1;

    const acrossWords = [];
    const downWords = [];

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        grid[r][c].number = null;
        grid[r][c].acrossClueNumber = null;
        grid[r][c].downClueNumber = null;
      }
    }

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c].isBlock) continue;

        const isLeftBlocked = (c === 0 || grid[r][c - 1].isBlock);
        const hasRightLetter = (c + 1 < width && !grid[r][c + 1].isBlock);
        const startsAcross = isLeftBlocked && hasRightLetter;

        const isAboveBlocked = (r === 0 || grid[r - 1][c].isBlock);
        const hasBelowLetter = (r + 1 < height && !grid[r + 1][c].isBlock);
        const startsDown = isAboveBlocked && hasBelowLetter;

        if (startsAcross || startsDown) {
          grid[r][c].number = currentNumber;

          if (startsAcross) {
            let length = 0;
            let letters = '';
            const cells = [];
            let cc = c;
            while (cc < width && !grid[r][cc].isBlock) {
              letters += (grid[r][cc].value || ' ').toUpperCase();
              cells.push({ row: r, col: cc });
              length++;
              cc++;
            }

            acrossWords.push({
              number: currentNumber,
              direction: 'across',
              row: r,
              col: c,
              length,
              letters,
              cells
            });
          }

          if (startsDown) {
            let length = 0;
            let letters = '';
            const cells = [];
            let rr = r;
            while (rr < height && !grid[rr][c].isBlock) {
              letters += (grid[rr][c].value || ' ').toUpperCase();
              cells.push({ row: rr, col: c });
              length++;
              rr++;
            }

            downWords.push({
              number: currentNumber,
              direction: 'down',
              row: r,
              col: c,
              length,
              letters,
              cells
            });
          }

          currentNumber++;
        }
      }
    }

    acrossWords.forEach(w => {
      w.cells.forEach(c => {
        grid[c.row][c.col].acrossClueNumber = w.number;
      });
    });

    downWords.forEach(w => {
      w.cells.forEach(c => {
        grid[c.row][c.col].downClueNumber = w.number;
      });
    });

    return { grid, acrossWords, downWords };
  },

  validateGrid(grid) {
    const height = grid.length;
    const width = grid[0].length;
    const totalCells = width * height;
    let blockCount = 0;
    let letterCount = 0;
    const emptyLetterCells = [];
    const uncheckedCells = [];

    const { acrossWords, downWords } = this.computeNumbersAndWords(grid);

    let startCell = null;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c].isBlock) {
          blockCount++;
        } else {
          letterCount++;
          if (!startCell) startCell = { r, c };
          if (!grid[r][c].value || grid[r][c].value.trim() === '') {
            emptyLetterCells.push({ r, c });
          }

          const inAcross = grid[r][c].acrossClueNumber !== null;
          const inDown = grid[r][c].downClueNumber !== null;
          if (!inAcross || !inDown) {
            uncheckedCells.push({ r, c, inAcross, inDown });
          }
        }
      }
    }

    let reachableLetterCount = 0;
    if (startCell) {
      const visited = Array.from({ length: height }, () => Array(width).fill(false));
      const queue = [startCell];
      visited[startCell.r][startCell.c] = true;

      while (queue.length > 0) {
        const { r, c } = queue.shift();
        reachableLetterCount++;

        const neighbors = [
          { r: r - 1, c },
          { r: r + 1, c },
          { r, c: c - 1 },
          { r, c: c + 1 }
        ];

        neighbors.forEach(n => {
          if (
            n.r >= 0 && n.r < height &&
            n.c >= 0 && n.c < width &&
            !grid[n.r][n.c].isBlock &&
            !visited[n.r][n.c]
          ) {
            visited[n.r][n.c] = true;
            queue.push(n);
          }
        });
      }
    }

    const isConnected = letterCount === 0 || reachableLetterCount === letterCount;
    const blockPercentage = totalCells > 0 ? Math.round((blockCount / totalCells) * 100) : 0;

    return {
      isValid: isConnected && emptyLetterCells.length === 0,
      totalCells,
      letterCount,
      blockCount,
      blockPercentage,
      isConnected,
      acrossCount: acrossWords.length,
      downCount: downWords.length,
      emptyLetterCount: emptyLetterCells.length,
      emptyLetterCells,
      uncheckedCells,
      acrossWords,
      downWords
    };
  },

  exportToJSON(puzzle) {
    return JSON.stringify(puzzle, null, 2);
  },

  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.width && !data.size) {
        throw new Error('Invalid PuzzlePlot format: Missing size.');
      }
      return data;
    } catch (err) {
      throw new Error(`Failed to parse puzzle: ${err.message}`);
    }
  },

  /**
   * Automatic Crossword Layout Generator (Word Placer & Grid Locks)
   * Places a custom list of words with intersections and automatically fills black square blocks.
   */
  autoGenerateCrossword({ rawInputWords, size = 13, symmetry = '180' }) {
    // 1. Parse and sanitize word list
    const items = [];
    const lines = rawInputWords.split(/\r?\n|,/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let word = trimmed;
      let clue = '';

      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        word = parts[0].trim();
        clue = parts.slice(1).join(':').trim();
      } else if (trimmed.includes('-')) {
        const parts = trimmed.split('-');
        word = parts[0].trim();
        clue = parts.slice(1).join('-').trim();
      }

      const cleanWord = word.toUpperCase().replace(/[^A-ZÑ]/g, '');
      if (cleanWord.length >= 2 && cleanWord.length <= size) {
        items.push({ word: cleanWord, clue: clue || `Clue for ${cleanWord}` });
      }
    });

    if (items.length === 0) {
      throw new Error('Please enter at least one valid word with length between 2 and ' + size + ' letters.');
    }

    // Sort words by length descending
    items.sort((a, b) => b.word.length - a.word.length);

    let bestResult = null;
    let highestScore = -Infinity;

    // Run multiple layout trials
    const trials = size === 5 ? 25 : size === 13 ? 60 : 40;

    for (let trial = 0; trial < trials; trial++) {
      const grid = Array.from({ length: size }, () => Array(size).fill(null));
      const placed = [];

      // Place first word centrally
      const first = items[0];
      const isFirstAcross = trial % 2 === 0;
      const startRow = isFirstAcross ? Math.floor(size / 2) : Math.floor((size - first.word.length) / 2);
      const startCol = isFirstAcross ? Math.floor((size - first.word.length) / 2) : Math.floor(size / 2);

      for (let i = 0; i < first.word.length; i++) {
        const r = isFirstAcross ? startRow : startRow + i;
        const c = isFirstAcross ? startCol + i : startCol;
        grid[r][c] = first.word[i];
      }
      placed.push({ ...first, row: startRow, col: startCol, direction: isFirstAcross ? 'across' : 'down' });

      // Try placing subsequent words
      for (let wIdx = 1; wIdx < items.length; wIdx++) {
        const item = items[wIdx];
        const word = item.word;
        let bestCandidate = null;
        let bestCandidateIntersections = 0;

        // Search possible intersections with already placed letters
        for (let pIdx = 0; pIdx < placed.length; pIdx++) {
          const p = placed[pIdx];
          const newDir = p.direction === 'across' ? 'down' : 'across';

          for (let pi = 0; pi < p.word.length; pi++) {
            const pChar = p.word[pi];
            const pR = p.direction === 'across' ? p.row : p.row + pi;
            const pC = p.direction === 'across' ? p.col + pi : p.col;

            for (let wi = 0; wi < word.length; wi++) {
              if (word[wi] === pChar) {
                const candRow = newDir === 'across' ? pR : pR - wi;
                const candCol = newDir === 'across' ? pC - wi : pC;

                if (candRow < 0 || candCol < 0) continue;
                if (newDir === 'across' && candCol + word.length > size) continue;
                if (newDir === 'down' && candRow + word.length > size) continue;

                // Validate placement
                let isValid = true;
                let intersections = 0;

                // Check before word boundary
                const beforeR = newDir === 'across' ? candRow : candRow - 1;
                const beforeC = newDir === 'across' ? candCol - 1 : candCol;
                if (beforeR >= 0 && beforeC >= 0 && grid[beforeR][beforeC] !== null) {
                  isValid = false;
                }

                // Check after word boundary
                const afterR = newDir === 'across' ? candRow : candRow + word.length;
                const afterC = newDir === 'across' ? candCol + word.length : candCol;
                if (afterR < size && afterC < size && grid[afterR][afterC] !== null) {
                  isValid = false;
                }

                if (!isValid) continue;

                for (let k = 0; k < word.length; k++) {
                  const r = newDir === 'across' ? candRow : candRow + k;
                  const c = newDir === 'across' ? candCol + k : candCol;
                  const currentCell = grid[r][c];

                  if (currentCell !== null) {
                    if (currentCell !== word[k]) {
                      isValid = false;
                      break;
                    } else {
                      intersections++;
                    }
                  } else {
                    // Check parallel neighbors
                    if (newDir === 'across') {
                      if ((r > 0 && grid[r - 1][c] !== null) || (r < size - 1 && grid[r + 1][c] !== null)) {
                        isValid = false;
                        break;
                      }
                    } else {
                      if ((c > 0 && grid[r][c - 1] !== null) || (c < size - 1 && grid[r][c + 1] !== null)) {
                        isValid = false;
                        break;
                      }
                    }
                  }
                }

                if (isValid && intersections > bestCandidateIntersections) {
                  bestCandidateIntersections = intersections;
                  bestCandidate = {
                    ...item,
                    row: candRow,
                    col: candCol,
                    direction: newDir
                  };
                }
              }
            }
          }
        }

        if (bestCandidate) {
          for (let k = 0; k < bestCandidate.word.length; k++) {
            const r = bestCandidate.direction === 'across' ? bestCandidate.row : bestCandidate.row + k;
            const c = bestCandidate.direction === 'across' ? bestCandidate.col + k : bestCandidate.col;
            grid[r][c] = bestCandidate.word[k];
          }
          placed.push(bestCandidate);
        }
      }

      // Convert to standard grid structure with black blocks
      const finalGrid = CrosswordUtils.createEmptyGrid(size, size);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] !== null) {
            finalGrid[r][c].isBlock = false;
            finalGrid[r][c].value = grid[r][c];
          } else {
            finalGrid[r][c].isBlock = true;
            finalGrid[r][c].value = '';
          }
        }
      }

      // Score this layout
      const score = (placed.length * 100) - (size * size - placed.length * 5);
      if (score > highestScore) {
        highestScore = score;
        bestResult = {
          grid: finalGrid,
          placed,
          unplaced: items.filter(it => !placed.some(p => p.word === it.word))
        };
      }
    }

    // Compute standard numbers and map clues
    const { grid: finalNumberedGrid, acrossWords, downWords } = CrosswordUtils.computeNumbersAndWords(bestResult.grid);
    const clues = { across: {}, down: {} };

    bestResult.placed.forEach(p => {
      if (p.direction === 'across') {
        const match = acrossWords.find(w => w.row === p.row && w.col === p.col);
        if (match) clues.across[match.number.toString()] = p.clue;
      } else {
        const match = downWords.find(w => w.row === p.row && w.col === p.col);
        if (match) clues.down[match.number.toString()] = p.clue;
      }
    });

    // Provide default descriptions for any additional slots formed by crossings
    acrossWords.forEach(w => {
      if (!clues.across[w.number.toString()]) {
        clues.across[w.number.toString()] = `Clue for ${w.letters.trim()}`;
      }
    });
    downWords.forEach(w => {
      if (!clues.down[w.number.toString()]) {
        clues.down[w.number.toString()] = `Clue for ${w.letters.trim()}`;
      }
    });

    return {
      grid: finalNumberedGrid,
      clues,
      placedCount: bestResult.placed.length,
      totalCount: items.length,
      placedWords: bestResult.placed,
      unplacedWords: bestResult.unplaced
    };
  }
};
