import { describe, it, expect } from 'vitest';
import { refuteWrongTry } from './puzzleTeaching';

const fixed = (line: string[] | null) => async (): Promise<string[] | null> => line;

describe('refuteWrongTry — a wrong puzzle move is answered by their line', () => {
  it('a move that allows mate: the mate is played out', async () => {
    // Qh5 + Bc4 on f7: …Nf6? walks into Qxf7#.
    const r = await refuteWrongTry({
      fenBefore: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
      wrongSan: 'Nf6',
      analyse: fixed(['h5f7']),
    });
    expect(r?.kind).toBe('mate');
    expect(r?.text).toBe('Nf6? Then Qxf7# — they mate you.');
    expect(r?.arrows.map((a) => `${a.from}${a.to}`)).toEqual(['h5f7']);
  });
  it('a move that drops material: the line to where it lands', async () => {
    const r = await refuteWrongTry({
      fenBefore: 'r6k/8/8/8/8/8/8/R3K3 w Q - 0 1',
      wrongSan: 'Kd1',
      analyse: fixed(['a8a1', 'd1e2', 'h8g7']),
    });
    expect(r?.kind).toBe('material');
    expect(r?.text).toBe("Kd1? Then …Rxa1+ — they come out a rook up.");
  });
  it('the line starts with THEIR reply — the right answer is never named', async () => {
    const r = await refuteWrongTry({
      fenBefore: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
      wrongSan: 'Nf6',
      analyse: fixed(['h5f7']),
    });
    // …g6 / …Qe7 defend; neither may appear.
    expect(r?.text).not.toMatch(/g6|Qe7/);
  });
  it('nothing computed → silence, never a guess', async () => {
    const r = await refuteWrongTry({
      fenBefore: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
      wrongSan: 'Kd2',
      analyse: fixed(['e8d7']),
    });
    expect(r).toBeNull();
  });
  it('an illegal move or an engine failure is not an answer', async () => {
    expect(await refuteWrongTry({ fenBefore: '4k3/8/8/8/8/8/8/4K2R w K - 0 1', wrongSan: 'Qd8', analyse: fixed(null) })).toBeNull();
    expect(await refuteWrongTry({ fenBefore: '4k3/8/8/8/8/8/8/4K2R w K - 0 1', wrongSan: 'Kd2', analyse: async () => { throw new Error('engine'); } })).toBeNull();
  });
});
