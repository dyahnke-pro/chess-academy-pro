import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Pirc Defense, BLACK side. The hypermodern plan:
// hand White the big pawn centre, fianchetto the bishop to g7, and then tear the
// centre down with the …c5 counter-strike against the Austrian Attack (f4). After
// e5, the knight reroutes to d7 to undermine the overextended pawns. A dynamic,
// fully balanced middlegame (14 plies; engine ~level, G9.3 Gates A-D). Student =
// BLACK. Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_PIRC_DEFENSE_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-pirc-defense',
  title: "GothamChess's Pirc — Let Them Build It, Then Knock It Down",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: [
    'book:chess-strategy',
    'https://www.chess.com/openings/Pirc-Defense',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Pirc_Defence',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 d6 d4 Nf6 Nc3 g6',
      arrows: [{ from: 'f8', to: 'a3', color: SOFT }],
      highlights: [{ square: 'g6', color: KEY }],
      say:
        "The Pirc — e4 d6 and …Nf6, …g6. This is hypermodern chess: we INVITE White to build a giant pawn centre, because a big centre is also a big target. We fianchetto the bishop to g7, aim it down the long diagonal, and prepare to chip the whole thing down.",
      sayShort: 'g6 — invite the big centre.',
    }),
    b({
      id: 'austrian',
      moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7',
      highlights: [{ square: 'e4', color: SOFT }, { square: 'd4', color: SOFT }, { square: 'f4', color: SOFT }],
      say:
        "White goes all in with f4 — the Austrian Attack, the most aggressive try, grabbing a huge e4-d4-f4 pawn wall. We calmly complete the fianchetto with Bg7. Let White have the space; the bigger that centre gets, the harder it falls when we hit it.",
      sayShort: 'Bg7 — aim at the centre.',
    }),
    b({
      id: 'c5',
      moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5',
      arrows: [{ from: 'c7', to: 'c5', color: VIS }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "White develops Nf3; we strike — c5! Straight at the base of the centre, the d4-pawn. This is the modern, critical answer to the Austrian: don't sit and get squashed, hit back instantly. The big wall is suddenly under real pressure.",
      sayShort: 'c5 — hit the d4-base.',
    }),
    b({
      id: 'bb5-nc6',
      moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Nc6',
      highlights: [{ square: 'c6', color: SOFT }],
      say:
        "White throws in Bb5-check to disrupt us; we block naturally with Nc6, developing a piece AND adding a second attacker to d4. The check looks annoying but it just helps us bring a knight to a great square. We're developing with threats.",
      sayShort: 'Nc6 — block and pile on d4.',
    }),
    b({
      id: 'mg-e5',
      moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Nc6 e5 Nd7',
      arrows: [{ from: 'd7', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "White lunges e5, trying to chase our knight and use his space; we slide the knight back to d7 — where it actually attacks the e5-pawn and eyes the c5- and b6-squares. Here's the middlegame: White's pawns look huge but they're overextended, and we're swarming them. The plan is …cxd4 and …dxe5, prying the centre apart so our g7-bishop roars down the long diagonal. The engine calls it dead level, and that's the Pirc's promise — give White the centre, then dismantle it and outplay him in the chaos.",
      sayShort: '…cxd4/…dxe5 — tear it down.',
    }),
  ],
};
