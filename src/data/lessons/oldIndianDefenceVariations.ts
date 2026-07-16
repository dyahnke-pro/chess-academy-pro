import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Old Indian Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Deepest beat ≥20 plies. Full 7/7 tab coverage as of 2026-07-16 — Janowski
// extended to 22p on the data/engine continuation (O-O c6 Qe2 cxd5); termini
// engine-screened (-0.69..-0.99, honest-framed as White's space pull).
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
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
  'old-indian-defence::Old Indian: Janowski Variation': {
    openingId: 'old-indian-defence', title: 'Old Indian — the Janowski …Bf5 (free the bishop first)', minutes: 8, orientation: 'black',
    sources: SRC,
    beats: [
      b({ id: 'j1', moves: 'd4 Nf6 c4 d6 Nc3 Bf5', say: "The Janowski move: …Bf5 walks the light-squared bishop OUT before …e5 walls it in. In every other Old Indian the c8-bishop is the problem child, staring at its own pawns for thirty moves — this line spends one early tempo to solve the problem permanently.", sayShort: '…Bf5 — free the problem bishop first.', highlights: [H('f5')] }),
      b({ id: 'j2', moves: 'd4 Nf6 c4 d6 Nc3 Bf5 f3 e5 e4 Bg6 d5 Be7', say: "White answers with f3 and e4, gaining a tempo on the bishop — but …Bg6 tucks it away still OUTSIDE the pawn chain, mission accomplished. When d5 closes the centre, note the cost White paid: the f3-pawn sits on his king's knight's best square. Black quietly completes with …Be7.", sayShort: '…Bg6 — outside the chain for good.', highlights: [H('g6'), H('f3', SOFT)] }),
      b({ id: 'j3', moves: 'd4 Nf6 c4 d6 Nc3 Bf5 f3 e5 e4 Bg6 d5 Be7 Be3 h6 Nh3 Nbd7 Bd3 O-O', say: "…h6 takes the g5-square away from White's pieces before castling. Watch White's king's knight: with f3 occupied by its own pawn, it develops to the rim on h3. Bd3 props up e4 and offers to trade off Black's freed bishop — the compliment tells you the …Bf5 idea worked.", sayShort: '…O-O — castle; the rim knight tells the story.', highlights: [H('h3'), H('g5', SOFT)] }),
      b({ id: 'j4', moves: 'd4 Nf6 c4 d6 Nc3 Bf5 f3 e5 e4 Bg6 d5 Be7 Be3 h6 Nh3 Nbd7 Bd3 O-O O-O c6 Qe2 cxd5', say: "Both sides castle and Black strikes at the head of the chain: …c6, then …cxd5, and however White recaptures, a file opens for Black's heavy pieces. Honest ledger: the engine gives White a real space pull here — this is the Old Indian's nature. What Black owns is a position with no weaknesses, the bishop that usually rots on c8 breathing on g6, and clear plans: the open c-file and the eventual …f5 break.", sayShort: '…cxd5 — open a file, trust the structure.', highlights: [H('d5'), H('c6', SOFT)] }),
    ],
  },

  'old-indian-defence::Old Indian: Main Line with d5': {
    openingId: 'old-indian-defence', title: 'Old Indian — the Main Line liquidation (…Nh5!)', minutes: 8, orientation: 'black',
    sources: SRC,
    beats: [
      b({ id: 'm1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5', say: "The classical tabiya: Black's modest …d6/…e5 centre, knights on f6 and d7, everything castled — and White clamps the centre shut with d5. The position looks cramped for Black, and it is. The next three moves show why that's not the end of the story.", sayShort: 'd5 — White clamps; Black has a plan.', highlights: [H('d5'), H('e5', SOFT)] }),
      b({ id: 'm2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 a5 a3 Nh5', say: "…a5 stakes out queenside space and stops any b4 expansion cold. Then the key move: …Nh5 — the f6-knight heads for the f4-hole in front of White's king, and suddenly White has a concrete problem to solve instead of a free hand.", sayShort: '…Nh5 — aim at the f4-hole.', arrows: [], highlights: [H('f4'), H('a5', SOFT)] }),
      b({ id: 'm3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 a5 a3 Nh5 Nxe5 Nxe5 Bxh5 Nxc4', say: "White grabs the e5-pawn, Black recaptures with the d7-knight, White snaps the h5-knight — and …Nxc4! squares the ledger, the knight collecting the c4-pawn and poking at b2 on arrival. Two pairs of minor pieces have left the board and the cramp went with them. The engine keeps a modest White pull — space is space — but Black traded a passive position for an active knight and full freedom. That liquidation trick is the whole reason to know this move order.", sayShort: '…Nxc4 — the ledger squared, the cramp gone.', arrows: [A('c4', 'b2', ATK)], highlights: [H('c4')] }),
    ],
  },

  'old-indian-defence::Old Indian: Seirawan System': {
    openingId: 'old-indian-defence', title: 'Old Indian — the Seirawan piece dance', minutes: 8, orientation: 'black',
    sources: SRC,
    beats: [
      b({ id: 's1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 a5', say: "The same closed tabiya as the main line: d5 clamps the centre, …a5 answers on the queenside. Here White declines the direct plans and plays a slower hand — and Black's pieces show what maneuvering chess looks like.", sayShort: '…a5 — space first, dance second.', highlights: [H('a5'), H('d5', SOFT)] }),
      b({ id: 's2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 a5 Qc2 Qc7', say: "Qc2 and …Qc7 — the queens mirror each other into the c-file's shadow. Black's queen slot does triple duty from c7: it covers e5, backs any future …c-file opening, and clears d8 for a rook. Waiting moves that improve are not really waiting moves.", sayShort: '…Qc7 — triple duty from one square.', highlights: [H('c7')] }),
      b({ id: 's3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 a5 Qc2 Qc7 Be3 Ng4 Bd2 Nc5', say: "Now the dance: Be3 develops, …Ng4 immediately hits it, and the bishop backs down to d2 rather than concede the dark squares. Then …Nc5 — the d7-knight lands on the queenside's best square, biting on e4. Two knight hops and White's bishop pair is shuffling while Black's cavalry sets the agenda. The engine keeps White's space pull modest; Black has zero weaknesses and every piece on an improving square — the Old Indian played the way its believers play it.", sayShort: '…Nc5 — the cavalry sets the agenda.', arrows: [A('c5', 'e4', ATK), A('g4', 'e3', ATK)], highlights: [H('c5'), H('g4')] }),
    ],
  },
};