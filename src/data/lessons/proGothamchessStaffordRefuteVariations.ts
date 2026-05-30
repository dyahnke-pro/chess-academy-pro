import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Stafford Gambit Refutation, PER-VARIATION
// Watch lessons. Board-accurate, two-register narration (G9.3 Gates A-D).
// Student = WHITE. Both lines keep the extra pawn into a clearly-better
// middlegame (engine +1.5 to +2).

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Main Refutation d3 — the d3 wall + c3/d4 centre ──
const D3: LessonScript = {
  openingId: 'pro-gothamchess-stafford-refute',
  title: 'Stafford Refutation — Main Line d3',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd3',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2',
      arrows: [{ from: 'd2', to: 'd3', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'g4', color: SOFT }],
      say:
        "The textbook refutation. We accept the gambit knight, and after …dxc6 play the modest d3 — NOT d4 — keeping the centre closed and the extra pawn permanent. Then the humble Be2, covering the g4-square so Black gets no pin or sacrifice. Every Stafford trap relies on open lines and loose pieces; these little moves slam the shop shut.",
      sayShort: 'd3 + Be2 — the quiet wall.',
    }),
    b({
      id: 'h5-c3',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3',
      arrows: [{ from: 'c2', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "Out of real ideas, Black lunges with h5, hoping to stir up a kingside attack. It's a sign the gambit has failed — he's throwing wing pawns because his pieces have no targets. We answer in the centre with c3, preparing d4 to bury his whole attack under our pawns.",
      sayShort: 'c3 — prepare d4.',
    }),
    b({
      id: 'mg-d4',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3 Ng4 d4',
      arrows: [{ from: 'd3', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "Black throws the knight to g4; we ignore the noise and play d4, striking the c5-bishop and seizing the full centre. Here's the middlegame: a clean extra pawn, a commanding centre, and Black's attack fizzling into nothing. The engine calls White close to winning. The most feared gambit on the internet — turned into a free pawn.",
      sayShort: 'd4 — centre + extra pawn, winning.',
    }),
  ],
};

// ── 4…dxc6 5.e5 Line — push e5, kick the knight, hold the pawn ──
const E5: LessonScript = {
  openingId: 'pro-gothamchess-stafford-refute',
  title: 'Stafford Refutation — 4…dxc6 5.e5 Line',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'e5',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
      say:
        "The aggressive alternative: instead of the quiet d3, we push e5, kicking the f6-knight forward with tempo and grabbing space. We're still a clean pawn up — now we add a cramping pawn on e5 to the bargain.",
      sayShort: 'e5 — kick the knight, grab space.',
    }),
    b({
      id: 'd3',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4 d3 Nc5 Be3',
      arrows: [{ from: 'd2', to: 'd3', color: VIS }],
      highlights: [{ square: 'e4', color: SOFT }, { square: 'c5', color: SOFT }],
      say:
        "The knight jumps to e4, its only active square; we calmly kick it with d3. It retreats to c5, and we develop the bishop to e3, challenging it again. Notice the theme: we never let Black's pieces settle on a good square, and we never give back the pawn.",
      sayShort: 'd3 — kick the knight again.',
    }),
    b({
      id: 'mg-nd2',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4 d3 Nc5 Be3 Ne6 Nd2',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Black's knight shuffles to e6 and we develop the last piece with Nd2. Here's the middlegame: we're a clean pawn up, the e5-pawn cramps Black, and his pieces have been chased around with no compensation in sight. The engine confirms White is clearly better. Develop, castle, and convert the extra pawn — the Stafford simply doesn't work against this.",
      sayShort: 'Nd2 — develop, convert the pawn.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_STAFFORD_REFUTE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-stafford-refute::Main Refutation d3': D3,
  'pro-gothamchess-stafford-refute::4...dxc6 5.e5 Line': E5,
};
