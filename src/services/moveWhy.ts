// moveWhy — a deterministic, BOARD-TRUE "why" for a single move (G0/G3). The
// computed fill for plies the voiced corpus (Tier 1) doesn't cover, so a beginner
// hears a reason on EVERY move, never silence (David 2026-08-27: "teach the why
// behind each move… no silent moves, ever"). Voiced leads where it exists; this
// fills the rest.
//
// NOT a generic template. It names the move's CONCRETE effect read off the board
// — the real squares the piece now controls, the piece it takes, the king it
// tucks away — so it's specific and true, never "develops toward the center and
// eyeing key squares" (the vague filler David banned, 2026-08-12). When the
// position gives nothing concrete to say, it returns '' (silence over filler).
import { Chess } from 'chess.js';

const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const CENTER = new Set(['d4', 'd5', 'e4', 'e5']);
const BIG_CENTER = new Set(['c4', 'c5', 'd4', 'd5', 'e4', 'e5', 'f4', 'f5']);

type Sq = string;
const FILES = 'abcdefgh';
function sq(file: number, rank: number): Sq | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${rank + 1}`;
}
function fileOf(s: Sq): number { return FILES.indexOf(s[0]); }
function rankOf(s: Sq): number { return Number.parseInt(s[1], 10) - 1; }

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Squares a piece of `type` on `from` attacks on `board` (chess.js game AFTER
 *  the move). Turn-independent — pure geometry, so it works regardless of whose
 *  move it is. Pawns give their two capture squares (the squares they guard). */
function attackSquares(game: Chess, from: Sq, type: string, color: 'w' | 'b'): Sq[] {
  const f = fileOf(from); const r = rankOf(from);
  const out: Sq[] = [];
  const slide = (dirs: number[][]): void => {
    for (const [df, dr] of dirs) {
      let nf = f + df; let nr = r + dr;
      while (true) {
        const s = sq(nf, nr); if (!s) break;
        out.push(s);
        if (game.get(s as Parameters<Chess['get']>[0])) break; // blocked
        nf += df; nr += dr;
      }
    }
  };
  if (type === 'n') { for (const [df, dr] of KNIGHT) { const s = sq(f + df, r + dr); if (s) out.push(s); } }
  else if (type === 'b') slide(BISHOP);
  else if (type === 'r') slide(ROOK);
  else if (type === 'q') slide([...BISHOP, ...ROOK]);
  else if (type === 'k') { for (const [df, dr] of [...BISHOP, ...ROOK]) { const s = sq(f + df, r + dr); if (s) out.push(s); } }
  else if (type === 'p') { const dr = color === 'w' ? 1 : -1; for (const df of [-1, 1]) { const s = sq(f + df, r + dr); if (s) out.push(s); } }
  return out;
}

/** An enemy piece that the moved piece now attacks (for "bears down on the …"). */
function attackedEnemy(game: Chess, targets: Sq[], mover: 'w' | 'b'): { piece: string; square: Sq } | null {
  for (const s of targets) {
    const p = game.get(s as Parameters<Chess['get']>[0]);
    if (p && p.color !== mover && p.type !== 'k') return { piece: p.type, square: s };
  }
  return null;
}

function isFianchetto(type: string, to: Sq): boolean {
  return type === 'b' && ['g2', 'b2', 'g7', 'b7'].includes(to);
}

/**
 * A board-true one-line reason for `san` from `fenBefore`, or '' when the
 * position offers nothing concrete (silence beats filler). Pure chess.js.
 */
export function computeMoveWhy(fenBefore: string, san: string): string {
  let before: Chess; let move: ReturnType<Chess['move']>;
  try {
    before = new Chess(fenBefore);
    move = before.move(san);
    if (!move) return '';
  } catch { return ''; }
  const after = before; // `before` now holds the post-move position
  const { piece, to, color } = move;
  const name = PNAME[piece] ?? 'piece';

  // Castling — king safety, the clearest beginner "why".
  if (move.san === 'O-O' || move.san === 'O-O-O') {
    return `Castling gets the king to safety and brings the rook toward the centre.`;
  }

  // A capture — say what it takes.
  if (move.captured) {
    const took = PNAME[move.captured] ?? 'piece';
    return `Takes the ${took} on ${to}.`;
  }

  // A check — the most forcing thing on the board.
  if (move.san.endsWith('+') || move.san.endsWith('#')) {
    return `Checks the king from ${to}, forcing a reply.`;
  }

  const targets = attackSquares(after, to, piece, color);

  // Fianchetto — the long diagonal, named with what it now eyes.
  if (isFianchetto(piece, to)) {
    const central = targets.filter((s) => CENTER.has(s));
    return central.length
      ? `The bishop takes the long diagonal, bearing down on ${central.join(' and ')}.`
      : `The bishop takes the long diagonal — the bedrock of this setup.`;
  }

  // Attacks an enemy piece → name it (the concrete threat).
  const hit = attackedEnemy(after, targets, color);
  if (hit) {
    return `The ${name} to ${to} goes after the ${PNAME[hit.piece]} on ${hit.square}.`;
  }

  // A developing minor piece or pawn that grips real central squares → name them.
  if (piece === 'n' || piece === 'b') {
    const central = targets.filter((s) => BIG_CENTER.has(s));
    if (central.length) return `The ${name} to ${to} develops, covering ${central.slice(0, 2).join(' and ')}.`;
    return `The ${name} to ${to} comes into the game.`;
  }
  if (piece === 'p') {
    const guards = targets.filter((s) => BIG_CENTER.has(s));
    if (guards.length) return `The pawn to ${to} stakes out ${guards.join(' and ')}.`;
    return '';
  }
  if (piece === 'r') {
    // A rook lift / file — say the file it now owns if it's open-ish.
    return `The rook swings to ${to}, eyeing the file.`;
  }
  if (piece === 'q') {
    const central = targets.filter((s) => BIG_CENTER.has(s));
    if (central.length) return `The queen to ${to} eyes ${central.slice(0, 2).join(' and ')}.`;
    return '';
  }
  return '';
}
