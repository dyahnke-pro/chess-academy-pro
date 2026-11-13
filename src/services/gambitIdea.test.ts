import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { AnalysisLine } from '../types';
import { gambitIdea } from './gambitIdea';

// Real engine reads (Wikibooks bench, depth 18) after each move, the
// opponent to move. Scores are White's view.
const read = (ls: Array<{ moves: string[]; evaluation: number; mate: number | null }>): AnalysisLine[] => ls.map((l) => ({ ...l, depth: 18 }) as unknown as AnalysisLine);
const GORING = 'r1bqkbnr/pppp1ppp/2n5/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4';
const GORING_AFTER = read([{"moves": ["d4c3", "b1c3", "f8c5", "f1c4", "d7d6", "e1g1", "g8e7", "c3a4"], "evaluation": -39, "mate": null}, {"moves": ["g8f6", "e4e5", "f6d5", "c3d4", "f8b4", "c1d2", "d7d6", "f1b5"], "evaluation": 0, "mate": null}, {"moves": ["d7d5", "e4d5", "d8d5", "c3d4", "c8g4", "f1e2", "f8b4", "b1c3"], "evaluation": 3, "mate": null}]);
const HALLOWEEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';
const HALLOWEEN_AFTER = read([{"moves": ["c6e5", "d2d4", "e5g6", "e4e5", "f6g8", "f1c4", "d7d5", "c4d5"], "evaluation": -144, "mate": null}, {"moves": ["f6e4", "d1h5", "d8f6", "h5f7", "f6f7", "e5f7", "e4f2", "f7h8"], "evaluation": 72, "mate": null}, {"moves": ["f8c5", "e5c6", "d7c6", "h2h3", "c8e6", "d1e2", "d8e7", "d2d3"], "evaluation": 139, "mate": null}]);
const ICELANDIC = 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';
const ICELANDIC_AFTER = read([{"moves": ["d5c6", "b8c6", "g1f3", "e7e5", "f1b5", "f8d6", "b5c6", "b7c6"], "evaluation": 75, "mate": null}, {"moves": ["g1f3", "c6d5", "d2d4", "g8f6", "f1b5", "c8d7", "a2a4", "a7a6"], "evaluation": 15, "mate": null}, {"moves": ["d2d4", "c6d5", "f1d3", "b8c6", "c2c3", "g8f6", "c1f4", "c8g4"], "evaluation": 13, "mate": null}]);

describe('gambitIdea', () => {
  // The Göring's c3 gives up winning the d4-pawn back rather than giving
  // material of its own (…dxc3 Nxc3 leaves the count where it was): not said
  // as a gift — a move that gives nothing on the board is never "offers".
  it('Göring c3: no material given on the board, so no gift is claimed', () => {
    expect(gambitIdea(GORING, 'c3', GORING_AFTER, 'w')).toBeNull();
  });
  it('the Halloween Nxe5 gives a knight for a pawn, and the engine says it does not quite pay', () => {
    const g = gambitIdea(HALLOWEEN, 'Nxe5', HALLOWEEN_AFTER, 'w');
    expect(g?.clause).toMatch(/^gives a knight for a pawn/);
    expect(g?.sound).toBe(false);
    expect(g?.verdict).toBe("The engine says it does not quite pay: they're slightly better.");
  });
  it("the Icelandic's …c6 likewise gives up winning the pawn back (…dxc6 Nxc6 leaves the count), so no gift", () => {
    expect(gambitIdea(ICELANDIC, 'c6', ICELANDIC_AFTER, 'b')).toBeNull();
  });
  // Wikibooks bench positions read by hand (2026-11-13), real engine reads.
  // Not gambits: the piece taken was already hanging (Kh1 — an escape from
  // check, O-O, …Nd6), an even trade (Bxc6), a free pawn not taken (…Bf5), a
  // bishop for a knight (…g5). Gambits: Bd3 leaves d4, g4 (Devin), f4 (Vienna).
  describe('read on the bench', () => {
    const cases = JSON.parse(readFileSync('src/test/fixtures/gambit-cases.json', 'utf8')) as Array<{ id: string; san: string; fen: string; after: Array<{ moves: string[]; evaluation: number; mate: number | null }> }>;
    const at = (id: string) => { const c = cases.find((x) => x.id === id)!; return gambitIdea(c.fen, c.san, read(c.after), c.fen.split(' ')[1] as 'w' | 'b'); };
    it.each(['vc-wb_e4_e5-242', 'vc-wb_e4_c5-44', 'vc-wb_e4_e5-139', 'vc-wb_d4_d5-46', 'vc-wb_d4_d5-106', 'vc-wb_e4_e5-28'])('%s is no gambit', (id) => {
      expect(at(id)).toBeNull();
    });
    it.each(['vc-wb_e4_c6-12', 'vc-wb_d4_Nf6-127', 'vc-wb_e4_e5-215'])('%s offers a pawn', (id) => {
      expect(at(id)?.clause).toMatch(/^offers a pawn/);
    });
  });
});
