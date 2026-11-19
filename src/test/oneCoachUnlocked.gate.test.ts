// ONE COACH, UNLOCKED (David 2026-11-19: "unlock the computers so they all
// fire on every surface"). Every surface computes everything through the one
// fact set (`moveThoughtFacts`) and the one composer (`computePositionFacts`);
// the decider picks what is said, the writer's row (`writerRegister`) how. A
// hand-picked per-surface computer list is the thing being removed, so this
// gate holds three doors shut:
//   (a) a registry surface answers `not:` only for a GENUINE missing input
//       (the reasons below, each with why); every other `not:` is a LOCK and
//       the lock count per surface may only fall (`LOCK_CEILING`);
//   (a') a surface claimed wired through the one fact set really reaches the
//       computer: the computer is read inside a function that surface's
//       consumer calls (`REACH`), not merely somewhere in the file;
//   (b) no surface file filters the fact set by computer, source or idea
//       beyond the clauses listed in `FILTER_DEBT` (each with its reason);
//   (c) no surface file calls a catalogued computer for words beyond
//       `DIRECT_CALL_DEBT` (logic-only calls named, the rest owed).
// The scanners are proved on planted violations.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { BOARD_COMPUTERS, type CoachSurface } from '../services/boardComputers';
import { COMPUTER_CATALOG } from '../services/coachFact';

const SRC = resolve(__dirname, '..');
const read = (rel: string): string => readFileSync(resolve(SRC, rel), 'utf8');

/** GENUINE: the surface lacks the input the computer reads, or the reading is
 *  the wrong tense or seat for it. Each pattern names why. */
export const GENUINE: ReadonlyArray<{ re: RegExp; why: string }> = [
  { re: /^a puzzle board has no game behind it/, why: 'a puzzle hands no moves played: the read needs the game' },
  { re: /step board (is one position|stops at one move|has no (move|earlier move))|step board does not carry|a step board's own pins/, why: 'a thinking step board is one position with no game or no student move' },
  { re: /a lesson's line is a model line|taught line's move is never the student's slip|no missed stop in a taught line|lesson's own played-out line says it/, why: 'a lesson shows a model line: there is no move of the student\'s to judge' },
  { re: /never as advice on a game already played|never the miss after it|not a past stop/, why: 'the tense: a stop still to play versus a stop missed' },
  { re: /^Play's writer row carries no opening story/, why: 'the writer row (WRITER.play.story false)' },
  { re: /^opening book knowledge — taught by the opening lessons, not a step of thinking/, why: 'David\'s eight thinking steps (FACT_GROUP → stepOf / THINK_STEP) own no opening step' },
  { re: /a step board asks the plan as its own step|the step's own question asks for the threat|the answer-danger step names its own key/, why: 'the thinking step is the question itself: the read would hand over its answer' },
  { re: /^Review keeps one line after the move: the per-capture lines/, why: 'the record stores one engine line per move; a read of every capture\'s line has no input on Review' },
  { re: /^Review keeps one line after the move: the comparison needs the engine's other top lines/, why: 'the record stores one engine line per move; a read comparing the top lines has no input on Review' },
  { re: /^the walk speaks none: the Theory button/, why: 'OPENING THEORY: the Review walk keeps it behind the Theory button (CLAUDE.md)' },
  { re: /^a habit is read across a game; a step board is one position|counts (a piece|the queen)'s trips across the game's moves/, why: 'it reads a whole game; a step board has none' },
];

export function isGenuine(reason: string): boolean {
  return GENUINE.some((g) => g.re.test(reason));
}

/** THE LOCKS LEFT, per speaking surface — may only fall. Each is an owed wire
 *  (the computer is read by a surface's own producer and not yet by the one
 *  fact set or the composer). Lower a ceiling when you open one; never raise it. */
const LOCK_CEILING: Record<Exclude<CoachSurface, 'weaknesses'>, number> = {
  learn: 53, review: 30, lesson: 45, play: 64, chat: 58, tactics: 88, think: 72,
};

/** BOTH WAYS (David 2026-11-19: "Make sure all computers work both ways"):
 *  the computers whose record half is not wired yet — `owed` (the board poses
 *  a skill and no record path files it) and `not` (each with its reason). Both
 *  may only fall: a computer converted files held / missed for the student's
 *  move through the one record path (`moveInsight.positionPosed` →
 *  `capabilityOutcomes`) and its fact carries the skill. */
const WEAKNESSES_OWED_CEILING = 57;
// 252 = 245 for the computers before 2026-11-19 round 2, plus the Danya
// have-check computers that arrived with a reasoned `not` (a description or an
// opportunity a clean move cannot answer); the four wired with them do not count.
// 259 = 252 plus the seven batch-2 computers (2026-11-19) with a reasoned
// `not`; kingActivityGap and zugzwangIfPassed are filed both ways.
const WEAKNESSES_UNWIRED_CEILING = 259;

/** Which functions of `moveThoughtFacts.ts` each surface's consumer calls:
 *  Learn's shared facts, Play's and a puzzle's tapped read (`boardReadFacts`)
 *  and Review's walk read the core; a lesson and chat add the lesson's board
 *  reads, the student-move bundle and the purpose; a thinking step adds its
 *  step board reads. */
const MOVE_READS = ['kingWalkReads', 'weighedReads', 'knownSlipReads'] as const;
const REACH: Partial<Record<CoachSurface, readonly string[]>> = {
  learn: ['moveThoughtFacts', ...MOVE_READS], play: ['moveThoughtFacts', ...MOVE_READS], tactics: ['moveThoughtFacts', ...MOVE_READS],
  // Review reads the move's board reads in its facet builder (reviewFullData
  // calls the same three functions), the rest through the core.
  review: ['moveThoughtFacts', ...MOVE_READS],
  lesson: ['moveThoughtFacts', 'LESSON_MOVE_READS', 'studentMoveFacts', 'purposeFact', ...MOVE_READS],
  chat: ['moveThoughtFacts', 'LESSON_MOVE_READS', 'studentMoveFacts', 'purposeFact', ...MOVE_READS],
  think: ['moveThoughtFacts', 'studentMoveFacts', 'STEP_BOARD_READS', ...MOVE_READS],
};

function bodyOf(src: string, name: string): string {
  const m = new RegExp(`^(export )?(function ${name}\\b|const ${name}\\b)`, 'm').exec(src);
  if (!m) throw new Error(`no ${name}`);
  const rest = src.slice(m.index + 1);
  const next = /^(export )?(function |const [A-Z_]+[ :=])/m.exec(rest);
  return src.slice(m.index, m.index + 1 + (next ? next.index : rest.length));
}

// ─── (b) fact-set filters ────────────────────────────────────────────────────
/** A clause of a fact-set `.filter` that picks facts by computer, source or idea. */
const FILTER_CLAUSE = /saidComputers\.has\(f\.computer\)|f\.source (?:!|=)== '[A-Za-z]+'|f\.computer (?:!|=)== '[A-Za-z]+'|thinkStepOf\(f\.computer\)|[A-Z_]+\.has\(f\.idea\)|ruleIdeas\.has\(f\.idea\)/g;

/** Every filter clause in the fact-set `.filter(` calls of a file's code. */
export function factSetFilterClauses(code: string): string[] {
  const out: string[] = [];
  const re = /\.filter\(\(f\) =>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    let depth = 1;
    let i = m.index + '.filter('.length;
    for (; i < code.length && depth > 0; i++) { if (code[i] === '(') depth++; else if (code[i] === ')') depth--; }
    const body = code.slice(m.index, i).replace(/\/\/[^\n]*/g, '');
    for (const c of body.match(FILTER_CLAUSE) ?? []) out.push(c);
  }
  return out;
}

/** The files that read the one fact set for a surface. */
const FACT_SET_READERS = [
  'services/coachFeatureService.ts', 'services/learnSharedFacts.ts', 'services/moveThoughtFacts.ts', 'services/boardReadFacts.ts',
  'services/reviewFullData.ts', 'services/positionReadComposer.ts', 'coach/questionThought.ts', 'components/Coach/CoachTeachPage.tsx',
];

/** The filter clauses left, each with its reason. GENUINE ones are a
 *  decider's input (the step a question or a thinking step asks, the tense);
 *  OWED ones drop a fact because the surface says it through its own
 *  producer — the next build deletes that producer and the clause. */
const FILTER_DEBT: Record<string, ReadonlyArray<{ clause: string; why: string }>> = {
  'services/coachFeatureService.ts': [
    { clause: "f.source === 'structureLines'", why: 'GENUINE (step selection): the board step keeps only the fighting line of the structure' },
    { clause: "f.source !== 'teachingMove'", why: 'OWED: Review\'s facets read the teaching-move computers' },
    { clause: "f.source !== 'pieceRoute'", why: 'GENUINE (tense): a trip is a plan forward; in a finished game the moves that followed were answers to the board — hindsight' },
  ],
  'services/moveThoughtFacts.ts': [
    { clause: "f.source === 'openingStory'", why: 'GENUINE (question scope): a story line about the board answers no question about a move' },
    { clause: 'thinkStepOf(f.computer)', why: 'GENUINE (David\'s steps): a thinking step says the computers that serve that step' },
  ],
};

// ─── (c) direct computer calls in surface files ──────────────────────────────
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) out.push(p);
  }
  return out;
}

/** Catalogued computers a surface file imports from the computer's own file and calls. */
export function directCalls(code: string): string[] {
  const out: string[] = [];
  for (const [name, row] of Object.entries(COMPUTER_CATALOG) as [string, { file: string }][]) {
    const mod = row.file.replace(/^services\//, '').replace(/\.ts$/, '');
    if (!new RegExp(`import[^;]*\\b${name}\\b[^;]*from '[./]*(?:services/)?${mod}'`, 's').test(code)) continue;
    if (new RegExp(`\\b${name}\\(`).test(code)) out.push(name);
  }
  return out;
}

/** The surface files' direct calls left. LOGIC: the call computes an input
 *  (a threat count, a board read the surface acts on), not words; OWED: the
 *  surface still speaks its own producer's words. */
const DIRECT_CALL_DEBT: Record<string, ReadonlyArray<string>> = {
  'coach/boardTurnAnswer.ts': ['buildDeliberation', 'computeMustDefend', 'readCriticalMoment', 'boardPlanFacts'],
  'coach/chatTurnAnswers.ts': ['computeMustDefend', 'readPosition'],
  'components/Coach/CoachGamePage.tsx': ['scanUpcomingTactics'],
  'components/Coach/CoachGameReview.tsx': ['intentWithFallback', 'renderThesis'],
  'components/Coach/CoachTeachPage.tsx': ['buildPriorityFirst', 'buildOpponentIntent', 'tacticInvariant', 'studentMovePoint', 'intentWithFallback', 'openingAnnouncementForGame', 'theirOpeningVerdict', 'structureNamingLine', 'pieceQualityLines', 'opponentGapClause', 'buildRejectedTempting', 'characterTurn', 'buildCausalChain', 'payoffFor', 'openingBreak', 'backwardLook', 'learnFundamentalVerdict', 'studentMovePointFact', 'moveOrder', 'learnMoveReason', 'kingPawnUnderFire', 'cheaperAttackerHit', 'gambitPoint', 'prizeTeaching', 'temptingTurnClause', 'uncertaintyClause', 'candidateCompareRead', 'heldFoundText', 'slipAnswerText', 'buildPlayCommentary', 'detectBehaviors', 'buildPositionalRead'],
  'components/Tactics/PatternSchoolPage.tsx': ['detectTactics'],
  'hooks/usePhaseNarration.ts': ['renderThesis', 'speakDeepestLookahead'],
};
/** LOGIC-ONLY calls (inputs, not words), named so they are never counted as owed. */
const LOGIC_ONLY: ReadonlySet<string> = new Set(['computeMustDefend', 'readCriticalMoment', 'buildDeliberation', 'detectTactics', 'scanUpcomingTactics']);

describe('one coach, unlocked', () => {
  const rows = Object.entries(BOARD_COMPUTERS) as [string, { surfaces: Record<CoachSurface, { wired?: string; not?: string }> }][];

  it('(a) a speaking surface is locked only where its locks may only fall', () => {
    const locks: Record<string, string[]> = {};
    for (const [id, spec] of rows) {
      for (const [s, a] of Object.entries(spec.surfaces) as [CoachSurface, { wired?: string; not?: string }][]) {
        if (s === 'weaknesses' || !a.not || isGenuine(a.not)) continue;
        (locks[s] ??= []).push(id);
      }
    }
    const over = (Object.keys(LOCK_CEILING) as Array<keyof typeof LOCK_CEILING>)
      .filter((s) => (locks[s]?.length ?? 0) > LOCK_CEILING[s])
      .map((s) => `${s}: ${locks[s].length} locks > ceiling ${LOCK_CEILING[s]}`);
    expect(over).toEqual([]);
  });

  it('both ways: the record half not yet wired may only fall', () => {
    const weak = rows.map(([, spec]) => spec.surfaces.weaknesses);
    const owed = weak.filter((a) => !a.wired && /owed/i.test(a.not ?? '')).length;
    const unwired = weak.filter((a) => !a.wired).length;
    expect(owed).toBeLessThanOrEqual(WEAKNESSES_OWED_CEILING);
    expect(unwired).toBeLessThanOrEqual(WEAKNESSES_UNWIRED_CEILING);
  });

  it('(a) the genuine reasons are told apart from a lock', () => {
    expect(isGenuine('a puzzle board has no game behind it, and this reads the moves played to reach the board')).toBe(true);
    expect(isGenuine('owed (one-coach P4): a puzzle\'s read reaches the one fact set and the composer, neither of which reads this yet')).toBe(false);
    expect(isGenuine('Play volunteers nothing (PLAY_VOLUNTEERS_COACHING)')).toBe(false);
    expect(isGenuine('a puzzle poses one tactic; this explains a game move')).toBe(false);
  });

  it("(a') a surface wired through the fact set really reaches the computer", () => {
    const src = read('services/moveThoughtFacts.ts');
    const bodies: Record<string, string> = {};
    const bad: string[] = [];
    for (const [id, spec] of rows) {
      const re = new RegExp(`readBoard(All)?\\('${id}'`);
      for (const [s, a] of Object.entries(spec.surfaces) as [CoachSurface, { wired?: string }][]) {
        if (a.wired !== 'services/moveThoughtFacts.ts' || !REACH[s]) continue;
        const ok = REACH[s].some((fn) => re.test((bodies[fn] ??= bodyOf(src, fn))));
        if (!ok) bad.push(`${id}/${s}`);
      }
    }
    // Review's walk reads the core and then filters (FILTER_DEBT): a claim its
    // filter drops is still a claim the walk computes; the filter is the debt.
    expect(bad).toEqual([]);
  });

  it('the tapped reads reach the fact set and the composer, Play and the puzzles included', () => {
    const brf = read('services/boardReadFacts.ts');
    expect(brf).toMatch(/moveThoughtFacts\(\{/);
    expect(brf).toMatch(/computePositionFacts\(\{[^}]*boardComputers: 'composer'/);
    expect(brf).toMatch(/history: game\.history/);
    expect(read('services/positionReadComposer.ts')).toMatch(/boardReadFacts\(\{/);
    expect(read('hooks/usePositionNarration.ts')).toMatch(/composePositionRead\(/);
    for (const f of ['components/Coach/CoachGamePage.tsx', 'components/Coach/CoachGameReview.tsx', 'components/Puzzles/PuzzleBoard.tsx', 'components/Puzzles/MistakePuzzleBoard.tsx', 'components/Tactics/TacticSetupBoard.tsx', 'components/Coach/CoachTeachPage.tsx']) {
      expect(read(f), f).toMatch(/usePositionNarration\(\{/);
    }
    // A puzzle's read withholds until it is solved; Play still volunteers nothing.
    expect(read('components/Puzzles/MistakePuzzleBoard.tsx')).toMatch(/withhold: state === 'correct' \? null/);
    expect(read('components/Coach/CoachGamePage.tsx')).toMatch(/PLAY_VOLUNTEERS_COACHING: boolean = false/);
  });

  it('(b) no fact-set filter by computer, source or idea beyond the named debt', () => {
    const bad: string[] = [];
    for (const f of FACT_SET_READERS) {
      const allowed = (FILTER_DEBT[f] ?? []).map((d) => d.clause);
      for (const c of factSetFilterClauses(read(f))) if (!allowed.includes(c)) bad.push(`${f}: ${c}`);
    }
    expect(bad).toEqual([]);
  });

  it('(b) the filter scanner catches a planted filter', () => {
    const planted = "const kept = thoughtFacts.filter((f) => f.step === 'yours' && f.computer !== 'moveJob' && !SOME_SET.has(f.idea));";
    expect(factSetFilterClauses(planted)).toEqual(["f.computer !== 'moveJob'", 'SOME_SET.has(f.idea)']);
    expect(factSetFilterClauses("x.filter((f) => f.step === 'yours')")).toEqual([]);
  });

  it('(c) no surface file calls a computer for words beyond the named debt', () => {
    const bad: string[] = [];
    for (const dir of ['components', 'hooks', 'coach']) {
      for (const p of walk(resolve(SRC, dir))) {
        const rel = relative(SRC, p);
        const allowed = DIRECT_CALL_DEBT[rel] ?? [];
        for (const c of directCalls(readFileSync(p, 'utf8'))) if (!allowed.includes(c)) bad.push(`${rel}: ${c}`);
      }
    }
    expect(bad).toEqual([]);
    // Named logic-only calls are inputs, never words.
    for (const name of LOGIC_ONLY) expect(name in COMPUTER_CATALOG, name).toBe(true);
  });

  it('(c) the call scanner catches a planted direct call', () => {
    const name = Object.keys(COMPUTER_CATALOG)[0];
    const file = (COMPUTER_CATALOG as Record<string, { file: string }>)[name].file.replace(/^services\//, '').replace(/\.ts$/, '');
    expect(directCalls(`import { ${name} } from '../services/${file}';\nconst t = ${name}(fen);`)).toEqual([name]);
    expect(directCalls(`const t = ${name}(fen);`)).toEqual([]);
  });
});
