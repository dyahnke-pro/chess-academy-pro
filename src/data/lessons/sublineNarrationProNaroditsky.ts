import type { SublineNarration } from '../../services/sublineLesson';

// HAND-AUTHORED subline narration for the Naroditsky repertoire. His own
// teaching IS the house voice (David 2026-07-02), so these are grounded in his
// per-opening YouTube teaching (transcripts in the gitignored
// data/sources/danielnaroditsky-voice/transcripts/ — REFERENCE ONLY, never
// quoted; the ideas are public-domain opening understanding, the prose is
// ORIGINAL). Keyed `${openingId}::${variationIndex}::${triggerMove}@${atPly}`.
// Intros carry WHEN-to-play + the idea behind the reply; un-authored sublines
// stay on the honest silent baseline. Sources cite the concept corpus +
// reputable references (YouTube is not an allowlisted source).

export const SUBLINE_NARRATION_PRO_NARODITSKY: Record<string, SublineNarration> = {
  // ── Caro-Kann (student BLACK) ───────────────────────────────────────────────
  'pro-naroditsky-caro-kann::2::c4@6': {
    intro: {
      say: "c4 — White turns the quiet Exchange into a Panov, an isolated-pawn middlegame. Develop actively against it: Nf6, Nc6, and meet Bg5 calmly. You blockade the d5-square, trade a pair of pieces, and press the isolated d-pawn into the endgame. The IQP is a target, not a threat, once you know the plan.",
      sayShort: 'c4 — Panov; blockade and press the IQP.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },
  'pro-naroditsky-caro-kann::6::Nf3@6': {
    intro: {
      say: "Nf3 — in the Advance, White develops before resolving the c5-against-d4 tension. The natural-looking continuation drifts into trouble here; the accurate move is cxd4 at once, snatching the pawn and forcing White to spend time recapturing. Take on d4 first, then develop with tempo — this precision keeps Black comfortably equal instead of slightly worse.",
      sayShort: 'Nf3 — take cxd4 immediately.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'],
  },

  // ── Najdorf (student BLACK) ─────────────────────────────────────────────────
  'pro-naroditsky-najdorf::0::Nf3@12': {
    intro: {
      say: "Nf3 — in the English Attack, White develops the knight to f3 rather than dropping it back to b3 after your ...e5. Continue Be7 and castle; the knight is passive against the Najdorf's central pawn, and you get the thematic play — ...b5, queenside expansion, and pressure down the half-open c-file. A comfortable Najdorf middlegame.",
      sayShort: 'Nf3 — Be7, then b5 and expand.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  },

  // ── King's Indian Defence (student BLACK) ───────────────────────────────────
  'pro-naroditsky-kid::1::Nf3@8': {
    intro: {
      say: "Nf3 — the solid Fianchetto King's Indian, White's most respected try. Do not be lulled by the calm setup: castle, then hit the centre with the thematic ...d6 and ...e5. The King's Indian's counterpunch works against every White structure — complete the fianchetto, then strike the centre and unleash the kingside plan.",
      sayShort: 'Nf3 — castle, then break with e5.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
  },
  'pro-naroditsky-kid::4::Nge2@10': {
    intro: {
      say: "Nge2 — the Sämisch, White building a big f3-and-e4 centre to launch a kingside pawn storm. Meet it in true King's-Indian style: strike the centre with ...e5 or ...c5, then prepare your own ...f5 break. Opposite-side attacks — and with correct play the King's Indian storm is the more dangerous of the two.",
      sayShort: 'Nge2 — strike with e5 or c5.',
    },
    sources: ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
  },

  // ── Alekhine (student BLACK) ────────────────────────────────────────────────
  'pro-naroditsky-alekhine::1::f4@8': {
    intro: {
      say: "f4 — the sharp Four Pawns Attack, White grabbing maximum space. This is the Alekhine's dream: the bigger the centre, the harder it falls. Chip at it with ...dxe5 and get the light bishop out to f5 before ...e6; White's imposing pawns become overextended targets that you swarm with pieces. Provocation rewarded.",
      sayShort: 'f4 — chip with dxe5, bishop to f5.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
  },

  // ── King's Indian ATTACK (student WHITE) ────────────────────────────────────
  'pro-naroditsky-kia::0::g6@5': {
    intro: {
      say: "g6 — Black mirrors your fianchetto in the KIA. Play the system on autopilot: castle, then d3, Nbd2 and the e4 break. Against a symmetric setup the first side to break productively takes the initiative — and with the extra tempo, that side is you. Familiar structures, easy decisions.",
      sayShort: 'g6 — castle, then d3 and e4.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Kings-Indian-Attack'],
  },

  // ── Rossolimo anti-Sicilian (student WHITE) ─────────────────────────────────
  'pro-naroditsky-rossolimo::0::g6@5': {
    intro: {
      say: "g6 — Black fianchettos against the Rossolimo. Build a centre with c3 and d4 while the bishop eyes the c6-knight; you can trade on c6 to damage the structure or keep the tension. Either way you steer a comfortable positional game, far from the Open Sicilian's mountains of theory.",
      sayShort: 'g6 — build c3 and d4.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
  },
  'pro-naroditsky-rossolimo::5::Bg7@5': {
    intro: {
      say: "Bg7 — Black tries an accelerated Dragon move-order. Punish it with c3 and d4, seizing a broad centre; after e5 you gain space and the Bb5 pin, and Black's fianchetto bishop bites on granite. A clear space advantage with easy, natural development.",
      sayShort: 'Bg7 — take the centre, c3 and d4.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
  },

  // ── Jobava London (student WHITE) ───────────────────────────────────────────
  'pro-naroditsky-jobava-london::0::Bd6@5': {
    intro: {
      say: "Bd6 — Black offers to trade off your strong f4-bishop. You need not oblige: retreat with Bg3, keeping the bishop on its diagonal, or trade and leave Black with doubled pawns after ...Bxf4. The Jobava's knight on c3 and active bishop give you a pleasant, aggressive game with quick development.",
      sayShort: 'Bd6 — keep the bishop with Bg3.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/London-System'],
  },

  // ── Ruy Lopez (student WHITE) ───────────────────────────────────────────────
  'pro-naroditsky-ruy-lopez::2::Nf6@11': {
    intro: {
      say: "Nf6 — Black develops in the old Steinitz. You have already built the ideal big centre with c3 and d4; finish development, keep the strong pawn duo, and enjoy the extra space against Black's cramped, passive setup. Slow, sure pressure is the reward for meeting a passive defence with the centre.",
      sayShort: 'Nf6 — keep the big centre, press.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Ruy-Lopez-Opening'],
  },

  // ── Fantasy Caro (student WHITE) ────────────────────────────────────────────
  'pro-naroditsky-fantasy-caro::1::Qb6@9': {
    intro: {
      say: "Qb6 — Black grabs at the b2-pawn in the sharp g6 Fantasy. Let it go: Qd2 and Rb1 chase the raiding queen to a3, and your big lead in development plus the open b-file are worth far more than a pawn. Develop with threats and the initiative snowballs — a gambit that plays itself.",
      sayShort: 'Qb6 — give b2, chase the queen.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  },

  // ── Alapin anti-Sicilian (student WHITE) ────────────────────────────────────
  'pro-naroditsky-alapin::2::Nf6@5': {
    intro: {
      say: "Nf6 — Black develops in the ...d6 Alapin. Roll out the model setup: d4 gives you the broad centre, then Bd3, Nf3 and castle for a comfortable, space-gaining game. The Alapin sidesteps all of the Sicilian's razor-sharp theory and hands White an easy, principled position.",
      sayShort: 'Nf6 — big centre, then Bd3 and Nf3.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
  },
  'pro-naroditsky-alapin::0::Nc6@7': {
    intro: {
      say: "Nc6 — the Open Alapin, Black developing with tempo against your centre. Support d4 with Nf3 and develop harmoniously; the isolated- or hanging-pawn structures that arise favour White's freer pieces and clearer plans. A pleasant, low-risk edge straight out of the opening.",
      sayShort: 'Nc6 — support d4, develop freely.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
  },
};
