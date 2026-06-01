import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Réti / King's Indian Attack, WHITE. His
// biggest White system (4993 games matching, 77.5%). Main spine = vs …d5 into a
// QGD/Catalan structure, walked to a real middlegame.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:chess-fundamentals',
  'concept:pos-development',
  'https://www.chess.com/openings/Reti-Opening',
  'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_RETI_LESSON: LessonScript = {
  openingId: 'pro-aman-reti',
  title: "Aman's Réti — Flexible Development, Then d4",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'nf3', moves: 'Nf3', arrows: [A('g1', 'f3')], highlights: [H('e5'), H('d4'), H('f3')],
      say: "Aman's most-played White move — Nf3. It develops a piece, controls the central e5- and d4-squares, and keeps every plan open. The Réti is flexibility itself: see what Black does, then choose the ideal structure.",
      sayShort: 'Nf3 — flexible first move.' }),
    b({ id: 'd5', moves: 'Nf3 d5 d4', highlights: [H('d4')],
      say: "When Black stakes a claim with …d5, White plays d4 and steers toward a sound, classical Queen's-Pawn structure. The Réti isn't a gimmick — it's a move-order that reaches the positions White wants on White's terms.",
      sayShort: 'd4 — steer to a classical centre.' }),
    b({ id: 'e6', moves: 'Nf3 d5 d4 Nf6 c4 e6', highlights: [H('c4'), H('e6')],
      say: "With c4 and Black's …e6, the game becomes a Queen's Gambit Declined structure. White has a comfortable space edge and clear development — exactly the kind of sound, low-risk position that rewards good habits.",
      sayShort: 'c4 — a comfortable QGD.' }),
    b({ id: 'be7', moves: 'Nf3 d5 d4 Nf6 c4 e6 e3 Be7 Nc3', arrows: [A('b1', 'c3')], highlights: [H('c3')],
      say: "White completes development simply — e3 to free the bishop, then Nc3 to add a piece to the centre. No tricks, just principled development with a small, durable edge.",
      sayShort: 'Nc3 — sound development.' }),
    b({ id: 'oo', moves: 'Nf3 d5 d4 Nf6 c4 e6 e3 Be7 Nc3 O-O Bd3 b6', highlights: [H('b6'), H('b7')],
      say: "Both sides castle and Black fianchettoes with …b6 and …Bb7. White's bishop is well placed on d3 and the centre is firmly held. The plan now is to keep the tension, finish development, and look for the right moment to break.",
      sayShort: 'Bd3 — bishop eyes the king.' }),
    b({ id: 'middlegame', moves: 'Nf3 d5 d4 Nf6 c4 e6 e3 Be7 Nc3 O-O Bd3 b6 cxd5 exd5 O-O', highlights: [H('d5'), H('c1')],
      say: "White resolves the centre with cxd5, leaving Black with a slightly loose isolated-ish d-pawn to watch, then castles into a healthy middlegame. White has the classic small edge: better development, a target on d5, and the easy plan of piling on it with the rooks and minor pieces. A sound, comfortable position built on good habits.",
      sayShort: 'cxd5 — fix a target, then convert.' }),
  ],
};
