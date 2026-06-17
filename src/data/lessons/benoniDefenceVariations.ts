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
  'benoni-defence::Classical Variation (Bf4 — d6 Pressure)': {
    openingId: 'benoni-defence', title: 'Benoni — The Classical (Bf4)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'bc1', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 Bf4', say: "The Modern Benoni against the Classical Bf4 set-up: Black gets the trademark Benoni structure and White develops the bishop actively to f4, leaning on the d6-pawn. Black willingly accepts a space disadvantage for the dynamic counterplay the Benoni lives on.", sayShort: 'Bf4 — White leans on d6.', highlights: [H('f4', KEY), H('d6', SOFT)] }),
      b({ id: 'bc2', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 Bf4 Bg7 e3 O-O Be2 Re8', say: "Black fianchettoes …Bg7 onto the long diagonal and posts …Re8 on the half-open e-file. Those two pieces — the raking bishop and the e-file rook — are the engines of Black's counterplay against White's centre.", sayShort: '…Bg7, …Re8 — the counterplay engines.', highlights: [H('g7', KEY), H('e8', SOFT)] }),
      b({ id: 'bc3', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 Bf4 Bg7 e3 O-O Be2 Re8 Nd2 Na6 O-O Nc7', say: "White reroutes Nd2 to bolster the centre, and Black plays the …Na6-c7 manoeuvre to brace the …b5 break and lean on d5. There is the Classical Benoni tabiya: the g7-bishop, the e-file rook, and the …b5 lever loaded. Be honest — White's space gives a small pull, but it's sharp and double-edged, and Black scores well in practice playing for the …b5 and …f5 breaks.", sayShort: '…Nc7 — load …b5, pressure d5.', highlights: [H('c7', KEY), H('d5', SOFT)] }),
    ],
  },
  'benoni-defence::Czech Benoni (...e5 Closed Center)': {
    openingId: 'benoni-defence', title: 'Benoni — The Czech (Closed Centre)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'bz1', moves: 'd4 Nf6 c4 c5 d5 e5', say: "The Czech Benoni — Black locks the centre completely with …c5 and …e5, declining to open a single line. It is the most solid, closed member of the Benoni family: a slow manoeuvring battle where Black bides his time and aims for the …f5 break behind the locked pawns.", sayShort: '…e5 — lock the centre, close the game.', highlights: [H('e5', KEY), H('c5', SOFT)] }),
      b({ id: 'bz2', moves: 'd4 Nf6 c4 c5 d5 e5 Nc3 d6 e4 Be7 g3 O-O Bg2 Ne8', say: "Black completes the closed structure with …d6 and …Be7, castles, and begins the long knight reroute …Ne8 — bound for g7 to support the …f5 break. Pure patient, manoeuvring chess.", sayShort: '…Ne8 — reroute toward the …f5 break.', highlights: [H('e8', KEY), H('d6', SOFT)] }),
      b({ id: 'bz3', moves: 'd4 Nf6 c4 c5 d5 e5 Nc3 d6 e4 Be7 g3 O-O Bg2 Ne8 Nge2 g6 O-O Ng7 f4 exf4 gxf4 Bg4', say: "White prepares and plays f4; after …exf4 gxf4 the position opens a crack, and …Bg4 develops with a pin. There is the Czech tabiya: a closed manoeuvring struggle where …Ng7 and …Bg4 set up the …f5 break. Honestly, White's space gives a pull, but the structure is rock-solid and holds up well in practice (49% at club).", sayShort: '…Ng7, …Bg4 — prep …f5, rock-solid.', highlights: [H('g7', KEY), H('g4', SOFT)] }),
    ],
  },
  'benoni-defence::Snake Benoni (...Bd7-a4 Maneuver)': {
    openingId: 'benoni-defence', title: 'Benoni — The Snake (…Na6-c7)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'sn1', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7', say: "The Modern Benoni: Black challenges with …c5 and …e6, trades to hand White the big d5/e4 pawn duo, then fianchettoes …Bg7 onto the long diagonal. It's a deliberate bargain — Black accepts a space disadvantage in return for dynamic piece play and the thematic …b5 break.", sayShort: '…Bg7 — fianchetto, accept the space bind.', highlights: [H('g7', KEY)] }),
      b({ id: 'sn2', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O Re8 Nd2 Na6', say: "Both sides castle; Black posts …Re8 to pressure the e-file and the e4-pawn, then starts the Snake manoeuvre with …Na6, the knight heading for c7. White repositions Nd2 to bolster e4 and prepare a queenside answer.", sayShort: '…Re8, …Na6 — pressure e4, start the Snake.', highlights: [H('a6', KEY), H('e8', SOFT)] }),
      b({ id: 'sn3', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O Re8 Nd2 Na6 Re1 Nc7', say: "White contests the e-file with Re1, and Black completes the Snake with …Nc7 — the knight now braces the …b5 break and eyes the d5-pawn. There is the Snake Benoni tabiya: the g7-bishop raking the long diagonal, the rook pressuring e4, and the …b5 lever loaded — the classic dynamic Benoni counterplay against White's central space.", sayShort: '…Nc7 — load …b5, eye d5.', highlights: [H('c7', KEY)] }),
    ],
  },
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
      b({ id: 't4', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6 O-O Nc7 Bd3 a6', say: "O-O …Nc7 chases the b5-bishop back to d3, and …a6 clamps the queenside, preparing …b5. There is the Taimanov tabiya: Black fully developed and the standard Benoni queenside counterplay underway. Be honest about where this stands — the Taimanov is the toughest anti-Benoni and White's space still gives a real pull; Black is slightly worse but fully in the fight, with the dynamic …b5 break to bank on. A difficult, double-edged game, not an equaliser.", sayShort: '…a6 — clamp, prepare …b5; tough but playable.', highlights: [H('a6')] }),
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
