import { describe, it, expect } from 'vitest';
import { isNearMissToolName } from './coachApi';

// A6 from David's 2026-07-31 device log: DeepSeek returned
// `emit_walkthrough_narrator` instead of `emit_walkthrough_narration`, which
// threw away an otherwise-good generation and cost a full re-call. We force
// tool_choice to a single function, so the call can only be the one we asked
// for — a mangled name shouldn't discard it. But "accept anything" would be
// wrong too, so the match has to be tight.
describe('isNearMissToolName', () => {
  const WANT = 'emit_walkthrough_narration';

  it('accepts the exact miss seen in production', () => {
    expect(isNearMissToolName('emit_walkthrough_narrator', WANT)).toBe(true);
  });

  it('accepts small tail mangles', () => {
    expect(isNearMissToolName('emit_walkthrough_narrations', WANT)).toBe(true);
    expect(isNearMissToolName('emit_walkthrough_narrati', WANT)).toBe(true);
  });

  it('rejects a genuinely different tool', () => {
    expect(isNearMissToolName('lookup_master_play', WANT)).toBe(false);
    expect(isNearMissToolName('play_move', WANT)).toBe(false);
    expect(isNearMissToolName('emit_stage_lessons', WANT)).toBe(false);
  });

  it('rejects empty or missing names', () => {
    expect(isNearMissToolName('', WANT)).toBe(false);
    expect(isNearMissToolName(WANT, '')).toBe(false);
  });

  it('rejects a shared prefix that diverges too early', () => {
    // Same first word, then a completely different tool.
    expect(isNearMissToolName('emit_board_arrows_and_highlights', WANT)).toBe(false);
  });
});
