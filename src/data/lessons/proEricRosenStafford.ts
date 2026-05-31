import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Stafford Gambit (Black). Eric Rosen ("imrosen", IM) is the
// gambit's great popularizer; this spine is the line he has played hundreds of
// times in his chess.com corpus (18,788 games scanned): the accepted main line
// 5.d3 Bc5, then his signature …h5 / …Ng4 / …Qh4 kingside storm aimed at f2 and
// the h-file. The Stafford is an honest GAMBIT — Black is down a pawn and the
// compensation is pure initiative; we teach attack, not equality. Both registers
// on every beat (G5/G9.4): full Watch `say` + ≤8-word Learn `sayShort`. No
// move-number prefixes in spoken text (Polly reads "2." as "two"). Arrows are
// green vision lines (never from a pawn); orange move-squares are auto-painted.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'concept:pos-initiative',
  'concept:tac-sacrifice',
  'concept:att-kingside-storm',
  'https://www.chess.com/openings/Stafford-Gambit',
  'https://lichess.org/study/34oRtfLM',
  'https://api.chess.com/pub/player/imrosen/games/archives',
];

export const PRO_ERICROSEN_STAFFORD_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-stafford',
  title: "Rosen's Stafford Gambit — the f2 storm",
  minutes: 9,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'order',
      moves: 'e4 e5 Nf3 Nf6',
      arrows: [A('f6', 'e4')],
      highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say: "We start like the Petroff — e5, then Nf6, attacking the e4-pawn. It looks like a quiet, symmetrical game. It is bait. We are inviting White to grab on e5, because the whole Stafford is built on what happens next.",
      sayShort: '…Nf6 — bait the e5 grab.',
    }),
    b({
      id: 'gambit',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6',
      arrows: [A('c6', 'e5')],
      highlights: [{ square: 'e5', color: KEY }, { square: 'c6', color: KEY }],
      say: "White takes the pawn, and instead of recapturing we play Nc6 — the Stafford Gambit. We offer the e5-pawn for free. White will trade it off, but every tempo White spends collecting material is a tempo we spend developing toward their king. The pawn is the price of the initiative.",
      sayShort: '…Nc6 — the gambit, pawn for tempo.',
    }),
    b({
      id: 'recapture',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6',
      arrows: [A('c8', 'h3'), A('d8', 'd1')],
      highlights: [{ square: 'd8', color: KEY }, { square: 'c8', color: SOFT }],
      say: "White trades on c6 and we recapture toward the centre with the d-pawn — never the b-pawn. This is the key choice: dxc6 opens the d-file for our queen and the c8-to-h3 diagonal for our light bishop. We are down a pawn, but both bishops and the queen suddenly have open roads.",
      sayShort: '…dxc6 — open the d-file and diagonal.',
    }),
    b({
      id: 'bc5',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5',
      arrows: [A('c5', 'f2')],
      highlights: [{ square: 'f2', color: KEY }, { square: 'c5', color: KEY }],
      say: "White props up the centre with d3, and our bishop goes straight to c5 — pointing at f2. Memorise this square: f2 is the soft spot in almost every Stafford line. The whole attack is going to crash into it. Rosen has reached this exact position hundreds of times.",
      sayShort: '…Bc5 — aim at f2.',
    }),
    b({
      id: 'h5',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5',
      arrows: [A('h8', 'h2')],
      highlights: [{ square: 'h5', color: KEY }, { square: 'h2', color: SOFT }],
      say: "After White develops the bishop to e2, Rosen plays the move that defines his Stafford — h5. It looks reckless, but it is deliberate bait: it prepares Ng4 without allowing the bishop to chase the knight away, and it opens the h-file for the rook still sitting on h8. He plays it not because the engine loves it, but because it sets the trap.",
      sayShort: '…h5 — open the h-file, prep Ng4.',
    }),
    b({
      id: 'ng4',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3 Ng4',
      arrows: [A('g4', 'f2'), A('g4', 'h2')],
      highlights: [{ square: 'g4', color: KEY }, { square: 'f2', color: KEY }],
      say: "White touches the centre with c3, and the knight leaps to g4. Now look at the pressure: the g4-knight and the c5-bishop both hammer f2, and the knight also eyes h2. Because we played h5 first, White cannot kick the knight with the bishop. The attack is live.",
      sayShort: '…Ng4 — double the hit on f2.',
    }),
    b({
      id: 'qh4',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3 Ng4 d4 Qh4',
      arrows: [A('h4', 'f2'), A('h4', 'h2')],
      highlights: [{ square: 'h4', color: KEY }, { square: 'f2', color: KEY }],
      say: "White grabs more centre with d4, and the queen swings to h4 — the third attacker. Queen, knight and bishop now converge on f2 and the h-file all at once. This is the Stafford battery: it is exactly the formation Rosen used to mate a grandmaster in the World Blitz Championship.",
      sayShort: '…Qh4 — the mating battery loads.',
    }),
    b({
      id: 'qf6',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3 Ng4 d4 Qh4 g3 Qf6',
      arrows: [A('f6', 'f2'), A('c5', 'f2'), A('g4', 'f2')],
      highlights: [{ square: 'f6', color: KEY }, { square: 'f2', color: KEY }],
      say: "White blocks the h4-square with g3, so the queen redeploys to f6 — and the pressure on f2 does not let up. Bishop, knight and queen still triangulate on that one square while White's king is stranded in the centre, unable to castle into safety. White is up a pawn and completely tied down. That is the trade the Stafford offers.",
      sayShort: '…Qf6 — keep the clamp on f2.',
    }),
    b({
      id: 'plan',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3 Ng4 d4 Qh4 g3 Qf6',
      arrows: [A('a8', 'd8')],
      highlights: [{ square: 'h4', color: KEY }, { square: 'd8', color: SOFT }],
      say: "From here the plan is simple and violent: push the h-pawn to h4 to rip open the h-file, castle queenside to bring the other rook into the attack, and keep every piece pointed at the white king. We do not try to win the pawn back — we try to win the king.",
      sayShort: 'Plan: …h4, long castle, hunt the king.',
    }),
    b({
      id: 'honest',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5',
      highlights: [{ square: 'h3', color: KEY }, { square: 'd4', color: SOFT }, { square: 'f2', color: SOFT }],
      say: "Be honest about the bargain. A calm White player who plays h3 to stop Ng4, finishes developing, castles, and builds a c3-and-d4 fortress can hold the extra pawn — the Stafford is objectively a gambit, not an equalizer. But over the board, against the clock, the pressure on f2 makes people crack. That is why Rosen scores so heavily with it.",
      sayShort: 'Honest: a calm h3 holds the pawn.',
    }),
  ],
};
