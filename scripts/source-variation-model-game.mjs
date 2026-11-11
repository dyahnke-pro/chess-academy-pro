#!/usr/bin/env node
// Source a REAL student-side-win master game for a specific opening variation
// (David 2026-05-30, model-game gap-filling). Seeds the masters explorer on the
// variation's identifying prefix, pulls topGames where the STUDENT's side won,
// fetches the full PGN via the game-export proxy, and prints a ready-to-author
// model-game entry. Never fabricates — every game is real, decisive for the
// student, and checked against the ONE model-game variation classifier
// (src/data/modelGameVariation.shared.mjs) so the game it picks is one the
// tagging script files under this tab.
//
// Run: node scripts/source-variation-model-game.mjs <openingId> "<variation name>"
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { analyzeOpening, classifyGame } from '../src/data/modelGameVariation.shared.mjs';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const EXPORT = 'https://chess-academy-pro.vercel.app/api/lichess-game-export';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const openingId = process.argv[2];
const varName = process.argv[3];
const rep = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const op = (Array.isArray(rep) ? rep : []).find((o) => o.id === openingId);
if (!op) { console.error('opening not found:', openingId); process.exit(1); }
const variation = (op.variations || []).find((v) => v.name === varName);
if (!variation) { console.error('variation not found:', varName); process.exit(1); }
const studentColor = op.color; // 'white' | 'black'
const wantWin = studentColor === 'white' ? 'white' : 'black';

// The classifier's reading of this opening: the variation's moves and the
// ply where its move order becomes its own (vs main + siblings).
const analysis = analyzeOpening(op);
const analyzed = analysis.variations.find((v) => v.name === varName);
if (!analyzed) { console.error('variation has no legal moves:', varName); process.exit(1); }
const varU = analyzed.uci;
const idLen = analyzed.moveId;
// Seed a few plies past the identifying point for a meaningful sample.
const seedLen = Math.min(Math.max(idLen, 8), varU.length, 16);
const seedUci = varU.slice(0, seedLen);

console.log(`[source] ${openingId} :: ${varName} — student=${studentColor}, seed ${seedLen} plies, identifying@${idLen}`);
const j = await fetch(`${PROXY}?source=masters&play=${seedUci.join(',')}`).then((r) => r.json()).catch(() => null);
if (!j) { console.error('explorer fetch failed'); process.exit(1); }
const cand = (j.topGames || []).concat(j.recentGames || []).filter((g) => g.id && g.winner === wantWin);
console.log(`  ${cand.length} ${wantWin}-win candidate game(s)`);

// Keep only games the classifier files under THIS tab — by position as well as
// move order — so the printed entry's `variation` is the tag it will carry.
let chosen = null;
for (const g of cand) {
  await sleep(120);
  const pgn = await fetch(`${EXPORT}?id=${g.id}`).then((r) => r.text()).catch(() => null);
  if (!pgn) continue;
  const c = new Chess(); try { c.loadPgn(pgn); } catch { continue; }
  if (classifyGame(c.history(), analysis)?.name !== varName) continue; // must file under this tab
  const W = (pgn.match(/\[White "([^"]+)"\]/) || [])[1] || '?';
  const B = (pgn.match(/\[Black "([^"]+)"\]/) || [])[1] || '?';
  const we = parseInt((pgn.match(/\[WhiteElo "(\d+)"\]/) || [])[1] || '0', 10);
  const be = parseInt((pgn.match(/\[BlackElo "(\d+)"\]/) || [])[1] || '0', 10);
  const oppElo = studentColor === 'white' ? be : we;
  const moves = c.history().join(' ');
  const ev = (pgn.match(/\[Event "([^"]+)"\]/) || [])[1] || '';
  const yr = parseInt((pgn.match(/\[Date "(\d{4})/) || [])[1] || '0', 10);
  if (!chosen || oppElo > chosen.oppElo || (oppElo === chosen.oppElo && c.history().length > chosen.plies)) {
    chosen = { id: g.id, W, B, we, be, oppElo, result: g.winner === 'white' ? '1-0' : '0-1', ev, yr, moves, plies: c.history().length };
  }
}
if (!chosen) { console.log('  NO real student-win game follows this variation — leave the tab empty (self-hides).'); process.exit(0); }
console.log(`\n=== CHOSEN: ${chosen.W} (${chosen.we}) vs ${chosen.B} (${chosen.be}) — ${chosen.result} (${chosen.ev} ${chosen.yr}) [${chosen.id}] ${chosen.plies} plies ===`);
console.log(JSON.stringify({
  id: `mg-${openingId}-${varName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
  openingId, white: chosen.W, black: chosen.B, whiteElo: chosen.we || null, blackElo: chosen.be || null,
  result: chosen.result, year: chosen.yr, event: chosen.ev, studentSide: studentColor, variation: varName,
  pgn: chosen.moves,
}, null, 1));
