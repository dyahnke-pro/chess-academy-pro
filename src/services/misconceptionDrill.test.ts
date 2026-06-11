import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logMisconception } from './misconceptionService';
import { getMisconceptionDrillPuzzles, buildMistakePuzzleFromCapture } from './mistakePuzzleService';

// The Thinking-Errors row → puzzle queue (David 2026-06-11): each misconception
// tag's stored positions become MistakePuzzles in the SAME shape My Mistakes /
// My Weaknesses use, so the shared MistakePuzzleBoard renders them identically.

// White Qh5xe5+ hangs the queen to the c6 knight; a sane "best" is Nf3.
const HANG = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/8/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1';

beforeEach(async () => {
  await db.misconceptionTags.clear();
  await db.mistakePuzzles.clear();
});

describe('buildMistakePuzzleFromCapture (pure)', () => {
  it('builds a solvable puzzle from fen + playedSan + bestSan, no persistence', () => {
    const p = buildMistakePuzzleFromCapture({ fen: HANG, playedSan: 'Qxe5+', bestSan: 'Nf3' });
    expect(p).not.toBeNull();
    expect(p!.fen).toBe(HANG);
    expect(p!.playerMoveSan).toBe('Qxe5+');
    expect(p!.bestMoveSan).toBe('Nf3');
    expect(p!.bestMove).toBe('g1f3'); // UCI derived
  });

  it('returns null on an illegal/ambiguous best move', () => {
    expect(buildMistakePuzzleFromCapture({ fen: HANG, playedSan: 'Qxe5+', bestSan: 'Zz9' })).toBeNull();
  });
});

describe('getMisconceptionDrillPuzzles', () => {
  it('turns a tag’s positions into a puzzle queue', async () => {
    await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: HANG, playedSan: 'Qxe5+', bestSan: 'Nf3' });
    const q = await getMisconceptionDrillPuzzles('hung-material');
    expect(q).toHaveLength(1);
    expect(q[0].fen).toBe(HANG);
    expect(q[0].bestMoveSan).toBe('Nf3');
  });

  it('dedups the same position', async () => {
    await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: HANG, playedSan: 'Qxe5+', bestSan: 'Nf3' });
    await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: HANG, playedSan: 'Qxe5+', bestSan: 'Nf3' });
    const q = await getMisconceptionDrillPuzzles('hung-material');
    expect(q).toHaveLength(1);
  });

  it('skips positions with no recorded best move', async () => {
    await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: HANG, playedSan: 'Qxe5+' });
    expect(await getMisconceptionDrillPuzzles('hung-material')).toHaveLength(0);
  });

  it("scopes the 'other' catch-all to one phase via customLabel", async () => {
    await logMisconception({ tag: 'other', source: 'auto-analysis', fen: HANG, playedSan: 'Qxe5+', bestSan: 'Nf3', customLabel: 'Endgame slip', gamePhase: 'endgame' });
    await logMisconception({ tag: 'other', source: 'auto-analysis', fen: HANG, playedSan: 'Qe2', bestSan: 'Nf3', customLabel: 'Opening slip', gamePhase: 'opening' });

    const endgame = await getMisconceptionDrillPuzzles('other', 'Endgame slip');
    expect(endgame).toHaveLength(1);
    expect(endgame[0].playerMoveSan).toBe('Qxe5+');

    const opening = await getMisconceptionDrillPuzzles('other', 'Opening slip');
    expect(opening).toHaveLength(1);
    expect(opening[0].playerMoveSan).toBe('Qe2');
  });
});
