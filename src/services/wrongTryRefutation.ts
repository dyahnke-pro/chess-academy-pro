import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { consequenceIn, errorWhy } from './inaccuracyCall';
import { openSentence } from '../utils/openSentence';
import type { StockfishAnalysis, WalkableLine } from '../types';
import { pvSans } from './moveInsight';
import { lineProof, walkableLine, type Proof } from './proof';

/** The engine seam, so tests can hand in canned reads. */
export interface RefutationEngine {
  analyzePosition(fen: string, depth: number): Promise<StockfishAnalysis>;
}

export type WrongTryRead =
  /** The try loses something concrete: "Qe3? Then Bxg5, winning your pawn on g5." */
  | { kind: 'refuted'; text: string; replySan: string; replyFrom: string; replyTo: string; line?: WalkableLine;
      /** The try and the engine's answer, as the one Proof shape every coach
       *  surface carries (one-coach P3) — what a record keeps. */
      proof: Proof }
  /** The try is still good, just not the puzzle's line — said honestly. */
  | { kind: 'also-good'; text: string };

const DEPTH = 12;
/** A try that keeps the mover this far ahead is "still good", not wrong. */
const STILL_WINNING_CP = 250;

/**
 * WHAT A WRONG TRY RUNS INTO — Learn's weighing ("you'd love Nd4 — but exd4
 * and it falls apart") brought to the puzzle board (hand walk 2026-10-01: a
 * wrong move was answered with a hint toward the answer and never with why
 * the move tried fails).
 *
 * The engine picks the opponent's best reply to the try; `replyPunishment` says
 * what that reply does, board-checked (mate, fork, material won, pin). Null
 * when the refutation is quiet or positional — the caller keeps its hint, and
 * nothing vague is said (empty > generic).
 *
 * Honesty first: a puzzle accepts one line, but a try can be winning too. When
 * it keeps the mover clearly ahead it is NOT called a mistake.
 */
export async function readWrongTry(
  fen: string,
  trySan: string,
  engine: RefutationEngine = stockfishEngine,
): Promise<WrongTryRead | null> {
  let afterTry: string;
  let moverSign: 1 | -1;
  try {
    const c = new Chess(fen);
    moverSign = c.turn() === 'w' ? 1 : -1;
    if (!c.move(trySan)) return null;
    if (c.isCheckmate()) return { kind: 'also-good', text: `${trySan} is mate too — find the line this puzzle is built on.` };
    afterTry = c.fen();
  } catch {
    return null;
  }

  let read: StockfishAnalysis;
  try {
    read = await engine.analyzePosition(afterTry, DEPTH);
  } catch {
    return null;
  }
  const moverEval = read.evaluation * moverSign; // after the try, mover POV
  if (moverEval >= STILL_WINNING_CP) {
    return { kind: 'also-good', text: `${trySan} still keeps you on top, but there's a sharper move here.` };
  }

  const reply = uciToSan(afterTry, read.bestMove);
  if (!reply) return null;
  // The try and the engine's answer to it, walkable on the board.
  const replyLine = pvSans(afterTry, read.topLines?.[0]?.moves ?? [read.bestMove], 4);
  const line = walkableLine(fen, [trySan, ...replyLine], trySan) ?? undefined;
  const proof = lineProof({ fen, sans: line ? line.plies.map((x) => x.san) : [trySan, reply.san] }) ?? { kind: 'line' as const, exact: false, short: `${trySan}, ${reply.san}`, full: `${trySan}, then ${reply.san}` };
  // WHY THE TRY FAILS, FROM THE ONE ERROR COMPUTER (David 2026-10-10:
  // "Tactics should tell why that move was wrong, the proof, but not say the
  // right answer"). The better move is never named — finding it is the puzzle.
  const ew = errorWhy({
    fenBefore: fen, playedSan: trySan, moverColor: moverSign === 1 ? 'white' : 'black',
    bestSan: null, bestLineUci: null, replyLineUci: read.topLines?.[0]?.moves ?? [read.bestMove],
    missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null,
    namesBetterMove: false,
  });
  if (ew.consequence) {
    return { kind: 'refuted', text: `${trySan}? ${openSentence(consequenceIn(ew.consequence, 'present'))}.${ew.tail}`, replySan: reply.san, replyFrom: reply.from, replyTo: reply.to, line, proof: ew.proof ?? proof };
  }
  if (read.isMate && moverEval < 0) {
    return { kind: 'refuted', text: `${trySan}? Then ${reply.san}, and they have a forced mate.`, replySan: reply.san, replyFrom: reply.from, replyTo: reply.to, line, proof };
  }
  return null;
}

function uciToSan(fen: string, uci: string): { san: string; from: string; to: string } | null {
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m ? { san: m.san, from: m.from, to: m.to } : null;
  } catch {
    return null;
  }
}

/**
 * ONE spoken line per wrong try (PostHog, David's phone, 2026-10-02): the
 * refutation, the method the miss earned, and the next hint rung used to go
 * out as separate `speak` calls a few ms apart, so each cut off the one before
 * it. Order is pedagogical — why the try fails, how to think about it, where
 * to look next. Empty parts drop; a part that repeats an earlier one is said
 * once.
 */
export function composeWrongTryLine(
  ...pieces: Array<string | null | undefined>
): string {
  const parts: string[] = [];
  for (const raw of pieces) {
    const p = raw?.trim();
    if (!p || parts.some((q) => q === p || q.includes(p))) continue;
    parts.push(/[.!?…]$/.test(p) ? p : `${p}.`);
  }
  return parts.join(' ');
}
