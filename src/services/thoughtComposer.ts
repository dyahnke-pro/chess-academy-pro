// THE ONE COMPOSER (WO-ONE-COACH-01, David 2026-10-30: "All of this is built!
// Why is it not wired in?" → the wiring map: 336 teaching computers reached
// the voice through 25 composers that each picked, ranked and deduped their
// own way, and decided on WORDS — so the same move got a different reason on
// every surface and the lesson composer heard 18 of the 121 computers that say
// what a move changed).
//
// One thought per move, in Danya's order (THE HEART: what the move changed →
// the moves you'd weigh and why each falls short → "not yet, first this" → the
// line played out → the habit). Every computer hands it a FACT — the step it
// says, the claim it makes, the squares, what is at stake, its proof, the seat
// — never a sentence to be read back. The composer:
//   1. places each fact in its step (the producer says which; never read off
//      the words);
//   2. leads each step with the fact worth the most (`stakeValue`), then the
//      source the Danya bench measured best for that step (`SOURCE_RANK`);
//   3. lets a further fact in a step speak only as SUPPORT (it names a square
//      the step's lead names) or as NEWS (a pawn or more at stake) — one
//      thread, never a stack;
//   4. says each claim once (the say-once memory a lesson, a review or a game
//      keeps), through the one voice package (board truth, no praise, no
//      interface talk).
// Surfaces differ only in which steps they ask for and how many facts a step
// may carry; the order and the choice are this file's.
import { stakeValue } from './factStakes';
import type { CoachFact } from './coachFact';
import thoughtPolicy from '../data/thought-policy.json';
import { sameIdea } from './ideaKind';
import { buildVoicePackage, claimKey, joinSpoken, spokenSentenceKeys, type VoiceFact } from './voicePackage';

/** THE STEPS OF ONE THOUGHT, in the order they are said (WO-THINK-01):
 *    danger  — what is attacked on the board right now (always first);
 *    name    — the opening, once;
 *    yours   — what the student's move changed;
 *    theirs  — what the opponent's move changed;
 *    choices — the moves you'd weigh and why each falls short;
 *    notYet  — "not yet, first this";
 *    line    — the line played out, to what it achieves;
 *    board   — the idea on the board: the plan, the structure, the trip;
 *    verdict — what the position is about now;
 *    habit   — the habit that finds it next time. */
export type ThoughtStep = 'danger' | 'name' | 'yours' | 'theirs' | 'choices' | 'notYet' | 'line' | 'board' | 'verdict' | 'habit';
export const THOUGHT_ORDER: Record<ThoughtStep, number> = {
  danger: 0, name: 1, yours: 2, theirs: 3, choices: 4, notYet: 5, line: 6, board: 7, verdict: 8, habit: 9,
};

/** Every computer that hands the composer facts. A new one fails to compile
 *  until it is ranked below. */
export type ThoughtSource =
  | 'moveWhy' | 'briefing' | 'boardTeacher' | 'moveJob' | 'fundamental' | 'deepFact' | 'binding'
  | 'pieceRoute' | 'refuted' | 'alternatives' | 'prophylaxis' | 'notYet';

/** WHO SPEAKS FIRST IN A STEP when two facts hold the same stake — measured on
 *  the Danya bench (`danyaBench.measure.test.ts`): how often a source's line in
 *  that step carries an idea he said there, learned on half his videos. Lower
 *  is earlier. */
export const SOURCE_RANK: Record<ThoughtSource, number> = {
  moveWhy: 1,
  briefing: 2,
  fundamental: 3,
  boardTeacher: 4,
  moveJob: 5,
  refuted: 7,
  alternatives: 8,
  prophylaxis: 10,
  notYet: 9,
  deepFact: 11,
  binding: 12,
  pieceRoute: 13,
};

/** ONE FACT, the composer's only input — the one fact shape (`coachFact.ts`),
 *  its step derived from its kind. */
export type ThoughtFact = CoachFact;

/** HOW DEEP A SURFACE GOES. Every surface says the same steps in the same
 *  order; Review may let a step carry its further facts, the live surfaces
 *  keep one a step plus the news. */
export interface ThoughtRegister {
  /** The steps this surface says (in THOUGHT_ORDER whatever order is given). */
  steps: ReadonlySet<ThoughtStep>;
  /** Further facts in a step speak as support or news (true), or not at all. */
  depth: 'one' | 'thread';
}

export type ThoughtSurface = 'lesson' | 'review' | 'learn' | 'chat';
const ALL_STEPS: ReadonlySet<ThoughtStep> = new Set(Object.keys(THOUGHT_ORDER) as ThoughtStep[]);
export const THOUGHT_REGISTER: Record<ThoughtSurface, ThoughtRegister> = {
  lesson: { steps: ALL_STEPS, depth: 'thread' },
  review: { steps: ALL_STEPS, depth: 'thread' },
  learn: { steps: ALL_STEPS, depth: 'thread' },
  chat: { steps: ALL_STEPS, depth: 'thread' },
};

/** The say-once memory a lesson, a review or a game keeps across its moves:
 *  sentence and claim keys already spoken. */
export interface ThoughtMemory { keys: Set<string> }

export interface ComposedThought {
  /** The thought, ready to speak. '' when nothing earned a word. */
  spoken: string;
  /** The facts that spoke, in spoken order. */
  kept: ThoughtFact[];
  /** Facts that did not speak, and why — so a quiet move is diagnosable. */
  held: Array<{ fact: ThoughtFact; why: 'step-not-asked' | 'same-idea' | 'not-support-or-news' | 'restates' | 'already-said' | 'refused' }>;
}

/** A pawn or more at stake: news in its own right. */
const NEWS_VALUE = stakeValue({ points: 1, plies: 0 }) ?? 1100;

/** HOW OFTEN EACH COMPUTER IS CHOSEN, FITTED ON DANYA'S NOTES (WO-ONE-COACH-01
 *  Build 5, David 2026-10-30: "adjust how often they get chosen, to get us as
 *  close to Danya's teaching as possible"). An offset per computer on the
 *  producer's own weight, and the second job's floor and gap — fitted on half
 *  his videos (`scripts/bench/fit-thought-policy.py`), scored on the other half:
 *  his ideas 39.3% → 42.2%, his lead idea 29.4% → 31.8%, and a larger share of
 *  what is said matches him (31.0% → 32.8%). Measured with the moves that
 *  really followed each note: the bench first read an engine line there, which
 *  pushed the piece's trip down for a fault of the bench, not of the trip. */
const POLICY: { floor: number; gap: number; offsets: Partial<Record<ThoughtSource, number>> } = thoughtPolicy;

/** A fact's weight as the composer compares it: the producer's own, with its
 *  computer's fitted offset. */
function weighOf(f: ThoughtFact): number {
  return f.weight + (POLICY.offsets[f.source] ?? 0);
}

function order(a: ThoughtFact, b: ThoughtFact, ia: number, ib: number): number {
  return (THOUGHT_ORDER[a.step] - THOUGHT_ORDER[b.step])
    || ((stakeValue(b.stakes) ?? 0) - (stakeValue(a.stakes) ?? 0))
    // A fact that only restates the board never leads a step another fact
    // explains ("it brings your knight out" behind the knight's trip).
    || (Number(a.restates === true) - Number(b.restates === true))
    || (weighOf(b) - weighOf(a))
    || (SOURCE_RANK[a.source] - SOURCE_RANK[b.source])
    || (ia - ib);
}

/** The steps that say what a move did. A different idea there on different
 *  squares is the move's SECOND JOB ("restrain and develop in one stroke"),
 *  said when it weighs at least the policy's floor and comes within its gap of
 *  the lead (`POLICY`, fitted on the Danya bench). The same squares in other
 *  words are ONE CLAIM ("guards e5" / "supports the center, guarding e5"): the
 *  geometry is said once (G4.5.1) — measured too: the documented Jaccard rule
 *  scored half a point more only by saying the overlap twice ("attacks your
 *  pawn on e4… and e4, attacking the pawn there"). */
const MOVE_STEPS: ReadonlySet<ThoughtStep> = new Set<ThoughtStep>(['yours', 'theirs']);

/** WHEN ANOTHER LINE ALREADY LEADS THE MOVE'S STEP (Review's rule or point
 *  on the same move), a fact here speaks only as that step's second job: a
 *  different claim — none of the lead's squares — that weighs the policy's
 *  floor. The same test the composer applies inside a step, for a lead said
 *  by another producer. */
export function speaksBehindLead(f: ThoughtFact, leadSquares: ReadonlySet<string>): boolean {
  return f.restates !== true && weighOf(f) >= POLICY.floor && !f.squares.some((s) => leadSquares.has(s));
}

/** ONE THOUGHT from the facts a move earned. */
export function composeThought(
  facts: readonly ThoughtFact[],
  surface: ThoughtSurface,
  memory: ThoughtMemory | null,
): ComposedThought {
  const reg = THOUGHT_REGISTER[surface];
  const held: ComposedThought['held'] = [];
  const indexed = facts.map((f, i) => ({ f, i })).filter(({ f }) => f.text.trim().length > 0);
  const sorted = indexed.sort((x, y) => order(x.f, y.f, x.i, y.i)).map(({ f }) => f);

  // Pick: the step's lead, then its support and news.
  const picked: ThoughtFact[] = [];
  const leadOf = new Map<ThoughtStep, ThoughtFact>();
  for (const f of sorted) {
    if (!reg.steps.has(f.step)) { held.push({ fact: f, why: 'step-not-asked' }); continue; }
    // ALREADY SAID in this lesson, review or game: it never takes a step's
    // lead, so the next fact of the step can say something new.
    if (memory && f.claims.some((c) => memory.keys.has(claimKey(c)))) { held.push({ fact: f, why: 'already-said' }); continue; }
    // ONE IDEA IS SAID ONCE, by the computer that leads it: "keeps their bishop
    // off g4" and "takes the g4 square away from their bishop" are one idea.
    if (picked.some((p) => p.step === f.step && sameIdea(p, f))) { held.push({ fact: f, why: 'same-idea' }); continue; }
    const lead = leadOf.get(f.step);
    if (!lead) { leadOf.set(f.step, f); picked.push(f); continue; }
    const news = (stakeValue(f.stakes) ?? 0) >= NEWS_VALUE;
    if (MOVE_STEPS.has(f.step)) {
      const sameClaim = picked.some((p) => p.step === f.step && f.squares.some((s) => p.squares.includes(s)));
      if (sameClaim) { held.push({ fact: f, why: 'same-idea' }); continue; }
      const secondJob = f.restates !== true && weighOf(f) >= POLICY.floor && weighOf(f) >= weighOf(lead) - POLICY.gap;
      if (reg.depth === 'thread' && (secondJob || news)) { picked.push({ ...f, text: f.alsoText ?? f.text }); continue; }
      held.push({ fact: f, why: 'not-support-or-news' });
      continue;
    }
    // Another fact in a later step speaks as support (it names a square the
    // step's lead names) or as news (a pawn or more at stake) — one thread,
    // never a stack.
    const support = f.squares.some((s) => lead.squares.includes(s));
    if (reg.depth === 'thread' && (support || news)) { picked.push({ ...f, text: f.alsoText ?? f.text }); continue; }
    held.push({ fact: f, why: 'not-support-or-news' });
  }

  // THE QUIET-MOVE RULE (WO-DECIDER-02): a step whose facts only restate the
  // board ("You play Nxe3 — it takes back the bishop") says nothing.
  for (const st of new Set(picked.map((f) => f.step))) {
    const inStep = picked.filter((f) => f.step === st);
    if (inStep.every((f) => f.restates)) {
      for (const f of inStep) { held.push({ fact: f, why: 'restates' }); picked.splice(picked.indexOf(f), 1); }
    }
  }

  // Say once, board-true: each picked fact through the one voice package, in
  // thought order, against everything already said (the memory, then this
  // thought's own earlier facts) — so a kept line is known by the fact it came
  // from, never matched back by its words.
  const said = new Set<string>(memory?.keys ?? []);
  const kept: ThoughtFact[] = [];
  const keptVoice: VoiceFact[] = [];
  for (const f of picked) {
    const pkg = buildVoicePackage([{ kind: 'computed', text: f.text, fen: f.fen, altFen: f.altFen, squares: f.squares, claims: f.claims, lines: f.lines, proof: f.proof }], undefined, said);
    if (pkg.kept.length === 0) {
      const reason = pkg.dropped.length > 0 ? pkg.dropped[0].reason : '';
      held.push({ fact: f, why: /already|duplicate|same observation/.test(reason) ? 'already-said' : 'refused' });
      continue;
    }
    const k = pkg.kept[0];
    for (const key of spokenSentenceKeys(pkg)) said.add(key);
    kept.push({ ...f, text: k.text, lines: k.lines });
    keptVoice.push(k);
  }
  if (memory) for (const key of spokenSentenceKeys({ kept: keptVoice })) memory.keys.add(key);
  return { spoken: joinSpoken(keptVoice), kept, held };
}
