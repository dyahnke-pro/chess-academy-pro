import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Benko Gambit. Lead-the-eye §5a.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const BENKO_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'benko-gambit::Benko Declined: Nf3 System': {
    openingId: 'benko-gambit', title: 'Benko — The Declined (Nf3 System)', minutes: 10, orientation: 'black',
    beats: [
      b({ id: 'd1', moves: 'd4 Nf6 c4 c5 d5 b5 Nf3', say: "The Declined — rather than grab the b-pawn, White develops Nf3 and lets Black resolve the tension. This avoids the open a- and b-files of the Accepted Benko, but it also lets Black off the hook: Black simply takes on c4 and gets an easy, comfortable game.", sayShort: 'Nf3 — White declines the pawn.', highlights: [H('c4', SOFT)] }),
      b({ id: 'd2', moves: 'd4 Nf6 c4 c5 d5 b5 Nf3 bxc4 Nc3 g6', say: "…bxc4 grabs the pawn, and …g6 prepares the trademark fianchetto. Black has won a pawn (which White will regain) but more importantly keeps the open b-file and the Benko's natural setup. The structure favours Black's easy development.", sayShort: '…bxc4, …g6 — grab the pawn, fianchetto.', highlights: [H('g6')] }),
      b({ id: 'd3', moves: 'd4 Nf6 c4 c5 d5 b5 Nf3 bxc4 Nc3 g6 e4 d6 Bxc4 Bg7 O-O O-O', say: "e4 d6 and Bxc4 regains the pawn; Black fianchettoes …Bg7 and castles. The bishop rakes the long diagonal toward d4 and b2 — the same Benko pressure, now in a fully-developed, comfortable position with no risk.", sayShort: '…Bg7, O-O — the long-diagonal fianchetto.', highlights: [H('d4')] }),
      b({ id: 'd4m', moves: 'd4 Nf6 c4 c5 d5 b5 Nf3 bxc4 Nc3 g6 e4 d6 Bxc4 Bg7 O-O O-O h3 Nbd7 Re1 Nb6 Bf1', say: "…Nbd7 and …Nb6 reroute the knight to hit the c4-bishop and the queenside, forcing Bf1. There is the Declined tabiya: Black has the fianchettoed bishop, the half-open b-file, pressure on the queenside, and a completely sound position. When White declines, Black gets the Benko's grip with none of the risk.", sayShort: '…Nb6 — hit c4, the Benko grip without risk.', highlights: [H('c4')] }),
    ],
  },

  'benko-gambit::Zaitsev Variation': {
    openingId: 'benko-gambit', title: 'Benko — The Zaitsev (White Keeps the Pawn)', minutes: 10, orientation: 'black',
    beats: [
      b({ id: 'z1', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4', say: "The Zaitsev — White tries to keep the extra pawn with Nc3 and e4 rather than return it. Black recaptures …axb5 and faces e4, which clamps the centre. But White's grip on the b5-pawn comes at a cost: time and queenside weaknesses Black will exploit.", sayShort: '…axb5 — meet the pawn-grab attempt.', highlights: [H('b5'), H('e4', SOFT)] }),
      b({ id: 'z2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4 b4', say: "…b4! The key move. Instead of letting White round up the pawn, Black pushes it forward, kicking the c3-knight and gaining queenside space. The b4-pawn becomes a thorn that cramps White's queenside for the rest of the game.", sayShort: '…b4 — push the pawn, cramp the queenside.', highlights: [H('b4')] }),
      b({ id: 'z3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4 b4 Nb5 d6 Bc4 g6', say: "Nb5 sidesteps and Black plays …d6 and …g6, heading for the fianchetto. The b4-pawn restrains White's queenside pawns, the a-file is open for the rook, and Black has the familiar Benko pressure plus an extra space-grabbing pawn.", sayShort: '…d6, …g6 — fianchetto behind the b4-pawn.', highlights: [H('g6'), H('b4', SOFT)] }),
      b({ id: 'z4', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4 b4 Nb5 d6 Bc4 g6 Nf3 Bg7 O-O O-O', say: "…Bg7 fianchettoes onto the long diagonal and Black castles. There is the Zaitsev tabiya: White nominally has the extra pawn, but the b4-pawn cramps his queenside, the a-file is Black's, and the g7-bishop rakes the centre toward d4. Black has full compensation and an easy, pressing game.", sayShort: '…Bg7, O-O — full Benko compensation.', highlights: [H('d4')] }),
    ],
  },

  'benko-gambit::Half-Accepted': {
    openingId: 'benko-gambit', title: 'Benko — The Half-Accepted (e3)', minutes: 10, orientation: 'black',
    beats: [
      b({ id: 'h1', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 e3', say: "The Half-Accepted — White takes on b5 but then plays the modest e3, returning the pawn to blunt Black's pressure and develop quickly. Black is happy: recapturing on a6 leaves an open a-file and active piece play, with no structural concessions.", sayShort: 'e3 — White returns the pawn for development.', highlights: [H('a6', SOFT)] }),
      b({ id: 'h2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 e3 axb5 Bxb5 Qa5+', say: "…axb5 Bxb5 and the in-between check …Qa5+! — Black develops the queen with tempo, forcing White to react. The check disrupts White's coordination and lets Black seize the initiative on the queenside straight away.", sayShort: '…Qa5+ — develop the queen with tempo.', highlights: [H('a5')] }),
      b({ id: 'h3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 e3 axb5 Bxb5 Qa5+ Nc3 Bb7', say: "Nc3 blocks the check, and …Bb7 develops the light bishop onto the long diagonal, eyeing the d5-pawn and beyond. Black's pieces flood out with purpose — the queen active on a5, the bishop on b7, the a-file open. The Benko initiative, even with the pawn returned.", sayShort: '…Bb7 — bishop to the long diagonal.', arrows: [A('b7', 'd5')], highlights: [H('d5')] }),
      b({ id: 'h4', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 e3 axb5 Bxb5 Qa5+ Nc3 Bb7 Bd2 Qb6 Nf3 Nxd5 a4 e6 O-O Be7', say: "…Qb6 and …Nxd5! — Black regains the central pawn, the knight landing on a dominant square. After …e6 and …Be7 Black is fully developed with active pieces, the bishop pair pointing at the centre, and the open a-file. There is the Half-Accepted tabiya: easy equality with the initiative, exactly what the Benko promises.", sayShort: '…Nxd5 — regain the pawn, dominate the centre.', highlights: [H('d5')] }),
    ],
  },
};
