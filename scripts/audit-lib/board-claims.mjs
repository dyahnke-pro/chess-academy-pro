// board-claims — the shared per-move board-truth check for audit scripts.
//
// Lifted verbatim from audit-coach-play-listen.mjs (2026-08-05), which had the
// canonical copy; audit-coach-polyglot-loop.mjs and
// audit-coach-settings-qa-loop.mjs carried drift-prone paste copies. One
// implementation, three consumers — an improvement to the check now reaches
// every audit that speaks for board truth.
import { Chess } from 'chess.js';

const PIECE_WORD = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

/** A spoken line about a HYPOTHETICAL ("if I play Nf3…", "Nf3 from you") must
 *  be checked against the post-move board, not the current one — checking the
 *  current FEN produced false positives on every look-ahead line. Returns the
 *  FEN the claims should be verified against. */
export function resolveClaimFen(text, fen) {
  if (!fen) return fen;
  const m = /\bif i play\s+([A-Za-z][a-h1-8x+#=-]{1,6})|^([A-Za-z][a-h1-8x+#=-]{1,6})\s+from you/i.exec(String(text));
  const san = (m && (m[1] || m[2]) || '').trim().replace(/[.,!?]$/, '');
  if (!san) return fen;
  for (const f of [fen, fen.replace(/ (w|b) /, (s, c) => ` ${c === 'w' ? 'b' : 'w'} `)]) {
    try { const c = new Chess(f); if (c.move(san, { strict: false })) return c.fen(); } catch { /* try next */ }
  }
  return fen;
}

/** Conservative heard-hallucination check: flags only PROVABLY-false
 *  piece-on-square claims against `fen` (e.g. "the knight on f6" when f6 is
 *  empty or holds another piece). Subtler invented tactics stay with the
 *  transcript review. Returns human-readable violation strings, [] = clean. */
export function falseBoardClaims(text, fen) {
  if (!text || !fen) return [];
  let chess;
  try { chess = new Chess(fen); } catch { return []; }
  const lower = String(text).toLowerCase();
  const out = [];
  const patterns = [
    [/\b(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/g, 1, 2],
    [/\b([a-h][1-8])[-\s](pawn|knight|bishop|rook|queen|king)\b/g, 2, 1],
  ];
  for (const [re, pcIdx, sqIdx] of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(lower)) !== null) {
      const sq = m[sqIdx];
      const want = PIECE_WORD[m[pcIdx]];
      const got = chess.get(sq);
      if (!got || got.type !== want) {
        out.push(`"${m[0]}" — actual: ${got ? got.color + got.type : 'EMPTY'}`);
      }
    }
  }
  return out;
}
