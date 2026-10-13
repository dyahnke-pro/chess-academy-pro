import { describe, expect, it } from 'vitest';
import { provesOnlyMove } from './accuracyService';

// 2026-10-13: one "only move" test for Learn and Review (Learn spoke it at a
// 150 gap; Review's Great needed 250 and a live game).
describe('provesOnlyMove — the one test both graders read', () => {
  it('a contested game where the runner-up falls 250+ behind proves it', () => {
    expect(provesOnlyMove(0, -300)).toBe(true);
    expect(provesOnlyMove(50, -200)).toBe(true);
  });
  it('a gap under the bar does not', () => {
    expect(provesOnlyMove(0, -200)).toBe(false);
  });
  it('NEGATIVE CONTROL: a decided game never does, whatever the gap', () => {
    expect(provesOnlyMove(900, 0)).toBe(false);
    expect(provesOnlyMove(-900, -1500)).toBe(false);
  });
});
