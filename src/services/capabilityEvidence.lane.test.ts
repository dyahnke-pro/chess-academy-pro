// P4 dual-use: a Learn lane that TEACHES a found move also RECORDS it, and the
// row reaches the same profile the ranker reads. Real fake-indexeddb.
import { NO_PROOF } from './proof';
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
  it('eight unprompted finds turn the tag GREEN (the hold rate), seven do not', async () => {
    for (let i = 1; i <= 8; i++) {
      await recordLaneEvidence({ tag: 'calculation-depth', outcome: 'held', fen: FEN, playedSan: 'Bb5', posedImportance: 90, origin: 'learn', prompted: false, sourceGameId: `g${i}` });
      expect(capabilityProven((await getCapabilityProfile()).get('calculation-depth'))).toBe(i === 8);
    }
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
    const withEv: TeachingHint = { lane: 'foundMove', proof: NO_PROOF.stated, text: 'x', squares: [], claims: [], event: null, arrows: [], evidence: { tag: 'calculation-depth', posedImportance: 90 } };
    const without: TeachingHint = { lane: 'tempo', proof: NO_PROOF.stated, text: 'y', squares: [], claims: [], event: null, arrows: [] };
    recordTeachingEvidence(without, { fen: FEN, playedSan: 'Bb5', prompted: false, gameId: 'g1' });
    recordTeachingEvidence(withEv, { fen: FEN, playedSan: 'Bb5', prompted: false, gameId: 'g1' });
    await vi.waitFor(async () => { expect(await db.capabilityEvidence.count()).toBe(1); });
    const row = (await db.capabilityEvidence.toArray())[0];
    expect(row).toMatchObject({ tag: 'calculation-depth', outcome: 'held', origin: 'learn', prompted: false, sourceGameId: 'g1' });
  });

  it('one move credits a skill once, however many lanes name it in the same tick (2026-10-17)', async () => {
    const h: TeachingHint = { lane: 'foundMove', proof: NO_PROOF.stated, text: 'x', squares: [], claims: [], event: null, arrows: [], evidence: { tag: 'missed-tactic', posedImportance: 90 } };
    recordTeachingEvidence(h, { fen: FEN, playedSan: 'Nd5', prompted: false, gameId: 'g9' });
    recordTeachingEvidence({ ...h, lane: 'movePoint' }, { fen: FEN, playedSan: 'Nd5', prompted: false, gameId: 'g9' });
    await vi.waitFor(async () => { expect(await db.capabilityEvidence.where('tag').equals('missed-tactic').count()).toBe(1); });
    await new Promise((r) => setTimeout(r, 50));
    expect(await db.capabilityEvidence.where('tag').equals('missed-tactic').count()).toBe(1);
  });
});

