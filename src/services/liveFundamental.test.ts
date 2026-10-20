// THE ONE LIVE ATTRIBUTOR (C4) — the computer Learn speaks from AND the one
// `positionFacts` hands to need, held here on the review's own Alapin fixture.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { attributeLiveFundamental, uciToSanAt, LEARN_FUNDAMENTAL_CP_FLOOR, type LiveFundamentalReads } from './liveFundamental';
import { withPrice, type WithLegacyCost } from '../test/oneSearchScores';

const ALAPIN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6 8. exd6 Qxd6';
const SANS = (() => { const c = new Chess(); c.loadPgn(ALAPIN); return c.history(); })();
const fenBefore = (ply: number): string => { const c = new Chess(); for (const s of SANS.slice(0, ply - 1)) c.move(s); return c.fen(); };

/** Ply 12 = 6...Nb6, Black's flagged move (best 6...e6): −30 → +90 White POV. */
const NB6: WithLegacyCost<LiveFundamentalReads> = { replySan: null,
  fenBefore: fenBefore(12), historySans: SANS.slice(0, 12), playedSan: 'Nb6', bestSan: 'e6',
  studentColor: 'black', costCp: null, evalBeforeWhiteCp: -30, evalAfterWhiteCp: 90,
};

describe('attributeLiveFundamental', () => {
  it('names the fundamental on a real slip — the review fixture\'s own trio', () => {
    const ids = attributeLiveFundamental(withPrice(NB6)).map((a) => a.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(['same-piece-twice', 'tempo-handed', 'space-conceded']).toContain(ids[0]);
  });

  it('NEGATIVE CONTROLS: no best move / under the floor / empty history → nothing', () => {
    expect(attributeLiveFundamental(withPrice({ ...NB6, bestSan: null }))).toEqual([]);
    expect(attributeLiveFundamental(withPrice({ ...NB6, evalAfterWhiteCp: -30 + (LEARN_FUNDAMENTAL_CP_FLOOR - 10) }))).toEqual([]);
    expect(attributeLiveFundamental(withPrice({ ...NB6, historySans: [] }))).toEqual([]);
  });

  it('the one-search cost decides the flag, not two separate reads (walk oct3c)', () => {
    // The two evals say 120cp; the one search says 20 — no flag.
    expect(attributeLiveFundamental(withPrice({ ...NB6, costCp: 20 }))).toEqual([]);
    // The two evals say nothing; the one search says it cost a pawn and more.
    expect(attributeLiveFundamental(withPrice({ ...NB6, evalAfterWhiteCp: -30, costCp: 150 })).length).toBeGreaterThan(0);
  });

  it('an UNPRICED move flags nothing — there is no fallback to a read before minus a read after (#2 root cause 4)', () => {
    // The old fallback read the pair (-30 → +90, Black to move = 120cp) and flagged it.
    const { price: _p, ...rest } = withPrice(NB6);
    expect(attributeLiveFundamental({ ...rest, price: null })).toEqual([]);
  });

  it('a mate sentinel is never subtracted; a mate swing still flags', () => {
    expect(attributeLiveFundamental(withPrice({ ...NB6, evalAfterWhiteCp: 100000 }))).toEqual([]);
    const out = attributeLiveFundamental(withPrice({ ...NB6, evalBeforeWhiteCp: undefined, evalAfterWhiteCp: undefined, allowedMate: 3 }));
    expect(Array.isArray(out)).toBe(true);
  });

  it('uciToSanAt: the one UCI→SAN converter the live lane uses', () => {
    expect(uciToSanAt(NB6.fenBefore, 'e7e6')).toBe('e6');
    expect(uciToSanAt(NB6.fenBefore, 'e2e4')).toBeNull(); // illegal here
    expect(uciToSanAt(NB6.fenBefore, null)).toBeNull();
  });
});
