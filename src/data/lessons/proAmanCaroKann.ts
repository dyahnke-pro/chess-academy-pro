import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Caro-Kann, BLACK. His solid Black backup
// (986 games, 75.3%). Main spine = the Advance with the classical …Bf5 (light
// bishop outside the chain), walked to a real middlegame.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:chess-fundamentals',
  'concept:pos-development',
  'https://www.chess.com/openings/Caro-Kann-Defense',
  'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_CARO_KANN_LESSON: LessonScript = {
  openingId: 'pro-aman-caro-kann',
  title: "Aman's Caro-Kann — the Bishop Out, the Wall Up",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'c6', moves: 'e4 c6', highlights: [H('c6')],
      say: "The Caro-Kann — Aman's solid Black backup. …c6 prepares to challenge the centre with …d5, and unlike the French, it keeps the light-squared bishop free to develop. Rock-solid, low-risk, no weaknesses.",
      sayShort: '…c6 — solid, prepare …d5.' }),
    b({ id: 'bf5', moves: 'e4 c6 d4 d5 e5 Bf5', arrows: [A('c8', 'f5')], highlights: [H('f5')],
      say: "White grabs space with e5, and here is the Caro's whole point: …Bf5! The light-squared bishop develops OUTSIDE the pawn chain to an active post — the very piece that stays trapped in the French Defense. This is why Caro players sleep well.",
      sayShort: '…Bf5 — bishop out first.' }),
    b({ id: 'e6', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6', highlights: [H('e6')],
      say: "Only now …e6, building the solid wall behind the already-freed bishop. The structure is the dream version of the French: same pawn chain, but the problem bishop is already outside doing useful work.",
      sayShort: '…e6 — build the wall.' }),
    b({ id: 'nd7', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7', arrows: [A('b8', 'd7')], highlights: [H('d7')],
      say: "Black develops …Nd7, flexible and ready to support the …c5 break that challenges White's advanced centre. Everything comes out smoothly to natural squares.",
      sayShort: '…Nd7 — flexible, eye …c5.' }),
    b({ id: 'ne7', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O Ne7', arrows: [A('g8', 'e7')], highlights: [H('e7')],
      say: "The other knight comes to e7 — heading for g6 to add pressure on the e5-pawn, and keeping the f-pawn free for a later …f6 break. Black's pieces work in harmony around the solid pawn wall.",
      sayShort: '…Ne7 — reroute toward g6.' }),
    b({ id: 'middlegame', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O Ne7 Nh4 Bg6', arrows: [A('f5', 'g6')], highlights: [H('g6')],
      say: "White tries to trade off Black's good bishop with Nh4, but …Bg6 calmly keeps it, retreating to a safe, useful diagonal. The bishop is preserved, the wall is intact, and Black has the classic Caro middlegame: solid structure, the good bishop alive, and the …c5 and …f6 breaks in hand. Comfortable equality with nothing to fear.",
      sayShort: '…Bg6 — keep the good bishop.' }),
  ],
};
