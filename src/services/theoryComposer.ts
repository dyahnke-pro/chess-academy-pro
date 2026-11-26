// THE THEORY COMPOSER (David 2026-11-25: "Opening theory is THE priority").
// One composer says what masters' games teach about an opening move or board —
// the key decision, the plan, the piece the plan brings, a reply, castling, the
// trap — and every theory surface speaks it (the Theory button in Review, the
// opening lessons, the All-section openings). It writes nothing the board does
// not back; the readers hand it data (`mastersPlanRead`, `openingTheory`'s
// table, `trapLine`).
//
// THE RULES (rounds 9–10, measured against written notes):
//   • The KEY DECISION is said on the move that made it, by what each road
//     DOES — never by how many masters play it.
//   • A PLAN is its goal plus at most two key moves, pawn moves first, ending
//     on the goal (or the last break). Castling is never a plan's key step.
//   • A PIECE the plan brings gets its own short sentence with its job; no job,
//     no sentence.
//   • A REPLY is said by its job. Popularity is a reason a move is known, not
//     what it teaches.
//   • CASTLING is said once.
//   • A TRAP comes from the one trap computer's words (`trapLine`).
import { Chess, type Color } from 'chess.js';
import { moveJob, MINE, THEIRS } from './bookMoveWhy';
import { NO_FOLLOW } from './exchangeLedger';
import type { LocalDbMove } from './masterPlayLookup';
import { trapLine, type TrapLine } from './trapLine';
import type { FactSeat } from './coachFact';
import { andList } from '../utils/andList';
import type { MastersPlanRead, PlanBreak } from './mastersPlanRead';

/** A move of the mover's on the way to a plan's goal. */
export interface KeyMove { san: string; piece: string; color: Color }

export type Whose = 'your' | 'their';
const NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const wordsOf = (w: Whose): typeof MINE => (w === 'your' ? MINE : THEIRS);
const Cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s: string): string => s.replace(/[+#!?]+$/, '');
export const dotted = (san: string, color: Color): string => (color === 'b' ? `…${clean(san)}` : clean(san));
const isCastle = (san: string): boolean => /^O-O/.test(san);
/** Castling is said once, by its own sentence: a job that also says "clears the
 *  way to castle" drops that tail where a theory line carries the job. */
export const withoutCastleTail = (clause: string): string => clause.replace(/,? and (?:clears the way to castle|gets (?:you|them) ready to castle)[^.,;]*/i, '').replace(/ so (?:you|they) can castle[^.,;]*/i, '');

/** The moves a plan SAYS: never castling, pawn moves first, at most two. */
export function keyMovesOf(lead: readonly KeyMove[]): KeyMove[] {
  const steps = lead.filter((m) => !isCastle(m.san));
  const pawns = steps.filter((m) => m.piece === 'p');
  const rest = steps.filter((m) => m.piece !== 'p');
  return [...pawns, ...rest].slice(0, 2);
}

/** The plan as a sentence: goal plus at most two key moves, ending on the goal.
 *  "Your plan: b4 and a4, to break with c5." With no key moves: "Your plan
 *  builds to c5." */
export function planGoalLine(i: { whose: Whose; goal: KeyMove; lead: readonly KeyMove[] }): string {
  const keys = keyMovesOf(i.lead.filter((m) => m.san !== i.goal.san));
  const goal = dotted(i.goal.san, i.goal.color);
  const Who = Cap(i.whose);
  return keys.length === 0
    ? `${Who} plan builds to ${goal}.`
    : `${Who} plan: ${andList(keys.map((k) => dotted(k.san, k.color)))}, to break with ${goal}.`;
}

export interface PlacedPiece { piece: string; to: string; san: string; color: Color; /** The board the move is played on. */ fen: string }

/** A piece the plan brings, in its own short sentence with its job. Null when
 *  the board shows no job — never a generic line. */
export function pieceHomeLine(i: { whose: Whose; piece: PlacedPiece }): string | null {
  let job: ReturnType<typeof moveJob> = null;
  try { job = moveJob(i.piece.fen, i.piece.san, i.piece.color, wordsOf(i.whose), null, NO_FOLLOW); } catch { job = null; }
  if (!job?.clause) return null;
  const noun = NOUN[i.piece.piece] ?? 'piece';
  return `${Cap(i.whose)} ${noun} belongs on ${i.piece.to}. ${Cap(job.clause)}.`;
}

/** Castling, said once. `said` holds the claims already spoken; a hit says
 *  nothing, a miss says it and returns the claim to record. */
export function castleOnce(i: { whose: Whose; side: 'short' | 'long'; said: ReadonlySet<string> }): { text: string; claim: string } | null {
  const claim = `castle:${i.whose}`;
  if (i.said.has(claim)) return null;
  return { text: `${i.whose === 'your' ? 'You' : 'They'} castle ${i.side}.`, claim };
}

export interface RoadRead { san: string; pct: number }

/** The key decision, said on the move that made it: the board offered at least
 *  two real roads and the move played is one of them. Each road is said by its
 *  job. Null where one move is plainly the move, or the chosen road has no job
 *  to say. */
export function keyDecisionLine(i: { fen: string; san: string; mover: Color; whose: Whose; roads: readonly RoadRead[] }): { text: string; names: string[] } | null {
  const MAIN = 10; const CLEAR = 85;
  const real = i.roads.filter((r) => r.pct >= MAIN).sort((a, b) => b.pct - a.pct);
  if (real.length < 2 || real[0].pct >= CLEAR) return null;
  const chosen = real.find((r) => clean(r.san) === clean(i.san));
  if (!chosen) return null;
  const w = wordsOf(i.whose);
  const jobOf = (san: string): string | null => {
    try { const c = moveJob(i.fen, san, i.mover, w, null, NO_FOLLOW)?.clause; return c ? withoutCastleTail(c) : null; } catch { return null; }
  };
  const mine = jobOf(chosen.san);
  if (!mine) return null;
  const others = real.filter((r) => r !== chosen).map((r) => ({ r, job: jobOf(r.san) })).filter((x) => x.job && x.job !== mine);
  const alt = others[0];
  const head = `The key decision: ${dotted(chosen.san, i.mover)}. ${Cap(mine)}.`;
  const text = alt ? `${head} ${dotted(alt.r.san, i.mover)} is the other road. ${Cap(alt.job ?? '')}.` : head;
  return { text, names: [chosen.san, ...(alt ? [alt.r.san] : [])] };
}

/** A reply said by what it DOES ("Bc4 brings the bishop out, aimed at f7"),
 *  never by "masters usually play it". Null when the board shows no job. */
export function replyByJob(i: { fen: string; san: string; mover: Color; whose: Whose }): string | null {
  let job: ReturnType<typeof moveJob> = null;
  try { job = moveJob(i.fen, i.san, i.mover, wordsOf(i.whose), null, NO_FOLLOW); } catch { job = null; }
  return job?.clause ? `${dotted(i.san, i.mover)}: ${job.clause}.` : null;
}

export type TheorySentenceKind = 'decision' | 'plan' | 'piece' | 'castle' | 'trap' | 'structure' | 'move-order' | 'gambit' | 'endgame';
export interface TheorySentence { kind: TheorySentenceKind; text: string; squares: string[]; claim?: string }

export interface TheoryTurnIn {
  fen: string;
  san: string;
  mover: Color;
  /** Whose move it is, from the student's seat. */
  whose: Whose;
  roads: readonly RoadRead[];
  plan?: { goal: KeyMove; goalSquare: string; lead: readonly KeyMove[] } | null;
  piece?: PlacedPiece | null;
  castle?: { side: 'short' | 'long' } | null;
  said: ReadonlySet<string>;
  /** What the move changed on the board, read by `theoryReads` (each only when
   *  it has something true to say). */
  structure?: { text: string; squares: string[] } | null;
  moveOrder?: { text: string; squares: string[] } | null;
  gambit?: { text: string; squares: string[] } | null;
  endgame?: { text: string; squares: string[] } | null;
  pieceJob?: { text: string; squares: string[] } | null;
  /** A trap read off the board by `theoryReads.trapRead` (already worded). */
  trapSaid?: { text: string; squares: string[] } | null;
  /** The slip a trap rests on, when the board holds one. */
  trap?: { fen: string; slip: string; punish: readonly string[]; slipBy: FactSeat; before?: string | null } | null;
}

/** The turn in order: decision, plan, piece, castling, trap. Each part only
 *  when it has something true to say. */
export function composeTheoryTurn(i: TheoryTurnIn): TheorySentence[] {
  const out: TheorySentence[] = [];
  const decision = keyDecisionLine({ fen: i.fen, san: i.san, mover: i.mover, whose: i.whose, roads: i.roads });
  if (decision) out.push({ kind: 'decision', text: decision.text, squares: [], claim: `decision:${i.fen.split(' ').slice(0, 4).join(' ')}` });
  if (i.plan) out.push({ kind: 'plan', text: planGoalLine({ whose: i.whose, goal: i.plan.goal, lead: i.plan.lead }), squares: [i.plan.goalSquare] });
  if (i.piece) {
    const t = pieceHomeLine({ whose: i.whose, piece: i.piece });
    if (t) out.push({ kind: 'piece', text: t, squares: [i.piece.to] });
  }
  if (i.castle) {
    const c = castleOnce({ whose: i.whose, side: i.castle.side, said: i.said });
    if (c) out.push({ kind: 'castle', text: c.text, squares: [], claim: c.claim });
  }
  if (i.gambit) out.push({ kind: 'gambit', text: i.gambit.text, squares: i.gambit.squares });
  if (i.structure) out.push({ kind: 'structure', text: i.structure.text, squares: i.structure.squares });
  if (i.moveOrder) out.push({ kind: 'move-order', text: i.moveOrder.text, squares: i.moveOrder.squares });
  if (i.pieceJob) out.push({ kind: 'piece', text: i.pieceJob.text, squares: i.pieceJob.squares });
  if (i.trapSaid) out.push({ kind: 'trap', text: i.trapSaid.text, squares: i.trapSaid.squares });
  if (i.endgame) out.push({ kind: 'endgame', text: i.endgame.text, squares: i.endgame.squares });
  if (i.trap) {
    const t: TrapLine | null = trapLine(i.trap);
    if (t) out.push({ kind: 'trap', text: [t.anchor, t.blow, t.pattern].filter(Boolean).join(' '), squares: t.squares });
  }
  return out;
}

/** Test seam: where a theory fact's board is read from the masters' table. */
export function roadsFrom(moves: readonly LocalDbMove[] | null): RoadRead[] {
  const total = (moves ?? []).reduce((n, m) => n + m.games, 0);
  return total === 0 ? [] : (moves ?? []).map((m) => ({ san: m.san, pct: (100 * m.games) / total }));
}

/** The board's own check that a key move is legal where it is said. */
export function legalOn(fen: string, san: string): boolean {
  try { new Chess(fen).move(san); return true; } catch { return false; }
}

// THE PLAN AS THE STUDENT HEARS IT (moved from mastersPlanRead, which stays a
// leaf the offline builders run under node).
/** The sentence, from the student's seat. Null when neither side has a break
 *  master games agree on. */
export function mastersPlanLine(
  read: MastersPlanRead | null,
  student: 'w' | 'b',
  /** REQUIRED — the board a live surface speaks on, or null where the move may
   *  be named (review: the game is over). On a live board a step of the
   *  student's that is LEGAL right now is their next move, so it is held
   *  (David's Smith-Morra replay 2026-10-19, move 3: "your bishop on f1 usually
   *  goes to c4 (Bc4)" with Bc4 legal — LEARN NAMES NO MOVE UNASKED). */
  holdPlayableOn: string | null,
  /** Claims already spoken (castling is said once). */
  said?: ReadonlySet<string>,
): { text: string; squares: string[]; arrows: Array<{ from: string; to: string }>; claims: string[] } | null {
  if (!read) return null;
  const playable = (step: { from: string; square?: string; to?: string } | null | undefined): boolean => {
    if (!step || !holdPlayableOn) return false;
    try {
      const c = new Chess(holdPlayableOn);
      if (c.turn() !== student) return false;
      return c.moves({ verbose: true }).some((m) => m.from === step.from && m.to === (step.to ?? step.square));
    } catch { return false; }
  };
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const mineRaw = student === 'w' ? read.white : read.black;
  const mine = playable(mineRaw) ? null : mineRaw;
  const theirs = student === 'w' ? read.black : read.white;
  const myPieceRaw = student === 'w' ? read.whitePiece : read.blackPiece;
  const myPiece = playable(myPieceRaw) ? null : myPieceRaw;
  const myCastle = student === 'w' ? read.whiteCastle : read.blackCastle;
  const sentences: string[] = [];
  const squares: string[] = [];
  const arrows: Array<{ from: string; to: string }> = [];
  const claims: string[] = [];
  const goalOf = (br: PlanBreak, side: 'w' | 'b'): { san: string; piece: string; color: 'w' | 'b' } => ({ san: br.san, piece: 'p', color: side });
  if (mine) {
    sentences.push(planGoalLine({ whose: 'your', goal: goalOf(mine, student), lead: mine.lead ?? [] }));
    squares.push(mine.square); arrows.push({ from: mine.from, to: mine.square });
  }
  if (myPiece?.fen && myPiece.color) {
    const t = pieceHomeLine({ whose: 'your', piece: { piece: myPiece.piece, to: myPiece.to, san: myPiece.san, color: myPiece.color, fen: myPiece.fen } });
    if (t) { sentences.push(t); squares.push(myPiece.to); arrows.push({ from: myPiece.from, to: myPiece.to }); }
  }
  if (myCastle && (mine || myPiece)) {
    const c = castleOnce({ whose: 'your', side: myCastle.side, said: said ?? new Set() });
    if (c) { sentences.push(c.text); claims.push(c.claim); }
  }
  if (theirs) {
    sentences.push(planGoalLine({ whose: 'their', goal: goalOf(theirs, them), lead: theirs.lead ?? [] }));
    squares.push(theirs.square); arrows.push({ from: theirs.from, to: theirs.square });
  }
  if (!sentences.length) return null;
  return { text: sentences.join(' '), squares, arrows, claims };
}

