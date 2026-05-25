import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Benoni Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Deepest beat ≥20 plies. Classical Bf4/Czech/Snake anchor <20p in the curated
// pgn, so they fold into the main rather than ship thin.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Modern_Benoni'];

export const BENONI_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'benoni-defence::Fianchetto Variation (g3/Bg2)': {
    openingId: 'benoni-defence', title: 'Benoni — The Fianchetto (g3/Bg2)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'f1', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 g3 Bg7', say: "The Fianchetto — White's most solid anti-Benoni, meeting Black's bishop with one on g2 to guard the long light diagonal and the d5-pawn. Black sets up the standard Benoni structure; the play will be slower and more positional than the sharp e4 lines.", sayShort: '…Bg7 — set up vs the calm fianchetto.', highlights: [H('g7')] }),
      b({ id: 'f2', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 g3 Bg7 Bg2 O-O O-O Nbd7', say: "Both fianchetto and castle, and Black chooses the flexible …Nbd7 — the knight heads for e5, the great Benoni outpost where it cannot be challenged by a pawn and dominates the centre.", sayShort: '…Nbd7 — route the knight to e5.', highlights: [H('e5', SOFT)] }),
      b({ id: 'f3', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 g3 Bg7 Bg2 O-O O-O Nbd7 Nd2 Re8', say: "Nd2 reroutes toward c4 and Black plays …Re8, the rook on the half-open e-file pressuring e2 and the e-pawn break. The pieces take their classic Benoni squares, all geared to the …b5 and …e-file play to come.", sayShort: '…Re8 — the e-file, prep the breaks.', highlights: [H('e8')] }),
      b({ id: 'f4', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 g3 Bg7 Bg2 O-O O-O Nbd7 Nd2 Re8 a4 Ne5', say: "a4 restrains …b5, but …Ne5! plants the knight on the dream outpost — central, untouchable, eyeing c4, d3 and f3. There is the Fianchetto tabiya: a strong knight on e5, the g7-bishop on the diagonal, and Black ready to expand with …a6/…b5 or play on the central dark squares. A rich positional Benoni.", sayShort: '…Ne5 — the dream central outpost.', highlights: [H('e5')] }),
    ],
  },

  'benoni-defence::Taimanov Variation (f4/Bb5+)': {
    openingId: 'benoni-defence', title: 'Benoni — The Taimanov (f4/Bb5+)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 't1', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+', say: "The Taimanov — White's most aggressive try, the pawns on e4 and f4 plus the awkward check Bb5+, aiming to blow Black off the board before the pieces are developed. The most dangerous line for an unprepared Benoni player.", sayShort: 'Bb5+ — the sharpest, most aggressive try.', highlights: [H('e4'), H('f4')] }),
      b({ id: 't2', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7', say: "…Nfd7! the precise block — not …Bd7 or …Nbd7, but this knight, keeping the long diagonal open for the g7-bishop and preparing to challenge White's centre. The accurate move-order is everything against the Taimanov.", sayShort: '…Nfd7 — the precise block.', highlights: [H('d7')] }),
      b({ id: 't3', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6', say: "a4 grabs queenside space, Black castles, and …Na6 develops toward c7 — defending and rerouting. Black weathers the early storm by completing development; once the pieces are out, White's over-extended pawns become targets.", sayShort: '…Na6 — develop, ride out the storm.', highlights: [H('a6')] }),
      b({ id: 't4', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6 O-O Nc7 Bd3 a6', say: "O-O …Nc7 chases the b5-bishop back to d3, and …a6 clamps the queenside, preparing …b5. There is the Taimanov tabiya: Black fully developed, White's aggressive pawns now fixed targets, and the standard Benoni queenside counterplay underway. The storm survived, the game equalised.", sayShort: '…a6 — clamp, prepare …b5, fully equal.', highlights: [H('a6')] }),
    ],
  },

  'benoni-defence::Four Pawns Attack (...Ng4 Counter)': {
    openingId: 'benoni-defence', title: 'Benoni — The Four Pawns Attack', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'p1', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Nf3 O-O', say: "The Four Pawns Attack — White grabs the maximum centre with c4, d5, e4 and f4. It is the most ambitious anti-Benoni and the most over-extended: every one of those pawns is a target. Black castles and prepares to strike.", sayShort: '…O-O — castle vs the maximal centre.', highlights: [H('e4'), H('f4')] }),
      b({ id: 'p2', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Nf3 O-O Be2 Re8', say: "…Re8 piles onto the half-open e-file, training on the e4-pawn and bracing for the e5-break White is dying to play. Black invites the advance — because once the centre moves, it cracks.", sayShort: '…Re8 — e-file, dare the e5-push.', arrows: [A('e8', 'e4')], highlights: [H('e8'), H('e4')] }),
      b({ id: 'p3', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Nf3 O-O Be2 Re8 e5 dxe5 fxe5 Ng4', say: "e5 dxe5 fxe5 and …Ng4! the key counter — the knight hits the e5-pawn and the f2-square, exploiting the holes the pawn-storm left. The over-extended centre is already cracking under the tactical pressure.", sayShort: '…Ng4 — hit e5 and f2, crack the centre.', arrows: [A('g4', 'e5')], highlights: [H('g4'), H('e5')] }),
      b({ id: 'p4', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Nf3 O-O Be2 Re8 e5 dxe5 fxe5 Ng4 Bg5 Qb6 O-O Nxe5 Nxe5 Rxe5 Bf4 Re8', say: "…Qb6 piles on, and …Nxe5! wins the pawn back by force — Nxe5 Rxe5 Bf4 …Re8 and the dust settles with the grand centre dismantled and Black's pieces dominant. There is the Four Pawns tabiya: maximum over-extension, maximum punishment — the Benoni dream.", sayShort: '…Nxe5 — regain the pawn, centre gone.', highlights: [H('e5'), H('e8')] }),
    ],
  },
};
