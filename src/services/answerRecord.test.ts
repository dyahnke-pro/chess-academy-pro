// The ONE answer recorder, on real fake-indexeddb: KNOW evidence row, wrong-tap
// misconceptions, drill spacing — and the KNOW/USE split (decision #2).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { recordAnswer } from './answerRecord';
import {
  capabilityStanding,
  getCapabilityProfile,
  recordLaneEvidence,
  standingFromEvidence,
  type AnswerDetail,
} from './capabilityEvidence';
import { onWeaknessModelChanged, __resetWeaknessModelListenersForTests } from './weaknessModelEvents';

vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

beforeEach(async () => {
  __resetWeaknessModelListenersForTests();
  db.close();
  await db.delete();
  await db.open();
});

const FEN_A = '4k3/8/5n2/3Q4/4P3/8/8/4K3 w - - 0 1';
const FEN_B = '4k3/8/8/3q4/8/2N5/8/4K3 w - - 0 1';

function detail(over: Partial<AnswerDetail> = {}): AnswerDetail {
  return {
    taps: [{ square: 'd5', right: true }], extras: [], wrongAttempts: 0,
    msToFirst: 900, msBetween: [], help: 'none', spoken: false, chainDepth: 0, wrongTags: [],
    surface: 'analysis-practice', questionId: 'hanging', keySize: 1, ...over,
  };
}

describe('recordAnswer', () => {
  it('writes ONE KNOW row with the answer detail and NO sourceGameId', async () => {
    const r = await recordAnswer({ questionTag: 'hung-material', fen: FEN_A, origin: 'reading', solved: true, answer: detail() });
    expect(r).toMatchObject({ outcome: 'held', prompted: false, evidence: true });
    const rows = await db.capabilityEvidence.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tag: 'hung-material', outcome: 'held', origin: 'reading', posedImportance: 100, playedSan: 'd5' });
    expect(rows[0].sourceGameId).toBeUndefined();
    expect(rows[0].answer?.surface).toBe('analysis-practice');
  });

  it('a question with no tag writes nothing', async () => {
    const r = await recordAnswer({ questionTag: null, fen: FEN_A, origin: 'reading', solved: true, answer: detail() });
    expect(r.evidence).toBe(false);
    expect(await db.capabilityEvidence.count()).toBe(0);
  });

  it('writes the misconception each wrong tap named, as a reading slip with no game id', async () => {
    await recordAnswer({
      questionTag: 'hung-material', fen: FEN_A, origin: 'reading', solved: false,
      answer: detail({ taps: [{ square: 'f6', right: false }], extras: ['f6'], wrongAttempts: 1, firstMissHelp: 'none', wrongTags: ['hung-material'] }),
    });
    const slips = await db.misconceptionTags.toArray();
    expect(slips).toHaveLength(1);
    expect(slips[0]).toMatchObject({ tag: 'hung-material', source: 'reading', playedSan: 'f6' });
    expect(slips[0].sourceGameId).toBeUndefined();
    expect((await db.capabilityEvidence.toArray())[0]).toMatchObject({ outcome: 'broken', prompted: false });
  });

  it('a clean read spaces the tag\'s due drill instances (the folded recordTagDrillResult)', async () => {
    await db.misconceptionTags.add({ id: 'm1', tag: 'hung-material', source: 'auto-analysis', createdAt: 1, fen: FEN_A, status: 'open', masteryHits: 0, dueAt: 0 });
    await recordAnswer({ questionTag: 'hung-material', fen: FEN_A, origin: 'reading', solved: true, answer: detail() });
    const m = await db.misconceptionTags.get('m1');
    expect(m?.masteryHits).toBe(1);
    expect((m?.dueAt ?? 0) > Date.now()).toBe(true);
  });

  it('emits the student-model change so readers refresh', async () => {
    const seen = vi.fn();
    onWeaknessModelChanged(seen);
    await recordAnswer({ questionTag: 'hung-material', fen: FEN_A, origin: 'lesson', solved: true, answer: detail() });
    expect(seen).toHaveBeenCalled();
  });
});

describe('KNOW vs USE — one bar, two readings (decision #2)', () => {
  it('two clean reads on two POSITIONS prove KNOW and leave USE grey', async () => {
    await recordAnswer({ questionTag: 'hung-material', fen: FEN_A, origin: 'lesson', solved: true, answer: detail() });
    await recordAnswer({ questionTag: 'hung-material', fen: FEN_B, origin: 'reading', solved: true, answer: detail() });
    expect(await capabilityStanding('hung-material')).toEqual({ know: true, use: false });
    // The heat map's (USE) profile does not see lesson rows at all.
    expect((await getCapabilityProfile()).get('hung-material')).toBeUndefined();
    expect((await getCapabilityProfile('know')).get('hung-material')?.streakGames).toBe(2);
  });

  it('the same position twice is ONE source — not proven', async () => {
    await recordAnswer({ questionTag: 'hung-material', fen: FEN_A, origin: 'lesson', solved: true, answer: detail() });
    await recordAnswer({ questionTag: 'hung-material', fen: FEN_A.replace(' 0 1', ' 4 9'), origin: 'lesson', solved: true, answer: detail() });
    expect((await capabilityStanding('hung-material')).know).toBe(false);
  });

  it('game evidence proves USE and never KNOW', async () => {
    await recordLaneEvidence({ tag: 'hung-material', outcome: 'held', fen: FEN_A, playedSan: 'Nxd5', posedImportance: 90, origin: 'learn', prompted: false, sourceGameId: 'g1' });
    await recordLaneEvidence({ tag: 'hung-material', outcome: 'held', fen: FEN_B, playedSan: 'Nxd5', posedImportance: 90, origin: 'learn', prompted: false, sourceGameId: 'g2' });
    expect(standingFromEvidence(await db.capabilityEvidence.toArray()).get('hung-material')).toEqual({ know: false, use: true });
  });

  it('nothing asked is grey on both', async () => {
    expect(await capabilityStanding('no-plan')).toEqual({ know: false, use: false });
  });
});

describe('recordLaneEvidence emits the model change (it did not)', () => {
  it('fires onWeaknessModelChanged after the write', async () => {
    const seen = vi.fn();
    onWeaknessModelChanged(seen);
    await recordLaneEvidence({ tag: 'calculation-depth', outcome: 'held', fen: FEN_A, playedSan: 'Bb5', posedImportance: 90, origin: 'learn', prompted: false, sourceGameId: 'g1' });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
