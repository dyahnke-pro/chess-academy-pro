/**
 * What opening a "play X" request names (answers rebuild, 2026-10-08).
 *
 * A game must never start on a name nobody said: the Learn page used to take
 * whatever followed "play" as the opening, so "Let's do it" and "Can you
 * Carl O'Connor" became games. The words are resolved against the opening DB
 * (voice slips mapped first); a near-miss returns its candidates to choose
 * from; anything else names no opening.
 */
import { resolveOpeningEntry } from '../../services/openingDetectionService';
import { fuzzyMatchOpening } from '../../services/openingFuzzyMatcher';
import { fastPathLane } from '../chatTurn';
import { smallTalkKind } from '../smallTalk';

/** An opening match below this is a guess, and a guess must not start a game. */
const OPENING_NAME_FLOOR = 0.85;

/** Speech-to-text misses that change the meaning of a chess ask. */
const VOICE_FIXES: ReadonlyArray<[RegExp, string]> = [
  [/\bnights?\b/gi, 'knight'],
  [/\bponds?\b/gi, 'pawn'],
  [/\bblender\b/gi, 'blunder'],
  [/\bcaro?\s*k?h?an+\b/gi, 'Caro-Kann'],
  [/\bcato\s*khan\b/gi, 'Caro-Kann'],
  [/\bcarro\s*khan\b/gi, 'Caro-Kann'],
];

export function normaliseAsk(text: string): string {
  let t = text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
  for (const [re, to] of VOICE_FIXES) t = t.replace(re, to);
  return t;
}

/** "Play the Sicilian", "can you play the Caro-Kann?" — an imperative to play
 *  an OPENING. Not a move ("play e4", "can you play f4 instead?") and not a
 *  pronoun ("play it", "play through the Vienna" is a watch ask). */
export const PLAY_OPENING_RE =
  /^\s*(?:(?:can|could|would|will)\s+you\s+|please\s+)?play\s+(?:the\s+)?(?!(?:it|this|that|a|an|some|on|out|through|again|now|e\d|[a-h][1-8]|[KQRBN][a-h1-8]|O-O)\b)(?=[A-Za-z])/i;

/** Below this a fuzzy match shares letters, not a name (measured 2026-10-08:
 *  junk words 0.55–0.60, real typos 0.67+). */
const NEAR_MISS_FLOOR = 0.65;

export type PlayName =
  | { kind: 'resolved'; name: string }
  | { kind: 'candidates'; names: string[] }
  | { kind: 'none' };

export function resolvePlayName(raw: string): PlayName {
  const words = raw.replace(/[?.!]+$/, '').replace(/\s+now$/i, '').replace(/^the\s+/i, '').trim();
  if (!words) return { kind: 'none' };
  for (const candidate of [words, normaliseAsk(words)]) {
    const hit = resolveOpeningEntry(candidate);
    if (hit) return { kind: 'resolved', name: hit.canonicalName };
  }
  const fuzzy = fuzzyMatchOpening(normaliseAsk(words)).candidates;
  if (fuzzy[0] && fuzzy[0].score >= OPENING_NAME_FLOOR) return { kind: 'resolved', name: fuzzy[0].canonicalName };
  const near = fuzzy.filter((c) => c.score >= NEAR_MISS_FLOOR).slice(0, 4).map((c) => c.canonicalName);
  return near.length > 0 ? { kind: 'candidates', names: near } : { kind: 'none' };
}

const QUESTION_LEAD_RE = /^\s*(?:(?:so|and|but|ok(?:ay)?|well)[,\s]+)?(?:what|how|why|which|when|where|who|is|are|do|does|did|can|could|should|would|was|were|will|am)\b/i;

/** An imperative to study or play something: a request, never a question. */
const REQUEST_RE =
  /^\s*(?:(?:can|could|would|will) you\s+|please\s+|let'?s\s+|i want (?:you )?to\s+|i'?d like to\s+)?(?:play|teach(?: me)?|show me|walk ?through|drill|review|quiz me on)\b/i;

/**
 * Is this turn a QUESTION rather than a request to study or play an opening?
 * The Learn page asks before it treats short text as an opening name. It reads
 * with the door's own lane computer (`fastPathLane`, the same detectors the
 * coach answers with), so Learn and every other screen share one vocabulary.
 */
export function readsAsQuestion(text: string, hasBoard: boolean): boolean {
  const t = normaliseAsk(text);
  // A pasted lesson title ("Bishop's Opening: … greed — Qxf7 is mate") names
  // the opening before its colon: a request, whatever moves follow.
  const titled = /^\s*([A-Z][^:?]{2,60}):/.exec(t);
  if (titled && resolvePlayName(titled[1]).kind === 'resolved') return false;
  const asks = QUESTION_LEAD_RE.test(t) || /\?\s*$/.test(t);
  if (REQUEST_RE.test(t) && !/^\s*(?:what|how|why|which)\b/i.test(t)) {
    // "Can you play f4 instead?" asks about a move; "can you play the Sicilian" asks for a game.
    return asks && resolvePlayName(t.replace(REQUEST_RE, '')).kind === 'none';
  }
  if (asks) return true;
  // Small talk names no opening, whatever letters it shares with one.
  if (smallTalkKind(t) !== 'unclear') return true;
  if (resolvePlayName(t).kind !== 'none') return false;
  return fastPathLane(t, hasBoard ? { fen: START_FEN } : {}) !== 'none';
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
