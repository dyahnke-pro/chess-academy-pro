#!/usr/bin/env node
// build-game-references.mjs — the "save game data for references" step
// (David 2026-06-01). Aggregates a pro player's committed pipeline
// artifacts into the bounded, SHIPPED reference the coach reads at
// runtime for teaching + walkthroughs.
//
// Sources (in priority order), all already on disk + committed:
//   1. data/sources/<username>-trees/<opening>-model-games.json
//      (pick-model-games output: wins-only, opp >=2400, full PGN,
//       per-variation `candidates` with `label` + `pathSans`)
//   2. data/sources/<username>-deep/<opening>-<variation>.json
//      (deep-build topModelGames — enrich; LOSSES filtered out so the
//       reference never cites the student's side losing, per the
//       orientation doctrine + G "never cite the opening losing")
//   3. data/sources/<username>-otb/*.jsonl  (OTB games, source:"otb",
//      from fetch-otb-games.mjs — used on rollout for classical players)
//
// Output: MERGED into src/data/pro-game-references.json (flat array,
// mirrors model-games.json shape for easy Dexie keying). A scoped run
// (one player) leaves other players' entries intact (merge by id).
//
// Usage: node scripts/pro-repertoire/build-game-references.mjs <appPlayerId> [--max-per-variation N]
//   e.g. node scripts/pro-repertoire/build-game-references.mjs naroditsky

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const APP_PLAYER = process.argv[2];
if (!APP_PLAYER) {
  console.error('usage: build-game-references.mjs <appPlayerId> [--max-per-variation N]');
  process.exit(1);
}
function argVal(flag, fallback) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.split('=')[1];
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}
// Bounded so the shipped JSON stays small (rollout switches to lazy
// per-player loading once all 14 pros are in). 5/variation keeps a
// single prolific player ~300 KB.
const MAX_PER_VARIATION = Number(argVal('--max-per-variation', 5));

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, 'src', 'data', 'pro-game-references.json');
const SOURCES = path.join(ROOT, 'data', 'sources');

// chess.com username per app player id (the -chesscom / -trees / -deep
// dirs are keyed by username). Add an entry when onboarding a new pro.
const USERNAME = {
  naroditsky: 'danielnaroditsky',
  gothamchess: 'gothamchess',
  hikaru: 'hikaru',
  ericrosen: 'imrosen',
  samayraina: 'samayraina',
};

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Resolve pro-opening ids + studentSide from pro-repertoires.json ─────────
const proRep = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'pro-repertoires.json'), 'utf8'));
const proOpenings = proRep.openings.filter((o) => o.playerId === APP_PLAYER);
if (proOpenings.length === 0) {
  console.error(`no pro openings for playerId="${APP_PLAYER}" in pro-repertoires.json`);
  process.exit(1);
}

/** Map a pipeline openingId (tree/deep key, e.g. "alapin-sicilian") to the
 *  proOpeningId (e.g. "pro-naroditsky-alapin") + base openingId + color.
 *  Match by token overlap against the pro opening ids; explicit aliases
 *  cover the non-mechanical cases. Returns null when nothing matches. */
const ALIAS = {
  'alapin-sicilian': 'alapin',
  'fantasy-caro': 'fantasy-caro',
  // Samay tree keys carry a "samay-" prefix + descriptive suffix; map the
  // ones token-overlap can't resolve onto their pro opening id.
  'samay-scandi-black': 'scandi',
};
function resolvePro(pipelineOpeningId) {
  const want = ALIAS[pipelineOpeningId] || pipelineOpeningId;
  // direct: pro-<player>-<want>
  let hit = proOpenings.find((o) => o.id === `pro-${APP_PLAYER}-${want}`);
  if (!hit) {
    // token overlap: the pro id contains every token of `want`
    const tokens = want.split('-').filter(Boolean);
    hit = proOpenings.find((o) => tokens.every((t) => o.id.includes(t)));
  }
  if (!hit) return null;
  // base openingId for coach detectOpening matching: strip the
  // "pro-<player>-" prefix off the pro id.
  const baseOpeningId = hit.id.replace(new RegExp(`^pro-${APP_PLAYER}-`), '');
  return { proOpeningId: hit.id, baseOpeningId, color: hit.color };
}

/** Strip a raw PGN (headers + clock comments + move numbers) down to a
 *  clean space-separated SAN string by replaying through chess.js. Also
 *  returns the result + plyCount. Throws on an illegal/empty game. */
function cleanPgn(rawPgn) {
  const chess = new Chess();
  chess.loadPgn(rawPgn, { sloppy: true });
  const header = chess.header();
  const sans = chess.history();
  if (sans.length < 12) throw new Error(`too short (${sans.length} plies)`);
  return { pgn: sans.join(' '), result: header.Result || '*', plyCount: sans.length };
}

const out = [];
let kept = 0;
let dropped = 0;
let idSeq = 0; // monotonic — guarantees globally-unique ids
const perOpening = {};

function pushGame(entry) {
  out.push(entry);
  kept++;
  perOpening[entry.proOpeningId] = (perOpening[entry.proOpeningId] || 0) + 1;
}

function studentLost(result, side) {
  return (side === 'white' && result === '0-1') || (side === 'black' && result === '1-0');
}

// ─── Source 1: trees/<opening>-model-games.json (the spine of the reference) ──
function ingestTrees(username) {
  const dir = path.join(SOURCES, `${username}-trees`);
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('-model-games.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const resolved = resolvePro(j.openingId);
    if (!resolved) {
      console.warn(`  [skip] no pro opening for tree openingId="${j.openingId}" (${file})`);
      continue;
    }
    for (const cand of j.candidates || []) {
      const variation = slugify(cand.label || 'main');
      let added = 0;
      // candidate games already ranked (opp rating, then ply) by pick-model-games
      for (const g of cand.games || []) {
        if (added >= MAX_PER_VARIATION) break;
        const side = g.studentColor || resolved.color;
        let clean;
        try {
          clean = cleanPgn(g.pgn);
        } catch (e) {
          dropped++;
          continue;
        }
        if (studentLost(clean.result, side)) { dropped++; continue; }
        const opponent = g.opponent || 'opponent';
        const id = `pgref-${APP_PLAYER}-${resolved.baseOpeningId}-${variation}-${String(idSeq++).padStart(4, '0')}`;
        pushGame({
          id,
          playerId: APP_PLAYER,
          openingId: resolved.baseOpeningId,
          proOpeningId: resolved.proOpeningId,
          variation,
          variationLabel: cand.label || 'Main line',
          white: side === 'white' ? username : opponent,
          black: side === 'black' ? username : opponent,
          studentSide: side,
          result: clean.result,
          opponentRating: g.opponentRating ?? null,
          date: g.date ?? null,
          source: 'chess.com',
          url: g.url ?? null,
          eco: g.eco ?? null,
          plyCount: clean.plyCount,
          pgn: clean.pgn,
        });
        added++;
      }
    }
  }
}

// ─── Source 3: otb/*.jsonl (real tournament games, rollout) ──────────────────
function ingestOtb(username) {
  const dir = path.join(SOURCES, `${username}-otb`);
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
    const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      let g;
      try { g = JSON.parse(line); } catch { continue; }
      const resolved = g.proOpeningId
        ? { proOpeningId: g.proOpeningId, baseOpeningId: g.openingId, color: g.studentSide }
        : resolvePro(g.openingId || '');
      if (!resolved) { dropped++; continue; }
      let clean;
      try { clean = cleanPgn(g.pgn); } catch { dropped++; continue; }
      const side = g.studentSide || resolved.color;
      if (studentLost(clean.result, side)) { dropped++; continue; }
      pushGame({
        id: `pgref-${APP_PLAYER}-otb-${slugify(g.openingId || resolved.baseOpeningId)}-${String(idSeq++).padStart(4, '0')}`,
        playerId: APP_PLAYER,
        openingId: resolved.baseOpeningId,
        proOpeningId: resolved.proOpeningId,
        variation: slugify(g.variation || 'main'),
        variationLabel: g.variationLabel || 'Main line',
        white: g.white,
        black: g.black,
        studentSide: side,
        result: clean.result,
        opponentRating: g.opponentRating ?? null,
        date: g.date ?? null,
        source: 'otb',
        url: g.url ?? null,
        eco: g.eco ?? null,
        plyCount: clean.plyCount,
        pgn: clean.pgn,
      });
    }
  }
}

const username = USERNAME[APP_PLAYER] || APP_PLAYER;
console.log(`[refs] player=${APP_PLAYER} username=${username} maxPerVariation=${MAX_PER_VARIATION}`);
ingestTrees(username);
ingestOtb(username);

// ─── Merge into the existing committed JSON (scoped: replace only THIS
//     player's entries, keep everyone else's) ──────────────────────────────
let existing = [];
if (fs.existsSync(OUT_PATH)) {
  try { existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')); } catch { existing = []; }
  if (!Array.isArray(existing)) existing = [];
}
const others = existing.filter((e) => e.playerId !== APP_PLAYER);
// de-dup THIS player's new entries by id (last wins)
const seen = new Map();
for (const e of out) seen.set(e.id, e);
const merged = [...others, ...seen.values()].sort((a, b) =>
  a.playerId === b.playerId
    ? (a.proOpeningId || '').localeCompare(b.proOpeningId || '') || (a.id || '').localeCompare(b.id || '')
    : (a.playerId || '').localeCompare(b.playerId || ''),
);

fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2) + '\n');
const bytes = fs.statSync(OUT_PATH).size;
console.log(`[refs] kept ${kept} (dropped ${dropped}) for ${APP_PLAYER}`);
console.log('[refs] per pro opening:', JSON.stringify(perOpening));
console.log(`[refs] wrote ${merged.length} total entries -> ${path.relative(ROOT, OUT_PATH)} (${(bytes / 1024).toFixed(0)} KB)`);
