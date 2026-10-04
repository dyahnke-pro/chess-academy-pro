import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { landedTacticTeaching } from './dnaLineNarrator';

// The per-ply line renderer and its tests are DELETED (2026-10-04, G8.5 — no
// production caller; a played-out line is read by `projectedLineVoice`).
const FORK_FEN = 'r3k3/8/8/1N6/8/8/8/6K1 w - - 0 1';

describe('landedTacticTeaching', () => {
  it('landedTacticTeaching names the landed tactic AND teaches its invariant', () => {
    const t = landedTacticTeaching(FORK_FEN, 'Nc7+');
    expect(t).toBeTruthy();
    expect(t!.type).toBe('fork');
    expect(t!.text).toMatch(/^This lands a fork: a fork hits two targets/);
    expect(t!.text).not.toMatch(/\b(we|our|us)\b/i);
  });

  it('landedTacticTeaching is null on a quiet move and on garbage', () => {
    expect(landedTacticTeaching(new Chess().fen(), 'Nf3')).toBeNull();
    expect(landedTacticTeaching('not a fen', 'Nf3')).toBeNull();
  });
});
