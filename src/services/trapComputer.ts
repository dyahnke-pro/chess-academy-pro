// THE ONE TRAP COMPUTER (David 2026-11-25: "One trap computer and one trap
// wording across all surfaces"). Whether a slip is a TRAP, a KNOWN MISTAKE or
// nothing worth saying is decided here and nowhere else. Review, the Theory
// button, the Openings page, the live callout and Learn all ask this.
//
// A trap: the opponent's natural-looking move loses to a forced line that wins
// at least a piece or mates (the bar in `data/trap-bar.json`). A known mistake:
// an engine-verified slip worth at least half a pawn that does not clear it.
// A sacrifice is neither: "Nxf7, …Kxf7 wins" is the opponent giving a piece on
// purpose and the punisher taking it back — the opponent's move was a
// sacrifice, not a slip.
import { Chess } from 'chess.js';
import bar from '../data/trap-bar.json';
import { MATE_CP } from './mateScale';

export type SlipKind = 'trap' | 'known-mistake';

/** What the computer needs of a slip: the engine's read at the quiet end of the
 *  forced line (a mate is ±MATE_CP) and, when the board is at hand, the line. */
export interface SlipRead {
  /** The engine's eval for the punisher at the quiet end, or null unverified. */
  engineCp: number | null;
  /** The board before the slip, the slip, and the punisher's line — when known,
   *  the sacrifice filter reads them. */
  line?: { fen: string; slip: string; punish: readonly string[] };
}

export const TRAP_BAR_CP: number = bar.trapCp;
export const KNOWN_MISTAKE_FLOOR_CP: number = bar.knownCp;

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** The punisher's material gain at each ply of the line, in pawns (positive =
 *  the punisher is up). Null when the line does not play. */
function gainAlong(fen: string, sans: readonly string[]): number[] | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const slipper = c.turn();
  let gain = 0;
  const out: number[] = [];
  for (const san of sans) {
    let m;
    try { m = c.move(san); } catch { return null; }
    if (!m) return null;
    const take = m.captured ? VALUE[m.captured] ?? 0 : 0;
    gain += m.color === slipper ? -take : take;
    out.push(gain);
  }
  return out;
}

/** The slip is a SACRIFICE: it takes something, the punisher's first reply just
 *  takes the piece back on that square, and nothing later in the line wins more
 *  than the recapture itself — the punisher's whole "gain" is the exchange the
 *  slipper chose to offer. */
export function isSacrificeLine(fen: string, slip: string, punish: readonly string[]): boolean {
  let c: Chess;
  try { c = new Chess(fen); } catch { return false; }
  let s;
  try { s = c.move(slip); } catch { return false; }
  if (!s || !s.captured) return false;
  const gains = gainAlong(fen, [slip, ...punish]);
  if (!gains || gains.length < 2) return false;
  let r;
  try { r = c.move(punish[0]); } catch { return false; }
  if (!r || r.to !== s.to || !r.captured) return false;
  // The slipper's next move in the line takes nothing: a slip that goes on to
  // take (the Elephant's Nxd5?? Nxd5 Bxd8, reaching for the queen) is a
  // combination that fails, not a piece given on purpose.
  if (punish.length >= 2) {
    let n;
    try { n = c.move(punish[1]); } catch { return false; }
    if (n?.captured) return false;
  }
  const afterRecapture = gains[1];
  const end = gains[gains.length - 1];
  const isMate = /#$/.test(punish[punish.length - 1] ?? '');
  return !isMate && end - afterRecapture < 1;
}

/** THE decision. A mate or a read at the trap bar is a trap, a read at the
 *  known-mistake floor is a known mistake, anything else (or no engine read) is
 *  neither; a sacrifice line is never either. */
export function classifySlip(read: SlipRead): SlipKind | null {
  if (read.engineCp === null) return null;
  if (read.line && isSacrificeLine(read.line.fen, read.line.slip, read.line.punish)) return null;
  if (read.engineCp >= TRAP_BAR_CP || read.engineCp >= MATE_CP / 10) return 'trap';
  if (read.engineCp >= KNOWN_MISTAKE_FLOOR_CP) return 'known-mistake';
  return null;
}

