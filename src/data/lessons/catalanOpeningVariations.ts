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
  "catalan-opening::Open Catalan: dxc4 Qc2 Recovery": {
    openingId: 'catalan-opening',
    sources: ['concept:pos-development', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
    title: 'Open Catalan — the Qc2 Recovery',
    minutes: 11,
    orientation: 'white',
    beats: [
      b({ id: 'oc1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4', say: "The Open Catalan. White fianchettoes the bishop to g2 — the soul of the whole opening — and Black snatches the c4-pawn. White is in no hurry to win it back: the long light diagonal and rapid development are worth far more than one pawn, and Black will struggle for the rest of the game to untangle the queenside.", sayShort: 'Bg2 — the Catalan bishop; …dxc4 grabs.', highlights: [H('g2', KEY), H('c4', SOFT)] }),
      b({ id: 'oc2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Be7 O-O O-O Qc2', say: "White develops and castles, then Qc2 — the cleanest way to regain the pawn, lining the queen up behind the g2-bishop on the long diagonal. Two birds: recover c4 and reinforce the pressure on b7 and the light squares. The Catalan plays itself.", sayShort: 'Qc2 — recover c4, back the bishop.', highlights: [H('c4'), H('g2', SOFT)] }),
      b({ id: 'oc3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Be7 O-O O-O Qc2 a6 Qxc4 b5 Qc2 Bb7', say: "Qxc4 takes the pawn back; Black expands with …b5 and challenges the diagonal with …Bb7. Now the two light-squared bishops face off on the great diagonal — but it is White's that is the better, supported by the queen and aiming at Black's slightly loose queenside.", sayShort: '…Bb7 — the long-diagonal duel.', highlights: [H('b7')] }),
      b({ id: 'oc4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Be7 O-O O-O Qc2 a6 Qxc4 b5 Qc2 Bb7 Bd2 Be4 Qc1 Bb7', say: "White completes development with Bd2, and the bishops manoeuvre around the long diagonal. There is the Open Catalan tabiya: White has regained the pawn, kept the better bishop and the easier development, and enjoys a small, durable pull with pressure down the c-file and on the queenside. This is the Catalan squeeze — risk-free and unpleasant to face.", sayShort: 'Bd2 — the durable Catalan pull.', highlights: [H('d2')] }),
    ],
  },

  "catalan-opening::Open Catalan: a6-b5 with a4 Break": {
    openingId: 'catalan-opening',
    sources: ['concept:pos-development', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
    title: 'Open Catalan — the a6/b5 Hold and a4 Break',
    minutes: 10,
    orientation: 'white',
    beats: [
      b({ id: 'ab1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6', say: "Black tries to cling to the extra pawn: …a6 prepares …b5 to build a queenside chain and hang on to c4. It is the most testing try against the Catalan — but holding a pawn at the cost of development is exactly the kind of greed the opening is built to punish.", sayShort: '…a6 — try to hold the c4-pawn.', highlights: [H('c4')] }),
      b({ id: 'ab2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O b5 Ne5', say: "Black grabs space with …b5, and White strikes with Ne5! — the knight leaps to a dominant central square, eyeing the queenside light holes on c6 and d7 and supporting the coming a4 break. White's pieces are flying out while Black's are still at home.", sayShort: 'Ne5 — the dominant central knight.', arrows: [A('e5', 'c6', ATK)], highlights: [H('e5')] }),
      b({ id: 'ab3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O b5 Ne5 Nd5 a4 Bb7', say: "Black blockades with …Nd5; White cracks the queenside open with a4, hammering at the base of the b5-pawn. Black props it with …Bb7, but the chain is creaking and the g2-bishop is staring straight through to a8.", sayShort: 'a4 — break open the queenside.', highlights: [H('a4'), H('b5')] }),
      b({ id: 'ab4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O b5 Ne5 Nd5 a4 Bb7 axb5 axb5 Rxa8 Bxa8', say: "axb5 …axb5, the rooks come off on a8, and White stands clearly better. The greedy pawn-grab has cost Black dearly: White's knight dominates e5, the g2-bishop rakes the long diagonal, and the loose b5-pawn and light squares are chronic weaknesses. The engine confirms a real White edge — the Catalan punishing greed exactly as designed.", sayShort: 'Rxa8 — White is clearly better.', highlights: [H('e5'), H('b5', SOFT)] }),
    ],
  },

  "catalan-opening::Catalan with ...Nbd7 Line": {
    openingId: 'catalan-opening',
    sources: ['concept:pos-development', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
    title: 'Catalan — the …Nbd7 Setup',
    minutes: 10,
    orientation: 'white',
    beats: [
      b({ id: 'nd1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4', say: "Black develops solidly with …Be7 and castles before grabbing on c4. The same Catalan story unfolds: White's fianchetto bishop and lead in development outweigh the temporary pawn, and the recovery comes naturally.", sayShort: '…dxc4 — grab after developing.', highlights: [H('c4')] }),
      b({ id: 'nd2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7', say: "Qc2 prepares the recapture and a4 clamps the queenside, stopping …b5 before it starts. Black develops the bishop to d7, heading for c6 to challenge the great diagonal — the only piece that can contest White's monster bishop.", sayShort: 'a4 — clamp …b5; …Bd7 heads for c6.', highlights: [H('a4')] }),
      b({ id: 'nd3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4 Bc6 Bf4 Nbd7', say: "Qxc4 regains the pawn, …Bc6 contests the diagonal, and White develops the dark-squared bishop to f4 with tempo. Both armies complete development around the central tension; White retains the more harmonious set-up and the easier game.", sayShort: '…Bc6 contests; Bf4 develops.', highlights: [H('c6')] }),
      b({ id: 'nd4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4 Bc6 Bf4 Nbd7 Nc3 Nb6 Qd3 Nbd5 Nxd5', say: "The pieces converge on the central d5-square — …Nb6, …Nbd5, and White trades with Nxd5. There is the …Nbd7 tabiya: a balanced, manoeuvring Catalan where White's bishop pair and queenside space give a small, comfortable pull. Nothing forced, just a pleasant long-term squeeze — the Catalan's calling card.", sayShort: 'Nxd5 — balanced, comfortable for White.', highlights: [H('d5')] }),
    ],
  },

  "catalan-opening::Catalan Declined: ...Be7 without ...dxc4": {
    openingId: 'catalan-opening',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
    title: 'Catalan Declined — the Closed Set-up',
    minutes: 11,
    orientation: 'white',
    beats: [
      b({ id: 'cd1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7', say: "The Closed Catalan — Black declines the pawn-grab entirely, keeping the centre locked with …d5 and developing the rock-solid …Be7/…Nbd7 wall. Solid, but passive: with no pawn to chase, White simply builds a big centre and squeezes from a position of total comfort.", sayShort: '…Nbd7 — the solid Closed Catalan.', highlights: [H('d5')] }),
      b({ id: 'cd2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 b3 b6 Bb2', say: "White unveils the dream set-up: Qc2, then b3 and Bb2 — a second fianchetto, so BOTH bishops rake the long diagonals at Black's position. Black's …c6 and …b6 are solid but purely defensive. White has all the space and both great bishops.", sayShort: 'b3, Bb2 — both bishops on the diagonals.', highlights: [H('b2')] }),
      b({ id: 'cd3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 b3 b6 Bb2 Bb7 Nc3 Rc8 e4', say: "Black develops …Bb7 and …Rc8, and White plays the thematic break: e4! Striking in the centre while better developed, White prises open lines exactly where his pieces are aimed. This central break is the whole point of the closed Catalan build-up.", sayShort: 'e4 — the central break, lines open.', highlights: [H('e4')] }),
      b({ id: 'cd4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 b3 b6 Bb2 Bb7 Nc3 Rc8 e4 dxe4 Nxe4 Nxe4 Qxe4', say: "After …dxe4 and the knight trades, the queen recaptures on e4, dominating the centre. There is the Closed Catalan tabiya: White owns the centre, both bishops bear down the long diagonals, and Black is solid but cramped with no counterplay. A clear, comfortable space edge — the Catalan squeeze in its purest, most positional form.", sayShort: 'Qxe4 — central domination, White presses.', highlights: [H('e4')] }),
    ],
  },

  "catalan-opening::Closed Catalan: ...c6 System": {
  openingId: "catalan-opening",
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
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
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
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
