import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateMove, buildWhyPrompt, captureMisconception } from './discussionPractice';
import { classifyMisconception } from './misconceptionClassifier';
import { logMisconception } from './misconceptionService';

vi.mock('./misconceptionClassifier', () => ({ classifyMisconception: vi.fn() }));
vi.mock('./misconceptionService', () => ({ logMisconception: vi.fn() }));

const mockedClassify = vi.mocked(classifyMisconception);
const mockedLog = vi.mocked(logMisconception);
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

beforeEach(() => {
  mockedClassify.mockReset();
  mockedLog.mockReset();
});

describe('evaluateMove', () => {
  it('delegates to the slip detector', () => {
    const r = evaluateMove({ inBook: false, playedSan: 'Qh5', evalBeforeCp: 0, evalAfterCp: -150, learned: true });
    expect(r.isSlip).toBe(true);
  });
});

describe('buildWhyPrompt', () => {
  it('distinguishes leaving book from a general slip', () => {
    expect(buildWhyPrompt({ isSlip: true, reason: 'left-book', severity: 'mistake', cpLoss: 120, shouldCount: true }))
      .toMatch(/main line/i);
    expect(buildWhyPrompt({ isSlip: true, reason: 'eval-drop', severity: 'blunder', cpLoss: 250, shouldCount: true }))
      .toMatch(/idea behind/i);
  });
});

describe('captureMisconception', () => {
  it('logs a real misconception on a counted line', async () => {
    mockedClassify.mockResolvedValueOnce({ tag: 'overvalued-attack', coachNote: 'The attack has no follow-up.' });
    mockedLog.mockResolvedValueOnce({ id: 'x' } as never);

    const r = await captureMisconception({
      classifyInput: { fen: FEN, playedSan: 'Bxf7+', userReason: 'I wanted to attack the king' },
      source: 'discussion-practice',
      shouldCount: true,
      context: { fen: FEN, playedSan: 'Bxf7+', openingId: 'ruy-lopez' },
    });

    expect(r.logged).toBe(true);
    expect(r.coachNote).toContain('follow-up');
    expect(mockedLog).toHaveBeenCalledOnce();
    expect(mockedLog.mock.calls[0][0].tag).toBe('overvalued-attack');
    expect(mockedLog.mock.calls[0][0].userReason).toBe('I wanted to attack the king');
  });

  it('teaches but does NOT log on an unlearned line (count-against gate)', async () => {
    mockedClassify.mockResolvedValueOnce({ tag: 'hung-material', coachNote: 'The knight is undefended.' });
    const r = await captureMisconception({
      classifyInput: { fen: FEN, playedSan: 'Ng4' },
      source: 'discussion-practice',
      shouldCount: false,
      context: { fen: FEN, playedSan: 'Ng4' },
    });
    expect(r.coachNote).toContain('undefended');
    expect(r.logged).toBe(false);
    expect(mockedLog).not.toHaveBeenCalled();
  });

  it("does not log when the move was actually fine (tag 'none')", async () => {
    mockedClassify.mockResolvedValueOnce({ tag: 'none', coachNote: 'A solid developing move.' });
    const r = await captureMisconception({
      classifyInput: { fen: FEN, playedSan: 'Bb5' },
      source: 'discussion-practice',
      shouldCount: true,
      context: { fen: FEN, playedSan: 'Bb5' },
    });
    expect(r.logged).toBe(false);
    expect(mockedLog).not.toHaveBeenCalled();
  });

  it('returns empty coachNote and does not log when classification fails', async () => {
    mockedClassify.mockResolvedValueOnce(null);
    const r = await captureMisconception({
      classifyInput: { fen: FEN, playedSan: 'a3' },
      source: 'discussion-practice',
      shouldCount: true,
      context: { fen: FEN },
    });
    expect(r.classification).toBeNull();
    expect(r.coachNote).toBe('');
    expect(r.logged).toBe(false);
  });
});
