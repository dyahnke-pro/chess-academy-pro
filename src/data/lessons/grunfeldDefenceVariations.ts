import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Grünfeld Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Deepest beat ≥20 plies (lessonDepth gate). Fianchetto/Neo-Grünfeld anchor
// <20p in the curated pgn, so they fold into the main rather than ship thin.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'];

export const GRUNFELD_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'grunfeld-defence::Russian System (Qb3)': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Russian System (Qb3)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'r1', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4', say: "The Russian System — White sidesteps the doubled c-pawns of the Exchange by regaining the pawn with Qb3 and Qxc4. A restrained, positional approach: White keeps a clean structure but spends time with the queen, which Black will exploit.", sayShort: 'Qxc4 — White regains it cleanly.', highlights: [H('c4')] }),
      b({ id: 'r2', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Nc6', say: "Black castles, White builds the broad e4-centre, and …Nc6 — the Prins move — immediately pressures the d4-pawn, refusing to let White's centre settle. The g7-bishop and the knight already gang up on d4.", sayShort: '…Nc6 — pressure d4 at once.', arrows: [A('c6', 'd4')], highlights: [H('c6'), H('d4')] }),
      b({ id: 'r3', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Nc6 Be2 Nd7 Be3 Nb6', say: "…Nd7 reroutes the knight to …Nb6, hitting the c4-queen and eyeing the c4- and d5-squares. The harassment of White's exposed queen gains Black the tempi to mass against the centre.", sayShort: '…Nb6 — harass the queen, eye c4.', highlights: [H('b6')] }),
      b({ id: 'r4', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Nc6 Be2 Nd7 Be3 Nb6 Qd3 f5', say: "Qd3 retreats, and …f5! the Grünfeld counterpunch — striking directly at the e4-centre and opening lines on the kingside. There is the Russian System tabiya: Black's pieces swarming White's centre, the f5-break cracking it open, full dynamic equality from a defence.", sayShort: '…f5 — crack open the e4-centre.', highlights: [H('f5'), H('e4')] }),
    ],
  },

  'grunfeld-defence::Bc4 Classical': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Classical Bc4', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'bc1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5', say: "The Classical Bc4 — White develops the bishop aggressively, aiming at f7 and supporting the centre. Black answers in pure Grünfeld style: …c5, striking the base of the d4/e4 duo while the g7-bishop glares down the long diagonal.", sayShort: '…c5 — strike the centre, Bc4 lines.', highlights: [H('c5'), H('d4', SOFT)] }),
      b({ id: 'bc2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6', say: "Ne2 supports d4 and Black castles, then …Nc6 piles onto the d4-pawn. The knight on c6 and the bishop on g7 form the classic Grünfeld battery against White's centre.", sayShort: '…Nc6 — battery on d4 with the bishop.', arrows: [A('c6', 'd4')], highlights: [H('c6'), H('d4')] }),
      b({ id: 'bc3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6 Be3 Bg4 f3 Na5', say: "…Bg4 develops with a tactical pin on the e2-knight, and …Na5 attacks the c4-bishop — Black harasses White's pieces while keeping the pressure on the centre. White's f3 weakens the king, setting up the coming fireworks.", sayShort: '…Na5 — hit the c4-bishop.', arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4')] }),
      b({ id: 'bc4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6 Be3 Bg4 f3 Na5 Bxf7+ Rxf7 fxg4 Rxf1+ Kxf1 cxd4 cxd4 Qd6', say: "Bxf7+ is White's famous try — but after …Rxf7 fxg4 …Rxf1+ Kxf1 …cxd4 cxd4 …Qd6 the smoke clears with Black perfectly placed: the d4-pawn isolated and weak, the queen active on d6, and a comfortable game. There is the Bc4 tabiya — the sharpest White try defused, the centre still Black's target.", sayShort: '…Qd6 — smoke clears, d4 is weak.', highlights: [H('d4'), H('d6')] }),
    ],
  },

  'grunfeld-defence::Exchange: Nf3 c5 Rb1 (Modern)': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Modern Rb1 Exchange', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'rb1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1', say: "The Modern Rb1 — White's flexible 21st-century Exchange, lifting the rook off the long diagonal and eyeing the b7-pawn. It dodges the …Qa5 pin of the old main line. Black continues with the same plan: hit the centre.", sayShort: 'Rb1 — the modern rook lift.', highlights: [H('b7', SOFT)] }),
      b({ id: 'rb2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+', say: "Black castles, trades …cxd4 cxd4 to isolate the d-pawn, and checks with …Qa5+! — the zwischenzug picks up a vital tempo and lets the queen swing into White's loosened queenside.", sayShort: '…Qa5+ — check, win the tempo.', highlights: [H('a5'), H('d4')] }),
      b({ id: 'rb3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2', say: "Bd2 blocks, and …Qxa2! snatches the a-pawn — a well-known grab that is fully sound here, the queen raiding deep into White's camp while White has nothing immediate. Black is simply a pawn up.", sayShort: '…Qxa2 — snatch the pawn, sound.', highlights: [H('a2')] }),
      b({ id: 'rb4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2 O-O Bg4 Rxb7 Bxf3 Bxf3', say: "White castles and grabs b7, but …Bg4 and …Bxf3 trade off a defender of the d4-pawn, leaving Black with the extra pawn and pressure on the isolani. There is the Modern Rb1 tabiya: a pawn to the good with the familiar Grünfeld pressure on d4 — White's modern subtlety gives nothing away.", sayShort: '…Bxf3 — a pawn up, press d4.', highlights: [H('f3'), H('g4', SOFT)] }),
    ],
  },
};
