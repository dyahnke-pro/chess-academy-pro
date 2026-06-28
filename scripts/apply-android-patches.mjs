#!/usr/bin/env node
/**
 * Apply android-patches/ over the Capacitor-generated android/ project.
 *
 * Run by `npm run setup:android` after `npx cap sync android`. Mirrors
 * the iOS `cp ios-patches/...` step, but Android needs a guarded MERGE
 * for the manifest (the generated AndroidManifest.xml owns the
 * <application>/<activity> block we must NOT clobber) plus a file copy
 * for MainActivity.
 *
 * Idempotent: re-running after a fresh `cap sync` re-applies cleanly.
 */
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = resolve(ROOT, 'android');

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function mergeManifestPermissions() {
  const manifestPath = resolve(ANDROID, 'app/src/main/AndroidManifest.xml');
  if (!(await exists(manifestPath))) {
    console.error(`✗ ${manifestPath} not found — run \`npx cap add android\` first.`);
    process.exit(1);
  }
  let manifest = await readFile(manifestPath, 'utf8');
  const perms = [
    'android.permission.INTERNET',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
  ];
  const toAdd = perms
    .filter((p) => !manifest.includes(`android:name="${p}"`))
    .map((p) => `    <uses-permission android:name="${p}" />`);

  if (toAdd.length === 0) {
    console.log('  ✓ manifest permissions already present');
    return;
  }
  // Inject right after the opening <manifest ...> tag.
  manifest = manifest.replace(/(<manifest[^>]*>\n)/, `$1${toAdd.join('\n')}\n`);
  await writeFile(manifestPath, manifest, 'utf8');
  console.log(`  ✓ added ${toAdd.length} permission(s) to AndroidManifest.xml`);
}

async function copyBuildGradle() {
  // Full-file copy (like MainActivity) — the committed patch carries the
  // complete app/build.gradle WITH our release signing config + env-driven
  // version on top of Capacitor's defaults. Safe because @capacitor/android is
  // pinned (8.1.0); if that's ever bumped, re-sync this patch from a fresh
  // `cap add android` and re-apply the signing/version edits.
  const src = resolve(ROOT, 'android-patches/app/build.gradle');
  const dest = resolve(ANDROID, 'app/build.gradle');
  if (!(await exists(src))) {
    console.log('  · no build.gradle patch (skipping)');
    return;
  }
  if (!(await exists(dest))) {
    console.error(`✗ ${dest} not found — cap add not run.`);
    process.exit(1);
  }
  await copyFile(src, dest);
  console.log('  ✓ copied app/build.gradle (release signing + env version)');
}

async function copyMainActivity() {
  const src = resolve(
    ROOT,
    'android-patches/app/src/main/java/com/chessacademy/pro/MainActivity.java',
  );
  const dest = resolve(
    ANDROID,
    'app/src/main/java/com/chessacademy/pro/MainActivity.java',
  );
  if (!(await exists(dest))) {
    console.error(`✗ ${dest} not found — wrong appId path or cap add not run.`);
    process.exit(1);
  }
  await copyFile(src, dest);
  console.log('  ✓ copied MainActivity.java (WebView mic grant)');
}

async function main() {
  if (!(await exists(ANDROID))) {
    console.error('✗ android/ does not exist. Run `npx cap add android` first.');
    process.exit(1);
  }
  console.log('Applying android-patches/:');
  await mergeManifestPermissions();
  await copyBuildGradle();
  await copyMainActivity();
  console.log('Done. Verify on a real Android device (see android-patches/README.md).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
