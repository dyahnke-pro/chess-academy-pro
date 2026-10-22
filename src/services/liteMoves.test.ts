// LITE LEGAL MOVES — the same moves as chess.js's verbose list, without the
// notation, and the exchange counter that runs on them (`liteMoves.ts`).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { liteMoves, makeLite, undoLite } from './liteMoves';
import { legalSeeGain, signedLegalSeeFor } from './positionReadingService';

/** A deterministic PRNG, so the positions are the same on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

/** Positions from seeded random games, plus hand-picked edge cases. */
function positions(): string[] {
  const out = [
    // a pawn capture that promotes (four promotions, chess.js's order)
    'r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1',
    // an en-passant capture is legal
    'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
    // a pinned attacker cannot take
    '4k3/8/8/3r4/8/3N4/8/3K4 w - - 0 1',
    // castling both ways
    'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    // in check: only the answers are legal
    'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3',
  ];
  const next = rng(20261021);
  for (let g = 0; g < 40; g++) {
    const c = new Chess();
    for (let ply = 0; ply < 70 && !c.isGameOver(); ply++) {
      const ms = c.moves({ verbose: true });
      const caps = ms.filter((m) => m.captured);
      // Lean toward captures so exchanges come up.
      const pool = caps.length > 0 && next() < 0.4 ? caps : ms;
      c.move(pool[Math.floor(next() * pool.length)]);
      if (ply % 4 === 3) out.push(c.fen());
    }
  }
  return out;
}

const POSITIONS = positions();
const SQUARES: Square[] = [];
for (const f of 'abcdefgh') for (const r of '12345678') SQUARES.push(`${f}${r}` as Square);
const project = (m: { color: string; from: string; to: string; piece: string; captured?: string; promotion?: string }) =>
  ({ color: m.color, from: m.from, to: m.to, piece: m.piece, captured: m.captured, promotion: m.promotion });

/** The exchange counter as it stood before lite moves — the reference. */
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
function verboseSee(chess: Chess, square: Square, depth = 0): number {
  if (depth > 16) return 0;
  const victim = chess.get(square);
  if (!victim) return 0;
  const attackers = chess.attackers(square, chess.turn());
  if (attackers.length === 0) return 0;
  const caps = attackers.flatMap((from) => chess.moves({ square: from, verbose: true })).filter((m) => m.to === square && m.captured);
  if (caps.length === 0) return 0;
  caps.sort((a, b) => VALUE[a.piece] - VALUE[b.piece]);
  chess.move(caps[0]);
  const reply = verboseSee(chess, square, depth + 1);
  chess.undo();
  return Math.max(0, VALUE[victim.type] - reply);
}

describe('chess.js internals the lite path reads (pinned at 1.4.0)', () => {
  it('are present — an upgrade that changes them fails here, not on the board', () => {
    const c = new Chess() as unknown as Record<string, unknown>;
    for (const name of ['_moves', '_makeMove', '_undoMove', '_incPositionCount', '_decPositionCount']) {
      expect(typeof c[name], name).toBe('function');
    }
    expect(typeof c._hash).toBe('bigint');
  });
});

describe('liteMoves — the verbose list, without the notation', () => {
  it(`equals chess.moves({ verbose: true }) in order, whole board and per square, on ${POSITIONS.length} positions`, () => {
    expect(POSITIONS.length).toBeGreaterThan(400);
    for (const fen of POSITIONS) {
      const c = new Chess(fen);
      expect(liteMoves(c).map(project), fen).toEqual(c.moves({ verbose: true }).map(project));
      for (const sq of SQUARES) {
        const p = c.get(sq);
        if (!p || p.color !== c.turn()) continue;
        expect(liteMoves(c, { square: sq }).map(project), `${fen} ${sq}`).toEqual(c.moves({ square: sq, verbose: true }).map(project));
      }
    }
  });

  it('makeLite / undoLite leave the board move() / undo() leave, position counts included', () => {
    for (const fen of POSITIONS.slice(0, 120)) {
      const a = new Chess(fen);
      const b = new Chess(fen);
      for (const [i, m] of liteMoves(a).entries()) {
        if (i % 5 !== 0) continue;
        makeLite(a, m);
        b.move({ from: m.from, to: m.to, promotion: m.promotion });
        expect(a.fen()).toBe(b.fen());
        expect(a.isThreefoldRepetition()).toBe(b.isThreefoldRepetition());
        undoLite(a);
        b.undo();
        expect(a.fen()).toBe(fen);
        expect(a.history()).toEqual(b.history());
      }
    }
  });
});

describe('the exchange counter on lite moves', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('reads every square of every position exactly as the verbose counter did', () => {
    let read = 0;
    for (const fen of POSITIONS) {
      const ref = new Chess(fen);
      for (const sq of SQUARES) {
        if (!ref.get(sq)) continue;
        expect(legalSeeGain(fen, sq), `${fen} ${sq}`).toBe(verboseSee(ref, sq));
        read += 1;
      }
    }
    expect(read).toBeGreaterThan(5000);
  });

  it('the signed read matches too (the root capture by the least valuable legal attacker)', () => {
    for (const fen of POSITIONS.slice(0, 200)) {
      const c = new Chess(fen);
      for (const sq of SQUARES) {
        const p = c.get(sq);
        if (!p || p.color === c.turn()) continue;
        const caps = c.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
        let want = 0;
        if (c.attackers(sq, c.turn()).length > 0 && caps.length > 0) {
          caps.sort((a, b) => VALUE[a.piece] - VALUE[b.piece]);
          c.move(caps[0]);
          want = VALUE[p.type] - verboseSee(c, sq);
          c.undo();
        }
        expect(signedLegalSeeFor(fen, sq, c.turn()), `${fen} ${sq}`).toBe(want);
      }
    }
  });

  it('writes no notation: no public moves(), move() or undo() call (fails on the old counter)', () => {
    const spies = [
      vi.spyOn(Chess.prototype, 'moves'),
      vi.spyOn(Chess.prototype, 'move'),
      vi.spyOn(Chess.prototype, 'undo'),
    ];
    for (const fen of POSITIONS.slice(0, 60)) {
      for (const sq of SQUARES) legalSeeGain(fen, sq);
    }
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
