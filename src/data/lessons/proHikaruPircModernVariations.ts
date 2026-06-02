import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru — Modern/Pirc (1...g6) per-variation Watch lessons. Hand-authored
// from his real data spines. Student = BLACK. Board-accurate, two registers,
// G9.4 voice. The Modern story: give White the centre, expand ...a6/...b5, keep
// the position fluid and full of winning chances.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Modern_Defense', 'https://www.chess.com/blog/Illingworth/how-to-play-the-opening-like-hikaru-1', 'https://api.chess.com/pub/player/hikaru/games/archives'];

const BE3: LessonScript = {
  openingId: 'pro-hikaru-pirc-modern', title: "Modern vs Be3 + Qd2 — the ...b5 Expansion", minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'a6', moves: 'e4 g6 d4 Bg7 Nc3 a6', arrows: [A('f8', 'g7')], highlights: [H('g7')], say: "Black fianchettoes and plays the flexible ...a6 — preparing the queenside expansion. We hand White the big centre on purpose; a big centre is a big target.", sayShort: '…a6 — prepare ...b5.' }),
    b({ id: 'b5', moves: 'e4 g6 d4 Bg7 Nc3 a6 Be3 b5 Qd2 Bb7', arrows: [A('c8', 'b7')], highlights: [H('b5'), H('b7')], say: "White sets up the 150-style Be3/Qd2 attack, and Black expands — ...b5 grabs queenside space and ...Bb7 lines the bishop up on the long diagonal. Both Black bishops now rake the board.", sayShort: '…b5, …Bb7 — space and diagonals.' }),
    b({ id: 'h5', moves: 'e4 g6 d4 Bg7 Nc3 a6 Be3 b5 Qd2 Bb7 f3 d6 h4 h5', arrows: [A('h7', 'h5')], highlights: [H('h5')], say: "White throws h4 to storm the kingside, and ...h5 slams the door — fixing White's h-pawn and stopping the storm cold while Black's own play rolls on the queenside.", sayShort: '…h5 — slam the kingside shut.' }),
    b({ id: 'mid', moves: 'e4 g6 d4 Bg7 Nc3 a6 Be3 b5 Qd2 Bb7 f3 d6 h4 h5 Nh3 e6 Ng5 Nd7', highlights: [H('d7')], say: "White reroutes the knight via h3 to g5; Black plays ...e6 and ...Nd7, staying solid and flexible. A rich, double-edged middlegame where Black's queenside expansion and the two bishops give real winning chances — the Modern's whole point.", sayShort: '…Nd7 — winning chances both wings.' }),
  ],
};

const NF3: LessonScript = {
  openingId: 'pro-hikaru-pirc-modern', title: "Modern vs Nf3 Classical — ...c6 and ...d5", minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c6', moves: 'e4 g6 d4 Bg7 Nf3 c6', highlights: [H('c6')], say: "Against the classical Nf3, Black plays the flexible ...c6, preparing to strike the centre with ...d5 rather than letting White settle in.", sayShort: '…c6 — prepare ...d5.' }),
    b({ id: 'dxe4', moves: 'e4 g6 d4 Bg7 Nf3 c6 Nc3 d5 h3 dxe4 Nxe4 Nf6', highlights: [H('e4')], say: "Black challenges with ...d5 and trades on e4. After the recapture, ...Nf6 hits the centralised knight, forcing simplification into a comfortable structure.", sayShort: '…d5, …Nf6 — challenge the centre.' }),
    b({ id: 'mid', moves: 'e4 g6 d4 Bg7 Nf3 c6 Nc3 d5 h3 dxe4 Nxe4 Nf6 Nxf6+ exf6 Bc4 O-O O-O Nd7 Re1 b5 Bb3 Nb6 a4 a5', arrows: [A('b7', 'b5')], highlights: [H('b5')], say: "The knights trade, both sides castle, and Black gets his queenside rolling with ...b5 and ...a5. The solid structure, the fianchettoed bishop, and the queenside space give Black an easy, comfortable game.", sayShort: '…b5, …a5 — easy, comfortable game.' }),
  ],
};

const C6: LessonScript = {
  openingId: 'pro-hikaru-pirc-modern', title: "Modern — the ...c6 Setup", minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c6', moves: 'e4 g6 d4 Bg7 Nc3 c6', highlights: [H('c6')], say: "The flexible ...c6 prepares ...d5 to challenge White's centre directly, keeping all of Black's options open — exactly the fluid play this repertoire loves.", sayShort: '…c6 — flexible, prepare ...d5.' }),
    b({ id: 'dxe4', moves: 'e4 g6 d4 Bg7 Nc3 c6 Nf3 d5 h3 dxe4 Nxe4 Nf6', highlights: [H('e4')], say: "...d5 strikes and the centre trades; ...Nf6 challenges the e4-knight, forcing White to simplify into a structure Black handles comfortably.", sayShort: '…d5, …Nf6 — trade the centre.' }),
    b({ id: 'mid', moves: 'e4 g6 d4 Bg7 Nc3 c6 Nf3 d5 h3 dxe4 Nxe4 Nf6 Nxf6+ exf6 Bc4 O-O O-O Nd7 c3 b5 Bb3 Nb6 Re1 a5', arrows: [A('b7', 'b5')], highlights: [H('b5')], say: "After the knight trade and castling, Black expands with ...b5 and ...a5 and reroutes the knight to b6. A solid, comfortable middlegame with easy queenside play.", sayShort: '…b5, …a5 — comfortable game.' }),
  ],
};

const AUSTRIAN: LessonScript = {
  openingId: 'pro-hikaru-pirc-modern', title: "Modern vs Austrian f4 — Counterstrike", minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'a6', moves: 'e4 g6 d4 Bg7 Nc3 a6 f4', highlights: [H('f4')], say: "White goes for the aggressive Austrian Attack with f4 — the most ambitious try, grabbing the full centre. Black stays flexible with ...a6, ready to undermine.", sayShort: '…a6 vs Austrian — stay flexible.' }),
    b({ id: 'd5', moves: 'e4 g6 d4 Bg7 Nc3 a6 f4 c6 Nf3 d5 e5 Bg4', arrows: [A('c8', 'g4')], highlights: [H('d5')], say: "Black strikes back in the centre with ...c6 and ...d5; White pushes e5 to close it, and ...Bg4 pins the f3-knight, pressuring White's overextended setup.", sayShort: '…d5, …Bg4 — strike and pin.' }),
    b({ id: 'mid', moves: 'e4 g6 d4 Bg7 Nc3 a6 f4 c6 Nf3 d5 e5 Bg4 h3 Bxf3 Qxf3 e6 Be3 h5 g3 Nd7 O-O-O Rc8 g4 Ne7 Bd3 c5', arrows: [A('c6', 'c5')], highlights: [H('c5')], say: "Black trades on f3, builds with ...e6 and ...Nd7, then strikes the queenside with ...c5 against White's castled king. A sharp, double-edged race where Black's counterplay is fully in the game.", sayShort: '…c5 — counterstrike the king.' }),
  ],
};

export const PRO_HIKARU_PIRC_MODERN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-hikaru-pirc-modern::vs Be3 + Qd2': BE3,
  'pro-hikaru-pirc-modern::vs Nf3 Classical': NF3,
  'pro-hikaru-pirc-modern::...c6 setup': C6,
  'pro-hikaru-pirc-modern::vs Austrian f4': AUSTRIAN,
};
