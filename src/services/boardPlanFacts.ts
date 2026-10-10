/**
 * THE STUDENT'S PLAN ON THIS BOARD, AS FACTS (one coach, 2026-10-09: "We need
 * the chat to think and calculate like the coach").
 *
 * These computers used to live only inside chat's "what's my plan?" answer, so
 * the narration — the coach's own read of the board — never had them, and a
 * quiet position read as nothing at all. Extracted here, ONE producer, read by
 * both: the plan answer renders from it, and `computePositionFacts` adds it to
 * the one read. Board-true (chess.js + the position-reading computers); the
 * engine is not consulted.
 */
import { openSentence } from '../utils/openSentence';
import { Chess } from 'chess.js';
import { deriveNextPlans } from './nextPlans';
import { structurePlan } from './boardPlan';
import { findPawnBreaks, findOpenFiles, strongestWeakestPiece } from './positionReadingService';
import { findWeakSquares } from './positionReadingService';
import { isUndevelopedInOpening } from '../utils/undeveloped';
import { flipSideToMove } from './threatOut';
import { andList, orList } from '../utils/andList';

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const cap = (s: string): string => openSentence(s);

export type LeverKind = 'develop' | 'break' | 'file' | 'outpost' | 'worst';

export interface PlanLever {
  kind: LeverKind;
  /** Phrased to follow "the plan is to …". */
  phrase: string;
  /** The squares the lever is about, coupled at emission (never read back from prose). */
  squares: string[];
}

export interface BoardPlanFacts {
  /** The structural trump (a passed pawn, an isolani), or null. A sentence. */
  trump: string | null;
  /** Every plan the structure earns, each with its method. Sentences. */
  plans: string[];
  /** The concrete levers, most to least decisive. */
  levers: PlanLever[];
}

const STEMS = ['Alongside that, aim to ', 'On top of that, work to ', 'And the third piece of it: '];

/**
 * `side` is whose plan; `voice` is who hears it — 'you' when it is the
 * student's own plan, 'they' when the student asked about the opponent's
 * ("what is black trying to do?"). The 'they' voice carries the levers only:
 * the structure and plan sentences are written to the student.
 */
export function boardPlanFacts(fen: string, side: 'white' | 'black', voice: 'you' | 'they' = 'you'): BoardPlanFacts | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const myC: 'w' | 'b' = side === 'white' ? 'w' : 'b';
  const your = voice === 'you' ? 'your' : 'their';
  const trump = voice === 'you' ? structurePlan(fen, myC) : null;
  // Stacked plans vary the stem after the first (question walk 2026-09-27).
  const plans = (voice === 'you' ? deriveNextPlans(fen, myC) : []).map((p) => cap(p))
    .map((p, i) => (i === 0 ? p : p.replace(/^The plan from here is to /, STEMS[(i - 1) % STEMS.length])))
    .map((p) => (/[.!?]$/.test(p.trim()) ? p.trim() : `${p.trim()}.`));
  const levers: PlanLever[] = [];
  // A pawn break to open the position (findPawnBreaks reads the side to move).
  const asSide = chess.turn() === myC ? fen : voice === 'they' ? flipSideToMove(fen) : null;
  if (asSide) {
    const breaks = findPawnBreaks(asSide);
    if (breaks.length) levers.push({ kind: 'break', phrase: `break with ${orList(breaks)} to open the position`, squares: [...breaks] });
  }
  // A rook belongs on an open / half-open file.
  const files = findOpenFiles(fen);
  const rookFiles = [...new Set([...files.open, ...(myC === 'w' ? files.whiteSemiOpen : files.blackSemiOpen)])];
  if (rookFiles.length) levers.push({ kind: 'file', phrase: `put a rook on the ${orList(rookFiles)} file${rookFiles.length > 1 ? 's' : ''}`, squares: [] });
  // An outpost — a hole in THEIR camp a knight can occupy.
  const holes = findWeakSquares(fen);
  const oppHoles = (myC === 'w' ? holes.black : holes.white);
  if (oppHoles.length) levers.push({ kind: 'outpost', phrase: `plant a knight on ${orList(oppHoles)}`, squares: [...oppHoles] });
  // In the opening the plan IS development: name the minors still home (walk 5,
  // 2026-09-23). Leads the levers.
  const home: Array<{ type: string; square: string }> = [];
  for (const row of chess.board()) for (const p of row) {
    if (p && p.color === myC && (p.type === 'n' || p.type === 'b') && isUndevelopedInOpening(fen, myC, p.type, p.square)) home.push({ type: p.type, square: p.square });
  }
  if (home.length) {
    levers.unshift({
      kind: 'develop',
      phrase: `bring ${your} ${andList(home.map((h) => `${PIECE[h.type]} on ${h.square}`))} into the game, since development comes first`,
      squares: home.map((h) => h.square),
    });
  }
  // Improve the worst-placed piece — a BAR, not a cap (G4.5): only once it is
  // genuinely misplaced, never an undeveloped piece on its home rank.
  const sw = strongestWeakestPiece(fen, myC);
  const homeRank = myC === 'w' ? '1' : '8';
  const pastOpening = (Number.parseInt(fen.split(' ')[5] ?? '1', 10) || 1) >= 10;
  if (sw.weakest && (pastOpening || sw.weakest.square[1] !== homeRank)) {
    levers.push({ kind: 'worst', phrase: `improve ${your} ${PIECE[sw.weakest.piece]} on ${sw.weakest.square}`, squares: [sw.weakest.square] });
  }
  return { trump, plans, levers };
}

/** The levers as one sentence, for the narration's read. Null when none. */
export function leverSentence(levers: readonly PlanLever[]): string | null {
  if (levers.length === 0) return null;
  return `The plan is to ${levers.map((l) => l.phrase).join('; ')}.`;
}
