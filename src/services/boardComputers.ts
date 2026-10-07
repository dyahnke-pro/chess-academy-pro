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
import type { Color } from 'chess.js';
import { NO_PROOF, type FactProof } from './proof';
import type { FactStakes } from './factStakes';
import type { SpokenLine } from './voicePackage';
import { findPinBreaks, pinBreakLine, pinBreakProof } from './pinBreak';
import { findProphylaxis, prophylaxisLine, prophylaxisProof } from './prophylaxis';
import { findEnablingMove, enablingMoveLine, enablingMoveProof } from './enablingMove';
import { findTiedDefenders, newTiedDefender, tiedDefenderLine, tiedDefenderProof } from './tiedDefender';
import { obligationLifted, obligationLiftedLine } from './obligationLifted';
import { findQueenGrabTraps, queenGrabTrapLine, queenGrabTrapProof } from './queenGrabTrap';
import { provenThreatLine, threatStakes } from './threatProof';
import { trappedOnBoard } from './reviewTeachingPoints';
import { PIECE_NAMES } from '../types/tacticTypes';
import { planThreadTurn, type PlanThread } from './planThread';

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
  /** What the claim puts at stake, for the door's stakes-first order. */
  stakes?: FactStakes;
  /** A move the sentence asks the student to play (arrowed, engine-vouched). */
  play?: { from: string; to: string };
  /** Lines the proof plays out, for the Show-the-line button. */
  lines?: SpokenLine[];
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
  /** The student's queen or rook attacked with no safe square. */
  trapped: { fen: string; student: Color };
  /** A threat warning, with the cost it claims proven on the board. */
  threatCost: { line: string; fen: string; student: Color; squares: readonly string[] };
  /** The student's plan, carried across moves: its stop proven off their
   *  move, then the next plan (mutates the thread held in the surface's memory). */
  planThread: { thread: PlanThread; ply: number; fenBefore: string; fenAfter: string; student: Color };
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
const TACTICS_NA = { not: 'a puzzle position poses one tactic; this computer explains a game move' } as const;
const WEAK_OWED = { not: 'owed — one-coach P3: the record keeps the proof' } as const;

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
    surfaces: { learn: LEARN, review: { not: 'owed — Review names pins; the break is read live only' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  pinBreakTheirs: {
    read: ({ fen, student, pinned }) => safe(() => {
      const brk = findPinBreaks(fen, student === 'w' ? 'b' : 'w').find((b) => b.pinned === pinned);
      if (!brk) return null;
      const proof = pinBreakProof(brk, student);
      return { text: pinBreakLine(brk, student), proof, squares: [brk.pinned, brk.to, brk.pinner], key: `pinbreak:${brk.pinned}${brk.to}`, lines: proof.line ? [proof.line] : undefined };
    }),
    surfaces: { learn: LEARN, review: { not: 'owed — Review names pins; the break is read live only' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: { not: 'owed — a pin puzzle could say the pin is illusory' }, weaknesses: WEAK_OWED },
  },
  prophylaxis: {
    read: ({ fen, engineFirstMoves }) => safe(() => {
      const ph = findProphylaxis(fen);
      if (!ph || !engineFirstMoves.includes(`${ph.prevention.from}${ph.prevention.to}`)) return null;
      return { text: prophylaxisLine(ph), proof: prophylaxisProof(ph), squares: ph.squares, key: `prophylaxis:${ph.intent.to}`, play: { from: ph.prevention.from, to: ph.prevention.to } };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  moveOrder: {
    read: ({ fen, pv }) => safe(() => {
      const o = findEnablingMove(fen, pv);
      if (!o) return null;
      return { text: enablingMoveLine(o), proof: enablingMoveProof(o), squares: [o.opened, o.then.from, o.then.to], key: `order:${o.first.san}>${o.then.san}`, play: { from: o.first.from, to: o.first.to } };
    }),
    surfaces: { learn: LEARN, review: { not: 'owed — Review could name the B the student never reached' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  tiedDefender: {
    read: ({ fenBefore, fenAfterMove, fenAfterReply, student }) => safe(() => {
      const tie = newTiedDefender(fenBefore, fenAfterMove, student);
      if (!tie) return null;
      const holds = findTiedDefenders(fenAfterReply, student).some((t) => t.defender.square === tie.defender.square && t.target.square === tie.target.square);
      if (!holds) return null;
      return { text: tiedDefenderLine(tie), proof: tiedDefenderProof(tie), squares: [tie.defender.square, tie.target.square], key: `tied:${tie.defender.square}>${tie.target.square}` };
    }),
    surfaces: { learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  obligationLifted: {
    read: ({ fenBefore, fenAfter, student }) => safe(() => {
      const o = obligationLifted(fenBefore, fenAfter, student);
      if (!o) return null;
      return { text: obligationLiftedLine(o), proof: NO_PROOF.description, squares: [o.square, o.from, o.to], key: `lifted:${o.square}` };
    }),
    surfaces: { learn: LEARN, review: { not: 'owed — Review reads the student move, not the reply that freed it' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  queenGrabTrap: {
    read: ({ fen }) => safe(() => {
      const t = findQueenGrabTraps(fen)[0];
      if (!t) return null;
      const proof = queenGrabTrapProof(t);
      return { text: queenGrabTrapLine(t), proof, squares: [t.from, t.to, t.replyFrom, t.replyTo, ...(proof.squares ?? [])], key: `grab:${t.to}` };
    }),
    surfaces: { learn: LEARN, review: { not: 'owed — a queen grab the student made could be named in review' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  trapped: {
    read: ({ fen, student }) => safe(() => {
      const t = trappedOnBoard(fen, student);
      if (!t) return null;
      const squares = [t.square, t.attackerSquare];
      const line = `Careful — your ${PIECE_NAMES[t.piece] ?? 'piece'} on ${t.square} is attacked and has no safe square.`;
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      return { text, proof: proof ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], key: `trapped:${t.square}`, stakes: threatStakes(fen, student, squares) ?? undefined };
    }),
    surfaces: { learn: LEARN, review: { wired: 'services/reviewTeachingPoints.ts' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  threatCost: {
    read: ({ line, fen, student, squares }) => safe(() => {
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      return { text, proof: proof ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], key: `threat:${squares.join('')}`, stakes: threatStakes(fen, student, squares) ?? undefined };
    }),
    surfaces: { learn: LEARN, review: { not: 'owed — Review warns from the stored threat, not this proof' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  planThread: {
    read: ({ thread, ...args }) => safe(() => planThreadTurn(thread, args).map((l) => ({ text: l.text, proof: l.proof, squares: l.squares, key: l.claim }))),
    surfaces: { learn: LEARN, review: { not: 'P2 owed — Review runs its own thread loop over planStopped (coachFeatureService); collapse onto planThreadTurn' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
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
