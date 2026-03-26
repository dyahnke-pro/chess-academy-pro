import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Bundle size performance tests — runs a production build and checks output
// ---------------------------------------------------------------------------

const ROOT = join(__dirname, '..', '..', '..');
const DIST_ASSETS = join(ROOT, 'dist', 'assets');

// Thresholds — annotation JSON files are lazy-loaded as separate chunks,
// so we separate the "app code + vendor" from "annotation data" chunks.
const MAX_APP_JS_SIZE = 7_500_000;          // 7.5 MB for app index + vendors (includes inlined ECO/repertoire JSON)
const MAX_VENDOR_CHUNK_SIZE = 600_000;      // 600 KB per vendor chunk
const MAX_ANNOTATION_CHUNK_SIZE = 150_000;  // 150 KB per lazy annotation chunk
const MAX_CSS_SIZE = 100_000;               // 100 KB CSS
const EXPECTED_VENDOR_CHUNKS = ['react-vendor', 'chess-vendor', 'ui-vendor', 'data-vendor'];

// Build once before all tests
let buildRan = false;

function ensureBuild(): void {
  if (buildRan) return;
  try {
    execSync('npx vite build 2>&1', {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 120_000,
    });
    buildRan = true;
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    const output = (err.stdout ?? '') + (err.stderr ?? '');
    throw new Error(`Build failed:\n${output}`);
  }
}

function getAssetFiles(): { name: string; size: number; path: string }[] {
  try {
    return readdirSync(DIST_ASSETS).map((name) => {
      const path = join(DIST_ASSETS, name);
      const size = statSync(path).size;
      return { name, size, path };
    });
  } catch {
    return [];
  }
}

function isAnnotationChunk(name: string): boolean {
  // Annotation chunks are named after openings (e.g. "italian-game-CRMlRswp.js")
  // They are NOT vendor chunks and NOT the index chunk
  const isVendor = EXPECTED_VENDOR_CHUNKS.some((v) => name.includes(v));
  const isIndex = name.startsWith('index-');
  return name.endsWith('.js') && !isVendor && !isIndex;
}

describe('Bundle Size', () => {
  it('production build completes without errors', () => {
    ensureBuild();
    expect(buildRan).toBe(true);
  }, 120_000);

  it('app JS (index + vendors) is under 7.5 MB', () => {
    ensureBuild();
    const files = getAssetFiles();
    const appFiles = files.filter((f) =>
      f.name.endsWith('.js') && !isAnnotationChunk(f.name),
    );
    const totalSize = appFiles.reduce((sum, f) => sum + f.size, 0);

    console.log(`  App JS: ${(totalSize / 1024).toFixed(0)} KB across ${appFiles.length} chunks`);
    for (const f of appFiles.sort((a, b) => b.size - a.size)) {
      console.log(`    ${f.name}: ${(f.size / 1024).toFixed(1)} KB`);
    }

    expect(totalSize).toBeLessThan(MAX_APP_JS_SIZE);
  });

  it('no vendor chunk exceeds 600 KB', () => {
    ensureBuild();
    const files = getAssetFiles();
    const vendorFiles = files.filter((f) =>
      EXPECTED_VENDOR_CHUNKS.some((v) => f.name.includes(v)),
    );

    for (const f of vendorFiles) {
      expect(
        f.size,
        `Vendor chunk ${f.name} is ${(f.size / 1024).toFixed(1)} KB — exceeds 600 KB limit`,
      ).toBeLessThan(MAX_VENDOR_CHUNK_SIZE);
    }
  });

  it('no annotation chunk exceeds 150 KB', () => {
    ensureBuild();
    const files = getAssetFiles();
    const annoFiles = files.filter((f) => isAnnotationChunk(f.name));

    expect(annoFiles.length).toBeGreaterThan(0);
    console.log(`  ${annoFiles.length} lazy annotation chunks`);

    for (const f of annoFiles) {
      expect(
        f.size,
        `Annotation chunk ${f.name} is ${(f.size / 1024).toFixed(1)} KB — exceeds 150 KB limit`,
      ).toBeLessThan(MAX_ANNOTATION_CHUNK_SIZE);
    }
  });

  it('CSS bundle is under 100 KB', () => {
    ensureBuild();
    const files = getAssetFiles();
    const cssFiles = files.filter((f) => f.name.endsWith('.css'));
    const totalSize = cssFiles.reduce((sum, f) => sum + f.size, 0);

    console.log(`  Total CSS: ${(totalSize / 1024).toFixed(0)} KB`);
    expect(totalSize).toBeLessThan(MAX_CSS_SIZE);
  });

  it('vendor chunk splitting is configured correctly', () => {
    ensureBuild();
    const files = getAssetFiles();
    const jsNames = files.filter((f) => f.name.endsWith('.js')).map((f) => f.name);

    for (const chunk of EXPECTED_VENDOR_CHUNKS) {
      const found = jsNames.some((name) => name.includes(chunk));
      expect(found, `Expected vendor chunk "${chunk}" not found in build output`).toBe(true);
    }
  });

  it('annotation JSON files are code-split (not bundled in index)', () => {
    ensureBuild();
    const files = getAssetFiles();
    const annoFiles = files.filter((f) => isAnnotationChunk(f.name));
    const indexFile = files.find((f) => f.name.startsWith('index-') && f.name.endsWith('.js'));

    // There should be many separate annotation chunks (one per opening)
    expect(annoFiles.length).toBeGreaterThan(30);

    // The index chunk should be large but not absurdly so (it includes
    // openings-lichess.json and repertoire.json which are statically imported)
    if (indexFile) {
      console.log(`  Index chunk: ${(indexFile.size / 1024).toFixed(0)} KB`);
    }
  });

  it('build produces JS and CSS files', () => {
    ensureBuild();
    const files = getAssetFiles();

    expect(files.some((f) => f.name.endsWith('.js'))).toBe(true);
    expect(files.some((f) => f.name.endsWith('.css'))).toBe(true);
  });
});
