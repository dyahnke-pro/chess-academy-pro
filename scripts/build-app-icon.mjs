#!/usr/bin/env node
/**
 * Build the app icon + splash source art for Capacitor + PWA from
 * David's brand image (the 3D gold knight with green eyes + emerald
 * energy glow). David's sign-off 2026-06-07: use the rendered artwork,
 * not the old auto-drawn glyph.
 *
 * SOURCE OF TRUTH: assets/icon-source.png — the brand artwork. Replace
 * THAT file (ideally at 1024² or larger, fully opaque, square,
 * full-bleed, no pre-rounded corners) and re-run this script when the
 * mark changes. Everything below is derived from it.
 *
 * Outputs:
 *   assets/icon.png              1024² full-bleed opaque — Capacitor iOS/Android source
 *   assets/icon-foreground.png   1024² transparent       — Android adaptive foreground (mark centered in safe zone)
 *   assets/icon-background.png   1024² solid dark        — Android adaptive background
 *   assets/splash.png            2732² (+ -dark)         — Capacitor splash source (mark centered on dark)
 *   assets/splash-dark.png       2732²
 *   public/icons/icon-192.png    192²  maskable          — PWA manifest
 *   public/icons/icon-512.png    512²  maskable          — PWA manifest
 *   public/icons/apple-touch-icon.png 180²               — iOS Safari add-to-home
 *
 * After native projects exist (`npm run setup:ios` / `setup:android`),
 * `npx capacitor-assets generate` reads assets/* and emits every
 * platform-specific size.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BG = '#0f0f0f'; // dark brand background (matches the artwork's backdrop)
const SOURCE = resolve(ROOT, 'assets/icon-source.png');

/** Full-bleed app icon at `size`, forced opaque (iOS rejects alpha). */
async function appIcon(size) {
  return sharp(SOURCE)
    .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
    .flatten({ background: BG })
    .png()
    .toBuffer();
}

/** Android adaptive foreground: the mark scaled into the safe zone on a
 *  transparent canvas, so the launcher mask doesn't crop the artwork. */
async function adaptiveForeground(size) {
  const markSize = Math.round(size * 0.66);
  const mark = await sharp(SOURCE)
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

/** Splash: the mark centered with generous margin on the dark backdrop. */
async function splash(size) {
  const markSize = Math.round(size * 0.4);
  const mark = await sharp(SOURCE)
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function writeBuf(buf, outPath) {
  await sharp(buf).toFile(resolve(ROOT, outPath));
  console.log('  ✓', outPath);
}

async function main() {
  await mkdir(resolve(ROOT, 'assets'), { recursive: true });
  await mkdir(resolve(ROOT, 'public/icons'), { recursive: true });

  const icon1024 = await appIcon(1024);

  console.log('Capacitor source art (assets/):');
  await writeBuf(icon1024, 'assets/icon.png');
  await writeBuf(await adaptiveForeground(1024), 'assets/icon-foreground.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
    .png()
    .toFile(resolve(ROOT, 'assets/icon-background.png'));
  console.log('  ✓ assets/icon-background.png');
  const splash2732 = await splash(2732);
  await writeBuf(splash2732, 'assets/splash.png');
  await writeBuf(splash2732, 'assets/splash-dark.png');

  console.log('PWA web icons (public/icons/):');
  await writeBuf(await sharp(icon1024).resize(192, 192).png().toBuffer(), 'public/icons/icon-192.png');
  await writeBuf(await sharp(icon1024).resize(512, 512).png().toBuffer(), 'public/icons/icon-512.png');
  await writeBuf(await sharp(icon1024).resize(180, 180).png().toBuffer(), 'public/icons/apple-touch-icon.png');

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
