/**
 * THE iOS APP SHIPS WITHOUT THE WASM ENGINES AND THE LARGE DATA FILES
 * (David 2026-09-26, docs/plans/2026-09-26-app-size.md).
 *
 * `scripts/ci/strip-native-bundle.mjs` removes them from dist/ before the
 * native project is synced and before the OTA bundle is published. That is
 * only safe while two things stay true, and this gate holds both:
 *
 *   1. EVERY path that turns dist/ into a phone build runs the strip — or the
 *      App Store build and the OTA bundle disagree about what a phone carries.
 *   2. EVERY reader of `public/data` goes through `services/dataFile.ts`, which
 *      downloads a stripped file from the web origin on native. A new raw
 *      `fetch('/data/...')` would 404 inside the app and go silently quiet.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(__dirname, '../..');
const SCRIPT = join(ROOT, 'scripts/ci/strip-native-bundle.mjs');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

describe('every phone build runs the strip', () => {
  it('Xcode Cloud strips after the build and before `cap add`', () => {
    const sh = read('ios/App/ci_scripts/ci_post_clone.sh');
    const strip = sh.indexOf('strip-native-bundle.mjs');
    expect(strip).toBeGreaterThan(sh.indexOf('npm run build'));
    expect(strip).toBeLessThan(sh.indexOf('npx cap add ios'));
  });

  it('the fastlane TestFlight workflow strips before `cap sync`', () => {
    const yml = read('.github/workflows/ios-testflight.yml');
    const strip = yml.indexOf('strip-native-bundle.mjs');
    expect(strip).toBeGreaterThan(yml.indexOf('npm run build'));
    expect(strip).toBeLessThan(yml.indexOf('npx cap sync ios'));
  });

  it('local `setup:ios` strips before `cap add`', () => {
    const cmd = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts['setup:ios'];
    expect(cmd.indexOf('strip-native-bundle.mjs')).toBeGreaterThanOrEqual(0);
    expect(cmd.indexOf('strip-native-bundle.mjs')).toBeLessThan(cmd.indexOf('cap add ios'));
  });

  it('the OTA publish strips before publishing', () => {
    const yml = read('.github/workflows/ota-publish.yml');
    const strip = yml.indexOf('node scripts/ci/strip-native-bundle.mjs');
    expect(strip).toBeGreaterThan(0);
    expect(strip).toBeLessThan(yml.indexOf('node scripts/ci/publish-ota-bundle.mjs'));
  });

  it('no OTHER workflow syncs an iOS project or publishes an OTA without it', () => {
    const dir = join(ROOT, '.github/workflows');
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.yml'))
      .filter((f) => {
        const y = readFileSync(join(dir, f), 'utf8');
        return (/cap sync ios|publish-ota-bundle/.test(y)) && !y.includes('strip-native-bundle.mjs');
      });
    expect(offenders).toEqual([]);
  });
});

function srcFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== 'test') srcFiles(full, out); continue; }
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('every public/data reader goes through dataFile', () => {
  const files = srcFiles(join(ROOT, 'src'));

  it('finds the readers (non-vacuous)', () => {
    const readers = files.filter((f) => /['`]\/data\//.test(stripComments(readFileSync(f, 'utf8'))));
    expect(readers.length).toBeGreaterThanOrEqual(5);
  });

  it('a file naming a /data/ path never calls fetch itself — it uses loadDataJson', () => {
    const offenders = files
      .filter((f) => !f.endsWith('services/dataFile.ts'))
      .filter((f) => {
        const code = stripComments(readFileSync(f, 'utf8'));
        return /['`]\/data\//.test(code) && (/\bfetch\(/.test(code) || !/loadDataJson/.test(code));
      })
      .map((f) => f.slice(ROOT.length + 1));
    expect(offenders).toEqual([]);
  });

  it('the registry-driven corpus loader uses loadDataJson', () => {
    const code = stripComments(read('src/services/farmedCorpusData.ts'));
    expect(code).toMatch(/loadDataJson\(/);
    expect(code).not.toMatch(/\bfetch\(/);
  });
});

describe('strip-native-bundle.mjs', () => {
  let dist: string;
  const touch = (rel: string, body = 'x'): void => {
    mkdirSync(join(dist, rel, '..'), { recursive: true });
    writeFileSync(join(dist, rel), body);
  };
  beforeEach(() => {
    dist = mkdtempSync(join(tmpdir(), 'strip-'));
    touch('index.html', '<html></html>');
    touch('data-versions.json', '{}');
    touch('stockfish/stockfish-asm.js');
    touch('stockfish/stockfish-18-lite.js');
    touch('stockfish/stockfish-18-lite.wasm');
    touch('stockfish/stockfish-18-lite-single.js');
    touch('stockfish/stockfish-18-lite-single.wasm');
    touch('data/openings-masters-db.json', '{}');
    touch('data/corpus-spoken.json', '{}');
    touch('data/voiced-teachings.json', '{}');
    touch('data/danya-review-openings.json', '{}');
  });
  afterEach(() => { rmSync(dist, { recursive: true, force: true }); });

  it('removes the WASM engines and the large data, keeps asm and the kept files', () => {
    execFileSync('node', [SCRIPT, dist]);
    expect(existsSync(join(dist, 'stockfish/stockfish-asm.js'))).toBe(true);
    expect(existsSync(join(dist, 'stockfish/stockfish-18-lite.wasm'))).toBe(false);
    expect(existsSync(join(dist, 'stockfish/stockfish-18-lite-single.js'))).toBe(false);
    expect(existsSync(join(dist, 'data/openings-masters-db.json'))).toBe(false);
    expect(existsSync(join(dist, 'data/corpus-spoken.json'))).toBe(false);
    expect(existsSync(join(dist, 'data/voiced-teachings.json'))).toBe(true);
    expect(existsSync(join(dist, 'data/danya-review-openings.json'))).toBe(true);
    expect(existsSync(join(dist, 'data-versions.json'))).toBe(true);
  });

  it('refuses when the asm engine would be missing', () => {
    rmSync(join(dist, 'stockfish/stockfish-asm.js'));
    expect(() => execFileSync('node', [SCRIPT, dist], { stdio: 'pipe' })).toThrow();
  });

  it('refuses when data-versions.json is missing (the app could not tell a kept copy is stale)', () => {
    rmSync(join(dist, 'data-versions.json'));
    expect(() => execFileSync('node', [SCRIPT, dist], { stdio: 'pipe' })).toThrow();
  });
});
