import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://lichess.org/study/HaFTAegs', 'concept:att-kingside-storm'];

// Naroditsky's Jobava (Rapport-Jobava) London (White, D00). Research-first
// from his study HaFTAegs + verified against his game dump (his real main is
// the Nb5! jab + h4-h5 kingside storm, not the Bd6-trade sideline). chess.js
// + masters-anchored 9 plies. Deep beat ends at his game 132235217187 (vs
// 3060) position: Ne5 outpost + h5 storm pawn + Bd3 battery.
export const PRO_NARODITSKY_JOBAVA_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london',
  sources: SRC,
  title: 'The Jobava London — Naroditsky Master Class',
  minutes: 9,
  orientation: 'white',
  beats: [
    {
      id: 'nc3-bf4',
      moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4'],
      arrows: [{ from: 'f4', to: 'c7', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }],
      say: "The Jobava London is the punchy cousin of the regular London: Nc3 comes out early — unusual, since it blocks the c-pawn — and the bishop swings out to f4, raking toward c7. The trade-off is deliberate: White gives up slow maneuvering for fast development and a direct attacking plan, with Nb5 jabs and a kingside pawn storm ready to fire.",
      sayShort: 'Nc3 + Bf4 — the punchy attacking London.',
    },
    {
      id: 'nb5-jab',
      moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'Nb5', 'Na6'],
      arrows: [{ from: 'b5', to: 'c7', color: VIS }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'c7', color: SOFT }],
      say: "After Black's solid e6, Naroditsky leaps the knight to b5 — Nb5! the trademark Jobava jab. The knight threatens to crash on c7 next, and Black's natural Nc6 isn't on offer: ...Na6 is forced, parking the knight on the rim. Black's queenside structure is bent before move 5, and the c7 weakness will haunt the rest of the game.",
      sayShort: 'Nb5! — force ...Na6, target c7.',
    },
    {
      id: 'h4-storm',
      moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'Nb5', 'Na6', 'e3', 'Be7', 'Nf3', 'O-O', 'h4'],
      highlights: [{ square: 'h4', color: KEY }],
      say: "Black tucks the king away with ...Be7 and ...O-O, expecting a quiet position — but then comes the Jobava's other signature: h4! The pawn lunges up the board the moment Black has castled, telegraphing the kingside storm with h5 to follow. The dark-squared bishop already eyes the kingside; the h-pawn is the battering ram.",
      sayShort: 'h4! — kingside storm the moment Black castles.',
    },
    {
      id: 'deep',
      moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'Nb5', 'Na6', 'e3', 'Be7', 'Nf3', 'O-O', 'h4', 'c6', 'Nc3', 'Nc7', 'h5', 'h6', 'Bd3', 'Nce8', 'Ne5', 'Nd6'],
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'h5', color: SOFT }],
      say: "Black chases the b5-knight back with ...c6 (forcing the retreat to c3), then ...Nc7 starts the long defensive shuffle as White's h-pawn keeps rolling: h5, h6. By the time the dust settles White has the dream picture — a knight planted on e5, an h-pawn jammed on h5 cramping the kingside, and the bishop swung to d3 lining up at h7, the diagonal pointing at Black's king. The Jobava's promise: an offbeat opening that delivers a real attack.",
      sayShort: 'Ne5 outpost + h5 wedge — Jobava attack rolls.',
    },
  ],
};
