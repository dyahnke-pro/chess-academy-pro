import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { captureMisconception, takeBackOwnMove, takebackHinted } from './discussionPractice';
import { classifyMisconception } from './misconceptionClassifier';
import { fileTakenBack } from './takenBackPuzzles';
import { holdRecords } from './holdRate';
import { OWN_TAKEBACK_WEIGHT, slipWeight } from './misconceptionService';
import type { MisconceptionTagId } from '../data/misconceptionTags';

// YOUR OWN TAKEBACK GOES TO THE PUZZLES, AND WEIGHS HALF A MISS UNTIL YOU
// PRESS HINT (David 2026-11-07: "A move you took back yourself with the
// Takeback button — this one I think should … weighted 0.5 if back button is
// pressed and full weight if back and hint are pressed"). Real Dexie; the
// classifier is stubbed, and the taken-back door (it grades with the engine)
// is observed at its boundary.
vi.mock('./misconceptionClassifier', () => ({ classifyMisconception: vi.fn() }));
vi.mock('./takenBackPuzzles', () => ({ fileTakenBack: vi.fn() }));
const classify = vi.mocked(classifyMisconception);
const fileDoor = vi.mocked(fileTakenBack);

/** 1.e4 e5 2.Nf3, Black to move: …Qh4 hangs the queen's tempo; …Nc6 is best. */
const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const GAME = 'g-own';

const capture = (gameId = GAME) => captureMisconception({
  classifyInput: { fen: FEN, playedSan: 'Qh4', bestSan: 'Nc6', userReason: '(not asked)' },
  source: 'discussion-practice',
  shouldCount: true,
  context: { fen: FEN, playedSan: 'Qh4', bestSan: 'Nc6', cpLoss: 300, grade: 'blunder', sourceGameId: gameId },
});
const puzzles = (gameId = GAME) => db.mistakePuzzles.where('sourceGameId').equals(gameId).toArray();
const slips = (gameId = GAME) => db.misconceptionTags.where('sourceGameId').equals(gameId).toArray();
/** The puzzle is filed off the capture's promise chain. */
const settle = () => new Promise((r) => setTimeout(r, 60));

describe('your own takeback goes to the puzzles through the taken-back door', () => {
  beforeEach(async () => {
    await Promise.all([db.mistakePuzzles.clear(), db.misconceptionTags.clear(), db.capabilityEvidence.clear(), db.games.clear()]);
    classify.mockResolvedValue({ tag: 'hung-material', coachNote: 'It drops the queen tempo.' });
    fileDoor.mockClear();
  });

  it('the takeback files the move through the door that grades it (mistake or worse)', async () => {
    await takeBackOwnMove({ gameId: GAME, fen: FEN, playedSan: 'Qh4' });
    expect(fileDoor).toHaveBeenCalledWith(FEN, 'Qh4', GAME, null);
  });

  it('taken back AFTER its grade: the slip stays on the record, marked as your own takeback, and a filed puzzle stays', async () => {
    await capture('g-after');
    await settle();
    expect(await puzzles('g-after')).toHaveLength(1);
    await takeBackOwnMove({ gameId: 'g-after', fen: FEN, playedSan: 'Qh4' });
    expect(await puzzles('g-after')).toHaveLength(1);
    expect((await slips('g-after')).map((s) => [s.takenBack, s.ownTakeback])).toEqual([[true, true]]);
  });

  it('taken back while its grade is still being filed: the capture reads the mark, and the door files the puzzle once', async () => {
    await takeBackOwnMove({ gameId: 'g-late', fen: FEN, playedSan: 'Qh4' });
    await capture('g-late');
    await settle();
    expect((await slips('g-late')).map((s) => s.ownTakeback)).toEqual([true]);
    expect(await puzzles('g-late')).toHaveLength(0);
    expect(fileDoor).toHaveBeenCalledTimes(1);
  });
});

describe('the weight: half a miss for your own takeback, a full miss once you pressed Hint', () => {
  beforeEach(async () => {
    await Promise.all([db.mistakePuzzles.clear(), db.misconceptionTags.clear(), db.capabilityEvidence.clear()]);
    classify.mockResolvedValue({ tag: 'hung-material', coachNote: 'It drops the queen tempo.' });
  });

  it('a kept miss weighs 1; taken back, 0.5; taken back and then Hint at that board, 1 again', async () => {
    await capture('g-w');
    const [kept] = await slips('g-w');
    expect(slipWeight(kept)).toBe(1);
    await takeBackOwnMove({ gameId: 'g-w', fen: FEN, playedSan: 'Qh4' });
    const [back] = await slips('g-w');
    expect(slipWeight(back)).toBe(OWN_TAKEBACK_WEIGHT);
    await takebackHinted({ gameId: 'g-w', fen: FEN, playedSan: 'Qh4' });
    const [hinted] = await slips('g-w');
    expect(slipWeight(hinted)).toBe(1);
  });

  it('the hold rate counts it that way, the evidence row and the slip as one event', () => {
    const tag = 'hung-material' as MisconceptionTagId;
    const row = { tag, outcome: 'broken' as const, fen: FEN, recordedAt: 1, sourceGameId: 'g-h' };
    const slip = { id: 's', tag, source: 'discussion-practice', fen: FEN, playedSan: 'Qh4', sourceGameId: 'g-h', createdAt: 1, status: 'open', masteryHits: 0, dueAt: 0, grade: 'blunder' } as never;
    const back = holdRecords([{ ...row, ownTakeback: true }], [{ ...(slip as object), takenBack: true, ownTakeback: true } as never]).get(tag)!;
    expect(back.missed).toBe(0.5);
    const hinted = holdRecords([{ ...row, ownTakeback: true, hinted: true }], [{ ...(slip as object), takenBack: true, ownTakeback: true, hinted: true } as never]).get(tag)!;
    expect(hinted.missed).toBe(1);
    // The coach's own rewind (Try again) is not the student's takeback: full.
    const coach = holdRecords([row], [{ ...(slip as object), takenBack: true } as never]).get(tag)!;
    expect(coach.missed).toBe(1);
  });
});
