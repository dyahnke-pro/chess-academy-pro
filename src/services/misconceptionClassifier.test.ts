import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyMisconception } from './misconceptionClassifier';
import { getCoachChatResponse } from './coachApi';

vi.mock('./coachApi', () => ({
  getCoachChatResponse: vi.fn(),
}));

const mocked = vi.mocked(getCoachChatResponse);
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

beforeEach(() => {
  mocked.mockReset();
});

describe('classifyMisconception', () => {
  it('parses a clean closed-set classification', async () => {
    mocked.mockResolvedValueOnce(
      '{"tag":"overvalued-attack","coachNote":"The sacrifice on f7 has no follow-up; the defender consolidates."}',
    );
    const r = await classifyMisconception({ fen: FEN, playedSan: 'Bxf7+', bestSan: 'O-O' });
    expect(r).not.toBeNull();
    expect(r!.tag).toBe('overvalued-attack');
    expect(r!.coachNote).toContain('f7');
  });

  it('tolerates a ```json fence around the object', async () => {
    mocked.mockResolvedValueOnce('```json\n{"tag":"hung-material","coachNote":"The knight on e5 is undefended."}\n```');
    const r = await classifyMisconception({ fen: FEN, playedSan: 'Ng4' });
    expect(r!.tag).toBe('hung-material');
  });

  it('passes through tag "none" when the move is fine', async () => {
    mocked.mockResolvedValueOnce('{"tag":"none","coachNote":"A reasonable developing move."}');
    const r = await classifyMisconception({ fen: FEN, playedSan: 'Bb5' });
    expect(r!.tag).toBe('none');
  });

  it('rejects an off-vocabulary tag (hallucination guard)', async () => {
    mocked.mockResolvedValueOnce('{"tag":"blundered-the-vibe","coachNote":"x"}');
    const r = await classifyMisconception({ fen: FEN, playedSan: 'a3' });
    expect(r).toBeNull();
  });

  it("requires a customLabel when tag is 'other'", async () => {
    mocked.mockResolvedValueOnce('{"tag":"other","coachNote":"odd move"}');
    expect(await classifyMisconception({ fen: FEN, playedSan: 'a3' })).toBeNull();

    mocked.mockResolvedValueOnce('{"tag":"other","customLabel":"premature resignation","coachNote":"There was still a defense."}');
    const r = await classifyMisconception({ fen: FEN, playedSan: 'a3' });
    expect(r!.tag).toBe('other');
    expect(r!.customLabel).toBe('premature resignation');
  });

  it('returns null on unparseable output', async () => {
    mocked.mockResolvedValueOnce('I think you played a questionable move there!');
    expect(await classifyMisconception({ fen: FEN, playedSan: 'a3' })).toBeNull();
  });

  it('returns null when the LLM call throws', async () => {
    mocked.mockRejectedValueOnce(new Error('network'));
    expect(await classifyMisconception({ fen: FEN, playedSan: 'a3' })).toBeNull();
  });

  it('forwards the student reason and skips personality', async () => {
    mocked.mockResolvedValueOnce('{"tag":"missed-opponents-threat","coachNote":"Black threatened the e4 pawn."}');
    await classifyMisconception({ fen: FEN, playedSan: 'a3', userReason: 'I wanted luft for my king' });
    const [messages, , , task, , , , skipPersonality] = mocked.mock.calls[0];
    expect(messages[0].content).toContain('I wanted luft for my king');
    expect(task).toBe('bad_habit_report');
    expect(skipPersonality).toBe(true);
  });
});
