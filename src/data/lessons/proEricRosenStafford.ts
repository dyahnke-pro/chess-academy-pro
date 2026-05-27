import type { LessonScript } from '../../types';

// Lead-the-eye colour language (playbook §5a): GREEN arrows = vision/intent,
// YELLOW highlights = a key square the narration names, SOFT BLUE = secondary
// context. Move-squares are auto-painted ORANGE by the player — not authored.
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

/**
 * The Stafford Gambit — Eric Rosen's calling card (BLACK). Story-first; the
 * board demonstrates and returns to serve the lecture. Ground truth: the line
 * is chess.js-verified (scripts/verify-stafford-spine.mjs) and bound to Eric
 * Rosen's real games (688 Stafford games, ~80% score; main reply 4.Nxc6, 545g).
 * Provenance + his own study are the sources. On the 4.Nxc6 dxc6 main line
 * material is EVEN — Black trades the structure (doubled c-pawns) for the
 * bishop pair, the open d-file and a lead in development; the pawn-sac TRAPS
 * (…Nxe4 / …Bxf2+) live in the weapon section, not here.
 */
export const PRO_ERICROSEN_STAFFORD_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-stafford',
  sources: ['https://lichess.org/study/SSWMLB7R/K9ptMklR', 'concept:pos-development'],
  title: 'The Stafford Gambit — Eric Rosen Master Class',
  minutes: 9,
  orientation: 'black',
  beats: [
    {
      id: 'open',
      moves: ['e4', 'e5'],
      highlights: [{ square: 'e4', color: KEY }, { square: 'e5', color: KEY }],
      say: "We're learning the opening Eric Rosen has turned into an internet legend — and won with again and again. It starts the most ordinary way imaginable: e4 met by e5. Nothing here hints at the ambush. That's the point. Everything looks like a quiet Italian or Petrov until Black springs a move most opponents have never seen.",
      sayShort: '…e5 — the Stafford ambush begins.',
    },
    {
      id: 'petrov-shell',
      moves: ['e4', 'e5', 'Nf3', 'Nf6'],
      arrows: [{ from: 'f6', to: 'e4', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }],
      say: "Nf3 attacks the e5-pawn; Black replies Nf6, hitting e4 right back. This is the Petrov move-order — famous for being dead solid and a little dull. Opponents relax here. They assume a long, symmetrical game. Black is about to make it anything but.",
      sayShort: '…Nf6 — the safe Petrov shell, for now.',
    },
    {
      id: 'the-grab',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5'],
      highlights: [{ square: 'e5', color: KEY }],
      say: "White grabs the pawn on e5. Against the normal Petrov, Black would chase the knight with d6 and recapture later — quiet, equal, forgettable. Instead Black ignores the pawn entirely.",
      sayShort: 'Nxe5 — White takes the bait.',
    },
    {
      id: 'the-stafford',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6'],
      arrows: [{ from: 'c6', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }],
      say: "This is the Stafford: Nc6, developing a piece and attacking the knight on e5 instead of regaining the pawn. Black is saying — keep the pawn, I'll take the lead in development and the open lines. The knight on e5 has nowhere comfortable to go, so most opponents trade it off, exactly as Black wants.",
      sayShort: '…Nc6 — develop and hunt the e5-knight.',
    },
    {
      id: 'trade-structure',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6'],
      highlights: [{ square: 'c6', color: SOFT }, { square: 'c7', color: SOFT }],
      say: "Nxc6, and Black recaptures toward the centre with dxc6. Count the material — it's even; the knights simply came off. But look what Black bought: the d-file is open for the queen, both bishops are ready to fly out, and Black is a clear tempo ahead in development. The only blemish is the doubled pawns on c6 and c7 — a small, permanent price for a fast, violent initiative.",
      sayShort: '…dxc6 — even material, open file, two bishops loose.',
    },
    {
      id: 'd3-bishop',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5'],
      arrows: [{ from: 'c5', to: 'f2', color: VIS }],
      highlights: [{ square: 'f2', color: KEY }],
      say: "White plays the modest d3 to prop up e4; Black answers Bc5 — the Italian bishop, raking the diagonal straight at f2. f2 is the one square in front of White's king defended only by the king itself. In the Stafford that square is the bullseye for everything Black does next.",
      sayShort: '…Bc5 — the bishop locks onto f2.',
    },
    {
      id: 'the-plan',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5'],
      arrows: [{ from: 'c8', to: 'g4', color: VIS }, { from: 'd8', to: 'd3', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }, { square: 'd3', color: KEY }],
      say: "Here is the whole engine of the gambit. The light bishop comes to g4 to pin and pester; the queen leans on the d3-pawn down the open file; the f6-knight eyes the holes around White's king. Castle, pile onto f2 and the light squares, and a careless White move — there are many — hands Black a winning attack. That is why Eric Rosen scores around eighty percent from this position against everyone short of a titled player.",
      sayShort: 'Bishop g4, queen on d3, swarm f2.',
    },
    {
      id: 'mainline-middlegame',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be2', 'h5', 'c3', 'Ng4', 'd4', 'Bb6', 'h3', 'Nf6', 'Bg5', 'Qd7'],
      arrows: [{ from: 'b6', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'd7', color: SOFT }, { square: 'h5', color: SOFT }],
      say: "Run the most-played line out to the middlegame and the picture is unmistakable. White builds the big centre with d4, but Black's dark bishop on the long diagonal bites straight into the d4-pawn, the queen swings to d7 to link the rooks and eye the open file, and the h5-pawn has already poked a hole in White's kingside. Two bishops, an open file, a target on d4 — this is the Stafford's promise paid off: structure for White, but every active piece for Black.",
      sayShort: 'Middlegame: bishops bite d4, queen on d7.',
    },
  ],
};
