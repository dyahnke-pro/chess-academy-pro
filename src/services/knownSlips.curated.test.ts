import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { knownSlip, knownSlipsAt } from './knownSlips';

const fenOf = (line: string): string => { const c = new Chess(); for (const m of line.split(' ')) c.move(m); return c.fen(); };

// The Caro-Kann's curated gem (punish-gems.json): 1.e4 c6 2.d4 d5 3.Nc3 dxe4
// and White's 4.f3?, punished by …exf3 (engine +0.8 for Black).
const CARO = fenOf('e4 c6 d4 d5 Nc3 dxe4');
describe('the curated fallback for the known slips', () => {
  it('answers a board the club index holds nothing for', () => {
    const gems = knownSlipsAt({}, CARO);
    expect(gems.map((g) => g.slip)).toContain('f3');
  });
  it('the club index wins where it has the board', () => {
    const own = { [CARO.split(' ').slice(0, 4).join(' ')]: [{ line: '', slip: 'Nxe4', by: 'white' as const, best: null, games: 1, share: 1, moverScore: null, punish: 'Nf6', mate: false, won: 0, endCp: 0, juice: 0 }] };
    expect(knownSlipsAt(own, CARO).map((g) => g.slip)).toEqual(['Nxe4']);
  });
  it('the slip played is said as a known mistake with its punishment', () => {
    const r = knownSlip({ fen: CARO, gems: knownSlipsAt(null, CARO), played: 'f3', on: 'played', student: 'b', verdictPunish: null, saidNext: null, told: 0 });
    expect(r?.text).toMatch(/known mistake/);
    expect(r?.text).toMatch(/exf3/);
    expect(r?.seat).toBe('opponent');
  });
});
