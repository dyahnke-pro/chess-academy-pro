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
  "english-opening::English: Symmetrical Variation": {
  openingId: "english-opening",
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
