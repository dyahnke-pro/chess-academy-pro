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
  'slav-defence::Main Line (a4 Bf5)': {
    openingId: 'slav-defence', title: 'Slav — The Main Line (a4 …Bf5)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'sl1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5', say: "The Slav main line, and the idea that makes the whole opening great: Black plays …dxc4 and then …Bf5, developing the light-squared bishop OUTSIDE the pawn chain before …e6 — exactly the freedom the Queen's Gambit Declined never grants. White regains the pawn with a4.", sayShort: '…Bf5 — the good bishop, out early.', highlights: [H('f5', KEY)] }),
      b({ id: 'sl2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7', say: "White recovers the pawn with Bxc4 and castles; Black completes development with the most natural moves — …e6, …Bb4 pinning the c3-knight, and …Nbd7. Every piece reaches a good square and Black has no weaknesses at all.", sayShort: '…Bb4, …Nbd7 — harmonious development.', highlights: [H('b4', KEY), H('e6', SOFT)] }),
      b({ id: 'sl3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O Bd3 Bh5', say: "White grabs the centre with e4; Black sidesteps with …Bg6 and then …Bh5, pinning the f3-knight and keeping the bishop active. There is the Slav tabiya: White has the big d4/e4 centre, but Black is rock-solid, fully developed, both bishops active and not a weakness in sight — the Slav's famously reliable equality.", sayShort: '…Bh5 — pin the knight, solid equality.', highlights: [H('h5', KEY)] }),
    ],
  },
  'slav-defence::Modern Qc2/Qb3 Line': {
    openingId: 'slav-defence', title: 'Slav — The Modern (Qc2)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'sq1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Qc2 dxc4 Qxc4 Bf5', say: "The Modern Slav: White recaptures the c-pawn with the queen, Qc2-xc4, rather than committing a4. Black answers in pure Slav style with …dxc4 and …Bf5 — the good bishop developed outside the pawn chain, the heart of the whole defence.", sayShort: '…Bf5 — the trademark Slav bishop.', highlights: [H('f5', KEY)] }),
      b({ id: 'sq2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Qc2 dxc4 Qxc4 Bf5 g3 e6 Bg2 Nbd7 O-O Be7 Nc3 O-O', say: "White fianchettoes with g3 and Bg2, aiming the bishop down the long diagonal; Black develops solidly — …e6, …Nbd7, …Be7 — and both castle. A calm, harmonious set-up that fully neutralises White's bishop.", sayShort: '…Be7, …O-O — solid against the fianchetto.', highlights: [H('e7', KEY), H('e6', SOFT)] }),
      b({ id: 'sq3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Qc2 dxc4 Qxc4 Bf5 g3 e6 Bg2 Nbd7 O-O Be7 Nc3 O-O Re1 Ne4 Qb3 Qb6', say: "Black plants the knight on the powerful …Ne4 outpost and offers a queen trade with …Qb6, equalising cleanly. There is the Modern Slav tabiya: the active bishop on f5, the dominant knight on e4, the solid …c6/…e6 structure and easy piece play — comfortable equality that scores 59% at club level.", sayShort: '…Ne4, …Qb6 — outpost and full equality.', highlights: [H('e4', KEY), H('b6', SOFT)] }),
    ],
  },
  'slav-defence::Exchange Variation': {
    openingId: 'slav-defence', title: 'Slav — The Exchange Variation', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'se1', moves: 'd4 d5 c4 c6 cxd5 cxd5 Bf4 Nc6', say: "The Exchange Slav: White releases the tension with cxd5, leaving a symmetric structure with a drawish reputation. But Black plays for the full point by developing actively — …Nc6 hits d4, and Black will get the light bishop out before …e6, the whole point of the Slav.", sayShort: '…Nc6 — develop actively for the win.', highlights: [H('d5', KEY)] }),
      b({ id: 'se2', moves: 'd4 d5 c4 c6 cxd5 cxd5 Bf4 Nc6 e3 Nf6 Bd3 Bg4 Nf3 e6 Nbd2 Bd6', say: "Black mirrors White's development but gets the light bishop OUTSIDE the chain with …Bg4 before …e6, then meets Bf4 with …Bd6. Symmetric, yes, but Black has solved the opening completely — no bad pieces and no weaknesses.", sayShort: '…Bg4, …Bd6 — bishop out, then mirror.', highlights: [H('g4', KEY), H('d6', SOFT)] }),
      b({ id: 'se3', moves: 'd4 d5 c4 c6 cxd5 cxd5 Bf4 Nc6 e3 Nf6 Bd3 Bg4 Nf3 e6 Nbd2 Bd6 Bg3 O-O O-O Rc8 Rc1 Bxg3', say: "White offers the bishop trade with Bg3; Black castles, grabs the c-file with …Rc8, and trades …Bxg3 — saddling White with doubled g-pawns after the recapture. There is the Exchange tabiya: symmetric and solid, but Black holds the c-file and the cleaner pawn structure to press for a win. The drawish reputation, refuted by activity.", sayShort: '…Bxg3 — damage the pawns, hold the c-file.', highlights: [H('g3', KEY), H('c8', SOFT)] }),
    ],
  },
  'slav-defence::Chebanenko Variation (4...a6)': {
    openingId: 'slav-defence', title: 'Slav — The Chebanenko (…a6)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ch1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 a6', say: "The Chebanenko Slav — the modern, flexible …a6. It looks modest, but it does a lot: it prepares …b5 to grab queenside space, keeps the light bishop's options open between …Bf5 and …Bg4, and waits to see White's plan. One of the most reliable Slav systems.", sayShort: '…a6 — flexible, prepares …b5.', highlights: [H('a6', KEY)] }),
      b({ id: 'ch2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 a6 e3 Bf5 Be2 e6 O-O Nbd7 b3 Bd6', say: "Black gets the bishop out to …Bf5 before locking the centre, then develops …e6, …Nbd7 and …Bd6 and castles. Every piece reaches a natural, active square — the harmonious, weakness-free position the Slav is built for.", sayShort: '…Bf5, …Bd6 — harmonious development.', highlights: [H('f5', KEY), H('d6', SOFT)] }),
      b({ id: 'ch3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 a6 e3 Bf5 Be2 e6 O-O Nbd7 b3 Bd6 Bb2 O-O Rc1 Rc8 h3 Bb8', say: "Both sides develop and contest the c-file; Black tucks …Bb8, keeping the bishop on the active b8-h2 diagonal while clearing d6 for the other pieces. There is the Chebanenko tabiya: the rock-solid Slav structure, active bishops on f5 and b8, queenside space coming with …b5 — a comfortable, even slightly preferable game for Black.", sayShort: '…Bb8 — keep the diagonal, ready …b5.', highlights: [H('b8', KEY)] }),
    ],
  },
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
