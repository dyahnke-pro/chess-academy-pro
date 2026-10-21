import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { chancesAt, decidingBlunder, judgeChance, leftLoose, type FocusMove, type ReadLine } from './focusChances';
import type { FocusId } from './focusCard';

// Every chance on a REAL board, each beside a FAIL TWIN — a board that looks
// like the pattern with one condition missing and must NOT pose it
// (docs/CAMPAIGN.md §3's card ship rule, applied to the focus checks).

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const play = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const keys = (fen: string, focus: FocusId, lines: ReadLine[] | null = null): string[] => {
  const student = fen.split(' ')[1] === 'w' ? 'w' : 'b';
  return chancesAt({ fen, prevFen: null, student, lines }, focus).map((c) => c.key);
};
const move = (fen: string, san: string, lines: ReadLine[] | null = null, cpLoss: number | null = null): FocusMove => ({
  fenBefore: fen, san, fenAfter: play(fen, san), student: fen.split(' ')[1] === 'w' ? 'w' : 'b', cpLoss, lines,
});

/** A knight on e5 with nothing guarding it; d4 takes it. */
const LOOSE_KNIGHT = '4k3/8/8/4n3/3P4/8/8/3QK3 w - - 0 1';
/** Twin: the knight is guarded by f6 and only the queen attacks it. */
const GUARDED_KNIGHT = '4k3/8/5p2/4n3/8/8/4Q3/4K3 w - - 0 1';
/** Your knight on e4 attacked by the d5 pawn. */
const KNIGHT_HIT = '4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1';
/** Twin: the rook on e8 attacks it, f3 guards it — the rook will not take. */
const KNIGHT_GUARDED = '4r1k1/8/8/8/4N3/5P2/8/4K3 w - - 0 1';
/** The queen guards d4 from d1; the black queen on d8 hits it. */
const QUEEN_GUARDS = '3qk3/8/8/8/3N4/8/8/3QK3 w - - 0 1';
/** Nc7+ forks the king and the queen. */
const FORK_SHOT = 'q3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';
const FORK_LINES: ReadLine[] = [
  { moves: ['d5c7', 'e8d7', 'c7a8', 'd7c6'], evaluation: 900, mate: null },
  { moves: ['e1d2', 'a8a2'], evaluation: -800, mate: null },
];
/** The Fried Liver: 6.Nxf7 forks the queen and the rook — Black to answer. */
const FRIED = after(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7']);
/** Scholar's mate threat: Qxf7# is threatened — Black to answer. */
const SCHOLAR = after(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4']);
/** Move 8, castling ready. */
const CASTLE_READY = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 8';
/** Mate in one on f7. */
const SCHOLAR_MATE = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4';

describe('loose pieces', () => {
  it('TAKE: a piece of theirs that can be won is posed; the capture finds it', () => {
    expect(keys(LOOSE_KNIGHT, 'loose-pieces')).toEqual(['take:e5']);
    const [ch] = chancesAt({ fen: LOOSE_KNIGHT, prevFen: null, student: 'w', lines: null }, 'loose-pieces');
    expect(judgeChance(ch, move(LOOSE_KNIGHT, 'dxe5'))).toBe('found');
    expect(judgeChance(ch, move(LOOSE_KNIGHT, 'Kf2'))).toBe('missed');
  });
  it('TAKE twin: a guarded piece the exchange does not win is not loose', () => {
    expect(keys(GUARDED_KNIGHT, 'loose-pieces')).toEqual([]);
  });
  it('TAKE with a read: a capture the engine does not back is bait, not a loose piece', () => {
    const bait: ReadLine[] = [{ moves: ['e1f2'], evaluation: 50, mate: null }, { moves: ['d4e5'], evaluation: -400, mate: null }];
    expect(keys(LOOSE_KNIGHT, 'loose-pieces', bait)).toEqual([]);
  });
  it('SAVE: your attacked piece is posed; moving it to safety finds it, leaving it misses', () => {
    const [ch] = chancesAt({ fen: KNIGHT_HIT, prevFen: null, student: 'w', lines: null }, 'loose-pieces');
    expect(ch).toMatchObject({ kind: 'save', counts: { attackers: 1, defenders: 0 } });
    expect(judgeChance(ch, move(KNIGHT_HIT, 'Nc3'))).toBe('found');
    expect(judgeChance(ch, move(KNIGHT_HIT, 'Kd2'))).toBe('missed');
  });
  it('SAVE twin: an attacked piece the exchange does not lose is not loose', () => {
    expect(keys(KNIGHT_GUARDED, 'loose-pieces')).toEqual([]);
  });
  it('LEAVE: a move that takes a guard away leaves a piece loose; keeping the guard does not', () => {
    expect(leftLoose(move(QUEEN_GUARDS, 'Qb3'))?.key).toBe('leave:d4');
    expect(leftLoose(move(QUEEN_GUARDS, 'Qd2'))).toBeNull();
    // A check answered first: the capture is not legal for them, nothing is loose.
    expect(leftLoose(move(QUEEN_GUARDS, 'Qh5'))).toBeNull();
  });
});

describe('tactics', () => {
  it('SHOT: a forcing line that wins and stands clear of the next move is posed; playing it finds it', () => {
    const [ch] = chancesAt({ fen: FORK_SHOT, prevFen: null, student: 'w', lines: FORK_LINES }, 'tactics');
    expect(ch).toMatchObject({ kind: 'shot', answerSan: 'Nc7+', gain: 9 });
    expect(judgeChance(ch, move(FORK_SHOT, 'Nc7+', FORK_LINES))).toBe('found');
    expect(judgeChance(ch, move(FORK_SHOT, 'Kd2', FORK_LINES))).toBe('missed');
  });
  it('SHOT twins: no read, or a second move nearly as good, poses nothing', () => {
    expect(keys(FORK_SHOT, 'tactics', null)).toEqual([]);
    const close: ReadLine[] = [FORK_LINES[0], { moves: ['d5c3'], evaluation: 850, mate: null }];
    expect(keys(FORK_SHOT, 'tactics', close)).toEqual([]);
  });
  it('MOTIF: their standing fork is posed; taking the forker finds it, ignoring it misses', () => {
    const [ch] = chancesAt({ fen: FRIED, prevFen: null, student: 'b', lines: null }, 'tactics');
    expect(ch).toMatchObject({ kind: 'motif', tag: 'missed-their-fork' });
    expect(judgeChance(ch, move(FRIED, 'Kxf7'))).toBe('found');
    expect(judgeChance(ch, move(FRIED, 'Be6'))).toBe('missed');
  });
  it('MOTIF twin: a motif already standing last turn is not a new question', () => {
    expect(chancesAt({ fen: FRIED, prevFen: FRIED, student: 'b', lines: null }, 'tactics')).toEqual([]);
  });
});

describe('the kings', () => {
  it('MATE THREAT: their mate threat is posed; covering f7 finds it, a developing move misses', () => {
    const ch = chancesAt({ fen: SCHOLAR, prevFen: null, student: 'b', lines: null }, 'kings').find((c) => c.kind === 'mate-threat');
    expect(ch?.tag).toBe('missed-their-mate');
    expect(judgeChance(ch!, move(SCHOLAR, 'g6'))).toBe('found');
    expect(judgeChance(ch!, move(SCHOLAR, 'Nf6'))).toBe('missed');
  });
  it('CASTLE: move 8 with castling ready is posed; castling finds it', () => {
    const [ch] = chancesAt({ fen: CASTLE_READY, prevFen: null, student: 'w', lines: null }, 'kings');
    expect(ch).toMatchObject({ kind: 'castle', answerUci: 'e1g1' });
    expect(judgeChance(ch, move(CASTLE_READY, 'O-O', null, 0))).toBe('found');
  });
  it('CASTLE twin: early in the game it is not asked', () => {
    expect(keys(CASTLE_READY.replace(/ 8$/, ' 4'), 'kings')).toEqual([]);
  });
  it('MATE FOR YOU: a short forced mate is posed; the mating move finds it', () => {
    const lines: ReadLine[] = [{ moves: ['h5f7'], evaluation: 0, mate: 1 }];
    const [ch] = chancesAt({ fen: SCHOLAR_MATE, prevFen: null, student: 'w', lines }, 'kings');
    expect(ch).toMatchObject({ kind: 'mate-for-you', answerSan: 'Qxf7#', mateIn: 1 });
    expect(judgeChance(ch, move(SCHOLAR_MATE, 'Qxf7#', lines))).toBe('found');
  });
  it('MATE FOR YOU twin: a mate too long to ask about is not posed', () => {
    expect(keys(SCHOLAR_MATE, 'kings', [{ moves: ['h5f7'], evaluation: 0, mate: 7 }])).toEqual([]);
  });
});

describe('the deciding blunder', () => {
  const BEFORE = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';
  it('hanging the queen decides the game', () => {
    expect(decidingBlunder(move(BEFORE, 'Qh5'))).toEqual({ kind: 'material', squares: ['h5'] });
  });
  it('a normal developing move does not', () => {
    expect(decidingBlunder(move(BEFORE, 'Nc3'))).toBeNull();
  });
  it('a position already lost has nothing left to decide', () => {
    const lost: ReadLine[] = [{ moves: ['b1c3'], evaluation: -600, mate: null }];
    expect(decidingBlunder(move(BEFORE, 'Qh5', lost))).toBeNull();
  });
});
