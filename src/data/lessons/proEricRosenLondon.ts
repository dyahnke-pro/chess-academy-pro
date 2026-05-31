import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — London System (White). His most-played opening by a mile
// (5,163 games in his chess.com corpus, 62%): d4 + Bf4, the same solid setup
// against everything. The main spine is his line vs a King's-Indian/…g6 setup —
// Bf4, e3, Nf3, Be2, the Ne5 outpost, then expansion. Two registers per beat
// (G5/G9.4): full Watch `say` + ≤8-word `sayShort`, no move-number prefixes in
// spoken text. Green vision arrows only (never from a pawn); orange move-squares
// auto-painted.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'concept:pos-development',
  'concept:pos-outpost',
  'concept:att-kingside-storm',
  'https://www.chess.com/openings/London-System',
  'https://api.chess.com/pub/player/imrosen/games/archives',
];

export const PRO_ERICROSEN_LONDON_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-london',
  title: "Rosen's London System — the Bf4 setup",
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'bf4', moves: 'd4 Nf6 Bf4',
      arrows: [A('f4', 'b8')],
      highlights: [{ square: 'f4', color: KEY }, { square: 'd4', color: SOFT }],
      say: "The London System. We play d4 and develop the dark-squared bishop OUT to f4 before locking it in with e3 — that one move is the whole point. The bishop eyes the b8-h2 diagonal and the c7/e5 squares, and we will build the same harmonious setup no matter what Black does. It is the opening Rosen reaches for more than any other.",
      sayShort: 'Bf4 — bishop out before e3.',
    }),
    b({
      id: 'g6', moves: 'd4 Nf6 Bf4 g6 Nc3 d5',
      arrows: [A('f8', 'g7')],
      highlights: [{ square: 'g6', color: KEY }, { square: 'd5', color: KEY }],
      say: "Black fianchettoes with g6, heading for a King's-Indian setup, and stakes a claim in the centre with d5. We develop the knight to c3, pressuring d5 and keeping our options open between a quiet game and a kingside pawn storm.",
      sayShort: '…g6, …d5 — Black goes KID.',
    }),
    b({
      id: 'e3', moves: 'd4 Nf6 Bf4 g6 Nc3 d5 e3 Bg7',
      highlights: [{ square: 'e3', color: KEY }, { square: 'g7', color: SOFT }],
      say: "e3 locks the pawn chain and gives the f4-bishop its retreat square. The structure is now set in stone: pawns on d4 and e3, bishop on f4, and the light-squared bishop and knights still to come. Black completes the fianchetto with Bg7.",
      sayShort: 'e3 — lock the chain.',
    }),
    b({
      id: 'develop', moves: 'd4 Nf6 Bf4 g6 Nc3 d5 e3 Bg7 Nf3 O-O Be2 c5',
      arrows: [],
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: KEY }],
      say: "We finish developing with Nf3 and Be2 and castle is met. Black strikes at our centre with c5 — the standard break against the London. We do not have to release the tension; instead we are about to plant a knight on the square the whole system is built around.",
      sayShort: 'Nf3, Be2 — Black hits with …c5.',
    }),
    b({
      id: 'ne5', moves: 'd4 Nf6 Bf4 g6 Nc3 d5 e3 Bg7 Nf3 O-O Be2 c5 Ne5',
      arrows: [A('e5', 'c6'), A('e5', 'g6')],
      highlights: [{ square: 'e5', color: KEY }],
      say: "Ne5 — the London knight's dream square. From e5 it stares at f7, c6 and g6, it cannot be chased by a pawn, and it backs up every kingside attacking idea we have. Memorise this leap: in the London, the knight belongs on e5.",
      sayShort: 'Ne5 — the outpost knight.',
    }),
    b({
      id: 'castle', moves: 'd4 Nf6 Bf4 g6 Nc3 d5 e3 Bg7 Nf3 O-O Be2 c5 Ne5 Nc6 O-O',
      arrows: [A('f4', 'b8')],
      highlights: [{ square: 'g1', color: SOFT }, { square: 'e5', color: KEY }],
      say: "Black challenges the knight with Nc6 and we tuck the king away with castling. The position is exactly what the London wants: a rock-solid centre, the bishop raking the long dark diagonal, the e5-knight dug in, and a clear plan to come.",
      sayShort: 'O-O — solid, knight dug in.',
    }),
    b({
      id: 'plan', moves: 'd4 Nf6 Bf4 g6 Nc3 d5 e3 Bg7 Nf3 O-O Be2 c5 Ne5 Nc6 O-O',
      arrows: [A('e2', 'd3'), A('d1', 'f3')],
      highlights: [{ square: 'f7', color: KEY }, { square: 'h7', color: SOFT }],
      say: "From here the plan writes itself: reroute the bishop to d3 to aim at h7, bring the queen toward the kingside, and use the e5-knight as the spearhead of an attack on Black's king. When Black is solid we just keep our edge; when Black weakens, we strike at f7 and h7. This is Rosen's bread and butter.",
      sayShort: 'Plan: Bd3, queen up, attack h7.',
    }),
  ],
};
