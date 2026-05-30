import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Caro-Kann Defense, BLACK side. The Classical
// main line (4…Bf5): Black develops the light-squared bishop OUTSIDE the pawn
// chain before …e6 — the whole point of the Caro over the French — trades it for
// White's attacking bishop, and reaches a rock-solid, weakness-free middlegame
// (24 plies, White castled long; engine ~level, G9.3 Gates A-D). Student = BLACK.
// Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_CARO_KANN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann',
  title: "GothamChess's Caro-Kann — the Classical, Solid as a Rock",
  minutes: 12,
  orientation: 'black',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Caro-Kann-Defense-Classical-Variation',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 c6 d4 d5',
      arrows: [{ from: 'd5', to: 'e4', color: VIS }],
      highlights: [{ square: 'c6', color: SOFT }, { square: 'd5', color: KEY }],
      say:
        "The Caro-Kann — 1.e4 c6, then 2…d5. Levy calls it the soundest answer to e4 there is. We challenge the centre immediately with d5, backed by the c6-pawn, so we get a French-like solidity without the French's big problem. You'll see that problem solved in a moment.",
      sayShort: 'c6 and d5 — challenge the centre.',
    }),
    b({
      id: 'bf5',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5',
      arrows: [{ from: 'f5', to: 'e4', color: VIS }],
      highlights: [{ square: 'f5', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "We trade on e4, and now the key Caro move: Bf5. We develop the light-squared bishop OUTSIDE the pawn chain, hitting the knight on e4. This is the whole point of the Caro over the French — in the French that bishop gets locked behind its own pawns; here it's free and active before we ever play e6.",
      sayShort: 'Bf5 — free the good bishop.',
    }),
    b({
      id: 'ng3-bg6',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6',
      highlights: [{ square: 'g6', color: SOFT }],
      say:
        "White shoos the bishop with Ng3; we drop it back to g6, still outside the chain and eyeing the long diagonal. No hurry, no concession — the bishop simply found a better square.",
      sayShort: 'Bg6 — keep the bishop active.',
    }),
    b({
      id: 'h4-h6',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6',
      highlights: [{ square: 'h6', color: KEY }, { square: 'g6', color: SOFT }],
      say:
        "White grabs kingside space with h4, threatening to push h5 and trap our bishop. We make a quiet hole with h6 — now if the pawn comes to h5, the bishop has the h7-square to retreat to. A tiny move that takes all the sting out of White's plan.",
      sayShort: 'h6 — give the bishop air.',
    }),
    b({
      id: 'nf3-nd7',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7',
      highlights: [{ square: 'd7', color: SOFT }],
      say:
        "White develops the knight to f3; we bring our own out to d7. The knight heads here, not c6, so it doesn't block the c-pawn — we want to keep the …c5 break in our pocket. Calm, harmonious development, exactly as the Caro likes it.",
      sayShort: 'Nd7 — keep …c5 ready.',
    }),
    b({
      id: 'h5-bh7',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7',
      highlights: [{ square: 'h7', color: SOFT }],
      say:
        "White pushes h5; we tuck the bishop onto h7, just as we planned with h6. It looks passive, but it's perfectly safe and still points down the b1-h7 diagonal. White spent two pawn moves to gain a little space; we lost nothing.",
      sayShort: 'Bh7 — safely tucked away.',
    }),
    b({
      id: 'trade',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3',
      arrows: [{ from: 'h7', to: 'd3', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }],
      say:
        "White offers a trade with Bd3; we happily take it. Here's a key idea — we're swapping off White's good light-squared bishop, the one that would otherwise attack our king. Trading pieces takes the venom out of White's attack and leaves us with a clean, easy position to handle.",
      sayShort: 'Bxd3 — trade off the attacker.',
    }),
    b({
      id: 'e6',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6',
      highlights: [{ square: 'e6', color: KEY }],
      say:
        "Now — and only now — we play e6. The difference from the French is night and day: our light-squared bishop is already gone, traded off, so e6 walls in nothing. We have no bad pieces, no weaknesses, a tidy pawn chain. This is what 'solid' actually looks like.",
      sayShort: 'e6 — no bad bishop left behind.',
    }),
    b({
      id: 'develop',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6',
      highlights: [{ square: 'f6', color: SOFT }],
      say:
        "White develops the bishop to d2, preparing to castle queenside; we bring the second knight out to f6. Both knights are home, the structure is sound, and we're a single move from castling ourselves.",
      sayShort: 'Ngf6 — finish developing.',
    }),
    b({
      id: 'mg-castle',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7',
      arrows: [{ from: 'c7', to: 'c5', color: VIS }],
      highlights: [{ square: 'c1', color: SOFT }, { square: 'c5', color: KEY }],
      say:
        "White castles long; we develop the bishop to e7, ready to castle short. And there's the middlegame picture: White's king sits on the queenside, so that's where we aim. We castle, then roll the c- and b-pawns — c5, b5, b4 — straight at his king. Opposite-side castling, but our structure is flawless and our target is clear. The Caro gave us a fortress and a battering ram.",
      sayShort: '…c5/…b5 — storm his castled king.',
    }),
  ],
};
