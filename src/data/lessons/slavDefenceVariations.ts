import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Slav Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Only the variations whose curated pgn reaches the ≥20-ply depth gate are
// taught as tabs (Geller Gambit, Schlechter); the shorter Exchange/Quiet/
// Chebanenko lines fold into the main pill rather than ship thin.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Slav_Defense'];

export const SLAV_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'slav-defence::Geller Gambit': {
    openingId: 'slav-defence', title: 'Slav — The Geller Gambit (5.e4)', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'g1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 e4 b5', say: "The Geller Gambit — White blasts open the centre with 5.e4, sacrificing structure for activity. Black meets the challenge head-on: …b5 holds the extra c4-pawn and grabs queenside space. Accept the gambit and prove the sacrifice unsound.", sayShort: '…b5 — hold the pawn, take space.', highlights: [H('e4'), H('b5')] }),
      b({ id: 'g2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 e4 b5 e5 Nd5 a4 e6', say: "e5 grabs space and kicks the knight to …Nd5, a fine central post; a4 strikes at the b5-pawn, and …e6 calmly shores up the chain. Black returns nothing and keeps everything defended — White's compensation must come from somewhere, and it isn't here.", sayShort: '…e6 — shore up, keep the extra pawn.', highlights: [H('d5'), H('e6')] }),
      b({ id: 'g3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 e4 b5 e5 Nd5 a4 e6 axb5 Nxc3 bxc3 cxb5', say: "axb5 …Nxc3 bxc3 …cxb5 — the dust settles and Black is simply a clean pawn up on the queenside, with a healthy extra passed pawn on b5. White's centre looks broad but it is loose, and Black has the material to show for the defence.", sayShort: '…cxb5 — a clean extra pawn.', highlights: [H('b5'), H('c3', SOFT)] }),
      b({ id: 'g4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 e4 b5 e5 Nd5 a4 e6 axb5 Nxc3 bxc3 cxb5 Ng5 Bb7', say: "Ng5 lunges at f7, but …Bb7 develops the bishop to the long diagonal, defending and adding a third defender to the kingside while eyeing White's centre. There is the Geller tabiya: Black up a pawn, fully developed, the loose white centre a target. Greedy but correct — the gambit is just unsound.", sayShort: '…Bb7 — develop, a pawn up and solid.', highlights: [H('b7')] }),
    ],
  },

  'slav-defence::Schlechter Variation (...g6 Fianchetto)': {
    openingId: 'slav-defence', title: 'Slav — The Schlechter (…g6 Fianchetto)', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 's1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 g6', say: "The Schlechter — Black fianchettoes with …g6, combining the rock-solid c6/d5 Slav wall with a Grünfeld-style bishop on the long diagonal. The most flexible, harmonious way to handle the Slav: solidity in the centre, dynamism on the flank.", sayShort: '…g6 — Slav wall plus a fianchetto.', highlights: [H('g6')] }),
      b({ id: 's2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 g6 e3 Bg7 Bd3 O-O', say: "…Bg7 takes the great diagonal and Black castles into a snug kingside. The bishop on g7 will bear down on d4 and the centre the moment the c6/d5 wall opens — a quiet but powerful long-range piece.", sayShort: '…Bg7, …O-O — fianchetto and tuck in.', highlights: [H('g7')] }),
      b({ id: 's3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 g6 e3 Bg7 Bd3 O-O O-O Bg4 h3 Bxf3 Qxf3', say: "…Bg4 pins the f3-knight, and after h3 …Bxf3 Qxf3 Black trades off the light-squared bishop — the one piece the Slav structure can leave passive. A clean exchange that leaves Black with the better minor pieces for the closed centre.", sayShort: '…Bxf3 — trade the passive bishop off.', highlights: [H('f3'), H('g4', SOFT)] }),
      b({ id: 's4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 g6 e3 Bg7 Bd3 O-O O-O Bg4 h3 Bxf3 Qxf3 e6 Qe2 Nbd7', say: "…e6 seals the structure and …Nbd7 completes development, the knight ready to reroute to b6 or f6–d5. There is the Schlechter tabiya: the solid Slav wall, the fianchettoed bishop raking the long diagonal, the bad bishop already traded — a flexible, weakness-free position Black can play for a win.", sayShort: '…Nbd7 — solid, flexible, the bad bishop gone.', highlights: [H('e6'), H('d7')] }),
    ],
  },
};
