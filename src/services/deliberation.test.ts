import { describe, it, expect } from 'vitest';
import { buildDeliberation, deliberationFacts, deliberationAlternativesFacts } from './deliberation';

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
    // d3 sits inside the coin-flip band — weighing it is the banned filler.
    expect(facts).not.toMatch(/d3/);
    expect(facts).toMatch(/The move is O-O\.$/);
  });

  it('honours the "first 3, maybe 4" cap', () => {
    const wide = { topLines: [line(1, 30, 'e1g1'), line(2, 20, 'd2d3'), line(3, 10, 'd2d4'), line(4, 5, 'b1c3'), line(5, 0, 'h2h3')] };
    const d = buildDeliberation({ analysis: wide, fenBefore: FEN, moverColor: 'w', maxCandidates: 3 })!;
    expect(d.alternatives.length).toBe(2); // best + 2 alternatives = 3 candidates
  });

  it('alternatives-only facts drop the conclusion AND the coin-flip, keep the real fork', () => {
    const d = buildDeliberation({ analysis, fenBefore: FEN, moverColor: 'w' })!;
    const facts = deliberationAlternativesFacts(d);
    expect(facts).toMatch(/Nxe5\? That drops the knight on e5\./); // the real fork speaks
    expect(facts).not.toMatch(/d3/); // the ~20cp coin-flip is filler — dropped, not weighed
    expect(facts).not.toMatch(/The move is/); // no conclusion — the taught move stands
  });

  it('drops the taught move from the weighing (excludeSan — no self-contradiction)', () => {
    // The DB-canonical taught move here is d3 — it must NEVER be listed as a
    // weaker alternative against itself.
    const d = buildDeliberation({ analysis, fenBefore: FEN, moverColor: 'w', excludeSan: 'd3' })!;
    expect(d.alternatives.map((a) => a.san)).not.toContain('d3');
    expect(deliberationAlternativesFacts(d)).not.toMatch(/d3/);
  });

  it('stays SILENT on a quiet position — coin-flip alternatives are filler, not a fork', () => {
    // Three near-equal moves (all within MEANINGFUL_DELTA_CP) = a quiet opening.
    // The weighing must be '' (silence), never "X is playable, but not as precise".
    const quiet = { topLines: [line(1, 30, 'e1g1'), line(2, 20, 'd2d3'), line(3, 15, 'a2a3')] };
    const d = buildDeliberation({ analysis: quiet, fenBefore: FEN, moverColor: 'w' })!;
    expect(d.isRealChoice).toBe(true); // there ARE alternatives...
    expect(deliberationAlternativesFacts(d)).toBe(''); // ...but none worth weighing
  });

  it('is NOT a real choice when the fan has one line (forced / only-move)', () => {
    const d = buildDeliberation({ analysis: { topLines: [line(1, 30, 'e1g1')] }, fenBefore: FEN, moverColor: 'w' })!;
    expect(d.isRealChoice).toBe(false);
    expect(deliberationFacts(d)).toBe('');
  });
});

describe('S5 — a candidate is a lesson only with its reason', () => {
  it('a failing candidate carries the line that proves it fails', async () => {
    const { buildDeliberation, deliberationAlternativesFacts } = await import('./deliberation');
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4, Black to move: 3…Qh4?? 4.Nxh4 drops the queen.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    const d = buildDeliberation({
      fenBefore: fen,
      moverColor: 'b',
      analysis: { topLines: [
        { rank: 1, evaluation: -20, mate: null, moves: ['g8f6'] },
        { rank: 2, evaluation: 600, mate: null, moves: ['d8h4', 'f3h4'] },
      ] } as never,
    })!;
    const alt = d.alternatives[0];
    expect(alt.proof).toBe('Qh4 and Nxh4 — they win a queen');
    expect(deliberationAlternativesFacts(d)).toContain('Qh4? Then Nxh4 — they win a queen.');
  });

  it('NEGATIVE CONTROL: a line that proves nothing gets no invented reason', async () => {
    const { buildDeliberation } = await import('./deliberation');
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    const d = buildDeliberation({
      fenBefore: fen, moverColor: 'b',
      analysis: { topLines: [
        { rank: 1, evaluation: -20, mate: null, moves: ['g8f6'] },
        { rank: 2, evaluation: 200, mate: null, moves: ['a7a6', 'd2d4'] },
      ] } as never,
    })!;
    expect(d.alternatives[0].proof).toBeUndefined();
  });
});
