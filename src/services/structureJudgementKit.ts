// structureJudgementKit — the shape every batch-6 structure computer returns,
// and the board geometry they share. A LEAF: chess.js + the existing outpost /
// position-reading computers only. No Dexie, no LLM, no randomness.
//
// One shape for every structure read (pawn, square, plan): the sentence, the
// squares it names, the PROOF it rests on (required, never a "stated" escape —
// a read that cannot hand over its squares or its line is not emitted), a
// say-once key, and what it puts at stake when it has a number.
import { Chess, type Color, type Square } from 'chess.js';
import type { Proof } from './proof';
import type { FactStakes } from './factStakes';
import type { MisconceptionTagId } from '../data/misconceptionTags';

/** Every act this batch teaches. The `Record` tables below are exhaustive over
 *  it, so a new act fails to compile until someone decides where it speaks. */
export type StructureAct =
  | 'second-weakness'
  | 'restriction'
  | 'right-idea-wrong-piece'
  | 'keep-plan-change-route'
  | 'plan-over-one-move'
  | 'placement-future-line'
  | 'recapture-sealed-weakness'
  | 'en-passant-structure'
  | 'semi-outpost'
  | 'fix-on-bishop-colour'
  | 'key-pawn'
  | 'formation'
  | 'break-trades-weak-pawn'
  | 'dont-repair'
  | 'piece-blocks-own-pawn'
  | 'safe-square-route'
  | 'masked-weakness'
  | 'mirrored-asymmetry'
  | 'file-entry-covered'
  | 'dont-plug-file'
  | 'unmoved-units'
  | 'mutual-restriction'
  | 'file-opened-for-defender'
  | 'small-edges'
  | 'fighting-line';

export interface StructureRead {
  act: StructureAct;
  text: string;
  squares: string[];
  /** REQUIRED: the squares or the line the claim rests on. */
  proof: Proof;
  /** Say-once identity — the same fact on a later turn is the same key. */
  key: string;
  /** Material at stake, only where the computer has a number (a move's cost). */
  stakes?: FactStakes;
  /** DUAL-USE: the student-model tag a correct choice here answers (HELD). A
   *  miss is recorded by the live slip capture, never here (no double count). */
  held?: { tag: MisconceptionTagId; posedImportance: number };
}

export const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export function fileIdx(sq: string): number { return sq.charCodeAt(0) - 97; }
export function rankNum(sq: string): number { return Number(sq[1]); }
export function sqAt(f: number, r: number): Square | null {
  return f >= 0 && f < 8 && r >= 1 && r <= 8 ? (`${String.fromCharCode(97 + f)}${r}` as Square) : null;
}
/** A square from in-range indices (callers loop over the board). */
export function sqOn(f: number, r: number): Square {
  return `${String.fromCharCode(97 + f)}${r}` as Square;
}
export function fwd(c: Color): 1 | -1 { return c === 'w' ? 1 : -1; }
export function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }
/** a1 is dark. */
export function isDark(sq: string): boolean { return (fileIdx(sq) + rankNum(sq) - 1) % 2 === 0; }
export function shade(sq: string): 'dark' | 'light' { return isDark(sq) ? 'dark' : 'light'; }

export function board(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

/** The board after `san` from `fen`, with the move, or null when illegal. */
export function play(fen: string, san: string): { after: Chess; mv: ReturnType<Chess['move']> } | null {
  const c = board(fen);
  if (!c) return null;
  try { const mv = c.move(san); return { after: c, mv }; } catch { return null; }
}

/** Every square holding a `color` piece of `type`. */
export function piecesOf(c: Chess, color: Color, type?: string): Square[] {
  const out: Square[] = [];
  for (const row of c.board()) for (const cell of row) {
    if (cell && cell.color === color && (!type || cell.type === type)) out.push(cell.square);
  }
  return out;
}

/** The same position with `color` to move (en passant cleared), or null when
 *  that side would leave the other in check. */
export function withTurn(fen: string, color: Color): string | null {
  const parts = fen.split(' ');
  parts[1] = color;
  parts[3] = '-';
  const f = parts.join(' ');
  return board(f) ? f : null;
}

/** The position with the piece on `sq` removed (same side to move). */
export function without(fen: string, sq: string): string | null {
  const c = board(fen);
  if (!c) return null;
  c.remove(sq as Square);
  try { return new Chess(c.fen()).fen(); } catch { return null; }
}

/** How many squares a piece on `sq` attacks — its scope (turn-independent). */
export function scope(c: Chess, sq: Square): number {
  const p = c.get(sq);
  if (!p) return 0;
  let n = 0;
  for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) {
    const t = sqOn(f, r);
    if (t !== sq && c.attackers(t, p.color).includes(sq)) n++;
  }
  return n;
}

/** The pawn squares that a `color` pawn standing on `sq` attacks. */
export function pawnAttacks(sq: string, color: Color): Square[] {
  const r = rankNum(sq) + fwd(color);
  return [sqAt(fileIdx(sq) - 1, r), sqAt(fileIdx(sq) + 1, r)].filter((x): x is Square => !!x);
}

/** A UCI line from `fen` as SANs, stopping where it stops being legal. */
export function uciToSans(fen: string, uci: readonly string[]): string[] {
  const c = board(fen);
  if (!c) return [];
  const out: string[] = [];
  for (const u of uci) {
    try {
      out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    } catch { break; }
  }
  return out;
}

export const bare = (san: string): string => san.replace(/[+#!?]+$/, '');
