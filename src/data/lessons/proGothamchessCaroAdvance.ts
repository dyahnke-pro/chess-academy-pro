import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Caro-Kann Advance, WHITE side. Main-line beat
// lesson at G9.3 depth: the opening spine walks to the c4 break (where the
// middlegame plan picks up — Gate C), then continues into the middlegame.
// Student plays WHITE.
//
// Spine (his 423-game / 299-win Advance corpus, the h4-Bg5 main line, most-
// played continuation to the c4 break, then the games-at-terminus middlegame):
//   e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7 c4
//   Nf5 Ne2 dxc4 Nxc4
// Every beat names only pieces actually on the board at that beat (G9.3 accuracy
// gate). Two registers on every beat (say + sayShort).

const VIS = 'rgba(40,185,95,0.92)';   // green vision arrow
const KEY = 'rgba(255,214,0,0.88)';   // yellow key square
const SOFT = 'rgba(80,140,255,0.32)'; // blue context

interface BeatInit {
  id: string; moves: string; say: string; sayShort: string;
  arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const PRO_GOTHAMCHESS_CARO_ADVANCE_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-caro-advance-white',
  title: "This repertoire's Caro-Kann Advance — the h4 Main Line",
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 c6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "We're White against the Caro-Kann — and this repertoire's weapon here is the Advance, the most aggressive try. Black plays c6, the quiet little wedge that prepares d5 with support. He plays this whole structure across 423 of the games and wins 299 of them. Our job is to take the space and never give it back.",
      sayShort: 'c6 — the Caro wedge.',
    }),
    b({
      id: 'center',
      moves: 'e4 c6 d4 d5',
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: KEY }],
      say:
        "d4 grabs the centre with both pawns; Black hits back with d5. Now the tension. We don't trade and we don't defend — we advance.",
      sayShort: 'd4 d5 — the centre clash.',
    }),
    b({
      id: 'advance',
      moves: 'e4 c6 d4 d5 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say:
        "e5 — the Advance. The pawn locks the centre and stakes out a wedge that cramps Black for the whole game. Unlike the French, Black's light-squared bishop is still free to come out — and our entire plan is built around making that bishop's life miserable.",
      sayShort: 'e5 — the Advance, grab space.',
    }),
    b({
      id: 'bf5',
      moves: 'e4 c6 d4 d5 e5 Bf5',
      highlights: [{ square: 'f5', color: SOFT }],
      say:
        "Black develops the bishop outside the chain to f5 — the move that justifies the whole Caro. That bishop is Black's pride. So we're going to hunt it.",
      sayShort: 'Bf5 — Black frees the bishop.',
    }),
    b({
      id: 'h4',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4',
      highlights: [{ square: 'h4', color: KEY }, { square: 'h5', color: SOFT }],
      say:
        "h4 — This repertoire's signature. We grab kingside space and threaten h5, which would slam the door on the f5-bishop's retreat squares. It's the move that gives the modern Advance its bite.",
      sayShort: 'h4 — the signature space grab.',
    }),
    b({
      id: 'h5',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5',
      highlights: [{ square: 'h5', color: KEY }, { square: 'g5', color: SOFT }],
      say:
        "Black stops the pawn with h5. But look what it costs him: the h5-pawn is now a fixed target, and the g5-square is permanently weak. That square is about to become ours.",
      sayShort: 'h5 — but g5 goes weak.',
    }),
    b({
      id: 'bg5',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5',
      highlights: [{ square: 'g5', color: KEY }],
      say:
        "Bg5 — the dark-squared bishop drops onto the weakened square, taking aim at the kingside dark squares and supporting ideas like f4 later. No rush; the bishop just sits there making Black uncomfortable.",
      sayShort: 'Bg5 — seize the weak square.',
    }),
    b({
      id: 'qb6',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6',
      highlights: [{ square: 'b2', color: SOFT }, { square: 'd4', color: SOFT }],
      say:
        "Black swings the queen to b6, the standard Caro counter-pressure — eyeing the b2-pawn and leaning on d4. We're not worried. We finish developing and let the space tell.",
      sayShort: 'Qb6 — Black presses b2 and d4.',
    }),
    b({
      id: 'bd3',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3',
      arrows: [{ from: 'd3', to: 'f5', color: VIS }],
      highlights: [{ square: 'f5', color: KEY }],
      say:
        "Bd3 — and there's the hunt. The bishop challenges Black's prized light-squared bishop head-on. Black almost always trades, which is exactly what we want: it opens lines for our queen and leaves Black a passive piece short.",
      sayShort: 'Bd3 — challenge the f5-bishop.',
    }),
    b({
      id: 'trade',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3',
      highlights: [{ square: 'd3', color: KEY }],
      say:
        "Black takes, we recapture with the queen. Now the queen sits on d3 — centralised, eyeing the h7-square on one diagonal and the queenside on the other. Black's best bishop is gone, and we still have ours on g5.",
      sayShort: 'Qxd3 — the queen centralises.',
    }),
    b({
      id: 'develop',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7',
      highlights: [{ square: 'e6', color: SOFT }, { square: 'e7', color: SOFT }],
      say:
        "Both sides finish the opening: Black props the centre with e6 and brings the knight to e7; we develop the queen's knight to d2, heading for f3 or e2. The structure is set — and it favours us. Bigger space, the e5-wedge, the easier game.",
      sayShort: 'e6, Nd2, Ne7 — structure set.',
    }),
    b({
      id: 'c4-break',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7 c4',
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: KEY }],
      say:
        "And here's the break that defines the middlegame: c4. We strike at Black's d5-pawn while his pieces are still passive, prying the position open exactly where we have the edge. This is where the opening hands off — and the middlegame plan picks up from this very position.",
      sayShort: 'c4 — the central break.',
    }),
    b({
      id: 'mg-reroute',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7 c4 Nf5 Ne2',
      highlights: [{ square: 'f5', color: SOFT }, { square: 'e2', color: KEY }],
      say:
        "Black posts the knight on f5, eyeing d4; we answer Ne2 — the quiet reroute. The knight reinforces d4 and heads for g3 or f4 to prop up the e5-wedge. Patience: the space does the work.",
      sayShort: 'Nf5 / Ne2 — the reroute.',
    }),
    b({
      id: 'mg-middlegame',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7 c4 Nf5 Ne2 dxc4 Nxc4',
      arrows: [{ from: 'c4', to: 'b6', color: VIS }, { from: 'c4', to: 'd6', color: VIS }],
      highlights: [{ square: 'c4', color: KEY }],
      say:
        "Black releases the tension; we recapture, and the knight lands on c4 — a dream square, hitting b6 and d6. Step back and look: we have the e5-wedge, kingside space from h4-h5, the bishop on g5, and the more active pieces. The Advance has done its job. From here it's a clean, pressing middlegame where White holds all the trumps.",
      sayShort: 'Nxc4 — into a better middlegame.',
    }),
  ],
};
