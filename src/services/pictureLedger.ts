/**
 * THE PICTURE'S FIRST CONCLUSIONS (WO-PICTURE-01 P3, first half): the LEDGER,
 * the COUNTERPLAY and the TARGET — what Danya works out before he weighs a
 * single try ("a well-placed knight on c5, but Black has excellent
 * coordination and no ACCESSIBLE weaknesses"; "he looks for the opponent's ONE
 * counterplay resource"; "c5 is far more vulnerable than e6").
 *
 * Each conclusion rests on the facts every computer already produced for the
 * board (`PositionPicture`): an entry exists only where a fact is about that
 * piece, pawn or square, and it lists those facts' ids as its "because". What
 * the conclusion adds is COMPUTED here with the board alone (chess.js parses,
 * the rest is plain geometry): whether the thing is weak or strong, who can
 * reach it within two moves, whether the engine's best line plays a break or
 * stops it. Nothing is guessed: a weakness no enemy piece or lever can reach
 * is kept apart (`unreached`), never counted; a break the best line neither
 * plays nor stops is `unsettled`, never called alive or dead.
 *
 * Pure: no engine call (the lines are handed in), no Dexie, no model.
 */
import { openSentence } from '../utils/openSentence';
import { CAPTURE_VALUE } from './pieceValues';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { CoachFact } from './coachFact';
import { buildPicture, type PictureObject, type PictureRole, type PositionPicture } from './positionPicture';
import type { EngineLine } from './engineLineRead';
import { andList, countWord } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { bfsRoute } from './forwardTeaching';
import { liteMoves, makeLite, undoLite } from './liteMoves';
import { legalSeeGainOn } from './positionReadingService';
import { hasMateThreat, mustDefendPieces, sideToMoveAs } from './threatOut';

// ── the board, read once ─────────────────────────────────────────────────────

interface Unit { type: PieceSymbol; color: Color }
type Grid = Map<Square, Unit>;

const FILES = 'abcdefgh';
const fileOf = (s: string): number => FILES.indexOf(s[0]);
const rankOf = (s: string): number => Number(s[1]);
const sq = (f: number, r: number): Square | null => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? (`${FILES[f]}${r}` as Square) : null);
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const fwd = (c: Color): number => (c === 'w' ? 1 : -1);
const placement = (fen: string): string => fen.split(' ')[0];
const VALUE = CAPTURE_VALUE;
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function gridOf(fen: string): Grid | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const g: Grid = new Map();
  for (const row of c.board()) for (const cell of row) if (cell) g.set(cell.square, { type: cell.type, color: cell.color });
  return g;
}

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const dirsOf = (t: PieceSymbol): number[][] => (t === 'r' ? ROOK_DIRS : t === 'b' ? BISHOP_DIRS : t === 'q' ? [...ROOK_DIRS, ...BISHOP_DIRS] : []);

/** Does a `unit` standing on `from` hit `to` on `g`? `through`: the colours
 *  whose ONE piece a line may pass through — the target's own piece (pressure
 *  behind it, "on f7 it aims down the f-file at f2") or the unit's own (a
 *  battery, the rook behind the queen — never behind its own pawn, which
 *  does not hit straight on); empty: a clear line only. */
function hits(g: Grid, unit: Unit, from: Square, to: Square, through: readonly Color[]): boolean {
  if (from === to) return false;
  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  if (unit.type === 'p') return dr === fwd(unit.color) && Math.abs(df) === 1;
  if (unit.type === 'n') return KNIGHT.some(([a, b]) => a === df && b === dr);
  if (unit.type === 'k') return Math.max(Math.abs(df), Math.abs(dr)) === 1;
  const straight = df === 0 || dr === 0;
  const diag = Math.abs(df) === Math.abs(dr);
  if ((unit.type === 'r' && !straight) || (unit.type === 'b' && !diag) || (unit.type === 'q' && !straight && !diag)) return false;
  const sf = Math.sign(df);
  const sr = Math.sign(dr);
  let passed = 0;
  for (let f = fileOf(from) + sf, r = rankOf(from) + sr; ; f += sf, r += sr) {
    const s = sq(f, r);
    if (!s || s === to) return true;
    const u = g.get(s);
    if (!u) continue;
    if (through.includes(u.color) && u.type !== 'k' && !(u.color === unit.color && u.type === 'p') && passed === 0) { passed++; continue; }
    return false;
  }
}

/** The squares a unit on `from` can move to (a capture of the other colour
 *  included). Pawns are handled by the levers, never here. */
function stepsOf(g: Grid, unit: Unit, from: Square): Square[] {
  const out: Square[] = [];
  const add = (s: Square | null): boolean => {
    if (!s) return false;
    const u = g.get(s);
    if (u && u.color === unit.color) return false;
    if (!u || u.type !== 'k') out.push(s);
    return !u;
  };
  if (unit.type === 'n' || unit.type === 'k') {
    for (const [a, b] of unit.type === 'n' ? KNIGHT : KING) add(sq(fileOf(from) + a, rankOf(from) + b));
    return out;
  }
  for (const [a, b] of dirsOf(unit.type)) {
    for (let f = fileOf(from) + a, r = rankOf(from) + b; ; f += a, r += b) if (!add(sq(f, r))) break;
  }
  return out;
}

const pawnHits = (g: Grid, s: Square, by: Color): Square[] => {
  const out: Square[] = [];
  for (const df of [-1, 1]) {
    const from = sq(fileOf(s) + df, rankOf(s) - fwd(by));
    const u = from ? g.get(from) : undefined;
    if (from && u && u.type === 'p' && u.color === by) out.push(from);
  }
  return out;
};
const unitsOf = (g: Grid, c: Color): Array<[Square, Unit]> => [...g].filter(([, u]) => u.color === c);
const queensOn = (g: Grid): boolean => [...g.values()].some((u) => u.type === 'q');

// ── who can reach a thing within two moves ───────────────────────────────────

/** One piece's way to a square from which it hits the thing: where it stands,
 *  the square it goes through, the square it hits from, and how many moves. */
export interface Reach {
  from: Square;
  piece: PieceSymbol;
  via: Square | null;
  at: Square;
  /** 0–2 for the two-move reach; up to `PLAN_MOVES` for the plan's route. */
  moves: number;
  /** The squares the piece lands on, in order, ending at `at` (empty: it hits
   *  from where it stands). */
  route: Square[];
  /** Through one of the owner's pieces (pressure behind it), never a clear hit. */
  behind: boolean;
}

/** Every piece of `by` (pawns apart) that can stand, within two moves, on a
 *  square from which it hits `target`. A square an enemy pawn covers is no
 *  place to stand, unless the piece is there already. `through`: the colours a
 *  line may pass one piece of (`hits`). */
function reachersOf(g: Grid, target: Square, by: Color, through: readonly Color[]): Reach[] {
  const out: Reach[] = [];
  const kingsToo = !queensOn(g);
  for (const [from, unit] of unitsOf(g, by)) {
    if (unit.type === 'p' || from === target) continue;
    if (unit.type === 'k' && !kingsToo) continue;
    const standsAt = (gg: Grid, s: Square): boolean => pawnHits(gg, s, other(by)).length === 0;
    const hitFrom = (gg: Grid, s: Square): { ok: boolean; behind: boolean } => {
      if (hits(gg, unit, s, target, [])) return { ok: true, behind: false };
      return through.length > 0 && hits(gg, unit, s, target, through) ? { ok: true, behind: true } : { ok: false, behind: false };
    };
    const now = hitFrom(g, from);
    if (now.ok) { out.push({ from, piece: unit.type, via: null, at: from, moves: 0, route: [], behind: now.behind }); continue; }
    let best: Reach | null = null;
    for (const s1 of stepsOf(g, unit, from)) {
      if (s1 === target || !standsAt(g, s1)) continue;
      const g1 = new Map(g);
      g1.delete(from);
      g1.set(s1, unit);
      const h1 = hitFrom(g1, s1);
      if (h1.ok) { if (!best || best.moves > 1 || (best.behind && !h1.behind)) best = { from, piece: unit.type, via: null, at: s1, moves: 1, route: [s1], behind: h1.behind }; continue; }
      if (best && best.moves === 1) continue;
      for (const s2 of stepsOf(g1, unit, s1)) {
        if (s2 === target || s2 === from || !standsAt(g1, s2)) continue;
        const g2 = new Map(g1);
        g2.delete(s1);
        g2.set(s2, unit);
        const h2 = hitFrom(g2, s2);
        if (h2.ok && (!best || (best.behind && !h2.behind))) best = { from, piece: unit.type, via: s1, at: s2, moves: 2, route: [s1, s2], behind: h2.behind };
      }
    }
    if (best) out.push(best);
  }
  return out;
}

/** The pawns of `by` that hit `target` now or after one or two clear pushes:
 *  "a lever hits it". Each as the pawn's square and the square it hits from. */
function leversOn(g: Grid, target: Square, by: Color): Array<{ from: Square; at: Square }> {
  const out: Array<{ from: Square; at: Square }> = [];
  for (const [from, unit] of unitsOf(g, by)) {
    if (unit.type !== 'p') continue;
    const start = by === 'w' ? 2 : 7;
    for (let n = 0; n <= 2; n++) {
      if (n === 2 && rankOf(from) !== start) break;
      const at = sq(fileOf(from), rankOf(from) + n * fwd(by));
      if (!at) break;
      if (n > 0 && g.has(at)) break;
      if (hits(g, unit, at, target, [])) { out.push({ from, at }); break; }
    }
  }
  return out;
}

// ── weak or strong, read off the board ───────────────────────────────────────

export type WeakTrait =
  | 'isolated' | 'doubled' | 'backward' | 'open-file' | 'outnumbered'
  | 'no-safe-square' | 'loose'
  | 'king-centre' | 'king-file'
  | 'hole'
  | 'piece-guarded';
export type AssetTrait = 'passed' | 'outpost' | 'open-file';

function pawnGuarded(g: Grid, s: Square, c: Color): boolean { return pawnHits(g, s, c).length > 0; }
function attackCount(g: Grid, s: Square, by: Color): number {
  let n = 0;
  for (const [from, unit] of unitsOf(g, by)) if (hits(g, unit, from, s, [])) n++;
  return n;
}
function cheapestAttacker(g: Grid, s: Square, by: Color): number {
  let v = Infinity;
  for (const [from, unit] of unitsOf(g, by)) if (hits(g, unit, from, s, [])) v = Math.min(v, VALUE[unit.type]);
  return v;
}
const ownPawnsOnFile = (g: Grid, f: number, c: Color): number[] =>
  [...g].filter(([s, u]) => u.type === 'p' && u.color === c && fileOf(s) === f).map(([s]) => rankOf(s));

function weakPawnTraits(g: Grid, s: Square, c: Color): WeakTrait[] {
  if (pawnGuarded(g, s, c)) return [];
  const t: WeakTrait[] = [];
  const f = fileOf(s);
  const r = rankOf(s);
  const side = [f - 1, f + 1].filter((x) => x >= 0 && x < 8);
  const adj = side.flatMap((x) => ownPawnsOnFile(g, x, c));
  if (adj.length === 0) t.push('isolated');
  if (ownPawnsOnFile(g, f, c).length > 1) t.push('doubled');
  const behindOrLevel = side.flatMap((x) => ownPawnsOnFile(g, x, c)).some((rr) => (c === 'w' ? rr <= r : rr >= r));
  const ahead = sq(f, r + fwd(c));
  if (adj.length > 0 && !behindOrLevel && ahead && pawnHits(g, ahead, other(c)).length > 0) t.push('backward');
  if (ownPawnsOnFile(g, f, other(c)).length === 0) t.push('open-file');
  if (attackCount(g, s, other(c)) > attackCount(g, s, c)) t.push('outnumbered');
  return t;
}

/** A piece is weak when every square it can go to is lost and it is hit where
 *  it stands, or when it is hit by something cheaper or more often than it is
 *  guarded. */
function weakPieceTraits(g: Grid, s: Square, unit: Unit): WeakTrait[] {
  const t: WeakTrait[] = [];
  const them = other(unit.color);
  const hitNow = attackCount(g, s, them);
  const guards = attackCount(g, s, unit.color);
  const lost = (gg: Grid, at: Square): boolean => {
    const a = attackCount(gg, at, them);
    return a > 0 && (cheapestAttacker(gg, at, them) < VALUE[unit.type] || attackCount(gg, at, unit.color) === 0);
  };
  const steps = stepsOf(g, unit, s).filter((x) => !g.get(x));
  if (hitNow > 0 && steps.every((x) => { const gg = new Map(g); gg.delete(s); gg.set(x, unit); return lost(gg, x); })) t.push('no-safe-square');
  if (hitNow > 0 && (cheapestAttacker(g, s, them) < VALUE[unit.type] || hitNow > guards)) t.push('loose');
  // A loose piece with a safe square is a tactic of the moment, said by the
  // tactics computers; it steps away, so the standing ledger leaves it
  // (gotham-jelena g4: "You can get at their weak spot: the bishop on f5"
  // beside the kick that sends it home).
  return t.includes('no-safe-square') ? t : [];
}

function weakKingTraits(g: Grid, s: Square, c: Color): WeakTrait[] {
  if (!queensOn(g)) return [];
  const t: WeakTrait[] = [];
  const f = fileOf(s);
  if ((f === 3 || f === 4) && rankOf(s) === (c === 'w' ? 1 : 8)) t.push('king-centre');
  if ([f - 1, f, f + 1].some((x) => x >= 0 && x < 8 && ownPawnsOnFile(g, x, c).length === 0)) t.push('king-file');
  return t;
}

/** A pawn guarded only by PIECES: no pawn of its own guards it now or can by
 *  one push, and an enemy pawn levers it now or after one push of its own —
 *  the piece holding it is tied down ("c5 is held only by the knight, and
 *  b4 hits it"). The pawn, the pieces tied to it, and the lever moves. */
export interface TiedGuard {
  guards: Array<{ square: Square; piece: PieceSymbol }>;
  levers: Array<{ from: Square; to: Square; san: string }>;
}

/** Can a pawn of `c` guard `s` by one push (single, or double from home)? */
function pawnGuardsSoon(g: Grid, s: Square, c: Color): boolean {
  for (const x of [fileOf(s) - 1, fileOf(s) + 1]) {
    const gs = sq(x, rankOf(s) - fwd(c));
    if (!gs || g.has(gs)) continue;
    const one = sq(x, rankOf(gs) - fwd(c));
    const u1 = one ? g.get(one) : undefined;
    if (u1 && u1.type === 'p' && u1.color === c) return true;
    if (one && !u1) {
      const two = sq(x, rankOf(gs) - 2 * fwd(c));
      const u2 = two ? g.get(two) : undefined;
      if (two && u2 && u2.type === 'p' && u2.color === c && rankOf(two) === (c === 'w' ? 2 : 7)) return true;
    }
  }
  return false;
}

function tiedGuardOf(fen: string, g: Grid, s: Square, c: Color): TiedGuard | null {
  if (pawnGuarded(g, s, c) || pawnGuardsSoon(g, s, c)) return null;
  const guards = unitsOf(g, c)
    .filter(([from, u]) => u.type !== 'p' && hits(g, u, from, s, []))
    .map(([square, u]) => ({ square, piece: u.type }));
  if (guards.length === 0) return null;
  const them = other(c);
  const board = sideToMoveAs(fen, them);
  let legal: Array<{ from: string; to: string; san: string }> | null = null;
  if (board) { try { legal = new Chess(board).moves({ verbose: true }).filter((m) => m.piece === 'p'); } catch { legal = null; } }
  const levers: TiedGuard['levers'] = [];
  for (const l of leversOn(g, s, them)) {
    const to = l.at === l.from ? s : l.at;
    const m = legal?.find((x) => x.from === l.from && x.to === to);
    if (legal && !m) continue;
    levers.push({ from: l.from, to, san: m?.san ?? `${l.from}-${to}` });
  }
  if (levers.length === 0) return null;
  return { guards, levers };
}

/** An empty square in `c`'s half that no pawn of `c` can ever guard. */
function isHoleOf(g: Grid, s: Square, c: Color): boolean {
  const r = rankOf(s);
  const inHalf = c === 'w' ? r === 3 || r === 4 : r === 5 || r === 6;
  if (!inHalf || g.has(s)) return false;
  const f = fileOf(s);
  for (const x of [f - 1, f + 1]) {
    if (x < 0 || x > 7) continue;
    if (ownPawnsOnFile(g, x, c).some((rr) => (c === 'w' ? rr < r : rr > r))) return false;
  }
  return true;
}

function assetTraits(g: Grid, s: Square, unit: Unit): AssetTrait[] {
  const c = unit.color;
  const f = fileOf(s);
  const r = rankOf(s);
  const t: AssetTrait[] = [];
  if (unit.type === 'p') {
    const passed = [f - 1, f, f + 1].every((x) => x < 0 || x > 7 || ownPawnsOnFile(g, x, other(c)).every((rr) => (c === 'w' ? rr <= r : rr >= r)));
    if (passed) t.push('passed');
  } else if (unit.type === 'n' || unit.type === 'b') {
    const deep = c === 'w' ? r >= 5 : r <= 4;
    const safe = [f - 1, f + 1].every((x) => x < 0 || x > 7 || ownPawnsOnFile(g, x, other(c)).every((rr) => (c === 'w' ? rr <= r : rr >= r)));
    if (deep && safe && pawnGuarded(g, s, c)) t.push('outpost');
  } else if (unit.type === 'r') {
    if (ownPawnsOnFile(g, f, c).length === 0) t.push('open-file');
  }
  return t;
}

// ── the ledger ───────────────────────────────────────────────────────────────

/** Who can get at a weakness: the enemy pieces that can stand hitting it
 *  within two moves, the enemy pawns that lever it, and the owner's pieces and
 *  pawns that can guard it in the same time. For a hole, "get at" is standing
 *  on it. */
export interface Access {
  attackers: Reach[];
  levers: Array<{ from: Square; at: Square }>;
  defenders: Reach[];
  pawnGuards: Square[];
}

export interface LedgerEntry {
  side: Color;
  kind: 'asset' | 'weakness';
  object: PictureObject;
  square: Square;
  /** Null for an empty square (a hole). */
  piece: PieceSymbol | null;
  traits: ReadonlyArray<WeakTrait | AssetTrait>;
  /** The facts this entry rests on — every one about this piece on this
   *  square, or this square. Never empty. */
  factIds: string[];
  /** A weakness only: who can get at it. */
  access?: Access;
  /** A pawn held only by pieces, with a lever on it: the pieces tied down and
   *  the lever moves (`TiedGuard`). */
  tied?: TiedGuard;
  /** An asset only: a passer whose next square is free, a piece on its
   *  outpost, a rook on its file — doing its job now. */
  working?: boolean;
}

export interface SideLedger {
  assets: LedgerEntry[];
  /** The weaknesses the other side can get at — the only ones that count. */
  weaknesses: LedgerEntry[];
  /** Weak, but nothing of the other side can get at it within two moves: kept
   *  in the picture, never counted. */
  unreached: LedgerEntry[];
}

export interface Ledger { fen: string; w: SideLedger; b: SideLedger }

/** The roles whose facts can name a thing that is a side's plus or minus. A
 *  move, a line, a try, a habit, theory or the game's story is about
 *  something else, and a conclusion of this file never feeds another. */
const LEDGER_ROLES: ReadonlySet<PictureRole> = new Set<PictureRole>(['asset', 'weakness', 'threat', 'resource', 'board', 'plan', 'standing']);

function accessOf(g: Grid, s: Square, owner: Color, hole: boolean): Access {
  const them = other(owner);
  if (hole) {
    // Getting at a hole is standing on it: an enemy piece that can step there
    // within two moves. Nothing of the owner's pawns can ever guard it.
    const arrivals: Reach[] = [];
    for (const [from, unit] of unitsOf(g, them)) {
      if (unit.type === 'p' || unit.type === 'k') continue;
      const s1s = stepsOf(g, unit, from);
      if (s1s.includes(s)) { arrivals.push({ from, piece: unit.type, via: null, at: s, moves: 1, route: [s], behind: false }); continue; }
      for (const s1 of s1s) {
        if (pawnHits(g, s1, owner).length > 0) continue;
        const g1 = new Map(g); g1.delete(from); g1.set(s1, unit);
        if (stepsOf(g1, unit, s1).includes(s)) { arrivals.push({ from, piece: unit.type, via: s1, at: s, moves: 2, route: [s1, s], behind: false }); break; }
      }
    }
    return { attackers: arrivals, levers: [], defenders: reachersOf(g, s, owner, [owner]), pawnGuards: [] };
  }
  return {
    attackers: reachersOf(g, s, them, [owner, them]),
    levers: leversOn(g, s, them),
    defenders: reachersOf(g, s, owner, [owner]),
    pawnGuards: pawnHits(g, s, owner),
  };
}
const reachable = (a: Access): boolean => a.attackers.length + a.levers.length > 0;

/** The ledger of a picture: each side's working assets and the weaknesses the
 *  other side can get at, each resting on the facts about it. */
export function ledgerOf(pic: PositionPicture, fen: string): Ledger | null {
  const g = gridOf(fen);
  if (!g) return null;
  const board = placement(fen);
  const about = new Map<PictureObject, string[]>();
  for (const e of pic.entries.values()) {
    if (!LEDGER_ROLES.has(e.role) || placement(e.fact.fen) !== board) continue;
    for (const o of e.objects) {
      const ids = about.get(o) ?? [];
      if (!ids.includes(e.fact.id)) ids.push(e.fact.id);
      about.set(o, ids);
    }
  }
  const out: Ledger = { fen, w: { assets: [], weaknesses: [], unreached: [] }, b: { assets: [], weaknesses: [], unreached: [] } };
  for (const [object, factIds] of about) {
    const s = object.slice(object.indexOf('@') + 1) as Square;
    const unit = g.get(s) ?? null;
    if (!unit) {
      for (const c of ['w', 'b'] as Color[]) {
        if (!isHoleOf(g, s, c)) continue;
        const access = accessOf(g, s, c, true);
        const e: LedgerEntry = { side: c, kind: 'weakness', object, square: s, piece: null, traits: ['hole'], factIds, access };
        (reachable(access) ? out[c].weaknesses : out[c].unreached).push(e);
      }
      continue;
    }
    const weak = unit.type === 'p' ? weakPawnTraits(g, s, unit.color) : unit.type === 'k' ? weakKingTraits(g, s, unit.color) : weakPieceTraits(g, s, unit);
    const tied = unit.type === 'p' ? tiedGuardOf(fen, g, s, unit.color) : null;
    if (tied) weak.push('piece-guarded');
    if (weak.length > 0) {
      const access = accessOf(g, s, unit.color, false);
      const e: LedgerEntry = { side: unit.color, kind: 'weakness', object, square: s, piece: unit.type, traits: weak, factIds, access, ...(tied ? { tied } : {}) };
      (reachable(access) ? out[unit.color].weaknesses : out[unit.color].unreached).push(e);
      continue;
    }
    const strong = assetTraits(g, s, unit);
    if (strong.length === 0) continue;
    const ahead = sq(fileOf(s), rankOf(s) + fwd(unit.color));
    const working = unit.type === 'p' ? !!ahead && !g.has(ahead) : true;
    out[unit.color].assets.push({ side: unit.color, kind: 'asset', object, square: s, piece: unit.type, traits: strong, factIds, working });
  }
  for (const c of ['w', 'b'] as Color[]) for (const k of ['assets', 'weaknesses', 'unreached'] as const) out[c][k].sort((x, y) => x.square.localeCompare(y.square));
  return out;
}

// ── the target ───────────────────────────────────────────────────────────────

export interface TargetCandidate {
  entry: LedgerEntry;
  /** Pieces that can get at it plus the levers that hit it. */
  attackers: number;
  /** How many of `attackers` are pawns (levers). */
  levers: number;
  /** Pieces and pawns that can guard it. */
  defenders: number;
  /** A pawn that cannot move on (its square ahead is taken or a pawn covers
   *  it), a piece with no safe square: it cannot run from the attack. */
  fixed: boolean;
}

export interface Target {
  attacker: Color;
  best: TargetCandidate;
  /** The next most vulnerable, the one it was compared against. */
  runnerUp: TargetCandidate | null;
  /** Every candidate weighed, most vulnerable first. */
  candidates: TargetCandidate[];
}

function candidateOf(g: Grid, e: LedgerEntry): TargetCandidate {
  const a = e.access as Access;
  const attackers = new Set([...a.attackers.map((r) => r.from), ...a.levers.map((l) => l.from)]).size;
  const defenders = new Set([...a.defenders.map((r) => r.from), ...a.pawnGuards]).size;
  let fixed = false;
  if (e.piece === 'p') {
    const ahead = sq(fileOf(e.square), rankOf(e.square) + fwd(e.side));
    fixed = !ahead || g.has(ahead) || pawnHits(g, ahead, other(e.side)).length > 0;
  } else if (e.piece && e.piece !== 'k') {
    fixed = e.traits.includes('no-safe-square');
  }
  return { entry: e, attackers, levers: new Set(a.levers.map((l) => l.from)).size, defenders, fixed };
}
const vulnerability = (c: TargetCandidate): number => (c.attackers - c.defenders) * 10 + (c.fixed ? 5 : 0) + c.entry.traits.length;

/** The most vulnerable weakness of the other side that `attacker` can get
 *  at: more pieces and levers to reach it than guards to hold it, compared
 *  with every other candidate. Null when no weakness is outnumbered — a
 *  target needs the attackers to outnumber the defenders. A king is a
 *  target for an attack, not for winning, so it is never the pick here. */
export function targetOf(led: Ledger, attacker: Color): Target | null {
  const g = gridOf(led.fen);
  if (!g) return null;
  const cands = led[other(attacker)].weaknesses.filter((e) => e.piece !== 'k').map((e) => candidateOf(g, e));
  cands.sort((x, y) => vulnerability(y) - vulnerability(x) || x.entry.square.localeCompare(y.entry.square));
  // A piece with a safe square is no target: it steps away from the siege
  // (gotham-jelena g4: "Aim at the bishop on f5" said beside the kick that
  // sends it home). A pawn, a hole, or a piece with nowhere to go stays put.
  const live = cands.filter((c) => c.attackers > c.defenders && (c.entry.piece === null || c.entry.piece === 'p' || c.fixed));
  if (live.length === 0) return null;
  return { attacker, best: live[0], runnerUp: cands.find((c) => c !== live[0]) ?? null, candidates: cands };
}

// ── the plan's target: a race of up to four moves ───────────────────────────

/** How far the plan looks: the moves a piece may take to reach a weakness. */
export const PLAN_MOVES = 4;

/** Every piece of `by` (pawns apart; the king only where `reachersOf` already
 *  counts it) that can stand hitting `target` within `PLAN_MOVES` moves: its
 *  two-move reach where it has one, else its quiet route (`bfsRoute`, empty
 *  squares only, every stop free of the other side's pawns). */
function planReachersOf(fen: string, g: Grid, target: Square, by: Color, through: readonly Color[]): Reach[] {
  // The pieces go in the order they arrive, each placed on its square before
  // the next is routed: two pieces never share a square, and a line that runs
  // through a piece placed earlier sees it there.
  const near = new Map(reachersOf(g, target, by, through).map((r) => [r.from, r]));
  const order = unitsOf(g, by)
    .filter(([from, u]) => u.type !== 'p' && from !== target && (u.type !== 'k' || near.has(from)))
    .map(([from, u]) => ({ from, unit: u, first: near.get(from)?.moves ?? PLAN_MOVES + 1 }))
    .sort((x, y) => x.first - y.first || VALUE[y.unit.type] - VALUE[x.unit.type] || x.from.localeCompare(y.from));
  const work: Grid = new Map(g);
  const out: Reach[] = [];
  const hitOn = (gg: Grid, unit: Unit, s: Square): { ok: boolean; behind: boolean } => {
    if (hits(gg, unit, s, target, [])) return { ok: true, behind: false };
    return through.length > 0 && hits(gg, unit, s, target, through) ? { ok: true, behind: true } : { ok: false, behind: false };
  };
  const place = (r: Reach, unit: Unit): void => { work.delete(r.from); work.set(r.at, unit); out.push(r); };
  for (const { from, unit } of order) {
    const now = hitOn(work, unit, from);
    if (now.ok) { place({ from, piece: unit.type, via: null, at: from, moves: 0, route: [], behind: now.behind }, unit); continue; }
    // The two-move reach (it may capture on the way) while its square is free.
    const two = near.get(from);
    if (two && two.moves > 0 && two.route.every((s) => work.get(s)?.color !== by)) {
      const gg = new Map(work); gg.delete(from); gg.set(two.at, unit);
      const h = hitOn(gg, unit, two.at);
      if (h.ok) { place({ ...two, behind: h.behind }, unit); continue; }
    }
    if (unit.type === 'k') continue;
    let behind = false;
    const found = bfsRoute(fenOf(work, fen), from, (_c, s) => {
      const gg = new Map(work);
      gg.delete(from);
      gg.set(s, unit);
      const h = hitOn(gg, unit, s);
      behind = h.behind;
      return h.ok;
    }, PLAN_MOVES, (_c, s) => s !== target && pawnHits(work, s, other(by)).length === 0);
    if (!found) continue;
    const route = found.route;
    place({ from, piece: unit.type, via: route.length > 1 ? route[route.length - 2] : null, at: found.target, moves: route.length, route, behind }, unit);
  }
  // A piece placed early whose line a later arrival now blocks no longer hits.
  return out.filter((r) => {
    const unit = work.get(r.at) as Unit;
    return hitOn(work, unit, r.at).ok;
  });
}

/** A FEN for a grid: its pieces, the rest of `fen` kept. */
function fenOf(g: Grid, fen: string): string {
  const rows: string[] = [];
  for (let r = 8; r >= 1; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const u = g.get(sq(f, r) as Square);
      if (!u) { empty++; continue; }
      if (empty) { row += String(empty); empty = 0; }
      row += u.color === 'w' ? u.type.toUpperCase() : u.type;
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  const parts = fen.split(' ');
  return `${rows.join('/')} ${parts[1] ?? 'w'} - - ${parts[4] ?? '0'} ${parts[5] ?? '1'}`;
}

/** The pawns of `by` that hit `target` now or after one or two clear pushes,
 *  with the pushes it takes — a lever for the attacker, a guard for the owner. */
function pawnArrivals(g: Grid, target: Square, by: Color): Array<{ from: Square; at: Square; moves: number }> {
  return leversOn(g, target, by).map((l) => ({ ...l, moves: Math.abs(rankOf(l.at) - rankOf(l.from)) }));
}

/** One weakness raced: how many units each side has on it, move by move. */
export interface PlanRace {
  entry: LedgerEntry;
  /** The attackers outnumber the guards at `horizon`. */
  won: boolean;
  /** Won: the move count the attackers first outnumber the guards at. Lost:
   *  `PLAN_MOVES`, the count the race was read to. */
  horizon: number;
  /** Units of the attacker on it by then (pieces and levers). */
  attackers: number;
  /** Units of the owner guarding it by then (pieces and pawns), in the same
   *  number of moves. */
  defenders: number;
  /** Won: the piece whose arrival wins the race, and its way there. */
  decisive: Reach | null;
  attackerReach: Reach[];
  defenderReach: Reach[];
}

export interface PlanTarget {
  attacker: Color;
  best: PlanRace;
  /** Every race the attacker wins in three or four moves, best first. */
  races: PlanRace[];
}

/** The race on one weakness: at each move count from 0 to `PLAN_MOVES`, the
 *  attacker's pieces and levers that can be on it against the owner's pieces
 *  and pawns that can guard it in the SAME number of moves. */
function raceOf(fen: string, g: Grid, e: LedgerEntry, attacker: Color): PlanRace {
  const owner = e.side;
  const atk = planReachersOf(fen, g, e.square, attacker, [owner, attacker]);
  const def = planReachersOf(fen, g, e.square, owner, [owner]);
  const levers = pawnArrivals(g, e.square, attacker);
  const guards = pawnArrivals(g, e.square, owner);
  const count = (k: number): [number, number] => [
    atk.filter((r) => r.moves <= k).length + levers.filter((l) => l.moves <= k).length,
    def.filter((r) => r.moves <= k).length + guards.filter((l) => l.moves <= k).length,
  ];
  for (let k = 0; k <= PLAN_MOVES; k++) {
    const [a, d] = count(k);
    if (a <= d) continue;
    // The piece whose arrival tips it: one arriving on this move, the most
    // valuable first; a race a lever tips is named by the piece that came last.
    const arriving = atk.filter((r) => r.moves === k).sort((x, y) => VALUE[y.piece] - VALUE[x.piece] || x.from.localeCompare(y.from));
    const decisive = arriving[0] ?? [...atk].filter((r) => r.moves <= k).sort((x, y) => y.moves - x.moves || x.from.localeCompare(y.from))[0] ?? null;
    return { entry: e, won: decisive !== null, horizon: k, attackers: a, defenders: d, decisive, attackerReach: atk, defenderReach: def };
  }
  const [a, d] = count(PLAN_MOVES);
  return { entry: e, won: false, horizon: PLAN_MOVES, attackers: a, defenders: d, decisive: null, attackerReach: atk, defenderReach: def };
}

/** Every pawn or piece of the other side `attacker` could go after with a
 *  plan (reached within two moves or not), raced. Holes and the king are not
 *  things to win, so never raced. */
export function planRacesOf(led: Ledger, attacker: Color): PlanRace[] {
  const g = gridOf(led.fen);
  if (!g) return [];
  const side = led[other(attacker)];
  return side.weaknesses.concat(side.unreached)
    .filter((e) => e.piece !== null && e.piece !== 'k')
    .map((e) => raceOf(led.fen, g, e, attacker))
    .sort((x, y) => x.entry.square.localeCompare(y.entry.square));
}

/** The plan's target: the weakness of the other side `attacker` wins a race
 *  on in three or four moves (a race won within two is the target now,
 *  `targetOf`). The guards get the same moves as the attackers; a race the
 *  counts do not show is never claimed. */
export function planTargetOf(led: Ledger, attacker: Color): PlanTarget | null {
  const races = planRacesOf(led, attacker).filter((r) => r.won && r.horizon > 2);
  if (races.length === 0) return null;
  races.sort((x, y) => (y.attackers - y.defenders) - (x.attackers - x.defenders) || x.horizon - y.horizon || x.entry.square.localeCompare(y.entry.square));
  return { attacker, best: races[0], races };
}

// ── the counterplay ──────────────────────────────────────────────────────────

export interface Counterplay {
  side: Color;
  /** A pawn break, or a piece move that makes a threat. */
  kind: 'break' | 'piece';
  /** The unit that moves: 'p' for a break. */
  piece: PieceSymbol;
  /** The unit, the square it goes to, and what it hits there. */
  from: Square;
  to: Square;
  hits: Square[];
  /** What stands on each of `hits` ('k': a mate threat), in order. */
  hitPieces: PieceSymbol[];
  /** `alive`: the best line plays it; `dead`: a move in the best line stops
   *  it before it is played; `unsettled`: the line does neither (never said). */
  state: 'alive' | 'dead' | 'unsettled';
  /** The ply of the best line it is played on (alive) or stopped on (dead). */
  ply: number | null;
  /** The move that stops it, UCI (dead). */
  stoppedBy: string | null;
  /** The facts that name the break: about its pawn, or the square it goes to. */
  factIds: string[];
}

/** The pawn breaks `side` has: a push or a pawn capture after which the pawn
 *  hits a pawn of the other side (a lever). */
function breaksOf(g: Grid, side: Color): Array<{ from: Square; to: Square; hits: Square[] }> {
  const out: Array<{ from: Square; to: Square; hits: Square[] }> = [];
  const start = side === 'w' ? 2 : 7;
  for (const [from, unit] of unitsOf(g, side)) {
    if (unit.type !== 'p') continue;
    const dests: Square[] = [];
    const one = sq(fileOf(from), rankOf(from) + fwd(side));
    if (one && !g.has(one)) {
      dests.push(one);
      const two = sq(fileOf(from), rankOf(from) + 2 * fwd(side));
      if (rankOf(from) === start && two && !g.has(two)) dests.push(two);
    }
    for (const df of [-1, 1]) {
      const cap = sq(fileOf(from) + df, rankOf(from) + fwd(side));
      const u = cap ? g.get(cap) : undefined;
      if (cap && u && u.color !== side && u.type === 'p') dests.push(cap);
    }
    for (const to of dests) {
      const g1 = new Map(g); g1.delete(from); g1.set(to, unit);
      const hitList: Square[] = [];
      for (const df of [-1, 1]) {
        const t = sq(fileOf(to) + df, rankOf(to) + fwd(side));
        const u = t ? g1.get(t) : undefined;
        if (t && u && u.color !== side && u.type === 'p') hitList.push(t);
      }
      const took = g.get(to);
      if (took && took.type === 'p') hitList.unshift(to);
      if (hitList.length > 0) out.push({ from, to, hits: hitList });
    }
  }
  return out;
}

/** What a move of `side` newly threatens: the other side's units it wins on
 *  its next move that it did not before (the one must-defend read), and its
 *  king when a mate threat appears. `before` and `after` are the boards
 *  around the move. */
// THE THREAT READS, ONCE PER BOARD (phone cost 2026-11-19): every quiet move
// of every piece reads the same board BEFORE it, and the line walk reads the
// same line boards for every candidate, so the two pure reads are kept by
// board and side. Same answers: both are pure functions of (fen, side).
const MUST = new Map<string, Set<string>>();
const MUST_LIST = new Map<string, Array<{ square: Square; piece: PieceSymbol }>>();
const MATES = new Map<string, boolean>();
const READ_KEEP = 4000;
function keep<V>(m: Map<string, V>, k: string, v: V): V {
  if (m.size >= READ_KEEP) m.clear();
  m.set(k, v);
  return v;
}
function mustDefendOf(fen: string, side: Color): Array<{ square: Square; piece: PieceSymbol }> {
  const k = `${fen}|${side}`;
  return MUST_LIST.get(k) ?? keep(MUST_LIST, k, mustDefendPieces(fen, side).map((p) => ({ square: p.square as Square, piece: p.piece as PieceSymbol })));
}
function mustSquaresOf(fen: string, side: Color): Set<string> {
  const k = `${fen}|${side}`;
  return MUST.get(k) ?? keep(MUST, k, new Set(mustDefendOf(fen, side).map((p) => p.square)));
}
function mateThreatOn(fen: string, side: Color): boolean {
  const k = `${fen}|${side}`;
  const hit = MATES.get(k);
  return hit ?? keep(MATES, k, hasMateThreat(fen, side));
}

function newThreatsOf(before: string, after: string, side: Color): Array<{ square: Square; piece: PieceSymbol }> {
  const foe = other(side);
  const was = mustSquaresOf(before, foe);
  const out = mustDefendOf(after, foe)
    .filter((p) => !was.has(p.square))
    .map((p) => ({ square: p.square, piece: p.piece }));
  if (mateThreatOn(after, foe) && !mateThreatOn(before, foe)) {
    const king = gridOf(after);
    const k = king ? [...king].find(([, u]) => u.type === 'k' && u.color === foe)?.[0] : undefined;
    if (k) out.push({ square: k, piece: 'k' });
  }
  return out;
}

/** The threat `side`'s piece on `from` makes by a quiet move to `to` on
 *  `fen` (handed the move when it is not theirs): null when the move is not
 *  there, captures, leaves the piece itself to be taken, or threatens
 *  nothing new. */
const THREATS = new Map<string, Array<{ square: Square; piece: PieceSymbol }> | null>();
function pieceThreat(fen: string, from: Square, to: Square, side: Color): Array<{ square: Square; piece: PieceSymbol }> | null {
  const k = `${fen}|${from}${to}|${side}`;
  if (THREATS.has(k)) return THREATS.get(k) ?? null;
  return keep(THREATS, k, pieceThreatRead(fen, from, to, side));
}
// One parsed board per (board, side): each candidate move is played on it
// and taken back, never re-parsed.
const SIDE_BOARDS = new Map<string, { fen: string; c: Chess } | null>();
function sideBoard(fen: string, side: Color): { fen: string; c: Chess } | null {
  const k = `${fen}|${side}`;
  if (SIDE_BOARDS.has(k)) return SIDE_BOARDS.get(k) ?? null;
  const board = sideToMoveAs(fen, side);
  let v: { fen: string; c: Chess } | null = null;
  if (board) { try { v = { fen: board, c: new Chess(board) }; } catch { v = null; } }
  return keep(SIDE_BOARDS, k, v);
}
function pieceThreatRead(fen: string, from: Square, to: Square, side: Color): Array<{ square: Square; piece: PieceSymbol }> | null {
  const sb = sideBoard(fen, side);
  if (!sb) return null;
  const { c, fen: board } = sb;
  // The move without its notation (a SAN read plays every reply): the same
  // board after, the same fields read.
  const m = liteMoves(c, { square: from }).find((x) => x.to === to);
  if (!m) return null;
  if (m.captured || m.piece === 'p' || m.piece === 'k') return null;
  makeLite(c, m);
  try {
    if (c.inCheck()) return null;
    const after = c.fen();
    // Does the piece just drop there? The must-defend read of `side` on this
    // board (the other side to move) holds `to` exactly when the exchange
    // there wins it — read for that one square, not every piece on the board.
    if (legalSeeGainOn(c, to) > 0) return null;
    const t = newThreatsOf(board, after, side);
    return t.length > 0 ? t : null;
  } finally {
    undoLite(c);
  }
}

/** `side`'s piece counterplay: every quiet move of a knight, bishop, rook or
 *  queen that makes a new threat and does not just drop the piece. Alive when
 *  the best line plays it; dead when a move of the
 *  other side in the line takes the threat away first; otherwise unsettled.
 *  Kept only alive or named by a fact (the piece, or the square it goes to). */
function pieceCounterplay(pic: PositionPicture, fen: string, pv: readonly string[], side: Color): Counterplay[] {
  const board = sideToMoveAs(fen, side);
  if (!board) return [];
  let c: Chess;
  try { c = new Chess(board); } catch { return []; }
  const here = placement(fen);
  const out: Counterplay[] = [];
  for (const m of liteMoves(c)) {
    if (m.piece === 'p' || m.piece === 'k' || m.captured) continue;
    const from = m.from;
    const to = m.to;
    const threat = pieceThreat(fen, from, to, side);
    if (!threat) continue;
    const hitSquares = threat.map((t) => t.square);
    // The facts it rests on, each through a computed link: about the piece,
    // about the square it goes to, or about a unit its threat hits.
    const hitObjects = threat.filter((t) => t.piece !== 'k').map((t) => `${other(side)}${t.piece.toUpperCase()}@${t.square}`);
    const factIds: string[] = [];
    for (const e of pic.entries.values()) {
      if (!LEDGER_ROLES.has(e.role) || placement(e.fact.fen) !== here) continue;
      const aboutPiece = e.objects.includes(`${side}${m.piece.toUpperCase()}@${from}`);
      const aboutSquare = (e.role === 'resource' || e.role === 'plan' || e.role === 'board') && e.objects.includes(`-@${to}`);
      const aboutHit = hitObjects.some((o) => e.objects.includes(o));
      if ((aboutPiece || aboutSquare || aboutHit) && !factIds.includes(e.fact.id)) factIds.push(e.fact.id);
    }
    const played = pv.some((u) => u.slice(0, 2) === from);
    if (!played && factIds.length === 0) continue;
    let state: Counterplay['state'] = 'unsettled';
    let ply: number | null = null;
    let stoppedBy: string | null = null;
    let line: Chess;
    try { line = new Chess(fen); } catch { continue; }
    for (let i = 0; i < pv.length; i++) {
      const u = pv[i];
      const mover = line.turn();
      // The piece moves in the line: this move (alive), or another, which is
      // its own candidate and leaves this one unsettled.
      if (mover === side && u.slice(0, 2) === from) {
        if (u.slice(2, 4) === to) { state = 'alive'; ply = i; }
        break;
      }
      const open = mover !== side && factIds.length > 0 && !!pieceThreat(line.fen(), from, to, side)?.some((t) => hitSquares.includes(t.square));
      // chess.js's own match, without the notation: the first legal move from
      // and to these squares, a promotion only to the piece named.
      const step = liteMoves(line, { square: u.slice(0, 2) as Square }).find((x) => x.to === u.slice(2, 4) && (!x.promotion || x.promotion === u[4]));
      if (!step) break;
      makeLite(line, step);
      if (open && !pieceThreat(line.fen(), from, to, side)?.some((t) => hitSquares.includes(t.square))) { state = 'dead'; ply = i; stoppedBy = u; break; }
    }
    if (state === 'alive' || factIds.length > 0) {
      out.push({ side, kind: 'piece', piece: m.piece, from, to, hits: hitSquares, hitPieces: threat.map((t) => t.piece), state, ply, stoppedBy, factIds });
    }
  }
  return out;
}

/** Can `side` still play the break on `g` — the pawn there, the square free,
 *  a pawn still to hit — and does it not just drop the pawn? */
function breakOpen(g: Grid, br: { from: Square; to: Square }, side: Color, captures: boolean): boolean {
  const p = g.get(br.from);
  if (!p || p.type !== 'p' || p.color !== side) return false;
  const at = g.get(br.to);
  if (captures ? !at || at.color === side : !!at) return false;
  if (!captures && Math.abs(rankOf(br.to) - rankOf(br.from)) === 2) {
    const mid = sq(fileOf(br.from), rankOf(br.from) + fwd(side));
    if (mid && g.has(mid)) return false;
  }
  const g1 = new Map(g); g1.delete(br.from); g1.set(br.to, p);
  // Still a lever: there, it hits a pawn of the other side.
  const hit = [-1, 1].map((df) => sq(fileOf(br.to) + df, rankOf(br.to) + fwd(side))).filter((t): t is Square => {
    const u = t ? g1.get(t) : undefined;
    return !!u && u.type === 'p' && u.color !== side;
  });
  if (!captures && hit.length === 0) return false;
  // Taken by the pawn it hits is the break's own exchange, never a loss.
  const g2 = new Map(g1);
  for (const t of hit) g2.delete(t);
  return attackCount(g2, br.to, other(side)) <= attackCount(g2, br.to, side);
}

/** `side`'s one resource: the pawn break the best line plays (alive), or one
 *  a fact names that a move of the best line stops (dead); a break the line
 *  leaves alone is `unsettled`. Null when `side` has no break that the line
 *  plays or a fact names. */
export function counterplayOf(pic: PositionPicture, fen: string, lines: readonly EngineLine[], side: Color): Counterplay | null {
  return counterplaysOf(pic, fen, lines, side)[0] ?? null;
}

/** Every resource of `side` worth weighing — pawn breaks and piece threats
 *  the best line plays or a fact names — the one `counterplayOf` picks first. */
export function counterplaysOf(pic: PositionPicture, fen: string, lines: readonly EngineLine[], side: Color): Counterplay[] {
  const g = gridOf(fen);
  if (!g) return [];
  const board = placement(fen);
  const breaks = breaksOf(g, side);
  const pv = lines[0]?.moves ?? [];
  const found: Counterplay[] = [];
  for (const br of breaks) {
    const captures = !!g.get(br.to);
    const factIds: string[] = [];
    for (const e of pic.entries.values()) {
      if (!LEDGER_ROLES.has(e.role) || placement(e.fact.fen) !== board) continue;
      const aboutPawn = e.objects.includes(`${side}P@${br.from}`);
      const aboutSquare = (e.role === 'resource' || e.role === 'plan' || e.role === 'board') && e.objects.includes(`-@${br.to}`);
      if ((aboutPawn || aboutSquare) && !factIds.includes(e.fact.id)) factIds.push(e.fact.id);
    }
    let state: Counterplay['state'] = 'unsettled';
    let ply: number | null = null;
    let stoppedBy: string | null = null;
    // Walk the best line: the break played (alive), or a move of the other
    // side after which it no longer works (dead), whichever comes first.
    let cur: Grid = new Map(g);
    let mover: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w';
    for (let i = 0; i < pv.length; i++) {
      const u = pv[i];
      const from = u.slice(0, 2) as Square;
      const to = u.slice(2, 4) as Square;
      const unit = cur.get(from);
      if (!unit) break;
      if (mover === side && unit.type === 'p' && to === br.to && fileOf(from) === fileOf(br.from)) { state = 'alive'; ply = i; break; }
      const next: Grid = new Map(cur);
      next.delete(from);
      next.set(to, u.length > 4 ? { type: u[4] as PieceSymbol, color: unit.color } : unit);
      if (unit.type === 'k' && Math.abs(fileOf(to) - fileOf(from)) === 2) {
        const rook = sq(fileOf(to) > fileOf(from) ? 7 : 0, rankOf(from));
        const rTo = sq(fileOf(to) > fileOf(from) ? 5 : 3, rankOf(from));
        const r = rook ? next.get(rook) : undefined;
        if (rook && rTo && r) { next.delete(rook); next.set(rTo, r); }
      }
      if (mover !== side && breakOpen(cur, br, side, captures) && !breakOpen(next, br, side, captures)) { state = 'dead'; ply = i; stoppedBy = u; break; }
      cur = next;
      mover = other(mover);
    }
    if (state === 'alive' || factIds.length > 0) found.push({ side, kind: 'break', piece: 'p', from: br.from, to: br.to, hits: br.hits, hitPieces: br.hits.map(() => 'p'), state, ply, stoppedBy, factIds });
  }
  found.push(...pieceCounterplay(pic, fen, pv, side));
  const rank = (c: Counterplay): number => (c.state === 'alive' ? 1000 - (c.ply ?? 0) : c.state === 'dead' ? 500 : 0) + c.factIds.length * 10;
  found.sort((x, y) => rank(y) - rank(x) || x.to.localeCompare(y.to));
  return found;
}

// ── the conclusions together, for the verdict half ───────────────────────────

export interface PictureConclusions {
  ledger: Ledger;
  /** Each side's one resource. */
  counterplay: Record<Color, Counterplay | null>;
  /** The target each side, attacking, would go for now (within two moves). */
  target: Record<Color, Target | null>;
  /** The target each side's plan goes for: a race won in three or four moves. */
  planTarget: Record<Color, PlanTarget | null>;
}

/** The facts this file reads: on this board, and none of the conclusions'
 *  own (a conclusion never feeds another). */
export function pictureOfBoard(facts: readonly CoachFact[], fen: string): PositionPicture {
  const board = placement(fen);
  return buildPicture(facts.filter((f) => placement(f.fen) === board && !CONCLUSION_COMPUTERS.has(f.computer)));
}
export const CONCLUSION_COMPUTERS: ReadonlySet<string> = new Set(['pictureLedger', 'pictureCounterplay', 'pictureTarget']);

const LAST = new WeakMap<readonly CoachFact[], { fen: string; lines: readonly EngineLine[]; out: PictureConclusions | null }>();

/** The ledger, both sides' counterplay and both sides' target, from the facts
 *  read on `fen` and the engine's lines there (best first, White's seat). The
 *  three registry reads of one fact set share one computation. */
export function pictureConclusions(facts: readonly CoachFact[], fen: string, lines: readonly EngineLine[]): PictureConclusions | null {
  const hit = LAST.get(facts);
  if (hit && hit.fen === fen && hit.lines === lines) return hit.out;
  const out = computeConclusions(facts, fen, lines);
  LAST.set(facts, { fen, lines, out });
  return out;
}

/** The ledger alone (the registry's `pictureLedger`). */
export function pictureLedger(facts: readonly CoachFact[], fen: string, lines: readonly EngineLine[]): Ledger | null {
  return pictureConclusions(facts, fen, lines)?.ledger ?? null;
}

/** One side's one resource (the registry's `pictureCounterplay`). */
export function pictureCounterplay(facts: readonly CoachFact[], fen: string, lines: readonly EngineLine[], side: Color): Counterplay | null {
  return pictureConclusions(facts, fen, lines)?.counterplay[side] ?? null;
}

/** The target and the plan's target one side, attacking, goes for (the
 *  registry's `pictureTarget`). */
export function pictureTarget(facts: readonly CoachFact[], fen: string, lines: readonly EngineLine[], attacker: Color): { now: Target | null; plan: PlanTarget | null } | null {
  const c = pictureConclusions(facts, fen, lines);
  return c ? { now: c.target[attacker], plan: c.planTarget[attacker] } : null;
}

function computeConclusions(facts: readonly CoachFact[], fen: string, lines: readonly EngineLine[]): PictureConclusions | null {
  const pic = pictureOfBoard(facts, fen);
  const ledger = ledgerOf(pic, fen);
  if (!ledger) return null;
  return {
    ledger,
    counterplay: { w: counterplayOf(pic, fen, lines, 'w'), b: counterplayOf(pic, fen, lines, 'b') },
    target: { w: targetOf(ledger, 'w'), b: targetOf(ledger, 'b') },
    planTarget: { w: planTargetOf(ledger, 'w'), b: planTargetOf(ledger, 'b') },
  };
}

// ── the words, said like a person at the board ───────────────────────────────

/** A thing on the ledger, named once with "the": the sentence it sits in
 *  already says whose it is. */
function assetPhrase(e: LedgerEntry): string {
  const name = `the ${NAME[e.piece as PieceSymbol]} on ${e.square}`;
  if (e.traits.includes('passed')) return `the passed pawn on ${e.square}`;
  if (e.traits.includes('outpost')) return `${name}, on an outpost no pawn can kick`;
  if (e.traits.includes('open-file')) return `${name}, on a file free of its own pawns`;
  return name;
}

function weakPhrase(e: LedgerEntry): string {
  if (e.piece === null) return `the hole on ${e.square}`;
  const name = `the ${NAME[e.piece]} on ${e.square}`;
  if (e.piece === 'k') return e.traits.includes('king-centre') ? 'the king, still in the centre' : 'the king, with an open file beside it';
  if (e.traits.includes('no-safe-square')) return `${name}, which has no safe square`;
  if (e.traits.includes('isolated')) return `the isolated pawn on ${e.square}`;
  if (e.traits.includes('backward')) return `the backward pawn on ${e.square}`;
  if (e.traits.includes('doubled')) return `the doubled pawn on ${e.square}`;
  if (e.tied) return `${name}, held only by ${andList(e.tied.guards.map((x) => `the ${NAME[x.piece]} on ${x.square}`))}`;
  return name;
}

/** The ledger in words: each side's working pluses, then what the other side
 *  can get at. One idea a sentence; the student's side first. */
export function ledgerText(led: Ledger, student: Color): string | null {
  const key = stemKeyOf(led.fen);
  const out: string[] = [];
  for (const c of [student, other(student)]) {
    const working = led[c].assets.filter((e) => e.working);
    const weak = led[c].weaknesses;
    const mine = c === student;
    if (working.length > 0) {
      const list = andList(working.map(assetPhrase));
      out.push(mine
        ? rotateStem([`On your side of the ledger: ${list}.`, `What is working for you: ${list}.`], key)
        : rotateStem([`On their side: ${list}.`, `What is working for them: ${list}.`], key));
    }
    if (weak.length > 0) {
      // NAME WHAT MATTERS, LIGHT THE REST (the human-voice rule: "the hole on
      // c6, …, h5" read out is a score sheet). One weakness is named; more are
      // counted and the most vulnerable is named — every one stays lit on the
      // board (`ledgerSquares`).
      const worst = worstWeakness(led.fen, weak);
      if (weak.length === 1) {
        out.push(mine
          ? rotateStem([`They can get at your weak spot: ${weakPhrase(worst)}.`, `Your weak spot they can reach is ${weakPhrase(worst)}.`], key)
          : rotateStem([`You can get at their weak spot: ${weakPhrase(worst)}.`, `Their weak spot you can reach is ${weakPhrase(worst)}.`], key));
      } else {
        const n = countWord(weak.length);
        out.push(mine
          ? rotateStem([`They can get at ${n} of your weak spots. The worst is ${weakPhrase(worst)}.`, `${n} of your weak spots are in their reach. The worst is ${weakPhrase(worst)}.`], key)
          : rotateStem([`You can get at ${n} of their weak spots. The worst is ${weakPhrase(worst)}.`, `${n} of their weak spots are in your reach. The worst is ${weakPhrase(worst)}.`], key));
      }
    }
  }
  if (out.length === 0) return null;
  return out.map(openSentence).join(' ');
}

/** The weakness that matters most: the most vulnerable by the target's own
 *  comparison (attackers against guards, can it run) — a king counted too. */
function worstWeakness(fen: string, weak: readonly LedgerEntry[]): LedgerEntry {
  const g = gridOf(fen);
  if (!g) return weak[0];
  const ranked = weak.map((e) => candidateOf(g, e)).sort((x, y) => vulnerability(y) - vulnerability(x) || x.entry.square.localeCompare(y.entry.square));
  return ranked[0].entry;
}

const many = (n: number): string => countWord(n);

/** The target in words, with the comparison that chose it. */
export function targetText(t: Target, student: Color, now: boolean = false): string {
  const mine = t.attacker === student;
  const thing = (c: TargetCandidate): string => (c.entry.piece === null ? `the hole on ${c.entry.square}` : `the ${NAME[c.entry.piece]} on ${c.entry.square}`);
  const units = t.best.levers > 0 ? 'pieces and pawns' : 'pieces';
  const atk = mine ? `of your ${units}` : `of their ${units}`;
  const def = mine ? 'of theirs' : 'of yours';
  const why = `${many(t.best.attackers)} ${atk} can get at it, and only ${many(t.best.defenders)} ${def} can guard it`;
  const key = stemKeyOf(`${t.best.entry.object}|${t.attacker}`);
  // Said as the NEW target (`now`), the lead says it changed: "The target is
  // now the pawn on d6" (the game's story, `planThread.tellPictureFacts`).
  const lead = now ? (mine ? 'The target is now' : 'Their target is now')
    : mine ? rotateStem(['The target is', 'Aim at'], key) : rotateStem(['Their target is', 'They will aim at'], key);
  const ru = t.runnerUp;
  if (ru) return `${lead} ${thing(t.best)}, not ${thing(ru)}: ${why}.`;
  return `${lead} ${thing(t.best)}: ${why}.`;
}

/** The plan's target in words: the piece that wins the race and its way
 *  there, then the count that wins it. */
export function planTargetText(p: PlanTarget, student: Color): string | null {
  const r = p.best;
  const d = r.decisive;
  if (!r.won || !d || r.entry.piece === null) return null;
  const mine = p.attacker === student;
  const thing = `${mine ? 'their' : 'your'} ${NAME[r.entry.piece]} on ${r.entry.square}`;
  const way = d.route.length <= 1 ? `to ${d.at}` : `by ${andList(d.route.slice(0, -1))} to ${d.at}`;
  const key = stemKeyOf(`${r.entry.object}|${p.attacker}|plan`);
  const owner = mine ? 'Your' : 'Their';
  const head = rotateStem([`${owner} ${NAME[d.piece]} can go ${way} and hit ${thing}.`, `${owner} ${NAME[d.piece]} has a way to ${thing}: ${way.replace(/^to /, '')}.`], key);
  const pieces = r.attackerReach.filter((x) => x.moves <= r.horizon).length;
  const units = pieces < r.attackers ? 'pieces and pawns' : 'pieces';
  const atk = `${countWord(r.attackers)} of ${mine ? 'your' : 'their'} ${units} ${r.attackers === 1 ? 'reaches' : 'reach'} it`;
  const guard = r.defenders === 0
    ? `${mine ? 'they have' : 'you have'} nothing that can guard it in time`
    : `${mine ? 'they' : 'you'} can only bring ${countWord(r.defenders)} to guard it`;
  return `${head} In ${countWord(r.horizon)} moves ${atk}, and ${guard}.`;
}

/** Does `uci` start the plan: a move of a piece on its way to the target? */
export function moveWorksOnPlan(p: PlanTarget, uci: string | undefined): boolean {
  if (!uci) return false;
  return p.best.attackerReach.some((r) => r.moves > 0 && r.from === uci.slice(0, 2) && r.route[0] === uci.slice(2, 4));
}

/** The counterplay in words — said only alive or dead. */
export function counterplayText(c: Counterplay, student: Color, fen: string, lines: readonly EngineLine[]): string | null {
  if (c.state === 'unsettled') return null;
  const mine = c.side === student;
  const whose = mine ? 'their' : 'your';
  const hitWords = (i: number): string => (c.hitPieces[i] === 'k' ? `${whose} king with mate` : `${whose} ${NAME[c.hitPieces[i]]} on ${c.hits[i]}`);
  const hit = andList(c.hits.map((_, i) => hitWords(i)));
  const owner = mine ? 'Your' : 'Their';
  const key = stemKeyOf(c.kind === 'break' ? `${placement(fen)}|${c.to}` : `${placement(fen)}|${c.from}${c.to}`);
  const head = c.kind === 'break' ? breakWords(c, fen, owner, whose, hitWords, key)
    : rotateStem([`${owner} ${NAME[c.piece]} can come to ${c.to} and hit ${hit}.`, `${owner} resource is the ${NAME[c.piece]} on ${c.from}: from ${c.to} it hits ${hit}.`], key);
  if (c.state === 'alive') return `${head} ${rotateStem(['It is coming: the best line plays it.', 'Nothing stops it in the best line.'], key)}`;
  // THE STOPPER IS NAMED AS ITS SIDE'S MOVE, and only a move of the side it
  // is stopped for (puzzle reads 2026-11-20: "their
  // bishop can come to h5 … But it is dead: after h5 it no longer works" —
  // …h5 said bare, read as the bishop's own square).
  const ply = c.ply ?? 0;
  const stopperSide: Color = (ply % 2 === 0) === (fen.split(' ')[1] === 'w') ? 'w' : 'b';
  const stopper = c.stoppedBy && stopperSide !== c.side ? sanOf(fen, lines[0]?.moves ?? [], ply) : null;
  return `${head} ${stopper ? `But ${stopperSide === student ? 'your' : 'their'} ${stopperSide === 'b' ? '…' : ''}${stopper} stops it.` : 'But the best line stops it.'}`;
}

/** A pawn break in words, named by its move (chess.js): a push goes TO an
 *  empty square and hits the pawns beside it; a capture TAKES the pawn on the
 *  square it lands on ("…dxe4, taking your pawn on e4"), never a push onto a
 *  square a pawn stands on. */
function breakWords(c: Counterplay, fen: string, owner: string, whose: string, hitWords: (i: number) => string, key: number): string {
  const takes = c.hits[0] === c.to;
  let san = takes ? `${c.from[0]}x${c.to}` : c.to;
  const board = sideToMoveAs(fen, c.side);
  if (board) {
    try { san = new Chess(board).move({ from: c.from, to: c.to, promotion: 'q' }).san; } catch { /* the square-built name stands */ }
  }
  const named = `${c.side === 'b' ? '…' : ''}${san}`;
  if (!takes) {
    const hit = andList(c.hits.map((_, i) => hitWords(i)));
    return rotateStem([`${owner} one resource is the pawn break ${named}, hitting ${hit}.`, `${owner} counterplay is the push ${named}, against ${hit}.`], key);
  }
  const then = c.hits.length > 1 ? ` Then it hits ${andList(c.hits.slice(1).map((_, i) => hitWords(i + 1)))}.` : '';
  return rotateStem([`${owner} one resource is the pawn break ${named}, taking ${whose} pawn on ${c.to}.`, `${owner} counterplay is ${named}: the pawn takes ${whose} pawn on ${c.to}.`], key) + then;
}

/** The SAN of ply `n` of a UCI line from `fen`. */
function sanOf(fen: string, uci: readonly string[], n: number): string | null {
  try {
    const c = new Chess(fen);
    for (let i = 0; i < n; i++) c.move({ from: uci[i].slice(0, 2), to: uci[i].slice(2, 4), promotion: uci[i][4] });
    const u = uci[n];
    return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san;
  } catch { return null; }
}

/** Every square a ledger names. */
export function ledgerSquares(led: Ledger): Square[] {
  const out = new Set<Square>();
  for (const c of ['w', 'b'] as Color[]) for (const e of [...led[c].assets.filter((x) => x.working), ...led[c].weaknesses]) out.add(e.square);
  return [...out];
}

/** The ledger as one stable key: its counted entries, sorted. */
export function ledgerKey(led: Ledger): string {
  const parts: string[] = [];
  for (const c of ['w', 'b'] as Color[]) {
    for (const e of led[c].assets) if (e.working) parts.push(`+${e.object}`);
    for (const e of led[c].weaknesses) parts.push(`-${e.object}`);
  }
  return parts.sort().join(',');
}

// ── the conclusions, recorded (both ways) ────────────────────────────────────

/** The row each conclusion is filed under when the student's move answers it
 *  or leaves it: the target, the plan's target, their counterplay. */
export type PictureSkill = 'missed-weak-target' | 'missed-plan-route' | 'allowed-counterplay';

/** A move that cost this much left the conclusion unanswered; under it, a
 *  clean move off the conclusion answers a different question (the plan's own
 *  bar, `moveInsight.planPosed`). */
export const PICTURE_MISSED_CP = 50;

/** How sharply each conclusion is asked, on the heat map's scale. */
export const PICTURE_ANSWER_POSED: Record<PictureSkill, number> = {
  'missed-weak-target': 60,
  'missed-plan-route': 60,
  'allowed-counterplay': 65,
};

const uciParts = (uci: string): { from: Square; to: Square; promotion?: string } =>
  ({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, ...(uci[4] ? { promotion: uci[4] } : {}) });

/** The board after `uci` by the side to move on `fen`, or null (illegal). */
function playedOn(fen: string, uci: string): { after: string; me: Color; to: Square } | null {
  try {
    const c = new Chess(fen);
    const me = c.turn();
    const m = c.move(uciParts(uci));
    return { after: c.fen(), me, to: m.to };
  } catch { return null; }
}

/** Does `uci` bring one more unit at the target: the first step of an
 *  attacker's route there, a lever pawn's push toward its square, or a piece
 *  that hits the target from where it lands (chess.js reads the hit). */
export function moveAnswersTarget(t: Target, fen: string, uci: string | undefined): boolean {
  if (!uci) return false;
  const p = playedOn(fen, uci);
  if (!p || p.me !== t.attacker) return false;
  const { from, to } = uciParts(uci);
  const a = t.best.entry.access as Access;
  if (a.attackers.some((r) => r.moves > 0 && r.from === from && r.route[0] === to)) return true;
  if (a.levers.some((l) => l.from === from && fileOf(to) === fileOf(l.at) && Math.abs(rankOf(to) - rankOf(from)) <= Math.abs(rankOf(l.at) - rankOf(from)))) return true;
  try { return new Chess(p.after).attackers(t.best.entry.square, t.attacker).includes(to); } catch { return false; }
}

/** Is the resource still on after the board becomes `fen`: the break still a
 *  lever that does not just drop the pawn, the piece's quiet move still
 *  hitting what it hit (the walk's own checks, `counterplaysOf`). */
export function counterplayStillOn(c: Counterplay, fenBefore: string, fen: string): boolean {
  if (c.kind === 'break') {
    const before = gridOf(fenBefore);
    const g = gridOf(fen);
    if (!before || !g) return false;
    return breakOpen(g, { from: c.from, to: c.to }, c.side, !!before.get(c.to));
  }
  return !!pieceThreat(fen, c.from, c.to, c.side)?.some((t) => c.hits.includes(t.square));
}

/**
 * WHAT THE PICTURE POSED, AND HOW THE MOVE ANSWERED IT — the record's half of
 * the conclusions the picture computers speak (David 2026-11-19: "Make sure
 * all computers work both ways"). With the student to move:
 *  - the TARGET, where the best move brings one more unit at it: held when the
 *    move played does too (`moveAnswersTarget`);
 *  - the PLAN'S TARGET (a race won in three or four moves), where the best
 *    move starts a winning piece's route: held when the move played does
 *    (`moveWorksOnPlan`);
 *  - THEIR COUNTERPLAY, where the best move kills it on the spot: held when
 *    the move played leaves it unplayable (`counterplayStillOn`).
 * A move that answers none of them is MISSED only when it cost
 * (`PICTURE_MISSED_CP`); a clean move off the conclusion answered a different
 * question and is no evidence either way. Pure.
 */
export function pictureAnswers(
  c: PictureConclusions,
  fen: string,
  playedUci: string,
  bestUci: string | undefined,
  cpLoss: number | null,
): Array<{ skill: PictureSkill; outcome: 'held' | 'broken' }> {
  if (!bestUci || placement(c.ledger.fen) !== placement(fen)) return [];
  const played = playedOn(fen, playedUci);
  if (!played) return [];
  const me = played.me;
  const them = other(me);
  const costly = cpLoss !== null && cpLoss >= PICTURE_MISSED_CP;
  const out: Array<{ skill: PictureSkill; outcome: 'held' | 'broken' }> = [];
  const answer = (skill: PictureSkill, held: boolean): void => {
    if (held) out.push({ skill, outcome: 'held' });
    else if (costly) out.push({ skill, outcome: 'broken' });
  };
  const t = c.target[me];
  if (t && moveAnswersTarget(t, fen, bestUci)) answer('missed-weak-target', moveAnswersTarget(t, fen, playedUci));
  const p = c.planTarget[me];
  // The plan's target, when it is another thing than the target now (the
  // registry read says it beside it on the same terms).
  if (p && p.best.entry.object !== t?.best.entry.object && moveWorksOnPlan(p, bestUci)) answer('missed-plan-route', moveWorksOnPlan(p, playedUci));
  const r = c.counterplay[them];
  if (r && r.state === 'dead' && r.ply === 0) answer('allowed-counterplay', !counterplayStillOn(r, fen, played.after));
  return out;
}
