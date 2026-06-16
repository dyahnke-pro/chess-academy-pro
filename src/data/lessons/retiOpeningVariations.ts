import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
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

export const RETI_OPENING_VARIATION_LESSONS: Record<string, LessonScript> = {
  "reti-opening::Reti: Advance c4 d4": {
    openingId: 'reti-opening', title: 'Réti — the c4/d4 Advance (Big Centre)', minutes: 11, orientation: 'white',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
    beats: [
      b({ id: 'ad1', moves: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7', say: "The most ambitious face of the Réti. Why recommend it? Because White gets the best of both worlds: the flexible Nf3/g3/Bg2 development of the Réti, but with c4 already in to fight for the centre. Black sets up a solid Queen's-Gambit-style wall with …e6 and …Be7, and White will simply build a broad pawn centre behind the fianchetto.", sayShort: 'Bg2 — flexible Réti, but c4 is in.', highlights: [H('c4', SOFT)] }),
      b({ id: 'ad2', moves: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O d4 c6 Nc3 Nbd7 Qc2', say: "White castles and then plays d4 — transposing into a Catalan-flavoured structure with the broad c4+d4 centre and the monster g2-bishop. Nc3 and Qc2 complete the harmonious build-up, all pointing at the centre and the e4-break to come. This is the recommendation's engine: maximum central space, zero weaknesses.", sayShort: 'd4, Qc2 — the broad centre is built.', highlights: [H('d4'), H('c4', SOFT)] }),
      b({ id: 'ad3', moves: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O d4 c6 Nc3 Nbd7 Qc2 b6 e4', say: "Black develops …b6 to free the light-squared bishop, and White strikes: e4! The whole point of the set-up. White seizes the full classical centre — pawns on c4, d4 and e4 — while better developed and perfectly coordinated. The break opens the position exactly when White is ready for it.", sayShort: 'e4 — seize the full centre.', highlights: [H('e4')] }),
      b({ id: 'ad4', moves: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O d4 c6 Nc3 Nbd7 Qc2 b6 e4 dxe4 Nxe4 Bb7', say: "After …dxe4 Nxe4 the knight lands on a dominant central square and …Bb7 contests the long diagonal. This is the recommended line's payoff, and the numbers confirm it: White scores around seventy percent in master practice from here. Why? A space advantage, the better bishop, the central knight, and the easier game — a genuine, lasting edge with no risk. That is the Réti Advance in a sentence.", sayShort: 'Nxe4 — central knight, ~70% for White.', highlights: [H('e4')] }),
    ],
  },

  "reti-opening::Reti: KIA Setup g3 Bg2 d3 e4": {
    openingId: 'reti-opening', title: 'Réti — the KIA Setup (d3/e4)', minutes: 10, orientation: 'white',
    sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
    beats: [
      b({ id: 'ks1', moves: 'Nf3 d5 g3 c6 Bg2 Bg4 O-O Nd7 d3 Ngf6', say: "The King's-Indian-Attack treatment of the Réti — recommended because it is almost theory-free and lets White play the same plan against nearly anything. White fianchettoes, castles, and plays the modest d3, keeping the centre fluid. Black develops naturally; White simply prepares one specific, powerful break.", sayShort: 'd3 — the low-theory KIA setup.', highlights: [H('d3', SOFT)] }),
      b({ id: 'ks2', moves: 'Nf3 d5 g3 c6 Bg2 Bg4 O-O Nd7 d3 Ngf6 Nbd2 e5 e4', say: "Black takes the centre with …e5, and White strikes the thematic blow: e4! This is the whole reason to play the system. White challenges d5 on his own terms, and the g2-bishop, until now biting on granite, is about to spring to life along the long diagonal once the centre opens.", sayShort: 'e4 — the thematic central strike.', highlights: [H('e4'), H('e5', SOFT)] }),
      b({ id: 'ks3', moves: 'Nf3 d5 g3 c6 Bg2 Bg4 O-O Nd7 d3 Ngf6 Nbd2 e5 e4 dxe4 dxe4 Bc5 h3 Bh5 Qe1 O-O', say: "After …dxe4 dxe4 the position opens, and White finishes harmoniously — h3 questions the g4-bishop, Qe1 unpins and eyes a kingside swing. There is the recommended tabiya: White has comfortable central space, the long-diagonal bishop, and easy, risk-free development, scoring solidly above fifty percent. A whole repertoire in one memorisable plan — that is its appeal.", sayShort: 'Qe1 — comfortable space, easy plan.', highlights: [H('e4')] }),
    ],
  },

  "reti-opening::Reti: LSB Fianchetto": {
    openingId: 'reti-opening', title: 'Réti — the Fianchetto with e4-e5 Space', minutes: 10, orientation: 'white',
    sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
    beats: [
      b({ id: 'lf1', moves: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5', say: "Another low-theory Réti recommendation, this time playing for kingside space. White develops the same flexible fianchetto and d3 set-up; Black expands with …c5 on the queenside. The plan is a clean division of the board: Black takes the queenside, White will take the kingside and the centre.", sayShort: '…c5 — Black queenside, White will take the centre.', highlights: [H('c5', SOFT)] }),
      b({ id: 'lf2', moves: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6 Re1 b5 e5', say: "e4 and then e5! That advance is the reason to choose this line. White gains a big kingside space wedge on e5, gaining a tempo on the f6-knight and clamping Black's position. The g2-bishop's diagonal opens and White's pieces flood toward the kingside, where the attack will be.", sayShort: 'e5 — the space-gaining kingside wedge.', highlights: [H('e5')] }),
      b({ id: 'lf3', moves: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6 Re1 b5 e5 Nd7 Nf1 a5 Bf4 Ba6', say: "Black retreats …Nd7 and pushes …b5/…a5 on the queenside, while White reroutes — Nf1 heading for g3 or e3 to support a kingside build-up, Bf4 eyeing the dark squares. There is the tabiya: the classic opposite-wings race, but White's e5-wedge and kingside attacking chances make it comfortable and dangerous to face. White plays for the king; that is the recommendation.", sayShort: 'Nf1, Bf4 — reroute for the kingside attack.', highlights: [H('e5'), H('a5', SOFT)] }),
    ],
  },

  "reti-opening::Reti: Nimzo-English Hybrid": {
    openingId: 'reti-opening', title: 'Réti — the Nimzo-English Double Fianchetto', minutes: 10, orientation: 'white',
    sources: ['concept:pos-development', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
    beats: [
      b({ id: 'ne1', moves: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3', say: "The double-fianchetto Réti — recommended for the player who likes pure, low-risk pressure. After the kingside fianchetto, White adds b3, preparing Bb2 so that BOTH bishops will rake the long diagonals at Black's centre and queenside. No pawn weaknesses, no theory traps — just two great bishops and a flexible structure.", sayShort: 'b3 — prepare the second fianchetto.', highlights: [H('b3', SOFT)] }),
      b({ id: 'ne2', moves: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6 e3 b6 d4', say: "Bb2 completes the double fianchetto, and after Black mirrors with …c5 and …b6, White plays d4 — striking in the centre with both bishops already aimed through it. The point of the build-up: open the position only when White's pieces are the better placed to exploit it.", sayShort: 'd4 — strike with both bishops aimed.', highlights: [H('d4'), H('b2', SOFT)] }),
      b({ id: 'ne3', moves: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6 e3 b6 d4 Bb7 Nc3 Rc8 Rc1 cxd4', say: "Both sides complete development — …Bb7 and …Rc8 against Rc1 — and the central tension resolves with …cxd4. There is the Nimzo-English tabiya: a balanced, manoeuvring middlegame where White's two fianchettoed bishops and pressure down the c- and d-files give a small, persistent pull with essentially no risk. Master practice bears it out — this is the safe, pressing Réti, and that risk-free pressure is exactly why it is recommended.", sayShort: '…cxd4 — balanced, two-bishop pressure.', highlights: [H('b7', SOFT), H('d4')] }),
    ],
  },

  "reti-opening::Reti: Anti-Slav": {
  openingId: "reti-opening",
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
  title: "Réti — The Anti-Slav (...Bf5)",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "as1", moves: "Nf3 d5 c4 c6 g3 Nf6 Bg2 Bf5", say: "Against a Slav-like ...c6, Black develops his light-squared bishop actively to f5 before ...e6 can shut it in — the Anti-Slav Réti. White's plan is clear: challenge the centre with cxd5 and lean on the d5-pawn and the queenside with a quick Qb3 and the g2-bishop.", sayShort: "…Bf5 — the active Anti-Slav bishop.", highlights: [H("f5", KEY), H("d5", SOFT)] }),
    b({ id: "as2", moves: "Nf3 d5 c4 c6 g3 Nf6 Bg2 Bf5 cxd5 cxd5 Qb3 Qb6 Qxb6 axb6", say: "cxd5 cxd5 Qb3 Qb6 Qxb6 axb6 — White invites the queen trade with Qb3, which hits both the b6-square and the d5-pawn. After the swap Black is saddled with doubled b-pawns, a small but permanent structural weakness on the queenside that White will play against for the rest of the game.", sayShort: "Qb3 — trade into Black's doubled b-pawns.", highlights: [H("b6", KEY), H("d5", SOFT)] }),
    b({ id: "as3", moves: "Nf3 d5 c4 c6 g3 Nf6 Bg2 Bf5 cxd5 cxd5 Qb3 Qb6 Qxb6 axb6 Nc3 Nc6 d3 e6 O-O Bc5 Bf4 O-O", say: "Nc3 Nc6 d3 e6 O-O Bc5 Bf4 O-O — White develops harmoniously, the dark-squared bishop landing on f4 to rake toward c7 and the weak queenside. This is the Anti-Slav verdict: White has the healthier structure and easy pressure on the doubled b-pawns, a pleasant, risk-free endgame edge — exactly how Giri beat Aronian.", sayShort: "Bf4 — press c7 and the doubled pawns.", arrows: [A("f4", "c7", ATK)], highlights: [H("c7", KEY)] }),
  ],
},
};
