import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Trompowsky Attack, WHITE side. The main line
// vs …e6: the Bg5/Bh4 pin, then the trade on f6 to clear the way for the f4-f5
// kingside storm. Opening reaches a castled middlegame by move 7 (O-O), where
// the bishoppair plan picks up (Gate C); the lesson plays it deep (Gate B).
// Student plays WHITE. Board-accurate — note we do NOT claim the bishop pair
// (the f6 trade gives BLACK two bishops; White's compensation is the storm).

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_TROMPOWSKY_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-trompowsky',
  title: "This repertoire's Trompowsky — vs …e6 and the f4 Storm",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:queens-gambit',
    'https://www.chess.com/openings/Trompowsky-Attack',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Trompowsky_Attack',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'd4 Nf6 Bg5',
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }],
      say:
        "The Trompowsky — d4 Nf6 Bg5. Out comes the bishop on move two, straight at the f6-knight. This is this repertoire's anti-everything weapon: we sidestep all of Black's prepared Indian defences and make him solve fresh problems from move two.",
      sayShort: 'Bg5 — straight at the knight.',
    }),
    b({
      id: 'e6-nd2',
      moves: 'd4 Nf6 Bg5 e6 Nd2',
      say:
        "Black plays the solid e6, keeping things flexible; we develop the knight to d2, supporting an eventual e4 and keeping our structure compact. No hurry — the bishop on g5 is already doing its job.",
      sayShort: 'e6, Nd2 — the solid setup.',
    }),
    b({
      id: 'h6-bh4',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4',
      arrows: [{ from: 'h4', to: 'd8', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'd8', color: SOFT }],
      say:
        "Black puts the question with h6; we keep the bishop alive on h4. And now there's a real pin: with e6 played, the e7-square is empty, so the bishop on h4 pins the f6-knight straight to the queen on d8 down the long diagonal. The knight is glued in place.",
      sayShort: 'Bh4 — now it pins to the queen.',
    }),
    b({
      id: 'd5-e3',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7',
      say:
        "Black builds the centre with d5 and breaks the pin by developing the bishop to e7; we play the modest e3, solidifying d4 and opening the light-squared bishop. Classic Trompowsky: small, solid moves, no weaknesses.",
      sayShort: 'd5, e3, Be7 — the centre sets.',
    }),
    b({
      id: 'bd3-c3',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'h7', color: SOFT }],
      say:
        "Bd3 trains the light-squared bishop toward h7, c3 buttresses d4, and Black fianchettoes with b6 and castles. We've reached the middlegame — and now the plan begins. This position is exactly where the middlegame plan takes over.",
      sayShort: 'Bd3, c3, O-O — into the middlegame.',
    }),
    b({
      id: 'mg-bxf6',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O Bxf6 Bxf6',
      highlights: [{ square: 'f6', color: KEY }],
      say:
        "Here's the key decision: Bxf6. We give up our dark-squared bishop for the knight. In return, the recapturing bishop on f6 is going to become a target — because the f-pawn is about to roll right at it. We're not playing for the bishop pair; we're playing for the storm.",
      sayShort: 'Bxf6 — clear the way for f4.',
    }),
    b({
      id: 'mg-f4',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O Bxf6 Bxf6 f4',
      arrows: [{ from: 'f4', to: 'f5', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }, { square: 'f5', color: SOFT }],
      say:
        "f4 — and there's the point. We grab kingside space and load up the f5-push, which will hit e6 and pry open lines toward Black's king. The bishop sitting on f6 has nowhere good to go. This is the Trompowsky's hidden teeth: a quiet system that becomes a pawn-storm attack.",
      sayShort: 'f4 — the kingside storm begins.',
    }),
    b({
      id: 'mg-qe2',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O Bxf6 Bxf6 f4 Ba6 Qe2',
      arrows: [{ from: 'e2', to: 'a6', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }],
      say:
        "Black tries to trade his bad light-squared bishop with Ba6; we line up the queen on e2, defending the bishop on d3 and keeping it on the board. Why? Because that bishop is an attacker — pointed at h7 — and we're not handing it off when we're the one going for the king.",
      sayShort: 'Qe2 — keep the attacking bishop.',
    }),
    b({
      id: 'mg-summary',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O Bxf6 Bxf6 f4 Ba6 Qe2 Bxd3 Qxd3',
      highlights: [{ square: 'f5', color: KEY }, { square: 'd3', color: KEY }],
      say:
        "If Black trades anyway, we recapture and the queen lands on d3 — centralised, eyeing h7 and the kingside. Step back: we have the f4-f5 pawn roller, kingside space, the queen aimed at the king, and a clear plan. The Trompowsky started as the quietest move on the board and turned into a direct attack. That's the whole idea.",
      sayShort: 'Qxd3 — the storm is set.',
    }),
  ],
};
