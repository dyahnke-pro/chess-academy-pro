import { describe, it, expect } from 'vitest';
import { replyIdentity } from './replyIdentity';
import { sublineLineKey } from './srsOpeningService';
import { sublineKey } from '../data/lessons/sublineNarration';

describe('replyIdentity — one identity for a reply', () => {
  it('a reply on its tab\'s own line keeps the keys every curated reply was stored under', () => {
    const ref = { tab: 2, triggerMove: 'h6', atPly: 7 };
    expect(replyIdentity(ref)).toBe('2::h6@7');
    expect(sublineLineKey(ref)).toBe('sub-2::h6@7');
    expect(sublineKey('italian-game', ref)).toBe('italian-game::2::h6@7');
  });

  it('two replies at the same move and ply on different boards never share review cards, rungs or narration', () => {
    // 4.d3 h6 on the Pianissimo tab's line, and 3…Nf6 4.d3 h6 inside the
    // tab's Two Knights reply: same tab, move and ply, different boards.
    const onLine = { tab: 2, triggerMove: 'h6', atPly: 7 };
    const inside = { tab: 2, triggerMove: 'h6', atPly: 7, via: 'Nf6 d3' };
    expect(sublineLineKey(inside)).not.toBe(sublineLineKey(onLine));
    expect(sublineKey('italian-game', inside)).not.toBe(sublineKey('italian-game', onLine));
    expect(sublineLineKey(inside)).toBe('sub-2::h6@7<Nf6 d3');
  });
});
