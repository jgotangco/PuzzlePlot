import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function generateBundleContent() {
  const readModule = (relPath) => fs.readFileSync(path.join(rootDir, relPath), 'utf8');

  function stripImportsAndExports(code) {
    return code
      // Remove all ES import statements
      .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
      // Replace export class / export const / export function with class / const / function
      .replace(/^export\s+(const|class|function|let|var)\s+/gm, '$1 ')
      // Replace export { ... }
      .replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '')
      .replace(/^export\s+default\s+/gm, '')
      .trim();
  }

  function indent(text, spaces = 2) {
    const pad = ' '.repeat(spaces);
    return text.split(/\r?\n/).map(line => {
      const trimmed = line.trimEnd();
      return trimmed.length > 0 ? pad + trimmed : '';
    }).join('\n');
  }

  const audioCode = stripImportsAndExports(readModule('js/engine/audioManager.js'));
  const utilsCode = stripImportsAndExports(readModule('js/engine/crosswordUtils.js'));
  const dictsCode = stripImportsAndExports(readModule('js/data/dictionaries.js'));
  const presetsCode = stripImportsAndExports(readModule('js/data/presets.js'));
  const playerCode = stripImportsAndExports(readModule('js/player/crosswordPlayer.js'));
  const makerCode = stripImportsAndExports(readModule('js/maker/crosswordMaker.js'));
  const appCode = stripImportsAndExports(readModule('js/app.js'));

  const banner = `/**
 * PuzzlePlot Crossword Application Bundle
 * Standalone zero-dependency script compatible with file:// protocol and all modern browsers.
 * Includes: Auto-Builder Word Placement Engine, English & Filipino focus, and Tutorials with Beginner/Intermediate/Expert tips.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. SOUND ENGINE (Web Audio API Procedural Synthesizer)
  // =========================================================================
${indent(audioCode)}

  // =========================================================================
  // 2. CROSSWORD UTILITIES, NUMBERING & AUTO-GENERATOR
  // =========================================================================
${indent(utilsCode)}

  // =========================================================================
  // 3. DICTIONARY & PATTERN SEARCH (English & Filipino)
  // =========================================================================
${indent(dictsCode)}

  // =========================================================================
  // 4. BUILT-IN PRESET PUZZLES (English & Filipino Only)
  // =========================================================================
${indent(presetsCode)}

  // =========================================================================
  // 5. CROSSWORD PLAYER ENGINE
  // =========================================================================
${indent(playerCode)}

  // =========================================================================
  // 6. CROSSWORD MAKER STUDIO ENGINE WITH AUTO-BUILDER
  // =========================================================================
${indent(makerCode)}

  // =========================================================================
  // 7. MAIN APPLICATION CONTROLLER
  // =========================================================================
${indent(appCode)}
})();
`;

  return banner.split(/\r?\n/).map(l => l.trimEnd()).join('\n').trim() + '\n';
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const bundlePath = path.join(rootDir, 'js', 'puzzleplot.bundle.js');
  const content = generateBundleContent();
  fs.writeFileSync(bundlePath, content, 'utf8');
  console.log('[BUILD SUCCESS] Generated js/puzzleplot.bundle.js deterministically from modular source files.');
}
