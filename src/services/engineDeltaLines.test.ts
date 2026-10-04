import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeThreatDelta, detectEnginePunish, computeRouteDelta } from './engineDeltaLines';
import type { AnalysisLine } from '../types';

/** Position where the side that just moved creates a concrete threat. */
function afterMoves(sans: string[]): { before: string; after: string } {
  const c = new Chess();
  for (let i = 0; i < sans.length - 1; i++) c.move(sans[i]);
  const before = c.fen();
  c.move(sans[sans.length - 1]);
  return { before, after: c.fen() };
}

describe('computeThreatDelta', () => {
  it('returns null when the move creates no concrete threat', () => {
    const { before, after } = afterMoves(['e4', 'e5']); // quiet
    expect(computeThreatDelta(before, after, 'b')).toBeNull();
  });

  it('draws + voices a threat as an arrow on the static board when one exists', () => {
    // Scholar's-mate setup: after 1.e4 e5 2.Bc4 Nc6 3.Qh5, White threatens Qxf7#.
    const { before, after } = afterMoves(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']);
    const d = computeThreatDelta(before, after, 'w');
    expect(d).toBeTruthy();
    expect(d!.arrows).toHaveLength(1);
    // arrow origin is a real occupied square on the static (post-move) board
    expect(new Chess(after).get(d!.arrows[0].from as never)).toBeTruthy();
    expect(d!.say).toMatch(/threatening/);
    expect(d!.say.startsWith('And now White')).toBe(true);
  });

  it('never throws on a malformed FEN', () => {
    expect(computeThreatDelta('bad', 'fen', 'w')).toBeNull();
  });
});

describe('detectEnginePunish', () => {
  // A real position where White (to move) has a clearly-best winning shot.
  // 4k3/8/8/8/8/8/4Q3/4K3 w — White queen + king vs bare king; Qe7# is mate.
  const line = (moves: string[], evaluation: number, mate: number | null = null): AnalysisLine => ({
    rank: 1,
    evaluation,
    moves,
    mate,
  });

  // Position after 1.e4 e5 — White to move. The PV Qh5, Nc6, Qxe5+ is a forcing
  // sequence that wins the e5 pawn with check (a real combination).
  const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';

  it('does NOT call 2.Qh5 Nc6 3.Qxe5+ a win — …Nxe5 takes the queen (settled count)', () => {
    expect(detectEnginePunish(AFTER_E4_E5, [line(['d1h5', 'b8c6', 'h5e5'], 170), line(['g1f3'], 40)], 'w')).toBeNull();
  });

  it('fires on a forcing SEQUENCE that wins material (3-4 moves), and names the line', () => {
    // 1.e4 e5 2.Qh5 Nf6?? — Qxe5+ wins the pawn for real: nothing guards e5.
    // (The old fixture, 2.Qh5 Nc6 3.Qxe5+, dropped the queen to …Nxe5 — the
    // raw count called it a win; the settled count does not. WO-MATERIAL-01.)
    const AFTER_QH5_NF6 = 'rnbqkb1r/pppp1ppp/5n2/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3';
    const cue = detectEnginePunish(AFTER_QH5_NF6, [line(['h5e5', 'd8e7', 'e5e7', 'f8e7'], 170), line(['g1f3'], 40)], 'w');
    expect(cue).toBeTruthy();
    expect(cue!.arrows[0]).toMatchObject({ from: 'h5', to: 'e5', color: 'green' });
    // Callout WITHHOLDS every move (guided find-the-move).
    expect(cue!.callout).not.toMatch(/Qh5|Qxe5|h5|e5/);
    // Reveal names the SEQUENCE (the capturing move is in it).
    expect(cue!.reveal).toMatch(/sequence/i);
    expect(cue!.reveal).toContain('Qxe5');
  });

  it('does NOT fire on a QUIET winning edge (no forcing move, no material won)', () => {
    // Nf3, Nc6, Bc4 — clearly better by eval, but nothing forcing, nothing won.
    expect(detectEnginePunish(AFTER_E4_E5, [line(['g1f3', 'b8c6', 'f1c4'], 220), line(['b1c3'], 40)], 'w')).toBeNull();
  });

  it('does NOT fire when the alternatives are roughly equal (no specific find)', () => {
    expect(detectEnginePunish(AFTER_E4_E5, [line(['d1h5', 'b8c6', 'h5e5'], 190), line(['g1f3'], 150)], 'w')).toBeNull();
  });

  it('does NOT fire in a level position', () => {
    expect(detectEnginePunish(AFTER_E4_E5, [line(['g1f3'], 30), line(['b1c3'], 10)], 'w')).toBeNull();
  });

  it('flips POV for Black and fires on a black capture-sequence winning material', () => {
    // Black to move; black wins White's hanging queen with Qxc3+ (capture+check).
    const fen = '4k3/8/8/8/8/2Q5/3q4/4K3 b - - 0 1';
    const cue = detectEnginePunish(fen, [line(['d2c3'], -800), line(['e8d8'], -80)], 'b');
    expect(cue).toBeTruthy();
    expect(cue!.reveal).toContain('Qxc3');
  });
});

describe('computeRouteDelta (Watch quiet-move plan look-ahead, P1)', () => {
  it('teaches a developing knight\'s route to a supported outpost', () => {
    // White knight on b1, e4 pawn, d5 a supported hole. Nc3 develops with a
    // route c3 → d5. The quiet move should now speak its forward plan.
    const fenBefore = '4k3/p4p2/8/8/4P3/8/8/1N2K3 w - - 0 1';
    const aside = computeRouteDelta(fenBefore, 'Nc3');
    expect(aside).not.toBeNull();
    expect(aside?.say).toMatch(/outpost/i);
    expect(aside?.say).toMatch(/d5/);
    expect(aside?.say).toMatch(/routing/i);
    expect(aside?.arrows[0]).toMatchObject({ from: 'c3', to: 'd5', color: 'green' });
  });

  it('returns null for a non-knight move (no route plan to teach)', () => {
    const fenBefore = '4k3/p4p2/8/8/4P3/8/8/1N2K3 w - - 0 1';
    expect(computeRouteDelta(fenBefore, 'Ke2')).toBeNull();
  });

  it('returns null for an illegal move', () => {
    const fenBefore = '4k3/p4p2/8/8/4P3/8/8/1N2K3 w - - 0 1';
    expect(computeRouteDelta(fenBefore, 'Qh8')).toBeNull();
  });
});
