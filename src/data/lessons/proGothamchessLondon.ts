import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — London System, WHITE side. His signature
// 1.d4 system. The spine completes the full London setup and reaches a castled
// middlegame by move 9 (G9.3 Gate B), then teaches the Ne5-outpost plan.
// Student plays WHITE. Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_LONDON_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-london',
  title: "GothamChess's London System — the Setup and the Ne5 Squeeze",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-strategy',
    'https://www.chess.com/openings/London-System',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/London_System',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'd4 d5 Nf3 Nf6',
      say:
        "The London — Levy's bread-and-butter with 1.d4. The beauty of it: we play almost the same setup whatever Black does. d4, Nf3, and the pieces come out on autopilot. Black mirrors with d5 and Nf6.",
      sayShort: 'd4 Nf3 — the London setup.',
    }),
    b({
      id: 'bf4',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5',
      highlights: [{ square: 'f4', color: KEY }],
      say:
        "Bf4 — the move that names the system. We develop the dark-squared bishop OUTSIDE the pawn chain before locking it in with e3. That's the whole point of the London: this bishop never gets buried. Black hits the centre with c5.",
      sayShort: 'Bf4 — the bishop comes out.',
    }),
    b({
      id: 'e3',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6',
      highlights: [{ square: 'd4', color: SOFT }],
      say:
        "e3 — solid, builds the little pyramid behind the bishop. Now d4 is rock-solid and our light-squared bishop has the f1-a6 diagonal to come out. Black develops the knight to c6, leaning on d4.",
      sayShort: 'e3 — the solid pyramid.',
    }),
    b({
      id: 'nbd2',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6',
      say:
        "Nbd2 — the knight finds its home, ready to reroute to e5 or support an e-pawn push later. Black plays e6, shutting in his own light-squared bishop. Already we have the better minor pieces.",
      sayShort: 'Nbd2 — flexible development.',
    }),
    b({
      id: 'c3',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6',
      highlights: [{ square: 'd4', color: SOFT }, { square: 'f4', color: KEY }],
      say:
        "c3 — buttressing d4 so the centre never cracks. Black offers a trade with Bd6, challenging our prized bishop on f4. We won't oblige.",
      sayShort: 'c3 — hold the centre.',
    }),
    b({
      id: 'bg3',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O',
      highlights: [{ square: 'g3', color: KEY }],
      say:
        "Bg3 — we sidestep the trade and keep the bishop alive on the b8-h2 diagonal, still aimed at the kingside. Trading our good bishop is exactly what Black wants; we don't give him the satisfaction. Black castles.",
      sayShort: 'Bg3 — keep the good bishop.',
    }),
    b({
      id: 'bd3',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'h7', color: KEY }],
      say:
        "Bd3 — the light-squared bishop slots onto the b1-h7 diagonal, training right at h7 next to Black's king. Now both bishops point kingside. Black fianchettoes with b6, trying to find activity for his bad bishop.",
      sayShort: 'Bd3 — aim at h7.',
    }),
    b({
      id: 'castle',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6 O-O Bb7',
      highlights: [{ square: 'e5', color: SOFT }],
      say:
        "We castle, Black completes with Bb7, and the London setup is finished — and we've reached the middlegame fully developed, kings safe, both bishops aimed at the kingside. From a position this harmonious, White just plays chess from a position of strength.",
      sayShort: 'O-O — the setup is complete.',
    }),
    b({
      id: 'mg-ne5',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6 O-O Bb7',
      arrows: [{ from: 'f3', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }],
      say:
        "Here's the plan. The knight on f3 has a perfect home on e5 — the classic London outpost, anchored by the d4-pawn, parked right in front of Black's king. From e5 it eyes f7, g6, and the kingside. Build behind it: the bishop on g3, the bishop on d3, and the queen swinging to f3 or e2. The London looks quiet, but this is a slow-rolling kingside attack — and Black has no easy way to stop the knight from landing on e5.",
      sayShort: 'Ne5 — the London outpost.',
    }),
    b({
      id: 'mg-storm',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6 O-O Bb7',
      highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: KEY }],
      say:
        "And when the knight reaches e5 and Black tries to challenge it, recapture with the f-pawn — f4xe5 opens the f-file straight at Black's king and gives you a pawn on e5 cramping everything. That's the London dream: a quiet setup that turns into a direct attack. Harmony first, then the storm.",
      sayShort: 'f4 — open the f-file to the king.',
    }),
  ],
};
