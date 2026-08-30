/**
 * Crossword Maker Studio Module
 * Full authoring canvas with auto-builder word placement, symmetry, clues table, dictionary assistant, and printing.
 */

import { CrosswordUtils } from '../engine/crosswordUtils.js';
import { SoundEngine } from '../engine/audioManager.js';
import { DictionarySearch } from '../data/dictionaries.js';

export class CrosswordMaker {
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
