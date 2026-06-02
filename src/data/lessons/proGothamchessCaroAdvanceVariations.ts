import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Caro-Advance, PER-VARIATION Watch lessons.
// Each variation walks its deep repertoire spine to a middlegame with board-
// accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:caro-kann',
  'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Main line vs …Bf5 — 423 games at 73.2%, the h4 + Bd3-trade squeeze ──
const MAIN_LINE: LessonScript = {
  openingId: 'pro-gothamchess-caro-advance-white',
  title: 'Caro-Advance — Main Line vs …Bf5',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'advance',
      moves: 'e4 c6 d4 d5 e5 Bf5',
      arrows: [{ from: 'd4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'f5', color: SOFT }],
      say:
        "Against the Caro, this repertoire grabs space with e5 — the Advance. This is his bread-and-butter line: 423 games at a crushing 73%. Black develops the light-squared bishop outside the chain to f5, exactly as the Caro wants. So our whole plan is built around making that bishop regret it.",
      sayShort: 'e5 — the Advance squeeze.',
    }),
    b({
      id: 'h4',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5',
      arrows: [{ from: 'h2', to: 'h4', color: VIS }],
      highlights: [{ square: 'h4', color: KEY }, { square: 'h5', color: SOFT }],
      say:
        "h4 — the key gain of space. We threaten h5, trapping the bishop, so Black is forced to answer with h5 of his own. That little pawn on h5 looks harmless, but it's a permanent weakness we'll lean on for the rest of the game.",
      sayShort: 'h4 — fix the h5 weakness.',
    }),
    b({
      id: 'bg5',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6',
      arrows: [{ from: 'c1', to: 'g5', color: VIS }],
      highlights: [{ square: 'g5', color: KEY }],
      say:
        "Bg5 develops the dark-squared bishop to an active square, where it eyes the kingside and clamps down on the dark squares. Black hits back with Qb6, pressuring d4 and b2. We're happy to let the queen wander — it's not developing Black's pieces.",
      sayShort: 'Bg5 — active dark bishop.',
    }),
    b({
      id: 'bd3-trade',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3',
      arrows: [{ from: 'd3', to: 'f5', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }],
      say:
        "Here's the point: Bd3, offering to trade the light-squared bishops. When Black takes, we recapture with the queen — and now WE have the good bishop and Black has none. His remaining bishop is the bad one, about to be locked in by his own …e6. That's a lasting structural edge.",
      sayShort: 'Bd3 — win the good-bishop trade.',
    }),
    b({
      id: 'nd2',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7',
      highlights: [{ square: 'd2', color: SOFT }, { square: 'e6', color: SOFT }],
      say:
        "Black shuts the box on his own bishop with e6 and develops the knight to e7; we bring the knight to d2, heading for the great f3- and b3-squares. Notice the contrast: every one of our pieces has a bright future, while Black's light-squared bishop is gone and his structure is locked.",
      sayShort: 'Nd2 — route to f3/b3.',
    }),
    b({
      id: 'mg-c4',
      moves: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7 c4',
      arrows: [{ from: 'c2', to: 'c4', color: VIS }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "And we open a second front: c4, striking at Black's d5-pawn. Here's the middlegame picture — we have more space, the better bishop, a target on h5, and now pressure on the queenside too. White plays on both wings while Black sits cramped and passive. This is the squeeze that wins 73% of this repertoire's Caros.",
      sayShort: 'c4 — open the second front.',
    }),
  ],
};

// ── vs …c5 (Botvinnik-Carls) — the dxc5 + a3 pawn-grab structure ──
const C5_LINE: LessonScript = {
  openingId: 'pro-gothamchess-caro-advance-white',
  title: 'Caro-Advance — vs …c5 (Botvinnik-Carls)',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'c5',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5',
      arrows: [{ from: 'd4', to: 'c5', color: VIS }],
      highlights: [{ square: 'c5', color: KEY }],
      say:
        "Instead of …Bf5, Black challenges the centre immediately with c5. We take — dxc5 — heading into the Botvinnik-Carls structure. For the moment we're a pawn up; the question is whether Black can win it back without falling behind in development.",
      sayShort: 'dxc5 — grab the pawn.',
    }),
    b({
      id: 'e6-a3',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 a3',
      highlights: [{ square: 'a3', color: KEY }, { square: 'b4', color: SOFT }],
      say:
        "Black plays e6, getting ready to round up the c5-pawn; we slot in the quiet a3 — and it's deceptively important. It takes the b4-square away from Black's bishop and prepares b4 ourselves, so we could even try to HOLD the extra pawn with a queenside clamp.",
      sayShort: 'a3 — control b4.',
    }),
    b({
      id: 'bxc5-nf3',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 a3 Bxc5 Nf3 Nc6',
      highlights: [{ square: 'c5', color: SOFT }],
      say:
        "Black recaptures with the bishop on c5, regaining the pawn, and develops the knight to c6; we bring our knight to f3, defending e5 and developing toward the kingside. Material is level again — but the e5-pawn still cramps Black's whole position.",
      sayShort: 'Nf3 — hold e5, develop.',
    }),
    b({
      id: 'mg-bd3',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 a3 Bxc5 Nf3 Nc6 Bd3',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Bd3 trains the bishop toward h7 and the kingside. Here's the middlegame: the e5-pawn is a thorn cramping Black, our pieces flow toward his king, and we castle next with a comfortable, space-based pull. Black freed his game with …c5 but handed us the long-term squeeze in return — exactly the trade this repertoire is happy to make.",
      sayShort: 'Bd3 — aim at the king, castle next.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_CARO_ADVANCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-caro-advance-white::Main line (vs …Bf5)': MAIN_LINE,
  'pro-gothamchess-caro-advance-white::vs …c5 (Botvinnik-Carls)': C5_LINE,
};
