/**
 * PuzzlePlot Main Application Controller
 * Hub management, routing between Player and Maker Studio, Theme controller, and Library catalog.
 */

import { PresetPuzzles } from './data/presets.js';
import { SoundEngine } from './engine/audioManager.js';
import { CrosswordUtils } from './engine/crosswordUtils.js';
import { CrosswordPlayer } from './player/crosswordPlayer.js';
import { CrosswordMaker } from './maker/crosswordMaker.js';

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
            <p><strong>PuzzlePlot</strong> — Crossword Puzzle Game & Maker Studio (v1.0.0)</p>
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

export { PuzzlePlotApp };
