import { describe, it, expect } from 'vitest';
import { phaseVerdictLine, assessPositionalEdge } from './reviewPositionalAssessment';

// WO-TEACH-02 S4 — who's better, and why, at the turn of the game.
describe('phaseVerdictLine', () => {
  // White up a knight, castled; Black king still on e8 with queens on.
  const FEN = 'rnbqk2r/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 8';

  it('counts material and king safety among the reasons', () => {
    const a = assessPositionalEdge(FEN, 'w', 300);
    expect(a.reasons).toContain("you're up a piece");
    expect(a.reasons).toContain('your king is tucked away and theirs is still in the centre');
  });

  it('speaks the band and the reasons, never the number', () => {
    const t = phaseVerdictLine(FEN, 'w', 300, 'middlegame')!;
    expect(t).toMatch(/middlegame.*: you're clearly better — you're up a piece/);
    expect(phaseVerdictLine(FEN, 'w', 300, 'middlegame')).toBe(t); // same board, same words
    expect(t).not.toMatch(/\d{2,}|centipawn|points? of eval/);
  });

  it('from the other seat the reasons are the opponent\'s assets', () => {
    const t = phaseVerdictLine(FEN, 'b', -300, 'middlegame')!;
    expect(t).toMatch(/you're in trouble — they're up a piece/);
  });

  it('NEGATIVE CONTROL: a level start with nothing to name stays silent', () => {
    expect(phaseVerdictLine('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w', 10, 'middlegame')).toBeNull();
  });
});
