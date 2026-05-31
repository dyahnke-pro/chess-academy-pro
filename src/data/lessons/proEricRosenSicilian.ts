import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Sicilian Defense (Black). His biggest Black defense (1,916
// games). The main spine is his Accelerated Dragon against the Maroczy Bind:
// …g6, …Bg7, …Nc6, fighting the c4-bind with timely piece play and the …f5/…b5
// breaks. Two registers per beat; no move-number prefixes in spoken text; green
// vision arrows only.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'concept:pos-space',
  'concept:pos-fianchetto',
  'concept:pawn-minority-attack',
  'https://www.chess.com/openings/Accelerated-Dragon',
  'https://api.chess.com/pub/player/imrosen/games/archives',
];

export const PRO_ERICROSEN_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-sicilian',
  title: "Rosen's Sicilian — the Accelerated Dragon",
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'c5', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6',
      arrows: [A('f8', 'g7')],
      highlights: [{ square: 'g6', color: KEY }, { square: 'c5', color: SOFT }],
      say: "The Accelerated Dragon. We trade our c-pawn for White's d-pawn and fianchetto the bishop fast with g6 — the 'accelerated' idea is that by delaying d6 we keep the option of the freeing …d5 break in one go. The dragon bishop will breathe fire down the long diagonal.",
      sayShort: '…g6 — the accelerated fianchetto.',
    }),
    b({
      id: 'maroczy', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4',
      arrows: [],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: KEY }],
      say: "White's most testing reply is c4 — the Maroczy Bind. The two pawns on c4 and e4 clamp down on d5 and take away our thematic break. This is the critical battleground: we accept a little less space in return for a rock-solid, flexible position with no weaknesses.",
      sayShort: 'c4 — the Maroczy Bind.',
    }),
    b({
      id: 'bg7', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7 Be3 Nf6 Nc3',
      arrows: [A('g7', 'd4')],
      highlights: [{ square: 'g7', color: KEY }],
      say: "We develop naturally — Bg7 onto the long diagonal, Nf6 hitting e4, and White completes the bind with Be3 and Nc3. The bishop on g7 already pressures the d4-knight and the centre; it is the best piece on the board.",
      sayShort: '…Bg7, …Nf6 — natural development.',
    }),
    b({
      id: 'castle', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7 Be3 Nf6 Nc3 O-O Be2 d6 O-O',
      highlights: [{ square: 'g8', color: SOFT }, { square: 'd6', color: KEY }],
      say: "Both sides castle and we slot the pawn to d6, completing a flexible, harmonious setup. Nothing is weak, every piece has a job, and now the real Maroczy fight begins: how does Black generate play against the space bind?",
      sayShort: '…d6, O-O — flexible and solid.',
    }),
    b({
      id: 'nxd4', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7 Be3 Nf6 Nc3 O-O Be2 d6 O-O Nxd4 Bxd4 Bd7',
      arrows: [],
      highlights: [{ square: 'd4', color: KEY }, { square: 'd7', color: KEY }],
      say: "The standard Maroczy plan: trade a pair of knights with Nxd4 to relieve the cramp, then bring the bishop to d7 and follow with …a5 to grab queenside squares. Fewer pieces means the space bind matters less and our pieces find good homes.",
      sayShort: '…Nxd4, …Bd7 — relieve the cramp.',
    }),
    b({
      id: 'a5', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7 Be3 Nf6 Nc3 O-O Be2 d6 O-O Nxd4 Bxd4 Bd7 Qd2 a5',
      arrows: [],
      highlights: [{ square: 'a5', color: KEY }, { square: 'b4', color: SOFT }],
      say: "…a5! The key Maroczy lever. It gains queenside space, fixes White's b-pawn as a target, and clamps the b4-square for our pieces. From here we play …Nd7-c5 or …a4 and chip away — the bind cuts both ways once we have our own space.",
      sayShort: '…a5 — clamp b4, gain space.',
    }),
    b({
      id: 'plan', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7 Be3 Nf6 Nc3 O-O Be2 d6 O-O Nxd4 Bxd4 Bd7 Qd2 a5',
      arrows: [A('f6', 'd7')],
      highlights: [{ square: 'c5', color: KEY }, { square: 'a4', color: SOFT }],
      say: "The middlegame blueprint: reroute the knight via d7 to c5, push …a4 to cramp the queenside, trade the dark-squared bishops to weaken White's grip, and aim for the …b5 or …f5 break. Patient, positional, and exactly how Rosen out-grinds strong opponents from the Maroczy.",
      sayShort: 'Plan: …Nc5, …a4, break with …b5.',
    }),
  ],
};
