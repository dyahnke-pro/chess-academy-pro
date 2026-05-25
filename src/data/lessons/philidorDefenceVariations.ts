import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Philidor Defence. Lead-the-eye §5a.
// Moves come from repertoire.json variation pgn lines (DB-anchored, G3); prose
// only is authored. Deepest beat ≥20 plies (lessonDepth gate).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['book:philidor-defence', 'concept:pos-center', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/Philidor_Defence'];

export const PHILIDOR_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'philidor-defence::Exchange Variation': {
    openingId: 'philidor-defence', title: 'Philidor — The Exchange Variation', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'x1', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6', say: "The Exchange — Black resolves the tension early with …exd4. After Nxd4 the centre is open and Black plays …Nf6, hitting the e4-pawn. The position resembles a comfortable Sicilian-style middlegame where Black has no weaknesses and clear piece play.", sayShort: '…Nf6 — open centre, strike e4.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
      b({ id: 'x2', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Nbd7', say: "Black develops smoothly — …Be7, castle, and the flexible …Nbd7 heading for the strong c5-square. Every piece has a natural home; the open centre gives Black free, easy development with the d-file and the half-open e-file to work on.", sayShort: '…Nbd7 — flexible, heading for c5.', highlights: [H('c5', SOFT)] }),
      b({ id: 'x3', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Nbd7 f4 Nc5 Bf3 Re8', say: "f4 grabs space, but it loosens White's centre — …Nc5 leaps to the outpost, eyeing e4, and …Re8 piles onto the e-file behind it. Black's pieces are the more active, and the f4-advance is a target as much as a threat.", sayShort: '…Nc5 — outpost knight, eye e4.', arrows: [A('c5', 'e4')], highlights: [H('c5'), H('e4')] }),
      b({ id: 'x4', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Nbd7 f4 Nc5 Bf3 Re8 Kh1 a5 Be3 a4 a3 Bf8', say: "…a5–a4 gains queenside space and fixes the a3-pawn as a weakness; …Bf8 regroups the bishop to the long diagonal and bolsters the kingside. Black expands on the side where White has over-extended.", sayShort: '…a4, …Bf8 — queenside space, regroup.', highlights: [H('a4'), H('f8')] }),
      b({ id: 'x5', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Nbd7 f4 Nc5 Bf3 Re8 Kh1 a5 Be3 a4 a3 Bf8 Qd2 c6 Rad1 Qa5 Rfe1 Bd7', say: "…c6 shores up d5, and the queen swings to …Qa5 — active, pinning down the queenside and the a3-pawn — while …Bd7 completes the army. There is the Exchange tabiya: a fully coordinated Black position with the c5-knight dominant, queenside space, and White's f4/a3 advances as long-term targets.", sayShort: '…Qa5 — active queen, press a3.', highlights: [H('a5'), H('a3')] }),
    ],
  },

  'philidor-defence::Antoshin Variation': {
    openingId: 'philidor-defence', title: 'Philidor — The Antoshin (dxe5 Nxe4)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'a1', moves: 'e4 e5 Nf3 d6 d4 Nf6 dxe5 Nxe4', say: "When White grabs with dxe5, Black recaptures the centre pawn with …Nxe4 — heading into a Petrov-like symmetry rather than chasing the e5-pawn. The structure is clean and Black has no problems equalising.", sayShort: '…Nxe4 — recover the pawn, clean game.', highlights: [H('e4'), H('e5', SOFT)] }),
      b({ id: 'a2', moves: 'e4 e5 Nf3 d6 d4 Nf6 dxe5 Nxe4 Bd3 d5 Nbd2 Nxd2 Bxd2', say: "Bd3 hits the knight, …d5 anchors it just as in the Petrov, and after Nbd2 …Nxd2 Bxd2 a pair of knights comes off. The d5-pawn is a rock, the position is symmetric, and Black is completely comfortable.", sayShort: '…d5 — anchor the knight, symmetric.', highlights: [H('d5')] }),
      b({ id: 'a3', moves: 'e4 e5 Nf3 d6 d4 Nf6 dxe5 Nxe4 Bd3 d5 Nbd2 Nxd2 Bxd2 Be7 O-O O-O c4 Nd7', say: "Black develops …Be7, castles, and meets c4 — White's bid for the d5-square — with the calm …Nd7, recapturing the e5-pawn next and keeping everything solid. No weaknesses, easy development.", sayShort: '…Nd7 — regain e5, stay solid.', arrows: [A('d7', 'e5')], highlights: [H('e5'), H('d5', SOFT)] }),
      b({ id: 'a4', moves: 'e4 e5 Nf3 d6 d4 Nf6 dxe5 Nxe4 Bd3 d5 Nbd2 Nxd2 Bxd2 Be7 O-O O-O c4 Nd7 cxd5 Nxe5 Nxe5 Qxd5', say: "cxd5 …Nxe5 Nxe5 …Qxd5 — Black regains both pawns and centralises the queen on d5, fully equal with the more active pieces. The early simplification has taken every drop of venom out of White's setup.", sayShort: '…Qxd5 — recover, centralise, equal.', highlights: [H('d5'), H('e5')] }),
      b({ id: 'a5', moves: 'e4 e5 Nf3 d6 d4 Nf6 dxe5 Nxe4 Bd3 d5 Nbd2 Nxd2 Bxd2 Be7 O-O O-O c4 Nd7 cxd5 Nxe5 Nxe5 Qxd5 Nf3 Bd6 Bc3 Bf5 Bxf5 Qxf5 Qd4 Rfe8 Rfe1 c6', say: "…Bd6 eyes the kingside, …Bf5 develops the last piece actively, the bishops come off, and …Rfe8 seizes the open e-file with …c6 sealing the centre. There is the Antoshin tabiya: a dead-level, weakness-free middlegame where Black's pieces are every bit as active as White's — the Philidor's quiet road to equality.", sayShort: '…Rfe8 — seize the e-file, equal.', highlights: [H('e8'), H('d6', SOFT)] }),
    ],
  },

  'philidor-defence::Nimzowitsch Variation': {
    openingId: 'philidor-defence', title: 'Philidor — The Nimzowitsch (Qe2/Nf5)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'n1', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6', say: "White chooses the Nimzowitsch set-up — Qe2 and Rd1, building quietly behind the centre. Black answers with the same Hanham scheme: …Nbd7 overprotecting e5, and …c6 preparing the freeing …d5. Solidity against solidity.", sayShort: '…c6 — Hanham setup, prep …d5.', arrows: [A('d7', 'e5')], highlights: [H('e5'), H('c6')] }),
      b({ id: 'n2', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6 Rd1 Qc7 a4 b6', say: "Rd1 lines up against the d-file; Black plays …Qc7, adding a guard to e5 and clearing the back rank, then …b6 to fianchetto. The queen on c7 and knight on d7 form the classic Philidor cluster around the e5-pawn.", sayShort: '…Qc7, …b6 — guard e5, fianchetto.', highlights: [H('c7'), H('e5', SOFT)] }),
      b({ id: 'n3', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6 Rd1 Qc7 a4 b6 dxe5 dxe5 Bg5 Bb7', say: "dxe5 dxe5 opens the d-file but hands Black the half-open structure he wants; …Bb7 develops the bishop, screened by the c6-pawn for now but ready to fire down the long diagonal the moment it opens. Bg5 pins, but Black is well-placed to break it.", sayShort: '…Bb7 — loaded behind c6.', highlights: [H('b7'), H('c6', SOFT)] }),
      b({ id: 'n4', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6 Rd1 Qc7 a4 b6 dxe5 dxe5 Bg5 Bb7 Nh4 Nc5 Nf5', say: "White's knight goes Nh4–f5, the thematic leap to the hole near Black's king. Black is unfazed: …Nc5 hits e4 and eyes the d3-square, and the f5-knight, for all its bluster, has no support and can simply be traded off.", sayShort: '…Nc5 — hit e4, ignore the Nf5.', arrows: [A('c5', 'e4')], highlights: [H('c5'), H('e4'), H('f5', SOFT)] }),
      b({ id: 'n5', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6 Rd1 Qc7 a4 b6 dxe5 dxe5 Bg5 Bb7 Nh4 Nc5 Nf5 Rfe8 Nxe7+ Rxe7 Rd2 Rad8', say: "…Rfe8 calmly prepares to meet the knight; Nxe7+ …Rxe7 trades the intruder off, and …Rad8 contests the open d-file. There is the Nimzowitsch tabiya: the dangerous-looking f5-knight gone, both Black rooks active, the e5-pawn secure, and a balanced middlegame where Black has solved every problem.", sayShort: '…Rad8 — contest the d-file, balanced.', highlights: [H('d8'), H('e7', SOFT)] }),
    ],
  },

  'philidor-defence::Philidor Counter-Gambit': {
    openingId: 'philidor-defence', title: 'Philidor — The …f5 Counter-Gambit', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'c1', moves: 'e4 e5 Nf3 d6 d4 f5', say: "The Philidor Counter-Gambit — the sharpest, most aggressive face of the opening. Instead of the solid …Nf6, Black strikes at once with …f5, challenging e4 and opening lines for a kingside assault. A genuine gambit: Black plays for activity and initiative, not safety.", sayShort: '…f5 — the aggressive central strike.', highlights: [H('f5'), H('e4', SOFT)] }),
      b({ id: 'c2', moves: 'e4 e5 Nf3 d6 d4 f5 Nc3 fxe4 Nxe4 d5', say: "…fxe4 opens the f-file for the rook, and …d5 hits the e4-knight with tempo, gaining time to develop while seizing the centre. The pawns are flying off, exactly the open game Black wanted from the …f5 thrust.", sayShort: '…d5 — hit the e4-knight, gain tempo.', highlights: [H('d5'), H('e4')] }),
      b({ id: 'c3', moves: 'e4 e5 Nf3 d6 d4 f5 Nc3 fxe4 Nxe4 d5 Neg5 exd4 Nxd4 Bc5', say: "…exd4 wins the centre pawn, and …Bc5 develops with tempo, the bishop bearing down on the d4-knight and the f2-point near White's king. Every black piece comes out with a threat — the gambit's energy in full flow.", sayShort: '…Bc5 — develop with tempo on d4.', arrows: [A('c5', 'd4')], highlights: [H('c5'), H('d4')] }),
      b({ id: 'c4', moves: 'e4 e5 Nf3 d6 d4 f5 Nc3 fxe4 Nxe4 d5 Neg5 exd4 Nxd4 Bc5 Be3 Bxd4 Bxd4 Nf6 Be2 O-O O-O Nc6', say: "…Bxd4 trades into the strong bishop, …Nf6 develops hitting nothing loose, Black castles, and …Nc6 attacks the d4-bishop again. There is the Counter-Gambit tabiya: Black fully developed and active, the f-file open for the rook, and real attacking chances against the white king — the dynamic, double-edged Philidor for the player who wants to fight.", sayShort: '…Nc6 — pressure d4, active and fighting.', arrows: [A('c6', 'd4')], highlights: [H('c6'), H('d4')] }),
    ],
  },

};
