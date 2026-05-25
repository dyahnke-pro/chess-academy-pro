import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { addMistakePuzzleFromCapture } from './mistakePuzzleService';

// Option B (David 2026-05-25): a coach-caught slip becomes a drillable
// mistakePuzzle. These pin the load-bearing parts — UCI derivation from SAN,
// dedup by position, and the skip-on-illegal-SAN guard.

beforeEach(async () => {
  await db.mistakePuzzles.clear();
});

// After 1.e4 e5 2.Nf3 — Black to move. Played ...Nc6 (fine), best ...Nf6.
const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';

describe('addMistakePuzzleFromCapture', () => {
  it('writes a drillable puzzle with UCI derived from SAN', async () => {
    const p = await addMistakePuzzleFromCapture({
      fen: FEN, playedSan: 'Nc6', bestSan: 'Nf6', cpLoss: 120, gamePhase: 'opening',
    });
    expect(p).not.toBeNull();
    expect(p?.playerMove).toBe('b8c6');
    expect(p?.bestMove).toBe('g8f6');
    expect(p?.playerColor).toBe('black'); // side to move in the fen
    expect(p?.sourceMode).toBe('coach');
    expect(p?.status).toBe('unsolved');
    expect(await db.mistakePuzzles.count()).toBe(1);
  });

  it('dedups by position+move — no duplicate for the same slip', async () => {
    await addMistakePuzzleFromCapture({ fen: FEN, playedSan: 'Nc6', bestSan: 'Nf6' });
    const second = await addMistakePuzzleFromCapture({ fen: FEN, playedSan: 'Nc6', bestSan: 'Nf6' });
    expect(second).toBeNull();
    expect(await db.mistakePuzzles.count()).toBe(1);
  });

  it('returns null (writes nothing) on an illegal SAN for the position', async () => {
    const p = await addMistakePuzzleFromCapture({ fen: FEN, playedSan: 'Qxh7', bestSan: 'Nf6' });
    expect(p).toBeNull();
    expect(await db.mistakePuzzles.count()).toBe(0);
  });

  it('requires fen + playedSan + bestSan', async () => {
    expect(await addMistakePuzzleFromCapture({ fen: FEN, playedSan: '', bestSan: 'Nf6' })).toBeNull();
    expect(await addMistakePuzzleFromCapture({ fen: '', playedSan: 'Nc6', bestSan: 'Nf6' })).toBeNull();
  });
});
