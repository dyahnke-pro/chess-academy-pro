import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Anti-Sicilian Rossolimo, PER-VARIATION Watch
// lessons. Board-accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Rossolimo 3.Bb5 e6 — the Bf1 retreat + d4 break, central pull ──
const E6: LessonScript = {
  openingId: 'pro-gothamchess-anti-sicilian',
  title: 'Rossolimo — 3.Bb5 e6 (the d4 Break)',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1',
      arrows: [{ from: 'b5', to: 'f1', color: VIS }],
      highlights: [{ square: 'f1', color: KEY }],
      say:
        "The flagship Rossolimo. Black plays …e6 and …Nge7, sidestepping the doubled pawns that Bxc6 would cause; we castle, drop the rook to e1, and when questioned, retreat the bishop all the way to f1 — NOT trading. We keep this bishop as a long-term asset for when the centre opens.",
      sayShort: 'Bf1 — keep the bishop.',
    }),
    b({
      id: 'd4',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "Black goes for the freeing break d5; we take and then strike with d4 ourselves, blasting the centre open. With our rook already on e1 and our king safe, opening lines is pure profit — the better-coordinated side always wins the opened position, and that's us.",
      sayShort: 'd4 — open it on our terms.',
    }),
    b({
      id: 'mg-qxd4',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 cxd4 Nxd4 Nxd4 Qxd4',
      arrows: [{ from: 'd4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "The pieces come off on d4 and our queen recaptures, dominating the centre. Here's the middlegame: a safe king, a centralised queen, the bishop on f1 about to re-emerge on a great diagonal, and a healthier structure. It's a small, riskless pull — and against a Sicilian player who wanted chaos, a quiet, better game is exactly the win Levy hunts.",
      sayShort: 'Qxd4 — a clean central pull.',
    }),
  ],
};

// ── Rossolimo 3.Bb5 g6 — trade on c6, play vs the doubled pawns ──
const G6: LessonScript = {
  openingId: 'pro-gothamchess-anti-sicilian',
  title: 'Rossolimo — 3.Bb5 g6 (Bxc6 Structure)',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 e5',
      highlights: [{ square: 'g7', color: SOFT }, { square: 'e5', color: SOFT }],
      say:
        "Against the fianchetto, the Rossolimo gets concrete. Black puts the bishop on g7 and clamps the centre with …e5. That bishop on g7 is Black's pride and joy — so our plan targets the support it relies on, the knight on c6.",
      sayShort: '…g6/…e5 — the fianchetto clamp.',
    }),
    b({
      id: 'bxc6',
      moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 e5 Bxc6 dxc6',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "Bxc6! Here we DO trade, and after …dxc6 Black is left with doubled c-pawns. He gets the two bishops in return — but in this closed, blocked centre those bishops have nothing to do, while his pawn weaknesses are permanent. We're trading flash for substance.",
      sayShort: 'Bxc6 — saddle Black with doubled pawns.',
    }),
    b({
      id: 'mg-d3',
      moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 e5 Bxc6 dxc6 d3',
      arrows: [{ from: 'f3', to: 'd2', color: SOFT }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "We play the solid d3, and here's the middlegame plan. Route the knight via d2 to c4, where it eyes the weak dark squares and Black's loose pawns; control the d5-square; and grind against the doubled c-pawns. The position is closed, so Black's bishops stay quiet while we slowly improve. A pure positional squeeze.",
      sayShort: 'Nd2-c4 — target the weak pawns.',
    }),
  ],
};

// ── Accelerated Pawn Storm (Carlsen) — immediate Bxc6, d3/e5 + Bb2 ──
const CARLSEN: LessonScript = {
  openingId: 'pro-gothamchess-anti-sicilian',
  title: 'Rossolimo — Accelerated Storm (Carlsen-inspired)',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'bxc6',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 Bxc6 bxc6',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }],
      say:
        "Magnus Carlsen popularised this — trade on c6 IMMEDIATELY, before Black is set up. After …bxc6 Black has the two bishops, but also a clump of doubled c-pawns and a half-open structure for us to play against. We're going for a Carlsen-style slow squeeze.",
      sayShort: 'Bxc6 — the early Carlsen trade.',
    }),
    b({
      id: 'e5',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 Bxc6 bxc6 d3 d5 e5',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "We support the centre with d3, and when Black plays …d5, we lock it with e5! Now the centre is fixed, Black's light-squared bishop is hemmed in behind the …e6/…d5 chain, and we have a space advantage on the kingside. The pawn structure does the work.",
      sayShort: 'e5 — fix the centre, gain space.',
    }),
    b({
      id: 'mg-bb2',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 Bxc6 bxc6 d3 d5 e5 Ne7 b3 Ng6 Bb2',
      arrows: [{ from: 'b2', to: 'g7', color: VIS }],
      highlights: [{ square: 'b2', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "Black reroutes the knight to g6 to nibble at e5; we fianchetto with b3 and Bb2, aiming the bishop down the long dark diagonal. Here's the middlegame: the e5-space clamp, the Bb2 raking toward Black's kingside, and the doubled c-pawns as a permanent target. We castle and slowly improve. It's the Carlsen recipe — a tiny, riskless edge ground into a full point.",
      sayShort: 'Bb2 — clamp, then squeeze.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_ANTI_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-anti-sicilian::Rossolimo 3.Bb5 e6': E6,
  'pro-gothamchess-anti-sicilian::Rossolimo 3.Bb5 g6': G6,
  'pro-gothamchess-anti-sicilian::Accelerated Pawn Storm (Carlsen-inspired)': CARLSEN,
};
