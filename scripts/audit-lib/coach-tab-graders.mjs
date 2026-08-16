/**
 * The coach-tab audit's grading predicates, extracted so they can be fed
 * known-bad input and SHOWN to go red.
 *
 * WHY THIS FILE EXISTS (David 2026-08-16: "If the harness was wrong then that
 * means the test didn't complete and you don't have working data").
 *
 * Six harness bugs in one session all produced the same shape of wrong answer:
 * a check reporting on something other than what it named. Fixing the sixth
 * does not establish that there is no seventh — and a green run from a harness
 * with an unfound bug is not evidence about the product, it is evidence that I
 * ran out of bugs I could see.
 *
 * The distinction that matters: a check which has gone RED for a real defect
 * and GREEN after a code change has demonstrated it discriminates. A check that
 * has only ever been green, or has only ever failed for harness reasons, has
 * not. These graders were in the second class. Every one of them is exercised
 * below against input it MUST reject, so "green" starts meaning something.
 */

/** The stock non-answer — a surface returning this has an unwired lane. */
export const STOCK = /I can only speak to what I can verify|I can't verify|I don't have enough|not sure what you|Hit a snag|Connection error/i;

/** BREVITY IS NOT A FAILURE. A 60-character floor once graded "Queen on d8
 *  pins pawn on d2 against queen on d1." as a non-answer; the app's own voice
 *  rules say "No length floor." What separates an answer from a non-answer is
 *  the stock refusal, plus enough text to be a sentence at all. */
export const isGrounded = (r) => !!r?.ok && !STOCK.test(r.text ?? '') && (r.text ?? '').trim().length >= 15;

/** Tactical vocabulary — used to decide whether a spoken line NAMES the tactic
 *  the board contains, rather than merely being spoken at the same time.
 *
 *  THE ALTERNATION MUST BE GROUPED. This was written `\bfork|pin\b|skewer|…`,
 *  where the boundaries bind to their own branch rather than to the whole
 *  pattern — so `pin\b` demanded the word END at "pin" and "Queen on d8 PINS
 *  pawn on d2" did not match. That is a real sentence the app produced, and
 *  the check would have called a correctly-narrated tactic silent. Found by
 *  the negative controls in coachTabGraders.test.ts, which is the entire
 *  argument for having them: the previous green was luck, not evidence. */
export const TACTIC_WORDS = new RegExp([
  String.raw`\b(?:forks?|forking)\b`,
  String.raw`\b(?:pins?|pinned|pinning)\b`,
  String.raw`\b(?:skewers?|skewered)\b`,
  String.raw`\bdiscover(?:ed|y)\b`,
  String.raw`\bhanging\b`,
  String.raw`\bdouble attack\b`,
  String.raw`\bsacrific(?:e|es|ed|ing)\b`,
  String.raw`\bthreat(?:s|en|ens|ening|ened)?\b`,
  String.raw`\battack(?:s|ing)? the\b`,
  String.raw`\bwins? (?:a|the) (?:pawn|piece|knight|bishop|rook|queen)\b`,
].join('|'), 'i');

/** Lines Play is ALLOWED to speak mid-game: move dictation, the opening name,
 *  phase transitions. Anything else is volunteered teaching, which Play is
 *  contractually silent about until asked. */
export const SANCTIONED = new RegExp([
  // Move dictation — how the student knows what the coach played.
  String.raw`^(?:pawn|knight|bishop|rook|queen|king) (?:to|takes|captures)`,
  String.raw`\bcastles\b`,
  String.raw`^check(?:mate)?\.?$`,
  // Opening name + phase transitions — explicitly allowed on Play.
  String.raw`\bopening\b`, String.raw`\bdefen[cs]e\b`, String.raw`\bgame is now\b`,
  String.raw`\bmiddlegame\b`, String.raw`\bendgame\b`,
  // The move-quality flags. The Play contract allows the coach to "mention a
  // couple of the mistakes made with the positional analysis", and these three
  // are the complete fixed set `buildFastMoveLine` can emit at that tier. They
  // name no square and reveal no tactic — they tell the student their own move
  // was loose, which is not the same as reading the board out to them. The
  // volunteered board reading (the fork, the pin, the hanging piece) is what
  // Play now stays quiet about.
  String.raw`^that drops material\.?$`,
  String.raw`^that gives ground\.?$`,
  String.raw`^a small slip — there was better\.?$`,
].join('|'), 'i');

/**
 * THE SPOKEN LINE, not the audit event's summary.
 *
 * Every `coach-narration-spoken` event carries `narrationText` — the full line,
 * with a comment in voiceService saying outright that the summary "is just a
 * preview". Reading the summary instead was wrong in three compounding ways,
 * and produced the worst false green of the session:
 *
 *   · `speakPackage` formats its summary as `${fact kinds.join('+')} — ${text}`,
 *     and one of the fact kinds is literally **fork**. So a tactic-vocabulary
 *     match on the summary matched the SOURCE TAG, not anything the coach said.
 *     "the tactic is NARRATED" was passing on metadata.
 *   · `speakPolly` formats its summary as `voice=… personality=… text="…"`, so
 *     an anchored classifier never matches and sanctioned move dictation reads
 *     as volunteered teaching.
 *   · both previews are TRUNCATED (40 and 200 chars), so even parsed correctly
 *     they are fragments of the real line.
 *
 * Prefer narrationText; parse the known summary shapes only as a fallback.
 */
export function spokenTextOf(ev) {
  if (!ev) return '';
  if (typeof ev.narrationText === 'string' && ev.narrationText.trim()) return ev.narrationText.trim();
  const s = typeof ev.summary === 'string' ? ev.summary : '';
  const quoted = /text="([\s\S]*)"\s*$/.exec(s);
  if (quoted) return quoted[1].trim();
  const repeat = /^suppressed a repeat:\s*([\s\S]*)$/.exec(s);
  if (repeat) return repeat[1].trim();
  // `<kind>+<kind>+… — <spoken>`: strip the tag prefix so its words are never
  // mistaken for the coach's. Only when the prefix really looks like tags.
  const tagged = /^([a-z+]+)\s+—\s+([\s\S]*)$/.exec(s);
  if (tagged && tagged[1].includes('+')) return tagged[2].trim();
  return s.trim();
}

/** Pull a pawn-magnitude eval claim out of an answer, or null if it makes none.
 *  Magnitude, not signed value: the wording carries the side ("Black is winning
 *  by 4.9" vs "a small edge to you, 0.5"), so comparing raw signs would call
 *  two agreeing answers a contradiction. */
export function evalMagnitudeOf(text) {
  const m = /(-?\d+(?:\.\d+)?)\s*(?:points?|pawns?)/i.exec(text ?? '');
  return m ? Math.abs(Number(m[1])) : null;
}

/** Do the numeric answers describe the same position? Nothing is played
 *  between the questions, so they must. Graded as a spread in pawns so a
 *  settling engine (0.3 → 0.5) does not trip it but 4.9-vs-0.5 does. */
export function evalSpread(texts) {
  const mags = texts.map(evalMagnitudeOf).filter((n) => n !== null);
  if (mags.length < 2) return null;      // nothing to compare — NOT agreement
  return Math.max(...mags) - Math.min(...mags);
}

/** Which assistant texts are new since `before`? A MULTISET difference, not a
 *  set: Play auto-announces things, so a genuine answer can be word-for-word a
 *  message already on screen, and set-membership would discard the real reply
 *  as "already seen". */
export function freshTexts(before, after) {
  return [...after.entries()].filter(([txt, n]) => n > (before.get(txt) ?? 0)).map(([txt]) => txt);
}

export const tally = (list) => {
  const m = new Map();
  for (const x of list) if (x.role === 'assistant' && x.text) m.set(x.text, (m.get(x.text) ?? 0) + 1);
  return m;
};
