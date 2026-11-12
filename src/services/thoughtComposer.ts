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
import type { SaidSet } from './gameStory';
import { emitEverything, everythingListening } from './everythingEvents';
import { stakeValue, isStaked, stakeWc } from './factStakes';
import { causeEffect } from './factRelations';
import { placeFact, type CoachFact } from './coachFact';
import thoughtPolicy from '../data/thought-policy.json';
import { sameIdea, isByProduct, type IdeaKind } from './ideaKind';
import { buildVoicePackage, claimKey, joinSpoken, spokenSentenceKeys, type VoiceFact } from './voicePackage';
import { TEACHING_MOVES } from './teachingMoves';

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
  | 'pieceRoute' | 'refuted' | 'alternatives' | 'prophylaxis' | 'notYet' | 'bestLine' | 'counterThreat' | 'theirAim' | 'planChoice' | 'moveOrder' | 'structureLines' | 'purpose' | 'studentMove'
  /** The king walked by hand (`kingWalk.ts`): the squares, the route, the bishop kept home, the rule. */
  | 'kingWalk'
  /** The reply tree (`ifTheyPlay.ts`): if they X, you play Y — the likely replies and their answers. */
  | 'ifTheyPlay'
  /** The bait (`ifTheyPlay.baitBranch`): the trap the student's move set — the reply many players at this level choose that loses. */
  | 'baitSet'
  /** The moves a player weighs (`weighedMoves.ts`): the tempting move refuted, the move of the same worth, the square. */
  | 'weighed'
  /** The teaching moves' new computers (2026-11-05): the pawn break (`pawnBreak.ts`). */
  | 'teachingMove';

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
  // The line played out speaks alone in its step (WO-STORY-MATRIX-01 P1-9).
  bestLine: 14,
  counterThreat: 15,
  theirAim: 16,
  planChoice: 17,
  moveOrder: 18,
  structureLines: 19,
  purpose: 20,
  studentMove: 21,
  // Not measured on the bench yet (2026-11-04): ranked after every measured source.
  kingWalk: 22,
  // Not measured on the bench yet (2026-11-05): ranked after every measured source.
  ifTheyPlay: 23,
  // The bait sits beside the reply tree it is read from.
  baitSet: 23,
  weighed: 24,
  teachingMove: 25,
};

/** ONE FACT, the composer's only input — the one fact shape (`coachFact.ts`),
 *  its step derived from its kind, with what this composer ranks by: the
 *  computer's source, the idea it states and its weight. Only the lesson
 *  composer's producers answer those today; they join the one fact when
 *  every producer emits it (WO-STORY-MATRIX-01 P1-6). */
export interface ThoughtFact extends CoachFact {
  source: ThoughtSource;
  /** The words when it speaks BEHIND its step's lead ("It also makes luft"),
   *  where the lead already named the move. Absent: `text` serves both. */
  alsoText?: string;
  /** Which idea it states (ONE vocabulary). Two facts of one idea on the same
   *  squares are one idea: the step keeps the one that leads. */
  idea: IdeaKind;
  /** The producer's own importance on this board, 0–100 (the briefing's
   *  aspect weight, the fundamental's weight) — the order after the stakes. */
  weight: number;
  /** It only restates what the board shows (the capture, the check, a bare
   *  develop) — THE QUIET-MOVE RULE: a step of nothing else is not said. */
  restates?: boolean;
}

/** HOW DEEP A SURFACE GOES. Every surface says the same steps in the same
 *  order; Review may let a step carry its further facts, the live surfaces
 *  keep one a step plus the news. */
export interface ThoughtRegister {
  /** The steps this surface says (in THOUGHT_ORDER whatever order is given). */
  steps: ReadonlySet<ThoughtStep>;
  /** Further facts in a step speak as support or news (true), or not at all. */
  depth: 'one' | 'thread';
}

/** The surfaces that compose through here. Learn had a row and no caller
 *  (deleted, WO-STORY-MATRIX-01 P1-1, 2026-10-30): a surface that comes to the
 *  composer answers its register here first. Chat composes an answer (the
 *  question picks the steps, `questionThought`, David 2026-11-06). */
export type ThoughtSurface = 'lesson' | 'review' | 'chat';
const ALL_STEPS: ReadonlySet<ThoughtStep> = new Set(Object.keys(THOUGHT_ORDER) as ThoughtStep[]);
export const THOUGHT_REGISTER: Record<ThoughtSurface, ThoughtRegister> = {
  lesson: { steps: ALL_STEPS, depth: 'thread' },
  review: { steps: ALL_STEPS, depth: 'thread' },
  chat: { steps: ALL_STEPS, depth: 'thread' },
};

/** The say-once memory a lesson, a review or a game keeps across its moves:
 *  sentence and claim keys already spoken — the story's ledger (`SaidSet`,
 *  a lesson line's or Review's), or a plain set a caller keeps on trial. */
export interface ThoughtMemory { keys: SaidSet }

export interface ComposedThought {
  /** The thought, ready to speak. '' when nothing earned a word. */
  spoken: string;
  /** The facts that spoke, in spoken order. */
  kept: ThoughtFact[];
  /** Facts that did not speak, and why — so a quiet move is diagnosable. */
  held: Array<{ fact: ThoughtFact; why: 'step-not-asked' | 'same-idea' | 'not-support-or-news' | 'by-product' | 'third-job' | 'restates' | 'already-said' | 'refused' }>;
}

/** THE STEPS ANOTHER LINE ON THIS MOVE ALREADY LEADS (Review's rule or point
 *  on the same move, `speaksBehindLead`): there the composer's first fact is
 *  the move's second job, and nothing follows it. A surface whose composer
 *  speaks alone answers `NOT_LED`. */
export const NOT_LED: ReadonlySet<ThoughtStep> = new Set<ThoughtStep>();

/** A MOVE SAYS AT MOST TWO JOBS (M-TWO-JOBS, round 3): its lead and one more,
 *  "it does two things at once". A third ("It also … It also …") was a
 *  stack, never a thought (Bf6: the outpost, Qg7#, and the rook on c3). */
const MOVE_JOBS = 2;

/** THE MOVE'S SECOND JOB, said as its own kind (`two-jobs`, the teaching move
 *  M-TWO-JOBS) with the words it speaks. */
function asSecondJob(f: ThoughtFact, text: string): ThoughtFact {
  return { ...f, ...placeFact('two-jobs', f.seat), text };
}

/** WHAT THE MOVE GAVE UP IS NOT ONE OF ITS JOBS: a fact whose kind makes the
 *  opportunity-cost move (M-OPP-COST, `teachingMoves`) — "it also loosens your
 *  own king's cover", "concedes an isolated pawn" — is said behind the move as
 *  before, but never counted as a job nor said as one. */
function isCost(f: ThoughtFact): boolean {
  return TEACHING_MOVES[f.kind].includes('M-OPP-COST');
}

/** NEWS IS RELATIVE TO THE TURN (WO-STORY-MATRIX-01 P1-10, rule 4): a fact
 *  speaks behind its step's lead as news only when it answers a different
 *  decision than the lead, or what rides on it clears the lead's by the
 *  fitted margin (`POLICY.newsMargin`, expected score). "A pawn or more" was
 *  any pawn on any turn: threats on pawns joined turns where he says nothing
 *  about them (Build 4, cause 4). */
function isNews(f: ThoughtFact, lead: ThoughtFact): boolean {
  if (!isStaked(f.stakes)) return false;
  const leadDecision = isStaked(lead.stakes) ? lead.stakes.decision : undefined;
  if (f.stakes.decision && leadDecision && f.stakes.decision !== leadDecision) return true;
  const leadWc = isStaked(lead.stakes) ? stakeWc(lead.stakes) : 0;
  return stakeWc(f.stakes) >= leadWc + POLICY.newsMargin;
}

/** HOW OFTEN EACH COMPUTER IS CHOSEN, FITTED ON DANYA'S NOTES (WO-ONE-COACH-01
 *  Build 5, David 2026-10-30: "adjust how often they get chosen, to get us as
 *  close to Danya's teaching as possible"). An offset per computer on the
 *  producer's own weight, and the second job's floor and gap — fitted on half
 *  his videos (`scripts/bench/fit-thought-policy.py`), scored on the other half:
 *  his ideas 39.3% → 42.2%, his lead idea 29.4% → 31.8%, and a larger share of
 *  what is said matches him (31.0% → 32.8%). Measured with the moves that
 *  really followed each note: the bench first read an engine line there, which
 *  pushed the piece's trip down for a fault of the bench, not of the trip. */
const POLICY: { floor: number; gap: number; newsMargin: number; offsets: Partial<Record<ThoughtSource, number>> } = thoughtPolicy;

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
  ledOutside: ReadonlySet<ThoughtStep>,
): ComposedThought {
  const reg = THOUGHT_REGISTER[surface];
  const held: ComposedThought['held'] = [];
  const indexed = facts.map((f, i) => ({ f, i })).filter(({ f }) => f.text.trim().length > 0);
  const sorted = indexed.sort((x, y) => order(x.f, y.f, x.i, y.i)).map(({ f }) => f);

  // Pick: the step's lead, then its support and news.
  const picked: ThoughtFact[] = [];
  const leadOf = new Map<ThoughtStep, ThoughtFact>();
  // A FACT THE VOICE WOULD REFUSE NEVER TAKES A PLACE (the reversed matrix,
  // 2026-11-06: "h4 or dxc5 — both hold here" led the choices step, was then
  // refused as untrue on the board, and the true "Nh5 is about as good" behind
  // it was held as not the lead's support — the step said nothing). The one
  // voice package is asked at pick time, against what is already picked.
  const pickedSaid = new Set<string>(memory?.keys ?? []);
  const voiceRefuses = (f: ThoughtFact): ComposedThought['held'][number]['why'] | null => {
    const pkg = buildVoicePackage([{ kind: 'computed', text: f.text, fen: f.fen, altFen: f.altFen, squares: f.squares, claims: f.claims, lines: f.lines, proof: f.proof }], undefined, pickedSaid);
    if (pkg.kept.length > 0) return null;
    const reason = pkg.dropped.length > 0 ? pkg.dropped[0].reason : '';
    return /already|duplicate|same observation/.test(reason) ? 'already-said' : 'refused';
  };
  /** Say `said` (the fact as it will be heard) unless the voice refuses it;
   *  a refused fact is held and takes no place. */
  const pick = (f: ThoughtFact, said: ThoughtFact = f): boolean => {
    const refused = voiceRefuses(said);
    if (refused) { held.push({ fact: f, why: refused }); return false; }
    picked.push(said);
    const pkg = buildVoicePackage([{ kind: 'computed', text: said.text, fen: said.fen, altFen: said.altFen, squares: said.squares, claims: said.claims, lines: said.lines, proof: said.proof }], undefined, pickedSaid);
    for (const key of spokenSentenceKeys(pkg)) pickedSaid.add(key);
    return true;
  };
  for (const f of sorted) {
    if (!reg.steps.has(f.step)) { held.push({ fact: f, why: 'step-not-asked' }); continue; }
    // ALREADY SAID in this lesson, review or game: it never takes a step's
    // lead, so the next fact of the step can say something new.
    if (memory && f.claims.some((c) => memory.keys.has(claimKey(c)))) { held.push({ fact: f, why: 'already-said' }); continue; }
    // ONE IDEA IS SAID ONCE, by the computer that leads it: "keeps their bishop
    // off g4" and "takes the g4 square away from their bishop" are one idea.
    if (picked.some((p) => p.step === f.step && sameIdea(p, f))) { held.push({ fact: f, why: 'same-idea' }); continue; }
    const lead = leadOf.get(f.step);
    if (MOVE_STEPS.has(f.step)) {
      const outside = ledOutside.has(f.step);
      if (!lead && !outside) { if (pick(f)) leadOf.set(f.step, f); continue; }
      const sameClaim = picked.some((p) => p.step === f.step && f.squares.some((s) => p.squares.includes(s)));
      if (sameClaim) { held.push({ fact: f, why: 'same-idea' }); continue; }
      const job = !isCost(f);
      const jobs = picked.filter((p) => p.step === f.step && !isCost(p));
      const jobsBefore = jobs.length + (outside ? 1 : 0);
      if (job && jobsBefore >= MOVE_JOBS) { held.push({ fact: f, why: 'third-job' }); continue; }
      // A job after another job is the move's second (its own kind); a cost,
      // or the move's first job, speaks as itself.
      const said = (text: string): ThoughtFact => (job && jobsBefore >= 1 ? asSecondJob(f, text) : { ...f, text });
      // Behind another producer's line on this move: the caller kept only
      // what speaks there (`speaksBehindLead`), in its own words.
      if (!lead) { if (pick(f, said(f.text))) leadOf.set(f.step, f); continue; }
      const firstJob = jobs.at(0) ?? lead;
      if (job && isByProduct(firstJob.idea, f.idea)) { held.push({ fact: f, why: 'by-product' }); continue; }
      const secondJob = f.restates !== true && weighOf(f) >= POLICY.floor && weighOf(f) >= weighOf(lead) - POLICY.gap;
      if (reg.depth === 'thread' && (secondJob || isNews(f, lead))) { pick(f, said(f.alsoText ?? f.text)); continue; }
      held.push({ fact: f, why: 'not-support-or-news' });
      continue;
    }
    if (!lead) { if (pick(f)) leadOf.set(f.step, f); continue; }
    const news = isNews(f, lead);
    // Another fact in a later step speaks as support — it names a square the
    // step's lead names, or the lead's line changes a relation it stands on
    // (cause → effect, `factRelations`, P1-11) — or as news (relative to the
    // lead, rule 4): one thread, never a stack.
    const support = f.squares.some((s) => lead.squares.includes(s)) || causeEffect(lead, f);
    if (reg.depth === 'thread' && (support || news)) { pick(f, { ...f, text: f.alsoText ?? f.text }); continue; }
    held.push({ fact: f, why: 'not-support-or-news' });
  }

  // THE QUIET-MOVE RULE (WO-DECIDER-02): a step whose facts only restate the
  // board ("You play Nxe3 — it takes back the bishop") says nothing.
  for (const st of new Set(picked.map((f) => f.step))) {
    const inStep = picked.filter((f) => f.step === st);
    if (inStep.every((f) => f.restates)) {
      const at = picked.indexOf(inStep[0]);
      for (const f of inStep) { held.push({ fact: f, why: 'restates' }); picked.splice(picked.indexOf(f), 1); }
      // …AND THE FACT THAT EXPLAINS THE SAME IDEA TAKES ITS PLACE (task 172:
      // "it trades bishops" led the step, held "Bxe4 is a good trade — it takes
      // off their bishop that was bearing down on your king" as the same idea,
      // and was then dropped for only restating the board — the step said
      // nothing). A restating fact never silences the one that says why.
      const explains = held.find((h) => h.why === 'same-idea' && h.fact.step === st && h.fact.restates !== true && inStep.some((p) => sameIdea(p, h.fact)));
      if (explains) { held.splice(held.indexOf(explains), 1); picked.splice(at, 0, explains.fact); }
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
  // EVERYTHING THE THOUGHT WEIGHED (the owner's drawer, `everythingEvents`).
  if (everythingListening()) {
    emitEverything({
      surface,
      door: 'composer',
      lines: [
        ...kept.map((f) => ({ computer: `${f.computer} (${f.source})`, kind: f.kind, text: f.text, said: true, why: null, fen: f.fen })),
        ...held.map((h) => ({ computer: `${h.fact.computer} (${h.fact.source})`, kind: h.fact.kind, text: h.fact.text, said: false, why: h.why, fen: h.fact.fen })),
      ],
    });
  }
  return { spoken: joinSpoken(keptVoice), kept, held };
}
