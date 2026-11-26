import { describe, expect, it, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { gambitAheadRead, namedRoadsRead } from './theoryReads';
import { setOpeningPositions } from './openingPositions';

const fenOf = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

// Wikibooks at 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.d4 exd4: "5.Nd5!? is the Belgrade
// gambit". The roads one move away are named off the opening index, even where
// masters' games are thin.
describe('theoryReads — the roads by name', () => {
  beforeAll(() => setOpeningPositions(JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8'))));
  const fen = fenOf(['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'exd4']);
  it('a gambit one move away is named, with the pawn it gives up', () => {
    const r = gambitAheadRead({ fen, movesAt: () => null });
    expect(r?.text).toMatch(/^Nd5 is the Belgrade Gambit: it gives up the pawn on e4/);
  });
  it('the other named roads are said by name, never a gambit', () => {
    expect(namedRoadsRead({ fen, movesAt: () => null })).toBeNull();
    const masters = [{ san: 'Nc6', games: 80 }, { san: 'Nf6', games: 15 }, { san: 'd6', games: 4 }, { san: 'f5', games: 1 }] as never[];
    const r = namedRoadsRead({ fen: fenOf(['e4', 'e5', 'Nf3']), movesAt: () => masters });
    expect(r?.text).toMatch(/^The roads from here have names: /);
    expect(r?.text).toMatch(/…Nf6 Petrov's Defense/);
    expect(r?.text).toMatch(/…d6 the Philidor Defense/);
    expect(r?.text).not.toMatch(/Gambit|McConnell|Gunderam/);
  });
  it('the masters\' roads are the bar where masters play any', () => {
    const r = namedRoadsRead({ fen: fenOf(['e4', 'e5', 'Nf3']), movesAt: () => [{ san: 'Nf6', games: 10 } as never] });
    expect(r?.text).toMatch(/^…Nf6 is Petrov's Defense\.$/);
  });
  it('a road masters do not play is a name, not theory', () => {
    expect(namedRoadsRead({ fen: fenOf(['e4', 'e5', 'Nf3']), movesAt: () => null })).toBeNull();
  });
  it('no named road, no sentence', () => {
    expect(namedRoadsRead({ fen: '8/8/8/4k3/8/8/8/4K3 w - - 0 1', movesAt: () => null })).toBeNull();
  });
});

describe('nameRelativeTo — a name is said once', () => {
  it('a multi-word family is not glued on twice', async () => {
    const { nameRelativeTo } = await import('./theoryReads');
    const s = nameRelativeTo("Queen's Indian Defense: Queen's Indian Accelerated", "Queen's Pawn Game");
    expect(s).not.toMatch(/Queen's Indian Accelerated Queen's Indian/);
    expect(nameRelativeTo('Slav Defense: Slav Indian', "Indian Defense")).not.toMatch(/Slav Indian Slav Indian/);
  });
});

describe('gambitStandingRead — the pawn the gambit gave', () => {
  it('a pawn down for two plies with pieces level is the gambit standing', async () => {
    const { gambitStandingRead } = await import('./theoryReads');
    // Smith-Morra: 1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Nxc3 — White a pawn down.
    const r = gambitStandingRead({ fenBefore: fenOf(['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3']), san: 'Nc6', mover: 'b' });
    expect(r?.text).toMatch(/^White is a pawn down here: that is the gambit's price/);
  });
  it('a capture waiting to be taken back is no standing', async () => {
    const { gambitStandingRead } = await import('./theoryReads');
    expect(gambitStandingRead({ fenBefore: fenOf(['e4', 'd5']), san: 'exd5', mover: 'w' })).toBeNull();
    expect(gambitStandingRead({ fenBefore: fenOf(['e4', 'e5']), san: 'Nf3', mover: 'w' })).toBeNull();
  });
});
