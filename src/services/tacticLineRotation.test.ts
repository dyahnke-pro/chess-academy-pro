import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { guardRemovalLine, tacticDescription } from './tacticsDetector';
import { pinConsequence } from './lookaheadPlan';
import { reasonFormula } from '../utils/reasonFormula';
import { motifSaidCounts } from './motifLedger';

// THE WHY STANDARD'S MEASURE 3 (Review prod audit 2026-11-04, game CuQmjkwk):
// "Moving the knight would let their bishop take your queen on c7" and "Your
// queen on c7 is the only defender of your bishop on d6 — and it can be taken"
// each said three times. A pattern's sentence rotates by how often it has been
// said this game, so the same formula never comes back a third time.
describe('a tactic line rotates by occurrence, never by ply', () => {
  const formulasOver = (texts: string[]): Map<string, number> => {
    const out = new Map<string, number>();
    for (const t of texts) { const f = reasonFormula(t); if (f) out.set(f, (out.get(f) ?? 0) + 1); }
    return out;
  };

  it('six removals of the guard in a game say no formula more than twice', () => {
    const lines = [0, 1, 2, 3, 4, 5].map((n) => guardRemovalLine('queen', 'c7', 'bishop', 'd6', n));
    for (const [, n] of formulasOver(lines)) expect(n).toBeLessThanOrEqual(2);
  });

  it('the detector re-says the removal from its own board, keeping its pieces and squares', () => {
    const fen = '4k3/8/3b4/8/8/8/2q5/4K3 w - - 0 1';
    new Chess(fen);
    const tac = { type: 'removal_of_guard', description: 'x', involvedSquares: ['c7', 'd6'] };
    // c7 is empty on this board → the detector's own words.
    expect(tacticDescription(tac, fen, 1)).toBe('x');
    const fen2 = '4k3/2q5/3b4/8/8/8/8/4K3 w - - 0 1';
    for (let r = 0; r < 4; r += 1) {
      const s = tacticDescription(tac, fen2, r);
      expect(s).toMatch(/queen on c7/);
      expect(s).toMatch(/bishop on d6/);
    }
    // Any other pattern is its description.
    expect(tacticDescription({ type: 'fork', description: 'a fork', involvedSquares: [] }, fen2, 3)).toBe('a fork');
  });

  it('six pins against a piece say no formula more than twice', () => {
    // White bishop b5 pins the c6 knight to the e8 rook.
    const fen = '4r1k1/8/2n5/1B6/8/8/8/6K1 b - - 0 1';
    const byOccurrence = [0, 1, 2, 3, 4, 5].map((n) => pinConsequence(fen, ['b5', 'c6', 'e8'], 'w', 'student', n) ?? '');
    for (const [, n] of formulasOver(byOccurrence)) expect(n).toBeLessThanOrEqual(2);
  });

  it('the count is read off the spoken motif keys, by pattern, either seat', () => {
    const counts = motifSaidCounts(['pin@w|12|b5c6e8', 'pin@b|15|g4f3d1', 'removal_of_guard@w|20|c7d6', 'pin@w|21|b5c6e8']);
    expect(counts.get('pin')).toBe(3);
    expect(counts.get('removal_of_guard')).toBe(1);
  });
});
