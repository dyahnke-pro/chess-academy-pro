import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { assemblePieceActivityAnswer, answerBoardQuestion } from './groundedAnswer';
import { classifyBoardQuestion } from './boardQuestionRouter';
import { pieceActivity, activityEdge, activityEdgeLine } from './pieceActivity';
import { legalSeeGainFor } from './positionReadingService';

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
    const out = answerBoardQuestion(fen, 'what is my worst placed piece?', 'white', null);
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

// ── THE TWO ARMIES COMPARED (`pieceActivity`, WO-DANYA-READS-01 #2) — on the
// boards of Danya's Chess.com articles (reference only, never quoted).

describe('pieceActivity: whose pieces are in play', () => {
  it('a knight with no safe square: every move it has loses it (queen-the-supporting-actress #1)', () => {
    const fen = 'r2q1r1k/1pp1p1bp/pn4p1/3nPbN1/3P3P/Q1N1B3/PP2BP2/2KR3R w - - 0 20';
    const a = pieceActivity(fen)!;
    const n = a.b.officers.find((o) => o.square === 'd5')!;
    expect(n.state).toBe('stuck');
    expect(n.safe).toBe(0);
    // Board truth: each of its moves is lost by the legal exchange.
    const asBlack = fen.replace(' w ', ' b ');
    for (const m of new Chess(asBlack).moves({ square: 'd5', verbose: true })) {
      const after = new Chess(asBlack); after.move(m.san);
      expect(legalSeeGainFor(after.fen(), m.to, 'w'), m.san).toBeGreaterThan(0);
    }
    const e = activityEdge(fen)!;
    expect(e.side).toBe('w');
    expect(activityEdgeLine(e, 'w')).toContain('their knight on d5 has no safe square');
  });

  it('a queen cut off in the other camp is stranded, and a pinned knight says the pin (how-to-ignore-a-threat-and-win #3)', () => {
    const fen = '6k1/p5b1/1p1p1pQ1/5p2/1nP1qP1P/5NP1/5BK1/8 b - - 0 32';
    const e = activityEdge(fen)!;
    expect(e.side).toBe('b');
    const line = activityEdgeLine(e, 'b');
    expect(line).toContain('Their queen on g6 is stranded with one safe square');
    expect(line).toContain('their knight on f3 is pinned to its king');
  });

  it('three minors at home against an army in play (the-rubinstein-maneuver #1)', () => {
    const fen = 'rnbqrbk1/1p3ppp/2pp1n2/p5B1/P1BNP3/2N5/1PP2PPP/R2QR1K1 w - - 0 11';
    expect(activityEdgeLine(activityEdge(fen)!, 'w')).toBe("Their knight on b8, bishop on c8 and bishop on f8 haven't moved. Your pieces are all in play.");
  });

  it('negative controls: the start, a side in check, a king-and-pawn ending', () => {
    expect(activityEdge(new Chess().fen())).toBeNull();
    expect(pieceActivity('rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2')).toBeNull();
    expect(activityEdge('8/8/8/4k3/4P3/4K3/8/8 w - - 0 1')).toBeNull();
  });
});
