import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — French Defense MAIN Watch lesson. Student = BLACK. Spine is his
// real data line (data/sources/fabianocaruana-trees/caruana-french, 252 games),
// tree-extended to a 20-ply middlegame. The Classical/Steinitz: ...Be7, the
// ...Nfd7 retreat under e5, the bishop trade, then ...c5 to strike the chain.
// Board-accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/French_Defence', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

export const PRO_CARUANA_FRENCH_LESSON: LessonScript = {
  openingId: 'pro-caruana-french',
  title: "Caruana's French Defense",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'e4 e6 d4 d5', say: "The French Defense — a rock-solid choice Caruana reaches for against e4. With e6 and d5 Black challenges the centre at once, accepting a slightly cramped but extremely sturdy structure built for the counterattack.", sayShort: '…d5 — challenge the centre.', arrows: [A('d7', 'd5')], highlights: [H('d5')] }),
    b({ id: 'be7', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7', say: "White develops Nc3 and pins with Bg5; Black answers Nf6 and the solid Be7 — the Classical French. Black calmly breaks the pin and prepares to meet White's central advance.", sayShort: '…Be7 — the Classical, break the pin.', arrows: [A('f8', 'e7')], highlights: [H('e7')] }),
    b({ id: 'nfd7', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7', say: "White pushes e5, gaining space and chasing the knight to d7; the bishops trade on e7 and Black recaptures with the queen. The Steinitz structure: White has the space, Black the solid blockade and a clear plan against the chain.", sayShort: '…Nfd7, …Qxe7 — solid blockade.', arrows: [A('f6', 'd7')], highlights: [H('d7')] }),
    b({ id: 'c5', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 a6 Nf3 c5', say: "White props the centre with f4 and Nf3; Black plays a6 and then the thematic break c5 — striking the base of White's d4-e5 pawn chain. This is the heart of the French: undermine the chain at its foot.", sayShort: '…c5 — strike the pawn chain.', arrows: [A('c7', 'c5')], highlights: [H('c5')] }),
    b({ id: 'nc6', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 a6 Nf3 c5 Qd2 Nc6 dxc5 Qxc5', say: "Black develops Nc6 to pile onto d4, White connects with Qd2, and the tension resolves with dxc5. Black recaptures with the queen, reaching a sound, active middlegame: the bad bishop is gone, the d4-square is a target, and the queenside is Black's to play on.", sayShort: '…Qxc5 — active, no bad bishop.', arrows: [A('e7', 'c5')], highlights: [H('c5')] }),
  ],
};
