import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { gemsOnLine, clubGemToPunishGem, clubGemToMistake } from './clubGems';
import type { ClubGem } from './clubGems';
import { isSurfaceableGem, isWeaponGem, MATE_CP } from '../data/lessons/punishGems';

const key = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen().split(' ').slice(0, 4).join(' '); };
const gem = (over: Partial<ClubGem>): ClubGem => ({
  line: 'e4 e5 Bc4 Bc5 Qh5', slip: 'Nc6', by: 'black', best: 'Qe7', games: 900, share: 31, moverScore: 22,
  punish: 'Qxf7#', mate: true, won: 0, endCp: 100000, juice: 9, ...over,
});

describe('gemsOnLine', () => {
  it('finds a gem by its board, whatever move order the line took, and never the line\'s own move', () => {
    const scholar = gem({});
    // The line reaches the slip's board by another order: Bc4 before e5…Bc5.
    const boards = { [key(['e4', 'e5', 'Bc4', 'Bc5', 'Qh5'])]: [scholar, gem({ slip: 'g6', mate: false, won: 0, juice: 1 })] };
    const hits = gemsOnLine(boards, ['e4', 'e5', 'Bc4', 'Bc5', 'Qh5', 'g6', 'Qf3']);
    expect(hits.map((h) => h.gem.slip)).toEqual(['Nc6']);
    expect(hits[0].atPly).toBe(5);
    expect(hits[0].prefix).toEqual(['e4', 'e5', 'Bc4', 'Bc5', 'Qh5']);
  });

  it('reads the line\'s last board too', () => {
    const boards = { [key(['e4', 'e5', 'Bc4', 'Bc5', 'Qh5'])]: [gem({})] };
    expect(gemsOnLine(boards, ['e4', 'e5', 'Bc4', 'Bc5', 'Qh5'])).toHaveLength(1);
  });
});

describe('clubGemToPunishGem', () => {
  it('replays the gem along the line\'s own moves and clears the trap bar', () => {
    const g = clubGemToPunishGem({ gem: gem({}), atPly: 5, prefix: ['e4', 'e5', 'Bc4', 'Bc5', 'Qh5'] }, 'bishops-opening')!;
    expect(g.playLine).toBe('e4 e5 Bc4 Bc5 Qh5 Nc6 Qxf7#');
    expect(g.engineCp).toBe(MATE_CP);
    expect(g.computed).toBe(true);
    expect(isWeaponGem(g) && isSurfaceableGem(g)).toBe(true);
    expect(g.why).toBe('31% of club players under 1600 play Nc6 here, and Qxf7# mates.');
    expect(g.practicalScore).toBe(78);
  });

  it('an attack the engine reads as winning before any material falls is said as winning by force, never as material', () => {
    const damiano = gem({ line: 'e4 e5 Nf3 f6 Nxe5', slip: 'fxe5', punish: 'Qh5+ Ke7 Qxe5+ Kf7 Bc4+', mate: false, won: 0, endCp: 305, by: 'black', share: 41 });
    const g = clubGemToPunishGem({ gem: damiano, atPly: 5, prefix: ['e4', 'e5', 'Nf3', 'f6', 'Nxe5'] }, 'x')!;
    expect(g.why).toBe('41% of club players under 1600 play fxe5 here, and Qh5+ wins by force.');
    expect(isWeaponGem(g)).toBe(true);
  });

  it('a punish the line cannot play is dropped', () => {
    expect(clubGemToPunishGem({ gem: gem({ punish: 'Qxf8#' }), atPly: 5, prefix: ['e4', 'e5', 'Bc4', 'Bc5', 'Qh5'] }, 'x')).toBeNull();
  });
});

describe('clubGemToMistake', () => {
  it('the student\'s own slip: Watch plays it punished, Learn drills the move instead', () => {
    const m = clubGemToMistake({ gem: gem({ by: 'black' }), atPly: 5, prefix: ['e4', 'e5', 'Bc4', 'Bc5', 'Qh5'] })!;
    expect(m.wrongMove).toBe('Nc6');
    expect(m.correctMove).toBe('Qe7');
    expect(m.punishmentLine?.moves).toEqual(['Nc6', 'Qxf7#']);
    expect(m.lineMoves).toEqual(['e4', 'e5', 'Bc4', 'Bc5', 'Qh5']);
    expect(m.explanation).toContain('Qe7 keeps the position');
  });

  it('no engine move, no watch-out', () => {
    expect(clubGemToMistake({ gem: gem({ best: null }), atPly: 5, prefix: ['e4', 'e5', 'Bc4', 'Bc5', 'Qh5'] })).toBeNull();
  });
});
