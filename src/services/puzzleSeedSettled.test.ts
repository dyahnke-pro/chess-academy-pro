import { describe, expect, it } from 'vitest';
import { puzzleSeedSettled } from './puzzleService';

describe('puzzleSeedSettled — waits on a seed in flight, never starts one', () => {
  it('resolves at once when no seed is running', async () => {
    let done = false;
    void puzzleSeedSettled().then(() => { done = true; });
    await Promise.resolve(); await Promise.resolve();
    expect(done).toBe(true);
  });
});
