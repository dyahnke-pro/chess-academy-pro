// thinkingLessonSession — runs one "Learn how to think" lesson on one step:
// Show → Guide → Solo (or a single Solo review when the step is already known),
// on the student's own boards first.
//
// Framework-free so it can be tested end to end: every side effect (voice, the
// evidence record, the clock, timers, the board the page shows) is injected.
// The page (via useThinkingLesson) renders `view` and forwards taps.
//
// The per-step specifics (the key, the words) come from a StepKit, so adding a
// step is adding a kit — the runner does not change.
//
// A MIXED round (plan D6) runs on the same runner: each board first asks the
// student WHICH step applies (chips), then that step's question. A lesson that
// was stopped resumes at the board it stopped on (plan D8, `progress`).
import type { Square } from 'chess.js';
import {
  applyDontKnow, applySilence, applyTap, questionDone, completeLine, foundLine, newQuestion,
  NUDGE_AFTER_MS, nudgeLine, spokenWithoutTaps, stagesFor, summariseAnswer,
  type AnswerSummary, type LessonStage, type QuestionState, type StepStanding,
} from './thinkingLesson';
import { boardIdentity, pickFairPosition, type ChosenLessonPosition, type FairKey, type LessonPositionCandidate } from './thinkingPositions';
import { emitThinkingLesson } from './thinkingLessonEvents';
import { rotateStem, stemKeyOf as hashKey } from '../utils/rotateStem';
import type { FollowUp } from './thinkingExchangeChain';
export type { FollowUp } from './thinkingExchangeChain';
import {
  MIXED_INTRO, choiceLine, choicePromptLine, gradedStep, mixedBoards, stepLabel,
  type MixedBoard, type StepChoiceAnswer,
} from './thinkingMixedRound';

/** Everything step-specific. */
export interface StepKit {
  step: string;
  keyFor: (fen: string, candidate?: LessonPositionCandidate) => FairKey | null;
  /** The worked example: the method, then every key square's reason. */
  showLine: (fen: string, key: readonly Square[], rot: number) => string;
  /** The question. Gets the board so a step can ask a board-specific form
   *  (step 5 asks about a pinned piece when piling on wins it). */
  prompt: (rot: number, fen?: string) => string;
  /** What rules a wrong tap out — the method, never the answer. */
  wrongTapLine: (fen: string, sq: Square) => string;
  /** After a question closes: why each key square is in the key. */
  reasonFor: (fen: string, sq: Square) => string | null;
  /** Spoken when the lesson begins. */
  intro: string;
  /** Optional: turn a candidate into this step's board (e.g. play the move
   *  the student actually chose); null drops it. */
  adapt?: (c: LessonPositionCandidate) => LessonPositionCandidate | null;
  /** Optional: a fact this step needs that only the engine can give (the top
   *  moves for "candidates"), computed once per board before the lesson. A
   *  board that cannot be enriched returns null and is dropped. */
  enrich?: (c: LessonPositionCandidate) => Promise<LessonPositionCandidate | null>;
  /** Optional: the book's own words on this habit (verbatim public-domain
   *  passage, fetched by id) — read once, after the worked example. */
  book?: () => Promise<string | null>;
  /** Optional (plan C1, follow-up chains): after a RIGHT answer on a Guide or
   *  Solo board, the questions only understanding answers about one key
   *  square ("tap its attackers" -> "its defenders" -> "who takes first").
   *  Each link carries its own computed key; an empty list means no chain. */
  followUps?: (fen: string, sq: Square, rot: number) => FollowUp[];
}

export interface AnsweredQuestion {
  step: string;
  stage: LessonStage;
  position: ChosenLessonPosition;
  summary: AnswerSummary;
}

export interface SessionDeps {
  say: (text: string) => Promise<void>;
  record: (answer: AnsweredQuestion) => Promise<void>;
  remember: (step: string, fen: string) => Promise<void>;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => () => void;
  onView: (view: LessonView) => void;
  /** A mixed round's step choice settled (recorded as evidence like a tap). */
  recordChoice?: (choice: StepChoiceAnswer) => Promise<void>;
  /** Where the lesson is, at the start of every board; null once it runs to
   *  its end. A stopped lesson leaves its last position, so the next start of
   *  the same step resumes there (plan D8). */
  progress?: (p: LessonProgress | null) => Promise<void>;
  /** Optional: read the board pool again. Called ONCE, when the pool runs
   *  dry mid-lesson — on a fresh install the puzzle store is still seeding
   *  when the lesson starts (audit 2026-10-06: two boards, then the end). */
  refill?: () => Promise<readonly LessonPositionCandidate[]>;
}

/** A running lesson's place: its stage plan and the board it is on. */
export interface LessonProgress {
  step: string;
  stages: LessonStage[];
  cursor: number;
}

/** A step-choice chip in a mixed round. */
export interface StepChip {
  step: string;
  label: string;
}

export interface LessonView {
  active: boolean;
  /** The step being taught (audits read it off the board). */
  step: string | null;
  stage: LessonStage | null;
  fen: string | null;
  /** Squares to paint: found (green), wrong (red), shown answer (yellow). */
  found: Square[];
  wrong: Square[];
  shown: Square[];
  /** The piece a follow-up chain is about (painted so the eye stays on it). */
  focus: Square[];
  /** Whether taps are being accepted right now. */
  asking: boolean;
  prompt: string | null;
  /** The step's place in the lesson (1-based) and the total. */
  index: number;
  total: number;
  /** A mixed round: the steps the student chooses between (empty otherwise). */
  choices: StepChip[];
  /** Whether a step choice is being asked right now. */
  choosing: boolean;
}

/** Positions per stage: one worked example, two guided, one solo. */
const PER_STAGE: Record<LessonStage, number> = { show: 1, guide: 2, solo: 1 };

export const IDLE_LESSON_VIEW: LessonView = {
  active: false, step: null, stage: null, fen: null, found: [], wrong: [], shown: [], focus: [], asking: false, prompt: null, index: 0, total: 0,
  choices: [], choosing: false,
};
const IDLE = IDLE_LESSON_VIEW;

const RESUME_LINES = (board: number, total: number): string[] => [
  `Picking up where you stopped — board ${board} of ${total}.`,
  `Back to where you left off: board ${board} of ${total}.`,
];

export class ThinkingLessonSession {
  private view: LessonView = IDLE;
  private q: QuestionState | null = null;
  private position: ChosenLessonPosition | null = null;
  private stage: LessonStage | null = null;
  private plan: LessonStage[] = [];
  private cursor = 0;
  private seen: Set<string>;
  private cancelTimer: (() => void) | null = null;
  private stopped = false;
  private resolveQuestion: (() => void) | null = null;
  private results: AnsweredQuestion[] = [];
  private choiceResults: StepChoiceAnswer[] = [];
  private bookRead = false;
  /** The follow-up link being asked (null: the root question). */
  private link: FollowUp | null = null;
  /** What the last close settled (root or link) — read by the run loop. */
  private settled: { summary: AnswerSummary; missing: Square[] } | null = null;
  /** The kit asking the current board: the lesson's own, or — in a mixed
   *  round — the step the board was graded under. */
  private kit: StepKit;
  /** A mixed round's boards, in the order they are served. */
  private mixQueue: MixedBoard[] = [];
  private choosingSince: number | null = null;
  private resolveChoice: ((step: string | null) => void) | null = null;

  private candidates: readonly LessonPositionCandidate[];
  private refilled = false;

  constructor(
    private readonly baseKit: StepKit,
    candidates: readonly LessonPositionCandidate[],
    seen: ReadonlySet<string>,
    private readonly deps: SessionDeps,
    /** A MIXED round (plan D6): the proven steps whose boards are mixed. The
     *  student first chooses which step a board asks, then answers it. */
    private readonly mix: readonly StepKit[] | null = null,
  ) {
    this.kit = baseKit;
    this.seen = new Set(seen);
    const adapt = baseKit.adapt;
    this.candidates = adapt && !mix
      ? candidates.map((c) => adapt(c)).filter((c): c is LessonPositionCandidate => !!c)
      : candidates;
    if (mix) this.mixQueue = mixedBoards(mix, this.candidates, this.seen);
  }

  get answers(): readonly AnsweredQuestion[] { return this.results; }
  get choices(): readonly StepChoiceAnswer[] { return this.choiceResults; }
  /** Whether the lesson was stopped before its end (it resumes next time). */
  get wasStopped(): boolean { return this.stopped; }

  private publish(patch: Partial<LessonView>): void {
    this.view = { ...this.view, ...patch };
    this.deps.onView(this.view);
  }

  private nextPosition(): ChosenLessonPosition | null {
    const pos = pickFairPosition(this.candidates, this.kit.keyFor, this.seen);
    if (pos) {
      this.seen.add(boardIdentity(pos.fen));
      void this.deps.remember(this.kit.step, pos.fen);
    }
    return pos;
  }

  /** Run the whole lesson. Resolves when it ends (finished, out of boards, or
   *  stopped). Returns the answers. */
  async run(
    standing: StepStanding,
    /** `once`: ONE guided question on the given board, no intro or close — the
     *  lesson game asking its question at a moment it set up.
     *  `resume`: where this step's last lesson stopped — the same stage plan,
     *  continued from the board it was on. */
    opts: { once?: boolean; resume?: { stages: readonly LessonStage[]; cursor: number } | null } = {},
  ): Promise<readonly AnsweredQuestion[]> {
    const r = opts.resume;
    const resume = !opts.once && r && r.cursor > 0 && r.cursor < r.stages.length ? r : null;
    if (opts.once) this.plan = ['guide'];
    else if (resume) this.plan = [...resume.stages];
    else if (this.mix) this.plan = this.mixQueue.map((): LessonStage => 'solo');
    else this.plan = stagesFor(standing).flatMap((s) => Array.from({ length: PER_STAGE[s] }, () => s));
    const start = resume ? resume.cursor : 0;
    this.publish({ active: true, step: this.baseKit.step, total: this.plan.length, index: start, choices: [], choosing: false });
    if (opts.once) {
      // No intro: the game is the context.
    } else if (resume) {
      await this.deps.say(rotateStem(RESUME_LINES(start + 1, this.plan.length), start));
    } else if (this.mix) {
      await this.deps.say(MIXED_INTRO);
    } else if (standing === 'green') {
      await this.deps.say(`Your skill chart shows this one green, so one quick check — if you've got it, we move on.`);
    } else {
      await this.deps.say(this.kit.intro);
    }
    let ranOut = false;
    for (this.cursor = start; this.cursor < this.plan.length && !this.stopped; this.cursor++) {
      const stage = this.plan[this.cursor];
      if (!opts.once) void this.deps.progress?.({ step: this.baseKit.step, stages: [...this.plan], cursor: this.cursor });
      if (this.mix) {
        const board = this.mixQueue.shift();
        if (!board) { ranOut = true; break; }
        await this.runMixedBoard(board);
        continue;
      }
      let pos = this.nextPosition();
      if (!pos && this.deps.refill && !this.refilled) {
        this.refilled = true;
        const more = await this.deps.refill().catch((): readonly LessonPositionCandidate[] => []);
        const adapt = this.baseKit.adapt;
        this.candidates = adapt ? more.map((c) => adapt(c)).filter((c): c is LessonPositionCandidate => !!c) : more;
        if (!this.stopped) pos = this.nextPosition();
      }
      if (!pos) {
        ranOut = true;
        if (this.cursor === 0 && !opts.once) await this.deps.say('I could not find a clean board for this one yet — play or import a few games and it will build from them.');
        break;
      }
      this.stage = stage;
      this.position = pos;
      const rot = hashKey(pos.fen);
      this.publish({ stage, fen: pos.fen, found: [], wrong: [], shown: [], focus: [], asking: false, prompt: null, index: this.cursor + 1 });
      if (stage === 'show') {
        this.publish({ shown: [...pos.key] });
        await this.deps.say(this.kit.showLine(pos.fen, pos.key, rot));
        // The books on the same habit, once per lesson, after the example the
        // student just watched (David 2026-10-04: "make use of the books").
        if (!this.bookRead) {
          this.bookRead = true;
          const book = (await this.kit.book?.().catch(() => null)) ?? null;
          if (book) await this.deps.say(book);
        }
        emitThinkingLesson({
          step: this.kit.step, stage, origin: pos.origin, keySize: pos.key.length, foundCount: 0, wrongCount: 0,
          outcome: 'shown', help: 'none', msToFirst: null, chainDepth: 0,
        });
        continue;
      }
      await this.ask(pos, rot);
      await this.settle(pos, stage);
    }
    // Finished, or out of boards: nothing to resume. Stopped: the last
    // position stays, so the next start of this step picks up there.
    if (!this.stopped && !opts.once) {
      void this.deps.progress?.(null);
      if (!ranOut || this.results.length > 0) await this.finish();
    }
    this.publish({ ...IDLE });
    return this.results;
  }

  /** One board of a mixed round: the student chooses which step it asks, the
   *  choice is graded and recorded, then that step's question is asked. */
  private async runMixedBoard(board: MixedBoard): Promise<void> {
    const fen = board.candidate.fen;
    const rot = hashKey(fen);
    const chips: StepChip[] = (this.mix ?? []).map((k) => ({ step: k.step, label: stepLabel(k.step) }));
    this.stage = 'solo';
    this.position = null;
    this.q = null;
    void this.deps.remember(this.baseKit.step, fen);
    this.publish({
      stage: 'solo', fen, found: [], wrong: [], shown: [], focus: [], asking: false, prompt: null,
      index: this.cursor + 1, choices: chips, choosing: false,
    });
    const promptLine = choicePromptLine(rot);
    const chosen = await new Promise<string | null>((resolve) => {
      this.resolveChoice = resolve;
      void this.deps.say(promptLine).then(() => {
        if (this.stopped) { resolve(null); return; }
        this.choosingSince = this.deps.now();
        this.publish({ choosing: true, prompt: promptLine });
      });
    });
    const since = this.choosingSince;
    this.choosingSince = null;
    this.resolveChoice = null;
    if (this.stopped) return;
    this.publish({ choosing: false, prompt: null });
    const graded = gradedStep(chosen, board.applicable);
    const answer: StepChoiceAnswer = {
      fen, chosen, applicable: [...board.applicable], graded,
      right: !!chosen && board.applicable.includes(chosen),
      msToFirst: since === null ? null : Math.max(0, this.deps.now() - since),
    };
    this.choiceResults.push(answer);
    try { await this.deps.recordChoice?.(answer); } catch { /* the lesson never stalls on a write */ }
    await this.deps.say(choiceLine(chosen, board.applicable, rot));
    if (this.stopped) return;
    const kit = (this.mix ?? []).find((k) => k.step === graded);
    if (!kit) return;
    this.kit = kit;
    void this.deps.remember(kit.step, fen);
    const pos: ChosenLessonPosition = { ...board.candidate, key: [...board.keys[graded]] };
    this.position = pos;
    this.publish({ step: kit.step });
    this.stage = 'solo';
    await this.ask(pos, rot);
    // The answer is spoken, chained and RECORDED in settle() — ask() only
    // collects it (the runner's close() no longer records on its own).
    await this.settle(pos, 'solo');
    if (!this.stopped) this.publish({ step: this.baseKit.step });
  }

  /** A mixed round's step chip was tapped. Ignored when no choice is open. */
  choose(step: string): void {
    if (this.choosingSince === null || !this.resolveChoice) return;
    if (!(this.mix ?? []).some((k) => k.step === step)) return;
    this.resolveChoice(step);
  }

  private ask(pos: ChosenLessonPosition, rot: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.resolveQuestion = resolve;
      const question = [pos.lead, spokenWithoutTaps(this.kit.prompt(rot, pos.fen), true)].filter(Boolean).join(' ');
      void this.deps.say(question).then(() => {
        if (this.stopped) { resolve(); return; }
        this.q = newQuestion(pos.key, this.deps.now());
        this.publish({ asking: true, prompt: this.kit.prompt(rot, pos.fen) });
      });
    });
  }

  private armNudge(): void {
    this.cancelTimer?.();
    this.cancelTimer = this.deps.setTimer(() => { void this.silence(); }, NUDGE_AFTER_MS);
  }

  private async silence(): Promise<void> {
    if (!this.q || questionDone(this.q)) return;
    const { state, outcome } = applySilence(this.q);
    this.q = state;
    if (outcome.kind === 'nudge') {
      await this.deps.say(nudgeLine(outcome.remaining, this.q.taps.length));
      this.armNudge();
    } else if (outcome.kind === 'reveal') {
      await this.close([...outcome.missing]);
    }
  }

  /** A tap from the board. Ignored when no question is open. */
  async tap(square: Square): Promise<void> {
    if (!this.q || questionDone(this.q) || !this.position || !this.stage) return;
    const fen = this.position.fen;
    const { state, outcome } = applyTap(this.q, square, this.deps.now());
    this.q = state;
    switch (outcome.kind) {
      case 'ignored':
        return;
      case 'found':
        this.publish({ found: [...state.hits] });
        await this.deps.say(foundLine(outcome.remaining, state.hits.length - 1));
        this.armNudge();
        return;
      case 'complete':
        this.publish({ found: [...state.hits] });
        await this.close([]);
        return;
      case 'wrong':
        this.publish({ wrong: [...state.extras] });
        // Solo is graded silently; Guide teaches on a miss.
        if (this.stage === 'guide') {
          const miss = spokenWithoutTaps(this.link ? this.link.wrongTapLine(square) : this.kit.wrongTapLine(fen, square), false);
          if (miss) await this.deps.say(miss);
        }
        return;
      case 'reveal':
        this.publish({ wrong: [...state.extras] });
        await this.close([...outcome.missing]);
        return;
    }
  }

  /** "I don't know" — honest data; the coach shows the rest (or, at a step
   *  choice, names the question the board asks). */
  async dontKnow(): Promise<void> {
    if (this.choosingSince !== null && this.resolveChoice) { this.resolveChoice(null); return; }
    if (!this.q || questionDone(this.q)) return;
    const { state, missing } = applyDontKnow(this.q);
    this.q = state;
    await this.close([...missing]);
  }

  /** A question (root or link) closed: paint it, hand the result to the run
   *  loop, and let it go on. Never awaits speech, so a tap returns at once. */
  private close(missing: Square[]): Promise<void> {
    this.cancelTimer?.();
    this.cancelTimer = null;
    const q = this.q;
    if (!q) return Promise.resolve();
    this.publish({ asking: false, shown: missing });
    this.settled = { summary: summariseAnswer(q), missing };
    const done = this.resolveQuestion;
    this.resolveQuestion = null;
    done?.();
    return Promise.resolve();
  }

  /**
   * After the root question closed: the follow-up chain (when the answer was
   * right and the kit has one), then the ONE record, the audit row and the
   * reasons.
   *
   * ONE RECORD PER ROOT QUESTION, carrying `chainDepth` — never a record per
   * link. The links are scaffolding inside the same question about the same
   * habit (the step's tags); a row per link would count one board's evidence
   * two to four times on the same tag and let a long chain outweigh a short
   * one. `chainDepth` is how far the student went on their own: the links
   * answered right, unhelped, in a row from the first (0 = no chain, or the
   * first link missed). One evidence shape (`AnswerDetail`), every surface.
   */
  private async settle(pos: ChosenLessonPosition, stage: LessonStage): Promise<void> {
    const root = this.settled;
    this.settled = null;
    if (!root) return;
    const rot = hashKey(pos.fen);
    const { summary, missing } = root;

    // The chain is asked about the first piece the student FOUND that has one.
    let chainSq: Square | null = null;
    let links: FollowUp[] = [];
    if (summary.solved && stage !== 'show' && this.kit.followUps && !this.stopped) {
      for (const sq of summary.taps) {
        if (!pos.key.includes(sq)) continue;
        const l = this.kit.followUps(pos.fen, sq, rot);
        if (l.length > 0) { chainSq = sq; links = l; break; }
      }
    }

    const praise = completeLine(summary, rot);
    // The chain square's reason is the very count the chain is about to ask
    // for, so it is not said up front — the computed result closes the chain.
    const reasons = (missing.length > 0 ? missing : pos.key)
      .filter((sq) => sq !== chainSq)
      .map((sq) => this.kit.reasonFor(pos.fen, sq))
      .filter((r): r is string => !!r);
    const words = [praise, ...reasons].filter(Boolean).join(' ');
    if (words) await this.deps.say(words);

    let depth = 0;
    let unbroken = true;
    for (const [i, link] of links.entries()) {
      if (this.stopped || !chainSq) break;
      const res = await this.askLink(link, chainSq);
      if (!res) break;
      const clean = res.summary.held;
      if (unbroken && clean) depth += 1; else unbroken = false;
      const close = [
        clean ? rotateStem(['Right.', 'Yes.', 'That’s it.'], rot + i) : (res.summary.solved ? null : link.shownLine),
        link.after,
      ].filter(Boolean).join(' ');
      if (!this.stopped) await this.deps.say(close);
    }
    this.link = null;
    if (chainSq && !this.stopped) this.publish({ focus: [] });

    const answer: AnsweredQuestion = {
      step: this.kit.step, stage, position: pos,
      summary: { ...summary, detail: { ...summary.detail, chainDepth: depth } },
    };
    this.results.push(answer);
    emitThinkingLesson({
      step: this.kit.step, stage, origin: pos.origin, keySize: summary.keySize, foundCount: summary.foundCount,
      wrongCount: summary.extras.length, outcome: summary.held ? 'held' : summary.prompted ? 'helped' : 'broken', help: summary.help, msToFirst: summary.msToFirst,
      chainDepth: summary.detail.chainDepth,
    });
    try { await this.deps.record(answer); } catch { /* the lesson never stalls on a write */ }
  }

  /** Ask one follow-up link on the same board; resolves with what it settled,
   *  or null when the lesson stopped. */
  private askLink(link: FollowUp, focus: Square): Promise<{ summary: AnswerSummary; missing: Square[] } | null> {
    this.link = link;
    return new Promise((resolve) => {
      this.resolveQuestion = () => {
        const r = this.settled;
        this.settled = null;
        resolve(r);
      };
      this.publish({ found: [], wrong: [], shown: [], focus: [focus], asking: false, prompt: null });
      void this.deps.say(link.prompt).then(() => {
        if (this.stopped) return;
        this.q = newQuestion(link.key, this.deps.now(), link.mode);
        this.publish({ asking: true, prompt: link.prompt });
      });
    });
  }

  /** The count, said once at the end. What was proven, what comes next and
   *  the earned praise are the door's close (`closeLessonLine`), which reads
   *  the record these answers just wrote. */
  private async finish(): Promise<void> {
    const asked = this.results.length;
    if (asked === 0) return;
    if (this.mix) {
      const read = this.choiceResults.filter((c) => c.right).length;
      const clean = this.results.filter((r, i) => r.summary.held && this.choiceResults[i]?.right).length;
      await this.deps.say(clean === asked
        ? `That's the round — every board read right and answered clean.`
        : `That's the round — ${read} of ${this.choiceResults.length} boards read right, ${clean} of ${asked} answered clean.`);
      return;
    }
    const clean = this.results.filter((r) => r.summary.held).length;
    await this.deps.say(clean === asked
      ? `That's the lesson — every one found clean.`
      : `That's the lesson — ${clean} of ${asked} found clean.`);
  }

  /** The student asked something else mid-question: hold the "one more" nudge
   *  so the coach's answer is not talked over. The next tap re-arms it. */
  hold(): void {
    this.cancelTimer?.();
    this.cancelTimer = null;
  }

  stop(): void {
    this.stopped = true;
    this.cancelTimer?.();
    this.cancelTimer = null;
    const done = this.resolveQuestion;
    this.resolveQuestion = null;
    done?.();
    const choice = this.resolveChoice;
    this.resolveChoice = null;
    choice?.(null);
    this.publish({ ...IDLE });
  }
}
