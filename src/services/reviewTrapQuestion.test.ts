import { describe, it, expect } from 'vitest';
import { buildTrapQuestion, judgeTrapAnswer } from './reviewTrapQuestion';

// White queen on d1; black pawn d5 defended by e6-pawn. Qxd5?? exd5 drops the queen.
const POISONED_PAWN_FEN = '4k3/8/4p3/3p4/8/8/8/3QK3 w - - 0 1';
// Black knight on e5 UNDEFENDED; White pawn d4 can take it for free — NOT a trap.
const FREE_PIECE_FEN = '4k3/8/8/4n3/3P4/8/8/4K3 w - - 0 1';
// No captures available at all.
const NO_CAPTURE_FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

describe('buildTrapQuestion — the poisoned capture, computed by SEE', () => {
  it('flags a poisoned pawn (Qxd5?? exd5) and calls the right answer "leave"', () => {
    const q = buildTrapQuestion({ fen: POISONED_PAWN_FEN, studentColor: 'white' })!;
    expect(q).not.toBeNull();
    expect(q.temptingSan).toBe('Qxd5');
    expect(q.targetSquare).toBe('d5');
    expect(q.answerId).toBe('leave');
    // the reveal plays out the swap + names the loss.
    expect(q.sequence[0]).toBe('Qxd5');
    expect(q.sequence.length).toBeGreaterThanOrEqual(2); // Qxd5, exd5
    expect(q.reveal).toMatch(/poison|trap|behind|costs/i);
    // honesty: the prompt never says whether it's safe.
    expect(q.prompt).not.toMatch(/poison|trap|safe|don't|do not/i);
    // choices are always the same two.
    expect(q.choices.map((c) => c.id)).toEqual(['take', 'leave']);
  });

  it('returns null on a genuinely FREE piece (SEE >= 0 — not a trap)', () => {
    expect(buildTrapQuestion({ fen: FREE_PIECE_FEN, studentColor: 'white' })).toBeNull();
  });

  it('returns null when there is no capture to tempt', () => {
    expect(buildTrapQuestion({ fen: NO_CAPTURE_FEN, studentColor: 'white' })).toBeNull();
  });

  it('returns null when it is not the student to move', () => {
    // POISONED_PAWN_FEN has White to move; asking as Black → not their turn.
    expect(buildTrapQuestion({ fen: POISONED_PAWN_FEN, studentColor: 'black' })).toBeNull();
  });

  it('judges the answer — "leave" is correct, "take" is the trap', () => {
    const q = buildTrapQuestion({ fen: POISONED_PAWN_FEN, studentColor: 'white' })!;
    expect(judgeTrapAnswer(q, 'leave')).toBe(true);
    expect(judgeTrapAnswer(q, 'take')).toBe(false);
  });
});
