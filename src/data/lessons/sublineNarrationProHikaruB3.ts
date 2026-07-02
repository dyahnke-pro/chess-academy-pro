import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Hikaru Nimzo-Larsen + Réti (student WHITE), the b3 /
// Bb2 hypermodern systems. Grounded in his own teaching (transcripts reference-
// only, prose original, house voice). Core plan: b3 and Bb2 on the long
// diagonal, e3/Nf3, then undermine Black's centre with c4 and d4 and manoeuvre.
// Board-safe forward-looking plans. Keyed by deviation.

const NL = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Larsen%27s_Opening'];
const RE = ['concept:pos-center', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'];

export const SUBLINE_NARRATION_PRO_HIKARU_B3: Record<string, SublineNarration> = {
  // ===== Nimzo-Larsen =====
  'pro-hikaru-nimzo-larsen::0::e4@7': {
    intro: { say: "e4 — Black gains space, pushing the pawn past your knight. This is the Larsen's invitation: the advanced e4-pawn is overextended. Play around it with Ne2 or Nd4, undermine with d3 or f3, and the pawn becomes a target. Provoke the advance, then win it.", sayShort: 'e4 — Ne2, undermine the pawn.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::g6@5': {
    intro: { say: "g6 — Black fianchettos against your Larsen. Strike the centre with d4, opening the long diagonal for your Bb2; develop Nf3 and Be2, and the pressure down the a1-h8 diagonal gives active, hypermodern play.", sayShort: 'g6 — d4 opens the diagonal, develop.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::Be7@9': {
    intro: { say: "Be7 — Black repositions the bishop. Continue Nf3, castle, and play in the centre with d4 or f4; your long-diagonal bishop and flexible pieces give a pleasant hypermodern game. Patience, then break.", sayShort: 'Be7 — Nf3, then break in the centre.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::a6@9': {
    intro: { say: "a6 — Black questions your bishop. Continue the plan: keep or trade the bishop, develop Nf3 and prepare d4 or c4; the Bb2 on the long diagonal and your flexible setup give a comfortable game. Hypermodern piece play.", sayShort: 'a6 — develop, keep the Bb2 firing.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::O-O@9': {
    intro: { say: "O-O — Black castles. Develop Nf3, and prepare the central break with d4 or the e4 clamp; your Bb2 rakes the long diagonal toward Black's kingside, giving real attacking chances. Build and strike.", sayShort: 'O-O — Nf3 and d4, aim the Bb2.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::e4@9': {
    intro: { say: "e4 — Black lunges the pawn forward. Overextended pawns are the Larsen's food: reroute with Nd4 or Ng1-e2, undermine with d3 or f3, and the e4-pawn falls or becomes weak. Provoke, then punish.", sayShort: 'e4 — reroute, undermine, win it.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::d6@7': {
    intro: { say: "d6 — Black supports e5 solidly. Continue Nf3 and prepare c4 and d4, or trade on c6 to damage the structure; the Bb2's long-diagonal pressure and your flexible setup give a comfortable hypermodern game.", sayShort: 'd6 — Nf3, prepare c4 and d4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::1::Bf5@5': {
    intro: { say: "Bf5 — Black develops the bishop actively. Continue e3, Be2 and c4, undermining the d5-pawn; your Bb2 pressures the centre from afar and c4 chips at it. Hypermodern play against the classical centre.", sayShort: 'Bf5 — e3 and c4, chip at d5.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::1::e6@5': {
    intro: { say: "e6 — Black plays solidly. Develop e3, Be2 and c4, building the flexible Réti-Larsen structure; pressure d5 with c4 and the Bb2, and manoeuvre for the central break. A comfortable, low-theory game.", sayShort: 'e6 — e3 and c4, pressure d5.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::1::c5@5': {
    intro: { say: "c5 — Black claims queenside space. Develop e3, Be2, and prepare c4 or d4; the Bb2 eyes the long diagonal and your flexible pieces handle the broad Black centre. Hypermodern manoeuvring.", sayShort: 'c5 — e3, then c4 or d4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::1::Bg4@5': {
    intro: { say: "Bg4 — Black pins toward your knight. Play e3 and h3 or Be2, breaking the pin, then c4 to challenge d5; the Bb2's long-diagonal pressure and your flexible pieces give a comfortable game.", sayShort: 'Bg4 — e3 and c4, break the pin.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::2::d5@9': {
    intro: { say: "d5 — Black claims the centre in the double fianchetto. Play c4, challenging d5, develop, and press with the Bb2 on the long diagonal; the flexible Réti-Larsen structure gives a pleasant manoeuvring game.", sayShort: 'd5 — c4, pressure with the Bb2.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::2::c5@9': {
    intro: { say: "c5 — Black strikes the centre. Play d4, and after the tension resolves your Bb2 rakes the long diagonal while you develop Be2 and c4; a comfortable hypermodern game with active pieces.", sayShort: 'c5 — d4, then the Bb2 fires.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::2::b6@9': {
    intro: { say: "b6 — Black double-fianchettos. Continue Be2 and castle, then prepare c4 and the central break; against the symmetric setup your extra tempo lets you strike first. Patient manoeuvring, then a timely break.", sayShort: 'b6 — Be2 and c4, break first.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::2::e5@13': {
    intro: { say: "e5 — Black grabs central space in a King's-Indian-style setup. Meet it with d5 or dxe5, keeping the Bb2's diagonal open; manoeuvre with Nbd2 and c4, and press the queenside where your space tells.", sayShort: 'e5 — d5 or dxe5, keep the diagonal.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::3::d5@5': {
    intro: { say: "d5 — Black builds a broad centre. Develop e3, Be2 and c4, undermining d5; your Bb2 pressures from the flank and c4 chips at the centre. Flexible, low-risk manoeuvring.", sayShort: 'd5 — e3 and c4, undermine it.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::4::e6@5': {
    intro: { say: "e6 — Black mirrors your double fianchetto. Play g3 and Bg2, completing your own setup; against the symmetric structure the extra tempo lets you break first with c4 or d4. Manoeuvre patiently, then strike.", sayShort: 'e6 — g3 and Bg2, break first.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::4::g6@7': {
    intro: { say: "g6 — Black double-fianchettos. Develop e3, Be2 or g3 and Bg2, and prepare the central break with c4 and d4; your Bb2 and extra tempo give a comfortable, one-sided manoeuvring game.", sayShort: 'g6 — develop, prepare c4 and d4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::6::Nbd7@7': {
    intro: { say: "Nbd7 — Black develops solidly. Continue Be2 or Bd3, castle, and prepare c4 and the central break; the Bb2 eyes the long diagonal and your flexible setup gives a pleasant, low-theory game.", sayShort: 'Nbd7 — develop, prepare c4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::6::Bd6@7': {
    intro: { say: "Bd6 — Black develops the bishop actively. Continue Nf3, Be2 and c4, challenging the centre; your Bb2 rakes the long diagonal and c4 pressures d5. Flexible, pleasant manoeuvring.", sayShort: 'Bd6 — c4, pressure the centre.' }, sources: NL,
  },

  // ===== Réti (b3 system) =====
  'pro-hikaru-reti::0::d5@9': {
    intro: { say: "d5 — Black claims the centre in the Réti-b3. Play c4, challenging d5, develop Be2, and press with the Bb2 on the long diagonal; the flexible structure gives a comfortable manoeuvring game where you break when ready.", sayShort: 'd5 — c4, pressure with the Bb2.' }, sources: RE,
  },
  'pro-hikaru-reti::0::c5@9': {
    intro: { say: "c5 — Black strikes the centre. Play d4, and after the tension your Bb2 rakes the diagonal; develop Be2 and c4, and manoeuvre with a small, pleasant edge. Hypermodern piece play.", sayShort: 'c5 — d4, then the Bb2 fires.' }, sources: RE,
  },
  'pro-hikaru-reti::0::b6@9': {
    intro: { say: "b6 — Black double-fianchettos back. Continue Be2 and castle, then prepare c4; against the symmetric setup your extra tempo lets you break first in the centre. Patient manoeuvring, then a timely c4 or e4.", sayShort: 'b6 — Be2 and c4, break first.' }, sources: RE,
  },
  'pro-hikaru-reti::0::Re8@13': {
    intro: { say: "Re8 — Black prepares …e5 in the Réti. Continue c4 and a knight to c3 or d2, and meet …e5 with d5 or dxe5, keeping the Bb2's diagonal; manoeuvre and press the queenside. A comfortable structural game.", sayShort: 'Re8 — c4, meet …e5 with d5.' }, sources: RE,
  },
  'pro-hikaru-reti::1::Bf5@5': {
    intro: { say: "Bf5 — Black develops the bishop before …e6. Play e3, Be2 and c4, undermining d5; your Bb2 pressures the centre from afar. The Réti chips at the classical centre with pieces and the c-pawn.", sayShort: 'Bf5 — e3 and c4, chip at d5.' }, sources: RE,
  },
  'pro-hikaru-reti::1::Bg4@5': {
    intro: { say: "Bg4 — Black pins toward your knight. Play e3 and h3 or Be2, breaking the pin, then c4 to challenge d5; the Bb2's long-diagonal pressure and your flexible pieces give a comfortable game.", sayShort: 'Bg4 — e3 and c4, break the pin.' }, sources: RE,
  },
  'pro-hikaru-reti::1::Bd6@7': {
    intro: { say: "Bd6 — Black develops actively. Continue c4 and a knight to c3, challenging the centre; your Bb2 rakes the long diagonal and c4 pressures d5. Flexible, pleasant manoeuvring.", sayShort: 'Bd6 — c4, pressure the centre.' }, sources: RE,
  },
  'pro-hikaru-reti::1::c5@7': {
    intro: { say: "c5 — Black stakes the queenside. Play c4, developing into a Réti/English structure; your Bb2 and the pressure down the c-file and long diagonal give a comfortable game. Manoeuvre and break when ready.", sayShort: 'c5 — c4, into a Réti structure.' }, sources: RE,
  },
  'pro-hikaru-reti::1::g6@5': {
    intro: { say: "g6 — Black double-fianchettos. Play c4 and g3 with Bg2, a Catalan-Réti structure; pressure d5 with c4 and both bishops on the long diagonals. Flexible, positional, one-sided manoeuvring.", sayShort: 'g6 — c4 and g3, pressure d5.' }, sources: RE,
  },
  'pro-hikaru-reti::2::d6@5': {
    intro: { say: "d6 — Black plays solidly against your …c5 line. Strike with d4, opening the position for your Bb2; develop Be2 or g3 and Bg2 and castle, pressing with the long-diagonal bishop. A comfortable Réti-into-open game.", sayShort: 'd6 — d4 opens it, the Bb2 fires.' }, sources: RE,
  },
  'pro-hikaru-reti::2::Nf6@7': {
    intro: { say: "Nf6 — Black develops with a broad centre. Play e3, Be2 and c4, undermining d5; your Bb2 pressures from the flank and c4 chips at the centre. Flexible, low-risk manoeuvring.", sayShort: 'Nf6 — e3 and c4, undermine d5.' }, sources: RE,
  },
  'pro-hikaru-reti::2::Nf6@5': {
    intro: { say: "Nf6 — Black develops naturally. Continue Bb2, e3 and c4, building the Réti structure; your long-diagonal bishop and the c-pawn pressure the centre. Manoeuvre patiently, then break.", sayShort: 'Nf6 — e3 and c4, build the Réti.' }, sources: RE,
  },
};
