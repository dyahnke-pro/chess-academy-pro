import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Scandinavian Defense, BLACK side. The …Qa5
// main line: grab the centre on move one, recapture with the queen, tuck it to
// a5, and develop everything to its best square with gain of tempo — the bishop
// outside the chain on f5, …e6, …c6, …Bb4 leaning on c3, …Nbd7. Black accepts a
// small structural pull (engine ~ −0.5) for the easiest development in chess and
// a clear queenside plan against White's long-castled king (18 plies, G9.3
// Gates A-D). Student = BLACK. Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_SCANDINAVIAN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-scandinavian',
  title: "GothamChess's Scandinavian — Qa5 and Effortless Development",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Scandinavian-Defense',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Scandinavian_Defense',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 d5 exd5 Qxd5',
      arrows: [{ from: 'd8', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "The Scandinavian — e4 d5, challenging the centre on move one. After White takes, we recapture with the queen, Qxd5. Yes, the queen comes out early; the old rule says don't. But Levy loves this because everything Black plays from here is natural, forcing, and easy to remember.",
      sayShort: 'Qxd5 — grab the centre back.',
    }),
    b({
      id: 'qa5',
      moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5',
      arrows: [{ from: 'd5', to: 'a5', color: VIS }],
      highlights: [{ square: 'a5', color: KEY }, { square: 'c3', color: SOFT }],
      say:
        "White develops Nc3 with tempo, hitting our queen; we glide back to a5. And look — the queen isn't just running, it's working: from a5 it eyes the knight on c3 and the open a5-e1 diagonal. White gained a developing move; we gained a perfectly placed queen.",
      sayShort: 'Qa5 — retreat with purpose.',
    }),
    b({
      id: 'd4-nf6',
      moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6',
      highlights: [{ square: 'f6', color: SOFT }],
      say:
        "White takes the big centre with d4; we develop the knight to f6, hitting nothing yet but getting ready to castle and to pile pressure on the centre. Simple, sound, no thinking required.",
      sayShort: 'Nf6 — develop toward castling.',
    }),
    b({
      id: 'bf5',
      moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5',
      arrows: [{ from: 'c8', to: 'f5', color: VIS }],
      highlights: [{ square: 'f5', color: KEY }],
      say:
        "White develops Nf3; we play the key move, Bf5 — the light-squared bishop comes out of the chain BEFORE we play e6. Same golden rule as the Caro: never let this bishop get trapped behind its own pawns. Out it goes, active and free.",
      sayShort: 'Bf5 — bishop out first.',
    }),
    b({
      id: 'bc4-e6',
      moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6',
      highlights: [{ square: 'e6', color: KEY }],
      say:
        "White develops the bishop to c4, aiming at f7; we play e6, shoring up the light squares and opening the way for our dark-squared bishop. With the f5-bishop already developed, e6 costs us nothing — there's no bad piece left to bury.",
      sayShort: 'e6 — solid, no bad bishop.',
    }),
    b({
      id: 'bd2-c6',
      moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6',
      highlights: [{ square: 'c6', color: SOFT }, { square: 'a5', color: SOFT }],
      say:
        "White develops the bishop to d2, breaking the pressure on c3 and preparing to castle long; we play c6, a useful little move that gives our queen the c7-square if it's ever kicked and prepares a future b5 pawn push.",
      sayShort: 'c6 — support the queenside plan.',
    }),
    b({
      id: 'qe2-bb4',
      moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6 Qe2 Bb4',
      arrows: [{ from: 'b4', to: 'c3', color: VIS }],
      highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: SOFT }],
      say:
        "White lifts the queen to e2; we develop the dark-squared bishop to b4, leaning hard on the c3-knight. The threat is real: take on c3 and shatter White's queenside pawns. Every piece we develop also makes a threat — that's the Scandinavian's hidden efficiency.",
      sayShort: 'Bb4 — lean on c3.',
    }),
    b({
      id: 'mg-castle',
      moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6 Qe2 Bb4 O-O-O Nbd7',
      arrows: [{ from: 'b7', to: 'b5', color: VIS }],
      highlights: [{ square: 'c1', color: SOFT }, { square: 'b5', color: KEY }],
      say:
        "White castles queenside; we complete development with Nbd7. There's the whole plan in one snapshot: White's king is on the queenside, our queen and bishop already point straight at it, and our pawns are loaded to roll — b5, b4, prying the king open. We're slightly worse on paper, but we're the side with the easy moves and the attack. That's the Scandinavian: trade a sliver of structure for clarity and initiative.",
      sayShort: '…b5/…b4 — open the king.',
    }),
  ],
};
