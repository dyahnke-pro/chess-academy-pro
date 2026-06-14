#!/usr/bin/env node
/**
 * Fail the iOS build LOUDLY if the generated app icon is the default Capacitor
 * placeholder instead of our brand art (the dark gold knight).
 *
 * Why this exists (David 2026-06-14): TestFlight 2.8 shipped the white/teal
 * Capacitor placeholder icon. `npm run assets:generate` (capacitor-assets) CAN
 * silently no-op for iOS — e.g. if it runs before `cap add ios` scaffolds the
 * platform (it logs "iOS platform not found, skipping" and exits 0), or if the
 * appiconset path drifts — leaving the scaffolded default icon in the archive.
 * A green build with the wrong icon is the failure mode; this turns it red.
 *
 * The discriminator is brightness: our brand icon sits on the #0f0f0f dark
 * backdrop (low mean luminance); the Capacitor default placeholder is a light /
 * near-white field (high mean luminance). We assert the compiled 1024² app icon
 * is dark. Run AFTER `npm run assets:generate`, with the iOS project present.
 */
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ICON = resolve(
  ROOT,
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
);
// Our brand icon's mean luminance is well under this; the Capacitor default
// placeholder (light field) is well over it. Wide margin so a legitimate art
// refresh doesn't trip unless it goes light.
const MAX_MEAN_LUMINANCE = 120; // 0–255

async function main() {
  if (!existsSync(ICON)) {
    console.error(`verify-app-icon: FAIL — app icon not found at ${ICON}`);
    console.error('  assets:generate did not produce an iOS icon (did it run AFTER `cap add ios`?).');
    process.exit(1);
  }

  const { channels } = await sharp(ICON).metadata();
  if (channels === 4) {
    // iOS rejects icons with an alpha channel outright — catch it here, not at
    // App Store upload.
    console.error('verify-app-icon: FAIL — app icon has an alpha channel; iOS requires fully opaque.');
    process.exit(1);
  }

  const stats = await sharp(ICON).stats();
  const [r, g, b] = stats.channels.map((c) => c.mean);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  console.log(
    `verify-app-icon: mean RGB ≈ (${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}), ` +
      `luminance ${luminance.toFixed(0)}`,
  );

  if (luminance > MAX_MEAN_LUMINANCE) {
    console.error(
      `verify-app-icon: FAIL — icon luminance ${luminance.toFixed(0)} > ${MAX_MEAN_LUMINANCE}. ` +
        'This looks like the light Capacitor default placeholder, not the dark brand art. ' +
        'assets:generate likely skipped iOS — check it ran AFTER `cap add ios && cap sync ios`.',
    );
    process.exit(1);
  }

  console.log('verify-app-icon: OK — dark brand app icon applied.');
}

main().catch((e) => {
  console.error('verify-app-icon: error', e);
  process.exit(1);
});
