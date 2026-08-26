import { describe, it, expect } from 'vitest';
import { buildDeliberation, deliberationFacts } from './deliberation';

// Italian, White to move after 1.e4 e5 2.Nf3 Nc6 3.Bc4. A real choice: castle
// (best), Nxe5?? (drops the knight — Nc6xe5), d3 (playable, less precise).
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3';
const line = (rank: number, evaluation: number, uci: string) => ({ rank, evaluation, moves: [uci], mate: null });

describe('buildDeliberation — the weighing from the fan', () => {
  const analysis = { topLines: [line(1, 30, 'e1g1'), line(2, -250, 'f3e5'), line(3, 10, 'd2d3')] };

  it('names the best move and weighs the alternatives', () => {
    const d = buildDeliberation({ analysis, fenBefore: FEN, moverColor: 'w' });
    expect(d).not.toBeNull();
    expect(d!.best.san).toBe('O-O');
    expect(d!.isRealChoice).toBe(true);
    expect(d!.alternatives.map((a) => a.san)).toEqual(['Nxe5', 'd3']);
  });

  it('flags the material-dropping alternative concretely (board-true)', () => {
    const d = buildDeliberation({ analysis, fenBefore: FEN, moverColor: 'w' })!;
    const nxe5 = d.alternatives.find((a) => a.san === 'Nxe5')!;
    expect(nxe5.shortfall).toBe('drops-material');
    expect(nxe5.drops).toMatchObject({ piece: 'n', square: 'e5' });
  });

  it('classifies a near-eval alternative as merely less precise, not a blunder', () => {
    const d = buildDeliberation({ analysis, fenBefore: FEN, moverColor: 'w' })!;
    const d3 = d.alternatives.find((a) => a.san === 'd3')!;
    expect(d3.shortfall).toBe('less-precise');
    expect(d3.drops).toBeUndefined();
  });

  it('renders the weighing as ordered board-true facts', () => {
    const d = buildDeliberation({ analysis, fenBefore: FEN, moverColor: 'w' })!;
    const facts = deliberationFacts(d);
    expect(facts).toMatch(/Nxe5\? That drops the knight on e5\./);
    expect(facts).toMatch(/d3 is playable, but not as precise\./);
    expect(facts).toMatch(/The move is O-O\.$/);
  });

  it('honours the "first 3, maybe 4" cap', () => {
    const wide = { topLines: [line(1, 30, 'e1g1'), line(2, 20, 'd2d3'), line(3, 10, 'd2d4'), line(4, 5, 'b1c3'), line(5, 0, 'h2h3')] };
    const d = buildDeliberation({ analysis: wide, fenBefore: FEN, moverColor: 'w', maxCandidates: 3 })!;
    expect(d.alternatives.length).toBe(2); // best + 2 alternatives = 3 candidates
  });

  it('is NOT a real choice when the fan has one line (forced / only-move)', () => {
    const d = buildDeliberation({ analysis: { topLines: [line(1, 30, 'e1g1')] }, fenBefore: FEN, moverColor: 'w' })!;
    expect(d.isRealChoice).toBe(false);
    expect(deliberationFacts(d)).toBe('');
  });
});
