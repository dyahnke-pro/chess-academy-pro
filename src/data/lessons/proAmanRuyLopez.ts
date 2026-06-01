import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Ruy Lopez, WHITE. His main 1.e4 e5 weapon
// (552 games, 75.5%). Main spine = the Closed Morphy walked to a real middlegame.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:ruy-lopez',
  'concept:pos-development',
  'https://www.chess.com/openings/Ruy-Lopez-Opening',
  'https://en.wikipedia.org/wiki/Ruy_Lopez',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_RUY_LOPEZ_LESSON: LessonScript = {
  openingId: 'pro-aman-ruy-lopez',
  title: "Aman's Ruy Lopez — Slow Squeeze, Big Centre",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'bb5', moves: 'e4 e5 Nf3 Nc6 Bb5', arrows: [A('f1', 'b5')], highlights: [H('b5')],
      say: "The Ruy Lopez — Aman's main answer to the open game. Bb5 pins pressure on the c6-knight, the defender of e5, asking Black a question about the centre from move three. The oldest and most respected of all the open-game weapons.",
      sayShort: 'Bb5 — pressure the e5-defender.' }),
    b({ id: 'a6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O', highlights: [H('a4'), H('g1')],
      say: "Black plays the Morphy …a6; White retreats Ba4, keeping the bishop's pin-pressure alive, develops, and castles. White isn't rushing — the Ruy is a long-term squeeze, and step one is simply to get everything out safely.",
      sayShort: 'O-O — keep the bishop, castle.' }),
    b({ id: 'be7', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3', arrows: [A('a4', 'b3')], highlights: [H('f7'), H('b3')],
      say: "Re1 backs the e4-pawn so White can untangle the centre, and when Black expands with …b5, the bishop drops back to b3 — eyeing the sensitive f7-square and the long light-square diagonal. The bishop stays a long-term asset.",
      sayShort: 'Bb3 — eye f7, stay active.' }),
    b({ id: 'd6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O h3 d6 c3', highlights: [H('c3'), H('d4')],
      say: "h3 makes luft and stops …Bg4, then c3 prepares the big d4 push — the heart of the Closed Ruy. White builds a broad pawn centre slowly and methodically, leaving Black cramped.",
      sayShort: 'c3 — prepare the big d4.' }),
    b({ id: 'na5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O h3 d6 c3 Na5 Bc2', arrows: [A('b3', 'c2')], highlights: [H('d4'), H('c2')],
      say: "Black plays the Chigorin …Na5 to hit the b3-bishop; White tucks it to c2, where it joins the c3-d4 plan and points at Black's kingside. Even when chased, the Spanish bishop finds a useful home.",
      sayShort: 'Bc2 — reroute, aim kingside.' }),
    b({ id: 'middlegame', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O h3 d6 c3 Na5 Bc2 c5 d4', highlights: [H('d4'), H('c5')],
      say: "Black strikes …c5 to fight for the centre, and White finally plays d4 — the big central break the whole opening was building toward. White has more space, a harmonious setup, and the classic Ruy plan: pressure the centre, manoeuvre the knights toward the kingside, and squeeze. A rich, comfortable middlegame where White calls the tune.",
      sayShort: 'd4 — the big central break.' }),
  ],
};
