import { describe, expect, it } from 'vitest';
import { Chess, type Color, type Square } from 'chess.js';
import { wrongRookPawnCorner, type CornerBoard } from '../checks/wrongRookPawn';
import { SCENARIOS, scenarioPosition } from './index';
import library from './wrongRookPawn.json';

type Row = CornerBoard & { sf: { right: number; wrong: number } };
const LIB = library as unknown as { w: Row[]; b: Row[] };
const COLOURS: readonly Color[] = ['w', 'b'];
const uciOf = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ''}`;
const steps = (a: string, b: string): number => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
const mirrorSq = (s: string): string => `${s[0]}${9 - Number(s[1])}`;
const mirrorUci = (u: string): string => `${mirrorSq(u.slice(0, 2))}${mirrorSq(u.slice(2, 4))}${u.slice(4)}`;
function mirrorFen(fen: string): string {
  const [board, turn] = fen.split(' ');
  const rows = board.split('/').reverse().map((row) => row.replace(/[a-zA-Z]/g, (ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())));
  return `${rows.join('/')} ${turn === 'w' ? 'b' : 'w'} - - 0 1`;
}
const play = (fen: string, u: string): Chess => {
  const b = new Chess(fen);
  b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  return b;
};
const kingOf = (b: Chess, c: Color): Square => b.board().flat().find((x) => x && x.type === 'k' && x.color === c)!.square;

function violation(row: CornerBoard, student: Color): string | null {
  let b: Chess;
  try { b = new Chess(row.fen); } catch { return 'illegal FEN'; }
  if (b.turn() !== student) return 'not the student to move';
  if (b.isGameOver() || b.inCheck()) return 'over or in check';
  const corner = wrongRookPawnCorner(b, student);
  if (!corner) return 'the board poses no wrong rook pawn';
  if (!b.board().flat().some((c) => c && c.color !== student && c.type === 'b')) return 'no bishop';
  const moves = b.moves({ verbose: true });
  if (moves.some((m) => m.captured)) return 'a capture is on';
  const d0 = steps(kingOf(b, student), corner);
  if (d0 < 2 || d0 > 3) return `the king ${d0} from the corner`;
  const legal = new Set(moves.map(uciOf));
  if (row.draws.length === 0) return 'no drawing move';
  if (!row.draws.every((u) => legal.has(u))) return 'an illegal drawing move';
  if (!legal.has(row.wrong) || row.draws.includes(row.wrong)) return 'the wrong move';
  if (row.draws.some((u) => steps(u.slice(2, 4), corner) > d0)) return 'a drawing move steps away';
  const near = Math.min(...row.draws.map((u) => steps(u.slice(2, 4), corner)));
  if (steps(row.draws[0].slice(2, 4), corner) !== near || near >= d0) return 'draws[0] is not the nearest step';
  // The tree: one branch per drawing move, one node per coach reply that does not end the game.
  if (Object.keys(row.tree).sort().join() !== [...row.draws].sort().join()) return 'tree branches ≠ drawing moves';
  for (const m1 of row.draws) {
    const b1 = play(row.fen, m1);
    const replies = b1.moves({ verbose: true }).filter((r) => { const t = new Chess(b1.fen()); t.move(r); return !t.isGameOver(); });
    if (Object.keys(row.tree[m1]).sort().join() !== replies.map(uciOf).sort().join()) return `tree after ${m1} misses a coach reply`;
    for (const r of replies) {
      const b2 = new Chess(b1.fen()); b2.move(r);
      const d2 = row.tree[m1][uciOf(r)];
      const legal2 = new Set(b2.moves({ verbose: true }).map(uciOf));
      if (d2.length === 0 || !d2.every((u) => legal2.has(u))) return `node ${b2.fen()} bad`;
      const c2 = wrongRookPawnCorner(b2, student);
      for (const m of b2.moves({ verbose: true })) if (c2 && m.piece === 'k' && m.to === c2 && !d2.includes(uciOf(m))) return `the corner step at ${b2.fen()} is not a draw`;
    }
  }
  return null;
}

describe('the wrong rook pawn scenario library', () => {
  it('holds at least 10 boards per colour, distinct', () => {
    for (const colour of COLOURS) {
      expect(LIB[colour].length).toBeGreaterThanOrEqual(10);
      expect(new Set(LIB[colour].map((r) => r.fen)).size).toBe(LIB[colour].length);
    }
  });

  it('every board meets the rule, and its verdict tree covers EVERY coach reply (chess.js)', () => {
    for (const colour of COLOURS) for (const row of LIB[colour]) expect(violation(row, colour), row.fen).toBeNull();
  }, 60_000);

  it('every board carries its Stockfish proof: the corner-ward move reads level, the wrong move lost', () => {
    for (const colour of COLOURS) for (const row of LIB[colour]) {
      expect(row.sf.right, row.fen).toBeGreaterThanOrEqual(-150);
      expect(row.sf.wrong, row.fen).toBeLessThanOrEqual(-300);
    }
  });

  it('the White board is the Black one mirrored, with the same verdicts', () => {
    expect(LIB.w.length).toBe(LIB.b.length);
    LIB.b.forEach((b, i) => {
      const w = LIB.w[i];
      expect(w.fen).toBe(mirrorFen(b.fen));
      expect(w.draws).toEqual(b.draws.map(mirrorUci));
      expect(w.wrong).toBe(mirrorUci(b.wrong));
    });
  });

  it('the provider returns a library board for the student\'s colour, the student to move', () => {
    for (const colour of COLOURS) {
      expect(SCENARIOS['wrong-rook-pawn'].size(colour)).toBe(LIB[colour].length);
      for (let seed = -20; seed < 20; seed++) expect(new Chess(scenarioPosition('wrong-rook-pawn', colour, seed) as string).turn()).toBe(colour);
    }
  });

  it('the rule rejects bad boards (negative control)', () => {
    const b = LIB.b[0];
    expect(violation(b, 'w')).toMatch(/student to move/);
    expect(violation({ ...b, wrong: b.draws[0] }, 'b')).toMatch(/wrong move/);
    const pruned = { ...b, tree: { ...b.tree, [b.draws[0]]: Object.fromEntries(Object.entries(b.tree[b.draws[0]]).slice(1)) } };
    expect(violation(pruned, 'b')).toMatch(/misses a coach reply/);
  });
});

describe('THE FORTRESS — a king in the corner zone is never beaten (sampled here; exhaustive in scripts/scenarios/prove-wrong-rook-pawn-fortress.mjs)', () => {
  it('h-pawn, White attacking: every attacker move leaves the defender a move back into the zone, or a draw on the spot', () => {
    const zone = ['h8', 'g8', 'h7', 'g7'];
    // A sample where it matters — their king within three steps of the
    // corner, the bishop on the squares that bear on it — kept small for the
    // suite; the exhaustive run over every placement is the script's.
    const bishops = [null, 'c4', 'e6', 'f7', 'g8', 'h7', 'e4'];
    let states = 0;
    for (const dk of zone) for (let f = 4; f < 8; f++) for (let r = 5; r <= 8; r++) for (const bs of bishops) for (const pr of [5, 6, 7]) {
      const ak = `${'abcdefgh'[f]}${r}`;
      const p = `h${pr}`;
      const used = [dk, ak, bs, p].filter(Boolean);
      if (new Set(used).size !== used.length || steps(dk, ak) <= 1) continue;
      const c = new Chess(); c.clear();
      c.put({ type: 'k', color: 'b' }, dk as Square);
      c.put({ type: 'k', color: 'w' }, ak as Square);
      c.put({ type: 'p', color: 'w' }, p as Square);
      if (bs) c.put({ type: 'b', color: 'w' }, bs as Square);
      let s: Chess;
      try { s = new Chess(`${c.fen().split(' ')[0]} w - - 0 1`); } catch { continue; }
      if (s.isAttacked(dk as Square, 'w') || s.isGameOver()) continue;
      states++;
      for (const m of s.moves({ verbose: true })) {
        s.move(m);
        const replies = s.moves({ verbose: true });
        const ok = replies.length === 0 ? !s.inCheck() : s.isInsufficientMaterial() || replies.some((x) => zone.includes(x.to));
        expect(ok, `${s.fen()} after ${m.san}`).toBe(true);
        s.undo();
      }
    }
    expect(states).toBeGreaterThan(100);
  }, 60_000);
});
