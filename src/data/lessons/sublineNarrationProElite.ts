import type { SublineNarration } from '../../services/sublineLesson';

// HAND-AUTHORED subline narration for the Caruana + Carlsen repertoires,
// grounded in their own YouTube game/teaching content (transcripts in gitignored
// data/sources/{fabianocaruana,magnuscarlsen}-voice/transcripts/ — REFERENCE
// ONLY, prose ORIGINAL, house voice). Keyed
// `${openingId}::${variationIndex}::${triggerMove}@${atPly}`. "You" always = the
// student side (color-checked). Un-authored sublines stay on the silent baseline.

export const SUBLINE_NARRATION_PRO_ELITE: Record<string, SublineNarration> = {
  // ── Caruana ─────────────────────────────────────────────────────────────────
  'pro-caruana-nimzo-indian::0::Ne2@8': {
    intro: {
      say: "Ne2 — the Rubinstein, White planning to recapture on c3 with the knight to keep the pawns intact. Play the classic Nimzo bargain: your b4-bishop trades on c3 anyway, saddling White with doubled pawns, and ...cxd4 strikes the centre. You give up the bishop pair for a permanent structural target — that trade is the whole point of the Nimzo.",
      sayShort: 'Ne2 — trade on c3, hit the centre.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
  },
  'pro-caruana-taimanov::0::Bd3@10': {
    intro: {
      say: "Bd3 — White develops toward a kingside setup in the Taimanov. Continue Nf6 and castle; your flexible ...Qc7 and ...a6 structure keeps every option open — ...b5 for queenside space, or ...Nc6 and ...d5 hitting the centre. The Taimanov's strength is that flexibility: keep your shape, then strike wherever White commits.",
      sayShort: 'Bd3 — Nf6, castle, stay flexible.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence'],
  },
  'pro-caruana-italian::0::Be7@7': {
    intro: {
      say: "Be7 — Black chooses a solid, restrained Two Knights setup. Build patiently in the modern Italian style: d3 and c3, then the Nbd2-Nf1-Ng3 reroute toward the kingside before you expand. The Giuoco Pianissimo is a slow burn — you accumulate small edges and the pressure on f7 and the centre never relents.",
      sayShort: 'Be7 — slow Italian, reroute the knight.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Italian-Game'],
  },
  'pro-caruana-french::0::exd5@6': {
    intro: {
      say: "exd5 — White defuses the sharp Winawer with the Exchange. Recapture and develop naturally: Nc6, the bishop to d6 or e7, and castle. The symmetrical structure is dry but completely comfortable for Black — you equalise easily and play for the win in a long game the moment White drifts.",
      sayShort: 'exd5 — recapture and develop freely.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'],
  },
  'pro-caruana-caro-kann::0::h4@6': {
    intro: {
      say: "h4 — the sharp Tal thrust in the Advance. Answer h5, freezing White's pawn and preserving your f5-bishop's squares; trade the light bishops, check on a5, and develop with e6. A comfortable Caro where White's advanced h-pawn becomes a target rather than a threat.",
      sayShort: 'h4 — reply h5, trade and develop.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'],
  },
  'pro-caruana-kid::0::Be2@8': {
    intro: {
      say: "Be2 — the Classical King's Indian, White's most respected setup. Castle, then unleash the KID engine: strike with ...e5, let the centre lock, and storm the kingside with ...f5 while White expands on the queenside. This is the mutual race the King's Indian is built to win.",
      sayShort: 'Be2 — castle, then strike e5.',
    },
    sources: ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
  },

  // ── Carlsen ─────────────────────────────────────────────────────────────────
  'pro-carlsen-open-sicilian::0::g6@5': {
    intro: {
      say: "g6 — Black fianchettos against the Rossolimo. Castle, then run the standard plan: trade on c6 to damage the structure, or clamp with d3, c3 and a slow build. Giving the bishop for the knight is no concession — it hands Black a lasting weakness, and you steer a comfortable positional game far from Open-Sicilian theory.",
      sayShort: 'g6 — castle, then clamp or Bxc6.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
  },
  'pro-carlsen-ruy-lopez::0::Bc5@5': {
    intro: {
      say: "Bc5 — the Giuoco Piano, the quiet Italian. Build in the modern style: c3 and d3, then the Nbd2-Nf1-Ng3 reroute and a slow kingside expansion. Small, steady advantages and permanent pressure on f7 — the Italian squeezes without ever taking a real risk.",
      sayShort: 'Bc5 — slow Italian, reroute the knight.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Italian-Game'],
  },
  'pro-carlsen-queens-pawn::0::d5@5': {
    intro: {
      say: "d5 — Black goes Grünfeld, striking at your centre from the flank. Take the Exchange: cxd5, then e4 builds the classical big pawn front while Bc4 and the c3-pawn support it. You get the imposing centre — keep it mobile and press; Black's fianchetto bishop bites on it while you play for the kingside.",
      sayShort: 'd5 — Exchange Grünfeld, build the centre.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
  },
  'pro-carlsen-sicilian::0::d4@4': {
    intro: {
      say: "d4 — White opens the Sicilian, the main battleground. Recapture and develop Nf6; with Nc3 reached you have the full Open Sicilian, the most combative answer to 1.e4. Pick your setup — the flexible ...e5 or ...e6 systems — and play for the dynamic, unbalanced winning chances the Sicilian promises Black.",
      sayShort: 'd4 — the Open Sicilian; play to win.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'],
  },
  'pro-carlsen-1e5::0::Ng5@6': {
    intro: {
      say: "Ng5 — the aggressive Two Knights lunge at f7. Do not panic: the principled ...d5 strikes back in the centre at once, and after exd5 you have the sound recapture lines or the sharp ...Na5 hitting the bishop. Well-known theory neutralises the early aggression — meet Ng5 with ...d5 and develop with confidence.",
      sayShort: 'Ng5 — hit back with d5.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Italian-Game-Two-Knights-Defense'],
  },
  'pro-carlsen-nimzo::0::Qc2@6': {
    intro: {
      say: "Qc2 — the Classical Nimzo, White sidestepping the doubled pawns and eyeing the centre. Castle, then challenge with ...d5 or ...c5; your bishop on b4 still pressures c3, and if White ever captures you inherit the bishop pair. A rich, balanced Nimzo where Black keeps every resource.",
      sayShort: 'Qc2 — castle, then break d5 or c5.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
  },
  'pro-carlsen-french::0::exd5@6': {
    intro: {
      say: "exd5 — White clarifies in the Tarrasch and your queen recaptures actively on d5. After ...cxd4 you reach an open, comfortable middlegame with easy piece play; the queen sits well and you develop with tempo. The Tarrasch French hands Black free, active pieces — exactly what you want.",
      sayShort: 'exd5 — recapture, develop actively.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'],
  },
  'pro-carlsen-scandinavian::0::Bc4@6': {
    intro: {
      say: "Bc4 — White develops actively in the Qa5 Scandinavian. Continue Nf6, then the solid ...c6 and ...Bf5 or ...Bg4, tucking the queen to c7. You reach the Scandinavian's trademark shell: rock-solid, no weaknesses, the queen safely rerouted, and an easy, sound game against 1.e4.",
      sayShort: 'Bc4 — Nf6 and c6, stay solid.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  },
  'pro-carlsen-caro-kann::0::Qe2@8': {
    intro: {
      say: "Qe2 — a tricky Two Knights try, pinning to filch a tempo. Play precisely: trade knights with Nxe4, then develop Nd7 and hit the queen with Nf6, gaining the time straight back. Accurate move-order neutralises the trick and you reach the comfortable, solid Caro you were always heading for.",
      sayShort: 'Qe2 — trade, then Nf6 hits the queen.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },
  'pro-carlsen-modern::0::Nc3@6': {
    intro: {
      say: "Nc3 — White builds a classical centre against your Modern. Develop flexibly: ...Nf6, castle, then pick your counter — ...c5, ...e5, or ...c6 and ...b5 on the wing. The Modern invites the big centre precisely so you can strike at it once White commits. Provoke, then counterpunch.",
      sayShort: 'Nc3 — develop, then counter the centre.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Defense'],
  },
  'pro-carlsen-closed-sicilian::0::Nc6@5': {
    intro: {
      say: "Nc6 — Black develops in the Grand-Prix Closed Sicilian. Your plan is set: f4 has staked the kingside, so Bc4 eyes f7, castle, and roll the f4-f5 pawn storm behind the pieces. The Closed sidesteps Open-Sicilian theory and hands you a straightforward, dangerous attack.",
      sayShort: 'Nc6 — Bc4, castle, then f5 storm.',
    },
    sources: ['concept:pos-king-safety', 'https://www.chess.com/openings/Closed-Sicilian'],
  },
  'pro-carlsen-reti::0::d5@5': {
    intro: {
      say: "d5 — Black claims the centre in the Réti. Take on d5 and check with Qa4, winning time to regroup; you keep a flexible, hypermodern position and needle Black's slightly loose setup. The Réti thrives on this tempo-gaining play rather than an early pawn clash.",
      sayShort: 'd5 — take it, Qa4+ gains time.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
  },
  'pro-carlsen-kings-gambit::0::e4@5': {
    intro: {
      say: "e4 — the Falkbeer Counter-Gambit, Black declining your King's Gambit with a thrust of their own. Undermine it with d3, and after the exchanges you emerge with easy development and the safer king. Meet counter-aggression with precise development, and the initiative stays with you.",
      sayShort: 'e4 — undermine with d3, develop.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },
};
