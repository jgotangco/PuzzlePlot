import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Pure checker functions for version surfaces
 */
export function validateSemver(version) {
  if (!version || typeof version !== 'string') return false;
  return SEMVER_REGEX.test(version.trim());
}

export function checkReadmeContent(content, expectedVersion) {
  const errors = [];
  const expectedTag = `v${expectedVersion}`;
  
  // 1. Check title/subtitle version string e.g. (v1.1.0)
  const subtitleRegex = new RegExp(`\\(v${expectedVersion.replace(/\./g, '\\.')}\\)`);
  if (!subtitleRegex.test(content)) {
    errors.push(`README.md subtitle does not contain expected version "(v${expectedVersion})"`);
  }

  // 2. Check version badge e.g. badge/version-1.1.0-blue.svg
  const badgeRegex = new RegExp(`badge\\/version-${expectedVersion.replace(/\./g, '\\.')}-blue\\.svg`);
  if (!badgeRegex.test(content)) {
    errors.push(`README.md badge does not contain expected badge "badge/version-${expectedVersion}-blue.svg"`);
  }

  return errors;
}

export function checkIndexHtmlContent(content, expectedVersion) {
  const errors = [];

  // 1. Check document title
  const titleRegex = new RegExp(`<title>PuzzlePlot - Crossword Puzzle Game & Maker \\(v${expectedVersion.replace(/\./g, '\\.')}\\)<\\/title>`);
  if (!titleRegex.test(content)) {
    errors.push(`index.html <title> does not match expected "PuzzlePlot - Crossword Puzzle Game & Maker (v${expectedVersion})"`);
  }

  // 2. Check About modal version tag
  const tagRegex = new RegExp(`<span class="about-version-tag">Version ${expectedVersion.replace(/\./g, '\\.')}<\\/span>`);
  if (!tagRegex.test(content)) {
    errors.push(`index.html about-version-tag does not match "Version ${expectedVersion}"`);
  }

  return errors;
}

export function checkAppJsContent(content, expectedVersion) {
  const errors = [];

  // Check footer version string in template
  const footerRegex = new RegExp(`<strong>PuzzlePlot<\\/strong> — Crossword Puzzle Game & Maker Studio \\(v${expectedVersion.replace(/\./g, '\\.')}\\)`);
  if (!footerRegex.test(content)) {
    errors.push(`js/app.js footer does not contain expected version "(v${expectedVersion})"`);
  }

  return errors;
}

export function checkBundleJsContent(content, expectedVersion) {
  const errors = [];

  const footerRegex = new RegExp(`<strong>PuzzlePlot<\\/strong> — Crossword Puzzle Game & Maker Studio \\(v${expectedVersion.replace(/\./g, '\\.')}\\)`);
  if (!footerRegex.test(content)) {
    errors.push(`js/puzzleplot.bundle.js footer does not contain expected version "(v${expectedVersion})"`);
  }

  return errors;
}

export function checkNoStaleVersionReferences(filesMap, expectedVersion, staleVersions = ['1.0.0']) {
  const errors = [];

  for (const [filename, content] of Object.entries(filesMap)) {
    for (const stale of staleVersions) {
      if (stale === expectedVersion) continue;

      // Check for stale badge or version tag patterns
      const staleBadge = `version-${stale}-`;
      const staleDisplay = `(v${stale})`;
      const staleTag = `Version ${stale}`;

      if (content.includes(staleBadge)) {
        errors.push(`${filename} contains stale version badge reference: "${staleBadge}"`);
      }
      if (content.includes(staleDisplay)) {
        errors.push(`${filename} contains stale display reference: "${staleDisplay}"`);
      }
      if (content.includes(staleTag)) {
        errors.push(`${filename} contains stale tag reference: "${staleTag}"`);
      }
    }
  }

  return errors;
}

/**
 * Main validation execution against workspace files
 */
export function runVersionConsistencyCheck(baseDir = rootDir) {
  console.log('============================================================');
  console.log('PUZZLEPLOT VERSION CONSISTENCY & SURFACE VALIDATION');
  console.log('============================================================\n');

  const pkgPath = path.join(baseDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(`[ERROR] package.json not found at: ${pkgPath}`);
    return false;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;
  console.log(`Authoritative Version (package.json): ${version}`);

  if (!validateSemver(version)) {
    console.error(`[FAIL] Authoritative version "${version}" is not a valid Semantic Version.`);
    return false;
  }
  console.log('[PASS] Valid Semantic Version format in package.json.');

  const files = {
    'README.md': fs.readFileSync(path.join(baseDir, 'README.md'), 'utf8'),
    'index.html': fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8'),
    'js/app.js': fs.readFileSync(path.join(baseDir, 'js/app.js'), 'utf8'),
    'js/puzzleplot.bundle.js': fs.readFileSync(path.join(baseDir, 'js/puzzleplot.bundle.js'), 'utf8')
  };

  const allErrors = [];

  // 1. README checks
  const readmeErrors = checkReadmeContent(files['README.md'], version);
  if (readmeErrors.length === 0) {
    console.log('[PASS] README.md version badge and header text match package.json.');
  } else {
    allErrors.push(...readmeErrors);
  }

  // 2. index.html checks
  const htmlErrors = checkIndexHtmlContent(files['index.html'], version);
  if (htmlErrors.length === 0) {
    console.log('[PASS] index.html document title and About modal version tag match package.json.');
  } else {
    allErrors.push(...htmlErrors);
  }

  // 3. js/app.js checks
  const appErrors = checkAppJsContent(files['js/app.js'], version);
  if (appErrors.length === 0) {
    console.log('[PASS] js/app.js footer version matches package.json.');
  } else {
    allErrors.push(...appErrors);
  }

  // 4. js/puzzleplot.bundle.js checks
  const bundleErrors = checkBundleJsContent(files['js/puzzleplot.bundle.js'], version);
  if (bundleErrors.length === 0) {
    console.log('[PASS] js/puzzleplot.bundle.js footer version matches package.json.');
  } else {
    allErrors.push(...bundleErrors);
  }

  // 5. Stale version scan
  const staleErrors = checkNoStaleVersionReferences(files, version, ['1.0.0']);
  if (staleErrors.length === 0) {
    console.log('[PASS] No stale v1.0.0 version references found in production or documentation surfaces.');
  } else {
    allErrors.push(...staleErrors);
  }

  console.log('\n------------------------------------------------------------');
  if (allErrors.length > 0) {
    console.error(`[FAIL] Version consistency check failed with ${allErrors.length} error(s):`);
    allErrors.forEach(err => console.error(`  - ${err}`));
    console.log('------------------------------------------------------------\n');
    return false;
  } else {
    console.log('Summary: All Version Surfaces 100% Consistent and Synchronized!');
    console.log('------------------------------------------------------------\n');
    return true;
  }
}

// Auto-run if executed directly as entrypoint
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const success = runVersionConsistencyCheck();
  process.exit(success ? 0 : 1);
}
