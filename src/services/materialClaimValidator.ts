/**
 * materialClaimValidator — drops narration sentences whose MATERIAL-DIRECTION
 * claims contradict the board's actual piece count.
 *
 * 🔒 WHY (David 2026-08-13, heard live in a Benko Declined lesson): the
 * board/eval gates verify piece-on-square and eval-direction claims, but a
 * sentence like "Once White takes the offered Benko pawn, he's DOWN material"
 * (backwards — the capturer is UP) or "a permanent material advantage that
 * Black has to live with" (spoken about BLACK's own extra pawn) sails through
 * every gate: it names no square and cites no eval. Material accounting is
 * pure code (sum the pieces), so the accounting direction is checkable —
 * and per G0 a checkable claim never ships unchecked.
 *
 * DESIGN — same discipline as boardClaimValidator: only flag PROVABLY-false
 * claims, stay silent on anything ambiguous.
 *   - Sentences with future/hypothetical markers are EXEMPT (same rule as the
 *     board stripper): "once White takes…" describes a board that isn't this
 *     one. Prevention for those lives in the generator's material ledger.
 *   - A pronoun subject ("he's down a pawn") is resolved to the nearest
 *     preceding White/Black mention in the SAME sentence; unresolvable
 *     pronouns are left alone.
 *   - Direction only, never magnitude — "up two pawns" when the count says
 *     one is a lesser sin than an inverted direction, and magnitude claims
 *     about compensation/structure get fuzzy fast.
 */
import { Chess } from 'chess.js';

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Mirrors boardClaimValidator's future/hypothetical exemption. */
const FUTURE_MARKER_RE = /\b(after|if|once|then|would|will|could|should|when|next|prepares?|preparing|plan(?:s|ning)?|threatens?|going to|about to)\b/i;

/** White-minus-black material balance in pawns, from the FEN placement. */
export function materialBalance(fen: string): number | null {
  try {
    const board = new Chess(fen).board();
    let bal = 0;
    for (const row of board) {
      for (const cell of row) {
        if (!cell) continue;
        bal += (cell.color === 'w' ? 1 : -1) * (PIECE_VALUE[cell.type] ?? 0);
      }
    }
    return bal;
  } catch {
    return null;
  }
}

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+/;

/** "material is level/even/equal/balanced" style claims. */
const LEVEL_RE = /\bmaterial\s+(?:is|stays|remains|is\s+back\s+to|comes?\s+back\s+to)\s+(?:dead[-\s])?(?:level|even|equal|balanced)\b|\bmaterial\s+equality\b/i;

/** "<side> … up/down/ahead/behind … pawn|material|piece|exchange". */
const DIRECTION_RE = /\b(white|black|he|she)\b(?:'s)?[^.!?]{0,50}?\b(up|down|ahead|behind)\b[^.!?]{0,40}?\b(?:material|pawns?|a\s+pawn|the\s+exchange|a\s+piece|in\s+material)/i;
const DIRECTION_RE_2 = /\b(white|black|he|she)\b(?:'s)?[^.!?]{0,50}?\b(?:ahead|behind)\s+in\s+material\b/i;

/** "<side>'s extra pawn" / "<side> has an extra pawn". */
const EXTRA_RE = /\b(white|black|he|she)\b(?:'s| has| keeps| gets| enjoys| holds)?\s+(?:an?\s+|the\s+)?extra\s+(pawn|piece)\b/i;

function resolveSide(token: string, sentence: string, matchIndex: number): 'w' | 'b' | null {
  const t = token.toLowerCase();
  if (t === 'white') return 'w';
  if (t === 'black') return 'b';
  // Pronoun: nearest preceding explicit color in the same sentence.
  const before = sentence.slice(0, matchIndex).toLowerCase();
  const lastWhite = before.lastIndexOf('white');
  const lastBlack = before.lastIndexOf('black');
  if (lastWhite === -1 && lastBlack === -1) return null;
  return lastWhite > lastBlack ? 'w' : 'b';
}

export interface MaterialStripResult {
  clean: string;
  dropped: string[];
}

export function stripDisprovenMaterialSentences(text: string, fen: string): MaterialStripResult {
  const bal = materialBalance(fen);
  if (bal === null || !text.trim()) return { clean: text, dropped: [] };

  const kept: string[] = [];
  const dropped: string[] = [];
  for (const sentence of text.split(SENTENCE_SPLIT_RE)) {
    if (FUTURE_MARKER_RE.test(sentence)) { kept.push(sentence); continue; }
    let bad = false;

    if (LEVEL_RE.test(sentence) && bal !== 0) bad = true;

    if (!bad) {
      const m = sentence.match(DIRECTION_RE) ?? sentence.match(DIRECTION_RE_2);
      if (m) {
        const side = resolveSide(m[1], sentence, m.index ?? 0);
        const dir = (m[2] ?? 'ahead').toLowerCase();
        if (side) {
          const sideBal = side === 'w' ? bal : -bal;
          if ((dir === 'up' || dir === 'ahead') && sideBal <= 0) bad = true;
          if ((dir === 'down' || dir === 'behind') && sideBal >= 0) bad = true;
        }
      }
    }

    if (!bad) {
      const m = sentence.match(EXTRA_RE);
      if (m) {
        const side = resolveSide(m[1], sentence, m.index ?? 0);
        if (side) {
          const sideBal = side === 'w' ? bal : -bal;
          if (sideBal <= 0) bad = true;
        }
      }
    }

    (bad ? dropped : kept).push(sentence);
  }
  return { clean: kept.join(' ').trim(), dropped };
}
