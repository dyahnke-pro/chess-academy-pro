// pieceOptions — "couldn't he just move the queen?" answered the way a strong
// coach answers it (WO-DANYA-01 C, David 2026-09-24: "I also like the question
// about moving the queen … I want coach to be able to answer the question in
// the same manner").
//
// The shape, from the Nimzo-Larsen master class: he does not list every queen
// move. He asks what the piece is DOING ("where can the queen go and still
// guard the bishop?"), narrows to the squares that keep that job, answers each
// with the reply that refutes it (a short line, to its result), and closes on a
// verdict. Every step is computed here:
//  - the DUTY is board fact: the friendly pieces this piece defends that the
//    enemy attacks — lose the defender and they hang;
//  - the OPTIONS are the piece's legal moves that keep every duty (or, with no
//    duty, the moves that take it out of attack; else all of its moves);
//  - each option's REFUTATION is the engine's reply line in the position after
//    it, cut to the point it proves (`proofCut`);
//  - the VERDICT compares the best option with the move actually played.
// G0: the model never sees a choice — this returns the facts and the lines.
// One engine read per option (not a per-ply playout), so a chat answer stays
// fast; the lines are the engine's own PV.

import { Chess, type Color, type Square, type PieceSymbol } from 'chess.js';
import type { PvEngine } from './pvPlayback';
import type { WalkableLine, WalkPly } from '../types';
import { proofCut, describeProofResult } from './exchangeLedger';
import { andList } from '../utils/andList';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MATE_CP = 100000;
/** An option is "just as good" as what was played inside this band. */
const SAME_BAND_CP = 50;

export type Seat = 'student' | 'opponent';


export interface PieceOption {
  san: string;
  /** Eval after this option, from the MOVER's point of view (cp; mate ±MATE_CP). */
  moverCp: number;
  /** The refutation sentence ("Then O-O, and the rook on e8 falls — they win the exchange"), or null. */
  refutation: string | null;
  line: WalkableLine;
}

export interface PieceOptionsAnswer {
  seat: Seat;
  piece: PieceSymbol;
  from: string;
  /** Squares of the pieces it guards (its duty), empty when none. */
  duty: string[];
  /** Why the options were narrowed ('duty' | 'escape' | 'all'). */
  narrowedBy: 'duty' | 'escape' | 'all';
  options: PieceOption[];
  /** The move actually played from this position, when there was one. */
  playedSan: string | null;
  facts: string;
  lines: WalkableLine[];
}

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }

/** Friendly (non-king) pieces `from` defends that the enemy attacks. */
export function dutiesOf(fen: string, from: Square): Square[] {
  const c = new Chess(fen);
  const me = c.get(from);
  if (!me) return [];
  const out: Square[] = [];
  for (const row of c.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== me.color || cell.square === from || cell.type === 'k') continue;
      if (!c.isAttacked(cell.square, other(me.color))) continue;
      if (c.attackers(cell.square, me.color).includes(from)) out.push(cell.square);
    }
  }
  return out;
}

function keepsDuties(fen: string, uci: string, duties: readonly Square[]): boolean {
  const c = new Chess(fen);
  const mover = c.turn();
  try { c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return false; }
  const to = uci.slice(2, 4) as Square;
  return duties.every((sq) => c.get(sq)?.color === mover && c.attackers(sq, mover).includes(to));
}

function walk(startFen: string, ucis: readonly string[], label: string): WalkableLine {
  const c = new Chess(startFen);
  const plies: WalkPly[] = [];
  for (const u of ucis) {
    const fenBefore = c.fen();
    try {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      plies.push({ san: m.san, uci: u, fenBefore, fenAfter: c.fen() });
    } catch { break; }
  }
  return { label, startFen, plies };
}

function moverPov(whiteCp: number, isMate: boolean, mateIn: number | null, mover: Color): number {
  const cp = isMate && mateIn !== null ? (mateIn > 0 ? MATE_CP : -MATE_CP) : whiteCp;
  return mover === 'w' ? cp : -cp;
}

/** The reply line cut to what it proves AGAINST the side that chose the
 *  option — or null when it proves nothing against it. The 2026-09-24 local
 *  run said "Qe2? Then … Rxd3 and cxd3 — you come out behind" about THEIR
 *  queen move: the line was real, but it showed the option WORKING, so reading
 *  it as a refutation said the opposite of the truth. */
function refutationOf(fenAfter: string, pvSans: readonly string[], studentWB: 'w' | 'b', optionMover: Color): string | null {
  const proof = proofCut(fenAfter, pvSans, studentWB);
  if (!proof) return null;
  const moves = andList(pvSans.slice(0, proof.plies));
  // The line opens with the REPLY, so the replier delivers mate on an odd ply.
  if (proof.mate) return proof.plies % 2 === 1 ? `Then ${moves} — and it's mate` : null;
  if (!proof.ledger) return null;
  const studentAhead = proof.ledger.netPawns > 0;
  const againstMover = optionMover === studentWB ? !studentAhead : studentAhead;
  return againstMover ? `Then ${moves} — ${describeProofResult(proof.ledger)}` : null;
}

/**
 * Answer "could X just move?" at `fen` (the decision position: the mover is
 * the side to move). `pieceSquare` names the piece; `playedUci` is what was
 * actually played from here, when the question is about a past decision.
 */
export async function computePieceOptions(input: {
  fen: string;
  pieceSquare: Square;
  seat: Seat;
  studentColor: 'white' | 'black';
  playedUci: string | null;
  engine: PvEngine;
  /** More engines to spread the options over — the options are independent,
   *  so N engines answer in about 1/N of the time. */
  extraEngines?: readonly PvEngine[];
  depth?: number;
}): Promise<PieceOptionsAnswer | null> {
  let c: Chess;
  try { c = new Chess(input.fen); } catch { return null; }
  const piece = c.get(input.pieceSquare);
  const mover = c.turn();
  if (!piece || piece.color !== mover) return null;
  const studentWB: 'w' | 'b' = input.studentColor === 'white' ? 'w' : 'b';
  const depth = input.depth ?? 12;

  const moves = c.moves({ square: input.pieceSquare, verbose: true });
  if (moves.length === 0) {
    // "Couldn't the rook just move?" — it couldn't: no legal move at all. That
    // IS the answer, not a reason to fall through to the best move.
    const who = `${whose(input.seat)} ${NAME[piece.type]} on ${input.pieceSquare}`;
    return {
      seat: input.seat, piece: piece.type, from: input.pieceSquare, duty: [], narrowedBy: 'all',
      options: [], playedSan: null, lines: [],
      facts: `${who[0].toUpperCase()}${who.slice(1)} had no legal move — it couldn't go anywhere.`,
    };
  }
  const duty = dutiesOf(input.fen, input.pieceSquare);
  const attacked = c.isAttacked(input.pieceSquare, other(mover));
  let narrowedBy: PieceOptionsAnswer['narrowedBy'] = 'all';
  let pool = moves;
  if (duty.length > 0) {
    narrowedBy = 'duty';
    pool = moves.filter((m) => keepsDuties(input.fen, `${m.from}${m.to}${m.promotion ?? ''}`, duty));
  } else if (attacked) {
    narrowedBy = 'escape';
    pool = moves.filter((m) => {
      const t = new Chess(input.fen);
      t.move(m.san);
      return !t.isAttacked(m.to, other(mover));
    });
  }

  const engines = [input.engine, ...(input.extraEngines ?? [])];
  const options: PieceOption[] = [];
  let playedSan: string | null = null;
  let playedCp: number | null = null;
  // One job per option, plus the move actually played — independent reads,
  // spread over every engine at hand through one shared queue.
  type Job = { kind: 'option'; m: (typeof pool)[number] } | { kind: 'played'; uci: string };
  const jobs: Job[] = [...pool.map((m) => ({ kind: 'option' as const, m })), ...(input.playedUci ? [{ kind: 'played' as const, uci: input.playedUci }] : [])];
  let next = 0;
  const runLane = async (engine: PvEngine): Promise<void> => {
    while (next < jobs.length) {
      const job = jobs[next];
      next += 1;
      if (job.kind === 'played') {
        const t = new Chess(input.fen);
        try {
          playedSan = t.move({ from: job.uci.slice(0, 2), to: job.uci.slice(2, 4), promotion: job.uci[4] }).san;
          const a = await engine.analyzePosition(t.fen(), depth);
          playedCp = moverPov(a.evaluation, a.isMate, a.mateIn, mover);
        } catch { /* the verdict falls back to the options alone */ }
        continue;
      }
      const m = job.m;
      const t = new Chess(input.fen);
      t.move(m.san);
      const fenAfter = t.fen();
      let a;
      try { a = await engine.analyzePosition(fenAfter, depth); } catch { continue; }
      const pv = a.topLines?.[0]?.moves ?? (a.bestMove ? [a.bestMove] : []);
      const uci = `${m.from}${m.to}${m.promotion ?? ''}`;
      const line = walk(input.fen, [uci, ...pv], m.san);
      const pvSans = line.plies.slice(1).map((p) => p.san);
      options.push({
        san: m.san,
        moverCp: moverPov(a.evaluation, a.isMate, a.mateIn, mover),
        refutation: refutationOf(fenAfter, pvSans, studentWB, mover),
        line,
      });
    }
  };
  await Promise.all(engines.map(runLane));
  options.sort((x, y) => y.moverCp - x.moverCp);

  const facts = renderPieceOptions({
    seat: input.seat, piece: piece.type, from: input.pieceSquare, duty, narrowedBy,
    options, playedSan, playedCp, allMoves: moves.length,
  });
  // With nothing narrowing the options, the answer is the BEST one against
  // what was played — listing every square would be a tour, not a lesson.
  const spoken = narrowedBy === 'all' ? options.slice(0, 1) : options;
  return {
    seat: input.seat, piece: piece.type, from: input.pieceSquare, duty, narrowedBy,
    options, playedSan, facts, lines: spoken.map((o) => o.line),
  };
}

function whose(seat: Seat): string { return seat === 'student' ? 'your' : 'their'; }

/** The spoken answer, in the order he gives it: the job, the squares that keep
 *  it, each square's refutation, the verdict. Pure, so it is testable without
 *  an engine. */
export function renderPieceOptions(a: {
  seat: Seat;
  piece: PieceSymbol;
  from: string;
  duty: readonly string[];
  narrowedBy: PieceOptionsAnswer['narrowedBy'];
  options: readonly PieceOption[];
  playedSan: string | null;
  playedCp: number | null;
  allMoves: number;
}): string {
  const pieceName = `${whose(a.seat)} ${NAME[a.piece]} on ${a.from}`;
  const out: string[] = [];
  if (a.narrowedBy === 'duty') {
    const guarded = andList(a.duty.map((sq) => `${sq}`));
    if (a.options.length === 0) {
      out.push(`Moving ${pieceName} gives up its guard of ${guarded} — no square keeps it.`);
    } else {
      out.push(`Where can ${pieceName} go and still guard ${guarded}? ${a.options.length === 1 ? 'Only' : 'Just'} ${andList(a.options.map((o) => o.san))}.`);
    }
  } else if (a.narrowedBy === 'escape') {
    out.push(a.options.length === 0
      ? `${pieceName[0].toUpperCase()}${pieceName.slice(1)} is attacked, and every square it can reach is covered.`
      : `Where can ${pieceName} go and be safe? ${andList(a.options.map((o) => o.san))}.`);
  }
  const best = a.options[0];
  if (a.narrowedBy === 'all') {
    // Nothing to narrow by — the piece guarded nothing and was not attacked —
    // so the question is which square was best, against what was played.
    if (best) out.push(`${pieceName[0].toUpperCase()}${pieceName.slice(1)} wasn't guarding anything or under attack, so it comes down to the best square: ${best.san}.`);
    if (best?.refutation) out.push(`${best.san}? ${best.refutation}.`);
  } else {
    for (const o of a.options) {
      if (o.refutation) out.push(`${o.san}? ${o.refutation}.`);
    }
    const holding = a.options.filter((o) => !o.refutation).map((o) => o.san);
    if (holding.length > 0 && holding.length < a.options.length) {
      out.push(`${andList(holding)} ${holding.length === 1 ? 'holds' : 'hold'}.`);
    }
  }
  if (best && a.playedSan && a.playedCp !== null) {
    if (best.moverCp > a.playedCp + SAME_BAND_CP) {
      out.push(`So yes — ${best.san} was better than ${a.playedSan}.`);
    } else if (best.moverCp < a.playedCp - SAME_BAND_CP) {
      out.push(`So no — moving it doesn't help; ${a.playedSan} was the better move.`);
    } else {
      out.push(`So ${best.san} was about as good as ${a.playedSan} — neither changes much.`);
    }
  } else if (best && a.options.every((o) => o.refutation)) {
    out.push(`So no — every square it can go to loses something.`);
  } else if (best && !best.refutation) {
    out.push(`${best.san} is the square that holds.`);
  }
  return out.join(' ');
}

/** What a "couldn't he just move X?" question asked, before the board is read. */
export interface PieceQuestionRef {
  /** Whose piece: said by pronoun ("he / they" vs "I / my"); null when unsaid. */
  seat: Seat | null;
  /** "White's queen" — a colour named instead of a seat. */
  color: 'white' | 'black' | null;
  piece: PieceSymbol;
  /** "the queen on f3" — the square, when the student named it. */
  square: string | null;
}

/**
 * The position the question is ABOUT, and the move actually played there.
 * - The seat's side is to move now → the question is about now (nothing played).
 * - Otherwise that side just moved → the question is about the decision it
 *   made: the position before its last move, and that move.
 * An unsaid seat means the side that just moved (the move being asked about).
 * Null when the history does not replay to the live board or the piece is gone.
 */
export function resolvePieceQuestion(input: {
  ref: PieceQuestionRef;
  fen: string;
  history: readonly string[];
  studentColor: 'white' | 'black';
}): { fen: string; pieceSquare: Square; seat: Seat; playedUci: string | null } | null {
  let live: Chess;
  try { live = new Chess(input.fen); } catch { return null; }
  const studentWB: Color = input.studentColor === 'white' ? 'w' : 'b';
  const justMoved: Color = other(live.turn());
  const colorSeat: Seat | null = input.ref.color
    ? ((input.ref.color === 'white' ? 'w' : 'b') === studentWB ? 'student' : 'opponent')
    : null;
  const seat: Seat = input.ref.seat ?? colorSeat ?? (justMoved === studentWB ? 'student' : 'opponent');
  const side: Color = seat === 'student' ? studentWB : other(studentWB);

  let fen = input.fen;
  let playedUci: string | null = null;
  let playedFrom: string | null = null;
  if (live.turn() !== side) {
    if (input.history.length === 0) return null;
    const replay = new Chess();
    try {
      for (const san of input.history.slice(0, -1)) replay.move(san);
      const before = replay.fen();
      const m = replay.move(input.history[input.history.length - 1]);
      if (replay.fen().split(' ')[0] !== input.fen.split(' ')[0]) return null;
      fen = before;
      playedUci = `${m.from}${m.to}${m.promotion ?? ''}`;
      playedFrom = m.from;
    } catch { return null; }
  }

  const c = new Chess(fen);
  let square: Square | null = null;
  if (input.ref.square) {
    const cell = c.get(input.ref.square as Square);
    if (cell && cell.type === input.ref.piece && cell.color === side) square = input.ref.square as Square;
  } else {
    const mine: Square[] = [];
    for (const row of c.board()) for (const cell of row) {
      if (cell && cell.type === input.ref.piece && cell.color === side) mine.push(cell.square);
    }
    // Several of that piece: the one under attack is the one the question is
    // about; else the one that was actually moved; else the first.
    square = mine.find((sq) => c.isAttacked(sq, other(side)))
      ?? mine.find((sq) => sq === playedFrom)
      ?? mine[0]
      ?? null;
  }
  if (!square) return null;
  return { fen, pieceSquare: square, seat, playedUci };
}

/** "Couldn't they just move their queen?" when there is no queen: that is the
 *  answer. Null when the side does have the piece (the question is live). */
export function pieceAbsentAnswer(input: { ref: PieceQuestionRef; fen: string; studentColor: 'white' | 'black' }): string | null {
  let c: Chess;
  try { c = new Chess(input.fen); } catch { return null; }
  const studentWB: Color = input.studentColor === 'white' ? 'w' : 'b';
  const seat: Seat | null = input.ref.seat
    ?? (input.ref.color ? ((input.ref.color === 'white' ? 'w' : 'b') === studentWB ? 'student' : 'opponent') : null);
  if (!seat) return null;
  const side: Color = seat === 'student' ? studentWB : other(studentWB);
  const has = c.board().some((row) => row.some((cell) => cell?.type === input.ref.piece && cell.color === side));
  if (has) return null;
  const plural = input.ref.piece === 'p' ? 'pawns are' : `${NAME[input.ref.piece]} is`;
  return seat === 'student'
    ? `Your ${plural} already off the board.`
    : `Their ${plural} already off the board.`;
}
