/**
 * PATTERN · KING AND PAWN, KING IN FRONT — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoardForTest, type LastMove } from './board';
import { KP_KING_IN_FRONT } from './kp-king-in-front';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: '8/8/8/1K6/p7/8/1k6/8 b - - 0 95', side: 'b', before: '8/8/8/1p6/p1K5/8/1k6/8 w - - 0 95', uci: 'c4b5', from: 'model-games mg-pro-ericrosen-stafford-fourknights ply 189 (Kxb5)' },
  { fen: '8/8/7K/8/6p1/5k2/8/8 b - - 0 61', side: 'b', before: '8/8/6Kp/8/6p1/5k2/8/8 w - - 0 61', uci: 'g6h6', from: 'model-games mg-pro-samayraina-scandi-2 ply 121 (Kxh6)' },
  { fen: '7K/8/8/8/6p1/5k2/8/8 b - - 0 68', side: 'b', before: '7q/6K1/8/8/6p1/5k2/8/8 w - - 0 68', uci: 'g7h8', from: 'david chesscom-144843807776 ply 135 (Kxh8)' },
];

const TWINS: Twin[] = [
  { fen: '8/5p2/2K5/4k3/8/7R/8/8 b - - 0 59', side: 'b', before: '8/5p2/2K5/4k3/8/2R4p/8/8 w - - 0 59', uci: 'c3h3', from: 'model-games mg-lichess-SivhQWtT ply 117 (Rxh3)', missing: 'extra-material' },
  { fen: '8/8/4n3/6pK/5k2/8/8/8 w - - 12 71', side: 'b', before: '8/8/4n3/4k1pK/8/8/8/8 b - - 11 70', uci: 'e5f4', from: 'model-games mg-alekhine-main ply 140 (Kf4)', missing: 'extra-material' },
  { fen: '8/8/8/5KP1/8/8/6k1/8 w - - 0 65', side: 'w', before: '8/8/8/5KP1/8/7k/6R1/8 b - - 0 64', uci: 'h3g2', from: 'model-games mg-pro-gothamchess-tromp-naroditsky-c5 ply 128 (Kxg2)', missing: 'king-not-in-front' },
  { fen: '8/8/1K6/8/8/8/pk6/8 w - - 0 97', side: 'b', before: '8/8/1K6/8/8/p7/1k6/8 b - - 1 96', uci: 'a3a2', from: 'model-games mg-pro-ericrosen-stafford-fourknights ply 192 (a2)', missing: 'king-not-in-front' },
  { fen: '8/8/8/1K6/8/Pk6/8/8 b - - 0 58', side: 'w', before: '8/8/8/Kp6/8/Pk6/8/8 w - - 7 58', uci: 'a5b5', from: 'david chesscom-145963445708 ply 115 (Kxb5)', missing: 'pawn-hangs' },
  { fen: '8/8/4pK2/8/3k4/8/8/8 w - - 0 47', side: 'b', before: '8/5p2/4PK2/8/3k4/8/8/8 b - - 0 46', uci: 'f7e6', from: 'lichess rr7p9rfd ply 92 (fxe6)', missing: 'pawn-hangs' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return KP_KING_IN_FRONT.presentAfter ? KP_KING_IN_FRONT.presentAfter(fen, last, f.side) : KP_KING_IN_FRONT.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return KP_KING_IN_FRONT.nearMissesAfter ? KP_KING_IN_FRONT.nearMissesAfter(fen, last, f.side) : KP_KING_IN_FRONT.nearMisses(fen, f.side);
};

describe('pattern · kp-king-in-front', () => {
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
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...KP_KING_IN_FRONT.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(KP_KING_IN_FRONT.failTwins.length).toBeGreaterThan(0);
    for (const fen of KP_KING_IN_FRONT.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(KP_KING_IN_FRONT.present(fen, 'w') || KP_KING_IN_FRONT.present(fen, 'b'), fen).toBe(false);
    }
  });
});
