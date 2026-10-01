import { describe, it, expect } from 'vitest';
import { passerKinds, outsidePasserDecoy, pawnEndingTrade } from './endgamePawnReads';

describe('passerKinds', () => {
  it('names an outside passer away from the main mass', () => {
    const k = passerKinds('8/4kppp/8/8/P7/8/4KPPP/8 w - - 0 1', 'w');
    expect(k).toEqual([{ square: 'a4', protected: false, connected: false, outside: true }]);
  });
  it('names protected and connected passers', () => {
    const k = passerKinds('8/8/4k3/2PP4/1P6/8/5K2/8 w - - 0 1', 'w');
    const by = Object.fromEntries(k.map((x) => [x.square, x]));
    expect(by.c5.connected).toBe(true);
    expect(by.c5.protected).toBe(true); // b4 defends c5
    expect(by.d5.connected).toBe(true);
  });
});

describe('outsidePasserDecoy', () => {
  it('the far passer drags their king away while yours takes the other wing', () => {
    const d = outsidePasserDecoy('8/4kppp/8/8/P7/8/4KPPP/8 w - - 0 1', 'w');
    expect(d?.text).toBe('Your outside passed pawn on a4 is a decoy: push it, and while their king goes to stop it, yours walks over and takes the pawns on the kingside.');
  });
  it('silent with pieces on, and when their king cannot catch it (that is the square rule)', () => {
    expect(outsidePasserDecoy('8/4kppp/8/8/P7/8/4KPPP/7R w - - 0 1', 'w')).toBeNull();
    expect(outsidePasserDecoy('8/5ppp/7k/P7/8/8/4KPPP/8 w - - 0 1', 'w')).toBeNull();
  });
});

describe('pawnEndingTrade', () => {
  // Rooks come off: Rxd8 Kxd8 leaves kings and pawns.
  const fen = '3rk3/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
  it('a trade into a pawn ending that cost is called out', () => {
    expect(pawnEndingTrade(fen, 'Rxd8+', null, 150, -200)?.verdict).toBe('lost');
  });
  it('a winning trade is confirmed, and a non-trade is silent', () => {
    expect(pawnEndingTrade(fen, 'Rxd8+', null, 0, 300)?.verdict).toBe('won');
    expect(pawnEndingTrade(fen, 'Kf1', null, 0, 0)).toBeNull();
  });
});

describe('the pawn-ending lane fires through Learn', () => {
  it('a losing trade into the pawn ending is said, once per game by its claim', async () => {
    const { studentMoveTeaching } = await import('./learnBoardTeaching');
    const hints = studentMoveTeaching({ fenBefore: '3rk3/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', san: 'Rxd8+', history: ['Rxd8+'], cpLoss: 150, bothCp: true, bestSan: 'Kf1', bestLine: undefined, reply: 'Kxd8', cpAfter: -150 });
    const h = hints.find((x) => x.lane === 'pawnEnding');
    expect(h?.text).toMatch(/count the pawn ending out/);
    expect(h?.claims).toEqual(['method:pawn-ending-trade']);
  }, 30_000);
  it('the outside passer decoy is said after the move that leaves it', async () => {
    const { studentMoveTeaching } = await import('./learnBoardTeaching');
    const hints = studentMoveTeaching({ fenBefore: '8/4kppp/8/8/8/P7/4KPPP/8 w - - 0 1', san: 'a4', history: ['a4'], cpLoss: 0, bothCp: true, bestSan: 'a4', bestLine: undefined, reply: null, cpAfter: 300 });
    expect(hints.find((x) => x.lane === 'pawnEnding')?.text).toMatch(/outside passed pawn on a4 is a decoy/);
  }, 30_000);
});

describe('spareTempoWasted', async () => {
  const { spareTempoWasted } = await import('./endgamePawnReads');
  const fen = '8/8/8/4k3/8/4K3/P7/8 w - - 0 1';
  it('the double push that threw a spare move away, proven by the engine', () => {
    expect(spareTempoWasted(fen, 'a4', 'a3', 150)).toMatch(/a3 kept one in reserve/);
  });
  it('silent when it did not cost, or the best was another move', () => {
    expect(spareTempoWasted(fen, 'a4', 'a3', 40)).toBeNull();
    expect(spareTempoWasted(fen, 'a4', 'Kd3', 150)).toBeNull();
  });
});

describe('kingCourse', async () => {
  const { kingCourse } = await import('./endgamePawnReads');
  it('the king heads for the pawn no pawn can defend', () => {
    // Black pawns: a6 (isolated) and f7 — the base of the f7-g6 chain, which
    // nothing can defend either; both are four king steps from e3.
    expect(['a6', 'f7']).toContain(kingCourse('6k1/5p1p/p5p1/8/8/4K3/5PPP/8 w - - 0 1', 'w')?.target);
    // With the king nearer the queenside, a6 is the course.
    expect(kingCourse('6k1/5p1p/p5p1/8/2K5/8/5PPP/8 w - - 0 1', 'w')?.target).toBe('a6');
  });
  it('silent with pieces on, or when the king is already on it', () => {
    expect(kingCourse('6k1/5p1p/p5p1/8/8/4K3/5PPP/7R w - - 0 1', 'w')).toBeNull();
    expect(kingCourse('6k1/5p1p/p5p1/1K6/8/8/5PPP/8 w - - 0 1', 'w')).toBeNull();
  });
});
