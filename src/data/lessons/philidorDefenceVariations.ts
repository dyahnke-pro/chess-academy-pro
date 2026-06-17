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
  'philidor-defence::Hanham Variation': {
    openingId: 'philidor-defence', title: 'Philidor — The Hanham Variation', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ha1', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O', say: "The Hanham Philidor — reached by the safe modern move-order with …d6 and …Nf6 first. Black builds a compact, rock-solid set-up: …Nbd7 and …Be7 hold the e5-point without creating a single weakness. It is the most reliable, low-risk way to meet 1.e4 with …e5.", sayShort: '…Nbd7, …Be7 — the solid Hanham wall.', highlights: [H('e5', KEY)] }),
      b({ id: 'ha2', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 a5 d5 Nc5', say: "Black tucks in …c6 to control d5, fixes the queenside with …a5, and after White closes with d5 the knight jumps to the excellent …Nc5 outpost — eyeing the e4-pawn and the hole on a4. Black's pieces find active squares inside the solid structure.", sayShort: '…Nc5 — the knight to its outpost.', highlights: [H('c5', KEY), H('c6', SOFT)] }),
      b({ id: 'ha3', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 a5 d5 Nc5 Bg5 Qc7 Bxf6 Bxf6 Nd2 Be7 Nb3 Nxb3', say: "White trades on f6 and manoeuvres a knight to b3 to challenge the c5-knight; after the trades Black keeps a sound, compact game. There is the Hanham tabiya: the …e5/…d6/…c6 pawn chain intact, no weaknesses, and easy piece play — the comfortable equality the Philidor is built to deliver. It scores 56% at club level.", sayShort: '…Nxb3 — trade to comfortable equality.', highlights: [H('e5', KEY), H('c6', SOFT)] }),
    ],
  },
  'philidor-defence::Exchange Variation': {
    // DATA-REBUILD (2026-05-30): spine = most-played master line (the modern
    // …Re8/…Bf8/…c5/…Nc6 setup), engine-equal for Black (−0.10). Replaces the
    // older …Nbd7-Nc5-a5-a4-a3 line that ran past common theory to move 15.
    openingId: 'philidor-defence', title: 'Philidor — The Exchange Variation', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'x1', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6', say: "The Exchange — Black resolves the tension early with …exd4. After Nxd4 the centre is open and …Nf6 strikes the e4-pawn. This is the comfortable face of the Philidor: a Sicilian-style middlegame where Black has no weaknesses and free, easy piece play.", sayShort: '…Nf6 — open centre, strike e4.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
      b({ id: 'x2', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8', say: "Black develops naturally — …Be7 and castle — then lifts the rook to e8. It sits behind the bishop for the moment, but the instant that bishop steps aside the rook bears straight down the open e-file at the e4-pawn.", sayShort: '…Re8 — load the open e-file.', highlights: [H('e4', SOFT)] }),
      b({ id: 'x3', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f4 Bf8', say: "f4 grabs kingside space but commits White's pawns. Black calmly regroups with …Bf8 — tucking the bishop back to guard g7 and the dark squares, and clearing e7 so the e8-rook finally bears down the open e-file toward the pawn on e4.", sayShort: '…Bf8 — regroup, free the e-file.', arrows: [A('e8', 'e4'), A('f8', 'g7')], highlights: [H('e4'), H('g7')] }),
      b({ id: 'x4', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f4 Bf8 Bf3 c5', say: "White's bishop swings to f3, pressing the long light diagonal; Black hits back with …c5, kicking the d4-knight and seizing queenside space. The knight has no inviting central square to retreat to.", sayShort: '…c5 — kick the knight, grab space.', highlights: [H('c5'), H('d4')] }),
      b({ id: 'x5', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f4 Bf8 Bf3 c5 Nb3 Nc6 Re1 a5', say: "The knight drops back to b3, and Black completes the picture: …Nc6 develops with tempo and …a5 grabs queenside space, eyeing …a4 to chase that knight again. There is the Exchange tabiya — every Black piece active, the e-file and the queenside in hand, the game dead equal and easy to play.", sayShort: '…Nc6, …a5 — active, equal, easy.', highlights: [H('a5'), H('a4', SOFT)] }),
    ],
  },

  'philidor-defence::Antoshin Variation': {
    // ACCURACY RE-ANCHOR (2026-06-16): the previous lesson taught the …g6
    // fianchetto into White's Be3/Qd2/O-O-O storm and called it "dynamic
    // equality" — but the data says Black LOSES that opposite-castling race
    // (-0.94 engine, 33% masters / 38% club on 7,561 games: a worse line
    // dressed up as sharp). Re-anchored to the TRUE textbook Antoshin — the
    // 4…Nf6 5.Nc3 Be7 compact small-centre setup with the …d5 freeing break
    // (engine -0.15, 52% masters / 55% club): genuinely level, with a
    // describable plan on every move. (f3 + …c6 + …d5 keeps it distinct from
    // the Exchange's f4 + …c5 plan above.)
    openingId: 'philidor-defence', title: 'Philidor — The Antoshin Variation', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'a1', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6', say: "The Antoshin: Black resolves the central tension with …exd4 and develops …Nf6, immediately pressing the e4-pawn. Rather than the cramped old-Philidor with the locked …e5/…d6 chain, Black accepts a small but completely sound centre and a clean, flexible position — no weaknesses for White to gnaw at.", sayShort: '…Nf6 — the small-centre Antoshin.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
      b({ id: 'a2', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7', say: "…Be7 is the move that defines the variation. Modest, but exact: the bishop completes a compact set-up, prepares to castle, and keeps every option open. Black's whole plan is to finish development safely and then break the centre with …d5 — there is nothing for White to attack in the meantime.", sayShort: '…Be7 — compact, prepare …d5.', highlights: [H('e7', SOFT)] }),
      b({ id: 'a3', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8', say: "Both sides develop and castle, and Black swings the rook to e8 — straight onto the half-open e-file, the file Black owns because the e-pawn was traded on move three. For now the rook sits behind its own bishop, but that is about to change.", sayShort: '…Re8 — claim the e-file.', highlights: [H('e8', KEY)] }),
      b({ id: 'a4', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f3 Bf8', say: "White braces e4 with f3; Black answers with the quiet, clever …Bf8 — the bishop tucks back to reinforce the king and, crucially, clears the e-file so the rook on e8 now bears directly down on the e4-pawn. This regrouping is the heart of the small-centre Philidor: every piece finds its best square before the break.", sayShort: '…Bf8 — clear the e-file onto e4.', arrows: [A('e8', 'e4')], highlights: [H('e4', KEY)] }),
      b({ id: 'a5', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f3 Bf8 Be3 c6 Qd2 d5', say: "…c6 supports the break and then comes the thematic blow — …d5, the freeing strike the whole set-up was built for. Black hits e4, the centre opens, and every Black piece springs to life down the e-file and the long diagonals. The engine confirms it: the position is dead level, Black is fully developed and active, with no weaknesses to defend. That is the Antoshin bargain — concede White a little space early, then equalise cleanly with …d5.", sayShort: '…d5 — the freeing break, fully equal.', highlights: [H('d5', KEY), H('e4', KEY)] }),
    ],
  },

  'philidor-defence::Nimzowitsch Variation': {
    openingId: 'philidor-defence', title: 'Philidor — The Nimzowitsch (Qe2/Nf5)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'n1', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6', say: "White chooses the Nimzowitsch set-up — Qe2, building quietly behind the centre. Black answers with the same Hanham scheme: …Nbd7 overprotecting e5, and …c6 keeping the centre flexible. Solidity against solidity.", sayShort: '…c6 — Hanham setup, flexible centre.', arrows: [A('d7', 'e5')], highlights: [H('e5'), H('c6')] }),
      b({ id: 'n2', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6 a4 exd4 Nxd4 Re8', say: "a4 grabs queenside space, and Black chooses the right moment to resolve the centre with …exd4; after Nxd4 the position opens and …Re8 swings the rook to the e-file, aiming at the e4-pawn the instant the e7-bishop clears.", sayShort: '…exd4, …Re8 — open up, load the e-file.', highlights: [H('e4'), H('d4', SOFT)] }),
      b({ id: 'n3', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6 a4 exd4 Nxd4 Re8 Ba2 Bf8 Qf3', say: "…Bf8 regroups the bishop — guarding the kingside and clearing e7 so the rook bears straight down the open e-file at e4. After Ba2 and Qf3 we reach the Nimzowitsch tabiya: the centre resolved, every Black piece harmonious, the game dead equal.", sayShort: '…Bf8 — regroup, the e-file opens, equal.', arrows: [A('e8', 'e4')], highlights: [H('e4')] }),
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
