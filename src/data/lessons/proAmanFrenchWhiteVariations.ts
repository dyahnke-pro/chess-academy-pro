import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — French Defense (White) variation lessons.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:french-defence',
  'concept:pos-development',
  'https://www.chess.com/openings/French-Defense',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_FRENCH_WHITE_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── Winawer main tab ──
  'pro-aman-french-white::Winawer (…Bb4)': {
    openingId: 'pro-aman-french-white',
    title: 'Winawer — Bishop Pair and a Kingside Storm',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'e5', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5', highlights: [H('e5')],
        say: "Against the Winawer pin …Bb4, White pushes e5 — locking the centre, grabbing space, and shutting in Black's light-squared bishop. The classic French squeeze.",
        sayShort: 'e5 — lock and cramp.' }),
      b({ id: 'bxc3', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3', arrows: [A('b2', 'c3')], highlights: [H('c3')],
        say: "After …c5 and the trade on c3, bxc3 takes the bishop pair and a big pawn centre in return for doubled pawns. The Winawer bargain: structure for dynamism.",
        sayShort: 'bxc3 — bishop pair for pawns.' }),
      b({ id: 'h4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 h4', highlights: [H('f5'), H('h4')],
        say: "h4 is the thematic move — kingside space, Rh3 lifts, and a clamp on …f5. White's whole plan is a kingside attack while the centre stays locked.",
        sayShort: 'h4 — kingside space.' }),
      b({ id: 'middlegame', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 h4 Qc7 Nf3 b6', arrows: [A('g1', 'f3')], highlights: [H('h5'), H('e5')],
        say: "Nf3 defends e5 and readies the attack; Black expands with …b6. White has the classic Winawer trumps: the two bishops and a space-gaining h4-h5 storm, against Black's counterplay on the doubled c-pawns. An unbalanced fight where White's attack gives the practical edge.",
        sayShort: 'Nf3 — defend, then storm.' }),
    ],
  },

  // ── Classical (…Nf6) ──
  'pro-aman-french-white::Classical (…Nf6)': {
    openingId: 'pro-aman-french-white',
    title: 'French Classical — Bg5 Pressure',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'bg5', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5', arrows: [A('c1', 'g5')], highlights: [H('e5'), H('g5')],
        say: "Against …Nf6, Bg5 pins the knight and increases the pressure on Black's centre. White develops actively, eyeing the d5- and e4-tension and a possible e5 push.",
        sayShort: 'Bg5 — pin and press.' }),
      b({ id: 'bxf6', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 gxf6', highlights: [H('f6')],
        say: "Black resolves the centre with …dxe4; after Nxe4 and …Be7, Bxf6 damages Black's kingside structure — the doubled, shattered f-pawns become a long-term target. White trades to inflict the weakness.",
        sayShort: 'Bxf6 — shatter the kingside.' }),
      b({ id: 'nf3', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 gxf6 Nf3 f5 Nc3', arrows: [A('e4', 'c3')], highlights: [H('f5')],
        say: "Black grabs the centre with …f5; White retreats Nc3, keeping the structure intact while Black's pawns become loose. White will target the weakened light squares and the broken kingside.",
        sayShort: 'Nc3 — target the weak pawns.' }),
      b({ id: 'middlegame', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 gxf6 Nf3 f5 Nc3 a6 g3 b5 Bg2 Bb7 O-O O-O Qe2', arrows: [A('d1', 'e2')], highlights: [H('g2'), H('e2')],
        say: "White's bishop already rakes the long diagonal from g2 at Black's shattered kingside, and now the queen centralises to e2 as White castles into a comfortable middlegame. White has the sounder structure, the better bishop, and the clear plan of pressing Black's weakened pawns. A pleasant, lasting edge.",
        sayShort: 'Qe2 — centralise, press the weak pawns.' }),
    ],
  },

  // ── Rubinstein (…dxe4) ──
  'pro-aman-french-white::Rubinstein (…dxe4)': {
    openingId: 'pro-aman-french-white',
    title: 'French Rubinstein — Free Development Edge',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'nxe4', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4', highlights: [H('e4')],
        say: "When Black gives up the centre with …dxe4, White recaptures Nxe4 and enjoys a free, easy game: more space, smoother development, and no structural problems. The Rubinstein concedes the centre for solidity.",
        sayShort: 'Nxe4 — free development edge.' }),
      b({ id: 'nf3', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Bd7 Nf3 Bc6 Bd3', arrows: [A('f1', 'd3')], highlights: [H('d3')],
        say: "Black develops the bishop via d7-c6 to challenge the knight; White develops Nf3 and Bd3, aiming the bishop at Black's kingside. White's pieces flow to natural, active squares.",
        sayShort: 'Bd3 — aim at the king.' }),
      b({ id: 'oo', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Bd7 Nf3 Bc6 Bd3 Nd7 O-O Ngf6 Ned2', highlights: [H('d2')],
        say: "White castles and tucks the knight to d2, keeping a flexible, harmonious setup. White has a small, durable space edge and the freer position — exactly the comfortable game the Rubinstein allows White.",
        sayShort: 'O-O — flexible, comfortable.' }),
      b({ id: 'middlegame', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Bd7 Nf3 Bc6 Bd3 Nd7 O-O Ngf6 Ned2 Be7 Re1 O-O Ne5 Nxe5 dxe5 Qd5 Nf3', arrows: [A('f3', 'e5')], highlights: [H('e5')],
        say: "White posts the knight on e5 and, after trades, the e5-pawn cramps Black while White's pieces stay active. White reaches a pleasant middlegame: more space, the freer game, and the easy plan of pressing on the kingside. The Rubinstein gives White a small but lasting initiative.",
        sayShort: 'Ne5 — cramp, stay active.' }),
    ],
  },
};
