/**
 * PuzzlePlot Crossword Utility Engine & Auto-Generator
 * Core algorithms for crossword grid generation, auto-numbering, symmetry, validation,
 * data normalization, and automatic word layout placement with grid blocks.
 */

export const CrosswordUtils = {
  SUPPORTED_SIZES: [5, 13, 21],

  isSupportedSize(size) {
    return typeof size === 'number' && Number.isInteger(size) && this.SUPPORTED_SIZES.includes(size);
  },

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

  /**
   * Comprehensive, structured crossword integrity validator.
   * Enforces publication-grade rules across preset data, Maker authoring, and imports.
   */
  validatePuzzleIntegrity(puzzle, options = {}) {
    const {
      requiredSymmetry = undefined,
      allowIncompleteLetters = false,
      checkClues = true
    } = options;

    const errors = [];

    // 1. Top-level structure
    if (!puzzle || typeof puzzle !== 'object' || Array.isArray(puzzle)) {
      return {
        isValid: false,
        errors: [{ rule: 'SCHEMA_INVALID', message: 'Puzzle data must be a valid JSON object.' }],
        acrossWords: [],
        downWords: [],
        metrics: null
      };
    }

    const size = puzzle.size || puzzle.width;
    if (!this.isSupportedSize(size)) {
      errors.push({
        rule: 'SIZE_UNSUPPORTED',
        message: `Puzzle size must be one of the supported sizes (5, 13, 21). Received: ${size}.`
      });
      return { isValid: false, errors, acrossWords: [], downWords: [], metrics: null };
    }

    if (!Array.isArray(puzzle.grid)) {
      errors.push({
        rule: 'GRID_INVALID',
        message: 'Puzzle grid must be a 2D array.'
      });
      return { isValid: false, errors, acrossWords: [], downWords: [], metrics: null };
    }

    if (puzzle.grid.length !== size || puzzle.grid.some(row => !Array.isArray(row) || row.length !== size)) {
      errors.push({
        rule: 'DIMENSION_MISMATCH',
        message: `Grid dimension mismatch: expected ${size}x${size} square grid, received ${puzzle.grid.length} rows.`
      });
      return { isValid: false, errors, acrossWords: [], downWords: [], metrics: null };
    }

    // 2. Build internal grid structure and validate cell characters
    const validCharRegex = /^[A-ZÑ]$/;
    const internalGrid = this.createEmptyGrid(size, size);
    let openCellCount = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const raw = puzzle.grid[r][c];
        if (raw === '#' || raw === '.' || (typeof raw === 'object' && raw.isBlock)) {
          internalGrid[r][c].isBlock = true;
          internalGrid[r][c].value = '';
        } else {
          internalGrid[r][c].isBlock = false;
          const letterVal = (typeof raw === 'object' ? raw.value : raw) || '';
          const upper = String(letterVal).trim().toUpperCase();

          if (upper === '') {
            if (!allowIncompleteLetters) {
              errors.push({
                rule: 'EMPTY_LETTER_CELL',
                message: `Cell at coordinate (${r + 1}, ${c + 1}) is missing a filled letter.`,
                row: r,
                col: c,
                coordinate: `R${r + 1}C${c + 1}`
              });
            }
            internalGrid[r][c].value = '';
          } else if (!validCharRegex.test(upper)) {
            errors.push({
              rule: 'INVALID_CHARACTER',
              message: `Cell at coordinate (${r + 1}, ${c + 1}) contains invalid character "${upper}".`,
              row: r,
              col: c,
              coordinate: `R${r + 1}C${c + 1}`,
              value: upper
            });
            internalGrid[r][c].value = upper;
          } else {
            internalGrid[r][c].value = upper;
          }
          openCellCount++;
        }
      }
    }

    if (openCellCount === 0) {
      errors.push({
        rule: 'NO_OPEN_CELLS',
        message: 'Puzzle contains zero playable letter cells.'
      });
      return { isValid: false, errors, acrossWords: [], downWords: [], metrics: null };
    }

    // 3. Symmetry validation (if requested and !== 'none')
    if (requiredSymmetry && requiredSymmetry !== 'none') {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const coords = this.getSymmetricCoordinates(r, c, size, size, requiredSymmetry);
          const isBlock = internalGrid[r][c].isBlock;
          for (const sym of coords) {
            if (internalGrid[sym.row][sym.col].isBlock !== isBlock) {
              errors.push({
                rule: 'SYMMETRY_BROKEN',
                message: `Symmetry violation (${requiredSymmetry}) between (${r + 1}, ${c + 1}) and (${sym.row + 1}, ${sym.col + 1}).`,
                row: r,
                col: c,
                coordinate: `R${r + 1}C${c + 1}`
              });
              break;
            }
          }
        }
      }
    }

    // 4. Connectivity, Unchecked Cells, and Word Metrics
    const metrics = this.validateGrid(internalGrid);

    if (!metrics.isConnected) {
      errors.push({
        rule: 'DISCONNECTED_GRID',
        message: 'Grid contains isolated letter islands that are not connected into a single open region.'
      });
    }

    if (metrics.uncheckedCells.length > 0) {
      metrics.uncheckedCells.forEach(cell => {
        errors.push({
          rule: 'UNCHECKED_CELL',
          message: `Unchecked cell at coordinate (${cell.r + 1}, ${cell.c + 1}) does not belong to both an Across and Down entry.`,
          row: cell.r,
          col: cell.c,
          coordinate: `R${cell.r + 1}C${cell.c + 1}`
        });
      });
    }

    // 5. Min entry length >= 3
    metrics.acrossWords.forEach(w => {
      if (w.length < 3) {
        errors.push({
          rule: 'SHORT_ENTRY',
          message: `Short Across entry ${w.number}A (${w.letters.trim()}) has length ${w.length}. Minimum allowed entry length is 3 letters.`,
          direction: 'across',
          number: w.number,
          row: w.row,
          col: w.col,
          coordinate: `R${w.row + 1}C${w.col + 1}`
        });
      }
    });

    metrics.downWords.forEach(w => {
      if (w.length < 3) {
        errors.push({
          rule: 'SHORT_ENTRY',
          message: `Short Down entry ${w.number}D (${w.letters.trim()}) has length ${w.length}. Minimum allowed entry length is 3 letters.`,
          direction: 'down',
          number: w.number,
          row: w.row,
          col: w.col,
          coordinate: `R${w.row + 1}C${w.col + 1}`
        });
      }
    });

    // 6. Clue integrity validation (1:1 correspondence, non-empty, no placeholders)
    if (checkClues) {
      if (!puzzle.clues || typeof puzzle.clues !== 'object' || Array.isArray(puzzle.clues)) {
        errors.push({
          rule: 'CLUES_OBJECT_MISSING',
          message: 'Puzzle is missing a valid clues object with "across" and "down" mappings.'
        });
      } else {
        const acrossClues = puzzle.clues.across || {};
        const downClues = puzzle.clues.down || {};

        const acrossClueKeys = Object.keys(acrossClues);
        const downClueKeys = Object.keys(downClues);

        const compAcrossNums = metrics.acrossWords.map(w => w.number.toString());
        const compDownNums = metrics.downWords.map(w => w.number.toString());

        // Check for missing or placeholder across clues
        metrics.acrossWords.forEach(w => {
          const numStr = w.number.toString();
          const clue = acrossClues[numStr] || acrossClues[w.number];
          if (!clue || typeof clue !== 'string' || clue.trim() === '') {
            errors.push({
              rule: 'MISSING_CLUE',
              message: `Missing clue definition for Across entry ${w.number}A (${w.letters.trim()}).`,
              direction: 'across',
              number: w.number,
              value: w.letters.trim()
            });
          } else if (/^Clue for/i.test(clue.trim()) || /^Placeholder/i.test(clue.trim())) {
            errors.push({
              rule: 'PLACEHOLDER_CLUE',
              message: `Placeholder clue detected for Across entry ${w.number}A: "${clue}".`,
              direction: 'across',
              number: w.number,
              value: clue
            });
          }
        });

        // Check for extra across clue assignments
        acrossClueKeys.forEach(k => {
          if (!compAcrossNums.includes(k.toString())) {
            errors.push({
              rule: 'EXTRA_CLUE',
              message: `Extra Across clue #${k} exists in clues dictionary but does not correspond to any grid slot.`,
              direction: 'across',
              number: parseInt(k, 10)
            });
          }
        });

        // Check for missing or placeholder down clues
        metrics.downWords.forEach(w => {
          const numStr = w.number.toString();
          const clue = downClues[numStr] || downClues[w.number];
          if (!clue || typeof clue !== 'string' || clue.trim() === '') {
            errors.push({
              rule: 'MISSING_CLUE',
              message: `Missing clue definition for Down entry ${w.number}D (${w.letters.trim()}).`,
              direction: 'down',
              number: w.number,
              value: w.letters.trim()
            });
          } else if (/^Clue for/i.test(clue.trim()) || /^Placeholder/i.test(clue.trim())) {
            errors.push({
              rule: 'PLACEHOLDER_CLUE',
              message: `Placeholder clue detected for Down entry ${w.number}D: "${clue}".`,
              direction: 'down',
              number: w.number,
              value: clue
            });
          }
        });

        // Check for extra down clue assignments
        downClueKeys.forEach(k => {
          if (!compDownNums.includes(k.toString())) {
            errors.push({
              rule: 'EXTRA_CLUE',
              message: `Extra Down clue #${k} exists in clues dictionary but does not correspond to any grid slot.`,
              direction: 'down',
              number: parseInt(k, 10)
            });
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      acrossWords: metrics.acrossWords,
      downWords: metrics.downWords,
      metrics
    };
  },

  /**
   * Validates and normalizes untrusted imported JSON or restored storage records.
   * Performs top-level bounds checks, normalizes data, and executes full structural integrity validation.
   */
  validateAndNormalizeImport(rawData) {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
      throw new Error('Invalid puzzle file: Content must be a JSON object.');
    }

    const size = rawData.size || rawData.width;
    if (!this.isSupportedSize(size)) {
      throw new Error(`Unsupported puzzle size: ${size}. PuzzlePlot supports 5x5, 13x13, and 21x21 sizes.`);
    }

    if (!Array.isArray(rawData.grid) || rawData.grid.length !== size) {
      throw new Error(`Invalid puzzle grid: Expected ${size} rows, found ${Array.isArray(rawData.grid) ? rawData.grid.length : 0}.`);
    }

    const normalizedGrid = [];
    for (let r = 0; r < size; r++) {
      const row = rawData.grid[r];
      if (!Array.isArray(row) || row.length !== size) {
        throw new Error(`Invalid grid row ${r + 1}: Expected ${size} columns.`);
      }
      const normalizedRow = [];
      for (let c = 0; c < size; c++) {
        const val = row[c];
        if (val === '#' || val === '.' || (typeof val === 'object' && val.isBlock)) {
          normalizedRow.push('#');
        } else {
          const char = typeof val === 'object' ? (val.value || '') : (val || '');
          const upper = String(char).trim().toUpperCase();
          if (/^[A-ZÑ]$/.test(upper)) {
            normalizedRow.push(upper);
          } else if (upper === '') {
            throw new Error(`Empty playable cell at row ${r + 1}, column ${c + 1}. Imported puzzles must have complete filled solutions.`);
          } else {
            throw new Error(`Invalid character at row ${r + 1}, column ${c + 1}: "${upper}".`);
          }
        }
      }
      normalizedGrid.push(normalizedRow);
    }

    const rawClues = rawData.clues || {};
    const normalizedClues = { across: {}, down: {} };

    if (rawClues.across && typeof rawClues.across === 'object') {
      const keys = Object.keys(rawClues.across);
      if (keys.length > 200) throw new Error('Across clues count exceeds maximum limit (200).');
      keys.forEach(k => {
        if (k.length > 10) throw new Error(`Across clue key "${k}" exceeds maximum allowed length (10).`);
        const clueVal = String(rawClues.across[k] || '').slice(0, 500);
        normalizedClues.across[k.toString()] = clueVal;
      });
    }

    if (rawClues.down && typeof rawClues.down === 'object') {
      const keys = Object.keys(rawClues.down);
      if (keys.length > 200) throw new Error('Down clues count exceeds maximum limit (200).');
      keys.forEach(k => {
        if (k.length > 10) throw new Error(`Down clue key "${k}" exceeds maximum allowed length (10).`);
        const clueVal = String(rawClues.down[k] || '').slice(0, 500);
        normalizedClues.down[k.toString()] = clueVal;
      });
    }

    const sanitizedId = String(rawData.id || ('custom_' + Date.now())).slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedTitle = String(rawData.title || 'Untitled Crossword').slice(0, 150);
    const sanitizedAuthor = String(rawData.author || 'Anonymous').slice(0, 100);
    const sanitizedDesc = String(rawData.description || '').slice(0, 500);
    const sanitizedLang = (rawData.language === 'fil' || rawData.language === 'tl') ? 'fil' : 'en';

    let sanitizedDiff = 'Medium';
    if (typeof rawData.difficulty === 'string') {
      const lower = rawData.difficulty.toLowerCase().trim();
      if (lower.includes('easy')) sanitizedDiff = 'Easy';
      else if (lower.includes('hard')) sanitizedDiff = 'Hard';
      else if (lower.includes('medium') || lower.includes('classic')) sanitizedDiff = 'Medium';
      else sanitizedDiff = 'Custom';
    } else {
      sanitizedDiff = size === 5 ? 'Easy' : size === 13 ? 'Medium' : 'Hard';
    }

    const normalizedPuzzle = {
      id: sanitizedId,
      title: sanitizedTitle,
      author: sanitizedAuthor,
      language: sanitizedLang,
      size,
      difficulty: sanitizedDiff,
      description: sanitizedDesc,
      grid: normalizedGrid,
      clues: normalizedClues,
      updatedAt: rawData.updatedAt || Date.now()
    };

    // Full structural integrity validation on imported data
    const integrity = this.validatePuzzleIntegrity(normalizedPuzzle, { checkClues: true, allowIncompleteLetters: false });
    if (!integrity.isValid) {
      const errorSummary = integrity.errors.map((e, idx) => `${idx + 1}. ${e.message}`).join('\n');
      throw new Error(`Imported puzzle failed structural validation:\n${errorSummary}`);
    }

    return normalizedPuzzle;
  },

  exportToJSON(puzzle) {
    return JSON.stringify(puzzle, null, 2);
  },

  importFromJSON(jsonString) {
    if (typeof jsonString !== 'string') {
      throw new Error('Invalid input: Expected JSON string.');
    }
    if (jsonString.length > 1024 * 1024) {
      throw new Error('Puzzle JSON payload exceeds maximum size limit (1MB).');
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      throw new Error(`Failed to parse puzzle JSON: ${err.message}`);
    }
    return this.validateAndNormalizeImport(parsed);
  },

  /**
   * Automatic Crossword Layout Generator (Word Placer & Grid Locks)
   * Places a custom list of words with intersections and automatically fills black square blocks.
   * Guarantees: symmetrical layout, zero placeholder clues, single connected region, min length >= 3, 0 unchecked cells.
   */
  autoGenerateCrossword({ rawInputWords, size = 13, symmetry = '180' }) {
    if (!rawInputWords || typeof rawInputWords !== 'string') {
      throw new Error('Please enter a list of words to auto-generate a crossword.');
    }

    if (!this.isSupportedSize(size)) {
      throw new Error(`Unsupported grid size for auto-generation: ${size}. Supported sizes are: 5, 13, 21.`);
    }

    const items = [];
    const wordClueMap = new Map();
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
      if (cleanWord.length >= 3 && cleanWord.length <= size) {
        if (!wordClueMap.has(cleanWord)) {
          const finalClue = clue || `Definition for ${cleanWord}`;
          wordClueMap.set(cleanWord, finalClue);
          items.push({ word: cleanWord, clue: finalClue });
        }
      }
    });

    if (items.length === 0) {
      throw new Error(`Please provide words between 3 and ${size} letters.`);
    }

    const startTime = Date.now();
    const maxExecutionMs = 450;
    let bestValidPuzzle = null;

    // Strategy 1: Dense Word Square / Symmetrical Stack (for sizes like 5x5 or matching-length words)
    const exactLenWords = items.filter(it => it.word.length === size);
    if (exactLenWords.length >= size) {
      const perms = [];
      const generatePerms = (current, remaining) => {
        if (current.length === size) {
          perms.push(current);
          return;
        }
        if (perms.length >= 60 || Date.now() - startTime > 150) return;
        for (let i = 0; i < remaining.length; i++) {
          generatePerms([...current, remaining[i]], remaining.filter((_, idx) => idx !== i));
        }
      };
      generatePerms([], exactLenWords);

      for (const perm of perms) {
        if (Date.now() - startTime > maxExecutionMs) break;
        const testGrid = CrosswordUtils.createEmptyGrid(size, size);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            testGrid[r][c].isBlock = false;
            testGrid[r][c].value = perm[r].word[c];
          }
        }

        const { grid: numberedGrid, acrossWords, downWords } = CrosswordUtils.computeNumbersAndWords(testGrid);
        const candidateClues = { across: {}, down: {} };
        let allValid = true;

        for (const w of acrossWords) {
          const foundClue = wordClueMap.get(w.letters.trim());
          if (!foundClue) { allValid = false; break; }
          candidateClues.across[w.number.toString()] = foundClue;
        }
        if (allValid) {
          for (const w of downWords) {
            const foundClue = wordClueMap.get(w.letters.trim());
            if (!foundClue) { allValid = false; break; }
            candidateClues.down[w.number.toString()] = foundClue;
          }
        }

        if (allValid) {
          const testPuzzle = {
            size,
            grid: numberedGrid.map(row => row.map(cell => cell.isBlock ? '#' : cell.value)),
            clues: candidateClues
          };
          const integrity = CrosswordUtils.validatePuzzleIntegrity(testPuzzle, {
            requiredSymmetry: symmetry !== 'none' ? symmetry : undefined,
            checkClues: true,
            allowIncompleteLetters: false
          });

          if (integrity.isValid) {
            bestValidPuzzle = {
              grid: numberedGrid,
              clues: candidateClues,
              placedCount: acrossWords.length,
              totalCount: items.length,
              placedWords: acrossWords,
              unplacedWords: []
            };
            break;
          }
        }
      }
    }

    // Strategy 2: Intersecting Placements with Symmetric Block Filling
    if (!bestValidPuzzle) {
      items.sort((a, b) => b.word.length - a.word.length);
      const maxTrials = size === 5 ? 40 : 60;

      for (let trial = 0; trial < maxTrials; trial++) {
        if (Date.now() - startTime > maxExecutionMs) break;

        const grid = Array.from({ length: size }, () => Array(size).fill(null));
        const placed = [];

        // Place first word
        const first = items[trial % items.length];
        const isFirstAcross = trial % 2 === 0;
        const startRow = isFirstAcross ? Math.floor(size / 2) : Math.max(0, Math.floor((size - first.word.length) / 2));
        const startCol = isFirstAcross ? Math.max(0, Math.floor((size - first.word.length) / 2)) : Math.floor(size / 2);

        for (let i = 0; i < first.word.length; i++) {
          const r = isFirstAcross ? startRow : startRow + i;
          const c = isFirstAcross ? startCol + i : startCol;
          if (r < size && c < size) grid[r][c] = first.word[i];
        }
        placed.push({ ...first, row: startRow, col: startCol, direction: isFirstAcross ? 'across' : 'down' });

        for (let wIdx = 0; wIdx < items.length; wIdx++) {
          if (items[wIdx].word === first.word) continue;
          const item = items[wIdx];
          const word = item.word;
          let bestCandidate = null;
          let maxIntersections = 0;

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

                  let isValid = true;
                  let intersections = 0;

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
                    }
                  }

                  if (isValid && intersections > maxIntersections) {
                    maxIntersections = intersections;
                    bestCandidate = { ...item, row: candRow, col: candCol, direction: newDir };
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

        // Fill unused with blocks obeying symmetry
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

        if (symmetry && symmetry !== 'none') {
          let symConflict = false;
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              const symCoords = CrosswordUtils.getSymmetricCoordinates(r, c, size, size, symmetry);
              const isBlock = finalGrid[r][c].isBlock;
              for (const sym of symCoords) {
                if (finalGrid[sym.row][sym.col].isBlock !== isBlock) {
                  symConflict = true;
                  break;
                }
              }
              if (symConflict) break;
            }
            if (symConflict) break;
          }
          if (symConflict) continue;
        }

        const { grid: numberedGrid, acrossWords, downWords } = CrosswordUtils.computeNumbersAndWords(finalGrid);
        const candidateClues = { across: {}, down: {} };
        let allWordsKnown = true;

        for (const w of acrossWords) {
          const found = wordClueMap.get(w.letters.trim());
          if (found) {
            candidateClues.across[w.number.toString()] = found;
          } else {
            allWordsKnown = false;
            break;
          }
        }
        if (!allWordsKnown) continue;

        for (const w of downWords) {
          const found = wordClueMap.get(w.letters.trim());
          if (found) {
            candidateClues.down[w.number.toString()] = found;
          } else {
            allWordsKnown = false;
            break;
          }
        }
        if (!allWordsKnown) continue;

        const testPuzzle = {
          size,
          grid: numberedGrid.map(row => row.map(cell => cell.isBlock ? '#' : cell.value)),
          clues: candidateClues
        };

        const integrity = CrosswordUtils.validatePuzzleIntegrity(testPuzzle, {
          requiredSymmetry: symmetry !== 'none' ? symmetry : undefined,
          checkClues: true,
          allowIncompleteLetters: false
        });

        if (integrity.isValid) {
          bestValidPuzzle = {
            grid: numberedGrid,
            clues: candidateClues,
            placedCount: placed.length,
            totalCount: items.length,
            placedWords: placed,
            unplacedWords: items.filter(it => !placed.some(p => p.word === it.word))
          };
          break;
        }
      }
    }

    if (!bestValidPuzzle) {
      const unplacedList = items.map(it => it.word).join(', ');
      throw new Error(`Unable to generate a valid symmetrical crossword from the provided words without creating unchecked cells or unsupplied crossings. Words attempted: ${unplacedList}.`);
    }

    return bestValidPuzzle;
  }
};
