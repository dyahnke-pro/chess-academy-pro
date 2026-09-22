import { describe, it, expect } from 'vitest';
import { describeEvalCp, MATE_EVAL_VALUE } from './engineConstants';

describe('describeEvalCp — a mate sentinel is never read as a number (WO-STANDARD-01 D-12)', () => {
  it('renders the stored mate sentinel as a forced mate for the side, never "-300.0"', () => {
    // The prod tape: "the evaluation moved from -7.5 to -300.0" — that is
    // MATE_EVAL_VALUE / 100 spoken aloud.
    expect(describeEvalCp(-MATE_EVAL_VALUE)).toBe('a forced mate for Black');
    expect(describeEvalCp(MATE_EVAL_VALUE)).toBe('a forced mate for White');
    expect(describeEvalCp(-MATE_EVAL_VALUE)).not.toMatch(/300/);
  });
  it('renders a plain centipawn eval in pawns, signed from White, one decimal', () => {
    expect(describeEvalCp(120)).toBe('+1.2');
    expect(describeEvalCp(-750)).toBe('-7.5');
    expect(describeEvalCp(-40)).toBe('-0.4');
    expect(describeEvalCp(0)).toBe('0.0');
  });
  it('NEGATIVE CONTROL: an eval just under the mate threshold is still a number', () => {
    // Flipping the mate gate off would turn the first test into "-300.0"; this
    // pins that the gate is the sentinel band, not "any big number".
    expect(describeEvalCp(-1400)).toBe('-14.0');
  });
});
