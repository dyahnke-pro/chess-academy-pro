// Unified with Learn (2026-10-17): review credits the student's move that takes
// away the very move the opponent's last quiet move prepared — the same rule
// (`preventsNamedIdea`) and the same sentence Learn speaks.
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import type { CachedEval } from './positionEvalCache';

const calls: Array<{ san: string; seat: string }> = [];
vi.mock('./movePurpose', async (orig) => {
  const real = await orig<typeof import('./movePurpose')>();
  return {
    ...real,
    intentWithFallback: (_fen: string, san: string, _r: unknown, seat: 'student' | 'opponent') => {
      calls.push({ san, seat });
      if (seat === 'opponent' && san === 'Qh5') return { prevents: null, prepares: { uci: 'h5f7', san: 'Qxf7#' }, text: 'Their Qh5 prepares Qxf7#.', squares: ['h5', 'f7'], about: 'opponent' };
      if (seat === 'student' && san === 'g6') return { prevents: { uci: 'h5f7', san: 'Qxf7#', threatCp: 9999 }, prepares: null, text: '…g6 — now Qxf7# doesn\'t work.', squares: ['h5', 'f7'], about: 'student' };
      if (seat === 'student' && san === 'Nf6') return { prevents: { uci: 'h5f7', san: 'Qxf7#', threatCp: 9999 }, prepares: null, text: '…Nf6 — now Qxf7# doesn\'t work.', squares: ['h5', 'f7'], about: 'student' };
      return null;
    },
  };
});

const game = (sans: string[]) => { const c = new Chess(); return sans.map((san, i) => { const m = c.move(san); return { ply: i + 1, san: m.san, fenAfter: c.fen() }; }); };
const read: CachedEval = { evaluation: 0, depth: 18, bestMove: 'e2e4', pv: ['e2e4'] };
const reads = new Map<number, CachedEval>(Array.from({ length: 8 }, (_, i) => [i, read] as [number, CachedEval]));

describe('review closes the prevention loop like Learn', () => {
  it('…g6 right after Qh5 is credited as stopping the idea behind their last move', async () => {
    const { intentsFromReads } = await import('./reviewMoveIntent');
    const out = intentsFromReads(game(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'g6']), 'black', reads);
    expect(out.get(6)?.text).toBe('…g6 — now Qxf7# doesn\'t work. That was the idea behind their last move.');
    expect(calls.some((c) => c.seat === 'opponent' && c.san === 'Qh5')).toBe(true);
  });
  it('a stop that does not answer their LAST move is not tied back to it', async () => {
    const { intentsFromReads } = await import('./reviewMoveIntent');
    // Their last move is Nf3, which prepared nothing; the stop speaks alone.
    const out = intentsFromReads(game(['e4', 'e5', 'Qh5', 'Nc6', 'Nf3', 'Nf6']), 'black', reads);
    expect(out.get(6)?.text).toBe('…Nf6 — now Qxf7# doesn\'t work.');
  });
});
