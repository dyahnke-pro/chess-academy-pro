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
const PHASE = read('src/hooks/usePhaseNarration.ts');
const PLAY = read('src/components/Coach/CoachGamePage.tsx');
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

  it('the line picker is ranked by real games, and never blocks its own render', () => {
    // David 2026-08-11 handed this one over: "I leave you to build the
    // line/leaf picker." The taxonomy count it ranked by measures how finely
    // theory subdivided a line, not how often anyone plays it — so the top tile
    // asserted something the ordering had no data for.
    expect(TEACH).toMatch(/rankByPopularity\(options, canonicalPgn/);
    // Banded to the student, or the ordering is somebody else's repertoire.
    expect(TEACH).toMatch(/activeProfile\?\.puzzleRating \?\? activeProfile\?\.currentRating/);
    // ASYNC and in place. A lookup wired IN FRONT of a surface turns an instant
    // wrong answer into a slow one — the exact defect fixed in enginePlanContext
    // the same night — so the tiles must not await it.
    expect(TEACH_CODE, 'the picker awaits its own ranking').not.toMatch(/await rankByPopularity/);
    // The base position has to survive into state; destructuring the picker
    // result to name/options alone would silently make the whole pass inert.
    expect(TEACH).toMatch(/canonicalPgn\?: string;/);
    expect(TEACH, 'the caption is computed but never rendered').toMatch(/popularityLabel\(\{/);
  });

  it('every commentary beat is measurable, and reports whether it SPOKE', () => {
    // `playCommentary` knows nine kinds and not one emitted an event, so "does
    // the seeding observation ever fire?" had no answer short of reading a
    // transcript by hand. That blind spot is exactly what let
    // `gem_alert_spoken` sit at zero for its entire life.
    expect(TEACH).toMatch(/captureEvent\('coach_beat_offered'/);
    // BOTH outcomes, which is what makes the lane measurable now that it is
    // allowed to say nothing. Since the generic fallback was removed the
    // interesting question changed from "which of nine kinds fired" to "how
    // often does this lane stay silent" — and a lane that only emits when it
    // speaks cannot answer that. Silence is a measurement, not an absence.
    expect(TEACH, 'the lane does not report a reason firing').toMatch(/kind: 'reasons', spoke: true/);
    expect(TEACH, 'the lane does not report its silence').toMatch(/kind: 'reasons', spoke: false/);
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

  it('a best-move question builds its own grounding when the surface did not', () => {
    // 6 of 8 coach surfaces never threaded `engineBestMoveUci`, so a move
    // question there could ground only if the masters DB covered the position.
    // Measured on prod over 30 days: home-chat served the stock "I can't verify
    // that precisely" for 7 of 9 answers, review for 2 of 3.
    // The hint lane (2026-08-13) shares the same on-demand build — a hint is
    // a best-move ask that withholds the destination, so it needs the same
    // engine grounding on the six surfaces that never thread one.
    expect(SERVICE).toMatch(/\(bestMoveQuestionEngage \|\| hintRequestEngage\) && !input\.liveState\.engineBestMoveUci/);
    // And the two surfaces that DO thread one must not pay for a second search.
    expect(SERVICE, 'the guard that keeps the already-grounded surfaces free')
      .toMatch(/!input\.liveState\.engineBestMoveUci/);
    // The handoff has to actually fall back to the plan's move, or the build
    // above is wasted work.
    //
    // 🔒 AND IT MUST BE `resolvedEnginePlan`, NOT `input.liveState.enginePlan`.
    // This line used to assert the latter — so the test PINNED the bug: on a
    // surface that threads nothing (the whole reason the build exists) that
    // field is undefined, and the best-move dispatch got nothing while the plan
    // lane got the fresh search. See the dedicated case further down for the
    // prod measurement.
    expect(SERVICE).toMatch(/engineBestMoveUci: input\.liveState\.engineBestMoveUci \?\? resolvedEnginePlan\?\.bestMoveUci/);
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

describe('phase narration is judged against the board it was computed from', () => {
  // 🔒 THE COACH WENT SILENT EXACTLY WHERE IT SHOULD TEACH. The 2026-08-11
  // PostHog sweep found this gate dropping "Queen on d8 pins pawn on d3 against
  // queen on d1" and similar — none of them hallucinations. The claim is
  // computed at `event.fen`, the transition position; the gate judged it
  // against `getLiveFen()`, the board right now. Both are real boards, just
  // different ones, so a sentence true when detected became "board-false"
  // because the student moved while it was being phrased and streamed.
  // ── THE REASON LANE MUST ACTUALLY BE REACHED ─────────────────────────────
  //
  // `reasonCheck` shipped with ZERO runtime importers and `emit-notes.mjs`
  // dropped the `reasons` field on the way into the corpus, so the whole
  // multi-reason rule verified prose at authoring time and reached no student.
  // A wire that does not fire is not a wire (David 2026-08-07), and the way
  // this one dies is silently — every other lane keeps working.
  // ── PLAY GETS THE REASONS TOO ────────────────────────────────────────────
  //
  // David 2026-08-18: *"And wire into Play!"* — and this is the wire most
  // likely to rot, because Play's per-move path has several branches and the
  // reason line sits in the one that used to do nothing at all.
  //
  // It fills the QUIET-MOVE slot specifically. `buildFastMoveLine` returns null
  // when there is no blunder, no tactic and nothing hanging, which is most
  // moves — Play said nothing there. The detectors keep priority; the reasons
  // only take the slot they left empty.
  it('speaks checked reasons on a quiet move in Play', () => {
    expect(PLAY, 'the reason lane is not wired into coach-play at all')
      .toMatch(/reasonLineFor\(/);
    // From the PRE-move board. Handing it the post-move fen would check every
    // claim against the wrong position and silently drop the true ones.
    expect(PLAY, 'the reason lane is reading the wrong board')
      .toMatch(/reasonLineFor\(preFen, moveResult\.san\)/);
    // Silence stays available: 'off' means off, exactly as before this landed.
    expect(PLAY, "the 'off' verbosity no longer silences the reason lane")
      .toMatch(/verbosity === 'off' \? null : reasonLineFor/);
  });

  it('speaks the move\'s checked reasons, and nothing when there are none', () => {
    expect(TEACH, 'the reason lane is not wired into coach-teach at all')
      .toMatch(/reasonLineFor\(/);
    // NO REASON, NO SENTENCE (David 2026-08-18). The lane used to fall back to
    // `buildPlayCommentary` on every uncovered ply, which is where the filler
    // came from. The fallback must not come back into THIS lane — the other
    // call sites are engine-driven recommendation beats and are fine.
    expect(TEACH, 'the generic beat is back in the ambient computed lane')
      .not.toMatch(/computedLine \? null : buildPlayCommentary\(/);
  });

  it('grades against event.fen, not against whatever is on screen', () => {
    expect(PHASE).toMatch(/isSpokenSentenceGrounded\(trimmed, event\.fen/);
    expect(PHASE, 'the sentence is graded against a board it was not computed from')
      .not.toMatch(/isSpokenSentenceGrounded\(trimmed, judgeFen/);
  });

  it('hands the package the same board the gate used', () => {
    // Handing the package a different fen than the gate is how a line passes
    // one check and fails the other.
    expect(PHASE).toMatch(/kind: 'computed', text: trimmed, fen: event\.fen/);
  });

  it('decides staleness ONCE, for the whole transition', () => {
    // Judged per sentence against a moving board, some survived and some did
    // not — so the student heard a narration with holes in it, one clause
    // naming a piece the next had abandoned. Half a teaching line is not half
    // as good as a whole one, so the report is abandoned entire and says so.
    expect(PHASE).toMatch(/samePhasePosition\(liveNow, event\.fen\)/);
    expect(PHASE).toMatch(/usePhaseNarration\.stale/);
  });

  it('a ticking halfmove clock is not the board moving', () => {
    // Comparing whole FENs would abandon a perfectly current report — the same
    // guard shape CoachTeachPage.samePosition uses for its pending speech.
    expect(PHASE).toMatch(/split\(' '\)\.slice\(0, 4\)/);
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
    //
    // This asserted the LOCAL `const samePosition = …` for as long as there was
    // one. There is not, and that is the fix rather than a regression: the
    // comparison was rebuilt from scratch in nine places and the plan's MARKS
    // path used none of them, so speech and board drifted apart and a third of
    // the plans drew nothing. One owner now, imported.
    expect(TEACH).toMatch(/import \{ samePosition \} from '\.\.\/\.\.\/utils\/samePosition'/);
    expect(read('src/utils/samePosition.ts')).toMatch(/slice\(0, 4\)\.join\(' '\)/);
    expect(TEACH).toMatch(/samePosition\(pending\.fen, fenAfterReply\)/);
  });

  it('the taught slip is reachable on PLAY, above the engine fast path', () => {
    // David asked for the slip on Play specifically ("Also add the gem slip
    // adaptivity into play"). Play does NOT route its ordinary moves through
    // `getAdaptiveMove` — it has its own book→Stockfish fast path and falls
    // back to `getAdaptiveMove` only when both fail. So passing the options
    // into that fallback would satisfy a grep and fire approximately never,
    // which is the exact defect the slip lane exists to fix.
    //
    // The rule is therefore about ORDER, not presence: the slip is consulted
    // BEFORE the Stockfish fast path (else the engine always wins) and AFTER
    // the opening book (else a slip breaks the line the student asked to
    // practise).
    const PLAY = code(read('src/components/Coach/CoachGamePage.tsx'));
    expect(PLAY, 'play never asks for a slip').toMatch(/pickTaughtSlip\(/);
    const slipAt = PLAY.indexOf('pickTaughtSlip(');
    const engineAt = PLAY.indexOf('resolvePlayConfig(difficulty');
    const bookAt = PLAY.indexOf('getOpeningMoves(intendedOpeningName)');
    expect(slipAt, 'the slip sits below the engine — the engine always wins')
      .toBeLessThan(engineAt);
    expect(slipAt, 'the slip sits above the book — it would break the taught line')
      .toBeGreaterThan(bookAt);
    // And it is the SHARED picker, so the matrix and the once-per-game budget
    // cannot drift between the two surfaces.
    expect(PLAY).toMatch(/pickTaughtSlip\s*\(\s*game\.fen/);
    expect(PLAY, 'the slip is not told who the student is').toMatch(/studentElo: playerRating/);
  });

  it('the coach does not admit the same move twice', () => {
    // A deliberate walk-in is judged by BOTH lanes: the gem fires instantly off
    // a curated lookup, and the coach's own verdict re-derives the same slip
    // from the eval seconds later. Two admissions of one move in a row, and the
    // cross-package dedupe cannot catch them — both true, no shared clause to
    // match on. So the generic lane stands down when the curated one spoke.
    expect(TEACH).toMatch(/const gemCalledIt = gemFenRef\.current !== null/);
    expect(TEACH, 'the stand-down is not tied to the move being judged')
      .toMatch(/samePosition\(gemFenRef\.current, cm\.fenAfter\)/);
    // 🔒 AND NOT OFF `gemSeenRef`. That holds the last callout for the WHOLE
    // GAME, so reading it as "a gem fired" would mute every coach verdict from
    // the first gem to the final move. The question is never "has a gem ever
    // fired" but "did one fire about the move I am judging".
    expect(TEACH_CODE).not.toMatch(/gemCalledIt = gemSeenRef\.current !== null/);
  });

  it('play stays silent about the slip it walked into', () => {
    // The locked pure-playing-surface rule: no blocking card, no callout
    // naming the refutation. David, on the Learn picker offer: "But not in the
    // picker form. Keep it silent." Learn offers the trap as a road; Play just
    // plays the mistake and lets the student find it (or not — the post-game
    // review is where it gets discussed).
    const PLAY = code(read('src/components/Coach/CoachGamePage.tsx'));
    expect(PLAY, 'play announces the punish and hands over the answer')
      .not.toMatch(/findLivePunishment/);
  });

  it('the plan\'s marks use the SAME guard as the plan\'s speech', () => {
    // 🔒 THE MISSING-ARROWS BUG, MEASURED. David's game 2026-08-11: 18 plans
    // offered, 12 mark events. The speech was queued through a POSITION
    // comparison and passed; the marks were gated on whole-FEN `===` and
    // failed. So the coach said "you want to walk the knight round to b3, by
    // way of d2" and the board stayed empty — a third of the time.
    //
    // Two guards on one utterance must not disagree about what "still here"
    // means, and a halfmove clock ticking is not the board moving.
    // (The guard has since grown a second, equally position-based arm — the
    // reply still being in flight — which has its own case below. What this
    // one holds is that BOTH arms compare positions rather than whole FENs.)
    expect(TEACH).toMatch(/samePosition\(liveFenRef\.current, planFen\)/);
    expect(TEACH_CODE, 'the marks are back on whole-FEN equality')
      .not.toMatch(/liveFenRef\.current === planFen/);
    // ONE OWNER. The comparison was rebuilt from scratch in nine places and the
    // marks path used none of them; that is how the two halves drifted apart.
    expect(TEACH).toMatch(/import \{ samePosition \} from '\.\.\/\.\.\/utils\/samePosition'/);
    expect(TEACH_CODE, 'a local copy of the comparison has grown back')
      .not.toMatch(/const samePosition = \(a: string, b: string\)/);
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

  it('the best-move ask reads the plan the coach just BUILT for it', () => {
    // 🔒 THE ON-DEMAND BUILD FED EVERY CONSUMER EXCEPT THE ONE IT WAS ADDED
    // FOR. `buildEnginePlan` runs here so a best-move question can ground on a
    // surface that threads no engine data — and the grounding then read
    // `input.liveState.enginePlan`, which in exactly that case is undefined.
    // So the search ran, the plan lane got it, and the best-move dispatch —
    // which reads `engineBestMoveUci` — found nothing.
    //
    // Measured on prod 2026-08-11: "What is the best move here?" answered with
    // the canned "I can't verify that precisely" in 113ms, while "What is my
    // plan?" and a why-ask both answered correctly from the same cached plan
    // seconds earlier. The two working lanes read the built plan; the broken
    // one read a field nothing had filled.
    const SERVICE = code(read('src/coach/coachService.ts'));
    expect(SERVICE).toMatch(/engineBestMoveUci: input\.liveState\.engineBestMoveUci \?\? resolvedEnginePlan\?\.bestMoveUci/);
    expect(SERVICE, 'the eval is back on the threaded plan')
      .toMatch(/engineEvalCp: resolvedEnginePlan\?\.evalCp/);
    expect(SERVICE, 'the best move is read from a plan the build never fills')
      .not.toMatch(/engineBestMoveUci: input\.liveState\.engineBestMoveUci \?\? input\.liveState\.enginePlan/);
  });

  it('a question about THIS board is not answered as a glossary lookup', () => {
    // "What is the plan for white and black?" matches the concept lane too,
    // and the concept lane dispatches first — so David asked about the
    // position and was taught what a fork is. The plan lane has an answer
    // computed from the engine's line at this position; it wins.
    const SERVICE = code(read('src/coach/coachService.ts'));
    expect(SERVICE).toMatch(/conceptQuestion: conceptQuestionEngage && !planQuestionEngage/);
  });

  it('the plan\'s marks survive the reply still being in flight', () => {
    // 🔒 THE GUARD REFUSED THE VERY TURN IT WAS WRITTEN FOR. `planFen` is the
    // position AFTER the coach's reply — what the plan is about, and what the
    // student is about to see. `liveFenRef` is board state and does not carry
    // the reply until React renders it, so at the moment the marks run it still
    // holds `move.fen`. Demanding equality therefore failed on an ordinary turn.
    //
    // Measured on prod: 6 plans offered on one real game, 1 annotation, and the
    // diagnostic named both blanks with the live position exactly one ply
    // BEHIND the plan. Painting is allowed at the plan's position or the one
    // immediately before it; a student who has genuinely moved on still gets
    // nothing.
    expect(TEACH).toMatch(/samePosition\(liveFenRef\.current, planFen\)\s*\|\|\s*samePosition\(liveFenRef\.current, move\.fen\)/);
    expect(TEACH).toMatch(/if \(graded && boardIsHereOrArriving\)/);
  });

  it('a blank board says WHICH way it went blank', () => {
    // A lane that can only be observed when it fires cannot be debugged when it
    // doesn't — the same lesson as the coach verdict. Both silent branches emit.
    expect(TEACH).toMatch(/CoachTeachPage\.planMarks\.boardMovedOn/);
    expect(TEACH).toMatch(/CoachTeachPage\.planMarks\.drewNothing/);
  });

  it('a finished game keeps its board and OFFERS the review', () => {
    // 🔒 IT USED TO NAVIGATE THE INSTANT MATE LANDED. David, 2026-08-11:
    // "Screen went black with checkmate (didn't show the final move). I want
    // the board to persist and an option to review to pop up instead of
    // transitioning to black without showing the final move."
    //
    // His game ended at 20:39:22 and the review became usable at 20:40:53 —
    // ninety-one seconds of empty screen, because the route change fired
    // before the review page had anything to draw, and the mating move was
    // never on a board he could look at.
    //
    // The RECORD is still written immediately (the review, the mistake
    // puzzles and the weakness spine all hang off it and must not wait for a
    // tap); only the navigation moved behind the button.
    // The card moved into its own component so it could be RENDERED in a test
    // rather than only grepped — see TeachGameOverCard.test.tsx for the
    // behaviour. This gate keeps the wiring: the page still mounts it.
    expect(TEACH).toMatch(/<TeachGameOverCard/);
    expect(read('src/components/Coach/TeachGameOverCard.tsx')).toMatch(/data-testid="teach-game-over"/);
    // 🔒 THE NINETY-ONE SECONDS OF BLACK SCREEN, PINNED AT ITS CAUSE. The old
    // effect called `navigate('/coach/review/…')` the instant `isGameOver`
    // flipped: David never saw the mating move and sat on an empty screen for
    // a minute and a half while the review analysed. The record is still
    // written immediately — the fix is that LEAVING is a tap, not a
    // consequence.
    //
    // Asserted structurally because it is a structural property: the effect
    // may only set state, and the only navigation to the review must live
    // inside a click handler. A component render could show the card and
    // still miss a redirect racing it.
    expect(TEACH, 'the game-over effect navigates instead of offering')
      .toMatch(/The offer, NOT the navigation[\s\S]{0,200}setFinishedGame\(\{/);
    const gameOverEffect = TEACH.slice(
      TEACH.indexOf('const teachGameOverHandledRef'),
      TEACH.indexOf('handleStudentMoveRef.current = handleStudentMove'),
    );
    expect(gameOverEffect.length, 'could not locate the game-over effect').toBeGreaterThan(200);
    expect(gameOverEffect, 'the finished game still redirects on its own')
      .not.toMatch(/navigate\(`\/coach\/review\//);
    // And the way OUT is a callback the card invokes on a press — never
    // anything the page does to itself.
    expect(TEACH).toMatch(/onReview=\{\(\) => \{ void navigate\(`\/coach\/review\/\$\{finishedGame\.id\}`\); \}\}/);
    expect(read('src/components/Coach/TeachGameOverCard.tsx')).toMatch(/data-testid="teach-review-game"/);
    expect(TEACH).toMatch(/setFinishedGame\(\{/);
    expect(TEACH_CODE, 'the game-over effect navigates on its own again')
      .not.toMatch(/\}\s*\n\s*void navigate\(`\/coach\/review\/\$\{gameId\}`\);/);
  });

  it('the review does not re-log what the step event already carries', () => {
    // Four audit events per arrow key filled David's 300-entry buffer with
    // playback bookkeeping and evicted the game he had just played — so he
    // reported "no forks noted" about a game whose fork offers had simply
    // aged out of the window. `review-nav` was a strict subset of
    // `review-playback-step`.
    const PLAYBACK = code(read('src/hooks/useReviewPlayback.ts'));
    expect(PLAYBACK, 'the duplicate nav event is back').not.toMatch(/kind: 'review-nav'/);
    expect(PLAYBACK).toMatch(/kind: 'review-playback-step'/);
  });

  it('LEARN detects the phase change on the board the student is LOOKING AT', () => {
    // 🔒 WHY LEARN NEVER SAID A WORD AT A PHASE CHANGE (David, twice: "Still
    // no phase transition").
    //
    // The call passed `move.fen` — the position after the STUDENT's move —
    // from a site that runs inside `played.ok`, AFTER the coach's reply has
    // landed. `usePhaseNarration` then compares the report's position against
    // the live board and, finding them a ply apart, abandons the WHOLE report
    // as stale. Not sometimes: every transition Learn ever detected, by
    // construction.
    //
    // The detector was innocent — replaying his real game through it fires
    // `opening-to-middlegame` at ply 15, his move 8 — and a prod probe caught
    // it being called with correct arguments. The report was built and thrown
    // away, which is the hardest kind of dead lane to see: everything works.
    expect(TEACH).toMatch(/runPhaseTransition\(liveFenRef\.current, move\.san/);
    expect(TEACH_CODE, 'the transition is judged against a board that has already moved on')
      .not.toMatch(/runPhaseTransition\(move\.fen/);
  });

  it('the phase lane is visible in durable analytics', () => {
    // Asking PostHog whether `phase-transition-detected` had ever fired came
    // back "that event does not exist in this project" — which reads exactly
    // like a dead lane and meant only that nothing was listening. A lane
    // David has now reported twice must be answerable from analytics, and
    // the interesting answer is never just "did it fire" but where it
    // stopped: suppressed, abandoned stale, or served from the fallback.
    const ANALYTICS = read('src/services/analytics.ts');
    for (const kind of [
      'phase-transition-detected', 'phase-transition-suppressed',
      'phase-narration-latency', 'phase-narration-fallback-shown',
    ]) {
      expect(ANALYTICS, `${kind} is emitted but mirrored nowhere`).toContain(`'${kind}':`);
    }
  });

  it('the temporary phase devtools logging is gone', () => {
    // Labelled "temporary devtools instrumentation — remove once Dave
    // reproduces and we diagnose" and shipped to paying users ever since.
    // He reproduced; it is diagnosed; the PostHog mirror above replaces it
    // with something durable and queryable.
    // All THREE files — the hook had eleven of its own that a first pass
    // missed, which is exactly the argument for a gate over a grep.
    for (const f of [
      'src/services/phaseTransitionDetector.ts',
      'src/components/Coach/CoachGamePage.tsx',
      'src/hooks/usePhaseNarration.ts',
    ]) {
      expect(read(f), `${f} still ships devtools logging`).not.toContain("console.log('[PHASE");
    }
  });

  it('a game finished under a PAUSED walkthrough is still a finished game', () => {
    // 🔒 FOUND BY THE FIRST DRIVEN GAME THAT EVER REACHED AN ENDING. The audit
    // asked for the Vienna, left theory at ply 4 and played on to a threefold
    // repetition — a real, complete game — and nothing happened: no result
    // card, no review offer, and no `db.games` row.
    //
    // The guard read `walkthrough.isActive` alone. But the free-play board is
    // interactive whenever the walkthrough is inactive OR PAUSED — that is the
    // predicate `useEnginePonder` uses to decide the board is live — and
    // pausing mid-lesson to play the position out is the ordinary way a Learn
    // game happens. So every such game fell straight through this guard.
    //
    // The card was the visible half. The invisible half was worse: `db.games`
    // is the row the review, the mistake puzzles and the weakness spine all
    // hang off, so those games were never learned from at all.
    expect(TEACH).toMatch(/const boardWasPlayable = !walkthrough\.isActive \|\| walkthrough\.phase === 'paused'/);
    expect(TEACH).toMatch(/if \(!boardWasPlayable \|\| teachGameOverHandledRef\.current/);
    expect(TEACH_CODE, 'the finished game is gated on the bare active flag again')
      .not.toMatch(/if \(walkthrough\.isActive \|\| teachGameOverHandledRef\.current/);
  });

  it('the finished game is stamped with the PLAYING rating, not the puzzle one', () => {
    // Same duplication that put a puzzle rating on the opponent's strength:
    // an inline `currentRating ?? puzzleRating` rebuilt beside the one owner.
    // The row this writes is what the review and the weakness spine read.
    expect(TEACH).toMatch(/const rating = studentPlayingRating\(activeProfile\)/);
    expect(TEACH_CODE, 'the game record rebuilt the rating resolution inline')
      .not.toMatch(/const rating = activeProfile\?\.currentRating \?\? activeProfile\?\.puzzleRating/);
  });
});
