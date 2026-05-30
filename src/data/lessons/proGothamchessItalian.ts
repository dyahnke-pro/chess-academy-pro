import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Italian Game, WHITE side. The classical
// Giuoco Piano c3-d4 main line, which carries through the opening straight into
// an Isolated-Queen-Pawn middlegame (both sides castled by move 10) — so the
// Watch reaches a real middlegame on the opening spine itself (G9.3 Gate B).
// Student plays WHITE. Spine = the entry's main line (DB/theory-anchored,
// classical Italian in the book corpus). Every beat is board-accurate.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_ITALIAN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-italian',
  title: "GothamChess's Italian — the c3-d4 Giuoco into the IQP",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Italian-Game-Giuoco-Piano',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Italian_Game',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nf3 Nc6',
      highlights: [{ square: 'e5', color: SOFT }],
      say:
        "The Italian — Levy's classical answer to 1.e4 e5. We develop the knight to f3, hitting e5, and Black defends with Nc6. Old, principled chess: pieces out fast, aim everything at f7.",
      sayShort: 'Nf3 Nc6 — the open game.',
    }),
    b({
      id: 'bishops',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
      arrows: [{ from: 'c4', to: 'f7', color: VIS }],
      highlights: [{ square: 'f7', color: KEY }, { square: 'f2', color: SOFT }],
      say:
        "Bc4 — the Italian bishop, pointed straight at f7, the soft spot in Black's camp. Black mirrors with Bc5, eyeing our f2. Symmetrical and sharp; whoever breaks the centre first sets the terms.",
      sayShort: 'Bc4 — aim at f7.',
    }),
    b({
      id: 'c3',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6',
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "c3 — quiet, but loaded. It builds a pawn-duo idea: next move we want d4, hitting the centre with full force. Black develops the knight to f6, eyeing our e4-pawn.",
      sayShort: 'c3 — preparing d4.',
    }),
    b({
      id: 'd4',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "d4 — the break. We strike the centre while Black's pieces are committed. This is the whole reason we played c3. Open the position when you're the better-developed side.",
      sayShort: 'd4 — the central break.',
    }),
    b({
      id: 'open-center',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4',
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "Black takes, we recapture with the c-pawn. Now we have the big d4-pawn and a powerful centre, with the bishop on c4 and the knight on f3 already trained on Black's king.",
      sayShort: 'cxd4 — the big centre.',
    }),
    b({
      id: 'check-trade',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2',
      highlights: [{ square: 'd2', color: SOFT }],
      say:
        "Black checks with Bb4 and trades the dark bishops on d2; we recapture with the queen's knight, bringing it into the game on d2 — heading for b3 or f3. The trade hasn't helped Black; we're still the more active side.",
      sayShort: 'Nbxd2 — develop through the trade.',
    }),
    b({
      id: 'd5',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "Black strikes back with d5, the freeing break — challenging our centre and our bishop at the same time. The right answer is to take, accepting an isolated d-pawn in return for fast, active piece play.",
      sayShort: 'd5 — Black breaks back.',
    }),
    b({
      id: 'exd5',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5',
      arrows: [{ from: 'c4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "exd5, and Black recaptures with the knight on d5. Now the bishop on c4 bears straight down on that knight, pinning it to the heart of Black's position. We have the isolated d4-pawn, but in return: open lines, the bishop pair gone but the more active army, and a target on Black's king.",
      sayShort: 'exd5 — the IQP arises.',
    }),
    b({
      id: 'castle',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O',
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Both kings tuck away and we've reached the middlegame — the classic Isolated-Queen-Pawn position. This is the heart of the lesson. The d4-pawn looks weak, but it's a spearhead: it controls c5 and e5, the perfect outposts, and it can lunge to d5 at the right moment to blow the position open. White plays for the attack; Black plays to blockade and trade.",
      sayShort: 'O-O O-O — the IQP middlegame.',
    }),
    b({
      id: 'mg-plan',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O',
      arrows: [{ from: 'f3', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'c5', color: KEY }],
      say:
        "Here's the plan from this position. Bring a knight to e5 — the dream outpost the d4-pawn guards. Put a rook on e1 down the open file. Line the queen up toward the kingside. And keep the d5-break in your pocket: the moment Black's pieces drift, d4-d5 cracks the centre and the attack writes itself. The isolated pawn isn't a weakness — it's the engine of the whole middlegame.",
      sayShort: 'Ne5 outpost, Re1, the d5 break.',
    }),
  ],
};
