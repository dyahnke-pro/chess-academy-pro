import { describe, it, expect } from 'vitest';
import { slipCause } from './slipCause';
import { classifyMisconceptionNow } from './misconceptionClassifier';

describe('slipCause — every slip is named', () => {
  it('a pawn that is simply taken is hung material', () => {
    // 7.e5? fxe5 — the e5 pawn goes at once (acc-corpus).
    const c = slipCause({
      fen: 'rn1qkbnr/pb2p1p1/1p1p1p1p/2pP4/2B1P3/5N2/PPP2PPP/RNBQ1RK1 w kq - 0 7',
      playedSan: 'e5', bestSan: 'Nh4',
      pvAfterPlayed: ['fxe5', 'Nh4', 'Nf6', 'f4', 'e4', 'Nc3'], pvAfterBest: ['g6', 'Nc3'],
      evalBefore: 90, evalAfterPlayed: -96, phase: 'opening',
    });
    expect(c?.tag).toBe('hung-material');
    expect(c?.coachNote).toMatch(/fxe5|pawn/);
  });

  it('a move that allows mate is the threat that had to be stopped', () => {
    const c = slipCause({
      fen: '3R4/2Q3k1/5p2/p5qp/8/P7/1PP1r1bP/1K4R1 b - - 0 32',
      playedSan: 'Kh6', bestSan: 'Kg6', pvAfterPlayed: ['Rh8+', 'Kg6', 'Qh7#'], phase: 'middlegame',
    });
    expect(c?.tag).toBe('missed-opponents-threat');
  });

  it('a quiet pawn move that is not a lever is not called a break', () => {
    const c = slipCause({
      fen: 'r1b2rk1/2pn1pbp/p3p1p1/1p4B1/3PN3/2P2N2/qP3PPP/2RQR1K1 w - - 0 15',
      playedSan: 'Qd2', bestSan: 'b3', pvAfterPlayed: [], pvAfterBest: [], phase: 'middlegame',
    });
    expect(c?.tag).not.toBe('mistimed-pawn-break');
  });

  it('the engine naming the played move is not a slip', () => {
    expect(slipCause({ fen: '5rk1/pp3ppp/8/b3p3/2P1qr2/P3B3/4Q3/R3KR2 w - - 2 29', playedSan: 'Bd2', bestSan: 'Bd2', phase: 'middlegame' })).toBeNull();
  });

  it('the classifier no longer falls to other on a real slip (old code: other)', () => {
    const cls = classifyMisconceptionNow({
      fen: 'r1b2rk1/2pn1pbp/p3p1p1/1p4B1/3PN3/2P2N2/qP3PPP/2RQR1K1 w - - 0 15',
      playedSan: 'Qd2', bestSan: 'b3', gamePhase: 'middlegame',
    });
    expect(cls?.tag).not.toBe('other');
  });
});

describe('the engine naming the played move', () => {
  it('is classified none, never other, so it is not recorded', () => {
    const cls = classifyMisconceptionNow({ fen: '5rk1/pp3ppp/8/b3p3/2P1qr2/P3B3/4Q3/R3KR2 w - - 2 29', playedSan: 'Bd2', bestSan: 'Bd2', gamePhase: 'middlegame' });
    expect(cls?.tag).toBe('none');
  });
});

describe('the reason computer says what is lost, never "material — material"', () => {
  it('a K+P ending that loses further down the line', () => {
    const c = slipCause({
      fen: '8/6p1/6k1/7p/5PK1/8/8/8 w - - 0 50', playedSan: 'Kg3', bestSan: 'Kh4',
      pvAfterPlayed: ['Kf5', 'Kh4', 'g6', 'Kg3', 'Ke4', 'f5'], pvAfterBest: ['Kf5', 'Kxh5', 'Kxf4'],
      evalBefore: 0, evalAfterPlayed: -2570, phase: 'endgame',
    });
    expect(c?.coachNote ?? '').not.toMatch(/material — material/);
  });
});
