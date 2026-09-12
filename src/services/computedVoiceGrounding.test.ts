import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { describeMoveGeometry, assemblePieceSafetyAnswer, assembleHangingAnswer } from './groundedAnswer';
import { legalSeeGain, seeGain, landingIsSafe } from './positionReadingService';

/**
 * Computed-voice grounding gate (2026-09-12 deep dive). The coach VOICES facts
 * computed here (G0); a false geometry claim becomes a false thing spoken to a
 * user, and `voiceFacts` can only rephrase — it can never correct a wrong
 * computed claim. So the correctness lives here, and this gate holds it:
 *
 *  - `describeMoveGeometry` must never claim fork / pin / "wins the X" / "attacks
 *    the X" on a move whose piece LEGALLY hangs on its landing square (the
 *    12/12 real defects the deep dive found were "attacks …" from an en-prise
 *    piece), and must not be fooled by a PINNED defender into calling an
 *    illusory tactic real.
 *  - the pin/legality-aware SEE (`legalSeeGain`) must see a hang that the
 *    pin-blind `seeGain` misses.
 *  - genuine forks / pins / mates / clean captures / safe tempo-attacks must
 *    still be named (no over-correction).
 *
 * Fixtures are REAL positions surfaced by scanning src/data/puzzles.json.
 */

// A piece is legally safe on `square` after `san` from `fenBefore` iff the
// opponent has no profitable legal capture of it.
function pieceLegallyHangs(fenBefore: string, san: string): boolean {
  const c = new Chess(fenBefore);
  const mv = c.move(san);
  if (c.isCheckmate()) return false;
  return legalSeeGain(c.fen(), mv.to as never) > 0;
}

const WINNING_CLAIM = /^(forks|pins|wins the|attacks)/;

describe('describeMoveGeometry never claims a tactic on a legally-hanging piece', () => {
  // Each: [fenBefore (opponent has just set up / it is mover to move), san, mover].
  // In every one the moved piece LEGALLY hangs on its square, yet the pre-fix
  // code emitted a bare "attacks …" (the deep-dive #1/#5 class).
  const HANGS: Array<[string, string, 'white' | 'black']> = [
    ['2r2rk1/1R4pp/p7/2Np4/8/4b3/P1R3PP/5Q1K b - - 0 30', 'Rf5', 'black'],
    ['2r2rk1/1R4pp/p7/2Np4/8/4b3/P1R3PP/5Q1K b - - 0 30', 'Bf2', 'black'],
    ['6k1/4pp1p/6pB/8/b2R4/2P5/r5PP/6K1 w - - 0 25', 'Bf8', 'white'],
    ['6k1/4pp1p/6pB/8/b2R4/2P5/r5PP/6K1 w - - 0 25', 'Rxa4', 'white'],
    ['rn4k1/pp4pp/3p4/2pP1b2/7q/5P2/PPr1QN1P/K2R1B1R w - - 4 19', 'Rd4', 'white'],
    ['2r3k1/p1pR1ppp/1p4b1/2r5/2P1P3/5B1P/P4KP1/3R4 w - - 4 27', 'Bh5', 'white'],
  ];

  for (const [fen, san, mover] of HANGS) {
    it(`${san} does not claim a winning tactic (piece hangs) — ${fen.slice(0, 24)}…`, () => {
      // Precondition: this move really does leave the piece hanging.
      expect(pieceLegallyHangs(fen, san), `${san} should legally hang for this fixture`).toBe(true);
      const geo = describeMoveGeometry(fen, san, mover);
      // A hanging piece may still legitimately give check; it must NOT be sold
      // as a fork / pin / material win / tempo-attack.
      if (geo) expect(geo, `"${geo}" claims a tactic on a hanging piece`).not.toMatch(WINNING_CLAIM);
    });
  }
});

describe('legalSeeGain is pin-aware where seeGain is blind', () => {
  it('sees the knight hang past a pinned defender', () => {
    // White Nc3-d5; d5 attacked by the black knight on f6 (equal value), and
    // "defended" only by the white e4 pawn — which is PINNED to Ke1 by Re8.
    const fen = '4r1k1/4q3/5n2/8/4P3/2N5/8/4K3 w - - 0 1';
    const c = new Chess(fen);
    c.move('Nd5');
    // Only the black knight can legally take d5; e4 is pinned and cannot.
    const caps = c.moves({ verbose: true }).filter((m) => m.to === 'd5').map((m) => m.san);
    expect(caps).toContain('Nxd5');
    // The pin-blind SEE counts the pinned e4 as a recapturer → "safe" (<= 0);
    // the legal SEE sees the knight simply hangs.
    expect(seeGain(c, 'd5' as never)).toBeLessThanOrEqual(0);
    expect(legalSeeGain(c.fen(), 'd5' as never)).toBeGreaterThan(0);
    expect(landingIsSafe(c.fen(), 'd5' as never)).toBe(false);
  });
});

describe('safety assemblers are pin-aware (P1b — no false "hanging"/"in trouble")', () => {
  // White Bd5 is attacked only by Black Nf6, which is FULLY PINNED to Kf8 by Rf1
  // (0 legal moves). The bishop is safe; pin-blind seeGain called it "in trouble".
  const fen = '5k2/8/5n2/3B4/8/8/8/4KR2 w - - 0 1';

  it('assemblePieceSafetyAnswer does not call a piece attacked only by a pinned piece "in trouble"', () => {
    const ans = assemblePieceSafetyAnswer(fen, 'is my bishop safe?', 'white');
    expect(ans).not.toBeNull();
    expect(ans!.facts, ans!.facts).not.toMatch(/in trouble/);
  });

  it('assembleHangingAnswer does not list a piece defended-by-a-pin as loose', () => {
    const ans = assembleHangingAnswer(fen, 'what is hanging?', 'white');
    expect(ans).not.toBeNull();
    // With only a pinned attacker, nothing of the student's is truly hanging.
    expect(ans!.facts, ans!.facts).toMatch(/[Nn]othing of yours is hanging/);
  });
});

describe('genuine tactics are still named (no over-correction)', () => {
  const cases: Array<[string, string, 'white' | 'black', RegExp]> = [
    // Real knight fork of king + bishop, knight safe.
    ['5rk1/3R1pbp/4p1p1/4P3/2p2B2/P6P/1P3PP1/1Nn3K1 b - - 0 26', 'Ne2+', 'black', /forks the king on g1 and the bishop on f4/],
    // Clean knight win (audit fixture): Nxe5, not recapturable.
    ['r1bqkbnr/pppp1ppp/8/4n3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', 'Nxe5', 'white', /wins the knight on e5/],
    // Real pin: Bg4 pins the f5 queen to the c8 king.
    ['2k1r2r/ppn4p/2pp2p1/4pq2/PPP5/3P3P/2Q1BP2/R3K2R w - - 0 21', 'Bg4', 'white', /pins the queen on f5 to the king on c8/],
    // Mate.
    ['7r/pQ3Npk/1b4bp/4r3/8/8/PP3RPP/R1B3K1 b - - 0 25', 'Re1#', 'black', /delivers checkmate/],
  ];
  for (const [fen, san, mover, expected] of cases) {
    it(`${san} → ${expected}`, () => {
      expect(describeMoveGeometry(fen, san, mover)).toMatch(expected);
    });
  }
});
