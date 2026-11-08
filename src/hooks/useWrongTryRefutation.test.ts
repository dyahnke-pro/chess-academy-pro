import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWrongTryRefutation } from './useWrongTryRefutation';
import { refutationArrows } from '../services/puzzleTeaching';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';

describe('useWrongTryRefutation', () => {
  it('a wrong try gets its refutation text, and its reply arrow for the board to pace', async () => {
    const { result } = renderHook(() => useWrongTryRefutation(async () => ['h5f7']));
    let r: Awaited<ReturnType<typeof result.current.refute>> = null;
    await act(async () => { r = await result.current.refute(FEN, 'Nf6'); });
    expect(result.current.text).toBe('Nf6? Then they play Qxf7# — they mate you.');
    expect(r ? refutationArrows(r).map((a) => `${a.startSquare}${a.endSquare}`) : []).toEqual(['h5f7']);
    act(() => result.current.clear());
    expect(result.current.text).toBeNull();
  });
  it('a newer try or a clear wins over a slow older read', async () => {
    let release!: (v: string[]) => void;
    const slow = new Promise<string[]>((r) => { release = r; });
    const { result } = renderHook(() => useWrongTryRefutation(() => slow));
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.refute(FEN, 'Nf6'); });
    act(() => result.current.clear());
    await act(async () => { release(['h5f7']); await pending; });
    expect(result.current.text).toBeNull();
  });
});
