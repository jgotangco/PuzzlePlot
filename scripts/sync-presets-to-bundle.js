import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBundleContent } from './build-bundle.js';
import { PresetPuzzles } from '../js/data/presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const bundlePath = path.join(rootDir, 'js', 'puzzleplot.bundle.js');
const bundleContent = generateBundleContent();

fs.writeFileSync(bundlePath, bundleContent, 'utf8');
console.log(`[SYNC SUCCESS] Synchronized full bundle and ${PresetPuzzles.length} presets from js/data/presets.js into js/puzzleplot.bundle.js`);
