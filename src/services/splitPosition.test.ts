import { describe, it, expect } from 'vitest';
import { splitPosition } from './splitPosition';

describe('split the position: opposite-side castling', () => {
  it('names the two races when the kings sit on opposite wings with queens on', () => {
    const s = splitPosition('2kr3r/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 w - - 0 1'.replace('2kr3r', '2kr3r').replace('8/8/8/8', '3q4/8/8/3Q4'), 'w');
    expect(s?.text).toMatch(/^The kings are on opposite wings, so split the board: your pawns go after their king on the queenside, theirs come at yours on the kingside/);
  });
  it('silent with both kings on one wing, or queens off (negative controls)', () => {
    expect(splitPosition('r4rk1/ppp2ppp/3q4/8/8/3Q4/PPP2PPP/R4RK1 w - - 0 1', 'w')).toBeNull();
    expect(splitPosition('2kr3r/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 w - - 0 1', 'w')).toBeNull();
  });
});
