/**
 * computedTruth.fuzz — a SEEDED, reproducible fuzzer over the board fact-computers
 * (David 2026-09-13, "then do 2"). The hand-picked differential corpora
 * (`computedMaterialTruth`, `positionalTruth`) lock KNOWN cases; this generates
 * hundreds of realistic legal positions (random legal playouts) and cross-checks
 * the computers against independent references + their own definitional
 * invariants — the discovery half that found the next class of bug last time.
 *
 * Deterministic: a fixed PRNG seed means the SAME positions every run, so a
 * failure is reproducible and this can gate in CI. Two kinds of check:
 *   1. MATERIAL — `legalSeeGain` must equal a brute-force OPTIMAL SEE (try every
 *      legal capture, not just least-valuable) on every occupied square. Clean,
 *      exact reference.
 *   2. INVARIANTS — each positional computer's output must satisfy its own
 *      definition (a hole is truly pawn-unguardable; a passer truly has no enemy
 *      pawn ahead; a colour-complex side truly lacks that bishop; a minority
 *      lever is truly legal). No external reference needed — self-consistency.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import {
  legalSeeGain,
  findWeakSquares,
  findPassedPawns,
  findColorComplexWeakness,
  findMinorityAttack,
} from './positionReadingService';

const PV: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Deterministic PRNG (mulberry32) — fixed seed ⇒ identical run every time. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Brute-force OPTIMAL SEE for the side to move on `square`: try EVERY legal
 *  capture, recurse, take the best with the standing-pat option. The exact
 *  reference `legalSeeGain` (least-valuable-attacker heuristic) must match. */
function trueSee(chess: Chess, sq: Square): number {
  const victim = chess.get(sq);
  if (!victim) return 0;
  const caps = chess.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
  if (caps.length === 0) return 0;
  let best = 0;
  for (const cap of caps) {
    chess.move(cap);
    const net = (PV[victim.type] ?? 0) - trueSee(chess, sq);
    chess.undo();
    best = Math.max(best, Math.max(0, net)); // standing pat: never start a losing capture
  }
  return best;
}

/** A spread of legal positions: from the start, make `depth` random legal moves.
 *  Realistic + varied + always legal. */
function randomPositions(count: number, seed: number): string[] {
  const rand = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const chess = new Chess();
    const depth = 6 + Math.floor(rand() * 50); // 6..55 plies
    for (let d = 0; d < depth; d += 1) {
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) break; // mate/stalemate
      chess.move(moves[Math.floor(rand() * moves.length)]);
    }
    out.push(chess.fen());
  }
  return out;
}

const FENS = randomPositions(240, 0x1234abcd);
// Brute-force SEE is exponential in the attacker count, so the exact-reference
// check runs on a smaller sample; the cheap invariant checks below use the full set.
const SEE_FENS = FENS.slice(0, 80);

describe('computedTruth.fuzz — legalSeeGain matches brute-force optimal SEE', () => {
  it('agrees on every occupied square across 80 random legal positions', () => {
    const mismatches: string[] = [];
    for (const fen of SEE_FENS) {
      const chess = new Chess(fen);
      for (const row of chess.board()) for (const cell of row) {
        if (!cell) continue;
        const lib = legalSeeGain(fen, cell.square);
        const ref = trueSee(new Chess(fen), cell.square);
        if (lib !== ref) mismatches.push(`${fen} @${cell.square}: legalSeeGain=${lib} trueSee=${ref}`);
      }
    }
    if (mismatches.length) console.log('SEE MISMATCHES:\n' + mismatches.slice(0, 20).join('\n'));
    expect(mismatches).toEqual([]);
  }, 30000);
});

describe('computedTruth.fuzz — positional computers satisfy their own definitions', () => {
  const pawnFiles = (chess: Chess, color: Color): { f: number; r: number }[] => {
    const out: { f: number; r: number }[] = [];
    for (const row of chess.board()) for (const cell of row) {
      if (cell && cell.type === 'p' && cell.color === color) out.push({ f: cell.square.charCodeAt(0) - 97, r: Number(cell.square[1]) });
    }
    return out;
  };

  it('every weak square is genuinely unguardable by a friendly pawn', () => {
    const bad: string[] = [];
    for (const fen of FENS) {
      const chess = new Chess(fen);
      const holes = findWeakSquares(fen);
      for (const color of ['w', 'b'] as Color[]) {
        const pawns = pawnFiles(chess, color);
        for (const sq of color === 'w' ? holes.white : holes.black) {
          const f = sq.charCodeAt(0) - 97;
          const r = Number(sq[1]);
          // A friendly pawn on an adjacent file, able to advance to attack sq,
          // would DISPROVE the hole.
          const guardable = pawns.some((p) => Math.abs(p.f - f) === 1 && (color === 'w' ? p.r <= r - 1 : p.r >= r + 1));
          if (guardable) bad.push(`${fen}: ${color} hole ${sq} is guardable`);
        }
      }
    }
    if (bad.length) console.log('HOLE VIOLATIONS:\n' + bad.slice(0, 10).join('\n'));
    expect(bad).toEqual([]);
  });

  it('every passed pawn has no enemy pawn ahead on its own or an adjacent file', () => {
    const bad: string[] = [];
    for (const fen of FENS) {
      const chess = new Chess(fen);
      for (const color of ['w', 'b'] as Color[]) {
        const enemy: Color = color === 'w' ? 'b' : 'w';
        const enemyPawns = pawnFiles(chess, enemy);
        for (const sq of findPassedPawns(fen, color)) {
          const f = sq.charCodeAt(0) - 97;
          const r = Number(sq[1]);
          const stopper = enemyPawns.some((ep) => Math.abs(ep.f - f) <= 1 && (color === 'w' ? ep.r > r : ep.r < r));
          if (stopper) bad.push(`${fen}: ${color} passer ${sq} has a stopper`);
        }
      }
    }
    if (bad.length) console.log('PASSER VIOLATIONS:\n' + bad.slice(0, 10).join('\n'));
    expect(bad).toEqual([]);
  });

  it('every colour-complex weakness names a side that truly lacks that bishop', () => {
    const bad: string[] = [];
    for (const fen of FENS) {
      const chess = new Chess(fen);
      for (const cc of findColorComplexWeakness(fen)) {
        let hasBishop = false;
        for (const row of chess.board()) for (const cell of row) {
          if (cell && cell.type === 'b' && cell.color === cc.side) {
            const sqColor = (cell.square.charCodeAt(0) - 97 + Number(cell.square[1]) - 1) % 2 === 0 ? 'dark' : 'light';
            if (sqColor === cc.complex) hasBishop = true;
          }
        }
        if (hasBishop) bad.push(`${fen}: ${cc.side} flagged ${cc.complex}-weak but HAS that bishop`);
        if (cc.squares.length < 2) bad.push(`${fen}: ${cc.side} ${cc.complex} complex with <2 holes`);
      }
    }
    if (bad.length) console.log('COMPLEX VIOLATIONS:\n' + bad.slice(0, 10).join('\n'));
    expect(bad).toEqual([]);
  });

  it('every minority-attack lever is a legal move hitting an enemy pawn on the flank', () => {
    const bad: string[] = [];
    for (const fen of FENS) {
      for (const color of ['w', 'b'] as Color[]) {
        const ma = findMinorityAttack(fen, color);
        if (!ma) continue;
        // Force the mover's turn and confirm the lever is legal + the target is
        // an enemy pawn diagonally in front of the lever's landing square.
        const parts = fen.split(' '); parts[1] = color; parts[3] = '-';
        let c: Chess;
        try { c = new Chess(parts.join(' ')); } catch { bad.push(`${fen}: bad forced-turn`); continue; }
        // The lever is reported WITHOUT check marks: on a turn-forced board a
        // check the other side already stands in rides along on chess.js's SAN.
        const legal = c.moves({ verbose: true }).some((m) => m.san.replace(/[+#]+$/, '') === ma.leverSan && m.to === ma.leverTo && m.from === ma.leverFrom);
        const tgt = c.get(ma.target);
        if (!legal) bad.push(`${fen}: ${color} minority lever ${ma.leverSan} is not legal`);
        if (!tgt || tgt.type !== 'p' || tgt.color === color) bad.push(`${fen}: ${color} minority target ${ma.target} is not an enemy pawn`);
      }
    }
    if (bad.length) console.log('MINORITY VIOLATIONS:\n' + bad.slice(0, 10).join('\n'));
    expect(bad).toEqual([]);
  });
});
