import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Open Sicilian (WHITE) vs …d6 (894 games,
// 76.3%). Main spine = vs the Najdorf with Be2/O-O/Be3, walked to a middlegame.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:sicilian',
  'concept:pos-development',
  'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation',
  'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_OPEN_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-aman-open-sicilian',
  title: "Aman's Open Sicilian — Take the Centre, Then Press",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'd4', moves: 'e4 c5 Nf3 d6 d4', highlights: [H('d4')],
      say: "The Open Sicilian — White's most principled answer to the Sicilian. d4 strikes the centre and trades the c-pawn for the d-pawn, opening the position for fast, active development. The fighting choice against …c5.",
      sayShort: 'd4 — open the centre.' }),
    b({ id: 'nf6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3', arrows: [A('b1', 'c3')], highlights: [H('e4'), H('c3')],
      say: "After the centre trade, …Nf6 hits e4 and Nc3 defends it while developing — the standard, harmonious Open Sicilian build-up. White gets a lead in development and the half-open d-file to work with.",
      sayShort: 'Nc3 — defend e4, develop.' }),
    b({ id: 'a6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2', arrows: [A('f1', 'e2')], highlights: [H('a6'), H('e2')],
      say: "Black plays the Najdorf …a6, the most popular Sicilian; White chooses the solid, flexible Be2 — preparing to castle quickly and keep a healthy, low-risk position. Sound development over sharp theory.",
      sayShort: 'Be2 — solid, flexible setup.' }),
    b({ id: 'e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3', arrows: [A('d4', 'b3')], highlights: [H('e5'), H('d5')],
      say: "Black grabs space with …e5; White retreats Nb3, keeping the knight active and leaving Black with a slightly weak d5-square and a backward d-pawn. White's plan is clear: control d5 and pressure the weakness.",
      sayShort: 'Nb3 — target the d5-hole.' }),
    b({ id: 'oo', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6', highlights: [H('e6'), H('d5')],
      say: "Both sides develop and castle; White's bishop comes to e3 and Black's to e6, both fighting for the critical d5-square. White is fully developed, the king is safe, and the battle for d5 is on — exactly where White wants the game.",
      sayShort: 'Be3 — fight for d5.' }),
    b({ id: 'middlegame', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5 Nbd7 Qd3', arrows: [A('c3', 'd5')], highlights: [H('d5')],
      say: "White plants a knight on the dominant d5-outpost — the square Black weakened with …e5. Even when Black trades it off, White recaptures with a pawn that clamps the position, and the long-term pressure on the light squares and the d-file gives White a pleasant, lasting edge. The Open Sicilian plan delivered: take the centre, target the weakness, press.",
      sayShort: 'Nd5 — the dominant outpost.' }),
  ],
};
