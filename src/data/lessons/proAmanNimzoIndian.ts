import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Nimzo-Indian, BLACK. His #2 Black weapon
// (1140 games matching, 73.9%). Main spine = the Rubinstein (e3) walked to the
// …c5 break middlegame. Masterclass voice register, data-anchored.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:chess-fundamentals',
  'concept:pos-development',
  'https://www.chess.com/openings/Nimzo-Indian-Defense',
  'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_NIMZO_INDIAN_LESSON: LessonScript = {
  openingId: 'pro-aman-nimzo-indian',
  title: "This repertoire's Nimzo-Indian — Pin, Pressure, Punch the Centre",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'd4 Nf6', arrows: [A('g8', 'f6')], highlights: [H('e4')],
      say: "Against the queen's pawn, …Nf6 controls e4 and keeps every Indian setup open. This repertoire's second-favourite Black weapon — flexible, principled, and rich in ideas.",
      sayShort: '…Nf6 — control e4.' }),
    b({ id: 'e6', moves: 'd4 Nf6 c4 e6', highlights: [H('e6')],
      say: "…e6 opens the diagonal for the dark-squared bishop and prepares the defining move of the whole system. Black isn't building a big centre — Black is preparing to fight for control of it with pieces.",
      sayShort: '…e6 — free the dark bishop.' }),
    b({ id: 'bb4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', arrows: [A('f8', 'b4')], highlights: [H('e4'), H('c3')],
      say: "…Bb4 — the Nimzo-Indian. The bishop pins the c3-knight, fighting for the e4-square and threatening to damage White's pawns by trading on c3. This is hypermodern chess: control the centre with pieces and pressure, not pawns.",
      sayShort: '…Bb4 — the Nimzo pin.' }),
    b({ id: 'oo', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O', highlights: [H('g8')],
      say: "White chooses the solid Rubinstein with e3; Black castles, tucking the king away before the central fight begins. Safety first, then the central break.",
      sayShort: '…O-O — king safe first.' }),
    b({ id: 'd5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5', highlights: [H('d5'), H('c4')],
      say: "Now …d5 challenges White's centre head-on. Black contests the d5- and c4-squares, and the position takes on a Queen's-Gambit-Declined character — but with the extra trump of the …Bb4 pin already in place.",
      sayShort: '…d5 — challenge the centre.' }),
    b({ id: 'dxc4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 dxc4', highlights: [H('c4')],
      say: "…dxc4 captures the pawn, drawing White's bishop to c4 and gaining a tempo. This opens the position exactly when Black is ready, with the dark-squared bishop already developed and active.",
      sayShort: '…dxc4 — grab, gain a tempo.' }),
    b({ id: 'c5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 dxc4 Bxc4 c5', highlights: [H('c5'), H('d4')],
      say: "…c5! The freeing break and the heart of the plan. Black strikes at White's d4-pawn, opening lines for the rooks and reaching a comfortable, dynamic middlegame. White's centre is dissolved, Black's pieces are active, and the pin on c3 still bites. A textbook Nimzo — pin, pressure, then punch the centre.",
      sayShort: '…c5 — the freeing break.' }),
  ],
};
