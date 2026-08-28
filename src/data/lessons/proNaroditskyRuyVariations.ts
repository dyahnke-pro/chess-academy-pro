import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky Ruy Lopez — variation lessons, every-step house voice
// (David 2026-07-02). Student plays WHITE. Covers Black's main defences: the
// solid Berlin, the modern Closed with d3 (Marshall-avoiding), and the old
// ...d6 Steinitz. Spines board-verified to middlegames, engine-checked
// (White +0.11..+0.79, all sound). Original prose; when-to-play framed on each.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'book:ruy-lopez',
  'https://www.chess.com/openings/Ruy-Lopez-Opening',
];

const RUY = 'e4 e5 Nf3 Nc6 Bb5';

// ============================================================
// Berlin Defense — the solid ...Nf6, into the Berlin endgame.
// ============================================================
const BERLIN: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez',
  title: 'Berlin Defense — the endgame pull',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nf6', moves: `${RUY} Nf6`,
      highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say: "You'll reach the Berlin when Black answers Bb5 with Nf6 instead of a6 — the rock-solid defence that helped Kramnik dethrone Kasparov. Black immediately eyes your e4-pawn and heads for simplification. You do not fear it: the resulting endgame gives White a small, safe, nagging pull, and that is exactly what you play for.",
      sayShort: 'Nf6 — the solid Berlin.',
    }),
    b({
      id: 'oo-nxe4', moves: `${RUY} Nf6 O-O Nxe4`,
      highlights: [{ square: 'e4', color: KEY }],
      say: "You castle, offering the e4-pawn, and Black takes it with Nxe4 — the whole point of the Berlin. Nothing reckless here on either side: grabbing e4 is known theory, and now you open the centre to exploit Black's slightly exposed knight and your lead in development.",
      sayShort: 'O-O Nxe4 — Black grabs e4.',
    }),
    b({
      id: 'd4-nd6', moves: `${RUY} Nf6 O-O Nxe4 d4 Nd6`,
      highlights: [{ square: 'd4', color: KEY }, { square: 'd6', color: SOFT }],
      say: "d4 strikes the centre and hits e5, and the knight retreats to d6, attacking your b5-bishop as it goes. Every move here is forcing and well-charted — you are being carried down a narrow, well-lit corridor toward the famous Berlin endgame.",
      sayShort: 'd4 Nd6 — open the centre.',
    }),
    b({
      id: 'bxc6', moves: `${RUY} Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6`,
      highlights: [{ square: 'c6', color: KEY }],
      say: "You trade on c6, and Black recaptures with dxc6 — saddling themselves with doubled c-pawns. That damaged structure is the concession you play against for the rest of the game. In return Black gets the bishop pair, so it is a genuine imbalance: your better pawns versus their two bishops.",
      sayShort: 'Bxc6 dxc6 — doubled c-pawns.',
    }),
    b({
      id: 'dxe5', moves: `${RUY} Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5`,
      highlights: [{ square: 'e5', color: KEY }, { square: 'd6', color: SOFT }],
      say: "dxe5 wins the pawn back and drives the knight, steering into the Berlin endgame — queens come off and Black's king gets stuck on e8 for a while. The engine calls it near-level, but it is the ideal near-level: White has the healthier pawns, a lead in development, and a long, risk-free game to press. A position to enjoy grinding.",
      sayShort: 'dxe5 — the Berlin endgame pull.',
    }),
  ],
};

// ============================================================
// Closed with d3 — the modern Marshall-avoiding buildup.
// ============================================================
const CLOSED_D3: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez',
  title: 'Closed with d3 — sidestep the Marshall',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'morphy', moves: `${RUY} a6 Ba4 Nf6 O-O Be7`,
      highlights: [{ square: 'a4', color: SOFT }, { square: 'e7', color: KEY }],
      say: "You'll reach this when Black plays the main Closed Ruy — a6, Nf6, Be7, heading for the deeply-analysed lines and, often, the dangerous Marshall Gambit. You castle and prepare a modern, practical decision that sidesteps all of Black's preparation.",
      sayShort: 'The main Closed Ruy setup.',
    }),
    b({
      id: 'd3', moves: `${RUY} a6 Ba4 Nf6 O-O Be7 d3`,
      highlights: [{ square: 'd3', color: KEY }],
      say: "d3 — the modern choice, and a smart one. The old main line plays c3 and d4, but that invites the Marshall Gambit, where Black sacrifices a pawn for a ferocious prepared attack. By keeping the pawn modestly on d3 you deny Black the Marshall entirely and steer into a slow, rich manoeuvring game on your own terms.",
      sayShort: 'd3 — deny Black the Marshall.',
    }),
    b({
      id: 'b5-bb3', moves: `${RUY} a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3`,
      highlights: [{ square: 'b5', color: SOFT }, { square: 'b3', color: KEY }],
      say: "Black gains queenside space with b5 and you retreat the bishop to b3 — its ideal diagonal, aiming toward f7. Nothing is forced now; this is a battle of slow plans, exactly where a well-prepared player outplays an opponent who only knew the sharp Marshall lines.",
      sayShort: 'Bb3 — the bishop on its diagonal.',
    }),
    b({
      id: 'd6-a3', moves: `${RUY} a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3 d6 a3 O-O`,
      highlights: [{ square: 'd6', color: KEY }, { square: 'a3', color: SOFT }],
      say: "Black completes the Closed setup with d6 — his corpus overwhelmingly rides this road: seventy-four of a hundred and four games at the b5 tabiya. You answer a3, a small move with a long memory: it takes b4 from Black's pieces forever and gives your own bishop a quiet a2 retreat if ever asked. Both sides castle and settle in.",
      sayShort: 'd6 — his corpus road. a3 answers.',
    }),
    b({
      id: 'nc3-nd4', moves: `${RUY} a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3 d6 a3 O-O Nc3 Bg4 Be3 Nd4`,
      highlights: [{ square: 'd4', color: KEY }, { square: 'e3', color: SOFT }],
      say: "Nc3 develops toward the square this whole system dreams about — d5. Black pins with Bg4 and plants his knight on d4, the standard bid for relief. You meet it calmly with Be3: the intruder will be traded on your terms, not chased on his.",
      sayShort: 'Nc3 — d5 is the dream square.',
    }),
    b({
      id: 'nd5', moves: `${RUY} a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3 d6 a3 O-O Nc3 Bg4 Be3 Nd4 Bxd4 exd4 Nd5`,
      highlights: [{ square: 'd5', color: KEY }],
      say: "Bishop takes on d4, the pawn recaptures — and there it is: knight to d5, the octopus, landing on the square Black's own pawn moves surrendered. The engine gives White a clear pull here, and the plan flows from the light squares: if Black trades on d5 your Spanish bishop inherits the post, steps to c6, and the queenside squeeze begins. The middlegame plan picks up from this exact position.",
      sayShort: 'Nd5 — the octopus lands.',
    }),
  ],
};

// ============================================================
// Steinitz Defense — the old ...d6; you grab the centre with d4.
// ============================================================
const STEINITZ: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez',
  title: 'Steinitz Defense — grab the centre with d4',
  minutes: 6,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd6', moves: `${RUY} a6 Ba4 d6`,
      highlights: [{ square: 'd6', color: KEY }],
      say: "You'll see this when Black plays the old-fashioned d6 — the Modern Steinitz. It is solid and safe, but passive: Black shores up the e5-pawn at the cost of shutting in the dark-squared bishop and ceding you the centre. Against a passive setup, the right response is to seize space energetically.",
      sayShort: 'd6 — the solid, passive Steinitz.',
    }),
    b({
      id: 'c3', moves: `${RUY} a6 Ba4 d6 c3`,
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "c3 — the preparation move. It braces the coming d4 push, so that when you grab the centre that pawn will be fully supported. You are building an ideal big centre against Black's cramped position, and c3 is the quiet foundation for it.",
      sayShort: 'c3 — prepare the big d4.',
    }),
    b({
      id: 'bd7-d4', moves: `${RUY} a6 Ba4 d6 c3 Bd7 d4`,
      highlights: [{ square: 'd4', color: KEY }],
      say: "Black develops the bishop to d7 and you strike with d4 — the point of the whole line. Now you own a strong pawn centre with e4 and d4 against Black's passive d6, and your extra space translates directly into freer, more active pieces. A comfortable structural advantage.",
      sayShort: 'd4 — seize the big centre.',
    }),
    b({
      id: 'g6', moves: `${RUY} a6 Ba4 d6 c3 Bd7 d4 g6`,
      highlights: [{ square: 'g6', color: SOFT }, { square: 'd4', color: KEY }],
      say: "Black fianchettos with g6, planning to develop the bishop to the long diagonal and pressure your centre. You are happy: the engine confirms White is clearly better here, with more space and easier development. Your plan is to complete development, keep the centre strong with pieces behind it, and slowly convert the space edge — the reward for meeting a passive defence with energy.",
      sayShort: 'g6 — White is clearly better.',
    }),
  ],
};

export const PRO_NARODITSKY_RUY_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-ruy-lopez::Berlin Defense': BERLIN,
  'pro-naroditsky-ruy-lopez::Closed with d3': CLOSED_D3,
  'pro-naroditsky-ruy-lopez::Steinitz Defense': STEINITZ,
};
