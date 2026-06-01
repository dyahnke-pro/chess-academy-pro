import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Ruy Lopez MAIN Watch lesson. Student = WHITE. Spine is his real
// data line (data/sources/fabianocaruana-deep/caruana-ruy-lopez-berlin-d3),
// tree-extended to a 20-ply middlegame. Board-accurate, two registers, G9.4
// voice. His method: the modern d3, Bxc6 to double the pawns, then patient
// maneuvering (Nb3, a4) to fix and press the queenside weakness.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

export const PRO_CARUANA_RUY_LOPEZ_LESSON: LessonScript = {
  openingId: 'pro-caruana-ruy-lopez',
  title: "Caruana's Ruy Lopez",
  minutes: 10,
  orientation: 'white',
  kind: 'main',
  sources: SRC,
  beats: [
    b({ id: 'bb5', moves: 'e4 e5 Nf3 Nc6 Bb5', say: "The Ruy Lopez — Caruana's lifelong White weapon. The bishop to b5 pressures the c6-knight that guards e5. The most classical opening in chess, and he plays it for the long, grinding edge it offers.", sayShort: 'Bb5 — the Ruy pressure.', arrows: [A('f1', 'b5')], highlights: [H('b5')] }),
    b({ id: 'd3', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3', say: "After Nf6, Caruana chooses the modern d3 — quiet and flexible, sidestepping the heavily analysed Berlin endgame. He keeps the tension and plays for a small, lasting middlegame pull rather than forcing matters early.", sayShort: 'd3 — the modern, flexible setup.', highlights: [H('d3')] }),
    b({ id: 'bxc6', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6', say: "Black develops the bishop to c5, and Caruana takes on c6, doubling Black's pawns. He gives up the bishop pair, but in return Black's queenside is permanently damaged — those doubled c-pawns become a target for the whole game.", sayShort: 'Bxc6 — double the pawns.', arrows: [A('b5', 'c6')], highlights: [H('c6')] }),
    b({ id: 'nbd2', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6 Nbd2 Be6', say: "The queen's knight heads toward the queenside via d2, and Black develops the light bishop to e6. White's plan is unhurried: complete development, then reroute the knight to its best post against Black's structure.", sayShort: 'Nbd2 — reroute the knight.', arrows: [A('b1', 'd2')], highlights: [H('d2')] }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6 Nbd2 Be6 O-O Bd6', say: "White castles to safety and Black repositions the dark bishop to d6, eyeing the kingside. The position is quiet and strategic — exactly where Caruana's deep understanding outweighs any tactical fireworks.", sayShort: 'O-O — safe, strategic battle.', highlights: [H('g1')] }),
    b({ id: 'nb3', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6 Nbd2 Be6 O-O Bd6 Nb3 a5 a4', say: "The knight swings to b3 and Black grabs space with a5; Caruana answers a4, fixing the pawn on a5 as a long-term weakness and clamping the queenside. Small, precise moves that improve the position one notch at a time.", sayShort: 'Nb3, a4 — fix the queenside.', arrows: [A('d2', 'b3')], highlights: [H('a4')] }),
    b({ id: 'mid', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6 Nbd2 Be6 O-O Bd6 Nb3 a5 a4 Nd7 Nbd2 f6', say: "Black reroutes the knight to d7 and props the centre with f6; Caruana brings the knight back to d2, heading for c4 to hit the bishop and the weak queenside pawns. A textbook maneuvering middlegame where the better structure slowly tells — the Caruana grind.", sayShort: 'Nbd2 — maneuver, press the weakness.', arrows: [A('f3', 'd2')], highlights: [H('d2')] }),
  ],
};
