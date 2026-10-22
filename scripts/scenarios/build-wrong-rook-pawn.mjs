#!/usr/bin/env node
// BUILD THE "WRONG ROOK PAWN" SCENARIO LIBRARY (Lane R, Level 22 endgame).
//
// King, bishop and rook pawn against a bare king, the bishop the WRONG colour
// for the pawn's promotion square. The student DEFENDS (the bare king) and is
// to move: two or three king steps from the corner, a race the coach's king
// can still win — at least one natural move loses — and running for the
// corner holds.
//
// Two instruments on every board:
//   1. The lichess tablebase (Syzygy, exact): the start is a DRAW, every move
//      has an exact verdict, at least one move LOSES, every drawing move keeps
//      or shrinks the king's distance to the corner (and one shrinks it).
//   2. Stockfish 18 (one thread, bounded nodes, one process): after the
//      corner-ward drawing move the student reads ≥ -DRAW_MAX (150 cp: the
//      coach is a bishop and a pawn up and the engine sees no win — measured
//      -0.5 to -0.7); after the natural wrong move (the losing move nearest
//      their pawn — chasing it) ≤ -LOSE_MIN (in practice a forced mate).
//      A board the engine does not read the same way is rejected.
//
// THE VERDICT TREE — what the live check judges (pure chess.js, no engine):
// for each drawing first move and EVERY coach reply to it, the tablebase's
// drawing moves at the student's second decision. Every node is verified
// (the position a draw, every corner step among its drawing moves — the
// fortress, `prove-wrong-rook-pawn-fortress.mjs`).
//
// The White-student library is the Black one mirrored (ranks flipped, colours
// swapped) and RE-VERIFIED on both instruments, node by node.
//
//   node scripts/scenarios/build-wrong-rook-pawn.mjs [--stage-target 22]          # stage one: tablebase + trees (no engine)
//   node scripts/scenarios/build-wrong-rook-pawn.mjs --stage-engine [--per-colour 14]  # stage two: Stockfish, writes the library
//   node scripts/scenarios/build-wrong-rook-pawn.mjs --tb-only --probe 12          # count candidates only
//
// Writes src/missions/scenarios/wrongRookPawn.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { startEngine, scoreOf } from './lib/engine.mjs';
import { EXACT, flushTablebaseCache, probe } from './lib/tablebase.mjs';
import { after, cheb, fenFrom, mirrorFen, mirrorUci, mulberry32, pieces, sane, sq, uciOf } from './lib/board.mjs';
import { cornerOf, isLight } from './lib/wrongRookPawn.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const PER_COLOUR = arg('--per-colour', 14);
const PROBE = arg('--probe', 0);
/** Tablebase only: count how many candidates pass, read no engine, build no tree. */
const TB_ONLY = process.argv.includes('--tb-only');
/** Stage one stages more than it needs: the engine may still reject some. */
const STAGE_TARGET = arg('--stage-target', 22);
const CANDS = process.env.WRP_CANDIDATES ?? join(tmpdir(), 'wrong-rook-pawn.candidates.json');
const MAX_TRIES = arg('--max-tries', 6000);
const SEED = 0x2c07_0022;
const NODES = arg('--nodes', 2_000_000);
/** Student's POV, centipawns. */
const DRAW_MAX = arg('--draw-max', 150);
const LOSE_MIN = arg('--lose-min', 300);
/** The most coach-reply nodes a board's tree may hold (keeps the file small). */
const MAX_NODES = arg('--max-nodes', 80);
const OUT = resolve('src/missions/scenarios/wrongRookPawn.json');

/** The student's (defender's) king square and the coach's rook pawn's corner. */
function geometry(chess, student) {
  const ps = pieces(chess);
  const coach = student === 'w' ? 'b' : 'w';
  const king = ps.find((p) => p.color === student && p.type === 'k');
  const pawn = ps.find((p) => p.color === coach && p.type === 'p');
  const bishop = ps.find((p) => p.color === coach && p.type === 'b');
  const corner = pawn ? cornerOf(pawn.square.charCodeAt(0) - 97, coach) : null;
  return { king, pawn, bishop, corner };
}

function candidate(rand) {
  const pick = (n) => Math.floor(rand() * n);
  // Canonical: the coach is White, the student Black.
  const file = rand() < 0.5 ? 7 : 0;
  const corner = cornerOf(file, 'w');
  const P = sq(file, 2 + pick(4)); // ranks 3–6
  const d = 2 + pick(2);
  // The student's king d steps from the corner (Chebyshev), on the board.
  const kSquares = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) if (cheb(sq(f, r), corner) === d) kSquares.push(sq(f, r));
  const k = kSquares[pick(kSquares.length)];
  // The coach's king within four steps of the corner — a race, not a stroll.
  const near = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) if (cheb(sq(f, r), corner) <= 4) near.push(sq(f, r));
  const K = near[pick(near.length)];
  const wrong = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) if (isLight(sq(f, r)) !== isLight(corner)) wrong.push(sq(f, r));
  const B = wrong[pick(wrong.length)];
  const squares = [P, k, K, B];
  if (new Set(squares).size !== squares.length) return null;
  return fenFrom({ [P]: 'P', [K]: 'K', [B]: 'B', [k]: 'k' }, 'b');
}

function boardRule(fen) {
  const c = sane(fen);
  if (!c) return 'illegal, over, or the side not to move in check';
  if (c.inCheck()) return 'the student starts in check';
  if (c.moves({ verbose: true }).some((m) => m.captured)) return 'a capture is on';
  const g = geometry(c, c.turn());
  if (!g.pawn || !g.bishop) return 'material';
  if (isLight(g.bishop.square) === isLight(g.corner)) return 'the right bishop';
  const d = cheb(g.king.square, g.corner);
  if (d < 2 || d > 3) return `the king ${d} from the corner`;
  return null;
}

/** Order drawing moves: nearest the corner first, then UCI. */
function cornerOrder(fen, moves) {
  const c = new Chess(fen);
  const { corner } = geometry(c, c.turn());
  return [...moves].sort((a, b) => cheb(a.slice(2, 4), corner) - cheb(b.slice(2, 4), corner) || (a < b ? -1 : 1));
}

function tbRule(fen, tb) {
  if (tb.category !== 'draw') return `the start is a ${tb.category}`;
  if (tb.moves.some((m) => !EXACT.has(m.category))) return 'an inexact verdict';
  const c = new Chess(fen);
  const { king, pawn, bishop, corner } = geometry(c, c.turn());
  const d0 = cheb(king.square, corner);
  const draws = tb.moves.filter((m) => m.category === 'draw').map((m) => m.uci);
  const losses = tb.moves.filter((m) => m.category === 'win').map((m) => m.uci);
  if (losses.length === 0) return 'no move loses';
  if (draws.length === 0) return 'no move draws';
  if (draws.some((u) => cheb(u.slice(2, 4), corner) > d0)) return 'a drawing move steps away from the corner';
  if (!draws.some((u) => cheb(u.slice(2, 4), corner) < d0)) return 'no drawing move nears the corner';
  // The natural wrong move: the losing move nearest their pawn (chasing it),
  // then nearest their bishop.
  const wrong = [...losses].sort((a, b) =>
    cheb(a.slice(2, 4), pawn.square) - cheb(b.slice(2, 4), pawn.square)
    || cheb(a.slice(2, 4), bishop.square) - cheb(b.slice(2, 4), bishop.square)
    || (a < b ? -1 : 1))[0];
  return { draws: cornerOrder(fen, draws), wrong };
}

/** The student's second decision after every coach reply to each drawing first move. */
async function buildTree(fen, draws) {
  const tree = {};
  let nodes = 0;
  for (const m1 of draws) {
    const b1 = after(fen, m1);
    const branch = {};
    for (const r of b1.moves({ verbose: true })) {
      const b2 = new Chess(b1.fen());
      b2.move(r);
      if (b2.isGameOver()) continue;
      const tb = await probe(b2.fen());
      if (tb.category !== 'draw') throw new Error(`tree node ${b2.fen()} is a ${tb.category} after a drawing move`);
      if (tb.moves.some((m) => !EXACT.has(m.category))) return { error: 'an inexact node' };
      const d2 = tb.moves.filter((m) => m.category === 'draw').map((m) => m.uci);
      // The fortress, seen node by node: every step into the corner draws.
      const { corner } = geometry(b2, b2.turn());
      for (const m of b2.moves({ verbose: true })) {
        if (m.to === corner && !d2.includes(uciOf(m))) throw new Error(`${b2.fen()}: stepping into the corner ${m.san} is not a draw — the fortress claim is wrong`);
      }
      branch[uciOf(r)] = cornerOrder(b2.fen(), d2);
      nodes++;
    }
    tree[m1] = branch;
  }
  return { tree, nodes };
}

async function verify(engine, fen, draws, wrong) {
  // Reads are from the side to move after the move — the coach — so negate.
  const rightRead = await engine.read(after(fen, draws[0]).fen(), { nodes: NODES });
  const wrongRead = await engine.read(after(fen, wrong).fen(), { nodes: NODES });
  const right = rightRead.timedOut ? null : -scoreOf(rightRead);
  const lost = wrongRead.timedOut ? null : -scoreOf(wrongRead);
  const ok = right !== null && lost !== null && right >= -DRAW_MAX && lost <= -LOSE_MIN;
  return { ok, sf: { right, rightDepth: rightRead.depth, wrong: lost, wrongDepth: wrongRead.depth } };
}

const mirrorTree = (tree) => Object.fromEntries(Object.entries(tree).map(([m1, branch]) => [
  mirrorUci(m1), Object.fromEntries(Object.entries(branch).map(([r, d2]) => [mirrorUci(r), d2.map(mirrorUci)])),
]));
const sortedJson = (tree) => JSON.stringify(Object.keys(tree).sort().map((m1) => [m1, Object.keys(tree[m1]).sort().map((r) => [r, [...tree[m1][r]].sort()])]));

/** Stage one (network only): candidates that pass the board and tablebase
 *  rules, with their verdict trees, both colours — no engine. */
async function stageTablebase(target) {
  const rand = mulberry32(SEED);
  const out = [];
  const rejected = { board: 0, tablebase: 0, tree: 0, mirror: 0 };
  const reasons = {};
  const seen = new Set();
  let tries = 0;
  while (out.length < target && tries < MAX_TRIES) {
    const fen = candidate(rand);
    if (!fen || seen.has(fen)) continue;
    seen.add(fen);
    tries++;
    if (boardRule(fen)) { rejected.board++; continue; }
    const tb = await probe(fen);
    const t = tbRule(fen, tb);
    if (typeof t === 'string') { rejected.tablebase++; reasons[t] = (reasons[t] ?? 0) + 1; continue; }
    if (TB_ONLY) { out.push({ fen }); console.log(`[tb] ${out.length} ${fen} draws=${t.draws.join(',')} wrong=${t.wrong} (tries ${tries})`); continue; }
    const built = await buildTree(fen, t.draws);
    if (built.error || built.nodes > MAX_NODES) { rejected.tree++; console.log(`reject ${fen} — tree ${built.error ?? `${built.nodes} nodes`}`); continue; }
    // The White student's board: the same draws and the same wrong move,
    // mirrored — checked against the mirrored board's own tablebase verdicts
    // (UCI order is not mirror-safe, so sets are compared and the teaching
    // order is carried over), and its tree rebuilt from the tablebase.
    const mfen = mirrorFen(fen);
    const mWhy = boardRule(mfen);
    const mtb = mWhy ? null : await probe(mfen);
    const mt = mtb ? tbRule(mfen, mtb) : mWhy;
    const mDraws = t.draws.map(mirrorUci);
    const mWrong = mirrorUci(t.wrong);
    const sameSet = (a, b) => [...a].sort().join() === [...b].sort().join();
    if (typeof mt === 'string' || !sameSet(mt.draws, mDraws) || mtb.moves.find((m) => m.uci === mWrong)?.category !== 'win') {
      rejected.mirror++; console.log(`reject mirror of ${fen} — ${typeof mt === 'string' ? mt : 'verdicts differ'}`); continue;
    }
    const mbuilt = await buildTree(mfen, mDraws);
    if (mbuilt.error || sortedJson(mbuilt.tree) !== sortedJson(mirrorTree(built.tree))) {
      rejected.mirror++; console.log(`reject mirror of ${fen} — the mirrored tree differs`); continue;
    }
    out.push({
      b: { fen, draws: t.draws, wrong: t.wrong, tree: built.tree },
      w: { fen: mfen, draws: mDraws, wrong: mWrong, tree: mbuilt.tree },
      nodes: built.nodes,
    });
    console.log(`[tb] ${out.length}/${target} ${fen} draws ${t.draws.join(',')} wrong ${t.wrong} | ${built.nodes} nodes (tries ${tries})`);
    if (out.length % 3 === 0) writeFileSync(CANDS, JSON.stringify({ tries, rejected, reasons, out }));
  }
  flushTablebaseCache();
  writeFileSync(CANDS, JSON.stringify({ tries, rejected, reasons, out }));
  console.log(JSON.stringify({ tries, rejected, reasons }));
  console.log(`staged ${out.length} candidates → ${CANDS}`);
}

/** Stage two (one Stockfish): read every staged candidate, both colours;
 *  keep the first PER_COLOUR the engine reads the same way, write the library. */
async function stageEngine() {
  const staged = JSON.parse(readFileSync(CANDS, 'utf8'));
  const engine = await startEngine();
  const out = { w: [], b: [] };
  let engineRejects = 0;
  for (const c of staged.out) {
    if (out.b.length >= PER_COLOUR) break;
    const v = await verify(engine, c.b.fen, c.b.draws, c.b.wrong);
    const mv = v.ok ? await verify(engine, c.w.fen, c.w.draws, c.w.wrong) : null;
    if (!v.ok || !mv.ok) { engineRejects++; console.log(`reject ${c.b.fen} — Stockfish ${JSON.stringify(v.sf)} ${mv ? JSON.stringify(mv.sf) : ''}`); continue; }
    out.b.push({ ...c.b, sf: v.sf });
    out.w.push({ ...c.w, sf: mv.sf });
    console.log(`${out.b.length}/${PER_COLOUR} ${c.b.fen} | sf right ${v.sf.right}/${mv.sf.right} wrong ${v.sf.wrong}/${mv.sf.wrong}`);
  }
  engine.quit();
  const doc = {
    id: 'wrong-rook-pawn',
    rule: 'K+B+rook pawn vs bare K, the bishop the wrong colour for the promotion square; the student (bare king) to move, two or three king steps from the corner; tablebase: the start draws, every move exact, at least one move loses, every drawing move keeps or shrinks the distance to the corner and one shrinks it; Stockfish agrees (after the corner-ward move >= -DRAW_MAX cp for the student, after the natural wrong move <= -LOSE_MIN); tree: the tablebase drawing moves at the second decision after EVERY coach reply to each drawing first move',
    instruments: `lichess tablebase (Syzygy) + Stockfish 18 (node_modules/stockfish), 1 thread, ${NODES} nodes per read; DRAW_MAX ${DRAW_MAX}, LOSE_MIN ${LOSE_MIN}`,
    seed: SEED,
    stats: { tries: staged.tries, rejected: { ...staged.rejected, engine: engineRejects }, staged: staged.out.length },
    w: out.w,
    b: out.b,
  };
  writeFileSync(OUT, `${JSON.stringify(doc)}\n`);
  console.log(`wrote ${out.w.length} + ${out.b.length} boards → ${OUT}`);
  if (out.b.length < PER_COLOUR) { console.log('FAILED: short of the target'); process.exitCode = 1; }
}

async function main() {
  if (process.argv.includes('--stage-engine')) return stageEngine();
  return stageTablebase(PROBE || STAGE_TARGET);
}

main().catch((e) => { console.error('FAILED', e); process.exitCode = 1; });
