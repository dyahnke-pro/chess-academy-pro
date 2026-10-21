/**
 * PATTERN · KNIGHT FORK — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoardForTest, type LastMove } from './board';
import { KNIGHT_FORK } from './knight-fork';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: 'r4k2/2R1R3/pn1r2p1/5p2/1P1p1P1p/3B4/P2K2PP/8 b - - 3 31', side: 'b', before: 'r4k2/2R5/pn1r2p1/5p2/1P1p1P1p/3B4/P2KR1PP/8 w - - 2 31', uci: 'e2e7', from: 'model-games mg-fischer-petrosian ply 61 (Ree7)' },
  { fen: '2rqr1k1/5p2/p2B1n1p/3P1bp1/Np6/1P1n1B2/P2Q1PPP/1N1R1RK1 b - - 0 22', side: 'b', before: '2rqr1k1/5p2/p2b1n1p/3P1bp1/Np6/1P1n1BB1/P2Q1PPP/1N1R1RK1 w - - 0 22', uci: 'g3d6', from: 'model-games mg-kasparov-karpov-wch85 ply 43 (Bxd6)' },
  { fen: '4r2k/q5bp/4R3/4P1P1/P1Q4R/2N5/1rn3KP/8 b - - 0 42', side: 'b', before: '4r2k/q5bp/4R3/4P1P1/P1Q4R/2N5/1rn3bP/7K w - - 0 42', uci: 'h1g2', from: 'model-games mg-kasparov-karpov-wch85-g24 ply 83 (Kxg2)' },
];

const TWINS: Twin[] = [
  { fen: '4q2k/2r1r1pn/4P2p/p1p2R2/P2pQ2P/1P1B1R2/6P1/6K1 b - - 8 37', side: 'b', before: '4q2k/2r1r1pn/4P2p/p1p1QR2/P2p3P/1P1B1R2/6P1/6K1 w - - 7 37', uci: 'e5e4', from: 'model-games mg-fischer-spassky-g6 ply 73 (Qe4)', missing: 'knight-lost' },
  { fen: 'r4k2/2Rn1p2/p2r2p1/3p4/1P3P1p/3B1K2/P3R1PP/8 b - - 1 28', side: 'b', before: 'r4k2/2Rn1p2/p2r2p1/3p4/1P3P1p/3B4/P3RKPP/8 w - - 0 28', uci: 'f2f3', from: 'model-games mg-fischer-petrosian ply 55 (Kf3)', missing: 'knight-lost' },
  { fen: '2r1r3/5pk1/6bp/8/Np1qnRP1/1P1n2P1/3Q2BP/1N1R3K w - - 5 34', side: 'b', before: '2r1r3/5pk1/5nbp/8/Np1q1RP1/1P1n2P1/3Q2BP/1N1R3K b - - 4 33', uci: 'f6e4', from: 'model-games mg-kasparov-karpov-wch85 ply 66 (Ne4)', missing: 'not-their-move' },
  { fen: '8/6p1/4k3/2Rbp3/1B1p2P1/5PK1/1n6/8 w - - 16 54', side: 'b', before: '8/3k2p1/8/2Rbp3/1B1p2P1/5PK1/1n6/8 b - - 15 53', uci: 'd7e6', from: 'model-games mg-kasparov-scotch-game ply 106 (Ke6)', missing: 'not-their-move' },
  { fen: 'rnbqk2r/ppp1bppp/4pn2/3p2B1/2PP4/2N2N2/PP2PPPP/R2QKB1R b KQkq - 4 5', side: 'b', before: 'rnbqk2r/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 3 5', uci: 'c1g5', from: 'model-games mg-fischer-spassky-g6 ply 9 (Bg5)', missing: 'wins-nothing' },
  { fen: 'r1b2k2/r4ppp/p4n2/2NpR3/1P6/3B1P2/P5PP/R5K1 b - - 2 21', side: 'b', before: 'r1b2k2/r4ppp/p4n2/2Np4/1P6/3B1P2/P5PP/R3R1K1 w - - 1 21', uci: 'e1e5', from: 'model-games mg-fischer-petrosian ply 41 (Re5)', missing: 'wins-nothing' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return KNIGHT_FORK.presentAfter ? KNIGHT_FORK.presentAfter(fen, last, f.side) : KNIGHT_FORK.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return KNIGHT_FORK.nearMissesAfter ? KNIGHT_FORK.nearMissesAfter(fen, last, f.side) : KNIGHT_FORK.nearMisses(fen, f.side);
};

describe('pattern · knight-fork', () => {
  it('every fixture is a legal board, reached by a legal move from the board before it', () => {
    for (const f of [...POSITIVES, ...TWINS]) {
      expect(isLegalBoardForTest(f.before), f.from).toBe(true);
      expect(isLegalBoardForTest(f.fen), f.from).toBe(true);
      expect(replay(f).fen, f.from).toBe(f.fen);
    }
  });

  it('is present on the real boards where it arose', () => {
    expect(POSITIVES.length).toBeGreaterThan(0);
    for (const f of POSITIVES) expect(read(f), f.from).toBe(true);
  });

  it('every fail twin reads false and names its one missing condition', () => {
    for (const t of TWINS) {
      expect(read(t), t.from).toBe(false);
      expect(misses(t), t.from).toContain(t.missing);
    }
  });

  it('has a fail twin for every near miss it can name', () => {
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...KNIGHT_FORK.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(KNIGHT_FORK.failTwins.length).toBeGreaterThan(0);
    for (const fen of KNIGHT_FORK.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(KNIGHT_FORK.present(fen, 'w') || KNIGHT_FORK.present(fen, 'b'), fen).toBe(false);
    }
  });
});
