import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// OS-4: ONE decider for how loud Learn's threat line is (the student's record
// + how plain the threat is), and the other half wired too — every opponent
// motif at the student's turn is recorded held or broken, spoken or quiet.
// A second decider, or a threat that teaches and never records, fails here.

const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8').replace(/\/\/.*$/gm, '');
const teaching = readFileSync('src/services/learnBoardTeaching.ts', 'utf8');

describe('Learn threat voice is wired both ways', () => {
  it('the threat line is decided by the record (learnThreatVoice)', () => {
    expect(page).toMatch(/learnThreatVoice\(threatProducer/);
  });
  it('the student move records the answer to every standing motif', () => {
    expect(page).toMatch(/recordThreatAnswersAtMove\(\{/);
  });
  it('the old decider is gone — one decider, not two', () => {
    expect(page).not.toMatch(/seenOneMoveAttack\(/);
    expect(teaching).not.toMatch(/export function seenOneMoveAttack/);
  });
  it('every threat branch hands its producer to the decider', () => {
    for (const kind of ['king-pawn', 'trapped', 'tactic', 'soon', 'hanging', 'cheaper-hit']) {
      expect(page, kind).toContain(`threatProducer = { kind: '${kind}'`);
    }
  });
});
