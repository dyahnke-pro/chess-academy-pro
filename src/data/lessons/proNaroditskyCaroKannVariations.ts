import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky Caro-Kann — per-variation lessons at FULL G9.1 DEPTH.
// Each variation walks the opening (aggregate spine from his real games
// — game counts cited per ply) + middlegame pattern beat (from games
// at terminus) + endgame structure beat (from how the games actually
// END). Two-register narration on every beat (full `say` + ≤8-word
// `sayShort`). Sources reference the master voice notes corpus at
// data/sources/danielnaroditsky-voice/per-opening/_master-repertoire-
// notes.md (Gordima's Lichess distillation + TheChessLobster
// Tartakower quotes + Listudy principles).

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

const SRC = [
  'book:caro-kann',
  'https://www.chess.com/openings/Caro-Kann-Defense',
  'https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR',
];

// ============================================================
// TWO KNIGHTS (2.Nc3) — his biggest Caro variation, 743 games, R+P
// endgame is the recurring conversion. Spine: 28 plies to move 14.
// ============================================================
const TWO_KNIGHTS: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Two Knights — patient trades + queenside majority',
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: [...SRC, 'https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Variation'],
  beats: [
    // ============ OPENING (8 beats) ============
    b({
      id: 'tk-open',
      moves: 'e4 c6 Nc3 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "Two Knights — Naroditsky's biggest Caro variation, 743 games faced as Black. White's Nc3 sidesteps the d4 mainlines and bets on a piece game. Our reply is automatic: d5 in 676 of his 743 games at this position. The principle: when White plays a system, we still strike in the centre.",
      sayShort: 'd5 — claim the centre, his 92% pick.',
    }),
    b({
      id: 'tk-nf3',
      moves: 'e4 c6 Nc3 d5 Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say:
        "Nf3 — White's most-played reply (376 of 676 games at this position, 56%). The alternative d4 (182 games) transposes to Classical; exd5 (42) just trades. Nf3 is the line where the Two Knights identity actually lives — both knights out, a piece-game ahead.",
      sayShort: 'Nf3 — Two Knights proper.',
    }),
    b({
      id: 'tk-trade',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4',
      highlights: [{ square: 'e4', color: KEY }],
      say:
        "dxe4 — 320 of his 376 games here (85%). The capture forces White's hand and clears the centre. The alternative Bg4 (33 games) pins early; we'll see Bg4 ideas later in this game anyway, but the dxe4 line gives us the cleanest structure.",
      sayShort: 'dxe4 — 85% pick, clear the centre.',
    }),
    b({
      id: 'tk-knight-trade',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6',
      arrows: [{ from: 'f6', to: 'e4', color: ATK }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "Nxe4 from White is forced (the pawn must be recovered). Then Nf6 — 309 of our 320 games at this position. The knight hits the e4-knight with tempo, forcing White to decide: Qe2 supporting, Ng3 retreating, or Nxf6+ trading. All three appear in his games.",
      sayShort: 'Nf6 — hit the e4-knight with tempo.',
    }),
    b({
      id: 'tk-qe2',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2',
      arrows: [{ from: 'e2', to: 'e4', color: VIS }],
      highlights: [{ square: 'e2', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "Qe2 — White's main attempt, 193 of his 309 games at this position. The queen backs the knight and threatens to recapture if we trade. Naroditsky's framing on this kind of position (per his Gordima-summarised speedrun principle): the queen on e2 looks active but commits early — our quiet reply punishes the commitment.",
      sayShort: 'Qe2 — White backs the knight.',
    }),
    b({
      id: 'tk-knight-trade-2',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7',
      arrows: [{ from: 'd7', to: 'f6', color: VIS }, { from: 'd7', to: 'e5', color: VIS }],
      highlights: [{ square: 'd7', color: KEY }, { square: 'f6', color: SOFT }],
      say:
        "Trade-trade-develop. Nxe4, White recaptures with the queen (forced), and now Nd7 — 156 of his 178 games. The knight reroutes to support an eventual Nf6 or Ne5 push. This is his discipline: no fireworks, just clean development with each piece going to its best square.",
      sayShort: 'Nd7 — reroute, prep Nf6/Ne5.',
    }),
    b({
      id: 'tk-bc4',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6',
      arrows: [{ from: 'c4', to: 'f7', color: ATK }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say:
        "Bc4 from White (114 of 156 games) — the bishop activates pointing at f7 as usual. Our Nf6 brings the knight to its natural square. Both pieces now stare at White's centre. The position is calm but tactical resources are everywhere.",
      sayShort: 'Nf6 — both knights on natural squares.',
    }),
    b({
      id: 'tk-deep',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2 b5 Bb3 Qc7',
      highlights: [{ square: 'b5', color: KEY }, { square: 'c7', color: KEY }],
      say:
        "Ne5 from White (85 games), then we tuck with e6 (boring f7 forever), Qe2 from White, and now our key middlegame setup: b5 kicking the bishop to b3 + Qc7 coordinating. This sequence appears in 67 of his games. Twenty plies in, we're equal with the bishop pair coming and White's pieces having nowhere to go.",
      sayShort: 'b5 + Qc7 — Caro middlegame setup.',
    }),
    // ============ MIDDLEGAME (1 beat) ============
    b({
      id: 'tk-middlegame',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2 b5 Bb3 Qc7 d4 Bd6 O-O O-O',
      highlights: [{ square: 'd6', color: KEY }, { square: 'a5', color: SOFT }, { square: 'c5', color: SOFT }],
      say:
        "Move 12-13: d4 + Bd6 — and the middlegame plan from his actual games reveals itself. After we castle, 3 of his 5 deepest games play …a5 (queenside push). 4 of 5 play …c5 (central break). The pattern: queenside expansion FIRST, central break SECOND. This is his middlegame template — and it directly creates the queenside pawn majority that wins the endgame.",
      sayShort: 'Plan: …a5 then …c5 — queenside + centre.',
    }),
    // ============ ENDGAME (1 beat) ============
    b({
      id: 'tk-endgame',
      moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2 b5 Bb3 Qc7 d4 Bd6 O-O O-O',
      highlights: [{ square: 'a5', color: KEY }, { square: 'b5', color: KEY }],
      say:
        "And the punchline: of his 4 decisive Two Knights games that reach a real endgame, 3 of them are R+P endings — typically R+2P vs lone R, won by promoting a queenside pawn. The …a5 + …c5 middlegame plan created the queenside majority, the trades reduced to a clean rook endgame, and the passed a- or b-pawn marches to promote. The opening teaches you the trades; the middlegame teaches you …a5 + …c5; the endgame is just collecting what the first two phases set up.",
      sayShort: 'Endgame: R+P, queenside passer promotes.',
    }),
  ],
};

// ============================================================
// KIA / RÉTI (2.Nf3) — 628 games. He plays it patient, no fireworks.
// Spine 19 plies to move 10. Endgames stay in middlegame territory
// (Q+pieces) — he simplifies to slight-edge positions and grinds.
// ============================================================
const KIA: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: "King's Indian Attack — patient + principled",
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'kia-open',
      moves: 'e4 c6 Nf3 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "KIA setup — 628 of his Caro games against this Nf3 + d3 system. Naroditsky's principle (sourced from his Gordima-distilled blitz repertoire): when White plays a system, we still strike with d5. Make White declare. Don't drift.",
      sayShort: 'd5 — make White declare.',
    }),
    b({
      id: 'kia-d3',
      moves: 'e4 c6 Nf3 d5 d3',
      highlights: [{ square: 'd3', color: KEY }],
      say:
        "d3 — the KIA signature. White isn't going to fight for the centre; they're going to build a system: g3, Bg2, Nbd2, e4 push much later. Our job is to extract the maximum from this slow setup. We have the lead in development; we just need to keep it.",
      sayShort: 'd3 — system play from White.',
    }),
    b({
      id: 'kia-qc7',
      moves: 'e4 c6 Nf3 d5 d3 Qc7',
      arrows: [{ from: 'c7', to: 'e5', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Qc7 — the discreet preemptive move. The queen on c7 quietly discourages e5 (any e5 push hits our queen with tempo, which costs White an attacker later). Small move, big restraint. The whole Caro-Kann is famous for this queen placement.",
      sayShort: 'Qc7 — discreetly stop e5.',
    }),
    b({
      id: 'kia-nc3',
      moves: 'e4 c6 Nf3 d5 d3 Qc7 Nc3',
      highlights: [{ square: 'c3', color: KEY }],
      say:
        "Nc3 from White, finally developing the queen-knight. The position is now both sides almost fully developed without a single exchange. The first to commit gets attacked. White just committed.",
      sayShort: 'Nc3 — White finally develops.',
    }),
    b({
      id: 'kia-trade-open',
      moves: 'e4 c6 Nf3 d5 d3 Qc7 Nc3 dxe4 dxe4 e5',
      arrows: [{ from: 'e5', to: 'h2', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "dxe4, dxe4 (forced — White's e-pawn was hanging), and now the key move: e5. We grab the central space ourselves. Our queen on c7 was perfectly placed. The diagonal from c7 toward h2 is now alive. White's KIA never got off the ground.",
      sayShort: '…e5 — grab space, queen alive.',
    }),
    b({
      id: 'kia-bc4',
      moves: 'e4 c6 Nf3 d5 d3 Qc7 Nc3 dxe4 dxe4 e5 Bc4',
      arrows: [{ from: 'c4', to: 'f7', color: ATK }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say:
        "Bc4 from White, finally activating. It looks aggressive aiming at f7, but f7 is already defended by the king and we have an extra tempo. The position is equal-with-the-initiative for us.",
      sayShort: 'Bc4 — too late, we have the initiative.',
    }),
    // ============ MIDDLEGAME ============
    b({
      id: 'kia-middlegame',
      moves: 'e4 c6 Nf3 d5 d3 Qc7 Nc3 dxe4 dxe4 e5 Bc4 b5 Bb3 h6 a4 b4 Ne2',
      highlights: [{ square: 'b5', color: KEY }, { square: 'h6', color: SOFT }],
      say:
        "Middlegame from his actual games at this position: b5 expanding queenside (claiming b5 forever), h6 making luft for the king and freezing kingside committal moves from White, then a4 from White (forced — must do something), b4 from us, and now White's pieces have nowhere to go. The pattern from 6 of his games at this depth: queenside crawl + kingside containment + slow simplification.",
      sayShort: 'b5/h6/b4 — queenside crawl + kingside lock.',
    }),
    // ============ ENDGAME ============
    b({
      id: 'kia-endgame',
      moves: 'e4 c6 Nf3 d5 d3 Qc7 Nc3 dxe4 dxe4 e5 Bc4 b5 Bb3 h6 a4 b4 Ne2',
      highlights: [{ square: 'b4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Endgame structure: his KIA games typically stay in middlegame territory through the conversion (Q + pieces on the board until close to the end) — he doesn't simplify into pure endgames here because his structural edge is small and trade-heavy simplification gives White equality. Instead the conversion comes from kingside maneuvering and creating weaknesses around White's mostly-dormant Bg2 + Nbd2 setup. Patience wins this opening.",
      sayShort: 'Endgame: keep Q on, maneuver to convert.',
    }),
  ],
};

// ============================================================
// EXCHANGE (3.exd5) — 353 games. Spine 17 plies to move 9. Mixed
// endings (K+P sometimes, middlegame finishes others). The classic
// "symmetrical position with one-tempo edge" Caro line.
// ============================================================
const EXCHANGE: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Exchange — patience beats symmetry',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: [...SRC, 'https://www.chess.com/openings/Caro-Kann-Defense-Exchange-Variation'],
  beats: [
    b({
      id: 'ex-trade',
      moves: 'e4 c6 d4 d5 exd5 cxd5',
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "Exchange Variation — White trades centre pawns, settling for a symmetrical structure where their slightly easier development might give an edge. 353 of his games. He scores 59% here — not as high as Two Knights or Fantasy, but solid. The principle (per his speedrun framing): a symmetrical position is only equal if both sides develop equally. Develop one tempo faster.",
      sayShort: 'cxd5 — symmetrical; we develop faster.',
    }),
    b({
      id: 'ex-bd3',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }],
      say:
        "Bd3 — the textbook Exchange setup. White develops the bishop to its 'best' diagonal, aiming at h7. The problem: it's just one piece, no immediate threats, and our reply commits a piece more usefully.",
      sayShort: 'Bd3 — White develops, no threat yet.',
    }),
    b({
      id: 'ex-nf6',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6',
      arrows: [{ from: 'f6', to: 'e4', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }],
      say:
        "Nf6 — develop and pressure. The knight on f6 keeps the e4-square unavailable to White and prepares Bg4 next move. Notice the pattern: every Caro move develops, every Caro move denies White a square.",
      sayShort: 'Nf6 — develop + deny e4.',
    }),
    b({
      id: 'ex-c3',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3',
      highlights: [{ square: 'c3', color: KEY }],
      say:
        "c3 from White — preparing nothing in particular, just a waiting move that overprotects d4. The slow build continues. We answer with the move the Exchange begs for.",
      sayShort: 'c3 — White waits.',
    }),
    b({
      id: 'ex-bg4',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4',
      arrows: [{ from: 'g4', to: 'd1', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }, { square: 'd1', color: SOFT }],
      say:
        "Bg4 — the move that defines this variation. Even without an Nf3 yet on the board, the bishop on g4 pins through to White's queen and stares down the open diagonal. When White does develop the knight to f3 (or e2), this bishop is RIGHT THERE. Develop with bite.",
      sayShort: 'Bg4 — pin through to the queen.',
    }),
    b({
      id: 'ex-qb3',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4 Qb3',
      arrows: [{ from: 'b3', to: 'b7', color: ATK }],
      highlights: [{ square: 'b3', color: KEY }, { square: 'b7', color: KEY }],
      say:
        "Qb3 — White's only real try. The queen attacks b7 and pressures the queenside. The threat is real (we'd lose a pawn) but the defence is trivial.",
      sayShort: 'Qb3 — White attacks b7.',
    }),
    b({
      id: 'ex-qc7',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4 Qb3 Qc7',
      arrows: [{ from: 'c7', to: 'b7', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }],
      say:
        "Qc7 — covers b7 casually, prepares queenside development. We've now developed three pieces (Nf6 + Bg4 + Qc7), White has developed two (Bd3 + Qb3) and a pawn (c3). Our development edge is real. The opening is over; we're better.",
      sayShort: 'Qc7 — covers b7, lead in development.',
    }),
    // ============ MIDDLEGAME ============
    b({
      id: 'ex-middlegame',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4 Qb3 Qc7 h3 Bh5',
      highlights: [{ square: 'h5', color: KEY }],
      say:
        "Middlegame plan from his games: White typically plays h3 challenging our bishop, and the standard retreat is Bh5 — keeping the diagonal alive for now. From here our typical maneuvering is …e6, …Nbd7, …Bd6, castle, and a slow grind on the open c-file. His pattern across these games: the bishop pair if the Bg4 ever trades for a knight, and we win the endgame through structural advantage.",
      sayShort: 'Bh5 — keep the diagonal alive.',
    }),
    // ============ ENDGAME ============
    b({
      id: 'ex-endgame',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4 Qb3 Qc7 h3 Bh5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'c8', color: SOFT }],
      say:
        "Endgame structure: of his Exchange games that reach a real ending, the pattern is K+P or pure rook endings with HIM having an isolated d-pawn that's actually a STRENGTH not a weakness — the d5-pawn is passed once the c-file opens. The conversion: rook to c-file, queens off, push the d-pawn. The Exchange isn't dangerous for Black; it's tedious for White.",
      sayShort: 'Endgame: K+P or R+P, d-pawn passes.',
    }),
  ],
};

// ============================================================
// CLASSICAL (3.Nc3) — 235 games. Spine 23 plies to move 12. The
// Tartakower 4...Nf6 is the main line. Multi-ending data (4
// different endgame types) — Naroditsky's structural play is
// versatile here. Per TheChessLobster: he calls Bd6 "a very
// natural developing move" 3 times in his Tartakower coverage.
// ============================================================
const CLASSICAL: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: "Classical Caro-Kann (Tartakower)",
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: [...SRC, 'https://thechesslobster.substack.com/p/opening-highlight-1-the-power-of'],
  beats: [
    b({
      id: 'cl-open',
      moves: 'e4 c6 d4 d5 Nc3 dxe4',
      highlights: [{ square: 'e4', color: KEY }],
      say:
        "Classical Caro-Kann — White plays Nc3 supporting the e4-pawn. We take with dxe4, forcing the recapture and trading off the central tension. Naroditsky scores 62% across his 235 games at this position — a respectable mainline win-rate.",
      sayShort: 'dxe4 — force the recapture.',
    }),
    b({
      id: 'cl-knight-recapture',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6',
      arrows: [{ from: 'f6', to: 'e4', color: ATK }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "Nxe4 (forced), and now the key move: Nf6 — the Tartakower Variation. The knight challenges the e4-knight directly. White has TWO responses: Nxf6+ doubling our pawns (the topic of this lesson), or Ng3 retreating. The Tartakower with the doubled f-pawns is what 80%+ of his games take.",
      sayShort: 'Nf6 — Tartakower, dare the trade.',
    }),
    b({
      id: 'cl-nxf6',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6',
      highlights: [{ square: 'f6', color: KEY }, { square: 'e8', color: SOFT }],
      say:
        "Nxf6+, and we recapture with exf6 — accepting the doubled f-pawns. Per Naroditsky's framing on this exact position: the doubled f-pawns aren't a weakness, they're the structural cost of getting the half-open e-file, the central control, and a free e8 for our rook. Trade looks-like-bad for structurally-better.",
      sayShort: 'exf6 — accept the doubled pawns.',
    }),
    b({
      id: 'cl-bd6',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6',
      arrows: [{ from: 'd6', to: 'h2', color: VIS }],
      highlights: [{ square: 'd6', color: KEY }],
      say:
        "c3 from White, then Bd6 from us. Naroditsky calls this 'a very natural developing move' — and in one of his Tartakower games he repeats that phrase THREE TIMES to drive the point home. The bishop on d6 covers h2 indirectly, holds the dark squares, prepares castling, and looks innocent but is doing four jobs at once. The 'natural developing move' framing is his.",
      sayShort: 'Bd6 — a very natural developing move.',
    }),
    b({
      id: 'cl-development',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2',
      arrows: [{ from: 'd3', to: 'h7', color: ATK }, { from: 'c2', to: 'h7', color: ATK }],
      highlights: [{ square: 'h7', color: SOFT }],
      say:
        "Bd3 + Qc2 — White builds the classic battery aiming at h7. It looks dangerous but our setup defends it: the Bd6 covers indirect mate-threats, and we've already castled. The position is solid; what's left is the counter.",
      sayShort: 'Bd3 + Qc2 — White builds the battery.',
    }),
    b({
      id: 'cl-rook-lift',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+',
      arrows: [{ from: 'e8', to: 'e2', color: ATK }],
      highlights: [{ square: 'e8', color: KEY }],
      say:
        "Re8+ — and here's why the doubled f-pawns were worth it. Our rook leaps to the half-open e-file with check, harassing White's pieces. White must respond (Ne2 is the standard — passive, exactly where we wanted them).",
      sayShort: 'Re8+ — file check.',
    }),
    b({
      id: 'cl-ne2',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2',
      highlights: [{ square: 'e2', color: KEY }],
      say:
        "Ne2 — White's knight comes out passively, blocking the check. Now Naroditsky's per-game commentary (per TheChessLobster's summary): the knight on e2 is BAD. It doesn't do anything useful, and it's a target for our coming maneuvering. We've already won the opening.",
      sayShort: 'Ne2 — passive, target.',
    }),
    b({
      id: 'cl-h5',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5',
      highlights: [{ square: 'h5', color: KEY }, { square: 'h4', color: SOFT }],
      say:
        "h5 — freezing White's intended h-pawn push (h4 would have started a kingside expansion). Our move says: NO. Now White has to play chess. The opening is OVER, and we have a tangible edge: better piece coordination, control of the only open file, and structural soundness despite the doubled pawns.",
      sayShort: 'h5 — freeze the kingside.',
    }),
    // ============ MIDDLEGAME ============
    b({
      id: 'cl-middlegame',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5 O-O Nd7 Re1 Nf8',
      arrows: [{ from: 'd7', to: 'f8', color: VIS }, { from: 'f8', to: 'g6', color: VIS }],
      highlights: [{ square: 'd7', color: KEY }, { square: 'f8', color: KEY }, { square: 'g6', color: SOFT }],
      say:
        "Middlegame template from his Classical/Tartakower games: O-O from White, then Nd7-Nf8-Ng6 reroute — the knight goes to its prize square via f8. From g6 it pressures e5, supports a future f5 push, and threatens Nf4. This is exactly the same knight-reroute pattern from the Advance Variation — but here from a different opening structure. His muscle memory across the Caro variations IS the consistency.",
      sayShort: 'Nd7-f8-g6 reroute — the prize jump.',
    }),
    // ============ ENDGAME ============
    b({
      id: 'cl-endgame',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5',
      highlights: [{ square: 'f5', color: KEY }, { square: 'f6', color: KEY }],
      say:
        "Endgame structures: his Classical games have one of 4 different endings (minor pieces+P, R+minor+P, Q+P, or middlegame finishes) depending on whose attack lands first. The recurring theme: the doubled f-pawns from move 6 BECOME a strength in the endgame — the f6/f5/f4 push creates a passed central pawn while White's structurally-pure pawns have no levers. The opening choice IS the endgame choice.",
      sayShort: 'Endgame: doubled pawns become a passer.',
    }),
  ],
};

// ============================================================
// FANTASY (3.f3) — his HIGHEST-scoring Caro variation, 75% (189
// games). Per Gordima's distillation: his White play of the Fantasy
// is built on "wild positions" — but here he's BLACK, refuting it.
// Spine 14 plies. Sharp.
// ============================================================
const FANTASY: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Fantasy Variation — punish the wasted tempo',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  sources: [...SRC, 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  beats: [
    b({
      id: 'fan-open',
      moves: 'e4 c6 d4 d5 f3',
      highlights: [{ square: 'f3', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "Fantasy Variation. 189 games, 75% score — Naroditsky's BEST score across any Caro variation as Black. f3 from White is the move he himself plays as White against the Caro (per his speedrun framing, it produces 'wild positions'). Today we're refuting it. Don't be intimidated. f3 is a slow move that doesn't develop, weakens the e1-h4 diagonal, and offers us the centre on a plate.",
      sayShort: 'f3 — slow, weakening, refutable.',
    }),
    b({
      id: 'fan-dxe4',
      moves: 'e4 c6 d4 d5 f3 dxe4',
      highlights: [{ square: 'e4', color: KEY }],
      say:
        "dxe4 — the forcing reply. White's centre crumbles. The f3-pawn can recapture (fxe4) but that's the line Black wants: the f-file opens FOR Black, and White's kingside is wrecked from move 4.",
      sayShort: 'dxe4 — force the structural decision.',
    }),
    b({
      id: 'fan-fxe4',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4',
      arrows: [{ from: 'f1', to: 'a6', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'f2', color: SOFT }],
      say:
        "fxe4 — White recaptures, opening the f-file. Now the structural cost of f3 is visible: White's king is exposed (the f2-square is weakening); the e4-pawn is isolated and on an open file; we have the lead in development.",
      sayShort: 'fxe4 — White structure cracked.',
    }),
    b({
      id: 'fan-e5',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5',
      arrows: [{ from: 'e5', to: 'd4', color: ATK }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: KEY }],
      say:
        "e5 — the central counter. Hit the d4-pawn directly. White must decide: push d5 locking the position (giving us a juicy e5-outpost), or trade with dxe5 (accepting that the f3 + fxe4 sequence wasted two tempi). Either way we're better — and the score data confirms it.",
      sayShort: 'e5 — counter the centre.',
    }),
    b({
      id: 'fan-d5',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 d5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "d5 — White locks the position. Our e5-pawn is now safe and the d5-pawn is OUR outpost target. White's pieces have committed too early; ours haven't.",
      sayShort: 'd5 — locked centre, our outpost.',
    }),
    b({
      id: 'fan-bc5',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 d5 Bc5',
      arrows: [{ from: 'c5', to: 'f2', color: ATK }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'f2', color: KEY }],
      say:
        "Bc5 — and now the weakness of f3 becomes a tactical reality. The bishop on c5 aims directly at f2. White can't easily defend without committing more pieces awkwardly. The Fantasy is REFUTED by move 6 in the sharpest lines.",
      sayShort: 'Bc5 — bishop aimed at f2.',
    }),
    // ============ MIDDLEGAME ============
    b({
      id: 'fan-middlegame',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 d5 Bc5 Nf3 Nf6',
      arrows: [{ from: 'f6', to: 'e4', color: ATK }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'f6', color: KEY }],
      say:
        "Middlegame: White finally develops Nf3, and our Nf6 attacks e4 with tempo. The position is sharply tactical and we have piece coordination. His games here are often short (60-80 plies) — the Fantasy collapses quickly when refuted.",
      sayShort: 'Nf6 — develop, hit e4.',
    }),
    // ============ ENDGAME ============
    b({
      id: 'fan-endgame',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 d5 Bc5 Nf3 Nf6',
      highlights: [{ square: 'f2', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Endgame note: his Fantasy games rarely reach a quiet endgame. The 75% score comes from middlegame conversions — sharp tactics around f2, exchange sacrifices on the f-file, or simply better-coordinated pieces leading to direct mating attacks. The 'endgame' for the Fantasy is the post-mate handshake.",
      sayShort: 'Endgame: most games end mid-board.',
    }),
  ],
};

// ============================================================
// MODERN TRANSPOSITION (2.d4 g6) — 185 games. Spine 17 plies to
// move 9. Mixed endings. Fianchetto + …d5 hybrid structure.
// ============================================================
const MODERN: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: "Modern Defense transposition (2.d4 g6)",
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'mod-open',
      moves: 'e4 c6 d4 g6',
      arrows: [{ from: 'g7', to: 'a1', color: VIS }],
      highlights: [{ square: 'g7', color: KEY }, { square: 'a1', color: SOFT }],
      say:
        "Modern Defense transposition — 185 games, 68% score. Sometimes against a d4 player who wasn't expecting the Caro, we fianchetto. The c6-pawn already played turns into a SUPPORT move for the …d5 push and the dark-squared bishop dominates the long diagonal. Naroditsky has a separate Modern Defense repertoire too; this transposition lets us pick which structure to use.",
      sayShort: 'g6 — fianchetto, hybrid structure.',
    }),
    b({
      id: 'mod-nc3',
      moves: 'e4 c6 d4 g6 Nc3',
      highlights: [{ square: 'c3', color: KEY }],
      say:
        "Nc3 from White — the only sensible move. We develop classically and prepare …d5. The c6-pawn is doing double duty: support for the future d5 push, AND defends b5 against any Bb5+ ideas.",
      sayShort: 'Nc3 — White develops normally.',
    }),
    b({
      id: 'mod-bg7',
      moves: 'e4 c6 d4 g6 Nc3 Bg7',
      arrows: [{ from: 'g7', to: 'a1', color: VIS }],
      highlights: [{ square: 'g7', color: KEY }],
      say:
        "Bg7 — the bishop on the long diagonal. This is our most important piece in this variation: it dominates the queenside, supports the future …d5 break, defends our king, and creates tactical threats along the a1-h8 diagonal whenever lines open.",
      sayShort: 'Bg7 — the king of the diagonal.',
    }),
    b({
      id: 'mod-nf3',
      moves: 'e4 c6 d4 g6 Nc3 Bg7 Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say:
        "Nf3 — White completes the kingside development. Both sides now have natural piece placement.",
      sayShort: 'Nf3 — White develops kingside.',
    }),
    b({
      id: 'mod-d5',
      moves: 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d5',
      arrows: [{ from: 'd5', to: 'e4', color: ATK }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'c6', color: KEY }],
      say:
        "d5 — the Caro idea reasserts itself with the fianchetto setup behind it. The c6-d5-g7 pawn-and-bishop structure is one of the most solid in chess: pawn chain holding the centre, Bg7 dominating the long diagonal, our king tucked behind a single move from castling.",
      sayShort: 'd5 — c6 backs it, structure locked.',
    }),
    b({
      id: 'mod-h3',
      moves: 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d5 h3',
      highlights: [{ square: 'h3', color: KEY }],
      say:
        "h3 — White's preventive move (stopping …Bg4 ideas and giving the king-knight an escape from a future …Ng4). Slow, but the Modern Defense IS slow chess. We continue developing.",
      sayShort: 'h3 — preventive.',
    }),
    b({
      id: 'mod-dxe4',
      moves: 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d5 h3 dxe4 Nxe4 Nf6',
      arrows: [{ from: 'f6', to: 'e4', color: ATK }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'f6', color: KEY }],
      say:
        "dxe4, Nxe4, Nf6 — the trade-and-develop sequence. By move 6 we've traded a pawn and developed three pieces (Bg7, Nf6, and the implicit Nc3-development pressure on the queenside).",
      sayShort: 'dxe4 + Nf6 — trade and develop.',
    }),
    // ============ MIDDLEGAME ============
    b({
      id: 'mod-middlegame',
      moves: 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d5 h3 dxe4 Nxe4 Nf6 Nxf6+ exf6',
      highlights: [{ square: 'f6', color: KEY }, { square: 'g7', color: SOFT }],
      say:
        "Middlegame: White trades knights with Nxf6+, we recapture with exf6 (better than gxf6 — keeps the Bg7's diagonal intact). The doubled f-pawns are familiar from the Classical variation; same idea, same plan. The position is balanced with our bishop pair active.",
      sayShort: 'exf6 — keep the Bg7 diagonal.',
    }),
    // ============ ENDGAME ============
    b({
      id: 'mod-endgame',
      moves: 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d5 h3 dxe4 Nxe4 Nf6 Nxf6+ exf6',
      highlights: [{ square: 'g7', color: KEY }, { square: 'c6', color: SOFT }],
      say:
        "Endgame structure: his Modern-transposition games typically reach R+minor+P endings or middlegame finishes. The Bg7 is the conversion piece — once it's working, the rook supports queenside pawn-push, and the doubled f-pawns become irrelevant. The structural conversion: Bg7 + queenside majority + active rook.",
      sayShort: 'Endgame: Bg7 + queenside majority.',
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
