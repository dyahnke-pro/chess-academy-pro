import { describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { getAllPunishGems, isSurfaceableGem } from '../data/lessons/punishGems';
import { trapAheadAt, warmGemIndexes } from './gemCrushLines';
import { trapAheadTeaching, trapMoveNoun } from './learnBoardTeaching';

describe('trapAhead — a known trap one move ahead', () => {
  it('names the natural slip and its club share, never the refutation', async () => {
    const gem = getAllPunishGems().filter(isSurfaceableGem).find((g) => g.tier === 'confirmed' || g.tier === 'positional');
    expect(gem).toBeTruthy();
    if (!gem) return;
    const c = new Chess();
    for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) c.move(san);
    warmGemIndexes();
    await vi.waitFor(() => { expect(trapAheadAt(c.fen())).not.toBeNull(); }, { timeout: 20_000 });
    const hint = trapAheadTeaching(c.fen(), c.turn());
    // Never for the other seat.
    expect(trapAheadTeaching(c.fen(), c.turn() === 'w' ? 'b' : 'w')).toBeNull();
    expect(hint?.lane).toBe('trapAhead');
    // The share in WORDS — never a percentage (shareWords.ts, reason not stats).
    expect(hint?.text).toMatch(/looks natural, and club players (almost always|usually|often|sometimes) play it — but it walks into a known trap/);
    expect(hint?.text).not.toMatch(/\d+%/);
    const punish = gem.punishSeq[0] ?? gem.punish;
    expect(hint?.text).not.toContain(punish);
    // The board shows the trap: the natural move, then their punishing reply.
    expect(hint?.arrows[0]?.role).toBe('missed');
    // …then every ply of the punishing line, not just the first.
    expect(hint?.arrows.slice(1).every((a) => a.role === 'line')).toBe(true);
    expect(hint?.arrows.length).toBe(1 + gem.punishSeq.length);
    // With the index warm, a board that holds no gem stays silent.
    expect(trapAheadAt(new Chess().fen())).toBeNull();
  }, 30_000);
});

describe('trapAhead — a capture names both pieces', () => {
  it('a knight trade on d4 says "trading knights", never a bare "the knight taking"', () => {
    // Four Knights Scotch after 5.Nxd4: Black's …Nxd4 is a knight trade. (The
    // gem on this board wins less than a piece, so since F04 it no longer fires
    // a trap warning; the naming is tested where it lives.)
    const c = new Chess();
    for (const san of 'e4 e5 Nc3 Nf6 Nf3 Nc6 d4 exd4 Nxd4'.split(' ')) c.move(san);
    expect(trapMoveNoun('Nxd4', c.fen())).toMatch(/^trading knights on d4/);
  });
});

describe('arrows for what a line names', () => {
  it('each SAN named gets an arrow, student and opponent told apart', async () => {
    const { namedMoveArrows } = await import('./learnBoardTeaching');
    // Black to move after 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 — student Black.
    const fen = 'r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQR1K1 b kq - 5 6';
    const a = namedMoveArrows('b5 first, so that Bb3 can come next.', fen, 'b');
    expect(a).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'b7', to: 'b5', role: 'play' }),
      expect.objectContaining({ from: 'a4', to: 'b3', role: 'theirs' }),
    ]));
  });
});
