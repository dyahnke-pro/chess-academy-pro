// Part VII observability (2026-09-01) — THE BANTER LANE MAY NEVER SHIP CHESS.
//
// The conversational (non-chess) lane is structurally chess-proof: whatever the
// model returns is swept by stripChessyStraySentences before it reaches the
// student. This gate fails if that sweep ever lets a SAN, an eval, a percentage,
// a bare square, or a "masters play X" claim through — the fabrication vectors
// G0 forbids on an ungrounded turn. If a future change weakens the sweep, this
// goes red instead of a hallucinated chess claim reaching a paying user.
import { describe, it, expect } from 'vitest';
import { stripChessyStraySentences, hasChessContentSignal } from './coachApi';

describe('banter lane never ships chess content (Part VII)', () => {
  const CHESSY = [
    'You should play Nf3 here.',                    // SAN
    'This is winning by +2.3 for you.',             // eval
    'Masters play the Najdorf 55% of the time.',    // % + masters
    'Grandmasters prefer this line.',               // masters claim
    'Just push e4 and you are fine.',               // bare square/pawn push
    'The best move is Qxe5+.',                       // SAN capture+check
  ];

  it.each(CHESSY)('strips the chess sentence: %s', (line) => {
    const out = stripChessyStraySentences(line);
    // The single chessy sentence is removed entirely → empty.
    expect(out).toBe('');
  });

  it('keeps the warm half and drops only the chessy half', () => {
    const out = stripChessyStraySentences('Good to see you back! You should play Nf3 next.');
    expect(out).toBe('Good to see you back!');
    // And the surviving text carries no SAN/eval/square.
    expect(hasChessContentSignal(out)).toBe(false);
  });

  it('leaves genuinely non-chess banter untouched', () => {
    const warm = 'Happy to help — take your time and let me know when you are ready.';
    expect(stripChessyStraySentences(warm)).toBe(warm);
  });

  it('routes any chess-signal message to the grounded lane, not banter', () => {
    for (const line of ['is Nf3 good', 'what should I play', 'how do masters play this', 'what is a fork']) {
      expect(hasChessContentSignal(line)).toBe(true);
    }
    for (const line of ['hi coach', 'thanks so much', 'are you there']) {
      expect(hasChessContentSignal(line)).toBe(false);
    }
  });
});
