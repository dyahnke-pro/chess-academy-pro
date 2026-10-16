// boardComputers — THE ONE REGISTRY OF BOARD COMPUTERS (one-coach plan P4,
// David 2026-10-07: "make sure it's wired properly, all coach surfaces get it.
// We are not duplicating").
//
// A surface never hand-calls one of these computers: it asks the registry for
// a computer by id with that computer's context, and gets back ONE shape — the
// sentence, the PROOF it rests on (required, G0: the fact is computed and the
// proof comes from the same computation), the squares and a say-once key.
//
// Every entry answers EVERY coach surface (`Record<CoachSurface, …>`), wired or
// a reason it is not, so a new computer does not compile until someone has
// decided what Review, Play, chat, Tactics and Weaknesses do with it. The table
// is read by `boardComputers.test.ts`, which holds each "wired" claim to a real
// call site — a claim with no caller fails.
//
// PURE: every computer here is pure; this module adds no chess of its own.
import { Chess, type Color } from 'chess.js';
import { NO_PROOF, squaresProof, type FactProof } from './proof';
import type { FactStakes } from './factStakes';
import type { SpokenLine } from './voicePackage';
import { findPinBreaks, pinBreakLine, pinBreakProof } from './pinBreak';
import { findProphylaxis, prophylaxisLine, prophylaxisIdea, prophylaxisProof } from './prophylaxis';
import { findEnablingMove, enablingMoveLine, enablingMoveProof } from './enablingMove';
import { findTiedDefenders, newTiedDefender, tiedDefenderLine, tiedDefenderProof } from './tiedDefender';
import { obligationLifted, obligationLiftedLine } from './obligationLifted';
import { findQueenGrabTraps, queenGrabTrapLine, queenGrabTrapProof } from './queenGrabTrap';
import { provenThreatLine, threatStakes } from './threatProof';
import { trappedOnBoard } from './reviewTeachingPoints';
import { bookDeparture } from './bookDeparture';
import { bookMoveWhy } from './bookMoveWhy';
import { lastTimeHere } from './lastTimeHere';
import type { BookDepartureRow } from './bookDepartureWeakness';
import { PIECE_NAMES } from '../types/tacticTypes';
import { planThreadTurn, type PlanThread } from './planThread';
import { geometryReads, type GeometryContext } from './tacticGeometry';
import type { TacticType } from '../types';
import { studentMoveStructure, theirMoveStructure, boardStructure, linesStructure, type StructureRead } from './structureReads';

export type CoachSurface = 'learn' | 'review' | 'play' | 'chat' | 'tactics' | 'weaknesses';

/** Where a computer reaches a surface — the FILE that calls it — or why not. */
export type SurfaceAnswer = { wired: string } | { not: string };

export interface BoardRead {
  text: string;
  /** REQUIRED — the computed proof, or a named reason there is none. */
  proof: FactProof;
  squares: string[];
  /** Say-once key: the same fact on a later turn is the same key. */
  key: string;
  /** A second key the claim shares with ANOTHER computer saying the same
   *  thing (the student's plan goal, said by the plan thread and the plan
   *  arc) — so whichever speaks second is dropped as already said. */
  sharedKey?: string;
  /** What the claim puts at stake, for the door's stakes-first order. */
  stakes?: FactStakes;
  /** A route the sentence names, one arrow per step, each on its own board
   *  (the plan's piece walked hop by hop) — drawn as `line` arrows. */
  routeArrows?: Array<{ from: string; to: string; fen: string }>;
  /** A move the sentence asks the student to play (arrowed, engine-vouched). */
  play?: { from: string; to: string };
  /** Lines the proof plays out, for the Show-the-line button. */
  lines?: SpokenLine[];
  /** The board the sentence speaks of, when it is not the surface's current
   *  one — the book move is about the position the student just left, so it is
   *  graded there, never on the board after the reply (prod Learn audit
   *  2026-10-14: graded after hxg4, "your bishop on g4" read as false). */
  fen?: string;
  /** The motif the read names, in the ONE tactic vocabulary — the weakness join. */
  motif?: TacticType;
  /** The sentence names the engine's move: spoken only where a move is earned;
   *  elsewhere `idea`, the habit without the answer. */
  namesMove?: boolean;
  idea?: string;
}

/** Each computer's own context — what it needs from the surface, no more. */
export interface BoardContexts {
  /** The student's own pinned piece that walks out with tempo (`fen`: student to move). */
  pinBreakOwn: { fen: string; student: Color };
  /** Their pinned piece on `pinned` can walk out — said beside the student's pin. */
  pinBreakTheirs: { fen: string; student: Color; pinned: string };
  /** The quiet move that stops their next pin, kick or fork — only when the
   *  engine's own top lines start with it. */
  prophylaxis: { fen: string; engineFirstMoves: readonly string[] };
  /** A first, because it clears the road B needs (engine line from `fen`). */
  moveOrder: { fen: string; pv: readonly string[] };
  /** The guard the student's move tied down, still tied after their reply. */
  tiedDefender: { fenBefore: string; fenAfterMove: string; fenAfterReply: string; student: Color };
  /** Their move took an attacker off a piece the student had to look after. */
  obligationLifted: { fenBefore: string; fenAfter: string; student: Color };
  /** A capture that looks free and leaves the queen with no safe square. */
  queenGrabTrap: { fen: string };
  /** The book move the student just left, with the job it does on the board
   *  (the student's own departure, the move it happened or the reply after). */
  bookMove: { history: readonly string[]; student: Color };
  /** The student's own costly departure from this position in another game. */
  lastTimeHere: { fenBefore: string; playedSan: string; rows: readonly BookDepartureRow[]; currentGameId: string | null };
  /** The student's queen or rook attacked with no safe square. */
  trapped: { fen: string; student: Color };
  /** A threat warning, with the cost it claims proven on the board. */
  threatCost: { line: string; fen: string; student: Color; squares: readonly string[] };
  /** The student's plan, carried across moves: its stop proven off their
   *  move, then the next plan (mutates the thread held in the surface's memory). */
  planThread: { thread: PlanThread; ply: number; fenBefore: string; fenAfter: string; student: Color; studentPovCp?: number | null; studentMove?: { fenBefore: string; san: string } | null };
  /** The line tactics (tacticGeometry): interference, clearance, decoy and
   *  deflection, the discovery audit, their in-between move, the fork that
   *  serves a plan, the kick that fails, the counterfactual fork, the pawn
   *  that can't block, interposition, the loaded line, the pinner pinned. */
  tacticGeometry: GeometryContext;
  /** The structure judgements of the student's move (batch 6). */
  structureMove: { fenBefore: string; san: string; student: Color; cpLoss: number; bestSan: string | null; bestUci: readonly string[]; reply: string | null };
  /** What their move did to the student's structure and squares. */
  structureTheirMove: { fenBefore: string; san: string; student: Color };
  /** The standing structural facts, student to move. */
  structureBoard: { fen: string; student: Color };
  /** Plan choices off the student's MultiPV at `fen` (student to move). */
  structureLines: { fen: string; student: Color; lines: readonly { moves: readonly string[]; evaluation: number; mate?: number | null }[] };
}

export type ComputerId = keyof BoardContexts;

interface ComputerSpec<C> {
  /** One read, or several in speaking order (the plan thread: stop, then plan). */
  read(ctx: C): BoardRead | BoardRead[] | null;
  surfaces: Record<CoachSurface, SurfaceAnswer>;
}

const LEARN = { wired: 'components/Coach/CoachTeachPage.tsx' } as const;
const REVIEW = { wired: 'services/reviewFullData.ts' } as const;
const PLAY_ASK = { not: 'Play volunteers nothing (PLAY_VOLUNTEERS_COACHING); reached on ask through the shared read — owed, one-coach P4' } as const;
const CHAT_OWED = { not: 'owed — one-coach P4: a chat lane reads it from the registry' } as const;
/** The live composer reads it for every surface that does not read it itself
 *  — chat's board answers and the tapped read on Play (2026-10-15). */
const COMPOSER = { wired: 'services/positionFacts.ts' } as const;
const TACTICS_NA = { not: 'a puzzle position poses one tactic; this computer explains a game move' } as const;
const WEAK_OWED = { not: 'owed — one-coach P3: the record keeps the proof' } as const;

/** A structure read in the registry's one shape. */
function structureRead(r: StructureRead): BoardRead {
  // A judgement that names the move carries its held form as the `idea`
  // (Learn names no move unasked, David 2026-10-10).
  return { text: r.text, proof: r.proof, squares: r.squares, key: r.key, ...(r.stakes ? { stakes: r.stakes } : {}), ...(r.proof.line ? { lines: [r.proof.line] } : {}), ...(r.heldForm ? { namesMove: true, idea: r.heldForm.text } : {}) };
}
const STRUCT_TACTICS = { not: 'a structural judgement is about a game\'s plan; a puzzle poses one tactic' } as const;
const STRUCT_WEAK = { not: 'owed — the weakness record keeps tags, not the structure read; the held rows ride recordTeachingEvidence' } as const;

function safe<T>(f: () => T | null): T | null {
  try { return f(); } catch { return null; }
}

export const BOARD_COMPUTERS: { [K in ComputerId]: ComputerSpec<BoardContexts[K]> } = {
  pinBreakOwn: {
    read: ({ fen, student }) => safe(() => {
      const own = findPinBreaks(fen, student)[0];
      if (!own) return null;
      const proof = pinBreakProof(own, student);
      return { text: pinBreakLine(own, student), proof, squares: [own.pinned, own.to, own.pinner], key: `pinbreak:${own.pinned}${own.to}`, lines: proof.line ? [proof.line] : undefined };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  pinBreakTheirs: {
    read: ({ fen, student, pinned }) => safe(() => {
      const brk = findPinBreaks(fen, student === 'w' ? 'b' : 'w').find((b) => b.pinned === pinned);
      if (!brk) return null;
      const proof = pinBreakProof(brk, student);
      return { text: pinBreakLine(brk, student), proof, squares: [brk.pinned, brk.to, brk.pinner], key: `pinbreak:${brk.pinned}${brk.to}`, lines: proof.line ? [proof.line] : undefined };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: { not: 'owed — a pin puzzle could say the pin is illusory' }, weaknesses: WEAK_OWED },
  },
  prophylaxis: {
    read: ({ fen, engineFirstMoves }) => safe(() => {
      const ph = findProphylaxis(fen);
      if (!ph || !engineFirstMoves.includes(`${ph.prevention.from}${ph.prevention.to}`)) return null;
      return { text: prophylaxisLine(ph), proof: prophylaxisProof(ph), squares: ph.squares, key: `prophylaxis:${ph.intent.to}`, play: { from: ph.prevention.from, to: ph.prevention.to },
        // Held: their idea and that one move stops it — never which move
        // (easy walk 2026-10-11: "h3 first — it stops the pin" unasked).
        namesMove: true, idea: prophylaxisIdea(ph) };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  moveOrder: {
    read: ({ fen, pv }) => safe(() => {
      const o = findEnablingMove(fen, pv);
      if (!o) return null;
      return { text: enablingMoveLine(o), proof: enablingMoveProof(o), squares: [o.opened, o.then.from, o.then.to], key: `order:${o.first.san}>${o.then.san}`, play: { from: o.first.from, to: o.first.to } };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  tiedDefender: {
    read: ({ fenBefore, fenAfterMove, fenAfterReply, student }) => safe(() => {
      const tie = newTiedDefender(fenBefore, fenAfterMove, student);
      if (!tie) return null;
      const holds = findTiedDefenders(fenAfterReply, student).some((t) => t.defender.square === tie.defender.square && t.target.square === tie.target.square);
      if (!holds) return null;
      return { text: tiedDefenderLine(tie), proof: tiedDefenderProof(tie), squares: [tie.defender.square, tie.target.square], key: `tied:${tie.defender.square}>${tie.target.square}` };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  obligationLifted: {
    read: ({ fenBefore, fenAfter, student }) => safe(() => {
      const o = obligationLifted(fenBefore, fenAfter, student);
      if (!o) return null;
      return { text: obligationLiftedLine(o), proof: NO_PROOF.description, squares: [o.square, o.from, o.to], key: `lifted:${o.square}` };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  bookMove: {
    // THEORY IS KNOWLEDGE, NOT A FIND (David 2026-10-14): once the student has
    // left the book, the book move is named with its job on the board
    // (`bookMoveWhy`) and what their move left undone. No job → no line.
    read: ({ history, student }) => safe(() => {
      const dep = bookDeparture(history);
      if (!dep || dep.mover !== student || !dep.mainSan || history.length - dep.ply > 1) return null;
      const w = bookMoveWhy(dep.fen, dep.mainSan, dep.san, student);
      if (!w) return null;
      let spokenOn: string | undefined;
      try { const b = new Chess(dep.fen); b.move(dep.san); spokenOn = b.fen(); } catch { spokenOn = undefined; }
      return { text: w.text, proof: squaresProof(w.text, w.squares) ?? NO_PROOF.stated, squares: [...w.squares], key: `book-move:${dep.ply}:${dep.san}`, ...(spokenOn ? { fen: spokenOn } : {}) };
    }),
    surfaces: {
      learn: LEARN,
      review: REVIEW,
      play: COMPOSER,
      chat: COMPOSER,
      tactics: { not: 'a puzzle has no book departure' },
      weaknesses: { not: 'owed — the departure row (bookDepartureWeakness) could carry the job' },
    },
  },
  lastTimeHere: {
    // MEMORY BY POSITION (David 2026-10-15): the book-departure rows already
    // hold every position the student left theory from, the move and its
    // cost. Their own move, already played, is named; the book move never is.
    read: ({ fenBefore, playedSan, rows, currentGameId }) => safe(() => {
      const r = lastTimeHere(fenBefore, playedSan, rows, currentGameId);
      if (!r) return null;
      let after: string | undefined;
      try { const b = new Chess(fenBefore); b.move(playedSan); after = b.fen(); } catch { after = undefined; }
      // The proof is the move itself, from the board it was played on then.
      const line = { fen: r.departure.fen, sans: [r.departure.san] };
      const proof: FactProof = { kind: 'line', exact: true, short: `The move then was ${r.departure.san}`, full: `The move then was ${r.departure.san}`, line };
      return { text: r.text, proof, squares: [], key: r.key, ...(after ? { fen: after } : {}) };
    }),
    surfaces: {
      learn: LEARN,
      review: { wired: 'services/coachFeatureService.ts' },
      play: COMPOSER,
      chat: COMPOSER,
      tactics: { not: 'a puzzle has no book departure' },
      weaknesses: { not: 'owed — the departure row is the weakness itself' },
    },
  },
  queenGrabTrap: {
    read: ({ fen }) => safe(() => {
      const t = findQueenGrabTraps(fen)[0];
      if (!t) return null;
      const proof = queenGrabTrapProof(t);
      return { text: queenGrabTrapLine(t), proof, squares: [t.from, t.to, t.replyFrom, t.replyTo, ...(proof.squares ?? [])], key: `grab:${t.to}` };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  trapped: {
    read: ({ fen, student }) => safe(() => {
      const t = trappedOnBoard(fen, student);
      if (!t) return null;
      const squares = [t.square, t.attackerSquare];
      const line = `Careful — your ${PIECE_NAMES[t.piece] ?? 'piece'} on ${t.square} is attacked and has no safe square.`;
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      return { text, proof: proof ?? squaresProof(text, squares) ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], key: `trapped:${t.square}`, stakes: threatStakes(fen, student, squares) ?? undefined };
    }),
    surfaces: { learn: LEARN, review: { wired: 'services/reviewTeachingPoints.ts' }, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  threatCost: {
    read: ({ line, fen, student, squares }) => safe(() => {
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      return { text, proof: proof ?? squaresProof(text, squares) ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], key: `threat:${squares.join('')}`, stakes: threatStakes(fen, student, squares) ?? undefined };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  structureMove: {
    // Learn's reader: the better move is held (David 2026-10-10).
    read: (ctx) => safe(() => studentMoveStructure({ ...ctx, namesBetterMove: false }).map(structureRead)),
    surfaces: { learn: { wired: 'services/learnBoardTeaching.ts' }, review: REVIEW, play: PLAY_ASK, chat: { not: 'a move judgement answers "why was my move bad"; chat reads the board judgements (structureBoard)' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureTheirMove: {
    read: ({ fenBefore, san, student }) => safe(() => theirMoveStructure(fenBefore, san, student).map(structureRead)),
    surfaces: { learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { not: 'about the opponent\'s last move; chat reads the board judgements (structureBoard)' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureBoard: {
    read: ({ fen, student }) => safe(() => boardStructure(fen, student).map(structureRead)),
    surfaces: { learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { wired: 'services/groundedAnswer.ts' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureLines: {
    read: ({ fen, student, lines }) => safe(() => linesStructure(fen, student, lines).map(structureRead)),
    surfaces: { learn: LEARN, review: { not: 'Review stores one engine line per ply, not the MultiPV the fighting line compares' }, play: PLAY_ASK, chat: { not: 'chat\'s assessment has no MultiPV in hand' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  planThread: {
    read: ({ thread, ...args }) => safe(() => planThreadTurn(thread, args).map((l) => ({ text: l.text, proof: l.proof, squares: l.squares, key: l.claim, ...(l.aim ? { sharedKey: l.aim } : {}), ...(l.arrows ? { routeArrows: l.arrows } : {}) }))),
    surfaces: { learn: LEARN, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  tacticGeometry: {
    read: (ctx) => safe(() => geometryReads(ctx).map((r) => ({
      text: r.text, proof: r.proof, squares: r.squares, key: r.claim,
      ...(r.stakes ? { stakes: r.stakes } : {}), ...(r.motif ? { motif: r.motif } : {}),
      namesMove: r.namesMove, ...(r.idea ? { idea: r.idea } : {}),
      ...(r.proof.line ? { lines: [r.proof.line] } : {}),
    }))),
    surfaces: {
      // Learn and chat's position reads both go through the one producer.
      learn: { wired: 'services/thinkAloud.ts' },
      review: REVIEW,
      play: PLAY_ASK,
      chat: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
      weaknesses: { not: 'the record half is the classifier: missedTacticService.detectTacticType asks geometryMotif' },
    },
  },
};

/** A fresh plan thread for a surface's memory. */
export { newPlanThread } from './planThread';

/** Every read, in speaking order. */
export function readBoardAll<K extends ComputerId>(id: K, ctx: BoardContexts[K]): BoardRead[] {
  const r = BOARD_COMPUTERS[id].read(ctx);
  return r === null ? [] : Array.isArray(r) ? r : [r];
}

/** The one call a surface makes — the first read, or null. */
export function readBoard<K extends ComputerId>(id: K, ctx: BoardContexts[K]): BoardRead | null {
  return readBoardAll(id, ctx)[0] ?? null;
}
