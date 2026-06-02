import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru — Caro-Kann (1...c6), BLACK. His solid e4 answer alongside the Pirc
// (1,711 games, 82%). Spine = the Advance Variation with the classical ...Bf5
// (light bishop OUTSIDE the pawn chain — the Caro's defining advantage). Walked to
// a real middlegame (16 plies). Voice: per-opening/caro-kann.md.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://api.chess.com/pub/player/hikaru/games/archives'];

export const PRO_HIKARU_CARO_KANN_LESSON: LessonScript = {
  openingId: 'pro-hikaru-caro-kann',
  title: "This repertoire's Caro-Kann — the Bishop Out Before the Wall",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'c6', moves: 'e4 c6', highlights: [H('c6')], say: "The Caro-Kann — This repertoire's rock-solid alternative to the Pirc when he wants a quieter game. …c6 prepares to challenge the centre with …d5, but unlike the French, it keeps the light-squared bishop free.", sayShort: '…c6 — solid, prepare …d5.' }),
    b({ id: 'bf5', moves: 'e4 c6 d4 d5 e5 Bf5', arrows: [A('c8', 'f5')], highlights: [H('f5')], say: "White grabs space with e5, and here's the Caro's whole point: …Bf5! The light-squared bishop develops OUTSIDE the pawn chain, to an active post — the very piece that stays trapped in the French. This is why Caro players sleep well.", sayShort: '…Bf5 — the bishop escapes outside.' }),
    b({ id: 'e6', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 h6', highlights: [H('e6')], say: "Now …e6 builds the solid pawn chain behind the freed bishop, and …h6 makes a safe square so White can't harass the bishop with Nh4 or g4 ideas. Black's structure is rock-solid.", sayShort: '…e6, …h6 — solid, bishop safe.' }),
    b({ id: 'nd7', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 h6 O-O Nd7', highlights: [H('d7')], say: "Both sides castle and Black develops …Nd7, heading for the kingside or to support the …c5 break that will challenge White's centre. Everything is harmonious and low-risk.", sayShort: '…Nd7 — develop, eye …c5.' }),
    b({ id: 'middlegame', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 h6 O-O Nd7 Nbd2 Ne7 Nb3 Qc7', arrows: [A('d8', 'c7')], highlights: [H('c7')], say: "Black reroutes the knight to e7 and centralises the queen on c7, pressuring the e5-pawn and eyeing the …c5 break. The structure is the classic Caro: a solid wall, the good bishop already developed, and an easy plan against White's advanced centre. A comfortable, equal middlegame with no weaknesses.", sayShort: '…Qc7 — pressure e5, comfortable game.' }),
  ],
};
