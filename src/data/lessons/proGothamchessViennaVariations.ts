import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Vienna Game, PER-VARIATION Watch lessons.
// Each variation walks its deep repertoire spine to a middlegame with board-
// accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.
// NOTE: in the gambit main line BOTH sides keep both bishops — there is NO
// bishop-pair edge; White's pull is the b-file + the rolling initiative.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Vienna-Game',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Vienna Gambit Main Line — f4 gambit into the Rb1 b-file initiative ──
const GAMBIT: LessonScript = {
  openingId: 'pro-gothamchess-vienna',
  title: 'Vienna — Gambit Main Line (Qf3 + Rb1)',
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'gambit',
      moves: 'e4 e5 Nc3 Nf6 f4 d5',
      arrows: [{ from: 'f2', to: 'f4', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }],
      say:
        "The Vienna Gambit at full tilt — 649 games in this repertoire's database. After Nc3 and Nf6, we hurl the f-pawn forward with f4, opening the f-file toward Black's king. Black's best is the central counter d5 rather than grabbing the pawn.",
      sayShort: 'f4 — the gambit thrust.',
    }),
    b({
      id: 'qf3',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3',
      arrows: [{ from: 'd1', to: 'f3', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'f7', color: SOFT }],
      say:
        "We take on e5 and the knight grabs e4; now the heart of the line — Qf3. The queen attacks the e4-knight and leans down the open f-file toward f7 at the same time. Black is forced to react, and every reply hands us the initiative.",
      sayShort: 'Qf3 — hit the knight and f7.',
    }),
    b({
      id: 'bxc3',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3',
      arrows: [{ from: 'b2', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'b1', color: SOFT }],
      say:
        "Black trades the knight on c3; we recapture with the b-pawn. This isn't a concession — it opens the b-file for our rook and builds a broad pawn mass in the centre. That half-open b-file is about to become a highway to Black's queenside.",
      sayShort: 'bxc3 — open the b-file.',
    }),
    b({
      id: 'qg3-nf3',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3',
      arrows: [{ from: 'f3', to: 'g3', color: VIS }],
      highlights: [{ square: 'g7', color: KEY }],
      say:
        "Black grabs space with c5; we swing the queen to g3, eyeing g7 and supporting the e5-pawn, then develop the knight to f3. Our whole army flows toward Black's kingside while he's still sorting out his pieces.",
      sayShort: 'Qg3 — swing toward g7.',
    }),
    b({
      id: 'mg-rb1',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1',
      arrows: [{ from: 'b1', to: 'b7', color: VIS }],
      highlights: [{ square: 'b7', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Black develops Be6; we plant the rook on b1, pressing straight down the open file at b7. Here's the middlegame: a rook on the b-file, the queen on g3 aimed at the kingside, the e5-pawn cramping Black, and a long-term initiative for the gambit pawn. The plan is to pile onto b7, push d4 to open the centre, and attack on both wings. One pawn, a board full of pressure.",
      sayShort: 'Rb1 — press b7, push d4 next.',
    }),
  ],
};

// ── Vienna Quiet (Bc4 + d3) — vs …Nc6/…Bc5, the Na4 idea ──
const QUIET: LessonScript = {
  openingId: 'pro-gothamchess-vienna',
  title: 'Vienna — Quiet Bc4 + d3 (the Na4 Idea)',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5',
      highlights: [{ square: 'c4', color: SOFT }, { square: 'c5', color: SOFT }],
      say:
        "When Black avoids …d5 and instead develops classically with Nc6 and Bc5, we switch gears to a quieter setup: Bc4 and d3. No gambit yet — we build a solid Italian-style position with the option to expand on the kingside later.",
      sayShort: 'Bc4 + d3 — the quiet setup.',
    }),
    b({
      id: 'f4',
      moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3 Bg4',
      arrows: [{ from: 'f2', to: 'f4', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }],
      say:
        "Even in the quiet line, the f-pawn comes forward — f4, the Vienna's signature lever, gaining kingside space. Black solidifies with d6 and pins our knight with Bg4. The position is calmer than the gambit, but the same attacking DNA is there.",
      sayShort: 'f4 — the kingside lever.',
    }),
    b({
      id: 'mg-na4',
      moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3 Bg4 Na4',
      arrows: [{ from: 'c3', to: 'a4', color: VIS }],
      highlights: [{ square: 'a4', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "Na4 — the key maneuver. The knight steps to the rim to attack the bishop on c5, the piece that bites on our king's diagonal. Black has to decide: retreat the bishop and lose tempo, or trade it off and give us the two bishops. Either way we come out ahead, with a comfortable space edge and the f4-break ready to roll. A quiet line that still squeezes.",
      sayShort: 'Na4 — challenge the c5-bishop.',
    }),
  ],
};

// ── Vienna with …Nc6 + …Bc5 — the classical setup, f4 build ──
const CLASSICAL_SETUP: LessonScript = {
  openingId: 'pro-gothamchess-vienna',
  title: 'Vienna — vs Classical …Nc6 + …Bc5',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5',
      highlights: [{ square: 'c4', color: SOFT }, { square: 'c5', color: SOFT }],
      say:
        "Black answers the Vienna with the classical developing setup — Nc6 and Bc5, mirroring our pieces. We meet it the principled way: Bc4 and d3, a rock-solid Italian-style structure where we hold the centre and keep the f4-break in reserve.",
      sayShort: 'Bc4 + d3 — solid and flexible.',
    }),
    b({
      id: 'f4-d6',
      moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6',
      arrows: [{ from: 'f2', to: 'f4', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "f4 — there's the Vienna's punch even here. We challenge the e5-pawn and grab kingside space. Black props his centre up with d6, declining to take, because opening the f-file would only help our attack. The tension builds.",
      sayShort: 'f4 — challenge e5.',
    }),
    b({
      id: 'mg-nf3',
      moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3',
      arrows: [{ from: 'g1', to: 'f3', color: VIS }],
      highlights: [{ square: 'f3', color: KEY }, { square: 'f4', color: SOFT }],
      say:
        "Nf3 completes our development and adds a defender to the kingside. Here's the middlegame plan: we'll castle, keep the f4-pawn as a spearhead, and look to break with f5 or open the centre at the right moment. With more space and a clear attacking lever, White holds the easier game. The Vienna doesn't need the gambit to bite.",
      sayShort: 'Nf3 — castle, then play for f5.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_VIENNA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-vienna::Vienna Gambit Main Line': GAMBIT,
  'pro-gothamchess-vienna::Vienna Quiet (Bc4 + d3)': QUIET,
  'pro-gothamchess-vienna::Vienna with …Nc6 + …Bc5': CLASSICAL_SETUP,
};
