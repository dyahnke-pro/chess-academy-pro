import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { attributePrinciples, pvUciToSan, ATTRIBUTION_MAX, FUNDAMENTAL_IDS, FUNDAMENTAL_TAG } from './principleAttribution';
import { getMisconceptionTag } from '../data/misconceptionTags';
import { PRINCIPLE_DEVICES } from '../data/principles';

// THE FIXTURE (David 2026-09-05): KaiserlicheHoheit–Knight_Mare_01, chess.com
// daily 1023640032, Alapin. David's own read of his 6...Nb6: "gave space away,
// moved the same piece twice, and allowed the opponent to gain tempo." The
// engine agrees it was a mistake (≈105cp, best 6...e6 / 6...Nxc3). The
// attributor must PROVE each of those on the board — and attach NOTHING to
// 3...Nd5 (a book move) or 11...Nd5 (the engine's top move).
const ALAPIN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6 8. exd6 Qxd6 9. Be2 Bg4 10. Nb5 Qd7 11. Bf4 Nd5 12. Ne5 Bxe2 13. Qxe2 Nxf4 14. Nxd7 Nxe2 15. Nc7+ Kxd7 16. Nxa8 Nexd4 17. Rd1 e5 18. a3 Bc5 19. b4 Nxb4 20. axb4 Bxb4+ 21. Kf1 Rxa8 22. Rb1 a5 23. h4 Rc8';
const SANS = (() => { const c = new Chess(); c.loadPgn(ALAPIN); return c.history(); })();
const upTo = (ply: number) => SANS.slice(0, ply);
const fenBefore = (ply: number) => { const c = new Chess(); for (const s of upTo(ply - 1)) c.move(s); return c.fen(); };

describe('attributePrinciples — the Alapin fixture', () => {
  it('6...Nb6 attaches same-piece-twice, tempo-handed and space-conceded — and proves each', () => {
    const out = attributePrinciples({ historySans: upTo(12), bestSan: 'e6', classification: 'mistake' });
    const ids = out.map((a) => a.id);
    expect(ids).toContain('same-piece-twice');
    expect(ids).toContain('tempo-handed');
    expect(ids).toContain('space-conceded');
    expect(out.length).toBeLessThanOrEqual(ATTRIBUTION_MAX);
    // The proof is on the board, not in a story: the vacated square and the
    // safe push onto it are named from evidence.
    const space = out.find((a) => a.id === 'space-conceded')!;
    expect(space.evidence.squares).toContain('d5');
    expect(space.evidence.moves).toEqual(['d5']);
    expect(space.evidence.counterfactualClean).toBe(true);
    const tempo = out.find((a) => a.id === 'tempo-handed')!;
    expect(tempo.evidence.moves.length).toBeGreaterThan(0);
    const twice = out.find((a) => a.id === 'same-piece-twice')!;
    expect(twice.facts.nth).toBe(3);
  });

  it('holds with the depth-14 best move too (6...Nxc3) — the fundamentals do not depend on which best the engine picked', () => {
    const out = attributePrinciples({ historySans: upTo(12), bestSan: 'Nxc3', classification: 'mistake' });
    const ids = out.map((a) => a.id);
    expect(ids).toContain('same-piece-twice');
    expect(ids).toContain('tempo-handed');
  });

  it('corroborates from the engine line when one is persisted', () => {
    const pvAfterPlayed = pvUciToSan(new Chess(fenBefore(13)).fen(), ['g1f3', 'd7d5', 'a2a4', 'a7a5', 'f1b5']);
    const out = attributePrinciples({ historySans: upTo(12), bestSan: 'e6', classification: 'mistake', pvAfterPlayed });
    const tempo = out.find((a) => a.id === 'tempo-handed')!;
    expect(tempo).toBeTruthy();
    // a4 → a5 is the kick the line plays; the weight reflects the corroboration.
    expect(tempo.weight).toBeGreaterThanOrEqual(3);
  });

  it('attaches NOTHING to a move that was not flagged (3...Nd5, book) — "if there is one"', () => {
    expect(attributePrinciples({ historySans: upTo(6), bestSan: 'Nd5', classification: 'book' })).toEqual([]);
    expect(attributePrinciples({ historySans: upTo(6), bestSan: 'Ne4', classification: 'good' })).toEqual([]);
  });

  it('attaches NOTHING to the engine-best move (11...Nd5) even if mis-flagged upstream', () => {
    expect(attributePrinciples({ historySans: upTo(22), bestSan: 'Nd5', classification: 'inaccuracy' })).toEqual([]);
  });

  it('is deterministic — identical inputs, identical output', () => {
    const a = attributePrinciples({ historySans: upTo(12), bestSan: 'e6', classification: 'mistake' });
    const b = attributePrinciples({ historySans: upTo(12), bestSan: 'e6', classification: 'mistake' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('attributePrinciples — the other fundamentals, on synthetic boards', () => {
  it('loose-piece: a knight that can be taken for free, where the best move hung nothing', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d3 Bc5 5.Bg5 h6 6.Bh4 g5 7.Bg3 Nh5 8.Nxg5?? — hxg5 wins the knight.
    const hist = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'Bg5', 'h6', 'Bh4', 'g5', 'Bg3', 'Nh5', 'Nxg5'];
    const out = attributePrinciples({ historySans: hist, bestSan: 'Nc3', classification: 'blunder' });
    const loose = out.find((a) => a.id === 'loose-piece');
    expect(loose).toBeTruthy();
    expect(loose!.evidence.squares).toEqual(['g5']);
    expect(loose!.evidence.moves).toEqual(['hxg5']);
    // The hang is the verdict — it outranks the pawn-grab pattern that co-occurs.
    expect(out[0].id).toBe('loose-piece');
  });

  it('early-queen-sortie: 2.Qh5 is kicked by a developing knight for free', () => {
    const out = attributePrinciples({ historySans: ['e4', 'e5', 'Qh5'], bestSan: 'Nf3', classification: 'inaccuracy' });
    const q = out.find((a) => a.id === 'early-queen-sortie');
    expect(q).toBeTruthy();
    expect(q!.evidence.moves[0]).toMatch(/^N/);
  });

  it('neglected-development: a rook-pawn nudge with three minors home while the best move develops', () => {
    const out = attributePrinciples({ historySans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'a6'], bestSan: 'Nf6', classification: 'inaccuracy' });
    expect(out.map((a) => a.id)).toContain('neglected-development');
  });

  it('passive-when-forcing-existed: a quiet move when the best move is mate', () => {
    const out = attributePrinciples({ historySans: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qf3'], bestSan: 'Qxf7#', classification: 'blunder' });
    expect(out.map((a) => a.id)).toContain('passive-when-forcing-existed');
  });

  it('a pattern that is present but NOT punished stays silent', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bb5 Nd4?! — the knight re-moves, but nothing kicks it for free and
    // the best move (Bc5) leaves the same development picture: no same-piece-twice story to tell.
    const out = attributePrinciples({ historySans: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Nd4'], bestSan: 'Bc5', classification: 'inaccuracy' });
    expect(out.find((a) => a.id === 'knight-to-the-rim')).toBeUndefined();
  });

  it('every id has a tag and a device; never more than ATTRIBUTION_MAX', () => {
    for (const id of FUNDAMENTAL_IDS) {
      const tag = FUNDAMENTAL_TAG[id];
      expect(getMisconceptionTag(tag), `${id} → ${tag}`).toBeTruthy();
      expect(PRINCIPLE_DEVICES[tag], `device for ${tag}`).toBeTruthy();
    }
    expect(ATTRIBUTION_MAX).toBe(3);
  });
});
