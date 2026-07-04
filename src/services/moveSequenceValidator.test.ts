import { describe, it, expect } from 'vitest';
import { stripIllegalMoveSequences } from './moveSequenceValidator';

// The exact position from David's device (PostHog 2026-07-04, /coach/teach
// calculation trainer). White to move; white Q on f3, black K on f7.
const FEN = 'r1bq1b1r/pppp1kpp/2n5/8/3Nn3/5Q2/PPP2PPP/RNB1K2R w KQ - 0 1';

describe('stripIllegalMoveSequences', () => {
  it('DROPS the fabricated combo: Qxe4 is illegal after Qh5+ g6', () => {
    const text = 'Play Qh5+. If Black blocks with g6, Qxe4 wins the knight and hits the rook on h8.';
    const { clean, dropped } = stripIllegalMoveSequences(text, FEN);
    expect(dropped.length).toBe(1);
    expect(clean).toBe('Play Qh5+.');
    expect(clean).not.toMatch(/Qxe4/);
  });

  it('KEEPS a legal back-and-forth line', () => {
    // Genuinely legal line from the start position: e4 c5 Nf3.
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const text = 'Play e4. If Black responds with c5, then Nf3 develops with tempo.';
    const { clean, dropped } = stripIllegalMoveSequences(text, start);
    expect(dropped.length).toBe(0);
    expect(clean).toBe(text);
  });

  it('KEEPS a disjunction (candidate options, not a line)', () => {
    const text = 'You could try Qh5 or Nf5 here — both keep the pressure.';
    const { clean, dropped } = stripIllegalMoveSequences(text, FEN);
    expect(dropped.length).toBe(0);
    expect(clean).toBe(text);
  });

  it('KEEPS a one-sided plan (no opponent reply narrated)', () => {
    // "Qh5, then Rd1" is a White plan; not our gate even if turn-illegal.
    const text = 'Bring the queen out with Qh5, and then double rooks.';
    const { clean, dropped } = stripIllegalMoveSequences(text, FEN);
    expect(dropped.length).toBe(0);
    expect(clean).toBe(text);
  });

  it('is a no-op with no FEN or no move sequence', () => {
    expect(stripIllegalMoveSequences('Nice and solid.', FEN).dropped.length).toBe(0);
    expect(stripIllegalMoveSequences('Qh5+ then Qxe4 wins.', null).dropped.length).toBe(0);
  });

  it('leaves a bad FIRST move to the board gate (does not trip here)', () => {
    // Qa8 is illegal as a first move; this gate ignores it (board gate owns it).
    const text = 'If Black plays g6, then Qa8 wins.';
    const { dropped } = stripIllegalMoveSequences(text, FEN);
    // g6 is a legal black move only when it's black's turn; from a white-to-move
    // FEN the first extracted move g6 is illegal → gate steps aside.
    expect(dropped.length).toBe(0);
  });
});
