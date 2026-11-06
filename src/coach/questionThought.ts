/**
 * questionThought — THE REVERSED MATRIX (David 2026-11-06: "help answer
 * questions from users"). A board question is answered by the thought a lesson
 * says on the move it is about — the same facts, the same composer, the same
 * order — keeping only the steps of the thought the question asks for. One
 * ordering everywhere; a lane no longer stacks its own sentences (the plan
 * answer led with "their pawn on b2 looks like it can chase a piece" before
 * the plan, prod chat audit 2026-11-06).
 *
 * 🔒 A `Record` over the questions it answers: a new one fails to compile
 * until it says which move the question is about and which steps answer it.
 */
import { Chess } from 'chess.js';
import { THOUGHT_ORDER, type ThoughtStep } from '../services/thoughtComposer';
import type { FactGroup } from '../services/coachFact';
import { questionThought } from '../services/moveThoughtFacts';
import { captureContextsAlong } from '../services/pvPlayback';
import { NO_PREV_CAPTURE } from '../services/captureRun';
import type { IntentReads } from '../services/moveIntent';
import type { DecisiveReason } from '../services/decisiveReason';
import { uciToSans } from '../services/structureJudgementKit';

export type ThoughtQuestion = 'plan' | 'why-best-move' | 'opponent-move';
/** Every question the board answers from the coach's own read. */
export type AskedQuestion = ThoughtQuestion | 'tactics';

interface QuestionSpec {
  /** The move the question is about: the best move now, their last move, or
   *  none (the question is about the whole board). */
  move: 'best' | 'their-last' | 'board';
  /** THE IDEAS THAT ANSWER IT, in the order they are said: the groups of
   *  facts the question asks for. A move question says only these; a board
   *  question says these first and the rest of its read after them, in
   *  thought order — a habit check never leads "what's the plan?" (prod chat
   *  audit 2026-11-06: "Their pawn on b2 looks like it can chase a piece you
   *  post here…" came before the plan). */
  groups: readonly FactGroup[];
}

/** 🔒 One row per question: a new question fails to compile until it says
 *  which move it is about and which ideas answer it. */
export const QUESTION_IDEAS: Record<AskedQuestion, QuestionSpec> = {
  // What cannot wait, then the plan: the story, the structure, their plan.
  plan: { move: 'board', groups: ['danger', 'tactics', 'story', 'structure', 'theirSide'] },
  // What is forcing on the board: what is attacked, the shots, the choices.
  tactics: { move: 'board', groups: ['danger', 'tactics', 'choices'] },
  // Why the best move: what it does, the moves it beats, the order, the line.
  'why-best-move': { move: 'best', groups: ['move', 'choices', 'notYet', 'line', 'story', 'structure', 'tactics', 'concepts'] },
  // Why they played it: what their move is after, and what it threatens.
  'opponent-move': { move: 'their-last', groups: ['move', 'theirSide', 'danger', 'line', 'story', 'structure', 'tactics', 'concepts'] },
};

/** The order a board question says its read in: the groups it asks for, then
 *  every other group in thought order. 0 leads. */
export function askedRank(q: AskedQuestion, group: FactGroup, step: ThoughtStep): number {
  const i = QUESTION_IDEAS[q].groups.indexOf(group);
  return i >= 0 ? i : QUESTION_IDEAS[q].groups.length + THOUGHT_ORDER[step];
}

export interface QuestionContext {
  /** The board the question is asked on. */
  fen: string;
  /** Every move of the game so far, from the starting position — ignored
   *  when it does not reach `fen` (a position set up on its own). */
  history: readonly string[];
  studentColor: 'white' | 'black';
  /** The move a best-move question is about (UCI): the engine's best now, or
   *  the move the student named. */
  bestUci: string | null;
  /** The engine's reads around the move (`moveIntent`'s four), where the
   *  surface has them; the line said after the move is read off them. */
  reads: IntentReads | null;
  /** THE reason the move is best (`decisiveReason`), for its choices step. */
  reason: DecisiveReason | null;
}

export interface QuestionAnswer { text: string; move: { san: string; from: string; to: string } }

/** The thought that answers `q`, or null when the composer has nothing to say
 *  (the lane's own answer stands then). A board question is answered from the
 *  coach's read (`boardTurnAnswer`), never here. */
export function answerQuestionThought(q: ThoughtQuestion, ctx: QuestionContext): QuestionAnswer | null {
  const spec = QUESTION_IDEAS[q];
  if (spec.move === 'board') return null;
  // The game's moves when they reach this board; a set-up position has none.
  const replay = new Chess();
  let reaches = true;
  try { for (const s of ctx.history) replay.move(s); } catch { reaches = false; }
  const sameBoard = (a: string, b: string): boolean => a.split(' ').slice(0, 4).join(' ') === b.split(' ').slice(0, 4).join(' ');
  if (!reaches || !sameBoard(replay.fen(), ctx.fen)) reaches = false;
  const gameMoves: readonly string[] = reaches ? ctx.history : [];
  const startFen = reaches ? new Chess().fen() : ctx.fen;
  const board = new Chess(ctx.fen);
  const me = ctx.studentColor === 'white' ? 'w' : 'b';
  const runs = captureContextsAlong(startFen, gameMoves);
  let fenBefore: string;
  let san: string;
  let history: readonly string[];
  if (spec.move === 'best') {
    if (!ctx.bestUci) return null;
    fenBefore = board.fen();
    try {
      san = new Chess(fenBefore).move({ from: ctx.bestUci.slice(0, 2), to: ctx.bestUci.slice(2, 4), promotion: ctx.bestUci[4] }).san;
    } catch { return null; }
    history = gameMoves;
  } else {
    if (gameMoves.length === 0) return null;
    const before = new Chess();
    try { for (const s of gameMoves.slice(0, -1)) before.move(s); } catch { return null; }
    fenBefore = before.fen();
    san = gameMoves[gameMoves.length - 1];
    history = gameMoves.slice(0, -1);
  }
  const moverIsStudent = (fenBefore.split(' ')[1] === 'b' ? 'b' : 'w') === me;
  // A question about their move asked after the student's own: not theirs.
  if (spec.move === 'their-last' && moverIsStudent) return null;
  let mv;
  try { mv = new Chess(fenBefore).move(san); } catch { return null; }
  // The line said after the move: the engine's own, read on the board after it.
  const after = ctx.reads?.after.find((l) => l.rank === 1) ?? ctx.reads?.after[0];
  const onAfter = new Chess(fenBefore);
  onAfter.move(san);
  const line = after?.moves.length ? uciToSans(onAfter.fen(), after.moves) : [];
  const k = history.length;
  const theirLast = k > 0 ? (() => {
    const b = new Chess();
    try { for (const s of history.slice(0, -1)) b.move(s); } catch { return null; }
    return { fenBefore: b.fen(), san: history[k - 1] };
  })() : null;
  const composed = questionThought({
    fenBefore, san: mv.san, moverIsStudent, prev: runs[k] ?? NO_PREV_CAPTURE, line: line.length ? line : null, theirLast, history,
    reads: ctx.reads, costCp: null, theory: true,
  }, new Set(spec.groups), null, spec.move === 'best' ? ctx.reason : null);
  const text = composed.spoken.trim();
  return text ? { text, move: { san: mv.san, from: mv.from, to: mv.to } } : null;
}
