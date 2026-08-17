// MULTI-INTENT FIRST-VERB ROUTING + BARE-"WHY?" CONTEXT CARRY (2026-08-13
// audit residuals).
//
// 1. "teach me the najdorf and quiz me and show me a trap" must honor the
//    FIRST verb — teach the Najdorf. Left whole, the tail's "trap" hijacks
//    the stage detector (→ punish) and the compound string then fails name
//    resolution and falls to the brain. The fix truncates the input at the
//    first " and "/" then " whose remainder asks for another action.
// 2. A lone "why?" after the coach names a best move is a follow-up on THAT
//    move — coachService rewrites it into the canonical why-best-move ask so
//    the engine-reasoning lane answers in context.
//
// The truncation lives inline in CoachTeachPage.handleSubmit (the same spot
// as the stage patterns it protects), so this file tests the RULE as a
// mirror (the teachPlayIntent.test.ts precedent) and pins the wiring with a
// source scan so the block can't be silently dropped.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// ── Mirror of the CoachTeachPage multi-intent truncation ────────────────────
const LEAD_RE = /^\s*(?:please\s+)?(?:teach|show|walk|learn|study|play|drill|quiz|watch|review|explain|tell)\b/i;
const TAIL_ACTION_RE = /\b(?:quiz|drill|traps?|test|play|practice|show|watch|review)\b/i;
function truncateMultiIntent(input: string): string {
  const trimmed = input.trim();
  if (!LEAD_RE.test(trimmed) || !/\s(?:and|then)\s/i.test(trimmed)) return trimmed;
  const [firstSegment, ...laterSegments] = trimmed.split(/\s+(?:and\s+then|and|then)\s+/i);
  if (laterSegments.length > 0 && TAIL_ACTION_RE.test(laterSegments.join(' '))) {
    return firstSegment.trim();
  }
  return trimmed;
}

describe('multi-intent first-verb routing (rule mirror)', () => {
  it('keeps only the teach segment of the canonical compound ask', () => {
    expect(truncateMultiIntent('teach me the najdorf and quiz me and show me a trap'))
      .toBe('teach me the najdorf');
  });

  it('honors the first verb when play leads', () => {
    expect(truncateMultiIntent('play the vienna against me and then quiz me'))
      .toBe('play the vienna against me');
  });

  it('leaves a plain opening name untouched', () => {
    expect(truncateMultiIntent('teach me the najdorf')).toBe('teach me the najdorf');
  });

  it('leaves a name LIST untouched — no action verb in the tail', () => {
    expect(truncateMultiIntent('teach me the ruy lopez and the italian'))
      .toBe('teach me the ruy lopez and the italian');
  });

  it('does not fire without an action-verb lead', () => {
    expect(truncateMultiIntent('I like the sicilian and want to play sharp lines'))
      .toBe('I like the sicilian and want to play sharp lines');
  });

  it('opening names containing "and" survive (no tail action verb)', () => {
    expect(truncateMultiIntent('teach me the queen and pawn endgame'))
      .toBe('teach me the queen and pawn endgame');
  });
});

// ── Wiring pins: the blocks exist where they must run ───────────────────────
describe('multi-intent + bare-why wiring (source scan)', () => {
  it('CoachTeachPage truncates BEFORE stage detection', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    const truncIdx = src.indexOf('MULTI-INTENT FIRST-VERB ROUTING');
    // The stage loop moved into `teachStageRouting` so the picker's contract
    // could be tested at all; the CONTRACT this guards is unchanged, so the
    // scan follows the call rather than the loop it replaced.
    const stageLoopIdx = src.indexOf('routeStage(effectiveInput)');
    expect(truncIdx).toBeGreaterThan(-1);
    expect(stageLoopIdx).toBeGreaterThan(-1);
    // The truncation must run before stage detection or the tail's stage
    // words ("trap", "quiz") hijack the stage before the name resolves.
    expect(truncIdx).toBeLessThan(stageLoopIdx);
    // And the stage detector + name resolution must both consume the
    // truncated input, not the raw one. Detection takes `effectiveInput`
    // directly, which is a stronger guarantee than the old loop gave: there is
    // no longer an intermediate variable that could be reassigned in between.
    expect(src).toContain('routeStage(effectiveInput)');
    expect(src).toContain('stageStrippedInput = routed.remainder;');
    expect(src).toContain('let workingInput = effectiveInput;');
  });

  it('coachService carries a bare "why?" into the why-best-move lane', () => {
    const src = readFileSync('src/coach/coachService.ts', 'utf8');
    const block = src.slice(src.indexOf('BARE-"WHY?" CONTEXT CARRY'));
    expect(block.length).toBeGreaterThan(100);
    // Rewrites into the canonical phrasing the why-best-move detector matches…
    expect(block).toContain("askForIntents = 'why is that the best move?'");
    // …and only when the memory's last coach line is best-move-shaped.
    expect(block).toContain("msg.role === 'coach'");
  });
});

// ── The rewrite target really triggers the lane ─────────────────────────────
describe('bare-why rewrite target', () => {
  it('the canonical phrasing fires isWhyBestMoveQuestion', async () => {
    const { isWhyBestMoveQuestion } = await import('../../coach/questionIntents');
    expect(isWhyBestMoveQuestion('why is that the best move?')).toBe(true);
  });
});
