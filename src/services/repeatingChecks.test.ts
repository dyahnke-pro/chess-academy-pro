import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { perpetualCheck, perpetualStartedBy, perpetualLine, windmill, windmillStartedBy } from './repeatingChecks';
import { readBoard } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';

// Danya's game board, voiced note vc-4_Ev1a1_2Mg-62 (his White, after
// …Kxg8 Rg1+ Kf8): the queen can check from b8 and d6 forever (…Qe8 blocks,
// Qd6+ …Qe7, Qb8+ again). He played on and won (note 67: Rg7, Kxg7, Qxe8) —
// the engine (Stockfish 16, depth 16, White-POV) reads mate in 8 here and
// +847 after Qb8+, so the perpetual is real and NOT his idea.
const FEN = '5k2/p3q2p/4Pr2/4Qp2/4B3/2P5/P1P4P/6RK w - - 2 32';
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const AFTER_QB8 = after(FEN, 'Qb8+');
// Stockfish after Qb8+ (Black to move), converted to White-POV.
const WINNING_READ = [{ cp: 847, mate: null, moves: ['e7e8', 'e6e7', 'f8e7', 'b8c7'] }];
// Danya's board vc-4_Ev1a1_2Mg-61 (after Rxg8+ Kxg8 Rg1+, Black to move in
// check): his …Kf8 leaves White the checks.
const BOARD_61 = '6k1/p3q2p/4Pr2/4Qp2/4B3/2P5/P1P4P/6RK b - - 1 31';

describe('perpetualCheck: checks the king cannot run from', () => {
  it('finds the queen\'s checks from b8 and d6 on his board', () => {
    const p = perpetualCheck(FEN);
    expect(p).toMatchObject({ side: 'w', king: 'f8' });
    expect(p!.from.map((f) => f.square).sort()).toEqual(['b8', 'd6']);
    expect(p!.from.every((f) => f.piece === 'q')).toBe(true);
  });
  it('Qb8+ starts it: every reply of Black\'s meets the next check', () => {
    const p = perpetualStartedBy(FEN, 'Qb8+');
    expect(p?.checks[0]).toBe('Qb8+');
    expect(perpetualLine(p!, true, true, AFTER_QB8)).toMatch(/your queen/);
    expect(perpetualLine(p!, true, true, AFTER_QB8)).toMatch(/b8 and d6|d6 and b8/);
  });
  it('a quiet move starts nothing, and the other side has no perpetual', () => {
    expect(perpetualStartedBy(FEN, 'Bd5')).toBeNull();
    // After Bd5 it is Black's move: no forcing checks of Black's repeat.
    expect(perpetualCheck(after(FEN, 'Bd5'))).toBeNull();
  });
  it('the opening board has none (no checks at all)', () => {
    expect(perpetualCheck(new Chess().fen())).toBeNull();
    // Black, in check on board 61, has no perpetual of its own.
    expect(perpetualCheck(BOARD_61)).toBeNull();
  });
});

describe('both seats, through the one registry', () => {
  it('said for the student who gives the checks, when no engine read says more', () => {
    const f = readBoard('perpetualCheck', { fenBefore: FEN, san: 'Qb8+', student: 'w', replies: [] });
    expect(f?.computer).toBe('perpetualCheck');
    expect(f?.seat).toBe('student');
    expect(f?.text).toMatch(/perpetual/);
  });
  it('said as a danger to the student on the other side', () => {
    const f = readBoard('perpetualCheck', { fenBefore: FEN, san: 'Qb8+', student: 'b', replies: [] });
    expect(f?.seat).toBe('opponent');
    expect(f?.text).toMatch(/your king on f8/);
  });
  it('quiet where the engine reads the checking side as winning anyway (his game: he won)', () => {
    expect(readBoard('perpetualCheck', { fenBefore: FEN, san: 'Qb8+', student: 'w', replies: WINNING_READ })).toBeNull();
  });
  it('the chance before the move: the side to move can force it', () => {
    // Black's …Kf8 on his board 61 leaves White a perpetual.
    const f = readBoard('perpetualCheck', { fenBefore: BOARD_61, san: 'Kf8', student: 'w', replies: [] });
    expect(f?.seat).toBe('student');
    expect(f?.namesStudentMove).toBe(true);
    expect(f?.text).toMatch(/You can force a perpetual|forever|perpetual check/);
  });
});

describe('the one composer says it', () => {
  it('a lesson or Review move that starts the checks carries the perpetual', () => {
    const facts = moveThoughtFacts({
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: FEN, san: 'Qb8+', moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 0,
      reads: { before: [], after: [], passBefore: [], passAfter: [] } as never,
    });
    expect(facts.some((f) => f.computer === 'perpetualCheck' && /perpetual/.test(f.text))).toBe(true);
  });
});

// Lichess puzzle 00Vdx (themes: discoveredCheck, morphysMate, mateIn2), the
// board after White's Bxh8: …Rxg2+ is a discovered check from the bishop on
// f3 that takes, but it is a MATE (…Rg4#), not a windmill, and the rook's
// next "capture" on h2 is taken by the king. Must not fire.
const MORPHY = '2k3rB/ppp2p1p/2np4/8/4P3/2NB1b2/PPP2PPP/R4RK1 b - - 0 13';
// Lichess puzzle 091zO (discoveredCheck, morphysMate, mateIn2), the board
// after White's Bxe6: the same rook-and-bishop battery, again a mate.
const MORPHY2 = '6r1/1k2B2p/p3B3/1p6/P7/5b2/1P3PPP/5RK1 b - - 1 28';

describe('windmill: the discovered-check see-saw', () => {
  it('a battery that mates is the mate\'s idea, not a windmill', () => {
    expect(windmill(MORPHY)).toBeNull();
    expect(windmill(MORPHY2)).toBeNull();
    expect(windmillStartedBy(MORPHY, 'Rxg2+')).toBeNull();
  });
  it('no battery, no windmill', () => {
    expect(windmill(FEN)).toBeNull();
    expect(windmill(new Chess().fen())).toBeNull();
    expect(readBoard('windmill', { fenBefore: FEN, san: 'Qb8+', student: 'w' })).toBeNull();
  });
});

// Lichess puzzle 0Kdtf (1848; discoveredCheck, sacrifice, crushing): after
// White's queen sacrifice Qxf4 exf4, the rook on g1 and the bishop on a1 turn
// a windmill — Rxg7+ Kh8, Rxf7+ (the bishop checks) Kg8, Rg7+ Kh8, Rxb7+.
const SAC = '1q3rk1/1p3pp1/2p4p/3Ppb2/1PP2Q1P/5P2/8/B4BRK b - - 0 29';
const MILL = '1q3rk1/1p3pp1/2p4p/3P1b2/1PP2p1P/5P2/8/B4BRK w - - 0 30';

describe('windmill on a real board (Lichess 0Kdtf)', () => {
  it('finds the rook and the bishop behind it, and what the rook takes', () => {
    const w = windmill(MILL);
    expect(w).toMatchObject({ side: 'w', sail: { piece: 'r', square: 'g1' }, axle: { piece: 'b', square: 'a1' } });
    expect(w!.takes.map((t) => t.square)).toEqual(['f7', 'b7']);
  });
  it('Rxg7+ turns its first sail', () => {
    expect(windmillStartedBy(MILL, 'Rxg7+')).toMatchObject({ sail: { square: 'g1' }, axle: { square: 'a1' } });
    // A rook check that walks away from the bishop's line turns nothing.
    expect(windmillStartedBy(MILL, 'Rg8+')).toBeNull();
  });
  it('their …exf4 leaves the student the windmill: a chance, both seats', () => {
    const mine = readBoard('windmill', { fenBefore: SAC, san: 'exf4', student: 'w' });
    expect(mine?.seat).toBe('student');
    expect(mine?.namesStudentMove).toBe(true);
    expect(mine?.text).toMatch(/bishop on a1/);
    const theirs = readBoard('windmill', { fenBefore: SAC, san: 'exf4', student: 'b' });
    expect(theirs?.seat).toBe('opponent');
    expect(theirs?.text).toMatch(/Their rook|their rook/);
  });
  it('the queen sacrifice itself is not a check: nothing until Black takes', () => {
    expect(windmill(SAC)).toBeNull();
  });
});

