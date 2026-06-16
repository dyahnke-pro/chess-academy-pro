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
  'benko-gambit::Modern 5.f3 System': {
    openingId: 'benko-gambit', title: 'Benko Gambit — vs the Modern 5.f3', minutes: 10, orientation: 'black',
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    beats: [
      b({ id: 'mf1', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 f3', say: "The critical modern test of the Benko: instead of fianchettoing, White plays f3, bracing a big e4-centre and keeping the light-squared bishop home to blunt Black's pressure on the a6-f1 diagonal. Black's recommendation here is to trust the gambit's logic — the queenside files and the dark-squared bishop are still worth the pawn.", sayShort: "f3 — White's critical e4-centre try.", highlights: [H('e4', SOFT)] }),
      b({ id: 'mf2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 f3 g6 e4 Bxf1 Kxf1', say: "Black continues …g6 to fianchetto, and forces the same Benko dividend with …Bxf1 — White must recapture Kxf1, losing the right to castle. Even in the solid 5.f3 set-up, Black strips White's king of its shelter and gains time; the queenside attack will come all the same.", sayShort: '…Bxf1 — Kxf1, no castling again.', highlights: [H('f1', SOFT)] }),
      b({ id: 'mf3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 f3 g6 e4 Bxf1 Kxf1 Bg7 g3 Nfd7', say: "Black completes the Benko machine — …Bg7 on the long diagonal and …Nfd7 rerouting toward c5/e5 and clearing the way for …Qa5 and the rooks. There is the 5.f3 tabiya: White has the broad e4-centre, but Black has the open a- and b-files, the fianchettoed bishop, and the standard lasting compensation. The practical record is excellent — Black scores around sixty percent here, proving the gambit holds even against the critical line.", sayShort: '…Bg7, …Nfd7 — full comp vs the big centre.', highlights: [H('g7')] }),
    ],
  },

  'benko-gambit::Fully Accepted: Main Line': {
    openingId: 'benko-gambit', title: 'Benko Gambit — Fully Accepted Main Line', minutes: 11, orientation: 'black',
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    beats: [
      b({ id: 'fa1', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6', say: "The Benko Gambit. Black throws in …b5 and, after the trades, gives up the pawn for good with …Bxa6. There is no immediate threat and no cheap trick — Black is simply buying the two half-open files on the queenside and a beautiful diagonal for the dark-squared bishop. It is the soundest, most positional gambit in chess: long-term pressure for a single pawn.", sayShort: '…Bxa6 — sac the pawn for queenside files.', highlights: [H('a6', SOFT)] }),
      b({ id: 'fa2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1', say: "Black trades the light-squared bishops with …Bxf1, and White must recapture with the king — Kxf1, forfeiting the right to castle. That is a quiet triumph for the gambiteer: White's king is stuck in the centre and will spend several moves shuffling to safety while Black develops with gain of time.", sayShort: "…Bxf1 — strip White's castling rights.", highlights: [H('f1', SOFT)] }),
      b({ id: 'fa3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2 O-O Nf3 Nbd7', say: "Black assembles the dream Benko set-up: …g6 and …Bg7 putting the bishop on the long diagonal, …O-O for safety, …Nbd7 heading for the queenside. White's king crawls to g2. Every black piece has a natural, purposeful home — and they all point at White's queenside.", sayShort: '…Bg7, …Nbd7 — the Benko machine assembles.', highlights: [H('g7')] }),
      b({ id: 'fa4', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2 O-O Nf3 Nbd7 Re1 Qa5 Qc2 Rfb8 Bd2 Ng4 h3 Nge5', say: "Here is the full Benko engine running: …Qa5 and …Rfb8 double the rooks on the open a- and b-files, and …Ng4-e5 plants a knight on the magnificent central outpost. Both rooks, the queen and the bishop all bear down on White's queenside. This is why the Benko is feared: the pawn is long gone, but Black's pressure is permanent and easy to play, while White must defend passively for fifty moves. The practical score is excellent — Black wins here far more often than the pawn count suggests.", sayShort: '…Qa5, …Rfb8, …Ne5 — permanent pressure.', highlights: [H('a5'), H('b8'), H('e5')] }),
    ],
  },

  'benko-gambit::Fianchetto Variation': {
    openingId: 'benko-gambit', title: 'Benko Gambit — the Fianchetto Variation', minutes: 10, orientation: 'black',
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    beats: [
      b({ id: 'bf1', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6', say: "The Benko Gambit with an early …g6 — Black signals the fianchetto at once. White will set up calmly, but the gambit's logic is unchanged: surrender the b-pawn to open the a- and b-files and prepare the long-diagonal fianchetto. Pressure, not material, is the currency.", sayShort: '…g6 — fianchetto-first Benko.', highlights: [H('g6', SOFT)] }),
      b({ id: 'bf2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 e4 Bxf1 Kxf1', say: "Black recaptures …Bxa6 and immediately trades it off with …Bxf1, forcing Kxf1. The same Benko dividend: White's king loses castling and is stranded in the centre, buying Black time to mass on the queenside.", sayShort: '…Bxf1 — King to f1, no castling.', highlights: [H('f1', SOFT)] }),
      b({ id: 'bf3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 e4 Bxf1 Kxf1 d6 g3 Bg7 Kg2 O-O Nf3 Nbd7', say: "Black completes development — …d6, …Bg7 on the diagonal, …O-O, …Nbd7 — while White's king tucks onto g2 behind its fianchetto. Black's structure is harmonious and the plan needs no calculation: occupy the open files and squeeze.", sayShort: '…Bg7, …O-O — harmonious Benko setup.', highlights: [H('g7')] }),
      b({ id: 'bf4', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 e4 Bxf1 Kxf1 d6 g3 Bg7 Kg2 O-O Nf3 Nbd7 Re1 Qa5 Qc2 Rfb8', say: "…Qa5 and …Rfb8 complete the Benko picture — the queen and both rooks swing onto the a- and b-files, pressing White's queenside pawns and the c3-knight. There is the tabiya: full, lasting compensation for the pawn, an easy plan for Black and a long passive defence for White. The Benko wins games precisely because that pressure never goes away.", sayShort: '…Qa5, …Rfb8 — files seized, lasting pressure.', highlights: [H('a5'), H('b8')] }),
    ],
  },

  'benko-gambit::King Walk Variation': {
    openingId: 'benko-gambit', title: 'Benko Gambit — the King Walk', minutes: 10, orientation: 'black',
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    beats: [
      b({ id: 'kw1', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1', say: "The King Walk line — the main accepted Benko, named for White's wandering monarch. Black sacrifices the pawn, recaptures …Bxa6, and trades it for the f1-bishop, forcing Kxf1. White's king has no castle to run to; it must walk to safety on foot.", sayShort: '…Bxf1 Kxf1 — the king must walk.', highlights: [H('f1', SOFT)] }),
      b({ id: 'kw2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 Nf3 Bg7 g3 O-O Kg2', say: "Black develops …g6, …Bg7 and …O-O while White's king completes its trek to g2. The fianchettoed bishop rakes the long diagonal, and Black is fully mobilised — the gambit pawn already forgotten, the pressure just beginning.", sayShort: '…Bg7, …O-O — Black fully mobilised.', highlights: [H('g7')] }),
      b({ id: 'kw3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 Nf3 Bg7 g3 O-O Kg2 Nbd7 a4 Qa5', say: "…Nbd7 develops the last piece; White grabs queenside space with a4, but …Qa5 pins it down — the queen eyes the a4-pawn, the c3-knight and the queenside dark squares. Black's pieces are already swarming the wing where White is weakest.", sayShort: '…Qa5 — pin down a4 and the queenside.', highlights: [H('a5'), H('a4', SOFT)] }),
      b({ id: 'kw4', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 Nf3 Bg7 g3 O-O Kg2 Nbd7 a4 Qa5 Re1 Rfb8', say: "…Rfb8 brings the rook to the half-open b-file, completing the queenside battery. There is the King Walk tabiya: the queen on a5, rooks on a8 and b8, the bishop on g7 — every piece pressing White's queenside, with White's king and rooks tied to passive defence. Classic, permanent Benko compensation, and a practical scoring machine for Black.", sayShort: '…Rfb8 — the queenside battery is complete.', highlights: [H('b8'), H('a5')] }),
    ],
  },

  'benko-gambit::Benko Declined: Nf3 System': {
    openingId: 'benko-gambit', title: 'Benko — The Declined (Nf3 System)', minutes: 10, orientation: 'black',
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    beats: [
      b({ id: 'd1', moves: 'd4 Nf6 c4 c5 d5 b5 Nf3', say: "The Declined — rather than grab the b-pawn, White develops Nf3 and lets Black resolve the tension. This avoids the open a- and b-files of the Accepted Benko, but it also lets Black off the hook: Black simply takes on c4 and gets an easy, comfortable game.", sayShort: 'Nf3 — White declines the pawn.', highlights: [H('c4', SOFT)] }),
      b({ id: 'd2', moves: 'd4 Nf6 c4 c5 d5 b5 Nf3 bxc4 Nc3 g6', say: "…bxc4 grabs the pawn, and …g6 prepares the trademark fianchetto. Black has won a pawn (which White will regain) but more importantly keeps the open b-file and the Benko's natural setup. The structure favours Black's easy development.", sayShort: '…bxc4, …g6 — grab the pawn, fianchetto.', highlights: [H('g6')] }),
      b({ id: 'd3', moves: 'd4 Nf6 c4 c5 d5 b5 Nf3 bxc4 Nc3 g6 e4 d6 Bxc4 Bg7 O-O O-O', say: "e4 d6 and Bxc4 regains the pawn; Black fianchettoes …Bg7 and castles. The bishop rakes the long diagonal toward d4 and b2 — the same Benko pressure, now in a fully-developed, comfortable position with no risk.", sayShort: '…Bg7, O-O — the long-diagonal fianchetto.', highlights: [H('d4')] }),
      b({ id: 'd4m', moves: 'd4 Nf6 c4 c5 d5 b5 Nf3 bxc4 Nc3 g6 e4 d6 Bxc4 Bg7 O-O O-O h3 Nbd7 Re1 Nb6 Bf1', say: "…Nbd7 and …Nb6 reroute the knight to hit the c4-bishop and the queenside, forcing Bf1. There is the Declined tabiya: Black has the fianchettoed bishop, the half-open b-file, pressure on the queenside, and a completely sound position. When White declines, Black gets the Benko's grip with none of the risk.", sayShort: '…Nb6 — hit c4, the Benko grip without risk.', highlights: [H('c4')] }),
    ],
  },

  'benko-gambit::Zaitsev Variation': {
    openingId: 'benko-gambit', title: 'Benko — The Zaitsev (White Keeps the Pawn)', minutes: 10, orientation: 'black',
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    beats: [
      b({ id: 'z1', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4', say: "The Zaitsev — White tries to keep the extra pawn with Nc3 and e4 rather than return it. Black recaptures …axb5 and faces e4, which clamps the centre. But White's grip on the b5-pawn comes at a cost: time and queenside weaknesses Black will exploit.", sayShort: '…axb5 — meet the pawn-grab attempt.', highlights: [H('b5'), H('e4', SOFT)] }),
      b({ id: 'z2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4 b4', say: "…b4! The key move. Instead of letting White round up the pawn, Black pushes it forward, kicking the c3-knight and gaining queenside space. The b4-pawn becomes a thorn that cramps White's queenside for the rest of the game.", sayShort: '…b4 — push the pawn, cramp the queenside.', highlights: [H('b4')] }),
      b({ id: 'z3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4 b4 Nb5 d6 Bc4 g6', say: "Nb5 sidesteps and Black plays …d6 and …g6, heading for the fianchetto. The b4-pawn restrains White's queenside pawns, the a-file is open for the rook, and Black has the familiar Benko pressure plus an extra space-grabbing pawn.", sayShort: '…d6, …g6 — fianchetto behind the b4-pawn.', highlights: [H('g6'), H('b4', SOFT)] }),
      b({ id: 'z4', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4 b4 Nb5 d6 Bc4 g6 Nf3 Bg7 O-O O-O', say: "…Bg7 fianchettoes onto the long diagonal and Black castles. There is the Zaitsev tabiya: White nominally has the extra pawn, but the b4-pawn cramps his queenside, the a-file is Black's, and the g7-bishop rakes the centre toward d4. Black has full compensation and an easy, pressing game.", sayShort: '…Bg7, O-O — full Benko compensation.', highlights: [H('d4')] }),
    ],
  },

  'benko-gambit::Half-Accepted': {
    openingId: 'benko-gambit', title: 'Benko — The Half-Accepted (e3)', minutes: 10, orientation: 'black',
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    beats: [
      b({ id: 'h1', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 e3', say: "The Half-Accepted — White takes on b5 but then plays the modest e3, returning the pawn to blunt Black's pressure and develop quickly. Black is happy: recapturing on a6 leaves an open a-file and active piece play, with no structural concessions.", sayShort: 'e3 — White returns the pawn for development.', highlights: [H('a6', SOFT)] }),
      b({ id: 'h2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 e3 axb5 Bxb5 Qa5+', say: "…axb5 Bxb5 and the in-between check …Qa5+! — Black develops the queen with tempo, forcing White to react. The check disrupts White's coordination and lets Black seize the initiative on the queenside straight away.", sayShort: '…Qa5+ — develop the queen with tempo.', highlights: [H('a5')] }),
      b({ id: 'h3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 e3 axb5 Bxb5 Qa5+ Nc3 Bb7', say: "Nc3 blocks the check, and …Bb7 develops the light bishop onto the long diagonal, eyeing the d5-pawn and beyond. Black's pieces flood out with purpose — the queen active on a5, the bishop on b7, the a-file open. The Benko initiative, even with the pawn returned.", sayShort: '…Bb7 — bishop to the long diagonal.', arrows: [A('b7', 'd5')], highlights: [H('d5')] }),
      b({ id: 'h4', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 e3 axb5 Bxb5 Qa5+ Nc3 Bb7 Bd2 Qb6 Nf3 Nxd5 a4 e6 O-O Be7', say: "…Qb6 and …Nxd5! — Black regains the central pawn, the knight landing on a dominant square. After …e6 and …Be7 Black is fully developed with active pieces, the bishop pair pointing at the centre, and the open a-file. There is the Half-Accepted tabiya: easy equality with the initiative, exactly what the Benko promises.", sayShort: '…Nxd5 — regain the pawn, dominate the centre.', highlights: [H('d5')] }),
    ],
  },
};
