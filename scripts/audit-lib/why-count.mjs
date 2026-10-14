// WHY STATEMENTS ARE PREVALENT AND NUMEROUS (David 2026-10-13: "Make sure that
// the why statements are prevalent and numerous in these next two walks").
// A WHY is a sentence that gives a reason or a consequence, not a bare
// description. One reader for every walk, so Learn, Review and Play are
// measured the same way.
const WHY = new RegExp([
  String.raw`\bbecause\b`, String.raw`\bso (?:that|it|the|your|their|you|they)\b`, String.raw`\bsince\b`,
  String.raw`\bwhich (?:means|lets|leaves|keeps|stops|wins|costs|gives|takes|opens|blocks)\b`,
  String.raw`\bthat'?s why\b`, String.raw`\bthe point\b`, String.raw`\bthe idea\b`,
  String.raw`\bit (?:let|lets|would|will|wins|costs|leaves|keeps|stops|gives|takes|opens|blocks|hits|attacks|threatens)\b`,
  String.raw`\b(?:this|that|the move) (?:lets|let|leaves|left|keeps|stops|wins|costs|gives|opens|blocks|hits|threatens)\b`,
  String.raw`\bin order to\b`, String.raw`\bto (?:stop|keep|win|free|open|close|guard|defend|attack|prepare|meet|cover)\b`,
  String.raw`\bfalls\b`, String.raw`\bcan'?t (?:run|move|step|escape)\b`, String.raw`\bwould (?:cost|lose|win|leave|let|drop|hang)\b`,
  String.raw`\b(?:wins|win|lose|loses|lost|won) (?:a|the|your|their|it)\b`, String.raw`\bmate\b`,
  String.raw`\bwhich would\b`, String.raw`\bprepares?\b`, String.raw`\b(?:takes?|kicks?|chases?|traps?) it\b`,
  String.raw`\b(?:gets?|got|is) trapped\b`, String.raw`\bpoisoned\b`, String.raw`\bcosting\b`, String.raw`\bfor free\b`,
  String.raw`\bif (?:you|they|it|the|your|their)\b`, String.raw`\bonce (?:it|they|you)\b`, String.raw`\bbefore (?:it|they|you)\b`,
  String.raw`\bnothing'?s? (?:is )?defending\b`, String.raw`\bnothing (?:defends|guards)\b`, String.raw`\bundefended\b`, String.raw`\bhangs?\b`,
  String.raw`\b(?:a|the) rule\b`, String.raw`\bremember\b`,
  String.raw`\byou come out (?:ahead|behind)\b`, String.raw`\bthe price\b`, String.raw`\bthe danger\b`, String.raw`\bso while\b`,
  String.raw`\bcan'?t be (?:taken back|undone)\b`,
  String.raw`\bmatters? more than\b`, String.raw`\bwould (?:just )?be taken\b`, String.raw`\bdoesn'?t work\b`, String.raw`\b(?:often )?decides\b`,
  String.raw`\bgives? up (?:its|their|your) guard\b`, String.raw`\bonly (?:one|a single) \w+ (?:shields|guards|defends)\b`, String.raw`\bcan be taken\b`,
  String.raw`\byou'?re (?:losing|winning|clearly worse|clearly better|worse|better) — they'?re up\b`,
  String.raw`\bwhere (?:they|you) (?:hold|have)\b`, String.raw`\bunveils\b`, String.raw`\bthey win\b`, String.raw`\byou win\b`,
].join('|'), 'i');

/** NOT TEACHING — greetings, the game's setup, whose move it is, the game
 *  intro. These are not measured: forcing a why onto "e4 — your move" makes
 *  filler. Opening names and book departures ARE teaching and are measured. */
const NOT_TEACHING = [
  /^(what are you working on|what's it going to be|good to see you|none of your games|want to )/i,
  /^you're (white|black) — play /i,
  /^[a-h1-8nbrqkox+#=-]+ — your move\.?$/i,
  /^here's your game in /i,
  /^(ready when you are|let's get to work)\b/i,
  // The move's own announcement and the session/drill prompts (2026-10-14):
  // "Check." says what their move was; "Back at the board…" and "Find their
  // targets — tap each one." ask the student to act. None is a lesson.
  /^check(mate)?[.!]?$/i,
  /^back at the board\b/i,
  /^find their targets\b/i,
  // A question on its own line is the first half of a question-and-answer
  // pair ("So what is the answer?" ‖ "Move it — …"); the answer is measured.
  /^[^.!]*\?$/,
];
export function isTeachingLine(t) { return !NOT_TEACHING.some((re) => re.test(String(t).trim())); }

/** Split a spoken line into sentences. */
function sentences(t) {
  return String(t).split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
}

/** The share of teaching lines that must carry a why. */
export const WHY_SHARE_BAR = 0.9;

/** Does this sentence state a reason or consequence? */
export function isWhy(sentence) { return WHY.test(String(sentence)); }

/** The why tally over a tape. `studentMoves` is the denominator for "per move". */
export function whyTally(lines, studentMoves) {
  const ls = lines.map(String).filter((t) => t.trim().length > 0 && isTeachingLine(t));
  const withWhy = ls.filter((t) => sentences(t).some(isWhy));
  const whySentences = ls.flatMap(sentences).filter(isWhy).length;
  const share = ls.length ? withWhy.length / ls.length : 0;
  const perMove = studentMoves > 0 ? whySentences / studentMoves : 0;
  return {
    lines: ls.length, withWhy: withWhy.length, share, whySentences, perMove,
    whyless: ls.filter((t) => !sentences(t).some(isWhy)),
    // PREVALENT: 90% of TEACHING lines give a reason (David 2026-10-13: "a
    // better standard is closer to 90%. Why statements are the foundational
    // teachings of this app"). NUMEROUS: at least one why per student move.
    prevalent: share >= WHY_SHARE_BAR, numerous: perMove >= 1,
  };
}
