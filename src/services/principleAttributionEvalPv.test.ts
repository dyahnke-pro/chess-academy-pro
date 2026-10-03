import { describe, it, expect } from 'vitest';
import { attributePrinciples, type AttributionInput } from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';

// Wave-3 eval/PV-gated fundamentals (David 2026-09-06: "Especially overvaluing
// the attack. Or a bad sacrifice. We can use the PV for this" + the recapture-
// direction exception + rushing a win). Each fixture is a REAL legal game (found
// by capture-biased legal-playout search) whose board shape triggers the
// detector; the eval + PV are the persisted review inputs that gate it. The eval
// numbers match the material reality on the board (a hung piece → clearly
// losing), never contrived past what the position shows.
//
// These detectors are SILENT without the eval/PV — that is the contract: they
// fire on the review path (persisted deep analysis) and stay quiet live.

const OVERVALUED: AttributionInput = { replySan: null,
  historySans: ['c4', 'Nc6', 'b4', 'Nxb4', 'h3', 'g5', 'f4', 'gxf4', 'h4', 'c5', 'Qa4', 'Nd5', 'e4', 'fxe3', 'Qa3', 'exd2+', 'Ke2', 'd1=B+', 'Kxd1', 'Ne3+'],
  bestSan: 'Rb8',
  classification: 'blunder',
  pvAfterPlayed: ['Bxe3'],
  evalBefore: 30,
  evalAfterPlayed: -340,
};

const POISONED: AttributionInput = { replySan: null,
  historySans: ['f3', 'c5', 'b4', 'cxb4', 'Na3', 'bxa3', 'g3', 'Na6', 'Bxa3', 'e5', 'Kf2', 'Bxa3', 'h3', 'e4', 'fxe4', 'Nc7', 'c4', 'Nf6', 'Rh2', 'Nxe4+', 'Ke1', 'Nxg3', 'Qc2', 'Kf8', 'Qxh7'],
  bestSan: 'c5',
  classification: 'blunder',
  pvAfterPlayed: ['Rxh7'],
  evalBefore: 20,
  evalAfterPlayed: -550,
};

const CAPTURE: AttributionInput = { replySan: null,
  historySans: ['a3', 'h6', 'g4', 'c6', 'h3', 'g5', 'Bg2', 'Rh7', 'Bxc6', 'bxc6'],
  bestSan: 'dxc6',
  classification: 'mistake',
  evalBefore: 10,
  evalAfterPlayed: -60,
};

// A quiet Italian — the played pawn move is fine on the board (no concrete
// fundamental fires), but the eval says a clearly-winning position was thrown
// away. Only botched-conversion should attach.
const BOTCHED: AttributionInput = { replySan: null,
  historySans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'Nc3', 'Nf6', 'O-O', 'O-O', 'h3', 'a6'],
  bestSan: 'Re8',
  classification: 'mistake',
  evalBefore: 270,
  evalAfterPlayed: 30,
};

// A conversion needs something to convert: White is a knight up (…Ng4?? Qxg4)
// and then lets most of it go. (BOTCHED above is level material — see the
// negative control below.)
const BOTCHED_AHEAD: AttributionInput = { replySan: null,
  historySans: ['e4', 'Nf6', 'Nc3', 'Ng4', 'Qxg4', 'd6', 'Nf3', 'e5', 'Bc4', 'Nc6', 'O-O', 'Be7', 'd3', 'O-O', 'h3'],
  bestSan: 'Bg5',
  classification: 'mistake',
  evalBefore: 600,
  evalAfterPlayed: 50,
};

describe('eval/PV fundamentals — Wave 3 detectors fire on real legal games', () => {
  const cases: { name: string; input: AttributionInput }[] = [
    { name: 'overvalued-attack', input: OVERVALUED },
    { name: 'poisoned-pawn', input: POISONED },
    { name: 'capture-toward-centre', input: CAPTURE },
    { name: 'botched-conversion', input: BOTCHED_AHEAD },
  ];
  for (const { name, input } of cases) {
    it(`${name} is attributed and proven`, () => {
      const out = attributePrinciples(input);
      const a = out.find((x) => x.id === name);
      expect(a, `${name} not in [${out.map((x) => x.id).join(', ')}]`).toBeTruthy();
      expect(a!.evidence.counterfactualClean).toBe(true);
      const text = renderFundamentalVerdict([a!], { replySan: null, ply: input.historySans.length, seen: new Set() });
      expect(text.length).toBeGreaterThan(20);
      expect(text).not.toMatch(/\b(we|our|us)\b/i);
    });
  }

  it('botched-conversion clamps a thrown MATE — no absurd "300 points" figure', () => {
    // Mate is eval-encoded as ±30000; a thrown mate must read as "a winning
    // position", never a three-digit pawn count.
    const thrownMate: AttributionInput = { ...BOTCHED_AHEAD, evalBefore: 30000, evalAfterPlayed: 20 };
    const out = attributePrinciples(thrownMate);
    const a = out.find((x) => x.id === 'botched-conversion');
    expect(a, 'botched-conversion did not fire on a thrown mate').toBeTruthy();
    const text = renderFundamentalVerdict([a!], { replySan: null, ply: thrownMate.historySans.length, seen: new Set() });
    expect(text).not.toMatch(/\b\d{3,}\b/);        // no 100+ figure
    expect(text).not.toMatch(/pawns/i);            // points, never pawns (David)
    expect(text).toMatch(/winning position/i);
  });

  it('botched-conversion with the better move named ELSEWHERE leaves it out (run I, 4GIsh ply 32)', () => {
    const a = attributePrinciples(BOTCHED_AHEAD).find((x) => x.id === 'botched-conversion')!;
    for (let ply = 0; ply < 3; ply++) {
      const text = renderFundamentalVerdict([{ ...a, facts: { ...a.facts, better: '' } }], { replySan: null, ply, seen: new Set() });
      expect(text).not.toMatch(/Bg5/);
      expect(text).not.toMatch(/;\s*(stays|keeps)|—\s+was the calm|\s{2}/);
    }
  });

  it('NO material lead → no "convert with patience" (Learn walk 2026-10-01, game 1 ply 10)', () => {
    // Black is a PAWN DOWN; the +2.6 is the fork White just allowed (…f6 hits
    // Bg5 while …d5 hits Ne4). Missing it is a missed punishment, not a rushed
    // win, and the grade line already names f6.
    const walk: AttributionInput = { replySan: null,
      historySans: ['Nc3', 'e5', 'Nf3', 'Nc6', 'd4', 'e4', 'Nxe4', 'd5', 'Bg5', 'Be7'],
      bestSan: 'f6', classification: 'blunder', evalBefore: 261, evalAfterPlayed: -157 };
    expect(attributePrinciples(walk).map((x) => x.id)).not.toContain('botched-conversion');
    // Level material, same eval story — still nothing to convert.
    expect(attributePrinciples(BOTCHED).map((x) => x.id)).not.toContain('botched-conversion');
  });

  it('the eval/PV-GATED detectors stay SILENT without the persisted eval/PV', () => {
    // Same positions, but no eval and no PV → the eval/PV-gated detectors must not
    // fire (the live-path contract). capture-toward-centre is EXCLUDED — it is
    // purely board-provable (best is the away-recapture opening a rook lane), so
    // it fires on any path where the move is flagged, live or review.
    const stripped = (i: AttributionInput): AttributionInput =>
      ({ replySan: null, historySans: i.historySans, bestSan: i.bestSan, classification: i.classification });
    for (const { name, input } of cases) {
      if (name === 'capture-toward-centre') continue;
      const out = attributePrinciples(stripped(input));
      expect(out.find((x) => x.id === name), `${name} fired with no eval/PV`).toBeFalsy();
    }
  });
});

describe('a check that offers nothing invests nothing (review walk oct3b, g2 ply 39)', () => {
  // 20.Qf3+ was called "The attack was overvalued: Qf3+ commits material" —
  // a check with nothing en prise. Same shape, minimal real game: 3.Bb5+ puts
  // nothing en prise; the line loses the bishop to …c6 and …cxb5 afterwards.
  // That is a piece walked into a threat, not an investment.
  const CHECK: AttributionInput = { replySan: null,
    historySans: ['e4', 'e5', 'Nf3', 'd6', 'Bb5+'],
    bestSan: 'd4',
    classification: 'blunder',
    pvAfterPlayed: ['c6', 'Qe2', 'cxb5'],
    evalBefore: 30,
    evalAfterPlayed: -300,
  };
  it('is not "the attack was overvalued"', () => {
    expect(attributePrinciples(CHECK).map((x) => x.id)).not.toContain('overvalued-attack');
  });
  it('POSITIVE CONTROL: a capture that offers the piece still is one', () => {
    const out = attributePrinciples(OVERVALUED).map((x) => x.id);
    expect(out).toContain('overvalued-attack');
  });
});
