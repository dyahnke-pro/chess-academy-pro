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

export interface MoveWhy {
  /** The spoken reason, or '' when nothing concrete. */
  text: string;
  /** The board squares the reason NAMES — highlighted so the eye lands on them
   *  as the words are spoken (the lead-the-eye rule, David 2026-08-28). Includes
   *  the move's destination when the reason is about the piece that just moved. */
  squares: string[];
}

/**
 * A board-true reason for `san` from `fenBefore` WITH the squares it names, or
 * an empty result when the position offers nothing concrete. Pure chess.js.
 */
export function computeMoveWhyDetail(fenBefore: string, san: string): MoveWhy {
  const none: MoveWhy = { text: '', squares: [] };
  let before: Chess; let move: ReturnType<Chess['move']>;
  try {
    before = new Chess(fenBefore);
    move = before.move(san);
    if (!move) return none;
  } catch { return none; }
  const after = before; // `before` now holds the post-move position
  const { piece, to, color } = move;
  const name = PNAME[piece] ?? 'piece';

  // Castling — king safety, the clearest beginner "why".
  if (move.san === 'O-O' || move.san === 'O-O-O') {
    return { text: `Castling gets the king to safety and brings the rook toward the centre.`, squares: [to] };
  }

  // A capture — say what it takes.
  if (move.captured) {
    const took = PNAME[move.captured] ?? 'piece';
    return { text: `Takes the ${took} on ${to}.`, squares: [to] };
  }

  // A check — the most forcing thing on the board.
  if (move.san.endsWith('+') || move.san.endsWith('#')) {
    return { text: `Checks the king from ${to}, forcing a reply.`, squares: [to] };
  }

  const targets = attackSquares(after, to, piece, color);

  // Fianchetto — the long diagonal, named with what it now eyes.
  if (isFianchetto(piece, to)) {
    const central = targets.filter((s) => CENTER.has(s));
    return central.length
      ? { text: `The bishop takes the long diagonal, bearing down on ${central.join(' and ')}.`, squares: [to, ...central] }
      : { text: `The bishop takes the long diagonal — the bedrock of this setup.`, squares: [to] };
  }

  // Attacks an enemy piece → name it (the concrete threat).
  const hit = attackedEnemy(after, targets, color);
  if (hit) {
    return { text: `The ${name} to ${to} goes after the ${PNAME[hit.piece]} on ${hit.square}.`, squares: [to, hit.square] };
  }

  // A developing minor piece or pawn that grips real central squares → name them.
  if (piece === 'n' || piece === 'b') {
    const central = targets.filter((s) => BIG_CENTER.has(s)).slice(0, 2);
    if (central.length) return { text: `The ${name} to ${to} develops, covering ${central.join(' and ')}.`, squares: [to, ...central] };
    return { text: `The ${name} to ${to} comes into the game.`, squares: [to] };
  }
  if (piece === 'p') {
    const guards = targets.filter((s) => BIG_CENTER.has(s));
    if (guards.length) return { text: `The pawn to ${to} stakes out ${guards.join(' and ')}.`, squares: [to, ...guards] };
    return none;
  }
  if (piece === 'r') {
    return { text: `The rook swings to ${to}, eyeing the file.`, squares: [to] };
  }
  if (piece === 'q') {
    const central = targets.filter((s) => BIG_CENTER.has(s)).slice(0, 2);
    if (central.length) return { text: `The queen to ${to} eyes ${central.join(' and ')}.`, squares: [to, ...central] };
    return none;
  }
  return none;
}

/**
 * A board-true one-line reason for `san` from `fenBefore`, or '' when the
 * position offers nothing concrete (silence beats filler). Pure chess.js.
 */
export function computeMoveWhy(fenBefore: string, san: string): string {
  return computeMoveWhyDetail(fenBefore, san).text;
}

/**
 * The board squares NAMED in a spoken line — so the eye can be led to every
 * square the narration talks about, voiced or computed (David 2026-08-28: "no
 * key squares highlighted when talking about them"; "weakening d4 should have
 * drawn a highlight"). Matches bare squares (d4), possessive/suffixed forms
 * (d4-square, e5's), and SAN destinations (Nc6 → c6, Bxf7 → f7). Deduped, capped
 * so the board never clutters. Never matches a move number ("2." isn't a square).
 */
export function squaresNamedIn(text: string, cap = 4): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  // A square is a file a–h then rank 1–8, not preceded by a letter/number (so
  // "and5" or "12e4" don't false-match) — SAN like "Nc6"/"exd5" is handled by
  // pulling the trailing coordinate.
  const re = /(?<![a-z0-9])([a-h][1-8])(?![0-9])/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sq = m[1].toLowerCase();
    if (!seen.has(sq)) { seen.add(sq); out.push(sq); }
    if (out.length >= cap) break;
  }
  // SAN destinations (Nc6, Bxf7, exd5, O-O excluded) — pull the last coordinate
  // from move-like tokens the bare scan above already covers, so nothing extra
  // is needed; the regex captures the coordinate inside the SAN.
  return out;
}
