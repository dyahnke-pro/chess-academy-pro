import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Milner-Barry Gambit vs the French, WHITE side.
// White gambits the d4-pawn for a development lead and an f4-f5 kingside storm.
// The spine is the full main gambit to Kh1 (23 plies) — a deep middlegame where
// the f-storm plan picks up (Gate C). Student = WHITE. Board-accurate.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_MILNER_BARRY_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-milner-barry',
  title: "GothamChess's Milner-Barry Gambit — a Pawn for the Storm",
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/French-Defense-Advance-Variation-Milner-Barry-Gambit',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/French_Defence',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 e6 d4 d5 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say:
        "Against the French, Levy plays the Advance — e5, grabbing space and locking Black's light-squared bishop inside the pawn chain. But this is the sharp version: we're going to offer a pawn for a kingside attack.",
      sayShort: "e5 — the Advance.",
    }),
    b({
      id: 'c5-c3',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3',
      highlights: [{ square: 'd4', color: SOFT }],
      say:
        "Black hits the base of our chain with c5; we prop d4 up with c3 and develop the knight to f3. Standard Advance so far — Black piles on d4, we hold it. For now.",
      sayShort: "c3 — prop up d4.",
    }),
    b({
      id: 'bd3-gambit',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'h7', color: SOFT }],
      say:
        "Black plays Qb6, hitting d4 a third time. And here's the gambit: Bd3! We simply ignore the d4-pawn and develop the bishop toward h7. We're inviting Black to spend three moves winning a pawn while we build an attack. That's the Milner-Barry — a pawn for a roaring initiative.",
      sayShort: "Bd3 — offer the d4-pawn.",
    }),
    b({
      id: 'castle',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O',
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "Black opens the c-file and develops the bishop; we castle, getting the king safe before the fireworks. The d4-pawn is hanging — and we're happily letting it hang.",
      sayShort: "O-O — king safe, pawn dangling.",
    }),
    b({
      id: 'grab',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4',
      highlights: [{ square: 'd4', color: SOFT }],
      say:
        "Black takes the bait: he wins the d4-pawn, and his queen lands on d4 in the centre. He's a clean pawn up. But look at his position — almost nothing developed, the queen sitting exposed in the middle of the board, the king still in the centre. We've traded a pawn for a massive head start.",
      sayShort: "Qxd4 — Black grabs the pawn.",
    }),
    b({
      id: 'nc3',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3',
      arrows: [{ from: 'c3', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "Nc3 — out comes the last minor piece, eyeing the d5-pawn and the b5-square, and gaining time as Black's loose centre comes under fire. Every move we make develops with purpose; every move Black makes just tries to survive.",
      sayShort: "Nc3 — develop, eye d5 and b5.",
    }),
    b({
      id: 'qe2-kh1',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3 a6 Qe2 Ne7 Kh1',
      highlights: [{ square: 'e2', color: SOFT }, { square: 'h1', color: SOFT }],
      say:
        "Black covers b5 with a6 and develops the knight; we lift the queen to e2, connecting the rooks and eyeing the kingside, then tuck the king on h1. That last move is prophylaxis — getting off the g1-a7 diagonal before we throw the f-pawn forward. The opening hands off here, and the storm plan picks up.",
      sayShort: "Qe2, Kh1 — set up the storm.",
    }),
    b({
      id: 'mg-f4',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3 a6 Qe2 Ne7 Kh1 Rc8 f4',
      arrows: [{ from: 'f4', to: 'f5', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }, { square: 'f5', color: SOFT }],
      say:
        "Black grabs the open c-file; we launch the attack — f4, loading the f5-break. f5 will smash open the f-file and the diagonal toward Black's king, which is still stuck in the centre. We're a pawn down and completely fine with it: the bishop on d3 aims at h7, the queen and rook swing over, and the whole army crashes in.",
      sayShort: "f4 — the storm rolls.",
    }),
    b({
      id: 'mg-summary',
      moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3 a6 Qe2 Ne7 Kh1 Rc8 f4',
      highlights: [{ square: 'h7', color: KEY }, { square: 'f5', color: KEY }],
      say:
        "This is the Milner-Barry in a nutshell. Forget the pawn — count the attackers. The bishop on d3 hits h7, the f-pawn is rolling to f5, the queen is poised to swing to the kingside, and Black's king has no safe home. Your only job from here is to keep adding attackers faster than Black can defend. A pawn is a small price for a game where you're the one playing for mate.",
      sayShort: "the pawn bought the attack.",
    }),
  ],
};
