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

// Capitalised words that are never people. The bare possessive rule below used
// to accept any capitalised word before "'s", which classified "TODAY'S choice
// is the Accelerated Dragon" as a person reference and penalised the Accelerated
// Dragon's own thesis statement out of first place at ply 2 — the exact note this
// scoring exists to promote.
const NEVER_A_PERSON =
  /^(Today|Tomorrow|Yesterday|Tonight|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|June|July|August|September|October|November|December|Everyone|Everybody|Someone|Somebody|Nobody|Anyone)$/;

/** A capitalised non-chess word acting like a person → the name, else null.
 *
 *  Selection is by PERSON VERB only ("Kusha knows", "Magnus played"). A bare
 *  possessive is deliberately NOT a signal: it carried every false positive this
 *  detector produced and caught nothing the verb rule missed. */
export function namedPerson(clause) {
  for (const m of clause.matchAll(/\b([A-Z][a-z]{2,})\b/g)) {
    if (CHESS_PROPER_NOUN.test(m[1]) || NEVER_A_PERSON.test(m[1])) continue;
    const after = clause.slice(m.index + m[1].length, m.index + m[1].length + 22);
    if (PERSON_VERB.test(after)) return m[1];
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
    /\bmusic to my ears\b|\bjuicy\b|\bI.m in the mood\b|\bI.ll (show|play|pick)\b|\blet.s (see how|hope)\b|\bkudos\b|\btoday'?s (game|video|run|session|opponent|stream)\b|\bthe comedy\b/i,
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

// ─── SELECTION SCORING ───────────────────────────────────────────────────────
//
// WHY THE SAME MODULE. The sweep decides what to DELETE; selection decides what
// to SPEAK when several notes sit at one board. Run those off two copies of
// "what makes narration good" and they drift — the sweep keeps a clause the
// selector ranks last, or worse, the selector promotes exactly what the sweep
// was built to remove. One source, both callers.
//
// THE BUG THIS FIXES. `noteAtPosition` returned `bucket[0]` after a sort whose
// only key was "does this note's own opening reach this position". Every voiced
// note carries `opening: null`, so that key is INERT on this corpus: all 61
// candidates at `e4 c5` tie and file order decides. David walked the Accelerated
// Dragon and got "We're Black against a 2050 — this is going to be juicy" while
// this was sitting at the same position, unselected:
//
//   "The reply c5 against the king's-pawn — the Sicilian. Today's choice is the
//    Accelerated Dragon, a fast, clean setup and one of the friendliest gateways
//    into the whole Sicilian family: less theory, clearly defined ideas, quick
//    development."
//
// The corpus was never the problem at that ply. The ranking was.

/** A clause made of nothing but move tokens and punctuation — "e4, c5.",
 *  "Nf3 Nc6 d4". Names squares, teaches nothing: the student just watched it. */
const MOVE_LIST_ONLY_RE =
  /^(?:(?:[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8][+#]?|O-O(?:-O)?)[\s,.;—-]*)+$/;

/** Bare move restatement — "The knight to f3.", "We capture on d4." The student
 *  just watched the move; narration rule 3 says do not say it back to them. */
const BARE_MOVE_RE =
  /^(the |white |black |we |he |they |our |their )?[a-z' ]{0,14}(pawns?|knights?|bishops?|rooks?|queens?|kings?) (to|takes|captures?|goes to|comes to|steps to|drops to|settles on|develops? to|plays?) [a-h][1-8][.,]?$/i;

/**
 * Rank a candidate note for a ply. Higher speaks. Deterministic and pure — no
 * engine, no model, no board mutation; the caller has already proven the note
 * is ABOUT this position, so this only asks which of several true notes teaches
 * best.
 *
 * @param {string} text      the note's spoken prose
 * @param {string|null} openingName the lesson's own opening, when known
 */
export function scoreNarration(text, openingName) {
  const body = (text ?? '').trim();
  if (!body) return -100;
  const clauses = toClauses(body);
  let score = 0;

  for (const clause of clauses) {
    const { disposition, class: klass } = classifyClause(clause);
    if (disposition === 'cut') {
      // A chattery clause is a real cost: it is what the student hears INSTEAD
      // of teaching. `fragment` is connective tissue and cheap; an open
      // reference to a rating, a session or a person is the loud kind.
      score -= klass === 'fragment' ? 2 : 6;
    } else if (MOVE_LIST_ONLY_RE.test(clause)) {
      // Pure recitation. `classifyClause` keeps it (it does name the board, so
      // it is not chatter to DELETE), but it must never out-rank teaching.
      score -= 3;
    } else if (klass === 'teaching' && PRED_RE.test(clause)) {
      score += 3; // names the board AND says something about it
    } else if (klass === 'teaching') {
      score += 0; // names a square but explains nothing
    } else {
      score += 1; // a general principle — real, but not about this board
    }
  }

  // Saying the move back to the student is not teaching, however clean it reads.
  if (clauses.length === 1 && BARE_MOVE_RE.test(clauses[0])) score -= 4;

  // A note that NAMES the opening being taught is almost always the one written
  // to teach it, rather than a game that happened to pass through this position.
  if (openingName) {
    // Drop the generic scaffolding — "Sicilian DEFENSE: Accelerated Dragon"
    // requiring the word "Defense" is why the Dragon's own thesis statement
    // scored zero here: no teaching note ever spells the taxonomy out.
    const GENERIC = /^(defense|defence|variation|opening|game|attack|system|line|main)$/;
    const words = openingName
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3 && !GENERIC.test(w));
    const lower = body.toLowerCase();
    const hits = words.filter((w) => lower.includes(w)).length;
    if (words.length) score += Math.min(hits, 2) * 3;
  }

  // Mild preference for substance over a one-liner, capped so a rambling
  // transcript dump cannot outrank a tight beat. Length is a tiebreaker here,
  // never a driver — the clause scoring above already did the real work.
  score += Math.min(clauses.length, 3);

  return score;
}
