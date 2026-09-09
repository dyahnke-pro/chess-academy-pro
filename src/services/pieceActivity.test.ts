import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { assemblePieceActivityAnswer, answerBoardQuestion } from './groundedAnswer';
import { classifyBoardQuestion } from './boardQuestionRouter';

describe('piece-activity: worst-placed / least-active piece (loop audit 2026-09-09)', () => {
  it('routes "worst-placed piece" phrasings to piece-activity, not a deflect', () => {
    expect(classifyBoardQuestion("what's my worst-placed piece?")).toBe('piece-activity');
    expect(classifyBoardQuestion('which of my pieces is the most passive?')).toBe('piece-activity');
    expect(classifyBoardQuestion('which piece is doing the least here?')).toBe('piece-activity');
    expect(classifyBoardQuestion('what is my worst bishop?')).toBe('piece-activity');
  });

  it('names a real student officer and the scope claim is board-true', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 (a Ruy) — White to answer.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3';
    const ans = assemblePieceActivityAnswer(fen, "what's my worst-placed piece?", 'white');
    expect(ans).not.toBeNull();
    // The answer must name a square that actually holds a WHITE officer.
    const m = /on ([a-h][1-8])/.exec(ans!.facts);
    expect(m).not.toBeNull();
    const sq = m![1];
    const cell = new Chess(fen).get(sq as never) as { color: string; type: string } | undefined;
    expect(cell).toBeTruthy();
    expect(cell!.color).toBe('w');
    expect(['n', 'b', 'r', 'q']).toContain(cell!.type); // never a pawn or king
    expect(ans!.sources).toContain('chess.js');
  });

  it('answers the same question through the full board-question dispatch', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3';
    const out = answerBoardQuestion(fen, 'what is my worst placed piece?', 'white');
    expect(out).not.toBeNull();
    expect(out!.aspect).toBe('piece-activity');
    expect(out!.answer.facts.toLowerCase()).toContain('least active');
  });

  it('scopes to a named piece type when asked ("my worst bishop")', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3';
    const ans = assemblePieceActivityAnswer(fen, 'what is my worst bishop?', 'white');
    expect(ans).not.toBeNull();
    const m = /on ([a-h][1-8])/.exec(ans!.facts);
    const cell = new Chess(fen).get(m![1] as never) as { type: string } | undefined;
    expect(cell!.type).toBe('b'); // c1 or b5, whichever has less scope
  });

  it('returns null when the side has no officers (K+P endgame)', () => {
    expect(assemblePieceActivityAnswer('8/8/8/4k3/4P3/4K3/8/8 w - - 0 1', 'worst piece?', 'white')).toBeNull();
  });
});
