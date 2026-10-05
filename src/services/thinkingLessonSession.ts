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
import type { Square } from 'chess.js';
import {
  applyDontKnow, applySilence, applyTap, questionDone, completeLine, foundLine, newQuestion,
  NUDGE_AFTER_MS, nudgeLine, stagesFor, summariseAnswer,
  type AnswerSummary, type LessonStage, type QuestionState, type StepStanding,
} from './thinkingLesson';
import { boardIdentity, pickFairPosition, type ChosenLessonPosition, type FairKey, type LessonPositionCandidate } from './thinkingPositions';
import { emitThinkingLesson } from './thinkingLessonEvents';
import { rotateStem, stemKeyOf as hashKey } from '../utils/rotateStem';
import type { FollowUp } from './thinkingExchangeChain';
export type { FollowUp } from './thinkingExchangeChain';

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
}

/** Positions per stage: one worked example, two guided, one solo. */
const PER_STAGE: Record<LessonStage, number> = { show: 1, guide: 2, solo: 1 };

const IDLE: LessonView = {
  active: false, step: null, stage: null, fen: null, found: [], wrong: [], shown: [], focus: [], asking: false, prompt: null, index: 0, total: 0,
};

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
  private bookRead = false;
  /** The follow-up link being asked (null: the root question). */
  private link: FollowUp | null = null;
  /** What the last close settled (root or link) — read by the run loop. */
  private settled: { summary: AnswerSummary; missing: Square[] } | null = null;

  private readonly candidates: readonly LessonPositionCandidate[];

  constructor(
    private readonly kit: StepKit,
    candidates: readonly LessonPositionCandidate[],
    seen: ReadonlySet<string>,
    private readonly deps: SessionDeps,
  ) {
    this.seen = new Set(seen);
    const adapt = kit.adapt;
    this.candidates = adapt
      ? candidates.map((c) => adapt(c)).filter((c): c is LessonPositionCandidate => !!c)
      : candidates;
  }

  get answers(): readonly AnsweredQuestion[] { return this.results; }

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
     *  lesson game asking its question at a moment it set up. */
    opts: { once?: boolean } = {},
  ): Promise<readonly AnsweredQuestion[]> {
    const stages: readonly LessonStage[] = opts.once ? ['guide'] : stagesFor(standing);
    this.plan = opts.once ? ['guide'] : stages.flatMap((s) => Array.from({ length: PER_STAGE[s] }, () => s));
    this.publish({ active: true, step: this.kit.step, total: this.plan.length, index: 0 });
    if (opts.once) {
      // No intro: the game is the context.
    } else if (standing === 'green') {
      await this.deps.say(`Your skill chart shows this one green, so one quick check — if you've got it, we move on.`);
    } else {
      await this.deps.say(this.kit.intro);
    }
    for (this.cursor = 0; this.cursor < this.plan.length && !this.stopped; this.cursor++) {
      const stage = this.plan[this.cursor];
      const pos = this.nextPosition();
      if (!pos) {
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
          outcome: 'shown', help: 'none', msToFirst: null,
        });
        continue;
      }
      await this.ask(pos, rot);
      await this.settle(pos, stage);
    }
    if (!this.stopped && !opts.once) await this.finish();
    this.publish({ ...IDLE });
    return this.results;
  }

  private ask(pos: ChosenLessonPosition, rot: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.resolveQuestion = resolve;
      const question = [pos.lead, this.kit.prompt(rot, pos.fen)].filter(Boolean).join(' ');
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
        if (this.stage === 'guide') await this.deps.say(this.link ? this.link.wrongTapLine(square) : this.kit.wrongTapLine(fen, square));
        return;
      case 'reveal':
        this.publish({ wrong: [...state.extras] });
        await this.close([...outcome.missing]);
        return;
    }
  }

  /** "I don't know" — honest data; the coach shows the rest. */
  async dontKnow(): Promise<void> {
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

  private async finish(): Promise<void> {
    const asked = this.results.length;
    if (asked === 0) return;
    const clean = this.results.filter((r) => r.summary.held).length;
    const line = clean === asked
      ? `That's the lesson — every one found clean. That habit is yours now; I'll check it in your games.`
      : `That's the lesson — ${clean} of ${asked} found clean. We'll come back to this one, and I'll watch for it in your games.`;
    await this.deps.say(line);
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
    this.publish({ ...IDLE });
  }
}
