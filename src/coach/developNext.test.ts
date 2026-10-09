import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { developNextAnswer, setBoardEngineForTests } from './boardTurnAnswer';
import { readTurnInCode } from './chatTurnCodeReader';

function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

const uciOf = (fen: string, san: string): string => {
  const m = new Chess(fen).move(san);
  return m.from + m.to;
};

afterEach(() => setBoardEngineForTests(null));

describe('which piece should I develop next (walk 4)', () => {
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
  const fen = fenAfter(sans);

  it('is read as develop-next, not best move', () => {
    const t = readTurnInCode('which piece should I develop next?', { fen, history: sans, studentColor: 'white' });
    expect(t?.kind).toBe('develop-next');
    expect(readTurnInCode('what should I bring out next', { fen, history: sans, studentColor: 'white' })?.kind).toBe('develop-next');
    expect(readTurnInCode('have I developed enough?', { fen, history: sans, studentColor: 'white' })?.kind).not.toBe('develop-next');
  });

  it('names the pieces at home and the developing move, and says when castling comes first', async () => {
    setBoardEngineForTests({
      async analysis() {
        return { topLines: [
          { rank: 1, evaluation: 40, moves: [uciOf(fen, 'O-O')], mate: null },
          { rank: 2, evaluation: 35, moves: [uciOf(fen, 'Nc3')], mate: null },
        ], evaluation: 40, isMate: false, mateIn: null, depth: 18, seldepth: 20, wdl: null };
      },
      async candidate() { return null; },
    });
    const a = await developNextAnswer({ fen, history: sans, studentColor: 'white' });
    expect(a).toContain('knight on b1');
    expect(a).toContain('bishop on c1');
    expect(a).toContain('Nc3');
    expect(a).toContain('O-O');
    expect(a).not.toMatch(/\d+\s*(?:cp|centipawn|points?)/);
  });

  it('says to play the engine move first when it is clearly better', async () => {
    setBoardEngineForTests({
      async analysis() {
        return { topLines: [
          { rank: 1, evaluation: 300, moves: [uciOf(fen, 'Bxf7+')], mate: null },
        ], evaluation: 300, isMate: false, mateIn: null, depth: 18, seldepth: 20, wdl: null };
      },
      async candidate(_f, san) { return san === 'Nc3' ? { evalCp: 30, mateIn: null, lineUci: [] } : { evalCp: 0, mateIn: null, lineUci: [] }; },
    });
    const a = await developNextAnswer({ fen, history: sans, studentColor: 'white' });
    expect(a).toMatch(/But first Bxf7\+/);
    expect(a).toContain('Nc3');
  });

  it('says so when everything is out', async () => {
    const f2 = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nc3', 'Nf6', 'd3', 'd6', 'Bg5', 'Bg4']);
    setBoardEngineForTests({
      async analysis() { return { topLines: [{ rank: 1, evaluation: 20, moves: [uciOf(f2, 'O-O')], mate: null }], evaluation: 20, isMate: false, mateIn: null, depth: 18, seldepth: 20, wdl: null }; },
      async candidate() { return null; },
    });
    const a = await developNextAnswer({ fen: f2, history: [], studentColor: 'white' });
    expect(a).toMatch(/all out already/);
    expect(a).toContain('O-O');
  });
});
