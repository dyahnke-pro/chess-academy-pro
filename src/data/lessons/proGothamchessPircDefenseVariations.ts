import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Pirc Defense, PER-VARIATION Watch lessons.
// Board-accurate, two-register narration (G9.3 Gates A-D). Student = BLACK.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/Pirc-Defense',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

const AUSTRIAN: LessonScript = {
  openingId: 'pro-gothamchess-pirc-defense', title: 'Pirc — Austrian Attack (f4)',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7',
      highlights: [{ square: 'e4', color: SOFT }, { square: 'd4', color: SOFT }, { square: 'f4', color: SOFT }],
      say: "The Pirc against the most aggressive try — the Austrian Attack with f4, grabbing a huge e4-d4-f4 pawn wall. We calmly fianchetto with …Bg7, aiming down the long diagonal. Let White have the space; the bigger that centre gets, the harder it falls when we hit it.",
      sayShort: 'Bg7 — aim at the centre.' }),
    b({ id: 'c5', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Nc6',
      arrows: [{ from: 'c7', to: 'c5', color: VIS }], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We strike — …c5! straight at the base of the centre, the d4-pawn. This is the modern, critical answer to the Austrian: don't sit and get squashed, hit back instantly. White throws in Bb5-check; we block with …Nc6, developing AND adding a second attacker to d4.",
      sayShort: '…c5 + …Nc6 — hit d4 twice.' }),
    b({ id: 'mg-e5', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Nc6 e5 Nd7',
      arrows: [{ from: 'd7', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "White lunges e5; we slide the knight to d7, where it attacks the e5-pawn and eyes c5 and b6. Here's the middlegame: White's pawns look huge but they're overextended, and we're swarming them. The plan is …cxd4 and …dxe5, prying the centre apart so our g7-bishop roars down the long diagonal. The engine calls it dead level — give White the centre, then dismantle it.",
      sayShort: '…cxd4/…dxe5 — tear it down.' }),
  ],
};

const CLASSICAL: LessonScript = {
  openingId: 'pro-gothamchess-pirc-defense', title: 'Pirc — Classical (Nf3 Setup)',
  minutes: 10, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O',
      highlights: [{ square: 'g7', color: KEY }, { square: 'g8', color: SOFT }],
      say: "Against the calm Classical setup — Nf3 and Be2 instead of the f4 storm — the Pirc is comfortable. We fianchetto, castle, and get a sound King's-Indian-style position. White has a space edge; we have the flexible structure and the thematic …e5 break in our pocket.",
      sayShort: 'O-O — solid King\'s-Indian style.' }),
    b({ id: 'nc6', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O Nc6',
      arrows: [{ from: 'b8', to: 'c6', color: VIS }], highlights: [{ square: 'c6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We develop …Nc6, pressuring d4 and e4 and preparing our central break. This is the active Pirc treatment: rather than sit passively, we put a question to White's centre and get ready to open the game for our fianchettoed bishop.",
      sayShort: '…Nc6 — pressure the centre.' }),
    b({ id: 'mg-plan', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O Nc6',
      arrows: [{ from: 'e7', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Here's the middlegame plan. We play …e5, striking at d4 — if White takes, …dxe5 and our pieces flood the centre; if he pushes d5, the knight reroutes to e7 or a5 and we play on the queenside with …c6 and …b5. Either way, the g7-bishop comes alive and we get active, balanced play. The Classical Pirc is easy to play and hard to crack.",
      sayShort: '…e5 — open it for the bishop.' }),
  ],
};

const ATTACK_150: LessonScript = {
  openingId: 'pro-gothamchess-pirc-defense', title: 'Pirc — 150 Attack (Be3 + f3)',
  minutes: 10, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6',
      arrows: [{ from: 'c7', to: 'c6', color: VIS }], highlights: [{ square: 'e3', color: SOFT }, { square: 'c6', color: KEY }],
      say: "The 150 Attack — White sets up Be3 and f3, planning Qd2 and Bh6 to trade our fianchetto bishop, then castle long and storm with h4-h5. We know the antidote: …c6, preparing a queenside pawn avalanche of our own. If it's a race, we want to be running too.",
      sayShort: '…c6 — prepare the queenside race.' }),
    b({ id: 'b5', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 f3 b5',
      arrows: [{ from: 'b7', to: 'b5', color: VIS }], highlights: [{ square: 'b5', color: KEY }],
      say: "…b5! The pawn storm is on. White will throw his h- and g-pawns at our king; we throw our b- and a-pawns at his. In opposite-side-castling races, the fastest attacker wins — and by striking early with …c6 and …b5, we make sure we're not a step behind.",
      sayShort: '…b5 — launch the counter-storm.' }),
    b({ id: 'mg-plan', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 f3 b5 a3 Nbd7 g4 Bg7',
      arrows: [{ from: 'a7', to: 'a5', color: VIS }], highlights: [{ square: 'b4', color: KEY }, { square: 'g7', color: SOFT }],
      say: "White props his queenside with a3 and begins the kingside storm with g4; we develop …Nbd7 and complete the fianchetto with …Bg7. Here's the middlegame: a full-blooded race. Our plan is …a5, …b4 and …a4 to crack open White's king before his pawns reach ours, with the g7-bishop and a rook on the b-file leading the charge. It's sharp and double-edged — exactly the fighting Pirc, and completely sound for Black.",
      sayShort: '…a5/…b4 — win the pawn race.' }),
  ],
};

export const PRO_GOTHAMCHESS_PIRC_DEFENSE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-pirc-defense::Austrian Attack (f4)': AUSTRIAN,
  'pro-gothamchess-pirc-defense::Classical (Nf3 setup)': CLASSICAL,
  'pro-gothamchess-pirc-defense::150 Attack (Be3 + f3)': ATTACK_150,
};
