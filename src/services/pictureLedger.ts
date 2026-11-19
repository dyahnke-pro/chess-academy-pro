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
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { CoachFact } from './coachFact';
import { buildPicture, type PictureObject, type PictureRole, type PositionPicture } from './positionPicture';
import type { EngineLine } from './engineLineRead';
import { andList, countWord } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

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
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
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
  moves: 0 | 1 | 2;
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
    if (now.ok) { out.push({ from, piece: unit.type, via: null, at: from, moves: 0, behind: now.behind }); continue; }
    let best: Reach | null = null;
    for (const s1 of stepsOf(g, unit, from)) {
      if (s1 === target || !standsAt(g, s1)) continue;
      const g1 = new Map(g);
      g1.delete(from);
      g1.set(s1, unit);
      const h1 = hitFrom(g1, s1);
      if (h1.ok) { if (!best || best.moves > 1 || (best.behind && !h1.behind)) best = { from, piece: unit.type, via: null, at: s1, moves: 1, behind: h1.behind }; continue; }
      if (best && best.moves === 1) continue;
      for (const s2 of stepsOf(g1, unit, s1)) {
        if (s2 === target || s2 === from || !standsAt(g1, s2)) continue;
        const g2 = new Map(g1);
        g2.delete(s1);
        g2.set(s2, unit);
        const h2 = hitFrom(g2, s2);
        if (h2.ok && (!best || (best.behind && !h2.behind))) best = { from, piece: unit.type, via: s1, at: s2, moves: 2, behind: h2.behind };
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
  | 'hole';
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
  return t;
}

function weakKingTraits(g: Grid, s: Square, c: Color): WeakTrait[] {
  if (!queensOn(g)) return [];
  const t: WeakTrait[] = [];
  const f = fileOf(s);
  if ((f === 3 || f === 4) && rankOf(s) === (c === 'w' ? 1 : 8)) t.push('king-centre');
  if ([f - 1, f, f + 1].some((x) => x >= 0 && x < 8 && ownPawnsOnFile(g, x, c).length === 0)) t.push('king-file');
  return t;
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
      if (s1s.includes(s)) { arrivals.push({ from, piece: unit.type, via: null, at: s, moves: 1, behind: false }); continue; }
      for (const s1 of s1s) {
        if (pawnHits(g, s1, owner).length > 0) continue;
        const g1 = new Map(g); g1.delete(from); g1.set(s1, unit);
        if (stepsOf(g1, unit, s1).includes(s)) { arrivals.push({ from, piece: unit.type, via: s1, at: s, moves: 2, behind: false }); break; }
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
    if (weak.length > 0) {
      const access = accessOf(g, s, unit.color, false);
      const e: LedgerEntry = { side: unit.color, kind: 'weakness', object, square: s, piece: unit.type, traits: weak, factIds, access };
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
  const live = cands.filter((c) => c.attackers > c.defenders);
  if (live.length === 0) return null;
  return { attacker, best: live[0], runnerUp: cands.find((c) => c !== live[0]) ?? null, candidates: cands };
}

// ── the counterplay ──────────────────────────────────────────────────────────

export interface Counterplay {
  side: Color;
  /** The break: the pawn, the square it goes to, and what it hits there. */
  from: Square;
  to: Square;
  hits: Square[];
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
  const g = gridOf(fen);
  if (!g) return null;
  const board = placement(fen);
  const breaks = breaksOf(g, side);
  if (breaks.length === 0) return null;
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
    if (state === 'alive' || factIds.length > 0) found.push({ side, from: br.from, to: br.to, hits: br.hits, state, ply, stoppedBy, factIds });
  }
  if (found.length === 0) return null;
  const rank = (c: Counterplay): number => (c.state === 'alive' ? 1000 - (c.ply ?? 0) : c.state === 'dead' ? 500 : 0) + c.factIds.length * 10;
  found.sort((x, y) => rank(y) - rank(x) || x.to.localeCompare(y.to));
  return found[0];
}

// ── the conclusions together, for the verdict half ───────────────────────────

export interface PictureConclusions {
  ledger: Ledger;
  /** Each side's one resource. */
  counterplay: Record<Color, Counterplay | null>;
  /** The target each side, attacking, would go for. */
  target: Record<Color, Target | null>;
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

function computeConclusions(facts: readonly CoachFact[], fen: string, lines: readonly EngineLine[]): PictureConclusions | null {
  const pic = pictureOfBoard(facts, fen);
  const ledger = ledgerOf(pic, fen);
  if (!ledger) return null;
  return {
    ledger,
    counterplay: { w: counterplayOf(pic, fen, lines, 'w'), b: counterplayOf(pic, fen, lines, 'b') },
    target: { w: targetOf(ledger, 'w'), b: targetOf(ledger, 'b') },
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
      const list = andList(weak.map(weakPhrase));
      out.push(mine
        ? rotateStem([`They can get at your weak spots: ${list}.`, `Your weak spots they can reach: ${list}.`], key)
        : rotateStem([`You can get at their weak spots: ${list}.`, `Their weak spots you can reach: ${list}.`], key));
    }
  }
  if (out.length === 0) return null;
  return out.map((s) => s[0].toUpperCase() + s.slice(1)).join(' ');
}

const many = (n: number): string => countWord(n);

/** The target in words, with the comparison that chose it. */
export function targetText(t: Target, student: Color): string {
  const mine = t.attacker === student;
  const thing = (c: TargetCandidate): string => (c.entry.piece === null ? `the hole on ${c.entry.square}` : `the ${NAME[c.entry.piece]} on ${c.entry.square}`);
  const units = t.best.levers > 0 ? 'pieces and pawns' : 'pieces';
  const atk = mine ? `of your ${units}` : `of their ${units}`;
  const def = mine ? 'of theirs' : 'of yours';
  const why = `${many(t.best.attackers)} ${atk} can get at it, and only ${many(t.best.defenders)} ${def} can guard it`;
  const key = stemKeyOf(`${t.best.entry.object}|${t.attacker}`);
  const lead = mine ? rotateStem(['The target is', 'Aim at'], key) : rotateStem(['Their target is', 'They will aim at'], key);
  const ru = t.runnerUp;
  if (ru) return `${lead} ${thing(t.best)}, not ${thing(ru)}: ${why}.`;
  return `${lead} ${thing(t.best)}: ${why}.`;
}

/** The counterplay in words — said only alive or dead. */
export function counterplayText(c: Counterplay, student: Color, fen: string, lines: readonly EngineLine[]): string | null {
  if (c.state === 'unsettled') return null;
  const mine = c.side === student;
  const hit = andList(c.hits.map((h) => `${mine ? 'their' : 'your'} pawn on ${h}`));
  const owner = mine ? 'Your' : 'Their';
  const key = stemKeyOf(`${placement(fen)}|${c.to}`);
  const head = rotateStem([`${owner} one resource is the pawn break to ${c.to}, hitting ${hit}.`, `${owner} counterplay is the push to ${c.to}, against ${hit}.`], key);
  if (c.state === 'alive') return `${head} ${rotateStem(['It is coming: the best line plays it.', 'Nothing stops it in the best line.'], key)}`;
  const stopper = c.stoppedBy ? sanOf(fen, lines[0]?.moves ?? [], c.ply ?? 0) : null;
  return `${head} ${stopper ? `But it is dead: after ${stopper} it no longer works.` : 'But the best line stops it.'}`;
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

/** Does `uci` (a move from the target's board) bring one more unit at the
 *  target: one of the pieces that can get at it, or a lever pawn? */
export function moveWorksOnTarget(t: Target, uci: string | undefined): boolean {
  if (!uci) return false;
  const from = uci.slice(0, 2);
  const a = t.best.entry.access as Access;
  return a.attackers.some((r) => r.from === from && r.moves > 0) || a.levers.some((l) => l.from === from);
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
