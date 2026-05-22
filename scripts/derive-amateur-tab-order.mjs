#!/usr/bin/env node
// derive-amateur-tab-order — pull amateur-frequency variation ordering from
// the Lichess Explorer API for a given opening.
//
// David, 2026-05-22: "we had to manually verify amateur frequency order."
// This script automates that verification. Run it when adding a new
// opening (or re-verifying an existing one), paste the suggested CURATED
// block into `src/services/variationTabs.ts`, and commit the sidecar at
// `src/data/amateur-tab-orders.json` as the timestamped source of truth.
//
// Per playbook §1: variation tabs render in AMATEUR FREQUENCY order (most-
// played-first), NOT alphabetical or chronological. This makes the most
// common reply the leftmost pill — what a new student is most likely to
// face. The Lichess Explorer "lichess" DB (amateur games) is the canonical
// source; the "masters" DB skews toward modern theory and would order
// differently.
//
// Usage:
//   node scripts/derive-amateur-tab-order.mjs vienna-game
//   node scripts/derive-amateur-tab-order.mjs ruy-lopez
//   node scripts/derive-amateur-tab-order.mjs --refresh-all
//
// The script:
//   1. Resolves the opening's start PGN from `src/data/repertoire.json`
//   2. Hits Lichess Explorer for that exact position
//   3. Tallies child-move frequencies (Black's reply to the opening's
//      final ply) — these are the candidates for variation tabs
//   4. Prints the frequency-ordered child list with rounded percentages
//   5. Writes/updates `src/data/amateur-tab-orders.json` with the result
//   6. Prints a suggested CURATED block ready to paste

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const REP_PATH = join(REPO_ROOT, 'src/data/repertoire.json');
const SIDECAR_PATH = join(REPO_ROOT, 'src/data/amateur-tab-orders.json');

const LICHESS_TOKEN = process.env.LICHESS_TOKEN ?? null;
const ANON = !LICHESS_TOKEN;

function readEnvLocalToken() {
  for (const p of ['.env.local', '.env']) {
    const fp = join(REPO_ROOT, p);
    if (!existsSync(fp)) continue;
    const txt = readFileSync(fp, 'utf-8');
    const m = txt.match(/^LICHESS_TOKEN=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

function fenForPgn(pgn) {
  const c = new Chess();
  const sans = pgn.split(' ').filter((t) => t && !/^\d+\.$/.test(t));
  for (const san of sans) {
    try { c.move(san); } catch (e) { throw new Error(`illegal SAN "${san}" in PGN prefix`); }
  }
  return c.fen();
}

async function fetchExplorer(pgn) {
  const url = new URL('https://explorer.lichess.ovh/lichess');
  const fen = pgn ? fenForPgn(pgn) : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  url.searchParams.set('fen', fen);
  // Amateur range — typical online-rated band. Adjust if needed.
  url.searchParams.set('speeds', 'blitz,rapid,classical');
  url.searchParams.set('ratings', '1200,1400,1600,1800,2000');
  const headers = {};
  const token = LICHESS_TOKEN ?? readEnvLocalToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lichess Explorer ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  return await res.json();
}

function loadOpening(openingId) {
  const data = JSON.parse(readFileSync(REP_PATH, 'utf-8'));
  const o = data.find((x) => x.id === openingId);
  if (!o) throw new Error(`opening "${openingId}" not in repertoire.json`);
  return o;
}

function loadSidecar() {
  if (!existsSync(SIDECAR_PATH)) return {};
  return JSON.parse(readFileSync(SIDECAR_PATH, 'utf-8'));
}

function saveSidecar(data) {
  writeFileSync(SIDECAR_PATH, JSON.stringify(data, null, 2) + '\n');
}

function longestSharedPrefix(pgns) {
  if (pgns.length === 0) return '';
  const tokenized = pgns.map((p) => p.split(' ').filter((t) => !/^\d+\.$/.test(t)));
  const shortest = Math.min(...tokenized.map((t) => t.length));
  const out = [];
  for (let i = 0; i < shortest; i++) {
    const tok = tokenized[0][i];
    if (tokenized.every((t) => t[i] === tok)) out.push(tok);
    else break;
  }
  return out.join(' ');
}

async function deriveOne(openingId) {
  const opening = loadOpening(openingId);
  // The opening's "start" is the longest shared prefix across ALL its
  // variations — that's the position where variations diverge, which is
  // exactly the position whose replies we want frequency-ranked.
  // repertoire.json's `pgn` field is the FULL taught masterclass line,
  // not the divergence point — we can't use it for Explorer queries.
  const variationPgns = (opening.variations ?? []).map((v) => v.pgn).filter(Boolean);
  const pgn = longestSharedPrefix(variationPgns);
  console.log(`\n═══ ${openingId} — ${opening.name} ═══`);
  console.log(`  Divergence point: ${pgn || '(start position)'}`);
  console.log(`  Variations: ${opening.variations?.length ?? 0}`);

  const data = await fetchExplorer(pgn);
  const totalGames = (data.white ?? 0) + (data.draws ?? 0) + (data.black ?? 0);
  const moves = (data.moves ?? []).map((m) => ({
    san: m.san,
    games: (m.white ?? 0) + (m.draws ?? 0) + (m.black ?? 0),
    pct: 0,
  }));
  moves.forEach((m) => { m.pct = totalGames > 0 ? (m.games / totalGames) * 100 : 0; });
  moves.sort((a, b) => b.games - a.games);

  console.log(`  ${totalGames.toLocaleString()} amateur games in DB`);
  console.log(`  Top replies (amateur frequency):`);
  for (const m of moves.slice(0, 10)) {
    const pct = m.pct.toFixed(1).padStart(5);
    const games = m.games.toLocaleString().padStart(10);
    console.log(`    ${pct}%  ${games} games  ${m.san}`);
  }

  // Map each top reply → the opening's variation that starts with it
  console.log(`\n  Matching variations by reply move:`);
  const orderedVariations = [];
  for (const m of moves) {
    if (!opening.variations) break;
    const prefixLen = pgn ? pgn.split(' ').filter((t) => !/^\d+\.$/.test(t)).length : 0;
    for (const v of opening.variations) {
      if (!v.pgn) continue;
      const vTokens = v.pgn.split(' ').filter((t) => !/^\d+\.$/.test(t));
      const replyMove = vTokens[prefixLen];
      if (replyMove === m.san && !orderedVariations.find((x) => x.id === v.id)) {
        orderedVariations.push({ id: v.id, name: v.name, replyMove: m.san, pct: m.pct, games: m.games });
      }
    }
  }
  for (const v of orderedVariations) {
    console.log(`    ${v.pct.toFixed(1).padStart(5)}%  ${v.replyMove.padEnd(5)}  ${v.name}`);
  }

  // Persist to sidecar
  const sidecar = loadSidecar();
  sidecar[openingId] = {
    openingName: opening.name,
    startPgn: pgn,
    refreshedAt: new Date().toISOString().slice(0, 10),
    totalGamesInDB: totalGames,
    suggestedOrder: orderedVariations.map((v) => ({
      replyMove: v.replyMove,
      pct: Number(v.pct.toFixed(1)),
      games: v.games,
      variationName: v.name,
    })),
  };
  saveSidecar(sidecar);
  console.log(`\n  ✓ Sidecar written: src/data/amateur-tab-orders.json`);
  console.log(`\n  Paste-ready CURATED block:`);
  console.log(`    '${openingId}': [`);
  for (const v of orderedVariations) {
    const label = v.name.replace(/^.*?:\s*/, '').replace(/\s+Variation$/, '');
    console.log(`      { test: /${escapeRegex(v.name.split(/[:,]/)[0])}/i, label: '${label}' },  // ${v.pct.toFixed(1)}% amateur`);
  }
  console.log(`    ],`);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/derive-amateur-tab-order.mjs <openingId> [openingId...]');
    console.log('       node scripts/derive-amateur-tab-order.mjs --refresh-all');
    process.exit(1);
  }

  let openings;
  if (args[0] === '--refresh-all') {
    const sidecar = loadSidecar();
    openings = Object.keys(sidecar);
    if (openings.length === 0) {
      console.log('Sidecar is empty — pass openingIds explicitly the first time.');
      process.exit(1);
    }
  } else {
    openings = args;
  }

  if (ANON) console.log('(running as ANON — slower rate limit. Set LICHESS_TOKEN env or add to .env.local for 4x throughput.)');

  for (const id of openings) {
    try {
      await deriveOne(id);
      // Polite delay between API calls.
      if (openings.length > 1) await new Promise((r) => setTimeout(r, 350));
    } catch (e) {
      console.error(`  ✗ ${id}: ${e.message}`);
    }
  }
}

await main();
