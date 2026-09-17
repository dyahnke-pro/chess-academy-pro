import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { foldStandingRefrains, emptyRefrainLedger, STANDING_REFRAINS } from './standingRefrains';
import { assessPositionalEdge } from './reviewPositionalAssessment';

/** David's Alapin — the game this defect was found in. Verbatim from
 *  `scripts/audit-review-overhaul-prod.mjs`; the student plays Black. */
const ALAPIN = ('e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 Nc6 Nc3 Nb6 Nf3 d6 exd6 Qxd6 '
  + 'Be2 Bg4 Nb5 Qd7 Bf4 Nd5 Ne5 Bxe2 Qxe2 Nxf4 Nxd7 Nxe2 Nc7+ Kxd7 Nxa8 Nexd4 '
  + 'Rd1 e5 a3 Bc5 b4 Nxb4 axb4 Bxb4+ Kf1 Rxa8 Rb1 a5 h4 Rc8').split(' ');

describe('a standing fact teaches once, then refers', () => {
  it('the second mention of the SAME pawn shrinks to a callback', () => {
    const led = emptyRefrainLedger();
    const full = 'You were balanced: their pawn on d4 is isolated — a target you can pile on.';
    expect(foldStandingRefrains(full, led)).toBe(full);
    expect(foldStandingRefrains(full, led))
      .toBe('You were balanced: still their isolated d4-pawn.');
  });

  it('a DIFFERENT pawn keeps the FACT but drops the lecture', () => {
    const led = emptyRefrainLedger();
    foldStandingRefrains('their pawn on d4 is isolated — a target you can pile on', led);
    // That Alapin ran d6 → d4 → d5 → a3 → b4. Each is a real new weakness and
    // must be named — but "a target you can pile on" is the same sentence about
    // all five, and after the first it is a lecture already had.
    const other = 'their pawn on a3 is isolated — a target you can pile on';
    expect(foldStandingRefrains(other, led)).toBe('their pawn on a3 is isolated');
    expect(foldStandingRefrains(other, led)).toBe('still their isolated a3-pawn');
  });

  it('the lesson is taught exactly once across every instance', () => {
    const led = emptyRefrainLedger();
    const lecture = /a target you can pile on/g;
    const said = ['d6', 'd4', 'd5', 'a3', 'b4']
      .map((sq) => foldStandingRefrains(`their pawn on ${sq} is isolated — a target you can pile on`, led))
      .join(' ');
    expect(said.match(lecture)?.length ?? 0).toBe(1);
    // …and every square is still named. Shrinking must never delete a weakness.
    for (const sq of ['d6', 'd4', 'd5', 'a3', 'b4']) expect(said).toContain(sq);
  });

  it('folds every occurrence inside ONE text, not just the first', () => {
    const led = emptyRefrainLedger();
    foldStandingRefrains('their pawn on d4 is isolated — a target you can pile on', led);
    const two = 'A: their pawn on d4 is isolated — a target you can pile on; '
      + 'B: their pawn on d4 is isolated — a target you can pile on';
    expect(foldStandingRefrains(two, led))
      .toBe('A: still their isolated d4-pawn; B: still their isolated d4-pawn');
  });

  it('a development lead re-teaches when the COUNT changes', () => {
    const led = emptyRefrainLedger();
    expect(foldStandingRefrains("you're two pieces further developed", led))
      .toBe("you're two pieces further developed");
    expect(foldStandingRefrains("you're two pieces further developed", led))
      .toBe('still two pieces further developed');
    // Four pieces ahead is a different fact, not the same one restated.
    expect(foldStandingRefrains("you're 4 pieces further developed", led))
      .toBe("you're 4 pieces further developed");
  });

  it('leaves untouched narration alone and never throws on empty', () => {
    const led = emptyRefrainLedger();
    expect(foldStandingRefrains('', led)).toBe('');
    const plain = 'Your knight on d5 now eyes their bishop on f4.';
    expect(foldStandingRefrains(plain, led)).toBe(plain);
  });
});

// 🔒 THE PATTERNS ARE ANCHORED TO TEMPLATES THIS APP WRITES ITSELF. A refrain
// that silently stops matching is invisible — the narration simply goes back to
// repeating and every test stays green. So build the real clauses through the
// real composer and assert each pattern still finds its own output.
describe('every refrain still matches the composer that produces it', () => {
  /** Reach a position and read the reason list the review would speak. */
  const reasonsAt = (sans: string[], seat: 'w' | 'b', cp: number): string[] => {
    const c = new Chess();
    for (const s of sans) c.move(s);
    return assessPositionalEdge(c.fen(), seat, cp).reasons;
  };

  it('assessPositionalEdge reason strings are covered by a refrain pattern', () => {
    // EVERY PREFIX of a real game, from both seats — not a handful of picked
    // positions. One game walks 6 of the 7 reason kinds (only the doubled-pawn
    // branch stays unvisited), so a reason the composer can produce and no
    // pattern matches shows up here as a named string instead of as silent
    // repetition in production. G3: a real game only — the first cut of this
    // fixture was a line written from memory and chess.js rejected it.
    const uncovered = new Set<string>();
    const kinds = new Set<string>();
    for (let n = 4; n <= ALAPIN.length; n += 1) {
      for (const seat of ['w', 'b'] as const) {
        for (const reason of reasonsAt(ALAPIN.slice(0, n), seat, 150)) {
          kinds.add(reason.replace(/[a-h][1-8]/g, 'SQ').replace(/ [a-h]-file/, ' F-file'));
          if (!STANDING_REFRAINS.some((r) => new RegExp(r.re.source).test(reason))) uncovered.add(reason);
        }
      }
    }
    expect([...uncovered]).toEqual([]);
    // Non-vacuity: if the composer stopped producing reasons entirely, the
    // check above would pass having verified nothing.
    expect(kinds.size, `only saw: ${[...kinds].join(' / ')}`).toBeGreaterThanOrEqual(6);
  });

  it('a covered reason actually folds end-to-end through the composer', () => {
    // The exact shape the per-ply [verdict] facet ships.
    const c = new Chess();
    for (const s of ALAPIN.slice(0, 16)) c.move(s);
    const { reasons } = assessPositionalEdge(c.fen(), 'b', 150);
    expect(reasons.length, 'fixture produced no reasons').toBeGreaterThan(0);
    const line = `You're clearly better: ${reasons.join('; ')}.`;
    const led = emptyRefrainLedger();
    expect(foldStandingRefrains(line, led)).toBe(line);
    const second = foldStandingRefrains(line, led);
    expect(second).not.toBe(line);
    expect(second.length).toBeLessThan(line.length);
  });
});
