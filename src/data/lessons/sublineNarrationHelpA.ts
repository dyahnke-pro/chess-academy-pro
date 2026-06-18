import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration as SN } from '../../services/sublineLesson';

// HELPER A (claude oversight session took over after Helper A died, David
// 2026-06-18) — Indian-family bucket of the d4-flank narration tail. This file
// is the A group's map; spread in the merge BEFORE the helper override files, so
// these are first-class authored entries (not overrides). Every line is hand-
// written and board-verified against course-sublines.json (G3).
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

// ── Queen's Indian (student BLACK) — light-square control: the …Bb7 fianchetto
//    and the …d5 central challenge. ──
// 3.Nc3 → transposes to a Nimzo.  d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd2 d5
const QID_NC3: SN = {
  intro: {
    say: "Nc3 — and this slides straight into Nimzo-Indian territory. Answer …Bb4, pinning the knight that guards e4 and fighting at once for the key light square. From here it's pure Nimzo: trade the bishop for the knight to wreck White's c-pawns, or hold the pin and keep the squeeze. Either road is a comfortable, well-charted equality.",
    sayShort: 'Nc3 — transpose: pin with …Bb4.',
  },
  beats: [
    { atMove: 5, say: "…Bb4 — the Nimzo pin. The bishop nails the c3-knight to the king, and since that knight is e4's defender, you immediately contest the central light square White wants most. White must resolve the tension on your terms.", highlights: [H('c3', KEY), H('e4', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// 3.g3 fianchetto.  d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O
const QID_G3: SN = {
  intro: {
    say: "g3 — White heads for the fianchetto, planning to rule the long light diagonal with Bg2. Don't let him: strike the centre immediately with …d5. By challenging c4 and d4 head-on before the bishop settles, you blunt its diagonal and reach a sound, Catalan-flavoured game where Black equalises comfortably.",
    sayShort: 'g3 — challenge at once with …d5.',
  },
  beats: [
    { atMove: 5, say: "…d5 — staking your claim in the centre before White's g2-bishop can dominate. The pawn hits c4 and contests d4, blunting the very long diagonal the fianchetto was built to own. Meet the bishop's reach with a direct central challenge.", highlights: [H('d5', ATK), H('c4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// …b6 systems (3.Nf3 b6) where White plays quietly — the …Bb7 fianchetto.
// e.g. …Nf3 b6 a3 Bb7 / …Nf3 b6 Nc3 Bb7 / …Nf3 b6 e3 Bb7 — all reach …Bb7@7.
const QID_BB7: SN = {
  intro: {
    say: "However White shuffles his pieces in the …b6 Queen's Indian, your plan is the same — the light-square fianchetto. …Bb7 trains the bishop down the long diagonal at e4, the square the whole opening is fought over. You'll follow with …Be7, …O-O and the …d5 break, contesting the light squares White also craves. Solid, flexible, richly strategic.",
    sayShort: '…Bb7 — fianchetto, fight for e4.',
  },
  beats: [
    { atMove: 7, say: "…Bb7 — the soul of the Queen's Indian. The bishop fianchettoes onto the long diagonal, x-raying e4 — the central light square both sides crave. From here you contest that square with pieces and the …d5 break, never conceding the light-square battle.", arrows: [A('b7', 'e4')], highlights: [H('e4', KEY), H('b7', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};

export const SUBLINE_NARRATION_HELP_A: Record<string, SN> = {
  // Nimzo transposition (3.Nc3)
  'queens-indian::0::Nc3@4': QID_NC3,
  'queens-indian::1::Nc3@4': QID_NC3,
  'queens-indian::2::Nc3@4': QID_NC3,
  'queens-indian::3::Nc3@4': QID_NC3,
  'queens-indian::4::Nc3@4': QID_NC3,
  'queens-indian::5::Nc3@4': QID_NC3,
  'queens-indian::6::Nc3@4': QID_NC3,
  // Fianchetto (3.g3)
  'queens-indian::0::g3@4': QID_G3,
  'queens-indian::1::g3@4': QID_G3,
  'queens-indian::2::g3@4': QID_G3,
  'queens-indian::3::g3@4': QID_G3,
  'queens-indian::4::g3@4': QID_G3,
  'queens-indian::5::g3@4': QID_G3,
  'queens-indian::6::g3@4': QID_G3,
  // …b6 / …Bb7 systems (all reach …Bb7@7)
  'queens-indian::0::a3@6': QID_BB7,
  'queens-indian::2::a3@6': QID_BB7,
  'queens-indian::3::a3@6': QID_BB7,
  'queens-indian::4::a3@6': QID_BB7,
  'queens-indian::5::a3@6': QID_BB7,
  'queens-indian::6::a3@6': QID_BB7,
  'queens-indian::0::Nc3@6': QID_BB7,
  'queens-indian::1::Nc3@6': QID_BB7,
  'queens-indian::3::Nc3@6': QID_BB7,
  'queens-indian::4::Nc3@6': QID_BB7,
  'queens-indian::5::Nc3@6': QID_BB7,
  'queens-indian::0::e3@6': QID_BB7,
  'queens-indian::1::e3@6': QID_BB7,
  'queens-indian::2::e3@6': QID_BB7,
  'queens-indian::3::e3@6': QID_BB7,
  'queens-indian::4::e3@6': QID_BB7,
  'queens-indian::5::e3@6': QID_BB7,
};
