#!/usr/bin/env node
// Source a REAL student-side-win master game for a specific opening variation
// (David 2026-05-30, model-game gap-filling). Seeds the masters explorer on the
// variation's identifying prefix, pulls topGames where the STUDENT's side won,
// fetches the full PGN via the game-export proxy, and prints a ready-to-author
// model-game entry. Never fabricates — every game is real, decisive for the
// student, and verified to follow the variation's line.
//
// Run: node scripts/source-variation-model-game.mjs <openingId> "<variation name>"
import fs from 'node:fs';
import { Chess } from 'chess.js';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const EXPORT = 'https://chess-academy-pro.vercel.app/api/lichess-game-export';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uci = (moves) => { const c = new Chess(); const out = []; for (const m of moves) { let mv; try { mv = c.move(m); } catch { break; } if (!mv) break; out.push(mv.from + mv.to + (mv.promotion || '')); } return out; };
const commonLen = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };

const openingId = process.argv[2];
const varName = process.argv[3];
const rep = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const op = (Array.isArray(rep) ? rep : []).find((o) => o.id === openingId);
if (!op) { console.error('opening not found:', openingId); process.exit(1); }
const variation = (op.variations || []).find((v) => v.name === varName);
if (!variation) { console.error('variation not found:', varName); process.exit(1); }
const studentColor = op.color; // 'white' | 'black'
const wantWin = studentColor === 'white' ? 'white' : 'black';

const varU = uci(variation.pgn.trim().split(/\s+/));
// Identifying prefix vs main + siblings (where this variation becomes unique).
const mainU = uci((op.pgn || '').trim().split(/\s+/));
const sibU = (op.variations || []).filter((v) => v.name !== varName).map((v) => uci(v.pgn.trim().split(/\s+/)));
let maxShared = commonLen(varU, mainU);
for (const s of sibU) maxShared = Math.max(maxShared, commonLen(varU, s));
const idLen = Math.min(maxShared + 1, varU.length);
// Seed a few plies past the identifying point for a meaningful sample.
const seedLen = Math.min(Math.max(idLen, 8), varU.length, 16);
const seedUci = varU.slice(0, seedLen);

console.log(`[source] ${openingId} :: ${varName} — student=${studentColor}, seed ${seedLen} plies, identifying@${idLen}`);
const j = await fetch(`${PROXY}?source=masters&play=${seedUci.join(',')}`).then((r) => r.json()).catch(() => null);
if (!j) { console.error('explorer fetch failed'); process.exit(1); }
const cand = (j.topGames || []).concat(j.recentGames || []).filter((g) => g.id && g.winner === wantWin);
console.log(`  ${cand.length} ${wantWin}-win candidate game(s)`);

const idPrefix = varU.slice(0, idLen);
let chosen = null;
for (const g of cand) {
  await sleep(120);
  const pgn = await fetch(`${EXPORT}?id=${g.id}`).then((r) => r.text()).catch(() => null);
  if (!pgn) continue;
  const c = new Chess(); try { c.loadPgn(pgn); } catch { continue; }
  const gu = uci(c.history());
  if (commonLen(gu, idPrefix) !== idPrefix.length) continue; // must follow the variation
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
