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

  "reti-opening::Reti: Accepted dxc4 Bxc4": {
    openingId: "reti-opening", title: "Réti Accepted — the e4-e5 expansion plan", minutes: 8, orientation: "white",
    sources: ["concept:pos-center", "concept:pos-development", "https://en.wikipedia.org/wiki/R%C3%A9ti_Opening"],
    beats: [
      { id: "ra1", moves: ["Nf3", "d5", "c4", "dxc4", "e3", "Nf6", "Bxc4"], say: "Black takes c4 and White recaptures with the bishop after the quiet e3 — a Queen's Gambit Accepted with colours conserved: no weaknesses, the bishop already active, and the centre still to be claimed.", sayShort: "Bxc4 — the pawn returns, bishop active.", highlights: [{ square: "c4", color: "rgba(255,214,0,0.88)" }] },
      { id: "ra2", moves: ["Nf3", "d5", "c4", "dxc4", "e3", "Nf6", "Bxc4", "e6", "O-O", "c5", "d4", "a6", "dxc5", "Bxc5", "Qe2", "O-O"], say: "…c5 challenges and dxc5 …Bxc5 trades the d-pawns away entirely — no isolated pawn, no target, just pieces. Qe2 is the tell: the queen steps behind the e-pawn, and the e4-e5 plan is loaded.", sayShort: "Qe2 — e4 is loaded.", highlights: [{ square: "e2", color: "rgba(80,140,255,0.32)" }, { square: "e4", color: "rgba(255,214,0,0.88)" }] },
      { id: "ra3", moves: ["Nf3", "d5", "c4", "dxc4", "e3", "Nf6", "Bxc4", "e6", "O-O", "c5", "d4", "a6", "dxc5", "Bxc5", "Qe2", "O-O", "e4", "b5", "Bd3", "Nc6"], say: "e4! — the centre White declined to build on move one arrives on move nine, at full strength. …b5 gains a tempo on the bishop, which re-posts to d3, and …Nc6 develops, but the geometry has changed: White owns the centre lanes and the initiative.", sayShort: "e4 — the delayed centre, full strength.", highlights: [{ square: "e4", color: "rgba(255,214,0,0.88)" }, { square: "d3", color: "rgba(80,140,255,0.32)" }] },
      { id: "ra4", moves: ["Nf3", "d5", "c4", "dxc4", "e3", "Nf6", "Bxc4", "e6", "O-O", "c5", "d4", "a6", "dxc5", "Bxc5", "Qe2", "O-O", "e4", "b5", "Bd3", "Nc6", "e5", "Nb4"], say: "e5! drives the f6-knight's anchor away and grabs kingside territory; …Nb4 hits the d3-bishop in return. The engine gives White a steady plus: the e5-spearhead, the safer structure, and every minor piece pointed at Black's king. The Réti Accepted in one lesson — give the centre early to take it back better.", sayShort: "e5 — take the centre back, better.", arrows: [{ from: "b4", to: "d3", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "e5", color: "rgba(255,214,0,0.88)" }] },
    ],
  },

  "reti-opening::Reti: Reti Gambit": {
    openingId: "reti-opening", title: "Réti Gambit — tempo after tempo on the queen", minutes: 8, orientation: "white",
    sources: ["concept:pos-tempo", "concept:pos-development", "https://en.wikipedia.org/wiki/R%C3%A9ti_Opening"],
    beats: [
      { id: "rg1", moves: ["Nf3", "d5", "c4", "d4", "e3"], say: "…d4 grabs space and e3! undermines it immediately — the Réti Gambit. White isn't sacrificing for material; he's buying the thing the whole opening trades in: time.", sayShort: "e3 — undermine; buy time.", highlights: [{ square: "d4", color: "rgba(255,214,0,0.88)" }, { square: "e3", color: "rgba(80,140,255,0.32)" }] },
      { id: "rg2", moves: ["Nf3", "d5", "c4", "d4", "e3", "Nc6", "exd4", "Nxd4", "Nxd4", "Qxd4"], say: "The trades run: exd4, knights come off, and …Qxd4 leaves Black's queen alone in the centre on move five. Material is level. Now count how many developing moves White gets to play with tempo against her.", sayShort: "…Qxd4 — the queen stands alone.", highlights: [{ square: "d4", color: "rgba(255,214,0,0.88)" }] },
      { id: "rg3", moves: ["Nf3", "d5", "c4", "d4", "e3", "Nc6", "exd4", "Nxd4", "Nxd4", "Qxd4", "Nc3", "e5", "d3", "Bc5", "Be3"], say: "Nc3 — tempo one. …e5 props the queen and …Bc5 develops, and Be3! leans on the c5-bishop while shielding the e-file. Every White move develops with a threat; every Black move answers one.", sayShort: "Be3 — develop with threats, always.", highlights: [{ square: "c5", color: "rgba(80,140,255,0.32)" }] },
      { id: "rg4", moves: ["Nf3", "d5", "c4", "d4", "e3", "Nc6", "exd4", "Nxd4", "Nxd4", "Qxd4", "Nc3", "e5", "d3", "Bc5", "Be3", "Qd6", "Ne4", "Bb4+", "Bd2", "Bxd2+", "Qxd2"], say: "…Qd6 retreats and Ne4! hits the d6-queen and the c5-bishop at once — tempo three and four in the same move. Black bails out with …Bb4 check and trades, and Qxd2 tallies the account: dead level by the engine, but White's pieces flowed onto their squares while Black's queen toured the board. In practice, that flow decides games.", sayShort: "Ne4 — queen and bishop, one move.", arrows: [{ from: "e4", to: "d6", color: "rgba(40,185,95,0.92)" }, { from: "e4", to: "c5", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "e4", color: "rgba(255,214,0,0.88)" }] },
    ],
  },

  "reti-opening::Reti: Reversed Benoni": {
    openingId: "reti-opening", title: "Réti vs …d4 — a Benko a tempo up", minutes: 8, orientation: "white",
    sources: ["concept:pos-space", "concept:pawn-fianchetto", "https://en.wikipedia.org/wiki/R%C3%A9ti_Opening"],
    beats: [
      { id: "rb1", moves: ["Nf3", "d5", "c4", "d4", "b4"], say: "…d4 stakes the wedge, and b4! answers — White plays a Benko Gambit structure with an extra tempo and without giving a pawn. The queenside bishop will live on the long diagonal the …d4-pawn just vacated.", sayShort: "b4 — a Benko, a move up.", highlights: [{ square: "b4", color: "rgba(255,214,0,0.88)" }, { square: "d4", color: "rgba(80,140,255,0.32)" }] },
      { id: "rb2", moves: ["Nf3", "d5", "c4", "d4", "b4", "g6", "Bb2", "Bg7", "g3", "e5"], say: "Double fianchetto: Bb2 bites at d4 and beyond, g3 preps the second bishop. Black builds the full wedge with …e5 — ambitious, and every pawn on a dark square feeds the b2-bishop's dreams.", sayShort: "Bb2 — feed on the dark squares.", arrows: [{ from: "b2", to: "d4", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "e5", color: "rgba(80,140,255,0.32)" }] },
      { id: "rb3", moves: ["Nf3", "d5", "c4", "d4", "b4", "g6", "Bb2", "Bg7", "g3", "e5", "d3", "Ne7", "Bg2", "O-O", "O-O", "Nd7"], say: "Both sides castle and Black re-routes …Ne7 and …Nd7 to hold the e5/d4 chain. White's setup is complete and flexible — and the thematic knight route is about to open.", sayShort: "O-O — the chain vs the diagonals.", highlights: [{ square: "d4", color: "rgba(80,140,255,0.32)" }, { square: "e5", color: "rgba(80,140,255,0.32)" }] },
      { id: "rb4", moves: ["Nf3", "d5", "c4", "d4", "b4", "g6", "Bb2", "Bg7", "g3", "e5", "d3", "Ne7", "Bg2", "O-O", "O-O", "Nd7", "Nbd2", "c5", "a3", "Rb8", "Ne4", "b6"], say: "Nbd2 heads for the hole: after …c5 and a3 (holding b4), Ne4! plants the knight on the square the …f-pawn never got to cover — biting d6, f6 and the c5-pawn. The engine gives White a steady pull: the Benko squeeze, played by the side with the extra move. That's the whole pitch of the Réti against …d4.", sayShort: "Ne4 — the octopus vs the wedge.", arrows: [{ from: "e4", to: "d6", color: "rgba(40,185,95,0.92)" }, { from: "e4", to: "c5", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "e4", color: "rgba(255,214,0,0.88)" }] },
    ],
  },
};
