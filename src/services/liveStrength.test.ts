// WO-LAYERS-01 step 8 — strength matched in real time, off the heat map's own evidence.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { startLiveStrength, updateLiveStrength, STEP_UP, STEP_DOWN, LIVE_MIN } from './liveStrength';
import { capabilitiesPosed, PROVEN_MIN_IMPORTANCE } from './capabilityEvidence';

// A board that POSES a real question: find one by scanning a few positions.
const posedBoard = ((): { fen: string; san: string; color: 'white' | 'black' } | null => {
  const lines = [
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4'],
    ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6'],
    ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5'],
    ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
  ];
  for (const l of lines) {
    const c = new Chess(); for (const m of l) c.move(m);
    for (const mv of c.moves()) {
      const posed = capabilitiesPosed(c.fen(), mv, c.turn() === 'w' ? 'white' : 'black');
      if (posed.some((p) => p.posedImportance >= PROVEN_MIN_IMPORTANCE)) return { fen: c.fen(), san: mv, color: (c.turn() === 'w' ? 'white' : 'black') };
    }
  }
  return null;
})();

describe('liveStrength', () => {
  it('a new player starts at the lowest setting, never below it', () => {
    expect(startLiveStrength(100).rating).toBe(LIVE_MIN);
  });

  it('a quiet book move moves nothing — book played correctly tells little', () => {
    const s = startLiveStrength(400);
    expect(updateLiveStrength(s, { fenBefore: new Chess().fen(), san: 'e4', moverColor: 'white', cpLoss: 0 })).toEqual(s);
  });

  it('answering a question the board posed raises it; failing lowers it; up is faster than down', () => {
    expect(posedBoard).not.toBeNull();
    const b = posedBoard!;
    const s = startLiveStrength(800);
    const up = updateLiveStrength(s, { fenBefore: b.fen, san: b.san, moverColor: b.color, cpLoss: 0 });
    const down = updateLiveStrength(s, { fenBefore: b.fen, san: b.san, moverColor: b.color, cpLoss: 400 });
    expect(up.rating).toBe(800 + STEP_UP);
    expect(down.rating).toBe(800 - STEP_DOWN);
    expect(STEP_UP).toBeGreaterThan(STEP_DOWN);
  });

  it('an ungraded move (no engine read) is not evidence', () => {
    const s = startLiveStrength(800);
    const b = posedBoard!;
    expect(updateLiveStrength(s, { fenBefore: b.fen, san: b.san, moverColor: b.color, cpLoss: null })).toEqual(s);
  });
});

describe('gem hits place the player (the strongest early signal)', () => {
  it('walking into a gem steps down; punishing one steps up; missing it steps down', async () => {
    const { Chess } = await import('chess.js');
    const { getAllPunishGems, isSurfaceableGem } = await import('../data/lessons/punishGems');
    const { gemMoveSignal, warmGemIndexes } = await import('./gemCrushLines');
    const { vi } = await import('vitest');
    const gem = getAllPunishGems().find(isSurfaceableGem);
    expect(gem, 'no surfaceable gem in the data').toBeTruthy();
    if (!gem) return;
    const c = new Chess();
    for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) c.move(san);
    const beforeSlip = c.fen();
    // Cold: the index is never built on the move path — no signal yet.
    expect(gemMoveSignal(beforeSlip, gem.inaccuracy)).toBeNull();
    warmGemIndexes();
    await vi.waitFor(() => expect(gemMoveSignal(beforeSlip, gem.inaccuracy)).toBe('walked-into'), { timeout: 20000, interval: 50 });
    c.move(gem.inaccuracy);
    const afterSlip = c.fen();
    expect(gemMoveSignal(afterSlip, gem.punishSeq[0] ?? gem.punish)).toBe('punished');
    const other = c.moves().find((m) => m.replace(/[+#]/g, '') !== (gem.punishSeq[0] ?? gem.punish).replace(/[+#]/g, ''));
    if (other) expect(gemMoveSignal(afterSlip, other)).toBe('missed-punish');
    expect(gemMoveSignal(new Chess().fen(), 'a3')).toBeNull();

    const s = startLiveStrength(1000);
    expect(updateLiveStrength(s, { fenBefore: beforeSlip, san: gem.inaccuracy, moverColor: 'white', cpLoss: null, gem: 'walked-into' }).rating).toBe(1000 - STEP_DOWN);
    expect(updateLiveStrength(s, { fenBefore: afterSlip, san: 'x', moverColor: 'white', cpLoss: null, gem: 'punished' }).rating).toBe(1000 + STEP_UP);
  }, 30000);
});
