import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Closed Sicilian (2.Nc3), PER-VARIATION Watch
// lesson. Board-accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.
// NOTE: after the trade BLACK keeps the bishop pair — White's pull is central
// space + the queen on d4, not the bishops.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Closed-Sicilian',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

const MAIN: LessonScript = {
  openingId: 'pro-gothamchess-closed-sicilian', title: 'Closed Sicilian — Main Line',
  minutes: 10, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }], highlights: [{ square: 'c3', color: SOFT }, { square: 'd4', color: KEY }],
      say: "The Nc3 move order — another way this repertoire dodges Open Sicilian theory. We develop the knight, lean on c6 with Bb5, and when Black leaps into d4 to muddy things, we calmly question the knight with Nf3. No panic, no theory — just sensible developing moves.",
      sayShort: 'Nf3 — challenge the d4-knight.' }),
    b({ id: 'trade', moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }], highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say: "Black trades his knight for our bishop; we recapture, get nudged by …a6, and retreat to c3. Black has the two bishops now — but in this slow position they have nothing to bite on. When Black plays …d6, we strike with d4, seizing space in the centre.",
      sayShort: 'd4 — seize the centre.' }),
    b({ id: 'mg-qxd4', moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4 cxd4 Qxd4',
      arrows: [{ from: 'd4', to: 'g7', color: VIS }], highlights: [{ square: 'd4', color: KEY }],
      say: "We recapture on d4 with the queen, planting it in the centre with a glance toward g7. Here's the honest middlegame: it's a SMALL edge. We have more space and the better-placed pieces; Black has the bishop pair but no targets for it yet. We castle, develop the dark-squared bishop, and squeeze. Against a Sicilian player who wanted chaos, a quiet, better game is exactly the win we're after.",
      sayShort: 'Qxd4 — a small, riskless pull.' }),
  ],
};

// ── vs …d6 — the full opposite-castle system ──
const VS_D6: LessonScript = {
  openingId: 'pro-gothamchess-closed-sicilian', title: 'Closed Sicilian — vs …d6',
  minutes: 9, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({
      id: 'qxd4',
      moves: 'e4 c5 Nc3 d6 d4 cxd4 Qxd4 Nc6 Qd2',
      highlights: [{ square: 'd2', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "The …d6 order — seventy-three of his corpus games. We open the centre anyway and recapture with the QUEEN, and when the knight kicks it, the retreat to d2 is the system's signature: the queen sits behind the future long castle, already on its attacking diagonal.",
      sayShort: 'Qxd4, then Qd2 — the signature.',
    }),
    b({
      id: 'setup',
      moves: 'e4 c5 Nc3 d6 d4 cxd4 Qxd4 Nc6 Qd2 g6 b3 Bh6 f4 Nf6 Bb2 O-O O-O-O',
      highlights: [{ square: 'c1', color: KEY }, { square: 'b2', color: SOFT }, { square: 'f4', color: SOFT }],
      say:
        "Watch the machine assemble: b3 and bishop b2 take the long diagonal, f4 stakes the kingside lever before Black stirs, and the king castles LONG while Black's goes short. When Black's bishop pokes at h6 offering a trade, the position ignores it — opposite-side castling has begun and every tempo is a pawn.",
      sayShort: 'b3, Bb2, f4, long castle — the machine.',
    }),
    b({
      id: 'race',
      moves: 'e4 c5 Nc3 d6 d4 cxd4 Qxd4 Nc6 Qd2 g6 b3 Bh6 f4 Nf6 Bb2 O-O O-O-O e5 g3 Re8 Kb1',
      highlights: [{ square: 'b1', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Black stakes e5, we hold the structure with g3, and the king tucks to b1 — the quiet insurance move every long-castled player pays. The race position is set: his pawns will roll at our king, ours at his, and the corpus says our tempo head-start decides. The middlegame plan maps the tactics from exactly here.",
      sayShort: 'Kb1 — insurance paid. Race on.',
    }),
  ],
};

// ── vs …e6 — Qd3, Bf4, castle long ──
const VS_E6: LessonScript = {
  openingId: 'pro-gothamchess-closed-sicilian', title: 'Closed Sicilian — vs …e6',
  minutes: 8, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({
      id: 'qd3',
      moves: 'e4 c5 Nc3 e6 d4 cxd4 Qxd4 Nc6 Qd3',
      highlights: [{ square: 'd3', color: KEY }],
      say:
        "Against …e6 the recipe barely changes — fifty-eight corpus games at this junction. Queen takes on d4, and this time the retreat square is d3: watching the e4-pawn, clearing d1 for the rook, and keeping every kingside option alive.",
      sayShort: 'Qxd4, Qd3 — the e6 recipe.',
    }),
    b({
      id: 'bf4',
      moves: 'e4 c5 Nc3 e6 d4 cxd4 Qxd4 Nc6 Qd3 Nf6 Bf4',
      arrows: [{ from: 'f4', to: 'b8', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }],
      say:
        "Bishop to f4 — the dark-square diagonal all the way to b8, and nothing in Black's camp can ever kick it off. Two pieces developed, and both already point at the queenside Black's king may never dare to leave.",
      sayShort: 'Bf4 — the b8 diagonal, forever.',
    }),
    b({
      id: 'ooo',
      moves: 'e4 c5 Nc3 e6 d4 cxd4 Qxd4 Nc6 Qd3 Nf6 Bf4 Bb4 O-O-O',
      highlights: [{ square: 'c1', color: KEY }, { square: 'b4', color: SOFT }],
      say:
        "Black pins with …Bb4 — and we castle long straight through it, the rook arriving on d1 with tempo down the file our queen just left. Move seven, and the whole system stands: queen, bishop, castle, half-open d-file. The middlegame plan picks up with Black's …e5 break and the bishop's return ticket.",
      sayShort: 'O-O-O — move seven, system complete.',
    }),
  ],
};

// ── vs …g6 — Bxc6 and the structural annuity ──
const VS_G6: LessonScript = {
  openingId: 'pro-gothamchess-closed-sicilian', title: 'Closed Sicilian — vs …g6',
  minutes: 8, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({
      id: 'bxc6',
      moves: 'e4 c5 Nc3 Nc6 Bb5 g6 Bxc6 dxc6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "The …g6 fianchetto announces where Black's bishop is going — so we trade on c6 before it ever gets there. Look at the wreckage: doubled c-pawns, and when the fianchetto finishes, its long diagonal will stare into Black's own pawn on c6.",
      sayShort: 'Bxc6 — doubled before developed.',
    }),
    b({
      id: 'd3-be3',
      moves: 'e4 c5 Nc3 Nc6 Bb5 g6 Bxc6 dxc6 d3 Bg7 Be3',
      arrows: [{ from: 'e3', to: 'c5', color: VIS }],
      highlights: [{ square: 'e3', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "We set the structure with d3 and develop the bishop to e3 — pointed straight at the front twin on c5. The plan is not a storm; it is a collection: those doubled pawns are an annuity, and every developing move adds interest.",
      sayShort: 'Be3 — aimed at the twins.',
    }),
    b({
      id: 'c4-recapture',
      moves: 'e4 c5 Nc3 Nc6 Bb5 g6 Bxc6 dxc6 d3 Bg7 Be3 c4 h3 cxd3 cxd3',
      highlights: [{ square: 'd3', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "Black spends the front twin at once — …c4 hits our d3-pawn — and after the quiet h3 insurance, the trade comes and we recapture TOWARD the centre. Count the result: our pawn chain rebuilt itself, and where Black once had two c-pawns, one stands alone. A small, permanent, teachable edge — the middlegame plan collects it from here.",
      sayShort: 'cxd3 — toward the centre. Edge banked.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_CLOSED_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-closed-sicilian::Closed Sicilian Main': MAIN,
  'pro-gothamchess-closed-sicilian::vs …d6': VS_D6,
  'pro-gothamchess-closed-sicilian::vs …e6': VS_E6,
  'pro-gothamchess-closed-sicilian::vs …g6 (Bxc6)': VS_G6,
};
