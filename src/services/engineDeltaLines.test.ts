import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeThreatDelta, bestLineDeltaFromPv, detectEnginePunish } from './engineDeltaLines';
import type { PvLine } from './pvPlayback';
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

describe('bestLineDeltaFromPv', () => {
  it('returns null on an empty / missing PV', () => {
    expect(bestLineDeltaFromPv(null)).toBeNull();
    expect(bestLineDeltaFromPv({ plies: [] } as unknown as PvLine)).toBeNull();
  });

  it('draws the engine best move (green) + names the line', () => {
    const pv = {
      plies: [
        { san: 'Nf3', uci: 'g1f3', moverColor: 'white', fenBefore: '', fenAfter: '', facts: {} },
        { san: 'Nc6', uci: 'b8c6', moverColor: 'black', fenBefore: '', fenAfter: '', facts: {} },
        { san: 'Bb5', uci: 'f1b5', moverColor: 'white', fenBefore: '', fenAfter: '', facts: {} },
      ],
    } as unknown as PvLine;
    const d = bestLineDeltaFromPv(pv);
    expect(d).toBeTruthy();
    expect(d!.arrows).toEqual([{ from: 'g1', to: 'f3', color: 'green' }]);
    expect(d!.say).toContain('Nf3');
    expect(d!.say).toContain('Bb5'); // names the short line
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

  it('fires when one move stands out and the student is clearly winning', () => {
    // Ruy tabiya, White to move, pretend the engine loves Nf3 by +250 over the rest.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
    const cue = detectEnginePunish(fen, [line(['f3e5'], 260), line(['e1g1'], 40)], 'w');
    expect(cue).toBeTruthy();
    expect(cue!.arrows[0]).toMatchObject({ from: 'f3', to: 'e5', color: 'green' });
    // Callout WITHHOLDS the move (guided find-the-move).
    expect(cue!.callout).not.toMatch(/Nxe5|f3|e5/);
    // Reveal NAMES the move but claims no material from the eval alone.
    expect(cue!.reveal).toContain('Nxe5');
    expect(cue!.reveal).not.toMatch(/win.* a pawn|wins the exchange|wins a piece/);
    expect(cue!.reveal).toMatch(/winning|clearly better/);
  });

  it('does NOT fire when many moves are roughly equal (no single shot)', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
    // Winning, but best barely beats runner-up → not a "find the one move" moment.
    expect(detectEnginePunish(fen, [line(['e1g1'], 220), line(['f3e5'], 190)], 'w')).toBeNull();
  });

  it('does NOT fire in a level position', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
    expect(detectEnginePunish(fen, [line(['e1g1'], 30), line(['d2d3'], 10)], 'w')).toBeNull();
  });

  it('flips POV for Black (eval is white-POV)', () => {
    // Black to move, white-POV eval −300 = Black winning; single best shot.
    const fen = 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 1';
    const cue = detectEnginePunish(fen, [line(['d5e4'], -300), line(['b8c6'], -60)], 'b');
    expect(cue).toBeTruthy();
    expect(cue!.reveal).toMatch(/winning|clearly better/);
  });
});
