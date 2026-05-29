import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky Ruy Lopez — variation lessons for his 2,922-game
// Closed Spanish. Covers Berlin, Closed with d3, and Steinitz
// Defenses — the three most-faced Black responses.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'book:ruy-lopez',
  'https://www.chess.com/openings/Ruy-Lopez-Opening',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ============================================================
// Berlin Defense — 955g 58.8% (his lowest-scoring Ruy variation)
// Black plays Nf6 / Nxe4 transposing into the queenless middlegame.
// ============================================================
const BERLIN: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez',
  title: 'Berlin Defense — Carlsen endgame',
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'berlin-open', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6',
      highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say: "3…Nf6 — the Berlin Defense. Instead of …a6 chasing the bishop, Black develops directly and attacks the e4-pawn. The Berlin became famous when Kramnik used it to draw Kasparov in 2000; Carlsen plays it as Black against the world's best.",
      sayShort: '…Nf6 — Berlin.',
    }),
    b({
      id: 'berlin-castle', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O',
      highlights: [{ square: 'g1', color: KEY }, { square: 'e4', color: SOFT }],
      say: "O-O — we castle, offering the e4-pawn. The point: if Black takes …Nxe4 the resulting Berlin Endgame is one we know cold. The opening becomes a structural battle that favours White's patient piece play.",
      sayShort: 'O-O — offer the pawn.',
    }),
    b({
      id: 'berlin-grab', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4',
      highlights: [{ square: 'e4', color: KEY }, { square: 'd4', color: SOFT }],
      say: "…Nxe4 d4 — Black takes the bait, we hit back with d4 attacking the e5-pawn AND the knight on e4. The Berlin Endgame is queued: Black has to take with the d-pawn or knight and we'll trade queens shortly.",
      sayShort: 'd4 — central counter.',
    }),
    b({
      id: 'berlin-nd6', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd6', color: SOFT }],
      say: "…Nd6 Bxc6 dxc6 dxe5 — the trade sequence. Black retreats the knight to d6, we trade the bishop for the c6-knight, and exchange on e5. The position now reaches the Berlin Endgame: queens off, bishop pair for White, doubled c-pawns for Black.",
      sayShort: 'dxe5 — Berlin endgame.',
    }),
    b({
      id: 'berlin-queens', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
      highlights: [{ square: 'd8', color: KEY }],
      say: "…Nf5 Qxd8+ Kxd8 — queens trade, Black's king moves to d8. The famous Berlin Endgame is reached. Material is equal but White's structural edges are clear: better pawn structure (no doubled pawns), bishop pair compensation gone but knight outpost ideas remain.",
      sayShort: 'Kxd8 — Berlin endgame.',
    }),
    b({
      id: 'berlin-rd1', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 Rd1+',
      highlights: [{ square: 'd1', color: KEY }],
      say: "Rd1+ — the rook checks. Black's king has to move (Ke8 most common). From here White's plan is patient: develop pieces, control central files, slowly convert structural pressure. The Berlin Endgame is one of the deepest in chess theory.",
      sayShort: 'Rd1+ — start the squeeze.',
    }),
  ],
};

// ============================================================
// Closed with d3 — 181g 67.1% (anti-Marshall)
// White plays d3 instead of c3 + d4, keeping a small but solid centre.
// ============================================================
const CLOSED_D3: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez',
  title: 'Closed with d3 — quiet anti-Marshall',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd3-open', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 d3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "d3 instead of the usual c3 — Anti-Marshall. The d3 keeps a small central footprint, denies Black's Marshall Attack (…d5 sacrificing a pawn), and signals we want a quiet positional game. Modern Ruy theory loves this for safety against deep theoretical preparation.",
      sayShort: 'd3 — anti-Marshall.',
    }),
    b({
      id: 'd3-b5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3',
      highlights: [{ square: 'b3', color: KEY }],
      say: "…b5 Bb3 — Black expands queenside, we retreat the bishop to b3. The Bb3 keeps the f7-pressure diagonal alive. From here we develop classically: Nbd2, c3, then the central break d4 (later, after preparation).",
      sayShort: 'Bb3 — keep the diagonal.',
    }),
    b({
      id: 'd3-bc5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3 Bc5',
      highlights: [{ square: 'c5', color: KEY }],
      say: "…Bc5 — Black tries an Italian-style development with the bishop active on c5. The position is now positional: both sides develop, both castle (well, White already castled), and the long game decides.",
      sayShort: '…Bc5 — Italian-style.',
    }),
    b({
      id: 'd3-c3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3 Bc5 c3',
      highlights: [{ square: 'c3', color: KEY }],
      say: "c3 — prepare d4 expansion. The c3 also supports the Bb3 (the bishop can retreat to c2 if attacked) and prepares Nbd2. Standard Ruy development; the d4 push is queued.",
      sayShort: 'c3 — prep d4.',
    }),
    b({
      id: 'd3-d4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3 Bc5 c3 d6 Nbd2 O-O h3',
      highlights: [{ square: 'h3', color: KEY }],
      say: "…d6 Nbd2 …O-O h3 — both sides complete development. The h3 prevents …Bg4 pinning our knight and supports a future kingside attack. The position is closed and positional; White's slight structural edge converts patiently.",
      sayShort: 'h3 — finish setup.',
    }),
  ],
};

// ============================================================
// Steinitz Defense — 144g 61.8%
// Black plays ...d6 (Steinitz Deferred) building a solid setup.
// ============================================================
const STEINITZ: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez',
  title: 'Steinitz Defense — classical solid setup',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'st-open', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6',
      highlights: [{ square: 'd6', color: KEY }],
      say: "After 3…a6 4.Ba4, Black plays …d6 — the Steinitz Defense Deferred. Solid, classical, no early central commitment. Black wants to play …Bd7 + …Nf6 + …Be7 + …O-O slowly, then break with …b5 or …f5 once ready.",
      sayShort: '…d6 — Steinitz Deferred.',
    }),
    b({
      id: 'st-c3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 c3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "c3 — prepare the d4 push immediately. Against the Steinitz the classical c3 + d4 plan works well because Black hasn't committed any pieces yet; we can expand the centre first.",
      sayShort: 'c3 — prep d4.',
    }),
    b({
      id: 'st-bd7', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 c3 Bd7',
      highlights: [{ square: 'd7', color: KEY }],
      say: "…Bd7 — Black develops the bishop to d7, freeing the c-file and preparing …g6 or …Nf6 next. The Bd7 is positional but passive; it confirms Black wants the slow game.",
      sayShort: '…Bd7 — passive development.',
    }),
    b({
      id: 'st-d4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 c3 Bd7 d4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "d4! Now we play the central break. The d4 push expands the centre with full support (c3 backs it, the bishop on a4 supports the queenside). After this, Black has tension to resolve.",
      sayShort: 'd4 — central break.',
    }),
    b({
      id: 'st-g6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 c3 Bd7 d4 g6',
      highlights: [{ square: 'g6', color: KEY }],
      say: "…g6 — Black plays the fianchetto setup, preparing …Bg7 and a Steinitz/Pirc hybrid. The …g6 weakens the kingside dark squares but lets Black develop the dark-square bishop actively.",
      sayShort: '…g6 — fianchetto.',
    }),
    b({
      id: 'st-nf6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 c3 Bd7 d4 g6 O-O Bg7 Nbd2',
      highlights: [{ square: 'd2', color: KEY }],
      say: "O-O …Bg7 Nbd2 — both develop, we bring the second knight out. The Nbd2 keeps options open: Nf1-Ng3 reroute toward the kingside, or just Nb3-Nc5 for queenside outposts. The position is balanced but White has the initiative.",
      sayShort: 'Nbd2 — develop, flexible.',
    }),
  ],
};

export const PRO_NARODITSKY_RUY_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-ruy-lopez::Berlin Defense': BERLIN,
  'pro-naroditsky-ruy-lopez::Closed with d3': CLOSED_D3,
  'pro-naroditsky-ruy-lopez::Steinitz Defense': STEINITZ,
};
