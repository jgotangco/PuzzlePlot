import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBundleContent } from './build-bundle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const bundlePath = path.join(rootDir, 'js', 'puzzleplot.bundle.js');

if (!fs.existsSync(bundlePath)) {
  console.error(`[FAIL] Bundle file does not exist at ${bundlePath}`);
  process.exit(1);
}

const onDiskBundle = fs.readFileSync(bundlePath, 'utf8').replace(/\r\n/g, '\n');
const generatedBundle = generateBundleContent().replace(/\r\n/g, '\n');

if (onDiskBundle === generatedBundle) {
  console.log('[PASS] Bundle consistency check passed: js/puzzleplot.bundle.js exactly matches modular source files.');
  process.exit(0);
} else {
  console.error('[FAIL] Bundle consistency check failed: js/puzzleplot.bundle.js diverges from modular source files!');
  console.error('Run "npm run build" to synchronize the bundle with modular source.');
  process.exit(1);
}
