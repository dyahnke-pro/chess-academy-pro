// The pin that breaks with tempo (questions.md item 7) — dual-use: the student's
// resource when their piece is pinned, the warning when they hold the pin.
import { describe, it, expect } from 'vitest';
import { findPinBreaks, pinBreakLine } from './pinBreak';
import { findPinPressure } from './pinPressure';

// Black's rook on e8 pins White's knight on e4 to the queen on e2.
const CHECK_ESCAPE = '4r1k1/5p1p/8/8/4N3/8/4QPPP/6K1 w - - 0 1';
// Same, but g7 covers f6: Nf6+ gxf6 still opens the file — Qxe8+ wins the rook.
const COVERED_BUT_SOUND = '4r1k1/5ppp/8/8/4N3/8/4QPPP/6K1 w - - 0 1';
// The pinner is defended by the d8 rook: Nf6+ gxf6 and the e-file is held.
const LOSES = '3rr1k1/5ppp/8/8/4N3/8/4QPPP/6K1 w - - 0 1';
// The French Bg5 pin: the f6-knight has no move that gains time.
const FRENCH = 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/3PP3/2N5/PPP2PPP/R2QKBNR b KQkq - 0 4';

describe('pinBreak — the pinned piece walks out with tempo', () => {
  it('finds the escape with check, and the pinner it leaves hanging', () => {
    const [b] = findPinBreaks(CHECK_ESCAPE);
    expect(b).toMatchObject({ side: 'w', pinned: 'e4', pinner: 'e8', behind: 'e2', san: 'Nf6+', how: 'check', pinnerHangs: true });
  });
  it('counts the line, not the shape: a covered square can still be a sound break', () => {
    expect(findPinBreaks(COVERED_BUT_SOUND).map((b) => b.san)).toEqual(['Nf6+']);
  });
  it('a break that loses material is not offered', () => {
    expect(findPinBreaks(LOSES)).toEqual([]);
  });
  it('a pin with no move that gains time stays a pin', () => {
    expect(findPinBreaks(FRENCH)).toEqual([]);
  });
  it('reads either seat: the holder is warned, the pinned side gets the resource', () => {
    const [b] = findPinBreaks(CHECK_ESCAPE);
    expect(findPinBreaks(CHECK_ESCAPE.replace(' w ', ' b '), 'w')).toHaveLength(1);
    expect(pinBreakLine(b, 'w')).toMatch(/^Your knight on e4 only looks pinned: Nf6\+ leaves with check/);
    expect(pinBreakLine(b, 'b')).toMatch(/^Their knight on e4 looks pinned, but it can leave with check — Nf6\+ — so the pin does not hold/);
    expect(pinBreakLine(b, 'b')).not.toMatch(/\b(we|our|us)\b/i);
  });
  it('pin pressure never advises piling on a pin that breaks with tempo', () => {
    // Black holds the pin and is to move; piling on e4 wins nothing.
    const holder = CHECK_ESCAPE.replace(' w ', ' b ');
    for (const p of findPinPressure(holder)) expect(p.pinned).not.toBe('e4');
  });
});
