import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Vienna Gambit variation lessons (white). Data spines (vi__accepted / vi__qf3,
// masters/strong corpus, G3). Sound ≥20-ply (engine +0.8 / +3.3 white). Keyed
// `${openingId}::${variationName}` matching gambits.json. Claims verified.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/Vienna_Game'];

export const VIENNA_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'vienna-gambit::Gambit Accepted (…exf4)': {
    openingId: 'vienna-gambit', sources: SRC, title: 'Vienna Gambit — Accepted', minutes: 8, orientation: 'white',
    beats: [
      b({ id: 'a1', moves: 'e4 e5 Nc3 Nf6 f4 exf4', say: "…exf4 grabs the gambit pawn — the greedy, and objectively worst, reply. With the knight already on f6, Black has no good way to hold the extra pawn once the centre opens.", sayShort: '…exf4 — the greedy capture.', highlights: [H('f4')] }),
      b({ id: 'a2', moves: 'e4 e5 Nc3 Nf6 f4 exf4 e5 Ng8', say: "e5! is the refutation — the pawn slams forward and the f6-knight has nowhere to go but all the way back to g8. Black has spent two moves to win a pawn and undeveloped his only piece.", sayShort: 'e5 — kick the knight back to g8.', highlights: [H('e5'), H('g8')] }),
      b({ id: 'a3', moves: 'e4 e5 Nc3 Nf6 f4 exf4 e5 Ng8 Nf3 d6 d4 dxe5 Qe2', say: "Nf3 and d4 build a giant centre; …dxe5 and Qe2 — White will regain everything with a colossal lead in development while Black's pieces sit on the back rank.", sayShort: 'd4 — build the giant centre.', highlights: [H('d4'), H('e5')] }),
      b({ id: 'a4', moves: 'e4 e5 Nc3 Nf6 f4 exf4 e5 Ng8 Nf3 d6 d4 dxe5 Qe2 Nc6 Bxf4 Bg4 O-O-O Bxf3 gxf3 Qe7', say: "Bxf4 regains the pawn, O-O-O throws the rook onto d1, the open d-file, and White is simply winning — the engine reads over +3. Accepting the Vienna Gambit with …exf4 is the line you HOPE your opponent plays.", sayShort: 'O-O-O — White is winning.', highlights: [H('f4'), H('d1')] }),
    ],
  },
  'vienna-gambit::Qf3 Setup (vs …d5)': {
    openingId: 'vienna-gambit', sources: SRC, title: 'Vienna Gambit — Qf3 Setup', minutes: 8, orientation: 'white',
    beats: [
      b({ id: 'q1', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3', say: "Against the critical …d5, Qf3 is the aggressive alternative to Nf3 — the queen leaps out to hit the e4-knight directly and eye f7 and the kingside.", sayShort: 'Qf3 — hit the knight, eye f7.', arrows: [A('f3', 'e4')], highlights: [H('f3'), H('e4')] }),
      b({ id: 'q2', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 dxc3', say: "…Nxc3 dxc3 — Black trades the knight, but White recaptures toward the centre, opening the d-file for a rook on d1 and keeping the e5-pawn as a cramping wedge.", sayShort: 'dxc3 — open the d-file, keep e5.', highlights: [H('e5'), H('d1')] }),
      b({ id: 'q3', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 dxc3 Be6 Bf4 Be7 O-O-O', say: "Bf4 supports the e5-pawn, and O-O-O! — the king to c1 and the queenside-castling race again. White's rook hits the open d-file and the kingside pawns are ready to storm.", sayShort: 'O-O-O — castle into the attack.', highlights: [H('c1'), H('e5')] }),
      b({ id: 'q4', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 dxc3 Be6 Bf4 Be7 O-O-O c6 Qg3 g6 Nf3 Qa5', say: "Qg3 swings the queen toward the kingside, Nf3 develops, and the engine likes White — the e5-wedge, the open d-file, and the attacking chances outweigh the gambit pawn. The king sits safely on c1; a pleasant, aggressive edge.", sayShort: 'Qg3 — swing the queen kingside.', highlights: [H('e5'), H('c1')] }),
    ],
  },
};
