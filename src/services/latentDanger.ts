// latentDanger — a pin/skewer IN WAITING on your own king or queen (G0).
//
// The PREVENTION layer (David 2026-08-27, from his real chess.com loss: even
// endgame, he forced a trade to make a passed pawn but the trade quietly lined
// his own KING and BISHOP on a rook's file → pinned → lost the bishop). The plan
// was right; he was watching the passer, not his own back yard.
//
// NOT `detectTactics` (tactics that EXIST now) — this is the geometry of a tactic
// the opponent GETS if a line opens or a shield leaves: two of your pieces
// aligned, the valuable one (king/queen) BEHIND a less-valuable one, and an enemy
// line-piece (rook/bishop/queen) bearing on that line — possibly through one
// shield that a trade would remove. Pure chess.js geometry, no engine (G0). The
// coach speaks it prophylactically, guide-don't-tell: "your king and bishop share
// that file — mind it before you open the line."
//
// Doc: docs/plans/2026-08-26-coach-my-weakness-focus-lens.md §4.0c.

import { Chess } from 'chess.js';

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const FILES = 'abcdefgh';

export interface LatentDanger {
  /** The student piece that would be pinned/skewered (the shield in front). */
  frontSquare: string;
  frontPiece: string; // lowercase type
  /** The valuable piece behind it (king or queen). */
  backSquare: string;
  backPiece: string;
  /** The enemy line-piece bearing on the alignment. */
  enemySquare: string;
  enemyPiece: string; // r/b/q
  /** How the enemy sees it. */
  line: 'file' | 'rank' | 'diagonal';
  /** True when a single shield sits between the enemy and the front piece — the
   *  danger is LATENT (it opens if that shield trades/moves), not live yet. */
  latent: boolean;
}

interface Cell { sq: string; piece: string; color: 'w' | 'b'; }

/** Parse the FEN board into an 8×8 grid of cells (or null), rank 8 → 1. */
function grid(fen: string): (Cell | null)[][] {
  const rows = fen.split(' ')[0].split('/');
  const out: (Cell | null)[][] = [];
  for (let r = 0; r < 8; r++) {
    const row: (Cell | null)[] = [];
    let file = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { for (let k = 0; k < Number(ch); k++) { row.push(null); file++; } }
      else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        row.push({ sq: `${FILES[file]}${8 - r}`, piece: ch.toLowerCase(), color });
        file++;
      }
    }
    out.push(row);
  }
  return out;
}

const ROOK_DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
function dirsFor(piece: string): number[][] {
  if (piece === 'r') return ROOK_DIRS;
  if (piece === 'b') return BISHOP_DIRS;
  return [...ROOK_DIRS, ...BISHOP_DIRS]; // queen
}
function lineKind(dr: number, dc: number): LatentDanger['line'] {
  if (dr === 0) return 'rank';
  if (dc === 0) return 'file';
  return 'diagonal';
}

/**
 * Detect the most valuable latent pin/skewer against the student. Casts each
 * enemy rook/bishop/queen's rays; a ray that meets student piece P1 then student
 * piece P2 (consecutive, only empties between) with value(P2) > value(P1) and P2
 * a KING or QUEEN is a pin geometry. At most ONE shield may sit between the enemy
 * and P1, and it must be the STUDENT's own piece — 0 = the line is already open,
 * 1 = LATENT (opens if the student moves or trades that piece). Returns the
 * highest-value exposure, or null.
 */
export function detectLatentDanger(
  fen: string,
  studentColor: 'w' | 'b',
  /** Skip lines already open — a standing pin is a live tactic the tactic lanes
   *  name; the prevention clause only warns about the one in waiting. */
  opts: { latentOnly?: boolean } = {},
): LatentDanger | null {
  const g = grid(fen);
  const at = (r: number, c: number): Cell | null => (r >= 0 && r < 8 && c >= 0 && c < 8 ? g[r][c] : null);
  const enemy: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  let best: LatentDanger | null = null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = g[r][c];
      if (!cell || cell.color !== enemy || !'rbq'.includes(cell.piece)) continue;
      for (const [dr, dc] of dirsFor(cell.piece)) {
        // The first three pieces on the ray (only empties between them).
        const onRay: Cell[] = [];
        for (let rr = r + dr, cc = c + dc; rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && onRay.length < 3; rr += dr, cc += dc) {
          const cur = at(rr, cc);
          if (cur) onRay.push(cur);
        }
        // An ENEMY piece first is not the student's line to open (B#2) — that
        // is the opponent's discovery, a different concern.
        if (!onRay[0] || onRay[0].color !== studentColor) continue;
        const guards = (f: Cell | undefined, b: Cell | undefined): boolean =>
          !!f && !!b && f.color === studentColor && b.color === studentColor
          && (b.piece === 'k' || b.piece === 'q')
          && (VAL[b.piece] ?? 0) > (VAL[f.piece] ?? 0)
          // A PAWN PINNED DOWN ITS OWN FILE IS NOT FROZEN: every push keeps it
          // on the file (hand walk 2026-09-24).
          && !(f.piece === 'p' && dc === 0);
        // 0 shields = the line is open now; 1 = the student's OWN piece shields
        // it, and moving or trading that piece opens the line onto them.
        let front: Cell, back: Cell, shields: number;
        if (guards(onRay[0], onRay[1])) { front = onRay[0]; back = onRay[1]; shields = 0; }
        // A pawn shield on a FILE can only leave by capturing; it is not a line
        // the student opens by accident (and e4-Be2-Ke1 is every Italian).
        else if (guards(onRay[1], onRay[2]) && !(onRay[0].piece === 'p' && dc === 0)) {
          front = onRay[1]; back = onRay[2]; shields = 1;
        } else continue;
        if (opts.latentOnly && shields === 0) continue;
        const danger: LatentDanger = {
          frontSquare: front.sq, frontPiece: front.piece,
          backSquare: back.sq, backPiece: back.piece,
          enemySquare: cell.sq, enemyPiece: cell.piece,
          line: lineKind(dr, dc), latent: shields === 1,
        };
        // Rank by the piece at risk (front), then prefer a king behind.
        const score = (VAL[front.piece] ?? 0) + (back.piece === 'k' ? 0.5 : 0);
        const bestScore = best ? (VAL[best.frontPiece] ?? 0) + (best.backPiece === 'k' ? 0.5 : 0) : -1;
        if (score > bestScore) best = danger;
      }
    }
  }
  return best;
}

const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface TradeDanger extends LatentDanger {
  /** The student's capture that CREATES the danger (from → to). */
  tradeFrom: string;
  tradeTo: string;
}

/**
 * v2 (David's exact chess.com loss): a trade that CREATES a pin. Plays each of
 * the student's capturing moves and flags the one whose resulting position newly
 * lines up their king/queen for a pin that WASN'T there before. Pure chess.js
 * geometry, no engine. Returns the highest-value such trade, or null.
 *
 * v2a scope: the capture directly creates the alignment (1 ply). The
 * recapture-creates-it case (2 ply) is a later refinement.
 */
export function detectTradeCreatesPin(fen: string, studentColor: 'w' | 'b'): TradeDanger | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  if (chess.turn() !== studentColor) return null; // only on the student's move
  const before = detectLatentDanger(fen, studentColor);
  const beforeKey = before ? `${before.frontSquare}-${before.backSquare}-${before.enemySquare}` : '';

  let best: TradeDanger | null = null;
  let captures: ReturnType<Chess['moves']>;
  try { captures = chess.moves({ verbose: true }).filter((m) => (m as { captured?: string }).captured); }
  catch { return null; }

  for (const m of captures as Array<{ from: string; to: string }>) {
    let after: LatentDanger | null;
    try {
      const c = new Chess(fen);
      c.move({ from: m.from, to: m.to });
      after = detectLatentDanger(c.fen(), studentColor);
    } catch { continue; }
    if (!after) continue;
    const afterKey = `${after.frontSquare}-${after.backSquare}-${after.enemySquare}`;
    if (afterKey === beforeKey) continue;                 // not newly created by this trade
    const score = VAL[after.frontPiece] ?? 0;
    const bestScore = best ? (VAL[best.frontPiece] ?? 0) : -1;
    if (score > bestScore) best = { ...after, tradeFrom: m.from, tradeTo: m.to };
  }
  return best;
}

/** The v2 warning — a trade that opens a pin. Guide-don't-tell: names the
 *  alignment, never says "don't trade". */
export function tradeDangerClause(d: TradeDanger): string {
  const front = `${PNAME[d.frontPiece]} on ${d.frontSquare}`;
  return `before you trade on ${d.tradeTo}: that lines your ${front} up with your ${PNAME[d.backPiece]} on the ${d.line} — a pin.`;
}

/** The prophylactic warning — guide-don't-tell: name the alignment and the line,
 *  never a move. Terse. */
export function latentDangerClause(d: LatentDanger): string {
  const front = `${PNAME[d.frontPiece]} on ${d.frontSquare}`;
  const back = PNAME[d.backPiece];
  const open = d.latent ? ` — mind it before you open the line` : ` — that ${d.line} is a pin`;
  return `heads up: your ${front} and your ${back} share that ${d.line}${open}.`;
}
