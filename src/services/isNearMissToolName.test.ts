import { describe, it, expect } from 'vitest';
import { isNearMissToolName } from './coachApi';

// David's device log 2026-09-03 (Port Harcourt): DeepSeek returned
// "rewind_walkthrough_narration" for "reword_walkthrough_narration" and the
// prefix-only near-miss check rejected it, throwing away a good generation and
// shipping the raw script. The names are 26/28 identical — they share "rew" AND
// the whole "d_walkthrough_narration" tail; only "or"/"in" differ.
describe('isNearMissToolName', () => {
  it('accepts a mid-word typo (reword → rewind)', () => {
    expect(
      isNearMissToolName('rewind_walkthrough_narration', 'reword_walkthrough_narration'),
    ).toBe(true);
  });

  it('accepts a suffix mangle (narration → narrator)', () => {
    expect(
      isNearMissToolName('emit_walkthrough_narrator', 'emit_walkthrough_narration'),
    ).toBe(true);
  });

  it('rejects a genuinely different name', () => {
    expect(isNearMissToolName('lookup_master_play', 'reword_walkthrough_narration')).toBe(false);
    expect(isNearMissToolName('foo', 'reword_walkthrough_narration')).toBe(false);
  });

  it('rejects empties', () => {
    expect(isNearMissToolName('', 'x')).toBe(false);
    expect(isNearMissToolName('x', '')).toBe(false);
  });
});
