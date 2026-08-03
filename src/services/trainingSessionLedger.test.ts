// The loop the app is advertised on: train → the session is recorded → the
// weakness profile reads it → it picks what to drill next → train.
//
// It had been open. WO-ROLODEX-UI-01 PR-1 deleted the session-plan generation
// path and took the only writer with it, so no row had been created since —
// while `computeWeaknessProfile`, the export bundle and cloud sync all went on
// reading an empty table and quietly getting nothing.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { beginTrainingSession, finishTrainingSession } from './trainingSessionLedger';
import { useAppStore } from '../stores/appStore';
import { buildUserProfile } from '../test/factories';

describe('trainingSessionLedger', () => {
  beforeEach(async () => {
    await db.sessions.clear();
    useAppStore.setState({ activeProfile: buildUserProfile({ id: 'profile-1' }) });
  });

  it('writes a row the readers can actually see', async () => {
    const open = await beginTrainingSession({ blockType: 'flashcards', targetMinutes: 10 });
    expect(open).not.toBeNull();

    // Open, but not yet complete — a session in flight is on the books.
    const inFlight = await db.sessions.get(open!.id);
    expect(inFlight?.completed).toBe(false);
    expect(inFlight?.profileId).toBe('profile-1');
    expect(inFlight?.plan.blocks[0].type).toBe('flashcards');

    await finishTrainingSession(open, { itemsCompleted: 8, itemsCorrect: 6 });

    const done = await db.sessions.get(open!.id);
    expect(done?.completed).toBe(true);
    expect(done?.puzzlesSolved).toBe(8);
    expect(done?.puzzleAccuracy).toBeCloseTo(0.75, 5);
    expect(done?.xpEarned).toBeGreaterThan(0);
    expect(done?.durationMinutes).toBeGreaterThanOrEqual(1);
  });

  it('carries the opening through, so an opening-review session is attributable', async () => {
    const open = await beginTrainingSession({
      blockType: 'opening_review',
      openingId: 'vienna-game',
    });
    const row = await db.sessions.get(open!.id);
    expect(row?.plan.blocks[0].openingId).toBe('vienna-game');
  });

  it('records a perfect and a zero session without dividing by zero', async () => {
    const perfect = await beginTrainingSession({ blockType: 'flashcards' });
    await finishTrainingSession(perfect, { itemsCompleted: 5, itemsCorrect: 5 });
    expect((await db.sessions.get(perfect!.id))?.puzzleAccuracy).toBe(1);

    const empty = await beginTrainingSession({ blockType: 'flashcards' });
    await finishTrainingSession(empty, { itemsCompleted: 0, itemsCorrect: 0 });
    expect((await db.sessions.get(empty!.id))?.puzzleAccuracy).toBe(0);
  });

  it('never records without a profile, and never throws at the caller', async () => {
    useAppStore.setState({ activeProfile: null });
    const open = await beginTrainingSession({ blockType: 'flashcards' });
    expect(open).toBeNull();
    // A null handle must be a silent no-op — a surface should not have to guard.
    await expect(finishTrainingSession(open, { itemsCompleted: 3, itemsCorrect: 3 })).resolves.toBeUndefined();
    expect(await db.sessions.count()).toBe(0);
  });

  it('gives concurrent sessions distinct ids', async () => {
    const [a, b] = await Promise.all([
      beginTrainingSession({ blockType: 'flashcards' }),
      beginTrainingSession({ blockType: 'puzzle_drill' }),
    ]);
    expect(a!.id).not.toBe(b!.id);
    expect(await db.sessions.count()).toBe(2);
  });

  it('lands where the weakness profile looks for it', async () => {
    const open = await beginTrainingSession({ blockType: 'flashcards' });
    await finishTrainingSession(open, { itemsCompleted: 4, itemsCorrect: 2 });
    // computeWeaknessProfile reads `db.sessions.orderBy('date').reverse()` —
    // the row is worthless to the loop if it can't be ordered by date.
    const recent = await db.sessions.orderBy('date').reverse().limit(10).toArray();
    expect(recent.map((s) => s.id)).toContain(open!.id);
  });
});
