#!/usr/bin/env node
/**
 * Re-runs the name generation for proposed-pro-repertoires.json,
 * mapping each entry's ECO + first-N-plies to the canonical opening
 * name from openings-lichess.json (3641 entries).
 *
 * Strategy: find the LONGEST opening-lichess entry whose PGN is a
 * prefix of the pro entry's PGN. That's the most specific named
 * opening that contains the pro's line.
 *
 * Updates the file in place.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const PROP_PATH = 'docs/audit-runs/2026-05-19-pro-rebuild/proposed-pro-repertoires.json';
const ECO_PATH = 'src/data/openings-lichess.json';

function pgnToSans(pgn) {
  const c = new Chess(); const toks = pgn.trim().split(/\s+/).filter(t => !/^\d+\.+$/.test(t));
  const out = [];
  for (const t of toks) { try { const m = c.move(t); out.push(m.san); } catch { break; } }
  return out;
}

const proposal = JSON.parse(await readFile(PROP_PATH, 'utf-8'));
const ecoDb = JSON.parse(await readFile(ECO_PATH, 'utf-8'));

// Pre-parse ECO db sans for faster matching
const ecoParsed = ecoDb.map(e => ({ ...e, _sans: pgnToSans(e.pgn || '') })).filter(e => e._sans.length > 0);
console.log(`ECO db: ${ecoParsed.length} entries with valid PGN`);

let updated = 0;
for (const o of proposal.openings) {
  const proSans = pgnToSans(o.pgn);
  if (proSans.length === 0) continue;
  // Find the LONGEST ECO entry whose sans are a strict prefix of proSans
  let bestMatch = null;
  for (const e of ecoParsed) {
    if (e._sans.length > proSans.length) continue;
    let isPrefix = true;
    for (let i = 0; i < e._sans.length; i++) {
      if (e._sans[i] !== proSans[i]) { isPrefix = false; break; }
    }
    if (isPrefix && (!bestMatch || e._sans.length > bestMatch._sans.length)) {
      bestMatch = e;
    }
  }
  if (bestMatch) {
    const colorTag = o.color === 'white' ? 'as White' : 'as Black';
    o.name = `${o.playerDisplay} ${colorTag}: ${bestMatch.name}`;
    o.eco = bestMatch.eco;
    o.canonicalOpeningName = bestMatch.name;
    o.canonicalEcoPgn = bestMatch.pgn;
    updated++;
  }
}

console.log(`updated names: ${updated} / ${proposal.openings.length}`);
await writeFile(PROP_PATH, JSON.stringify(proposal, null, 2) + '\n');
console.log(`wrote ${PROP_PATH}`);

// Sample new names
console.log('\n=== sample renamed entries ===');
for (const o of proposal.openings.slice(0, 12)) {
  console.log(`  ${o.eco} | ${o.name}`);
}
