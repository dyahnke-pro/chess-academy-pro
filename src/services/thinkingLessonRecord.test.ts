import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getCapabilityProfile } from './capabilityEvidence';
import { recordThinkingAnswer, standingFromProfile } from './thinkingLessonRecord';
import { onWeaknessModelChanged } from './weaknessModelEvents';
import type { AnsweredQuestion } from './thinkingLessonSession';

const FEN = '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1';
const answer = (held: boolean, prompted = false, stage: AnsweredQuestion['stage'] = 'guide', gameId?: string): AnsweredQuestion => ({
  step: 'their-targets',
  stage,
  position: { fen: FEN, origin: gameId ? 'game' : 'puzzle', key: ['c6'], ...(gameId ? { gameId } : {}) },
  summary: {
    held, prompted, help: prompted ? 'show' : 'none', taps: ['c6'], extras: [], msToFirst: 100, msBetween: [], keySize: 1, foundCount: 1,
  },
});

describe('thinkingLessonRecord', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('writes one evidence row per tag, honest about help, and refreshes the student model', async () => {
    let changed = 0;
    const off = onWeaknessModelChanged(() => { changed += 1; });
    await recordThinkingAnswer(answer(true, false, 'guide', 'g1'), ['missed-tactic']);
    await recordThinkingAnswer(answer(false, true), ['missed-tactic']);
    off();
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.map((r) => [r.tag, r.outcome, r.prompted])).toEqual([['missed-tactic', 'held', false], ['missed-tactic', 'broken', true]]);
    expect(rows[0].sourceGameId).toBe('g1');
    expect(changed).toBe(2);
  });

  it('a Show beat is not an answer and records nothing', async () => {
    await recordThinkingAnswer(answer(true, false, 'show'), ['missed-tactic']);
    expect(await db.capabilityEvidence.count()).toBe(0);
  });

  it('standing: grey when never asked, red after an unhelped break', async () => {
    expect(standingFromProfile(await getCapabilityProfile(), ['missed-tactic'])).toBe('grey');
    await recordThinkingAnswer(answer(false), ['missed-tactic']);
    expect(standingFromProfile(await getCapabilityProfile(), ['missed-tactic'])).toBe('red');
    expect(standingFromProfile(await getCapabilityProfile(), [])).toBe('grey');
  });
});
