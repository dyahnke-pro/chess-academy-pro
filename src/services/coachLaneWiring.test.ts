// EVERY LANE WE ADDED, PROVED REACHABLE (David 2026-08-10: "I want you making
// sure that every thing we have added is wired and working 100% like it
// should!!").
//
// This is a WIRING gate, not a behaviour gate. Behaviour is covered by each
// lane's own file; what has repeatedly gone wrong this session is different and
// invisible: a lane that computes correctly, passes its own tests, and reaches
// nobody. Four were found by auditing rather than by a failing test —
//   · the plan queued at 'computed' rank instead of 'plan', so the borrowed
//     tier never stood down and the plan spoke last;
//   · the coach's own callout read from a stale closure and saw null;
//   · the eval-swing sentence that could only ever be zero;
//   · the hint register writing into the prompt array nobody reads.
// None of them threw. Each just quietly said nothing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string): string => readFileSync(p, 'utf8');
const TEACH = read('src/components/Coach/CoachTeachPage.tsx');
const HOOK = read('src/hooks/useDiscussionPractice.ts');
const BACKWARD = read('src/services/backwardLook.ts');
const FORK = read('src/services/forkNarration.ts');
/** Comments stripped. A rule about what the code must NOT DO has to read the
 *  code — the note explaining WHY a call was removed contains the very string
 *  the rule forbids, and a gate that trips on its own documentation teaches the
 *  next session to delete the documentation. */
const code = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '$1')).join('\n');
const TEACH_CODE = code(TEACH);
const HOOK_CODE = code(HOOK);

describe('every producer we added has a live consumer', () => {
  const wired: Array<[string, string, string]> = [
    ['the look-ahead plan', TEACH, 'planFromUci('],
    ['the key-square line', TEACH, 'keySquareLine('],
    ['the board read', TEACH, 'positionReadLine('],
    ['the line-shape read', TEACH, 'lineShapeLine('],
    ['the terminal read', TEACH, 'terminalReadLine('],
    ['the board marks', TEACH, 'planMarks('],
    ['the coach-side callout', BACKWARD, "side: 'coach'"],
    ['the coach-side concession', BACKWARD, 'findConcession('],
    // The three student-side lanes moved into `backwardLook`, which BOTH the
    // hook (bookkeeping) and the surface (voice) call — see the timing coupling
    // below for why the surface could not use the hook's answer.
    ['the student-side callout', BACKWARD, 'callInaccuracy('],
    ['the rear-facing PV', BACKWARD, 'whatItAllowed('],
    ['the structural drawback', BACKWARD, 'findStudentDrawback('],
    ['the backward look, from the surface', TEACH, 'backwardLook('],
    ['the backward look, from the hook', HOOK, 'backwardLook('],
  ];
  for (const [name, file, symbol] of wired) {
    it(`${name} is called`, () => {
      expect(file.includes(symbol), `${symbol} has no caller`).toBe(true);
    });
  }
});

describe('the lanes reach the VOICE, not just the prompt', () => {
  // The distinction that cost the hint register a whole session: `facts` feeds
  // the prompt, and the prompt only runs when the student types. A lane that
  // pushes there and nowhere else is silent during ordinary play.
  it('the plan is queued for speech at the PLAN rank', () => {
    expect(TEACH).toMatch(/queueSpokenHint\(planFen, graded, 'plan'\)/);
  });

  it('the coach callout is queued at the rank the model gives it', () => {
    // Not a literal 'coachMistake' any more: the coach half runs through
    // `backwardLook`, which returns the lane along with the line, so the rank
    // is decided in ONE place for both sides instead of at each call site.
    expect(TEACH).toMatch(/queueSpokenHint\(cm\.fenAfter, look\.line, look\.kind\)/);
    expect(BACKWARD, "the coach's lane is not the one David ranked second")
      .toMatch(/kind: 'coachMistake'/);
  });

  it('the student backward look is queued at the rank the model gives it', () => {
    // The 4th argument is the point: the square travels WITH the sentence, so
    // the board can be drawn from what the package kept.
    expect(TEACH).toMatch(/queueSpokenHint\(fenAfterReply, look\.line, look\.kind,/);
  });

  it('the borrowed tier is queued WITH the plan, so the yield rule can see both', () => {
    expect(TEACH).toMatch(/queueSpokenHint\(.*?borrowedLine, 'borrowed'\)/);
    expect(TEACH, 'the borrowed line is still packaged early, where no plan exists yet')
      .not.toMatch(/kind: 'borrowed' as const, text: teachingLine/);
  });

  it('the hint register speaks rather than only prompting', () => {
    const hintPushes = TEACH.match(/facts\.push\(packageForRegister\(/g)?.length ?? 0;
    // NB: not `[^)]*` — the call is `queueSpokenHint(probe.fen(), …)` and the
    // fen() closes a paren, so an exclusion class stops before the payload.
    const hintSpeaks = TEACH.match(/queueSpokenHint\(.*?packageForRegister\(/g)?.length ?? 0;
    expect(hintSpeaks, 'hints go to the prompt but never to the voice').toBeGreaterThanOrEqual(hintPushes - 1);
  });

  it('the in-book fork is offered, and shares the fork budget', () => {
    // Two fork beats, one question at a time: the BOOK fork (theory splits)
    // goes first and the ENGINE fork (near-equal options) stands down behind
    // it, both counting against the same per-game budget.
    expect(TEACH).toMatch(/forkOfferAt\(historyAfterReply/);
    expect(TEACH).toMatch(/queueSpokenHint\(probe\.fen\(\), bookFork\.said, 'fork'\)/);
    expect(TEACH, 'the engine fork can still fire on top of the book fork')
      .toMatch(/const fork = !bookFork &&/);
  });

  it("what the plan leaves out reaches the voice, and only the FULL narration", () => {
    // Its own field, not a tail on `text`: a probe caught all three fork roads
    // ending "Worth noticing: your pieces on a1, c1 and d1 sit this one out
    // entirely" — identical tails on options that exist to be told apart.
    // It is a part of the graded utterance now, carrying no squares of its own —
    // it is a noticing about what the plan LEAVES OUT, so there is nothing on
    // the board for it to point at.
    expect(TEACH, 'the aside is computed and never spoken')
      .toMatch(/\{ text: plan\.mine\.aside, squares: \[\], side: null \}/);
    expect(FORK, 'the compact road preview picked the aside back up')
      .not.toContain('.aside');
  });

  it('the plan rides ONE package — never both', () => {
    // David's game log, 2026-08-11: "Lots of double narrations." When the engine
    // read resolved before the synchronous instant pass, `lookaheadPlanRef`
    // matched, the plan went into the instant package AND was queued into the
    // late one, and both spoke — the second clip starting as the first (about
    // seventeen seconds of it) finished.
    expect(TEACH_CODE, 'the instant package carries the plan again')
      .not.toMatch(/kind: 'plan' as const, text: planLine/);
    expect(TEACH, 'the plan lost its one route to the voice')
      .toMatch(/queueSpokenHint\(planFen, graded, 'plan'\)/);
    // And only one producer draws its marks, for the same reason.
    expect((TEACH_CODE.match(/planMarks\(\{/g) ?? []).length,
      'two producers are painting the plan').toBe(1);
  });

  it('the queued package is actually spoken', () => {
    expect(TEACH).toMatch(/speakTrackA\(hintPkg\.spoken\)/);
  });
});

describe('a question lane can REACH the branch that answers it', () => {
  // ── THE PLAN LANE WAS DEAD ON EVERY SURFACE BUT ONE ──────────────────────
  // David 2026-08-11: "the coach could not answer my questions when asked."
  // PostHog: he asked "What is my plan?" on /coach/teach and was told "The best
  // move is e5" — one move, no plan, on a turn where the app had already
  // computed and spoken a plan twenty-five times.
  //
  // `assemblePlanAnswer` is guarded by `grounding.enginePlan`, and the ONLY
  // producer of that field was GameChatPanel's pre-injection. coachService
  // built one on demand for `whyBestMove` questions and nothing else, so a
  // correctly-classified plan question arrived at a branch it could never
  // enter. The lane computed, its tests passed, and it reached nobody — the
  // fourth instance of that shape in two days.
  const SERVICE = read('src/coach/coachService.ts');
  const API = read('src/services/coachApi.ts');

  it('a plan question builds the engine plan the plan branch requires', () => {
    expect(SERVICE, 'the on-demand build still only covers why-best-move')
      .toMatch(/whyBestMoveEngage \|\| planQuestionEngage/);
  });

  it('the branch it reaches is still guarded by that field', () => {
    // If this guard is ever dropped the fix above becomes pointless; if the
    // guard moves, this test says so rather than passing silently.
    expect(API).toMatch(/grounding\.planQuestion && grounding\.enginePlan/);
  });

  it('the piece a question narrowed to reaches the answer', () => {
    // "Which pawn should I push?" → "The best move is O-O." The lane answers
    // from the engine and never sees the words unless the restriction is
    // threaded to it.
    expect(SERVICE).toMatch(/askedPiece: restrictedPieceInAsk\(/);
    expect(API, 'the restriction is computed and then dropped on the floor')
      .toMatch(/askedPiece: grounding\.askedPiece/);
  });
});

describe('the couplings that make the wiring safe', () => {
  // ── THE TIMING COUPLING ───────────────────────────────────────────────────
  // This block used to assert that the coach verdict read `coachToMove` as a
  // REF rather than as state, and it passed, and the lane could not fire once.
  // Both halves of that assertion were true and the conclusion was false: the
  // ref was filled by a callback the Learn surface fires behind a deliberate
  // `setTimeout(…, 6000)`, so it always held the PREVIOUS turn's position and
  // the FEN guard — doing its job — refused every turn.
  //
  // Shape is not wiring. What these now hold is the SOURCE: anything the voice
  // says about a move already played must be computed from a read this turn
  // owns, never borrowed from the bookkeeping pass.
  it('the voice never reads what the deferred bookkeeping call writes', () => {
    expect(HOOK, 'the six-second deferral is what makes this hook unusable for speech')
      .toBeTruthy();
    expect(TEACH_CODE, 'the deferral the whole coupling turns on')
      .toMatch(/setTimeout\(\(\) => \{\s*void discussion\.evaluatePlayerMove/);
    expect(TEACH_CODE, 'the voice is reading the drawback the deferred call sets — it is one turn stale')
      .not.toContain('discussion.lastMoveDrawback');
    expect(TEACH_CODE, 'the coach verdict is reading the deferred ref again')
      .not.toContain('discussion.coachToMove');
    expect(HOOK_CODE, 'the hook still hands up a pre-move position nothing can use in time')
      .not.toMatch(/coachToMove: \{ current:/);
  });

  it('both verdicts come from ONE read of the board between the two moves', () => {
    // `move.fen` is where the student's move arrived AND where the coach moves
    // from, so one analysis answers both questions and costs one search.
    expect(TEACH).toMatch(/const midTurnRead = stockfishEngine\s*\n?\s*\.analyzeWithBudget\(move\.fen/);
    expect(TEACH).toMatch(/const mid = await midTurnRead;/);
    expect(TEACH, 'the student half never reaches the backward look').toMatch(/backwardLook\(\{/);
    expect(TEACH, 'the coach half never reaches the callout').toMatch(/side: 'coach'/);
    // Both halves go through the SAME model — the one thing that keeps
    // "inaccuracy" meaning the same on both sides of the board.
    expect((TEACH.match(/backwardLook\(\{/g) ?? []).length,
      'only one side is routed through the shared model').toBeGreaterThanOrEqual(2);
  });

  it('the pre-move read is captured before the eval bar overwrites it', () => {
    // The eval-bar effect re-keys `latestEvalRef` as soon as the board settles
    // on the new position, so the read of the board the student moved FROM has
    // to be taken in the move handler itself — and FEN-guarded, so a read of
    // any other board goes silent instead of being misattributed.
    expect(TEACH).toMatch(/const preStudentRead = latestEvalRef\.current\?\.fen === fenBefore/);
  });

  it('one model computes the backward look, so the two callers cannot drift', () => {
    expect(HOOK_CODE, 'the hook re-implements the lanes instead of calling the model')
      .toMatch(/backwardLook\(\{/);
    expect(HOOK_CODE).not.toMatch(/findStudentDrawback\(\{/);
    expect(TEACH).toMatch(/import \{ backwardLook \}/);
  });

  it('the pending-speak guard compares POSITION, not the whole FEN', () => {
    // A guard that fails on a halfmove clock silently drops the utterance.
    expect(TEACH).toMatch(/const samePosition = /);
    expect(TEACH).toMatch(/slice\(0, 4\)\.join\(' '\)/);
  });

  it('the marks are computed from what SURVIVED grading', () => {
    // Graded PART BY PART, so what survived is known rather than recovered from
    // the joined blob afterwards — and the marks are handed the survivors, not
    // the prose. `spoken: graded` was the old shape and it meant planMarks had
    // to parse squares back out of a sentence.
    expect(TEACH).toMatch(/gradeNarrationText\(p\.text, planFen/);
    expect(TEACH).toMatch(/saidParts: survived/);
    expect(TEACH_CODE, 'the marks are reading the prose again')
      .not.toMatch(/spoken: graded/);
  });
});
