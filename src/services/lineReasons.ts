/**
 * A CALCULATION LINE WITH ITS REASONS (David 2026-09-27, the corpus
 * comparison: "Play Nd2 now and the queen comes to d7, forcing g4" — every
 * forced step carries why). The coach used to read the engine's line bare:
 * "after O-O, Bd6, Nf4, Qh6, Re1+ arrives". This marks the steps that FORCE
 * something — a move of theirs that newly attacks one of your pieces worth a
 * minor or more — and leaves quiet steps bare, so the line stays short enough
 * to follow by ear. Board-true: every reason is read off the replayed board.
 */
import { Chess, type Color } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';

const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/**
 * `fen` is the board the line starts from; `sans` alternate from the side to
 * move there. `victim` is the student's colour — the side whose pieces the
 * line hunts. Returns the moves joined with ", ", reasons attached.
 */
export function lineWithReasons(fen: string, sans: readonly string[], victim: Color): string {
  let c: Chess;
  try { c = new Chess(fen); } catch { return sans.join(', '); }
  const out: string[] = [];
  for (const san of sans) {
    let m;
    try { m = c.move(san); } catch { out.push(san); break; }
    if (m.color === victim) { out.push(m.san); continue; }
    const hits = c.board().flat()
      .filter((p): p is NonNullable<typeof p> => !!p && p.color === victim && p.type !== 'k' && p.type !== 'p')
      .filter((p) => c.attackers(p.square, m.color).includes(m.to))
      .sort((a, b) => (MATERIAL_VALUE[b.type] ?? 0) - (MATERIAL_VALUE[a.type] ?? 0));
    out.push(hits.length ? `${m.san} hitting your ${NAME[hits[0].type]}` : m.san);
  }
  return out.join(', ');
}
