// The engine-reading half of `movePurpose` — for a surface that holds no reads
// (the chat's "why did they play that?"). Kept out of `movePurpose.ts` so the
// pure computers that import it never pull in the engine.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { nullMoveFen, type MoveIntent, type IntentReads } from './moveIntent';
import { decisiveReason, type DecisiveReason } from './decisiveReason';
import { intentWithFallback } from './movePurpose';
import { stockfishEngine } from './stockfishEngine';
import { deepFact } from './threeFacts';
import { uciToSans } from './structureJudgementKit';
import { answerQuestionThought, type QuestionAnswer, type ThoughtQuestion } from '../coach/questionThought';
import { captureRunOfMoves, NO_PREV_CAPTURE, type PrevCaptureContext } from './captureRun';
import { stepThought } from './moveThoughtFacts';
import type { ThinkingStep } from './thinkingSteps';
import type { LessonPositionCandidate } from './thinkingPositions';

const DEPTH = 14;
const BUDGET_MS = 900;

/** The four reads `moveIntent` and `decisiveReason` need, from the engine
 *  (MultiPV 3 before the move, so the next-best is in hand). Null on any
 *  engine failure. */
async function readIntentReads(fenBefore: string, san: string, beforeRead?: readonly AnalysisLine[]): Promise<IntentReads | null> {
  let fenAfter: string;
  try { const c = new Chess(fenBefore); if (!c.move(san)) return null; fenAfter = c.fen(); } catch { return null; }
  const read = async (fen: string | null): Promise<AnalysisLine[]> => {
    if (!fen) return [];
    try { return (await stockfishEngine.analyzeWithBudget(fen, DEPTH, BUDGET_MS)).topLines ?? []; } catch { return []; }
  };
  const before = beforeRead?.length ? [...beforeRead] : await read(fenBefore);
  const after = await read(fenAfter);
  if (!before.length || !after.length) return null;
  const passBefore = await read(nullMoveFen(fenBefore));
  const passAfter = await read(nullMoveFen(fenAfter));
  return { before, after, passBefore, passAfter };
}

/** The purpose of `san`, reading every position it needs. Null on any engine
 *  failure — a surface that asked gets the rest of its answer. */
export async function movePurpose(fenBefore: string, san: string, seat: 'student' | 'opponent'): Promise<MoveIntent | null> {
  const reads = await readIntentReads(fenBefore, san);
  return reads ? intentWithFallback(fenBefore, san, reads, seat, false, true) : null;
}

/** THE reason for `san` (`decisiveReason`), reading every position it needs. */
export async function moveReason(fenBefore: string, san: string, seat: 'student' | 'opponent',
  /** The capture run after the move before (`captureRun`), or null when unknown. */
  prevCapture: PrevCaptureContext | null): Promise<DecisiveReason | null> {
  const reads = await readIntentReads(fenBefore, san);
  if (!reads) return null;
  // ASKED, SO ANSWERED (David 2026-11-17: "I don't want chat limited for
  // beginners … if they ask a complex question about a deep line, coach
  // should reply with the appropriate answer"): a forced mate the student
  // asked about is stated, whatever their record — the "can you see it?" test
  // is Learn's, where nobody asked.
  return decisiveReason({ fenBefore, san, reads, seat, prevCapture, namesStudentMoves: true });
}

/** WHAT THE MOVE SETS UP (the three facts, WO-THINK-01): the mover's next move
 *  or the one after it down the engine's line from the board after `san`,
 *  when this move made it possible — the computer Learn and Review read
 *  (`threeFacts.deepFact`), so the chat says what they say. Null on any engine
 *  failure, or when the move set nothing up. */
export async function moveDeepFact(fenBefore: string, san: string, seat: 'student' | 'opponent'): Promise<{ text: string; squares: string[] } | null> {
  let fenAfter: string;
  try { const c = new Chess(fenBefore); if (!c.move(san)) return null; fenAfter = c.fen(); } catch { return null; }
  let pv: readonly string[] = [];
  try { pv = (await stockfishEngine.analyzeWithBudget(fenAfter, DEPTH, BUDGET_MS)).topLines?.find((l) => l.rank === 1)?.moves ?? []; } catch { return null; }
  const deep = deepFact(fenBefore, san, uciToSans(fenAfter, pv), seat === 'student');
  return deep ? { text: `${seat === 'student' ? 'Your' : 'Their'} ${san} is ${deep.text}.`, squares: deep.squares } : null;
}

/** "WHAT'S THE BEST MOVE?" ASKED (David 2026-10-17: "I also want why Qd3 is
 *  best. Not just the answer"). The student asked, so the answer can afford a
 *  deeper look than the live read: ONE read picks the move AND feeds its
 *  reason, so the move named and the why are the same judgement (the shallow
 *  live read had called Qd3 best where Stockfish at depth 16 does not list it). */
const ASKED_DEPTH = 16;
const ASKED_BUDGET_MS = 2000;
interface AskedBest { uci: string; san: string; evalCp: number | null; mateIn: number | null; pvSan: string[]; reason: DecisiveReason | null }
export async function askedBestMove(fen: string, prevCapture: PrevCaptureContext | null): Promise<AskedBest | null> {
  let lines: AnalysisLine[] = [];
  try { lines = (await stockfishEngine.analyzeWithBudget(fen, ASKED_DEPTH, ASKED_BUDGET_MS)).topLines ?? []; } catch { return null; }
  const top = [...lines].filter((l) => l.moves.length > 0).sort((a, b) => a.rank - b.rank)[0];
  if (!top) return null;
  const pvSan: string[] = [];
  try { const c = new Chess(fen); for (const u of top.moves) pvSan.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { /* the playable prefix */ }
  const san = pvSan[0];
  if (!san) return null;
  const reads = await readIntentReads(fen, san, lines);
  const reason = reads ? decisiveReason({ fenBefore: fen, san, reads, seat: 'student', prevCapture, namesStudentMoves: true }) : null;
  return { uci: top.moves[0], san, evalCp: typeof top.evaluation === 'number' ? top.evaluation : null, mateIn: top.mate ?? null, pvSan, reason };
}

/** A MOVE QUESTION ANSWERED BY THE ONE THOUGHT (the reversed matrix, David
 *  2026-11-06): "why is Rxe5 best?" or "why did they play that?" reads the
 *  four positions around the move, THE reason for a best move, and hands them
 *  to the composer, which says the ideas the question asks for in the thought's
 *  order (`questionThought.QUESTION_IDEAS`). Null on any engine failure or when
 *  the thought has nothing to say — the asking lane's own answer stands then. */
export async function askedMoveThought(
  q: ThoughtQuestion,
  board: { fen: string; history: readonly string[]; studentColor: 'white' | 'black' },
  bestSan: string | null,
): Promise<(QuestionAnswer & { reason: DecisiveReason | null }) | null> {
  let fenBefore: string;
  let san: string;
  if (q === 'opponent-move') {
    if (board.history.length === 0) return null;
    const c = new Chess();
    try { for (const s of board.history.slice(0, -1)) c.move(s); } catch { return null; }
    fenBefore = c.fen();
    san = board.history[board.history.length - 1];
  } else {
    if (!bestSan) return null;
    fenBefore = board.fen;
    san = bestSan;
  }
  const reads = await readIntentReads(fenBefore, san);
  if (!reads) return null;
  let uci: string;
  try { const m = new Chess(fenBefore).move(san); uci = `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
  const me = board.studentColor === 'white' ? 'w' : 'b';
  const seat: 'student' | 'opponent' = (fenBefore.split(' ')[1] === 'b' ? 'b' : 'w') === me ? 'student' : 'opponent';
  const reason = q === 'opponent-move' ? null : decisiveReason({ fenBefore, san, reads, seat, prevCapture: captureRunOfMoves(null, board.history), namesStudentMoves: true });
  const answer = answerQuestionThought(q, { fen: board.fen, history: board.history, studentColor: board.studentColor, bestUci: uci, reads, reason });
  return answer ? { ...answer, reason } : null;
}

/** WHICH MOVE A STEP'S TEACHING IS ABOUT (Learn how to think, one coach). A
 *  `Record`: a new step fails to compile until it says. `their-last` — the
 *  move that made the board (it changed something); `played` — the student's
 *  own move from it, when the board came from their game (is it safe?);
 *  `best` — the move the board asks for (the puzzle's answer, else the
 *  engine's best). */
const STEP_MOVE: Record<ThinkingStep, 'their-last' | 'played' | 'best'> = {
  assess: 'best',
  'their-move-changed': 'their-last',
  'am-i-safe': 'best',
  'answer-danger': 'best',
  'their-targets': 'best',
  'forcing-moves': 'best',
  'hit-two': 'best',
  candidates: 'best',
  calculate: 'best',
  'is-my-move-safe': 'played',
};

/** THE STEP'S TEACHING ON ONE LESSON BOARD — the same facts every surface
 *  says, read through the one composer and kept to this step's computers
 *  (`stepThought`, `THINK_STEP`), after the student's answer closes. Reads
 *  the engine for the move it is about; null when nothing on this board
 *  serves the step (the answer's own reasons stand alone then). */
export async function thinkingStepTeaching(step: ThinkingStep, pos: LessonPositionCandidate): Promise<string | null> {
  const want = STEP_MOVE[step];
  let fenBefore: string | null = null;
  let san: string | null = null;
  let mover: 'student' | 'opponent' = 'student';
  if (want === 'their-last') {
    if (pos.beforeFen && pos.prevSan) { fenBefore = pos.beforeFen; san = pos.prevSan; mover = 'opponent'; }
  } else if (want === 'played' && pos.playedSan) {
    fenBefore = pos.fen; san = pos.playedSan;
  }
  // The engine's best line from the step board: the move the board asks for,
  // and the line the board computers read.
  let boardRead: readonly AnalysisLine[] = [];
  try { boardRead = (await stockfishEngine.analyzeWithBudget(pos.fen, DEPTH, BUDGET_MS)).topLines ?? []; } catch { boardRead = []; }
  if (!san) {
    fenBefore = pos.fen;
    san = pos.line?.[0] ?? null;
    const u = boardRead[0]?.moves[0];
    if (!san && u) { try { san = new Chess(pos.fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { san = null; } }
  }
  let asked: Parameters<typeof stepThought>[2] = null;
  if (fenBefore && san) {
    const reads = await readIntentReads(fenBefore, san, fenBefore === pos.fen && boardRead.length ? boardRead : undefined);
    let line: string[] | null = null;
    try {
      const after = new Chess(fenBefore); after.move(san);
      const top = reads?.after[0]?.moves ?? [];
      line = top.length ? uciToSans(after.fen(), top) : null;
    } catch { line = null; }
    asked = {
      fenBefore, san, moverIsStudent: mover === 'student', prev: NO_PREV_CAPTURE, line,
      theirLast: mover === 'student' && pos.beforeFen && pos.prevSan ? { fenBefore: pos.beforeFen, san: pos.prevSan } : null,
      history: [], story: false, reads, costCp: null, theory: false, plainThreatsSeen: false,
    };
  }
  const board = {
    fen: pos.fen,
    pv: boardRead[0]?.moves ?? [],
    played: pos.playedSan ?? null,
    theirLast: pos.beforeFen && pos.prevSan ? { fenBefore: pos.beforeFen, san: pos.prevSan } : null,
  };
  const text = stepThought(step, board, asked).spoken.trim();
  return text || null;
}
