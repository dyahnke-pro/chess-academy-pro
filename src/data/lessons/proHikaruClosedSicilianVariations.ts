import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru — Grand Prix / Closed Sicilian per-variation Watch lessons. Hand-
// authored from his real data spines (data/sources/hikaru-deep/). Student = WHITE.
// Board-accurate, two registers, G9.4 voice. The Grand Prix story: 2.Nc3 stops
// ...d5, then f4-f5 storms the king; vs ...e6 White switches to the Bb5 plan.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Grand_Prix_Attack', 'https://www.chess.com/openings/Sicilian-Defense-Grand-Prix-Attack', 'https://api.chess.com/pub/player/hikaru/games/archives'];

const GP_F4: LessonScript = {
  openingId: 'pro-hikaru-closed-sicilian', title: "Grand Prix — the f5 Demolition", minutes: 8, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'f4', moves: 'e4 c5 Nc3 Nc6 f4', arrows: [A('f2', 'f4')], highlights: [H('f4')], say: "Against the Sicilian, Nc3 first stops Black's freeing ...d5, and then f4 — the Grand Prix punch. White grabs space and opens the f-file for the storm to come.", sayShort: 'f4 — open the f-file.' }),
    b({ id: 'bc4', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4', arrows: [A('f1', 'c4')], highlights: [H('c4')], say: "Black fianchettoes and this repertoire develops the bishop to c4 — the attacking setup, aiming at f7 and supporting the f5-break that's about to crack the kingside.", sayShort: 'Bc4 — eye f7, prep f5.' }),
    b({ id: 'f5', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6', arrows: [A('f5', 'e6')], highlights: [H('e6')], say: "After e6, f5 lunges and trades on e6 — Black's pawns are split, the e6-pawn is weak, and the lines toward his king are torn open. The Grand Prix at full throttle.", sayShort: 'f5, fxe6 — split the pawns.' }),
    b({ id: 'mid', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6 O-O O-O d3 a6 a4 Nd4 Nxd4', arrows: [A('f3', 'd4')], highlights: [H('d4')], say: "Both sides castle and the dust settles: White owns the open f-file, the bishop pair rakes the board, and Black's weakened pawns are long-term targets. White trades off the d4-knight and keeps a clear, lasting initiative — the reward for the early storm.", sayShort: 'Nxd4 — White keeps the edge.' }),
  ],
};

const GP_G6: LessonScript = {
  openingId: 'pro-hikaru-closed-sicilian', title: "Grand Prix vs ...g6 — f5 at the Fianchetto", minutes: 8, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'f4', moves: 'e4 c5 Nc3 Nc6 f4 g6', highlights: [H('f4')], say: "Black commits to the kingside fianchetto early with ...g6. That makes the f5-break even more potent — it strikes right at the squares around the king the fianchetto is supposed to shelter.", sayShort: 'f4 vs ...g6 — f5 looms larger.' }),
    b({ id: 'bc4', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4', arrows: [A('f1', 'c4')], highlights: [H('c4')], say: "This repertoire sets up the attack: Nf3 and Bc4, the bishop trained on f7. Every piece points toward the kingside while Black is still getting organised.", sayShort: 'Bc4 — aim at the king.' }),
    b({ id: 'f5', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6', arrows: [A('f5', 'e6')], highlights: [H('e6')], say: "f5 cracks it open and the e6-pawns trade — Black's structure is shattered and the f-file is a highway for White's rook. The fianchetto that was meant to be safe is now full of holes.", sayShort: 'f5 — shatter the structure.' }),
    b({ id: 'mid', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6 O-O O-O d3 a6 a4 Nd4 Nxd4', arrows: [A('f3', 'd4')], highlights: [H('d4')], say: "White castles, clamps the queenside with a4, and trades the d4-knight. The open f-file, the bishop pair, and Black's weak e6-pawn hand White a comfortable attacking middlegame.", sayShort: 'Nxd4 — comfortable attack.' }),
  ],
};

const GP_E6: LessonScript = {
  openingId: 'pro-hikaru-closed-sicilian', title: "Grand Prix vs ...e6 — the Bb5 Plan", minutes: 8, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'f4', moves: 'e4 c5 Nc3 Nc6 f4 e6', highlights: [H('f4')], say: "Against the solid ...e6, Black is ready to meet a kingside storm head-on, so this repertoire switches plans. The f4-pawn still grips the centre, but now the play turns positional.", sayShort: 'f4 vs ...e6 — switch plans.' }),
    b({ id: 'bb5', moves: 'e4 c5 Nc3 Nc6 f4 e6 Nf3 d5 Bb5', arrows: [A('f1', 'b5')], highlights: [H('b5')], say: "Black strikes the centre with ...d5 and White pins with Bb5 — the positional Grand Prix. The idea is Bxc6 to damage Black's pawns, leaving the c-pawns doubled and weak.", sayShort: 'Bb5 — pin, prepare Bxc6.' }),
    b({ id: 'bxc6', moves: 'e4 c5 Nc3 Nc6 f4 e6 Nf3 d5 Bb5 Ne7 exd5 exd5 Qe2 f6 Bxc6+', arrows: [A('b5', 'c6')], highlights: [H('c6')], say: "After the centre opens, Bxc6+ damages the structure — Black must recapture with a pawn, saddling himself with doubled, weak c-pawns and a loose position. White's plan has worked.", sayShort: 'Bxc6+ — double the c-pawns.' }),
    b({ id: 'mid', moves: 'e4 c5 Nc3 Nc6 f4 e6 Nf3 d5 Bb5 Ne7 exd5 exd5 Qe2 f6 Bxc6+ bxc6 O-O Kf7 b3 Nf5 Na4', arrows: [A('c3', 'a4')], highlights: [H('a4')], say: "Black recaptures and his king is stuck on f7, his queenside pawns a permanent target. White castles, develops, and the knight heads to a4 to press the c5-pawn. A clean structural edge — the positional face of the Grand Prix.", sayShort: 'Na4 — press the weak pawns.' }),
  ],
};

export const PRO_HIKARU_CLOSED_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-hikaru-closed-sicilian::Grand Prix f4 + f5': GP_F4,
  'pro-hikaru-closed-sicilian::vs ...g6': GP_G6,
  'pro-hikaru-closed-sicilian::vs ...e6': GP_E6,
};
