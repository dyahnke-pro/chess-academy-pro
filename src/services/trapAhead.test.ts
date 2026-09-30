import { describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { getAllPunishGems, isSurfaceableGem } from '../data/lessons/punishGems';
import { trapAheadAt, warmGemIndexes } from './gemCrushLines';
import { trapAheadTeaching } from './learnBoardTeaching';

describe('trapAhead — a known trap one move ahead', () => {
  it('names the natural slip and its club share, never the refutation', async () => {
    const gem = getAllPunishGems().filter(isSurfaceableGem).find((g) => g.tier === 'confirmed' || g.tier === 'positional');
    expect(gem).toBeTruthy();
    if (!gem) return;
    const c = new Chess();
    for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) c.move(san);
    warmGemIndexes();
    await vi.waitFor(() => { expect(trapAheadAt(c.fen())).not.toBeNull(); }, { timeout: 20_000 });
    const hint = trapAheadTeaching(c.fen());
    expect(hint?.lane).toBe('trapAhead');
    expect(hint?.text).toMatch(/looks natural, and \d+% of club players play it — but it walks into a known trap/);
    const punish = gem.punishSeq[0] ?? gem.punish;
    expect(hint?.text).not.toContain(punish);
    // With the index warm, a board that holds no gem stays silent.
    expect(trapAheadAt(new Chess().fen())).toBeNull();
  }, 30_000);
});
