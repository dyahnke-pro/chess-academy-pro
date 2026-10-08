// Part VII observability (2026-09-01) — THE BANTER LANE MAY NEVER SHIP CHESS.
//
// Since answers swarm P7 the banter lane is answered in code (smallTalk.ts), so
// it is chess-proof by construction: this gate fails if any small-talk reply
// carries a chess signal, or if a chess message is ever read as banter.
import { describe, it, expect } from 'vitest';
import { hasChessContentSignal } from './coachApi';
import { smallTalkReply } from '../coach/smallTalk';

describe('banter lane never ships chess content (Part VII)', () => {
  it.each(['hi coach', 'thanks so much', 'are you there', 'ok cool', 'bye', 'lol'])(
    'the reply to "%s" carries no chess',
    (line) => {
      expect(hasChessContentSignal(smallTalkReply(line))).toBe(false);
    },
  );

  it('routes any chess-signal message to the grounded lane, not banter', () => {
    for (const line of ['is Nf3 good', 'what should I play', 'how do masters play this', 'what is a fork']) {
      expect(hasChessContentSignal(line)).toBe(true);
    }
    for (const line of ['hi coach', 'thanks so much', 'are you there']) {
      expect(hasChessContentSignal(line)).toBe(false);
    }
  });
});
