import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Old Indian Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Deepest beat ≥20 plies. Janowski/Tartakower/Ukrainian/Seirawan/Main-d5 anchor
// <20p in the curated pgn, so they fold into the main rather than ship thin.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['book:old-indian-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'];

export const OLD_INDIAN_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'old-indian-defence::Old Indian: Tartakower Variation': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Tartakower (…exd4)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ot1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5', say: "The Old Indian — a solid, no-frills defence: Black plays …d6 and …Nbd7 and strikes the centre with …e5, a King's-Indian structure without the kingside fianchetto. It concedes White a little space, but it is compact and famously hard to break down.", sayShort: '…e5 — the solid Old Indian strike.', highlights: [H('e5', KEY)] }),
      b({ id: 'ot2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O exd4 Nxd4 Re8', say: "Black develops modestly with …Be7 and …O-O, then the Tartakower idea: …exd4 to free the cramped position, followed by …Re8 to pressure the e4-pawn down the half-open file. No weaknesses, easy piece play.", sayShort: '…exd4, …Re8 — free up, pressure e4.', highlights: [H('e8', KEY)] }),
      b({ id: 'ot3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O exd4 Nxd4 Re8 f3 Bf8 g4 Nc5 Kh1 c6', say: "White grabs kingside space with f3 and g4; Black regroups the bishop to …Bf8 on the long diagonal and lands …Nc5, a fine outpost hitting the e4-pawn. There is the Tartakower tabiya — and this is the Old Indian line to choose: by trading …exd4 early Black frees the cramped position and sidesteps White's d5-clamp, the trap the passive …c6 lines fall into. White still has a touch more space, but Black is rock-solid, flexible, and active — and it scores best in practice (47% at masters, 48% at club, versus just 39% for the …c6 cramp).", sayShort: '…Nc5 — the outpost; the best Old Indian try.', highlights: [H('c5', KEY)] }),
    ],
  },
  'old-indian-defence::Old Indian: Ukrainian Variation': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Ukrainian (…e5 early)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ou1', moves: 'd4 Nf6 c4 d6 Nc3 e5', say: "The Ukrainian Old Indian — Black strikes with …e5 as early as move 3, the most direct version. It immediately challenges White's centre and keeps Black's structure compact and flexible, the Old Indian's calling card.", sayShort: '…e5 — the direct early strike.', highlights: [H('e5', KEY)] }),
      b({ id: 'ou2', moves: 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 g3 Be7 Bg2 O-O O-O c6 e4 a5', say: "Against White's fianchetto, Black develops …Be7, castles, braces the centre with …c6, and then begins the thematic queenside expansion with …a5. The plan is clear: gain space and counterplay on the wing where Black is better placed.", sayShort: '…c6, …a5 — brace and expand queenside.', highlights: [H('c6', KEY), H('a5', SOFT)] }),
      b({ id: 'ou3', moves: 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 g3 Be7 Bg2 O-O O-O c6 e4 a5 h3 Re8 Be3 a4 Qc2 Qa5', say: "Black pushes …a4 to fix a queenside target and swings …Qa5 to pressure White's queenside while …Re8 backs the e5-point and readies …exd4. There is the Ukrainian tabiya: a solid, flexible Old Indian with genuine queenside counterplay. The engine likes White's centre, but in practice Black holds comfortably — scoring 50% even at master level.", sayShort: '…a4, …Qa5 — queenside counterplay.', highlights: [H('a4', KEY), H('a5', SOFT)] }),
    ],
  },
  'old-indian-defence::Old Indian: Czech Variation': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Czech (…c6 and …b5)', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'c1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O', say: "The Czech set-up — Black builds the standard Old Indian foothold with …d6, …Nbd7, …e5 and …Be7, castles, and prepares the …c6 system: a flexible wall that keeps every plan open while White commits first.", sayShort: '…O-O — the Czech foothold.', highlights: [H('e5')] }),
      b({ id: 'c2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 a6', say: "…c6 blunts any d5-advance and …a6 reveals the modern plan: queenside expansion with …b5. This is how strong players handle the Czech today — not the old …c5 lock, which hands White a lasting space pull, but flexible expansion that keeps the centre tension alive.", sayShort: '…a6 — prepare the …b5 expansion.', highlights: [H('c6'), H('a6')] }),
      b({ id: 'c3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 a6 Bf1 b5', say: "Bf1 tucks the bishop back, and …b5! lands — the expansion the whole setup prepared. The pawn gains real queenside space, leans on the c4-pawn, and clears b7 for the bishop's long diagonal.", sayShort: '…b5 — the expansion lands.', highlights: [H('b5'), H('c4', SOFT), H('b7', SOFT)] }),
      b({ id: 'c4', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 a6 Bf1 b5 a3 Bb7 Bg5 h6', say: "a3 restrains any …b4 push, …Bb7 completes the plan with the bishop settled on the long diagonal, Bg5 develops with a nudge at the f6-knight, and …h6 puts the question. Be honest about the balance: White's central space still buys a pull of about half a pawn — the Old Indian's rent — but this data-backed expansion keeps Black solid, flexible, and full of queenside play, a clear upgrade on the old locked …c5 fortress.", sayShort: '…h6 — question the g5-bishop.', highlights: [H('h6'), H('g5'), H('b7', SOFT)] }),
    ],
  },

  'old-indian-defence::Old Indian: Be2 Development': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Be2/Qc2 System', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'e1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O', say: "Against White's classical Be2 and Qc2 development, Black sets up the same reliable Old Indian foothold: …d6, …Nbd7, …e5, …Be7, castle. Solidity first; the plan crystallises once White shows how he handles the centre.", sayShort: '…O-O — the reliable foothold.', highlights: [H('e5')] }),
      b({ id: 'e2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 a6', say: "…c6 restrains the d5-advance and …a6 follows the modern recipe — the same flexible expansion shape the Czech uses. White's Qc2 eyes the queenside and supports e4; Black commits to nothing and prepares everything.", sayShort: '…a6 — the modern recipe.', highlights: [H('c6'), H('a6')] }),
      b({ id: 'e3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 a6 Rd1 Qc7 Bg5 Re8', say: "Rd1 takes the d-file, so …Qc7 steps off it at once, keeping the e5-pawn covered from the side. Bg5 develops with a nudge at the f6-knight; …Re8 backs the e-file. Every Black piece takes a square it will not regret.", sayShort: '…Re8 — off the file, back the e-pawn.', highlights: [H('c7'), H('e8'), H('g5', SOFT)] }),
      b({ id: 'e4', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 a6 Rd1 Qc7 Bg5 Re8 Rac1 h6', say: "Rac1 completes White's setup and …h6 puts the question to the g5-bishop. The honest ledger: White's space advantage is a steady pull that grows toward a full pawn if Black merely waits — so the plan matters. The …exd4 trade at the right moment, the e-file rook, and the …Nc5 hop are where Black's counterplay lives; play them actively and the Be2 system stays a fight, not a squeeze.", sayShort: '…h6 — question, then counterplay.', highlights: [H('h6'), H('g5'), H('c5', SOFT)] }),
    ],
  },
};
