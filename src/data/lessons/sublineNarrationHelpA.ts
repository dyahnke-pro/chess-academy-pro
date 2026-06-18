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

// ── King's Indian Defence (student BLACK) — fianchetto …Bg7, …e5 break, kingside
//    storm vs White's queenside. All 5 systems share …Bg7@5. ──
const KID_BG7_BEAT = { atMove: 5, say: "…Bg7 — the King's Indian bishop, fianchettoed onto the long diagonal where it bears down on d4 and White's whole centre. Everything flows from here: castle, strike the centre with …e5, and storm the kingside with …Nd7, …f5, …f4 while White plays on the other wing.", highlights: [H('g7', KEY), H('d4', SOFT)] };
const KID_G3: SN = {
  intro: { say: "g3 — the Fianchetto King's Indian, White's most positional try: he meets your fianchetto with his own, contesting the long diagonal. Don't be passive — complete the setup, castle, and hit the centre with …e5 or the …c5 break. A rich, double-edged strategic game where Black is fully sound.", sayShort: 'g3 — fianchetto, then …e5 or …c5.' },
  beats: [KID_BG7_BEAT], sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
const KID_NF3: SN = {
  intro: { say: "Nf3 — the flexible move order, usually heading for the Classical King's Indian. Your plan never changes: fianchetto, castle, and break with …e5. Once the centre locks the King's Indian race is on — your kingside avalanche against White's queenside play.", sayShort: 'Nf3 — castle and break …e5.' },
  beats: [KID_BG7_BEAT], sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
const KID_BE2: SN = {
  intro: { say: "Be2 — the Classical King's Indian, the main battleground. White builds the broad d4-e4 centre and develops solidly. Castle, play the thematic …e5, and the lines are drawn: White pushes c5 and attacks the queenside, you hurl …f5-f4 and the pieces at his king. Trust the race — your attack usually arrives first.", sayShort: 'Be2 — Classical: …e5, then …f5-f4.' },
  beats: [KID_BG7_BEAT], sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
const KID_F3: SN = {
  intro: { say: "f3 — the Sämisch, White's most aggressive setup: a huge pawn centre with f3 bracing e4 and Be3 to come. Don't go quiet — strike with …c5, hitting d4 Benoni-style, or …e5 for the classical break. The Sämisch is critical but Black has rich, well-charted counterplay.", sayShort: 'f3 — Sämisch: strike …c5 or …e5.' },
  beats: [KID_BG7_BEAT], sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence,_S%C3%A4misch_Variation'],
};
const KID_H3: SN = {
  intro: { say: "h3 — the Makagonov, a flexible modern setup: White prepares Be3 without allowing …Ng4 and keeps the option of g4. Meet it normally — castle and break with …e5; the lost tempo on h3 means your kingside ambitions are well in time. Solid and equal.", sayShort: 'h3 — Makagonov: castle and …e5.' },
  beats: [KID_BG7_BEAT], sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};

// ── Grünfeld Defence (student BLACK) — invite the big centre, then demolish it. ──
// f3 sidestep → Benoni/KID structure.  d4 Nf6 c4 g6 f3 d6 e4 c5 d5 e6 Nc3 Bg7
const GR_F3: SN = {
  intro: { say: "f3 — White braces a huge e4-centre and sidesteps the pure Grünfeld. Don't force …d5 into it; transpose to a sharp Benoni-flavoured fight with …c5, hitting d4. After d5 you chip at the spearhead with …e6, and your fianchettoed bishop plus the queenside majority give rich counterplay against the broad centre.", sayShort: 'f3 — hit back with …c5.' },
  beats: [
    { atMove: 7, say: "…c5 — striking at d4. White's big f3-e4 centre is impressive but committal; you answer Benoni-style, and after d5 the …e6 break will gnaw at the spearhead while your dark-squared bishop rakes the long diagonal.", highlights: [H('c5', ATK), H('d4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// Modern Bf4.  d4 Nf6 c4 g6 Nc3 d5 Bf4 Bg7 Nf3 O-O Rc1 c5
const GR_BF4: SN = {
  intro: { say: "Bf4 — the modern main line. You've already played the Grünfeld's defining …d5, inviting White's broad centre precisely so you can tear it down. Develop …Bg7, castle, and strike with …c5 — the bishop on g7 and the …c5/…Nc6 pressure pull White's centre apart. Dynamic equality with real winning chances.", sayShort: 'Bf4 — …Bg7, castle, strike …c5.' },
  beats: [
    { atMove: 5, say: "…d5 — the Grünfeld's defining move and its whole philosophy: you let White build the big d4-e4 centre so you can demolish it. Everything follows — …Bg7 rakes it, …c5 and …Nc6 hammer it, and a fallen centre means a lost game for White.", highlights: [H('d5', ATK), H('c4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// Fianchetto/KID-structure (3.g3).  d4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 c5
const GR_G3: SN = {
  intro: { say: "g3 — White fianchettoes too, steering toward a quieter, symmetrical battle for the long diagonal. Stay active: complete the setup, castle, and break with …c5 against d4. With both bishops raking the long diagonals it's a rich strategic game where Black is fully equal and can play for the win.", sayShort: 'g3 — castle, then break …c5.' },
  beats: [
    { atMove: 11, say: "…c5 — the freeing break, hitting d4 and opening lines for your fianchettoed bishop. You refuse the passive game White wants and contest the centre head-on; the long-diagonal pressure cuts both ways and Black is comfortable.", highlights: [H('c5', ATK), H('d4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};

// ── anti-KID Sämisch (student WHITE) — big f3/e4 centre, O-O-O, kingside storm.
//    Nearly every Black try runs through f3@8. ──
const SAEMISCH: SN = {
  intro: { say: "The Sämisch King's Indian — your sharpest anti-KID weapon. Whatever Black plays in the tabiya, your plan is fixed: the broad f3/e4 centre, Be3 and Qd2, castle queenside, then roll g4-h4-h5 straight at his king. He counters in the centre or on the queenside; with the f3-pawn nailing down both g4 and e4, you race on the kingside and usually get there first.", sayShort: 'Sämisch — Be3, Qd2, O-O-O, g4 storm.' },
  beats: [
    { atMove: 8, say: "f3 — the foundation of the Sämisch. It braces a massive e4-centre and clears the way for Be3, Qd2 and queenside castling. With the centre nailed down, your kingside pawns — g4, h4, h5 — come crashing toward Black's king while he's still arranging his counterplay.", highlights: [H('e4', KEY), H('f3', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence,_S%C3%A4misch_Variation'],
};

export const SUBLINE_NARRATION_HELP_A: Record<string, SN> = {
  // anti-KID Sämisch — f3-based tabiya (all share f3@8)
  'anti-kid-saemisch::0::c6@9': SAEMISCH, 'anti-kid-saemisch::1::c6@9': SAEMISCH, 'anti-kid-saemisch::2::c6@9': SAEMISCH, 'anti-kid-saemisch::3::c6@9': SAEMISCH, 'anti-kid-saemisch::4::c6@9': SAEMISCH,
  'anti-kid-saemisch::0::a6@9': SAEMISCH, 'anti-kid-saemisch::1::a6@9': SAEMISCH, 'anti-kid-saemisch::2::a6@9': SAEMISCH, 'anti-kid-saemisch::3::a6@9': SAEMISCH, 'anti-kid-saemisch::4::a6@9': SAEMISCH,
  'anti-kid-saemisch::0::Nc6@11': SAEMISCH, 'anti-kid-saemisch::2::Nc6@11': SAEMISCH, 'anti-kid-saemisch::3::Nc6@11': SAEMISCH, 'anti-kid-saemisch::4::Nc6@11': SAEMISCH,
  'anti-kid-saemisch::0::e5@11': SAEMISCH, 'anti-kid-saemisch::1::e5@11': SAEMISCH, 'anti-kid-saemisch::3::e5@11': SAEMISCH, 'anti-kid-saemisch::4::e5@11': SAEMISCH,
  'anti-kid-saemisch::0::a6@11': SAEMISCH, 'anti-kid-saemisch::1::a6@11': SAEMISCH, 'anti-kid-saemisch::2::a6@11': SAEMISCH, 'anti-kid-saemisch::4::a6@11': SAEMISCH,
  'anti-kid-saemisch::0::Nbd7@11': SAEMISCH, 'anti-kid-saemisch::1::Nbd7@11': SAEMISCH, 'anti-kid-saemisch::2::Nbd7@11': SAEMISCH, 'anti-kid-saemisch::3::Nbd7@11': SAEMISCH,
  'anti-kid-saemisch::0::b6@11': SAEMISCH, 'anti-kid-saemisch::1::b6@11': SAEMISCH, 'anti-kid-saemisch::2::b6@11': SAEMISCH, 'anti-kid-saemisch::3::b6@11': SAEMISCH, 'anti-kid-saemisch::4::b6@11': SAEMISCH,
  'anti-kid-saemisch::0::c6@11': SAEMISCH, 'anti-kid-saemisch::1::c6@11': SAEMISCH, 'anti-kid-saemisch::2::c6@11': SAEMISCH, 'anti-kid-saemisch::3::c6@11': SAEMISCH, 'anti-kid-saemisch::4::c6@11': SAEMISCH,
  'anti-kid-saemisch::1::c5@11': SAEMISCH, 'anti-kid-saemisch::2::c5@11': SAEMISCH, 'anti-kid-saemisch::3::c5@11': SAEMISCH, 'anti-kid-saemisch::4::c5@11': SAEMISCH,
  // Grünfeld — f3 (all 8), Bf4 modern, g3 fianchetto
  'grunfeld-defence::0::f3@4': GR_F3, 'grunfeld-defence::1::f3@4': GR_F3, 'grunfeld-defence::2::f3@4': GR_F3, 'grunfeld-defence::3::f3@4': GR_F3, 'grunfeld-defence::4::f3@4': GR_F3, 'grunfeld-defence::5::f3@4': GR_F3, 'grunfeld-defence::6::f3@4': GR_F3, 'grunfeld-defence::7::f3@4': GR_F3,
  'grunfeld-defence::0::Bf4@6': GR_BF4, 'grunfeld-defence::1::Bf4@6': GR_BF4, 'grunfeld-defence::2::Bf4@6': GR_BF4, 'grunfeld-defence::4::Bf4@6': GR_BF4, 'grunfeld-defence::6::Bf4@6': GR_BF4, 'grunfeld-defence::7::Bf4@6': GR_BF4,
  'grunfeld-defence::0::g3@4': GR_G3, 'grunfeld-defence::1::g3@4': GR_G3, 'grunfeld-defence::2::g3@4': GR_G3, 'grunfeld-defence::3::g3@4': GR_G3, 'grunfeld-defence::4::g3@4': GR_G3, 'grunfeld-defence::6::g3@4': GR_G3, 'grunfeld-defence::7::g3@4': GR_G3,
  // King's Indian — system clusters (all share …Bg7@5)
  'kings-indian-defence::0::g3@4': KID_G3, 'kings-indian-defence::1::g3@4': KID_G3, 'kings-indian-defence::2::g3@4': KID_G3, 'kings-indian-defence::3::g3@4': KID_G3, 'kings-indian-defence::4::g3@4': KID_G3, 'kings-indian-defence::5::g3@4': KID_G3, 'kings-indian-defence::6::g3@4': KID_G3, 'kings-indian-defence::7::g3@4': KID_G3,
  'kings-indian-defence::0::Nf3@4': KID_NF3, 'kings-indian-defence::1::Nf3@4': KID_NF3, 'kings-indian-defence::2::Nf3@4': KID_NF3, 'kings-indian-defence::3::Nf3@4': KID_NF3, 'kings-indian-defence::5::Nf3@4': KID_NF3, 'kings-indian-defence::6::Nf3@4': KID_NF3, 'kings-indian-defence::7::Nf3@4': KID_NF3,
  'kings-indian-defence::0::Be2@8': KID_BE2, 'kings-indian-defence::1::Be2@8': KID_BE2, 'kings-indian-defence::2::Be2@8': KID_BE2, 'kings-indian-defence::3::Be2@8': KID_BE2, 'kings-indian-defence::5::Be2@8': KID_BE2, 'kings-indian-defence::7::Be2@8': KID_BE2,
  'kings-indian-defence::0::f3@8': KID_F3, 'kings-indian-defence::1::f3@8': KID_F3, 'kings-indian-defence::3::f3@8': KID_F3, 'kings-indian-defence::5::f3@8': KID_F3, 'kings-indian-defence::6::f3@8': KID_F3, 'kings-indian-defence::7::f3@8': KID_F3,
  'kings-indian-defence::0::h3@8': KID_H3, 'kings-indian-defence::1::h3@8': KID_H3, 'kings-indian-defence::2::h3@8': KID_H3, 'kings-indian-defence::5::h3@8': KID_H3, 'kings-indian-defence::6::h3@8': KID_H3, 'kings-indian-defence::7::h3@8': KID_H3,
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
