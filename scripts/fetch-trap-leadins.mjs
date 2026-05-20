#!/usr/bin/env node
/**
 * For each mined trap in repertoire.json with setupFen + a
 * lichess-puzzle source, fetch the source game's leading moves
 * from Lichess so we can rebuild the PGN as walk-from-move-1.
 *
 * David's directive: "remember to walk through the opening to get
 * to the trap line. i really like that feature."
 *
 * Pipeline per trap:
 *   1. Extract puzzle ID from trap.source (e.g. 'lichess-puzzle:abc12')
 *   2. GET https://lichess.org/api/puzzle/<id> → gives game.id
 *   3. GET https://lichess.org/game/export/<gameId>?moves=1 → full game PGN
 *   4. Walk the game PGN move-by-move; find the ply where the FEN
 *      matches trap.setupFen (modulo move counters)
 *   5. Take the lead-in (moves 1..matchPly) + append trap.pgn
 *   6. chess.js validates the reconstruction end-to-end
 *
 * Output writes back to src/data/repertoire.json — pgn becomes
 * walk-from-start, setupFen removed.
 *
 * Run on David's laptop (no token needed — /api/puzzle and
 * /game/export are public; an invalid token actually 401s game
 * export, so we run anonymous):
 *   node scripts/fetch-trap-leadins.mjs
 *
 * ~955 lines × 2 public API calls × 2s delay ≈ 60 min.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

// No token needed — /api/puzzle and /game/export are public.

// Anonymous rate-friendly delay. Both endpoints below are PUBLIC —
// /api/puzzle and /game/export need no auth. Sending an invalid
// Bearer token makes /game/export 401 (the puzzle API ignores it,
// game export validates it), so we send NO auth header and run
// anonymously. 2s spacing keeps us under Lichess's anon limits.
const DELAY_MS = 2000;

const PUBLIC_HEADERS = {
  'user-agent': 'chess-academy-pro/1.0 (trap-leadin-fetcher)',
};

function positionKey(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

async function fetchPuzzleMeta(puzzleId) {
  const r = await fetch(`https://lichess.org/api/puzzle/${puzzleId}`, {
    headers: { ...PUBLIC_HEADERS, accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`puzzle API HTTP ${r.status}`);
  return await r.json();
}

async function fetchGamePgn(gameId) {
  const r = await fetch(`https://lichess.org/game/export/${gameId}?moves=true&clocks=false&evals=false&opening=false`, {
    headers: { ...PUBLIC_HEADERS, accept: 'application/x-chess-pgn' },
  });
  if (!r.ok) throw new Error(`game export HTTP ${r.status}`);
  return await r.text();
}

function extractMovesFromPgn(rawPgn) {
  const movesSection = rawPgn.split('\n\n').slice(1).join('\n\n').trim();
  return movesSection
    .replace(/\{[^}]*\}/g, '')
    .replace(/\d+\.{1,3}/g, '')
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Walk a PGN, return ply index where position matches setupFen
function findLeadInPly(gameMoves, setupFen) {
  const targetKey = positionKey(setupFen);
  const c = new Chess();
  if (positionKey(c.fen()) === targetKey) return 0;
  const tokens = gameMoves.trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i += 1) {
    try {
      c.move(tokens[i].replace(/[+#!?]+$/, ''));
      if (positionKey(c.fen()) === targetKey) return i + 1;
    } catch {
      return -1;
    }
  }
  return -1;
}

function validateFullPgn(pgn, expectedFinalFen) {
  const c = new Chess();
  for (const tok of pgn.trim().split(/\s+/).filter(Boolean)) {
    try {
      c.move(tok.replace(/[+#!?]+$/, ''));
    } catch (e) {
      return { ok: false, reason: `illegal: ${tok}` };
    }
  }
  if (positionKey(c.fen()) !== positionKey(expectedFinalFen)) {
    return { ok: false, reason: 'final position mismatch' };
  }
  return { ok: true };
}

// Process all three opening-data files. Each mined trap/pitfall in
// any of them carries setupFen + a lichess-puzzle source; the lead-in
// rewrite is identical regardless of file.
const FILES = [
  { path: 'src/data/repertoire.json', accessor: 'array' },
  { path: 'src/data/gambits.json', accessor: 'array' },
  { path: 'src/data/pro-repertoires.json', accessor: 'openings' },
];
const docs = FILES.map((f) => {
  const raw = JSON.parse(readFileSync(f.path, 'utf-8'));
  const arr = f.accessor === 'openings' ? (raw.openings ?? []) : (Array.isArray(raw) ? raw : Object.values(raw));
  return { ...f, raw, arr };
});
function saveAll() {
  for (const d of docs) writeFileSync(d.path, JSON.stringify(d.raw, null, 2) + '\n');
}

const targets = [];
for (let fi = 0; fi < docs.length; fi += 1) {
  const arr = docs[fi].arr;
  for (let oi = 0; oi < arr.length; oi += 1) {
    const op = arr[oi];
    for (const list of ['trapLines', 'warningLines']) {
      if (!Array.isArray(op[list])) continue;
      for (let ti = 0; ti < op[list].length; ti += 1) {
        const entry = op[list][ti];
        if (entry.setupFen && entry.source?.startsWith('lichess-puzzle:')) {
          targets.push({ fi, oi, list, ti, openingId: op.id, trap: entry });
        }
      }
    }
  }
}

console.log(`Mined traps to convert: ${targets.length}`);
console.log(`Estimated runtime: ~${Math.ceil(targets.length * 2 * DELAY_MS / 60000)} min\n`);

let rewritten = 0;
let kept = 0;
let errors = 0;
let processed = 0;

for (const { fi, oi, list, ti, openingId, trap } of targets) {
  processed += 1;
  const puzzleId = trap.source.split(':')[1];
  process.stdout.write(`[${processed}/${targets.length}] ${openingId} puzzle=${puzzleId} ... `);

  try {
    const meta = await fetchPuzzleMeta(puzzleId);
    const gameId = meta.game?.id;
    if (!gameId) {
      console.log('no game id');
      kept += 1;
      continue;
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));

    const gamePgn = await fetchGamePgn(gameId);
    const gameMoves = extractMovesFromPgn(gamePgn);

    const matchPly = findLeadInPly(gameMoves, trap.setupFen);
    if (matchPly < 0) {
      console.log('setupFen not found in game');
      kept += 1;
      await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }

    const leadInTokens = gameMoves.trim().split(/\s+/).filter(Boolean).slice(0, matchPly);
    const leadIn = leadInTokens.join(' ');
    const fullPgn = `${leadIn} ${trap.pgn}`.trim();

    // Re-derive expected final FEN
    const c = new Chess(trap.setupFen);
    for (const tok of trap.pgn.trim().split(/\s+/).filter(Boolean)) {
      c.move(tok.replace(/[+#!?]+$/, ''));
    }
    const expectedFinalFen = c.fen();

    const valid = validateFullPgn(fullPgn, expectedFinalFen);
    if (!valid.ok) {
      console.log(`validation failed: ${valid.reason}`);
      errors += 1;
      await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }

    // Rewrite in place (trapLines or warningLines, in its file)
    docs[fi].arr[oi][list][ti] = {
      ...trap,
      pgn: fullPgn,
      sourceGameUrl: `https://lichess.org/${gameId}`,
    };
    delete docs[fi].arr[oi][list][ti].setupFen;
    console.log(`✓ lead-in ${matchPly} plies, full ${leadInTokens.length + trap.pgn.split(/\s+/).filter(Boolean).length} plies`);
    rewritten += 1;
  } catch (e) {
    console.log(`error: ${e.message}`);
    errors += 1;
  }

  // Save progress every 10 entries so a network error doesn't lose work
  if (processed % 10 === 0) {
    saveAll();
    console.log(`  (progress saved at ${processed})`);
  }

  await new Promise((r) => setTimeout(r, DELAY_MS));
}

saveAll();

console.log('\n=== TRAP LEAD-IN FETCH SUMMARY ===');
console.log(`Rewritten (walk-from-move-1):  ${rewritten}`);
console.log(`Kept setupFen:                  ${kept}`);
console.log(`Errors:                         ${errors}`);
console.log('Wrote src/data/repertoire.json');
