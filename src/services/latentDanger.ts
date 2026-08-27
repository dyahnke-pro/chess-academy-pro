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
 * and P1 — 0 = the line is already open (live-ish), 1 = LATENT (opens if the
 * shield trades). Returns the highest-value exposure, or null.
 */
export function detectLatentDanger(fen: string, studentColor: 'w' | 'b'): LatentDanger | null {
  const g = grid(fen);
  const at = (r: number, c: number): Cell | null => (r >= 0 && r < 8 && c >= 0 && c < 8 ? g[r][c] : null);
  const enemy: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  let best: LatentDanger | null = null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = g[r][c];
      if (!cell || cell.color !== enemy || !'rbq'.includes(cell.piece)) continue;
      for (const [dr, dc] of dirsFor(cell.piece)) {
        let rr = r + dr, cc = c + dc;
        let shields = 0;       // non-student pieces between the enemy and P1
        let front: Cell | null = null;
        // Walk to the first STUDENT piece (P1), counting shields on the way.
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const cur = at(rr, cc);
          if (cur) {
            if (cur.color === studentColor) { front = cur; break; }
            shields++;             // an enemy/own blocker between the ray and P1
            if (shields > 1) break; // too remote to be a real warning
          }
          rr += dr; cc += dc;
        }
        if (!front || shields > 1) continue;
        // Continue past P1 to the next piece (P2) — only empties may sit between.
        rr += dr; cc += dc;
        let back: Cell | null = null;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const cur = at(rr, cc);
          if (cur) { back = cur; break; }
          rr += dr; cc += dc;
        }
        if (!back || back.color !== studentColor) continue;
        if (!(back.piece === 'k' || back.piece === 'q')) continue;
        if ((VAL[back.piece] ?? 0) <= (VAL[front.piece] ?? 0)) continue;
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

/** The prophylactic warning — guide-don't-tell: name the alignment and the line,
 *  never a move. Terse. */
export function latentDangerClause(d: LatentDanger): string {
  const front = `${PNAME[d.frontPiece]} on ${d.frontSquare}`;
  const back = PNAME[d.backPiece];
  const open = d.latent ? ` — mind it before you open the line` : ` — that ${d.line} is a pin`;
  return `heads up: your ${front} and your ${back} share that ${d.line}${open}.`;
}
