import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_najdorf-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const SICILIAN_NAJDORF_VARIATION_LESSONS: Record<string, LessonScript> = {
  "sicilian-najdorf::Najdorf: English Attack (6.Be3 Main Line)": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The English Attack (6.Be3)",
  minutes: 10,
  orientation: "black",
  beats: [
    b({ id: "ea1", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5", say: "The English Attack — White's most testing modern try: Be3, f3, Qd2 and queenside castling, then g4-g5 and a kingside pawn storm. Black strikes immediately with e5, grabbing central space and kicking the d4-knight off its perch before White is set.", sayShort: "e5 — hit the knight, claim the centre.", highlights: [H("e5", KEY)] }),
    b({ id: "ea2", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be7 f3 Be6", say: "The knight retreats to b3, and Black develops naturally — Be7 and Be6, the bishop settling on e6 where it guards the d5-hole and eyes the queenside light squares. Black's set-up is harmonious and rock-solid.", sayShort: "Be6 — guard d5, eye the queenside.", arrows: [A("e6", "d5", VIS)], highlights: [H("e6", KEY), H("d5", SOFT)] }),
    b({ id: "ea3", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be7 f3 Be6 Qd2 Nbd7 O-O-O b5", say: "Qd2 and O-O-O commit White to the kingside attack — and Black answers in kind with b5, the queenside pawn storm under way at once. Opposite-side castling means it is a pure race, and Black's b5-b4 lever points straight at the white king.", sayShort: "b5 — the queenside storm begins.", highlights: [H("b5", KEY)] }),
    b({ id: "ea4", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be7 f3 Be6 Qd2 Nbd7 O-O-O b5 g4 b4 Na4", say: "g4 launches White's storm, b4 fires Black's — and the knight is chased to the rim with Na4, awkwardly offside. There is the English Attack tabiya: two pawn avalanches racing at opposite kings, dead level by the engine and famously double-edged. Black's counterplay arrives on time, and the practical results are excellent.", sayShort: "b4 — chase the knight, the race is even.", highlights: [H("b4", KEY), H("a4", SOFT)] }),
  ],
},

  "sicilian-najdorf::Najdorf: Classical (6.Be2 with ...e5)": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The Classical 6.Be2",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "quiet", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5", say: "Against the calm Be2 Classical, Black grabs the centre with e5. White will not storm here — it is a positional game, and the whole fight revolves around the d5-square.", sayShort: "e5 — claim the centre vs the quiet Be2.", highlights: [H("e5", KEY), H("d5", SOFT)] }),
    b({ id: "develop", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6", say: "Both sides develop and castle short. Black's bishop settles on e6, guarding d5; the entire struggle is whether White can plant a piece on that hole or Black can keep it covered.", sayShort: "Be6 guards d5; Black is solid.", arrows: [A("e6", "d5", VIS)], highlights: [H("e6", KEY)] }),
    b({ id: "knight-d5", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5 Nbd7", say: "White occupies the hole with Nd5, but Black is unfazed — Nbd7 develops and prepares to challenge or trade the knight with a later Nxd5. The structure is sound and the position fully equal; Black has the easier plans on the queenside.", sayShort: "Nbd7 — challenge the d5-knight, equal.", highlights: [H("d5", KEY), H("d7", SOFT)] }),
  ],
},

  "sicilian-najdorf::Najdorf: 6.Bg5 Main Line (with e6 and f4)": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The 6.Bg5 Main Line",
  minutes: 7,
  orientation: "black",
  beats: [
    b({ id: "bg5", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6", say: "The classical 6.Bg5 — White pins the f6-knight and plays for a quick f4 and kingside expansion. Black answers with the flexible e6, building the small, solid centre that has anchored Najdorf players for generations.", sayShort: "Bg5 and e6 — the classical main line.", highlights: [H("g5", KEY), H("e6", SOFT)] }),
    b({ id: "setup", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7", say: "White builds with f4, Qf3 and castles long; Black develops Be7, Qc7 and Nbd7, all pointing at the queenside. The battle lines are drawn: White storms with g4 and g5, Black counters with b5 and b4 down the half-open c-file.", sayShort: "Qc7 and Nbd7 — ready the b5 counter.", highlights: [H("c7", KEY), H("d7", SOFT)] }),
    b({ id: "race", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 b5", say: "White lunges g4, Black fires b5 — the two storms are off. Both attacks come at full tilt; in this line a single tempo can decide the game, and Black's queenside play is famously fast.", sayShort: "g4 vs b5 — the storms collide.", highlights: [H("g4", KEY), H("b5", KEY)] }),
    b({ id: "trade", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 b5 Bxf6 Nxf6", say: "White trades on f6 to loosen Black's grip and speed the attack, but Nxf6 recaptures naturally and Black's counterplay rolls on, with b4 to follow. A razor-sharp, deeply analysed battlefield where the well-prepared Black player scores heavily.", sayShort: "Nxf6 recaptures; b4 comes next.", highlights: [H("f6", KEY)] }),
  ],
},

  "sicilian-najdorf::Najdorf: Poisoned Pawn (6.Bg5 Qb6)": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The Poisoned Pawn",
  minutes: 7,
  orientation: "black",
  beats: [
    b({ id: "qb6", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qb6", say: "The Poisoned Pawn — one of the boldest ideas in all of chess. Instead of quietly defending, Black plays Qb6, attacking the b2-pawn and daring White to prove that the whole attack is worth a single pawn.", sayShort: "Qb6 — eye the poisoned b2-pawn.", highlights: [H("b6", KEY), H("b2", KEY)] }),
    b({ id: "grab", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qb6 Qd2 Qxb2 Rb1 Qa3", say: "White offers it with Qd2; Black snatches — Qxb2! After Rb1 the queen slips out to a3, safe and active. Black is a clean pawn up, and the entire question becomes whether White's lead in development and open lines are real compensation. Decades of analysis say Black holds.", sayShort: "Qxb2 then Qa3 — snatch and survive.", highlights: [H("b2", KEY), H("a3", SOFT)] }),
    b({ id: "counter", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qb6 Qd2 Qxb2 Rb1 Qa3 e5 dxe5 fxe5 Nfd7", say: "White strikes with e5 to blow open the centre; Black coolly trades and retreats the knight to d7, untangling. This is the Poisoned Pawn's essence: grab the material, weather the storm with precise defence, and emerge a pawn up into a winning endgame.", sayShort: "Nfd7 — untangle, a pawn ahead.", highlights: [H("e5", KEY), H("d7", SOFT)] }),
  ],
},

  "sicilian-najdorf::Najdorf: 6.f3 English Attack Move Order": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The 6.f3 Move Order",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "f3", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 f3 e5", say: "With 6.f3 White heads for the English Attack by a different route, playing f3 before Be3 to sidestep some of Black's options. Black reacts identically — e5, taking the centre and the same active Najdorf game.", sayShort: "e5 — meet the f3 move order head-on.", highlights: [H("f3", SOFT), H("e5", KEY)] }),
    b({ id: "cover", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 f3 e5 Nb3 Be6 Be3 Be7", say: "The knight drops to b3 and Black plugs the d5-hole with Be6, then develops Be7 — the standard, reliable English Attack setup, reached here by the f3 road.", sayShort: "Be6 — cover d5, develop Be7.", arrows: [A("e6", "d5", VIS)], highlights: [H("e6", KEY)] }),
    b({ id: "race", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 f3 e5 Nb3 Be6 Be3 Be7 Qd2 O-O O-O-O Nbd7", say: "White castles long with Qd2 ready; Black castles and plays Nbd7, preparing the b5 and b4 break. The race is on — Black's queenside attack against White's pawn storm, exactly as in the main English Attack.", sayShort: "Nbd7 — prep the b5 and b4 break.", highlights: [H("d7", KEY), H("b5", SOFT)] }),
  ],
},

  "sicilian-najdorf::Najdorf: Fischer-Sozin Attack (6.Bc4)": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The Fischer-Sozin Attack",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "bc4", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6", say: "The Fischer-Sozin — White throws the bishop to c4, aiming the whole battery at f7 and the e6-square. Black blunts it immediately with e6, building a solid wall and preparing rapid queenside expansion.", sayShort: "e6 — wall off the c4-bishop.", highlights: [H("c4", KEY), H("e6", SOFT)] }),
    b({ id: "expand", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6 Bb3 Be7 f3 O-O Qe2 b5", say: "White retreats the bishop to b3 and prepares to castle long; Black develops and strikes with b5, the thematic Najdorf expansion. The b-pawn comes with tempo, gaining space and eyeing b4 to chase the c3-knight.", sayShort: "b5 — the Najdorf queenside expansion.", highlights: [H("b5", KEY), H("b3", SOFT)] }),
    b({ id: "b4", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6 Bb3 Be7 f3 O-O Qe2 b5 Be3 b4", say: "Be3 develops, and b4 strikes — kicking the c3-knight and opening the b-file and the long diagonal for Black's pieces. Against the Fischer-Sozin's kingside aims, Black's queenside counterattack is fast and concrete.", sayShort: "b4 — chase the knight, open lines.", highlights: [H("b4", KEY), H("c3", SOFT)] }),
  ],
},

  "sicilian-najdorf::Najdorf: Adams Attack (6.g3 Fianchetto)": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The 6.g3 Fianchetto",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "g3", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 e5", say: "The fianchetto approach — g3 and Bg2, a quiet positional setup aiming the bishop down the long light-square diagonal. Black takes the centre with e5; the knight must retreat awkwardly to e2, and Black reaches an easy game.", sayShort: "e5 — punish the slow g3 setup.", highlights: [H("g3", SOFT), H("e5", KEY)] }),
    b({ id: "develop", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 e5 Nde2 Be7 Bg2 O-O O-O Nbd7", say: "The knight reroutes via e2, White fianchettoes and castles. Black develops naturally — Be7, short castling, Nbd7 — with comfortable equality and the half-open c-file waiting for later queenside play.", sayShort: "Nbd7 — develop, fully comfortable.", highlights: [H("d7", KEY), H("e2", SOFT)] }),
    b({ id: "expand", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 e5 Nde2 Be7 Bg2 O-O O-O Nbd7 a4 Rb8", say: "White plays a4 to restrain b5; Black calmly reroutes with Rb8, preparing the b5 break anyway after due preparation. Against the quiet g3 setup Black equalises easily and keeps all the winning chances of a Najdorf structure.", sayShort: "Rb8 — prepare b5 despite a4.", highlights: [H("b8", KEY), H("a4", SOFT)] }),
  ],
},

  "sicilian-najdorf::Najdorf: 6.Be3 ...Ng4 (Bishop Trade Attempt)": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The 6.Be3 Ng4 Line",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "ng4", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 Ng4", say: "Against 6.Be3, the immediate Ng4 is a sharp try — Black attacks the bishop at once, trying to provoke a trade or a concession before White can finish building the English Attack.", sayShort: "Ng4 — harass the e3-bishop at once.", arrows: [A("g4", "e3", ATK)] }),
    b({ id: "chase", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 Ng4 Bg5 h6 Bh4 g5 Bg3", say: "The bishop dodges to g5, but h6 and g5 chase it all the way to g3, gaining big kingside space in the process. Black's pawns roll forward and White's bishop is shut out of the game.", sayShort: "h6 and g5 — kick the bishop, grab space.", highlights: [H("g3", KEY), H("g5", SOFT)] }),
    b({ id: "bishop", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 Ng4 Bg5 h6 Bh4 g5 Bg3 Bg7 Qd2 Nc6", say: "Black completes the fianchetto with Bg7 and follows with Nc6. Don't read this fianchetto as routine — the g7-bishop and the c6-knight now BOTH bear down on d4, and piling that doubled pressure onto White's centralised knight is the entire point of the g5-and-Bg7 plan. Behind the knight the bishop also eyes c3 and the dark squares around White's queenside. The Ng4 sortie bought space and the two bishops: an aggressive, double-edged Najdorf where Black plays for the initiative.", sayShort: "Bg7 and Nc6 — both pile onto d4.", arrows: [A("c6", "d4", ATK)], highlights: [H("g7", KEY), H("d4", SOFT)] }),
  ],
},

  "sicilian-najdorf::Najdorf: Anti-Najdorf (6.a4)": {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "Najdorf — The Anti-Najdorf 6.a4",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "a4", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 a4 e5", say: "With a4 White prevents Black's b5 break before anything else — the Anti-Najdorf. Black shrugs and plays e5, taking the centre; the game becomes a quieter positional Najdorf where Black is completely fine.", sayShort: "e5 — a4 stops b5, so grab the centre.", highlights: [H("a4", KEY), H("e5", SOFT)] }),
    b({ id: "develop", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 a4 e5 Nb3 Be7 Be2 O-O O-O Be6", say: "Both sides develop quietly and castle short. Black's bishop covers d5 from e6, the structure is rock-solid, and with the b5 break held back Black simply manoeuvres for the central d5 break or play down the c-file instead.", sayShort: "Be6 covers d5; Black is solid.", arrows: [A("e6", "d5", VIS)], highlights: [H("e6", KEY)] }),
    b({ id: "plan", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 a4 e5 Nb3 Be7 Be2 O-O O-O Be6 Be3 Nbd7", say: "Be3 and Nbd7 complete the setup. Without the b5 lever Black shifts plans — rerouting the knight toward the c5 outpost or preparing a central d5 break — and keeps a sound, equal game with chances for both sides. The a4-pull cost White a little time, too.", sayShort: "Nbd7 — reroute toward c5 and d5.", highlights: [H("d7", KEY), H("c5", SOFT)] }),
  ],
},
};
