import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'];

// GothamChess's Vienna Game (1.e4 e5 2.Nc3). 628 wins in his dump, 64% win
// rate, top vs 3039 — the 3.f4 GAMBIT is his signature (198 wins). His real
// 22-ply main line from game 169092161810 (vs 3039): the d5/fxe5/Qf3 fight,
// ending with Bg5/Qg3 on a deep middlegame attack. Anchors 16 plies in HIS
// DATABASE (his own games — the only authority for his tab).
export const PRO_GOTHAMCHESS_VIENNA_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-vienna',
  sources: SRC,
  title: 'Vienna Gambit — GothamChess Master Class',
  minutes: 9,
  orientation: 'white',
  beats: [
    {
      id: 'f4-gambit',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],
      highlights: [{ square: 'f4', color: KEY }],
      say: "The Vienna Game is Gotham's favourite e4 weapon — and the Vienna GAMBIT (3.f4!) is his real toy. The pawn lunge to f4 looks like an oversight, but it's an old gambit that nearly always catches Black off-guard. White will trade the f-pawn for a roaring centre and a free attack on the king.",
      sayShort: 'f4 — the Vienna Gambit, free attack ahead.',
    },
    {
      id: 'd5-fxe5',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3'],
      arrows: [{ from: 'f3', to: 'e4', color: VIS }],
      highlights: [{ square: 'f3', color: KEY }],
      say: "Black's best try is ...d5, hitting back at the centre. Gotham just trades: fxe5 wins the e5-pawn, then after ...Nxe4 the queen leaps to f3 — pinning the knight, attacking d5, and aiming the whole battery at f7. The Vienna's promise: every piece pointed at the black king.",
      sayShort: 'Qf3 — pin the knight, train on f7.',
    },
    {
      id: 'd3-bxc3',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3', 'f5', 'd3', 'Nxc3', 'bxc3', 'd4', 'Qg3'],
      highlights: [{ square: 'g3', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Black plays ...f5 to hold the e4-knight and ...d4 hitting the c3-knight. Gotham coolly recaptures bxc3 — happy to take the doubled pawn for the open b-file — then swings the queen to g3 where she hits both g7 AND the pawn on e5. White's pieces are coordinated and pointed at the king; Black is still mostly back-row.",
      sayShort: 'Qg3 — hit g7 and the e5 wedge.',
    },
    {
      id: 'deep',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3', 'f5', 'd3', 'Nxc3', 'bxc3', 'd4', 'Qg3', 'Nc6', 'Nf3', 'dxc3', 'Rb1', 'Be6', 'Bg5', 'Qd7'],
      arrows: [{ from: 'g5', to: 'd8', color: VIS }],
      highlights: [{ square: 'g5', color: KEY }, { square: 'g3', color: SOFT }],
      say: "By move 11 the picture's complete: the e5-pawn wedge, the knight on f3, the bishop on g5 pinning the c8-square's path through to the king, the queen on g3 still hitting g7 — every piece on its best square, all pointed at the black king. From a 'gambit' that gives up a single pawn, White has manufactured a textbook attacking position.",
      sayShort: 'Every piece pointed at the black king.',
    },
  ],
};
