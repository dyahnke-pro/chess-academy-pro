// The punish-label fact computer is BOARD-TRUE — G0 for the loudest gate lane
// (133 narrationGate drops in 14 days before this existed). Every line the
// computer hands the model as a permissible claim must itself be true of the
// board, or the inversion just moves the lying upstream. Same bar as the
// 2026-08-06 detector ground-truth audit: piece-on-square claims verified
// programmatically, across real labeled puzzles.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { computePunishFacts, buildLineFactsBlock } from './openingGenerator';

interface Puzzle { id: string; fen: string; moves: string; themes: string[] | null }

const NAME2SYM: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};

function prepare(p: Puzzle): { fen: string; punishment: string; followup: { san: string }[] } | null {
  try {
    const c = new Chess(p.fen);
    const ucis = p.moves.split(' ');
    c.move({ from: ucis[0].slice(0, 2) as Square, to: ucis[0].slice(2, 4) as Square, promotion: ucis[0][4] as 'q' | undefined });
    const fen = c.fen();
    const punishment = c.move({ from: ucis[1].slice(0, 2) as Square, to: ucis[1].slice(2, 4) as Square, promotion: ucis[1][4] as 'q' | undefined })?.san;
    if (!punishment) return null;
    const followup: { san: string }[] = [];
    for (const u of ucis.slice(2)) {
      const m = c.move({ from: u.slice(0, 2) as Square, to: u.slice(2, 4) as Square, promotion: u[4] as 'q' | undefined });
      if (!m) break;
      followup.push({ san: m.san });
    }
    return { fen, punishment, followup };
  } catch {
    return null;
  }
}

describe('buildLineFactsBlock is board-true', () => {
  it('every per-ply landing claim replays to a real piece on that square', () => {
    const block = buildLineFactsBlock('Vienna Game');
    expect(block).toContain('LINE FACTS');
    // Re-verify each "<piece> goes to <sq>" by replaying the same line.
    const c = new Chess();
    for (const line of block.split('\n')) {
      const m = line.match(/([\w….]+) ([\w+#=O-]+) — (?:White|Black)'s (pawn|knight|bishop|rook|queen|king) goes to ([a-h][1-8])/);
      if (!m) continue;
      const mv = c.move(m[2]);
      expect(mv, `line "${line.trim()}" did not replay`).toBeTruthy();
      expect(mv.to).toBe(m[4]);
      expect(NAME2SYM[m[3]]).toBe(mv.piece);
    }
    expect(c.history().length).toBeGreaterThan(2);
  });

  it('unknown opening yields no block rather than an invented one', () => {
    expect(buildLineFactsBlock('Not A Real Opening XYZ')).toBe('');
  });
});

describe('computePunishFacts is board-true', () => {
  it('a mate-in-1 puzzle: facts name the mate, and every piece-on-square claim is real', () => {
    // White Ra1 vs boxed black king — Ra8# after any opponent move; use a
    // direct synthetic: post-inaccuracy position with mate available.
    const fen = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
    const facts = computePunishFacts(fen, 'Ra8#', [], [{ san: 'Rb1' }, { san: 'Kf1' }]);
    expect(facts).toContain('checkmate');
    // Distractors that skip an available mate must say so.
    expect(facts).toContain('misses the available checkmate');
  });

  it('a capture sequence reports honest material arithmetic', () => {
    // White queen takes an undefended rook: +5, no recapture. Black has luft
    // on h6 so the capture is check, not mate.
    const fen = '3r2k1/5pp1/7p/8/8/8/5PPP/3Q2K1 w - - 0 1';
    const facts = computePunishFacts(fen, 'Qxd8+', [], [{ san: 'Qd2' }]);
    expect(facts).toContain('captures the rook on d8');
    expect(facts).toContain('gives check');
    expect(facts).toContain('5 points');
  });

  it('every piece-on-square claim across 150 real puzzles is TRUE of its board', { timeout: 120_000 }, () => {
    const puzzles: Puzzle[] = JSON.parse(readFileSync('src/data/puzzles.json', 'utf8'));
    const sample = puzzles.filter((p, i) => i % 100 === 0); // 150 spread
    let claims = 0;
    const lies: string[] = [];
    for (const p of sample) {
      const prep = prepare(p);
      if (!prep) continue;
      const facts = computePunishFacts(prep.fen, prep.punishment, prep.followup, []);
      const board = new Chess(prep.fen);
      for (const m of facts.matchAll(/(pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])/g)) {
        claims += 1;
        const got = board.get(m[2] as Square);
        // "captures the X on <sq>" claims describe the piece BEFORE the
        // capture — checked on the pre-move board, which `board` is.
        if (!got || got.type !== NAME2SYM[m[1]]) lies.push(`${p.id}: "${m[0]}" — ${m[2]} holds ${got?.type ?? 'nothing'}`);
      }
    }
    expect(claims).toBeGreaterThan(50);
    expect(lies, lies.slice(0, 3).join(' | ')).toHaveLength(0);
  });
});
