import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Queen's Gambit Declined, BLACK side. The modern
// 5.Bf4 main line: decline the gambit with …e6, develop solidly, castle, then hit
// the centre with the thematic …c5 freeing break, recapture actively with the
// bishop, and reach a comfortable, equal middlegame with the queen pinning c3
// (20 plies, Black castled; engine ~level, G9.3 Gates A-D). Student = BLACK.
// Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_QGD_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-qgd',
  title: "GothamChess's Queen's Gambit Declined — the …c5 Freeing Break",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Queens-Gambit-Declined',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'd4 d5 c4 e6',
      highlights: [{ square: 'e6', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "The Queen's Gambit Declined. White offers the c4-pawn; we simply decline it with e6, propping up our d5-pawn with a rock. White isn't really giving anything away — and we're not interested in grabbing. We want a solid, fight-from-a-fortress position, and the QGD is the most respected way to get one.",
      sayShort: 'e6 — decline, stay solid.',
    }),
    b({
      id: 'develop',
      moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7',
      highlights: [{ square: 'e7', color: SOFT }],
      say:
        "Both sides develop naturally — knights out, and our dark-squared bishop to e7, a modest but flexible square. Nothing fancy, nothing loose. The QGD is about getting every piece to a sensible home and refusing to create a single weakness.",
      sayShort: 'Be7 — quiet, flexible development.',
    }),
    b({
      id: 'bf4-castle',
      moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O',
      highlights: [{ square: 'g8', color: SOFT }],
      say:
        "White develops the bishop to f4 — the modern main line, keeping it outside the pawn chain. We castle, getting the king safe. So far it's a textbook QGD: White has a space edge, we have a fortress and a plan to chip away at the centre.",
      sayShort: 'O-O — king to safety.',
    }),
    b({
      id: 'c5',
      moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5',
      arrows: [{ from: 'c7', to: 'c5', color: VIS }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "White solidifies with e3; we strike with the move that defines this whole opening — c5! This is the QGD's freeing break, hitting White's d4-pawn and finally giving our pieces room to breathe. Without …c5, Black just sits cramped; WITH it, the position opens on our terms.",
      sayShort: 'c5 — the freeing break.',
    }),
    b({
      id: 'bxc5',
      moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5',
      arrows: [{ from: 'e7', to: 'c5', color: VIS }],
      highlights: [{ square: 'c5', color: KEY }],
      say:
        "White takes on c5; we recapture with the bishop. Look how that piece transformed — a minute ago it sat passively on e7, now it rakes the a7-g1 diagonal toward White's king. The break didn't just free us, it activated our worst piece.",
      sayShort: 'Bxc5 — the bishop springs to life.',
    }),
    b({
      id: 'qc2-nc6',
      moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5 Qc2 Nc6',
      highlights: [{ square: 'c6', color: SOFT }],
      say:
        "White lifts the queen to c2; we develop the last knight to c6, finishing our development and adding a defender to our centre. Every piece is now in the game — and unlike a lot of Black openings, we got here without a single awkward move.",
      sayShort: 'Nc6 — complete development.',
    }),
    b({
      id: 'qa5',
      moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5 Qc2 Nc6 a3 Qa5',
      arrows: [{ from: 'a5', to: 'c3', color: VIS }],
      highlights: [{ square: 'a5', color: KEY }, { square: 'c3', color: SOFT }],
      say:
        "White plays a3, making room for his pieces; we swing the queen to a5 — and because White's king is still stuck on e1, this PINS the c3-knight to the king down the diagonal. The knight is frozen, and White suddenly has to spend moves untangling.",
      sayShort: 'Qa5 — pin the c3-knight.',
    }),
    b({
      id: 'mg-be7',
      moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5 Qc2 Nc6 a3 Qa5 Rd1 Be7',
      arrows: [{ from: 'f8', to: 'd8', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "White centralises a rook on d1; we tuck the bishop back to e7, sidestepping any b4 tricks and keeping our flexible setup. Here's the middlegame: fully developed, king safe, no weaknesses, the queen active and the c3-knight pinned. From here we double on the d-file, eye the d4-square for a knight, and prepare …e5. Dead equal, totally comfortable — the QGD did its job. You're never worse, and you're always solid.",
      sayShort: 'rooks to d-file, …e5 next.',
    }),
  ],
};
