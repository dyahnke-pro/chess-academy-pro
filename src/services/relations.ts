/**
 * relations — the board's RELATIONS, one snapshot per position
 * (WO-STORY-MATRIX-01 P1-7, 2026-10-30).
 *
 * What guards what, what attacks what, which piece is pinned, loose or
 * hanging, which files are open, how much cover each king has: the computers
 * already computed every one of these, each for itself, and threw the
 * relation away once its sentence was written. `computeBoardDelta` diffed two
 * boards and kept only prose; `causalChain` replayed the whole game three
 * times a call to re-ask `attackers()`. A move's CAUSE is a relation it broke
 * and its EFFECT a relation it made — so the relations get one home, read off
 * the computers that own them, and the diff of two snapshots is what a move
 * (or a line) changed.
 *
 *   13.Bxf7+ Kxf7 Qxd8: the start board holds `guard:d8(bq)<e8(bk)` (the
 *   king is the queen's only guard); Kxf7 loses it and gains `loose:d8(bq)`;
 *   Qxd8 moves material from −1 to +8. No tactic detector names that
 *   deflection — the diff does.
 *
 * A LEAF: chess.js and the relation computers (no engine, no Dexie, no I/O).
 * `detectTactics` (21 ms a board, 103 worst) and `findPinBreaks` (24 / 112 ms)
 * stay OUT of the eager snapshot — their facts carry their own relations.
 * Memoised by FEN, so a game costs one snapshot per ply (the board after ply
 * N is the board before ply N+1).
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { SpokenLine } from './voicePackage';
import { findPins, absolutePinRay } from './pinGeometry';
import { findLoosePieces } from './loosePieces';
import { findHangingBySee } from './positionReadingService';
import { describeStructure } from './boardStructure';
import { countKingAttack, kingCover, kingNeighbourhood } from './kingSafety';
import { BISHOP_DIRS, ROOK_DIRS } from './lineGeometry';

/** A piece as the relation names it: its colour and type, `bq` = Black queen.
 *  In every key, so a relation on a square never survives the piece on it
 *  being captured and replaced (the cross-move identity problem). */
export type PieceCode = `${Color}${PieceSymbol}`;

/** One relation on one board. Every square-subject relation names its piece. */
export type Relation =
  /** `by` defends its own piece on `square` and could recapture there. */
  | { kind: 'guard'; square: Square; piece: PieceCode; by: Square; byPiece: PieceCode }
  /** `by` covers its own piece on `square` only geometrically: a pin forbids
   *  the recapture (pinned to the king, `square` off the pin line) or prices
   *  it (a pin that bites — leaving the line loses the piece behind). Guards
   *  are otherwise pin-blind, so without this a guard that cannot recapture
   *  would be leaned on (the lesson behind causalChain's `winnableGain`). */
  | { kind: 'guard-pinned'; square: Square; piece: PieceCode; by: Square; byPiece: PieceCode }
  /** `by` attacks the enemy piece on `square` (geometric, as `attackers()`). */
  | { kind: 'attack'; square: Square; piece: PieceCode; by: Square; byPiece: PieceCode }
  /** A bishop, rook or queen sees `square` along a clear line — empty or the
   *  first piece in the way. What `boardDelta` reads to say a line opened or
   *  a move shut one. */
  | { kind: 'reach'; square: Square; by: Square; byPiece: PieceCode }
  /** THE TEACHING PIN (`pinGeometry.findPins`): `by` pins `pinned` against `behind`. */
  | { kind: 'pin'; pinned: Square; piece: PieceCode; by: Square; byPiece: PieceCode; behind: Square; behindPiece: PieceCode }
  /** Nothing of its own side defends it (`findLoosePieces`). */
  | { kind: 'loose'; square: Square; piece: PieceCode }
  /** A capture there wins material now (`findHangingBySee`). */
  | { kind: 'hanging'; square: Square; piece: PieceCode }
  /** A file with no pawns (`open: 'both'`), or with none of `open`'s pawns but
   *  the enemy's — half-open for that side (`describeStructure`). */
  | { kind: 'file'; file: string; open: 'both' | Color }
  /** A passed pawn (`describeStructure`). */
  | { kind: 'passer'; square: Square; piece: PieceCode }
  /** `color`'s king cover, files covered of files around it (`kingSafety.kingCover`). */
  | { kind: 'cover'; color: Color; present: number; of: number }
  /** The attack on `color`'s king ring, counted pin-aware (`countKingAttack`). */
  | { kind: 'zone'; color: Color; attackers: number; defenders: number }
  /** Material balance in points, White positive (`describeStructure`). */
  | { kind: 'material'; balance: number }
  /** `color`'s king is in check. */
  | { kind: 'check'; color: Color }
  /** `color` may still castle on `side`. */
  | { kind: 'castling'; color: Color; side: 'short' | 'long' }
  /** A square by `color`'s king (`kingNeighbourhood`) or in the centre that
   *  no pawn of `color` covers. Not called a "hole": the app's hole is a
   *  square no pawn can EVER challenge (`outpost.noPawnCanChallenge`); this is
   *  the cover the pawns give right now, which a pawn move takes away. */
  | { kind: 'uncovered'; color: Color; square: Square };

export type RelationKind = Relation['kind'];

type RelationOf<K extends RelationKind> = Extract<Relation, { kind: K }>;

/** THE KEY OF EVERY RELATION — a mapped `Record` over the kinds, so a new kind
 *  fails to compile until it says how it is keyed. Two snapshots line up by
 *  these keys; a diff is the keys one has and the other lacks. */
export const RELATION_RENDER: { readonly [K in RelationKind]: (r: RelationOf<K>) => string } = {
  guard: (r) => `guard:${r.square}(${r.piece})<${r.by}(${r.byPiece})`,
  'guard-pinned': (r) => `guard-pinned:${r.square}(${r.piece})<${r.by}(${r.byPiece})`,
  attack: (r) => `attack:${r.square}(${r.piece})<${r.by}(${r.byPiece})`,
  reach: (r) => `reach:${r.square}<${r.by}(${r.byPiece})`,
  pin: (r) => `pin:${r.pinned}(${r.piece})<${r.by}(${r.byPiece})|${r.behind}(${r.behindPiece})`,
  loose: (r) => `loose:${r.square}(${r.piece})`,
  hanging: (r) => `hanging:${r.square}(${r.piece})`,
  file: (r) => (r.open === 'both' ? `file:${r.file}` : `file:${r.file}(${r.open})`),
  passer: (r) => `passer:${r.square}(${r.piece})`,
  cover: (r) => `cover:${r.color}:${r.present}/${r.of}`,
  zone: (r) => `zone:${r.color}:${r.attackers}v${r.defenders}`,
  material: (r) => `material:${r.balance}`,
  check: (r) => `check:${r.color}`,
  castling: (r) => `castling:${r.color}:${r.side}`,
  uncovered: (r) => `uncovered:${r.color}:${r.square}`,
};

export function relationKey(r: Relation): string {
  return (RELATION_RENDER[r.kind] as (x: Relation) => string)(r);
}

export interface RelationSnapshot {
  fen: string;
  /** Every relation, in a fixed order (by kind as built, board order within). */
  relations: readonly Relation[];
  /** Key → relation, for lookups and diffs. */
  byKey: ReadonlyMap<string, Relation>;
}

export interface RelationDiff {
  gained: Relation[];
  lost: Relation[];
}

const CENTRAL: readonly Square[] = ['d4', 'e4', 'd5', 'e5'];

function code(color: Color, type: PieceSymbol): PieceCode {
  return `${color}${type}`;
}

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }

const sqAt = (f: number, r: number): Square | null =>
  (f < 0 || f > 7 || r < 1 || r > 8 ? null : (`${String.fromCharCode(97 + f)}${r}` as Square));

/** Is `sq` on the infinite line through `from` in direction `dir`? */
function onLine(from: Square, dir: readonly [number, number], sq: Square): boolean {
  const df = sq.charCodeAt(0) - from.charCodeAt(0);
  const dr = Number(sq[1]) - Number(from[1]);
  return df * dir[1] - dr * dir[0] === 0;
}

/** May the guard on `by` recapture on `square`? No when it is legally pinned
 *  and `square` is off its pin line, or held by a teaching pin that bites and
 *  `square` is off that line (stepping off loses the piece behind). */
function guardIsPinned(
  chess: Chess,
  by: Square,
  square: Square,
  biting: ReadonlyMap<Square, readonly [number, number]>,
): boolean {
  const legal = absolutePinRay(chess, by);
  if (legal) return !onLine(by, legal, square);
  const pinDir = biting.get(by);
  return !!pinDir && !onLine(by, pinDir, square);
}

function build(fen: string): RelationSnapshot | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const out: Relation[] = [];
  const cells = chess.board().flat().filter((c): c is NonNullable<typeof c> => !!c);

  // The teaching pins, first: the pinned-guard test reads them.
  const pins = findPins(chess);
  const biting = new Map<Square, readonly [number, number]>();
  for (const p of pins) {
    const [by, pinned, behind] = p.involvedSquares as Square[];
    const pinnedPiece = chess.get(pinned);
    const byPiece = chess.get(by);
    const behindPiece = chess.get(behind);
    if (!pinnedPiece || !byPiece || !behindPiece) continue;
    out.push({ kind: 'pin', pinned, piece: code(pinnedPiece.color, pinnedPiece.type), by, byPiece: code(byPiece.color, byPiece.type), behind, behindPiece: code(behindPiece.color, behindPiece.type) });
    if (behindPiece.type !== 'k') {
      biting.set(pinned, [Math.sign(pinned.charCodeAt(0) - by.charCodeAt(0)), Math.sign(Number(pinned[1]) - Number(by[1]))]);
    }
  }

  // Guards and attacks on every piece, board order (rank 8 → 1, file a → h),
  // attackers in `attackers()` order. A king is never "guarded" — an attack on
  // it is the check, and who gives it.
  for (const c of cells) {
    const piece = code(c.color, c.type);
    if (c.type !== 'k') {
      for (const by of chess.attackers(c.square, c.color)) {
        const g = chess.get(by);
        if (!g) continue;
        const pinned = guardIsPinned(chess, by, c.square, biting);
        out.push({ kind: pinned ? 'guard-pinned' : 'guard', square: c.square, piece, by, byPiece: code(g.color, g.type) });
      }
    }
    for (const by of chess.attackers(c.square, other(c.color))) {
      const a = chess.get(by);
      if (!a) continue;
      out.push({ kind: 'attack', square: c.square, piece, by, byPiece: code(a.color, a.type) });
    }
  }

  // Line of sight for every slider, empty squares and the first blocker.
  for (const c of cells) {
    if (c.type !== 'b' && c.type !== 'r' && c.type !== 'q') continue;
    const byPiece = code(c.color, c.type);
    const dirs = c.type === 'b' ? BISHOP_DIRS : c.type === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
    const f0 = c.square.charCodeAt(0) - 97;
    const r0 = Number(c.square[1]);
    for (const [df, dr] of dirs) {
      for (let f = f0 + df, r = r0 + dr; ; f += df, r += dr) {
        const sq = sqAt(f, r);
        if (!sq) break;
        out.push({ kind: 'reach', square: sq, by: c.square, byPiece });
        if (chess.get(sq)) break;
      }
    }
  }

  for (const l of findLoosePieces(chess)) out.push({ kind: 'loose', square: l.square, piece: code(l.color, l.type) });
  for (const h of findHangingBySee(fen)) out.push({ kind: 'hanging', square: h.square, piece: code(h.color, h.piece) });

  const s = describeStructure(fen);
  if (s) {
    for (const file of s.pawns.openFiles) out.push({ kind: 'file', file, open: 'both' });
    for (const color of ['w', 'b'] as const) {
      for (const file of s.pawns.halfOpenFiles[color]) out.push({ kind: 'file', file, open: color });
    }
    for (const color of ['w', 'b'] as const) {
      for (const sq of s.pawns.passedPawns[color]) out.push({ kind: 'passer', square: sq as Square, piece: code(color, 'p') });
    }
  }

  for (const color of ['w', 'b'] as const) {
    const cover = kingCover(chess, color);
    if (cover) out.push({ kind: 'cover', color, present: cover.present, of: cover.of });
    // `countKingAttack(c, me)` counts the attack on me's ENEMY king.
    const zone = countKingAttack(chess, other(color));
    if (zone) out.push({ kind: 'zone', color, attackers: zone.attackers.size, defenders: zone.defenders.size });
  }

  if (s) out.push({ kind: 'material', balance: s.material.balance });
  if (chess.inCheck()) out.push({ kind: 'check', color: chess.turn() });
  for (const color of ['w', 'b'] as const) {
    const rights = chess.getCastlingRights(color);
    if (rights.k) out.push({ kind: 'castling', color, side: 'short' });
    if (rights.q) out.push({ kind: 'castling', color, side: 'long' });
  }

  // The squares by each king and in the centre that no own pawn covers.
  for (const color of ['w', 'b'] as const) {
    const king = cells.find((c) => c.type === 'k' && c.color === color);
    const covered = new Set<string>();
    const step = color === 'w' ? 1 : -1;
    for (const p of cells) {
      if (p.type !== 'p' || p.color !== color) continue;
      const f = p.square.charCodeAt(0) - 97;
      const r = Number(p.square[1]) + step;
      for (const df of [-1, 1]) { const sq = sqAt(f + df, r); if (sq) covered.add(sq); }
    }
    const near = new Set<Square>([...(king ? kingNeighbourhood(king.square) : []), ...CENTRAL]);
    for (const sq of near) {
      const rel = color === 'w' ? Number(sq[1]) : 9 - Number(sq[1]);
      // A pawn covers only squares from its third rank up.
      if (rel < 3 || covered.has(sq)) continue;
      out.push({ kind: 'uncovered', color, square: sq });
    }
  }

  const byKey = new Map<string, Relation>();
  for (const r of out) byKey.set(relationKey(r), r);
  return { fen, relations: out, byKey };
}

// One snapshot per board, first in first out (the openingStory prefix memo's
// shape): a game re-reads the same boards from every surface.
const SNAPSHOT_MEMO_MAX = 256;
const memo = new Map<string, RelationSnapshot | null>();

/** The relations on `fen`'s board, or null for a board chess.js will not load. */
export function snapshot(fen: string): RelationSnapshot | null {
  if (memo.has(fen)) return memo.get(fen) ?? null;
  const snap = build(fen);
  if (memo.size >= SNAPSHOT_MEMO_MAX) {
    const oldest = memo.keys().next().value;
    if (oldest !== undefined) memo.delete(oldest);
  }
  memo.set(fen, snap);
  return snap;
}

/** What changed from board `a` to board `b`: the relations `b` gained and the
 *  ones `a` lost, each in its board's own order. */
export function diff(a: RelationSnapshot, b: RelationSnapshot): RelationDiff {
  return {
    gained: b.relations.filter((r) => !a.byKey.has(relationKey(r))),
    lost: a.relations.filter((r) => !b.byKey.has(relationKey(r))),
  };
}

export interface LineDiff {
  /** The boards of the line: the start, then after each move. */
  fens: string[];
  /** One diff per move, `steps[i]` = what `sans[i]` changed. */
  steps: RelationDiff[];
  /** What the whole line changed, start board to end board. */
  whole: RelationDiff;
}

/** What a line of moves changed, move by move and as a whole. Null when the
 *  line is not legal from its board. */
export function lineDiff(line: SpokenLine): LineDiff | null {
  const fens: string[] = [line.fen];
  try {
    const c = new Chess(line.fen);
    for (const san of line.sans) {
      // chess.js throws on an illegal move: the catch below answers it.
      c.move(san.replace(/[?!]+$/, ''));
      fens.push(c.fen());
    }
  } catch { return null; }
  const snaps: RelationSnapshot[] = [];
  for (const f of fens) {
    const s = snapshot(f);
    if (!s) return null;
    snaps.push(s);
  }
  const steps: RelationDiff[] = [];
  for (let i = 1; i < snaps.length; i++) steps.push(diff(snaps[i - 1], snaps[i]));
  return { fens, steps, whole: diff(snaps[0], snaps[snaps.length - 1]) };
}
