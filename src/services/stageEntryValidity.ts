// stageEntryValidity — is a post-walkthrough stage entry actually USABLE?
//
// These four predicates decide whether a `concepts` / `findMove` / `drill` /
// `punish` entry can be surfaced to the student. They lived in
// `useTeachWalkthrough.ts` — a HOOK — which meant the generator side
// (`openingGenerator.getMissingStages`) could not import them and grew its own,
// weaker test: `array.length > 0`.
//
// That divergence was the "teach me the traps in X spins forever" bug (David
// 2026-08-04). A cached tree whose `punish` array was non-empty but held only
// UNSTARTABLE lessons — the legacy-Dexie / shared-Supabase-cache population
// described in `isStartablePunishLesson` below, which never re-ran
// `repairPunishStage` — deadlocked:
//
//   1. the stage menu asked "does punish have entries?" → validity check → NO,
//      so it parked a `pendingStageJump` and showed the loading state;
//   2. background gen asked "is punish missing?" → LENGTH check → NO, so it
//      regenerated nothing and never notified anyone;
//   3. the jump only resolves when the tree gains entries. It never did.
//
// One shared definition, in a leaf both sides can import, is the fix. A stage
// whose entries are all invalid is MISSING — that is the only reading under
// which the producer and the consumer agree.
import { Chess } from 'chess.js';
import { stripSanAnnotations } from '../data/openingWalkthroughs/validate';
import type {
  PunishLesson,
  ConceptCheckQuestion,
  FindMoveQuestion,
  DrillLine,
} from '../types/walkthroughTree';

/** Is this punish lesson safe to launch as a trap walkthrough?
 *
 *  The picker feeds EVERY punish lesson on the tree into
 *  `buildPunishWalkthroughTree` + `start()`. Fresh gen paths
 *  (`generatePunishFromDb` / `repairPunishStage` / `gemToPunishLesson`)
 *  guarantee the shape, but a lesson that entered `tree.punish` via a LEGACY
 *  Dexie tree or the SHARED Supabase cache never re-runs the repair pipeline —
 *  `getCachedOpening` only re-checks the tree's move legality, not the
 *  punish-stage field shapes. Such a lesson can be missing `distractors` /
 *  `setupMoves`, or carry an illegal inaccuracy / punishment. Launching it used
 *  to throw synchronously in the picker's onClick (missing field) or freeze the
 *  board at the setup position (illegal SAN) — the "trap line fails to start"
 *  bug (David 2026-07-15).
 *
 *  Requirements: a punishment + inaccuracy SAN, at least one distractor (so the
 *  fork is a real choice, not a degenerate auto-answer), a reachable start
 *  position (setupFen OR replayable setupMoves), and legality of
 *  inaccuracy → punishment from that position. */
export function isStartablePunishLesson(lesson: PunishLesson | null | undefined): boolean {
  if (!lesson) return false;
  const distractors = Array.isArray(lesson.distractors) ? lesson.distractors : [];
  const setupMoves = Array.isArray(lesson.setupMoves) ? lesson.setupMoves : [];
  if (distractors.length < 1) return false;
  if (typeof lesson.inaccuracy !== 'string' || !lesson.inaccuracy.trim()) return false;
  if (typeof lesson.punishment !== 'string' || !lesson.punishment.trim()) return false;
  try {
    const c = lesson.setupFen ? new Chess(lesson.setupFen) : new Chess();
    if (!lesson.setupFen) {
      for (const san of setupMoves) c.move(stripSanAnnotations(san));
    }
    // The opponent's inaccuracy, then the student's punishment, must
    // both be legal from the resolved position.
    if (!c.move(stripSanAnnotations(lesson.inaccuracy))) return false;
    if (!c.move(stripSanAnnotations(lesson.punishment))) return false;
  } catch {
    return false;
  }
  return true;
}

/** Shape-guards for the OTHER post-walkthrough stages (David 2026-07-15
 *  — the "did you sweep for similar failures?" pass). Same failure class
 *  as `isStartablePunishLesson`: `concepts` / `findMove` / `drill` are
 *  loaded from the SAME cache paths as `punish`, and a legacy Dexie tree
 *  or shared Supabase cache entry never re-runs its `repair*Stage`. A
 *  malformed one (missing `choices` / `candidates` / `moves`) makes the
 *  QuizPanel's `q.choices.map(...)` / `q.candidates.map(...)` throw at
 *  RENDER time (worse than punish's onClick throw) or the drill runtime
 *  crash on `line.moves.length`. Gate the stage counts + the pickers on
 *  these so a stage composed only of malformed entries never shows a
 *  dead tile, and defend the renders/handlers so one that slips through
 *  degrades to empty instead of crashing. */
export function isValidConceptsQuestion(q: ConceptCheckQuestion | null | undefined): boolean {
  return (
    !!q &&
    typeof q.prompt === 'string' &&
    q.prompt.trim().length > 0 &&
    Array.isArray(q.choices) &&
    q.choices.length >= 2 &&
    q.choices.some((c) => !!c && c.correct)
  );
}

export function isValidFindMoveQuestion(q: FindMoveQuestion | null | undefined): boolean {
  return (
    !!q &&
    typeof q.prompt === 'string' &&
    q.prompt.trim().length > 0 &&
    Array.isArray(q.candidates) &&
    q.candidates.length >= 2 &&
    q.candidates.some((c) => !!c && c.correct)
  );
}

export function isValidDrillLine(line: DrillLine | null | undefined): boolean {
  return !!line && Array.isArray(line.moves) && line.moves.length > 0;
}

/** Does this stage array hold at least one entry the student can actually be
 *  shown? The single definition of "the stage exists" — used by the stage menu
 *  (may I jump there?) AND by the generator (must I rebuild it?). Those two
 *  answering differently is what hung the trap stage. */
export function stageArrayHasUsableEntry(
  stage: 'concepts' | 'findMove' | 'drill' | 'punish',
  arr: unknown,
): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  switch (stage) {
    case 'punish':
      return (arr as PunishLesson[]).some(isStartablePunishLesson);
    case 'concepts':
      return (arr as ConceptCheckQuestion[]).some(isValidConceptsQuestion);
    case 'findMove':
      return (arr as FindMoveQuestion[]).some(isValidFindMoveQuestion);
    case 'drill':
      return (arr as DrillLine[]).some(isValidDrillLine);
    default:
      return false;
  }
}
