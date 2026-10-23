import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getCapabilityProfile } from './capabilityEvidence';
import { recordThinkingAnswer, standingFromProfile, stepStanding } from './thinkingLessonRecord';
import { BUILT_THINKING_STEPS, tagsForThinkingStep } from './thinkingSteps.built';
import { openTier } from './thinkingLessonPlan';
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

describe('a step is proven only by its OWN answers (2026-10-23)', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  // Distinct boards: the white king walks a1..h1, a2..h2 (the KNOW reading
  // counts a board once).
  const board = (i: number): string => {
    const f = i % 8;
    const r = Math.floor(i / 8);
    const row = `${f > 0 ? f : ''}K${7 - f > 0 ? 7 - f : ''}`;
    const ranks = ['8', '8', '8', '8'];
    ranks[3 - r] = row;
    return `4k3/8/2n5/8/${ranks.join('/')} w - - 0 1`;
  };
  async function answerClean(step: string, times: number, from: number): Promise<void> {
    for (let i = 0; i < times; i += 1) {
      let q = newQuestion(['c6'], 0);
      q = applyTap(q, 'c6', 100).state;
      await recordThinkingAnswer(
        { step, stage: 'guide', position: { fen: board(from + i), origin: 'puzzle', key: ['c6'] }, summary: summariseAnswer(q) },
        tagsForThinkingStep(step),
      );
    }
  }

  it('ten clean "their targets" answers prove their targets — and NOT forcing moves or hit two (they share missed-tactic)', async () => {
    await answerClean('their-targets', 10, 0);
    const rows = await db.capabilityEvidence.toArray();
    expect(stepStanding(rows, 'their-targets')).toBe('green');
    expect(stepStanding(rows, 'forcing-moves')).toBe('grey');
    expect(stepStanding(rows, 'hit-two')).toBe('grey');
  });

  it('proving the four tier-1 steps opens tier 2 and nothing past it: answer-danger and forcing moves are still to teach', async () => {
    let from = 0;
    for (const s of ['their-move-changed', 'am-i-safe', 'their-targets', 'is-my-move-safe']) { await answerClean(s, 10, from); from += 10; }
    const rows = await db.capabilityEvidence.toArray();
    const standingOf = (s: { step: string }) => stepStanding(rows, s.step);
    expect(openTier(BUILT_THINKING_STEPS, standingOf)).toBe(2);
    expect(stepStanding(rows, 'answer-danger')).toBe('grey');
    expect(stepStanding(rows, 'forcing-moves')).toBe('grey');
  });

  it('a mixed round\'s step choice proves no step', async () => {
    const rows = [{
      id: 'x', tag: 'missed-tactic' as const, outcome: 'held' as const, fen: board(0), playedSan: '', posedImportance: 100,
      recordedAt: 1, prompted: false, origin: 'lesson' as const,
      answer: { taps: [], extras: [], wrongAttempts: 0, msToFirst: null, msBetween: [], help: 'none' as const, spoken: false, chainDepth: 0, wrongTags: [], questionId: 'step-choice' },
    }];
    expect(stepStanding(rows, 'their-targets')).toBe('grey');
  });
});
