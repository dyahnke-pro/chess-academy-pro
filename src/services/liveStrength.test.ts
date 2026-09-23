// WO-LAYERS-01 step 8 — strength matched in real time, off the heat map's own evidence.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { startLiveStrength, updateLiveStrength, STEP_UP, STEP_DOWN, LIVE_MIN } from './liveStrength';
import { capabilitiesPosed, PROVEN_MIN_IMPORTANCE } from './capabilityEvidence';

// A board that POSES a real question: find one by scanning a few positions.
const posedBoard = (() => {
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
