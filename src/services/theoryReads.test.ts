import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { hangRead, endgameRead, gambitRead, pieceJobRead, structureRead, theoryExtras, trapRead } from './theoryReads';
import type { ClubGem } from './clubGems';

const fenOf = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('theoryReads — what the move changed on the board', () => {
  it('a structure is said when the move makes it, and not before', () => {
    const before = fenOf(['e4', 'e6', 'd4', 'd5']);
    expect(structureRead({ fenBefore: before, san: 'e5', mover: 'w' })?.text).toMatch(/^That makes it the French pawn chain\. Your plan is to /);
    expect(structureRead({ fenBefore: fenOf(['e4', 'e6']), san: 'd4', mover: 'w' })).toBeNull();
  });
  it('a pawn the opponent can take for nothing is a gambit', () => {
    const r = gambitRead({ fenBefore: fenOf(['d4', 'd5']), san: 'c4', mover: 'w' });
    expect(r?.text).toMatch(/^It offers the pawn on c4\. That is a gambit/);
    expect(gambitRead({ fenBefore: fenOf(['e4', 'e5']), san: 'Nf3', mover: 'w' })).toBeNull();
  });
  it('the last queen coming off turns toward an endgame', () => {
    expect(endgameRead({ fenBefore: '3Qk3/8/8/8/8/8/8/4K3 b - - 0 1', san: 'Kxd8' })?.text).toMatch(/endgame/);
    expect(endgameRead({ fenBefore: fenOf(['e4', 'e5']), san: 'Nf3' })).toBeNull();
  });
  it('a piece is said by its job, and a fianchetto by the diagonal', () => {
    expect(pieceJobRead({ fenBefore: fenOf(['e4', 'e5']), san: 'Nf3', mover: 'w' })?.text).toMatch(/^Knight on f3: it /);
    expect(pieceJobRead({ fenBefore: fenOf(['Nf3', 'Nf6']), san: 'g3', mover: 'w' })?.text).toMatch(/fianchetto.*long diagonal from g2/);
  });
  const gem = (slip: string, punish: string, endCp: number, mate = false): ClubGem => ({ tier: 'trap', line: '', slip, by: 'black', best: null, games: 100, share: 10, moverScore: null, punish, mate, won: 0, endCp, juice: 0 });
  const at = (sans: string[], gems: ClubGem[]) => (f: string): readonly ClubGem[] => (f.split(' ').slice(0, 4).join(' ') === fenOf(sans).split(' ').slice(0, 4).join(' ') ? gems : []);
  it('a trap around the move is replayed by trapLine, seat-correct', () => {
    const slipsAt = at(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], [gem('Nf6', 'Qxf7#', 0, true)]);
    const r = trapRead({ fenBefore: fenOf(['e4', 'e5', 'Bc4', 'Nc6']), san: 'Qh5', mover: 'w', slipsAt, movesAt: () => null });
    expect(r?.text).toBe('A trap is set here. If they play …Nf6, Qxf7 is mate. Your queen mates on f7. The pattern: f7 is guarded only by their king. When your queen sits on h5, every slow move they make lets you look at f7.');
  });
  it('a slip under the trap bar is a known mistake, never a trap; under the floor, nothing', () => {
    const fenBefore = fenOf(['e4', 'e5', 'Bc4', 'Nc6']);
    const known = trapRead({ fenBefore, san: 'Qh5', mover: 'w', slipsAt: at(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], [gem('Nf6', 'Qxf7#', 120)]), movesAt: () => null });
    expect(known?.text).toMatch(/^A known mistake is on offer here\. /);
    expect(trapRead({ fenBefore, san: 'Qh5', mover: 'w', slipsAt: at(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], [gem('Nf6', 'Qxf7#', 20)]), movesAt: () => null })).toBeNull();
  });
  it('a reply the masters play that ignores the attack on a piece is the off-line hang', () => {
    const fen = fenOf(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd4']);
    const r = hangRead({ fen, mover: 'w', movesAt: () => [{ san: 'd6', games: 50 }, { san: 'exd4', games: 900 }] });
    expect(r?.text).toBe('Before …d6, if they ignore the attack on c5, dxc5 takes the bishop.');
    expect(hangRead({ fen, mover: 'w', movesAt: () => [{ san: 'exd4', games: 900 }] })).toBeNull();
  });
  it('a structure, a gambit or an endgame turn is news once a game', () => {
    const said = new Set<string>();
    const a = theoryExtras({ history: ['d4', 'd5'], fenBefore: fenOf(['d4', 'd5']), san: 'c4', mover: 'w', movesAt: () => null, slipsAt: () => [], said, withPieceJob: false });
    expect(a.length).toBe(1);
    const b = theoryExtras({ history: ['d4', 'd5'], fenBefore: fenOf(['d4', 'd5']), san: 'c4', mover: 'w', movesAt: () => null, slipsAt: () => [], said, withPieceJob: false });
    expect(b).toEqual([]);
  });
});
