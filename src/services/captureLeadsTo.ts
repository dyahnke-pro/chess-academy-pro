// WHAT A CAPTURE LEADS TO, read off the board (WO-STORY-MATRIX-01 Phase 1
// step 4). A capture's SAN already says the capture ("Qxd8" is spoken "queen
// takes d 8"), so a line that names the move says next only what the capture
// LEADS to — the material it nets, a trade, or a piece given — in the words of
// `captureWords.afterCaptureSan`. This is the one board read behind it for a
// capture with no capture run before it: whether anything can take back, and
// what taking back nets (the pin-aware SEE through the safety door).
import { Chess, type Move } from 'chess.js';
import { captureRead, legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import type { CaptureLeadsTo } from '../utils/captureWords';

/** What the capture `san` leads to on `fenBefore`; null when it is not a
 *  capture or not legal there. */
export function captureLeadsTo(fenBefore: string, san: string): CaptureLeadsTo | null {
  let c: Chess;
  let m: Move;
  try {
    c = new Chess(fenBefore);
    m = c.move(san);
  } catch {
    return null;
  }
  if (!m.captured) return null;
  const them = m.color === 'w' ? 'b' : 'w';
  // "Nothing can take back" is a fact about this board: no legal capture on
  // the square, whatever the reason (a check counts — it is this move's).
  const canTakeBack = c.moves({ verbose: true }).some((x) => x.to === m.to && !!x.captured);
  if (!canTakeBack) return { kind: 'nets', captured: m.captured, free: true, gave: null };
  const back = captureRead(c.fen(), m.to, them) ?? legalSeeGainFor(c.fen(), m.to, them);
  const net = (MATERIAL_VALUE[m.captured] ?? 0) - back;
  // A take-back that wins the capturer back is the exchange ("Nxa8 wins a
  // rook for a knight" — never "wins a rook"). A longer swap that also wins
  // something back for the capturer is left as the count of what it took.
  const capturer = MATERIAL_VALUE[m.piece] ?? 0;
  if (net >= 1) return { kind: 'nets', captured: m.captured, free: false, gave: m.piece !== 'k' && back > 0 && back >= capturer ? m.piece : null };
  if (net > -1) return { kind: 'trade', piece: m.piece, captured: m.captured };
  return { kind: 'gives-up', piece: m.piece, captured: m.captured };
}
