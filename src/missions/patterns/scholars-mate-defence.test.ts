/**
 * PATTERN · SCHOLAR'S MATE DEFENCE — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoardForTest, type LastMove } from './board';
import { SCHOLARS_MATE_DEFENCE } from './scholars-mate-defence';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: 'rnb1k1nr/pp3p1p/2pp1q1b/8/3PP1pP/2N3p1/PPP1N3/R1BQKB1R w KQkq - 0 10', side: 'w', before: 'rnb1k1nr/pp3p1p/2pp1q1b/8/3PPppP/2N3P1/PPP1N3/R1BQKB1R b KQkq - 0 9', uci: 'f4g3', from: 'model-games mg-lichess-pIV55Pi8 ply 18 (fxg3)' },
  { fen: 'r1b1kb1r/1p3pp1/p4q1p/8/8/3Bp3/PP1N1PPP/R2QK2R w KQkq - 0 13', side: 'w', before: 'r1b1kb1r/1p3pp1/p4q1p/8/3p4/3BP3/PP1N1PPP/R2QK2R b KQkq - 1 12', uci: 'd4e3', from: 'model-games mg-pro-gothamchess-qgd-0 ply 24 (dxe3)' },
  { fen: 'rnbqkb1r/pp2pppp/1n6/1p2N3/3P4/5Q2/PPP2PPP/RNB1K2R b KQkq - 1 8', side: 'b', before: 'rnbqkb1r/pp2pppp/1n6/1p2N3/3P4/8/PPP2PPP/RNBQK2R w KQkq - 0 8', uci: 'd1f3', from: 'model-games mg-pro-naroditsky-alekhine-philippians-1 ply 15 (Qf3)' },
];

const TWINS: Twin[] = [
  { fen: 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N2Q2/PPPP2PP/R1B1KBNR b KQkq - 1 5', side: 'b', before: 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5', uci: 'd1f3', from: 'model-games mg-lichess-BfvmTiCI ply 9 (Qf3)', missing: 'not-mate' },
  { fen: 'rn1qkbnr/pp2pppp/2p5/3p4/4P3/2N2Q1P/PPPP1PP1/R1B1KB1R b KQkq - 0 5', side: 'b', before: 'rn1qkbnr/pp2pppp/2p5/3p4/4P3/2N2b1P/PPPP1PP1/R1BQKB1R w KQkq - 0 5', uci: 'd1f3', from: 'model-games mg-caro-two-knights ply 9 (Qxf3)', missing: 'not-mate' },
  { fen: '2bqk2r/5pp1/1pp1p3/3pP1N1/1b1Pn2P/2N2Q2/2PB1PP1/4K2R w Kk - 1 19', side: 'b', before: '2bqk2r/5pp1/1pp1pn2/3pP1N1/1b1P3P/2N2Q2/2PB1PP1/4K2R b Kk - 0 18', uci: 'f6e4', from: 'david chesscom-144070844818 ply 36 (Ne4)', missing: 'not-their-move' },
  { fen: 'r3kbr1/pp3p1R/5Q2/3Rp1B1/8/6n1/PPP5/1K6 w q - 0 23', side: 'b', before: 'r3kbr1/pp3p1R/5Q2/3Rp1B1/8/6P1/PPP1n3/1K6 b q - 0 22', uci: 'e2g3', from: 'david chesscom-148216019488 ply 44 (Nxg3)', missing: 'not-their-move' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return SCHOLARS_MATE_DEFENCE.presentAfter ? SCHOLARS_MATE_DEFENCE.presentAfter(fen, last, f.side) : SCHOLARS_MATE_DEFENCE.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return SCHOLARS_MATE_DEFENCE.nearMissesAfter ? SCHOLARS_MATE_DEFENCE.nearMissesAfter(fen, last, f.side) : SCHOLARS_MATE_DEFENCE.nearMisses(fen, f.side);
};

describe('pattern · scholars-mate-defence', () => {
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
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...SCHOLARS_MATE_DEFENCE.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(SCHOLARS_MATE_DEFENCE.failTwins.length).toBeGreaterThan(0);
    for (const fen of SCHOLARS_MATE_DEFENCE.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(SCHOLARS_MATE_DEFENCE.present(fen, 'w') || SCHOLARS_MATE_DEFENCE.present(fen, 'b'), fen).toBe(false);
    }
  });
});
