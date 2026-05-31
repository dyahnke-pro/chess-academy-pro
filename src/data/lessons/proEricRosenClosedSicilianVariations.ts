import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Closed Sicilian / Grand Prix per-variation lessons (White).
// Names match pro-repertoires.json. Two registers; no move-number prefixes;
// green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-ericrosen-closed-sicilian';
const SRC = ['concept:att-kingside-storm', 'concept:pos-development', 'https://www.chess.com/openings/Grand-Prix-Attack', 'https://api.chess.com/pub/player/imrosen/games/archives'];

const VS_E6: LessonScript = {
  openingId: OID, title: 'Grand Prix — vs …e6 (f4 + Bb5+)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 c5 Nc3 e6 f4 d5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'f4', color: SOFT }],
      say: "Against an …e6/…d5 French-style setup, we keep our f4 stake in the centre. Black challenges e4 with …d5; we are happy to clarify because our f-pawn and kingside development give us the attacking chances.",
      sayShort: 'f4 — hold the kingside stake.' }),
    b({ id: 'bb5', moves: 'e4 c5 Nc3 e6 f4 d5 Nf3 Nf6 Bb5+ Bd7 Bxd7 Nbxd7',
      arrows: [], highlights: [{ square: 'b5', color: KEY }, { square: 'd7', color: SOFT }],
      say: "Nf3 develops and Bb5+ is a useful check: we trade off Black's light-squared bishop — often Black's best piece in these French structures — and after …Nbxd7 White has an easy game with a clear kingside plan and no bad pieces.",
      sayShort: 'Bb5+ — trade Black’s good bishop.' }),
    b({ id: 'plan', moves: 'e4 c5 Nc3 e6 f4 d5 Nf3 Nf6 Bb5+ Bd7 Bxd7 Nbxd7',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'f5', color: SOFT }],
      say: "From here White plays e5 to gain space and clamp Black's knight, castles, and prepares the f4-f5 break to open lines on the kingside. With the light bishops gone and a space edge, White keeps a pleasant, attacking initiative.",
      sayShort: 'Plan: e5, O-O, then f5.' }),
  ],
};

const VS_G6: LessonScript = {
  openingId: OID, title: 'Grand Prix — vs …g6 (open d4)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'g6', moves: 'e4 c5 Nc3 g6 d4',
      arrows: [], highlights: [{ square: 'd4', color: KEY }],
      say: "When Black fianchettoes early with …g6 before developing the queenside, we change gears and grab the centre with d4 — an Open Sicilian on our terms, since Black has committed to the fianchetto and can't fight for the centre with …Nc6 and …e5 as flexibly.",
      sayShort: 'd4 — punish the early …g6.' }),
    b({ id: 'qxd4', moves: 'e4 c5 Nc3 g6 d4 cxd4 Qxd4 Nf6 Bb5',
      arrows: [], highlights: [{ square: 'd4', color: KEY }, { square: 'b5', color: SOFT }],
      say: "After cxd4 we recapture with the queen — and crucially, when Black hits it with …Nf6, we do not retreat but play Bb5+, so the check covers the queen and develops with tempo. A neat point that keeps White a step ahead.",
      sayShort: 'Qxd4, Bb5+ — develop with tempo.' }),
    b({ id: 'plan', moves: 'e4 c5 Nc3 g6 d4 cxd4 Qxd4 Nf6 Bb5 a6 Bd3 Bg7 Be3 O-O O-O-O',
      arrows: [A('d1', 'd8')], highlights: [{ square: 'd3', color: KEY }, { square: 'c1', color: SOFT }],
      say: "The bishop drops to d3 eyeing the kingside, Be3 develops, and White castles long for an opposite-side attack: a strong centralised queen, a space edge, and the bishop pair aimed at Black's king. Rosen scores 73% from this line — the early …g6 is simply premature.",
      sayShort: 'Bd3, O-O-O — comfortable, attacking.' }),
  ],
};

export const PRO_ERICROSEN_CLOSED_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs …e6 (f4 + Bb5+)`]: VS_E6,
  [`${OID}::vs …g6 (Open d4)`]: VS_G6,
};
