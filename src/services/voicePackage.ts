// voicePackage — the package survives the model's removal.
//
// David 2026-08-08: "We still need to be handing the phrase in a package.
// Deterministically. I think we lost the package when we removed the llm. But
// same rules apply, just now to Google voice."
//
// He is describing a real regression, and the code admitted it in a comment:
// "Not handed to a model any more — logged." The G0 architecture was
//
//     code computes FACTS → package → phrasing model → voice
//
// and every guard lived on the package: each entry speakable VERBATIM, because
// every fallback path serves the facts raw; instructions travelling separately
// so a directive can never be read aloud; each claim verified against the board
// it was computed from.
//
// Cutting the model out of the live lane cut the package out with it. What
// replaced it was a `??` chain choosing between parallel strings and a
// `lines.join(' ')` straight into TTS, while the old `factLines` array kept
// being assembled purely to be logged. Two different truths for one utterance:
// the log said "Coaching note for the pin on the board: X" and the voice said a
// bare "X". Nothing verified the string that was actually spoken, which is how
// three notes describing another game's board reached him in one Pirc.
//
// So the package comes back and the RENDERER changes, not the contract. The
// model was one possible renderer; `render` below is another, and it is
// deterministic. The rules are unchanged — they now govern what reaches Google
// TTS instead of what reaches the model:
//
//   1. Every entry is spoken verbatim, so every entry must be speakable.
//      Instructions never enter the package. There is no field for them here,
//      which is the point: a directive cannot be read aloud if it cannot be
//      represented.
//   2. Every entry carries the FEN it was computed from and is verified against
//      THAT board before it is allowed into the utterance.
//   3. Order is a declared rank, not the accident of a `??` chain.
//   4. What is spoken and what is logged are the same object. A package that
//      reports something other than what the student heard is worse than no
//      log at all.
import { Chess } from 'chess.js';
import { gradeNarrationText } from './coachAnswerGates';
import { falseConfigurationClaim } from './configurationClaims';
import { claimSentences } from '../utils/claimSentences';

/** What produced this line. Also its priority — see `RANK`. */
export type VoiceFactKind =
  /** WHY THE MOVE JUST PLAYED WAS BAD — the backward look (`concessionBeat`).
   *
   *  David 2026-08-10: "I want the reason for a bad move to come first then
   *  forward looking to be spoke second" — first among the COMPUTED lanes. The
   *  corpus note still leads everything; this ordering governs what is said
   *  once the corpus has nothing for the position. It fires only when code can
   *  NAME what the student's own move handed over, so it is rare. */
  | 'drawback'
  /** THE MISTAKE CALLOUT — what was just played, why it was wrong, and what
   *  should have been played instead (`inaccuracyCall`).
   *
   *  David 2026-08-10: "Should be number two on the list, right behind the
   *  mistake call out." So the student's own mistake leads the computed lanes
   *  and the COACH's own sits immediately behind it. That order is the whole
   *  point: a student hears their own move judged before they hear anyone
   *  else's, and the coach admitting its blunder lands as the second thing,
   *  not the first. */
  | 'mistake'
  /** The coach's own inaccuracy, owned in the first person, with the
   *  punishment handed over but never named. Number two, right behind. */
  | 'coachMistake'
  /** TEACHING: a masterclass beat or a corpus note. The heart of the coach. */
  | 'note'
  /** An opportunity the detectors proved FOR the student — mate in one, a
   *  hanging enemy piece, a fork that is really there. */
  | 'tactic'
  /** A verified punishable slip by the coach. */
  | 'gem'
  /** Danger TO the student — a tactic against them, or their own piece
   *  hanging. */
  | 'threat'
  /** BOTH SIDES' PLANS, read off the engine's own line (`lookaheadPlan`).
   *
   *  David 2026-08-09: this "replaces the corpus notes as primary first heard by
   *  user when corpus runs out" — so it sits below
   *  a note authored at this exact board. A computed plan about THIS position
   *  outranks a real note about a DIFFERENT one, which is the reordering he
   *  asked for and is plainly right given that 44.6% of the notes selection
   *  reaches name an opening that never gets to the board they were filed at. */
  | 'plan'
  /** A newly resolved opening name. */
  | 'opening'
  /** The computed read — true of this position by construction. */
  | 'computed'
  /** A positional observation — the filler lane. Speaks only when a turn had
   *  nothing else, and may never displace teaching. */
  | 'observation';

export interface VoiceFact {
  kind: VoiceFactKind;
  /** THE CLAIMS THIS FACT MAKES, as keys computed where the fact is computed —
   *  a tactic is `concept:<type>:<squares>`, a positional idea is its idea key.
   *  The sentence ledger below catches the same WORDS twice; this catches the
   *  same FACT in different words ("You have a back-rank threat: the king on
   *  g8…" / "Their king on g8 has no escape square…", 1200 walk 2026-09-27).
   *  A fact whose claim is already in the game ledger is dropped; a kept fact
   *  writes its claims there. Bookkeeping on keys, never a read of prose (G0). */
  claims?: readonly string[];
  /** Spoken VERBATIM. If it cannot be said to a student out loud, it does not
   *  belong in a package — put it in the caller's own prompt/log instead. */
  text: string;
  /** The position this claim was computed from. Verification runs against this
   *  board, not against whatever is on screen when the package is rendered —
   *  those differ during an animation, and judging a fact by the wrong board is
   *  the bug this whole file exists to prevent. */
  fen: string;
  /** A second board the claim may be about — review speaks about the move, so
   *  a sentence may describe the board BEFORE it ("the knight on f3 was the
   *  defender"). A sentence survives if it is true on either. */
  altFen?: string;
  /** THE SQUARES THIS FACT IS ABOUT — the board's half of the package.
   *
   *  David 2026-08-10: "It needs to be deterministic, handed in the package."
   *
   *  Rule 1 says every entry must be speakable; this is the same idea pointed at
   *  the board. A mark is drawn because the fact that carries it SURVIVED into
   *  the utterance — by identity, not by scanning the prose for something that
   *  looks like a square. The first attempt at coupling them did exactly that,
   *  `said.includes(square)`, which is a validator on text: it passes on an
   *  accidental substring, fails on a square the sentence names in words, and it
   *  is precisely the shape G0 says to stop writing. Compute the squares where
   *  the claim is computed, hand them over with it, and there is nothing left to
   *  validate.
   *
   *  Marks ride `kept` out of `buildVoicePackage`. A fact that was DROPPED takes
   *  its squares with it, so a refused claim can never be drawn — which is the
   *  whole coupling, in one line, for every lane at once. */
  squares?: readonly string[];
  /** THE LINES THIS FACT SAYS — each the SAN moves it names, in order, played
   *  from the board that line starts on. The board's half of a spoken line,
   *  coupled the same way `squares` is: the producer that computed "you'd love
   *  Nd4, but they answer dxe4" hands the moves over with the sentence, and the
   *  board draws them only if the fact SURVIVED (David 2026-09-29: "Make sure
   *  arrows populate when talking about multiple move lines. I have never seen
   *  any!" → "I'm sure you're missing deeper lines being narrated"). A line
   *  starts on its OWN board: "a5 holds … after b5, Nb6, Nxb6 breaks it"
   *  starts after the student's a5, not on the board on screen. Never scraped
   *  back out of the prose — a bare "f5" in "the f5 outpost" is not a move. */
  lines?: readonly SpokenLine[];
}

/** One spoken line: the moves it names, from the board it starts on. */
export interface SpokenLine {
  fen: string;
  sans: readonly string[];
}

/** Every square the package is allowed to draw — the squares of the facts that
 *  actually survived, in spoken order, deduplicated.
 *
 *  The board asks the package what it may mark instead of re-deriving it from
 *  the utterance, so voice and board cannot disagree. */
export function markableSquares(pkg: { kept: VoiceFact[] }): string[] {
  const seen = new Set<string>();
  for (const f of pkg.kept) {
    for (const sq of f.squares ?? []) {
      if (/^[a-h][1-8]$/.test(sq)) seen.add(sq);
    }
  }
  return [...seen];
}

/** Priority, high wins. Declared once, here, so no caller re-invents an order.
 *
 *  🔒 THE ORDER IS DAVID'S, VERBATIM (2026-08-09): "Corpus needs to be first.
 *  Then tactics Then gems and then threats." With "Remember I need to hear
 *  those teaching notes! Danya teaching next to me!"
 *
 *  It used to run the other way — `note` ranked DEAD LAST of five, justified in
 *  a comment by the 90/10 rule, which is the rule it got backwards. "90% of
 *  what needs to be said lives within these notes; the other 10% comes from
 *  threat and gem detection" is an argument for teaching ranking FIRST. Paired
 *  with the old 3-fact budget, it meant any turn with a busy detector threw the
 *  teaching away unheard: computed, verified, logged, never spoken.
 *
 *  Rank no longer decides WHETHER a fact is spoken — nothing is dropped for
 *  budget any more — only the ORDER it is spoken in. So this is a statement
 *  about what the student should hear FIRST, and the teaching leads.
 *
 *  `tactic` (an opportunity FOR the student) and `threat` (danger TO them) were
 *  one `alert` kind until this order needed them apart.
 *
 *  Below the four David named, in descending usefulness: the opening
 *  announcement, the computed read, and `observation` — the positional-read
 *  filler, split out from `note` so "your pawn on a2 is isolated" can never
 *  again share a rank with a masterclass beat. */
const RANK: Record<VoiceFactKind, number> = {
  // ── THE PUNISH THE COACH JUST HANDED YOU GOES FIRST ────────────────────
  //
  // David 2026-08-11, shown that the gem sat sixth: "You can change the order."
  //
  // It is the one lane that asks the student to ACT ON THIS MOVE. Everything
  // below teaches, and teaching keeps — a note about the structure is as true
  // thirty seconds later. "Your opponent just slipped; there is a punish here"
  // expires the moment they play something else, and it is now DELIBERATE:
  // the coach walked into a curated, engine-verified trap on purpose, so the
  // walk-in is the event of the turn rather than an accident worth a footnote.
  //
  // This is the single documented exception to "corpus notes are always
  // first", and it is narrow on purpose — a gem callout is not general
  // teaching but a prompt to move, and it withholds the move itself, so it
  // takes about a second and hands nothing over.
  gem: 15,
  // THE CORPUS NOTE IS ALWAYS FIRST (David 2026-08-10, correcting a reading of
  // his ordering that had put it fifth: "Corpus notes are always first. I was
  // talking about AFTER corpus has ran out and we are on computer
  // narrations"). The 90/10 rule stands untouched — a note authored at this
  // board outranks anything computed about it.
  note: 14,
  // Then the computed lanes, in the order he named: "backwards first, then
  // forward, then gem, then threat" — what your last move cost, what the line
  // does next, the punishable slip, the thing coming at you.
  // David 2026-08-10, on where the mistake callout belongs: first among the
  // computed lanes, with the coach's own admission immediately behind it.
  mistake: 13,
  coachMistake: 12,
  drawback: 11,
  plan: 10,
  // (`gem` used to sit here, sixth. It leads the table now — see the note at
  // the top. The lanes above it are computed asynchronously and ship in the
  // LATE package, so this move changes nothing between them: the instant
  // package already speaks first in time. What it changes is the one
  // comparison that was real — the gem against a corpus note in its own
  // package, where the note was speaking first.)
  threat: 8,
  tactic: 7,
  opening: 2,
  computed: 1,
  observation: 0,
};

export interface VoicePackage {
  /** The utterance. '' when nothing survived — silence is a valid answer and
   *  the most common one on a quiet board. */
  spoken: string;
  /** Exactly what `spoken` was built from, in spoken order. Log THIS. */
  kept: VoiceFact[];
  /** What was refused and why, so a silent package is diagnosable. */
  dropped: Array<{ fact: VoiceFact; reason: string }>;
}

/** Verify one fact against its own board. Returns the text to speak — possibly
 *  trimmed by the grader — or a reason it may not be spoken at all. */
/** Scaffolding a student must never hear. Prompt blocks, section headers,
 *  control tags, instructions to a model.
 *
 *  Rule 1 of this file says every entry must be speakable, and until 2026-08-08
 *  it said so while enforcing nothing — the package trusted its callers. The
 *  cross-surface scorecard then fed it `formatReadingFacts`, a model-input block
 *  opening "READING FACTS (GROUND TRUTH — Static Exchange Eval…", and the
 *  package passed all 61 of them through to be spoken. That is precisely the
 *  failure `voiceFacts` documents from a prod run: the coach reading its own
 *  directive out loud. A law with no check is a comment. */
/** Sentences that explain the one before them and cannot open an utterance. */
const DEPENDENT = /^(?:Remember —|Here's how:|The habit that fixes it:|Next time:)/;

const NOT_SPEAKABLE: Array<{ re: RegExp; why: string }> = [
  { re: /\n/, why: 'multi-line block, not an utterance' },
  { re: /\[(?:BOARD|VOICE|EVAL|FACT)S?\b/i, why: 'control tag' },
  { re: /\b[A-Z][A-Z0-9]{2,}(?:\s+[A-Z][A-Z0-9]{2,})+/, why: 'shouted header (prompt scaffolding)' },
  // SHOUTED only: prompt scaffolding is capitalised. Case-insensitive, it
  // refused real teaching — "Do not move the pawns in front of your own king"
  // is a fundamental's how-to (review measurement 2026-09-30).
  { re: /\b(?:REQUIRED|GROUND TRUTH|DO NOT|you MUST)\b/, why: 'instruction to a model' },
  { re: /\bNEVER (?:say|invent|repeat)\b/i, why: 'instruction to a model' },
];

/** THE DNA VOICE RULES (docs/DNA-outline.md), held at the one door every
 *  spoken fact passes (Learn and Review). The computers are written to them;
 *  this is the backstop, and a fact it refuses is a template to fix.
 *  • no praise or acknowledgement — the position is the acknowledgement;
 *  • no interface talk — the voice knows the position, not the buttons. */
const DNA_REFUSE: Array<{ re: RegExp; why: string }> = [
  // Sentence-OPENING praise only: "the only good move here" is teaching.
  { re: /(?:^|[.!?]\s+)(?:great|nice|good|excellent|brilliant|well)\s+(?:move|job|find|done|play|shot)\b|\bwell done\b|\bgood job\b|(?:^|[.!?]\s+)(?:excellent|correct|great|nice|perfect)[!.]/i, why: 'dna: praise' },
  { re: /\b(?:tap|click|press)\s+(?:the|a|on)\b|\b(?:button|menu)\b/i, why: 'dna: interface talk' },
];
/** DNA rule 7 — no move-number prefixes ("12.Nf3" is read "twelve"). A
 *  rephrase, never a drop: the move stays, the number goes. */
export function stripMoveNumbers(text: string): string {
  return text.replace(/(?<![\w.])\d{1,3}\s?(?:\.\.\.|…|\.)\s?(?=(?:[NBRQK][a-h1-8x]|O-O|[a-h][1-8x]))/g, (m) => (/(?:\.\.\.|…)/.test(m) ? '…' : ''));
}

function verify(fact: VoiceFact): { text: string } | { reason: string } {
  const raw = stripMoveNumbers(fact.text.trim());
  if (!raw) return { reason: 'empty' };

  for (const s of NOT_SPEAKABLE) if (s.re.test(raw)) return { reason: s.why };
  for (const s of DNA_REFUSE) if (s.re.test(raw)) return { reason: s.why };

  // Square-anchored claims: "the knight on f6" when f6 is empty.
  let graded = gradeNarrationText(raw, fact.fen, `voicePackage.${fact.kind}`)?.trim();
  if (fact.altFen && (graded ?? '') !== raw) {
    const alt = gradeNarrationText(raw, fact.altFen, `voicePackage.${fact.kind}`)?.trim();
    if ((alt ?? '').length > (graded ?? '').length) graded = alt;
  }
  if (!graded) return { reason: 'no sentence survived board grading' };

  // Structural claims naming NO square, which the grader above cannot settle:
  // "doubled rooks on the open file" with every rook at home. A note reached by
  // pattern is exactly the kind that asserts a configuration it cannot see.
  const bad = falseConfigurationClaim(graded, fact.fen);
  if (bad && !(fact.altFen && !falseConfigurationClaim(graded, fact.altFen))) return { reason: `board lacks ${bad}` };

  return { text: graded };
}

/**
 * Assemble the utterance. Deterministic: same facts in, same words out.
 *
 * 🔒 NO BUDGET (David 2026-08-09: "No budget on the coach narrations! They
 * should all be free now!!").
 *
 * There used to be a 3-fact cap here, and it was the last thing silently
 * dropping teaching: every fact was computed and verified, then the lowest-
 * ranked ones were thrown away unheard. The justification was that an utterance
 * is one TTS clip and the student waits through it — but the reason to ration
 * was never really time, it was the per-call cost of the model that used to
 * write these lines. That model is gone; the package is assembled in code and
 * handed to Google TTS, which is free at this volume. Nothing is being spent,
 * so nothing needs rationing. It also matches the standing rule that quality is
 * the only metric and cost is never a factor, and David's earlier call on the
 * same trade: "if we cap to three sentences we lose important information about
 * the position."
 *
 * RANK still decides ORDER, which is what makes an uncapped utterance safe: the
 * most important thing is said first, so a student who moves again mid-sentence
 * only ever loses the tail.
 */
/** How much shared opening it takes before two facts are the same observation.
 *
 *  Twenty-four normalised characters is about "theirknightonc3isundefend" — a
 *  subject, a square and a predicate. Shorter than that and a shared opener is
 *  just a shared opener ("watchout"), which two genuinely different warnings
 *  are entitled to. */
const TWIN_PREFIX = 24;

/** Length of the common leading run of two normalised strings. */
function sharedPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

/** Sentences, for dedupe purposes. Our prose is generated, so a full stop
 *  followed by whitespace is a sentence boundary and nothing else is. */
function sentencesOf(text: string): string[] {
  // The move-question glue lives in the ONE splitter every stripper shares.
  return claimSentences(text);
}

/** The comparison key: letters and digits only, so punctuation and casing
 *  cannot make two identical claims look different. */
const sayKey = (s: string): string => {
  const full = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  // A FRAME IS NOT PART OF THE CLAIM (hand walk 1380, move 25: "Watch out —
  // their rook on f8 pins your bishop…" and the same pin without the frame
  // were spoken back to back, because the prefix twin-check never saw them
  // as one). The key drops a leading "watch out / careful / check" so one
  // claim is one key however it is introduced — never down to nothing.
  // …and a naming frame ("You have a back-rank threat:") and the owner word
  // ("the / their / your king on g8…") are not the claim either — the 1200
  // walk (2026-09-27) heard "You have a back-rank threat: the king on g8 has no
  // escape square…" and then "Their king on g8 has no escape square…".
  const bare = s
    .replace(/^\s*(?:(?:watch out|careful|check|look out|heads up|remember|note)\s*[—–:,.!-]*\s*)+/i, '')
    .replace(/^\s*you (?:have|'ve got|’ve got) an? [\w -]{2,30}?:\s*/i, '')
    .replace(/^\s*(?:the|their|your|my)\s+(?=(?:king|queen|rook|bishop|knight|pawn)\b)/i, 'the ');
  const key = bare.toLowerCase().replace(/[^a-z0-9]/g, '');
  return key.length >= 12 ? key : full;
};

/** A claim's key in the ledger. Namespaced with a colon, which `sayKey` never
 *  produces, so a claim can never collide with a sentence. */
const claimKey = (c: string): string => `claim:${c}`;

export function buildVoicePackage(
  facts: VoiceFact[],
  /** WHAT THIS TURN HAS ALREADY SAID OUT LOUD.
   *
   *  🔒 ONE FACT, ONE UTTERANCE — ACROSS BOTH PACKAGES (David 2026-08-11:
   *  "Lots of double narrations").
   *
   *  A turn speaks twice by design: an INSTANT package that lands with the
   *  coach's move, and a LATE one that lands when the engine read settles. Two
   *  assemblies, and every dedupe rule below lived inside ONE of them — so a
   *  fact computed by both producers passed both packages and was spoken twice,
   *  eight to twenty seconds apart. His phone transcript has eleven of them in a
   *  twenty-minute game, e.g. at 00:29:16 and again at 00:29:25:
   *
   *    "They want to walk the rook round to d5, by way of d8. You want to walk
   *     the bishop round to d5, by way of e4."
   *
   *  Removing the plan from the instant package fixed ONE duplicated lane. The
   *  board read, the key squares, the line shape and the terminal read all
   *  duplicated the same way, because the two producers read the same board.
   *  Chasing them producer by producer is the bandaid; the turn knowing what it
   *  has already said is the fix, and it holds for lanes not yet written.
   *
   *  Matched SENTENCE by sentence, not fact by fact: the late package's facts
   *  routinely carry one new sentence bolted to one already spoken, and dropping
   *  the whole fact would lose the new half. A fact left with nothing new is
   *  refused outright — and takes its marks with it, per the `squares` coupling.
   *
   *  NOT a validator on prose (G0). Both strings here are this package's own
   *  output — it is comparing what it is about to say against what it already
   *  said, which is bookkeeping, not judgement. */
  alreadySaid?: string,
  /** EVERY PHRASE ALREADY SPOKEN THIS GAME (sentence sayKeys), across all prior
   *  turns and all lanes.
   *
   *  David 2026-09-13: "don't let it repeat phrases … checking every turn for
   *  new and different teaching phrases. Same with all of the other
   *  calculators!!" `alreadySaid` gates repeats within ONE turn (its two
   *  packages); this gates them across the WHOLE game, for every lane at once —
   *  an uncastled king is true for ten plies running and must be said once, not
   *  ten times. The caller owns the set (one per game) and feeds each spoken
   *  package's keys back in via `spokenSentenceKeys`.
   *
   *  Seeded into `seen` but NOT `saidEarlier`: a repeat from an earlier turn is
   *  a 'duplicate', not 'already said this turn' — the two point at different
   *  things when a silent package needs diagnosing. */
  priorKeys?: ReadonlySet<string>,
): VoicePackage {
  const kept: VoiceFact[] = [];
  const dropped: VoicePackage['dropped'] = [];
  const seen = new Set<string>();
  // Kept apart from `seen` ONLY so a refusal can name its cause. A silent
  // package is diagnosable or it is not diagnosable at all, and "duplicate",
  // "same observation, different moral" and "already said this turn" point at
  // three different bugs.
  const saidEarlier = new Set<string>();
  for (const s of sentencesOf(alreadySaid ?? '')) { seen.add(sayKey(s)); saidEarlier.add(sayKey(s)); }
  if (priorKeys) for (const k of priorKeys) seen.add(k);

  // Sort by rank, then by the order the caller supplied — stable, so two facts
  // of the same kind keep the sequence the caller computed them in.
  const ordered = facts
    .map((f, i) => ({ f, i }))
    .sort((a, b) => RANK[b.f.kind] - RANK[a.f.kind] || a.i - b.i);

  // (The `borrowed` corpus tier and the book `fork` offer, and the rule that
  // made borrowed teaching yield to an event on THIS board, went 2026-09-29:
  // no surface produced either kind any more — G8.5.)
  for (const { f } of ordered) {
    if (f.claims?.some((c) => seen.has(claimKey(c)))) { dropped.push({ fact: f, reason: 'claim already said' }); continue; }
    const result = verify(f);
    if ('reason' in result) { dropped.push({ fact: f, reason: result.reason }); continue; }
    // Same sentence from two producers is one sentence to the ear — and the two
    // producers are often the two PACKAGES of one turn, which is why `seen` is
    // seeded above rather than starting empty.
    const fresh: string[] = [];
    const why = new Set<string>();
    // A sentence that EXPLAINS the one before it ("Remember — a pin freezes…",
    // "Here's how: …") never stands alone: when its fact sentence was dropped
    // as a repeat, it goes too (walk 2026-09-30, game 2: the pin definition
    // spoken a move after the pin, on its own).
    let prevKept = false;
    for (const s of sentencesOf(result.text)) {
      const k = sayKey(s);
      if (DEPENDENT.test(s) && !prevKept) { why.add('duplicate'); continue; }
      prevKept = false;
      if (seen.has(k)) { why.add(saidEarlier.has(k) ? 'already said this turn' : 'duplicate'); continue; }
      const near = [...seen].find((prior) => {
        const n = sharedPrefix(prior, k);
        return n >= TWIN_PREFIX && /[a-h][1-8]/.test(k.slice(0, n));
      });
      if (near) {
        why.add(saidEarlier.has(near) ? 'already said this turn' : 'same observation, different moral');
        continue;
      }
      seen.add(k);
      fresh.push(s);
      prevKept = true;
    }
    if (fresh.length === 0) {
      // Whole-fact refusals report the STRONGEST cause, so a fact that lost one
      // sentence to a twin and one to the earlier package reads as the twin —
      // the within-package collision is the one worth chasing.
      const reason = why.has('same observation, different moral')
        ? 'same observation, different moral'
        : why.has('duplicate') ? 'duplicate' : 'already said this turn';
      dropped.push({ fact: f, reason });
      continue;
    }
    const key = sayKey(fresh.join(' '));
    // ── THE SAME OBSERVATION, TWICE, WITH DIFFERENT MORALS ────────────────
    // David 2026-08-10: "I think I heard a double sentence." He did, five
    // times in one session:
    //
    //   "Their knight on c3 is undefended — there's something to win here.
    //    Their knight on c3 is undefended — an undefended piece is the seed
    //    of a tactic."
    //
    // Two lanes — the alert and the running commentary — both read the same
    // loose piece off the same board and both said so. Neither is wrong and
    // the exact-match guard above cannot see it, because the sentences differ
    // in their TAILS: the observation is shared, the moral bolted to it is
    // not. To the ear it is a stutter.
    //
    // Matched on the shared leading clause rather than on the whole string,
    // and only when that clause is long enough to be a real observation AND
    // names a square — so it cannot collapse two genuinely different warnings
    // that happen to open "Watch out —".
    seen.add(key);
    for (const c of f.claims ?? []) seen.add(claimKey(c));
    // A line rides only when EVERY sentence survived: a trimmed fact may have
    // lost the very sentence that named the moves.
    kept.push({ ...f, text: fresh.join(' '), lines: why.size === 0 ? f.lines : undefined });
  }

  // SENTENCE CASE AT THE JOIN. David's 2026-08-08 run: "That takes your pawn.
  // the knight on e4 sits on an outpost…" and "There's a real pin here for you
  // — look for it. the knight on e4 sits…". Each fact is written as a standalone
  // sentence by its own producer, and some start lowercase because they were
  // authored to be spliced mid-sentence. Joined with a space after a full stop,
  // that lowercase reads as a mistake and HEARS as one — the TTS drops its
  // pitch as if continuing a clause.
  //
  // Fixed here rather than in each producer: this is the only place that knows
  // a fact is about to follow a sentence boundary.
  //
  // THE FIRST SENTENCE WAS THE ONE IT NEVER FIXED. The guard read
  // `isFirst || alreadyCapital ? leaveAlone : capitalise`, which exempts
  // exactly the sentence that most needs a capital — the one that opens the
  // utterance. David's log, 20:26:40: "the knight on e4 sits on an outpost no
  // pawn can challenge." leading a whole turn. The position of a sentence has
  // no bearing on whether it starts with a capital; only whether it opens with
  // a move name does.
  const spoken = joinSpoken(kept);
  return { spoken, kept, dropped };
}

/** The sentence-level sayKeys a package actually spoke — what the caller feeds
 *  back into its per-game novelty set so the NEXT turn's package (`priorKeys`)
 *  never repeats any of them. Keyed exactly as the dedupe inside
 *  `buildVoicePackage`, so a key added here is a key that suppresses there. */
export function spokenSentenceKeys(pkg: { kept: VoiceFact[] }): string[] {
  const out: string[] = [];
  for (const f of pkg.kept) {
    for (const s of sentencesOf(f.text)) out.push(sayKey(s));
    for (const c of f.claims ?? []) out.push(claimKey(c));
  }
  return out;
}

/** One-line summary for the audit stream, built from the SAME object that was
 *  spoken — the property that was missing when the log and the voice diverged. */
export function describeVoicePackage(pkg: VoicePackage): string {
  const kinds = pkg.kept.map((f) => f.kind).join('+') || 'silent';
  const why = pkg.dropped.map((d) => `${d.fact.kind}:${d.reason}`).join(', ');
  return why ? `${kinds} (dropped ${why})` : kinds;
}

/** The utterance for a list of kept facts: each a full sentence, capitalised
 *  unless it opens with a move name. Exported so a caller that SELECTS from
 *  `kept` (the Learn door's lead pick) renders exactly as the package does. */
export function joinSpoken(kept: readonly VoiceFact[]): string {
  const sentence = (t: string): string => {
    // Every line ENDS as a sentence before the join — the 2026-09-24 Learn tape
    // ran "…against king on e1 Your king is still in the centre" together.
    const bare = t.trim();
    const trimmed = bare && !/[.!?…]["'’”)\]]*$/.test(bare) ? `${bare}.` : bare;
    if (!trimmed) return trimmed;
    // Leave an intentional lowercase opener alone when it is a SAN token
    // ("dxe5 wins a pawn") — capitalising a move name would be wrong.
    if (/^[a-h][1-8x]/.test(trimmed) || /^[KQRBN]x?[a-h][1-8]/.test(trimmed)) return trimmed;
    return trimmed[0].toUpperCase() + trimmed.slice(1);
  };
  return kept.map((f) => sentence(f.text)).join(' ');
}

/** A spoken line's arrow — one per move, in the order said. */
export interface LineArrow {
  from: string;
  to: string;
  /** Whose move it is: the student's own, or the opponent's answer. */
  side: 'student' | 'opponent';
  san: string;
}

/** A kept line, replayed: the board it starts on and one arrow per move. */
export interface DrawnLine {
  fen: string;
  arrows: LineArrow[];
}

/** Every LINE the package kept, replayed by chess.js from the board it starts
 *  on. The first move that does not play ends that line — half a line is drawn
 *  rather than a spliced one; a line with no legal first move is dropped. */
export function keptLines(pkg: { kept: readonly VoiceFact[] }, student: 'w' | 'b'): DrawnLine[] {
  const out: DrawnLine[] = [];
  for (const f of pkg.kept) {
    for (const line of f.lines ?? []) {
      let board: Chess;
      try { board = new Chess(line.fen); } catch { continue; }
      const arrows: LineArrow[] = [];
      for (const san of line.sans) {
        let mv;
        try { mv = board.move(san); } catch { mv = null; }
        if (!mv) break;
        arrows.push({ from: mv.from, to: mv.to, side: mv.color === student ? 'student' : 'opponent', san: mv.san });
      }
      if (arrows.length > 0) out.push({ fen: line.fen, arrows });
    }
  }
  return out;
}
