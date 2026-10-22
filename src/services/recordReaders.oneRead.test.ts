// THE RECORD IS READ ONCE (the Learn freeze on a real record, 2026-10-21).
//
// After a student move the record settles and every reloading reader runs
// together: the student record (twice — the record hook and the fade levels),
// the skill-meter watcher, the capability profile, and the four need loaders
// Learn mounts. Each used to pull the whole evidence and slip tables out of
// IndexedDB itself — ~12,000 rows apiece on David's record, deserialised on
// the main thread, five times over per move. This holds the contract that
// replaced it: the tables are read once per session (`recordMirror`), a write
// is patched in by key, and the readers SEE the write without re-reading.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { loadStudentRecord } from './studentRecord';
import { readSkillRows } from './skillMetersLoader';
import { getCapabilityProfile, PROVEN_MIN_IMPORTANCE, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { invalidateStudentNeedContext, loadStudentNeedBase } from './studentNeedLoader';
import { invalidateWeaknessSignals } from './weaknessSignalLoader';
import type { MisconceptionTagRecord } from '../types';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';

// The weakness spine reads its own stores in its own transaction and is held
// to its own contract; here it answers empty so every read counted below
// belongs to the readers this file is about.
vi.mock('./weaknessSignalLoader', async (orig) => ({
  ...(await orig<typeof import('./weaknessSignalLoader')>()),
  loadWeaknessSignals: vi.fn(async () => []),
}));

const TAG = 'neglected-development';
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

function held(id: string, gameId: string): CapabilityEvidenceRecord {
  return {
    id, tag: TAG, outcome: 'held', fen: FEN.replace(' 2 3', ` 2 ${4 + Number(id.replace(/\D/g, '') || 0)}`), playedSan: 'Bc4',
    posedImportance: PROVEN_MIN_IMPORTANCE + 5, recordedAt: Date.now() - 86_400_000,
    origin: 'learn', prompted: false, sourceGameId: gameId,
  };
}

function slip(id: string): MisconceptionTagRecord {
  return {
    id, tag: TAG, source: 'auto-analysis', createdAt: Date.now() - 3 * 86_400_000,
    fen: FEN, playedSan: 'a3', bestSan: 'Bc4', cpLoss: 120, gamePhase: 'opening',
    moveNumber: 3, sourceGameId: 'game-slip', status: 'open', masteryHits: 0,
    dueAt: Date.now() - 1000, counted: true,
  };
}

/** Every reader the settle after a move wakes, at once. */
const afterAMove = (): Promise<unknown> => Promise.all([
  loadStudentRecord(),
  loadStudentRecord(),
  readSkillRows(),
  getCapabilityProfile(),
]);

describe('the record tables are read once, and a write still reaches every reader', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
    invalidateWeaknessSignals();
    invalidateStudentNeedContext();
    await db.capabilityEvidence.bulkAdd([held('h1', 'g1'), held('h2', 'g2'), held('h3', 'g3')]);
    await db.misconceptionTags.add(slip('m1'));
  });

  it('after a move writes a row, the readers see it without reading the evidence table again', async () => {
    await afterAMove();
    const before = (await getCapabilityProfile()).get(TAG)?.held ?? 0;
    const evidenceReads = vi.spyOn(db.capabilityEvidence, 'toArray');
    const slipReads = vi.spyOn(db.misconceptionTags, 'toArray');

    await db.capabilityEvidence.add(held('h4', 'g4'));
    invalidateWeaknessSignals();
    const [record] = await Promise.all([loadStudentRecord(), afterAMove()]);

    expect(evidenceReads, 'a reader pulled the whole evidence table again').not.toHaveBeenCalled();
    expect(slipReads, 'a reader pulled the whole slip table again').not.toHaveBeenCalled();
    expect(record.capabilities?.get(TAG)?.held).toBe(before + 1);
    expect((await getCapabilityProfile()).get(TAG)?.held).toBe(before + 1);
    expect((await readSkillRows()).held.map((r) => r.id)).toContain('h4');
    evidenceReads.mockRestore();
    slipReads.mockRestore();
  });

  it('a slip written mid-game reaches the heat tile and the meters', async () => {
    await afterAMove();
    await db.misconceptionTags.add({ ...slip('m2'), sourceGameId: 'game-2', fen: FEN.replace(' 2 3', ' 2 9') });
    invalidateWeaknessSignals();
    const record = await loadStudentRecord();
    expect(record.heat.get(TAG)?.hold.missed).toBe(2);
    expect((await readSkillRows()).slips.map((s) => s.id)).toEqual(expect.arrayContaining(['m1', 'm2']));
  });

  it('the four need loaders Learn mounts share ONE read of the games', async () => {
    await db.games.bulkAdd([buildGameRecord(), buildGameRecord()]);
    const gameReads = vi.spyOn(db.games, 'filter');
    const q = { rating: 1200, studentColor: 'white' as const, openingId: null, eco: null };
    const bases = await Promise.all([loadStudentNeedBase(q), loadStudentNeedBase(q), loadStudentNeedBase(q), loadStudentNeedBase(q)]);
    expect(gameReads).toHaveBeenCalledTimes(1);
    expect(new Set(bases).size).toBe(1);
    gameReads.mockRestore();
  });
});
