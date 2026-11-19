import { describe, it, expect } from 'vitest';
import { readBoardAll } from './boardComputers';
import { boardReadFacts } from './boardReadFacts';
import type { AnalysisLine } from '../types';

// Danya's boards ("Weak Squares, Who Cares?" #5): "White has a formidable mass
// of pieces on the kingside while Black's rooks, c5 knight and b7 bishop are far
// from the king" — a siege that STANDS on the board. The move read (`kingSiege`)
// says one only on the move that makes it, so a read of this board was silent.
const MASS = 'r3rq2/1b3pbk/p2p2p1/1pnPn1Bp/P1p1PR2/2P3NP/1PBQ2PN/5RK1 w - - 0 27';
const MASS_LINE: AnalysisLine = { rank: 1, evaluation: 218, mate: null, depth: 16, moves: 'd2e2 g7h6 h2f3 h7g8 g5h6 f8h6 f3e5 e8e5'.split(' ') };
// Negative control ("The Positional Threat" #0): a king with its cover whole
// and no attack massed — nothing to say about either king.
const QUIET = '3r2k1/2p1nqbp/2p2pp1/2B1p3/1P2P3/4QP2/P3N1PP/1KR5 w - - 0 32';

describe('kingSiegeNow — the siege as the board stands', () => {
  it('reads the massed attack on their king, and the pieces far from home', () => {
    const [f] = readBoardAll('kingSiegeNow', { fen: MASS, student: 'w', studentCp: 218 });
    expect(f?.text).toMatch(/your pieces aims at their king on h7, and three more are a move away/);
    // A square only where two pieces need telling apart (two rooks).
    expect(f?.text).toMatch(/Their rook on a8 and light-squared bishop are two moves or more from helping/);
    expect(f?.seat).toBe('student');
  });
  it('says it from the other seat too', () => {
    const [f] = readBoardAll('kingSiegeNow', { fen: MASS, student: 'b', studentCp: -218 });
    expect(f?.text).toMatch(/your king on h7/);
    expect(f?.seat).toBe('opponent');
  });
  it('stays silent with no siege, and for an attacker the engine has losing', () => {
    expect(readBoardAll('kingSiegeNow', { fen: QUIET, student: 'w', studentCp: 175 })).toEqual([]);
    expect(readBoardAll('kingSiegeNow', { fen: MASS, student: 'w', studentCp: -200 })).toEqual([]);
  });
  it('is one of the read\'s board facts', async () => {
    const r = await boardReadFacts({ fen: MASS, studentColor: 'w', rating: 1400, before: [MASS_LINE], read: async () => null, withhold: false, tense: 'now', history: [], theory: false, readTempting: false, studentNeedContext: null });
    expect(r.facts.some((f) => f.kind === 'king-read' && f.computer === 'kingSiege' && f.from === 'position')).toBe(true);
  });
});
