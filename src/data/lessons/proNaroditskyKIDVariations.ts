import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky KID — per-variation lessons at FULL G9.1 DEPTH.
// Pass A SKELETON build (2026-05-29) per the doctrine split-pass rule:
// every beat carries id/moves/highlights/sources (real, data-derived,
// chess.js-validated) but the `say` and `sayShort` text are TODO
// PLACEHOLDERS pending Pass B narration grounded in the voice corpus
// at data/sources/danielnaroditsky-voice/per-opening/kid.md.
//
// Spine PGNs are pulled from data/sources/danielnaroditsky-deep/
// kid-<variation>.json. Game-count / score numbers come from those
// files + wider-corpus-endgame-kid.mjs output. No move is invented —
// every continuation is what the data shows.

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
// KID setup as Black. Spine 30 plies through Bxg7 Kxg7 endgame
// transition. Endgame: R+min+P 26.4% / Q+P 14.5% / R+P 10.0% of
// decisive games.
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
      say: "TODO Pass B — universal KID setup: d4 Nf6 c4 g6 Nc3 Bg7 e4 d6, Bg7 fianchetto + ...d6 accepts space disadvantage. Anchor to KID consensus framing (counter-attack opening, Bg7 most important piece).",
      sayShort: "TODO — cue for KID universal setup.",
    }),
    b({
      id: 'cm-castle', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O',
      highlights: [{ square: 'g8', color: KEY }, { square: 'f3', color: SOFT }],
      say: "TODO Pass B — Nf3 O-O: Black castles short, prepares ...e5 central strike.",
      sayShort: "TODO — cue for O-O.",
    }),
    b({
      id: 'cm-e5-strike', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "TODO Pass B — Be2 e5: White's Classical setup, Black's central strike. The KID's defining move on move 7.",
      sayShort: "TODO — cue for ...e5 strike.",
    }),
    b({
      id: 'cm-oo-exd4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "TODO Pass B — O-O exd4: both castle, Black trades central pawn. Opens d-file for the rook.",
      sayShort: "TODO — cue for ...exd4.",
    }),
    b({
      id: 'cm-rook-lift', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8',
      highlights: [{ square: 'e8', color: KEY }, { square: 'e4', color: SOFT }],
      say: "TODO Pass B — Nxd4 Re8: White recaptures, Black lifts the rook hitting e4-pawn. Mar del Plata mainline begins.",
      sayShort: "TODO — cue for ...Re8.",
    }),
    b({
      id: 'cm-f3-nc6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6',
      highlights: [{ square: 'f3', color: KEY }, { square: 'c6', color: SOFT }],
      say: "TODO Pass B — f3 Nc6: White defends e4 prophylactically, Black brings knight to c6 hitting d4-knight.",
      sayShort: "TODO — cue for f3 ...Nc6.",
    }),
    b({
      id: 'cm-knight-reroute', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5',
      highlights: [{ square: 'h5', color: KEY }, { square: 'f4', color: SOFT }],
      say: "TODO Pass B — Be3 Nh5: White completes development, Black reroutes the knight toward the prize square f4. The Mar del Plata signature.",
      sayShort: "TODO — cue for ...Nh5 reroute.",
    }),
    b({
      id: 'cm-nf4-outpost', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4',
      highlights: [{ square: 'f4', color: KEY }, { square: 'e2', color: SOFT }, { square: 'g2', color: SOFT }],
      say: "TODO Pass B — Qd2 Nf4: knight lands on the prize square, hits Be2 and g2-pawn simultaneously. The Mar del Plata's most iconic moment.",
      sayShort: "TODO — cue for ...Nf4 outpost.",
    }),
    b({
      id: 'cm-trade-down', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4 Bxf4 Nxd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "TODO Pass B — Bxf4 Nxd4: trade sequence, White surrenders the dark-square bishop, Black grabs the centralised knight.",
      sayShort: "TODO — cue for trade sequence.",
    }),
    b({
      id: 'cm-c5-break', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4 Bxf4 Nxd4 Bd3 c5',
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "TODO Pass B — Bd3 c5: White repositions the bishop, Black secures the knight outpost with c5.",
      sayShort: "TODO — cue for ...c5 break.",
    }),
    b({
      id: 'cm-bishop-trade', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4 Bxf4 Nxd4 Bd3 c5 Bh6 Be6',
      highlights: [{ square: 'h6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "TODO Pass B — Bh6 Be6: White offers the dark-square bishop trade, Black develops the bishop pair onto active squares.",
      sayShort: "TODO — cue for Bh6 ...Be6.",
    }),
    b({
      id: 'cm-endgame-transition', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4 Bxf4 Nxd4 Bd3 c5 Bh6 Be6 Bxg7 Kxg7',
      highlights: [{ square: 'g7', color: KEY }],
      say: "TODO Pass B — Bxg7 Kxg7: the bishop trade lands, King recaptures, and we transition into the R+min+P endgame that ends 26.4% of decisive games here.",
      sayShort: "TODO — cue for ...Kxg7 endgame transition.",
    }),
  ],
};

// ============================================================
// Fianchetto (g3) — 316 games. Spine 22 plies ending in the e5 break +
// Qa5 queenside plan. Endgame: R+min+P 29.4% / Q+P 14.3%.
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
      say: "TODO Pass B — g3: White prepares a mirror fianchetto, refusing the classical c4-d4-e4 centre.",
      sayShort: "TODO — cue for g3.",
    }),
    b({
      id: 'fia-bg7', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O',
      highlights: [{ square: 'g2', color: SOFT }, { square: 'g8', color: KEY }],
      say: "TODO Pass B — Bg7 / Bg2 / O-O: mirror fianchettos, both kings castled. Yugoslav setup begins.",
      sayShort: "TODO — cue for mirror fianchettos.",
    }),
    b({
      id: 'fia-nc3-d6', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7',
      highlights: [{ square: 'd7', color: KEY }, { square: 'd6', color: SOFT }],
      say: "TODO Pass B — Nc3 d6 Nf3 Nbd7: standard development, Black brings the knight to d7 keeping options for e5/Nc5.",
      sayShort: "TODO — cue for ...Nbd7.",
    }),
    b({
      id: 'fia-e5', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "TODO Pass B — O-O e5: the central strike lands at move 7. 74% of his Fianchetto games at this position play e5.",
      sayShort: "TODO — cue for ...e5.",
    }),
    b({
      id: 'fia-c6', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "TODO Pass B — e4 c6: White claims the centre, Black supports the d5-square preparing queenside expansion. 42% pick at this ply.",
      sayShort: "TODO — cue for ...c6.",
    }),
    b({
      id: 'fia-qa5', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6 h3 Qa5',
      highlights: [{ square: 'a5', color: KEY }, { square: 'c3', color: SOFT }],
      say: "TODO Pass B — h3 Qa5: queenside expansion plan begins. 32% pick at ply 18 — the queen hits c3 and prepares b5.",
      sayShort: "TODO — cue for ...Qa5.",
    }),
    b({
      id: 'fia-exd4', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6 h3 Qa5 Be3 exd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "TODO Pass B — Be3 exd4: White completes development, Black opens the e-file. 27% pick at ply 20.",
      sayShort: "TODO — cue for ...exd4.",
    }),
    b({
      id: 'fia-rook-lift', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6 h3 Qa5 Be3 exd4 Nxd4 Re8',
      highlights: [{ square: 'e8', color: KEY }, { square: 'e4', color: SOFT }],
      say: "TODO Pass B — Nxd4 Re8: rook lift hitting e4 — the Yugoslav middlegame is set up. R+min+P 29.4% of decisive endings.",
      sayShort: "TODO — cue for ...Re8.",
    }),
  ],
};

// ============================================================
// Anti-KID Nf3 — 592 games. White plays Nf3 BEFORE Nc3 to keep
// fianchetto options. Spine 22 plies transposing into a fianchetto-
// like Yugoslav structure. Endgame: R+min+P 23.3% / Q+P 17.3%.
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
      say: "TODO Pass B — Nf3: White plays the knight before committing the centre, keeping fianchetto options open.",
      sayShort: "TODO — cue for Nf3 anti-KID.",
    }),
    b({
      id: 'akn-fianchetto', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6',
      highlights: [{ square: 'g2', color: SOFT }, { square: 'g7', color: KEY }],
      say: "TODO Pass B — g3 O-O Bg2 d6: White commits to fianchetto, Black completes development.",
      sayShort: "TODO — cue for fianchetto + ...d6.",
    }),
    b({
      id: 'akn-castle', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'd7', color: KEY }],
      say: "TODO Pass B — O-O Nbd7: standard Yugoslav setup, knight to d7 preparing e5.",
      sayShort: "TODO — cue for ...Nbd7.",
    }),
    b({
      id: 'akn-e5-strike', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "TODO Pass B — Nc3 e5: central strike. 54% pick at this ply.",
      sayShort: "TODO — cue for ...e5.",
    }),
    b({
      id: 'akn-c6', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "TODO Pass B — e4 c6: solid c6 setup supporting d5-square. 23% pick at ply 16.",
      sayShort: "TODO — cue for ...c6.",
    }),
    b({
      id: 'akn-qa5', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qa5',
      highlights: [{ square: 'a5', color: KEY }],
      say: "TODO Pass B — h3 Qa5: same Yugoslav queenside plan as the Fianchetto. 16% pick.",
      sayShort: "TODO — cue for ...Qa5.",
    }),
    b({
      id: 'akn-exd4', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qa5 Re1 exd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "TODO Pass B — Re1 exd4: open the d-file, transition to middlegame.",
      sayShort: "TODO — cue for ...exd4.",
    }),
    b({
      id: 'akn-middlegame', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qa5 Re1 exd4 Nxd4 Re8',
      highlights: [{ square: 'e8', color: KEY }],
      say: "TODO Pass B — Nxd4 Re8: rook lift, position resembles fianchetto Yugoslav. R+min+P 23.3% endgame conversion.",
      sayShort: "TODO — cue for ...Re8 middlegame.",
    }),
  ],
};

// ============================================================
// Makogonov (h3) — 335 games. White plays h3 to prevent ...Ng4 / ...Nh5
// kingside reroutes. Spine 30 plies. Endgame: R+min+P 25.8% / Q+P 14.8%.
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
      say: "TODO Pass B — h3: White's prophylactic move, denies ...Ng4 and ...Nh5 kingside reroutes. Forces Black to find a different plan.",
      sayShort: "TODO — cue for h3 Makogonov.",
    }),
    b({
      id: 'mak-oo-c6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "TODO Pass B — O-O Be3 c6: Black castles + plays the c6 setup supporting d5-square. Knight reroute via Nbd7-c5 is the plan, not Nh5.",
      sayShort: "TODO — cue for ...c6 setup.",
    }),
    b({
      id: 'mak-na6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'c5', color: SOFT }],
      say: "TODO Pass B — Nf3 Na6: 50% pick at ply 14. Knight heads to c5 via a6 — the Makogonov reroute that bypasses the blocked kingside.",
      sayShort: "TODO — cue for ...Na6 reroute.",
    }),
    b({
      id: 'mak-e5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "TODO Pass B — Be2 e5: central strike, 28% pick at ply 16. The e5 fight runs the same as Classical mainline.",
      sayShort: "TODO — cue for ...e5.",
    }),
    b({
      id: 'mak-d5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5 d5 Nh5',
      highlights: [{ square: 'd5', color: SOFT }, { square: 'h5', color: KEY }],
      say: "TODO Pass B — d5 Nh5: White closes the centre and now Black gets the Nh5 reroute (h3 doesn't stop Nh5 from f6 directly — only Ng4 was prevented). 18% pick at ply 18.",
      sayShort: "TODO — cue for ...Nh5 reroute.",
    }),
    b({
      id: 'mak-castle', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5 d5 Nh5 O-O Nf4',
      highlights: [{ square: 'f4', color: KEY }, { square: 'e2', color: SOFT }],
      say: "TODO Pass B — O-O Nf4: White castles, Black lands the prize square. The Mar del Plata pattern repeats here.",
      sayShort: "TODO — cue for ...Nf4.",
    }),
    b({
      id: 'mak-c6-break', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5 d5 Nh5 O-O Nf4 Re1 Nxe2+ Rxe2 c5',
      highlights: [{ square: 'c5', color: KEY }],
      say: "TODO Pass B — Re1 Nxe2+ Rxe2 c5: knight trade + queenside break. 21% pick at ply 20.",
      sayShort: "TODO — cue for ...c5 break.",
    }),
    b({
      id: 'mak-f5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3 Na6 Be2 e5 d5 Nh5 O-O Nf4 Re1 Nxe2+ Rxe2 c5 Qd2 f5',
      highlights: [{ square: 'f5', color: KEY }],
      say: "TODO Pass B — Qd2 f5: kingside pawn storm begins. The ...f5 break opens lines toward White's king.",
      sayShort: "TODO — cue for ...f5 storm.",
    }),
  ],
};

// ============================================================
// Sämisch (f3) — 292 games. White's f3 prevents ...Ng4/...Nh5 AND
// prepares Be3 + Qd2 + O-O-O for a kingside pawn storm. Spine 30 plies.
// Endgame: R+min+P 29.7% / Q+P 14.5%.
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
      say: "TODO Pass B — f3: Sämisch Variation. White stops ...Ng4 + ...Nh5 AND prepares Be3-Qd2-O-O-O kingside storm.",
      sayShort: "TODO — cue for f3 Sämisch.",
    }),
    b({
      id: 'sae-oo-a6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "TODO Pass B — O-O Be3 a6: 43% pick at ply 14. Black plays the Bronstein/Panno queenside plan — a6 first, b5 next.",
      sayShort: "TODO — cue for ...a6 Panno.",
    }),
    b({
      id: 'sae-c5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5',
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "TODO Pass B — Qd2 c5: Black hits the centre. 17% pick — challenges White's setup before the storm lands.",
      sayShort: "TODO — cue for ...c5.",
    }),
    b({
      id: 'sae-nge2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6',
      highlights: [{ square: 'e2', color: SOFT }, { square: 'c6', color: KEY }],
      say: "TODO Pass B — Nge2 Nc6: White's classical Sämisch setup, Black develops the knight to c6 hitting d4.",
      sayShort: "TODO — cue for ...Nc6.",
    }),
    b({
      id: 'sae-rd1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6 Rd1 cxd4 Nxd4',
      highlights: [{ square: 'd1', color: SOFT }, { square: 'd4', color: KEY }],
      say: "TODO Pass B — Rd1 cxd4 Nxd4: trade sequence, position opens.",
      sayShort: "TODO — cue for trade sequence.",
    }),
    b({
      id: 'sae-na5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6 Rd1 cxd4 Nxd4 Nxd4 Bxd4 Be6',
      highlights: [{ square: 'a5', color: SOFT }, { square: 'e6', color: KEY }],
      say: "TODO Pass B — Nxd4 Bxd4 Be6: continued trades, Black places the bishop to active e6 square.",
      sayShort: "TODO — cue for ...Be6.",
    }),
    b({
      id: 'sae-rook-coordinate', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6 Rd1 cxd4 Nxd4 Nxd4 Bxd4 Be6 b3 Rc8',
      highlights: [{ square: 'c8', color: KEY }],
      say: "TODO Pass B — b3 Rc8: rook to open c-file targets the c4-pawn.",
      sayShort: "TODO — cue for ...Rc8.",
    }),
    b({
      id: 'sae-endgame', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 Nge2 Nc6 Rd1 cxd4 Nxd4 Nxd4 Bxd4 Be6 b3 Rc8 Be2 Qa5 O-O Nd7 Bxg7 Kxg7',
      highlights: [{ square: 'g7', color: KEY }],
      say: "TODO Pass B — Bxg7 Kxg7 sequence: bishop trade, king recaptures, R+min+P endgame transition (29.7% of decisive games).",
      sayShort: "TODO — cue for endgame transition.",
    }),
  ],
};

// ============================================================
// Petrosian / Nge2 — 167 games. White's Nge2 keeps the c1-h6 diagonal
// open for the bishop. Spine 25 plies. Endgame: R+min+P 28.4% / Q+P 14.9%.
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
      say: "TODO Pass B — Nge2: White develops the knight to e2 keeping the c1-h6 diagonal open + preparing f3 + Be3 setup.",
      sayShort: "TODO — cue for Nge2 setup.",
    }),
    b({
      id: 'pet-oo-c6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "TODO Pass B — O-O f3 c6: 13% pick at ply 14. Black plays the solid c6 setup.",
      sayShort: "TODO — cue for ...c6.",
    }),
    b({
      id: 'pet-a6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "TODO Pass B — Be3 a6: 38% pick at ply 14. Same Panno-style queenside plan, a6 first then b5.",
      sayShort: "TODO — cue for ...a6.",
    }),
    b({
      id: 'pet-c5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5',
      highlights: [{ square: 'b5', color: KEY }, { square: 'c5', color: SOFT }],
      say: "TODO Pass B — c5 b5: White pushes the c-pawn, Black answers with the b5 queenside expansion. 32% pick at ply 16.",
      sayShort: "TODO — cue for ...b5.",
    }),
    b({
      id: 'pet-cxd6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5 cxd6 exd6',
      highlights: [{ square: 'd6', color: KEY }],
      say: "TODO Pass B — cxd6 exd6: pawn trade opens the e-file for Black.",
      sayShort: "TODO — cue for ...exd6.",
    }),
    b({
      id: 'pet-rook-lift', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5 cxd6 exd6 Nf4 Re8',
      highlights: [{ square: 'e8', color: KEY }, { square: 'e4', color: SOFT }],
      say: "TODO Pass B — Nf4 Re8: rook lift hitting e4 pawn. 16% pick.",
      sayShort: "TODO — cue for ...Re8.",
    }),
    b({
      id: 'pet-b4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5 cxd6 exd6 Nf4 Re8 Be2 b4',
      highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: SOFT }],
      say: "TODO Pass B — Be2 b4: queenside expansion continues, hits the c3-knight.",
      sayShort: "TODO — cue for ...b4.",
    }),
    b({
      id: 'pet-nd5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nge2 O-O f3 c6 Be3 a6 c5 b5 cxd6 exd6 Nf4 Re8 Be2 b4 Na4 Nd5 Bd2',
      highlights: [{ square: 'd5', color: KEY }],
      say: "TODO Pass B — Na4 Nd5 Bd2: knight to the centre, position resolved into Petrosian middlegame. R+min+P 28.4% conversion.",
      sayShort: "TODO — cue for ...Nd5.",
    }),
  ],
};

// ============================================================
// Four Pawns Attack (f4) — 106 games. White's most aggressive setup:
// c4-d4-e4-f4 over-extension. Spine 22 plies. Endgame: R+min+P 23.0%
// / minor+P 12.6%. Lower endgame frequency — many games end mid-board.
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
      say: "TODO Pass B — f4: Four Pawns Attack. White over-extends with c4-d4-e4-f4 trying to overwhelm Black. The pawns are vulnerable but they cover a lot of squares.",
      sayShort: "TODO — cue for f4 Four Pawns.",
    }),
    b({
      id: 'fp-oo-e5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "TODO Pass B — O-O Nf3 e5: Black castles and immediately challenges the centre.",
      sayShort: "TODO — cue for ...e5.",
    }),
    b({
      id: 'fp-fxe5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "TODO Pass B — fxe5 dxe5: pawn trade, Black's pieces now have central squares to work with.",
      sayShort: "TODO — cue for fxe5 ...dxe5.",
    }),
    b({
      id: 'fp-d5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5 d5 c5',
      highlights: [{ square: 'd5', color: SOFT }, { square: 'c5', color: KEY }],
      say: "TODO Pass B — d5 c5: White closes the centre, Black answers with c5 challenging the c4-pawn.",
      sayShort: "TODO — cue for ...c5.",
    }),
    b({
      id: 'fp-ne8', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5 d5 c5 Bd3 Ne8',
      highlights: [{ square: 'e8', color: KEY }, { square: 'd6', color: SOFT }],
      say: "TODO Pass B — Bd3 Ne8: 11% pick at ply 18. Knight reroutes to d6 prize square (Ne8-Nd6 plan).",
      sayShort: "TODO — cue for ...Ne8 reroute.",
    }),
    b({
      id: 'fp-nd6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5 d5 c5 Bd3 Ne8 O-O Nd6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'c4', color: SOFT }, { square: 'e4', color: SOFT }],
      say: "TODO Pass B — O-O Nd6: knight lands on d6 — eyes c4 AND e4 pawns. The Four Pawns chain becomes a target.",
      sayShort: "TODO — cue for ...Nd6.",
    }),
    b({
      id: 'fp-be3-nd7', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 e5 fxe5 dxe5 d5 c5 Bd3 Ne8 O-O Nd6 Be3 Nd7',
      highlights: [{ square: 'd7', color: KEY }],
      say: "TODO Pass B — Be3 Nd7: the second knight develops from b8 to d7 preparing further activity.",
      sayShort: "TODO — cue for ...Nd7.",
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
