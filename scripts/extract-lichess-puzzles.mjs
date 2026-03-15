#!/usr/bin/env node
/**
 * Extract puzzles from the Lichess puzzle database CSV.
 * Downloads the zstd-compressed CSV, decompresses in chunks, and extracts ~15K puzzles.
 *
 * Usage: node scripts/extract-lichess-puzzles.mjs
 *        node scripts/extract-lichess-puzzles.mjs /path/to/lichess_db_puzzle.csv
 */

import { createReadStream, writeFileSync, existsSync, createWriteStream, unlinkSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LICHESS_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';

const TIERS = {
  easy:   { minRating: 400,  maxRating: 1249, target: 5000 },
  medium: { minRating: 1250, maxRating: 1749, target: 5000 },
  hard:   { minRating: 1750, maxRating: 9999, target: 5000 },
};

const MIN_POPULARITY = 70;
const MIN_NB_PLAYS = 500;

function assignTier(rating) {
  for (const [name, config] of Object.entries(TIERS)) {
    if (rating >= config.minRating && rating <= config.maxRating) {
      return name;
    }
  }
  return null;
}

function allTiersFull(buckets) {
  return Object.entries(TIERS).every(([name, config]) => buckets[name].length >= config.target);
}

function parseLine(line) {
  // CSV: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
  const cols = line.split(',');
  if (cols.length < 10) return null;

  const id = cols[0];
  const fen = cols[1];
  const moves = cols[2];
  const rating = parseInt(cols[3], 10);
  const popularity = parseInt(cols[5], 10);
  const nbPlays = parseInt(cols[6], 10);
  const themes = cols[7] ? cols[7].trim().split(/\s+/) : [];
  const openingTags = cols[9]?.trim() || null;

  if (isNaN(rating) || isNaN(popularity) || isNaN(nbPlays)) return null;
  if (popularity < MIN_POPULARITY || nbPlays < MIN_NB_PLAYS) return null;
  if (!fen || !moves || !id) return null;

  return { id, fen, moves, rating, themes, openingTags: openingTags || null, popularity, nbPlays };
}

async function downloadCompressed(destPath) {
  console.log('Downloading Lichess puzzle database (~277MB compressed)...');
  const response = await fetch(LICHESS_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  console.log(`File size: ${(contentLength / 1024 / 1024).toFixed(1)}MB`);

  const writer = createWriteStream(destPath);
  const reader = response.body.getReader();
  let downloaded = 0;
  let lastReport = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    writer.write(Buffer.from(value));
    downloaded += value.length;
    if (downloaded - lastReport > 25 * 1024 * 1024) {
      console.log(`  ${(downloaded / 1024 / 1024).toFixed(0)}MB / ${(contentLength / 1024 / 1024).toFixed(0)}MB`);
      lastReport = downloaded;
    }
  }

  writer.end();
  await new Promise((resolve) => writer.on('finish', resolve));
  console.log(`Download complete: ${destPath}`);
}

async function decompressWithFzstd(compressedPath, outputPath) {
  const { decompress } = await import('fzstd');
  const { readFileSync } = await import('fs');

  console.log('Decompressing (this takes ~30 seconds)...');
  const compressed = readFileSync(compressedPath);
  const decompressed = decompress(new Uint8Array(compressed));

  // Write decompressed data directly to file in chunks to avoid string length limits
  const writer = createWriteStream(outputPath);
  const CHUNK = 64 * 1024 * 1024; // 64MB chunks
  for (let offset = 0; offset < decompressed.length; offset += CHUNK) {
    const end = Math.min(offset + CHUNK, decompressed.length);
    writer.write(Buffer.from(decompressed.buffer, decompressed.byteOffset + offset, end - offset));
  }
  writer.end();
  await new Promise((resolve) => writer.on('finish', resolve));
  console.log(`Decompressed to ${outputPath} (${(decompressed.length / 1024 / 1024).toFixed(0)}MB)`);
}

async function processFile(csvPath) {
  const buckets = { easy: [], medium: [], hard: [] };
  let lineCount = 0;
  let skippedHeader = false;

  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!skippedHeader) { skippedHeader = true; continue; }
    lineCount++;

    const puzzle = parseLine(line);
    if (!puzzle) continue;

    const tier = assignTier(puzzle.rating);
    if (!tier) continue;
    if (buckets[tier].length >= TIERS[tier].target) {
      if (allTiersFull(buckets)) {
        rl.close();
        break;
      }
      continue;
    }

    buckets[tier].push(puzzle);

    if (lineCount % 200000 === 0) {
      const counts = Object.entries(buckets).map(([k, v]) => `${k}:${v.length}`).join(', ');
      console.log(`  Processed ${lineCount} lines... [${counts}]`);
    }
  }

  return { buckets, lineCount };
}

async function main() {
  const localCsv = process.argv[2];
  let csvPath;

  if (localCsv && existsSync(localCsv)) {
    csvPath = localCsv;
    console.log(`Using local file: ${csvPath}`);
  } else {
    const tmpCompressed = join(tmpdir(), 'lichess_puzzles.csv.zst');
    csvPath = join(tmpdir(), 'lichess_puzzles.csv');

    if (existsSync(csvPath)) {
      console.log(`Using cached CSV: ${csvPath}`);
    } else {
      await downloadCompressed(tmpCompressed);
      await decompressWithFzstd(tmpCompressed, csvPath);
      // Clean up compressed file
      try { unlinkSync(tmpCompressed); } catch { /* ignore */ }
    }
  }

  console.log('Processing puzzles...');
  const { buckets, lineCount } = await processFile(csvPath);

  // Sort each tier by rating
  for (const tier of Object.values(buckets)) {
    tier.sort((a, b) => a.rating - b.rating);
  }

  const allPuzzles = [...buckets.easy, ...buckets.medium, ...buckets.hard];

  console.log(`\nExtraction complete:`);
  console.log(`  Easy (${TIERS.easy.minRating}-${TIERS.easy.maxRating}): ${buckets.easy.length}`);
  console.log(`  Medium (${TIERS.medium.minRating}-${TIERS.medium.maxRating}): ${buckets.medium.length}`);
  console.log(`  Hard (${TIERS.hard.minRating}+): ${buckets.hard.length}`);
  console.log(`  Total: ${allPuzzles.length}`);
  console.log(`  Lines processed: ${lineCount}`);

  for (const [name, puzzles] of Object.entries(buckets)) {
    if (puzzles.length === 0) continue;
    const ratings = puzzles.map(p => p.rating);
    console.log(`  ${name}: min=${Math.min(...ratings)}, max=${Math.max(...ratings)}, avg=${Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)}`);
  }

  const outPath = join(__dirname, '..', 'src', 'data', 'puzzles.json');
  const json = JSON.stringify(allPuzzles, null, 2) + '\n';
  writeFileSync(outPath, json);
  console.log(`Written to ${outPath} (${(Buffer.byteLength(json) / 1024 / 1024).toFixed(1)}MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
