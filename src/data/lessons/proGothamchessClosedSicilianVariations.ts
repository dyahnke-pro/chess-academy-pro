import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Closed Sicilian (2.Nc3), PER-VARIATION Watch
// lesson. Board-accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.
// NOTE: after the trade BLACK keeps the bishop pair — White's pull is central
// space + the queen on d4, not the bishops.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Closed-Sicilian',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

const MAIN: LessonScript = {
  openingId: 'pro-gothamchess-closed-sicilian', title: 'Closed Sicilian — Main Line',
  minutes: 10, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }], highlights: [{ square: 'c3', color: SOFT }, { square: 'd4', color: KEY }],
      say: "The Nc3 move order — another way Levy dodges Open Sicilian theory. We develop the knight, lean on c6 with Bb5, and when Black leaps into d4 to muddy things, we calmly question the knight with Nf3. No panic, no theory — just sensible developing moves.",
      sayShort: 'Nf3 — challenge the d4-knight.' }),
    b({ id: 'trade', moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }], highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say: "Black trades his knight for our bishop; we recapture, get nudged by …a6, and retreat to c3. Black has the two bishops now — but in this slow position they have nothing to bite on. When Black plays …d6, we strike with d4, seizing space in the centre.",
      sayShort: 'd4 — seize the centre.' }),
    b({ id: 'mg-qxd4', moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4 cxd4 Qxd4',
      arrows: [{ from: 'd4', to: 'g7', color: VIS }], highlights: [{ square: 'd4', color: KEY }],
      say: "We recapture on d4 with the queen, planting it in the centre with a glance toward g7. Here's the honest middlegame: it's a SMALL edge. We have more space and the better-placed pieces; Black has the bishop pair but no targets for it yet. We castle, develop the dark-squared bishop, and squeeze. Against a Sicilian player who wanted chaos, a quiet, better game is exactly the win we're after.",
      sayShort: 'Qxd4 — a small, riskless pull.' }),
  ],
};

export const PRO_GOTHAMCHESS_CLOSED_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-closed-sicilian::Closed Sicilian Main': MAIN,
};
