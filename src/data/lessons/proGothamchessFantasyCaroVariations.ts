import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Fantasy Caro (3.f3), PER-VARIATION Watch
// lessons. Board-accurate, two-register narration (G9.3 Gates A-D). Student =
// WHITE. NOTE: with a pawn on e4, the Bd3/Qd3 diagonal to h7 is BLOCKED until e4
// advances — narration says "supports e4" / "opens after e5", never "aims at h7".

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Main Line 3…dxe4 4.fxe4 — the f3 gambit into the f7 attack ──
const MAIN: LessonScript = {
  openingId: 'pro-gothamchess-fantasy-caro',
  title: 'Fantasy Caro — Main Line 3…dxe4 4.fxe4',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'gambit',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4',
      arrows: [{ from: 'c4', to: 'f7', color: VIS }],
      highlights: [{ square: 'f7', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "Levy's main attacking line, and it's a real fight. After the trade on e4 and Black's …e5 break, we develop Nf3 and let Black grab the d4-pawn — then slam the bishop to c4, straight at f7, the weakest square in Black's camp. A pawn for a lead in development and a target.",
      sayShort: 'Bc4 — the gambit, eye f7.',
    }),
    b({
      id: 'castle',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Bc5',
      highlights: [{ square: 'e4', color: SOFT }, { square: 'f7', color: KEY }],
      say:
        "Black develops Nf6 and Bc5; we castle. We're a pawn down and completely on top — the engine agrees White is better here. The lead in development and the pressure on f7 are worth far more than the pawn Black spent three moves collecting.",
      sayShort: 'O-O — a winning gambit.',
    }),
    b({
      id: 'mg-ng5',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Bc5 Ng5',
      arrows: [{ from: 'f3', to: 'g5', color: VIS }],
      highlights: [{ square: 'f7', color: KEY }, { square: 'g5', color: SOFT }],
      say:
        "The storm breaks: Ng5. Now f7 is hit twice — by the knight and the bishop on c4 — and defended only by the king. Here's the middlegame: keep adding force to f7, bring the queen toward h5 or e2, recapture the d4-pawn when convenient, and crash through. The pawn was the bait; the attack is the catch.",
      sayShort: 'Ng5 — pile onto f7.',
    }),
  ],
};

// ── Solid 3…e6 — Black declines, White's big centre + Bf4 ──
const SOLID_E6: LessonScript = {
  openingId: 'pro-gothamchess-fantasy-caro',
  title: 'Fantasy Caro — Solid 3…e6',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4',
      highlights: [{ square: 'e4', color: KEY }, { square: 'b4', color: SOFT }],
      say:
        "Black plays the safe e6, declining the central tension and heading for a French-like structure. We develop Nc3; Black pins it with the natural Bb4. We have the broad d4-and-e4 centre propped up by f3 — a big, healthy pawn front.",
      sayShort: '…e6 — Black goes solid.',
    }),
    b({
      id: 'bf4-qd3',
      moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 Bf4 Ne7 Qd3',
      arrows: [{ from: 'd1', to: 'd3', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "Bf4 develops the bishop actively, outside the chain; then Qd3 — and its job here is to firmly defend the e4-pawn, the heart of our centre, against Black's pressure. Solid and purposeful: we hold the big centre and prepare to expand.",
      sayShort: 'Qd3 — shore up e4.',
    }),
    b({
      id: 'mg-plan',
      moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 Bf4 Ne7 Qd3 b6',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Black expands with b6. Here's the middlegame plan: with our centre rock-solid, we choose our break — e5 to gain space and open the diagonal for our pieces toward Black's king, or exd5 to open the centre when our development is ahead. The big pawn front is the asset; we castle and play to convert that space into a kingside initiative. Patient, principled, and a touch better.",
      sayShort: 'e5 — convert the centre to an attack.',
    }),
  ],
};

// ── Aggressive 3…g6 — Pirc-style fianchetto vs the big centre ──
const G6: LessonScript = {
  openingId: 'pro-gothamchess-fantasy-caro',
  title: 'Fantasy Caro — Aggressive 3…g6',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3',
      arrows: [{ from: 'c1', to: 'e3', color: VIS }],
      highlights: [{ square: 'e3', color: KEY }, { square: 'g7', color: SOFT }],
      say:
        "Black tries the unusual g6 and …Bg7, a Pirc-style fianchetto inviting us to over-build the centre. We oblige, but correctly — Be3 here, NOT Bf4, so the bishop supports d4 and isn't exposed to Black's …Ng4 or …Nh5 ideas. We're going to take the whole centre and dare Black to break it.",
      sayShort: 'Be3 — solid, support d4.',
    }),
    b({
      id: 'centre',
      moves: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 dxe4 fxe4 Nf6 Nf3 O-O Bd3',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e4', color: KEY }],
      say:
        "Black trades on e4 and we recapture, leaving a commanding d4-and-e4 pawn duo. We develop Nf3 and Bd3 — the bishop supporting our centre — while Black castles behind his fianchetto. We have the space; he has the long-diagonal bishop. The battle is who breaks where.",
      sayShort: 'big centre vs the fianchetto.',
    }),
    b({
      id: 'mg-plan',
      moves: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 dxe4 fxe4 Nf6 Nf3 O-O Bd3',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'h7', color: SOFT }],
      say:
        "Here's the middlegame plan. We castle, then look to push e5 — kicking the f6-knight AND opening the bishop on d3's diagonal straight at h7. Add the queen to d2 with ideas of Bh6 to trade Black's prized g7-bishop, and we have a textbook big-centre attack. Black's hypermodern counterplay is slower; our space and direct kingside pressure carry the day.",
      sayShort: 'e5 + Bh6 — break and attack.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_FANTASY_CARO_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-fantasy-caro::Main Line 3...dxe4 4.fxe4': MAIN,
  'pro-gothamchess-fantasy-caro::Solid 3...e6': SOLID_E6,
  'pro-gothamchess-fantasy-caro::Aggressive 3...g6': G6,
};
