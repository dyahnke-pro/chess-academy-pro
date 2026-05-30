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

export const PRO_GOTHAMCHESS_SCANDINAVIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-scandinavian::Main Line Qa5': QA5,
  'pro-gothamchess-scandinavian::2...Nf6 Scandinavian': NF6,
};
