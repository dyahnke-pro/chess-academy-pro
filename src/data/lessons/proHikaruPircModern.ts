import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru — Pirc / Modern (1...g6), BLACK. His #1 Black weapon (5,503 games,
// 86%) — a Modern/hippo hybrid: ...g6, ...Bg7, ...a6, ...b5 queenside expansion.
// His stated reason (voice corpus): "same positions every game = familiarity edge
// over theory." Spine to a real middlegame (18 plies). Voice: per-opening/pirc-modern.md.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://www.chess.com/blog/Illingworth/how-to-play-the-opening-like-hikaru-1', 'https://en.wikipedia.org/wiki/Modern_Defense', 'https://api.chess.com/pub/player/hikaru/games/archives'];

export const PRO_HIKARU_PIRC_MODERN_LESSON: LessonScript = {
  openingId: 'pro-hikaru-pirc-modern',
  title: "This repertoire's Modern Defense — ...g6 and the Queenside Expansion",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'g6', moves: 'e4 g6', highlights: [H('g6')], say: "This repertoire plays ...g6 against almost everything — his #1 weapon as Black, scoring over 86% even against fellow grandmasters. His own reason: you reach the same positions every game, so you understand them better than your opponent ever will.", sayShort: '…g6 — same positions, deeper feel.' }),
    b({ id: 'bg7', moves: 'e4 g6 d4 Bg7 Nc3 a6', arrows: [A('f8', 'g7')], highlights: [H('g7')], say: "The bishop fianchettoes to g7 and Black plays the flexible …a6. We give White the big centre on purpose — a big centre is also a big target — and prepare to undermine it from the wings.", sayShort: '…Bg7, …a6 — flexible, give the centre.' }),
    b({ id: 'b5', moves: 'e4 g6 d4 Bg7 Nc3 a6 Be3 b5', arrows: [A('b7', 'b5')], highlights: [H('b5')], say: "And the signature: …b5. Black expands on the queenside, gaining space and eyeing …b4 to kick White's knight. This Modern/hippo hybrid keeps the position fluid and full of winning chances — exactly what this repertoire wants.", sayShort: '…b5 — queenside space, kick the knight.' }),
    b({ id: 'bb7', moves: 'e4 g6 d4 Bg7 Nc3 a6 Be3 b5 Qd2 Bb7 f3 d6', arrows: [A('c8', 'b7')], highlights: [H('b7')], say: "Black completes the structure: …Bb7 lines the bishop up on the long diagonal behind …b5, and …d6 braces the centre. Both Black bishops now rake the long diagonals while White is committed to a kingside-pawn-storm plan.", sayShort: '…Bb7, …d6 — bishops on the diagonals.' }),
    b({ id: 'h5', moves: 'e4 g6 d4 Bg7 Nc3 a6 Be3 b5 Qd2 Bb7 f3 d6 h4 h5', arrows: [A('h7', 'h5')], highlights: [H('h5')], say: "White throws h4 to storm the kingside, and Black answers …h5 — slamming the door. The pawn fixes White's h-pawn and stops the storm cold, while Black's own play rolls on the other wing.", sayShort: '…h5 — slam the kingside shut.' }),
    b({ id: 'middlegame', moves: 'e4 g6 d4 Bg7 Nc3 a6 Be3 b5 Qd2 Bb7 f3 d6 h4 h5 Nh3 e6 Ng5 Nd7', highlights: [H('d7')], say: "White's knight reroutes via h3 to g5; Black plays …e6 and develops …Nd7, keeping everything solid and flexible. The position is a rich, double-edged middlegame where Black's queenside expansion and the two bishops give real winning chances — the Modern's whole point.", sayShort: '…Nd7 — solid, full of winning chances.' }),
  ],
};
