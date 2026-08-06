// Ground-truth cross-validation of the tactic detectors against the Lichess
// puzzle corpus — positions LABELED by an independent source, not by us.
//
// The 2026-08-06 audit swept all 15,000 puzzles: 49,725 piece-on-square
// description claims, ZERO false; mateIn1 recall 99.6% (the misses are the
// deliberate solver-in-check skip); backRankMate+mateIn1 100%; hangingPiece
// 100%. trappedPiece fires at 0.5% on the PUZZLE-START position by design —
// the trap is created BY the solution move; once it lands the detector sees
// 66.3%. This gate holds a deterministic sample of those findings so a
// detector edit that starts lying about the board, or goes blind to mates,
// fails loudly.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { detectTactics } from './tacticsDetector';

interface Puzzle { id: string; fen: string; moves: string; themes: string[] | null }

const NAME2SYM: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};

const puzzles: Puzzle[] = JSON.parse(readFileSync('src/data/puzzles.json', 'utf8'));

/** The position the solver faces: fen + the opponent's blunder (moves[0]). */
function solverPosition(p: Puzzle): Chess | null {
  try {
    const c = new Chess(p.fen);
    const m = p.moves.split(' ')[0];
    c.move({ from: m.slice(0, 2) as Square, to: m.slice(2, 4) as Square, promotion: m[4] as 'q' | undefined });
    return c;
  } catch {
    return null;
  }
}

describe('tactic detectors vs labeled ground truth', () => {
  it('mateIn1 puzzles: mate_threat fires for the solver (≥97% on a fixed sample)', { timeout: 120_000 }, () => {
    const sample = puzzles.filter((p) => p.themes?.includes('mateIn1')).slice(0, 150);
    let n = 0;
    let hit = 0;
    for (const p of sample) {
      const c = solverPosition(p);
      if (!c || c.isCheck()) continue; // the detector's documented in-check skip
      n += 1;
      const solver = c.turn();
      if (detectTactics(c.fen()).tactics.some((t) => t.type === 'mate_threat' && t.beneficiary === solver)) hit += 1;
    }
    expect(n).toBeGreaterThan(120);
    expect(hit / n, `${hit}/${n} mateIn1 puzzles detected`).toBeGreaterThanOrEqual(0.97);
  });

  it('every description claim is TRUE of the board across a mixed sample', { timeout: 120_000 }, () => {
    // Every "<piece> on <square>" in every emitted description must match the
    // board, and every mate_threat's named from-square must really mate.
    const sample = puzzles.filter((_, i) => i % 60 === 0); // 250 spread across ratings
    let claims = 0;
    const lies: string[] = [];
    for (const p of sample) {
      const c = solverPosition(p);
      if (!c) continue;
      const res = detectTactics(c.fen());
      for (const t of res.tactics) {
        for (const m of t.description.matchAll(/(pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])/g)) {
          claims += 1;
          const got = c.get(m[2] as Square);
          if (!got || got.type !== NAME2SYM[m[1]]) lies.push(`${p.id} ${t.type}: "${t.description}" — ${m[2]} holds ${got?.type ?? 'nothing'}`);
        }
        if (t.type === 'mate_threat') {
          claims += 1;
          try {
            const probe = new Chess(c.fen().replace(/ (w|b) /, ` ${t.beneficiary} `));
            const mates = probe.moves({ verbose: true }).some((mv) => mv.from === t.involvedSquares[0] && mv.san.includes('#'));
            if (!mates) lies.push(`${p.id} mate_threat names ${t.involvedSquares[0]} but no mate from there`);
          } catch {
            lies.push(`${p.id} mate_threat position unprobeable`);
          }
        }
      }
    }
    expect(claims).toBeGreaterThan(250);
    expect(lies, lies.slice(0, 3).join(' | ')).toHaveLength(0);
  });

  it('backRankMate+mateIn1 puzzles: the weakness reads through back_rank or mate_threat', { timeout: 120_000 }, () => {
    const sample = puzzles.filter((p) => p.themes?.includes('backRankMate') && p.themes?.includes('mateIn1'));
    let n = 0;
    let hit = 0;
    for (const p of sample) {
      const c = solverPosition(p);
      if (!c || c.isCheck()) continue;
      n += 1;
      const solver = c.turn();
      const mine = detectTactics(c.fen()).tactics.filter((t) => t.beneficiary === solver);
      if (mine.some((t) => t.type === 'back_rank' || t.type === 'mate_threat')) hit += 1;
    }
    expect(n).toBeGreaterThan(20);
    expect(hit, `${hit}/${n}`).toBe(n);
  });
});
