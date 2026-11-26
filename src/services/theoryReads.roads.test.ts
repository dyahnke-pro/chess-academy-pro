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

describe('transpositionRead — the roads ahead, more than one move deep', () => {
  it('a transposition two moves ahead is said with the moves that reach it', async () => {
    const { transpositionRead } = await import('./theoryReads');
    const chain: Record<number, string> = { 1: 'd5', 2: 'd4' };
    const plies = (f: string): number => (Number(f.split(' ')[5]) - 1) * 2 + (f.split(' ')[1] === 'b' ? 1 : 0);
    const r = transpositionRead({ history: ['Nf3'], movesAt: (f) => (chain[plies(f)] ? [{ san: chain[plies(f)], games: 100 } as never] : null) });
    expect(r?.text).toBe("After …d5 and d4, the game transposes into the Queen's Pawn Game: Zukertort Variation.");
  });
});

describe('structureRead — the half-open file and the majority a capture makes', () => {
  it('the Sicilian\'s cxd4 half-opens the c-file and gives Black the central majority', async () => {
    const { structureRead } = await import('./theoryReads');
    const r = structureRead({ fenBefore: fenOf(['e4', 'c5', 'Nf3', 'd6', 'd4']), san: 'cxd4', mover: 'b' });
    expect(r?.text).toBe('The c-file is half-open for Black now: a rook there bears down on the pawn on c2.');
    // The majority is the board after the recapture, read against the board
    // before the trade began.
    const m = structureRead({ fenBefore: fenOf(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4']), san: 'Nxd4', mover: 'w', prior: { fenBefore: fenOf(['e4', 'c5', 'Nf3', 'd6', 'd4']), san: 'cxd4' } });
    expect(m?.text).toBe('Black has the central pawn majority now: more pawns on the d- and e-files to build the centre with.');
  });
});

describe('endgameRead — the queens off', () => {
  it('an ending reached in the opening is said; queens on and no trade ahead is not', async () => {
    const { endgameRead } = await import('./theoryReads');
    const berlin = fenOf(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8']);
    expect(endgameRead({ fenBefore: berlin, san: 'Nc3' })?.text).toMatch(/^With the queens off the board, this is already an endgame/);
    expect(endgameRead({ fenBefore: fenOf(['e4', 'e5']), san: 'Nf3' })).toBeNull();
  });
  it('the masters\' usual reply trading queens is said', async () => {
    const { endgameRead } = await import('./theoryReads');
    const t = endgameRead({ fenBefore: fenOf(['e4', 'e5', 'Nf3', 'd6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3']), san: 'd5', movesAt: () => [{ san: 'exd5', games: 80 } as never] });
    expect(t).toBeNull();
    const q = endgameRead({ fenBefore: fenOf(['e4', 'd6', 'd4', 'e5']), san: 'dxe5', movesAt: () => [{ san: 'dxe5', games: 80 } as never] });
    expect(q).toBeNull();
    const trade = endgameRead({ fenBefore: fenOf(['e4', 'd6', 'd4', 'e5', 'dxe5']), san: 'dxe5', movesAt: () => [{ san: 'Qxd8+', games: 80 } as never] });
    expect(trade?.text).toBe('The usual reply Qxd8 trades the queens: the game is heading for an endgame.');
  });
});

describe('structureRead — the chain and the space a pawn move makes', () => {
  it('the London pyramid c3-d4-e3 is a chain with its base', async () => {
    const { structureRead } = await import('./theoryReads');
    const r = structureRead({ fenBefore: fenOf(['d4', 'Nf6', 'Bf4', 'e6', 'e3', 'd5', 'Nd2', 'c5']), san: 'c3', mover: 'w' });
    expect(r?.text).toMatch(/^That makes a pawn chain, /);
  });
  it('the Benoni d5 takes space', async () => {
    const { structureRead } = await import('./theoryReads');
    const r = structureRead({ fenBefore: fenOf(['d4', 'Nf6', 'c4', 'c5']), san: 'd5', mover: 'w' });
    expect(r?.text).toBe('The pawn on d5 takes space: it cramps their pieces behind it and splits the board.');
    expect(structureRead({ fenBefore: fenOf(['e4', 'e5']), san: 'Nf3', mover: 'w' })).toBeNull();
  });
});

describe('trapRead — a trap behind any road masters play', () => {
  it('a trap behind a 5% road is said with that road', async () => {
    const { trapRead } = await import('./theoryReads');
    const fenBefore = fenOf(['e4', 'e5', 'Nf3', 'd6', 'Bc4']);
    const behind = fenOf(['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3']).split(' ').slice(0, 4).join(' ');
    const slipsAt = (f: string) => (f.split(' ').slice(0, 4).join(' ') === behind ? [{ tier: 'trap', line: '', slip: 'g6', by: 'black', best: null, games: 1, share: 1, moverScore: null, punish: 'Nxe5 Bxd1 Bxf7+ Ke7 Nd5#', mate: true, won: 0, endCp: 0, juice: 0 } as never] : []);
    const movesAt = (f: string) => (f.startsWith(fenOf(['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4']).split(' ')[0]) ? [{ san: 'h3', games: 95 }, { san: 'Nc3', games: 5 }] as never[] : null);
    const r = trapRead({ fenBefore, san: 'Bg4', mover: 'b', slipsAt, movesAt });
    expect(r).not.toBeNull();
    expect(r?.text).not.toMatch(/usual reply/);
  });
});

describe('gambitAcceptedRead — the offered pawn taken', () => {
  it('the Slav\'s …dxc4 takes the offered pawn; a capture taken back is no gambit', async () => {
    const { gambitAcceptedRead } = await import('./theoryReads');
    expect(gambitAcceptedRead({ fenBefore: fenOf(['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3']), san: 'dxc4', mover: 'b' })?.text)
      .toBe('…dxc4 takes the offered pawn: the gambit accepted. Now White plays for the time and the open lines it paid for.');
    expect(gambitAcceptedRead({ fenBefore: fenOf(['e4', 'd5']), san: 'exd5', mover: 'w' })).toBeNull();
  });
});

describe('endgameRead — the queen trade on a road ahead', () => {
  it('the Caro-Kann d3 line: after …dxe4 and dxe4, the queens come off', async () => {
    const { endgameRead } = await import('./theoryReads');
    const plies = (f: string): number => (Number(f.split(' ')[5]) - 1) * 2 + (f.split(' ')[1] === 'b' ? 1 : 0);
    const chain: Record<number, string> = { 5: 'dxe4', 6: 'dxe4', 7: 'Qxd1+' };
    const r = endgameRead({ fenBefore: fenOf(['e4', 'c6', 'd3', 'd5']), san: 'Nf3', movesAt: (f) => (chain[plies(f)] ? [{ san: chain[plies(f)], games: 50 } as never] : null) });
    expect(r?.text).toBe('After …dxe4 and dxe4, …Qxd1 trades the queens: an early endgame is one of the roads from here.');
  });
});

describe('hangsRead — the move that drops a piece', () => {
  it('1.a4 e5 2.Ra3 leaves the rook to …Bxa3; a developing move drops nothing', async () => {
    const { hangsRead } = await import('./theoryReads');
    expect(hangsRead(fenOf(['a4', 'e5']), 'Ra3', 'w')?.text).toBe('That lets …Bxa3 win the exchange.');
    // A queen move that leaves nothing en prise says nothing.
    expect(hangsRead(fenOf(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']), 'Qe2', 'w')).toBeNull();
    expect(hangsRead(fenOf(['e4', 'e5']), 'Nf3', 'w')).toBeNull();
    // A trade still in flight is not a piece dropped.
    expect(hangsRead(fenOf(['e4', 'd5']), 'exd5', 'w')).toBeNull();
  });
});

describe('gambitAheadRead — a gambit two moves down a masters road', () => {
  it('after …c5, d4 is the Smith-Morra Gambit by the index', async () => {
    const { gambitAheadRead } = await import('./theoryReads');
    const plies = (f: string): number => (Number(f.split(' ')[5]) - 1) * 2 + (f.split(' ')[1] === 'b' ? 1 : 0);
    const chain: Record<number, string> = { 1: 'c5', 2: 'd4' };
    const r = gambitAheadRead({ fen: fenOf(['e4']), movesAt: (f) => (chain[plies(f)] ? [{ san: chain[plies(f)], games: 50 } as never] : null) });
    // d4 itself offers nothing (the queen takes back on d4): the line is the gambit.
    expect(r?.text).toBe('After …c5, d4 is the Smith-Morra Gambit, a line where a pawn is offered for time and open lines.');
  });
});

describe('pieceJobRead — the lines a pawn move opens', () => {
  it('1.e4 opens lines for the bishop and the queen; a rook pawn opens nothing', async () => {
    const { pieceJobRead } = await import('./theoryReads');
    expect(pieceJobRead({ fenBefore: new Chess().fen(), san: 'e4', mover: 'w' })?.text).toBe('It opens lines for the queen on d1 and the bishop on f1.');
    expect(pieceJobRead({ fenBefore: new Chess().fen(), san: 'h3', mover: 'w' })).toBeNull();
  });
});

describe('transpositionRead — wasted tempi are no transposition', () => {
  it('a named board the index reaches in fewer moves than the road is not said', async () => {
    const { transpositionRead } = await import('./theoryReads');
    // 1.e4 e5 2.Nf3 Nc6 3.Ng1 Nb8: the start-of-game e4 e5 board, four plies late.
    const plies = (f: string): number => (Number(f.split(' ')[5]) - 1) * 2 + (f.split(' ')[1] === 'b' ? 1 : 0);
    const chain: Record<number, string> = { 4: 'Ng1', 5: 'Nb8' };
    expect(transpositionRead({ history: ['e4', 'e5', 'Nf3', 'Nc6'], movesAt: (f) => (chain[plies(f)] ? [{ san: chain[plies(f)], games: 50 } as never] : null) })).toBeNull();
  });
});

describe('structureRead — the doubled pawns a trade makes, and the bishop shut in', () => {
  it('Caro-Kann 5.Nxf6: only a pawn takes back, and it doubles', async () => {
    const { structureRead } = await import('./theoryReads');
    const r = structureRead({ fenBefore: fenOf(['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6']), san: 'Nxf6', mover: 'w' });
    expect(r?.text).toBe('Black can only take back on f6 with a pawn, and that doubles their pawns.');
  });
  it('…e6 before …Bf5 shuts the bishop in', async () => {
    const { structureRead } = await import('./theoryReads');
    const r = structureRead({ fenBefore: fenOf(['d4', 'd5', 'c4']), san: 'e6', mover: 'b' });
    expect(r?.text).toBe('That shuts the bishop on c8 in behind its own pawns: a bad bishop until it gets out.');
  });
});

describe('planAheadRead — the plan the Theory lecture says on the move', () => {
  it('after the French Advance e5, the plan ahead is theirs: …c5', async () => {
    const { planAheadRead, theoryExtras } = await import('./theoryReads');
    const { __setLocalDbForTests, masterMovesCachedSync } = await import('./masterPlayLookup');
    __setLocalDbForTests(JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')));
    const r = planAheadRead({ history: ['e4', 'e6', 'd4', 'd5'], san: 'e5', mover: 'w', whose: 'your', movesAt: (f) => masterMovesCachedSync(f) });
    expect(r.plan?.goal.san).toBe('c5');
    expect(r.plan?.whose).toBe('their');
    const said = new Set<string>();
    const lines = theoryExtras({ history: ['e4', 'e6', 'd4', 'd5'], fenBefore: fenOf(['e4', 'e6', 'd4', 'd5']), san: 'e5', mover: 'w', movesAt: (f) => masterMovesCachedSync(f), slipsAt: () => [], said, withPieceJob: false });
    expect(lines.join(' ')).toMatch(/Their plan[^.]*…c5/);
    __setLocalDbForTests(null);
  }, 120_000);
});

describe('sacrificeRead — a piece given on purpose', () => {
  it('a masters move that gives a piece is a sacrifice, never "hanging"', async () => {
    const { sacrificeRead, hangsRead } = await import('./theoryReads');
    // The Fried Liver: 6.Nxf7 gives the knight.
    const fen = fenOf(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5']);
    const movesAt = () => [{ san: 'd4', games: 60 }, { san: 'Nxf7', games: 40 }] as never[];
    expect(sacrificeRead({ fenBefore: fen, san: 'Nxf7', mover: 'w', movesAt })?.text).toBe('Nxf7 gives up the knight: a sacrifice, played for the attack and the time it wins.');
    expect(hangsRead(fen, 'Nxf7', 'w', movesAt)).toBeNull();
    // A move masters do not play is no sacrifice.
    expect(sacrificeRead({ fenBefore: fenOf(['a4', 'e5']), san: 'Ra3', mover: 'w', movesAt: () => [{ san: 'e4', games: 99 }] as never[] })).toBeNull();
  });
});

describe('choiceAheadRead — the choice the next move faces', () => {
  it('two real roads, each by its job; one plain move is no choice', async () => {
    const { choiceAheadRead } = await import('./theoryReads');
    const fenBefore = fenOf(['e4', 'e5']);
    const r = choiceAheadRead({ fenBefore, san: 'Nf3', mover: 'w', movesAt: () => [{ san: 'Nc6', games: 60 }, { san: 'Nf6', games: 30 }, { san: 'd6', games: 10 }] as never[] });
    expect(r?.text).toMatch(/^Next, the choice is theirs: …Nc6, which .*, …Nf6, which .* or …d6, which .*\.$/);
    expect(choiceAheadRead({ fenBefore, san: 'Nf3', mover: 'w', movesAt: () => [{ san: 'Nc6', games: 95 }, { san: 'Nf6', games: 5 }] as never[] })).toBeNull();
  });
});

describe('structureRead — the backward pawn a move makes', () => {
  it('…d6 with the e-pawn gone ahead and d5 held by White\'s pawns is a backward pawn', async () => {
    const { structureRead } = await import('./theoryReads');
    const r = structureRead({ fenBefore: '4k3/3p4/8/4p3/2P1P3/8/8/4K3 b - - 0 1', san: 'd6', mover: 'b' });
    expect(r?.text).toBe("That leaves Black a backward pawn on d6: no pawn can guard it, and it stands on a half-open file for the other side's rooks.");
  });
});
