/**
 * local_opening_book tool tests (post-tightening).
 *
 * The tool wraps `getOpeningMoves` + `getNextOpeningBookMove` so the
 * brain can consult the bundled book in a single zero-latency call.
 * The cases below pin the behaviour the move-selector now depends on
 * after the deterministic hybrid was removed from CoachGamePage:
 *
 *   - aiColor must be "white" or "black".
 *   - Empty / whitespace move history is treated as the starting
 *     position.
 *   - When no opening name is passed and memory has none, returns
 *     `nextMoveSan: null` with `source: 'none'` (the brain should
 *     fall back to stockfish_eval).
 *   - When the explicit name matches the book, returns the next
 *     book move at the current ply for the AI side.
 *   - When the name is not in the book, returns `nextMoveSan: null`
 *     with a reason.
 *   - When the game has deviated from the line, returns null.
 *   - When it is not the AI's turn in the line, returns null.
 *   - Memory fallback fires when no explicit name is given.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { localOpeningBookTool } from '../tools/cerebellum/localOpeningBook';
import {
  useCoachMemoryStore,
  __resetCoachMemoryStoreForTests,
} from '../../stores/coachMemoryStore';

describe('local_opening_book tool', () => {
  beforeEach(() => {
    __resetCoachMemoryStoreForTests();
  });

  it('rejects an aiColor that is not "white" or "black"', async () => {
    const result = await localOpeningBookTool.execute({
      moveHistory: '',
      aiColor: 'red',
      openingName: 'Caro-Kann Defense',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/aiColor/);
  });

  it('returns null when no opening name is provided and memory is empty', async () => {
    const result = await localOpeningBookTool.execute({
      moveHistory: '',
      aiColor: 'black',
    });
    expect(result.ok).toBe(true);
    const data = result.result as {
      nextMoveSan: string | null;
      source: string;
      openingName: string | null;
    };
    expect(data.nextMoveSan).toBeNull();
    expect(data.source).toBe('none');
    expect(data.openingName).toBeNull();
  });

  it('returns null with reason when the opening name is not in the book', async () => {
    const result = await localOpeningBookTool.execute({
      moveHistory: '',
      aiColor: 'black',
      openingName: 'Totally Made-Up Opening',
    });
    expect(result.ok).toBe(true);
    const data = result.result as {
      nextMoveSan: string | null;
      reason?: string;
    };
    expect(data.nextMoveSan).toBeNull();
    expect(data.reason).toMatch(/not found/i);
  });

  it('returns the first Caro-Kann move (c6) for Black at ply 1', async () => {
    const result = await localOpeningBookTool.execute({
      moveHistory: 'e4',
      aiColor: 'black',
      openingName: 'Caro-Kann Defense',
    });
    expect(result.ok).toBe(true);
    const data = result.result as {
      nextMoveSan: string;
      currentPly: number;
      lineLength: number;
      source: string;
    };
    expect(data.nextMoveSan).toBe('c6');
    expect(data.currentPly).toBe(1);
    expect(data.lineLength).toBeGreaterThan(1);
    expect(data.source).toBe('arg');
  });

  it('falls back to memory.intendedOpening when openingName is omitted', async () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    const result = await localOpeningBookTool.execute({
      moveHistory: 'e4',
      aiColor: 'black',
    });
    expect(result.ok).toBe(true);
    const data = result.result as {
      nextMoveSan: string;
      source: string;
      openingName: string;
    };
    expect(data.nextMoveSan).toBe('c6');
    expect(data.source).toBe('memory');
    expect(data.openingName).toBe('Caro-Kann Defense');
  });

  it('returns null when the game has deviated from the requested line', async () => {
    const result = await localOpeningBookTool.execute({
      // Caro-Kann's line begins "e4 c6"; "e4 a6" is off-book on move 1.
      moveHistory: 'e4 a6',
      aiColor: 'white',
      openingName: 'Caro-Kann Defense',
    });
    expect(result.ok).toBe(true);
    const data = result.result as { nextMoveSan: string | null };
    expect(data.nextMoveSan).toBeNull();
  });

  it('returns null when it is not the AI side’s turn in the line', async () => {
    // Position after 1.e4 — White just moved, Black is on move in the
    // game. If the AI is WHITE, it's not the AI's book turn here.
    const result = await localOpeningBookTool.execute({
      moveHistory: 'e4',
      aiColor: 'white',
      openingName: 'Caro-Kann Defense',
    });
    expect(result.ok).toBe(true);
    const data = result.result as { nextMoveSan: string | null };
    expect(data.nextMoveSan).toBeNull();
  });

  it('treats empty move history as the starting position (ply 0)', async () => {
    // Caro-Kann is a Black system; at ply 0 White is on move, so the
    // AI=White case should return e4 (the first book move).
    const result = await localOpeningBookTool.execute({
      moveHistory: '',
      aiColor: 'white',
      openingName: 'Caro-Kann Defense',
    });
    expect(result.ok).toBe(true);
    const data = result.result as {
      nextMoveSan: string | null;
      currentPly: number;
    };
    expect(data.currentPly).toBe(0);
    expect(data.nextMoveSan).toBe('e4');
  });
});
