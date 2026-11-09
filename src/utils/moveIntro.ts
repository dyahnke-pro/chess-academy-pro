/**
 * moveIntro — HOW A MOVE IS INTRODUCED, said like a person at the board
 * (David 2026-11-09: "mix up the phrasing whenever possible. Just make it
 * sound as human as possible").
 *
 * Review and the lessons introduced every move with one stem — "You play Nf3
 * — it develops…", "They play e5 — it…" — on every ply of a game. Now: "You
 * play X — it …", "You go X, which …", and for a pawn "Your e4 …". The facts
 * and the move named are the same here; only the words around them rotate,
 * keyed on the move and its seat (`rotateStem`, never a roll), so a reopened
 * review says it word for word, and Review and the lesson open one move alike.
 *
 * A castle is done, not played ("You play O-O" was read "you play castles
 * kingside").
 */
import { rotateStem, stemKeyOf } from './rotateStem';

export type IntroSeat = 'student' | 'opponent';

function castleWords(san: string): string | null {
  if (!san.startsWith('O-O')) return null;
  return san.startsWith('O-O-O') ? 'queenside' : 'kingside';
}

/** A PAWN move owned by its seat ("your e4 stakes a claim…"). Only a pawn: a
 *  piece move said "your knight goes to f3 and …" named one more square, and
 *  repeated the square-choice fact beside it ("Their bishop goes to c4 and …
 *  Their bishop went to c4. On d3 it blocks…"), so a piece move keeps its
 *  name in the other forms. "Your Nf3 develops…" is read "your knight to f3
 *  develops…" and is never said. Null for a capture, which is never the
 *  subject of its own verb. */
function ownedPawnMove(whose: string, san: string, predicate: string): string | null {
  const bare = san.replace(/^…/, '');
  return /^[a-h][1-8](=[QRBN])?\+?$/.test(bare) ? `${whose} ${bare} ${predicate}` : null;
}

/** One idea a sentence (CLAUDE.md § THE COACH TALKS LIKE A PERSON, rule 4):
 *  a rotated form never pushes its sentence past the voice counter's long-
 *  sentence bar (`scripts/voice/robotic-marks.mjs`, 32 words). The dash form
 *  is the shortest; when nothing else fits, it is said. */
const LONG_SENTENCE_WORDS = 32;
const wordsIn = (t: string): number => t.split(/\s+/).filter(Boolean).length;
function rotateFitting(variants: readonly string[], key: number): string {
  const fit = variants.filter((v) => wordsIn(v) <= LONG_SENTENCE_WORDS);
  return fit.length > 0 ? rotateStem(fit, key) : variants.reduce((a, b) => (wordsIn(b) < wordsIn(a) ? b : a));
}

/** The joiner the one stem has always used after the move: a dash, or a colon
 *  when the predicate carries its own dash, or a new sentence when it carries
 *  both (one sentence never holds two dashes). */
function joined(predicate: string): string {
  return !predicate.includes(' — ') ? ' — it' : predicate.includes(': ') ? '. It' : ': it';
}

/**
 * The move with what it does: `predicate` is verb-led, with no subject
 * ("develops the knight toward the centre", "wins a pawn"). No final stop.
 */
export function introWithPredicate(seat: IntroSeat, san: string, predicate: string): string {
  const side = castleWords(san);
  const who = seat === 'student' ? 'You' : 'They';
  if (side) {
    // "They castle kingside — it castles their king…" says it twice.
    const rest = predicate.replace(/^castles (their|your) king\b/, 'tucks $1 king');
    if (!/^castles\b/.test(rest)) return `${who} castle ${side}${joined(rest)} ${rest}`;
  }
  // "Your exd5 takes back…" is read "your e-pawn takes d5 takes back": a
  // capture is never the subject of its own verb (`captureSaidOnce`).
  const owned = side ? null : ownedPawnMove(seat === 'student' ? 'Your' : 'Their', san, predicate);
  return rotateFitting([
    `${who} play ${san}${joined(predicate)} ${predicate}`,
    ...(owned ? [owned] : []),
    // "You go e4, which prepares e5, which would kick…" stacks two which-clauses.
    ...(/\bwhich\b/.test(predicate) ? [] : [`${who} go ${san}, which ${predicate}`]),
  ], stemKeyOf(`${seat}|${san}`));
}

/** The move with a gerund list ("taking back the bishop, opening the c-file"). */
export function introWithGerund(seat: IntroSeat, san: string, gerund: string): string {
  const side = castleWords(san);
  const who = seat === 'student' ? 'You' : 'They';
  if (side) return `${who} castle ${side}, ${gerund}`;
  return rotateFitting([
    `${who} play ${san}, ${gerund}`,
    `${who} go ${san}, ${gerund}`,
  ], stemKeyOf(`${seat}|${san}`));
}
