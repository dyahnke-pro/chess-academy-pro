#!/usr/bin/env node
/**
 * Merges Lichess masters game data into src/data/model-games.json.
 * Reads docs/audit-runs/master-games-<iso>/manifest.json + per-opening
 * files, converts each game into the ModelGame schema, and appends.
 *
 * chess.js validates every PGN end-to-end before merge — any game
 * with an illegal move is rejected (no bad data hits prod).
 *
 * Idempotent: skips games whose lichess id is already present.
 *
 * Usage: node scripts/merge-master-games.mjs <fetched-dir>
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node merge-master-games.mjs <fetched-dir>');
  process.exit(1);
}

const target = JSON.parse(readFileSync('src/data/model-games.json', 'utf-8'));
const targetArr = Array.isArray(target) ? target : Object.values(target);
const existingIds = new Set(targetArr.map((g) => g.id));

// Strip PGN headers, keep only moves
function extractMovesFromPgn(rawPgn) {
  // Lichess game-export returns PGN like:
  //   [Event "..."] ... \n\n 1. e4 e5 2. Nf3 ... 1-0
  // Strip header tags and trailing result; keep SAN move text only.
  const movesSection = rawPgn.split('\n\n').slice(1).join('\n\n').trim();
  // Remove move numbers (1. 1... 2.) and trailing result.
  return movesSection
    .replace(/\{[^}]*\}/g, '')                  // remove annotations
    .replace(/\d+\.{1,3}/g, '')                  // remove move numbers
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, '')  // remove result
    .replace(/\s+/g, ' ')
    .trim();
}

// Validate PGN replays cleanly with chess.js
function validatePgn(moveString) {
  const c = new Chess();
  const tokens = moveString.split(/\s+/).filter(Boolean);
  let plyCount = 0;
  for (const tok of tokens) {
    try {
      c.move(tok.replace(/[+#!?]+$/, ''));
      plyCount += 1;
    } catch (e) {
      return { ok: false, error: `illegal at ply ${plyCount}: ${tok}` };
    }
  }
  return { ok: true, plyCount };
}

let merged = 0;
let skipped = 0;
let rejected = 0;

const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
for (const file of files) {
  const data = JSON.parse(readFileSync(`${dir}/${file}`, 'utf-8'));
  const openingId = data.openingId;
  for (const g of data.games ?? []) {
    const mgId = `mg-lichess-${g.id}`;
    if (existingIds.has(mgId)) { skipped++; continue; }
    const moves = extractMovesFromPgn(g.pgn);
    const validation = validatePgn(moves);
    if (!validation.ok) {
      console.log(`  REJECT ${mgId} (${openingId}): ${validation.error}`);
      rejected++;
      continue;
    }
    const result = g.winner === 'white' ? '1-0'
      : g.winner === 'black' ? '0-1'
      : '1/2-1/2';
    targetArr.push({
      id: mgId,
      openingId,
      white: g.white,
      black: g.black,
      whiteElo: g.whiteRating,
      blackElo: g.blackRating,
      result,
      year: g.year,
      event: g.month ? `${g.year}-${g.month} master game` : `${g.year ?? 'unknown'} master game`,
      pgn: moves,
      overview: `Master game from the Lichess masters database. ${g.white} vs ${g.black}, ${g.year ?? 'year unknown'}. Result: ${result}. Walk through the moves to see how masters handled this position from the opening.`,
      criticalMoments: [],
      sourceUrl: g.url,
      source: 'lichess-masters',
    });
    existingIds.add(mgId);
    merged++;
  }
}

const output = Array.isArray(target) ? targetArr : Object.fromEntries(targetArr.map((g, i) => [i, g]));
writeFileSync('src/data/model-games.json', JSON.stringify(output, null, 2) + '\n');

console.log(`\n=== MERGE SUMMARY ===`);
console.log(`Merged: ${merged} new model games`);
console.log(`Skipped (already present): ${skipped}`);
console.log(`Rejected (PGN validation failed): ${rejected}`);
console.log(`Total model games now: ${targetArr.length}`);
