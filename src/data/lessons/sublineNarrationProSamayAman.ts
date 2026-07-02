import type { SublineNarration } from '../../services/sublineLesson';

// HAND-AUTHORED subline narration for the Samay Raina + Aman (chessbrah)
// repertoires, house voice. Grounded in the established understanding of each
// specific line (verified against the real move data) + their teaching content
// where available (transcripts gitignored, reference-only, prose original).
// Keyed `${openingId}::${variationIndex}::${triggerMove}@${atPly}`. "You" = the
// student side (color-checked). Un-authored sublines stay on the silent baseline.

export const SUBLINE_NARRATION_PRO_SAMAY_AMAN: Record<string, SublineNarration> = {
  // ── Samay Raina ─────────────────────────────────────────────────────────────
  'pro-samayraina-open-sicilian::0::d6@9': {
    intro: {
      say: "d6 — Black steers toward a Classical Open Sicilian. Finish your Open-Sicilian setup and pick a scheme: the English Attack with Be3, f3 and g4, or a calm Be2 build and castle. You have the freer development and the attacking initiative that the Open Sicilian hands White — choose your plan and go.",
      sayShort: 'd6 — finish the setup, then attack.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence'],
  },
  'pro-samayraina-ruy::0::Bc5@7': {
    intro: {
      say: "Bc5 — Black keeps the bishop active instead of heading into the Berlin endgame. Meet it with c3 and d4, challenging the bishop and grabbing the centre; you keep the Ruy Lopez's trademark slow, grinding pressure with more space and the healthier structure.",
      sayShort: 'Bc5 — c3 and d4, grab the centre.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Ruy-Lopez-Opening'],
  },
  'pro-samayraina-italian::0::Bc5@7': {
    intro: {
      say: "Bc5 — a Giuoco Pianissimo from the Two Knights move-order. Build slowly: c3, then the Nbd2-Nf1-Ng3 reroute and a kingside expansion. Small, steady edges and permanent pressure on f7 — the modern Italian squeeze that never takes a risk.",
      sayShort: 'Bc5 — slow Italian, reroute the knight.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Italian-Game'],
  },
  'pro-samayraina-caro-white::0::Ne7@7': {
    intro: {
      say: "Ne7 — Black reroutes toward g6 against your space-grabbing anti-Caro. Build the broad centre with d4 and Nf3 behind the e5-clamp; you have a French-Advance-style space advantage with the extra c4-pawn cramping Black. Develop behind the pawns and press on the kingside.",
      sayShort: 'Ne7 — build the big centre, clamp.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },
  'pro-samayraina-open-e5::0::Bxc6@6': {
    intro: {
      say: "Bxc6 — the Exchange Ruy, White trading to damage your pawns. Recapture dxc6, toward the centre, and embrace the bargain: you get the bishop pair and open lines in return for the doubled c-pawns. Keep the position open and, especially in the endgame, those two bishops are a genuine asset.",
      sayShort: 'Bxc6 — recapture dxc6, keep the bishops.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Ruy-Lopez-Opening-Exchange-Variation'],
  },
  'pro-samayraina-sicilian-black::0::Be2@8': {
    intro: {
      say: "Be2 — White retreats after your central ...d5 already freed the game. You have solved the opening: the ...d5 break gained free development and an open position. Continue Nf6, castle, and post the pieces actively — Black is comfortable with easy, harmonious play.",
      sayShort: 'Be2 — d5 freed you; develop and castle.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'],
  },
  'pro-samayraina-scandi::0::Bc4@8': {
    intro: {
      say: "Bc4 — White develops actively in the Qa5 Scandinavian. Play the reliable main plan: c6 to give the queen a retreat, then Bf5 getting the light bishop out before e6. Rock-solid structure, the queen safely tucked, and the good bishop active — the Scandinavian at its most dependable.",
      sayShort: 'Bc4 — c6 and Bf5, stay solid.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  },
  'pro-samayraina-kings-gambit::0::Be7@7': {
    intro: {
      say: "Be7 — Black plays the quiet King's Gambit Declined. Keep the initiative the gambit promises: your bishop on c4 already eyes f7, so castle, play d3 and Nc3, and prepare the f4-f5 lever or a central break. Black's passive setup gives you a free hand to build the attack.",
      sayShort: 'Be7 — castle, then push for f5.',
    },
    sources: ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },

  // ── Aman (chessbrah) ────────────────────────────────────────────────────────
  'pro-aman-sicilian-kan::0::Bd3@8': {
    intro: {
      say: "Bd3 — White sets up the aggressive Kan main line with a quick Qg4. Meet it precisely: Bc5 hits the knight, and after Nb3 the bishop drops to e7 while g6 blunts the queen sortie. The Kan's flexible pawn structure soaks up the aggression and you complete a solid, resilient setup.",
      sayShort: 'Bd3 — Bc5 then Be7, blunt with g6.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Kan_Variation'],
  },
  'pro-aman-nimzo-indian::0::Nf3@4': {
    intro: {
      say: "Nf3 — White develops flexibly, avoiding the immediate Nimzo pin. Answer d5, a rock-solid Queen's-Gambit-Declined structure, then Be7 and castle. You reach a sound, classical position where Black is never worse and can aim for the freeing ...c5 or ...dxc4 breaks.",
      sayShort: 'Nf3 — d5, solid QGD, then castle.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
  },
  'pro-aman-caro-kann::0::h4@6': {
    intro: {
      say: "h4 — the sharp Tal thrust in the Advance. Answer h5, freezing White's pawn and keeping your f5-bishop's squares; trade the light bishops, check on a5, and develop with e6. A comfortable Caro where White's advanced h-pawn becomes a target rather than a threat.",
      sayShort: 'h4 — reply h5, trade and develop.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'],
  },
  'pro-aman-reti::0::c6@5': {
    intro: {
      say: "c6 — Black heads for a Slav structure against your Réti. Develop Nc3 and Bg5, pinning; the game can sharpen into a Botvinnik-style tussle where your central e4 break and the bishop's pressure give strong attacking chances. Play energetically in the centre.",
      sayShort: 'c6 — Nc3 and Bg5, then break e4.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
  },
  'pro-aman-ruy-lopez::1::d6@7': {
    intro: {
      say: "d6 — Black plays a modest Berlin against your d3 Anti-Berlin. Build slowly: c3, Nbd2, and the Nf1-Ng3 reroute, keeping the Ruy bishop and a small but nagging space edge. This is the modern positional Ruy — no early trades, just a long, one-sided squeeze.",
      sayShort: 'd6 — c3 and reroute, squeeze slowly.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Ruy-Lopez-Opening'],
  },
  'pro-aman-rossolimo::1::Nd4@9': {
    intro: {
      say: "Nd4 — Black jumps the knight in to trade off your Rossolimo bishop. Take on d4 or keep the tension; either way you hold the light-square control the Rossolimo is built on and steer a comfortable positional game. The whole point of the line is this small, durable structural pull.",
      sayShort: 'Nd4 — trade, keep the light squares.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
  },
  'pro-aman-french-white::1::Bb4@7': {
    intro: {
      say: "Bb4 — the MacCutcheon, Black pinning back in the Classical French. Meet it with e5, kicking the knight and gaining space; the pieces pour into a sharp, double-edged middlegame where your central space and kingside chances outweigh Black's counterplay. Know the pin-breaking e5 and the MacCutcheon holds no fear.",
      sayShort: 'Bb4 — hit back with e5, gain space.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
  },
  'pro-aman-anti-caro::0::dxe4@5': {
    intro: {
      say: "dxe4 — Black takes in the Two Knights Caro. Recapture Nxe4 and try the tricky Qe2, pinning to win a tempo after the knight trade; you develop Bc4 with easy, active play and a small pull. A pleasant, low-theory way to meet the Caro-Kann.",
      sayShort: 'dxe4 — Nxe4, then the Qe2 trick.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },
};
