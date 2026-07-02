import type { SublineNarration } from '../../services/sublineLesson';

// HAND-AUTHORED subline narration for the Hikaru + Eric Rosen repertoires,
// grounded in their own YouTube teaching (transcripts in gitignored
// data/sources/{hikaru,imrosen}-voice/transcripts/ — REFERENCE ONLY, prose
// ORIGINAL, house voice per the 2026-07-02 doctrine). Keyed
// `${openingId}::${variationIndex}::${triggerMove}@${atPly}`. Un-authored
// sublines stay on the honest silent baseline.

export const SUBLINE_NARRATION_PRO_EXTRA: Record<string, SublineNarration> = {
  // ── Hikaru ──────────────────────────────────────────────────────────────────
  'pro-hikaru-nimzo-larsen::0::d5@5': {
    intro: {
      say: "d5 — Black claims the full centre against the Larsen. Do not fear it: your b2-bishop already rakes the long diagonal at e5, and Bb5 pins the c6-knight to pile on. This is hypermodern chess — undermine the big centre with c4 and pieces rather than meet it pawn-for-pawn. Provoke the advance, then strike its overextension.",
      sayShort: 'd5 — Bb5 pins, pressure the centre.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Larsen%27s_Opening'],
  },
  'pro-hikaru-reti::0::e5@11': {
    intro: {
      say: "e5 — Black strikes in the centre in the Réti with a b3 flank. Meet it calmly: your d4 and e3 pawns and the b2-bishop keep everything flexible; take on e5 or hold the tension, and use your harmonious development to press. The Réti thrives on exactly this slow, structural squeeze rather than an early clash.",
      sayShort: 'e5 — stay flexible, press the squeeze.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
  },
  'pro-hikaru-pirc-modern::0::f4@6': {
    intro: {
      say: "f4 — the aggressive Austrian-style setup, White grabbing big space. The tempting central break overreaches here; the accurate plan is queenside expansion — b5 first, gaining space and preparing to hit White's centre from the flank. Play a6 and b5, then strike: the Modern counters on the wing before contesting the centre head-on.",
      sayShort: 'f4 — expand with b5 first.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Defense'],
  },
  'pro-hikaru-caro-kann::0::h4@6': {
    intro: {
      say: "h4 — the sharp Tal thrust in the Advance. Answer h5, freezing White's pawn and preserving your f5-bishop's squares; then trade the light bishops, check on a5, and develop with e6. You reach a comfortable Caro where White's advanced h-pawn is a target, not a threat.",
      sayShort: 'h4 — reply h5, trade and develop.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'],
  },

  // ── Eric Rosen ──────────────────────────────────────────────────────────────
  'pro-ericrosen-stafford::0::h3@10': {
    intro: {
      say: "h3 — White tries to snuff out your Stafford tricks. The natural attacking lunge overreaches; the precise move is Qe7, keeping the initiative and the pressure on e4 while eyeing the kingside. In the Stafford you are down a pawn for activity — keep every piece pointed at White's king, and Qe7 does exactly that.",
      sayShort: 'h3 — keep the initiative with Qe7.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit'],
  },
  'pro-ericrosen-london::0::e6@5': {
    intro: {
      say: "e6 — Black sets up a solid, symmetrical wall against the London. Keep your good bishop with Bg3, or trade it and press the dark squares; then develop Nf3, Bd3 and the c3-Nbd2 setup and go for the classic London plan — Ne5 and a kingside build. Solid, pleasant, and low-risk.",
      sayShort: 'e6 — develop, aim for Ne5.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/London-System'],
  },
  'pro-ericrosen-sicilian::0::c3@4': {
    intro: {
      say: "c3 — White sidesteps into an Alapin against your Sicilian. Hit the centre at once with d5; after the exchange your queen recaptures actively and you develop Nc6 with tempo on d4. Black equalises comfortably by striking before White's centre can settle.",
      sayShort: 'c3 — strike d5 immediately.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
  },
  'pro-ericrosen-qgd::0::Nc3@6': {
    intro: {
      say: "Nc3 — the mainline Queen's Gambit Declined. Stay rock-solid: Be7, castle, and the classic QGD structure that fights for the centre. Trade when offered, aim for the freeing ...c5 or ...dxc4 break, and lean on the defence's legendary soundness against 1.d4.",
      sayShort: 'Nc3 — solid: Be7 and castle.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  },
  'pro-ericrosen-budapest::0::Be2@10': {
    intro: {
      say: "Be2 — White develops quietly rather than clinging to the gambit pawn. Continue in Budapest style: your knight on g4 eyes e5 and f2, the bishop on c5 rakes toward f2, and Nc6 piles onto e5. Regain the pawn and generate the active, tricky piece-play the Budapest is famous for.",
      sayShort: 'Be2 — pile on e5, stay active.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
  },
  'pro-ericrosen-closed-sicilian::0::Nc6@5': {
    intro: {
      say: "Nc6 — Black develops in the Closed Sicilian. Play the Grand-Prix plan: f4 has already staked the kingside, so Nf3, Bb5 to pressure c6, and castle for the classic f4-f5 pawn storm. The Closed sidesteps Open-Sicilian theory and hands you a clear attacking blueprint.",
      sayShort: 'Nc6 — Bb5, castle, then f5.',
    },
    sources: ['concept:pos-king-safety', 'https://www.chess.com/openings/Closed-Sicilian'],
  },
  'pro-ericrosen-scandinavian::0::d4@12': {
    intro: {
      say: "d4 — White builds the centre in the ...Nf6 Scandinavian. You have your comfortable setup: the knight regrouped to b6, the bishop fianchettoed on g7 bearing down on the centre, and easy development. Castle and pressure d4 — a sound, active Scandinavian where you never landed the exposed early queen.",
      sayShort: 'd4 — fianchetto pressure, castle.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  },
  'pro-ericrosen-french::0::Be2@10': {
    intro: {
      say: "Be2 — White develops modestly in the Advance French. Pile onto the d4-base: your queen on b6 and knight on c6 already pressure it, then reroute the knight via h6 to f5 for a third attacker while ...cxd4 rips open the c-file. The Advance French is a siege of d4, and every piece joins it.",
      sayShort: 'Be2 — besiege d4, reroute Nh6-f5.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
  },
};
