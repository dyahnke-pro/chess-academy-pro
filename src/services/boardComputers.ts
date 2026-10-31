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
import { findProphylaxis, prophylaxisKey, prophylaxisLine, prophylaxisIdea, prophylaxisProof } from './prophylaxis';
import { findEnablingMove, enablingMoveLine, enablingMoveProof } from './enablingMove';
import { findTiedDefenders, newTiedDefender, tiedDefenderLine, tiedDefenderProof } from './tiedDefender';
import { obligationLifted, obligationLiftedLine } from './obligationLifted';
import { findQueenGrabTraps, queenGrabTrapLine, queenGrabTrapProof } from './queenGrabTrap';
import { looseClaims, provenThreatLine, threatStakes } from './threatProof';
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
import { STRUCTURE_ROLE } from './structureJudgementKit';
import { countMethod } from './countMethod';
import { countKey } from './conceptKey';
import { buildPriorityFirst } from './playCommentary';
import { openingStoryAt, heldWhilePlayable, STORY_KIND, type StoryBeat } from './openingStory';
import { isEndgameByMaterial } from './gamePhaseService';
import type { FacetTag, FactKind } from './reviewFacetRank';
import type { ClauseKind } from './positionFacts';
import type { GamePhase } from '../types';
import { packageForRegister } from './hintRegister';

type CoachSurface = 'learn' | 'review' | 'lesson' | 'play' | 'chat' | 'tactics' | 'weaknesses';

/** Where a computer reaches a surface — the FILE that calls it — or why not. */
type SurfaceAnswer = { wired: string } | { not: string };

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
  /** Further claim keys the sentence states (a loose piece it names), so
   *  another computer saying that piece is loose is dropped as already said. */
  claims?: string[];
  /** A route the sentence names, one arrow per step, each on its own board
   *  (the plan's piece walked hop by hop) — drawn as `line` arrows. */
  routeArrows?: Array<{ from: string; to: string; fen: string }>;
  /** THEIR intended move the sentence warns about (drawn as theirs). */
  theirs?: { from: string; to: string };
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
   *  elsewhere `idea`, the habit without the answer — a typed read, so the
   *  held path keeps its own proof, squares and line (OS-1 root cause 1). */
  namesMove?: boolean;
  idea?: HeldRead;
  /** Teach or describe — the door holds a description as an aside, never a
   *  reason (`LaneFact.role`). Set where the computer knows. */
  role?: 'teach' | 'describe';
  /** Which beat of the opening's story the read is (`openingStory` only) — the
   *  surface places it by `STORY_LANE`. */
  storyBeat?: StoryBeat;
  /** The read's own kind, where its computer states more than one (the
   *  opening's story: `STORY_KIND`); else the computer's `kind`. */
  kind?: FacetTag;
}

/** The held form of a read that names the move: its words, and the proof,
 *  squares and lines that stay true without the move. */
export interface HeldRead {
  text: string;
  proof: FactProof;
  squares: string[];
  lines?: SpokenLine[];
  motif?: TacticType;
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
  /** Count before you take: the student's move lost the count (a capture on a
   *  square they did not outnumber, a piece put where it cannot be held). */
  countMethod: { fenBefore: string; playedSan: string; student: Color; costCp: number | null };
  /** The priority before the move: the engine's best move aims at a weak pawn. */
  priorityFirst: { fen: string; student: Color; bestUci: string };
  /** A threat warning, with the cost it claims proven on the board. */
  threatCost: { line: string; fen: string; student: Color; squares: readonly string[] };
  /** The student's plan, carried across moves: its stop proven off their
   *  move, then the next plan (mutates the thread held in the surface's memory). */
  planThread: { thread: PlanThread; ply: number; fenBefore: string; fenAfter: string; student: Color; studentPovCp?: number | null; studentMove?: { fenBefore: string; san: string } | null; holdPlayable: boolean };
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
  /** The opening's story at the board after `history` (`fen`, student to
   *  move): masters data read from memory, never fetched here. REQUIRED
   *  `namesStudentMoves`: a live board holds every fact that would name a move
   *  the student can play now. */
  openingStory: { history: readonly string[]; fen: string; student: Color; namesStudentMoves: boolean };
}

export type ComputerId = keyof BoardContexts;

interface ComputerSpec<C> {
  /** One read, or several in speaking order (the plan thread: stop, then plan). */
  read(ctx: C): BoardRead | BoardRead[] | null;
  /** THE KIND OF FACT ITS READS STATE (WO-STORY-MATRIX-01 P1-4) — the one
   *  label every surface speaks it under, so its group (`FACT_GROUP[kind]`)
   *  and its step are the same on Learn, Review and the live read. Never a
   *  tag picked at a call site: the same read used to be a habit on Review, a
   *  choice on Learn and a rule on the live read. */
  kind: FactKind;
  /** THE PHASES IT BELONGS TO — a read outside them is never computed
   *  (`readBoardAll`), so it is never computed and then held. */
  phase: ReadonlySet<GamePhase | 'any'>;
  surfaces: Record<CoachSurface, SurfaceAnswer>;
}

/** True in every phase. */
const ANY: ReadonlySet<GamePhase | 'any'> = new Set<GamePhase | 'any'>(['any']);
/** The opening and the middlegame: about the opening, the book or castling,
 *  with nothing to say in an ending (Learn's door held these lanes there). */
const NOT_ENDING: ReadonlySet<GamePhase | 'any'> = new Set<GamePhase>(['opening', 'middlegame']);

const LEARN = { wired: 'components/Coach/CoachTeachPage.tsx' } as const;
const REVIEW = { wired: 'services/reviewFullData.ts' } as const;
const PLAY_ASK = { not: 'Play volunteers nothing (PLAY_VOLUNTEERS_COACHING); reached on ask through the shared read — owed, one-coach P4' } as const;
const CHAT_OWED = { not: 'owed — one-coach P4: a chat lane reads it from the registry' } as const;
/** The live composer reads it for every surface that does not read it itself
 *  — chat's board answers and the tapped read on Play (2026-10-15). */
const COMPOSER = { wired: 'services/positionFacts.ts' } as const;
const TACTICS_NA = { not: 'a puzzle position poses one tactic; this computer explains a game move' } as const;
const WEAK_OWED = { not: 'owed — one-coach P3: the record keeps the proof' } as const;
/** A lesson composes each move from the move's own facts (`moveThoughtFacts`)
 *  and reads no registry yet. */
const LESSON_OWED = { not: 'owed — WO-STORY-MATRIX-01 P1-9/P1-12: a lesson composes a move from moveThoughtFacts; this read joins it as a CoachFact' } as const;
/** A taught line is a model line: no student move of theirs to judge. */
const LESSON_NO_STUDENT_MOVE = { not: 'it reads the student\'s own move; a lesson\'s line is a model line with no move of theirs to judge' } as const;

/** A structure read in the registry's one shape. */
function structureRead(r: StructureRead): BoardRead {
  // A judgement that names the move carries its held form as the `idea`
  // (Learn names no move unasked, David 2026-10-10).
  return { text: r.text, proof: r.proof, squares: r.squares, key: r.key, role: STRUCTURE_ROLE[r.act], ...(r.stakes ? { stakes: r.stakes } : {}), ...(r.proof.line ? { lines: [r.proof.line] } : {}), ...(r.heldForm ? { namesMove: true, idea: { text: r.heldForm.text, proof: r.heldForm.proof, squares: [...r.heldForm.squares] } } : {}) };
}
const STRUCT_TACTICS = { not: 'a structural judgement is about a game\'s plan; a puzzle poses one tactic' } as const;
const STRUCT_WEAK = { not: 'owed — the weakness record keeps tags, not the structure read; the held rows ride recordTeachingEvidence' } as const;

function safe<T>(f: () => T | null): T | null {
  try { return f(); } catch { return null; }
}

export const BOARD_COMPUTERS = {
  pinBreakOwn: {
    read: ({ fen, student }) => safe(() => {
      const own = findPinBreaks(fen, student)[0];
      if (!own) return null;
      const proof = pinBreakProof(own, student);
      return { text: pinBreakLine(own, student), proof, squares: [own.pinned, own.to, own.pinner], key: `pinbreak:${own.pinned}${own.to}`, lines: proof.line ? [proof.line] : undefined };
    }),
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  pinBreakTheirs: {
    read: ({ fen, student, pinned }) => safe(() => {
      const brk = findPinBreaks(fen, student === 'w' ? 'b' : 'w').find((b) => b.pinned === pinned);
      if (!brk) return null;
      const proof = pinBreakProof(brk, student);
      return { text: pinBreakLine(brk, student), proof, squares: [brk.pinned, brk.to, brk.pinner], key: `pinbreak:${brk.pinned}${brk.to}`, lines: proof.line ? [proof.line] : undefined };
    }),
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: { not: 'owed — a pin puzzle could say the pin is illusory' }, weaknesses: WEAK_OWED },
  },
  prophylaxis: {
    read: ({ fen, engineFirstMoves }) => safe(() => {
      const ph = findProphylaxis(fen);
      if (!ph || !engineFirstMoves.includes(`${ph.prevention.from}${ph.prevention.to}`)) return null;
      return { text: prophylaxisLine(ph), proof: prophylaxisProof(ph), squares: ph.squares, key: prophylaxisKey(ph.intent.to), play: { from: ph.prevention.from, to: ph.prevention.to }, theirs: { from: ph.intent.from, to: ph.intent.to },
        // Held: their idea and that one move stops it — never which move
        // (easy walk 2026-10-11: "h3 first — it stops the pin" unasked).
        namesMove: true, idea: prophylaxisIdea(ph) };
    }),
    kind: 'timing',
    phase: ANY,
    surfaces: { lesson: { not: 'a lesson says the stop as the move that made it (moveThoughtFacts: findProphylaxis, kind stop); this is the stop still to play, which a model line plays' }, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  moveOrder: {
    read: ({ fen, pv }) => safe(() => {
      const o = findEnablingMove(fen, pv);
      if (!o) return null;
      return { text: enablingMoveLine(o), proof: enablingMoveProof(o), squares: [o.opened, o.then.from, o.then.to], key: `order:${o.first.san}>${o.then.san}`, play: { from: o.first.from, to: o.first.to } };
    }),
    kind: 'timing',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  tiedDefender: {
    read: ({ fenBefore, fenAfterMove, fenAfterReply, student }) => safe(() => {
      const tie = newTiedDefender(fenBefore, fenAfterMove, student);
      if (!tie) return null;
      const holds = findTiedDefenders(fenAfterReply, student).some((t) => t.defender.square === tie.defender.square && t.target.square === tie.target.square);
      if (!holds) return null;
      return { text: tiedDefenderLine(tie), proof: tiedDefenderProof(tie), squares: [tie.defender.square, tie.target.square], key: countKey(tie.target.square) };
    }),
    kind: 'their-read',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  obligationLifted: {
    read: ({ fenBefore, fenAfter, student }) => safe(() => {
      const o = obligationLifted(fenBefore, fenAfter, student);
      if (!o) return null;
      return { text: obligationLiftedLine(o), proof: NO_PROOF.description, squares: [o.square, o.from, o.to], key: `lifted:${o.square}` };
    }),
    kind: 'their-read',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  openingStory: {
    // HOW A STRONG COACH EXPLAINS AN OPENING (OS-3): the fork, what it is, the
    // choice and its price, their setup, the coming game and its key idea —
    // each a computed fact, in the speed runs' order.
    read: ({ history, fen, student, namesStudentMoves }) => safe(() => openingStoryAt({ history, student, namesStudentMoves })
      .filter((f) => namesStudentMoves || !heldWhilePlayable(f, fen, student))
      .map((f) => ({
        text: f.text, proof: f.proof, squares: [...f.squares], key: f.claimKey, role: 'teach' as const, storyBeat: f.beat, kind: STORY_KIND[f.beat],
        // A plan aim is shared with the plan thread, so one plan is said once.
        ...(f.aim ? { sharedKey: f.aim } : {}),
      }))),
    kind: 'opening',
    phase: NOT_ENDING,
    surfaces: {
      lesson: LESSON_OWED,
      learn: LEARN,
      review: { wired: 'services/coachFeatureService.ts' },
      play: PLAY_ASK,
      chat: { not: 'owed — chat answers "what is this opening" through openingIdentityQuery' },
      tactics: { not: 'a puzzle has no opening story' },
      weaknesses: { not: 'owed — a named structure cost left unanswered is a broken answer the record could keep' },
    },
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
    kind: 'opening',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { not: 'a taught line is the book: there is no departure to name' },
      learn: LEARN,
      review: REVIEW,
      play: COMPOSER,
      chat: COMPOSER,
      tactics: { not: 'a puzzle has no book departure' },
      weaknesses: { not: 'owed — the departure row (bookDepartureWeakness) could carry the job' },
    },
  },
  // ONE COACH (unified 2026-10-17): the count and the priority Learn teaches,
  // read by Review and the live composer through the same registry. The count
  // reads the student's own move, and only a move that lost it (2026-10-28).
  countMethod: {
    read: ({ fenBefore, playedSan, student, costCp }) => safe(() => {
      const m = countMethod(fenBefore, playedSan, student, costCp);
      if (!m) return null;
      return { text: m.text, proof: NO_PROOF.method, squares: [m.square], key: countKey(m.square), stakes: { points: Math.abs(m.net), plies: 0 }, role: 'teach' as const };
    }),
    kind: 'method',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  priorityFirst: {
    read: ({ fen, student, bestUci }) => safe(() => {
      const pf = buildPriorityFirst({ fen, studentColor: student === 'w' ? 'white' : 'black', bestUci });
      if (!pf) return null;
      // The spoken package names the move; the idea is the priority without it
      // (Learn names no move unasked).
      // The question and its answer as ONE closed span — the stakes are part
      // of the answer, so they wait with it.
      const idea = packageForRegister({ ...pf.hint, detail: undefined }, 'obvious');
      return { text: pf.spoken, proof: squaresProof(pf.spoken, [pf.targetSquare]) ?? NO_PROOF.method, squares: [pf.targetSquare], key: `priority:${pf.targetSquare}`, namesMove: true, idea: { text: idea, proof: squaresProof(idea, [pf.targetSquare]) ?? NO_PROOF.method, squares: [pf.targetSquare] }, role: 'teach' as const, play: pf.arrow };
    }),
    kind: 'priority',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
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
    kind: 'last-here',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { not: 'a lesson is not the student\'s game: no record of theirs is read back (David 2026-10-28)' },
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
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
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
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: { wired: 'services/reviewTeachingPoints.ts' }, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  threatCost: {
    read: ({ line, fen, student, squares }) => safe(() => {
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      return { text, proof: proof ?? squaresProof(text, squares) ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], key: `threat:${squares.join('')}`, stakes: threatStakes(fen, student, squares) ?? undefined, claims: looseClaims(fen, student, squares) };
    }),
    kind: 'threat',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  structureMove: {
    // Learn's reader: the better move is held (David 2026-10-10).
    read: (ctx) => safe(() => studentMoveStructure({ ...ctx, namesBetterMove: false }).map(structureRead)),
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: { wired: 'services/learnBoardTeaching.ts' }, review: REVIEW, play: PLAY_ASK, chat: { not: 'a move judgement answers "why was my move bad"; chat reads the board judgements (structureBoard)' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureTheirMove: {
    read: ({ fenBefore, san, student }) => safe(() => theirMoveStructure(fenBefore, san, student).map(structureRead)),
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { not: 'about the opponent\'s last move; chat reads the board judgements (structureBoard)' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureBoard: {
    read: ({ fen, student }) => safe(() => boardStructure(fen, student).map(structureRead)),
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { wired: 'services/groundedAnswer.ts' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureLines: {
    read: ({ fen, student, lines }) => safe(() => linesStructure(fen, student, lines, false).map(structureRead)),
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: { not: 'owed — P1-12: lessons hold a MultiPV (openingGenerator) and the structural choice reads it' }, learn: LEARN, review: { not: 'Review stores one engine line per ply, not the MultiPV the fighting line compares' }, play: PLAY_ASK, chat: { not: 'chat\'s assessment has no MultiPV in hand' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  planThread: {
    read: ({ thread, ...args }) => safe(() => planThreadTurn(thread, args).map((l) => ({ text: l.text, proof: l.proof, squares: l.squares, key: l.claim, ...(l.aim ? { sharedKey: l.aim } : {}), ...(l.arrows ? { routeArrows: l.arrows } : {}) }))),
    kind: 'plan-now',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  tacticGeometry: {
    read: (ctx) => safe(() => geometryReads(ctx).map((r) => ({
      text: r.text, proof: r.proof, squares: r.squares, key: r.claim,
      ...(r.stakes ? { stakes: r.stakes } : {}), ...(r.motif ? { motif: r.motif } : {}),
      // A geometry idea is a habit of thought with no board claim of its own.
      namesMove: r.namesMove, ...(r.idea ? { idea: { text: r.idea, proof: NO_PROOF.method, squares: [] } } : {}),
      ...(r.proof.line ? { lines: [r.proof.line] } : {}),
    }))),
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      // Learn and chat's position reads both go through the one producer.
      lesson: LESSON_OWED,
      // Learn and chat's position reads both go through the one producer.
      learn: { wired: 'services/thinkAloud.ts' },
      review: REVIEW,
      play: PLAY_ASK,
      chat: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
      weaknesses: { not: 'the record half is the classifier: missedTacticService.detectTacticType asks geometryMotif' },
    },
  },
} satisfies { [K in ComputerId]: ComputerSpec<BoardContexts[K]> };

/** The registry, read uniformly by id. */
const SPECS: { [K in ComputerId]: ComputerSpec<BoardContexts[K]> } = BOARD_COMPUTERS;

/** The computers Review speaks as a `[kind]` facet: their kind is a facet tag. */
export type ReviewComputer = { [K in ComputerId]: (typeof BOARD_COMPUTERS)[K]['kind'] extends FacetTag ? K : never }[ComputerId];
/** The computers the live read speaks as a clause: their kind is a clause kind. */
export type LiveComputer = { [K in ComputerId]: (typeof BOARD_COMPUTERS)[K]['kind'] extends ClauseKind ? K : never }[ComputerId];

/** The board a computer's context reads, when it names one. */
function boardOf(ctx: object): string | null {
  for (const field of ['fen', 'fenAfterReply', 'fenAfter', 'fenBefore']) {
    const v = (ctx as Record<string, unknown>)[field];
    if (typeof v === 'string') return v;
  }
  return null;
}

/** Is the board outside the computer's phases? An ending is the one phase a
 *  computer can be out of today (`isEndgameByMaterial`, the one definition). */
function outOfPhase(phase: ReadonlySet<GamePhase | 'any'>, ctx: object): boolean {
  if (phase.has('any') || phase.has('endgame')) return false;
  const fen = boardOf(ctx);
  if (!fen) return false;
  try { return isEndgameByMaterial(fen); } catch { return false; }
}

/** A fresh plan thread for a surface's memory. */
export { newPlanThread, adoptPlanTrial, type PlanThread } from './planThread';

/** Every read, in speaking order. */
export function readBoardAll<K extends ComputerId>(id: K, ctx: BoardContexts[K]): BoardRead[] {
  const spec = SPECS[id];
  if (outOfPhase(spec.phase, ctx)) return [];
  const r = spec.read(ctx);
  return r === null ? [] : Array.isArray(r) ? r : [r];
}

/** The one call a surface makes — the first read, or null. */
export function readBoard<K extends ComputerId>(id: K, ctx: BoardContexts[K]): BoardRead | null {
  return readBoardAll(id, ctx)[0] ?? null;
}
