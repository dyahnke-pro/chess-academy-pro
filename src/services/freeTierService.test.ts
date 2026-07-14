import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/schema';
import {
  FREE_OPENING_POOL,
  FREE_PUZZLE_LIMIT,
  isEligibleFreeOpening,
  loadFreeTier,
  recordPuzzleSolved,
  puzzlesRemaining,
  hasPuzzlesLeft,
  canViewOpening,
  claimFreeOpening,
  kidWindowActive,
  kidDaysLeft,
  stampKidAccess,
  KID_FREE_MS,
} from './freeTierService';

beforeEach(async () => {
  await db.freeTier.clear();
});

describe('FREE_OPENING_POOL', () => {
  it('is the 37 main-40 masterclass openings', () => {
    expect(FREE_OPENING_POOL.size).toBe(37);
  });
  it('includes mainstream openings', () => {
    for (const id of ['italian-game', 'ruy-lopez', 'caro-kann', 'sicilian-najdorf', 'grunfeld-defence', 'qga', 'queens-gambit']) {
      expect(isEligibleFreeOpening(id)).toBe(true);
    }
  });
  it('excludes the sac gambits / countergambits', () => {
    for (const id of ['kings-gambit', 'evans-gambit', 'benko-gambit', 'budapest-gambit', 'albin-countergambit', 'schliemann-defence']) {
      expect(isEligibleFreeOpening(id)).toBe(false);
    }
  });
  it('excludes pro-reps and gambit-tab ids', () => {
    expect(isEligibleFreeOpening('pro-naroditsky-caro-kann')).toBe(false);
    expect(isEligibleFreeOpening('scotch-gambit')).toBe(false);
  });
});

describe('puzzle bucket', () => {
  it('starts empty and counts up', async () => {
    expect((await loadFreeTier()).puzzlesSolved).toBe(0);
    await recordPuzzleSolved();
    await recordPuzzleSolved();
    const row = await loadFreeTier();
    expect(row.puzzlesSolved).toBe(2);
    expect(puzzlesRemaining(row)).toBe(FREE_PUZZLE_LIMIT - 2);
    expect(hasPuzzlesLeft(row)).toBe(true);
  });
  it('reports empty at the limit', () => {
    expect(hasPuzzlesLeft({ puzzlesSolved: FREE_PUZZLE_LIMIT })).toBe(false);
    expect(puzzlesRemaining({ puzzlesSolved: FREE_PUZZLE_LIMIT + 5 })).toBe(0);
  });
});

describe('free opening claim', () => {
  it('claims the first eligible opening, then blocks a different one', async () => {
    expect(canViewOpening('italian-game', { freeOpeningId: null })).toBe(true);
    const first = await claimFreeOpening('italian-game');
    expect(first.result).toBe('ok');
    expect(first.row.freeOpeningId).toBe('italian-game');

    const again = await claimFreeOpening('italian-game');
    expect(again.result).toBe('already-claimed-this');

    const other = await claimFreeOpening('caro-kann');
    expect(other.result).toBe('denied-other');
    expect(other.row.freeOpeningId).toBe('italian-game');

    expect(canViewOpening('caro-kann', { freeOpeningId: 'italian-game' })).toBe(false);
  });
  it('refuses to claim a non-eligible opening', async () => {
    const r = await claimFreeOpening('kings-gambit');
    expect(r.result).toBe('not-eligible');
    expect(r.row.freeOpeningId).toBeNull();
  });
});

describe('kid window', () => {
  it('is active before first access and stamps on first touch', async () => {
    expect(kidWindowActive({ kidFirstAccessAt: null })).toBe(true);
    expect(kidDaysLeft({ kidFirstAccessAt: null })).toBe(7);
    const row = await stampKidAccess();
    expect(row.kidFirstAccessAt).toBeTypeOf('number');
    // idempotent — second stamp keeps the original timestamp
    const first = row.kidFirstAccessAt;
    const row2 = await stampKidAccess();
    expect(row2.kidFirstAccessAt).toBe(first);
  });
  it('expires after 7 days', () => {
    const now = 1_000_000_000_000;
    expect(kidWindowActive({ kidFirstAccessAt: now - (KID_FREE_MS - 1000) }, now)).toBe(true);
    expect(kidWindowActive({ kidFirstAccessAt: now - (KID_FREE_MS + 1000) }, now)).toBe(false);
    expect(kidDaysLeft({ kidFirstAccessAt: now - (KID_FREE_MS + 1000) }, now)).toBe(0);
  });
});
