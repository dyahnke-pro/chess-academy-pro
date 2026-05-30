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
    // DATA-REBUILD (2026-05-30): spine = most-played master line (the modern
    // …Re8/…Bf8/…c5/…Nc6 setup), engine-equal for Black (−0.10). Replaces the
    // older …Nbd7-Nc5-a5-a4-a3 line that ran past common theory to move 15.
    openingId: 'philidor-defence', title: 'Philidor — The Exchange Variation', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'x1', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6', say: "The Exchange — Black resolves the tension early with …exd4. After Nxd4 the centre is open and …Nf6 strikes the e4-pawn. This is the comfortable face of the Philidor: a Sicilian-style middlegame where Black has no weaknesses and free, easy piece play.", sayShort: '…Nf6 — open centre, strike e4.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
      b({ id: 'x2', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8', say: "Black develops naturally — …Be7 and castle — then lifts the rook to e8. It sits behind the bishop for the moment, but the instant that bishop steps aside the rook bears straight down the open e-file at the e4-pawn.", sayShort: '…Re8 — load the open e-file.', highlights: [H('e4', SOFT)] }),
      b({ id: 'x3', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f4 Bf8', say: "f4 grabs kingside space but commits White's pawns. Black calmly regroups with …Bf8 — tucking the bishop back to guard g7 and the dark squares, and clearing e7 so the e8-rook finally eyes e4 down the open file.", sayShort: '…Bf8 — regroup, free the e-file.', arrows: [A('e8', 'e4'), A('f8', 'g7')], highlights: [H('e4'), H('g7')] }),
      b({ id: 'x4', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f4 Bf8 Bf3 c5', say: "White's bishop swings to f3, pressing the long light diagonal; Black hits back with …c5, kicking the d4-knight and seizing queenside space. The knight has no inviting central square to retreat to.", sayShort: '…c5 — kick the knight, grab space.', highlights: [H('c5'), H('d4')] }),
      b({ id: 'x5', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f4 Bf8 Bf3 c5 Nb3 Nc6 Re1 a5', say: "The knight drops back to b3, and Black completes the picture: …Nc6 develops with tempo and …a5 grabs queenside space, eyeing …a4 to chase that knight again. There is the Exchange tabiya — every Black piece active, the e-file and the queenside in hand, the game dead equal and easy to play.", sayShort: '…Nc6, …a5 — active, equal, easy.', highlights: [H('a5'), H('a4', SOFT)] }),
    ],
  },

  'philidor-defence::Antoshin Variation': {
    // DATA-REBUILD (2026-05-30): the old lesson taught 3...Nf6 4.dxe5 Nxe4 and
    // claimed "dead-level" — but that's only true vs White's soft 5.Bd3; against
    // the critical 5.Qd5 Black is -1.58 (engine). The REAL Antoshin is the
    // 3...exd4 4.Nxd4 g6 fianchetto, a sound (-0.40) sharp opposite-castling
    // fight. Rebuilt on the most-played master line, narrated honestly as sharp.
    openingId: 'philidor-defence', title: 'Philidor — The Antoshin Variation', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'a1', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 g6', say: "The true Antoshin: Black trades in the centre with …exd4, then strikes a hypermodern pose with …g6, preparing …Bg7 on the long dark diagonal. This isn't passive defence — Black is setting up a sharp, double-edged fight where the fianchettoed bishop rakes White's queenside.", sayShort: '…g6 — the hypermodern Antoshin.', highlights: [H('g7', SOFT)] }),
      b({ id: 'a2', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6', say: "Nc3 and Be3 develop for White; Black completes the fianchetto with …Bg7 — the bishop eyes the long diagonal toward White's centre and queenside — and …Nf6 develops with a glance at e4. Every Black piece has a purpose.", sayShort: '…Bg7, …Nf6 — fianchetto and develop.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
      b({ id: 'a3', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Qd2 O-O O-O-O', say: "Qd2 and O-O-O — White castles queenside and shows his hand: a kingside pawn-storm at Black's king. Black castles short and braces. With the kings on opposite wings the game becomes a sprint — whoever's attack arrives first wins, and Black must race, not defend.", sayShort: 'O-O-O — opposite castling, a sprint.' }),
      b({ id: 'a4', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Qd2 O-O O-O-O Re8 f3 Nc6', say: "…Re8 lifts the rook to the e-file, f3 braces White's centre and clears g4 for the storm, and …Nc6 strikes the d4-knight — gaining a tempo Black will spend on his own queenside attack.", sayShort: '…Nc6 — hit d4, gain a tempo.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'a5', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Qd2 O-O O-O-O Re8 f3 Nc6 g4 Ne5', say: "g4 — the storm rolls forward. But Black has his own ideas: …Ne5 plants the knight on a magnificent outpost, eyeing c4 and f3 deep in White's position. The race is on, and Black's pieces are already the more active.", sayShort: '…Ne5 — outpost knight, eye c4/f3.', arrows: [A('e5', 'c4'), A('e5', 'f3')], highlights: [H('c4'), H('f3')] }),
      b({ id: 'a6', moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Qd2 O-O O-O-O Re8 f3 Nc6 g4 Ne5 Be2 a6 h4 b5 h5 c5 Nb3 c4 Nd4 b4 Nd5 Nxd5 exd5 Qa5', say: "Now both storms clash. White hurls h4–h5 at the king; Black answers blow for blow — …a6, …b5, …c5, …c4 and …b4 tearing open lines toward White's king on c1 — and after the knights trade on d5, …Qa5 swings the queen into the attack. There is the Antoshin in full cry: a razor-sharp opposite-castling race where Black's counterplay is every bit as fast as White's. Dynamic equality, and a real fight.", sayShort: '…Qa5 — queenside counter-storm, sharp.', highlights: [H('a5'), H('c1')] }),
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
