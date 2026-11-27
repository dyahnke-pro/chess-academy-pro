// THE STRUCTURE-TO-PLAN COMPUTER (Coach Build Board, plan round 2): each side's
// plan and break worked out from the pawns and the pieces, on any board, in
// any phase. No opening names: the skeleton decides, so it reads openings it
// has never seen. FACTS only — `planOf` ranks them against the engine's lines
// and the masters' games, and the one renderer words them.
//
// The readers, each a known structure with its plan:
//   chain      — a pawn chain: strike at its BASE (…c5 against d4–e5, f4–f5
//                against e6–d5);
//   minority   — the minority attack: two queenside pawns against three, b4–b5
//                at the c-pawn (the Carlsbad);
//   expansion  — the queenside expansion with its break: b5, then c5 (the
//                Meran), the break said first;
//   majority   — a wing majority: push it to make a passed pawn;
//   isolani    — the isolated queen's pawn: blockade d5 (or push d5);
//   square     — the fight for a central square both sides cover;
//   bad-bishop — a bishop with two or more of its own pawns fixed on its colour.
// "No default big centre": a centre is never a plan by itself.
// PURE: chess.js and the existing structure reads.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { isolaniStructure } from './nextPlans';

export type StructureKind = 'chain' | 'minority' | 'expansion' | 'majority' | 'isolani' | 'square' | 'bad-bishop';

export interface StructurePlanRead {
  side: Color;
  kind: StructureKind;
  /** The pawn move the plan turns on (its break or its first push), when it
   *  has one: from, to, and the enemy pawn or square it hits. */
  key: { from: string; to: string; hits: string | null } | null;
  /** A move that comes before the key one (the expansion's b5 before c5). */
  first: { from: string; to: string } | null;
  /** Every square the plan is about (for the board and the decider). */
  squares: string[];
  /** The plan's target (the chain's base, the c-pawn, the square). */
  target: string | null;
  /** The bishop a bad-bishop plan is about; the piece a square plan lands. */
  piece?: { type: PieceSymbol; square: string };
  /** The isolani is `side`'s own (activity) rather than theirs (blockade). */
  owns?: boolean;
}

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const fileOf = (sq: string): number => sq.charCodeAt(0) - 97;
const rankOf = (sq: string): number => Number(sq[1]);
const sq = (f: number, r: number): string | null => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? `${String.fromCharCode(97 + f)}${r}` : null);
const fwd = (c: Color): number => (c === 'w' ? 1 : -1);
const shade = (s: string): 'light' | 'dark' => ((fileOf(s) + rankOf(s) - 1) % 2 === 0 ? 'dark' : 'light');
const CENTRE = new Set(['d4', 'd5', 'e4', 'e5']);

function pawns(c: Chess, side: Color): string[] {
  return c.findPiece({ type: 'p', color: side });
}

/** A pawn of `side` reaches `to` from `from` by pushes alone, the road clear. */
function pushRoad(c: Chess, side: Color, from: string, to: string): boolean {
  if (from[0] !== to[0]) return false;
  const d = fwd(side);
  const steps = (rankOf(to) - rankOf(from)) * d;
  const home = side === 'w' ? 2 : 7;
  if (steps < 1 || steps > 2 || (steps === 2 && rankOf(from) !== home)) return false;
  for (let k = 1; k <= steps; k += 1) {
    const s = sq(fileOf(from), rankOf(from) + k * d);
    if (!s || c.get(s as Square)) return false;
  }
  return true;
}

/** The squares a pawn of `side` on `s` attacks. */
function pawnHits(side: Color, s: string): string[] {
  const r = rankOf(s) + fwd(side);
  return [sq(fileOf(s) - 1, r), sq(fileOf(s) + 1, r)].filter((x): x is string => !!x);
}

/** A push of one of `side`'s pawns (one or two squares) that lands hitting `target`. */
function breakAt(c: Chess, side: Color, target: string): StructurePlanRead['key'] {
  for (const p of pawns(c, side)) {
    for (const n of [1, 2]) {
      const to = sq(fileOf(p), rankOf(p) + n * fwd(side));
      if (!to || !pushRoad(c, side, p, to)) continue;
      if (pawnHits(side, to).includes(target)) return { from: p, to, hits: target };
    }
  }
  return null;
}

// ── chain ────────────────────────────────────────────────────────────────────
/** The enemy chain's base: a pawn of theirs (c–f files) guarding another pawn
 *  of theirs diagonally ahead of it, itself guarded by no pawn. The break is a
 *  pawn of `side` that pushes onto a square hitting that base. */
function chain(c: Chess, side: Color): StructurePlanRead | null {
  const them = other(side);
  const theirs = new Set(pawns(c, them));
  for (const base of theirs) {
    if (fileOf(base) < 2 || fileOf(base) > 5) continue;
    const head = pawnHits(them, base).find((h) => theirs.has(h));
    if (!head) continue;
    // The base itself guarded by a pawn is not the base.
    const guarded = [...theirs].some((p) => pawnHits(them, p).includes(base));
    if (guarded) continue;
    // A chain is LOCKED: the head stands against a pawn of ours.
    const blocker = sq(fileOf(head), rankOf(head) + fwd(them));
    const locked = !!blocker && c.get(blocker as Square)?.type === 'p' && c.get(blocker as Square)?.color === side;
    if (!locked) continue;
    const key = breakAt(c, side, base);
    if (key) return { side, kind: 'chain', key, first: null, squares: [key.to, base, head], target: base };
  }
  return null;
}

// ── minority attack ──────────────────────────────────────────────────────────
/** Two queenside pawns (a and b files, no c-pawn) against their three, their
 *  c-pawn on its third rank behind their d-pawn: the b-pawn runs to b5 (b4). */
function minority(c: Chess, side: Color): StructurePlanRead | null {
  const them = other(side);
  const mine = pawns(c, side); const theirs = pawns(c, them);
  const wing = (ps: string[]): string[] => ps.filter((p) => fileOf(p) <= 2);
  const mw = wing(mine); const tw = wing(theirs);
  if (mw.length !== 2 || tw.length !== 3 || mine.some((p) => p[0] === 'c')) return null;
  const cPawn = theirs.find((p) => p[0] === 'c');
  const dPawn = theirs.find((p) => p[0] === 'd');
  if (!cPawn || !dPawn || rankOf(cPawn) !== (them === 'w' ? 3 : 6)) return null;
  const b = mine.find((p) => p[0] === 'b');
  if (!b) return null;
  const goal = sq(1, them === 'w' ? 4 : 5)!;
  // The road from b2/b7 to b5/b4: clear of pawns.
  for (let r = rankOf(b) + fwd(side); r !== rankOf(goal) + fwd(side); r += fwd(side)) {
    const s = sq(1, r);
    if (!s || c.get(s as Square)?.type === 'p') return null;
  }
  return { side, kind: 'minority', key: { from: b, to: goal, hits: cPawn }, first: null, squares: [goal, cPawn], target: cPawn };
}

// ── the queenside expansion (the Meran) ─────────────────────────────────────
/** b-pawn and c-pawn at home (or the c-pawn on c6), their d-pawn on d4: b5
 *  first, then the break c5 at d4 — said break first. */
function expansion(c: Chess, side: Color): StructurePlanRead | null {
  const them = other(side);
  const home = side === 'w' ? 2 : 7;
  const mine = pawns(c, side);
  const b = mine.find((p) => p[0] === 'b' && (rankOf(p) === home || rankOf(p) === home + fwd(side)));
  const cp = mine.find((p) => p[0] === 'c' && (rankOf(p) === home || rankOf(p) === home + fwd(side)));
  const dTheirs = sq(3, side === 'w' ? 5 : 4)!;
  if (!b || !cp || c.get(dTheirs as Square)?.type !== 'p' || c.get(dTheirs as Square)?.color !== them) return null;
  const bTo = sq(1, side === 'w' ? 4 : 5)!;
  const cTo = sq(2, side === 'w' ? 4 : 5)!;
  // b5 needs its road; c5 needs c5 empty and hits d4.
  for (let r = rankOf(b) + fwd(side); r !== rankOf(bTo) + fwd(side); r += fwd(side)) { const s = sq(1, r); if (!s || c.get(s as Square)) return null; }
  for (let r = rankOf(cp) + fwd(side); r !== rankOf(cTo) + fwd(side); r += fwd(side)) { const s = sq(2, r); if (!s || c.get(s as Square)) return null; }
  if (!pawnHits(side, cTo).includes(dTheirs)) return null;
  return { side, kind: 'expansion', key: { from: cp, to: cTo, hits: dTheirs }, first: { from: b, to: bTo }, squares: [cTo, bTo, dTheirs], target: dTheirs };
}

// ── a wing majority ──────────────────────────────────────────────────────────
/** More pawns than theirs on one wing (a–c or f–h) with no passer yet: the
 *  pawn on the file they cannot answer runs first. */
function majority(c: Chess, side: Color): StructurePlanRead | null {
  const them = other(side);
  const mine = pawns(c, side); const theirs = pawns(c, them);
  for (const [lo, hi] of [[0, 2], [5, 7]] as const) {
    const m = mine.filter((p) => fileOf(p) >= lo && fileOf(p) <= hi);
    const t = theirs.filter((p) => fileOf(p) >= lo && fileOf(p) <= hi);
    if (m.length <= t.length || t.length === 0 && m.length < 2) continue;
    // The candidate: the pawn on a file with no enemy pawn on it, most advanced.
    const free = m.filter((p) => !t.some((x) => x[0] === p[0]))
      .sort((a, b) => (rankOf(b) - rankOf(a)) * fwd(side));
    const pawn = free[0];
    if (!pawn) continue;
    const to = sq(fileOf(pawn), rankOf(pawn) + fwd(side));
    if (!to || c.get(to as Square)) continue;
    return { side, kind: 'majority', key: { from: pawn, to, hits: null }, first: null, squares: [pawn, to], target: null };
  }
  return null;
}

// ── the isolated queen's pawn ────────────────────────────────────────────────
function isolani(fen: string, side: Color): StructurePlanRead | null {
  const iso = isolaniStructure(fen, side);
  if (!iso) return null;
  return { side, kind: 'isolani', key: null, first: null, squares: [iso.square], target: iso.square, owns: iso.mine };
}

// ── the fight for a central square ──────────────────────────────────────────
/** An empty central square no enemy pawn can ever cover, that `side` covers
 *  more than they do, with a knight or bishop of `side`'s able to stand there. */
function square(c: Chess, side: Color): StructurePlanRead | null {
  const them = other(side);
  const theirPawns = pawns(c, them);
  for (const s of CENTRE) {
    if (c.get(s as Square)) continue;
    // Its own half or theirs: only the squares in front of `side`.
    if (side === 'w' ? rankOf(s) < 4 : rankOf(s) > 5) continue;
    const coverable = theirPawns.some((p) => Math.abs(fileOf(p) - fileOf(s)) === 1 && (them === 'w' ? rankOf(p) < rankOf(s) : rankOf(p) > rankOf(s)));
    if (coverable) continue;
    const mineHit = c.attackers(s as Square, side).length;
    const theirsHit = c.attackers(s as Square, them).length;
    if (mineHit <= theirsHit || theirsHit === 0) continue;
    const minor = c.board().flat().find((p) => p && p.color === side && (p.type === 'n' || p.type === 'b') && c.attackers(s as Square, side).includes(p.square));
    if (!minor) continue;
    return { side, kind: 'square', key: null, first: null, squares: [s, minor.square], target: s, piece: { type: minor.type, square: minor.square } };
  }
  return null;
}

// ── the bad bishop ───────────────────────────────────────────────────────────
/** A bishop with two or more of its own pawns fixed on its colour (blocked by
 *  an enemy pawn in front) in the centre files. */
function badBishop(c: Chess, side: Color): StructurePlanRead | null {
  const them = other(side);
  for (const b of c.findPiece({ type: 'b', color: side })) {
    const colour = shade(b);
    const fixed = pawns(c, side).filter((p) => {
      if (shade(p) !== colour || fileOf(p) < 2 || fileOf(p) > 5) return false;
      const front = sq(fileOf(p), rankOf(p) + fwd(side));
      const blocker = front ? c.get(front as Square) : null;
      return !!blocker && blocker.type === 'p' && blocker.color === them;
    });
    if (fixed.length >= 2) return { side, kind: 'bad-bishop', key: null, first: null, squares: [b, ...fixed], target: b, piece: { type: 'b', square: b } };
  }
  return null;
}

/** EVERY STRUCTURAL PLAN of `side` on this board, in the readers' order. */
export function structureOf(fen: string, side: Color): StructurePlanRead[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  const out: StructurePlanRead[] = [];
  for (const r of [
    () => chain(c, side), () => minority(c, side), () => expansion(c, side), () => majority(c, side),
    () => isolani(fen, side), () => square(c, side), () => badBishop(c, side),
  ]) {
    try { const x = r(); if (x) out.push(x); } catch { /* a reader that cannot read says nothing */ }
  }
  return out;
}
