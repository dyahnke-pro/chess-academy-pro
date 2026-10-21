// THE SPINE IS REBUILT ONLY WHEN ITS OWN INPUTS CHANGE (2026-10-21).
//
// After every Learn move the signals reader asked for the unified profile, and
// it was rebuilt from every game, slip, mistake puzzle and tactic each time —
// though most moves write only an answer row, which the spine never reads.
// This holds both halves: an unrelated write leaves the profile alone, and
// every input it DOES read (its tables, its two meta rows, the student's
// names and rating) still rebuilds it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOK_DEPARTURE_META_KEY } from './bookDeparturePrecompute';
import { db } from '../db/schema';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { PROVEN_MIN_IMPORTANCE, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { useAppStore } from '../stores/appStore';
import { buildUserProfile } from '../test/factories';
import { ADDRESSED_CONVERSIONS_META_KEY } from './conversionProgress';
import type { MisconceptionTagRecord } from '../types';

const TAG = 'neglected-development';
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

function slip(id: string, moveNo: number): MisconceptionTagRecord {
  return {
    id, tag: TAG, source: 'auto-analysis', createdAt: Date.now() - 3 * 86_400_000,
    fen: FEN.replace(' 2 3', ` 2 ${moveNo}`), playedSan: 'a3', bestSan: 'Bc4', cpLoss: 120, gamePhase: 'opening',
    moveNumber: moveNo, sourceGameId: `game-${id}`, status: 'open', masteryHits: 0,
    dueAt: Date.now() - 1000, counted: true,
  };
}

const answer = (id: string): CapabilityEvidenceRecord => ({
  id, tag: TAG, outcome: 'held', fen: FEN, playedSan: 'Bc4',
  posedImportance: PROVEN_MIN_IMPORTANCE + 5, recordedAt: Date.now(),
  origin: 'learn', prompted: false, sourceGameId: 'g-live',
});

const openCount = (rows: Awaited<ReturnType<typeof getUnifiedWeaknessProfile>>): number =>
  rows.find((r) => r.tag === TAG)?.openCount ?? 0;

describe('getUnifiedWeaknessProfile — kept until its own inputs change', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.setState({ activeProfile: buildUserProfile() });
    await db.misconceptionTags.add(slip('m1', 3));
    // A fresh book-departure cache: with none, the first build starts the
    // background refresh, whose write to that meta row CORRECTLY rebuilds the
    // spine — a rebuild these tests would then count against the write under test.
    await db.meta.put({ key: BOOK_DEPARTURE_META_KEY, value: JSON.stringify({ at: Date.now(), gameCount: 0, rows: [] }) });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('an answer row (the write most moves make) does not rebuild it', async () => {
    const first = await getUnifiedWeaknessProfile();
    const reads = vi.spyOn(db.games, 'filter');
    await db.capabilityEvidence.add(answer('a1'));
    await db.meta.put({ key: 'app-audit-log.v1', value: '[]' });   // the audit log's 2 s flush
    const again = await getUnifiedWeaknessProfile();
    expect(reads, 'the spine re-read every game for a write it never reads').not.toHaveBeenCalled();
    expect(again).toEqual(first);
    expect(again).not.toBe(first);   // each caller gets its own array
    reads.mockRestore();
  });

  it('a new slip rebuilds it, and the slip is in it', async () => {
    expect(openCount(await getUnifiedWeaknessProfile())).toBe(1);
    await db.misconceptionTags.add(slip('m2', 5));
    expect(openCount(await getUnifiedWeaknessProfile())).toBe(2);
  });

  it('a write to one of its meta rows rebuilds it', async () => {
    await getUnifiedWeaknessProfile();
    const reads = vi.spyOn(db.games, 'filter');
    await db.meta.put({ key: ADDRESSED_CONVERSIONS_META_KEY, value: [] });
    await getUnifiedWeaknessProfile();
    expect(reads).toHaveBeenCalledTimes(1);
    reads.mockRestore();
  });

  it('a change of the names or the rating it ranks against rebuilds it', async () => {
    await getUnifiedWeaknessProfile();
    const reads = vi.spyOn(db.games, 'filter');
    const p = buildUserProfile();
    useAppStore.setState({ activeProfile: { ...p, preferences: { ...p.preferences, chessComUsername: 'someone-else' } } });
    await getUnifiedWeaknessProfile();
    expect(reads).toHaveBeenCalledTimes(1);
    reads.mockRestore();
  });

  it('is never served older than five minutes (due dates move with the clock)', async () => {
    await getUnifiedWeaknessProfile();
    const reads = vi.spyOn(db.games, 'filter');
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 5 * 60 * 1000 + 1);
    await getUnifiedWeaknessProfile();
    expect(reads).toHaveBeenCalledTimes(1);
    clock.mockRestore();
    reads.mockRestore();
  });
});
