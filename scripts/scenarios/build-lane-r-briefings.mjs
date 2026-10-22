#!/usr/bin/env node
// THE BRIEFINGS for the two Lane R endgame cards — a demo played out and one
// try — taken from the scenario libraries and the lichess tablebase, never
// typed (Lane R, 2026-10-22). Run after both libraries are built; it adds a
// `briefing` to each library file:
//
//   rook-cut-off    — demo: a library board, its winning cut, then a
//                     tablebase-winning line in which the student pushes the
//                     pawn whenever a push still wins (cut, THEN push), the
//                     defence the tablebase's longest; until the pawn has
//                     stepped twice (≤ 12 plies). Try: another library board;
//                     its answers are the board's winning cuts.
//   wrong-rook-pawn — demo: a library board, the corner-ward drawing move, the
//                     coach's reply that brings its king nearest the corner,
//                     until the student's king stands in the corner. Try:
//                     another board; its answers are its drawing moves.
//
// Every demo move is checked by chess.js and its verdict by the tablebase
// (the student's moves keep the result the card claims).
//   node scripts/scenarios/build-lane-r-briefings.mjs [--only rook-cut-off | --only wrong-rook-pawn]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { probe, flushTablebaseCache } from './lib/tablebase.mjs';
import { cheb, pieces } from './lib/board.mjs';
import { cornerOf } from './lib/wrongRookPawn.mjs';

const RCO = resolve('src/missions/scenarios/rookCutOff.json');
const WRP = resolve('src/missions/scenarios/wrongRookPawn.json');

const play = (c, uci) => c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

async function cutDemo(row) {
  const c = new Chess(row.fen);
  const me = c.turn();
  const sans = [play(c, row.wins[0]).san];
  let steps = 0;
  while (sans.length < 12 && steps < 2 && !c.isGameOver()) {
    const tb = await probe(c.fen());
    if (c.turn() === me) {
      if (tb.category !== 'win') throw new Error(`demo left the win at ${c.fen()}`);
      const wins = tb.moves.filter((m) => m.category === 'loss');
      const push = wins.find((m) => pieces(c).some((p) => p.square === m.uci.slice(0, 2) && p.type === 'p'));
      const pick = push ?? wins[0];
      if (push) steps++;
      sans.push(play(c, pick.uci).san);
    } else {
      // The longest defence: the reply whose loss is furthest away.
      const replies = [...tb.moves].sort((a, b) => Math.abs(b.dtz ?? 0) - Math.abs(a.dtz ?? 0));
      sans.push(play(c, replies[0].uci).san);
    }
  }
  return sans;
}

async function cornerDemo(row) {
  const c = new Chess(row.fen);
  const me = c.turn();
  const pawn = pieces(c).find((p) => p.color !== me && p.type === 'p');
  const corner = cornerOf(pawn.square.charCodeAt(0) - 97, me === 'w' ? 'b' : 'w');
  const sans = [];
  let uci = row.draws[0];
  while (sans.length < 12) {
    sans.push(play(c, uci).san);
    const king = pieces(c).find((p) => p.type === 'k' && p.color === me).square;
    if (king === corner) break;
    // The coach: the move that brings its king nearest the corner (its most
    // natural try), then chess.js order.
    const tries = c.moves({ verbose: true }).map((m) => {
      const t = new Chess(c.fen()); t.move(m);
      return { m, d: cheb(pieces(t).find((p) => p.type === 'k' && p.color !== me).square, corner), over: t.isGameOver() };
    }).filter((x) => !x.over).sort((a, b) => a.d - b.d);
    if (tries.length === 0) throw new Error(`no coach move at ${c.fen()}`);
    sans.push(c.move(tries[0].m).san);
    const tb = await probe(c.fen());
    if (tb.category !== 'draw') throw new Error(`demo is not a draw at ${c.fen()}`);
    const draws = tb.moves.filter((m) => m.category === 'draw')
      .sort((a, b) => cheb(a.uci.slice(2, 4), corner) - cheb(b.uci.slice(2, 4), corner) || (a.uci < b.uci ? -1 : 1));
    uci = draws[0].uci;
  }
  const king = pieces(c).find((p) => p.type === 'k' && p.color === me).square;
  if (king !== corner) throw new Error(`demo from ${row.fen} never reached the corner`);
  return sans;
}

const ONLY = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? process.argv[i + 1] : null; })();

async function main() {
  if (ONLY !== 'wrong-rook-pawn') await rookCutOff();
  if (ONLY !== 'rook-cut-off') await wrongRookPawn();
  flushTablebaseCache();
}

async function rookCutOff() {
  const rco = JSON.parse(readFileSync(RCO, 'utf8'));
  const demoRow = rco.w[0];
  rco.briefing = {
    demoFen: demoRow.fen,
    demoSans: await cutDemo(demoRow),
    tryFen: rco.w[1].fen,
    tryAnswersUci: rco.w[1].wins,
  };
  writeFileSync(RCO, `${JSON.stringify(rco, null, 1)}\n`);
  console.log('rook-cut-off', JSON.stringify(rco.briefing));
}

async function wrongRookPawn() {
  const wrp = JSON.parse(readFileSync(WRP, 'utf8'));
  // The demo: a board two steps out, so the walk is short and clear.
  const two = (row) => {
    const c = new Chess(row.fen);
    const me = c.turn();
    const pawn = pieces(c).find((p) => p.color !== me && p.type === 'p');
    const k = pieces(c).find((p) => p.type === 'k' && p.color === me).square;
    return cheb(k, cornerOf(pawn.square.charCodeAt(0) - 97, me === 'w' ? 'b' : 'w'));
  };
  const demo = wrp.b.find((r) => two(r) === 2) ?? wrp.b[0];
  const tryRow = wrp.b.find((r) => r !== demo && r.draws.length <= 2) ?? wrp.b[1];
  wrp.briefing = {
    demoFen: demo.fen,
    demoSans: await cornerDemo(demo),
    tryFen: tryRow.fen,
    tryAnswersUci: tryRow.draws,
  };
  writeFileSync(WRP, `${JSON.stringify(wrp)}\n`);
  console.log('wrong-rook-pawn', JSON.stringify(wrp.briefing));
}

main().catch((e) => { console.error('FAILED', e); process.exitCode = 1; });
