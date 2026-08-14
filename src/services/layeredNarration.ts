/**
 * layeredNarration — the three teaching sources, stacked in one voice, per ply.
 *
 * David 2026-08-14: "i want all 3 working on each move… note, corpus, computed
 * is the order i wanted", and "all three can fire in one ply as long as they add
 * benefit, do not double speak the same thing".
 *
 * ── THE ORDER, AND WHY IT IS THIS ONE ───────────────────────────────────────
 *
 *   1. NOTE      the hand-authored beat for this position
 *   2. CORPUS    the farmed note for this position
 *   3. COMPUTED  what code derived from the board
 *
 * Measured over the 1,310-ply repertoire walk, a beat can speak at 408 plies
 * (31.1%) against the corpus's 215 (16.4%), and both speak at only 117 (8.9%) —
 * so the order changes what a student hears on fewer than one ply in ten. On
 * those, the beat leads because it is the better line and the examples are not
 * close: at the Ruy's third move the beat teaches "White does not attack the
 * pawn, White attacks its defender — that is the soul of the Spanish", while the
 * corpus offers a sentence about a fianchetto that is not on the board. A beat
 * is verified BEFORE it ships (narrationAccuracy, lessonIntegrity, both
 * registers, a cited source); a farmed note is only board-gated at retrieval.
 *
 * The corpus still leads COMPUTED, which was the point of the ordering: on the
 * 98 plies where the corpus is the only human voice, it must not be buried
 * under a derived sentence.
 *
 * ── WHAT MAKES STACKING SAFE ────────────────────────────────────────────────
 *
 * Three sources on one move is only teaching if each says something new. Two
 * sources at a shared position very often explain the SAME idea in different
 * words, and hearing it twice is worse than hearing it once. So every layer
 * after the first must clear `addsSomething` — a deterministic content overlap
 * check, no model involved (G0).
 *
 * ── VERBOSITY ───────────────────────────────────────────────────────────────
 *
 * `brief` is a hard contract: 2 sentences, 30 words (G5, enforced downstream by
 * applyBriefVoiceCap regardless). Three layers cannot fit, and clipping a
 * stacked line mid-thought is worse than picking one. So brief takes COMPUTED
 * ALONE — the tightest register, facts without prose — and full takes the
 * stack. `silent` returns nothing; the voice layer short-circuits anyway.
 */

export type NarrationLayer = 'note' | 'corpus' | 'computed';

export interface NarrationPiece {
  layer: NarrationLayer;
  text: string;
}

export interface LayeredNarration {
  /** Ordered, deduped, ready to speak as one line. */
  text: string;
  /** What survived, in order — for audits and for the caller's own logging. */
  pieces: NarrationPiece[];
  /** Layers that had content but were dropped as redundant. */
  dropped: NarrationLayer[];
}

/** Content words only — the shared vocabulary two sentences would use if they
 *  were making the same point. Stop-words carry no topic and would make every
 *  pair of English sentences look similar. */
const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'it', 'its',
  'this', 'that', 'these', 'those', 'has', 'have', 'had', 'will', 'would', 'can',
  'could', 'should', 'not', 'no', 'so', 'if', 'then', 'than', 'you', 'your',
  'white', 'black', 'move', 'moves', 'plays', 'play', 'position', 'game',
]);

/**
 * Crude suffix stripping, deliberately not a real stemmer.
 *
 * The two ways chess prose says the same thing differently are morphology and
 * hyphenation: "defends" against "defending", "the c6-knight" against "the
 * knight on c6". Both slipped a plain word-split, so a restatement scored as
 * new and the student heard the point twice — the exact thing stacking must not
 * do. Order matters below: 'ing' and 'ed' are tried before the bare 's' so
 * "defending" does not fall through to "defending" minus nothing.
 */
function stem(w: string): string {
  for (const suf of ['ing', 'ed', 'es', 's']) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}

function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      // Hyphens SPLIT rather than join: "c6-knight" has to reach the same two
      // tokens as "knight on c6" or the two phrasings never compare equal.
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map(stem),
  );
}

/**
 * True when `candidate` says something the text so far has not.
 *
 * Overlap is measured against the CANDIDATE's own vocabulary, not the union:
 * a long first layer would otherwise swamp the ratio and let a short repeat
 * through. A candidate whose content words are mostly already spoken is the
 * same point rephrased.
 */
export function addsSomething(candidate: string, alreadySaid: string, threshold = 0.6): boolean {
  const cand = contentWords(candidate);
  if (cand.size === 0) return false;
  const said = contentWords(alreadySaid);
  if (said.size === 0) return true;
  let shared = 0;
  for (const w of cand) if (said.has(w)) shared += 1;
  return shared / cand.size < threshold;
}

/** The pieces a caller has already computed for this ply. Any may be absent —
 *  that is the normal case, since all three cover only 8.9% of plies. */
export interface NarrationInputs {
  note?: string | null;
  corpus?: string | null;
  computed?: string | null;
}

export function buildLayeredNarration(
  inputs: NarrationInputs,
  verbosity: 'silent' | 'brief' | 'full',
): LayeredNarration {
  const empty: LayeredNarration = { text: '', pieces: [], dropped: [] };
  if (verbosity === 'silent') return empty;

  // BRIEF TAKES COMPUTED ALONE (David 2026-08-14: "verbosity if on low can just
  // be computed narrations"). It is the only register that fits 30 words
  // without being clipped mid-thought.
  if (verbosity === 'brief') {
    const c = (inputs.computed ?? '').trim();
    return c ? { text: c, pieces: [{ layer: 'computed', text: c }], dropped: [] } : empty;
  }

  const ordered: Array<[NarrationLayer, string]> = [
    ['note', (inputs.note ?? '').trim()],
    ['corpus', (inputs.corpus ?? '').trim()],
    ['computed', (inputs.computed ?? '').trim()],
  ];

  const pieces: NarrationPiece[] = [];
  const dropped: NarrationLayer[] = [];
  let said = '';
  for (const [layer, text] of ordered) {
    if (!text) continue;
    if (pieces.length > 0 && !addsSomething(text, said)) {
      dropped.push(layer);
      continue;
    }
    pieces.push({ layer, text });
    said = said ? `${said} ${text}` : text;
  }

  return { text: said, pieces, dropped };
}
