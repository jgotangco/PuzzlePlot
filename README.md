# PuzzlePlot 🧩
> **Crossword Puzzle Game & Maker Studio (v1.0.0)**  
> *Handcrafted for English and Filipino (Tagalog) crossword enthusiasts and constructors.*

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/jgotangco/PuzzlePlot)
[![Languages](https://img.shields.io/badge/languages-English%20%7C%20Filipino-amber.svg)](https://github.com/jgotangco/PuzzlePlot)
[![Grid Sizes](https://img.shields.io/badge/grids-5%C3%975%20%7C%2013%C3%9713%20%7C%2021%C3%9721-emerald.svg)](https://github.com/jgotangco/PuzzlePlot)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-purple.svg)](https://github.com/jgotangco/PuzzlePlot)

---

## 📖 Overview

**PuzzlePlot** is a modern, standalone web application that seamlessly blends a publication-grade **Crossword Puzzle Player** and an interactive **Crossword Maker Studio**. 

Built with zero external runtime dependencies, PuzzlePlot works instantly across modern web browsers and local filesystem environments (`file://`), offering procedural Web Audio sound synthesis, 180° rotational symmetry calculations, an automated word-placement engine, and print-ready paper puzzle sheet generation.

---

## ✨ Features & Highlights

### 🎮 1. Crossword Player Mode
- **Multilingual Puzzles**: Play handcrafted crosswords in **English** and **Filipino** (Tagalog).
- **Multiple Grid Formats**:
  - **5×5 Mini**: Fast daily word squares.
  - **13×13 Midi**: Themed standard weekly crosswords (*Crossroad Chronicles*, *Kulturang Pinoy*).
  - **21×21 Sunday Jumbo**: Epic sprawling crosswords (*Sunday Galaxy Jumbo*, *Kasaysayan at Bayani*).
- **Fluid Keyboard & Touch Controls**:
  - <kbd>Arrow Keys</kbd> for smooth cursor movement.
  - <kbd>Spacebar</kbd> / Cell Tap to flip between **Across** and **Down**.
  - <kbd>Tab</kbd> / <kbd>Enter</kbd> to jump between clues.
  - On-screen virtual keyboard with `Ñ` for mobile devices.
- **Smart Assists**:
  - *Check*: Letter, Word, or Entire Puzzle.
  - *Reveal*: Letter, Word, or Full Solution.
  - *Reset*: Clear Errors or Reset Grid.
- **Stopwatch & Pause System**: Real-time timer with a blurred pause shield and victory celebration statistics.

### 🏗️ 2. Crossword Maker Studio
- **Auto-Builder Word Placer**: Input a custom list of words (e.g. `BAYANI: Pambansang bayani`) and let PuzzlePlot automatically compute valid intersections, position words across/down, and lock in symmetrical black blocks.
- **180° Rotational Symmetry**: Real-time symmetry placement standard in professional crossword publications (plus 90°, mirror, and freeform options).
- **Live Auto-Numbering**: Across and Down numbers and word lengths recalculate in real time as blocks and letters change.
- **Grid Integrity Validator**: Real-time metrics for block percentage density, word counts, and flood-fill connectivity to prevent isolated letter islands.
- **Word Assistant & Pattern Search**: Wildcard pattern lookups (e.g. `B??A??` &rarr; `BAYANI`, `BUNGA` or `S??AR` &rarr; `SOLAR`, `SUGAR`) with one-click insertion.
- **Save, Export & Print**:
  - Offline local browser storage.
  - Standard JSON puzzle file export & import (`.json`).
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

## 📁 Repository Structure

```
PuzzlePlot/
├── index.html                  # Main application entry point & modals
├── README.md                   # Project overview, guides & disclaimers
├── LICENSE                     # MIT License
├── css/
│   └── style.css               # Editorial CSS design system & print styles
└── js/
    ├── puzzleplot.bundle.js    # Self-contained zero-dependency application bundle
    ├── app.js                  # Modular app controller
    ├── engine/
    │   ├── crosswordUtils.js   # Grid algorithms, auto-numbering, auto-builder
    │   └── audioManager.js     # Web Audio API sound synthesizer
    ├── data/
    │   ├── presets.js          # Built-in English & Filipino puzzle presets
    │   └── dictionaries.js     # Multi-language lexicon & pattern search
    ├── player/
    │   └── crosswordPlayer.js  # Interactive crossword player
    └── maker/
        └── crosswordMaker.js   # Crossword Maker Studio
```

---

## 📜 Attributions, Credits & Disclaimers

### Attributions & Credits
Designed and product-directed by **[Jerome Gotangco](https://github.com/jgotangco)** ([jeromesg@google.com](mailto:jeromesg@google.com) | GitHub: [https://github.com/jgotangco](https://github.com/jgotangco)). Developed with [Google Antigravity](https://antigravity.google/) / [Gemini](https://gemini.google.com/).

### Disclaimers
1. **Affiliation Disclaimer**: This application is a personal work of the author and is **not associated with, endorsed by, or affiliated with [Google](https://about.google/), his past, present, and future employers, or any other party**.
2. **Use & Warranty Disclaimer**: This application is for **demonstration and personal use only**. **No warranties or guarantees of any kind, express or implied, are provided regarding financial accuracy, continuous availability, or fitness for any purpose.**

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
