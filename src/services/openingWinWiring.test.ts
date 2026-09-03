// Finishing an opening rung must ARM THE REVIEW PROMPT — and only the first time.
//
// 🚨 WHY THIS EXISTS. The review-prompt service was fully built, the native
// plugin installed, the modal mounted globally, and four surfaces called it —
// and across 90 days of real App Store users the prompt fired ZERO times. Part
// of that was the threshold (3 wins, when no device had ever recorded two), and
// part was that finishing an opening walkthrough — the app's central act — did
// not count as a win at all.
//
// A wire that does not fire is not a wire, so this asserts the moment comes OUT
// of markRungComplete for a real completion, not merely that an import exists.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted, so the spy must be created inside the factory and read
// back through the mocked module rather than captured from an outer binding.
vi.mock('./reviewPromptService', () => ({ recordPositiveMoment: vi.fn(async () => undefined) }));
vi.mock('./analytics', () => ({ captureEvent: vi.fn() }));

import { db } from '../db/schema';
import { markRungComplete } from './openingService';
import { recordPositiveMoment as rpmImport } from './reviewPromptService';

const recordPositiveMoment = vi.mocked(rpmImport);

const OPENING = 'test-opening-win-wiring';

beforeEach(async () => {
  recordPositiveMoment.mockClear();
  await db.openings.put({
    id: OPENING,
    name: 'Test Opening',
    eco: 'C50',
    pgn: '1. e4 e5',
    color: 'white',
    linesDiscovered: [],
    linesLearned: [],
    linesPerfected: [],
    linesPlayed: [],
  } as never);
});

describe('finishing an opening rung records a win', () => {
  it('fires on a first-time Watch completion — the walkthrough IS the win', async () => {
    await markRungComplete(OPENING, 0, 'watch');
    expect(recordPositiveMoment).toHaveBeenCalledTimes(1);
    expect(recordPositiveMoment.mock.calls[0][0]).toContain('watch');
  });

  it('does NOT fire again when the same rung is replayed', async () => {
    await markRungComplete(OPENING, 0, 'watch');
    recordPositiveMoment.mockClear();
    await markRungComplete(OPENING, 0, 'watch');
    // Re-watching a line you already finished is not a new win. Without this
    // guard the prompt could be farmed by replaying one lesson.
    expect(recordPositiveMoment).not.toHaveBeenCalled();
  });

  it('fires again for a DIFFERENT variation of the same opening', async () => {
    await markRungComplete(OPENING, 0, 'watch');
    recordPositiveMoment.mockClear();
    await markRungComplete(OPENING, 1, 'watch');
    expect(recordPositiveMoment).toHaveBeenCalledTimes(1);
  });

  it('fires for a deeper rung on a line already watched (real new progress)', async () => {
    await markRungComplete(OPENING, 0, 'watch');
    recordPositiveMoment.mockClear();
    await markRungComplete(OPENING, 0, 'learn');
    expect(recordPositiveMoment).toHaveBeenCalledTimes(1);
    expect(recordPositiveMoment.mock.calls[0][0]).toContain('learn');
  });

  it('does not fire for an opening that does not exist', async () => {
    await markRungComplete('no-such-opening', 0, 'watch');
    expect(recordPositiveMoment).not.toHaveBeenCalled();
  });
});
