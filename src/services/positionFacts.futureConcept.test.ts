// LEARN NAMES NO MOVE UNASKED — a concept on a future board reached by the
// student's own move waits (replay 2026-10-19, David's Smith-Morra after
// 25.Rf1+ Kg8: "After Nhf6+, exf6, Nxf6+, your knight on f6 forks…").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

const SANS = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7 Bxf7+ Kxf7 Ng5+ Ke8 Bf4 Nf6 Re1 Qa5 Qb3 Rf8 Rad1 Ng4 Rd5 Qb4 Bg3 Be5 Nxh7 Bxg3 hxg3 Rxf2 Rg5 Qxb3 axb3 Rxb2 Rxg6 Kf7 Rg5 Rf2 Nd5 Bd7 Rxg4 Rxg2+ Kxg2 Bxg4 Rf1+ Kg8'.split(' ');

describe('a future-board concept waits for the student\'s move', () => {
  it('Learn does not say the line; a question may', async () => {
    const { computePositionFacts } = await import('./positionFacts');
    const c = new Chess(); for (const s of SANS) c.move(s);
    const fen = c.fen();
    const pv: string[] = [];
    const b = new Chess(fen);
    for (const s of ['Nhf6+', 'exf6', 'Nxf6+', 'Kg7', 'Nxg4']) { const m = b.move(s); pv.push(`${m.from}${m.to}`); }
    const analysis = { topLines: [{ rank: 1, evaluation: 300, moves: pv, mate: null }, { rank: 2, evaluation: 0, moves: [], mate: null }], evaluation: 300, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 800, draw: 150, loss: 50 } };
    const read = async (namesBestMove: boolean): Promise<string> => (await computePositionFacts({ boardComputers: 'surface', posture: 'interrupt', fen, moverColor: 'w', studentColor: 'w', analysis, history: SANS, namesBestMove } as never)).clauses.map((x: { text: string }) => x.text).join(' ');
    expect(await read(false)).not.toMatch(/Nhf6|knight to f6/);
  }, 30_000);
});
