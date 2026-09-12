// CORPUS SWEEP — clause-level narration classifier (David 2026-09-12).
//
// WHY THIS EXISTS. David walked the Accelerated Dragon on /coach/teach and
// heard, among the teaching: "We're Black against a 2050 — this is going to be
// juicy", "White recaptures with the knight — music to my ears", and "only our
// second of the whole run". Those are a streamer narrating a video session to
// an audience that had the previous twenty minutes of context. The student has
// a board.
//
// THE UNIT IS THE CLAUSE, NOT THE NOTE. Scoring whole notes measured 0.9%
// chatter and looked like there was nothing to fix — because the defect is
// distributed INSIDE otherwise-good notes:
//
//   "The pawn to g6, the Accelerated Dragon fianchetto — only our second of
//    the whole run."
//     ^ a perfect beat                                  ^ chatter
//
// A keep/delete verdict on that note loses either the teaching or the student.
// So every detector below runs per clause and the operation is a TRIM.
//
// THE GUARD IS LOAD-BEARING. `teachesChess()` vetoes every cut: a clause that
// names a board referent AND predicates something about chess is never cut, no
// matter which chatter pattern it matched. Without it the classifier deletes
// "Now we castle long, completing our development" and keeps "sacrifices are
// in the air" — measured, on this corpus, before the guard existed.
//
// 🔒 THE STEMS CARRY `\w*` ON PURPOSE. The first version wrote them as
// `\b(develop|weak|sacrific|...)\b`, where `\bdevelop\b` cannot match
// "developed", `\bweak\b` cannot match "weaknesses", and `\bsacrific\b` cannot
// match anything at all — it is not a word. Six predicate terms were dead, the
// guard ran at half strength, and the classifier proposed deleting 555 clauses
// of real teaching while still reporting a clean-looking result. It was caught
// only because David hand-checked two lines. `detectors.test.ts` pins his calls
// as fixtures so a future edit to these patterns fails the build instead of
// quietly resuming the over-cut.

/** Board referent: a square, or a piece/geometry noun. */
export const BOARD_RE =
  /\b[a-h][1-8]\b|\b(pawns?|knights?|bishops?|rooks?|queens?|kings?|centre|center|file|diagonal|rank|square|castl\w*)\b/i;

/** Chess predicate. Stems, suffixes allowed — see the lock note above. */
export const PRED_RE = new RegExp(
  '\\b(' +
    [
      'attack', 'defen[sc]', 'defend', 'control', 'pressur', 'develop', 'threat',
      'weak', 'outpost', 'structur', 'tempo', 'space', 'trade', 'trap', 'fork',
      'pin', 'pinn', 'skewer', 'sacrific', 'blockad', 'pass', 'isolat',
      'initiativ', 'counterplay', 'equali', 'plan', 'idea', 'principle',
      'punish', 'blunder', 'tactic', 'endgame', 'material', 'activity',
      'convert', 'calculat', 'candidate', 'balanc', 'simplif', 'compensat',
      'advantag', 'position', 'majorit', 'minorit', 'fianchett', 'zugzwang',
      'opposition', 'coordinat', 'typical', 'intuitiv', 'theory',
    ].join('|') +
    ')\\w*\\b',
  'i',
);

/** The veto. A clause that does both is teaching and is never cut. */
export function teachesChess(clause) {
  return BOARD_RE.test(clause) && PRED_RE.test(clause);
}

// Capitalised chess vocabulary that must never read as a person's name.
// Without this, "Najdorf knows" and "Maroczy plays" become named humans.
const CHESS_PROPER_NOUN =
  /^(White|Black|Sicilian|Dragon|Najdorf|Caro|Kann|French|Italian|Spanish|Ruy|Lopez|Alapin|Scotch|Vienna|London|Grunfeld|Gr[uü]nfeld|Benko|Benoni|Slav|Pirc|Modern|Scandinavian|Petroff|Philidor|Maroczy|Smith|Morra|Accelerated|Open|Closed|Advance|Exchange|Classical|Fantasy|Winawer|Tarrasch|Berlin|Marshall|Nimzo|Indian|Queen|King|Gambit|Attack|Defense|Defence|Variation|System|Opening|Endgame|Middlegame|Stockfish|Lichess|Elo|The|This|That|These|Those|Now|But|And|So|If|When|After|Before|Here|There|Both|Our|Your|Their|It|We|I|He|She|They|You|A|An|In|On|At|One|Two|Three|Reason|Pattern|Idea|Plan)$/;

const PERSON_VERB =
  /\b(knows?|plays?|played|said|says|thinks?|resigned?|blundered?|is rated|was rated|prefers?|likes?|recommends?|teaches?)\b/;

/** A capitalised non-chess word acting like a person → the name, else null. */
export function namedPerson(clause) {
  for (const m of clause.matchAll(/\b([A-Z][a-z]{2,})\b/g)) {
    if (CHESS_PROPER_NOUN.test(m[1])) continue;
    const after = clause.slice(m.index + m[1].length, m.index + m[1].length + 22);
    if (PERSON_VERB.test(after) || /^'s\b/.test(after)) return m[1];
  }
  return null;
}

/** Open-reference classes: the clause points at something the student was
 *  never given — the video session, an opponent, the presenter, prior videos,
 *  or the viewers being addressed. */
export const OPEN_REFERENCE = {
  rating:
    /\b(a|against a|rated) ?\d{4}\b|\b\d{4}-rated\b|\b(eighteen|seventeen|nineteen|sixteen)-\w+\b|\b\w+-something\b/i,
  session:
    /\bthis game\b|\bthe run\b|\b(one|another) more game\b|\banother game\b|\bmust-win\b|\bresigns?\b|\bgood game\b|\bso far\b|\bthus far\b|\bto date\b|\bhome stretch\b|\bback in the ring\b|\blet.s look at the game\b|\bonly our (second|third|fourth|fifth)\b|\b(tournament|the match|round \d|a strong junior)\b/i,
  author:
    /\bmusic to my ears\b|\bjuicy\b|\bI.m in the mood\b|\bI.ll (show|play|pick)\b|\blet.s (see how|hope)\b|\bkudos\b|\btoday.s\b|\bthe comedy\b/i,
  priorVid:
    /\bwe.ve (recommended|seen|been|covered)\b|\bas (I|we) (said|mentioned|covered)\b|\bin this video\b|\bmy main opening\b|\bour (patented|favorite|real opening)\b/i,
  audience:
    /\b(do you know|did you (see|find|spot)|I didn.t ask you|your (job|task|turn)|can you (see|find|spot)|I.d like to introduce|pause (here|the video)|take a (second|moment)|what.s the priority|I.ll (leave|let) you)\b/i,
};

/**
 * Classify one clause.
 *
 * @returns {{disposition:'keep'|'cut', class:string, name?:string}}
 *  - `keep`/`teaching`  — names a board referent and predicates chess
 *  - `keep`/`principle` — no square, but real chess (a general idea)
 *  - `cut`/<open-reference class or `namedPerson`>
 *  - `cut`/`fragment`   — no square, no piece, no chess idea
 */
export function classifyClause(clause) {
  if (teachesChess(clause)) return { disposition: 'keep', class: 'teaching' };

  const person = namedPerson(clause);
  if (person) return { disposition: 'cut', class: 'namedPerson', name: person };

  for (const [name, re] of Object.entries(OPEN_REFERENCE)) {
    if (re.test(clause)) return { disposition: 'cut', class: name };
  }

  if (BOARD_RE.test(clause)) return { disposition: 'keep', class: 'teaching' };
  if (PRED_RE.test(clause)) return { disposition: 'keep', class: 'principle' };
  return { disposition: 'cut', class: 'fragment' };
}

/** Split narration prose into spoken clauses (one utterance each). */
export function toClauses(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}
