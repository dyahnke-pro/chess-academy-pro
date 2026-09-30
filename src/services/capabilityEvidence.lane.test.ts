// P4 dual-use: a Learn lane that TEACHES a found move also RECORDS it, and the
// row reaches the same profile the ranker reads. Real fake-indexeddb.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { recordLaneEvidence, getCapabilityProfile, capabilityProven } from './capabilityEvidence';
import { recordTeachingEvidence, type TeachingHint } from './learnBoardTeaching';

vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

describe('recordLaneEvidence', () => {
  it('two unprompted finds in two games turn the tag GREEN', async () => {
    await recordLaneEvidence({ tag: 'calculation-depth', outcome: 'held', fen: FEN, playedSan: 'Bb5', posedImportance: 90, origin: 'learn', prompted: false, sourceGameId: 'g1' });
    await recordLaneEvidence({ tag: 'calculation-depth', outcome: 'held', fen: FEN, playedSan: 'Bb5', posedImportance: 90, origin: 'learn', prompted: false, sourceGameId: 'g2' });
    const p = await getCapabilityProfile();
    expect(capabilityProven(p.get('calculation-depth'))).toBe(true);
  });
  it('prompted finds never prove anything', async () => {
    for (const g of ['g1', 'g2', 'g3']) {
      await recordLaneEvidence({ tag: 'calculation-depth', outcome: 'held', fen: FEN, playedSan: 'Bb5', posedImportance: 90, origin: 'learn', prompted: true, sourceGameId: g });
    }
    const p = await getCapabilityProfile();
    expect(capabilityProven(p.get('calculation-depth'))).toBe(false);
  });
});

describe('recordTeachingEvidence — the lane wire', () => {
  it('writes a held row for a hint that carries evidence, nothing for one that does not', async () => {
    const withEv: TeachingHint = { lane: 'foundMove', text: 'x', squares: [], claims: [], event: null, arrows: [], evidence: { tag: 'calculation-depth', posedImportance: 90 } };
    const without: TeachingHint = { lane: 'tempo', text: 'y', squares: [], claims: [], event: null, arrows: [] };
    recordTeachingEvidence(without, { fen: FEN, playedSan: 'Bb5', prompted: false, gameId: 'g1' });
    recordTeachingEvidence(withEv, { fen: FEN, playedSan: 'Bb5', prompted: false, gameId: 'g1' });
    await vi.waitFor(async () => { expect(await db.capabilityEvidence.count()).toBe(1); });
    const row = (await db.capabilityEvidence.toArray())[0];
    expect(row).toMatchObject({ tag: 'calculation-depth', outcome: 'held', origin: 'learn', prompted: false, sourceGameId: 'g1' });
  });
});
