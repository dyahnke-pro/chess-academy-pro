import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoAnalyzeBlunders } from './autoAnalyzeGame';
import { captureMisconception } from './discussionPractice';

vi.mock('./discussionPractice', () => ({ captureMisconception: vi.fn() }));
const mocked = vi.mocked(captureMisconception);

beforeEach(() => mocked.mockReset());

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

describe('autoAnalyzeBlunders', () => {
  it('classifies and logs each blunder with source auto-analysis', async () => {
    mocked
      .mockResolvedValueOnce({ classification: { tag: 'hung-material', coachNote: 'x' }, coachNote: 'x', logged: true })
      .mockResolvedValueOnce({ classification: { tag: 'overvalued-attack', coachNote: 'y' }, coachNote: 'y', logged: true });

    const r = await autoAnalyzeBlunders(
      [
        { fen: FEN, playedSan: 'Ng4', bestSan: 'Bb5', cpLoss: 250, gamePhase: 'opening', moveNumber: 3 },
        { fen: FEN, playedSan: 'Bxf7+', bestSan: 'O-O', cpLoss: 320, gamePhase: 'middlegame', moveNumber: 12 },
      ],
      { openingId: 'ruy-lopez', sourceGameId: 'g1', learned: true },
    );

    expect(r.classified).toBe(2);
    expect(r.logged).toBe(2);
    expect(mocked).toHaveBeenCalledTimes(2);
    const firstCall = mocked.mock.calls[0][0];
    expect(firstCall.source).toBe('auto-analysis');
    expect(firstCall.classifyInput.userReason).toBeUndefined();
    expect(firstCall.context.sourceGameId).toBe('g1');
  });

  it("counts a 'none' classification as neither classified nor logged", async () => {
    mocked.mockResolvedValueOnce({ classification: { tag: 'none', coachNote: 'fine' }, coachNote: 'fine', logged: false });
    const r = await autoAnalyzeBlunders([{ fen: FEN, playedSan: 'Bb5' }], { learned: true });
    expect(r.classified).toBe(0);
    expect(r.logged).toBe(0);
  });

  it('classifies but does not log on an unlearned line (count-against gate)', async () => {
    mocked.mockResolvedValueOnce({ classification: { tag: 'missed-tactic', coachNote: 'z' }, coachNote: 'z', logged: false });
    const r = await autoAnalyzeBlunders([{ fen: FEN, playedSan: 'h3' }], { learned: false });
    expect(r.classified).toBe(1);
    expect(r.logged).toBe(0);
    expect(mocked.mock.calls[0][0].shouldCount).toBe(false);
  });

  it('a slip is dated by the game it was played in (game date + ply), never the analysis time', async () => {
    mocked.mockResolvedValueOnce({ classification: { tag: 'hung-material', coachNote: 'x' }, coachNote: 'x', logged: true });
    const played = Date.parse('2025-03-04');
    await autoAnalyzeBlunders([{ fen: FEN, playedSan: 'Ng4', bestSan: 'Bb5', cpLoss: 250 }], { sourceGameId: 'g1', learned: true, playedAt: played });
    expect(mocked.mock.calls[0][0].context.playedAt).toBe(played + 4);
  });
});

describe('a background pass hands the thread back between rows (the Learn freeze, 2026-10-21)', () => {
  it('awaits betweenRows before every row but the first, so a live game stops the pass within one row', async () => {
    const order: string[] = [];
    mocked.mockImplementation(async (...args: Parameters<typeof captureMisconception>) => {
      order.push(`row ${args[0]?.classifyInput?.playedSan ?? JSON.stringify(args).slice(0, 80)}`);
      return { classification: { tag: 'hung-material', coachNote: 'x' }, coachNote: 'x', logged: true };
    });
    await autoAnalyzeBlunders(
      [{ fen: FEN, playedSan: 'Ng4' }, { fen: FEN, playedSan: 'h3' }, { fen: FEN, playedSan: 'a3' }],
      { learned: true, betweenRows: async () => { order.push('yield'); } },
    );
    expect(order).toEqual(['row Ng4', 'yield', 'row h3', 'yield', 'row a3']);
  });

  it('NEGATIVE: a foreground caller passes no hook and nothing waits', async () => {
    mocked.mockResolvedValue({ classification: { tag: 'hung-material', coachNote: 'x' }, coachNote: 'x', logged: true });
    const r = await autoAnalyzeBlunders([{ fen: FEN, playedSan: 'Ng4' }, { fen: FEN, playedSan: 'h3' }], { learned: true });
    expect(r.logged).toBe(2);
  });
});

