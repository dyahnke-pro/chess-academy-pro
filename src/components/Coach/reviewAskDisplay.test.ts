// The review Ask panel must DISPLAY the resolved answer, not just remember it.
//
// 🔒 THE BLANK BUBBLE (2026-08-13, live prod): grounded turns don't stream —
// Layer B disables streaming so the claim validator can rerun — which means
// onChunk never fires. The old success path appended the answer to coach
// MEMORY only, so the student stared at an empty assistant bubble while
// PostHog showed `coach_answer … answered 138 chars` 520ms after the ask
// (probe: empty <p> at +5s/+10s/+15s). The wire is a patchAssistant call in
// the resolved-answer path; this gate holds it in place.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');

describe('the review ask panel renders non-streamed answers', () => {
  it('the resolved-answer path patches the assistant bubble', () => {
    const thenAt = SRC.indexOf('.then((answer) => {');
    expect(thenAt, 'handleAskSend resolved-answer block missing').toBeGreaterThan(-1);
    const catchAt = SRC.indexOf('.catch((err: unknown) => {', thenAt);
    expect(catchAt).toBeGreaterThan(thenAt);
    const thenBody = SRC.slice(thenAt, catchAt);
    expect(
      thenBody.includes('patchAssistant('),
      'the .then block no longer writes answer.text into the bubble — grounded (non-streaming) replies will render blank again',
    ).toBe(true);
  });
});
