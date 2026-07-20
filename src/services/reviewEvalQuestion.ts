// reviewEvalQuestion — §4 diagnostic question family: GUESS-THE-EVAL.
// (docs/plans/2026-07-19-review-should-vs-is.md — the question family)
//
// Danya's classic teaching device: "Pause here — who's better, and by how much?"
// The student commits to a read, THEN the board tells the truth. It trains the
// single most transferable skill — evaluation — and it is 100% G0-grounded: the
// eval is the engine number already computed for the segment (evalAfter), and the
// bucket + reveal are DETERMINISTIC functions of that number. Nothing here asks
// the LLM for a value, a line, or a reason it can invent.
//
// Honesty contract: the five choices are ALWAYS the same five buckets in the same
// order, so which options appear never leaks the answer. The answer is revealed
// only after the student commits (the card enforces the flow).

export type EvalBucketId =
  | 'winning-you'
  | 'better-you'
  | 'equal'
  | 'better-them'
  | 'winning-them';

export interface EvalChoice {
  id: EvalBucketId;
  label: string;
}

export interface EvalQuestion {
  /** The position being judged (student to move OR just-played — the card shows it). */
  fen: string;
  /** WHITE-POV centipawns (the segment's evalAfter convention). */
  evalCp: number;
  studentColor: 'white' | 'black';
  /** Square-free, quality-free probe — reveals nothing about the answer. */
  prompt: string;
  /** ALWAYS these five, same order — the option set never leaks the answer. */
  choices: EvalChoice[];
  answerId: EvalBucketId;
  /** Grounded reveal: the true magnitude + a deterministic qualitative label.
   *  No invented WHY — just the number the engine computed, put in words. */
  reveal: string;
}

/** Below this |cp| the two sides are, for teaching purposes, balanced. */
const EQUAL_CP = 60;
/** At/above this |cp| one side is decisively winning (mate scores land here too). */
const WINNING_CP = 300;

/** The fixed five-choice ladder, student-POV framed. Order is stable so the
 *  presence of an option never hints at the answer. */
const CHOICES: EvalChoice[] = [
  { id: 'winning-you', label: "You're winning" },
  { id: 'better-you', label: "You're better" },
  { id: 'equal', label: "It's about equal" },
  { id: 'better-them', label: "Your opponent's better" },
  { id: 'winning-them', label: "Your opponent's winning" },
];

/** Map a student-POV centipawn value to its bucket. */
export function bucketForStudentCp(studentCp: number): EvalBucketId {
  if (studentCp >= WINNING_CP) return 'winning-you';
  if (studentCp <= -WINNING_CP) return 'winning-them';
  if (studentCp >= EQUAL_CP) return 'better-you';
  if (studentCp <= -EQUAL_CP) return 'better-them';
  return 'equal';
}

/** Pawns string for the reveal, e.g. 1.4 → "1.4". Mate-ish scores clamp. */
function pawnsPhrase(absCp: number): string {
  if (absCp >= 1000) return 'a decisive';
  return `about ${(absCp / 100).toFixed(1)} pawns`;
}

/** Compose the grounded reveal for a bucket + magnitude. States ONLY the true
 *  number and a deterministic qualitative label — never an invented reason. */
function composeReveal(bucket: EvalBucketId, studentCp: number): string {
  const abs = Math.abs(studentCp);
  const mag = pawnsPhrase(abs);
  const decisive = abs >= 1000;
  switch (bucket) {
    case 'winning-you':
      return decisive
        ? "It's completely winning for you here — the engine calls it decisive. The job now is to convert cleanly."
        : `You're winning here — ${mag} to your side. A real edge; now bring it home without letting it slip.`;
    case 'winning-them':
      return decisive
        ? "It's lost for you here — the engine calls it decisive the other way. Worth knowing where it went wrong."
        : `Your opponent's winning here — ${mag} their way. This is the kind of spot to fight the hardest.`;
    case 'better-you':
      return `You're better, but not winning — ${mag} in your favour. Keep pressing; nothing's decided yet.`;
    case 'better-them':
      return `Your opponent's the one who's better here — ${mag} their way. Solid defence is the order of the day.`;
    case 'equal':
      return "It's about level here — the engine has it near dead-even. Anyone's game.";
  }
}

/**
 * Build a guess-the-eval question for a segment's position, or null when the
 * position isn't worth asking about (no eval, or a near-forced/decided spot the
 * question wouldn't teach). `evalCp` is WHITE-POV centipawns (segment.evalAfter).
 */
export function buildEvalQuestion(args: {
  fen: string;
  evalCp: number | null;
  studentColor: 'white' | 'black';
}): EvalQuestion | null {
  const { fen, evalCp, studentColor } = args;
  if (evalCp === null || !Number.isFinite(evalCp)) return null;
  const studentCp = studentColor === 'white' ? evalCp : -evalCp;
  const answerId = bucketForStudentCp(studentCp);
  return {
    fen,
    evalCp,
    studentColor,
    prompt: 'Pause here — how would you assess this position?',
    choices: CHOICES,
    answerId,
    reveal: composeReveal(answerId, studentCp),
  };
}

/** Did the student pick the right bucket? Exact-bucket match. */
export function judgeEvalAnswer(q: EvalQuestion, pickedId: EvalBucketId): boolean {
  return pickedId === q.answerId;
}
