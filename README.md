# PuzzlePlot 🧩
> **Crossword Puzzle Game & Maker Studio (v1.1.0)**
> *Handcrafted for English and Filipino (Tagalog) crossword enthusiasts and constructors.*

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/jgotangco/PuzzlePlot)
[![Languages](https://img.shields.io/badge/languages-English%20%7C%20Filipino-amber.svg)](https://github.com/jgotangco/PuzzlePlot)
[![Grid Sizes](https://img.shields.io/badge/grids-5%C3%975%20%7C%2013%C3%9713%20%7C%2021%C3%9721-emerald.svg)](https://github.com/jgotangco/PuzzlePlot)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-purple.svg)](https://github.com/jgotangco/PuzzlePlot)

---

## 📖 Overview

**PuzzlePlot** is a modern, standalone web application that combines an interactive **Crossword Puzzle Player** and a full-featured **Crossword Maker Studio**. 

Built with zero external runtime dependencies, PuzzlePlot works instantly across modern web browsers and local filesystem environments (`file://`), offering procedural Web Audio sound synthesis, 180° rotational symmetry calculations, an automated word-placement engine, and print-ready paper puzzle sheet generation.

---

## ✨ Features & Highlights

### 🎮 1. Crossword Player Mode
- **Multilingual Built-In Library**: Play verified crosswords in **English** and **Filipino** (Tagalog).
- **Verified Production Presets**:
  - **5×5 Mini (English)**: *Daily Mini: Hearth & Trend* — A swift 5×5 word square with verified dictionary entries.
  - **5×5 Mini (Filipino)**: *Munting Palaisipan* — A classic 5×5 word square featuring authentic Filipino vocabulary.
  - *(Note: The built-in production library currently contains two verified 5×5 puzzles. 13×13 and 21×21 remain supported Maker Studio creation sizes, while the four larger draft presets remain quarantined in `js/data/draft-presets.js` and are excluded from production until authentic clue dictionaries are curated.)*
- **Fluid Keyboard & Touch Controls**:
  - <kbd>Arrow Keys</kbd> for smooth cursor movement.
  - <kbd>Spacebar</kbd> / Cell Tap to flip between **Across** and **Down**.
  - <kbd>Tab</kbd> / <kbd>Enter</kbd> to jump between clues.
  - On-screen virtual keyboard with `Ñ` for mobile devices.
- **Smart Assists & Progress Protection**:
  - *Check*: Letter, Word, or Entire Puzzle.
  - *Reveal*: Letter, Word, or Full Solution.
  - *Reset*: Clear Errors or Reset Grid with explicit confirmation safeguards protecting saved progress.
- **Stopwatch & Pause System**: Real-time timer with a blurred pause shield and victory celebration statistics.

### 🏗️ 2. Crossword Maker Studio
- **Auto-Builder Word Placer**: Input a custom list of words (e.g. `BAYANI: Pambansang bayani`) and let PuzzlePlot automatically compute valid intersections, position words across/down, and lock in symmetrical black blocks.
- **180° Rotational Symmetry**: Real-time symmetry placement standard in professional crossword publications (plus 90°, mirror, and freeform options).
- **Live Auto-Numbering**: Across and Down numbers and word lengths recalculate in real time as blocks and letters change.
- **Grid Integrity Validator**: Real-time metrics for block percentage density, word counts, and flood-fill connectivity to prevent isolated letter islands.
- **Word Assistant & Pattern Search**: Wildcard pattern lookups (e.g. `B??A??` &rarr; `BAYANI`, `BUNGA` or `S??AR` &rarr; `SOLAR`, `SUGAR`) with one-click insertion.
- **Save, Export & Print**:
  - Offline local browser storage with resilient schema validation.
  - Standard JSON puzzle file export & import (`.json`) with strict pre-flight integrity verification.
  - Print-ready publication sheets formatted for A4 / Letter paper with blank numbered grids and clues.

### 🎓 3. Construction Mastery Guides
- **How to Play Guide**: Full navigation reference and tactical solving advice.
- **How to Create Guide**: Step-by-step constructor workflow from concept to publication.
- **Creator Tips**:
  - **Level 1 (Beginner)**: 5×5 Minis, keeping block density <20%, and direct definition clues.
  - **Level 2 (Intermediate)**: 13×13 themed construction, symmetrical theme entry lengths, and varied clue styles.
  - **Level 3 (Expert)**: 21×21 Sunday Jumbos, wide corner stacks, deceptive puns (`?`), and cultural Philippine history/literature references (Jose Rizal, Andres Bonifacio, Francisco Balagtas).

### 🎨 4. Editorial Design System
- **Themes**: Classic Editorial Paper (`paper`), Clean Modern Light (`light`), and Sleek Dark Slate (`dark`).
- **Web Audio Synthesizer**: Built-in procedural clicks, chimes, and victory fanfares without external audio file requests.
- **Responsive Viewport**: Fluid zoom and mobile accessibility supporting desktop, tablet, and smartphone screens.

---

## 🚀 Getting Started

### Option 1: Open Directly in Browser
Simply double-click [`index.html`](index.html) in your file explorer. It will open and run in Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari without requiring a local web server.

### Option 2: Run with a Local Web Server
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx serve .
```
Then navigate to `http://localhost:8000` in your web browser.

---

## 🧪 Development, Testing & Verification Commands

PuzzlePlot provides a deterministic, zero-dependency validation pipeline:

```bash
# Build single-file production bundle from modular sources
npm run build

# Verify bundle synchronization against modular source files
npm run check:bundle

# Verify repository-wide version consistency against package.json
npm run check:version

# Run deterministic test suite (architecture, integrity, preset sync)
npm run test:deterministic

# Run production preset data integrity validation
npm run test:presets

# Run headless Chrome CDP browser smoke tests
npm run test:browser

# Run full end-to-end test pipeline
npm test
```

---

## 🔄 Release Process & Versioning Checklist

When preparing a new release:

1. **Update Authoritative Version**: Set `"version": "x.y.z"` in `package.json`.
2. **Synchronize Display Surfaces**: Update `index.html` (title, About modal tag), `README.md` (header, badge), and `js/app.js` (footer).
3. **Run Version Check**: Execute `npm run check:version` to ensure 100% surface agreement.
4. **Build Bundle**: Execute `npm run build` and confirm with `npm run check:bundle`.
5. **Run Full Test Pipeline**: Execute `npm test` (deterministic + presets + real-browser CDP tests).
6. **Commit Changes**: Create a manual Git commit (e.g. `git commit -m "chore(release): v1.1.0"`).
7. **Push to Remote**: Push to `main` and verify GitHub Actions CI passes across matrix environments.
8. **Tag Release**: Create and push an annotated Git tag manually (e.g. `git tag -a v1.1.0 -m "release: v1.1.0" && git push origin v1.1.0`).

---

## 📦 v1.1.0 Release Summary

Version `1.1.0` introduces significant stability, security, and quality-of-life enhancements:

- **Preset Integrity & Quarantine Protection**: Two verified 5×5 production presets with 100% authentic clues and solutions; unverified larger presets quarantined in `js/data/draft-presets.js`.
- **Strict Structural Maker Validation**: Pre-flight validation gates blocking invalid/empty saves, exports, and prints.
- **Secure File/FileReader Import Round Trip**: Hardened JSON import parser with 1MB bounds and corrupted storage recovery.
- **Clear-Progress Confirmation Safeguards**: Explicit user confirmation before clearing grid progress, preserving intentional "Play Again" flows.
- **Restored Viewport Zoom**: Responsive zoom and mobile usability restored across devices.
- **Automated Version Consistency & CI**: Multi-platform GitHub Actions matrix testing with zero-dependency build and version checking.

---

## 📁 Repository Structure

```
PuzzlePlot/
├── index.html                  # Main application entry point & modals
├── README.md                   # Project overview, guides & specifications
├── LICENSE                     # MIT License
├── css/
│   └── style.css               # Editorial CSS design system & print styles
├── js/
│   ├── puzzleplot.bundle.js    # Self-contained zero-dependency application bundle
│   ├── app.js                  # Modular app controller
│   ├── engine/
│   │   ├── crosswordUtils.js   # Grid algorithms, auto-numbering, auto-builder
│   │   └── audioManager.js     # Web Audio API sound synthesizer
│   ├── data/
│   │   ├── presets.js          # Built-in verified production presets (5x5)
│   │   ├── draft-presets.js    # Quarantined draft presets undergoing review (13x13, 21x21)
│   │   └── dictionaries.js     # Multi-language lexicon & pattern search
│   ├── player/
│   │   └── crosswordPlayer.js  # Interactive crossword player
│   └── maker/
│       └── crosswordMaker.js   # Crossword Maker Studio
└── scripts/
    ├── build-bundle.js         # Deterministic bundle compiler
    ├── check-bundle-consistency.js # Source/bundle sync validator
    ├── check-version.js        # Version consistency validator
    ├── test-p1-integrity.js    # Deterministic architecture & safety tests
    ├── validate-presets.js     # Production preset integrity suite
    └── browser-smoke-test.mjs  # Real-browser Chrome CDP smoke tests
```

---

## 📜 Attributions & Credits

Designed and product-directed by [Jerome Gotangco](https://github.com/jgotangco). Developed with [Google Antigravity](https://antigravity.google/) / Gemini.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
