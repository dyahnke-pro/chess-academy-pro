import { describe, it, expect } from 'vitest';
import { hitTwoKey, hitTwoKit, hitTwoPrompt, hitTwoReason, hitTwoWrongTapLine } from './thinkingHitTwoStep';

// White knight on b5 can go to c7 and hit the rooks on a8 and e8 (both loose).
const FORK = 'r3r1k1/8/8/1N6/8/8/P3P3/7K w - - 0 1';
const NONE = '4k3/8/8/1N6/8/8/8/4K3 w - - 0 1';

describe('step 7 — hit two at once', () => {
  it('finds the fork square', () => {
    expect(hitTwoKey(FORK)?.key).toContain('c7');
  });
  it('a board with nothing to fork has no key', () => {
    expect(hitTwoKey(NONE)?.key).toEqual([]);
  });
  it('names both targets', () => {
    expect(hitTwoReason(FORK, 'c7')).toMatch(/knight hits the rook on a8 and the rook on e8/);
  });
  it('a wrong tap is answered with the method', () => {
    expect(hitTwoWrongTapLine(FORK, 'h1')).toMatch(/None of your pieces can get there/);
    expect(hitTwoWrongTapLine(FORK, 'd6')).toMatch(/count what it attacks/);
  });
  it('the prompt never says how many', () => {
    for (let i = 0; i < 2; i++) expect(hitTwoPrompt(i)).not.toMatch(/\d|one more|three/i);
  });
  it('the kit is wired', () => {
    expect(hitTwoKit().step).toBe('hit-two');
  });
});
