import { describe, expect, it } from 'vitest';
import { classifyMisconception } from './misconceptionClassifier';

// chesscom-1040709576 (2026-10-13): hung-material was recorded on slips where
// nothing was lost. With the engine's reply in hand, a piece counts only if
// the reply takes it.
describe('hung material means the reply takes it', () => {
  const base = { fen: '4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', playedSan: 'Nd4', gamePhase: 'middlegame' as const };
  it('the reply takes the knight → hung-material', async () => {
    const r = await classifyMisconception({ ...base, pvAfterPlayed: ['exd4'] });
    expect(r?.tag).toBe('hung-material');
  });
  it('the reply does something else → not hung-material', async () => {
    const r = await classifyMisconception({ ...base, pvAfterPlayed: ['Kd7'] });
    expect(r?.tag).not.toBe('hung-material');
  });
  it('NEGATIVE CONTROL: no engine reply keeps the board-only read', async () => {
    const r = await classifyMisconception(base);
    expect(r?.tag).toBe('hung-material');
  });
});
