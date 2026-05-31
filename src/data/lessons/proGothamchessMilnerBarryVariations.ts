import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Milner-Barry Gambit (French Advance),
// PER-VARIATION Watch lessons. Board-accurate, two-register narration
// (G9.3 Gates A-D). Student = WHITE.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/French-Defense-Advance-Variation-Milner-Barry-Gambit',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Main Gambit Line — pawn for the f4 storm, into Kh1 ──
const MAIN: LessonScript = {
  openingId: 'pro-gothamchess-milner-barry',
  title: 'Milner-Barry — Main Gambit Line',
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'gambit',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3',
      arrows: [{ from: 'f1', to: 'd3', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'h7', color: SOFT }],
      say:
        "The French Advance, but the sharp version. Black piles onto d4 with …c5, …Nc6 and …Qb6 — three attackers. And here's the gambit: Bd3! We ignore the d4-pawn and develop toward h7, inviting Black to spend three moves winning a pawn while we build an attack.",
      sayShort: 'Bd3 — offer the d4-pawn.',
    }),
    b({
      id: 'grab',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4',
      highlights: [{ square: 'd4', color: SOFT }],
      say:
        "Black takes the bait: he wins the d4-pawn and his queen lands in the centre. He's a clean pawn up — but look at his position. Almost nothing developed, the queen exposed in the middle, the king stuck on e8. We traded a pawn for a massive head start.",
      sayShort: 'Qxd4 — Black grabs, but lags.',
    }),
    b({
      id: 'mg-storm',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3 a6 Qe2 Ne7 Kh1',
      arrows: [{ from: 'f2', to: 'f4', color: VIS }],
      highlights: [{ square: 'h7', color: KEY }, { square: 'f4', color: SOFT }],
      say:
        "Nc3 develops with tempo on the loose queen, Qe2 connects the rooks, and Kh1 tucks the king off the dangerous diagonal — prophylaxis before the storm. Here's the middlegame: the bishop on d3 aims at h7, and we're ready to roll f4-f5 to smash open the kingside. Count the attackers, not the pawn. A pawn is a small price for a game where you play for mate.",
      sayShort: 'Kh1 then f4 — the storm rolls.',
    }),
  ],
};

// ── Black Declines with …Bd7 — same gambit, develop-first move order ──
const BD7: LessonScript = {
  openingId: 'pro-gothamchess-milner-barry',
  title: 'Milner-Barry — Black Develops …Bd7 First',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'bd7',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 Bd7 O-O',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'd7', color: SOFT }, { square: 'h7', color: SOFT }],
      say:
        "Sometimes Black develops the bishop to d7 FIRST, before grabbing the pawn — a more careful move order. No matter: we offer the gambit just the same with Bd3 and castle. Our plan doesn't change one bit. The pawn on d4 is bait either way.",
      sayShort: 'O-O — offer the gambit anyway.',
    }),
    b({
      id: 'grab',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 Bd7 O-O cxd4 cxd4 Nxd4 Nxd4 Qxd4',
      highlights: [{ square: 'd4', color: SOFT }],
      say:
        "Black collects the pawn the same way, and the queen plants itself on d4. He's a pawn up with a developed bishop on d7 this time — but his king is still in the centre and his kingside is bare. Our lead in development and our attacking chances are more than enough.",
      sayShort: 'Qxd4 — a pawn up, king centred.',
    }),
    b({
      id: 'mg-nc3',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 Bd7 O-O cxd4 cxd4 Nxd4 Nxd4 Qxd4 Nc3 Qb6',
      arrows: [{ from: 'b1', to: 'c3', color: VIS }],
      highlights: [{ square: 'h7', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Nc3 leaps out with tempo, hitting the d5-pawn and the loose queen, which retreats to b6. Here's the middlegame: every White piece flows toward the kingside while Black is still untangling. The plan is the eternal Milner-Barry recipe — Qe2, Kh1, then f4-f5 crashing into h7. The pawn bought the attack; now cash it in.",
      sayShort: 'Nc3 — develop, then f4 storm.',
    }),
  ],
};

// ── Anti-French 3.e5 Advance (…Nh6-f5) — trade the bishop, e5 bind ──
const NH6: LessonScript = {
  openingId: 'pro-gothamchess-milner-barry',
  title: 'Milner-Barry — vs …Nh6-f5',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nh6',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Nh6',
      highlights: [{ square: 'h6', color: SOFT }, { square: 'f5', color: KEY }],
      say:
        "Black tries the unusual Nh6, heading for f5 to challenge our light-squared bishop — the very piece that gives the Advance its attacking punch. We're not afraid of the trade; in fact, accepting it leaves Black with a structural scar.",
      sayShort: 'Nh6 — Black eyes our bishop.',
    }),
    b({
      id: 'trade',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Nh6 Bd3 cxd4 cxd4 Nf5 Bxf5 exf5',
      arrows: [{ from: 'd3', to: 'f5', color: VIS }],
      highlights: [{ square: 'f5', color: KEY }],
      say:
        "When the knight lands on f5, we take it — Bxf5 — and after …exf5 Black's pawn structure is wrecked: the f5-pawn is weak and fixed, and the e6-square he relied on is gone. We gave up a bishop, but we got a permanent target and a clamp on the light squares.",
      sayShort: 'Bxf5 — leave Black a weak pawn.',
    }),
    b({
      id: 'mg-summary',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Nh6 Bd3 cxd4 cxd4 Nf5 Bxf5 exf5 Nc3 Be6 O-O Be7',
      arrows: [{ from: 'e5', to: 'd6', color: SOFT }],
      highlights: [{ square: 'f5', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "We develop Nc3 and castle; Black tries to make the best of his bishops. Here's the middlegame: the e5-pawn cramps Black, the f5-pawn is a long-term weakness, and the light squares — especially e6 and d5 — are ours to occupy with a knight. The plan is to blockade f5, pile on it, and use the central space. A clean, durable edge from meeting a sideline correctly.",
      sayShort: 'blockade f5 — durable bind.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_MILNER_BARRY_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-milner-barry::Main Gambit Line': MAIN,
  'pro-gothamchess-milner-barry::Black Declines with Bd7': BD7,
  'pro-gothamchess-milner-barry::Anti-French 3.e5 Advance': NH6,
};
