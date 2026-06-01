#!/usr/bin/env node
/**
 * Build the app icon + splash source art for Capacitor + PWA.
 *
 * Single source of truth for the brand mark: the gold knight (♞,
 * #c9a84c) on the near-black brand background (#0f0f0f) with a soft
 * radial glow behind the horse (David 2026-06-01: "I like the app
 * icon we use now maybe add the light glow behind the horse").
 *
 * Outputs:
 *   assets/icon.png              1024² full-bleed   — Capacitor iOS/Android source
 *   assets/icon-foreground.png   1024² transparent  — Android adaptive foreground
 *   assets/icon-background.png   1024² full-bleed    — Android adaptive background
 *   assets/splash.png            2732² (+ -dark)     — Capacitor splash source
 *   assets/splash-dark.png       2732²
 *   public/icons/icon-192.png    192²  maskable      — PWA manifest (fixes 404)
 *   public/icons/icon-512.png    512²  maskable      — PWA manifest (fixes 404)
 *   public/icons/apple-touch-icon.png 180²           — iOS Safari add-to-home
 *
 * After native projects exist (`npm run setup:ios` / `setup:android`),
 * `npx capacitor-assets generate` reads assets/* and emits every
 * platform-specific size. Re-run THIS script only when the brand mark
 * changes.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GOLD = '#c9a84c';
const BG = '#ffffff'; // David 2026-06-01: white background
const KNIGHT = '#0a0a0a'; // black knight, gold glow behind

/**
 * Full square icon: white bg + gold radial glow + centered BLACK knight.
 * Glow intensity = "B medium" baseline (pending David's final letter pick).
 */
function iconSvg(size, { background = true, knight = true, glow = true } = {}) {
  const c = size / 2;
  const fontSize = Math.round(size * 0.66);
  const baseline = Math.round(size * 0.72); // optical-center the glyph
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="45%" r="46%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.85"/>
      <stop offset="40%" stop-color="${GOLD}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${background ? `<rect width="${size}" height="${size}" fill="${BG}"/>` : ''}
  ${glow ? `<circle cx="${c}" cy="${size * 0.45}" r="${size * 0.46}" fill="url(#glow)"/>` : ''}
  ${knight ? `<text x="${c}" y="${baseline}" font-size="${fontSize}" text-anchor="middle" fill="${KNIGHT}" font-family="DejaVu Sans, sans-serif">&#9822;</text>` : ''}
</svg>`;
}

/** Splash: glow + knight, smaller mark, generous margin. */
function splashSvg(size) {
  const c = size / 2;
  const fontSize = Math.round(size * 0.2);
  const baseline = Math.round(size * 0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="48%" r="22%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.75"/>
      <stop offset="45%" stop-color="${GOLD}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${c}" cy="${size * 0.48}" r="${size * 0.22}" fill="url(#glow)"/>
  <text x="${c}" y="${baseline}" font-size="${fontSize}" text-anchor="middle" fill="${KNIGHT}" font-family="DejaVu Sans, sans-serif">&#9822;</text>
</svg>`;
}

async function png(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(resolve(ROOT, outPath));
  console.log('  ✓', outPath);
}

async function main() {
  await mkdir(resolve(ROOT, 'assets'), { recursive: true });
  await mkdir(resolve(ROOT, 'public/icons'), { recursive: true });

  console.log('Capacitor source art (assets/):');
  await png(iconSvg(1024), 1024, 'assets/icon.png');
  await png(iconSvg(1024, { background: false }), 1024, 'assets/icon-foreground.png');
  await png(iconSvg(1024, { knight: false, glow: true }), 1024, 'assets/icon-background.png');
  await png(splashSvg(2732), 2732, 'assets/splash.png');
  await png(splashSvg(2732), 2732, 'assets/splash-dark.png');

  console.log('PWA web icons (public/icons/) — fixes manifest 404s:');
  await png(iconSvg(192), 192, 'public/icons/icon-192.png');
  await png(iconSvg(512), 512, 'public/icons/icon-512.png');
  await png(iconSvg(180), 180, 'public/icons/apple-touch-icon.png');

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
