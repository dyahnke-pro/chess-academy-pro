#!/usr/bin/env node
// Middlegame plan counts + endgame classes across the WIDER CORPUS.
//
// The deep-build output classifies endings from the handful of games that reach
// the deep aggregate terminus — 3 games for one Queen's Gambit variation. Basing
// "which endings does this variation reach" on 3 games is exactly the mistake
// the wider-corpus rule exists to stop (a Caro variation was once called
// endgame-free off 3 terminus games when 56% of its 189 games reached a real
// ending). Terminus games are for SPINE construction; every structural question
// is answered across every game matching the variation prefix.
//
// A cluster is a candidate plan only at >=10% frequency, and an ending type is
// a candidate endgame plan only at >=10% of decided games. Nothing else gets
// authored — empty beats generic beats invented.
//
//   node scripts/pro-repertoire/wider-corpus-analysis.mjs <player> <openingId> [variationKey]

import { readFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const PLAYER = process.argv[2];
const OPENING_ID = process.argv[3];
const ONLY_VARIATION = process.argv[4] ?? null;
if (!PLAYER || !OPENING_ID) {
  console.error('usage: wider-corpus-analysis.mjs <player> <openingId> [variationKey]');
  process.exit(1);
}

const MG_PLIES = [16, 24];       // where middlegame plans live
const MIN_PCT = 10;              // candidate threshold, both plans and endings

// The archive is JSONL — one game object per line, per month file.
function loadGames(player) {
  const dir = `data/sources/${player}-chesscom`;
  const games = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.jsonl')) continue;
    for (const line of readFileSync(`${dir}/${f}`, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const g = JSON.parse(line);
        if (g.pgn) games.push(g);
      } catch { /* a truncated trailing line is not worth failing the run */ }
    }
  }
  return games;
}

function sansOf(pgn) {
  const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ');
  return body
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
    .map((t) => t.replace(/^\d+\.+/, ''))
    .filter(Boolean);
}

function classifyEnding(fen) {
  const placement = fen.split(' ')[0];
  const counts = {};
  for (const ch of placement.replace(/[^a-zA-Z]/g, '')) {
    const k = ch.toLowerCase();
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const q = counts.q ?? 0;
  const r = counts.r ?? 0;
  const minors = (counts.b ?? 0) + (counts.n ?? 0);
  if (q > 0 && (r > 0 || minors > 0)) return 'middlegame (Q + pieces)';
  if (q > 0) return 'Q+P';
  if (r > 0 && minors > 0) return 'R + minor + P';
  if (r > 0) return 'R+P';
  if (minors > 0) return 'minor + P';
  return 'K+P';
}

function main() {
  const deepDir = `data/sources/${PLAYER}-deep`;
  const files = readdirSync(deepDir).filter((f) => f.startsWith(`${OPENING_ID}-`) && f.endsWith('.json'));
  const games = loadGames(PLAYER);
  console.log(`[wider] ${games.length} games in the archive\n`);

  for (const file of files) {
    const deep = JSON.parse(readFileSync(`${deepDir}/${file}`, 'utf8'));
    const key = file.replace(`${OPENING_ID}-`, '').replace(/\.json$/, '');
    if (ONLY_VARIATION && key !== ONLY_VARIATION) continue;
    const prefix = deep.variation?.prefix ?? [];
    deep.color = deep.color ?? 'white';
    if (prefix.length === 0) continue;

    const matching = [];
    for (const g of games) {
      const sans = sansOf(g.pgn);
      if (sans.length < prefix.length) continue;
      let ok = true;
      for (let i = 0; i < prefix.length; i += 1) if (sans[i] !== prefix[i]) { ok = false; break; }
      if (ok) matching.push({ g, sans });
    }
    if (matching.length === 0) { console.log(`── ${key}: no games match the prefix\n`); continue; }

    // Middlegame clusters: what the STUDENT plays in the plan window, minus the
    // moves every game makes. Counting raw SAN frequency calls castling a plan
    // ("O-O 71%") and buries the real ideas; a plan is a pawn break or a piece
    // heading somewhere, so those are what get counted.
    const ROUTINE = /^(O-O(-O)?|K)/;
    const studentIsWhite = (deep.color ?? 'white') === 'white';
    const clusters = new Map();
    let inWindow = 0;
    for (const { sans } of matching) {
      if (sans.length <= MG_PLIES[0]) continue;
      inWindow += 1;
      const seen = new Set();
      for (let i = MG_PLIES[0]; i < Math.min(sans.length, MG_PLIES[1]); i += 1) {
        const isWhiteMove = i % 2 === 0;
        if (isWhiteMove !== studentIsWhite) continue;
        const san = sans[i];
        if (ROUTINE.test(san) || seen.has(san)) continue;
        seen.add(san);
        clusters.set(san, (clusters.get(san) ?? 0) + 1);
      }
    }

    // Endings across every matching game, not the terminus few.
    const endings = new Map();
    let classified = 0;
    for (const { sans } of matching) {
      if (sans.length < 25) continue;
      const c = new Chess();
      let legal = true;
      for (const s of sans) { try { if (!c.move(s)) { legal = false; break; } } catch { legal = false; break; } }
      if (!legal) continue;
      classified += 1;
      const type = classifyEnding(c.fen());
      endings.set(type, (endings.get(type) ?? 0) + 1);
    }

    console.log(`── ${key} — ${matching.length} games matching the prefix`);
    const planRows = [...clusters.entries()]
      .map(([san, n]) => [san, n, Math.round((n / Math.max(1, inWindow)) * 100)])
      .filter((r) => r[2] >= MIN_PCT)
      .sort((a, b) => b[1] - a[1]);
    console.log(`   middlegame clusters >=${MIN_PCT}% (of ${inWindow} games reaching the window):`);
    console.log(`     ${planRows.length ? planRows.map((r) => `${r[0]} ${r[2]}%`).join('  ') : '(none)'}`);
    console.log(`   → ${planRows.length} candidate middlegame plan(s)`);

    const endRows = [...endings.entries()]
      .map(([t, n]) => [t, n, Math.round((n / Math.max(1, classified)) * 100)])
      .sort((a, b) => b[1] - a[1]);
    console.log(`   endings across ${classified} games >=25 plies:`);
    for (const [t, n, pct] of endRows) console.log(`     ${String(pct).padStart(3)}%  ${String(n).padStart(3)}  ${t}`);
    const realEndings = endRows.filter((r) => r[2] >= MIN_PCT && !r[0].startsWith('middlegame'));
    console.log(`   → ${realEndings.length} candidate endgame plan(s)\n`);
  }
}

main();
