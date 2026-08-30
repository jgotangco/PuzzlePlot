/**
 * PuzzlePlot Crossword Application Bundle
 * Standalone zero-dependency script compatible with file:// protocol and all modern browsers.
 * Includes: Auto-Builder Word Placement Engine, English & Filipino focus, and Tutorials with Beginner/Intermediate/Expert tips.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. SOUND ENGINE (Web Audio API Procedural Synthesizer)
  // =========================================================================
  /**
   * PuzzlePlot Audio Engine
   * Procedural sound generator using Web Audio API. Zero external audio file dependencies.
   */

  class AudioManagerClass {
    constructor() {
      this.audioCtx = null;
      this.isMuted = typeof localStorage !== 'undefined' ? (localStorage.getItem('puzzleplot_sound_muted') === 'true') : false;
    }

    init() {
      if (!this.audioCtx) {
        const AudioContext = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('puzzleplot_sound_muted', this.isMuted.toString());
      }
      return this.isMuted;
    }

    playKeySound() {
      if (this.isMuted) return;
      this.init();
      if (!this.audioCtx) return;

      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(420 + Math.random() * 40, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, this.audioCtx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.04);
      } catch (e) {
        // Audio autoplay policy fallback
      }
    }

    playWordCompleteSound() {
      if (this.isMuted) return;
      this.init();
      if (!this.audioCtx) return;

      try {
        const now = this.audioCtx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.1, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.18);
        });
      } catch (e) {}
    }

    playErrorSound() {
      if (this.isMuted) return;
      this.init();
      if (!this.audioCtx) return;

      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {}
    }

    playVictorySound() {
      if (this.isMuted) return;
      this.init();
      if (!this.audioCtx) return;

      try {
        const now = this.audioCtx.currentTime;
        // Fanfare notes: C5, E5, G5, C6, G5, C6
        const melody = [
          { f: 523.25, d: 0.12, t: 0 },
          { f: 659.25, d: 0.12, t: 0.12 },
          { f: 783.99, d: 0.12, t: 0.24 },
          { f: 1046.50, d: 0.25, t: 0.36 },
          { f: 783.99, d: 0.15, t: 0.62 },
          { f: 1046.50, d: 0.45, t: 0.78 }
        ];

        melody.forEach(note => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, now + note.t);
          gain.gain.setValueAtTime(0.14, now + note.t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now + note.t);
          osc.stop(now + note.t + note.d);
        });
      } catch (e) {}
    }
  }

  const SoundEngine = new AudioManagerClass();
  const AudioManager = SoundEngine;

  // =========================================================================
  // 2. CROSSWORD UTILITIES, NUMBERING & AUTO-GENERATOR
  // =========================================================================
  /**
   * PuzzlePlot Crossword Utility Engine & Auto-Generator
   * Core algorithms for crossword grid generation, auto-numbering, symmetry, validation,
   * data normalization, and automatic word layout placement with grid blocks.
   */

  const CrosswordUtils = {
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

  // =========================================================================
  // 3. DICTIONARY & PATTERN SEARCH (English & Filipino)
  // =========================================================================
  /**
   * PuzzlePlot Multi-Language Word Dictionaries & Pattern Search
   * Focused on English and Filipino (Tagalog) vocabulary and wildcard search.
   */

  const DictionaryData = {
    // English Common Crossword Lexicon
    en: [
      'ACE', 'ACT', 'AGE', 'AIR', 'ALL', 'AND', 'ANT', 'ANY', 'APE', 'ARC', 'ARK', 'ARM', 'ART', 'ASH', 'ASK',
      'AURA', 'AUTO', 'AWAY', 'AXIS', 'BABY', 'BACK', 'BAKE', 'BALL', 'BAND', 'BANK', 'BARK', 'BARN', 'BASE',
      'BEAM', 'BEAN', 'BEAR', 'BEAT', 'BELL', 'BELT', 'BEND', 'BEST', 'BIRD', 'BITE', 'BLIP', 'BLOW', 'BLUE',
      'BOAT', 'BOLD', 'BOLT', 'BOND', 'BONE', 'BOOK', 'BOOM', 'BOOT', 'BORE', 'BORN', 'BOSS', 'BOWL', 'BRAG',
      'BRED', 'BREE', 'BRIM', 'BULL', 'BUMP', 'BURN', 'BURP', 'BUSH', 'BUSY', 'CAFE', 'CAKE', 'CALM', 'CAMP',
      'CANE', 'CAPE', 'CARD', 'CARE', 'CART', 'CASE', 'CASH', 'CAST', 'CAVE', 'CELL', 'CHAT', 'CHEF', 'CHIP',
      'CITY', 'CLAP', 'CLAW', 'CLAY', 'CLIP', 'CLUB', 'CLUE', 'COAL', 'COAT', 'CODE', 'COIL', 'COIN', 'COLD',
      'COLT', 'COMB', 'CONE', 'COOK', 'COOL', 'COPE', 'CORD', 'CORE', 'CORK', 'CORN', 'COST', 'COZY', 'CRAB',
      'CROP', 'CROW', 'CUBE', 'CURE', 'CURL', 'CUTE', 'DAME', 'DAMP', 'DARE', 'DARK', 'DART', 'DASH', 'DATE',
      'DAWN', 'DEAD', 'DEAF', 'DEAL', 'DEAR', 'DECK', 'DEED', 'DEEP', 'DEER', 'DEMO', 'DENT', 'DESK', 'DIAL',
      'DIET', 'DIME', 'DIRT', 'DISC', 'DISH', 'DISK', 'DIVE', 'DOCK', 'DOLL', 'DOME', 'DOOM', 'DOOR', 'DOSE',
      'DOVE', 'DOWN', 'DRAG', 'DRAW', 'DRIP', 'DROP', 'DRUM', 'DUAL', 'DUCK', 'DUET', 'DULL', 'DUNE', 'DUST',
      'DUTY', 'EACH', 'EARL', 'EARN', 'EARS', 'EASE', 'EAST', 'EASY', 'ECHO', 'EDGE', 'EDIT', 'EMIT', 'ENVY',
      'EPIC', 'EVEN', 'EVER', 'EVIL', 'EXAM', 'EXIT', 'EYES', 'FACE', 'FACT', 'FADE', 'FAIR', 'FALL', 'FAME',
      'FANG', 'FARM', 'FAST', 'FATE', 'FEAR', 'FEAT', 'FEED', 'FEEL', 'FEET', 'FELL', 'FELT', 'FERN', 'FILE',
      'FILL', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIST', 'FLAG', 'FLAT', 'FLEA', 'FLEE', 'FLEX',
      'FLIP', 'FLOW', 'FOAM', 'FOIL', 'FOLD', 'FOLK', 'FOND', 'FOOD', 'FOOL', 'FOOT', 'FORD', 'FORK', 'FORM',
      'FORT', 'FOUL', 'FOUR', 'FREE', 'FROG', 'FROM', 'FUEL', 'FULL', 'FUND', 'FURY', 'FUSE', 'GAIN', 'GALA',
      'GAME', 'GATE', 'GEAR', 'GEMS', 'GENE', 'GIFT', 'GIRL', 'GLAD', 'GLEN', 'GLOW', 'GOAL', 'GOAT', 'GOLD',
      'GOLF', 'GONE', 'GOOD', 'GRAB', 'GRID', 'GRIN', 'GRIP', 'GROW', 'GULF', 'GURU', 'HAIL', 'HAIR', 'HALF',
      'HALL', 'HALT', 'HAND', 'HANG', 'HARD', 'HARE', 'HARM', 'HARP', 'HATE', 'HAVE', 'HAWK', 'HEAD', 'HEAL',
      'HEAP', 'HEAR', 'HEAT', 'HEED', 'HEEL', 'HEIR', 'HELD', 'HELM', 'HELP', 'HERB', 'HERD', 'HERO', 'HIDE',
      'HIGH', 'HIKE', 'HILL', 'HINT', 'HIRE', 'HISS', 'HIVE', 'HOLD', 'HOLE', 'HOME', 'HOOD', 'HOOK', 'HOPE',
      'HORN', 'HOSE', 'HOST', 'HOUR', 'HUGE', 'HUNT', 'HURT', 'HYMN', 'ICON', 'IDEA', 'IDLE', 'IDOL', 'INCH',
      'INFO', 'INTO', 'IRIS', 'IRON', 'ISLE', 'ITEM', 'JADE', 'JAIL', 'JAZZ', 'JEAN', 'JEEP', 'JOIN', 'JOKE',
      'JOLT', 'JUMP', 'JUNE', 'JURY', 'JUST', 'JUTE', 'KEEL', 'KEEN', 'KEEP', 'KELP', 'KICK', 'KILO', 'KIND',
      'KING', 'KISS', 'KITE', 'KNEE', 'KNOB', 'KNOT', 'KNOW', 'LACE', 'LACK', 'LADY', 'LAID', 'LAKE', 'LAMB',
      'LAMP', 'LAND', 'LANE', 'LAST', 'LATE', 'LAVA', 'LAWN', 'LEAD', 'LEAF', 'LEAP', 'LEFT', 'LEND', 'LENS',
      'LIFT', 'LIME', 'LINE', 'LINK', 'LION', 'LIPS', 'LIST', 'LIVE', 'LOAD', 'LOAF', 'LOAN', 'LOCK', 'LOGS',
      'LONG', 'LOOK', 'LOOP', 'LORD', 'LOSE', 'LOSS', 'LOUD', 'LOVE', 'LUCK', 'LUSH', 'LYNX', 'MADE', 'MAID',
      'MAIL', 'MAIN', 'MAKE', 'MALL', 'MANE', 'MAPS', 'MARK', 'MASK', 'MASS', 'MAST', 'MATE', 'MAZE', 'MEAL',
      'MEAN', 'MEAT', 'MEET', 'MELT', 'MEMO', 'MEND', 'MENU', 'MESA', 'MESH', 'MILD', 'MILE', 'MILK', 'MILL',
      'MIND', 'MINE', 'MINT', 'MIST', 'MOCK', 'MODE', 'MOOD', 'MOON', 'MOOR', 'MOSS', 'MOST', 'MOTH', 'MOVE',
      'MUCH', 'MULE', 'MUSE', 'MUST', 'MUTE', 'NAIL', 'NAME', 'NAVY', 'NEAR', 'NEAT', 'NECK', 'NEED', 'NEON',
      'NEST', 'NEWS', 'NEXT', 'NICE', 'NODE', 'NOON', 'NORM', 'NOSE', 'NOTE', 'OAKS', 'OARS', 'OATH', 'OBEY',
      'OCEAN', 'OCTET', 'OLIVE', 'OMEGA', 'ONION', 'OPERA', 'ORBIT', 'ORDER', 'ORGAN', 'OTHER', 'OTTER', 'OUNCE',
      'OUTER', 'OXIDE', 'OZONE', 'PANDA', 'PANEL', 'PANIC', 'PANSY', 'PAPER', 'PARCH', 'PARIS', 'PARKA', 'PARTY',
      'PATCH', 'PAUSE', 'PEACE', 'PEACH', 'PEARL', 'PEDAL', 'PENNY', 'PERCH', 'PETAL', 'PHASE', 'PIANO', 'PILOT',
      'PINCH', 'PIPER', 'PIVOT', 'PIXEL', 'PIZZA', 'PLACE', 'PLAID', 'PLAIN', 'PLANE', 'PLANK', 'PLANT', 'PLATE',
      'PLAZA', 'PLUME', 'PLUMP', 'POINT', 'POLAR', 'POLKA', 'POPPY', 'PORCH', 'POUND', 'POWER', 'PRAWN', 'PRIDE',
      'PRIME', 'PRISM', 'PRIZE', 'PROBE', 'PRONE', 'PROOF', 'PROSE', 'PROUD', 'PULSE', 'PUPIL', 'PUPPY', 'PURSE',
      'QUEEN', 'QUERY', 'QUEST', 'QUICK', 'QUIET', 'QUILT', 'QUIRK', 'QUOTA', 'QUOTE', 'RADAR', 'RADIO', 'RADON',
      'RANCH', 'RANGE', 'RAPID', 'RATIO', 'RAVEN', 'RAZOR', 'REACH', 'REACT', 'REALM', 'REBEL', 'REGAL', 'REIGN',
      'RELAX', 'RELIC', 'REMIX', 'RENEW', 'REPAY', 'REPEL', 'REPLY', 'RESET', 'RESIN', 'RETRO', 'RIDER', 'RIDGE',
      'RIGHT', 'RIGID', 'RINSE', 'RIVAL', 'RIVER', 'ROAST', 'ROBOT', 'ROCKY', 'ROGUE', 'ROMAN', 'ROOFT', 'ROOST',
      'ROUND', 'ROUSE', 'ROUTE', 'ROYAL', 'RUBLE', 'RULER', 'RUMOR', 'RURAL', 'RUSTY', 'SABER', 'SADLY', 'SAINT',
      'SALAD', 'SALON', 'SALSA', 'SALTY', 'SANDY', 'SATIN', 'SAUCE', 'SCALE', 'SCARE', 'SCARF', 'SCENE', 'SCENT',
      'SCOOP', 'SCOPE', 'SCORE', 'SCOUT', 'SCRAM', 'SCREW', 'SCRUB', 'SEALS', 'SEDAN', 'SHADE', 'SHAFT', 'SHAKE',
      'SHALL', 'SHAME', 'SHANK', 'SHAPE', 'SHARE', 'SHARK', 'SHARP', 'SHEAR', 'SHED', 'SHEEP', 'SHEER', 'SHEET',
      'SHELF', 'SHELL', 'SHINE', 'SHINY', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORE', 'SHORT', 'SHOUT', 'SHOWN', 'SHRUG',
      'SIGHT', 'SIGMA', 'SILENT', 'SILVER', 'SIMPLE', 'SINGER', 'SINGLE', 'SKETCH', 'SLIDER', 'SMILE', 'SMOOTH',
      'SNOWY', 'SOLAR', 'SOLID', 'SOLVE', 'SONAR', 'SONIC', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARK', 'SPAWN',
      'SPEAK', 'SPEAR', 'SPEED', 'SPELL', 'SPICE', 'SPICY', 'SPIDER', 'SPILL', 'SPINE', 'SPIRIT', 'SPLIT', 'SPOIL',
      'SPOON', 'SPORT', 'SPRAY', 'SPRING', 'SPRINT', 'SPRUCE', 'SQUARE', 'SQUASH', 'STABLE', 'STAFF', 'STAGE',
      'STAIN', 'STAIR', 'STAKE', 'STALK', 'STAMP', 'STAND', 'STARE', 'START', 'STATE', 'STEAM', 'STEEL', 'STEEP',
      'STEER', 'STICK', 'STILL', 'STING', 'STOCK', 'STONE', 'STOOL', 'STORM', 'STORY', 'STOVE', 'STRAP', 'STRAW',
      'STRAY', 'STREAM', 'STREET', 'STRESS', 'STRIKE', 'STRING', 'STRIP', 'STRONG', 'STUDIO', 'STYLE', 'SUGAR',
      'SUMMER', 'SUMMIT', 'SUNSET', 'SUPER', 'SUPPLY', 'SURF', 'SURGE', 'SWAN', 'SWEATER', 'SWEEP', 'SWEET',
      'SWIFT', 'SWING', 'SWITCH', 'SWORD', 'SYMBOL', 'SYRUP', 'TABLE', 'TABLET', 'TAILOR', 'TALENT', 'TANGO',
      'TARGET', 'TARIFF', 'TASTE', 'TEACH', 'TEAM', 'TEMPO', 'TENNIS', 'TERRA', 'THEME', 'THEORY', 'THIRST',
      'THORN', 'THREAD', 'THRIVE', 'THRONE', 'THUMB', 'TIGER', 'TIMBER', 'TIMELY', 'TOAST', 'TOKEN', 'TOMATO',
      'TONGUE', 'TOPAZ', 'TORCH', 'TOTAL', 'TOUCH', 'TOWER', 'TRACE', 'TRACK', 'TRACT', 'TRADE', 'TRAIL', 'TRAIN',
      'TRAIT', 'TRAMP', 'TRAVEL', 'TREAT', 'TREND', 'TRIAD', 'TRIAL', 'TRIBE', 'TRICK', 'TRIPOD', 'TROPHY', 'TROPIC',
      'TROUT', 'TRUCK', 'TRULY', 'TRUMP', 'TRUNK', 'TRUST', 'TRUTH', 'TULIP', 'TUNEL', 'TURBO', 'TURKEY', 'TURNIP',
      'TWELVE', 'TWIGS', 'TWIN', 'TWIST', 'TYPING', 'ULTRA', 'UMBRA', 'UNCLE', 'UNDER', 'UNIFY', 'UNION', 'UNIQUE',
      'UNITY', 'UNSET', 'UNTIE', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'UTILE', 'UTTER', 'VACANT',
      'VALET', 'VALID', 'VALLEY', 'VALOR', 'VALVE', 'VAPOR', 'VAULT', 'VECTOR', 'VELVET', 'VENDOR', 'VENT', 'VERB',
      'VERGE', 'VERIFY', 'VESSEL', 'VIABLE', 'VICTOR', 'VIDEO', 'VIGOR', 'VILLA', 'VIOLET', 'VIPER', 'VIRAL', 'VIRTUE',
      'VISION', 'VISIT', 'VISUAL', 'VITAL', 'VIVID', 'VOCAL', 'VOGUE', 'VOICE', 'VOLCANO', 'VORTEX', 'VOTER', 'VOYAGE',
      'WALNUT', 'WARMTH', 'WARNING', 'WARRIOR', 'WATER', 'WAVING', 'WEALTH', 'WEAPON', 'WEATHER', 'WEBSITE', 'WEEKLY',
      'WEIGHT', 'WELCOME', 'WHEEL', 'WHISPER', 'WIDGET', 'WILDLIFE', 'WINDOW', 'WINNER', 'WINTER', 'WISDOM', 'WIZARD',
      'WONDER', 'WOODEN', 'WORKER', 'WORLD', 'WORTHY', 'WRITER', 'YELLOW', 'YIELD', 'ZENITH', 'ZEPHYR', 'ZODIAC'
    ],

    // Filipino (Tagalog) Common Crossword Lexicon
    fil: [
      'AKO', 'ANO', 'ANG', 'ARAW', 'APOY', 'ALAM', 'ALON', 'ASO', 'ATIS', 'AWIT', 'AYOS', 'BATA', 'BALA', 'BAHO',
      'BAKA', 'BALI', 'BATO', 'BAYI', 'BIDA', 'BIGO', 'BILI', 'BISA', 'BITA', 'BIYA', 'BOLA', 'BOSO', 'BUAN',
      'BUHA', 'BUHO', 'BUKA', 'BUKO', 'BULA', 'BULI', 'BULO', 'BUNO', 'BURA', 'BURI', 'BUSA', 'BUSO', 'BUTI',
      'BAYA', 'DAMI', 'DAPO', 'DATI', 'DATO', 'DAYA', 'DILI', 'DINA', 'DITO', 'DIWA', 'DUGO', 'DUHA', 'DUSA',
      'GABI', 'GALA', 'GANA', 'GARA', 'GASA', 'GATA', 'GAYO', 'GIBA', 'GILI', 'GINA', 'GINO', 'GISA', 'GITA',
      'GUBA', 'GUHO', 'GULA', 'GULI', 'GURO', 'GUSA', 'GUTI', 'HABO', 'HAGA', 'HALA', 'HANA', 'HAPA', 'HARA',
      'HARI', 'HASA', 'HATA', 'HATI', 'HAYO', 'HIBA', 'HILA', 'HINA', 'HIPA', 'HITA', 'HIYA', 'HUBO', 'HULA',
      'HULI', 'HUNI', 'HUSA', 'IBON', 'IKAW', 'IKOT', 'ILOG', 'INIT', 'ISDA', 'ISIP', 'KAIN', 'KAPE', 'KASI',
      'KITA', 'KUBO', 'KUHA', 'KULI', 'KULA', 'KULO', 'KUTO', 'KUYA', 'LABI', 'LAKI', 'LAKO', 'LALA', 'LALO',
      'LAMI', 'LANA', 'LAPA', 'LAPI', 'LARA', 'LARI', 'LASA', 'LATA', 'LAWA', 'LAYA', 'LEEG', 'LIMA', 'LIMO',
      'LINA', 'LINO', 'LIPA', 'LIPO', 'LISA', 'LITA', 'LIWA', 'LIYA', 'LUBA', 'LUGA', 'LUHA', 'LUKO', 'LULA',
      'LULI', 'LUMA', 'LUMI', 'LUNA', 'LUPA', 'LUPO', 'LURA', 'LURI', 'LUSA', 'LUTO', 'MABA', 'MAGA', 'MAHA',
      'MAHI', 'MAKA', 'MAKI', 'MAKO', 'MALA', 'MALI', 'MALO', 'MAMA', 'MANA', 'MANI', 'MANO', 'MAPA', 'MARA',
      'MASA', 'MASI', 'MATA', 'MATI', 'MAWA', 'MAYA', 'MAYO', 'MILI', 'MURA', 'MUSA', 'MUTA', 'NANA', 'NANI',
      'NASA', 'NASI', 'NAWA', 'NILA', 'NINA', 'NIPA', 'NITA', 'NOON', 'OPO', 'ORAS', 'PAA', 'PAGA', 'PAGI',
      'PAGO', 'PAHA', 'PAHI', 'PAKA', 'PAKI', 'PAKO', 'PALA', 'PALI', 'PANA', 'PANI', 'PANO', 'PAPA', 'PARA',
      'PARI', 'PASA', 'PASI', 'PATA', 'PATI', 'PAWA', 'PAYO', 'PILI', 'PINO', 'PISO', 'PITA', 'POOK', 'PULA',
      'PULI', 'PULO', 'PUNA', 'PUNO', 'PURA', 'PURI', 'PUSA', 'PUSO', 'PUTI', 'PUTO', 'SABA', 'SABI', 'SABO',
      'SAGA', 'SAGO', 'SAKA', 'SAKI', 'SAKO', 'SALA', 'SALI', 'SAMA', 'SAMI', 'SAMO', 'SANA', 'SANG', 'SAPA',
      'SAPI', 'SAPO', 'SARA', 'SARI', 'SASA', 'SAYA', 'SAYO', 'SIGA', 'SILA', 'SILI', 'SILO', 'SINA', 'SINI',
      'SIPA', 'SIPI', 'SIRA', 'SIRO', 'SITA', 'SIYA', 'SUBO', 'SUHA', 'SUKA', 'SUKI', 'SUKO', 'SULA', 'SULI',
      'SULO', 'SUMA', 'SUNA', 'SUNI', 'SURA', 'SURI', 'SURO', 'SUSA', 'SUTI', 'SUYA', 'TAAS', 'TABA', 'TABI',
      'TABO', 'TAGA', 'TAGI', 'TAGO', 'TAHA', 'TAHI', 'TAHO', 'TAKA', 'TAKI', 'TAKO', 'TALA', 'TALI', 'TALO',
      'TAMA', 'TANA', 'TAPA', 'TAPI', 'TAPO', 'TARA', 'TARI', 'TASA', 'TASI', 'TASO', 'TATA', 'TATI', 'TATO',
      'TAWA', 'TAWI', 'TAWO', 'TAYA', 'TAYO', 'TIBA', 'TIKA', 'TILA', 'TILI', 'TIMA', 'TIMI', 'TIMO', 'TINA',
      'TIPA', 'TIPI', 'TIRA', 'TIRI', 'TIRO', 'TISA', 'TITA', 'TITO', 'TIYA', 'TIYO', 'TUBA', 'TUBI', 'TUBO',
      'TUGA', 'TUGO', 'TUHA', 'TUHO', 'TUKA', 'TUKO', 'TULA', 'TULI', 'TULO', 'TUMA', 'TUMI', 'TUMO', 'TUNA',
      'TUNG', 'TUPA', 'TUPI', 'TUPO', 'TURA', 'TURI', 'TURO', 'TUSA', 'TUSI', 'TUTA', 'TUTI', 'TUTO', 'TUWA',
      'TUWI', 'TUWO', 'UBAS', 'UGAT', 'ULAN', 'ULAT', 'ULAP', 'UMAG', 'UNA', 'UOD', 'UPAN', 'UPIS', 'URAS',
      'USOK', 'UTAK', 'UTOS', 'WALA', 'WALI', 'WATA', 'WIKA', 'WILI',
      'AGILA', 'AKLAT', 'ALAGA', 'ALILA', 'ALIW', 'AMBON', 'ANINO', 'ANTAS', 'ANYO', 'ARAL', 'ASUKAL',
      'BABAE', 'BAGAY', 'BAGYO', 'BAHAY', 'BAKOD', 'BALAK', 'BALAT', 'BALIK', 'BALITA', 'BALON', 'BANAL',
      'BANSA', 'BANYO', 'BARIL', 'BASAG', 'BATAS', 'BATIS', 'BAWAT', 'BAWAL', 'BAYAN', 'BAYANI', 'BIGAS',
      'BIGAT', 'BIGLA', 'BIHIS', 'BILANG', 'BILIS', 'BILOG', 'BINHI', 'BISIG', 'BIYAYA', 'BUKAS', 'BUKID',
      'BUNGA', 'BUNSO', 'BUROL', 'BUTIL', 'BUTO', 'BUWAN', 'DAGAT', 'DAHON', 'DAKILA', 'DALAW', 'DALOY',
      'DAMIT', 'DANGAL', 'DAPAT', 'DIWA', 'DIWATA', 'DUNONG', 'DUYAN', 'GABAY', 'GALANG', 'GALAW', 'GALING',
      'GAMIT', 'GAMOT', 'GANAP', 'GAYAK', 'GINTO', 'GITNA', 'GUBAT', 'GUHIT', 'GULAY', 'GULONG', 'GUTOM',
      'HABAG', 'HAGDAN', 'HALAGA', 'HALAMAN', 'HANAP', 'HANGAD', 'HANGIN', 'HAPON', 'HAYOP', 'HAYAG', 'HILAGA',
      'HILING', 'HIMIG', 'HINDI', 'HININGA', 'HINOG', 'HIPON', 'HIWAGA', 'HUDYAT', 'HUKOM', 'HULOG', 'HUSTO',
      'HUSAY', 'IBABA', 'IBAYO', 'IBIG', 'ILAW', 'ILOG', 'INGAT', 'INIP', 'IPON', 'ISLA', 'ITAAS', 'ITLOG',
      'IWAN', 'IWAS', 'IYAK', 'KABAYO', 'KAGAT', 'KAHOY', 'KAIBIGAN', 'KAILAN', 'KALABAW', 'KALAYAAN',
      'KALIWA', 'KAMAY', 'KAMPO', 'KANAN', 'KANDILA', 'KAPAG', 'KAPAL', 'KAPIT', 'KAPWA', 'KASAMA', 'KASAYSAYAN',
      'KATAPATAN', 'KAUGALIAN', 'KAWANI', 'KAYAMANAN', 'KILALA', 'KILOS', 'KILAY', 'KULAY', 'KULTURA', 'KUNDIMAN',
      'KUWENTO', 'LABAN', 'LAKAS', 'LALAKI', 'LAMIG', 'LANGIT', 'LANGGAM', 'LARAWAN', 'LARO', 'LIHAM', 'LIGAYA',
      'LINIS', 'LIPUNAN', 'LIWANAG', 'LUGAR', 'LUNGSOD', 'LUPAIN', 'MAAGA', 'MAALAT', 'MAALAM', 'MAAMO',
      'MABABANG', 'MABANGO', 'MABAIT', 'MABINI', 'MABUTI', 'MADALI', 'MADALAS', 'MAGALANG', 'MAGANDA', 'MAGALING',
      'MAHABA', 'MAHAL', 'MAHARLIKA', 'MAHINA', 'MAHUSAY', 'MAINGAT', 'MAINIT', 'MAINAM', 'MAIS', 'MAKATA',
      'MALABO', 'MALAKAS', 'MALAKI', 'MALALIM', 'MALAMAN', 'MALAWAK', 'MALAYA', 'MALAYO', 'MALIGAYA', 'MALINIS',
      'MALINAW', 'MALIIT', 'MALUNGKOT', 'MAMAMAYAN', 'MAPALAD', 'MAPAYAPA', 'MARAMI', 'MARANGAL', 'MARIKIT',
      'MASAGANA', 'MASARAP', 'MASAYANG', 'MASIGLA', 'MASINOP', 'MATABA', 'MATALINO', 'MATATAG', 'MATIPID',
      'MAUNLAD', 'MAUTAK', 'MAYAMAN', 'MAYROON', 'MEDALYA', 'MUNDO', 'MUSIKA', 'NAIS', 'NAMAN', 'NARITO',
      'NAROON', 'NATUTO', 'NAUNA', 'NGITI', 'ORASAN', 'PAALALA', 'PABULA', 'PADALA', 'PAG-ASA', 'PAG-IBIG',
      'PAGBATI', 'PAGLAYA', 'PAGOD', 'PAGSUBOK', 'PAHINA', 'PAHAYAGAN', 'PAHINGA', 'PALASYO', 'PALENGKE',
      'PALIGID', 'PANAHON', 'PANANALIG', 'PANGAKO', 'PANGARAP', 'PANGULO', 'PANITIKAN', 'PANTAY', 'PANYO',
      'PAPEL', 'PASKO', 'PATULOY', 'PAWIS', 'PAYAPA', 'PISTA', 'PISTAHAN', 'PULONG', 'PULUBI', 'PUSONG',
      'REGALO', 'RESPETO', 'RIZAL', 'SAGOT', 'SAGISAG', 'SAKLOLO', 'SAKSI', 'SALAMIN', 'SALAMAT', 'SALAPI',
      'SALITA', 'SAMAHAN', 'SANDALI', 'SANDATA', 'SANGGOL', 'SANGKAP', 'SAPATOS', 'SARIWA', 'SARILI', 'SAYAW',
      'SIGAW', 'SIGLO', 'SILANGAN', 'SIMBAHAN', 'SIMULA', 'SINING', 'SIPAG', 'SUKAT', 'SUKLI', 'SULAT',
      'SULONG', 'SUMIKAP', 'SUMPA', 'SUNDALO', 'SUNOD', 'TADHANA', 'TAGUMPAY', 'TAHANAN', 'TAHIMIK', 'TAON',
      'TALENTO', 'TALAS', 'TALUMPATI', 'TANGHALAN', 'TANGKAD', 'TANGGAP', 'TAO', 'TAPAT', 'TATAK', 'TATAG',
      'TIYAK', 'TIYAGA', 'TRADISYON', 'TUBIG', 'TUGON', 'TUGMA', 'TULA', 'TULONG', 'TUNAY', 'TUNOG', 'UGALI',
      'UNLAD', 'UPUAN', 'WAGAS', 'WATAWAT', 'WASTO', 'WIKANG', 'YAMAN', 'YAPAK'
    ]
  };

  const DictionarySearch = {
    findMatches(pattern, language = 'en', maxResults = 30) {
      if (!pattern || pattern.trim() === '') return [];
      const cleaned = pattern.trim().toUpperCase().replace(/_/g, '?');
      const targetLen = cleaned.length;
      const wordList = DictionaryData[language] || DictionaryData['en'];

      const regexPattern = '^' + cleaned.replace(/\?/g, '[A-ZÑ]') + '$';
      const regex = new RegExp(regexPattern, 'i');

      const matches = [];
      for (let i = 0; i < wordList.length; i++) {
        const word = wordList[i].toUpperCase();
        if (word.length === targetLen && regex.test(word)) {
          matches.push(word);
          if (matches.length >= maxResults) break;
        }
      }
      return matches;
    }
  };

  // =========================================================================
  // 4. BUILT-IN PRESET PUZZLES (English & Filipino Only)
  // =========================================================================
  /**
   * PuzzlePlot Built-In Production Puzzle Presets
   * Focused on verified English and Filipino 5x5 word square presets.
   * Structurally validated and checked for 180° rotational symmetry, connectivity,
   * 0 unchecked cells, min entry length >= 3, and accurate 1:1 clue coverage.
   */

  const PresetPuzzles = [
    {
      "id": "en-5-1",
      "title": "Daily Mini: Hearth & Trend",
      "author": "PuzzlePlot Editorial",
      "language": "en",
      "size": 5,
      "difficulty": "Easy",
      "description": "A brisk 5x5 word square to kick off your day with glowing energy.",
      "grid": [
        [
          "H",
          "E",
          "A",
          "R",
          "T"
        ],
        [
          "E",
          "M",
          "B",
          "E",
          "R"
        ],
        [
          "A",
          "B",
          "U",
          "S",
          "E"
        ],
        [
          "R",
          "E",
          "S",
          "I",
          "N"
        ],
        [
          "T",
          "R",
          "E",
          "N",
          "D"
        ]
      ],
      "clues": {
        "across": {
          "1": "Center of emotion and cardiac pulse",
          "6": "Glowing fragment in a campfire",
          "7": "Mishandle or treat improperly",
          "8": "Sticky substance from pine trees",
          "9": "Current popular craze or fashion movement"
        },
        "down": {
          "1": "Vital chest organ symbolizing love",
          "2": "Smoldering coal after a fire",
          "3": "Improper use or mistreatment",
          "4": "Amber-producing tree fluid",
          "5": "General direction in which something is developing"
        }
      }
    },
    {
      "id": "fil-5-1",
      "title": "Munting Palaisipan",
      "author": "Koponan ng PuzzlePlot",
      "language": "fil",
      "size": 5,
      "difficulty": "Madali",
      "description": "Isang mabilis at masayang 5x5 palaisipan sa wikang Filipino.",
      "grid": [
        [
          "A",
          "N",
          "T",
          "A",
          "S"
        ],
        [
          "N",
          "A",
          "U",
          "N",
          "A"
        ],
        [
          "T",
          "U",
          "B",
          "I",
          "G"
        ],
        [
          "A",
          "N",
          "I",
          "N",
          "O"
        ],
        [
          "S",
          "A",
          "G",
          "O",
          "T"
        ]
      ],
      "clues": {
        "across": {
          "1": "Lebel, baitang, o lebel ng katayuan",
          "6": "Nauna sa karera o pasimula sa pila",
          "7": "Likidong iniinom na kailangan sa buhay",
          "8": "Madilim na hugis na nabubuo kapag nasisinagan ng araw",
          "9": "Tugon sa tanong o solusyon sa palaisipan"
        },
        "down": {
          "1": "Baitang o lebel sa lipunan at paaralan",
          "2": "Nanguna sa takbuhan o naunang dumating",
          "3": "Buhay na likido mula sa bukal o gripo",
          "4": "Aninag o anino ng tao sa liwanag",
          "5": "Tugon o reaksyon sa liham at suliranin"
        }
      }
    }
  ];

  // =========================================================================
  // 5. CROSSWORD PLAYER ENGINE
  // =========================================================================
  /**
   * PuzzlePlot Crossword Player Engine
   * Handles gameplay, grid navigation, keyboard/touch input, assists, timer, and victory logic.
   */



  class CrosswordPlayer {
    constructor(options = {}) {
      this.container = options.container || document.getElementById('player-view');
      this.onExit = options.onExit || (() => {});

      this.puzzle = null;
      this.processedGrid = null;
      this.acrossWords = [];
      this.downWords = [];

      this.userGrid = []; // 2D array: { value: '', isRevealed: false, isError: false, isChecked: false }
      this.cursor = { row: 0, col: 0 };
      this.direction = 'across'; // 'across' or 'down'

      // Timer state
      this.timerSeconds = 0;
      this.timerInterval = null;
      this.isPaused = false;
      this.isCompleted = false;
      this.revealedCount = 0;
      this.checkCount = 0;

      // Zoom and pan state
      this.zoomLevel = 1.0;

      // Bound handlers for cleanup
      this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Load and initialize a puzzle
     */
    loadPuzzle(puzzleData) {
      this.puzzle = puzzleData;
      this.isCompleted = false;
      this.isPaused = false;
      this.timerSeconds = 0;
      this.revealedCount = 0;
      this.checkCount = 0;
      this.zoomLevel = 1.0;

      // Convert puzzle grid to cell objects if needed
      const rawGrid = CrosswordUtils.createEmptyGrid(this.puzzle.size, this.puzzle.size);
      for (let r = 0; r < this.puzzle.size; r++) {
        for (let c = 0; c < this.puzzle.size; c++) {
          const val = this.puzzle.grid[r][c];
          if (val === '#' || val === '.' || (typeof val === 'object' && val.isBlock)) {
            rawGrid[r][c].isBlock = true;
            rawGrid[r][c].value = '';
          } else {
            rawGrid[r][c].isBlock = false;
            rawGrid[r][c].value = (typeof val === 'object' ? val.value : val) || '';
          }
        }
      }

      const { grid, acrossWords, downWords } = CrosswordUtils.computeNumbersAndWords(rawGrid);
      this.processedGrid = grid;
      this.acrossWords = acrossWords;
      this.downWords = downWords;

      // Initialize userGrid
      this.userGrid = [];
      for (let r = 0; r < this.puzzle.size; r++) {
        const row = [];
        for (let c = 0; c < this.puzzle.size; c++) {
          row.push({
            value: '',
            isRevealed: false,
            isError: false,
            isChecked: false
          });
        }
        this.userGrid.push(row);
      }

      // Load saved progress if exists
      this.loadSavedProgress();

      // Find first valid playable cell
      this.findFirstCell();

      // Render UI and start timer
      this.render();
      this.attachEventListeners();
      this.startTimer();
    }

    findFirstCell() {
      if (!this.puzzle || !this.processedGrid) return;
      for (let r = 0; r < this.puzzle.size; r++) {
        for (let c = 0; c < this.puzzle.size; c++) {
          if (this.processedGrid[r] && this.processedGrid[r][c] && !this.processedGrid[r][c].isBlock) {
            this.cursor = { row: r, col: c };
            this.direction = this.processedGrid[r][c].acrossClueNumber ? 'across' : 'down';
            return;
          }
        }
      }
    }

    startTimer() {
      this.stopTimer();
      this.timerInterval = setInterval(() => {
        if (!this.isPaused && !this.isCompleted) {
          this.timerSeconds++;
          this.updateTimerDisplay();
        }
      }, 1000);
    }

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      const pauseOverlay = document.getElementById('player-pause-overlay');
      const pauseBtn = document.getElementById('player-pause-btn');
      if (pauseOverlay) {
        pauseOverlay.classList.toggle('active', this.isPaused);
      }
      if (pauseBtn) {
        pauseBtn.innerHTML = this.isPaused
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`;
      }
    }

    updateTimerDisplay() {
      const timerElem = document.getElementById('player-timer-text');
      if (timerElem) {
        const mins = Math.floor(this.timerSeconds / 60);
        const secs = this.timerSeconds % 60;
        timerElem.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }

    saveProgress() {
      if (!this.puzzle || this.isCompleted || typeof localStorage === 'undefined') return;
      try {
        const key = `puzzleplot_progress_${this.puzzle.id}`;
        const data = {
          timerSeconds: this.timerSeconds,
          userGrid: this.userGrid,
          revealedCount: this.revealedCount,
          checkCount: this.checkCount,
          updatedAt: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {}
    }

    loadSavedProgress() {
      if (!this.puzzle || typeof localStorage === 'undefined') return;
      try {
        const key = `puzzleplot_progress_${this.puzzle.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.userGrid && Array.isArray(data.userGrid)) {
            this.userGrid = data.userGrid;
            this.timerSeconds = data.timerSeconds || 0;
            this.revealedCount = data.revealedCount || 0;
            this.checkCount = data.checkCount || 0;
          }
        }
      } catch (e) {}
    }

    clearSavedProgress() {
      if (!this.puzzle || typeof localStorage === 'undefined') return;
      try {
        localStorage.removeItem(`puzzleplot_progress_${this.puzzle.id}`);
      } catch (e) {}
    }

    /**
     * Main Render Method
     */
    render() {
      const size = this.puzzle.size;
      const isLarge = size >= 21;
      const isMedium = size === 13;
      const sizeClass = isLarge ? 'grid-size-21' : isMedium ? 'grid-size-13' : 'grid-size-5';

      this.container.innerHTML = `
        <div class="player-wrapper">
          <!-- Top Toolbar -->
          <header class="player-header">
            <div class="player-header-left">
              <button class="btn-icon-subtle" id="player-back-btn" title="Back to Library">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div class="player-meta">
                <h2 class="player-title">${this.escapeHtml(this.puzzle.title)}</h2>
                <div class="player-subtitle">
                  <span class="badge badge-size">${size}x${size}</span>
                  <span class="badge badge-lang">${(this.puzzle.language || 'en').toUpperCase()}</span>
                  <span class="badge badge-diff">${this.puzzle.difficulty || 'Classic'}</span>
                  <span class="player-author">by ${this.escapeHtml(this.puzzle.author || 'Anonymous')}</span>
                </div>
              </div>
            </div>

            <div class="player-header-center">
              <div class="player-timer-widget" id="player-timer-widget">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span id="player-timer-text">00:00</span>
              </div>
              <button class="btn-toolbar" id="player-pause-btn" title="Pause Game">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                <span>Pause</span>
              </button>
            </div>

            <div class="player-header-right">
              <!-- Check Menu -->
              <div class="dropdown">
                <button class="btn-toolbar dropdown-toggle" id="btn-check-menu">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span>Check</span>
                </button>
                <div class="dropdown-menu" id="check-dropdown">
                  <button class="dropdown-item" id="act-check-letter">Check Letter</button>
                  <button class="dropdown-item" id="act-check-word">Check Word</button>
                  <button class="dropdown-item" id="act-check-puzzle">Check Puzzle</button>
                </div>
              </div>

              <!-- Reveal Menu -->
              <div class="dropdown">
                <button class="btn-toolbar dropdown-toggle" id="btn-reveal-menu">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  <span>Reveal</span>
                </button>
                <div class="dropdown-menu" id="reveal-dropdown">
                  <button class="dropdown-item" id="act-reveal-letter">Reveal Letter</button>
                  <button class="dropdown-item" id="act-reveal-word">Reveal Word</button>
                  <button class="dropdown-item" id="act-reveal-puzzle">Reveal Puzzle</button>
                </div>
              </div>

              <!-- Clear Menu -->
              <div class="dropdown">
                <button class="btn-toolbar dropdown-toggle" id="btn-clear-menu">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Reset</span>
                </button>
                <div class="dropdown-menu" id="clear-dropdown">
                  <button class="dropdown-item" id="act-clear-errors">Clear Errors</button>
                  <button class="dropdown-item dropdown-item-danger" id="act-clear-all">Clear Entire Grid</button>
                </div>
              </div>

              <!-- Zoom Controls for large grids -->
              ${isLarge || isMedium ? `
              <div class="zoom-controls">
                <button class="btn-icon-subtle" id="btn-zoom-out" title="Zoom Out">−</button>
                <button class="btn-icon-subtle" id="btn-zoom-reset" title="Reset Zoom">100%</button>
                <button class="btn-icon-subtle" id="btn-zoom-in" title="Zoom In">+</button>
              </div>
              ` : ''}
            </div>
          </header>

          <!-- Main Gameplay Layout -->
          <main class="player-main">
            <!-- Left/Center: Active Clue Bar & Crossword Grid -->
            <section class="player-grid-section">
              <!-- Sticky Active Clue Bar -->
              <div class="active-clue-bar" id="active-clue-bar" title="Click to toggle direction (Across / Down)">
                <div class="clue-badge" id="active-clue-badge">1A</div>
                <div class="clue-content">
                  <span class="clue-text" id="active-clue-text">Loading clue...</span>
                </div>
                <div class="clue-nav-buttons">
                  <button class="clue-nav-btn" id="clue-prev-btn" title="Previous Clue (Shift+Tab)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button class="clue-nav-btn" id="clue-next-btn" title="Next Clue (Tab / Enter)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>

              <!-- Scrollable / Zoomable Grid Canvas Container -->
              <div class="grid-viewport" id="grid-viewport">
                <div class="crossword-grid-container ${sizeClass}" id="grid-container" style="--grid-size: ${size};">
                  ${this.renderGridCells()}
                </div>

                <!-- Pause Game Overlay -->
                <div class="pause-overlay" id="player-pause-overlay">
                  <div class="pause-card">
                    <h3>Game Paused</h3>
                    <p>Take a breath! Your timer is paused.</p>
                    <button class="btn btn-primary" id="pause-resume-btn">Resume Playing</button>
                  </div>
                </div>
              </div>

              <!-- On-Screen Virtual Keyboard (Visible on Mobile/Touch) -->
              <div class="virtual-keyboard" id="virtual-keyboard">
                <div class="keyboard-row">
                  ${['Q','W','E','R','T','Y','U','I','O','P'].map(k => `<button class="key-btn" data-key="${k}">${k}</button>`).join('')}
                </div>
                <div class="keyboard-row">
                  ${['A','S','D','F','G','H','J','K','L'].map(k => `<button class="key-btn" data-key="${k}">${k}</button>`).join('')}
                  ${(this.puzzle.language === 'es' || this.puzzle.language === 'fil') ? `<button class="key-btn" data-key="Ñ">Ñ</button>` : ''}
                </div>
                <div class="keyboard-row">
                  <button class="key-btn key-action" id="vk-dir" title="Toggle Across / Down">⇄</button>
                  ${['Z','X','C','V','B','N','M'].map(k => `<button class="key-btn" data-key="${k}">${k}</button>`).join('')}
                  <button class="key-btn key-action" id="vk-backspace" title="Delete">⌫</button>
                </div>
              </div>
            </section>

            <!-- Right: Clue Columns (Across & Down) -->
            <aside class="player-clues-section">
              <div class="clues-panel">
                <div class="clues-column" id="across-clues-col">
                  <div class="clues-col-header">
                    <h3>Across</h3>
                    <span class="clues-count">${this.acrossWords.length} clues</span>
                  </div>
                  <div class="clues-scroll-list" id="across-clues-list">
                    ${this.renderClueList('across')}
                  </div>
                </div>

                <div class="clues-column" id="down-clues-col">
                  <div class="clues-col-header">
                    <h3>Down</h3>
                    <span class="clues-count">${this.downWords.length} clues</span>
                  </div>
                  <div class="clues-scroll-list" id="down-clues-list">
                    ${this.renderClueList('down')}
                  </div>
                </div>
              </div>
            </aside>
          </main>
        </div>

        <!-- Victory Celebration Modal -->
        <div class="modal-backdrop" id="victory-modal">
          <div class="modal-card victory-card animate-pop">
            <div class="victory-confetti-burst" id="victory-confetti"></div>
            <div class="victory-icon-trophy">🏆</div>
            <h2>Puzzle Solved!</h2>
            <p class="victory-subtitle">Splendid work on <strong>${this.escapeHtml(this.puzzle.title)}</strong>!</p>

            <div class="victory-stats-grid">
              <div class="stat-box">
                <span class="stat-label">Solve Time</span>
                <span class="stat-value" id="victory-time-val">00:00</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Grid Size</span>
                <span class="stat-value">${size} × ${size}</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Language</span>
                <span class="stat-value">${(this.puzzle.language || 'en').toUpperCase()}</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Assists Used</span>
                <span class="stat-value" id="victory-assists-val">0</span>
              </div>
            </div>

            <div class="victory-actions">
              <button class="btn btn-secondary" id="victory-btn-replay">Play Again</button>
              <button class="btn btn-primary" id="victory-btn-library">Back to Library</button>
            </div>
          </div>
        </div>
      `;

      this.updateHighlighting();
      this.updateTimerDisplay();
    }

    /**
     * Generates HTML for the crossword grid cells
     */
    renderGridCells() {
      const size = this.puzzle.size;
      let html = '';

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = this.processedGrid[r][c];
          const userCell = this.userGrid[r][c];

          if (cell.isBlock) {
            html += `<div class="grid-cell cell-block" data-row="${r}" data-col="${c}"></div>`;
          } else {
            const numberHtml = cell.number ? `<span class="cell-num">${cell.number}</span>` : '';
            const letterVal = userCell.value || '';

            let statusClasses = '';
            if (userCell.isRevealed) statusClasses += ' cell-revealed';
            if (userCell.isError) statusClasses += ' cell-error';
            if (userCell.isChecked && !userCell.isError) statusClasses += ' cell-correct';

            html += `
              <div class="grid-cell cell-letter${statusClasses}"
                   data-row="${r}"
                   data-col="${c}"
                   tabindex="0"
                   id="cell-${r}-${c}">
                ${numberHtml}
                <span class="cell-char" id="char-${r}-${c}">${letterVal}</span>
              </div>
            `;
          }
        }
      }

      return html;
    }

    /**
     * Generates HTML for Across or Down clue lists
     */
    renderClueList(direction) {
      const wordList = direction === 'across' ? this.acrossWords : this.downWords;
      const clueDict = (this.puzzle.clues && this.puzzle.clues[direction]) || {};

      return wordList.map(w => {
        const clueText = clueDict[w.number.toString()] || clueDict[w.number] || `Clue for ${w.number} ${direction}`;
        const safeClueText = this.escapeHtml(clueText);
        return `
          <div class="clue-item"
               id="clue-${direction}-${w.number}"
               data-direction="${direction}"
               data-number="${w.number}">
            <span class="clue-num-tag">${w.number}</span>
            <span class="clue-desc">${safeClueText}</span>
          </div>
        `;
      }).join('');
    }

    /**
     * Attach all DOM and Keyboard Event Listeners
     */
    attachEventListeners() {
      // Global Keyboard listener
      window.removeEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keydown', this.handleKeyDown);

      // Grid Cell Click & Touch
      const gridContainer = document.getElementById('grid-container');
      if (gridContainer) {
        gridContainer.addEventListener('click', (e) => {
          const cellElem = e.target.closest('.cell-letter');
          if (cellElem) {
            const r = parseInt(cellElem.dataset.row, 10);
            const c = parseInt(cellElem.dataset.col, 10);
            this.onCellClicked(r, c);
          }
        });
      }

      // Clue Item Click (jumps to clue word)
      const acrossList = document.getElementById('across-clues-list');
      if (acrossList) {
        acrossList.addEventListener('click', (e) => {
          const item = e.target.closest('.clue-item');
          if (item) {
            const num = parseInt(item.dataset.number, 10);
            this.selectClue('across', num);
          }
        });
      }

      const downList = document.getElementById('down-clues-list');
      if (downList) {
        downList.addEventListener('click', (e) => {
          const item = e.target.closest('.clue-item');
          if (item) {
            const num = parseInt(item.dataset.number, 10);
            this.selectClue('down', num);
          }
        });
      }

      // Active Clue Bar click toggles direction
      const clueBar = document.getElementById('active-clue-bar');
      if (clueBar) {
        clueBar.addEventListener('click', (e) => {
          if (!e.target.closest('.clue-nav-btn')) {
            this.toggleDirection();
          }
        });
      }

      // Prev / Next Clue buttons
      const prevBtn = document.getElementById('clue-prev-btn');
      if (prevBtn) prevBtn.addEventListener('click', () => this.navigateClue(-1));
      const nextBtn = document.getElementById('clue-next-btn');
      if (nextBtn) nextBtn.addEventListener('click', () => this.navigateClue(1));

      // Toolbar buttons
      const backBtn = document.getElementById('player-back-btn');
      if (backBtn) backBtn.addEventListener('click', () => {
        this.saveProgress();
        this.stopTimer();
        this.onExit();
      });

      const pauseBtn = document.getElementById('player-pause-btn');
      if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

      const resumeBtn = document.getElementById('pause-resume-btn');
      if (resumeBtn) resumeBtn.addEventListener('click', () => this.togglePause());

      // Dropdown toggles
      this.setupDropdown('btn-check-menu', 'check-dropdown');
      this.setupDropdown('btn-reveal-menu', 'reveal-dropdown');
      this.setupDropdown('btn-clear-menu', 'clear-dropdown');

      // Assist Actions
      const checkLetter = document.getElementById('act-check-letter');
      if (checkLetter) checkLetter.addEventListener('click', () => this.checkCurrentLetter());
      const checkWord = document.getElementById('act-check-word');
      if (checkWord) checkWord.addEventListener('click', () => this.checkCurrentWord());
      const checkPuzzle = document.getElementById('act-check-puzzle');
      if (checkPuzzle) checkPuzzle.addEventListener('click', () => this.checkEntirePuzzle());

      const revealLetter = document.getElementById('act-reveal-letter');
      if (revealLetter) revealLetter.addEventListener('click', () => this.revealCurrentLetter());
      const revealWord = document.getElementById('act-reveal-word');
      if (revealWord) revealWord.addEventListener('click', () => this.revealCurrentWord());
      const revealPuzzle = document.getElementById('act-reveal-puzzle');
      if (revealPuzzle) revealPuzzle.addEventListener('click', () => this.revealEntirePuzzle());

      const clearErrors = document.getElementById('act-clear-errors');
      if (clearErrors) clearErrors.addEventListener('click', () => this.clearAllErrors());
      const clearAll = document.getElementById('act-clear-all');
      if (clearAll) clearAll.addEventListener('click', () => this.clearEntireGrid());

      // Zoom Controls
      const btnZoomIn = document.getElementById('btn-zoom-in');
      if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.adjustZoom(0.15));
      const btnZoomOut = document.getElementById('btn-zoom-out');
      if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.adjustZoom(-0.15));
      const btnZoomReset = document.getElementById('btn-zoom-reset');
      if (btnZoomReset) btnZoomReset.addEventListener('click', () => this.adjustZoom(0, true));

      // Virtual Keyboard
      const vk = document.getElementById('virtual-keyboard');
      if (vk) {
        vk.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;

          if (btn.dataset.key) {
            this.handleInputLetter(btn.dataset.key);
          } else if (btn.id === 'vk-backspace') {
            this.handleBackspace();
          } else if (btn.id === 'vk-dir') {
            this.toggleDirection();
          }
        });
      }

      // Victory modal buttons
      const victoryReplay = document.getElementById('victory-btn-replay');
      if (victoryReplay) {
        victoryReplay.addEventListener('click', () => {
          this.clearEntireGrid(true);
          document.getElementById('victory-modal').classList.remove('active');
          this.startTimer();
        });
      }

      const victoryLibrary = document.getElementById('victory-btn-library');
      if (victoryLibrary) {
        victoryLibrary.addEventListener('click', () => {
          document.getElementById('victory-modal').classList.remove('active');
          this.onExit();
        });
      }
    }

    setupDropdown(btnId, menuId) {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      if (!btn || !menu) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(m => {
          if (m !== menu) m.classList.remove('show');
        });
        menu.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        menu.classList.remove('show');
      });
    }

    adjustZoom(delta, reset = false) {
      if (reset) {
        this.zoomLevel = 1.0;
      } else {
        this.zoomLevel = Math.min(Math.max(this.zoomLevel + delta, 0.6), 1.8);
      }
      const container = document.getElementById('grid-container');
      const resetBtn = document.getElementById('btn-zoom-reset');
      if (container) {
        container.style.transform = `scale(${this.zoomLevel})`;
      }
      if (resetBtn) {
        resetBtn.textContent = `${Math.round(this.zoomLevel * 100)}%`;
      }
    }

    /**
     * Handles user click on a grid cell
     */
    onCellClicked(row, col) {
      if (this.isPaused || this.isCompleted) return;

      if (this.cursor.row === row && this.cursor.col === col) {
        // Toggle direction if clicking current active cell
        this.toggleDirection();
      } else {
        // Move cursor to new cell
        this.cursor = { row, col };

        // If current direction has no word here, switch direction
        const cell = this.processedGrid[row][col];
        if (this.direction === 'across' && !cell.acrossClueNumber && cell.downClueNumber) {
          this.direction = 'down';
        } else if (this.direction === 'down' && !cell.downClueNumber && cell.acrossClueNumber) {
          this.direction = 'across';
        }
        this.updateHighlighting();
      }
    }

    toggleDirection() {
      const cell = this.processedGrid[this.cursor.row][this.cursor.col];
      if (this.direction === 'across') {
        if (cell.downClueNumber) this.direction = 'down';
      } else {
        if (cell.acrossClueNumber) this.direction = 'across';
      }
      this.updateHighlighting();
    }

    selectClue(direction, number) {
      const words = direction === 'across' ? this.acrossWords : this.downWords;
      const word = words.find(w => w.number === number);
      if (word && word.cells.length > 0) {
        this.direction = direction;
        this.cursor = { row: word.cells[0].row, col: word.cells[0].col };
        this.updateHighlighting();
      }
    }

    navigateClue(delta) {
      const words = this.direction === 'across' ? this.acrossWords : this.downWords;
      const currentClueNum = this.getCurrentClueNumber();
      const currentIndex = words.findIndex(w => w.number === currentClueNum);

      if (currentIndex !== -1) {
        let nextIndex = currentIndex + delta;
        if (nextIndex >= words.length) {
          // Switch to other direction
          this.direction = this.direction === 'across' ? 'down' : 'across';
          const otherWords = this.direction === 'across' ? this.acrossWords : this.downWords;
          this.selectClue(this.direction, otherWords[0].number);
          return;
        } else if (nextIndex < 0) {
          this.direction = this.direction === 'across' ? 'down' : 'across';
          const otherWords = this.direction === 'across' ? this.acrossWords : this.downWords;
          this.selectClue(this.direction, otherWords[otherWords.length - 1].number);
          return;
        }
        this.selectClue(this.direction, words[nextIndex].number);
      }
    }

    getCurrentClueNumber() {
      const cell = this.processedGrid[this.cursor.row][this.cursor.col];
      return this.direction === 'across' ? cell.acrossClueNumber : cell.downClueNumber;
    }

    getActiveWord() {
      const clueNum = this.getCurrentClueNumber();
      const words = this.direction === 'across' ? this.acrossWords : this.downWords;
      return words.find(w => w.number === clueNum);
    }

    getCrossWord() {
      const otherDir = this.direction === 'across' ? 'down' : 'across';
      const cell = this.processedGrid[this.cursor.row][this.cursor.col];
      const crossNum = otherDir === 'across' ? cell.acrossClueNumber : cell.downClueNumber;
      const words = otherDir === 'across' ? this.acrossWords : this.downWords;
      return words.find(w => w.number === crossNum);
    }

    /**
     * Keyboard handler
     */
    handleKeyDown(e) {
      if (this.isPaused || this.isCompleted) return;

      // Ignore events if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;

      if (/^[a-zA-ZñÑ]$/.test(key)) {
        e.preventDefault();
        this.handleInputLetter(key.toUpperCase());
      } else if (key === 'Backspace') {
        e.preventDefault();
        this.handleBackspace();
      } else if (key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        this.toggleDirection();
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        this.moveCursor(-1, 0);
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        this.moveCursor(1, 0);
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        this.moveCursor(0, -1);
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        this.moveCursor(0, 1);
      } else if (key === 'Tab') {
        e.preventDefault();
        this.navigateClue(e.shiftKey ? -1 : 1);
      } else if (key === 'Enter') {
        e.preventDefault();
        this.navigateClue(1);
      }
    }

    handleInputLetter(letter) {
      const { row, col } = this.cursor;
      const userCell = this.userGrid[row][col];

      userCell.value = letter;
      userCell.isError = false; // Reset error when re-typing

      // Update DOM directly for responsiveness
      const charElem = document.getElementById(`char-${row}-${col}`);
      if (charElem) charElem.textContent = letter;
      const cellElem = document.getElementById(`cell-${row}-${col}`);
      if (cellElem) cellElem.classList.remove('cell-error');

      SoundEngine.playKeySound();
      this.saveProgress();

      // Advance cursor to next cell in current word
      this.advanceCursor();

      // Check if word or puzzle is complete
      this.checkWordCompletion();
      this.checkPuzzleCompletion();
    }

    handleBackspace() {
      const { row, col } = this.cursor;
      const userCell = this.userGrid[row][col];

      if (userCell.value !== '') {
        userCell.value = '';
        userCell.isError = false;
        const charElem = document.getElementById(`char-${row}-${col}`);
        if (charElem) charElem.textContent = '';
        const cellElem = document.getElementById(`cell-${row}-${col}`);
        if (cellElem) cellElem.classList.remove('cell-error');
        SoundEngine.playKeySound();
        this.saveProgress();
      } else {
        // Step backwards
        this.stepBackCursor();
        const newCell = this.userGrid[this.cursor.row][this.cursor.col];
        newCell.value = '';
        newCell.isError = false;
        const charElem = document.getElementById(`char-${this.cursor.row}-${this.cursor.col}`);
        if (charElem) charElem.textContent = '';
        const cellElem = document.getElementById(`cell-${this.cursor.row}-${this.cursor.col}`);
        if (cellElem) cellElem.classList.remove('cell-error');
        SoundEngine.playKeySound();
        this.saveProgress();
        this.updateHighlighting();
      }
    }

    moveCursor(dRow, dCol) {
      let r = this.cursor.row + dRow;
      let c = this.cursor.col + dCol;
      const size = this.puzzle.size;

      while (r >= 0 && r < size && c >= 0 && c < size) {
        if (!this.processedGrid[r][c].isBlock) {
          this.cursor = { row: r, col: c };
          this.updateHighlighting();
          return;
        }
        r += dRow;
        c += dCol;
      }
    }

    advanceCursor() {
      const activeWord = this.getActiveWord();
      if (!activeWord) return;

      const currentIndex = activeWord.cells.findIndex(c => c.row === this.cursor.row && c.col === this.cursor.col);
      if (currentIndex !== -1 && currentIndex < activeWord.cells.length - 1) {
        const nextCell = activeWord.cells[currentIndex + 1];
        this.cursor = { row: nextCell.row, col: nextCell.col };
        this.updateHighlighting();
      } else {
        // At the end of word: optionally jump to next clue
        this.navigateClue(1);
      }
    }

    stepBackCursor() {
      const activeWord = this.getActiveWord();
      if (!activeWord) return;

      const currentIndex = activeWord.cells.findIndex(c => c.row === this.cursor.row && c.col === this.cursor.col);
      if (currentIndex > 0) {
        const prevCell = activeWord.cells[currentIndex - 1];
        this.cursor = { row: prevCell.row, col: prevCell.col };
      }
    }

    /**
     * Highlights active cursor, active word, crossing word, and active clue
     */
    updateHighlighting() {
      if (typeof document === 'undefined') return;
      // 1. Clear previous cell highlights
      document.querySelectorAll('.cell-active-cursor, .cell-active-word, .cell-active-cross').forEach(el => {
        el.classList.remove('cell-active-cursor', 'cell-active-word', 'cell-active-cross');
      });

      const activeWord = this.getActiveWord();
      const crossWord = this.getCrossWord();

      // 2. Highlight cross word cells
      if (crossWord) {
        crossWord.cells.forEach(c => {
          const el = document.getElementById(`cell-${c.row}-${c.col}`);
          if (el) el.classList.add('cell-active-cross');
        });
      }

      // 3. Highlight active word cells
      if (activeWord) {
        activeWord.cells.forEach(c => {
          const el = document.getElementById(`cell-${c.row}-${c.col}`);
          if (el) el.classList.add('cell-active-word');
        });
      }

      // 4. Highlight active cursor cell
      const activeCellElem = document.getElementById(`cell-${this.cursor.row}-${this.cursor.col}`);
      if (activeCellElem) {
        activeCellElem.classList.add('cell-active-cursor');
      }

      // 5. Update Clue Lists & Banner
      document.querySelectorAll('.clue-item-active').forEach(el => el.classList.remove('clue-item-active'));

      if (activeWord) {
        const clueId = `clue-${this.direction}-${activeWord.number}`;
        const activeClueElem = document.getElementById(clueId);
        if (activeClueElem) {
          activeClueElem.classList.add('clue-item-active');
          activeClueElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Update Clue Banner
        const badgeElem = document.getElementById('active-clue-badge');
        const textElem = document.getElementById('active-clue-text');
        const clueDict = (this.puzzle.clues && this.puzzle.clues[this.direction]) || {};
        const clueText = clueDict[activeWord.number.toString()] || clueDict[activeWord.number] || '';

        if (badgeElem) badgeElem.textContent = `${activeWord.number}${this.direction === 'across' ? 'A' : 'D'}`;
        if (textElem) textElem.textContent = clueText;
      }
    }

    /**
     * Check if the currently filled word is completely full and correct
     */
    checkWordCompletion() {
      const activeWord = this.getActiveWord();
      if (!activeWord) return;

      let isFull = true;
      for (let c of activeWord.cells) {
        if (!this.userGrid[c.row][c.col].value) {
          isFull = false;
          break;
        }
      }

      if (isFull) {
        let isAllCorrect = true;
        for (let c of activeWord.cells) {
          const expected = this.processedGrid[c.row][c.col].value.toUpperCase();
          const actual = this.userGrid[c.row][c.col].value.toUpperCase();
          if (expected !== actual) {
            isAllCorrect = false;
            break;
          }
        }
        if (isAllCorrect) {
          SoundEngine.playWordCompleteSound();
        }
      }
    }

    /**
     * Check if the entire crossword is solved
     */
    checkPuzzleCompletion() {
      const size = this.puzzle.size;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!this.processedGrid[r][c].isBlock) {
            const expected = this.processedGrid[r][c].value.toUpperCase();
            const actual = (this.userGrid[r][c].value || '').toUpperCase();
            if (expected !== actual) {
              return false;
            }
          }
        }
      }

      // Puzzle is 100% correctly completed!
      this.isCompleted = true;
      this.stopTimer();
      this.clearSavedProgress();
      SoundEngine.playVictorySound();
      this.showVictoryModal();
      return true;
    }

    showVictoryModal() {
      const modal = document.getElementById('victory-modal');
      if (!modal) return;

      const mins = Math.floor(this.timerSeconds / 60);
      const secs = this.timerSeconds % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      const timeVal = document.getElementById('victory-time-val');
      if (timeVal) timeVal.textContent = timeStr;

      const assistsVal = document.getElementById('victory-assists-val');
      if (assistsVal) assistsVal.textContent = (this.revealedCount + this.checkCount).toString();

      modal.classList.add('active');
    }

    // =========================================================================
    // Game Assists: Check / Reveal / Reset
    // =========================================================================

    checkCurrentLetter() {
      this.checkCount++;
      const { row, col } = this.cursor;
      const userCell = this.userGrid[row][col];
      const expected = this.processedGrid[row][col].value.toUpperCase();

      if (userCell.value) {
        if (userCell.value.toUpperCase() !== expected) {
          userCell.isError = true;
          SoundEngine.playErrorSound();
        } else {
          userCell.isChecked = true;
          userCell.isError = false;
        }
        this.refreshCellDisplay(row, col);
      }
    }

    checkCurrentWord() {
      this.checkCount++;
      const word = this.getActiveWord();
      if (!word) return;

      let hasErrors = false;
      word.cells.forEach(c => {
        const userCell = this.userGrid[c.row][c.col];
        const expected = this.processedGrid[c.row][c.col].value.toUpperCase();
        if (userCell.value) {
          if (userCell.value.toUpperCase() !== expected) {
            userCell.isError = true;
            hasErrors = true;
          } else {
            userCell.isChecked = true;
            userCell.isError = false;
          }
          this.refreshCellDisplay(c.row, c.col);
        }
      });

      if (hasErrors) SoundEngine.playErrorSound();
    }

    checkEntirePuzzle() {
      this.checkCount++;
      const size = this.puzzle.size;
      let hasErrors = false;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!this.processedGrid[r][c].isBlock) {
            const userCell = this.userGrid[r][c];
            const expected = this.processedGrid[r][c].value.toUpperCase();
            if (userCell.value) {
              if (userCell.value.toUpperCase() !== expected) {
                userCell.isError = true;
                hasErrors = true;
              } else {
                userCell.isChecked = true;
                userCell.isError = false;
              }
              this.refreshCellDisplay(r, c);
            }
          }
        }
      }

      if (hasErrors) SoundEngine.playErrorSound();
    }

    revealCurrentLetter() {
      this.revealedCount++;
      const { row, col } = this.cursor;
      const userCell = this.userGrid[row][col];
      const expected = this.processedGrid[row][col].value.toUpperCase();

      userCell.value = expected;
      userCell.isRevealed = true;
      userCell.isError = false;
      this.refreshCellDisplay(row, col);
      this.saveProgress();
      this.advanceCursor();
      this.checkPuzzleCompletion();
    }

    revealCurrentWord() {
      this.revealedCount++;
      const word = this.getActiveWord();
      if (!word) return;

      word.cells.forEach(c => {
        const userCell = this.userGrid[c.row][c.col];
        const expected = this.processedGrid[c.row][c.col].value.toUpperCase();
        userCell.value = expected;
        userCell.isRevealed = true;
        userCell.isError = false;
        this.refreshCellDisplay(c.row, c.col);
      });

      this.saveProgress();
      this.checkPuzzleCompletion();
    }

    revealEntirePuzzle() {
      this.revealedCount += 5;
      const size = this.puzzle.size;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!this.processedGrid[r][c].isBlock) {
            const userCell = this.userGrid[r][c];
            userCell.value = this.processedGrid[r][c].value.toUpperCase();
            userCell.isRevealed = true;
            userCell.isError = false;
            this.refreshCellDisplay(r, c);
          }
        }
      }

      this.saveProgress();
      this.checkPuzzleCompletion();
    }

    clearAllErrors() {
      const size = this.puzzle.size;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const userCell = this.userGrid[r][c];
          if (userCell.isError) {
            userCell.value = '';
            userCell.isError = false;
            this.refreshCellDisplay(r, c);
          }
        }
      }
      this.saveProgress();
    }

    clearEntireGrid(skipConfirmation = false) {
      if (!skipConfirmation) {
        if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
          const confirmed = window.confirm('Are you sure you want to clear the entire puzzle and reset your progress?');
          if (!confirmed) return false;
        }
      }
      const size = this.puzzle.size;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          this.userGrid[r][c] = {
            value: '',
            isRevealed: false,
            isError: false,
            isChecked: false
          };
          this.refreshCellDisplay(r, c);
        }
      }
      this.clearSavedProgress();
      this.findFirstCell();
      this.updateHighlighting();
      return true;
    }

    refreshCellDisplay(r, c) {
      if (typeof document === 'undefined') return;
      const userCell = this.userGrid[r][c];
      const charElem = document.getElementById(`char-${r}-${c}`);
      const cellElem = document.getElementById(`cell-${r}-${c}`);
      if (charElem) charElem.textContent = userCell.value || '';
      if (cellElem) {
        cellElem.classList.toggle('cell-error', !!userCell.isError);
        cellElem.classList.toggle('cell-revealed', !!userCell.isRevealed);
        cellElem.classList.toggle('cell-correct', !!userCell.isChecked && !userCell.isError);
      }
    }

    escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    destroy() {
      this.stopTimer();
      window.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  // =========================================================================
  // 6. CROSSWORD MAKER STUDIO ENGINE WITH AUTO-BUILDER
  // =========================================================================
  /**
   * Crossword Maker Studio Module
   * Full authoring canvas with auto-builder word placement, symmetry, clues table, dictionary assistant, and printing.
   */




  class CrosswordMaker {
    constructor(options = {}) {
      this.container = options.container || document.getElementById('maker-view');
      this.onTestPlay = options.onTestPlay || (() => {});
      this.onExit = options.onExit || (() => {});
      this.onSave = options.onSave || (() => {});

      this.size = 13;
      this.title = 'My New Crossword';
      this.author = 'Puzzle Creator';
      this.language = 'en';
      this.difficulty = 'Medium';
      this.description = '';
      this.id = 'custom_' + Date.now();

      this.editMode = 'fill';
      this.symmetry = '180';
      this.cursor = { row: 0, col: 0 };
      this.direction = 'across';

      this.grid = CrosswordUtils.createEmptyGrid(this.size, this.size);
      this.clues = { across: {}, down: {} };

      this.searchPattern = '';
      this.searchResults = [];

      this.history = [];
      this.historyIndex = -1;

      this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    init(puzzleData = null) {
      if (puzzleData) {
        this.id = puzzleData.id || ('custom_' + Date.now());
        this.size = puzzleData.size || puzzleData.width || 13;
        this.title = puzzleData.title || 'Untitled Crossword';
        this.author = puzzleData.author || 'Anonymous';
        this.language = puzzleData.language || 'en';
        this.difficulty = puzzleData.difficulty || 'Medium';
        this.description = puzzleData.description || '';
        this.clues = puzzleData.clues || { across: {}, down: {} };

        this.grid = CrosswordUtils.createEmptyGrid(this.size, this.size);
        for (let r = 0; r < this.size; r++) {
          for (let c = 0; c < this.size; c++) {
            const val = puzzleData.grid[r][c];
            if (val === '#' || (typeof val === 'object' && val.isBlock)) {
              this.grid[r][c].isBlock = true;
              this.grid[r][c].value = '';
            } else {
              this.grid[r][c].isBlock = false;
              this.grid[r][c].value = (typeof val === 'object' ? val.value : val) || '';
            }
          }
        }
      } else {
        this.id = 'custom_' + Date.now();
        this.grid = CrosswordUtils.createEmptyGrid(this.size, this.size);
        this.clues = { across: {}, down: {} };
      }

      this.history = [];
      this.historyIndex = -1;
      this.saveStateToHistory();

      this.recomputeGrid();
      this.render();
      this.attachEventListeners();
    }

    saveStateToHistory() {
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      const snapshot = {
        grid: CrosswordUtils.cloneGrid(this.grid),
        clues: JSON.parse(JSON.stringify(this.clues))
      };
      this.history.push(snapshot);
      if (this.history.length > 50) this.history.shift();
      this.historyIndex = this.history.length - 1;
      this.updateUndoRedoButtons();
    }

    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        const snapshot = this.history[this.historyIndex];
        this.grid = CrosswordUtils.cloneGrid(snapshot.grid);
        this.clues = JSON.parse(JSON.stringify(snapshot.clues));
        this.recomputeGrid();
        this.renderGridOnly();
        this.renderCluesOnly();
        this.updateMetrics();
        this.updateUndoRedoButtons();
      }
    }

    redo() {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        const snapshot = this.history[this.historyIndex];
        this.grid = CrosswordUtils.cloneGrid(snapshot.grid);
        this.clues = JSON.parse(JSON.stringify(snapshot.clues));
        this.recomputeGrid();
        this.renderGridOnly();
        this.renderCluesOnly();
        this.updateMetrics();
        this.updateUndoRedoButtons();
      }
    }

    updateUndoRedoButtons() {
      const btnUndo = document.getElementById('maker-undo-btn');
      const btnRedo = document.getElementById('maker-redo-btn');
      if (btnUndo) btnUndo.disabled = this.historyIndex <= 0;
      if (btnRedo) btnRedo.disabled = this.historyIndex >= this.history.length - 1;
    }

    changeSize(newSize) {
      if (newSize === this.size) return;
      if (confirm(`Changing grid size to ${newSize}x${newSize} will create a fresh blank grid. Proceed?`)) {
        this.size = parseInt(newSize, 10);
        this.grid = CrosswordUtils.createEmptyGrid(this.size, this.size);
        this.clues = { across: {}, down: {} };
        this.cursor = { row: 0, col: 0 };
        this.history = [];
        this.historyIndex = -1;
        this.saveStateToHistory();
        this.recomputeGrid();
        this.render();
        this.attachEventListeners();
      } else {
        const select = document.getElementById('maker-size-select');
        if (select) select.value = this.size.toString();
      }
    }

    validateForAction(actionName) {
      const puzzle = this.getPuzzleObject();
      const res = CrosswordUtils.validatePuzzleIntegrity(puzzle, {
        requiredSymmetry: this.symmetry !== 'none' ? this.symmetry : undefined,
        checkClues: true,
        allowIncompleteLetters: false
      });

      if (!res.isValid) {
        const errorDetails = res.errors.map((e, idx) => `${idx + 1}. ${e.message}`).join('\n');
        const msg = `Cannot ${actionName} puzzle due to the following validation errors:\n\n${errorDetails}\n\nPlease resolve these issues before ${actionName.toLowerCase()}ing.`;
        SoundEngine.playErrorSound();
        alert(msg);
        return false;
      }
      return true;
    }

    recomputeGrid() {
      const { grid, acrossWords, downWords } = CrosswordUtils.computeNumbersAndWords(this.grid);
      this.grid = grid;
      this.acrossWords = acrossWords;
      this.downWords = downWords;
    }

    render() {
      const isLarge = this.size >= 21;
      const isMedium = this.size === 13;
      const sizeClass = isLarge ? 'grid-size-21' : isMedium ? 'grid-size-13' : 'grid-size-5';

      this.container.innerHTML = `
        <div class="maker-wrapper">
          <header class="maker-header">
            <div class="maker-header-left">
              <button class="btn-icon-subtle" id="maker-back-btn" title="Back to Hub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div class="maker-title-group">
                <input type="text" class="input-inline-title" id="maker-title-input" value="${this.escapeHtml(this.title)}" placeholder="Puzzle Title...">
                <div class="maker-meta-inline">
                  <input type="text" class="input-inline-author" id="maker-author-input" value="${this.escapeHtml(this.author)}" placeholder="Author Name">
                </div>
              </div>
            </div>

            <div class="maker-header-center">
              <div class="segmented-control">
                <button class="segment-btn ${this.editMode === 'fill' ? 'active' : ''}" data-mode="fill">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  <span>Fill Letters</span>
                </button>
                <button class="segment-btn ${this.editMode === 'blocks' ? 'active' : ''}" data-mode="blocks">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  <span>Grid Blocks</span>
                </button>
                <button class="segment-btn ${this.editMode === 'clues' ? 'active' : ''}" data-mode="clues">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  <span>Clues Table</span>
                </button>
              </div>
            </div>

            <div class="maker-header-right">
              <button class="btn-icon-subtle" id="maker-undo-btn" title="Undo (Ctrl+Z)" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
              </button>
              <button class="btn-icon-subtle" id="maker-redo-btn" title="Redo (Ctrl+Y)" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
              </button>

              <button class="btn btn-secondary" id="maker-test-play-btn" title="Test play your crossword">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Test Play</span>
              </button>

              <div class="dropdown">
                <button class="btn btn-primary dropdown-toggle" id="maker-save-menu-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  <span>Save & Export</span>
                </button>
                <div class="dropdown-menu" id="maker-save-dropdown">
                  <button class="dropdown-item" id="maker-act-save-local">Save to My Library</button>
                  <button class="dropdown-item" id="maker-act-export-json">Export JSON (.json)</button>
                  <button class="dropdown-item" id="maker-act-import-json">Import Puzzle File</button>
                  <button class="dropdown-item" id="maker-act-print">Printable Puzzle Sheet</button>
                </div>
              </div>
              <input type="file" id="maker-file-importer" accept=".json" style="display: none;">
            </div>
          </header>

          <div class="maker-subbar">
            <div class="subbar-left-controls">
              <div class="subbar-item">
                <label>Grid Size:</label>
                <select class="maker-select" id="maker-size-select">
                  <option value="5" ${this.size === 5 ? 'selected' : ''}>5x5 (Mini)</option>
                  <option value="13" ${this.size === 13 ? 'selected' : ''}>13x13 (Midi)</option>
                  <option value="21" ${this.size === 21 ? 'selected' : ''}>21x21 (Sunday Jumbo)</option>
                </select>
              </div>

              <div class="subbar-item">
                <label>Language:</label>
                <select class="maker-select" id="maker-lang-select">
                  <option value="en" ${this.language === 'en' ? 'selected' : ''}>English</option>
                  <option value="fil" ${this.language === 'fil' ? 'selected' : ''}>Filipino / Tagalog</option>
                </select>
              </div>

              <div class="subbar-item">
                <label>Symmetry:</label>
                <select class="maker-select" id="maker-sym-select">
                  <option value="180" ${this.symmetry === '180' ? 'selected' : ''}>180° Rotational (Standard)</option>
                  <option value="90" ${this.symmetry === '90' ? 'selected' : ''}>90° 4-Way</option>
                  <option value="horizontal" ${this.symmetry === 'horizontal' ? 'selected' : ''}>Horizontal Mirror</option>
                  <option value="vertical" ${this.symmetry === 'vertical' ? 'selected' : ''}>Vertical Mirror</option>
                  <option value="none" ${this.symmetry === 'none' ? 'selected' : ''}>Freeform (No Symmetry)</option>
                </select>
              </div>
            </div>

            <div class="subbar-actions">
              <button class="btn btn-accent btn-sm" id="maker-btn-auto-build" title="Place custom words into the grid automatically">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                <span>Auto-Build from Words</span>
              </button>
              <button class="btn-subtle-sm" id="maker-btn-clear-letters" title="Keep blocks but clear letters">Clear Letters</button>
              <button class="btn-subtle-sm" id="maker-btn-clear-all" title="Reset to blank grid">Reset Grid</button>
            </div>
          </div>

          <main class="maker-workspace">
            <section class="maker-canvas-section">
              <div class="maker-mode-hint" id="maker-mode-hint">
                ${this.getModeHintText()}
              </div>

              <div class="grid-viewport" id="maker-grid-viewport">
                <div class="crossword-grid-container ${sizeClass}" id="maker-grid-container" style="--grid-size: ${this.size};">
                  ${this.renderGridCells()}
                </div>
              </div>

              <div class="maker-metrics-bar" id="maker-metrics-bar">
                ${this.renderMetricsHtml()}
              </div>
            </section>

            <aside class="maker-sidebar-section">
              <div class="sidebar-tabs">
                <button class="sidebar-tab-btn active" id="tab-clue-authoring">Clue Authoring</button>
                <button class="sidebar-tab-btn" id="tab-word-assistant">Word Assistant</button>
              </div>

              <div class="sidebar-panel active" id="panel-clues">
                <div class="clue-table-container" id="clue-authoring-container">
                  ${this.renderClueAuthoringTables()}
                </div>
              </div>

              <div class="sidebar-panel" id="panel-dictionary">
                <div class="dict-finder-box">
                  <h4>Dictionary & Pattern Helper</h4>
                  <p class="dict-hint">Use <code>?</code> or <code>_</code> for unknown letters (e.g. <code>B??A??</code> or <code>S??AR</code>).</p>

                  <div class="dict-search-row">
                    <input type="text" class="input-text" id="dict-pattern-input" placeholder="e.g. B??A or P?Z?A" value="${this.searchPattern}">
                    <button class="btn btn-secondary" id="dict-search-btn">Search</button>
                  </div>

                  <div class="dict-quick-fill-row">
                    <button class="btn-subtle-sm" id="dict-fill-active-word">Get Pattern from Active Word</button>
                  </div>

                  <div class="dict-results-container" id="dict-results-list">
                    ${this.renderSearchResults()}
                  </div>
                </div>
              </div>
            </aside>
          </main>
        </div>

        <!-- Auto-Builder Modal -->
        <div class="modal-backdrop" id="auto-builder-modal">
          <div class="modal-card auto-builder-card animate-pop">
            <div class="modal-header-row">
              <h3>Auto-Build Crossword Grid</h3>
              <button class="modal-close-btn" id="auto-builder-close-btn">&times;</button>
            </div>

            <div class="auto-builder-body">
              <p class="auto-builder-desc">
                Type or paste words you want in your puzzle (one per line or separated by commas).
                You can also add clues using <code>WORD: Clue definition</code>.
                PuzzlePlot will automatically calculate intersections, word crossings, and lock in the grid blocks!
              </p>

              <textarea class="textarea-words" id="auto-builder-input" placeholder="BAYANI: Pambansang bayani&#10;SALAMAT: Pagpapahayag ng pasasalamat&#10;KULTURA: Kaugalian at tradisyon&#10;WIKA: Wikang pambansa&#10;ARAW: Liwanag sa maghapon"></textarea>

              <div class="samples-row">
                <span>Quick Samples:</span>
                <button class="sample-pill" id="sample-fil-btn">Sample Filipino Words</button>
                <button class="sample-pill" id="sample-en-btn">Sample English Words</button>
              </div>

              <div class="auto-builder-options">
                <div class="subbar-item">
                  <label>Target Grid Size:</label>
                  <select class="maker-select" id="auto-builder-size">
                    <option value="5" ${this.size === 5 ? 'selected' : ''}>5x5 Mini</option>
                    <option value="13" ${this.size === 13 ? 'selected' : ''}>13x13 Midi</option>
                    <option value="21" ${this.size === 21 ? 'selected' : ''}>21x21 Jumbo</option>
                  </select>
                </div>
                <div class="subbar-item">
                  <label>Grid Symmetry:</label>
                  <select class="maker-select" id="auto-builder-sym">
                    <option value="180">180° Rotational</option>
                    <option value="none">Freeform</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="auto-builder-footer">
              <button class="btn btn-secondary" id="auto-builder-cancel-btn">Cancel</button>
              <button class="btn btn-accent" id="auto-builder-generate-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span>Generate Grid Layout</span>
              </button>
            </div>
          </div>
        </div>

        <div id="print-sheet-container" class="print-sheet-area"></div>
      `;

      this.updateHighlighting();
      this.updateUndoRedoButtons();
    }

    getModeHintText() {
      if (this.editMode === 'blocks') {
        return `<strong>Block Mode</strong>: Click or tap cells to toggle black squares (Symmetry: ${this.symmetry}°).`;
      } else if (this.editMode === 'fill') {
        return `<strong>Letter Fill Mode</strong>: Click a cell and type letters. Press <kbd>Space</kbd> to toggle Across/Down.`;
      } else {
        return `<strong>Clue Mode</strong>: Write clues for each word in the table on the right.`;
      }
    }

    renderGridCells() {
      let html = '';
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const cell = this.grid[r][c];

          if (cell.isBlock) {
            html += `
              <div class="grid-cell cell-block maker-cell"
                   data-row="${r}"
                   data-col="${c}"
                   id="maker-cell-${r}-${c}">
              </div>`;
          } else {
            const numberHtml = cell.number ? `<span class="cell-num">${cell.number}</span>` : '';
            const letterVal = cell.value || '';

            html += `
              <div class="grid-cell cell-letter maker-cell"
                   data-row="${r}"
                   data-col="${c}"
                   tabindex="0"
                   id="maker-cell-${r}-${c}">
                ${numberHtml}
                <span class="cell-char" id="maker-char-${r}-${c}">${letterVal}</span>
              </div>
            `;
          }
        }
      }
      return html;
    }

    renderGridOnly() {
      const container = document.getElementById('maker-grid-container');
      if (container) {
        container.innerHTML = this.renderGridCells();
        this.updateHighlighting();
      }
    }

    renderMetricsHtml() {
      const metrics = CrosswordUtils.validateGrid(this.grid);
      const connClass = metrics.isConnected ? 'metric-ok' : 'metric-warn';
      const connText = metrics.isConnected ? 'Connected (Valid)' : 'Disconnected Islands Detected!';
      const emptyText = metrics.emptyLetterCount === 0 ? 'All Letters Filled' : `${metrics.emptyLetterCount} Empty Cells`;

      return `
        <div class="metric-chip">
          <span class="metric-label">Words:</span>
          <span class="metric-val"><strong>${metrics.acrossCount}</strong> Across / <strong>${metrics.downCount}</strong> Down</span>
        </div>
        <div class="metric-chip">
          <span class="metric-label">Blocks:</span>
          <span class="metric-val">${metrics.blockCount} (${metrics.blockPercentage}%)</span>
        </div>
        <div class="metric-chip ${connClass}">
          <span class="metric-label">Grid Flow:</span>
          <span class="metric-val">${connText}</span>
        </div>
        <div class="metric-chip">
          <span class="metric-label">Status:</span>
          <span class="metric-val">${emptyText}</span>
        </div>
      `;
    }

    updateMetrics() {
      const bar = document.getElementById('maker-metrics-bar');
      if (bar) {
        bar.innerHTML = this.renderMetricsHtml();
      }
    }

    renderClueAuthoringTables() {
      const renderTable = (direction) => {
        const words = direction === 'across' ? this.acrossWords : this.downWords;
        const clueDict = this.clues[direction] || {};

        if (words.length === 0) {
          return `<p class="empty-state-text">No ${direction} words yet. Place blocks to create words.</p>`;
        }

        return `
          <div class="clue-table-group">
            <h4 class="clue-table-title">${direction.toUpperCase()} CLUES (${words.length})</h4>
            <table class="clue-edit-table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th style="width: 100px;">Word</th>
                  <th>Clue Definition</th>
                </tr>
              </thead>
              <tbody>
                ${words.map(w => {
                  const clueVal = clueDict[w.number.toString()] || '';
                  const wordPattern = w.letters.trim() || '_______'.slice(0, w.length);
                  return `
                    <tr class="clue-row" data-direction="${direction}" data-number="${w.number}">
                      <td class="clue-td-num"><strong>${w.number}</strong></td>
                      <td class="clue-td-word"><code>${this.escapeHtml(wordPattern)}</code></td>
                      <td class="clue-td-input">
                        <input type="text"
                               class="clue-input-field"
                               data-direction="${direction}"
                               data-number="${w.number}"
                               value="${this.escapeHtml(clueVal)}"
                               placeholder="Write clue for ${w.number}-${direction}...">
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      };

      return `
        ${renderTable('across')}
        ${renderTable('down')}
      `;
    }

    renderCluesOnly() {
      const container = document.getElementById('clue-authoring-container');
      if (container) {
        container.innerHTML = this.renderClueAuthoringTables();
      }
    }

    renderSearchResults() {
      if (this.searchResults.length === 0) {
        if (this.searchPattern) {
          return `<p class="empty-state-text">No dictionary matches found for pattern "${this.escapeHtml(this.searchPattern)}" in ${(this.language || 'en').toUpperCase()}.</p>`;
        }
        return `<p class="empty-state-text">Search a pattern or click a word to see matches.</p>`;
      }

      return `
        <div class="dict-match-list">
          ${this.searchResults.map(word => `
            <div class="dict-match-item" data-word="${word}">
              <span class="dict-match-word">${word}</span>
              <button class="btn-subtle-sm btn-insert-word" data-word="${word}">Insert</button>
            </div>
          `).join('')}
        </div>
      `;
    }

    attachEventListeners() {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keydown', this.handleKeyDown);

      const titleInput = document.getElementById('maker-title-input');
      if (titleInput) {
        titleInput.addEventListener('input', (e) => {
          this.title = e.target.value;
        });
      }

      const authorInput = document.getElementById('maker-author-input');
      if (authorInput) {
        authorInput.addEventListener('input', (e) => {
          this.author = e.target.value;
        });
      }

      const sizeSelect = document.getElementById('maker-size-select');
      if (sizeSelect) {
        sizeSelect.addEventListener('change', (e) => this.changeSize(e.target.value));
      }

      const langSelect = document.getElementById('maker-lang-select');
      if (langSelect) {
        langSelect.addEventListener('change', (e) => {
          this.language = e.target.value;
        });
      }

      const symSelect = document.getElementById('maker-sym-select');
      if (symSelect) {
        symSelect.addEventListener('change', (e) => {
          this.symmetry = e.target.value;
        });
      }

      document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.mode;
          this.setEditMode(mode);
        });
      });

      const btnUndo = document.getElementById('maker-undo-btn');
      if (btnUndo) btnUndo.addEventListener('click', () => this.undo());
      const btnRedo = document.getElementById('maker-redo-btn');
      if (btnRedo) btnRedo.addEventListener('click', () => this.redo());

      const btnBack = document.getElementById('maker-back-btn');
      if (btnBack) btnBack.addEventListener('click', () => this.onExit());

      const btnTestPlay = document.getElementById('maker-test-play-btn');
      if (btnTestPlay) {
        btnTestPlay.addEventListener('click', () => {
          if (!this.validateForAction('Test Play')) return;
          const puzzleData = this.getPuzzleObject();
          this.onTestPlay(puzzleData);
        });
      }

      this.setupDropdown('maker-save-menu-btn', 'maker-save-dropdown');

      const actSaveLocal = document.getElementById('maker-act-save-local');
      if (actSaveLocal) {
        actSaveLocal.addEventListener('click', () => {
          if (!this.validateForAction('Save')) return;
          const puzzle = this.getPuzzleObject();
          this.onSave(puzzle);
        });
      }

      const actExportJson = document.getElementById('maker-act-export-json');
      if (actExportJson) {
        actExportJson.addEventListener('click', () => {
          if (!this.validateForAction('Export')) return;
          this.exportPuzzleJSON();
        });
      }

      const actImportJson = document.getElementById('maker-act-import-json');
      const fileImporter = document.getElementById('maker-file-importer');
      if (actImportJson && fileImporter) {
        actImportJson.addEventListener('click', () => fileImporter.click());
        fileImporter.addEventListener('change', (e) => this.handleFileImport(e));
      }

      const actPrint = document.getElementById('maker-act-print');
      if (actPrint) {
        actPrint.addEventListener('click', () => {
          if (!this.validateForAction('Print')) return;
          this.generatePrintableSheet();
        });
      }

      const gridContainer = document.getElementById('maker-grid-container');
      if (gridContainer) {
        gridContainer.addEventListener('click', (e) => {
          const cellElem = e.target.closest('.maker-cell');
          if (cellElem) {
            const r = parseInt(cellElem.dataset.row, 10);
            const c = parseInt(cellElem.dataset.col, 10);
            this.onCellClick(r, c);
          }
        });
      }

      // Auto-Builder Modal Events
      const btnAutoBuild = document.getElementById('maker-btn-auto-build');
      const autoModal = document.getElementById('auto-builder-modal');
      const autoCloseBtn = document.getElementById('auto-builder-close-btn');
      const autoCancelBtn = document.getElementById('auto-builder-cancel-btn');
      const autoGenerateBtn = document.getElementById('auto-builder-generate-btn');
      const autoInput = document.getElementById('auto-builder-input');
      const sampleFil = document.getElementById('sample-fil-btn');
      const sampleEn = document.getElementById('sample-en-btn');

      if (btnAutoBuild && autoModal) {
        btnAutoBuild.addEventListener('click', () => {
          autoModal.classList.add('active');
        });
      }

      const closeAutoModal = () => {
        if (autoModal) autoModal.classList.remove('active');
      };

      if (autoCloseBtn) autoCloseBtn.addEventListener('click', closeAutoModal);
      if (autoCancelBtn) autoCancelBtn.addEventListener('click', closeAutoModal);

      if (sampleFil && autoInput) {
        sampleFil.addEventListener('click', () => {
          autoInput.value = `BAYANI: Pambansang bayani ng Inang Bayan\nSALAMAT: Pagpapahayag ng pasasalamat\nKULTURA: Kaugalian at tradisyon ng lahi\nWIKA: Wikang pambansang Filipino\nARAW: Liwanag at sikat sa umaga\nTALINO: Dunong at katalasan ng isip\nBUNGA: Ani mula sa sakahan`;
        });
      }

      if (sampleEn && autoInput) {
        sampleEn.addEventListener('click', () => {
          autoInput.value = `PLANET: Celestial body orbiting a star\nROCKET: Space exploration vehicle\nGALAXY: Vast system of millions of stars\nSOLAR: Energy derived from the sun\nORBIT: Gravitational curved trajectory\nCOMET: Icy body with a glowing tail`;
        });
      }

      if (autoGenerateBtn && autoInput) {
        autoGenerateBtn.addEventListener('click', () => {
          try {
            const rawWords = autoInput.value;
            const targetSize = parseInt(document.getElementById('auto-builder-size').value, 10);
            const targetSym = document.getElementById('auto-builder-sym').value;

            const result = CrosswordUtils.autoGenerateCrossword({
              rawInputWords: rawWords,
              size: targetSize,
              symmetry: targetSym
            });

            this.size = targetSize;
            this.grid = result.grid;
            this.clues = result.clues;
            this.cursor = { row: 0, col: 0 };
            this.saveStateToHistory();
            this.recomputeGrid();
            this.render();
            this.attachEventListeners();

            closeAutoModal();
            SoundEngine.playVictorySound();
            alert(`Auto-Grid Successfully Generated! Placed ${result.placedCount} words in a valid ${targetSize}x${targetSize} layout.`);
          } catch (err) {
            alert(err.message);
          }
        });
      }

      const btnClearLetters = document.getElementById('maker-btn-clear-letters');
      if (btnClearLetters) {
        btnClearLetters.addEventListener('click', () => {
          if (confirm('Clear all filled letters from this grid?')) {
            for (let r = 0; r < this.size; r++) {
              for (let c = 0; c < this.size; c++) {
                if (!this.grid[r][c].isBlock) this.grid[r][c].value = '';
              }
            }
            this.saveStateToHistory();
            this.recomputeGrid();
            this.renderGridOnly();
            this.renderCluesOnly();
            this.updateMetrics();
          }
        });
      }

      const btnClearAll = document.getElementById('maker-btn-clear-all');
      if (btnClearAll) {
        btnClearAll.addEventListener('click', () => {
          if (confirm('Reset entire grid to blank canvas?')) {
            this.grid = CrosswordUtils.createEmptyGrid(this.size, this.size);
            this.clues = { across: {}, down: {} };
            this.saveStateToHistory();
            this.recomputeGrid();
            this.renderGridOnly();
            this.renderCluesOnly();
            this.updateMetrics();
          }
        });
      }

      const tabClues = document.getElementById('tab-clue-authoring');
      const tabDict = document.getElementById('tab-word-assistant');
      const panelClues = document.getElementById('panel-clues');
      const panelDict = document.getElementById('panel-dictionary');

      if (tabClues && tabDict && panelClues && panelDict) {
        tabClues.addEventListener('click', () => {
          tabClues.classList.add('active');
          tabDict.classList.remove('active');
          panelClues.classList.add('active');
          panelDict.classList.remove('active');
        });
        tabDict.addEventListener('click', () => {
          tabDict.classList.add('active');
          tabClues.classList.remove('active');
          panelDict.classList.add('active');
          panelClues.classList.remove('active');
        });
      }

      const clueContainer = document.getElementById('clue-authoring-container');
      if (clueContainer) {
        clueContainer.addEventListener('input', (e) => {
          const input = e.target.closest('.clue-input-field');
          if (input) {
            const dir = input.dataset.direction;
            const num = input.dataset.number;
            if (!this.clues[dir]) this.clues[dir] = {};
            this.clues[dir][num] = input.value;
          }
        });
      }

      const dictSearchBtn = document.getElementById('dict-search-btn');
      const dictInput = document.getElementById('dict-pattern-input');
      if (dictSearchBtn && dictInput) {
        dictSearchBtn.addEventListener('click', () => {
          this.performDictionarySearch(dictInput.value);
        });
        dictInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.performDictionarySearch(dictInput.value);
        });
      }

      const dictFillActive = document.getElementById('dict-fill-active-word');
      if (dictFillActive) {
        dictFillActive.addEventListener('click', () => {
          this.loadActiveWordPatternIntoSearch();
        });
      }

      const dictResults = document.getElementById('dict-results-list');
      if (dictResults) {
        dictResults.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn-insert-word');
          if (btn) {
            const word = btn.dataset.word;
            this.insertWordIntoActiveSlot(word);
          }
        });
      }
    }

    setupDropdown(btnId, menuId) {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      if (!btn || !menu) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        menu.classList.remove('show');
      });
    }

    setEditMode(mode) {
      this.editMode = mode;
      document.querySelectorAll('.segment-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
      const hint = document.getElementById('maker-mode-hint');
      if (hint) hint.innerHTML = this.getModeHintText();

      if (mode === 'clues') {
        const tabClues = document.getElementById('tab-clue-authoring');
        if (tabClues) tabClues.click();
      }
    }

    onCellClick(r, c) {
      if (this.editMode === 'blocks') {
        const willBeBlock = !this.grid[r][c].isBlock;
        const coords = CrosswordUtils.getSymmetricCoordinates(r, c, this.size, this.size, this.symmetry);

        coords.forEach(coord => {
          this.grid[coord.row][coord.col].isBlock = willBeBlock;
          if (willBeBlock) {
            this.grid[coord.row][coord.col].value = '';
          }
        });

        this.saveStateToHistory();
        this.recomputeGrid();
        this.renderGridOnly();
        this.renderCluesOnly();
        this.updateMetrics();
        SoundEngine.playKeySound();
      } else {
        if (this.grid[r][c].isBlock) return;

        if (this.cursor.row === r && this.cursor.col === c) {
          this.toggleDirection();
        } else {
          this.cursor = { row: r, col: c };
          this.updateHighlighting();
        }
      }
    }

    toggleDirection() {
      this.direction = this.direction === 'across' ? 'down' : 'across';
      this.updateHighlighting();
    }

    handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
        return;
      }

      if (this.editMode === 'blocks') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.onCellClick(this.cursor.row, this.cursor.col);
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          this.navigateCursor(e.key);
        }
        return;
      }

      const key = e.key;
      if (/^[a-zA-ZñÑ]$/.test(key)) {
        e.preventDefault();
        this.handleInputLetter(key.toUpperCase());
      } else if (key === 'Backspace') {
        e.preventDefault();
        this.handleBackspace();
      } else if (key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        this.toggleDirection();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        this.navigateCursor(key);
      }
    }

    navigateCursor(key) {
      let dR = 0, dC = 0;
      if (key === 'ArrowUp') dR = -1;
      if (key === 'ArrowDown') dR = 1;
      if (key === 'ArrowLeft') dC = -1;
      if (key === 'ArrowRight') dC = 1;

      let nr = this.cursor.row + dR;
      let nc = this.cursor.col + dC;

      if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
        this.cursor = { row: nr, col: nc };
        this.updateHighlighting();
      }
    }

    handleInputLetter(letter) {
      const { row, col } = this.cursor;
      if (this.grid[row][col].isBlock) return;

      this.grid[row][col].value = letter;
      const charElem = document.getElementById(`maker-char-${row}-${col}`);
      if (charElem) charElem.textContent = letter;

      SoundEngine.playKeySound();
      this.saveStateToHistory();
      this.recomputeGrid();
      this.renderCluesOnly();
      this.updateMetrics();

      this.advanceCursor();
    }

    handleBackspace() {
      const { row, col } = this.cursor;
      if (this.grid[row][col].isBlock) return;

      if (this.grid[row][col].value !== '') {
        this.grid[row][col].value = '';
        const charElem = document.getElementById(`maker-char-${row}-${col}`);
        if (charElem) charElem.textContent = '';
        SoundEngine.playKeySound();
        this.saveStateToHistory();
        this.recomputeGrid();
        this.renderCluesOnly();
        this.updateMetrics();
      } else {
        this.stepBackCursor();
        const nr = this.cursor.row;
        const nc = this.cursor.col;
        this.grid[nr][nc].value = '';
        const charElem = document.getElementById(`maker-char-${nr}-${nc}`);
        if (charElem) charElem.textContent = '';
        SoundEngine.playKeySound();
        this.saveStateToHistory();
        this.recomputeGrid();
        this.renderCluesOnly();
        this.updateMetrics();
        this.updateHighlighting();
      }
    }

    getActiveWord() {
      const cell = this.grid[this.cursor.row][this.cursor.col];
      if (cell.isBlock) return null;
      const clueNum = this.direction === 'across' ? cell.acrossClueNumber : cell.downClueNumber;
      const words = this.direction === 'across' ? this.acrossWords : this.downWords;
      return words.find(w => w.number === clueNum);
    }

    advanceCursor() {
      const activeWord = this.getActiveWord();
      if (!activeWord) return;

      const idx = activeWord.cells.findIndex(c => c.row === this.cursor.row && c.col === this.cursor.col);
      if (idx !== -1 && idx < activeWord.cells.length - 1) {
        const next = activeWord.cells[idx + 1];
        this.cursor = { row: next.row, col: next.col };
        this.updateHighlighting();
      }
    }

    stepBackCursor() {
      const activeWord = this.getActiveWord();
      if (!activeWord) return;

      const idx = activeWord.cells.findIndex(c => c.row === this.cursor.row && c.col === this.cursor.col);
      if (idx > 0) {
        const prev = activeWord.cells[idx - 1];
        this.cursor = { row: prev.row, col: prev.col };
      }
    }

    updateHighlighting() {
      document.querySelectorAll('.cell-active-cursor, .cell-active-word, .clue-row-active').forEach(el => {
        el.classList.remove('cell-active-cursor', 'cell-active-word', 'clue-row-active');
      });

      const activeWord = this.getActiveWord();
      if (activeWord) {
        activeWord.cells.forEach(c => {
          const el = document.getElementById(`maker-cell-${c.row}-${c.col}`);
          if (el) el.classList.add('cell-active-word');
        });

        const rowElem = document.querySelector(`.clue-row[data-direction="${this.direction}"][data-number="${activeWord.number}"]`);
        if (rowElem) {
          rowElem.classList.add('clue-row-active');
          rowElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      const cursorElem = document.getElementById(`maker-cell-${this.cursor.row}-${this.cursor.col}`);
      if (cursorElem) {
        cursorElem.classList.add('cell-active-cursor');
      }
    }

    loadActiveWordPatternIntoSearch() {
      const word = this.getActiveWord();
      if (!word) return;

      let pattern = '';
      word.cells.forEach(c => {
        const val = this.grid[c.row][c.col].value;
        pattern += val ? val : '?';
      });

      const input = document.getElementById('dict-pattern-input');
      if (input) {
        input.value = pattern;
        this.performDictionarySearch(pattern);
      }
    }

    performDictionarySearch(pattern) {
      this.searchPattern = pattern;
      this.searchResults = DictionarySearch.findMatches(pattern, this.language, 40);
      const container = document.getElementById('dict-results-list');
      if (container) {
        container.innerHTML = this.renderSearchResults();
      }
    }

    insertWordIntoActiveSlot(word) {
      const activeWord = this.getActiveWord();
      if (!activeWord || activeWord.cells.length !== word.length) {
        alert(`Selected word length (${word.length}) does not match current slot length (${activeWord ? activeWord.cells.length : 0}).`);
        return;
      }

      for (let i = 0; i < word.length; i++) {
        const c = activeWord.cells[i];
        this.grid[c.row][c.col].value = word[i].toUpperCase();
      }

      this.saveStateToHistory();
      this.recomputeGrid();
      this.renderGridOnly();
      this.renderCluesOnly();
      this.updateMetrics();
      SoundEngine.playWordCompleteSound();
    }

    getPuzzleObject() {
      this.recomputeGrid();
      const rawGrid = this.grid.map(row => {
        return row.map(cell => cell.isBlock ? '#' : (cell.value || ' '));
      });

      return {
        id: this.id,
        title: this.title || 'Untitled Puzzle',
        author: this.author || 'Anonymous',
        language: this.language || 'en',
        size: this.size,
        difficulty: this.difficulty || 'Custom',
        description: this.description || '',
        grid: rawGrid,
        clues: this.clues,
        updatedAt: Date.now()
      };
    }

    exportPuzzleJSON() {
      const puzzle = this.getPuzzleObject();
      const jsonStr = CrosswordUtils.exportToJSON(puzzle);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_puzzleplot.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    handleFileImport(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 1024 * 1024) {
        SoundEngine.playErrorSound();
        alert('Selected puzzle file is too large (maximum allowed size is 1MB).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = CrosswordUtils.importFromJSON(evt.target.result);
          this.init(imported);
          SoundEngine.playVictorySound();
          alert('Puzzle successfully loaded into PuzzlePlot Studio!');
        } catch (err) {
          SoundEngine.playErrorSound();
          alert(err.message);
        }
      };
      reader.readAsText(file);
    }

    generatePrintableSheet() {
      const puzzle = this.getPuzzleObject();
      const { grid, acrossWords, downWords } = CrosswordUtils.computeNumbersAndWords(this.grid);

      let gridHtml = `<div class="print-grid" style="--print-size: ${this.size};">`;
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const cell = grid[r][c];
          if (cell.isBlock) {
            gridHtml += `<div class="print-cell print-block"></div>`;
          } else {
            const num = cell.number ? `<span class="print-num">${cell.number}</span>` : '';
            gridHtml += `<div class="print-cell">${num}</div>`;
          }
        }
      }
      gridHtml += `</div>`;

      const acrossClues = acrossWords.map(w => {
        const clue = (puzzle.clues.across && puzzle.clues.across[w.number]) || '';
        return `<li><strong>${w.number}.</strong> ${this.escapeHtml(clue)}</li>`;
      }).join('');

      const downClues = downWords.map(w => {
        const clue = (puzzle.clues.down && puzzle.clues.down[w.number]) || '';
        return `<li><strong>${w.number}.</strong> ${this.escapeHtml(clue)}</li>`;
      }).join('');

      const sheetContainer = document.getElementById('print-sheet-container');
      if (sheetContainer) {
        sheetContainer.innerHTML = `
          <div class="print-page">
            <div class="print-header">
              <h1 class="print-title">${this.escapeHtml(puzzle.title)}</h1>
              <p class="print-byline">Created by ${this.escapeHtml(puzzle.author)} • PuzzlePlot Crosswords</p>
            </div>

            <div class="print-body">
              <div class="print-grid-col">
                ${gridHtml}
              </div>

              <div class="print-clues-col">
                <div class="print-clue-group">
                  <h3>ACROSS</h3>
                  <ol class="print-clue-list">${acrossClues}</ol>
                </div>
                <div class="print-clue-group">
                  <h3>DOWN</h3>
                  <ol class="print-clue-list">${downClues}</ol>
                </div>
              </div>
            </div>
          </div>
        `;
        window.print();
      }
    }

    escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    destroy() {
      window.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  // =========================================================================
  // 7. MAIN APPLICATION CONTROLLER
  // =========================================================================
  /**
   * PuzzlePlot Main Application Controller
   * Hub management, routing between Player and Maker Studio, Theme controller, and Library catalog.
   */






  class PuzzlePlotApp {
    constructor() {
      this.currentView = 'hub'; // 'hub' | 'player' | 'maker'
      this.player = null;
      this.maker = null;
      this.customPuzzles = this.loadCustomPuzzles();
      this.theme = (typeof localStorage !== 'undefined' ? localStorage.getItem('puzzleplot_theme') : null) || 'paper';

      this.sizeFilter = 'all';
      this.langFilter = 'all';

      this.init();
    }

    init() {
      this.applyTheme(this.theme);
      if (typeof document !== 'undefined') {
        this.setupHeaderEvents();
        this.setupTutorialModalEvents();
        this.renderHub();
        this.updateSoundButton();
      }
    }

    loadCustomPuzzles() {
      try {
        if (typeof localStorage === 'undefined') return [];
        const saved = localStorage.getItem('puzzleplot_custom_puzzles');
        if (!saved) return [];
        if (typeof saved === 'string' && saved.length > 2 * 1024 * 1024) {
          console.warn('Storage collection exceeds maximum allowed size (2MB). Ignoring corrupted payload.');
          return [];
        }
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];

        const validPuzzles = [];
        for (const item of parsed) {
          try {
            const normalized = CrosswordUtils.validateAndNormalizeImport(item);
            validPuzzles.push(normalized);
          } catch (itemErr) {
            console.warn('Skipping corrupted custom puzzle from storage:', itemErr.message);
          }
        }
        return validPuzzles.slice(0, 50);
      } catch (e) {
        console.warn('Failed to parse custom puzzles from localStorage:', e.message);
        return [];
      }
    }

    saveCustomPuzzles() {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem('puzzleplot_custom_puzzles', JSON.stringify(this.customPuzzles.slice(0, 50)));
      } catch (e) {
        console.error('Storage quota or serialization failure in saveCustomPuzzles:', e);
        this.showToast('Storage quota exceeded. Unable to save puzzle.');
      }
    }

    setupHeaderEvents() {
      const logo = document.getElementById('header-logo');
      if (logo) {
        logo.addEventListener('click', () => this.switchView('hub'));
      }

      const navPlay = document.getElementById('nav-play-btn');
      if (navPlay) {
        navPlay.addEventListener('click', () => this.switchView('hub'));
      }

      const navCreate = document.getElementById('nav-create-btn');
      if (navCreate) {
        navCreate.addEventListener('click', () => this.startMaker(null));
      }

      const navTutorial = document.getElementById('nav-tutorial-btn');
      if (navTutorial) {
        navTutorial.addEventListener('click', () => this.openTutorialModal());
      }

      const themeToggle = document.getElementById('theme-toggle-btn');
      if (themeToggle) {
        themeToggle.addEventListener('click', () => {
          const nextTheme = this.theme === 'light' ? 'dark' : this.theme === 'dark' ? 'paper' : 'light';
          this.applyTheme(nextTheme);
        });
      }

      const soundToggle = document.getElementById('sound-toggle-btn');
      if (soundToggle) {
        soundToggle.addEventListener('click', () => {
          SoundEngine.toggleMute();
          this.updateSoundButton();
        });
      }
    }

    setupTutorialModalEvents() {
      const modal = document.getElementById('tutorial-modal');
      const closeBtn = document.getElementById('tutorial-close-btn');

      if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }

      const aboutModal = document.getElementById('about-modal');
      const aboutCloseBtn = document.getElementById('about-close-btn');
      if (aboutCloseBtn && aboutModal) {
        aboutCloseBtn.addEventListener('click', () => {
          aboutModal.classList.remove('active');
        });
      }

      document.querySelectorAll('.tutorial-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetChapter = btn.dataset.chapter;
          document.querySelectorAll('.tutorial-tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tutorial-chapter').forEach(c => c.classList.remove('active'));

          btn.classList.add('active');
          const chapterEl = document.getElementById(`chapter-${targetChapter}`);
          if (chapterEl) chapterEl.classList.add('active');
        });
      });
    }

    openTutorialModal() {
      const modal = document.getElementById('tutorial-modal');
      if (modal) modal.classList.add('active');
    }

    openAboutModal() {
      const modal = document.getElementById('about-modal');
      if (modal) modal.classList.add('active');
    }

    updateSoundButton() {
      const soundBtn = document.getElementById('sound-toggle-btn');
      if (!soundBtn) return;
      const isMuted = SoundEngine.isMuted;
      soundBtn.innerHTML = isMuted
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
      soundBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
    }

    applyTheme(newTheme) {
      this.theme = newTheme;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('puzzleplot_theme', newTheme);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
          if (newTheme === 'dark') {
            themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="12" x2="12" y2="3"/><line x1="12" y1="12" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
            themeBtn.title = 'Theme: Dark (Click for Paper)';
          } else if (newTheme === 'paper') {
            themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
            themeBtn.title = 'Theme: Classic Paper (Click for Light)';
          } else {
            themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
            themeBtn.title = 'Theme: Light (Click for Dark)';
          }
        }
      }
    }

    switchView(viewName) {
      this.currentView = viewName;

      const hubView = document.getElementById('hub-view');
      const playerView = document.getElementById('player-view');
      const makerView = document.getElementById('maker-view');

      if (hubView) hubView.classList.toggle('active', viewName === 'hub');
      if (playerView) playerView.classList.toggle('active', viewName === 'player');
      if (makerView) makerView.classList.toggle('active', viewName === 'maker');

      if (viewName !== 'player' && this.player) {
        this.player.destroy();
      }
      if (viewName !== 'maker' && this.maker) {
        this.maker.destroy();
      }

      if (viewName === 'hub') {
        this.renderHub();
      }

      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    startPlayer(puzzle) {
      this.switchView('player');
      if (!this.player) {
        this.player = new CrosswordPlayer({
          container: document.getElementById('player-view'),
          onExit: () => this.switchView('hub')
        });
      }
      this.player.loadPuzzle(puzzle);
    }

    startMaker(existingPuzzle = null) {
      this.switchView('maker');
      if (!this.maker) {
        this.maker = new CrosswordMaker({
          container: document.getElementById('maker-view'),
          onExit: () => this.switchView('hub'),
          onTestPlay: (puzzleData) => {
            this.startPlayer(puzzleData);
          },
          onSave: (puzzleData) => {
            this.saveCustomPuzzle(puzzleData);
          }
        });
      }
      this.maker.init(existingPuzzle);
    }

    saveCustomPuzzle(puzzleData) {
      const idx = this.customPuzzles.findIndex(p => p.id === puzzleData.id);
      if (idx !== -1) {
        this.customPuzzles[idx] = puzzleData;
      } else {
        this.customPuzzles.unshift(puzzleData);
      }
      this.saveCustomPuzzles();
      this.showToast('Puzzle saved to your library!');
    }

    deleteCustomPuzzle(puzzleId) {
      if (confirm('Are you sure you want to delete this custom puzzle?')) {
        this.customPuzzles = this.customPuzzles.filter(p => p.id !== puzzleId);
        this.saveCustomPuzzles();
        this.renderHub();
        this.showToast('Puzzle deleted.');
      }
    }

    showToast(message) {
      if (typeof document === 'undefined') return;
      const toast = document.createElement('div');
      toast.className = 'toast-notification animate-pop';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, 2500);
    }

    renderHub() {
      const hubContainer = document.getElementById('hub-view');
      if (!hubContainer) return;

      const allPresets = PresetPuzzles;
      const filteredPresets = allPresets.filter(p => {
        const matchSize = this.sizeFilter === 'all' || p.size.toString() === this.sizeFilter;
        const matchLang = this.langFilter === 'all' || p.language === this.langFilter;
        return matchSize && matchLang;
      });

      const filteredCustom = this.customPuzzles.filter(p => {
        const matchSize = this.sizeFilter === 'all' || (p.size || p.width || 13).toString() === this.sizeFilter;
        const matchLang = this.langFilter === 'all' || p.language === this.langFilter;
        return matchSize && matchLang;
      });

      hubContainer.innerHTML = `
        <div class="hub-hero">
          <div class="hub-hero-badge">The Premier Word Puzzle Studio</div>
          <h1 class="hub-hero-title">PuzzlePlot</h1>
          <p class="hub-hero-subtitle">
            Solve handcrafted crosswords in <strong>English</strong> and <strong>Filipino</strong>, or construct your own
            5×5 Mini, 13×13 Midi, and 21×21 Jumbo puzzles with automatic word placement and 180° symmetry.
          </p>

          <div class="hub-hero-quick-actions">
            <button class="btn btn-secondary btn-sm" id="hero-btn-tutorial">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>How to Play & Tips</span>
            </button>
          </div>

          <div class="hub-action-cards">
            <div class="hub-action-card card-play" id="hero-card-play">
              <div class="card-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </div>
              <div class="card-info">
                <h3>Play Crosswords</h3>
                <p>Explore mini to jumbo crosswords in English and Filipino with interactive clues, timer, and smooth keyboard navigation.</p>
              </div>
              <button class="btn btn-primary btn-block" id="hero-btn-play">Play Now</button>
            </div>

            <div class="hub-action-card card-create" id="hero-card-create">
              <div class="card-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <div class="card-info">
                <h3>Crossword Maker</h3>
                <p>Design puzzles from scratch or paste your words for automatic grid layout, symmetry locks, and printable sheet export.</p>
              </div>
              <button class="btn btn-secondary btn-block" id="hero-btn-create">Create Puzzle</button>
            </div>
          </div>
        </div>

        <section class="hub-catalog-section" id="puzzle-catalog-section">
          <div class="catalog-header">
            <div class="catalog-title-area">
              <h2>Puzzle Library</h2>
              <p>Pick a puzzle size and language to start playing</p>
            </div>

            <div class="catalog-filters">
              <div class="filter-group">
                <span class="filter-label">Size:</span>
                <div class="filter-pills" id="filter-size-pills">
                  <button class="pill-btn ${this.sizeFilter === 'all' ? 'active' : ''}" data-size="all">All Sizes</button>
                  <button class="pill-btn ${this.sizeFilter === '5' ? 'active' : ''}" data-size="5">5×5 Mini</button>
                  <button class="pill-btn ${this.sizeFilter === '13' ? 'active' : ''}" data-size="13">13×13 Midi</button>
                  <button class="pill-btn ${this.sizeFilter === '21' ? 'active' : ''}" data-size="21">21×21 Jumbo</button>
                </div>
              </div>

              <div class="filter-group">
                <span class="filter-label">Language:</span>
                <div class="filter-pills" id="filter-lang-pills">
                  <button class="pill-btn ${this.langFilter === 'all' ? 'active' : ''}" data-lang="all">All</button>
                  <button class="pill-btn ${this.langFilter === 'en' ? 'active' : ''}" data-lang="en">English</button>
                  <button class="pill-btn ${this.langFilter === 'fil' ? 'active' : ''}" data-lang="fil">Filipino</button>
                </div>
              </div>
            </div>
          </div>

          <div class="puzzle-cards-grid">
            ${filteredPresets.map(p => this.renderPuzzleCard(p, false)).join('')}
          </div>

          ${this.customPuzzles.length > 0 ? `
            <div class="custom-puzzles-header">
              <div class="catalog-title-area">
                <h2>My Created Puzzles (${this.customPuzzles.length})</h2>
                <p>Puzzles crafted in your PuzzlePlot Maker Studio</p>
              </div>
            </div>

            <div class="puzzle-cards-grid">
              ${filteredCustom.map(p => this.renderPuzzleCard(p, true)).join('')}
            </div>
          ` : ''}
        </section>

        <!-- Application Footer -->
        <footer class="app-footer">
          <div class="footer-inner">
            <div class="footer-left">
              <p><strong>PuzzlePlot</strong> — Crossword Puzzle Game & Maker Studio (v1.1.0)</p>
              <p class="footer-byline">Designed and product-directed by <a href="https://github.com/jgotangco" target="_blank" rel="noopener noreferrer" class="about-link">Jerome Gotangco</a> (<a href="mailto:jeromesg@google.com" class="about-link">jeromesg@google.com</a>). Developed with <a href="https://antigravity.google/" target="_blank" rel="noopener noreferrer" class="about-link">Google Antigravity</a> / <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" class="about-link">Gemini</a>.</p>
            </div>
            <div class="footer-links">
              <button class="footer-link-btn" id="footer-link-about">About PuzzlePlot</button>
              <button class="footer-link-btn" id="footer-link-guide">How to Play & Tips</button>
              <a href="https://github.com/jgotangco/PuzzlePlot" target="_blank" rel="noopener noreferrer" class="footer-link-btn">GitHub</a>
            </div>
          </div>
        </footer>
      `;

      this.attachHubEvents();
    }

    renderPuzzleCard(p, isCustom = false) {
      const rawSize = p.size || p.width || 13;
      const size = (rawSize === 5 || rawSize === 13 || rawSize === 21) ? rawSize : 13;
      const safeLang = (p.language === 'fil' || p.language === 'tl') ? 'fil' : 'en';
      const langDisplay = safeLang.toUpperCase();
      const langBadgeClass = `lang-${safeLang}`;

      let diff = 'Medium';
      if (typeof p.difficulty === 'string') {
        const lower = p.difficulty.toLowerCase().trim();
        if (lower.includes('easy')) diff = 'Easy';
        else if (lower.includes('hard')) diff = 'Hard';
        else if (lower.includes('medium') || lower.includes('classic')) diff = 'Medium';
        else diff = 'Custom';
      } else {
        diff = size === 5 ? 'Easy' : size === 13 ? 'Medium' : 'Hard';
      }

      const safeId = this.escapeHtml(p.id);
      const safeTitle = this.escapeHtml(p.title || 'Untitled Crossword');
      const safeDesc = this.escapeHtml(p.description || 'Custom crafted crossword puzzle.');
      const safeAuthor = this.escapeHtml(p.author || 'Anonymous');
      const safeDiff = this.escapeHtml(diff);
      const hasProgress = typeof localStorage !== 'undefined' && !!localStorage.getItem(`puzzleplot_progress_${p.id}`);

      return `
        <div class="puzzle-card ${isCustom ? 'card-custom' : ''}" data-id="${safeId}">
          <div class="puzzle-card-top">
            <div class="puzzle-badges">
              <span class="card-badge badge-size">${size}×${size}</span>
              <span class="card-badge ${langBadgeClass}">${langDisplay}</span>
              <span class="card-badge badge-diff">${safeDiff}</span>
            </div>
            ${hasProgress ? `<span class="badge-in-progress">In Progress</span>` : ''}
          </div>

          <h3 class="puzzle-card-title">${safeTitle}</h3>
          <p class="puzzle-card-desc">${safeDesc}</p>

          <div class="puzzle-card-meta">
            <span>By ${safeAuthor}</span>
          </div>

          <div class="puzzle-card-actions">
            <button class="btn btn-primary btn-sm btn-play-puzzle" data-id="${safeId}" data-custom="${isCustom}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>${hasProgress ? 'Resume' : 'Play'}</span>
            </button>

            ${isCustom ? `
              <button class="btn btn-secondary btn-sm btn-edit-puzzle" data-id="${safeId}" title="Edit in Maker">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>Edit</span>
              </button>
              <button class="btn-icon-subtle btn-del-puzzle" data-id="${safeId}" title="Delete puzzle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    attachHubEvents() {
      const heroPlay = document.getElementById('hero-card-play');
      const heroBtnPlay = document.getElementById('hero-btn-play');
      const handlePlayClick = () => {
        const gridSection = document.getElementById('puzzle-catalog-section');
        if (gridSection) {
          gridSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          this.startPlayer(PresetPuzzles[0]);
        }
      };

      if (heroPlay) heroPlay.addEventListener('click', handlePlayClick);
      if (heroBtnPlay) heroBtnPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePlayClick();
      });

      const heroCreate = document.getElementById('hero-card-create');
      const heroBtnCreate = document.getElementById('hero-btn-create');
      const handleCreateClick = () => this.startMaker(null);

      if (heroCreate) heroCreate.addEventListener('click', handleCreateClick);
      if (heroBtnCreate) heroBtnCreate.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCreateClick();
      });

      const heroTutorial = document.getElementById('hero-btn-tutorial');
      if (heroTutorial) {
        heroTutorial.addEventListener('click', () => this.openTutorialModal());
      }

      const footerAbout = document.getElementById('footer-link-about');
      if (footerAbout) {
        footerAbout.addEventListener('click', () => this.openAboutModal());
      }

      const footerGuide = document.getElementById('footer-link-guide');
      if (footerGuide) {
        footerGuide.addEventListener('click', () => this.openTutorialModal());
      }

      document.querySelectorAll('#filter-size-pills .pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.sizeFilter = btn.dataset.size;
          this.renderHub();
        });
      });

      document.querySelectorAll('#filter-lang-pills .pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.langFilter = btn.dataset.lang;
          this.renderHub();
        });
      });

      document.querySelectorAll('.btn-play-puzzle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const isCustom = btn.dataset.custom === 'true';
          let puzzle = null;

          if (isCustom) {
            puzzle = this.customPuzzles.find(p => p.id === id);
          } else {
            puzzle = PresetPuzzles.find(p => p.id === id);
          }

          if (puzzle) this.startPlayer(puzzle);
        });
      });

      document.querySelectorAll('.btn-edit-puzzle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const puzzle = this.customPuzzles.find(p => p.id === id);
          if (puzzle) this.startMaker(puzzle);
        });
      });

      document.querySelectorAll('.btn-del-puzzle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          this.deleteCustomPuzzle(id);
        });
      });
    }

    escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  // Expose PuzzlePlotApp class on window if running in browser
  if (typeof window !== 'undefined') {
    window.PuzzlePlotApp = PuzzlePlotApp;
  }

  // Robust Application bootstrap on DOM ready / load
  function initPuzzlePlot() {
    if (typeof window !== 'undefined' && !window.PuzzlePlot) {
      window.PuzzlePlot = new PuzzlePlotApp();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPuzzlePlot);
    } else {
      initPuzzlePlot();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('load', initPuzzlePlot);
    }
  }
})();
