import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — French Defense, BLACK side. The sharp Rubinstein
// with …gxf6: trade in the centre, recapture with the g-pawn, and deliberately
// take doubled f-pawns in exchange for a broad …e5 centre, the bishop on g4
// pinning f3, and a thundering open g-file aimed at White's kingside. A dynamic,
// double-edged middlegame (16 plies; engine ~ −0.4, fully playable, G9.3 Gates
// A-D). Student = BLACK. Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_FRENCH_DEFENSE_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-french-defense',
  title: "This repertoire's French — the Rubinstein …gxf6 Powerhouse",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/French-Defense-Rubinstein-Variation',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/French_Defence',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4',
      arrows: [{ from: 'd5', to: 'e4', color: VIS }],
      highlights: [{ square: 'e4', color: SOFT }],
      say:
        "The French — e4 e6, then …d5. Against the main Nc3 we play the Rubinstein: dxe4, trading off the centre right away. Some say it's passive. This repertoire plays it as a coiled spring — we're about to take on a striking pawn structure that most opponents have no idea how to meet.",
      sayShort: 'dxe4 — the Rubinstein trade.',
    }),
    b({
      id: 'gxf6',
      moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6',
      arrows: [{ from: 'g7', to: 'f6', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'g8', color: SOFT }],
      say:
        "We challenge the e4-knight with Nf6, and after it takes, here's the bold choice: recapture with the g-pawn. Yes, our f-pawns are doubled now. But look what we got — a half-open g-file pointing at White's kingside, and a pawn on f6 ready to support a big centre. This isn't a weakness; it's a weapon.",
      sayShort: 'gxf6 — open the g-file.',
    }),
    b({
      id: 'nf3-nc6',
      moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6',
      highlights: [{ square: 'c6', color: SOFT }, { square: 'd4', color: SOFT }],
      say:
        "White develops the knight to f3; we bring ours to c6, pressuring White's d4-pawn and preparing the central break that justifies our whole structure. Every Black piece is going to point at the centre.",
      sayShort: 'Nc6 — pressure d4.',
    }),
    b({
      id: 'e5',
      moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5',
      arrows: [{ from: 'e6', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
      say:
        "White fianchettoes with g3; we strike with e5! And now those 'ugly' doubled pawns pay off: the f6-pawn rock-solidly supports e5, so we get a broad, strong centre. Black is rarely this active in the French — that's the point of the …gxf6 line.",
      sayShort: 'e5 — the doubled pawn pays off.',
    }),
    b({
      id: 'mg-bg4',
      moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 Bg2 Bg4',
      arrows: [{ from: 'g4', to: 'f3', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: SOFT }],
      say:
        "White completes the fianchetto; we develop with Bg4, pinning the f3-knight to the queen. Here's our middlegame: a powerful centre, both bishops aimed at White's position, and the open g-file ready for a rook to come crashing down once we tuck our king away on the queenside. We're a touch worse on the engine's cold count — but this is rich, double-edged, attacking chess, and the player who understands the structure outplays the one who memorised a line. That's exactly the fight this repertoire wants from the French.",
      sayShort: 'Bg4 — pin f3, rooks to the g-file.',
    }),
  ],
};
