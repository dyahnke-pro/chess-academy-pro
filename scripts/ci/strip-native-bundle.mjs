#!/usr/bin/env node
// strip-native-bundle — remove from dist/ what the iOS app never needs inside
// it, AFTER `vite build` and BEFORE `cap sync ios` or the OTA publish
// (David 2026-09-26, docs/plans/2026-09-26-app-size.md).
//
// Run by exactly the four places that turn dist/ into something a phone gets:
//   - ios/App/ci_scripts/ci_post_clone.sh   (Xcode Cloud → App Store / TestFlight)
//   - .github/workflows/ios-testflight.yml  (fastlane TestFlight path)
//   - package.json `setup:ios`              (local Xcode builds)
//   - .github/workflows/ota-publish.yml     (the OTA bundle every device downloads)
// Gate: src/test/nativeBundleStrip.test.ts. The Vercel web deploy builds
// separately and never runs this, so the web app keeps every file.
//
// WHAT GOES, AND WHY IT IS SAFE:
//   stockfish-18-lite*  — the WASM engines. iOS never loads them: the app uses
//     the native engine with stockfish-asm.js as its fallback, and the analysis
//     pool uses asm (stockfishEngine.ts resolveWorkerUrl; PostHog 90 days:
//     ios-native 99 devices, asm 7, WASM 0). 14.4 MB.
//   data/*  — the large JSON files, except KEEP_DATA. Every reader goes through
//     services/dataFile.ts, which on native downloads a missing file from the
//     web origin once and keeps it. 67 MB.
//
// It exits non-zero rather than ship a bundle missing what the app needs.
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] || 'dist';

/** Data files that stay inside the app. voiced-teachings is the only exact-
 *  position lesson source (0.54 MB compressed — David 2026-09-26: keep it);
 *  danya-review-openings is 96 KB. */
export const KEEP_DATA = ['voiced-teachings.json', 'danya-review-openings.json'];

/** Engine files iOS never loads. */
export const STRIP_ENGINE = /^stockfish-18-lite/;

/** Must survive the strip — the app cannot run without them. */
export const REQUIRED = ['index.html', 'stockfish/stockfish-asm.js', 'data-versions.json'];

function sizeOf(path) {
  const st = statSync(path);
  if (!st.isDirectory()) return st.size;
  return readdirSync(path).reduce((sum, name) => sum + sizeOf(join(path, name)), 0);
}

function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error(`[strip-native] no ${DIST}/index.html — run the build first`);
    process.exit(1);
  }
  let removed = 0;
  const gone = [];
  const drop = (path) => {
    removed += sizeOf(path);
    gone.push(path);
    rmSync(path, { recursive: true, force: true });
  };

  const engineDir = join(DIST, 'stockfish');
  if (existsSync(engineDir)) {
    for (const name of readdirSync(engineDir)) if (STRIP_ENGINE.test(name)) drop(join(engineDir, name));
  }
  const dataDir = join(DIST, 'data');
  if (existsSync(dataDir)) {
    for (const name of readdirSync(dataDir)) if (!KEEP_DATA.includes(name)) drop(join(dataDir, name));
  }

  const missing = REQUIRED.filter((rel) => !existsSync(join(DIST, rel)));
  if (missing.length > 0) {
    console.error(`[strip-native] REFUSING: ${missing.join(', ')} missing from ${DIST}/ after the strip`);
    process.exit(1);
  }
  console.log(`[strip-native] removed ${gone.length} paths, ${(removed / 1048576).toFixed(1)} MB from ${DIST}/`);
  for (const p of gone) console.log(`   - ${p}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
