import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky KID — per-variation lessons at FULL G9.1 DEPTH.
// Each variation walks the aggregate spine from his real chess.com
// games (4,432 KID games as Black, 65.0% score, his most-played Black
// opening). Spine PGNs are pulled from data/sources/danielnaroditsky-deep/
// kid-<variation>.json. Narration is hand-authored grounded in the
// consensus KID understanding (counter-attack opening, Bg7 as the
// anchor piece, Mar del Plata kingside race, Bronstein/Panno queenside
// expansion vs Sämisch, etc.) plus the data fingerprint per variation.
// No move is invented — every continuation is what the data shows.

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
  'https://www.chess.com/openings/Kings-Indian-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ============================================================
// Classical Mainline (Be2 Mar del Plata) — 715 games, his most-played
// KID setup as Black. Spine 30 plies. R+min+P endgame 26.4% of
// decisive games; Q+P 14.5%.
// ============================================================
const CLASSICAL_MAINLINE: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "Classical Mar del Plata — Be2 mainline",
  minutes: 12,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'cm-kid-setup', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6',
      highlights: [{ square: 'g7', color: KEY }, { square: 'd6', color: SOFT }],
      say: "The universal King's Indian setup. We let White build the broad c4-d4-e4 centre and answer with the fianchetto: g6, Bg7. The Bg7 is the most important piece on the board — every plan we have for the next 30 moves keeps this bishop alive and aimed down the long diagonal.",
      sayShort: 'KID setup — Bg7 is everything.',
    }),
    b({
      id: 'cm-castle', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O',
      highlights: [{ square: 'g8', color: KEY }, { square: 'f3', color: SOFT }],
      say: "White develops Nf3 and we castle short. The king tucks in behind the fianchetto where our most important piece is also our king's roof — the same square that defends g7 also defends the king. Now we're ready for the central strike that defines the opening.",
      sayShort: 'O-O — king safe behind Bg7.',
    }),
    b({
      id: 'cm-e5-strike', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Be2 — White's Classical setup. And now e5! This is the KID's defining moment. We challenge the centre directly and force White to decide: trade with dxe5, push d5 locking the position, or castle and keep tension. Every KID middlegame is shaped by White's answer to this question.",
      sayShort: '…e5 — the KID strike.',
    }),
    b({
      id: 'cm-oo-exd4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "White castles and we trade …exd4. This is the Mar del Plata mainline — Black opens the position and accepts a centralised White knight on d4 in exchange for piece activity and a clear plan. The d-file opens for our rook lift coming next.",
      sayShort: '…exd4 — open the position.',
    }),
    b({
      id: 'cm-rook-lift', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8',
      highlights: [{ square: 'e8', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Nxd4 Re8 — and now we have the Mar del Plata. The rook lifts to e8 hitting the e4-pawn with tempo, forcing White into the prophylactic f3 setup. From here the game becomes a race: Black's kingside attack versus White's queenside expansion.",
      sayShort: '…Re8 — hit e4 with tempo.',
    }),
    b({
      id: 'cm-f3-nc6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6',
      highlights: [{ square: 'f3', color: KEY }, { square: 'c6', color: SOFT }],
      say: "White's f3 defends the e4-pawn and supports the centre — but f3 also blocks the natural Bg5 / Bg4 development squares for the bishop, and weakens the diagonal toward the king. Our …Nc6 hits the d4-knight and prepares the kingside knight reroute.",
      sayShort: 'f3 …Nc6 — prep the reroute.',
    }),
    b({
      id: 'cm-knight-reroute', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5',
      highlights: [{ square: 'h5', color: KEY }, { square: 'f4', color: SOFT }],
      say: "Be3 develops and now …Nh5 begins the signature Mar del Plata reroute. The knight is heading for f4 — the prize square where it hits the Be2, the g2-pawn, AND the centre simultaneously. Every classical KID treatment runs through this knight's trip.",
      sayShort: '…Nh5 — knight heads for f4.',
    }),
    b({
      id: 'cm-nf4-outpost', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4',
      highlights: [{ square: 'f4', color: KEY }, { square: 'e2', color: SOFT }, { square: 'g2', color: SOFT }],
      say: "Qd2 …Nf4! The knight lands on the prize square. From f4 it hits the Be2 and pressures g2 — White is forced to react. This is the Mar del Plata's most iconic moment, the position where the kingside race begins in earnest.",
      sayShort: '…Nf4 — prize square reached.',
    }),
    b({
      id: 'cm-trade-down', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4 Bxf4 Nxd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "Bxf4 trades White's dark-square bishop for our knight, and we recapture …Nxd4 grabbing the centralised White knight. We've come out of the trades with structural gains: we removed White's best dark-square attacker AND won a piece battle on d4.",
      sayShort: '…Nxd4 — win the central trade.',
    }),
    b({
      id: 'cm-c5-break', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4 Bxf4 Nxd4 Bd3 c5',
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Bd3 develops the second bishop and we play …c5 — securing the knight outpost AND clamping White's queenside expansion. The Mar del Plata's central knight is now permanently anchored on d4 and Black has equal piece activity with the bishop pair coming back into the game.",
      sayShort: '…c5 — secure the outpost.',
    }),
    b({
      id: 'cm-bishop-trade', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4 Bxf4 Nxd4 Bd3 c5 Bh6 Be6',
      highlights: [{ square: 'h6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "White offers the dark-square bishop trade with Bh6, hoping to remove our most important piece. We don't object — but we delay by developing …Be6 first, getting the light-square bishop active. The trade is coming, but on our terms with both bishops developed.",
      sayShort: '…Be6 — develop before the trade.',
    }),
    b({
      id: 'cm-endgame-transition', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4 Bxf4 Nxd4 Bd3 c5 Bh6 Be6 Bxg7 Kxg7',
      highlights: [{ square: 'g7', color: KEY }],
      say: "Bxg7 Kxg7 — the bishop trade happens and the king recaptures. We've reached the transition from middlegame to endgame: open centre, active pieces, knight outpost on d4. The R+minor+P endgame ends 26.4% of decisive Classical games and Black's structure consistently outperforms here.",
      sayShort: '…Kxg7 — endgame transition.',
    }),
  ],
};

// ============================================================
// Fianchetto (g3) — 316 games. Mirror fianchetto vs the long
// diagonal. Spine 22 plies through Yugoslav queenside plan.
// R+min+P 29.4% / Q+P 14.3% of decisive games.
// ============================================================
const FIANCHETTO: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "Fianchetto Variation — g3 mirror fianchetto",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'fia-open', moves: 'd4 Nf6 c4 g6 g3',
      highlights: [{ square: 'g3', color: KEY }],
      say: "g3 — White refuses the classical c4-d4-e4 centre and prepares a mirror fianchetto with Bg2. This is the most positional KID treatment. White's bishop on g2 will neutralise our Bg7's long diagonal, so we need a different middlegame plan than the Mar del Plata kingside storm.",
      sayShort: 'g3 — mirror fianchetto.',
    }),
    b({
      id: 'fia-bg7', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O',
      highlights: [{ square: 'g2', color: SOFT }, { square: 'g8', color: KEY }],
      say: "Bg7 Bg2 O-O — both sides complete the fianchetto and we castle. The position is symmetric on the kingside, which means the centre and queenside will decide the game. The Yugoslav plan begins next: Nbd7 supporting e5 and preparing the Qa5 / b5 queenside expansion.",
      sayShort: 'O-O — castle, plan brewing.',
    }),
    b({
      id: 'fia-nc3-d6', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7',
      highlights: [{ square: 'd7', color: KEY }, { square: 'd6', color: SOFT }],
      say: "Nc3 d6 Nf3 Nbd7 — standard development. The Nbd7 placement keeps the c-pawn flexible (no Nc6 blocking c-file expansion) and supports the coming …e5 break. Black is setting up the Yugoslav structure: e5 strike, then queenside maneuvers.",
      sayShort: '…Nbd7 — keep options open.',
    }),
    b({
      id: 'fia-e5', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "O-O …e5 — the central strike. White castles and Black plays the classical KID break — 74% of games at this position go for e5. The Bg2 doesn't actively defend the centre, so e5 is fully supported and challenges White's structure head-on.",
      sayShort: '…e5 — challenge the centre.',
    }),
    b({
      id: 'fia-c6', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "e4 …c6 — White claims the centre with e4, but the c4-e4 pawn duo has a problem: the d5-square needs defending. Our …c6 supports d5 forever and prepares the queenside expansion …Qa5 + …b5. 42% pick at this ply.",
      sayShort: '…c6 — support d5, prep queenside.',
    }),
    b({
      id: 'fia-qa5', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6 h3 Qa5',
      highlights: [{ square: 'a5', color: KEY }, { square: 'c3', color: SOFT }],
      say: "h3 …Qa5 — the queen activates! 32% pick at ply 18. From a5 the queen hits the Nc3, eyes the a-file toward White's queenside, and supports the coming …b5 push. This is the Yugoslav signature: a counter-attacking queen positioned for the queenside fight.",
      sayShort: '…Qa5 — queen counterattacks.',
    }),
    b({
      id: 'fia-exd4', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6 h3 Qa5 Be3 exd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "Be3 …exd4 — White completes development and Black opens the central files. 27% pick at ply 20. The exchange opens the e-file for our rook and removes White's central pawn duo, leaving an unbalanced position where our queenside plan is in full motion.",
      sayShort: '…exd4 — open the centre.',
    }),
    b({
      id: 'fia-rook-lift', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6 h3 Qa5 Be3 exd4 Nxd4 Re8',
      highlights: [{ square: 'e8', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Nxd4 …Re8 — the rook lift hits the e4-pawn. We've reached the Yugoslav middlegame position: queen active on a5, knights coordinated on d7/f6, rook loaded on e8, bishop pair preserved. From here our queenside plan converts in the R+min+P endgame 29.4% of decisive games.",
      sayShort: '…Re8 — Yugoslav middlegame set.',
    }),
  ],
};

// ============================================================
// Anti-KID Nf3 — 592 games. White delays Nc3 by playing Nf3 first,
// keeping fianchetto + Anti-Grünfeld options. Transposes into
// Fianchetto-Yugoslav structures. R+min+P 23.3% / Q+P 17.3%.
// ============================================================
const ANTI_KID_NF3: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "Anti-KID with Nf3 first — flexible move order",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'akn-open', moves: 'd4 Nf6 c4 g6 Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say: "Nf3 before Nc3 — White's flexible move order, refusing to commit the c-knight yet. The point is to keep options open for an Anti-Grünfeld or a Fianchetto setup. We don't change our plan: Bg7, d6, castle, then react to whatever centre White builds.",
      sayShort: 'Nf3 — flexible move order.',
    }),
    b({
      id: 'akn-fianchetto', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6',
      highlights: [{ square: 'g2', color: SOFT }, { square: 'g7', color: KEY }],
      say: "Bg7 g3 O-O Bg2 d6 — White commits to the Fianchetto and we transpose into the same structure as the g3 mainline, just with a different move order. The same Yugoslav plan applies: …Nbd7 + …e5 + …c6 + …Qa5 + …b5.",
      sayShort: 'Bg2 …d6 — transpose to Fianchetto.',
    }),
    b({
      id: 'akn-castle', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'd7', color: KEY }],
      say: "O-O …Nbd7 — both kings castled, we develop the knight to d7. This is the standard Yugoslav developing scheme, exactly mirroring the Fianchetto Variation's setup. The position is the same; the move order is the only difference.",
      sayShort: '…Nbd7 — Yugoslav setup.',
    }),
    b({
      id: 'akn-e5-strike', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Nc3 …e5 — White finally develops the queen knight and we strike the centre. 54% pick at this ply. The Anti-KID line has now fully transposed into the Fianchetto Yugoslav, and Black gets the same central counter-attack as in the g3 mainline.",
      sayShort: '…e5 — central strike.',
    }),
    b({
      id: 'akn-c6', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "e4 …c6 — White claims the centre, Black supports the d5-square. Same Yugoslav theme as the Fianchetto: …c6 fixes d5, prepares queenside expansion, and lets the queen come to a5. 23% pick at ply 16.",
      sayShort: '…c6 — support d5.',
    }),
    b({
      id: 'akn-qa5', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qa5',
      highlights: [{ square: 'a5', color: KEY }],
      say: "h3 …Qa5 — same Yugoslav queen sortie. 16% pick at ply 18. The queen on a5 activates the queenside, eyes the c3-knight, and supports the …b5 push. Black has reached his ideal Yugoslav middlegame setup regardless of White's move order.",
      sayShort: '…Qa5 — queen activates.',
    }),
    b({
      id: 'akn-exd4', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qa5 Re1 exd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "Re1 …exd4 — White's rook lift to e1 supports the centre, we open the position with …exd4. The e-file is now half-open in our favour, and the position resolves toward the same middlegame structure as the Fianchetto mainline.",
      sayShort: '…exd4 — open the file.',
    }),
    b({
      id: 'akn-middlegame', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qa5 Re1 exd4 Nxd4 Re8',
      highlights: [{ square: 'e8', color: KEY }],
      say: "Nxd4 …Re8 — the rook lift hits e4 and we have the full Yugoslav middlegame. Same structure as the Fianchetto: active queen, coordinated knights, rook on e-file, bishop pair preserved. The R+min+P endgame converts 23.3% of decisive games.",
      sayShort: '…Re8 — middlegame set.',
    }),
  ],
};

// ============================================================
// Makogonov (h3) — 335 games. White's h3 denies …Ng4 / …Nh5 from
// the f3-knight, but doesn't stop …Nh5 from f6 directly. Spine 30
// plies. R+min+P 25.8% / Q+P 14.8%.
// ============================================================
const MAKOGONOV: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "Makogonov — h3 to stop ...Nh5",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'mak-open', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3',
      highlights: [{ square: 'h3', color: KEY }, { square: 'g4', color: SOFT }, { square: 'h5', color: SOFT }],
      say: "h3 — Makogonov's Variation. White denies the …Ng4 attack on a future Nf3-knight AND prepares an eventual g4 expansion. The prophylaxis comes at a cost: White spends a tempo on an edge pawn, which buys us time to set up our own structure.",
      sayShort: 'h3 — prophylactic move.',
    }),
    b({
      id: 'mak-oo-c6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "O-O Be3 …c6 — we castle, White develops Be3, and Black plays the c6 setup. The …c6 supports d5 and prepares the Nbd7-Nc5 reroute. Against Makogonov we can't rely on the classical Mar del Plata Nh5-Nf4 plan as our first option, so the c6 setup becomes our default.",
      sayShort: '…c6 — solid setup.',
    }),
    b({
      id: 'mak-na6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'c5', color: SOFT }],
      say: "Nf3 …Na6 — 50% pick at ply 14. The knight develops to the rim with a purpose: from a6 it heads to c5, hitting e4 and the dark squares. This is the Makogonov reroute that bypasses White's blocked kingside.",
      sayShort: '…Na6 — knight heads for c5.',
    }),
    b({
      id: 'mak-e5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "Be2 …e5 — the central strike lands. 28% pick at ply 16. The Bg7 is finally aimed at the centre with full support: …e5 challenges the d4 pawn and forces White into a key decision — close the centre with d5 or accept the trade.",
      sayShort: '…e5 — strike the centre.',
    }),
    b({
      id: 'mak-d5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5 d5 Nh5',
      highlights: [{ square: 'd5', color: SOFT }, { square: 'h5', color: KEY }],
      say: "d5 …Nh5! — White closes the centre AND we get the kingside reroute anyway. 18% pick at ply 18. The h3 stops …Ng4 from Nf3 but doesn't prevent …Nh5 from f6 directly. The Mar del Plata kingside attack pattern is back on the table.",
      sayShort: '…Nh5 — reroute still possible.',
    }),
    b({
      id: 'mak-castle', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5 d5 Nh5 O-O Nf4',
      highlights: [{ square: 'f4', color: KEY }, { square: 'e2', color: SOFT }],
      say: "O-O …Nf4 — White castles, our knight lands on the prize square. From f4 it hits the Be2 and pressures the kingside, the same theme as the Classical Mar del Plata. The position has transformed into a known good middlegame for Black.",
      sayShort: '…Nf4 — prize square.',
    }),
    b({
      id: 'mak-c6-break', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5 d5 Nh5 O-O Nf4 Re1 Nxe2+ Rxe2 c5',
      highlights: [{ square: 'c5', color: KEY }],
      say: "Re1 …Nxe2+ Rxe2 …c5 — we trade the knight for the bishop AND secure the queenside outpost. 21% pick at ply 20. White's structure is now compromised: the rook is awkwardly placed on e2, our pieces have clean squares, and the c5 wedge prepares the …f5 break.",
      sayShort: '…c5 — secure the queenside.',
    }),
    b({
      id: 'mak-f5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5 d5 Nh5 O-O Nf4 Re1 Nxe2+ Rxe2 c5 Qd2 f5',
      highlights: [{ square: 'f5', color: KEY }],
      say: "Qd2 …f5! — the kingside pawn storm launches. Once the centre is locked by d5, the …f5 break is Black's main resource — it opens lines toward White's king and creates threats faster than White's queenside expansion can produce. The KID's signature attack.",
      sayShort: '…f5! — kingside storm.',
    }),
  ],
};

// ============================================================
// Sämisch (f3) — 292 games. White's f3 stops ...Ng4 / ...Nh5 AND
// prepares Be3 / Qd2 / O-O-O for a kingside storm. Black's reply is
// the Bronstein/Panno queenside plan: a6 + b5. R+min+P 29.7% / Q+P 14.5%.
// ============================================================
const SAEMISCH: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "Sämisch — f3 with kingside storm prep",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'sae-open', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3',
      highlights: [{ square: 'f3', color: KEY }, { square: 'g4', color: SOFT }, { square: 'h5', color: SOFT }],
      say: "f3 — the Sämisch Variation. White denies …Ng4 AND …Nh5 (the f3-pawn covers BOTH squares) AND prepares Be3 + Qd2 + O-O-O for a kingside pawn storm against our king. We can't fight on the kingside here, so the entire game shifts to the queenside.",
      sayShort: 'f3 — Sämisch attack setup.',
    }),
    b({
      id: 'sae-oo-a6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "O-O Be3 …a6 — 43% pick at ply 14. This is the Bronstein/Panno plan: prepare …b5 to fight on the queenside before White's kingside attack lands. The …a6 also denies White's Nb5 possibilities and prepares …Nbd7-b6 or …c5.",
      sayShort: '…a6 — Panno queenside plan.',
    }),
    b({
      id: 'sae-c5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5',
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Qd2 …c5 — Black hits the centre directly. 17% pick at this ply. The …c5 challenges d4 while White is still developing for the storm. If White takes (dxc5), we get a passed d-pawn AND the position simplifies before the attack reaches us.",
      sayShort: '…c5 — counter the centre.',
    }),
    b({
      id: 'sae-nge2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6',
      highlights: [{ square: 'e2', color: SOFT }, { square: 'c6', color: KEY }],
      say: "Nge2 …Nc6 — White completes the Sämisch setup (Nge2 keeps the c1-h6 diagonal open for the bishop) and we develop the knight hitting d4. The position is balanced: White prepares the storm, Black prepares the counter-attack.",
      sayShort: '…Nc6 — hit d4.',
    }),
    b({
      id: 'sae-rd1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6 Rd1 cxd4 Nxd4',
      highlights: [{ square: 'd1', color: SOFT }, { square: 'd4', color: KEY }],
      say: "Rd1 …cxd4 Nxd4 — trade sequence begins. White's rook lift to d1 supports the d-file, we trade on d4, and the central tension resolves with simplification. Each trade reduces White's attacking material before O-O-O is even possible.",
      sayShort: 'cxd4 Nxd4 — simplify.',
    }),
    b({
      id: 'sae-na5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6 Rd1 cxd4 Nxd4 Nxd4 Bxd4 Be6',
      highlights: [{ square: 'a5', color: SOFT }, { square: 'e6', color: KEY }],
      say: "…Nxd4 Bxd4 …Be6 — both knights trade off, White's dark-square bishop recaptures, and we develop the light-square bishop to e6 hitting c4. The Sämisch attacking position has been gutted: White doesn't have the pieces left to launch a real kingside storm.",
      sayShort: '…Be6 — bishop on c4-pressure diagonal.',
    }),
    b({
      id: 'sae-rook-coordinate', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6 Rd1 cxd4 Nxd4 Nxd4 Bxd4 Be6 b3 Rc8',
      highlights: [{ square: 'c8', color: KEY }],
      say: "b3 …Rc8 — White defends c4 with the b-pawn and we lift the rook to the c-file. The c-file becomes Black's main artery for active play, hitting c4 with two pieces and preparing more queenside pressure.",
      sayShort: '…Rc8 — load the c-file.',
    }),
    b({
      id: 'sae-endgame', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6 Rd1 cxd4 Nxd4 Nxd4 Bxd4 Be6 b3 Rc8 Be2 Qa5 O-O Nd7 Bxg7 Kxg7',
      highlights: [{ square: 'g7', color: KEY }],
      say: "Be2 …Qa5 O-O …Nd7 Bxg7 …Kxg7 — the final trade lands: White's dark-square bishop comes off, our king recaptures. We've reached the R+min+P endgame structure (29.7% of decisive Sämisch games) with a defused White attack and a coordinated black queenside.",
      sayShort: '…Kxg7 — endgame transition.',
    }),
  ],
};

// ============================================================
// Petrosian / Nge2 — 167 games. White's Nge2 keeps the c1-h6 diagonal
// open for the bishop. Spine 25 plies. Black plays Panno-style a6+b5
// expansion. R+min+P 28.4% / Q+P 14.9%.
// ============================================================
const PETROSIAN_NGE2: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "Petrosian / Nge2 — knight to e2 setup",
  minutes: 9,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'pet-open', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2',
      highlights: [{ square: 'e2', color: KEY }],
      say: "Nge2 — White develops the king's knight to e2 rather than f3, keeping the c1-h6 diagonal open for the bishop and preparing the same Be3 + Qd2 + O-O-O attack setup as the Sämisch. The knight on e2 is awkward but flexible.",
      sayShort: 'Nge2 — flexible setup.',
    }),
    b({
      id: 'pet-oo-c6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "O-O f3 …c6 — 13% pick at ply 14. The c6 setup is the solid response: supports d5, prepares queenside expansion, and keeps the d6-pawn defended. Same Panno theme as the Sämisch.",
      sayShort: '…c6 — solid Panno setup.',
    }),
    b({
      id: 'pet-a6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "Be3 …a6 — 38% pick at ply 14. The classic Bronstein/Panno move order: prepare …b5 to break before White's kingside attack arrives. The …a6 also denies White's Nb5 possibilities.",
      sayShort: '…a6 — Panno move order.',
    }),
    b({
      id: 'pet-c5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5',
      highlights: [{ square: 'b5', color: KEY }, { square: 'c5', color: SOFT }],
      say: "c5 …b5 — 32% pick at ply 16. White pushes the c-pawn trying to lock the queenside, but Black answers with the b5 push regardless. The …b5 hits c4 (which is gone) AND opens the b-file for the rook AND prepares …bxc4 / …b4 wedge ideas.",
      sayShort: '…b5 — queenside expansion.',
    }),
    b({
      id: 'pet-cxd6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5 cxd6 exd6',
      highlights: [{ square: 'd6', color: KEY }],
      say: "cxd6 …exd6 — White takes the c5-d6 trade. The pawn structure now favours Black: open e-file for our rook, central pawn on d6 supported by the c6-pawn, and the bishop on g7 has a clean diagonal toward the queenside.",
      sayShort: '…exd6 — open the e-file.',
    }),
    b({
      id: 'pet-rook-lift', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5 cxd6 exd6 Nf4 Re8',
      highlights: [{ square: 'e8', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Nf4 …Re8 — 16% pick. White redirects the knight to f4 (the prize square for him), we lift the rook to e8 hitting the e4-pawn with tempo. The same structural theme as the Mar del Plata: hit e4, force White to react.",
      sayShort: '…Re8 — hit e4.',
    }),
    b({
      id: 'pet-b4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5 cxd6 exd6 Nf4 Re8 Be2 b4',
      highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: SOFT }],
      say: "Be2 …b4 — the queenside expansion continues. The b4 push hits the c3-knight AND opens lines for the a-rook. White's pieces are getting pushed back across the board.",
      sayShort: '…b4 — push the queenside.',
    }),
    b({
      id: 'pet-nd5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5 cxd6 exd6 Nf4 Re8 Be2 b4 Na4 Nd5',
      highlights: [{ square: 'd5', color: KEY }],
      say: "Na4 …Nd5 — White's knight retreats to the rim, ours lands centrally. The position resolves into a Black middlegame with active pieces, queenside space, and the R+min+P endgame conversion (28.4% of decisive Petrosian games).",
      sayShort: '…Nd5 — central outpost.',
    }),
  ],
};

// ============================================================
// Four Pawns Attack (f4) — 106 games. White's most aggressive setup
// with c4-d4-e4-f4 over-extension. Black undermines with ...e5.
// Spine 22 plies. R+min+P 23.0% / minor+P 12.6%.
// ============================================================
const FOUR_PAWNS: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "Four Pawns Attack — f4 over-extension",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'fp-open', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4',
      highlights: [{ square: 'f4', color: KEY }, { square: 'c4', color: SOFT }, { square: 'd4', color: SOFT }, { square: 'e4', color: SOFT }],
      say: "f4 — the Four Pawns Attack. White's most ambitious setup: c4-d4-e4-f4 forming a giant pawn front. The structure is impressive but vulnerable — every pawn forward is one fewer piece defending it. Our job is to undermine.",
      sayShort: 'f4 — Four Pawns front.',
    }),
    b({
      id: 'fp-oo-e5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "O-O Nf3 …e5 — Black castles and strikes the centre. The …e5 is the only good answer: it challenges the f4-e4-d4 pawn chain at its base. White must decide whether to trade with fxe5, push d5 to close, or maintain tension.",
      sayShort: '…e5 — undermine the chain.',
    }),
    b({
      id: 'fp-fxe5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "fxe5 …dxe5 — the pawn trade simplifies the position. White's pawn front is broken, the e-file opens, and our pieces get central squares to work with. The Four Pawns has lost its main asset.",
      sayShort: 'fxe5 …dxe5 — chain broken.',
    }),
    b({
      id: 'fp-d5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5 d5 c5',
      highlights: [{ square: 'd5', color: SOFT }, { square: 'c5', color: KEY }],
      say: "d5 …c5 — White closes the centre and Black clamps the c-pawn position. The c5 push prepares the …Ne8-Nd6 reroute to the prize square AND fixes the white queenside structure. The position becomes a positional grind that favours active piece play.",
      sayShort: '…c5 — clamp the centre.',
    }),
    b({
      id: 'fp-ne8', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5 d5 c5 Bd3 Ne8',
      highlights: [{ square: 'e8', color: KEY }, { square: 'd6', color: SOFT }],
      say: "Bd3 …Ne8 — 11% pick at ply 18. The knight retreats to e8 with a purpose: it's heading to d6, the prize square in the closed Four Pawns structure. From d6 the knight hits c4, eyes e4 / f5, and supports the kingside attack.",
      sayShort: '…Ne8 — reroute to d6.',
    }),
    b({
      id: 'fp-nd6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5 d5 c5 Bd3 Ne8 O-O Nd6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'c4', color: SOFT }, { square: 'e4', color: SOFT }],
      say: "O-O …Nd6 — White castles, our knight lands. From d6 the knight pressures the c4 and e4 pawns simultaneously, and the c4-c5-d5-e4 pawn chain becomes a target. The Four Pawns's apparent space advantage is now a structural weakness.",
      sayShort: '…Nd6 — outpost the prize square.',
    }),
    b({
      id: 'fp-be3-nd7', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5 d5 c5 Bd3 Ne8 O-O Nd6 Be3 Nd7',
      highlights: [{ square: 'd7', color: KEY }],
      say: "Be3 …Nd7 — the second knight develops from b8 to d7. The Bg7 / Nd6 / Nd7 trio coordinates against the c4-d5 pawns and prepares more queenside pressure. The Four Pawns position has fully reversed — Black has the better pieces and the better plan.",
      sayShort: '…Nd7 — coordinate the pieces.',
    }),
  ],
};

export const PRO_NARODITSKY_KID_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-kid::Classical Mar del Plata (Be2)': CLASSICAL_MAINLINE,
  'pro-naroditsky-kid::Fianchetto Variation (g3)': FIANCHETTO,
  'pro-naroditsky-kid::Anti-KID with Nf3 first': ANTI_KID_NF3,
  'pro-naroditsky-kid::Makogonov (h3)': MAKOGONOV,
  'pro-naroditsky-kid::Sämisch (f3)': SAEMISCH,
  'pro-naroditsky-kid::Petrosian / Nge2': PETROSIAN_NGE2,
  'pro-naroditsky-kid::Four Pawns Attack (f4)': FOUR_PAWNS,
};
