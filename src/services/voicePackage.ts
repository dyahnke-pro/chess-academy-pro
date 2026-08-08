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
import { gradeNarrationText } from './coachAnswerGates';
import { falseConfigurationClaim } from './configurationClaims';

/** What produced this line. Also its priority — see `RANK`. */
export type VoiceFactKind =
  /** A verified punishable slip by the coach. The sharpest thing that happens. */
  | 'gem'
  /** A threat or opportunity the detectors proved on this board. */
  | 'alert'
  /** A newly resolved opening name. */
  | 'opening'
  /** The computed read — true of this position by construction. */
  | 'computed'
  /** Corpus teaching. Fills silence; never displaces a computed fact. */
  | 'note';

export interface VoiceFact {
  kind: VoiceFactKind;
  /** Spoken VERBATIM. If it cannot be said to a student out loud, it does not
   *  belong in a package — put it in the caller's own prompt/log instead. */
  text: string;
  /** The position this claim was computed from. Verification runs against this
   *  board, not against whatever is on screen when the package is rendered —
   *  those differ during an animation, and judging a fact by the wrong board is
   *  the bug this whole file exists to prevent. */
  fen: string;
}

/** Priority, high wins. Declared once, here, so no caller re-invents an order.
 *
 *  The computed read outranks the note deliberately. The corpus is ~90% of what
 *  the coach says and the detectors are the urgent 10% — an interrupt that
 *  cannot preempt is not an interrupt. */
const RANK: Record<VoiceFactKind, number> = {
  gem: 5,
  alert: 4,
  opening: 3,
  computed: 2,
  note: 1,
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
const NOT_SPEAKABLE: Array<{ re: RegExp; why: string }> = [
  { re: /\n/, why: 'multi-line block, not an utterance' },
  { re: /\[(?:BOARD|VOICE|EVAL|FACT)S?\b/i, why: 'control tag' },
  { re: /\b[A-Z][A-Z0-9]{2,}(?:\s+[A-Z][A-Z0-9]{2,})+/, why: 'shouted header (prompt scaffolding)' },
  { re: /\b(?:REQUIRED|GROUND TRUTH|DO NOT|NEVER (?:say|invent|repeat)|you MUST)\b/i, why: 'instruction to a model' },
];

function verify(fact: VoiceFact): { text: string } | { reason: string } {
  const raw = fact.text.trim();
  if (!raw) return { reason: 'empty' };

  for (const s of NOT_SPEAKABLE) if (s.re.test(raw)) return { reason: s.why };

  // Square-anchored claims: "the knight on f6" when f6 is empty.
  const graded = gradeNarrationText(raw, fact.fen, `voicePackage.${fact.kind}`)?.trim();
  if (!graded) return { reason: 'no sentence survived board grading' };

  // Structural claims naming NO square, which the grader above cannot settle:
  // "doubled rooks on the open file" with every rook at home. A note reached by
  // pattern is exactly the kind that asserts a configuration it cannot see.
  const bad = falseConfigurationClaim(graded, fact.fen);
  if (bad) return { reason: `board lacks ${bad}` };

  return { text: graded };
}

/**
 * Assemble the utterance. Deterministic: same facts in, same words out.
 *
 * `maxFacts` exists because the utterance is ONE TTS clip and a student is
 * waiting through it. Three lines is already a long time to hold the board.
 */
export function buildVoicePackage(facts: VoiceFact[], maxFacts = 3): VoicePackage {
  const kept: VoiceFact[] = [];
  const dropped: VoicePackage['dropped'] = [];
  const seen = new Set<string>();

  // Sort by rank, then by the order the caller supplied — stable, so two facts
  // of the same kind keep the sequence the caller computed them in.
  const ordered = facts
    .map((f, i) => ({ f, i }))
    .sort((a, b) => RANK[b.f.kind] - RANK[a.f.kind] || a.i - b.i);

  for (const { f } of ordered) {
    if (kept.length >= maxFacts) { dropped.push({ fact: f, reason: 'over budget' }); continue; }
    const result = verify(f);
    if ('reason' in result) { dropped.push({ fact: f, reason: result.reason }); continue; }
    // Same sentence from two producers is one sentence to the ear.
    const key = result.text.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) { dropped.push({ fact: f, reason: 'duplicate' }); continue; }
    seen.add(key);
    kept.push({ ...f, text: result.text });
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
  const sentence = (t: string, isFirst: boolean): string => {
    const trimmed = t.trim();
    if (!trimmed) return trimmed;
    // Leave an intentional lowercase opener alone when it is a SAN token
    // ("dxe5 wins a pawn") — capitalising a move name would be wrong.
    if (/^[a-h][1-8x]/.test(trimmed) || /^[KQRBN]x?[a-h][1-8]/.test(trimmed)) return trimmed;
    return isFirst || /^[A-Z]/.test(trimmed)
      ? trimmed
      : trimmed[0].toUpperCase() + trimmed.slice(1);
  };
  const spoken = kept.map((f, i) => sentence(f.text, i === 0)).join(' ');
  return { spoken, kept, dropped };
}

/** One-line summary for the audit stream, built from the SAME object that was
 *  spoken — the property that was missing when the log and the voice diverged. */
export function describeVoicePackage(pkg: VoicePackage): string {
  const kinds = pkg.kept.map((f) => f.kind).join('+') || 'silent';
  const why = pkg.dropped.map((d) => `${d.fact.kind}:${d.reason}`).join(', ');
  return why ? `${kinds} (dropped ${why})` : kinds;
}
