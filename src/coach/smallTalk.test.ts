import { describe, expect, it } from 'vitest';
import { smallTalkKind, smallTalkReply } from './smallTalk';

describe('smallTalkReply', () => {
  it.each([
    ['thanks so much coach', 'thanks'],
    ['hey', 'greeting'],
    ['ok cool', 'agree'],
    ['bye', 'goodbye'],
    ['the weather is nice today', 'unclear'],
  ])('"%s" is %s', (t, k) => {
    expect(smallTalkKind(t)).toBe(k);
  });
  it('is stable for the same text and never names a move or square', () => {
    for (const t of ['thanks', 'hi', 'ok', 'bye', 'what about my cat']) {
      expect(smallTalkReply(t)).toBe(smallTalkReply(t));
      expect(smallTalkReply(t)).not.toMatch(/\b[a-h][1-8]\b|\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]/);
    }
  });
});
