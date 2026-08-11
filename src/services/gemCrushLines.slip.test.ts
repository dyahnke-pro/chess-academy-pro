// The coach walks into a curated trap on purpose, so the student has a real
// punish to find. Everything here is about that being SAFE: the move is
// curated, and it is re-verified against the actual board before anyone plays
// it. A slip that isn't legal, or whose punishment isn't there, is worse than
// no lesson — it promises something the board cannot pay.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { teachableSlipAt } from './gemCrushLines';
import { getAllPunishGems } from '../data/lessons/punishGems';

describe('teachableSlipAt', () => {
  it('offers nothing from a position no gem knows', () => {
    expect(teachableSlipAt('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toBeNull();
  });

  it('survives a malformed FEN without throwing', () => {
    expect(teachableSlipAt('not a fen')).toBeNull();
  });

  it('every slip it offers is legal, and its punishment really follows', () => {
    // The sweep that matters. Walk every surfaceable gem to its spine
    // terminus, ask for a slip there, and prove the board can actually pay
    // what the offer promises.
    let offered = 0;
    for (const gem of getAllPunishGems()) {
      if (gem.tier !== 'confirmed' && gem.tier !== 'positional') continue;
      const board = new Chess();
      let ok = true;
      for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) {
        try { if (!board.move(san)) { ok = false; break; } } catch { ok = false; break; }
      }
      if (!ok) continue;
      const slip = teachableSlipAt(board.fen());
      if (!slip) continue;
      offered += 1;
      // Legal from this exact board...
      const probe = new Chess(board.fen());
      expect(probe.move(slip.san), `${slip.san} illegal at ${board.fen()}`).toBeTruthy();
      // ...and the punishment is available the instant it lands.
      expect(probe.moves(), `punish ${slip.punishSan} unavailable`).toContain(slip.punishSan);
    }
    // A sweep that offered nothing would pass every assertion above while
    // proving the feature dead — the exact shape of the lane this replaces.
    expect(offered, 'no gem position offered a slip at all').toBeGreaterThan(20);
  });
});
