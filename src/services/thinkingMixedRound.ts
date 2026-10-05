// thinkingMixedRound — the PURE half of a MIXED round of "Learn how to think"
// (plan D6, the Steps Method's "mix" books).
//
// Once a tier is proven, a lesson can mix its steps: each board comes from one
// of several proven steps, and the student first decides WHICH question the
// board asks ("Am I safe?" / "Where are their targets?" / …) — the decision a
// real game demands before any step can be run. Then they answer that step's
// tap question.
//
// The grading is computed, never authored (G0): a step APPLIES to a board when
// its own kit has a FAIR key there (the same test that decides whether a board
// may be used for that step at all). When several apply, any of them is right.
//
// No Dexie, no engine, no React.
import type { Square } from 'chess.js';
import type { StepKit } from './thinkingLessonSession';
import { boardIdentity, isFairKey, type LessonPositionCandidate } from './thinkingPositions';
import { THINKING_STEPS, type ThinkingStep } from './thinkingSteps';
import type { AnswerDetail } from './capabilityEvidence';
import { orList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

/** The step id a mixed round is filed under (memory, resume, the audit row). */
export const MIXED_STEP = 'mixed';

/** One board of a mixed round, with every step whose question it fairly asks. */
export interface MixedBoard {
  candidate: LessonPositionCandidate;
  /** Steps that apply, in the order the round's kits were given (routine order). */
  applicable: string[];
  /** Each applicable step's key on this board. */
  keys: Record<string, Square[]>;
}

/** The steps whose question this board fairly asks, with their keys. */
export function applicableSteps(kits: readonly StepKit[], c: LessonPositionCandidate): { step: string; key: Square[] }[] {
  const out: { step: string; key: Square[] }[] = [];
  for (const k of kits) {
    let key = null;
    try { key = k.keyFor(c.fen, c); } catch { key = null; }
    if (isFairKey(key)) out.push({ step: k.step, key: [...new Set(key.key)] });
  }
  return out;
}

/**
 * The boards of a mixed round: one per step in the mix (the size of the
 * exercise — every step gets a board when the pool has one for it), own games
 * before puzzles, never a board already used. For each step the board it alone
 * applies to is preferred (the choice is crispest there); a board several steps
 * apply to is used when no crisp one exists. The order is shuffled by a stable
 * hash of each board, so the routine's order never gives the answer away and
 * the same pool always yields the same round (resume-safe, testable).
 */
export function mixedBoards(
  kits: readonly StepKit[],
  candidates: readonly LessonPositionCandidate[],
  seen: ReadonlySet<string>,
): MixedBoard[] {
  const ordered = [
    ...candidates.filter((c) => c.origin === 'game'),
    ...candidates.filter((c) => c.origin === 'puzzle'),
  ];
  const pool: MixedBoard[] = [];
  const ids = new Set<string>();
  for (const c of ordered) {
    const id = boardIdentity(c.fen);
    if (seen.has(id) || ids.has(id)) continue;
    ids.add(id);
    const hits = applicableSteps(kits, c);
    if (hits.length === 0) continue;
    pool.push({
      candidate: c,
      applicable: hits.map((h) => h.step),
      keys: Object.fromEntries(hits.map((h) => [h.step, h.key])),
    });
  }
  const used = new Set<MixedBoard>();
  const out: MixedBoard[] = [];
  for (const k of kits) {
    const fits = pool.filter((b) => !used.has(b) && b.applicable.includes(k.step));
    const pick = fits.find((b) => b.applicable.length === 1) ?? fits[0];
    if (!pick) continue;
    used.add(pick);
    out.push(pick);
  }
  const rank = (b: MixedBoard): number => stemKeyOf(boardIdentity(b.candidate.fen));
  return out.sort((a, b) => rank(a) - rank(b));
}

/** How a step is named on a chip and in the coach's voice. */
export function stepLabel(step: string): string {
  return step in THINKING_STEPS ? THINKING_STEPS[step as ThinkingStep].name : step;
}

const quoted = (step: string): string => `"${stepLabel(step)}"`;

const CHOICE_PROMPTS = [
  'Which question does this board ask?',
  'Before you look for anything: which question is this board asking?',
  'First decide — which question does this position ask?',
];

/** The step-choice question, rotated on the board. */
export function choicePromptLine(rot: number): string {
  return rotateStem(CHOICE_PROMPTS, rot);
}

/** Spoken when a mixed round begins. */
export const MIXED_INTRO = 'A mixed round: every skill here is one you have proven. On each board, first decide which question it asks — then answer it.';

/**
 * What the coach says once the student has picked a step (or said they do not
 * know). A right pick names the question — no praise per tap; a wrong pick says
 * why it does not fit (the chosen step has nothing clean to find here) and names
 * the question the board does ask.
 */
export function choiceLine(chosen: string | null, applicable: readonly string[], rot: number): string {
  if (chosen && applicable.includes(chosen)) {
    const others = applicable.filter((s) => s !== chosen);
    if (others.length > 0) return `${stepLabel(chosen)} — this board asks that, and ${orList(others.map(quoted))} as well.`;
    return rotateStem([
      `${stepLabel(chosen)} — that's the question here.`,
      `${stepLabel(chosen)} — that's what this board asks.`,
    ], rot);
  }
  const asks = orList(applicable.map(quoted));
  if (!chosen) return `This board asks ${asks}.`;
  return `Nothing on this board answers ${quoted(chosen)} cleanly. It asks ${asks}.`;
}

/** The step whose tap question follows the choice: the chosen one when it
 *  applies, else the first that does (routine order). */
export function gradedStep(chosen: string | null, applicable: readonly string[]): string {
  return chosen && applicable.includes(chosen) ? chosen : applicable[0];
}

/** A settled step choice. */
export interface StepChoiceAnswer {
  fen: string;
  /** null = "I don't know". */
  chosen: string | null;
  applicable: string[];
  /** The step whose tags the choice is recorded on. */
  graded: string;
  right: boolean;
  msToFirst: number | null;
}

/** The one answer shape (`AnswerDetail`) for a step choice: a pick is one
 *  answer, a wrong pick one wrong attempt, "I don't know" is help that gives
 *  it away (so the row is prompted, per the one outcome rule). */
export function choiceAnswerDetail(a: StepChoiceAnswer): AnswerDetail {
  return {
    taps: [],
    extras: [],
    wrongAttempts: a.chosen && !a.right ? 1 : 0,
    firstMissHelp: 'none',
    msToFirst: a.msToFirst,
    msBetween: [],
    help: a.chosen ? 'none' : 'dont-know',
    spoken: false,
    chainDepth: 0,
    wrongTags: [],
    ...(a.chosen ? { typed: a.chosen } : {}),
    questionId: 'step-choice',
    keySize: a.applicable.length,
    surface: 'thinking-lesson-mixed',
  };
}
