import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — the Stafford Gambit REFUTATION, WHITE side.
// The Stafford is a notorious trap gambit; Levy's refutation is calm and lethal:
// take the knight, plant the modest d3 + Be2 wall, refuse every cheap tactic, and
// keep the extra pawn. Against Black's …h5 attacking lunge White plays c3/d4,
// grabs the centre and the attack collapses — Stockfish gives White ~+2. The
// lesson walks the 12-ply repertoire spine + the c3/d4 consolidation into a
// clearly-better middlegame (15 plies, G9.3 Gates A-D). Student plays WHITE.
// Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_STAFFORD_REFUTE_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-stafford-refute',
  title: "GothamChess's Stafford Refutation — Take the Pawn, Refuse the Trap",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Petrov%27s_Defence',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6',
      arrows: [{ from: 'c6', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }],
      say:
        "The Stafford Gambit. After we grab the e5-pawn, Black plays Nc6 — offering a whole knight. It's a trap-laden gambit that has won thousands of online games, because the player who accepts it usually has no idea what's coming. Levy's message: there's nothing to fear if you know the refutation.",
      sayShort: 'Nc6 — the knight offer.',
    }),
    b({
      id: 'take',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6',
      highlights: [{ square: 'c6', color: SOFT }],
      say:
        "We take the knight — Nxc6 — and after …dxc6 Black has opened lines and traded a pawn for fast development and tricks. He's down a pawn. The whole gambit rides on us getting greedy or careless next. We won't.",
      sayShort: 'Nxc6 — accept, a pawn up.',
    }),
    b({
      id: 'd3',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3',
      arrows: [{ from: 'd3', to: 'e4', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "The key refutation move: the modest d3. Not d4, not f3 — just d3. It defends e4 solidly, opens the c1-bishop, and gives Black's pieces absolutely nothing to bite on. Every Stafford trap relies on open lines and loose pawns; d3 quietly closes the shop.",
      sayShort: 'd3 — the quiet refutation.',
    }),
    b({
      id: 'be2',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2',
      highlights: [{ square: 'e2', color: SOFT }, { square: 'g4', color: SOFT }],
      say:
        "Black develops the bishop to c5, aiming at f2. We answer with the humble Be2 — and notice WHERE: e2, not c4 or d3, so it covers the g4-square and leaves Black no juicy pin or sacrifice. Levy's refutation is a wall of unglamorous, perfect little moves.",
      sayShort: 'Be2 — cover g4, no targets.',
    }),
    b({
      id: 'h5',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5',
      highlights: [{ square: 'h5', color: SOFT }],
      say:
        "Out of real ideas, Black lunges with h5 — hoping to drag the h-pawn forward and stir up a kingside attack. It looks scary if you've never seen it. It's actually a sign the gambit has failed: Black is throwing wing pawns because his pieces have no targets.",
      sayShort: 'h5 — a desperate lunge.',
    }),
    b({
      id: 'c3',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3',
      arrows: [{ from: 'c3', to: 'd4', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "And here's the answer — c3, preparing d4. We're going to expand in the centre, kick the bishop on c5, and bury Black's whole attack under our own pawns. When the centre is yours, a wing attack with no pieces behind it just bounces off.",
      sayShort: 'c3 — prepare d4.',
    }),
    b({
      id: 'd4',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3 Ng4 d4',
      arrows: [{ from: 'd4', to: 'c5', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say:
        "Black throws the knight to g4; we ignore the noise and play d4, striking the bishop on c5 and seizing the full centre. The knight on g4 hits nothing useful, the bishop has to retreat, and we've reached the middlegame a clean pawn up with a commanding position. The engine calls White close to winning.",
      sayShort: 'd4 — take the centre, a pawn up.',
    }),
    b({
      id: 'mg-summary',
      moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3 Ng4 d4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e4', color: KEY }],
      say:
        "That's the Stafford refuted. The recipe never changes: accept the knight, build the d3 wall, develop with Be2, refuse every sacrifice, and when Black flails with a wing pawn, answer in the centre with c3 and d4. You finish a pawn up with the bigger position and no weaknesses. The most feared gambit on the internet — turned into a free pawn.",
      sayShort: 'centre + extra pawn = refuted.',
    }),
  ],
};
