import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getCapabilityProfile } from './capabilityEvidence';
import { recordThinkingAnswer, standingFromProfile } from './thinkingLessonRecord';
import { onWeaknessModelChanged } from './weaknessModelEvents';
import type { AnsweredQuestion } from './thinkingLessonSession';
import { applyDontKnow, applyTap, newQuestion, summariseAnswer } from './thinkingLesson';

const FEN = '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1';
const answer = (held: boolean, prompted = false, stage: AnsweredQuestion['stage'] = 'guide', gameId?: string): AnsweredQuestion => {
  let q = newQuestion(['c6'], 0);
  if (prompted) q = applyDontKnow(q).state;
  else if (held) q = applyTap(q, 'c6', 100).state;
  else { q = applyTap(q, 'e1', 50).state; q = applyTap(q, 'c6', 100).state; }
  return {
    step: 'their-targets',
    stage,
    position: { fen: FEN, origin: gameId ? 'game' : 'puzzle', key: ['c6'], ...(gameId ? { gameId } : {}) },
    summary: summariseAnswer(q),
  };
};

describe('thinkingLessonRecord', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('writes one evidence row per tag, honest about help, and refreshes the student model', async () => {
    let changed = 0;
    const off = onWeaknessModelChanged(() => { changed += 1; });
    await recordThinkingAnswer(answer(true, false, 'guide', 'g1'), ['missed-tactic']);
    await recordThinkingAnswer(answer(false, true), ['missed-tactic']);
    off();
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.map((r) => [r.tag, r.outcome, r.prompted, r.origin])).toEqual([['missed-tactic', 'held', false, 'lesson'], ['missed-tactic', 'broken', true, 'lesson']]);
    // A lesson row NEVER carries the game id, even on a board from the
    // student's game: that field is the USE reading's key (answerRecord).
    expect(rows[0].sourceGameId).toBeUndefined();
    expect(changed).toBeGreaterThanOrEqual(2);
  });

  it('the follow-up chain depth rides on the ONE evidence row (no row per link)', async () => {
    const a = answer(true);
    await recordThinkingAnswer({ ...a, summary: { ...a.summary, detail: { ...a.summary.detail, chainDepth: 2 } } }, ['missed-tactic']);
    const rows = await db.capabilityEvidence.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].answer?.chainDepth).toBe(2);
  });

  it('a Show beat is not an answer and records nothing', async () => {
    await recordThinkingAnswer(answer(true, false, 'show'), ['missed-tactic']);
    expect(await db.capabilityEvidence.count()).toBe(0);
  });

  it('standing: grey when never asked, red after an unhelped break', async () => {
    expect(standingFromProfile(await getCapabilityProfile('know'), ['missed-tactic'])).toBe('grey');
    await recordThinkingAnswer(answer(false), ['missed-tactic']);
    expect(standingFromProfile(await getCapabilityProfile('know'), ['missed-tactic'])).toBe('red');
    // KNOW and USE stay apart: a lesson answer is not game evidence.
    expect(standingFromProfile(await getCapabilityProfile('use'), ['missed-tactic'])).toBe('grey');
    expect(standingFromProfile(await getCapabilityProfile('know'), [])).toBe('grey');
  });
});

describe('thinkingLessonRecord — wrong taps', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('a tap on THEIR piece when asked about yours is filed as a missed threat', async () => {
    // White to move; the question is about White's own hanging knight on c3.
    const fen = '4k3/8/8/8/8/2N5/8/r3K3 w - - 0 1';
    let q = newQuestion(['c3'], 0);
    q = applyTap(q, 'a1', 10).state;
    q = applyTap(q, 'c3', 20).state;
    await recordThinkingAnswer({
      step: 'am-i-safe', stage: 'guide',
      position: { fen, origin: 'puzzle', key: ['c3'] },
      summary: summariseAnswer(q),
    }, ['hung-material']);
    const tags = (await db.misconceptionTags.toArray()).map((r) => r.tag);
    expect(tags).toContain('missed-opponents-threat');
  });
});
