import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Glek System variation-tab lessons. Keyed `glek-system::<variation name>` to
// match the repertoire.json variation names + the CURATED tab regexes. Every
// spine is the most-played masters/strong-player continuation (grounded, never
// invented — G3); the narration teaches the idea in the house register, and
// every board claim is true at its ply (narrationAccuracy gate).
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

const SRC = ['book:four-knights-game', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Four_Knights_Game'];

export const GLEK_SYSTEM_VARIATION_LESSONS: Record<string, LessonScript> = {
  "glek-system::Central Break: 4...d5": {
    openingId: "glek-system", title: "Glek — The Central Break", minutes: 9, orientation: "white", sources: SRC,
    beats: [
      b({ id: "cb1", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 d5", say: "The instant White plays g3, the most principled reply is to strike the centre at once with d5. Rather than allow the slow fianchetto game, Black challenges the e4-pawn immediately and tries to open the position while White's king-bishop is still at home. It is the critical test of the whole Glek.", sayShort: "d5 — the immediate central strike.", highlights: [H("d5", KEY), H("e4", SOFT)] }),
      b({ id: "cb2", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 d5 exd5 Nxd5", say: "White takes, exd5, and Black recaptures with the knight, Nxd5, planting it on a commanding central square where it eyes the c3-knight. Recapturing with the knight rather than the queen keeps the piece active and avoids handing White a tempo with a later knight jump.", sayShort: "Nxd5 — the knight seizes the centre.", highlights: [H("d5", KEY)] }),
      b({ id: "cb3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3", say: "Bg2 completes the fianchetto, and Black clarifies with Nxc3, which White answers bxc3. White accepts doubled c-pawns, but the bargain is a good one: the b-file swings half-open toward b7 and Black's queenside, and White's centre pawns on c3 and d-file give him a broad, flexible base to build on.", sayShort: "bxc3 — doubled pawns, a half-open b-file.", highlights: [H("c3", KEY), H("b7", SOFT)] }),
      b({ id: "cb4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Bc5 O-O O-O", say: "Black develops the bishop to c5, pointing toward f2, and both sides castle. The position is balanced but full of energy. White's trumps are the half-open b-file and the g2-bishop, which will rake the long diagonal the moment the f3-knight steps aside; Black leans on his healthy central pawn on e5 and quick, harmonious development.", sayShort: "Bc5, O-O — balanced, both sides ready.", highlights: [H("c5", KEY), H("f2", SOFT)] }),
      b({ id: "cb5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Bc5 O-O O-O Re1 Qf6", say: "Re1 lifts the rook behind the e-file and leans on the e5-pawn; Black centralises with Qf6, defending e5 and casting an eye toward White's kingside. The battle lines are drawn along the e-file and the two half-open flanks.", sayShort: "Re1, Qf6 — pressure the e-file.", arrows: [A("e1", "e5", VIS)], highlights: [H("e5", KEY)] }),
      b({ id: "cb6", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Bc5 O-O O-O Re1 Qf6 d3 Bb6", say: "d3 props the centre and frees the c1-bishop; Black tucks the bishop back to b6. There is the Central Break tabiya — a lively, roughly level middlegame where White's half-open b-file and the long-range g2-bishop hand him the easier, more natural plans, while Black's sound structure holds the balance.", sayShort: "d3, Bb6 — the Central Break tabiya.", highlights: [H("b6", SOFT), H("g2", KEY)] }),
    ],
  },
  "glek-system::Pin Variation: 4...Bb4": {
    openingId: "glek-system", title: "Glek — The Pin and the Kingside Storm", minutes: 9, orientation: "white", sources: SRC,
    beats: [
      b({ id: "pn1", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bb4", say: "Bb4 develops with tempo and leans on the c3-knight. Black's plan is the classic one against a knight on c3 — trade it off at the right moment and saddle White with doubled pawns. The Glek player is entirely happy to allow it.", sayShort: "Bb4 — pressure the c3-knight.", arrows: [A("b4", "c3", ATK)], highlights: [H("c3", KEY)] }),
      b({ id: "pn2", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bb4 Bg2 O-O O-O d6 d3", say: "White simply carries on with the plan — Bg2 and castling — and both sides finish developing with d6 and d3. If Black ever captures on c3, the doubled pawns arrive with a half-open b-file and the two bishops, so White is content to let the bishop sit on b4 and keep building.", sayShort: "Bg2, O-O — carry on with the plan.", highlights: [H("g2", KEY)] }),
      b({ id: "pn3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bb4 Bg2 O-O O-O d6 d3 Bg4 h3 Bh5 g4 Bg6", say: "Black pins the f3-knight with Bg4 — but White uses the moment to seize the kingside. h3 questions the bishop, and after Bh5 the striking g4! grabs space and chases the bishop all the way to g6. What looked like a placid system has suddenly sprouted a rolling kingside pawn front.", sayShort: "g4! — grab space, chase the bishop.", highlights: [H("g4", KEY), H("g6", SOFT)] }),
      b({ id: "pn4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bb4 Bg2 O-O O-O d6 d3 Bg4 h3 Bh5 g4 Bg6 Bg5 h6 Bh4", say: "Bg5 pins the f6-knight, h6 questions it, and Bh4 keeps the pin firmly alive — the bishop on h4 nails the f6-knight to the queen behind it on d8. White has grabbed kingside space with h3 and g4 and clamped Black's kingside with the pin. There is the Pin Variation tabiya: the quiet fianchetto has flowered into a real, concrete initiative.", sayShort: "Bh4 — the pin holds, the storm rolls.", arrows: [A("h4", "f6", ATK)], highlights: [H("f6", KEY), H("d8", SOFT)] }),
    ],
  },
  "glek-system::Symmetrical: 4...g6": {
    openingId: "glek-system", title: "Glek — The Symmetrical Fianchetto", minutes: 9, orientation: "white", sources: SRC,
    beats: [
      b({ id: "sy1", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 g6", say: "Black answers the fianchetto with a fianchetto of his own — g6, preparing to place the bishop on g7 along the long dark diagonal and mirror White's whole setup. Symmetry looks safe, but it hands the initiative to the side that breaks it first, and here White moves first.", sayShort: "g6 — Black mirrors the fianchetto.", highlights: [H("g7", SOFT)] }),
      b({ id: "sy2", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 g6 Bg2 Bg7 O-O O-O", say: "Both bishops take their long diagonals and both kings castle. It is a clean mirror — but White is a full move ahead in that mirror, and the extra tempo is exactly what he will use to strike in the centre before Black can arrange the same break.", sayShort: "Bg7, O-O — a mirror, White a tempo up.", highlights: [H("g2", KEY), H("g7", SOFT)] }),
      b({ id: "sy3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 h3 h6 Be3", say: "d3 and d6 prop the centres, h3 and h6 make luft, and White develops the dark-squared bishop to e3, connecting the pieces and preparing the central lever d4 that will finally crack the symmetry open.", sayShort: "Be3 — prepare the d4 break.", highlights: [H("e3", KEY), H("d4", SOFT)] }),
      b({ id: "sy4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 h3 h6 Be3 Be6 Qd2 Kh7", say: "Be6 develops the last minor piece, White connects with Qd2, and Black tucks the king to h7. Everything is poised. White has the harmonious setup and the initiative that comes from moving first — now the break.", sayShort: "Qd2 — pieces poised for the break.", highlights: [H("d2", SOFT)] }),
      b({ id: "sy5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 h3 h6 Be3 Be6 Qd2 Kh7 d4 exd4 Nxd4 Nxd4 Bxd4", say: "d4! The centre opens, and after the exchanges the dark-squared bishop lands on d4 — a monster on the long diagonal, planted opposite Black's own g7-bishop and glaring at the dark squares around the king. With the extra central pawn on e4 and both bishops raking, White has turned a symmetrical mirror into a durable space advantage. There is the Symmetrical tabiya: White broke first, and it tells.", sayShort: "Bxd4 — the bishop dominates the long diagonal.", highlights: [H("d4", KEY), H("g7", SOFT), H("e4", SOFT)] }),
    ],
  },
};
