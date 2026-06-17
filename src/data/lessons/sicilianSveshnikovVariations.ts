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
  "sicilian-sveshnikov::Sveshnikov: Main Line 9.Nd5 (Deep)": {
  openingId: "sicilian-sveshnikov",
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
  title: "Sveshnikov — Main Line 9.Nd5 (Deep)",
  minutes: 11,
  orientation: "black",
  beats: [
    b({ id: "sv1", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5", say: "The Sveshnikov — and the bold move that defines it: …e5, kicking the d4-knight and voluntarily accepting a backward d-pawn and a hole on d5. For decades this was thought too ugly to play. Modern chess proved the opposite: the activity and the bishop pair Black gets in return are full value, and it's now one of the most respected answers to 1.e4.", sayShort: "…e5 — accept the d5-hole for activity.", highlights: [H("e5", KEY)] }),
    b({ id: "sv2", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5", say: "White probes with Ndb5 and pins with Bg5, but Black calmly kicks the knights with …a6 and …b5, gaining queenside space and chasing one knight to the dismal a3-square. White plants the other on the d5-outpost — the square Black conceded — but Black is happy to challenge it.", sayShort: "…a6, …b5 — gain space, chase the knight.", highlights: [H("b5", KEY), H("d5", SOFT)] }),
    b({ id: "sv3", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3 O-O Nc2 Bg5", say: "After …Be7, White trades on f6 and Black recaptures with the bishop — keeping the precious dark-squared bishop rather than wrecking the kingside. Castled, Black reroutes that bishop to g5, clearing the way for the thematic …f5 break that strikes back at White's centre.", sayShort: "…Bxf6, …Bg5 — keep the bishop, ready …f5.", highlights: [H("g5", KEY), H("f6", SOFT)] }),
    b({ id: "sv4", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3 O-O Nc2 Bg5 Be2 Be6 O-O", say: "Both sides complete development; …Be6 pressures the d5-knight directly. There is the Sveshnikov tabiya: Black has the two bishops, queenside space with …a6 and …b5, and the …f5 lever loaded to blow open the centre — genuine, battle-tested compensation for the d5-square. Dynamic, sound, and a true winning try with Black.", sayShort: "…Be6 — bishops, space, and the …f5 lever.", highlights: [H("e6", KEY)] }),
  ],
},

  "sicilian-sveshnikov::Sveshnikov: Novosibirsk (...Bg5 System)": {
  openingId: "sicilian-sveshnikov",
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
  title: "Sveshnikov — Novosibirsk (...Bg5)",
  minutes: 11,
  orientation: "black",
  beats: [
    b({ id: "nv1", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5", say: "The Sveshnikov again opens with …e5, accepting the d5-hole for piece activity. The Novosibirsk is a sharp, dark-square-flavoured way to handle the resulting positions, favoured by players who want more than the quiet main-line manoeuvring.", sayShort: "…e5 — the Sveshnikov foundation.", highlights: [H("e5", KEY)] }),
    b({ id: "nv2", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3", say: "The standard route to the d5-outpost: …a6 and …b5 grab queenside space, and after the trade on f6 Black recaptures with the bishop to keep his dark-squared bishop intact. White supports d5 with c3.", sayShort: "…b5, …Bxf6 — space and the dark bishop kept.", highlights: [H("b5", KEY), H("f6", SOFT)] }),
    b({ id: "nv3", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3 Bg5 Nc2 Rb8 h4 Bh6", say: "The Novosibirsk signature: …Bg5 pokes the bishop forward to provoke h4, then it drops to h6 — a more aggressive diagonal than the usual g7. Meanwhile …Rb8 prepares queenside expansion instead of hurrying to castle. Black plays for activity on the dark squares.", sayShort: "…Bh6, …Rb8 — active bishop, queenside plan.", highlights: [H("h6", KEY), H("b8", SOFT)] }),
    b({ id: "nv4", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3 Bg5 Nc2 Rb8 h4 Bh6 Be2 O-O", say: "White develops and Black finally castles. There is the Novosibirsk tabiya: the dark-squared bishop glares at White's kingside from h6, the rook is primed on b8 for …a5 and …b4, and Black has lively, dark-square-based counterplay against the d5-outpost. It scores an excellent 55% for Black at club level.", sayShort: "…O-O — the bishop bites, the rook loads.", highlights: [H("h6", KEY)] }),
  ],
},

  "sicilian-sveshnikov::Sveshnikov: ...Rb8 Expansion Plan": {
  openingId: "sicilian-sveshnikov",
  sources: ['concept:pos-outpost', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
  title: "Sveshnikov — ...Rb8 Expansion Plan",
  minutes: 10,
  orientation: "black",
  beats: [
    b({ id: "rb1", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5", say: "The Sveshnikov begins with …e5, trading a structural concession on d5 for dynamic piece play. This particular plan is all about the queenside, where Black's space advantage gives him a concrete pawn-lever to work with.", sayShort: "…e5 — the Sveshnikov, queenside in mind.", highlights: [H("e5", KEY)] }),
    b({ id: "rb2", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3 O-O", say: "Black reaches the standard tabiya: …a6 and …b5 for space, …Bxf6 keeping the dark-squared bishop, and quick castling. White's knight sits proudly on d5, but Black's whole queenside is mobile and ready to advance.", sayShort: "…b5, …O-O — queenside space, king safe.", highlights: [H("b5", KEY), H("f6", SOFT)] }),
    b({ id: "rb3", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3 O-O Nc2 Rb8 a4 bxa4 Rxa4 a5", say: "The plan unfolds: …Rb8 backs the b-pawn, and when White strikes with a4 Black takes …bxa4 and fixes the structure with …a5. Black hands back the b-file but gains a protected, advanced a-pawn and a permanent outpost on b4 for a knight. There is the tabiya — Black has a clear, concrete queenside minority plan to chew at White's pawns, the most practical of the Sveshnikov set-ups.", sayShort: "…a5 — fix the pawn, claim b4.", highlights: [H("a5", KEY), H("b8", SOFT)] }),
  ],
},

  "sicilian-sveshnikov::Sveshnikov: 9.Bxf6 gxf6 Early Exchange": {
  openingId: "sicilian-sveshnikov",
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
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
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
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
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
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
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
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
