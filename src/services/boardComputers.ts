// boardComputers — THE ONE REGISTRY OF BOARD COMPUTERS (one-coach plan P4,
// David 2026-10-07: "make sure it's wired properly, all coach surfaces get it.
// We are not duplicating").
//
// A surface never hand-calls one of these computers: it asks the registry for
// a computer by id with that computer's context, and gets back THE ONE FACT
// (`CoachFact`, WO-STORY-MATRIX-01 P1-6a) — the sentence, the PROOF it rests on
// (required, G0: the fact is computed and the proof comes from the same
// computation), the squares, its claims, its kind and its place. The fact
// carries everything a surface used to relabel at its call site (its kind, its
// role, the skill it teaches, the board it is about, the moves it draws and
// the form it takes without the move), so no surface re-derives any of it.
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
import { LOCAL_THREAD, placeFact, type CoachFact, type CoachFactKind, type ComputerName, type FactSeat } from './coachFact';
import { threadKey } from './gameStory';
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
import { studentMoveStructure, theirMoveStructure, boardStructure, linesStructure, type StructureRead } from './structureReads';
import { STRUCTURE_ROLE } from './structureJudgementKit';
import { countMethod } from './countMethod';
import { countKey } from './conceptKey';
import { buildPriorityFirst } from './playCommentary';
import { openingStoryAt, heldWhilePlayable, STORY_KIND } from './openingStory';
import { isEndgameByMaterial } from './gamePhaseService';
import type { FactKind } from './reviewFacetRank';
import type { GamePhase } from '../types';
import { packageForRegister } from './hintRegister';
import { FUNDAMENTAL_TAG } from './principleAttribution';

type CoachSurface = 'learn' | 'review' | 'lesson' | 'play' | 'chat' | 'tactics' | 'weaknesses';

/** Where a computer reaches a surface — the FILE that calls it — or why not. */
type SurfaceAnswer = { wired: string } | { not: string };

/** WHAT A READ SAYS, before the registry places it — every field of the one
 *  fact except those its computer's row answers (its kind, group, step and
 *  computer) and its id. Each producer answers its seat, the student move it
 *  names, its thread and its stakes: nothing defaults (WO-STORY-MATRIX-01 P1-6). */
type ReadParts = Omit<CoachFact, 'id' | 'kind' | 'group' | 'step' | 'computer'> & {
  /** Its say-once key — the tail of its id (`readKey`). Every read but the
   *  threat's cost is said under it, so it is also its first claim. */
  key: string;
  /** A computer that states more than one kind (the opening's story names
   *  each beat's, `STORY_KIND`); else the kind on its row. */
  kind?: CoachFactKind;
};

/** The one fact a read becomes: its id is its computer's and its key, its
 *  place comes from its kind (`placeFact`) like every producer's, and its
 *  computer is the catalog row on the registry entry. */
type MakeFact = (parts: ReadParts) => CoachFact;

/** THE KEY A READ WAS MADE UNDER — its say-once key, the tail of the id the
 *  registry's one maker gave it (`readBoardAll`: `<computer id>:<key>`). A
 *  surface that keeps one key for a read (Review's `hint:` ledger, Learn's
 *  threat and tactic keys, the plan thread's offered claims) reads it here,
 *  never off the words. */
export function readKey(f: CoachFact): string {
  return f.id.slice(f.id.indexOf(':') + 1);
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
  /** One fact, or several in speaking order (the plan thread: stop, then
   *  plan), each made by `fact` from what the read says. */
  read(ctx: C, fact: MakeFact): CoachFact | CoachFact[] | null;
  /** THE COMPUTER THAT MAKES ITS FACTS — its catalog row (`COMPUTER_CATALOG`,
   *  keyed by the function's own name), so the fact names its producer. */
  computer: ComputerName;
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

/** A structure read as the one fact, on the board it judged, from the seat
 *  whose move or position it judges. */
function structureFact(r: StructureRead, fact: MakeFact, fen: string, seat: FactSeat): CoachFact {
  // A judgement that names the move carries its held form (Learn names no
  // move unasked, David 2026-10-10).
  return fact({
    key: r.key, claims: [r.key], text: r.text, proof: r.proof, squares: r.squares, stakes: r.stakes ?? null,
    seat, namesStudentMove: !!r.heldForm, thread: LOCAL_THREAD, fen, role: STRUCTURE_ROLE[r.act],
    ...(r.proof.line ? { lines: [r.proof.line] } : {}),
    ...(r.heldForm ? { heldForm: { text: r.heldForm.text, proof: r.heldForm.proof, squares: [...r.heldForm.squares] } } : {}),
  });
}
const STRUCT_TACTICS = { not: 'a structural judgement is about a game\'s plan; a puzzle poses one tactic' } as const;
const STRUCT_WEAK = { not: 'owed — the weakness record keeps tags, not the structure read; the held rows ride recordTeachingEvidence' } as const;

function safe<T>(f: () => T | null): T | null {
  try { return f(); } catch { return null; }
}

/** The board after one move, or null when it does not play there. */
function boardAfter(fen: string, san: string): string | null {
  try { const b = new Chess(fen); b.move(san); return b.fen(); } catch { return null; }
}

export const BOARD_COMPUTERS = {
  pinBreakOwn: {
    // The student's own pinned piece that walks out with tempo: their resource.
    read: ({ fen, student }, fact) => safe(() => {
      const own = findPinBreaks(fen, student)[0];
      if (!own) return null;
      const proof = pinBreakProof(own, student);
      const key = `pinbreak:${own.pinned}${own.to}`;
      return fact({ key, claims: [key], text: pinBreakLine(own, student), proof, squares: [own.pinned, own.to, own.pinner], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen, ...(proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'findPinBreaks',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  pinBreakTheirs: {
    // Their piece the student pins can walk out the same way.
    read: ({ fen, student, pinned }, fact) => safe(() => {
      const brk = findPinBreaks(fen, student === 'w' ? 'b' : 'w').find((b) => b.pinned === pinned);
      if (!brk) return null;
      const proof = pinBreakProof(brk, student);
      const key = `pinbreak:${brk.pinned}${brk.to}`;
      return fact({ key, claims: [key], text: pinBreakLine(brk, student), proof, squares: [brk.pinned, brk.to, brk.pinner], stakes: null, seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen, ...(proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'findPinBreaks',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: { not: 'owed — a pin puzzle could say the pin is illusory' }, weaknesses: WEAK_OWED },
  },
  prophylaxis: {
    read: ({ fen, engineFirstMoves }, fact) => safe(() => {
      const ph = findProphylaxis(fen);
      if (!ph || !engineFirstMoves.includes(`${ph.prevention.from}${ph.prevention.to}`)) return null;
      const key = prophylaxisKey(ph.intent.to);
      // Held: their idea and that one move stops it — never which move
      // (easy walk 2026-10-11: "h3 first — it stops the pin" unasked).
      return fact({ key, claims: [key], text: prophylaxisLine(ph), proof: prophylaxisProof(ph), squares: ph.squares, stakes: null, seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen,
        marks: { play: { from: ph.prevention.from, to: ph.prevention.to }, theirs: { from: ph.intent.from, to: ph.intent.to } },
        heldForm: prophylaxisIdea(ph) });
    }),
    computer: 'findProphylaxis',
    kind: 'timing',
    phase: ANY,
    surfaces: { lesson: { not: 'a lesson says the stop as the move that made it (moveThoughtFacts: findProphylaxis, kind stop); this is the stop still to play, which a model line plays' }, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  moveOrder: {
    // "A first": names the student's first move (the live read speaks it only
    // where the move is earned; Learn draws it as the move to play).
    read: ({ fen, pv }, fact) => safe(() => {
      const o = findEnablingMove(fen, pv);
      if (!o) return null;
      const key = `order:${o.first.san}>${o.then.san}`;
      return fact({ key, claims: [key], text: enablingMoveLine(o), proof: enablingMoveProof(o), squares: [o.opened, o.then.from, o.then.to], stakes: null, seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen, marks: { play: { from: o.first.from, to: o.first.to } } });
    }),
    computer: 'findEnablingMove',
    kind: 'timing',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  tiedDefender: {
    // Their guard the student's move tied down — a fact about the student's
    // own move (its pressure bought it), so the student's seat: every door
    // seats it there today (Learn's move point, the live clause, Review).
    read: ({ fenBefore, fenAfterMove, fenAfterReply, student }, fact) => safe(() => {
      const tie = newTiedDefender(fenBefore, fenAfterMove, student);
      if (!tie) return null;
      const holds = findTiedDefenders(fenAfterReply, student).some((t) => t.defender.square === tie.defender.square && t.target.square === tie.target.square);
      if (!holds) return null;
      const key = countKey(tie.target.square);
      return fact({ key, claims: [key], text: tiedDefenderLine(tie), proof: tiedDefenderProof(tie), squares: [tie.defender.square, tie.target.square], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfterReply });
    }),
    computer: 'newTiedDefender',
    kind: 'their-read',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  obligationLifted: {
    // What their move gave up: an attacker off a piece the student guarded.
    read: ({ fenBefore, fenAfter, student }, fact) => safe(() => {
      const o = obligationLifted(fenBefore, fenAfter, student);
      if (!o) return null;
      const key = `lifted:${o.square}`;
      return fact({ key, claims: [key], text: obligationLiftedLine(o), proof: NO_PROOF.description, squares: [o.square, o.from, o.to], stakes: null, seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'obligationLifted',
    kind: 'their-read',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  openingStory: {
    // HOW A STRONG COACH EXPLAINS AN OPENING (OS-3): the fork, what it is, the
    // choice and its price, their setup, the coming game and its key idea —
    // each a computed fact, in the speed runs' order. Each beat under its own
    // kind (`STORY_KIND`); a plan aim is a claim shared with the plan thread,
    // so one plan is said once, and the student's plan thread it is on.
    read: ({ history, fen, student, namesStudentMoves }, fact) => safe(() => openingStoryAt({ history, student, namesStudentMoves })
      .flatMap((f) => {
        const playable = heldWhilePlayable(f, fen, student);
        if (playable && !namesStudentMoves) return [];
        return [fact({
          key: f.claimKey, claims: [f.claimKey, ...(f.aim ? [f.aim] : [])], kind: STORY_KIND[f.beat], storyBeat: f.beat,
          text: f.text, proof: f.proof, squares: [...f.squares], stakes: null, role: 'teach',
          // Their system and what it gave away are their side's; the rest is the student's story.
          seat: f.beat === 'their-setup' || f.beat === 'consequence' ? 'opponent' : 'student',
          namesStudentMove: playable, thread: f.aim ? threadKey('student', f.aim) : LOCAL_THREAD, fen,
        })];
      })),
    computer: 'openingStoryAt',
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
    // (`bookMoveWhy`) and what their move left undone. No job → no line. It
    // teaches (never a description) the left-book skill, on the board the
    // student left — graded there, never after the reply (prod Learn audit
    // 2026-10-14: graded after hxg4, "your bishop on g4" read as false).
    read: ({ history, student }, fact) => safe(() => {
      const dep = bookDeparture(history);
      if (!dep || dep.mover !== student || !dep.mainSan || history.length - dep.ply > 1) return null;
      const w = bookMoveWhy(dep.fen, dep.mainSan, dep.san, student);
      if (!w) return null;
      const spokenOn = boardAfter(dep.fen, dep.san);
      if (!spokenOn) return null;
      const key = `book-move:${dep.ply}:${dep.san}`;
      return fact({ key, claims: [key], text: w.text, proof: squaresProof(w.text, w.squares) ?? NO_PROOF.stated, squares: [...w.squares], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: spokenOn, role: 'teach', skill: FUNDAMENTAL_TAG['left-book-early'] });
    }),
    computer: 'bookMoveWhy',
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
    read: ({ fenBefore, playedSan, student, costCp }, fact) => safe(() => {
      const m = countMethod(fenBefore, playedSan, student, costCp);
      if (!m) return null;
      const key = countKey(m.square);
      return fact({ key, claims: [key], text: m.text, proof: NO_PROOF.method, squares: [m.square], stakes: { points: Math.abs(m.net), plies: 0 }, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore, role: 'teach' });
    }),
    computer: 'countMethod',
    kind: 'method',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  priorityFirst: {
    read: ({ fen, student, bestUci }, fact) => safe(() => {
      const pf = buildPriorityFirst({ fen, studentColor: student === 'w' ? 'white' : 'black', bestUci });
      if (!pf) return null;
      // The spoken package names the move; the held form is the priority
      // without it (Learn names no move unasked). The question and its answer
      // as ONE closed span — the stakes are part of the answer, so they wait
      // with it.
      const idea = packageForRegister({ ...pf.hint, detail: undefined }, 'obvious');
      const key = `priority:${pf.targetSquare}`;
      return fact({ key, claims: [key], text: pf.spoken, proof: squaresProof(pf.spoken, [pf.targetSquare]) ?? NO_PROOF.method, squares: [pf.targetSquare], stakes: null, seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen, role: 'teach',
        heldForm: { text: idea, proof: squaresProof(idea, [pf.targetSquare]) ?? NO_PROOF.method, squares: [pf.targetSquare] },
        marks: { play: pf.arrow } });
    }),
    computer: 'buildPriorityFirst',
    kind: 'priority',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  lastTimeHere: {
    // MEMORY BY POSITION (David 2026-10-15): the book-departure rows already
    // hold every position the student left theory from, the move and its
    // cost. Their own move, already played, is named; the book move never is.
    read: ({ fenBefore, playedSan, rows, currentGameId }, fact) => safe(() => {
      const r = lastTimeHere(fenBefore, playedSan, rows, currentGameId);
      if (!r) return null;
      const after = boardAfter(fenBefore, playedSan);
      if (!after) return null;
      // The proof is the move itself, from the board it was played on then.
      const line = { fen: r.departure.fen, sans: [r.departure.san] };
      const proof: FactProof = { kind: 'line', exact: true, short: `The move then was ${r.departure.san}`, full: `The move then was ${r.departure.san}`, line };
      return fact({ key: r.key, claims: [r.key], text: r.text, proof, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: after });
    }),
    computer: 'lastTimeHere',
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
    // A capture that looks free and leaves the student's queen with no way out.
    read: ({ fen }, fact) => safe(() => {
      const t = findQueenGrabTraps(fen)[0];
      if (!t) return null;
      const proof = queenGrabTrapProof(t);
      const key = `grab:${t.to}`;
      return fact({ key, claims: [key], text: queenGrabTrapLine(t), proof, squares: [t.from, t.to, t.replyFrom, t.replyTo, ...(proof.squares ?? [])], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'findQueenGrabTraps',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  trapped: {
    read: ({ fen, student }, fact) => safe(() => {
      const t = trappedOnBoard(fen, student);
      if (!t) return null;
      const squares = [t.square, t.attackerSquare];
      const line = `Careful — your ${PIECE_NAMES[t.piece] ?? 'piece'} on ${t.square} is attacked and has no safe square.`;
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      const key = `trapped:${t.square}`;
      return fact({ key, claims: [key], text, proof: proof ?? squaresProof(text, squares) ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], stakes: threatStakes(fen, student, squares), seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'trappedOnBoard',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: { wired: 'services/reviewTeachingPoints.ts' }, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  threatCost: {
    // A warning the surface wrote, with the cost it claims proven on the
    // board. Its claims are the loose pieces it names; the warning's own say-once
    // key is the surface's (the threat lane's), never this read's.
    read: ({ line, fen, student, squares }, fact) => safe(() => {
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      return fact({ key: `threat:${squares.join('')}`, claims: looseClaims(fen, student, squares), text, proof: proof ?? squaresProof(text, squares) ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], stakes: threatStakes(fen, student, squares), seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'provenThreatLine',
    kind: 'threat',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  structureMove: {
    // Learn's reader: the better move is held (David 2026-10-10).
    read: (ctx, fact) => safe(() => studentMoveStructure({ ...ctx, namesBetterMove: false }).map((r) => structureFact(r, fact, ctx.fenBefore, 'student'))),
    computer: 'studentMoveStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: { wired: 'services/learnBoardTeaching.ts' }, review: REVIEW, play: PLAY_ASK, chat: { not: 'a move judgement answers "why was my move bad"; chat reads the board judgements (structureBoard)' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureTheirMove: {
    read: ({ fenBefore, san, student }, fact) => safe(() => theirMoveStructure(fenBefore, san, student).map((r) => structureFact(r, fact, fenBefore, 'opponent'))),
    computer: 'theirMoveStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { not: 'about the opponent\'s last move; chat reads the board judgements (structureBoard)' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureBoard: {
    read: ({ fen, student }, fact) => safe(() => boardStructure(fen, student).map((r) => structureFact(r, fact, fen, 'student'))),
    computer: 'boardStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { wired: 'services/groundedAnswer.ts' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  structureLines: {
    read: ({ fen, student, lines }, fact) => safe(() => linesStructure(fen, student, lines, false).map((r) => structureFact(r, fact, fen, 'student'))),
    computer: 'linesStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: { not: 'owed — P1-12: lessons hold a MultiPV (openingGenerator) and the structural choice reads it' }, learn: LEARN, review: { not: 'Review stores one engine line per ply, not the MultiPV the fighting line compares' }, play: PLAY_ASK, chat: { not: 'chat\'s assessment has no MultiPV in hand' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK },
  },
  planThread: {
    // A plan aim is a claim the plan arc shares, and the student's plan thread.
    read: ({ thread, ...args }, fact) => safe(() => planThreadTurn(thread, args).map((l) => fact({
      key: l.claim, claims: [l.claim, ...(l.aim ? [l.aim] : [])], text: l.text, proof: l.proof, squares: l.squares, stakes: null,
      seat: l.seat, namesStudentMove: false, thread: l.aim ? threadKey('student', l.aim) : LOCAL_THREAD, fen: args.fenAfter,
      ...(l.arrows ? { marks: { route: l.arrows } } : {}),
    }))),
    computer: 'planThreadTurn',
    kind: 'plan-now',
    phase: ANY,
    surfaces: { lesson: LESSON_OWED, learn: LEARN, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_ASK, chat: CHAT_OWED, tactics: TACTICS_NA, weaknesses: WEAK_OWED },
  },
  tacticGeometry: {
    read: (ctx, fact) => safe(() => geometryReads(ctx).map((r) => fact({
      key: r.claim, claims: [r.claim], text: r.text, proof: r.proof, squares: r.squares, stakes: r.stakes ?? null,
      seat: 'student', namesStudentMove: r.namesMove, thread: LOCAL_THREAD, fen: ctx.fen,
      ...(r.motif ? { motif: r.motif } : {}),
      // A geometry idea is a habit of thought with no board claim of its own.
      ...(r.idea ? { heldForm: { text: r.idea, proof: NO_PROOF.method, squares: [] } } : {}),
      ...(r.proof.line ? { lines: [r.proof.line] } : {}),
    }))),
    computer: 'geometryReads',
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

/** The plan thread's adopt step (its state is the game's story's). */
export { adoptPlanTrial, type PlanThread } from './planThread';

/** THE KIND A COMPUTER'S FACTS CARRY: its row's, or — the one computer that
 *  states several — the opening story's beats' (`STORY_KIND`). Typed per
 *  computer, so a surface that speaks a computer under its own vocabulary
 *  (Review's facets, the live clauses) fails to compile on a kind it has no
 *  name for, as the per-surface relabel used to guarantee. */
type KindOf<K extends ComputerId> = K extends 'openingStory' ? (typeof STORY_KIND)[keyof typeof STORY_KIND] : (typeof BOARD_COMPUTERS)[K]['kind'];
export type BoardFact<K extends ComputerId> = CoachFact & { kind: KindOf<K> };

/** Every fact, in speaking order. */
export function readBoardAll<K extends ComputerId>(id: K, ctx: BoardContexts[K]): BoardFact<K>[] {
  const spec: ComputerSpec<BoardContexts[K]> = SPECS[id];
  if (outOfPhase(spec.phase, ctx)) return [];
  const fact: MakeFact = ({ key, kind, ...p }) => ({ ...p, id: `${id}:${key}`, ...placeFact(kind ?? spec.kind, p.seat), computer: spec.computer });
  const r = spec.read(ctx, fact);
  // The kind is the row's or the story's by construction (`fact` above is the
  // only maker, and only the story overrides its kind, with STORY_KIND).
  return (r === null ? [] : Array.isArray(r) ? r : [r]) as BoardFact<K>[];
}

/** The one call a surface makes — the first fact, or null. */
export function readBoard<K extends ComputerId>(id: K, ctx: BoardContexts[K]): BoardFact<K> | null {
  return readBoardAll(id, ctx)[0] ?? null;
}
