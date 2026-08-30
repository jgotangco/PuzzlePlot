/**
 * PuzzlePlot Crossword Player Engine
 * Handles gameplay, grid navigation, keyboard/touch input, assists, timer, and victory logic.
 */

import { CrosswordUtils } from '../engine/crosswordUtils.js';
import { SoundEngine } from '../engine/audioManager.js';

export class CrosswordPlayer {
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
