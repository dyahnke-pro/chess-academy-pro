// Hard walk 2026-10-10: "what's their best defence?" and "is there a faster
// win?" were answered with the alternatives list. Each is now its own kind,
// answered by a board computer.
import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { answerBoardTurn, setBoardEngineForTests } from './boardTurnAnswer';
import { readTurnInCode } from './chatTurnCodeReader';

const toUci = (fen: string, sans: string[]): string[] => {
  const c = new Chess(fen);
  return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
};
const engineWith = (fen: string, lines: Array<{ sans: string[]; evaluation: number; mate: number | null }>) => setBoardEngineForTests({
  analysis: async () => ({ topLines: lines.map((l, i) => ({ rank: i + 1, moves: toUci(fen, l.sans), evaluation: l.evaluation, mate: l.mate })), evaluation: lines[0].evaluation, isMate: lines[0].mate != null, mateIn: lines[0].mate, seldepth: 20, depth: 20, wdl: null }) as never,
  candidate: async () => null,
});
const turn = (kind: string, referents: unknown[] = []) => ({ kind, referents, seat: 'me', topic: null }) as never;
afterEach(() => setBoardEngineForTests(null));

// 0GomC: White mates in 4 with Nh6+.
const GOMC = '6k1/p1p4p/1p2n1p1/3pQ3/3P1nN1/2PB2qP/PP4P1/6K1 w - - 18 33';
const MATE = ['Nh6+', 'Kf8', 'Qf6+', 'Ke8', 'Bb5+', 'c6', 'Bxc6#'];
// 0Fs8O: a won pawn ending, nothing countable within the horizon.
const PAWN = '8/8/1p4pp/p2k1p2/P2P1P1P/4K1P1/8/8 w - - 0 35';

describe('their best defence', () => {
  it('names the reply and the mate it cannot stop, and hands the line to the board', async () => {
    engineWith(GOMC, [{ sans: MATE, evaluation: 100000, mate: 4 }]);
    const out: { lines?: unknown[] } = {};
    const text = await answerBoardTurn(turn('best-defence'), { fen: GOMC, history: [], studentColor: 'white' }, out as never);
    expect(text).toBe("Against Nh6+, their best defence is …Kf8, and it is not enough: Qf6+, Ke8, Bb5+, c6 and Bxc6# — and it's mate.");
    expect(out.lines).toHaveLength(1);
  });
  it('with nothing countable, names the reply and the next move', async () => {
    engineWith(PAWN, [{ sans: ['Kd3', 'Kd6', 'Kc4', 'Kc6'], evaluation: 495, mate: null }]);
    const text = await answerBoardTurn(turn('best-defence'), { fen: PAWN, history: [], studentColor: 'white' }, {});
    expect(text).toBe("Against Kd3, their best defence is …Kd6. Then the engine's next move for you is Kc4.");
  });
});

describe('a faster win', () => {
  it('a mate in 4 is the fastest', async () => {
    engineWith(GOMC, [{ sans: MATE, evaluation: 100000, mate: 4 }, { sans: ['Qxd5'], evaluation: 300, mate: null }]);
    expect(await answerBoardTurn(turn('faster-win'), { fen: GOMC, history: [], studentColor: 'white' })).toBe('Nh6+ is the fastest — it starts a forced mate in 4 moves; nothing mates sooner.');
  });
  it('one move keeps the win, the rest give it back', async () => {
    engineWith(PAWN, [{ sans: ['Kd3'], evaluation: 495, mate: null }, { sans: ['h5'], evaluation: -100, mate: null }, { sans: ['Ke2'], evaluation: -370, mate: null }]);
    expect(await answerBoardTurn(turn('faster-win'), { fen: PAWN, history: [], studentColor: 'white' })).toMatch(/^Kd3 is the only move that keeps the win.*every other move gives it back\.$/);
  });
});

describe('the walk\'s phrasings reach these kinds, not the alternatives', () => {
  it.each([
    'What if they don’t take — what’s their best defence?',
    'Is there a faster or cleaner win?',
  ])('"%s" is not read in code as alternatives', (q) => {
    const t = readTurnInCode(q, { fen: GOMC, history: [], studentColor: 'white' } as never);
    expect(t?.kind ?? null).not.toBe('alternatives');
  });
});
