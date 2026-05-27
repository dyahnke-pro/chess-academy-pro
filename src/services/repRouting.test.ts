import { describe, expect, it } from 'vitest';
import { resolveRepRoute } from './repRouting';
import { REP_PUZZLE_CAP } from './repCompletion';
import type { RepCandidate } from './trainingPlanSelector';

function rep(o: Partial<RepCandidate>): RepCandidate {
  return { kind: 'weakness', key: 'k', label: 'L', subtitle: 's', ...o };
}

describe('resolveRepRoute — every sensor lands on a real drill', () => {
  it('opening weak spots → the opening drill', () => {
    expect(resolveRepRoute(rep({ tag: 'analysis:weakspot:ruy-lopez' })).path).toBe('/openings/ruy-lopez');
  });

  it('board vision → Find-the-Square', () => {
    expect(resolveRepRoute(rep({ tag: 'analysis:boardvision' })).path).toBe('/tactics/find-square');
  });

  it('time trouble → timed play', () => {
    expect(resolveRepRoute(rep({ tag: 'analysis:timetrouble' })).path).toBe('/coach/play?time=blitz-5-0');
  });

  it('conversion → play out the blown FEN with conv=1', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    const r = resolveRepRoute(rep({ tag: 'analysis:conversion', fen }));
    expect(r.path).toBe(`/coach/play?fen=${encodeURIComponent(fen)}&conv=1`);
  });

  it('conversion WITHOUT a fen falls back (never a broken drill)', () => {
    // no fen → not the play route; lands on the weaknesses overview
    expect(resolveRepRoute(rep({ tag: 'analysis:conversion' })).path).toBe('/weaknesses');
  });

  it('a themed tactical weakness → the capped adaptive drill', () => {
    const r = resolveRepRoute(rep({ tag: 'analysis:tactic:fork', puzzleThemes: ['fork'] }));
    expect(r.path).toBe('/tactics/adaptive');
    expect(r.state).toMatchObject({ forcedWeakThemes: ['fork'], repCap: REP_PUZZLE_CAP, repKey: 'k' });
    // analysis:* clusters carry no misconception tag
    expect(r.state?.misconceptionTag).toBeUndefined();
  });

  it('a coach misconception with themes passes its tag through', () => {
    const r = resolveRepRoute(rep({ tag: 'hung-material', puzzleThemes: ['hangingPiece'] }));
    expect(r.state?.misconceptionTag).toBe('hung-material');
  });

  it('a themeless weakness → the Weaknesses overview (no empty drill)', () => {
    expect(resolveRepRoute(rep({ tag: 'analysis:phase:middlegame', puzzleThemes: [] })).path).toBe('/weaknesses');
  });

  it('a non-weakness rep → its opening', () => {
    expect(resolveRepRoute(rep({ kind: 'srs', openingId: 'caro-kann' })).path).toBe('/openings/caro-kann');
  });
});
