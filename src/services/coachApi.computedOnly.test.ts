// Item 11 (2026-10-17): phase narration is computed and spoken as computed —
// `computedOnly` holds on EVERY exit of the grounded move-feedback path, so no
// phase beat reaches a phrasing model (G0: the model decides nothing).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { groundedMoveFeedback } from './coachApi';

describe('computedOnly holds on every exit', () => {
  it('a phase beat with nothing else to say comes back word for word', async () => {
    const out = await groundedMoveFeedback({
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
      studentColor: 'white', surface: 'phase-narration',
      extraFacts: "We're into the middlegame now.", warm: true, computedOnly: true,
    });
    expect(out).toBe("We're into the middlegame now.");
  });
  it('no branch of the path calls voiceFacts without first honouring computedOnly', () => {
    const src = readFileSync('src/services/coachApi.ts', 'utf8');
    const body = src.slice(src.indexOf('async function serveGroundedPositionDefault'), src.indexOf('async function serveGroundedPositionDefault') + 6000);
    const calls = body.split('voiceFacts(').length - 1;
    const guards = body.split('if (computedOnly').length - 1;
    expect(calls).toBeGreaterThan(0);
    expect(guards).toBeGreaterThanOrEqual(calls);
  });
});
