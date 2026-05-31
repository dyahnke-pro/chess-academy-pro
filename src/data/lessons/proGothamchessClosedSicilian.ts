import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Closed Sicilian move order (2.Nc3), WHITE side.
// Another anti-Open-Sicilian weapon: develop Nc3, pressure c6 with Bb5, let Black
// trade on b5, then break with d4 and centralise the queen for a small, theory-
// light space edge (15 plies; engine ~ +0.5, G9.3 Gates A-D). NOTE: after the
// trade BLACK keeps the bishop pair — White's pull is central space and the
// queen on d4, NOT the bishops. Student = WHITE. Board-accurate, two registers.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_CLOSED_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-closed-sicilian',
  title: "GothamChess's Closed Sicilian — 2.Nc3 and a Theory-Light Pull",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Closed-Sicilian',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Sicilian_Defence,_Closed_Variation',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 c5 Nc3 Nc6 Bb5',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }],
      highlights: [{ square: 'c3', color: SOFT }, { square: 'b5', color: KEY }],
      say:
        "Another way Levy dodges Open Sicilian theory: Nc3, the Closed Sicilian move order. We develop the knight first, then bring the bishop to b5 to lean on the c6-knight. The message is the same as the Rossolimo — we steer the game into calm, understandable waters and make Black solve real problems with no memorised lines to lean on.",
      sayShort: 'Bb5 — pressure c6.',
    }),
    b({
      id: 'nd4',
      moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3',
      arrows: [{ from: 'f3', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "Black leaps the knight into d4, attacking our bishop and trying to muddy things; we calmly develop Nf3, attacking that very knight right back. We don't panic at the centralised knight — we just question it and let Black decide what to do with it.",
      sayShort: 'Nf3 — challenge the d4-knight.',
    }),
    b({
      id: 'trade',
      moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3',
      arrows: [{ from: 'b5', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: SOFT }],
      say:
        "Black trades his knight for our bishop on b5; we recapture with the other knight, get kicked by a6, and retreat to c3. Yes, Black has the two bishops now — but in this closed, slow position they have nothing to bite on, and we've gained time and kept a grip on the centre.",
      sayShort: 'Nc3 — regroup, hold the centre.',
    }),
    b({
      id: 'd6-d4',
      moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "Black plays d6 to build a small centre; we strike first with d4, challenging the c5-pawn and grabbing space in the middle. Opening the centre when we're the more developed side is always the right instinct.",
      sayShort: 'd4 — seize the centre.',
    }),
    b({
      id: 'mg-qxd4',
      moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4 cxd4 Qxd4',
      arrows: [{ from: 'd4', to: 'g7', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "We recapture on d4 with the queen, planting it in the centre with a glance down toward g7. Here's the honest middlegame assessment: it's a SMALL edge. We have more space and the better-placed pieces; Black has the bishop pair but no targets for it yet. We castle, develop the dark-squared bishop, and squeeze. No fireworks — just a comfortable, riskless pull, which against a Sicilian player who wanted chaos is exactly the win Levy is after.",
      sayShort: 'Qxd4 — a small, riskless pull.',
    }),
  ],
};
