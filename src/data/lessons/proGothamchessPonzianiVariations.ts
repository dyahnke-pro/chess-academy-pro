import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Ponziani, PER-VARIATION Watch lessons.
// Board-accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Ponziani-Opening',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Main Line 3…Nf6 4.d4 — the big centre + Bb5 pin + doubled pawns ──
const MAIN: LessonScript = {
  openingId: 'pro-gothamchess-ponziani',
  title: 'Ponziani — Main Line 3…Nf6 4.d4',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd4',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
      say:
        "The Ponziani's main line. After c3 and d4, Black takes on d4 — but instead of recapturing, we push e5! kicking the f6-knight with tempo. Win the tempo before you win the pawn back: that's the Ponziani's bite. Most opponents have never faced it.",
      sayShort: 'e5 — kick the knight first.',
    }),
    b({
      id: 'qb3',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3 Nb6 cxd4',
      arrows: [{ from: 'd1', to: 'b3', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'b7', color: SOFT }],
      say:
        "The knight jumps to d5; we hit it with Qb3, attacking the knight and leaning on b7 at the same time. Black retreats to b6, and now we recapture — cxd4 — and there it is: a big e5-and-d4 pawn duo dominating the centre, with the b6-knight offside.",
      sayShort: 'Qb3 then cxd4 — the big centre.',
    }),
    b({
      id: 'mg-bb5',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3 Nb6 cxd4 d6 Bb5 Be6',
      arrows: [{ from: 'f1', to: 'c6', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }],
      say:
        "Black challenges with d6; we pin the c6-knight with Bb5. Here's the middlegame plan: take on c6 to give Black doubled, weak queenside pawns, then play on the big e5-d4 centre and those permanent targets. Castle, bring the rooks to the c- and d-files, and grind. The Ponziani is offbeat — but the resulting position is pure, clean pressure.",
      sayShort: 'Bb5 — pin, then double the pawns.',
    }),
  ],
};

// ── 3…d5 Central Counter — Qa4 pin, grab the pawn, consolidate ──
const D5_COUNTER: LessonScript = {
  openingId: 'pro-gothamchess-ponziani',
  title: 'Ponziani — 3…d5 Central Counter',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'qa4',
      moves: 'e4 e5 Nf3 Nc6 c3 d5 Qa4',
      arrows: [{ from: 'd1', to: 'a4', color: VIS }],
      highlights: [{ square: 'a4', color: KEY }, { square: 'c6', color: SOFT }],
      say:
        "Black hits the centre at once with d5 — the principled challenge. Our answer is the clever Qa4, pinning the c6-knight to Black's king down the diagonal and adding a defender to the e4-pawn. One move that both attacks and defends.",
      sayShort: 'Qa4 — pin the c6-knight.',
    }),
    b({
      id: 'grab',
      moves: 'e4 e5 Nf3 Nc6 c3 d5 Qa4 Nf6 Nxe5 Bd6 Nxc6 bxc6',
      arrows: [{ from: 'f3', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'c6', color: SOFT }],
      say:
        "We cash in: Nxe5 wins the e5-pawn, and after Black develops we trade on c6, leaving Black with doubled, damaged queenside pawns. We're a clean pawn up. Black gets some development and open lines in return — this is a sharp, double-edged fight, not a free lunch.",
      sayShort: 'Nxe5 — a pawn up, but sharp.',
    }),
    b({
      id: 'mg-consolidate',
      moves: 'e4 e5 Nf3 Nc6 c3 d5 Qa4 Nf6 Nxe5 Bd6 Nxc6 bxc6 d3 O-O Be2 Re8 Nd2',
      highlights: [{ square: 'd3', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "Now the key phase: consolidation. We play the solid d3 to anchor e4, develop the bishop to e2, and bring the knight to d2 to untangle. Black has activity for the pawn, so we don't get greedy — we just complete development, blunt his initiative, and emerge a pawn up in the middlegame. Hold the line, and the extra pawn tells in the long run.",
      sayShort: 'd3, Be2, Nd2 — consolidate the pawn.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_PONZIANI_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-ponziani::Main Line 3...Nf6 4.d4': MAIN,
  'pro-gothamchess-ponziani::3...d5 Central Counter': D5_COUNTER,
};
