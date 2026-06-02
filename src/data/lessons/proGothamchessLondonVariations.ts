import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — London System, PER-VARIATION Watch lessons.
// Each variation walks its deep repertoire spine to a middlegame with board-
// accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/London-System',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Standard Setup vs …d5 — the h-file plan + e4 break ──
const STANDARD: LessonScript = {
  openingId: 'pro-gothamchess-london',
  title: 'London — Standard Setup vs …d5',
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6',
      arrows: [{ from: 'c1', to: 'f4', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }],
      say:
        "The London System — and the star is the bishop on f4, developed OUTSIDE the pawn chain before we play e3. That's the whole idea: never bury this bishop. We set up the same solid structure against almost anything, here against Black's …d5 and …c5.",
      sayShort: 'Bf4 — the London bishop out.',
    }),
    b({
      id: 'bg3',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3',
      arrows: [{ from: 'f4', to: 'g3', color: VIS }],
      highlights: [{ square: 'g3', color: KEY }],
      say:
        "Black tries to trade off our prized bishop with Bd6; we sidestep to g3, keeping it alive and still pointing at Black's kingside. c3 props up our centre. Patience — we don't give up the good bishop for free.",
      sayShort: 'Bg3 — preserve the bishop.',
    }),
    b({
      id: 'hxg3',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6 O-O Bb7 Qe2 Bxg3 hxg3',
      arrows: [{ from: 'h2', to: 'g3', color: VIS }],
      highlights: [{ square: 'h1', color: KEY }],
      say:
        "After more development, Black finally trades on g3; we recapture with the h-pawn — and this is the key London idea. hxg3 opens the h-file for our rook, points it straight at Black's king, and the doubled g-pawns actually reinforce our control of f4 and the centre. A 'damaged' structure that's pure attacking fuel.",
      sayShort: 'hxg3 — open the h-file.',
    }),
    b({
      id: 'e4',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6 O-O Bb7 Qe2 Bxg3 hxg3 Qc7 dxc5 bxc5 e4',
      arrows: [{ from: 'e3', to: 'e4', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "We trade on c5 to give Black hanging pawns on c5 and d5, then strike the centre with e4. Now Black has two pawns to babysit and an open position against our better-placed pieces. The quiet London has turned into a real initiative.",
      sayShort: 'e4 — hit the hanging pawns.',
    }),
    b({
      id: 'mg-summary',
      moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6 O-O Bb7 Qe2 Bxg3 hxg3 Qc7 dxc5 bxc5 e4 h6 Rad1 Rfe8',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'h7', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Here's the middlegame. We have the half-open h-file aimed at the king, the bishop on d3 trained on h7, central pressure on Black's hanging c5- and d5-pawns, and rooks swinging to the open files. The plan is simple and brutal: build on the kingside while Black's loose pawns tie his pieces down. This is why this repertoire's London is a winning machine, not a drawing one.",
      sayShort: 'h-file + Bd3 — attack the king.',
    }),
  ],
};

// ── vs King's Indian — the Bh6 trade + opposite-side castle attack ──
const VS_KID: LessonScript = {
  openingId: 'pro-gothamchess-london',
  title: 'London — vs King\'s Indian (Bh6 + O-O-O Attack)',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'd4 Nf6 Bf4 g6 Nc3 Bg7 Qd2',
      arrows: [{ from: 'd1', to: 'd2', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'd2', color: SOFT }],
      say:
        "Against a King's-Indian fianchetto, this repertoire DROPS the quiet London and goes for blood. Nc3 and Qd2 — not e3 and Be2. The queen on d2 lines up with the bishop, and the whole battery is pointed at one square: h6. We're hunting Black's most important piece.",
      sayShort: 'Qd2 — load the h6 battery.',
    }),
    b({
      id: 'bh6',
      moves: 'd4 Nf6 Bf4 g6 Nc3 Bg7 Qd2 O-O Bh6',
      arrows: [{ from: 'f4', to: 'h6', color: VIS }],
      highlights: [{ square: 'h6', color: KEY }, { square: 'g7', color: SOFT }],
      say:
        "Black castles; we play Bh6! — offering to trade off the fianchettoed bishop on g7. That bishop is the HEART of every King's-Indian: it guards the dark squares around the king and rakes the long diagonal. Trade it, and Black's kingside is full of holes forever.",
      sayShort: 'Bh6 — trade the KID bishop.',
    }),
    b({
      id: 'qxh6',
      moves: 'd4 Nf6 Bf4 g6 Nc3 Bg7 Qd2 O-O Bh6 Bxh6 Qxh6',
      arrows: [{ from: 'd2', to: 'h6', color: VIS }],
      highlights: [{ square: 'h6', color: KEY }, { square: 'g7', color: SOFT }],
      say:
        "Black takes, and our queen lands on h6 — right on the doorstep of his king. The dark squares around g7 are now permanently weak with no bishop to guard them. We've achieved the dream: queen near the king, defender removed, all before the middlegame even starts.",
      sayShort: 'Qxh6 — queen at the king\'s door.',
    }),
    b({
      id: 'mg-castle',
      moves: 'd4 Nf6 Bf4 g6 Nc3 Bg7 Qd2 O-O Bh6 Bxh6 Qxh6 c5 O-O-O',
      arrows: [{ from: 'h2', to: 'h4', color: VIS }],
      highlights: [{ square: 'c1', color: SOFT }, { square: 'h4', color: KEY }],
      say:
        "Black hits back in the centre with c5; we castle LONG. And there it is — opposite-side castling, which means a pure pawn-storm race. Our king is safe on the queenside while we throw h4-h5 and g4 at Black's weakened kingside. With the g7-bishop already gone, our attack is faster and deadlier. This is the London nobody warns you about.",
      sayShort: 'O-O-O — storm with h4-h5.',
    }),
  ],
};

// ── Jobava-London Hybrid — Nc3 + the Na4-c5 maneuver ──
const JOBAVA: LessonScript = {
  openingId: 'pro-gothamchess-london',
  title: 'London — Aggressive Jobava Hybrid',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'd4 d5 Nc3 Nf6 Bf4 e6 e3 c5',
      arrows: [{ from: 'b1', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'f4', color: SOFT }],
      say:
        "The Jobava twist: we develop the knight to c3 instead of the sleepy d2-square, blending London structure with sharper ideas. The bishop still comes to f4, but now the knight is more active and ready to jump into Black's position.",
      sayShort: 'Nc3 — the aggressive knight.',
    }),
    b({
      id: 'trade',
      moves: 'd4 d5 Nc3 Nf6 Bf4 e6 e3 c5 Nf3 a6 Be2 Nc6 O-O Bd6 Bxd6 Qxd6',
      arrows: [{ from: 'f4', to: 'd6', color: VIS }],
      highlights: [{ square: 'd6', color: SOFT }],
      say:
        "Both sides develop and castle. When Black challenges with Bd6, here we DO trade — Bxd6, pulling Black's queen to d6 where it'll soon be a target. The point isn't to hoard the bishop this time; it's to gain time on the queen with our next move.",
      sayShort: 'Bxd6 — drag the queen out.',
    }),
    b({
      id: 'na4',
      moves: 'd4 d5 Nc3 Nf6 Bf4 e6 e3 c5 Nf3 a6 Be2 Nc6 O-O Bd6 Bxd6 Qxd6 Na4',
      arrows: [{ from: 'c3', to: 'a4', color: VIS }],
      highlights: [{ square: 'a4', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "Na4 — the kicker. The knight swings to the rim, but it's heading for the beautiful c5-outpost and pressuring Black's c5-pawn right now. Suddenly Black has to worry about his queenside while his queen sits awkwardly on d6. The 'boring' London is breathing fire.",
      sayShort: 'Na4 — head for the c5-outpost.',
    }),
    b({
      id: 'mg-summary',
      moves: 'd4 d5 Nc3 Nf6 Bf4 e6 e3 c5 Nf3 a6 Be2 Nc6 O-O Bd6 Bxd6 Qxd6 Na4 cxd4 exd4 O-O',
      arrows: [{ from: 'a4', to: 'c5', color: VIS }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "Black trades on d4 and castles; we recapture and reach the middlegame with central space and a knight bound for c5. The plan: plant the knight on the c5-outpost where it can't be kicked by a pawn, use the d4-pawn for space, and pressure Black's slightly loose queenside. It's a small, comfortable pull from a system that takes ten seconds to set up. That's this repertoire's value bet.",
      sayShort: 'Nc5 outpost + central space.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_LONDON_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-london::Standard Setup vs d5': STANDARD,
  'pro-gothamchess-london::vs King\'s Indian (Bh6 + Opposite-Side Castle Attack)': VS_KID,
  'pro-gothamchess-london::Aggressive Jobava-London Hybrid': JOBAVA,
};
