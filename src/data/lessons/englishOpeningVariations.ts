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

export const ENGLISH_OPENING_VARIATION_LESSONS: Record<string, LessonScript> = {
  "english-opening::English: Reversed Sicilian": {
    openingId: 'english-opening', title: 'English — the Reversed Sicilian', minutes: 11, orientation: 'white',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/English_Opening'],
    beats: [
      b({ id: 'rs1', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5', say: "The Reversed Sicilian — Black answers 1.c4 with …e5, and the position becomes a Sicilian with colours reversed and White a full tempo up. Why recommend it? Because everything you know about the Sicilian now works for you, with an extra move: White fianchettoes the king's bishop and plays for queenside and central pressure a tempo ahead, while Black's d5-centre becomes the very target White's set-up is built to exploit.", sayShort: 'g3 — a Sicilian a tempo up.', highlights: [H('d5', SOFT)] }),
      b({ id: 'rs2', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3', say: "cxd5 …Nxd5, and after Bg2 and castling White has the harmonious reversed-Dragon set-up: the g2-bishop on the long diagonal, the knight ready to hop, and d3 keeping the structure flexible. Black's centre looks impressive, but it is also a target — exactly the role White's pieces are built to exploit.", sayShort: 'Bg2, d3 — harmonious reversed-Dragon.', highlights: [H('d3', SOFT)] }),
      b({ id: 'rs3', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O Be3 Be6 Rc1 f6 Na4 Nxa4 Qxa4', say: "White completes development — Be3, Rc1 onto the half-open c-file — and plays Na4 to trade a pair of knights, easing toward the squares he wants. Black props the centre with …Be6, but there is the Reversed-Sicilian tabiya: White has the c-file, the long-diagonal bishop, and the easier game, with the extra tempo translating into a small, durable pull. A low-theory way to play for a win with White.", sayShort: 'Qxa4 — c-file, bishop, the tempo-up pull.', highlights: [H('e6', SOFT)] }),
    ],
  },

  "english-opening::English: Botvinnik System": {
    openingId: 'english-opening', title: 'English — the Botvinnik System', minutes: 10, orientation: 'white',
    sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/English_Opening'],
    beats: [
      b({ id: 'bv1', moves: 'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 e4', say: "The Botvinnik System — White's most ambitious English set-up. The signature is e4: combined with the c4-pawn, it builds the famous Botvinnik clamp, a pair of pawns gripping the key d5- and f5-squares. Behind the g2-bishop, White takes a big slice of the centre and plays for a long-term space squeeze.", sayShort: 'e4 — the c4+e4 Botvinnik clamp.', highlights: [H('e4'), H('c4', SOFT)] }),
      b({ id: 'bv2', moves: 'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 e4 d6 Nge2 f5 d3 Nf6 O-O O-O Nd5', say: "White develops the knight to e2 (not f3, keeping the f-pawn free), plays d3, and castles. The key leap is Nd5 — planting the knight on the magnificent central outpost the c4/e4 clamp created, where it cannot be chased by a pawn and dominates the position. Black strikes the clamp with …f5, the thematic counter.", sayShort: 'Nd5 — the dominating central outpost.', highlights: [H('d5')] }),
      b({ id: 'bv3', moves: 'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 e4 d6 Nge2 f5 d3 Nf6 O-O O-O Nd5 Nxd5 cxd5 Ne7 f4', say: "After …Nxd5 cxd5 White's pawn takes the outpost, gaining queenside space and a protected wedge; …Ne7 retreats, and White strikes with f4, opening lines on the kingside where his space is. There is the Botvinnik tabiya: White owns the centre and the d5-wedge, has space on both wings, and a clear plan — a powerful, low-theory squeeze that has scored heavily for over fifty years.", sayShort: 'f4 — open the kingside, total clamp.', highlights: [H('d5'), H('f4', SOFT)] }),
    ],
  },

  "english-opening::Bremen System": {
    openingId: 'english-opening', title: 'English — the Bremen System (g3 + b4)', minutes: 10, orientation: 'white',
    sources: ['concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/English_Opening'],
    beats: [
      b({ id: 'br1', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6', say: "The Bremen — White's clean, flexible Reversed-Sicilian treatment with an early kingside fianchetto. After cxd5 …Nxd5, the knight retreats to b6, and White's plan crystallises: fianchetto, castle, then expand on the queenside with a3 and b4, using the extra tempo to seize space where Black is committed in the centre.", sayShort: 'Bg2 — fianchetto, plan a3-b4.', highlights: [H('d5', SOFT)] }),
      b({ id: 'br2', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 a3', say: "Castled and safe, White plays a3 — the quiet prelude to b4. The point is pure Reversed-Sicilian strategy: gain queenside space with the pawn storm, open the b-file or fix targets, and let the g2-bishop and the c-file do the rest. Black's big centre will need constant tending while White expands.", sayShort: 'a3 — prepare the b4 space-grab.', highlights: [H('a3', SOFT)] }),
      b({ id: 'br3', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 a3 O-O b4 Be6 d3 f6', say: "b4 grabs the queenside space, …Be6 and …f6 prop Black's centre, and the battle lines are set. There is the Bremen tabiya: White has queenside space, the long-diagonal bishop, the half-open c-file and an easy, risk-free plan of b5 and minority pressure; Black must defend a big but static centre. A pleasant, strategic pull with White and almost nothing to memorise.", sayShort: 'b4 — queenside space, risk-free pull.', highlights: [H('b4'), H('e6', SOFT)] }),
    ],
  },

  "english-opening::Ultra-Symmetrical Variation": {
    openingId: 'english-opening', title: 'English — the Ultra-Symmetrical', minutes: 10, orientation: 'white',
    sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/English_Opening'],
    beats: [
      b({ id: 'us1', moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O', say: "The Ultra-Symmetrical — Black mirrors every move, both sides fianchettoing into a double-Maróczy structure with the c4- and c5-pawns staking the centre. It looks dead drawn, but White has one priceless asset: the move. The recommendation is to use that tempo decisively — be the first to break the symmetry and gain space, forcing Black to react a tempo behind.", sayShort: 'O-O — symmetric, but White has the move.', highlights: [H('c4', SOFT)] }),
      b({ id: 'us2', moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d3 d6 a3 a6 Rb1', say: "White unveils the plan first: d3, then a3 and Rb1, all preparing the b4 break. Because White moves first, he reaches this set-up a tempo ahead of Black's mirror — and that single tempo is enough to be the one who opens lines and grabs space on the queenside.", sayShort: 'Rb1 — load the b4 break first.', highlights: [H('b4', SOFT)] }),
      b({ id: 'us3', moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d3 d6 a3 a6 Rb1 Rb8 b4 cxb4', say: "b4 breaks the symmetry, and after …cxb4 White will have the queenside majority rolling and the open lines first. There is the Ultra-Symmetrical tabiya: a tiny but real pull, the whole point being that the extra tempo lets White act while Black reacts. Risk-free, strategic, and a model of how to squeeze a win out of a symmetrical structure.", sayShort: 'b4 — break first, the tempo tells.', highlights: [H('b4')] }),
    ],
  },

  "english-opening::English: Symmetrical Variation": {
  openingId: "english-opening",
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/English_Opening'],
  title: "English — The Symmetrical Variation",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "sy1", moves: "c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7", say: "The Symmetrical English — Black mirrors with c5 and both sides fianchetto. The g7- and g2-bishops glare at one another down the long diagonal. As in every symmetrical position, the player who breaks the mirror at the right moment takes over — and White, moving first, holds that key.", sayShort: "Bg2 vs Bg7 — the symmetrical fianchetto.", highlights: [H("g2", KEY), H("g7", SOFT)] }),
    b({ id: "sy2", moves: "c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d4", say: "Nf3 Nf6 O-O O-O d4! — there is the break. White strikes in the centre, the one move that shatters the symmetry, opening the long diagonal for the g2-bishop and grabbing the initiative the extra tempo provides.", sayShort: "d4! — break the symmetry in the centre.", highlights: [H("d4", KEY)] }),
    b({ id: "sy3", moves: "c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d4 cxd4 Nxd4 Nxd4 Qxd4 d6", say: "cxd4 Nxd4 Nxd4 Qxd4 d6 — the trades leave the queen powerfully centralised on d4. Together with the g2-bishop, White controls the long diagonal and enjoys the extra space: this is the Maróczy-style English bind, a classic positional clamp.", sayShort: "Qxd4 — centralise, the English bind.", highlights: [H("d4", KEY)] }),
    b({ id: "sy4", moves: "c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d4 cxd4 Nxd4 Nxd4 Qxd4 d6 Qd3 a6 Bd2 Rb8 Rac1", say: "Qd3 a6 Bd2 Rac1 — White retreats the queen to safety, develops the dark-squared bishop, and seizes the half-open c-file with the rook. The recurring English plan: pile up on the c-file and squeeze the queenside.", sayShort: "Rac1 — seize the c-file.", highlights: [H("c1", KEY)] }),
    b({ id: "sy5", moves: "c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d4 cxd4 Nxd4 Nxd4 Qxd4 d6 Qd3 a6 Bd2 Rb8 Rac1 Bf5 e4 Bd7", say: "Bf5 e4 Bd7 — White claims the full centre with e4, clamping Black in a broad Maróczy bind. The Symmetrical English tabiya: White owns the space, the c-file, and the better minor pieces — the small but enduring pull the extra tempo guarantees.", sayShort: "e4 — the broad Maróczy clamp.", highlights: [H("e4", KEY)] }),
  ],
},

  "english-opening::Mikenas Attack": {
  openingId: "english-opening",
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/English_Opening'],
  title: "English — The Mikenas-Carls Attack",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "mi1", moves: "c4 e6 Nc3 Nf6 e4", say: "The Mikenas-Carls Attack — the sharpest face of the English. After ...Nf6 and ...e6, White slams e4 into the centre. This direct, aggressive thrust throws Black onto the defensive immediately and steers the quiet English into open, tactical waters.", sayShort: "e4 — the aggressive Mikenas thrust.", highlights: [H("e4", KEY)] }),
    b({ id: "mi2", moves: "c4 e6 Nc3 Nf6 e4 d5 e5 d4", say: "d5 e5! d4 — White pushes e5, kicking the f6-knight away and grabbing space; Black hits back with d4, attacking the c3-knight. The centre is on fire and both sides must calculate precisely — a world away from the slow fianchetto lines.", sayShort: "e5! d4 — the centre catches fire.", highlights: [H("e5", KEY), H("d4", SOFT)] }),
    b({ id: "mi3", moves: "c4 e6 Nc3 Nf6 e4 d5 e5 d4 exf6 dxc3 bxc3 Qxf6", say: "exf6 dxc3 bxc3 Qxf6 — when the dust settles White has doubled c-pawns but a powerful pawn centre, the half-open b- and e-files, and a clear lead in development. The structural blemish is a small price for the activity and the open lines pointing at Black's position.", sayShort: "bxc3 — doubled pawns, but big activity.", highlights: [H("c3", KEY)] }),
    b({ id: "mi4", moves: "c4 e6 Nc3 Nf6 e4 d5 e5 d4 exf6 dxc3 bxc3 Qxf6 Nf3 e5 Bd3 Na6 O-O Bd6 Bc2", say: "Nf3 e5 Bd3 Na6 O-O Bd6 Bc2 — White develops with real purpose, the bishop rerouting to c2 where it rakes the b1-h7 diagonal straight at Black's king. The Mikenas gives White a sustained, dangerous initiative for the doubled pawns.", sayShort: "Bc2 — the bishop aims at h7.", arrows: [A("c2", "h7", ATK)], highlights: [H("h7", KEY)] }),
    b({ id: "mi5", moves: "c4 e6 Nc3 Nf6 e4 d5 e5 d4 exf6 dxc3 bxc3 Qxf6 Nf3 e5 Bd3 Na6 O-O Bd6 Bc2 Bg4 d4 Bxf3", say: "Bg4 d4 Bxf3 — White builds the big pawn centre with d4. We reach the Mikenas tabiya: White has the central pawn mass, the bishop trained on h7, and the more active position. Next to that initiative, the doubled c-pawns are an irrelevance — exactly how Caruana beat So.", sayShort: "d4 — the central pawn mass rolls.", highlights: [H("d4", KEY)] }),
  ],
},
};
