// The coach IS the opponent, so it can say "I".
//
// David 2026-08-09: "Maybe it would help to have coach talk in first person as
// the opponent."
//
// It solves a problem that discarding could only mitigate. A corpus note is
// written from whichever side its opening is normally taught from, and the
// Sicilian is Black's defence — so a White student was handed Black's
// repertoire as coaching ("Black can play Bd7, keeping the extra pawn and a big
// advantage"). The first fix dropped those notes: 1,265 of the primary corpus,
// one in six, deleted from a White student's pool.
//
// But the coach was PLAYING Black. The note was never wrong; it was
// mis-attributed. Spoken by the player it was written for, the same sentence
// becomes "I can play Bd7, keeping the extra pawn and a big advantage" — the
// opponent thinking out loud, which is exactly what a strong player does when
// teaching a game. Nothing is dropped, and the student hears the plan being
// used against them, in time to meet it.
//
// G0: this is a deterministic rewrite of pronouns and verb agreement. No model
// decides anything — the note's content is untouched, only who is speaking it.
// It applies ONLY where the coach is genuinely the opponent in a live game;
// in a lesson the coach is a teacher, not a player, and must keep saying
// "Black".

/** Third-person singular → the form that follows "I" and "you".
 *
 *  English is kind here: both first and second person take the bare stem, so
 *  one de-inflection serves both. Irregulars are listed; everything else drops
 *  a trailing -s (plays → play), -es after a sibilant (pushes → push), or
 *  -ies → -y (tries → try). */
const IRREGULAR: Record<string, string> = {
  has: 'have',
  is: 'are',
  does: 'do',
  was: 'were',
  wants: 'want',
  goes: 'go',
};

function deinflect(verb: string, person: 'first' | 'second'): string {
  const lower = verb.toLowerCase();
  if (lower === 'is') return person === 'first' ? 'am' : 'are';
  if (lower === 'was') return person === 'first' ? 'was' : 'were';
  const irregular = IRREGULAR[lower];
  if (irregular) return irregular;
  if (/[^aeiou]ies$/.test(lower)) return `${lower.slice(0, -3)}y`;
  if (/(ch|sh|ss|x|z|o)es$/.test(lower)) return lower.slice(0, -2);
  if (/[^s]s$/.test(lower)) return lower.slice(0, -1);
  return lower;
}

/**
 * Colour words that are NOT a player.
 *
 * "the black squares", "his light-squared bishop", "black-square weaknesses" —
 * rewriting those to "my squares" would be nonsense, and the corpus is full of
 * them. A colour immediately followed by square-vocabulary is terrain, not a
 * person.
 */
const TERRAIN_AFTER = /^(?:[-\s]?squared?\b|\s+(?:squares?|diagonals?|complex\b))/i;

/** Is the colour word at `after` describing terrain rather than a player? */
function isTerrain(rest: string): boolean {
  return TERRAIN_AFTER.test(rest);
}

/** A colour in front of one of these is describing a piece, not a player. */
const CHESS_NOUNS = new Set([
  'pawn', 'pawns', 'king', 'kings', 'queen', 'queens', 'rook', 'rooks',
  'bishop', 'bishops', 'knight', 'knights', 'piece', 'pieces', 'majority',
  'structure', 'pawnstructure', 'army', 'forces', 'squares', 'square',
]);

/** Modals keep their shape across persons — only the subject changes. */
const MODALS = new Set([
  'must', 'can', 'could', 'should', 'shall', 'will', 'would', 'may', 'might',
]);

/** Which side this text gives its advice to — the same rule
 *  `noteAdvisesSide` uses, applied to a bare string. */
function noteSideFromText(text: string): 'white' | 'black' | null {
  let white = false;
  let black = false;
  for (const m of text.matchAll(/\b(white|black)\s+(?:should|must|needs? to|wants? to|has to|ought to|will want to)\b/gi)) {
    if (m[1].toLowerCase() === 'white') white = true;
    else black = true;
  }
  if (white === black) return null; // neither, or both — no single reader
  return white ? 'white' : 'black';
}

export interface OpponentVoiceOptions {
  /** The side the COACH is playing — becomes "I". */
  coachSide: 'white' | 'black';
}

/**
 * Rewrite a note so the coach speaks it as the player it describes.
 *
 * The coach's own colour becomes first person; the student's becomes second.
 * Verb agreement follows. Possessives become "my" / "your". Colour words used
 * as terrain are left alone.
 *
 * Returns the text unchanged when it names no player, which is most of the
 * corpus.
 */
export function speakAsOpponent(text: string, opts: OpponentVoiceOptions): string {
  if (!text.trim()) return text;

  // ── A NOTE MAY ALREADY BE TALKING TO SOMEONE ──────────────────────────────
  // Some notes address the side they were written for in the second person:
  // "Instead of Qa5, play e5. If White saves the pawn, YOU gain a huge
  // development advantage" — that "you" is Black, the note's reader. Map the
  // colours first and both players end up called "you" in one sentence. So the
  // existing second person is resolved FIRST, and only when the note belongs
  // to the coach's side, because that is the only case where its reader is the
  // one now speaking.
  const advises = noteSideFromText(text);
  let out = text;
  if (advises === opts.coachSide) {
    out = out
      .replace(/\byour\b/gi, 'my')
      .replace(/\byours\b/gi, 'mine')
      .replace(/\byourself\b/gi, 'myself')
      .replace(/\byou\b/gi, 'I');
  }

  // Possessives first — "Black's pawns" must not be seen as "Black" + "'s".
  out = out.replace(/\b(White|Black)'s\b/gi, (match, colour: string, offset: number, whole: string) => {
    if (isTerrain(whole.slice(offset + match.length))) return match;
    return colour.toLowerCase() === opts.coachSide ? 'my' : 'your';
  });

  // Then the subject + what follows it, so agreement is fixed in one pass.
  out = out.replace(
    /\b(White|Black)\b(\s+)([a-z]+)/g,
    (match, colour: string, gap: string, word: string, offset: number, whole: string) => {
      if (isTerrain(whole.slice(offset + colour.length))) return match;
      const lower = word.toLowerCase();
      // A colour in front of a piece or a structure is an ADJECTIVE — "Black
      // pawns on dark squares" is not Black doing something, and "I pawn" is
      // not English. Checked before the verb rules because several of these
      // nouns end in -s and would otherwise be de-inflected.
      if (CHESS_NOUNS.has(lower)) return match;
      const mine = colour.toLowerCase() === opts.coachSide;
      const subject = mine ? 'I' : 'you';
      // A modal keeps its shape: "White must play" → "you must play".
      if (MODALS.has(lower)) return `${subject}${gap}${lower}`;
      const conjugated = deinflect(word, mine ? 'first' : 'second');
      // Anything that is not a third-person verb is left alone rather than
      // guessed at — the conservative direction, since a missed rewrite reads
      // as the old behaviour and a wrong one reads as gibberish.
      if (conjugated === lower && !IRREGULAR[lower]) return match;
      return `${subject}${gap}${conjugated}`;
    },
  );

  // A bare colour left over (object position: "…hands Black the initiative").
  // It has to repeat BOTH guards: the subject pass leaves an adjective in
  // place, and without the same noun check here that survivor gets swept up on
  // the way past — "Black pawns" came out as "Me pawns".
  out = out.replace(/\b(White|Black)\b/g, (match, colour: string, offset: number, whole: string) => {
    const rest = whole.slice(offset + match.length);
    if (isTerrain(rest)) return match;
    const next = /^\s+([a-z]+)/.exec(rest)?.[1]?.toLowerCase();
    if (next && CHESS_NOUNS.has(next)) return match;
    if (colour.toLowerCase() === opts.coachSide) return 'me';
    return 'you';
  });

  // Sentence-initial capitalisation survives the swap.
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead: string, ch: string) => `${lead}${ch.toUpperCase()}`);
  // "I" is always capital, wherever it landed.
  out = out.replace(/\bi\b/g, 'I');
  return out;
}

/**
 * The opponent's plan, framed so it can never be mistaken for advice.
 *
 * David 2026-08-09: "I still want to know what my opponent's plans are. That is
 * very important in chess… But clear distinction is necessary."
 *
 * Both halves of that matter. Hearing the opponent's intentions is the point —
 * a strong player tells you what they are trying to do to you — but a bare
 * first-person sentence ("I should play a6 early to challenge the bishop")
 * reads as an instruction if nothing marks who is speaking. The lead-in is
 * what makes the pronoun safe, so the rewrite is never shipped without it.
 *
 * Varied so a long game does not chant one phrase; picked by ply so a given
 * move always announces itself the same way (no re-roll on a repaint, and no
 * `Math.random` — the audit harness bans it and a stable string keeps the TTS
 * clip cache warm, which is real money).
 */
const OPPONENT_LEAD_INS = [
  "Here's my plan:",
  "What I'm going for:",
  "My idea here:",
  "From my side:",
] as const;

export function framedOpponentPlan(text: string, opts: OpponentVoiceOptions & { ply?: number }): string {
  const said = speakAsOpponent(text, opts).trim();
  if (!said) return '';
  const lead = OPPONENT_LEAD_INS[(opts.ply ?? 0) % OPPONENT_LEAD_INS.length];
  return `${lead} ${said}`;
}
