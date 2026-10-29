// OS-11 item 6c: a pin said twice in one turn — the threat warning (instant
// wave) carried no claim, so the played-concept line (late wave) said it again.
// Every lane that states a tactic now carries the ONE key, `conceptInstanceKey`.
import { describe, it, expect } from 'vitest';
import { detectTactics } from './tacticsDetector';
import { conceptInstanceKey } from './conceptKey';
import { playedConceptTeaching } from './learnBoardTeaching';

describe('one claim key for a tactic, whichever lane says it (g2 13.Bb6)', () => {
  const BEFORE = 'r2q1rk1/1pn1bppp/3pbn2/pB2p3/4P3/1NN1BP2/PPPQ2PP/1K1R3R w - - 4 13';
  const AFTER = 'r2q1rk1/1pn1bppp/1B1pbn2/pB2p3/4P3/1NN2P2/PPPQ2PP/1K1R3R b - - 5 13';
  it('the threat lane\'s key and the played concept\'s key are the same claim', () => {
    const pin = detectTactics(AFTER).tactics.find((t) => t.type === 'pin' && t.involvedSquares.includes('b6'));
    expect(pin).toBeDefined();
    const threatKey = conceptInstanceKey(pin!.type, pin!.involvedSquares.filter((sq) => /^[a-h][1-8]$/.test(sq)));
    const { hint } = playedConceptTeaching(BEFORE, 'Bb6', 'b', new Set(), () => '');
    // The concept's key is shared; the line's geometry key rides beside it, so
    // a battery or a discovery read on the same three squares is the same claim
    // too (WO-THINK-01 step 2, `tacticGeometryKey`).
    expect(hint?.claims).toContain(threatKey);
    expect(hint?.claims).toContain('geometry:b6c7d8');
  });
});
