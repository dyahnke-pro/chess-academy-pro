// turningPoints — WHERE a game review stops to ask, and what it says after
// (David 2026-10-06: "in review only, at that moment a question posed to the
// user. And for them to have a chance to find the move on their own. One shot
// only, if still wrong then name right move with the why" … "the cause should
// be stated again. But in human language: 'Again you missed a knight fork,
// that's two this game. I suggest drilling this in tactics.'").
//
// The method is the one strong coaches use on a student's game (Yusupov's
// "find the turning points — where the assessment of the position changed"):
//   1. TURNING POINTS, not every slip — the student's moves ranked by how much
//      WINNING CHANCE they cost (a win-% drop, so a swing inside a game that
//      was already decided does not count), the biggest few asked;
//   2. the student looks FIRST (one try on the board);
//   3. then the move, WHY it works, and the CAUSE in plain words — counted
//      across every slip of the game, so "that's two this game" is true even
//      when only the biggest moments are asked.
//
// PURE (G0): moves, evals and tactics are computed (the segment's engine
// eval, `landedTacticFor`, SEE, `moveWhy`); nothing is phrased by a model.

import { Chess, type PieceSymbol } from 'chess.js';
import { landedTacticFor, tacticWord } from './pvPlayback';
import { findHangingBySee } from './positionReadingService';
import { moveWhy } from './deliberation';
import { betterMoveReason, errorWhy } from './inaccuracyCall';

/** How many turning points a review asks about (David: "the biggest few"). */
export const TURNING_POINTS_ASKED = 3;
/** A move must cost at least this many points of winning chance to count. */
export const TURNING_MIN_SWING = 10;
/** Still clearly won (or lost) after the move: a swing inside a decided game is
 *  not a turning point (+7 to +4 is still winning). */
export const DECIDED_CHANCE = 75;

/** The segment fields this computer reads (a subset of the review's segment). */
export interface TurningSegmentLike {
  ply: number;
  san: string;
  fenBefore: string;
  classification: string | null;
  evalBefore: number | null;
  evalAfter: number | null;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  isCoachMove?: boolean;
  playerColor: 'white' | 'black';
  /** The engine's line after the BEST move (UCI), when searched deep enough. */
  bestLineUci?: readonly string[];
  /** Their best line after the PLAYED move (UCI) — what the move allowed. */
  replyLineUci?: readonly string[];
  /** The reason the ply's own verdict gives for the better move, as spoken.
   *  ONE REASON PER MOVE (unity U3): the reveal says this one when it exists. */
  verdictReason?: string;
}

export type TurningCauseKind = 'missed-free' | 'missed' | 'walked-into' | 'hung';

/** Why the move went wrong, in a form that can be COUNTED (same id = same cause). */
export interface TurningCause {
  id: string;
  kind: TurningCauseKind;
  /** The tactic (fork/pin/…) for missed / walked-into. */
  tactic: string | null;
  /** The piece that does it: the student's for missed, theirs for walked-into,
   *  the student's hung piece for hung. */
  piece: PieceSymbol | null;
}

/** Why each flagged student ply was or was not asked — the audit row's body. */
export interface TurningTrace {
  ply: number;
  /** Winning chance (0–100) before and after the move, the student's side. */
  before?: number;
  after?: number;
  skip: 'no-eval-or-best' | 'small-swing' | 'decided' | null;
}

export interface TurningPoint {
  ply: number;
  fenBefore: string;
  playedSan: string;
  bestSan: string;
  bestUci: string;
  /** Points of winning chance the played move cost. */
  swing: number;
  /** The question, square-free — names the piece and the goal, never the answer. */
  question: string;
  /** Why the best move works, as a clause starting "it …" (computed), or null. */
  why: string | null;
  /** What the played move let them do ("win a piece for a pawn"), or null. */
  allowed: string | null;
  cause: TurningCause | null;
  /** How many slips of this game share the cause, up to and including this one. */
  causeCount: number;
}

const PIECE_NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** Winning chance (0–100) for the side the eval is from — lichess's curve. */
export function winChance(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function moverPiece(fen: string, san: string): { piece: PieceSymbol; fenAfter: string } | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    return m ? { piece: m.piece, fenAfter: c.fen() } : null;
  } catch { return null; }
}

/** The cause of one slip — what the student missed, walked into, or left hanging. */
export function turningCause(seg: TurningSegmentLike, next: TurningSegmentLike | null): TurningCause | null {
  // MISSED A FREE PIECE: the move that was there takes a piece of theirs that
  // was simply loose (SEE says it is won) — the plainest miss there is.
  if (seg.bestMoveSan && seg.bestMoveSan !== seg.san) {
    try {
      const c = new Chess(seg.fenBefore);
      const m = c.move(seg.bestMoveSan);
      const them = seg.fenBefore.split(' ')[1] === 'b' ? 'w' : 'b';
      if (m?.captured && m.captured !== 'p' && findHangingBySee(seg.fenBefore).some((h) => h.square === m.to && h.color === them)) {
        return { id: 'missed-free', kind: 'missed-free', tactic: null, piece: m.captured };
      }
    } catch { /* fall through to the other causes */ }
  }
  // MISSED: the move that was there lands a tactic the played move did not.
  if (seg.bestMoveSan && seg.bestMoveSan !== seg.san) {
    const tactic = landedTacticFor(seg.fenBefore, seg.bestMoveSan);
    const best = moverPiece(seg.fenBefore, seg.bestMoveSan);
    if (tactic && best && landedTacticFor(seg.fenBefore, seg.san) !== tactic) {
      return { id: `missed:${tactic}:${best.piece}`, kind: 'missed', tactic, piece: best.piece };
    }
  }
  const played = moverPiece(seg.fenBefore, seg.san);
  if (!played) return null;
  // WALKED INTO: on the board the played move left, their best reply lands a tactic.
  if (next && next.fenBefore.split(' ').slice(0, 4).join(' ') === played.fenAfter.split(' ').slice(0, 4).join(' ') && next.bestMoveSan) {
    const tactic = landedTacticFor(next.fenBefore, next.bestMoveSan);
    const theirs = moverPiece(next.fenBefore, next.bestMoveSan);
    if (tactic && theirs) return { id: `into:${tactic}:${theirs.piece}`, kind: 'walked-into', tactic, piece: theirs.piece };
  }
  // HUNG: the played move left one of the student's pieces (knight or more) en prise.
  const mover = seg.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  const hung = findHangingBySee(played.fenAfter)
    .filter((h) => h.color === mover && h.piece !== 'p' && h.piece !== 'k')
    .sort((a, b) => b.gain - a.gain)[0];
  if (hung) return { id: `hung:${hung.piece}`, kind: 'hung', tactic: null, piece: hung.piece };
  return null;
}

const COUNT_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
const countWord = (n: number): string => COUNT_WORD[n] ?? String(n);

/**
 * The cause said again, in plain words, counted across the game — the line
 * that closes a turning point. A missed tactic points at the Tactics drill that
 * trains it (only where one exists).
 */
export function causeLine(cause: TurningCause, count: number, punishmentSaid = false): string {
  const piece = cause.piece ? PIECE_NAME[cause.piece] : 'piece';
  if (cause.kind === 'missed-free') {
    if (count <= 1) return `You missed a free ${piece}.`;
    return `Again you missed free material — that's ${countWord(count)} this game. Drill hanging pieces in Tactics.`;
  }
  if (cause.kind === 'missed') {
    const what = `${piece} ${tacticWord(cause.tactic ?? '')}`;
    if (count <= 1) return `You missed a ${what}.`;
    return `Again you missed a ${what} — that's ${countWord(count)} this game. Drill ${tacticWord(cause.tactic ?? '')}s in Tactics.`;
  }
  if (cause.kind === 'walked-into') {
    const what = `${piece} ${tacticWord(cause.tactic ?? '')}`;
    const habit = `Before every move, check what their ${piece} can reach.`;
    if (count <= 1) return punishmentSaid ? habit : `You walked into a ${what}. ${habit}`;
    return `Again you walked into a ${what} — that's ${countWord(count)} this game. ${habit}`;
  }
  const habit = 'Before you let go of a piece, check it is still defended.';
  if (count <= 1) return punishmentSaid ? habit : `That left your ${piece} hanging. ${habit}`;
  return `Again a piece left hanging — that's ${countWord(count)} this game. ${habit}`;
}

/** The question for a turning point: the piece and the goal, never the square. */
export function turningQuestion(cause: TurningCause | null): string {
  if (cause?.kind === 'missed-free') return 'This is where the game turned. Something of theirs was there for the taking — find it.';
  if (cause?.kind === 'missed') {
    const piece = cause.piece ? PIECE_NAME[cause.piece] : 'piece';
    return `This is where the game turned. Your ${piece} had a ${tacticWord(cause.tactic ?? '')} here — find it.`;
  }
  if (cause?.kind === 'walked-into') {
    const piece = cause.piece ? PIECE_NAME[cause.piece] : 'piece';
    return `This is where the game turned. Their ${piece} was about to strike — find the move that keeps you safe.`;
  }
  if (cause?.kind === 'hung') {
    const piece = cause.piece ? PIECE_NAME[cause.piece] : 'piece';
    return `This is where the game turned. Your ${piece} was left hanging — find the move that keeps it.`;
  }
  return 'This is where the game turned. Find the move.';
}

/** Spoken after the student's one try. */
export function turningReveal(tp: TurningPoint, found: boolean): string {
  // Found, the counterfactual reads present: "it would take the rook" → "it takes the rook".
  const present = (w: string): string => w.replace(/^it would (\w+)/, (_m, v: string) => `it ${/(s|sh|ch|x|z)$/.test(v) ? `${v}es` : `${v}s`}`);
  const head = found
    ? (tp.why ? `That's it: ${tp.bestSan} — ${present(tp.why)}.` : `That's it: ${tp.bestSan}.`)
    : (tp.why ? `The move was ${tp.bestSan} — ${tp.why}.` : `The move was ${tp.bestSan}.`);
  if (found) return head;
  const allowed = tp.allowed ? ` Your ${tp.playedSan} let them ${tp.allowed}.` : '';
  const cause = tp.cause ? ` ${causeLine(tp.cause, tp.causeCount, !!tp.allowed)}` : '';
  return `${head}${allowed}${cause}`;
}

/**
 * The turning points of one game, from the review's segments: the student's
 * flagged moves ranked by the winning chance they cost, the biggest
 * `TURNING_POINTS_ASKED` kept. Every flagged slip's cause is computed first,
 * so the count in the cause line covers the whole game.
 */
export function selectTurningPoints(
  segments: ReadonlyArray<TurningSegmentLike>,
  playerColor: 'white' | 'black',
  asked: number = TURNING_POINTS_ASKED,
  trace?: TurningTrace[],
): Map<number, TurningPoint> {
  const sign = playerColor === 'white' ? 1 : -1;
  const ordered = [...segments].sort((a, b) => a.ply - b.ply);
  const tally = new Map<string, number>();
  const all: TurningPoint[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const seg = ordered[i];
    if (seg.isCoachMove || seg.playerColor !== playerColor) continue;
    if (seg.classification !== 'inaccuracy' && seg.classification !== 'mistake' && seg.classification !== 'blunder') continue;
    const next = ordered[i + 1] ?? null;
    const cause = turningCause(seg, next);
    const causeCount = cause ? (tally.get(cause.id) ?? 0) + 1 : 0;
    if (cause) tally.set(cause.id, causeCount);
    if (seg.evalBefore == null || seg.evalAfter == null || !seg.bestMoveSan || !seg.bestMoveUci || seg.bestMoveSan === seg.san) {
      trace?.push({ ply: seg.ply, skip: 'no-eval-or-best' });
      continue;
    }
    const before = winChance(seg.evalBefore * sign);
    const after = winChance(seg.evalAfter * sign);
    const swing = before - after;
    const at = { ply: seg.ply, before: Math.round(before), after: Math.round(after) };
    // The classifier's own word decides eligibility: a mistake or a blunder is
    // a moment worth asking about (KID audit 2026-10-06: Qh4 over Nxf1, a free
    // rook, scored 148cp and moved the winning chance 58→67 — nine points, and a
    // bare swing bar silenced the one question the game was about). The swing
    // RANKS; it gates only an inaccuracy.
    const costly = seg.classification === 'mistake' || seg.classification === 'blunder';
    if (swing <= 0 || (!costly && swing < TURNING_MIN_SWING)) { trace?.push({ ...at, skip: 'small-swing' }); continue; }
    // Decided either side of the move: still clearly winning, or lost before it.
    if (after >= DECIDED_CHANCE || before <= 100 - DECIDED_CHANCE) { trace?.push({ ...at, skip: 'decided' }); continue; }
    trace?.push({ ...at, skip: null });
    const mover: 'w' | 'b' = seg.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
    const prev = ordered[i - 1];
    const opponentLast = prev && prev.ply === seg.ply - 1 ? prev.san : null;
    const moverColor: 'white' | 'black' = mover === 'w' ? 'white' : 'black';
    // THE WHY, from the computers every coach surface speaks: what the best
    // line wins (`betterMoveReason`, read off the line), else the move's own
    // job (`moveWhy`).
    let why: string | null = seg.verdictReason ?? null;
    if (!why) try {
      const prior = prev && prev.ply === seg.ply - 1 ? { fenBefore: prev.fenBefore, san: prev.san } : null;
      why = seg.bestLineUci && seg.bestLineUci.length > 0
        ? betterMoveReason(seg.fenBefore, seg.san, seg.bestMoveSan, seg.bestLineUci, moverColor, prior, false)
        : null;
    } catch { why = null; }
    if (!why) {
      try { const w = moveWhy(seg.fenBefore, seg.bestMoveSan, mover, opponentLast); why = w ? `it ${w}` : null; } catch { why = null; }
    }
    // WHAT THE PLAYED MOVE ALLOWED — their own best line after it.
    // From the ONE error computer (David 2026-10-10: "Unity!").
    let allowed: string | null = null;
    try {
      const prior = prev && prev.ply === seg.ply - 1 ? { fenBefore: prev.fenBefore, san: prev.san } : null;
      const ew = errorWhy({
        fenBefore: seg.fenBefore, playedSan: seg.san, moverColor, bestSan: seg.bestMoveSan,
        bestLineUci: seg.bestLineUci ?? null, replyLineUci: seg.replyLineUci ?? [],
        missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: prior,
        namesBetterMove: true,
      });
      allowed = ew.consequence ? ew.consequence.replace(/^it let them /, '') : null;
    } catch { allowed = null; }
    all.push({
      ply: seg.ply, fenBefore: seg.fenBefore, playedSan: seg.san,
      bestSan: seg.bestMoveSan, bestUci: seg.bestMoveUci,
      swing, question: turningQuestion(cause), why, allowed, cause, causeCount,
    });
  }
  const chosen = all.sort((a, b) => b.swing - a.swing || a.ply - b.ply).slice(0, Math.max(0, asked));
  return new Map(chosen.map((t) => [t.ply, t]));
}

/** THE GAME'S TURN — the one answer to "where did the game turn?" (unity U1). */
export interface GameTurn {
  ply: number;
  san: string;
  /** The move's cost to its mover, in pawns (null without evals). */
  swingPawns: number | null;
  /** 'asked': the student's biggest turning point, the one the review asked
   *  about. 'swing': no question was asked, so the biggest contested swing
   *  either side played. */
  source: 'asked' | 'swing';
}

/** The segment fields `gameTurn` reads. */
export interface GameTurnSegment {
  ply: number;
  san: string;
  evalBefore?: number | null;
  evalAfter?: number | null;
  playerColor: 'white' | 'black';
}

/**
 * THE ONE TURNING POINT OF A GAME (unity U1, the 52-error walk: three "this is
 * where the game turned" questions on the student's moves, then a closing line
 * naming a different move — the opponent's — because a second computer ranked
 * by raw pawn swing over both sides).
 *
 * When the review asked turning-point questions, the game turned at the
 * biggest of THOSE: the closing, the thesis and the theme all name it. Only a
 * game that asked nothing falls back to the biggest contested swing, measured
 * the same way — winning chance lost by the mover, decided games excluded.
 */
export function gameTurn(
  plan: ReadonlyMap<number, TurningPoint>,
  segments: ReadonlyArray<GameTurnSegment>,
): GameTurn | null {
  const pawnCost = (s: GameTurnSegment): number | null => {
    if (s.evalBefore == null || s.evalAfter == null) return null;
    const cost = (s.evalBefore - s.evalAfter) * (s.playerColor === 'white' ? 1 : -1);
    return cost > 0 ? cost / 100 : null;
  };
  const asked = [...plan.values()].sort((a, b) => b.swing - a.swing || a.ply - b.ply)[0];
  if (asked) {
    const seg = segments.find((s) => s.ply === asked.ply);
    return { ply: asked.ply, san: asked.playedSan, swingPawns: seg ? pawnCost(seg) : null, source: 'asked' };
  }
  let best: { seg: (typeof segments)[number]; swing: number } | null = null;
  for (const s of segments) {
    if (s.evalBefore == null || s.evalAfter == null) continue;
    const sign = s.playerColor === 'white' ? 1 : -1;
    const before = winChance(s.evalBefore * sign);
    const after = winChance(s.evalAfter * sign);
    const swing = before - after;
    if (swing < TURNING_MIN_SWING) continue;
    if (after >= DECIDED_CHANCE || before <= 100 - DECIDED_CHANCE) continue;
    if (!best || swing > best.swing) best = { seg: s, swing };
  }
  return best ? { ply: best.seg.ply, san: best.seg.san, swingPawns: pawnCost(best.seg), source: 'swing' } : null;
}
