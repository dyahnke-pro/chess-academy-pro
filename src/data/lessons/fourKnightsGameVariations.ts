import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
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

export const FOUR_KNIGHTS_GAME_VARIATION_LESSONS: Record<string, LessonScript> = {
  "four-knights-game::Scotch Four Knights: 4.d4 exd4 5.Nxd4": {
  openingId: "four-knights-game",
  sources: ['book:four-knights-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
  title: "Four Knights — The Scotch Four Knights",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "sf1", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 d4", say: "Tired of the slow symmetrical grind? Play d4. This is the Scotch Four Knights — White refuses the quiet manoeuvring battle and cracks the centre open at once, just like the Scotch Game proper. The e5-pawn is hit, Black must take, and the locked centre that defines the quiet lines simply disappears. Open, free, fast piece play, with all four knights already out.", sayShort: "d4 — crack the centre open at once.", highlights: [H("d4", KEY), H("e5", SOFT)] }),
    b({ id: "sf2", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4", say: "exd4 Nxd4 — and there it is, the Scotch knight centralised on d4, eyeing c6 and f5 at once. This dominant central knight is the whole point: a piece that strong in the middle of the board is worth a tempo of development, as Edward Lasker taught. The symmetry is gone, the lines are open, and White's pieces are ready to pour out.", sayShort: "Nxd4 — the centralised Scotch knight.", arrows: [A("d4", "c6", ATK), A("d4", "f5", INTENT)], highlights: [H("d4", KEY)] }),
    b({ id: "sf3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6", say: "Bb4 pins the c3-knight, and White uncoils with Nxc6 bxc6 — trading the knights to hand Black the doubled c-pawns. This is White's recurring Four Knights dividend: a small, permanent structural plus. Black gets the half-open b-file in return, but the long-term target is fixed on c6.", sayShort: "Nxc6 bxc6 — saddle Black with doubled pawns.", highlights: [H("c6", KEY)] }),
    b({ id: "sf4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5", say: "Bd3 d5 exd5 cxd5 — Black frees himself with the d5-break and rebuilds a centre, but that d5-pawn now stands alone, cut off from its doubled brother. Meanwhile the d3-bishop rakes the long light diagonal toward h7 and Black's king. White's plan writes itself: blockade and besiege the lonely d5-pawn while the bishop pair eyes the kingside.", sayShort: "exd5 cxd5 — the lonely d5-pawn is the target.", arrows: [A("d3", "h7", VIS)], highlights: [H("d5", KEY), H("h7", SOFT)] }),
    b({ id: "sf5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 c6 Qf3 Bd6 Rae1", say: "O-O O-O Bg5 c6 Qf3 Bd6 Rae1 — the Scotch Four Knights tabiya. Bg5 pins the f6-knight, the queen swings to f3 to lean on the d5-pawn, and the rooks centralise. Every White piece points at d5 or the kingside while Black nurses the structural weakness. This is the open, dynamic face of the Four Knights — and the model game, Kramnik beating Aronian, shows exactly how the pressure converts.", sayShort: "Qf3, Bg5 — pile onto the d5-pawn.", arrows: [A("g5", "f6", ATK), A("f3", "d5", ATK)], highlights: [H("d5", KEY), H("f6", SOFT)] }),
  ],
},

  "four-knights-game::Glek System: 4.g3": {
  openingId: "four-knights-game",
  sources: ['book:four-knights-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
  title: "Four Knights — The Glek System",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "gl1", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3", say: "g3 — the Glek System, the modern, hyper-flexible way to handle the Four Knights, named for the grandmaster who made it respectable. Instead of the old Spanish bishop, White prepares to fianchetto on g2, blending a King's Indian Attack idea into an open game. The bishop will rake the long diagonal and the whole setup is hard for Black to crack — a favourite of Mamedyarov.", sayShort: "g3 — the modern Glek fianchetto.", highlights: [H("g3", KEY)] }),
    b({ id: "gl2", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2", say: "Bc5 develops actively and Bg2 completes the fianchetto. The bishop on g2 is the soul of the system: for now its own knight on f3 stands in the way, but the moment that knight reroutes, the bishop will glare down the long diagonal at Black's queenside and centre. White's structure is solid and his plans are flexible.", sayShort: "Bg2 — the fianchettoed bishop's home.", highlights: [H("g2", KEY), H("f3", SOFT)] }),
    b({ id: "gl3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O", say: "d6 d3 a6 O-O O-O — both sides build calmly and castle. We reach the Glek tabiya: a closed, manoeuvring centre at e4 and e5, with White's king snug behind the fianchetto. There is no immediate contact, no forcing line — this is a positional system where White slowly improves his pieces and waits for the right moment to expand.", sayShort: "O-O — the calm Glek tabiya.", highlights: [H("e4", KEY), H("e5", SOFT)] }),
    b({ id: "gl4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O h3 h6 Be3 Bxe3 fxe3", say: "h3 h6 Be3 Bxe3 fxe3 — White invites the trade of dark-squared bishops and recaptures toward the centre. The point is hidden in that recapture: fxe3 opens the f-file for the rook and builds a broad pawn front on e3 and e4. White has swapped the symmetrical calm for a small space edge and an open file to work with.", sayShort: "fxe3 — open the f-file, build the centre.", highlights: [H("e3", KEY), H("e4", SOFT)] }),
    b({ id: "gl5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O h3 h6 Be3 Bxe3 fxe3 Ne7 Nh4 c6", say: "Ne7 Nh4 c6 and the plans crystallise. Black reroutes toward the centre while White's knight hops to h4, heading for f5 — the dream outpost where a knight cannot be chased and dominates Black's position. Combined with the f-file rook and the g2-bishop, White's quiet system has produced a real, lasting initiative on the kingside. That patient build-up is the Glek's whole charm.", sayShort: "Nh4 — knight heads for the f5 outpost.", arrows: [A("h4", "f5", INTENT)], highlights: [H("f5", KEY)] }),
  ],
},

  "four-knights-game::Italian Four Knights: 4.Bc4": {
  openingId: "four-knights-game",
  sources: ['book:four-knights-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
  title: "Four Knights — The Italian Four Knights",
  minutes: 10,
  orientation: "white",
  beats: [
    b({ id: "it1", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4", say: "Bc4 — the Italian Four Knights, slamming the bishop onto the a2-g8 diagonal straight at f7, the eternal soft spot of Black's position. This is the most aggressive square for the bishop and the move that keeps the most attacking chances. Black, however, has a well-known equaliser, and meeting it correctly is the whole lesson here.", sayShort: "Bc4 — the bishop aims at f7.", arrows: [A("c4", "f7", ATK)], highlights: [H("f7", KEY)] }),
    b({ id: "it2", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4 Nxe4 Nxe4 d5", say: "Nxe4 Nxe4 d5 — the fork trick, Black's classical resource. Black gives up the knight on e4 only to win it straight back: the d5-pawn forks the e4-knight and the c4-bishop at once. This is the correct, equalising idea — but if Black ever plays it a tempo too early or in the wrong move order, that same f7-square invites a Bxf7+ sacrifice. Here, played properly, it is simply sound.", sayShort: "…d5 — the fork trick regains the piece.", highlights: [H("d5", KEY), H("e4", KEY), H("c4", SOFT)] }),
    b({ id: "it3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4 Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4", say: "Bd3 dxe4 Bxe4 — the dust settles. White retreats the bishop, the pawn captures the knight, and the bishop recaptures, landing beautifully centralised on e4 where it stares down the long diagonal at the c6-knight and beyond. Material is level, the position is symmetrical and sound, but White keeps the more active piece and a featherweight pull.", sayShort: "Bxe4 — recapture, centralise the bishop.", arrows: [A("e4", "c6", ATK)], highlights: [H("e4", KEY), H("c6", SOFT)] }),
    b({ id: "it4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4 Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4 Bd6 O-O O-O Re1", say: "Bd6 O-O O-O Re1 — both castle and White lifts the rook to e1, lining up behind the centralised bishop on e4 and the half-open e-file. Black is solid, but White's pieces are the more harmonious, and that e-file is the avenue down which any pressure will flow. Quiet, but with a purpose.", sayShort: "Re1 — back the bishop on the e-file.", arrows: [A("e1", "e4", VIS)], highlights: [H("e4", KEY)] }),
    b({ id: "it5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4 Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4 Bd6 O-O O-O Re1 Re8 d3 h6 c3", say: "Re8 d3 h6 c3 — the Italian Four Knights tabiya. The position is nearly symmetrical and objectively balanced; this line is White's choice when he wants a safe, sound game with a tiny enduring edge rather than fireworks. The d3-pawn and the c3-square give White a small, flexible centre, and from here it is pure technique — outplay Black slowly from a structurally healthy position.", sayShort: "c3 — a small, flexible, sound centre.", highlights: [H("d3", KEY), H("c3", SOFT)] }),
  ],
},

  "four-knights-game::Rubinstein Variation: 4.Bb5 Nd4": {
  openingId: "four-knights-game",
  sources: ['book:four-knights-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
  title: "Four Knights — The Rubinstein Counter",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "ru1", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Nd4", say: "Nd4 — the Rubinstein Variation, Black's most ambitious answer to the Spanish Four Knights. Instead of meekly mirroring with Bb4, Black jumps the knight into the centre, attacking the b5-bishop and the f3-knight at once and refusing the symmetry. It is sharp and double-edged, and White must know the antidote or risk getting outplayed in the complications.", sayShort: "…Nd4 — the bold Rubinstein counter.", arrows: [A("d4", "b5", ATK)], highlights: [H("d4", KEY)] }),
    b({ id: "ru2", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Nd4 Be2 Nxf3+ Bxf3", say: "Be2 Nxf3+ Bxf3 — the clean, sound treatment, the Maróczy line. White calmly retreats the bishop to e2 rather than grabbing the e5-pawn, sidesteps every trick, and after Black trades on f3 the bishop recaptures, eyeing the centre. No risk, no fireworks — just a small, healthy edge. White has refused to be provoked.", sayShort: "Be2 — the safe Maróczy retreat.", highlights: [H("f3", KEY), H("e5", SOFT)] }),
    b({ id: "ru3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Nd4 Be2 Nxf3+ Bxf3 Bc5 O-O O-O d3 d6", say: "Bc5 O-O O-O d3 d6 — both sides complete development around the locked centre on e4 and e5. White has emerged from Black's aggression with the bishop pair fully intact and a sound structure. The Rubinstein's bid for the initiative has fizzled; now White simply enjoys the long-term trumps of the two bishops in a calm, well-ordered position.", sayShort: "O-O d6 — White keeps the bishop pair.", highlights: [H("e4", KEY), H("e5", SOFT)] }),
    b({ id: "ru4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Nd4 Be2 Nxf3+ Bxf3 Bc5 O-O O-O d3 d6 Na4 Bb6", say: "Na4 Bb6 — White starts the squeeze. The knight swings to a4 to challenge the strong c5-bishop on b6; trading it removes Black's best minor piece and leaves White with the unopposed bishop pair. It is the classic positional plan against an active enemy bishop: don't tolerate it, exchange it on your terms.", sayShort: "Na4 — challenge the b6-bishop.", arrows: [A("a4", "b6", INTENT)], highlights: [H("b6", KEY)] }),
    b({ id: "ru5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Nd4 Be2 Nxf3+ Bxf3 Bc5 O-O O-O d3 d6 Na4 Bb6 Nxb6 axb6 c3", say: "Nxb6 axb6 c3 and we reach the Rubinstein tabiya. White has the bishop pair and a flexible centre; the little c3-pawn prepares the thematic d4-break to open lines for those bishops. Black got rid of nothing he wanted to keep. That is the verdict on the Rubinstein at club level — meet Nd4 with the quiet Be2, refuse every trap, and grind the two bishops home. Carlsen did exactly that against Gelfand.", sayShort: "c3 — prepare d4, unleash the bishops.", highlights: [H("c3", KEY), H("d4", SOFT)] }),
  ],
},
};
