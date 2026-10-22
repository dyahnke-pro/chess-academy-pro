#!/usr/bin/env node
// BUILD THE "CUT THE KING OFF" SCENARIO LIBRARY (Lane R, Level 24 endgame).
//
// Rook and pawn against rook. The student (rook + pawn) is to move; the
// defending king is NOT yet cut off from the pawn; the ONLY moves that keep
// the win are rook moves that cut it off along a FILE (the rook's file
// strictly between the king's and the pawn's), every such rook move wins (no
// "cut" that draws — the miss phrase is then always true), and the natural
// wrong move, pushing the pawn at once, throws the win away.
//
// Two instruments, both on every board:
//   1. The lichess tablebase (Syzygy, exact): the start is a WIN, every move
//      has an exact verdict (no cursed win, no "maybe"), the winning moves are
//      all rook moves that cut the king off, and the one-step pawn push draws.
//   2. Stockfish 18 (one thread, bounded by nodes, one process): after the
//      tablebase's best cut the student stands at ≥ +CUT_MIN; after the push at
//      ≤ +PUSH_MAX. A board the engine does not see the same way is rejected —
//      the claim must hold on both instruments.
//
// Boards are drawn from a seeded shuffle (mulberry32), so a re-run with the
// same arguments writes the same file. The Black-student library is the White
// one mirrored (ranks flipped, colours swapped) and RE-VERIFIED on both
// instruments, not assumed.
//
//   node scripts/scenarios/build-rook-cut-off.mjs [--per-colour 30] [--probe 6]
//
// Writes src/missions/scenarios/rookCutOff.json.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { startEngine, scoreOf } from './lib/engine.mjs';
import { EXACT, flushTablebaseCache, probe } from './lib/tablebase.mjs';
import { after, fenFrom, fileOf, mirrorFen, mirrorUci, mulberry32, pieces, sane, sq } from './lib/board.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const PER_COLOUR = arg('--per-colour', 30);
const PROBE = arg('--probe', 0);
const MAX_TRIES = arg('--max-tries', 20000);
const SEED = 0x2c07_0024;
const NODES = arg('--nodes', 3_000_000);
/** Student's POV, centipawns: the cut must read clearly winning, the push not. */
const CUT_MIN = arg('--cut-min', 200);
const PUSH_MAX = arg('--push-max', 50);
const OUT = resolve('src/missions/scenarios/rookCutOff.json');

/** Is the defending king cut off from the student's pawn by the student's rook
 *  — the rook's file strictly between the king's file and the pawn's, and
 *  nothing of theirs attacking the rook (a rook they can take cuts nothing
 *  off)? The same rule as `kingCutOff` in src/missions/checks/rookCutOff.ts. */
export function cutOff(chess, me) {
  const ps = pieces(chess);
  const rook = ps.find((p) => p.color === me && p.type === 'r');
  const pawn = ps.find((p) => p.color === me && p.type === 'p');
  const king = ps.find((p) => p.color !== me && p.type === 'k');
  if (!rook || !pawn || !king) return false;
  const between = (a, b, x) => Math.min(a, b) < x && x < Math.max(a, b);
  return between(fileOf(king.square), fileOf(pawn.square), fileOf(rook.square))
    && !chess.isAttacked(rook.square, me === 'w' ? 'b' : 'w');
}

function candidate(rand) {
  const pick = (n) => Math.floor(rand() * n);
  const pf = 1 + pick(6);           // b..g
  const pr = 2 + pick(3);           // ranks 3..5
  const P = sq(pf, pr);
  // The student's king beside or behind its pawn.
  const K = sq(Math.min(7, Math.max(0, pf + pick(5) - 2)), Math.min(7, Math.max(0, pr + pick(3) - 2)));
  // The defending king two or three files to the side, level with or ahead of the pawn.
  const side = rand() < 0.5 ? -1 : 1;
  const kf = pf + side * (2 + pick(2));
  const kr = pr + pick(Math.max(1, 8 - pr));
  if (kf < 0 || kf > 7 || kr > 7) return null;
  const k = sq(kf, kr);
  const R = sq(pick(8), pick(8));
  const r = sq(pick(8), pick(8));
  const squares = [P, K, k, R, r];
  if (new Set(squares).size !== squares.length) return null;
  return fenFrom({ [P]: 'P', [K]: 'K', [k]: 'k', [R]: 'R', [r]: 'r' }, 'w');
}

/** The chess.js half of the rule. Null = accepted. */
function boardRule(fen) {
  const c = sane(fen);
  if (!c) return 'illegal, over, or the side not to move in check';
  const me = c.turn();
  const ps = pieces(c);
  const myKing = ps.find((p) => p.type === 'k' && p.color === me);
  if (c.isAttacked(myKing.square, me === 'w' ? 'b' : 'w')) return 'the student starts in check';
  // Nothing attacked either way: move one is never a capture or a rescue.
  if (c.moves({ verbose: true }).some((m) => m.captured)) return 'a capture is on';
  const them = me === 'w' ? 'b' : 'w';
  for (const p of ps) if (p.color === me && p.type !== 'k' && c.isAttacked(p.square, them)) return `the student's ${p.type} on ${p.square} is attacked`;
  if (cutOff(c, me)) return 'the king is already cut off';
  return null;
}

/** The tablebase half. Null = accepted; else why not. */
function tbRule(fen, tb) {
  if (tb.category !== 'win') return `the start is a ${tb.category}`;
  if (tb.moves.some((m) => !EXACT.has(m.category))) return 'a move has an inexact verdict (cursed / maybe)';
  const me = fen.split(' ')[1];
  const wins = tb.moves.filter((m) => m.category === 'loss');
  if (wins.length === 0 || wins.length > 3) return `${wins.length} winning moves`;
  for (const m of wins) {
    const from = new Chess(fen).get(m.uci.slice(0, 2));
    if (from?.type !== 'r') return `a winning move is not a rook move (${m.san})`;
    if (!cutOff(after(fen, m.uci), me)) return `a winning rook move does not cut the king off (${m.san})`;
  }
  for (const m of tb.moves) {
    if (m.category === 'loss') continue;
    if (cutOff(after(fen, m.uci), me)) return `a rook move cuts the king off and does not win (${m.san})`;
  }
  const c = new Chess(fen);
  const pawn = pieces(c).find((p) => p.color === me && p.type === 'p');
  const step = `${pawn.square}${pawn.square[0]}${Number(pawn.square[1]) + (me === 'w' ? 1 : -1)}`;
  const push = tb.moves.find((m) => m.uci === step);
  if (!push) return 'the pawn cannot step';
  if (push.category !== 'draw') return `the push is a ${push.category} for them`;
  return null;
}

async function verify(engine, fen, tb, colour) {
  const wins = tb.moves.filter((m) => m.category === 'loss');
  const me = fen.split(' ')[1];
  const pawn = pieces(new Chess(fen)).find((p) => p.color === me && p.type === 'p');
  const pushUci = `${pawn.square}${pawn.square[0]}${Number(pawn.square[1]) + (me === 'w' ? 1 : -1)}`;
  const best = wins[0].uci;
  // Reads are from the side to move AFTER the move — the coach — so negate.
  const cutRead = await engine.read(after(fen, best).fen(), { nodes: NODES });
  const pushRead = await engine.read(after(fen, pushUci).fen(), { nodes: NODES });
  const cut = cutRead.timedOut ? null : -scoreOf(cutRead);
  const push = pushRead.timedOut ? null : -scoreOf(pushRead);
  const ok = cut !== null && push !== null && cut >= CUT_MIN && push <= PUSH_MAX;
  return {
    ok,
    row: {
      fen,
      wins: wins.map((m) => m.uci),
      push: pushUci,
      sf: { cut, cutDepth: cutRead.depth, push, pushDepth: pushRead.depth },
    },
    why: ok ? null : `Stockfish: after the cut ${cut}, after the push ${push} (${colour})`,
  };
}

async function main() {
  const rand = mulberry32(SEED);
  const engine = await startEngine();
  const out = { w: [], b: [] };
  const rejected = { board: 0, tablebase: 0, engine: 0, mirror: 0 };
  const reasons = {};
  const seen = new Set();
  let tries = 0;
  const target = PROBE || PER_COLOUR;
  while (out.w.length < target && tries < MAX_TRIES) {
    const fen = candidate(rand);
    if (!fen || seen.has(fen)) continue;
    seen.add(fen);
    tries++;
    const why = boardRule(fen);
    if (why) { rejected.board++; continue; }
    const tb = await probe(fen);
    const tbWhy = tbRule(fen, tb);
    if (tbWhy) {
      rejected.tablebase++;
      const k = tbWhy.replace(/\(.*\)/, '').trim();
      reasons[k] = (reasons[k] ?? 0) + 1;
      continue;
    }
    const v = await verify(engine, fen, tb, 'w');
    if (PROBE) console.log(`[probe] ${fen} wins=${v.row.wins.join(',')} push=${v.row.push} sf.cut=${v.row.sf.cut}@${v.row.sf.cutDepth} sf.push=${v.row.sf.push}@${v.row.sf.pushDepth}`);
    if (!v.ok) { rejected.engine++; console.log(`reject ${fen} — ${v.why}`); continue; }
    // The Black student's board: the same position mirrored, re-verified.
    const mfen = mirrorFen(fen);
    const mtb = await probe(mfen);
    const mWhy = boardRule(mfen) ?? tbRule(mfen, mtb);
    const mv = mWhy ? null : await verify(engine, mfen, mtb, 'b');
    const sameWins = mv && mv.row.wins.slice().sort().join() === v.row.wins.map(mirrorUci).sort().join();
    if (!mv || !mv.ok || !sameWins) { rejected.mirror++; console.log(`reject mirror of ${fen} — ${mWhy ?? mv?.why ?? 'the mirrored winning moves differ'}`); continue; }
    out.w.push(v.row);
    out.b.push(mv.row);
    console.log(`${out.w.length}/${target} ${fen} cuts ${v.row.wins.map((u) => u).join(',')} | sf cut ${v.row.sf.cut} push ${v.row.sf.push} (tries ${tries})`);
  }
  engine.quit();
  flushTablebaseCache();
  console.log(JSON.stringify({ tries, rejected, reasons }));
  if (PROBE) return;
  const doc = {
    id: 'rook-cut-off',
    rule: 'R+P vs R; the student to move; legal, nothing attacked, no capture on; the defending king not yet cut off; tablebase: the start wins, every move has an exact verdict, the winning moves (1–3) are all rook moves that cut the king off (the rook file between the king file and the pawn file, the rook not attacked), and no other move cuts it off, the one-step pawn push draws; Stockfish agrees (after the best cut ≥ +CUT_MIN cp for the student, after the push ≤ +PUSH_MAX)',
    instruments: `lichess tablebase (Syzygy) + Stockfish 18 (node_modules/stockfish), 1 thread, ${NODES} nodes per read; CUT_MIN ${CUT_MIN}, PUSH_MAX ${PUSH_MAX}`,
    seed: SEED,
    stats: { tries, rejected },
    w: out.w,
    b: out.b,
  };
  writeFileSync(OUT, `${JSON.stringify(doc, null, 1)}\n`);
  console.log(`wrote ${out.w.length} + ${out.b.length} boards → ${OUT}`);
  if (out.w.length < PER_COLOUR) { console.log('FAILED: short of the target'); process.exitCode = 1; }
}

main().catch((e) => { console.error('FAILED', e); process.exitCode = 1; });
