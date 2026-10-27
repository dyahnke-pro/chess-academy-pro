import type { SublineNarration } from '../../services/sublineLesson';

// HAND-AUTHORED subline narration for the Samay Raina + Aman (chessbrah)
// repertoires, house voice. Grounded in the established understanding of each
// specific line (verified against the real move data) + their teaching content
// where available (transcripts gitignored, reference-only, prose original).
// Keyed `${openingId}::${variationIndex}::${triggerMove}@${atPly}`. "You" = the
// student side (color-checked). Un-authored sublines stay on the silent baseline.

export const SUBLINE_NARRATION_PRO_SAMAY_AMAN: Record<string, SublineNarration> = {
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
  'pro-aman-anti-caro::0::dxe4@5': {
    intro: {
      say: "dxe4 — Black takes in the Two Knights Caro. Recapture Nxe4 and try the tricky Qe2, pinning to win a tempo after the knight trade; you develop Bc4 with easy, active play and a small pull. A pleasant, low-theory way to meet the Caro-Kann.",
      sayShort: 'dxe4 — Nxe4, then the Qe2 trick.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },
};
