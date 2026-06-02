import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Fantasy Variation vs the Caro-Kann, WHITE side.
// The sharp gambit main line: 3.f3 dxe4 4.fxe4 e5 5.Nf3 exd4 6.Bc4 — White gives
// the d4-pawn for a development lead, the big e4 centre, the half-open f-file and
// a direct attack on f7. Stockfish confirms White is BETTER here (~+1), so the
// narration frames it as a sound, favourable gambit — not a desperate punt.
// Opening reaches a castled middlegame by move 7 (14 plies, O-O), where the
// f7-attack / Ng5 plan picks up (G9.3 Gates A-D). Student plays WHITE.
// Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_FANTASY_CARO_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-fantasy-caro',
  title: "This repertoire's Fantasy Caro — the f3 Gambit and the f7 Attack",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 c6 d4 d5 f3',
      highlights: [{ square: 'f3', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "The Fantasy Variation. Against the Caro-Kann, instead of the usual moves this repertoire plays the surprising f3 — propping up the e4-pawn so the centre can't be chipped away, and getting ready to recapture toward the middle if Black trades. It looks clumsy. It's actually a loaded gun.",
      sayShort: 'f3 — prop up the centre.',
    }),
    b({
      id: 'recapture',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e4', color: KEY }, { square: 'f1', color: SOFT }],
      say:
        "Black takes on e4; we recapture with the f-pawn. Now look at the centre — pawns on d4 and e4, a broad wall — and the f-file has swung open behind our rook. That half-open f-file aimed at f7 is the whole soul of the Fantasy.",
      sayShort: 'fxe4 — open the f-file.',
    }),
    b({
      id: 'e5',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5',
      arrows: [{ from: 'e5', to: 'd4', color: VIS }],
      highlights: [{ square: 'e5', color: SOFT }, { square: 'd4', color: KEY }],
      say:
        "Black strikes back with e5, hitting our d4-pawn and trying to break the centre open before we get organised. The position sharpens in an instant — and this is exactly where this repertoire wants the fight.",
      sayShort: 'e5 — Black hits d4.',
    }),
    b({
      id: 'nf3',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4',
      arrows: [{ from: 'f3', to: 'e5', color: VIS }],
      highlights: [{ square: 'd4', color: SOFT }],
      say:
        "We develop the knight to f3, attacking the e5-pawn. Black answers by grabbing the pawn on d4 instead of defending — and now he's a pawn up. We're going to let him keep it.",
      sayShort: 'Nf3 — develop and pressure e5.',
    }),
    b({
      id: 'bc4',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4',
      arrows: [{ from: 'c4', to: 'f7', color: VIS }],
      highlights: [{ square: 'f7', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "Here's the gambit: Bc4. We don't bother recapturing on d4 — we slam the bishop onto the long light diagonal, aimed straight at f7, the weakest square in Black's whole position. A single pawn, traded for a lead in development and a real target.",
      sayShort: 'Bc4 — the gambit, eye f7.',
    }),
    b({
      id: 'castle',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O',
      highlights: [{ square: 'e4', color: SOFT }, { square: 'g1', color: SOFT }],
      say:
        "Black develops Nf6, attacking our e4-pawn; we simply castle. Yes, e4 is loose — but if Black stops to grab it, his knight wanders off and f7 is even more exposed. King safety first, then the attack.",
      sayShort: 'O-O — king safe, attack next.',
    }),
    b({
      id: 'bc5',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Bc5',
      highlights: [{ square: 'c5', color: SOFT }, { square: 'f7', color: KEY }],
      say:
        "Black develops the bishop to c5 and gets ready to castle. We've reached the middlegame a pawn down — and completely on top. The engine confirms it: White is clearly better here, because the development lead and the pressure on f7 are worth far more than the pawn Black spent three moves collecting.",
      sayShort: 'Bc5 — into a winning gambit.',
    }),
    b({
      id: 'mg-ng5',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Bc5 Ng5',
      arrows: [{ from: 'g5', to: 'f7', color: VIS }],
      highlights: [{ square: 'f7', color: KEY }, { square: 'g5', color: SOFT }],
      say:
        "And the storm breaks: Ng5. The knight leaps in, and now f7 is hit twice — by the knight and by the bishop on c4 — while only Black's king defends it. The pawn Black was so pleased to win has bought him a position where he's fighting for survival from move eight.",
      sayShort: 'Ng5 — pile onto f7.',
    }),
    b({
      id: 'mg-summary',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Bc5 Ng5',
      highlights: [{ square: 'f7', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "That's the Fantasy in one picture. Forget the missing pawn — count the attackers. The bishop on c4 and the knight on g5 both stab at f7, the rook sits on the open f-file behind them, and the king is the only defender. Bring the queen toward h5 or e2, recapture the d4-pawn when it's convenient, and keep adding force. A pawn was the bait; the attack is the catch.",
      sayShort: 'the pawn bought the f7 attack.',
    }),
  ],
};
