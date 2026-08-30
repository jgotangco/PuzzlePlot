import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PresetPuzzles } from '../js/data/presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const bundlePath = path.join(rootDir, 'js', 'puzzleplot.bundle.js');

if (!fs.existsSync(bundlePath)) {
  console.error(`Error: Bundle file not found at ${bundlePath}`);
  process.exit(1);
}

let bundleContent = fs.readFileSync(bundlePath, 'utf8');

// Use regex that handles both CRLF (\r\n) and LF (\n)
const sectionPattern = /(\s*\/\/\s*={10,}\r?\n\s*\/\/\s*4\.\s*BUILT-IN PRESET PUZZLES[^\r\n]*\r?\n\s*\/\/\s*={10,}\r?\n\s*const PresetPuzzles = )([\s\S]*?)(;\r?\n\s*\/\/\s*={10,}\r?\n\s*\/\/\s*5\.\s*CROSSWORD PLAYER ENGINE)/;

const match = bundleContent.match(sectionPattern);
if (!match) {
  console.error('Error: Could not locate Section 4 (PresetPuzzles) in bundle with boundary markers.');
  process.exit(1);
}

// Format PresetPuzzles with standard 2-space indentation inside IIFE scope
const formattedPresets = JSON.stringify(PresetPuzzles, null, 2)
  .split('\n')
  .map((line, index) => (index === 0 ? line : '  ' + line))
  .join('\n');

const updatedBundle = bundleContent.replace(sectionPattern, `$1${formattedPresets}$3`);

fs.writeFileSync(bundlePath, updatedBundle, 'utf8');
console.log(`[SYNC SUCCESS] Synchronized ${PresetPuzzles.length} presets from js/data/presets.js into js/puzzleplot.bundle.js`);
