import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Italian Game MAIN Watch lesson. Student = WHITE. Spine is his
// real data line (data/sources/fabianocaruana-trees/caruana-italian, 226 games),
// tree-extended to a 20-ply middlegame. Board-accurate, two registers, G9.4
// voice. His method: the modern Giuoco Pianissimo — c3/d3, slow build with
// Re1/a4/Nbd2, then Bxe6 to damage Black's structure.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Italian_Game', 'https://www.chess.com/openings/Italian-Game', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

export const PRO_CARUANA_ITALIAN_LESSON: LessonScript = {
  openingId: 'pro-caruana-italian',
  title: "Caruana's Italian Game",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'bc4', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5', say: "The Italian Game — Bc4 develops the bishop to its most natural diagonal, eyeing f7. Black mirrors with Bc5. This is the modern main line at the top, and Caruana plays it as a slow, deep strategic battle.", sayShort: 'Bc4 — the Italian bishop.', arrows: [A('f1', 'c4')], highlights: [H('c4')] }),
    b({ id: 'c3', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3', say: "White plays c3 to prepare d4 and give the bishop a retreat, then the modest d3 — the Giuoco Pianissimo, the 'quietest game'. No early fireworks; White builds slowly for a lasting pull.", sayShort: 'c3, d3 — the Pianissimo.', highlights: [H('d3')] }),
    b({ id: 'castle', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O', say: "Both sides reach the same harmonious setup and castle. The position is symmetrical and rich — the battle is decided by who improves their pieces and times the central d4 break better.", sayShort: 'O-O — safe, build the position.', highlights: [H('g1')] }),
    b({ id: 'a4', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4', say: "Caruana brings the rook to e1 to back the centre, then grabs queenside space with a4, restraining Black's b5. Small, precise improving moves — the modern Italian is a maneuvering game.", sayShort: 'Re1, a4 — centralise, gain space.', arrows: [A('a2', 'a4')], highlights: [H('a4')] }),
    b({ id: 'nbd2', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7 Nbd2 Be6', say: "Black tucks the bishop to a7; Caruana reroutes the knight via d2 toward f1 and g3, and Black offers a trade with Be6. The position is a fully-developed Pianissimo where the better-coordinated side presses.", sayShort: 'Nbd2 — reroute the knight.', arrows: [A('b1', 'd2')], highlights: [H('d2')] }),
    b({ id: 'bxe6', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7 Nbd2 Be6 Bxe6 fxe6', say: "Caruana takes on e6, and Black must recapture with the f-pawn — saddling himself with a weak, isolated e6-pawn and a slightly loosened king. White trades into a clean structural edge and presses the weakness, the textbook Caruana grind.", sayShort: 'Bxe6 — give Black a weak e6-pawn.', arrows: [A('c4', 'e6')], highlights: [H('e6')] }),
  ],
};
