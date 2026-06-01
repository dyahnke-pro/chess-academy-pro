import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Rossolimo / Moscow Anti-Sicilian (WHITE).
// 214+ games, ~79-82%. Main spine = the Rossolimo vs …Nc6 …g6 (Bxc6, e5),
// walked to a real middlegame.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:sicilian-rossolimo',
  'concept:pos-development',
  'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
  'https://en.wikipedia.org/wiki/Sicilian_Defence,_Rossolimo_Variation',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_ROSSOLIMO_LESSON: LessonScript = {
  openingId: 'pro-aman-rossolimo',
  title: "Aman's Rossolimo — Trade on c6, Take the Centre",
  minutes: 9,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'bb5', moves: 'e4 c5 Nf3 Nc6 Bb5', arrows: [A('f1', 'b5')], highlights: [H('b5')],
      say: "The Rossolimo — White's clean, low-theory answer to the …Nc6 Sicilians. Bb5 pins pressure on the c6-knight, sidestepping the mountains of Open-Sicilian theory in favour of a clear structural plan.",
      sayShort: 'Bb5 — the Anti-Sicilian pin.' }),
    b({ id: 'g6', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6', arrows: [A('b5', 'c6')], highlights: [H('c6')],
      say: "When Black fianchettoes with …g6, White trades Bxc6 — doubling Black's pawns and damaging the structure that supports the dark-squared bishop. A concrete, permanent gain in exchange for the bishop pair.",
      sayShort: 'Bxc6 — double the pawns.' }),
    b({ id: 'bxc6', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1', highlights: [H('e5'), H('c6'), H('e1')],
      say: "Black recaptures …bxc6 and fianchettoes; White castles and plays Re1 to back the centre. The plan is taking shape: with Black's pawns doubled and the centre White's to push, the e5 break looms.",
      sayShort: 'Re1 — back the e5 push.' }),
    b({ id: 'e5', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1 Nf6 e5 Nd5 c4', highlights: [H('e5'), H('d5')],
      say: "e5 grabs central space and kicks the knight to d5, then c4 challenges it — gaining tempo and clamping the centre. White uses the pawn majority to cramp Black and blunt the fianchettoed bishop on g7.",
      sayShort: 'e5, c4 — clamp the centre.' }),
    b({ id: 'nc7', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1 Nf6 e5 Nd5 c4 Nc7 d4', arrows: [A('d2', 'd4')], highlights: [H('d4')],
      say: "The knight retreats …Nc7 and White plays d4 — completing the big pawn centre. White has a space-rich position, the better pawn structure, and the g7-bishop biting on the e5-granite. Everything points to a comfortable squeeze.",
      sayShort: 'd4 — complete the centre.' }),
    b({ id: 'middlegame', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1 Nf6 e5 Nd5 c4 Nc7 d4 cxd4 Qxd4', arrows: [A('d1', 'd4')], highlights: [H('d4')],
      say: "Black trades …cxd4 and White recaptures with the queen, centralising it on the strong d4-square. White has reached the ideal Rossolimo middlegame: a big space advantage, Black's doubled c-pawns as a permanent target, and the cramping e5-pawn shutting the Dragon bishop out of the game. A clean, lasting structural edge built on one simple trade.",
      sayShort: 'Qxd4 — centralise, squeeze.' }),
  ],
};
