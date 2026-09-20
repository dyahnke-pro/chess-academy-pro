/**
 * THE PLAY SURFACE MUST RECORD THE POSITIVE HALF — and must not get it back
 * by reintroducing a second analysis.
 *
 * Found 2026-09-20 by reading the code: `recordMoveEvidence` had exactly ONE
 * call site, inside `evaluatePlayerMove`. `/coach/play` correctly stopped
 * calling that on 2026-06-04 (it ran its own Stockfish pair and its own
 * classifier, which disagreed with the blunder interceptor — a blunder overlay
 * could fire with no "why?" chat and vice versa). The positive half was a side
 * effect of the removed call, so the surface where students play whole games
 * against the coach recorded ZERO held/broken rows — while mounting the hook
 * with `capabilityOrigin: 'play'`, which makes it read as deliberate.
 *
 * That is the same disease as the 2026-08-05 "the record is not the UI" find
 * and the #18 fresh-game doors: a capability that rides on a call someone
 * later removes for an unrelated, correct reason. So the gate blames by
 * STATEMENT — the call has to be there, and the second analyser has to stay
 * gone — rather than trusting a comment to hold the line.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PLAY = readFileSync('src/components/Coach/CoachGamePage.tsx', 'utf8');

/** Strip comments so a sentence ABOUT a call is never mistaken for the call
 *  (the mistake a first cut of the perspective gate made: four innocent files
 *  blamed for describing the rule in prose). */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('/coach/play records the positive half of the student model', () => {
  it('calls the graded-move door', () => {
    expect(code(PLAY)).toMatch(/discussion\.recordGradedMove\s*\(/);
  });

  it('hands it the game id, so the row can count toward DISTINCT games', () => {
    const call = code(PLAY).match(/discussion\.recordGradedMove\s*\(\{[\s\S]*?\}\)/)?.[0] ?? '';
    expect(call).toMatch(/sourceGameId:\s*gameState\.gameId/);
  });

  it('does NOT reintroduce evaluatePlayerMove — that is the second analyser', () => {
    // The door exists precisely so the positive half can come back WITHOUT
    // the racing classifier that was removed for cause.
    expect(code(PLAY)).not.toMatch(/discussion\.evaluatePlayerMove\s*\(/);
  });
});
