import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { captureMisconception, withdrawTakenBackSlip } from './discussionPractice';
import { classifyMisconception } from './misconceptionClassifier';

// YOUR OWN TAKEBACK NEVER MAKES A PUZZLE (David 2026-10-23: "not all undo
// moves get puzzles" — the coach flagged it = a puzzle; your own Takeback =
// not). The live capture files a puzzle for a slip on a learned line; the
// flag it was handed was a 6-s snapshot nothing read. Real Dexie; only the
// classifier is stubbed.
vi.mock('./misconceptionClassifier', () => ({ classifyMisconception: vi.fn() }));
const classify = vi.mocked(classifyMisconception);

/** 1.e4 e5 2.Nf3, Black to move: …Qh4 hangs the queen's tempo; …Nc6 is best. */
const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const GAME = 'g-own';

const capture = (takenBack: boolean, gameId = GAME) => captureMisconception({
  classifyInput: { fen: FEN, playedSan: 'Qh4', bestSan: 'Nc6', userReason: '(not asked)' },
  source: 'discussion-practice',
  shouldCount: true,
  context: { fen: FEN, playedSan: 'Qh4', bestSan: 'Nc6', cpLoss: 300, grade: 'blunder', sourceGameId: gameId, takenBack },
});
const puzzles = (gameId = GAME) => db.mistakePuzzles.where('sourceGameId').equals(gameId).toArray();
const slips = (gameId = GAME) => db.misconceptionTags.where('sourceGameId').equals(gameId).toArray();
/** The puzzle is filed off the capture's promise chain. */
const settle = () => new Promise((r) => setTimeout(r, 60));

describe('your own takeback is never a puzzle; the slip stays on the record, marked', () => {
  beforeEach(async () => {
    await Promise.all([db.mistakePuzzles.clear(), db.misconceptionTags.clear(), db.games.clear()]);
    classify.mockResolvedValue({ tag: 'hung-material', coachNote: 'It drops the queen tempo.' });
  });
  it('a move taken back before its grade: the slip is filed, marked, and no puzzle', async () => {
    await capture(true);
    await settle();
    expect((await slips()).map((r) => r.takenBack)).toEqual([true]);
    expect(await puzzles()).toHaveLength(0);
  });
  it('twin: the same move kept — the puzzle is filed', async () => {
    await capture(false);
    await settle();
    expect(await puzzles()).toHaveLength(1);
  });
  it('taken back AFTER its grade: the puzzle is withdrawn and the slip marked; another game keeps its own', async () => {
    await capture(false);
    await settle();
    const [mine] = await puzzles();
    await db.mistakePuzzles.add({ ...mine, id: 'other-game-puzzle', sourceGameId: 'g-other' });
    const r = await withdrawTakenBackSlip({ gameId: GAME, fen: FEN, playedSan: 'Qh4' });
    expect(r.puzzles).toBe(1);
    expect(await puzzles()).toHaveLength(0);
    expect((await slips()).every((s) => s.takenBack)).toBe(true);
    expect(await puzzles('g-other')).toHaveLength(1);
  });
  it('taken back while its grade is still being filed: the capture reads the mark before it writes', async () => {
    await withdrawTakenBackSlip({ gameId: 'g-late', fen: FEN, playedSan: 'Qh4' });
    await capture(false, 'g-late');
    await settle();
    expect(await puzzles('g-late')).toHaveLength(0);
    expect((await slips('g-late')).map((r) => r.takenBack)).toEqual([true]);
  });
});
