#!/usr/bin/env node
/**
 * Merge audit-reports/staged/mined-traps-batch-1.json into
 * src/data/repertoire.json `trapLines[]` per opening.
 *
 * Each mined entry is added as an OpeningVariation with:
 *   - name: derived from primary tactical theme (e.g. "Pin Strike",
 *     "Fork Win") suffixed with a per-opening index
 *   - pgn: SAN sequence (moves played FROM setupFen)
 *   - setupFen: puzzle's starting FEN (middlegame position)
 *   - explanation: themes + eval verdict
 *   - source: 'lichess-puzzle:<id>'
 *   - verifiedEval: Stockfish-confirmed final eval
 *
 * Idempotent: skips entries whose source already exists in the
 * target trapLines (re-run is safe).
 *
 * Per CLAUDE.md directive — runs only after David's go-ahead.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const STAGING = 'audit-reports/staged/mined-traps-batch-1.json';
const TARGET = 'src/data/repertoire.json';

const THEME_NAMES = {
  mate: 'Mating Strike',
  mateIn1: 'Mate in One',
  mateIn2: 'Mate in Two',
  mateIn3: 'Mate in Three',
  fork: 'Fork Win',
  pin: 'Pin Pressure',
  skewer: 'Skewer Win',
  sacrifice: 'Sacrificial Attack',
  hangingPiece: 'Hanging Piece',
  attractionDeflection: 'Attraction Tactic',
  attraction: 'Attraction Tactic',
  deflection: 'Deflection Win',
  attackingF2F7: 'F-pawn Strike',
  exposedKing: 'King Hunt',
  kingsideAttack: 'Kingside Crush',
  queensideAttack: 'Queenside Crush',
  discoveredAttack: 'Discovered Attack',
  doubleCheck: 'Double Check',
  smotheredMate: 'Smothered Mate',
  trappedPiece: 'Trapped Piece',
  capturingDefender: 'Capturing the Defender',
};

function pickPrimaryTheme(themes) {
  // Priority order: mate themes first, then specific tactics, then
  // attack/exposure themes. Each puzzle has multiple themes; pick
  // the most teachable one.
  const priorityOrder = [
    'smotheredMate', 'mateIn1', 'mateIn2', 'mateIn3', 'mate',
    'fork', 'skewer', 'pin', 'sacrifice', 'discoveredAttack',
    'doubleCheck', 'attractionDeflection', 'attraction', 'deflection',
    'attackingF2F7', 'kingsideAttack', 'queensideAttack', 'exposedKing',
    'hangingPiece', 'trappedPiece', 'capturingDefender',
  ];
  for (const p of priorityOrder) {
    if (themes.includes(p) && THEME_NAMES[p]) return p;
  }
  return null;
}

function buildExplanation(entry) {
  const primary = pickPrimaryTheme(entry.themes);
  const themeWord = primary ? THEME_NAMES[primary] : 'Tactical Strike';
  const evalStr = entry.finalEval;
  const themesStr = entry.themes.filter(t => t !== 'opening' && t !== 'short' && t !== 'long' && t !== 'veryLong' && t !== 'middlegame' && t !== 'endgame').slice(0, 4).join(', ');
  return `${themeWord} verified by Stockfish to win ${evalStr} for the student. Tactical themes: ${themesStr}. Sourced from real Lichess puzzle (rating ${entry.puzzleRating}, played ${entry.puzzlePlays.toLocaleString()} times).`;
}

const staged = JSON.parse(readFileSync(STAGING, 'utf-8'));
const target = JSON.parse(readFileSync(TARGET, 'utf-8'));
const targetArr = Array.isArray(target) ? target : Object.values(target);

let added = 0;
let skipped = 0;

for (const [openingId, entries] of Object.entries(staged.byOpening)) {
  const opening = targetArr.find((o) => o.id === openingId);
  if (!opening) {
    console.log(`  skipping ${openingId} — not in repertoire.json`);
    continue;
  }
  if (!Array.isArray(opening.trapLines)) opening.trapLines = [];

  // Count existing mined entries to number new ones sequentially
  const existingMined = opening.trapLines.filter((t) => t.source?.startsWith('lichess-puzzle:'));
  let counter = existingMined.length + 1;

  for (const entry of entries) {
    const sourceId = `lichess-puzzle:${entry.puzzleId}`;
    if (opening.trapLines.some((t) => t.source === sourceId)) {
      skipped++;
      continue;
    }
    const primary = pickPrimaryTheme(entry.themes);
    const themeWord = primary ? THEME_NAMES[primary] : 'Tactical Strike';
    const name = `${themeWord} #${counter}`;
    counter++;

    opening.trapLines.push({
      name,
      pgn: entry.moveSequenceSan,
      setupFen: entry.startFen,
      explanation: buildExplanation(entry),
      source: sourceId,
      verifiedEval: entry.finalEval,
    });
    added++;
  }
}

// Write back. repertoire.json was loaded as array (per our earlier
// check, top-level keys '0','1',… so it IS an array shape).
const output = Array.isArray(target) ? targetArr : Object.fromEntries(targetArr.map((o, i) => [i, o]));
writeFileSync(TARGET, JSON.stringify(output, null, 2) + '\n');

console.log(`\n=== MERGE COMPLETE ===`);
console.log(`Added: ${added} new mined traps`);
console.log(`Skipped (already present): ${skipped}`);
console.log(`Total trap entries now: ${targetArr.reduce((s, o) => s + (o.trapLines?.length || 0), 0)}`);
console.log(`Wrote ${TARGET}`);
