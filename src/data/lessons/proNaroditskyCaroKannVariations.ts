import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky Caro-Kann — per-variation lessons. Each tab on the
// OpeningDetailPage routes to its own beat lesson via
// VARIATION_LESSONS[`${openingId}::${variation.name}`]. Variation
// names MUST match what's in pro-repertoires.json `variations[].name`.
//
// All spines are extracted from Naroditsky's actual game tree
// (data/sources/danielnaroditsky-trees/caro-kann.json) — the
// "continuation" array of each top-ranked variation off the main spine.
// Both `say` (full Watch) and `sayShort` (≤8-word Learn cue) authored
// on every beat per CLAUDE.md G5.

const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

// vs 2.Nc3 (Two Knights). His actual spine: e4 c6 Nc3 d5 Nf3 dxe4
// Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2 b5 Bb3 Qc7
const TWO_KNIGHTS: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Two Knights — quiet trades win the position',
  minutes: 4,
  orientation: 'black',
  kind: 'variation',
  sources: ['book:caro-kann', 'https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Variation'],
  beats: [
    b({
      id: 'tk-open',
      moves: 'e4 c6 Nc3 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "White's Nc3 sidesteps the mainlines and bets on a piece game. Our reply is automatic: d5, claim the centre, and let the trades come. The Two Knights is one of those lines where White hopes you'll get cute. Don't.",
      sayShort: '…d5 — claim the centre, no fireworks.',
    }),
    b({
      id: 'tk-trade',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2',
      arrows: [{ from: 'e2', to: 'e4', color: VIS }],
      highlights: [{ square: 'e2', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "Nf3 develops normally, we take on e4, the knight recaptures, and we hit it again with Nf6 — straight development with tempo. White's Qe2 is the only way to keep things tense; it backs the e4-knight and threatens to recapture if we trade.",
      sayShort: '…Nf6 — develop with tempo on the knight.',
    }),
    b({
      id: 'tk-simplify',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2',
      arrows: [{ from: 'c4', to: 'f7', color: ATK }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say:
        "Trade, trade, develop. By move twelve we've reduced the piece count to a manageable middlegame. Bc4 aims at f7 the way it always does, Ne5 is annoying but doesn't actually threaten anything immediate, and we tuck in with e6 to make f7 boring.",
      sayShort: '…e6 — boring f7, equalise.',
    }),
    b({
      id: 'tk-finish',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2 b5 Bb3 Qc7',
      highlights: [{ square: 'b5', color: KEY }, { square: 'c7', color: KEY }],
      say:
        "b5 kicks the bishop to b3 — staring at granite, because b5 now defends c6 and indirectly cramps White's queenside development. Qc7 covers c-file and defends b8 ahead of the rook coming out. Twenty plies in and we're equal with the bishop pair coming. White ran out of useful moves first.",
      sayShort: '…b5 + …Qc7 — bishop pair coming, equal.',
    }),
  ],
};

// vs 2.Nf3 (King's Indian Attack setup). Spine: e4 c6 Nf3 d5 d3 Qc7 Nc3
// dxe4 dxe4 e5 Bc4
const KIA: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'King\'s Indian Attack — patient + principled',
  minutes: 4,
  orientation: 'black',
  kind: 'variation',
  sources: ['book:caro-kann', 'https://www.chess.com/openings/Caro-Kann-Defense'],
  beats: [
    b({
      id: 'kia-open',
      moves: 'e4 c6 Nf3 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "White plays Nf3 and isn't committing to anything yet — could be a KIA, could be a delayed e5. Our answer is the SAME answer: d5, every time. Make White declare.",
      sayShort: '…d5 — make White declare.',
    }),
    b({
      id: 'kia-discourage-e5',
      moves: 'e4 c6 Nf3 d5 d3 Qc7',
      arrows: [{ from: 'c7', to: 'e5', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "d3 from White is the KIA tell — they're playing a system, not a theoretical line. Qc7 is our trick: it discourages e5 (the natural follow-up) because pushing e5 now hits our queen for free attack later. Small move, big restraint.",
      sayShort: '…Qc7 — quietly stop e5.',
    }),
    b({
      id: 'kia-open-centre',
      moves: 'e4 c6 Nf3 d5 d3 Qc7 Nc3 dxe4 dxe4 e5',
      arrows: [{ from: 'e5', to: 'h2', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "Nc3 forces our hand — take on e4, White recaptures with the pawn, and now we play e5 ourselves. The centre opens, our queen on c7 was perfectly placed, and the diagonal toward h2 is suddenly alive. Bc4 from White looks aggressive but it's our move that mattered: we equalised AND took the initiative.",
      sayShort: '…e5 — centre opens, initiative ours.',
    }),
  ],
};

// vs 3.exd5 (Exchange). Spine: e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4 Qb3 Qc7 h3
const EXCHANGE: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Exchange Variation — patience beats symmetry',
  minutes: 4,
  orientation: 'black',
  kind: 'variation',
  sources: ['book:caro-kann', 'https://www.chess.com/openings/Caro-Kann-Defense-Exchange-Variation'],
  beats: [
    b({
      id: 'ex-trade',
      moves: 'e4 c6 d4 d5 exd5 cxd5',
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "White takes on d5 and we recapture with the c-pawn. Now we have a symmetrical pawn structure — d-pawn vs d-pawn, isolated only if we get sloppy. White's hope is that their slightly easier development means an edge. Our job is to develop one tempo faster.",
      sayShort: 'cxd5 — symmetrical; develop faster.',
    }),
    b({
      id: 'ex-develop',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4',
      arrows: [{ from: 'g4', to: 'd1', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }, { square: 'd1', color: SOFT }],
      say:
        "Bd3 and c3 from White is the textbook Exchange setup. We answer with development that bites: Nf6 hits e4-space, and Bg4 develops the problem-bishop straight to an active diagonal. Notice it's pointing through to White's queen on d1 — even without an Nf3 yet, the bishop's pressure is real.",
      sayShort: '…Bg4 — develop the bishop with bite.',
    }),
    b({
      id: 'ex-defend',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4 Qb3 Qc7',
      arrows: [{ from: 'b3', to: 'b7', color: ATK }, { from: 'c7', to: 'b7', color: VIS }],
      highlights: [{ square: 'b7', color: KEY }],
      say:
        "Qb3 is White's only real attempt — pressure b7 and probe. Qc7 covers it casually and prepares to develop the queenside. We've solved every problem White posed in twelve plies, the bishop is OUT, the queen is active, and we're already eyeing a long-term game with the bishop pair if the trade ever comes.",
      sayShort: '…Qc7 — covers b7, finishes development.',
    }),
  ],
};

// vs 3.Nc3 (Classical). Spine: e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5
const CLASSICAL: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Classical — doubled pawns are a wedge, not a weakness',
  minutes: 5,
  orientation: 'black',
  kind: 'variation',
  sources: ['book:caro-kann', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  beats: [
    b({
      id: 'cl-trade',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6',
      highlights: [{ square: 'f6', color: KEY }, { square: 'e8', color: SOFT }],
      say:
        "When White plays Nxf6+ we have a choice: gxf6 (sharper, riskier) or exf6 (Tartakower's recapture, classical). We pick exf6 — yes, our pawns are doubled, but the half-open e-file is now ours, the e5-square is locked down forever, and our king-rook will swing into the game on e8 with check soon.",
      sayShort: '…exf6 — half-open e-file is ours.',
    }),
    b({
      id: 'cl-develop',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2',
      arrows: [{ from: 'd3', to: 'h7', color: ATK }, { from: 'c2', to: 'h7', color: ATK }],
      highlights: [{ square: 'h7', color: SOFT }, { square: 'd6', color: KEY }],
      say:
        "White builds the standard Bd3 + Qc2 battery toward h7. Bd6 from us is perfect: it covers h7 indirectly (the knight on f6 is gone but Bd6 holds the dark squares), prepares castling, and threatens nothing right away — which is exactly the point. The position is solid.",
      sayShort: '…Bd6 — holds the dark squares, prep O-O.',
    }),
    b({
      id: 'cl-counter',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5',
      arrows: [{ from: 'e8', to: 'e2', color: ATK }],
      highlights: [{ square: 'e8', color: KEY }, { square: 'h5', color: KEY }],
      say:
        "Re8+ harasses with check — White's knight comes to e2 (passive), exactly where we wanted it. Now h5 freezes White's intended h-pawn push BEFORE it lands on h4. We've controlled the only file we cared about, dimmed White's only attacking idea, and now we play chess from a position that's officially equal but feels better for us.",
      sayShort: '…Re8+ then …h5 — file ours, attack stopped.',
    }),
  ],
};

// vs 3.f3 (Fantasy). Spine: e4 c6 d4 d5 f3 dxe4 fxe4 e5
const FANTASY: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Fantasy Variation — punish the wasted tempo',
  minutes: 3,
  orientation: 'black',
  kind: 'variation',
  sources: ['book:caro-kann', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  beats: [
    b({
      id: 'fan-open',
      moves: 'e4 c6 d4 d5 f3',
      highlights: [{ square: 'f3', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "f3 — the Fantasy. White is trying to build a massive centre and just intimidate. Don't be intimidated. f3 is a slow move that doesn't develop a piece, doesn't open lines, and weakens the e1-h4 diagonal. Our score in his actual games against this is 75%. Why? Because the refutation is forcing.",
      sayShort: 'f3 — slow, weakening. Refute forcing.',
    }),
    b({
      id: 'fan-strike',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5',
      arrows: [{ from: 'e5', to: 'd4', color: ATK }],
      highlights: [{ square: 'e4', color: SOFT }, { square: 'e5', color: KEY }, { square: 'd4', color: KEY }],
      say:
        "dxe4 opens the file. fxe4 from White and the centre is exposed — and now e5 from us hits d4 directly. White must decide: push d5 and lock the position (giving us a juicy outpost on e5), or trade with dxe5 and accept that their whole opening idea was a wasted tempo. Either way we're already better.",
      sayShort: '…e5 — break the centre, refute the plan.',
    }),
  ],
};

// vs 2.d4 g6 transposition (Modern Defense). Spine: e4 c6 d4 g6 Nc3 Bg7 Nf3 d5
const MODERN: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Modern Defense Transposition — c6 supports d5',
  minutes: 3,
  orientation: 'black',
  kind: 'variation',
  sources: ['book:caro-kann', 'https://en.wikipedia.org/wiki/Modern_Defense'],
  beats: [
    b({
      id: 'mod-fianchetto',
      moves: 'e4 c6 d4 g6 Nc3 Bg7',
      arrows: [{ from: 'g7', to: 'a1', color: VIS }],
      highlights: [{ square: 'g7', color: KEY }, { square: 'a1', color: SOFT }],
      say:
        "Sometimes the cleanest answer to a d4 player who wasn't expecting the Caro is to just fianchetto — get a Modern Defense structure with the c-pawn already on c6. The Bg7 stares down the long diagonal, our king will tuck behind it after castling, and we develop classically into a hybrid setup.",
      sayShort: '…Bg7 — fianchetto, hybrid Caro/Modern setup.',
    }),
    b({
      id: 'mod-d5',
      moves: 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'c6', color: KEY }],
      say:
        "Nf3 from White and now the Caro idea reasserts itself: d5, supported by the c6-pawn. The c6-d5-g7 structure is one of the most solid in chess — pawn chain holding the centre, bishop on the long diagonal, and zero structural weaknesses. White scores 32% against this in his real games for a reason.",
      sayShort: '…d5 — c6 backs it, structure locked.',
    }),
  ],
};

export const PRO_NARODITSKY_CARO_KANN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-caro-kann::Two Knights Variation (2.Nc3)': TWO_KNIGHTS,
  "pro-naroditsky-caro-kann::King's Indian Attack (2.Nf3)": KIA,
  'pro-naroditsky-caro-kann::Exchange Variation (3.exd5)': EXCHANGE,
  'pro-naroditsky-caro-kann::Classical Variation (3.Nc3)': CLASSICAL,
  'pro-naroditsky-caro-kann::Fantasy Variation (3.f3)': FANTASY,
  'pro-naroditsky-caro-kann::Modern Defense Transposition (2.d4 g6)': MODERN,
};
