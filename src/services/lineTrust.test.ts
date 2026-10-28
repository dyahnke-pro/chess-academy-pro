// The one naming rule (WO-DECIDER-02): two moves on one read, five on two
// agreeing reads, past five only forcing and agreed — on real lines.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lineTrust, lineIsForcing, readsAgree, NAME_NEAR_PLIES, NAME_AGREED_PLIES } from './lineTrust';
import { errorWhy, NO_SECOND_READ } from './inaccuracyCall';
import { earlierLine } from './stockfishEngine';

const uciOf = (fen: string, sans: string[]): string[] => {
  const c = new Chess(fen);
  return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
};

// A queen checking a king back and forth: every White move a check.
const CHECKS_FEN = '6k1/6pp/8/8/8/8/6PP/3Q2K1 w - - 0 1';
const CHECKS = uciOf(CHECKS_FEN, ['Qd8+', 'Kf7', 'Qd7+', 'Kf8', 'Qd8+', 'Kf7', 'Qd7+', 'Kf8', 'Qd8+', 'Kf7', 'Qd7+', 'Kf8']);
// The same board, White shuffling quietly.
const QUIET = uciOf(CHECKS_FEN, ['Qd2', 'h6', 'Qd3', 'h5', 'Qd2', 'g6', 'Qd3', 'g5', 'Qd2', 'Kg7', 'Qd3', 'Kg8']);

describe('lineTrust — distance decides how much evidence a line needs', () => {
  it('two moves: named on one read', () => {
    expect(lineTrust({ fen: CHECKS_FEN, uci: QUIET, plies: NAME_NEAR_PLIES, winner: 'w', seconds: [] })).toMatchObject({ name: true, why: 'near' });
  });
  it('three to five moves: held on one read, named when a second read plays the same moves', () => {
    expect(lineTrust({ fen: CHECKS_FEN, uci: QUIET, plies: 8, winner: 'w', seconds: [] })).toMatchObject({ name: false, why: 'unconfirmed' });
    expect(lineTrust({ fen: CHECKS_FEN, uci: QUIET, plies: 8, winner: 'w', seconds: [QUIET.slice(0, 9)] })).toMatchObject({ name: true, why: 'agreed' });
  });
  it('a second read that leaves the line before the blow does not vouch for it', () => {
    const other = [...QUIET.slice(0, 5), 'd2d1'];
    expect(lineTrust({ fen: CHECKS_FEN, uci: QUIET, plies: 8, winner: 'w', seconds: [other, null] })).toMatchObject({ name: false });
  });
  it('past five moves: agreed AND forcing (David: "Ok to name the line if all forcing")', () => {
    expect(lineTrust({ fen: CHECKS_FEN, uci: CHECKS, plies: NAME_AGREED_PLIES + 1, winner: 'w', seconds: [CHECKS] })).toMatchObject({ name: true, why: 'forcing-agreed', forcing: true });
    expect(lineTrust({ fen: CHECKS_FEN, uci: QUIET, plies: NAME_AGREED_PLIES + 1, winner: 'w', seconds: [QUIET] })).toMatchObject({ name: false, why: 'not-forcing' });
    expect(lineTrust({ fen: CHECKS_FEN, uci: CHECKS, plies: NAME_AGREED_PLIES + 1, winner: 'w', seconds: [] })).toMatchObject({ name: false, why: 'unconfirmed' });
  });
  it('forcing reads only the winner\'s moves; the defender may play anything', () => {
    expect(lineIsForcing(CHECKS_FEN, CHECKS, CHECKS.length, 'w')).toBe(true);
    expect(lineIsForcing(CHECKS_FEN, QUIET, QUIET.length, 'w')).toBe(false);
  });
  it('agreement is the same moves to the blow, read by coordinates', () => {
    expect(readsAgree(QUIET, [QUIET.slice(0, 4)], 4)).toBe(true);
    expect(readsAgree(QUIET, [QUIET.slice(0, 3)], 4)).toBe(false);
    expect(readsAgree(QUIET, [], 4)).toBe(false);
  });
});

describe('the error computer names a far line only on a second read (real games)', () => {
  // chesscom-863924511, 13.O-O-O: the engine's line wins a knight for a pawn
  // five moves on (…Rb8, f4, …b5, h5, …Bxg5, fxg5, …bxc4).
  const castle = {
    fenBefore: 'r1bq1rk1/pp3p1p/3pp1pb/2p3N1/2BnP2P/2NP2Q1/PPP2PP1/R3K2R w KQ - 3 13',
    playedSan: 'O-O-O',
    reply: ['a8b8', 'f2f4', 'b7b5', 'h4h5', 'h6g5', 'f4g5', 'b5c4', 'g3h4', 'b8b7', 'd3c4', 'g8h8'],
  };
  const base = {
    fenBefore: castle.fenBefore, playedSan: castle.playedSan, moverColor: 'white' as const, bestSan: null, bestLineUci: null,
    replyLineUci: castle.reply, missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake' as const, priorMove: null, namesBetterMove: false,
  };
  it('one read: the five-move line is held — the old code named it', () => {
    expect(errorWhy({ ...base, secondReads: NO_SECOND_READ }).consequence).toBeNull();
  });
  it('two agreeing reads: named, with the line on the board', () => {
    const ew = errorWhy({ ...base, secondReads: { reply: [castle.reply], best: [] } });
    expect(ew.consequence).toBe("it let them win a knight for a pawn — the engine's line gets there in 5 moves");
    expect(ew.line?.uci.length).toBeGreaterThan(NAME_NEAR_PLIES);
  });
  // chesscom-145216770269, 9…Bd7: a knight and a pawn for a bishop six moves
  // on — past five, a quiet line, so even agreeing reads do not name it.
  it('past five moves a quiet line stays held even when the reads agree', () => {
    const reply = ['b5c6', 'b7c6', 'e5d3', 'd6e7', 'c1e3', 'f6g4', 'e3g1', 'e8c8', 'd1e2', 'g4f6', 'g1a7', 'h8e8', 'h2h3', 'c6c5', 'a7c5', 'f6e4', 'c3e4'];
    const ew = errorWhy({
      fenBefore: 'r3k2r/ppp2ppp/2nbbn2/1B2N3/4PP2/2N5/PPP3PP/R1BK3R b kq - 2 9', playedSan: 'Bd7', moverColor: 'black', bestSan: null, bestLineUci: null,
      replyLineUci: reply, missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, namesBetterMove: false,
      secondReads: { reply: [reply], best: [] },
    });
    expect(ew.consequence ?? '').not.toMatch(/gets there in/);
  });
});

describe('earlierLine — the free second read', () => {
  it('the deepest exact iteration at least two below the final depth', () => {
    const by = new Map<number, string[]>([[10, ['a']], [12, ['b']], [13, ['c']], [14, ['d']]]);
    expect(earlierLine(by, 14)).toEqual({ depth: 12, moves: ['b'] });
    expect(earlierLine(by, 12)).toEqual({ depth: 10, moves: ['a'] });
    expect(earlierLine(by, 10)).toBeNull();
    expect(earlierLine(undefined, 14)).toBeNull();
  });
});
