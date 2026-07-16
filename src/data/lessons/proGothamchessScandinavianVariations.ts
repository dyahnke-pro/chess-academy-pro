import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Scandinavian Defense, PER-VARIATION Watch
// lessons. Board-accurate, two-register narration (G9.3 Gates A-D). Student = BLACK.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Scandinavian-Defense',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

const QA5: LessonScript = {
  openingId: 'pro-gothamchess-scandinavian', title: 'Scandinavian — Main Line Qa5',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'qa5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5',
      arrows: [{ from: 'd5', to: 'a5', color: VIS }], highlights: [{ square: 'a5', color: KEY }, { square: 'c3', color: SOFT }],
      say: "The main-line Scandinavian. We grab the centre back with the queen, and when the knight develops with tempo we glide to a5 — not running, but working: from a5 the queen eyes the c3-knight and the open diagonal. Easy, forcing, hard to get wrong.",
      sayShort: 'Qa5 — retreat with purpose.' }),
    b({ id: 'bf5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6 Qe2 Bb4',
      arrows: [{ from: 'c8', to: 'f5', color: VIS }], highlights: [{ square: 'f5', color: KEY }, { square: 'b4', color: SOFT }],
      say: "We develop everything to its best square: the bishop OUTSIDE the chain on f5, …e6, …c6 for the queen's safety, and …Bb4 leaning on the c3-knight. Every developing move also makes a small threat. This is the Scandinavian's hidden efficiency.",
      sayShort: 'Bf5 + Bb4 — develop with threats.' }),
    b({ id: 'mg-castle', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6 Qe2 Bb4 O-O-O Nbd7',
      arrows: [{ from: 'b7', to: 'b5', color: VIS }], highlights: [{ square: 'c1', color: SOFT }, { square: 'b5', color: KEY }],
      say: "White castles queenside; we finish with …Nbd7. Here's the middlegame: White's king is on the queenside, our queen and bishop already aim at it, and our pawns are loaded — …b5, …b4 to pry it open. We're slightly worse on the engine, but we're the side with the easy moves and the attack. Trade a sliver of structure for clarity and initiative.",
      sayShort: '…b5/…b4 — open the king.' }),
  ],
};

const NF6: LessonScript = {
  openingId: 'pro-gothamchess-scandinavian', title: 'Scandinavian — 2…Nf6 (Modern)',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 d5 exd5 Nf6',
      arrows: [{ from: 'g8', to: 'f6', color: VIS }], highlights: [{ square: 'f6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "The modern Scandinavian — instead of recapturing with the queen, we develop …Nf6, planning to win the d5-pawn back with a piece. This keeps the queen home and leads to a fluid, fianchetto-style game where Black is solid and active.",
      sayShort: 'Nf6 — regain d5 with a piece.' }),
    b({ id: 'fianchetto', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 c4 Nb6 Nf3 g6 Nc3 Bg7 Be3 O-O Be2 Nc6',
      arrows: [{ from: 'f8', to: 'g7', color: VIS }], highlights: [{ square: 'g7', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We round up the pawn, get nudged to b6, and then fianchetto — …g6 and …Bg7 — aiming the bishop straight down the long diagonal at White's big centre. With …Nc6 added, we're pressuring the d4-pawn from two directions. We invited the big centre so we could attack it.",
      sayShort: 'Bg7 + …Nc6 — pressure d4.' }),
    b({ id: 'mg-e5', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 c4 Nb6 Nf3 g6 Nc3 Bg7 Be3 O-O Be2 Nc6 O-O e5',
      arrows: [{ from: 'e7', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We castle and strike with …e5, challenging the centre head-on. Here's the middlegame: a Grünfeld-style position where our fianchetto bishop and active knights hammer White's centre. The plan is …exd4 to open lines, or piling onto d4. We've traded a tiny structural concession for free, active development — a comfortable, fully-playable game.",
      sayShort: '…e5 — challenge the centre.' }),
  ],
};

// ── Portuguese …Bg4 — trade, recapture, castle long by move seven ──
const PORTUGUESE: LessonScript = {
  openingId: 'pro-gothamchess-scandinavian', title: 'Scandinavian — Portuguese …Bg4',
  minutes: 9, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({
      id: 'bg4',
      moves: 'e4 d5 exd5 Nf6 d4 Bg4',
      highlights: [{ square: 'g4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "The Portuguese: instead of recapturing on d5 at once, the bishop leaps to g4 first — development before material. Two hundred and six of his corpus games run through this junction. White holds an extra pawn for now; we hold every active square on the board.",
      sayShort: 'Bg4 — development before material.',
    }),
    b({
      id: 'trade',
      moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5',
      highlights: [{ square: 'e2', color: SOFT }, { square: 'd5', color: KEY }],
      say:
        "White breaks the stare with Be2 and we trade at once — the light-squared bishop's whole career condensed into four useful moves. Then the queen takes the pawn back from the centre of the board. Material level, and count the development: our queen and knight are out; White's queen was dragged to e2 by the recapture.",
      sayShort: 'Trade, then Qxd5 — pawn home.',
    }),
    b({
      id: 'ooo',
      moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 Nf3 Nc6 Be3 O-O-O',
      highlights: [{ square: 'c8', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "Knight out, knight out, and castle LONG — by move seven our king is safe, the rook stares at d4 through our own queen, and every Black piece has a job. This is the Portuguese sales pitch delivered: a fair fight from move two, with the sharper player holding the ideas. The middlegame plans pick up from exactly here.",
      sayShort: 'O-O-O by move seven. Fair fight.',
    }),
  ],
};

// ── vs Nc3 (Nxd5) — the harassment line ──
const VS_NC3: LessonScript = {
  openingId: 'pro-gothamchess-scandinavian', title: 'Scandinavian — vs Nc3',
  minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({
      id: 'nxd5',
      moves: 'e4 d5 exd5 Nf6 Nc3 Nxd5',
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "White's Nc3 sideline defends nothing and hands the pawn straight back — the knight recaptures on d5 and sits centralized. No Portuguese fireworks here; this line is about something quieter and just as effective: never giving White a free move.",
      sayShort: 'Nxd5 — pawn back, knight centred.',
    }),
    b({
      id: 'c6-wall',
      moves: 'e4 d5 exd5 Nf6 Nc3 Nxd5 Bc4 c6 Qf3 Nf6 Nge2 Nbd7',
      highlights: [{ square: 'c6', color: KEY }, { square: 'f3', color: SOFT }],
      say:
        "Bc4 and the early Qf3 both point at f7 — the club player's dream that never comes true: c6 builds the wall, the knight steps back to f6 covering everything, and the second knight arrives on d7. Solid as stone, and watch what the pieces do next.",
      sayShort: 'c6 — the wall. f7 never falls.',
    }),
    b({
      id: 'nb6',
      moves: 'e4 d5 exd5 Nf6 Nc3 Nxd5 Bc4 c6 Qf3 Nf6 Nge2 Nbd7 d4 Nb6',
      arrows: [{ from: 'b6', to: 'c4', color: VIS }],
      highlights: [{ square: 'b6', color: KEY }, { square: 'c4', color: SOFT }],
      say:
        "And the nagging begins: Nb6 hits the c4-bishop — the first of a chain of threats that defines this line. The bishop must move, then Bg4 comes for the queen, then the a-pawn for the bishop again, then the h-pawn for the knight. Cramped positions survive on threats, and here every Black move makes one. The middlegame plan shows the whole harassment.",
      sayShort: 'Nb6 — the nagging begins.',
    }),
  ],
};

// ── vs Bb5+ — block, expand, battery ──
const VS_BB5: LessonScript = {
  openingId: 'pro-gothamchess-scandinavian', title: 'Scandinavian — vs Bb5+',
  minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({
      id: 'block',
      moves: 'e4 d5 exd5 Nf6 Bb5+ Nbd7',
      highlights: [{ square: 'd7', color: KEY }, { square: 'b5', color: SOFT }],
      say:
        "The check on b5 is White's tidiest sideline, and the answer costs nothing: block with the queen's knight, a developing move we wanted anyway. His corpus record from here is perfect — five games, five wins.",
      sayShort: 'Nbd7 — block with development.',
    }),
    b({
      id: 'expand',
      moves: 'e4 d5 exd5 Nf6 Bb5+ Nbd7 Nc3 a6 Be2 b5',
      highlights: [{ square: 'b5', color: KEY }, { square: 'a6', color: SOFT }],
      say:
        "a6 puts the question, the bishop retreats to e2, and b5 grabs the space it left behind. Two pawn moves, and look what they bought: queenside ground, the c4 square denied to White forever, and the b7 square opened for the bishop's permanent home.",
      sayShort: 'a6, b5 — space and b7.',
    }),
    b({
      id: 'bb7',
      moves: 'e4 d5 exd5 Nf6 Bb5+ Nbd7 Nc3 a6 Be2 b5 a3 Bb7',
      arrows: [{ from: 'b7', to: 'd5', color: VIS }],
      highlights: [{ square: 'b7', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Bb7 — and the long diagonal lights up, starting with the d5-pawn White has been babysitting since move two. The pawn falls next, the knight recaptures with tempo, and the a-file trades leave our queen stacked behind this very bishop. One diagonal, the whole game's story. The middlegame plan plays it out.",
      sayShort: 'Bb7 — the diagonal lights up.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_SCANDINAVIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-scandinavian::Main Line Qa5': QA5,
  'pro-gothamchess-scandinavian::2...Nf6 Scandinavian': NF6,
  'pro-gothamchess-scandinavian::Portuguese …Bg4': PORTUGUESE,
  'pro-gothamchess-scandinavian::vs Nc3 (Nxd5)': VS_NC3,
  'pro-gothamchess-scandinavian::vs Bb5+': VS_BB5,
};
