// A TAB'S GEMS, BOTH SEATS (WO-ALL-OPENINGS-01, David 2026-10-29: "slips are
// part of the opening tab!! Known mistakes for you user and opponent"): the
// opponent's traps, the opponent's known mistakes (under the trap bar, never a
// trap) and the student's own slips (traps and known mistakes) — most common
// first.
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import type { ClubGem } from './clubGems';
import { isKnownSlipGem, isWeaponGem } from '../data/lessons/punishGems';
import type { OpeningRecord } from '../types';

const board = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ').filter(Boolean)) c.move(s); return c.fen().split(' ').slice(0, 4).join(' '); };
// Real calculator rows on the Scotch, Black's tab (a Black repertoire): White's
// 6.Nxc6?? Qxf2# (their trap), 4.Nb5? (their known mistake, invented here only
// as a row shape on a real board), and Black's own 3…Nf6? (the student's slip).
const LINE = 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 c3 Qf6';
const boards: Record<string, ClubGem[]> = {
  [board(LINE)]: [{ tier: 'trap', line: LINE, slip: 'Nxc6', by: 'white', best: 'Be3', games: 59, share: 7.2, moverScore: 3, punish: 'Qxf2#', mate: true, won: 0, endCp: 100000, juice: 13.59 }],
  [board('e4 e5 Nf3 Nc6 d4 exd4')]: [{ tier: 'known', line: 'e4 e5 Nf3 Nc6 d4 exd4', slip: 'Bc4', by: 'white', best: 'Nxd4', games: 300, share: 9, moverScore: 45, punish: 'Bc5 O-O d6 c3 dxc3 Nxc3', mate: false, won: 1, endCp: 80, juice: 1 }],
  [board('e4 e5 Nf3 Nc6 d4')]: [
    { tier: 'known', line: 'e4 e5 Nf3 Nc6 d4', slip: 'd6', by: 'black', best: 'exd4', games: 80, share: 3, moverScore: 40, punish: 'dxe5 dxe5 Qxd8+ Kxd8', mate: false, won: 0, endCp: 90, juice: 1 },
    { tier: 'known', line: 'e4 e5 Nf3 Nc6 d4', slip: 'Nf6', by: 'black', best: 'exd4', games: 120, share: 4, moverScore: 40, punish: 'd5 Nb8 Nxe5', mate: false, won: 1, endCp: 150, juice: 1 },
  ],
};
vi.mock('./dataFile', () => ({ loadDataJson: (p: string) => Promise.resolve(p === '/data/club-gems.json' ? { meta: { gems: 1 }, boards } : null), isLookupPath: () => true }));

const { builtGemsFor } = await import('./builtReplies');
const opening = { id: 'scotch-black', name: 'Scotch Game', eco: 'C45', color: 'black', pgn: LINE, variations: [] } as unknown as OpeningRecord;

describe('a tab\'s gems, both seats', () => {
  it('their traps, their known mistakes, and the student\'s own slips most common first', async () => {
    const gems = await builtGemsFor(opening, -1);
    expect(gems.weapons.map((g) => g.inaccuracy)).toEqual(['Nxc6']);
    expect(gems.weapons.every(isWeaponGem)).toBe(true);
    expect(gems.theirSlips.map((g) => g.inaccuracy)).toEqual(['Bc4']);
    expect(gems.theirSlips.every((g) => isKnownSlipGem(g) && !isWeaponGem(g))).toBe(true);
    expect(gems.theirSlips[0].why).toBe('9% of club players under 1600 play Bc4 here, and Bc5 wins a pawn.');
    expect(gems.watchOuts.map((m) => m.wrongMove)).toEqual(['Nf6', 'd6']);
    expect(gems.watchOuts[1].explanation).toMatch(/dxe5 takes the better game\. exd4 keeps the position\./);
  });
});
