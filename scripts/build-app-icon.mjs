#!/usr/bin/env node
/**
 * Build the app icon + splash source art for Capacitor + PWA.
 *
 * The brand mark (David's final sign-off 2026-06-01):
 *   - Dark background (#0f0f0f)
 *   - Gold knight (♞) with a thin dark outline for crisp edges/contrast
 *   - An EMERALD glow that hugs the knight's silhouette (lit from within),
 *     not a circular halo. Built by blurring a bright-emerald copy of the
 *     glyph and stacking it under the crisp knight.
 *
 * Outputs:
 *   assets/icon.png              1024² full-bleed   — Capacitor iOS/Android source
 *   assets/icon-foreground.png   1024² transparent  — Android adaptive foreground
 *   assets/icon-background.png   1024² solid dark    — Android adaptive background
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
const BG = '#0f0f0f'; // dark background
const KNIGHT_FILL = '#d8b65e'; // gold knight
const KNIGHT_STROKE = '#0f0f0f'; // thin dark outline for edge contrast
const GLOW = '#7cf0a0'; // emerald glow (David sign-off)
const GLOW_STACKS = 3; // how many times the blurred glow is layered (intensity)

/** A single knight glyph as a PNG buffer (transparent background). */
function knightSvg(size, { fill, stroke, strokeWidth, fontScale = 0.66, baselineScale = 0.72 }) {
  const c = size / 2;
  const fontSize = Math.round(size * fontScale);
  const baseline = Math.round(size * baselineScale);
  const strokeAttr = stroke
    ? ` stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke"`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><text x="${c}" y="${baseline}" font-size="${fontSize}" text-anchor="middle" fill="${fill}"${strokeAttr} font-family="DejaVu Sans, sans-serif">&#9822;</text></svg>`;
}

function toPng(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Compose the mark: blurred emerald glow stacked under the crisp,
 * outlined gold knight. `background`=false yields a transparent canvas
 * (for the Android adaptive foreground).
 */
async function composeIcon(size, { background = true, fontScale = 0.66, baselineScale = 0.72 } = {}) {
  const glowGlyph = await toPng(
    knightSvg(size, { fill: GLOW, fontScale, baselineScale }),
  );
  const glow = await sharp(glowGlyph).blur(size * 0.03).png().toBuffer();
  const crisp = await toPng(
    knightSvg(size, {
      fill: KNIGHT_FILL,
      stroke: KNIGHT_STROKE,
      strokeWidth: Math.round(size * 0.008),
      fontScale,
      baselineScale,
    }),
  );

  const layers = [];
  for (let i = 0; i < GLOW_STACKS; i++) layers.push({ input: glow });
  layers.push({ input: crisp });

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ? BG : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  return canvas.composite(layers).png().toBuffer();
}

async function write(buf, size, outPath) {
  await sharp(buf).resize(size, size).png().toFile(resolve(ROOT, outPath));
  console.log('  ✓', outPath);
}

async function main() {
  await mkdir(resolve(ROOT, 'assets'), { recursive: true });
  await mkdir(resolve(ROOT, 'public/icons'), { recursive: true });

  const icon1024 = await composeIcon(1024);
  // Splash: smaller centered mark, generous margin.
  const splash = await composeIcon(2732, { fontScale: 0.2, baselineScale: 0.56 });

  console.log('Capacitor source art (assets/):');
  await write(icon1024, 1024, 'assets/icon.png');
  await write(await composeIcon(1024, { background: false }), 1024, 'assets/icon-foreground.png');
  // Adaptive background = solid brand dark.
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
    .png()
    .toFile(resolve(ROOT, 'assets/icon-background.png'));
  console.log('  ✓ assets/icon-background.png');
  await write(splash, 2732, 'assets/splash.png');
  await write(splash, 2732, 'assets/splash-dark.png');

  console.log('PWA web icons (public/icons/) — fixes manifest 404s:');
  await write(icon1024, 192, 'public/icons/icon-192.png');
  await write(icon1024, 512, 'public/icons/icon-512.png');
  await write(icon1024, 180, 'public/icons/apple-touch-icon.png');

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
