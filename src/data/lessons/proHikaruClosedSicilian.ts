import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru — Closed / Grand Prix Sicilian (1.e4 c5 2.Nc3 + f4), WHITE. His
// sharpest e4 weapon (2,396 games, 88%) — Hikaru + Levy call the Grand Prix
// "legendary". 2.Nc3 first stops ...d5, then f4-f5 storms the kingside. Spine
// walked to a real middlegame (21 plies). Board-accurate, two registers, G9.4
// voice. Voice: data/sources/hikaru-voice/per-opening/closed-sicilian.md.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://www.chess.com/openings/Sicilian-Defense-Grand-Prix-Attack', 'https://en.wikipedia.org/wiki/Grand_Prix_Attack', 'https://api.chess.com/pub/player/hikaru/games/archives'];

export const PRO_HIKARU_CLOSED_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-hikaru-closed-sicilian',
  title: "This repertoire's Grand Prix Attack — f4-f5 and the Kingside Storm",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'e4 c5 Nc3', highlights: [H('c3')], say: "The Grand Prix — widely regarded as legendary. Against the Sicilian, Nc3 comes first for a reason: it stops Black's freeing ...d5 before we throw the f-pawn forward. No deep Open-Sicilian theory, just a direct attack.", sayShort: 'Nc3 — stop ...d5 first.' }),
    b({ id: 'f4', moves: 'e4 c5 Nc3 Nc6 f4', arrows: [A('f2', 'f4')], highlights: [H('f4')], say: "f4 — the Grand Prix's signature. White grabs central space and opens the f-file for the coming kingside storm. Every piece will pour toward Black's king.", sayShort: 'f4 — the Grand Prix punch.' }),
    b({ id: 'bc4', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4', arrows: [A('f1', 'c4')], highlights: [H('c4')], say: "Black fianchettoes and this repertoire develops the bishop to c4 — the original, attacking Grand Prix setup, aiming the bishop at f7 and supporting the f5-break. The plan is O-O, then f5 to rip the kingside open.", sayShort: 'Bc4 — eye f7, prep f5.' }),
    b({ id: 'f5', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5', arrows: [A('f4', 'f5')], highlights: [H('f5')], say: "After e6, the spearhead lunges: f5! The pawn strikes at e6 and g6, tearing at the squares around Black's fianchettoed king before he's even castled. This is the Grand Prix at full throttle.", sayShort: 'f5 — crack the kingside open.' }),
    b({ id: 'open', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6', highlights: [H('e6')], say: "Black blocks with the knight and the pawns trade on e6 — but the lines are open now. Black's pawns are split, the e6-pawn is weak, and White's pieces have open files pointing at the king.", sayShort: 'fxe6 — open lines, weak e6.' }),
    b({ id: 'castle', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6 O-O O-O d3', highlights: [H('d3')], say: "Both sides castle and White props the centre with d3. The position has settled, but White holds the initiative: the open f-file, the bishop on c4, and Black's weakened pawn structure all favour the attacker.", sayShort: 'O-O, d3 — keep the initiative.' }),
    b({ id: 'middlegame', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6 O-O O-O d3 a6 a4 Nd4 Nxd4', arrows: [A('f3', 'd4')], highlights: [H('d4')], say: "Black grabs queenside space with a6 and jumps a knight into d4; White clamps with a4 and trades it off. The smoke clears to a middlegame where White has the open f-file, the bishop pair's pressure, and the better pawns — the Grand Prix's reward for the early storm.", sayShort: 'Nxd4 — White holds the edge.' }),
  ],
};
