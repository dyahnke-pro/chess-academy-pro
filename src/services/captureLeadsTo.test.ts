import { describe, expect, it } from 'vitest';
import { captureLeadsTo } from './captureLeadsTo';
import { afterCaptureSan } from '../utils/captureWords';
import { moveAspects } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE } from './captureRun';

// WHAT A CAPTURE LEADS TO is a count of what it NETS. A capture the take-back
// costs is the exchange, never the whole piece: "Rxg8+ wins a queen" was said
// of a rook taken back by the king (positions from the master games the
// capture gate walks).
describe('captureLeadsTo: the net, read off the board', () => {
  it('a capture the king takes back wins the queen FOR the rook', () => {
    const l = captureLeadsTo('r5QK/8/8/3k4/8/8/4R3/8 b - - 0 86', 'Rxg8+');
    expect(l).toEqual({ kind: 'nets', captured: 'q', free: false, gave: 'r' });
    expect(afterCaptureSan(l!, 'verb')).toBe('wins a queen for a rook');
  });

  it('a capture nothing can take back is free, and gives nothing', () => {
    const l = captureLeadsTo('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'exd5');
    expect(l).toEqual({ kind: 'trade', piece: 'p', captured: 'p' });
    const free = captureLeadsTo('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', 'exd5');
    expect(free).toEqual({ kind: 'nets', captured: 'p', free: true, gave: null });
  });

  it('the lesson composer says the exchange too: a rook taken by a pawn that is taken back', () => {
    const a = moveAspects({ fenBefore: '4q2k/2r1r1p1/4PR1p/p1p5/P2pQ2P/1P1B1R2/6P1/6K1 b - - 0 38', san: 'gxf6', prev: NO_PREV_CAPTURE, moverIsStudent: true });
    const win = a?.aspects.find((x) => x.idea === 'win-material');
    expect(win?.text).toBe('winning a rook for a pawn');
  });
});
