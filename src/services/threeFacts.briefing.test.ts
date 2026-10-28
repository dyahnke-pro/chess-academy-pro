// The three facts said by the ONE briefing, on a real masters line (the
// Sicilian with 2.a3 and 3.b4: 1.e4 c5 2.a3 g6 3.b4 Bg7 4.Nc3). Same length,
// deeper: g6's shallow "it bears down on f5" is REPLACED by what it sets up;
// Bg7 is bound to what b4 aims at.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE } from './pvPlayback';

const LINE = ['e4', 'c5', 'a3', 'g6', 'b4', 'Bg7', 'Nc3'];
function fenBefore(n: number): string {
  const c = new Chess();
  for (const s of LINE.slice(0, n)) c.move(s);
  return c.fen();
}
function say(n: number, opts: { withFacts: boolean; student?: boolean }): string {
  return buildReviewMoveBriefing({
    phrases: null, prev: NO_PREV_CAPTURE, register: 'teach', moverIsStudent: opts.student ?? true,
    fenBefore: fenBefore(n), san: LINE[n],
    line: opts.withFacts ? LINE.slice(n + 1, n + 3) : null,
    theirLast: opts.withFacts && n > 0 ? { fenBefore: fenBefore(n - 1), san: LINE[n - 1] } : null,
  }) ?? '';
}

describe('the three facts in the briefing', () => {
  it('…g6 says what it sets up instead of the shallow square it eyes — same length', () => {
    const shallow = say(3, { withFacts: false });
    const deep = say(3, { withFacts: true });
    expect(shallow).toMatch(/bears down on f5/);
    expect(deep).toBe('You play g6, making room for your bishop on g7, where it hits their rook on a1 once their b4 opens the diagonal.');
    expect(deep).not.toMatch(/f5/);
  });
  it('…Bg7 is bound to what b4 aims at', () => {
    expect(say(5, { withFacts: true })).toMatch(/Their b4 is aimed at your pawn on c5, so this hits back on the side they're attacking\.$/);
  });
  it('from the other seat it is their bishop and your rook', () => {
    expect(say(3, { withFacts: true, student: false })).toMatch(/making room for their bishop on g7, where it hits your rook on a1 once your b4 opens the diagonal/);
  });
  it('the target is not said twice when the move clause already names it (v4 ply 76: Re8 guards c8)', () => {
    const c = new Chess('2b1k3/8/8/8/8/8/8/1R2K3 w - - 0 1');
    const before = c.fen();
    c.move('Rb8');
    const out = buildReviewMoveBriefing({
      phrases: null, prev: NO_PREV_CAPTURE, register: 'teach', moverIsStudent: true,
      fenBefore: c.fen(), san: 'Kd7', line: null, theirLast: { fenBefore: before, san: 'Rb8' },
    }) ?? '';
    expect((out.match(/c8/g) ?? []).length).toBeLessThanOrEqual(1);
  });
  it('without a line or a last move nothing extra is said (the shallow briefing stands)', () => {
    expect(say(5, { withFacts: false })).not.toMatch(/aimed at/);
  });
});
