// factRelations — WHAT A FACT NEEDS AND WHAT IT CAUSES (WO-STORY-MATRIX-01
// P1-11, design §P1-11 / relations.md §4). Read off the board, never scraped
// from the words:
//   • causes — the relations the fact's own line changes (`lineDiff`);
//   • needs  — the relations on the fact's starting board at the squares its
//     line moves from, captures on or gives check to — or, with no line, at
//     the squares it names.
// Two facts are linked cause → effect when one's causes meet the other's
// needs: "Bxf7+ drags the king off e8" CAUSES the loss of `guard:d8<e8`, and
// "Qxd8 wins the queen" NEEDS that guard gone. The composer reads the link as
// support (`thoughtComposer`), so a fact on another square can follow its
// cause in one thought.
//
// The basis is DERIVED from fields every fact already carries (proof, lines,
// squares, fen), so every fact answers by construction: a fact with no line
// and no squares (a name, a method, a story) needs and causes nothing.
// Pure and memoised by the basis; a LEAF over relations + chess.js.
import { Chess, type Square } from 'chess.js';
import { lineDiff, relationKey, relationSquare, snapshot, type Relation, type RelationKind } from './relations';
import { isProof, type FactProof } from './proof';

export interface FactRelations {
  needs: ReadonlySet<string>;
  causes: ReadonlySet<string>;
}

/** What a fact's relations are read from — fields every fact carries. */
export interface RelationBasisInput {
  fen: string;
  proof: FactProof;
  squares: readonly string[];
  lines?: ReadonlyArray<{ fen: string; sans: readonly string[] }>;
}

/** THE RELATIONS A CLAIM STANDS ON — the ones a link may run through. Every
 *  move changes what each slider sees and what each piece attacks, so a link
 *  through `reach` or `attack` joins almost any two facts (measured on the
 *  decision baseline 2026-11-04: a minority-attack aside "supported" a missed
 *  Rxe5 through a queen's sight lines). A `Record`, so a new relation kind
 *  fails to compile until it says whether a claim can stand on it. */
const CLAIM_RELATION: Record<RelationKind, boolean> = {
  guard: true, 'guard-pinned': true, pin: true, loose: true, hanging: true, passer: true, check: true,
  attack: false, reach: false, file: false, cover: false, zone: false, material: false, castling: false, uncovered: false,
};
const claimed = (r: Relation): boolean => CLAIM_RELATION[r.kind];

const NONE: FactRelations = { needs: new Set(), causes: new Set() };
const memo = new Map<string, FactRelations>();
const MEMO_MAX = 4000;

/** The line a fact proves, from its board: the proof's own, else its first. */
function lineOf(f: RelationBasisInput): { fen: string; sans: readonly string[] } | null {
  if (isProof(f.proof) && f.proof.line && f.proof.line.sans.length > 0) return { fen: f.proof.line.fen, sans: f.proof.line.sans };
  const l = f.lines?.[0];
  return l && l.sans.length > 0 ? l : null;
}

/** The squares a line works through: each move's from- and to-square, and the
 *  king it checks. */
function lineSquares(fen: string, sans: readonly string[]): Set<string> | null {
  const out = new Set<string>();
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  for (const san of sans) {
    let m;
    try { m = c.move(san); } catch { return null; }
    out.add(m.from);
    out.add(m.to);
    if (c.inCheck()) {
      const king = c.board().flat().find((p) => p && p.type === 'k' && p.color === c.turn());
      if (king) out.add(king.square);
    }
  }
  return out;
}

function needsAt(fen: string, squares: ReadonlySet<string>): Set<string> {
  const snap = snapshot(fen);
  const out = new Set<string>();
  if (!snap) return out;
  for (const r of snap.relations) {
    if (!claimed(r)) continue;
    const sq = relationSquare(r);
    if (sq && squares.has(sq)) out.add(relationKey(r));
  }
  return out;
}

export function factRelations(f: RelationBasisInput): FactRelations {
  const line = lineOf(f);
  const key = line ? `L|${line.fen}|${line.sans.join(',')}` : `S|${f.fen}|${[...f.squares].sort().join(',')}`;
  const hit = memo.get(key);
  if (hit) return hit;
  let out: FactRelations = NONE;
  if (line) {
    const through = lineSquares(line.fen, line.sans);
    const d = through ? lineDiff(line.fen, line.sans) : null;
    if (through && d) out = { needs: needsAt(line.fen, through), causes: new Set([...d.lost, ...d.gained].filter(claimed).map(relationKey)) };
  } else if (f.squares.length > 0) {
    out = { needs: needsAt(f.fen, new Set(f.squares as readonly Square[])), causes: new Set() };
  }
  if (memo.size >= MEMO_MAX) {
    const oldest = memo.keys().next().value;
    if (oldest !== undefined) memo.delete(oldest);
  }
  memo.set(key, out);
  return out;
}

/** CAUSE → EFFECT (the strongest link, strength 3 in the plan): one fact's
 *  line changes a relation the other's claim stands on. */
export function causeEffect(a: RelationBasisInput, b: RelationBasisInput): boolean {
  const ra = factRelations(a);
  const rb = factRelations(b);
  for (const k of ra.causes) if (rb.needs.has(k)) return true;
  for (const k of rb.causes) if (ra.needs.has(k)) return true;
  return false;
}
