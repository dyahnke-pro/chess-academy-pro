// thinkingCandidatesStep — step 8, "Find the candidates" (Kotov: find two or
// three moves, then compare them — never play the first good one you see).
//
// The key is COMPUTED by the engine, never chosen: the moves within
// CANDIDATE_WINDOW_CP of the best on this board. The student taps the square
// each one lands on. A board is fair only when the good moves are clearly
// separated from the rest (nothing sits in the grey band between "as good" and
// "worse"), there are at least two of them, and no two land on the same square.
import { openSentence } from '../utils/openSentence';
import { Chess, type Square } from 'chess.js';
import type { FairKey, LessonPositionCandidate } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import { stockfishEngine } from './stockfishEngine';
import { candidatesFromLines } from './lessonSteer';
import { sayMoveClause } from './spokenMove';
import { rotateStem } from '../utils/rotateStem';

/** A move this close to the best is a real candidate (centipawns). */
export const CANDIDATE_WINDOW_CP = 50;
/** A move between the window and this is the grey band: too close to call wrong. */
export const GREY_BAND_CP = 100;
/** Engine depth and wall clock per board. */
const ENRICH_DEPTH = 12;
const ENRICH_BUDGET_MS = 4000;

function destination(fen: string, san: string): Square | null {
  try { return new Chess(fen).move(san)?.to ?? null; } catch { return null; }
}

/** The candidate squares on this board, or null when it cannot pose the question fairly. */
export function candidatesKey(fen: string, c?: LessonPositionCandidate): FairKey | null {
  const top = c?.topMoves;
  if (!top || top.length === 0) return null;
  const within = top.filter((m) => m.cpLoss <= CANDIDATE_WINDOW_CP);
  if (within.length < 2) return null;
  if (top.some((m) => m.cpLoss > CANDIDATE_WINDOW_CP && m.cpLoss <= GREY_BAND_CP)) return null;
  const squares = within.map((m) => destination(fen, m.san));
  if (squares.some((s) => !s)) return null;
  const unique = [...new Set(squares as Square[])];
  if (unique.length !== within.length) return null;
  return { key: unique, nearMiss: [] };
}

/** Ask the engine for its top moves on this board. */
export async function enrichWithTopMoves(c: LessonPositionCandidate): Promise<LessonPositionCandidate | null> {
  try {
    const analysis = await Promise.race([
      stockfishEngine.analyzePosition(c.fen, ENRICH_DEPTH),
      new Promise<null>((r) => setTimeout(() => r(null), ENRICH_BUDGET_MS)),
    ]);
    if (!analysis) return null;
    const topMoves = candidatesFromLines(c.fen, analysis.topLines);
    return topMoves.length >= 2 ? { ...c, topMoves } : null;
  } catch {
    return null;
  }
}

type TopMoves = NonNullable<LessonPositionCandidate['topMoves']>;

function candidateOn(fen: string, top: TopMoves | undefined, sq: Square): { san: string; cpLoss: number } | null {
  for (const m of top ?? []) {
    if (m.cpLoss <= CANDIDATE_WINDOW_CP && destination(fen, m.san) === sq) return m;
  }
  return null;
}

export function candidatesKit(): StepKit {
  // The lines below are called with the board only; the engine's moves are
  // looked up by that board (filled when its key is computed), so a board the
  // picker skipped can never lend its moves to another.
  const byFen = new Map<string, TopMoves>();
  return {
    step: 'candidates',
    enrich: enrichWithTopMoves,
    keyFor: (fen, c) => {
      const k = candidatesKey(fen, c);
      if (k && c?.topMoves) byFen.set(fen, c.topMoves);
      return k;
    },
    showLine: (fen, key, rot) => {
      const open = rotateStem([
        'Strong players do not play the first good move they see. They find two or three, then compare.',
        'Before you choose, list your candidates — the two or three moves worth comparing.',
      ], rot);
      const named = key.map((sq) => candidateOn(fen, byFen.get(fen), sq)).filter((m): m is { san: string; cpLoss: number } => !!m);
      const list = named.map((m) => sayMoveClause(m.san, fen));
      return [open, list.length > 1 ? `Here there are ${list.length}: ${list.join(', and ')}.` : ''].filter(Boolean).join(' ');
    },
    prompt: (rot) => rotateStem([
      'There is more than one good move here. Tap where each of them lands.',
      'Find your candidates: tap the square each good move goes to.',
    ], rot),
    wrongTapLine: (fen, sq) => {
      const played = (byFen.get(fen) ?? []).find((m) => destination(fen, m.san) === sq);
      if (played) return `A move to ${sq} is weaker than the best by more than half a pawn — keep comparing.`;
      return 'None of your strongest moves lands there. Look at checks, captures and threats first, then the quiet moves.';
    },
    reasonFor: (fen, sq) => {
      const m = candidateOn(fen, byFen.get(fen), sq);
      if (!m) return null;
      return m.cpLoss === 0
        ? `${capital(sayMoveClause(m.san, fen))} is the engine's first choice.`
        : `${capital(sayMoveClause(m.san, fen))} is just as good, within a few points.`;
    },
    intro: 'Today: candidates. Before choosing a move, find the two or three worth comparing — the first good move is not always the best one.',
  };
}

function capital(t: string): string {
  return t ? openSentence(t) : t;
}
