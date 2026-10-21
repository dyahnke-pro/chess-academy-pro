/**
 * PATTERN · BACK-RANK MATE — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoard, type LastMove } from './board';
import { BACK_RANK_MATE } from './back-rank-mate';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: '5rk1/6p1/p1Q1p2p/p3p3/P3P3/2P5/1P4PP/5R1K b - - 0 24', side: 'b', before: '5rk1/6p1/p1Q1p2p/p3p3/P3P3/2P5/1P4PP/3R1q1K w - - 2 24', uci: 'd1f1', from: 'model-games mg-pro-samayraina-sicilian-black-x5 ply 47 (Rxf1)' },
  { fen: '5rk1/p4ppp/bp6/b1p1P3/3P4/2P3Q1/2P2PPP/2q1R1K1 b - - 1 21', side: 'b', before: '5rk1/p4ppp/bp6/b1p1P3/3P4/2P1R1Q1/2P2PPP/2q3K1 w - - 0 21', uci: 'e3e1', from: 'david chesscom-134946542669 ply 41 (Re1)' },
  { fen: '3R1rk1/4Qppp/p3p3/q7/1p6/7P/2P2PP1/4R1K1 w - - 2 29', side: 'w', before: '3R1rk1/4Qppp/p3p3/8/1p6/7P/q1P2PP1/4R1K1 b - - 1 28', uci: 'a2a5', from: 'david chesscom-136402194633 ply 56 (Qa5)' },
];

const TWINS: Twin[] = [
  { fen: '1r5k/r3q1pn/7p/p1p1PR2/2Bp4/1P5Q/P5PP/2R3K1 w - - 1 28', side: 'w', before: '1r3n1k/r3q1p1/7p/p1p1PR2/2Bp4/1P5Q/P5PP/2R3K1 b - - 0 27', uci: 'f8h7', from: 'model-games mg-fischer-spassky-g6 ply 54 (Nh7)', missing: 'escapes' },
  { fen: '2r1r3/3n1pk1/6bp/8/Np1q2P1/1P1n2P1/3Q2BP/1N1R1R1K b - - 2 32', side: 'b', before: '2r1r3/3n1pk1/6bp/8/Np1q2P1/1P1n2P1/3Q2BP/1N1R1RK1 w - - 1 32', uci: 'g1h1', from: 'model-games mg-kasparov-karpov-wch85 ply 63 (Kh1)', missing: 'escapes' },
  { fen: '6k1/p4ppp/1pp1p3/q7/P3nP2/2P2QPP/2PR2B1/6K1 b - - 0 22', side: 'w', before: '6k1/p4ppp/1pp1p3/q7/P3nP2/2P2QPP/2Pr2B1/3R2K1 w - - 0 22', uci: 'd1d2', from: 'model-games mg-caro-two-knights ply 43 (Rxd2)', missing: 'not-their-move' },
  { fen: '5B1k/p4Qpp/1n6/8/8/1BnK1PPb/P6P/5r2 b - - 5 31', side: 'w', before: '5B1k/p4Qpp/1n6/8/8/1Bn2PPb/P3K2P/5r2 w - - 4 31', uci: 'e2d3', from: 'model-games mg-carlsen-english-revsic ply 61 (Kd3)', missing: 'not-their-move' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return BACK_RANK_MATE.presentAfter ? BACK_RANK_MATE.presentAfter(fen, last, f.side) : BACK_RANK_MATE.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return BACK_RANK_MATE.nearMissesAfter ? BACK_RANK_MATE.nearMissesAfter(fen, last, f.side) : BACK_RANK_MATE.nearMisses(fen, f.side);
};

describe('pattern · back-rank-mate', () => {
  it('every fixture is a legal board, reached by a legal move from the board before it', () => {
    for (const f of [...POSITIVES, ...TWINS]) {
      expect(isLegalBoard(f.before), f.from).toBe(true);
      expect(isLegalBoard(f.fen), f.from).toBe(true);
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
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...BACK_RANK_MATE.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(BACK_RANK_MATE.failTwins.length).toBeGreaterThan(0);
    for (const fen of BACK_RANK_MATE.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(BACK_RANK_MATE.present(fen, 'w') || BACK_RANK_MATE.present(fen, 'b'), fen).toBe(false);
    }
  });
});
