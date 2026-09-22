/**
 * WO-STANDARD-01 F3 — the legacy walkthrough's per-move fill is COMPUTED.
 *
 * Proof is OUTPUT with the provider dead: `openai` 401s here (it is not
 * even imported by the narrator any more, but a gate that mocks it cannot
 * be fooled by a future re-import), and every un-curated ply still gets a
 * board-true sentence. Curated non-filler entries win verbatim.
 *
 * NEGATIVE CONTROL: on the pre-inversion module (one batched chat call,
 * JSON-parsed) the fills come back '' for every ply under this mock.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: async () => { throw Object.assign(new Error('401'), { status: 401 }); } } };
  },
}));

import { generateWalkthroughNarrations } from './walkthroughLlmNarrator';
import { readFileSync } from 'node:fs';

describe('generateWalkthroughNarrations — computed, not authored', () => {
  it('fills every un-curated ply with a board-true sentence, seat-stamped to the opening colour', async () => {
    const { narrations } = await generateWalkthroughNarrations({
      openingName: 'Italian Game',
      pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
      studentSide: 'white',
      existingNarrations: ['A curated line about e4.', '', 'The position is roughly equal.', '', '', ''],
    });
    expect(narrations).toHaveLength(6);
    // Curated real content wins verbatim.
    expect(narrations[0]).toBe('A curated line about e4.');
    // Filler (a GENERIC_ANNOTATION_PATTERNS match) is replaced by the computed fill.
    expect(narrations[2]).not.toBe('The position is roughly equal.');
    // Seat-stamped: the student's own move says "You play", the opponent's "They play".
    expect(narrations[2]).toMatch(/^You play Nf3,/);
    expect(narrations[1]).toMatch(/^They play e5,/);
    expect(narrations[4]).toMatch(/^You play Bc4,/);
    // Every fill names something on the board (a square or a piece).
    for (const n of narrations.slice(1)) expect(n).toMatch(/[a-h][1-8]|knight|bishop|pawn|centre|center|king/i);
  });

  it('is seat-free when the caller does not know whose line it is', async () => {
    const { narrations } = await generateWalkthroughNarrations({ openingName: 'x', pgn: 'd4 d5 c4' });
    expect(narrations[2]).toMatch(/^c4: /);
  });

  it('truncates at an illegal move and never throws', async () => {
    const { narrations } = await generateWalkthroughNarrations({ openingName: 'x', pgn: 'e4 e5 Qh9 Nf3' });
    expect(narrations).toHaveLength(2);
  });

  it('never imports the coach LLM path (source pin — the fill has no model in it)', () => {
    const src = readFileSync('src/services/walkthroughLlmNarrator.ts', 'utf8');
    expect(src).not.toMatch(/getCoachChatResponse|coachApi/);
    expect(src).toMatch(/buildReviewMoveBriefing/);
  });
});
