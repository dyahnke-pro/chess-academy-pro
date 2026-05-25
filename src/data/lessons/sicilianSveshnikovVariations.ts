import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_svesh-content.json (validated against the gate
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

export const SICILIAN_SVESHNIKOV_VARIATION_LESSONS: Record<string, LessonScript> = {
  "sicilian-sveshnikov::Sveshnikov: 9.Bxf6 gxf6 Early Exchange": {
  openingId: "sicilian-sveshnikov",
  title: "Sveshnikov — The 9.Bxf6 Early Exchange",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "exchange", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6", say: "Instead of retreating, White grabs the knight with Bxf6. After gxf6 Black's kingside pawns are doubled and battered — but look closer: Black gains the bishop pair, the half-open g-file, and a massive pawn centre with e5 and f5 still to come.", sayShort: "gxf6 — doubled pawns, but bishops and centre.", highlights: [H("f6", KEY), H("e5", SOFT)] }),
    b({ id: "nd5-f5", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 f5", say: "White rushes the knight to the d5-hole; Black answers with f5, the thematic break, blasting open the centre and the f-file for the rook. The ugly doubled f-pawn turns into a battering ram.", sayShort: "f5 — the doubled pawn becomes a battering ram.", highlights: [H("d5", KEY), H("f5", KEY)] }),
    b({ id: "bishops", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 f5 Bd3 Be6 Qh5 Bg7", say: "Both sides develop toward the fight — Bd3 and Qh5 eye Black's loosened king, but Be6 challenges the proud d5-knight and Bg7 rakes the long diagonal toward White's king. Black's two bishops and open lines bring dangerous attacking chances of his own.", sayShort: "Be6 hits d5; Bg7 rakes the long diagonal.", arrows: [A("e6", "d5", ATK)], highlights: [H("g7", KEY)] }),
    b({ id: "verdict", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 f5 Bd3 Be6 Qh5 Bg7", say: "The early exchange is a true test of understanding: Black's structure looks wrecked, but the bishop pair, the open g-file, and the e5 and f5 pawn duo generate ferocious activity. Modern theory trusts Black fully — the dynamic factors more than pay for the doubled pawns.", sayShort: "Dynamics pay for the doubled pawns.", highlights: [H("e5", KEY), H("f5", SOFT)] }),
  ],
},

  "sicilian-sveshnikov::Sveshnikov: Chelyabinsk (c4 System)": {
  openingId: "sicilian-sveshnikov",
  title: "Sveshnikov — The Chelyabinsk c4 Bind",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "c4", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c4", say: "The Chelyabinsk approach: instead of the modest c3, White slams down c4 — the bind. The idea is to clamp the b5-pawn and the queenside light squares, freeze Black's expansion, and cement the powerful knight on d5.", sayShort: "c4 — the bind, clamping b5 and d5.", highlights: [H("c4", KEY), H("d5", SOFT)] }),
    b({ id: "b4", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c4 b4", say: "Black refuses to be squeezed: b4. The pawn jabs at the c3-square and gains queenside space, carving out a protected post on c5 for a piece. The bind is challenged the moment it appears.", sayShort: "b4 — jab the bind, grab c5.", highlights: [H("b4", KEY), H("c5", SOFT)] }),
    b({ id: "castle", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c4 b4 Nc2 O-O", say: "White reroutes the knight to c2 to target the b4-pawn; Black castles, completing development with the bishop pair and a ready a5 and Be6 to follow. Against the bind, Black's trumps are the two bishops and the eternal f5 break.", sayShort: "Castle — the two bishops fight the bind.", highlights: [H("c2", KEY), H("b4", SOFT)] }),
  ],
},

  "sicilian-sveshnikov::Anti-Sveshnikov: 6.Nf3 Quiet Retreat": {
  openingId: "sicilian-sveshnikov",
  title: "Sveshnikov — The Anti-Sveshnikov 6.Nf3",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "nf3", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Nf3", say: "Not wanting a theoretical battle, White simply retreats the knight to f3 — the Anti-Sveshnikov. It is solid but unambitious: Black keeps the big e5 centre, develops freely, and reaches equal chances without memorising any deep theory.", sayShort: "Nf3 retreat — Black equalises easily.", highlights: [H("e5", KEY), H("f3", SOFT)] }),
    b({ id: "develop", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Nf3 h6 Bc4 Be7 O-O O-O", say: "Black plays the useful h6 to deny g5, then develops naturally with Be7 and castling. With the centre secure and no White knight on d5, this is a comfortable, classical Sicilian where Black has nothing at all to fear.", sayShort: "h6 and Be7 — comfortable development.", highlights: [H("h6", KEY), H("e7", SOFT)] }),
    b({ id: "equal", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Nf3 h6 Bc4 Be7 O-O O-O Qe2 Bc5 Be3 Bxe3", say: "Black even seizes the initiative — Bc5 develops actively, and after Be3 the trade on e3 leaves White with no advantage whatsoever. The Anti-Sveshnikov has handed Black a free, equal game; White's caution earned nothing.", sayShort: "Bxe3 — trade off, fully equal.", highlights: [H("e3", KEY), H("c5", SOFT)] }),
  ],
},

  "sicilian-sveshnikov::Sveshnikov: Kalashnikov (4...e5 5.Nb5 d6)": {
  openingId: "sicilian-sveshnikov",
  title: "Sveshnikov — The Kalashnikov",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "kalash", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5", say: "The Kalashnikov — Black plays e5 immediately, before developing the knight to f6. It is the Sveshnikov's bolder cousin: Black grabs the centre at once and dares White to try to exploit the d5-hole.", sayShort: "e5 at once — the bold Kalashnikov.", highlights: [H("e5", KEY), H("d5", SOFT)] }),
    b({ id: "bind", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nb5 d6 c4 Be7", say: "White checks in with Nb5 and clamps down with c4 — a Maroczy-style bind, since Black has no quick b5 here. Black develops calmly with d6 and Be7, and the game becomes a patient maneuvering struggle around the d5-square.", sayShort: "c4 binds; Black develops patiently.", highlights: [H("c4", KEY), H("d5", SOFT)] }),
    b({ id: "develop", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nb5 d6 c4 Be7 N1c3 a6 Na3 Be6", say: "The knights shuffle — a6 chases the b5-knight to the offside a3-square — and Be6 challenges the key d5-square head-on. Black's pieces find their squares while White's a3-knight sits stranded on the rim.", sayShort: "Be6 — challenge d5, a3-knight offside.", arrows: [A("e6", "d5", VIS)], highlights: [H("a3", KEY)] }),
    b({ id: "plan", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nb5 d6 c4 Be7 N1c3 a6 Na3 Be6 Nc2 Nf6 Be2 Rc8", say: "White reroutes to c2; Black completes with Nf6 and Rc8 onto the half-open c-file. The verdict: the bind gives White a pull, but Black is solid and active, with the c-file, the d5-fight, and a later f5 or b5 break for full counterplay.", sayShort: "Rc8 — the c-file and the d5-fight.", highlights: [H("c8", KEY), H("d5", SOFT)] }),
  ],
},
};
