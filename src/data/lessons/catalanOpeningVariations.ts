import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
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

export const CATALAN_OPENING_VARIATION_LESSONS: Record<string, LessonScript> = {
  "catalan-opening::Closed Catalan: ...c6 System": {
  openingId: "catalan-opening",
  title: "Catalan — The Closed System",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "cl1", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7", say: "In the Closed Catalan, Black declines the pawn: he holds the centre with d5 and develops Be7, building a solid, resilient structure instead of grabbing on c4. The g2-bishop still leans on d5 down the long diagonal, but Black is rock-solid and ready to sit tight.", sayShort: "…Be7 — Black holds d5, the Closed Catalan.", arrows: [A("g2", "d5", ATK)], highlights: [H("d5", KEY)] }),
    b({ id: "cl2", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6", say: "Nf3 O-O O-O Nbd7 Qc2 c6 — the Closed tabiya. Black's c6 props d5 into a solid pawn triangle; White's queen swings to c2, supporting the central break to come. The whole battle now turns on one question: can White engineer e4 and blow the position open for his bishops?", sayShort: "Qc2 c6 — the Closed tabiya, eyeing e4.", highlights: [H("c6", KEY), H("e4", SOFT)] }),
    b({ id: "cl3", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6 e4", say: "Nbd2 b6 e4! — there it is. White finishes preparing and plays the central break. e4 is the key freeing move of the Closed Catalan: it activates the sleeping g2-bishop and cracks open the solid centre on White's terms, just when his pieces are ideally placed.", sayShort: "e4! — the Closed Catalan's freeing break.", highlights: [H("e4", KEY)] }),
    b({ id: "cl4", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6 e4 Bb7 e5 Ne8 cxd5 cxd5", say: "Bb7 e5 Ne8 cxd5 cxd5 — White grabs space with e5, shoving the knight back to e8, then clarifies the centre. The e5-wedge cramps Black and hands White a clear space advantage with real attacking chances on the kingside, the g2-bishop now fully alive.", sayShort: "e5 — gain space, cramp Black.", highlights: [H("e5", KEY), H("d5", SOFT)] }),
    b({ id: "cl5", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6 e4 Bb7 e5 Ne8 cxd5 cxd5 Re1 Rc8 Qa4 Nc7 Nf1 b5", say: "Re1 Rc8 Qa4 Nc7 Nf1 b5 — White regroups, the knight rerouting via f1 toward e3 and the f5-outpost while the central space tells. This is the Closed Catalan tabiya: White owns the space and the better bishop and presses for a kingside attack — exactly how Wesley So ground down Firouzja.", sayShort: "Nf1 — reroute via e3 toward f5.", arrows: [A("f1", "e3", INTENT)], highlights: [H("f5", KEY), H("e3", SOFT)] }),
  ],
},

  "catalan-opening::Catalan vs Slav Setup: ...c6 and ...dxc4": {
  openingId: "catalan-opening",
  title: "Catalan — vs the Slav Move-Order",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "sl1", moves: "d4 d5 c4 c6 Nf3 Nf6 g3", say: "When Black starts with a Slav move-order, ...c6, White still fianchettoes into a Catalan-Slav with g3. The same long-diagonal pressure applies, and after Black grabs the gambit pawn with ...dxc4 White will use his development and the fianchettoed bishop to recover it with a pull.", sayShort: "g3 — the Catalan-Slav fianchetto.", highlights: [H("g3", KEY)] }),
    b({ id: "sl2", moves: "d4 d5 c4 c6 Nf3 Nf6 g3 dxc4 Bg2 g6 O-O Bg7 a4", say: "dxc4 Bg2 g6 O-O Bg7 a4 — Black takes on c4 and fianchettoes his own bishop. a4! is the key prophylaxis: it prevents Black from holding the extra pawn with ...b5. White will round up the c4-pawn at leisure while keeping the bishop's long-diagonal grip.", sayShort: "a4 — stop …b5, recover c4 later.", highlights: [H("c4", KEY), H("a4", SOFT)] }),
    b({ id: "sl3", moves: "d4 d5 c4 c6 Nf3 Nf6 g3 dxc4 Bg2 g6 O-O Bg7 a4 Ne4 Qc2 Nd6 e4", say: "Ne4 Qc2 Nd6 e4! — Black's knight hops around trying to blockade, but White builds a broad pawn centre with e4. Now the g2-bishop is backed by a big pawn front, and White enjoys space, the bishop pair, and the freer game.", sayShort: "e4! — build the broad centre.", highlights: [H("e4", KEY)] }),
    b({ id: "sl4", moves: "d4 d5 c4 c6 Nf3 Nf6 g3 dxc4 Bg2 g6 O-O Bg7 a4 Ne4 Qc2 Nd6 e4 Na6 Na3 O-O Rd1 Nb4 Qe2", say: "Na6 Na3 O-O Rd1 Nb4 Qe2 — both sides manoeuvre, and the a3-knight is ready to round up the c4-pawn while the rook centralises on d1. White has the broad centre, the bishop pair, and the long-diagonal bishop: the full Catalan-Slav squeeze. Carlsen converted exactly this kind of bind against Dreev.", sayShort: "Na3 — regain c4, the Catalan squeeze.", arrows: [A("a3", "c4", ATK)], highlights: [H("c4", KEY), H("d1", SOFT)] }),
  ],
},
};
