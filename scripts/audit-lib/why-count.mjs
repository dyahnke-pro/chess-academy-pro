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
  // EFFECT WORDINGS (David 2026-10-14: "Agreed"): a consequence counts only
  // when it names what it acts on — "which attacks your knight on c6", not a
  // bare "which attacks". DESCRIPTIONS_NOT_WHY in the test is the negative
  // control that keeps this from turning into a wording reward.
  String.raw`\b(?:which|and) (?:attacks|hits|pins|forks|traps|guards|defends|blocks|undermines|threatens) (?:your|their|the|its) \w+`,
  String.raw`\bgives? up (?:the|your|their|its) \w+`, String.raw`\bhas no (?:escape|square|retreat|way out)\b`,
  String.raw`\b(?:a|the) guard does not help\b`, String.raw`\btakes \w+ away from (?:your|their) \w+`,
  String.raw`\blifts the pressure\b`, String.raw`\bis worth (?:less|more) than\b`, String.raw`\btakes (?:moves|time|tempi) to\b`,
  String.raw`\bneeds? (?:a|an|the) [\w-]+(?: \w+)? to (?:reach|get|win|attack|break)\b`, String.raw`\b(?:is|are) stronger than\b`, String.raw`\bcan never (?:come|be (?:challenged|taken|kicked))\b`,
  String.raw`\bmakes them (?:commit|move|decide|spend)\b`, String.raw`\bremoves? (?:a|the|their|your) (?:defender|guard)\b`, String.raw`\bleaves (?:your|their) \w+ on [a-h][1-8] to be taken\b`,
  String.raw`\bcosts? (?:a little|about|more than|three or four|five) (?:half a |a |two )?points?\b`, String.raw`\bhas no (?:defender|guard)\b`,
  String.raw`\bswings the game by\b`, String.raw`\bit (?:forks|pins|skewers)\b`, String.raw`\bcosts? (?:them|you) (?:the |a |an )?\w+`,
  String.raw`\blet (?:them|you) in\b`, String.raw`\bis open to (?:your|their) \w+`, String.raw`\bcannot move at all\b`,
  String.raw`\breach(?:es)? (?:their|your) camp\b`, String.raw`\bcloser to a queen\b`, String.raw`\bis open to attack\b`, String.raw`\bpawn can chase a piece off\b`,
  String.raw`\b(?:is|are) safe now\b`, String.raw`\bthe guard that holds\b`, String.raw`\bsaves the \w+ from (?:your|their) \w+`,
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
  /^(find|tap) (every|each|your|the) /i,
  /\b(?:tap|find) (?:every|each) square it can go to\b/i,
  // A question on its own line is the first half of a question-and-answer
  // pair ("So what is the answer?" ‖ "Move it — …"); the answer is measured.
  /^[^.!]*\?$/,
];
export function isTeachingLine(t) { return !NOT_TEACHING.some((re) => re.test(String(t).trim())); }

/** Split a spoken line into sentences. */
function sentences(t) {
  return String(t).split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
}

/** The share of teaching lines that must carry a why — a FLOOR, a regression
 *  alarm, not the goal (David 2026-10-14: "I like both plans" — 90% chased
 *  wording; the measures below chase teaching). */
export const WHY_SHARE_BAR = 0.8;

/** A sentence reduced to its FORMULA: pieces, squares, moves and seats
 *  blanked, so "your knight on d4 is attacked and nothing's defending it" and
 *  "your rook on h8 is attacked…" read as one template. */
function formulaOf(sentence) {
  return String(sentence).toLowerCase()
    .replace(/\b(?:your|their|the)\b/g, 'W')
    .replace(/\b(?:pawn|knight|bishop|rook|queen|king|piece)s?\b/g, 'P')
    .replace(/\b[a-h][1-8]\b/g, 'SQ')
    .replace(/\b[a-h]-(?:pawn|file)\b/g, 'F')
    .replace(/\b(?:one|two|three|four|five|six|seven|eight|\d+)\b/g, 'N')
    .replace(/\s+/g, ' ').trim();
}

/** REASON VARIETY: templates said more than `max` times in one game. Only
 *  sentences of six words or more — "Check." is not a formula. */
export function formulaRepeats(lines, max = 2) {
  const n = new Map();
  for (const t of lines) for (const sen of sentences(t)) {
    if (sen.split(/\s+/).length < 6) continue;
    const f = formulaOf(sen);
    n.set(f, (n.get(f) ?? 0) + 1);
  }
  return [...n.entries()].filter(([, c]) => c > max).map(([f, c]) => ({ formula: f, count: c }));
}

/** TURN LENGTH: one lead reason per turn — a line longer than `max` words is a
 *  stack of reasons that buries the one that matters. */
export const TURN_WORDS_MAX = 80;
export function longLines(lines, max = TURN_WORDS_MAX) {
  return lines.map(String).filter((t) => t.split(/\s+/).length > max);
}

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
    // PREVALENT: the share FLOOR above. NUMEROUS: at least one why per student move.
    prevalent: share >= WHY_SHARE_BAR, numerous: perMove >= 1,
  };
}
