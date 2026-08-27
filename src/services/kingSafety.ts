// kingSafety — a board-true single-position king-exposure read (§9 "king-safety"
// signal, David 2026-08-26). Fires ONLY when a castled king has a materially
// broken pawn shelter AND the opponent actually has pieces aimed at that zone —
// both conditions, so a harmlessly-nicked shield (an advanced h-pawn with no
// attacker behind it) stays silent. Pure chess.js geometry, no engine (G0), no
// overstating: every claim (which pawns are gone, which enemy pieces bear on the
// king) is read straight off the board.
import { Chess } from 'chess.js';

type Sq = string;
const FILES = 'abcdefgh';

export interface KingExposure {
  kingSquare: Sq;
  /** How many of the three shelter pawns in front of the king are gone. */
  missingShield: number;
  /** Enemy heavy/bishop pieces that attack a square in the king zone. */
  attackerSquares: Sq[];
}

function kingSquareOf(game: Chess, color: 'w' | 'b'): Sq | null {
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

/** The three shelter squares one rank in front of a castled king (king file ±1),
 *  or null when the king isn't on a castled square (so this never fires on a
 *  centralized / uncastled king). */
function shelterSquares(kingSq: Sq, color: 'w' | 'b'): Sq[] | null {
  const f = FILES.indexOf(kingSq[0]);
  const rank = Number.parseInt(kingSq[1], 10);
  const homeRank = color === 'w' ? 1 : 8;
  if (rank !== homeRank) return null;            // not on the back rank → not castled-safe
  const isKingside = f >= 5;                      // f/g/h
  const isQueenside = f <= 2;                     // a/b/c
  if (!isKingside && !isQueenside) return null;   // still in the centre
  const shelterRank = color === 'w' ? 2 : 7;
  const out: Sq[] = [];
  for (const df of [-1, 0, 1]) {
    const nf = f + df;
    if (nf < 0 || nf > 7) continue;
    out.push(`${FILES[nf]}${shelterRank}`);
  }
  return out;
}

/**
 * A king-exposure read, or null when the king is safe enough to say nothing.
 * Requires BOTH a broken shelter (≥2 of 3 shield pawns gone) AND ≥1 enemy
 * bishop/rook/queen bearing on the king zone.
 */
export function detectKingExposure(fen: string, studentColor: 'w' | 'b'): KingExposure | null {
  let game: Chess;
  try { game = new Chess(fen); } catch { return null; }
  const kingSq = kingSquareOf(game, studentColor);
  if (!kingSq) return null;
  const shelter = shelterSquares(kingSq, studentColor);
  if (!shelter) return null;

  let missing = 0;
  for (const s of shelter) {
    const p = game.get(s as Parameters<Chess['get']>[0]);
    if (!(p && p.type === 'p' && p.color === studentColor)) missing += 1;
  }
  if (missing < 2) return null; // shelter still largely intact — no alarm

  const enemy: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  const zone = [kingSq, ...shelter];
  const attackers = new Set<Sq>();
  for (const sq of zone) {
    let from: Sq[] = [];
    try { from = game.attackers(sq as Parameters<Chess['attackers']>[0], enemy); } catch { from = []; }
    for (const a of from) {
      const p = game.get(a as Parameters<Chess['get']>[0]);
      if (p && (p.type === 'q' || p.type === 'r' || p.type === 'b')) attackers.add(a);
    }
  }
  if (attackers.size === 0) return null; // broken but unpressured — stay quiet

  return { kingSquare: kingSq, missingShield: missing, attackerSquares: [...attackers] };
}

export interface CentralKingDanger {
  kingSquare: Sq;
  /** The enemy heavy piece aimed down the king's file. */
  aimedFrom: Sq;
  /** The central pawn contact that, once it opens, unmasks the file. */
  tensionSquare: Sq;
}

/** Is there a friendly pawn on files c–f in the centre that is in direct
 *  capturing contact with an enemy pawn (either side can crack it open)? */
function centralTensionSquare(game: Chess, studentColor: 'w' | 'b'): Sq | null {
  const dir = studentColor === 'w' ? 1 : -1;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== 'p' || cell.color !== studentColor) continue;
      const f = FILES.indexOf(cell.square[0]);
      const r = Number.parseInt(cell.square[1], 10) - 1;
      if (f < 2 || f > 5) continue; // c–f only (the centre)
      for (const df of [-1, 1]) {
        const nf = f + df; const nr = r + dir;
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
        const t = `${FILES[nf]}${nr + 1}`;
        const p = game.get(t as Parameters<Chess['get']>[0]);
        if (p && p.type === 'p' && p.color !== studentColor) return cell.square; // mutual pawn contact
      }
    }
  }
  return null;
}

/**
 * The delayed-castling danger (David 2026-08-27): the student's king is still
 * in the CENTRE (d/e/f file, home rank — not castled to g/c), the centre can be
 * cracked open (a live central pawn tension), AND the opponent already has a
 * rook or queen aimed down the king's own file. Opening the centre would unmask
 * that piece onto the king — the "castle NOW" moment. Both the tension and the
 * aligned enemy heavy are required, so it never fires on a safely-locked centre
 * or a calm position where the king will just castle next move.
 */
export function detectCentralKingDanger(fen: string, studentColor: 'w' | 'b'): CentralKingDanger | null {
  let game: Chess;
  try { game = new Chess(fen); } catch { return null; }
  const kingSq = kingSquareOf(game, studentColor);
  if (!kingSq) return null;
  const kf = FILES.indexOf(kingSq[0]);
  const homeRank = studentColor === 'w' ? 1 : 8;
  if (Number.parseInt(kingSq[1], 10) !== homeRank) return null; // marched-up king is another story
  if (kf < 3 || kf > 5) return null; // must be central: d/e/f (excludes castled g / c)

  const tension = centralTensionSquare(game, studentColor);
  if (!tension) return null; // centre is locked / no contact → no imminent opening

  // An enemy rook/queen on the king's OWN file (any rank) — the piece a crack
  // would unmask. This is the tight, board-true gate that filters calm lines.
  const enemy: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  let aimedFrom: Sq | null = null;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy) continue;
      if ((cell.type === 'r' || cell.type === 'q') && FILES.indexOf(cell.square[0]) === kf) { aimedFrom = cell.square; break; }
    }
    if (aimedFrom) break;
  }
  if (!aimedFrom) return null;

  return { kingSquare: kingSq, aimedFrom, tensionSquare: tension };
}

export function centralKingDangerClause(d: CentralKingDanger): string {
  return `Your king is still in the centre and the position is about to crack open — they already have a piece aimed down the ${d.kingSquare[0]}-file. Get castled before the centre opens.`;
}

/** The spoken clause for a king exposure, board-true. */
export function kingExposureClause(k: KingExposure): string {
  const n = k.missingShield === 3 ? 'all three' : `${k.missingShield}`;
  return `Your king's cover is thin — ${n} of the pawns in front of it are gone and they already have pieces aimed at it. Look after the king before you throw more forces forward.`;
}
