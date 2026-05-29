import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky Rossolimo/Moscow — variation lessons for his 4,151-
// game anti-Sicilian alternative to the Alapin. The system: Bb5+
// (vs ...d6) or Bb5 (vs ...Nc6) sidestepping Open Sicilian theory.
// Spines from data/sources/danielnaroditsky-trees/rossolimo.json.

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
  'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ============================================================
// Nc6 Rossolimo proper — 961g 66.2%
// Black plays 2...Nc6 immediately, classical Rossolimo with Bb5.
// ============================================================
const NC6_ROSSOLIMO: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo',
  title: 'Nc6 Rossolimo proper — classical pin',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nc6-open', moves: 'e4 c5 Nf3 Nc6 Bb5',
      highlights: [{ square: 'b5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "After 2…Nc6, we play 3.Bb5 — the Rossolimo proper. The bishop pins the knight against the e5-square (where Black would want to push the e-pawn), and immediately sidesteps every Open Sicilian theory book Black has prepared.",
      sayShort: 'Bb5 — Rossolimo pin.',
    }),
    b({
      id: 'nc6-e6', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O',
      highlights: [{ square: 'e6', color: KEY }, { square: 'g1', color: SOFT }],
      say: "…e6 prepares …Nge7 and …d5, the standard Black setup. We castle and develop classically. The position is still anti-Sicilian — no d4 from us, just system development matching whatever Black does.",
      sayShort: 'O-O — castle, develop.',
    }),
    b({
      id: 'nc6-nge7', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1',
      highlights: [{ square: 'e1', color: KEY }, { square: 'e7', color: SOFT }],
      say: "…Nge7 develops the second knight to its KIA-like square. We play Re1 — supporting e4 AND preparing the f1-bishop's later return. This is the Rossolimo's signature move: the rook lift comes BEFORE pawn moves.",
      sayShort: 'Re1 — support e4.',
    }),
    b({
      id: 'nc6-bf1', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1',
      highlights: [{ square: 'f1', color: KEY }],
      say: "Black plays …a6 chasing the bishop, and we retreat Bf1! The bishop's signature route: Bb5 → Bf1 (and later Bd3 or Be2 depending on setup). The bishop is back home but has cost Black a tempo.",
      sayShort: 'Bf1 — retreat to home base.',
    }),
    b({
      id: 'nc6-d5', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: SOFT }],
      say: "…d5 — Black challenges the centre. We have a choice: exd5 trading the centre (simplifying), or e5 advancing (cramping). Either way, Black has committed his structure and our setup is complete.",
      sayShort: '…d5 — central challenge.',
    }),
    b({
      id: 'nc6-middlegame', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "exd5 Nxd5 d3 — central trade simplifies, then d3 supports our setup AND prepares c4 or Nbd2-e4 later. The Maroczy-style structure favours us: better piece coordination, easier development, knowledge of every middlegame pattern.",
      sayShort: 'd3 — Maroczy structure.',
    }),
  ],
};

// ============================================================
// e6 Open avoidance — 793g 65.8%
// Black plays 2...e6 trying to transpose. We play d4 — Open Sicilian
// Taimanov, where we're well-prepared.
// ============================================================
const E6_TAIMANOV: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo',
  title: 'e6 Open avoidance — Taimanov transposition',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'e6-open', moves: 'e4 c5 Nf3 e6 d4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e6', color: SOFT }],
      say: "2…e6 — Black tries to transpose to a Kan or Taimanov. We play d4! Against this move order, the Open Sicilian is the right answer. We're well-prepared in Taimanov structures and Black gets a real fight instead of the easy Rossolimo trade.",
      sayShort: 'd4 — Open Sicilian.',
    }),
    b({
      id: 'e6-cxd4', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "cxd4 Nxd4 …a6 — standard Open Sicilian moves. Black's …a6 claims b5 (the Kan/Taimanov signature). The position is now textbook Sicilian: White has the centre, Black has the queenside expansion option.",
      sayShort: '…a6 — Taimanov.',
    }),
    b({
      id: 'e6-bd3', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3',
      highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "Bd3 — the modern Taimanov bishop placement. From d3 the bishop aims at h7 (the standard Sicilian attack square) and supports e4. The setup is aggressive and well-known.",
      sayShort: 'Bd3 — kingside attacker.',
    }),
    b({
      id: 'e6-nf6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Nf6 O-O',
      highlights: [{ square: 'g1', color: KEY }, { square: 'f6', color: SOFT }],
      say: "…Nf6 develops, we castle. The Taimanov has reached its mainline position. From here Black has options (…Qc7, …Bc5, …d6) and each leads to a different known structure.",
      sayShort: 'O-O — castle, complete setup.',
    }),
    b({
      id: 'e6-qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Nf6 O-O Qc7 c4',
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black plays …Qc7 (the most common move), we answer with c4! The c-pawn push grabs space, locks the queenside, and prepares the Maroczy Bind. The Taimanov has resolved into a structure favoring our central control.",
      sayShort: 'c4 — Maroczy bind.',
    }),
    b({
      id: 'e6-nc3', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Nf6 O-O Qc7 c4 Nc6 Nc3',
      highlights: [{ square: 'c3', color: KEY }],
      say: "…Nc6 Nc3 — both knights develop. The Maroczy Bind structure with c4 + Nc3 is one of the best positional setups against the Taimanov. We're locked in for a long positional fight where our central space + bishop pair pressure converts.",
      sayShort: 'Nc3 — develop, Maroczy locked.',
    }),
  ],
};

// ============================================================
// Bxd7+ Trade — 401g 66.8%
// Black plays the easy ...Bd7 trade after Bb5+. We trade immediately,
// reaching a quiet positional game with the bishop pair.
// ============================================================
const BD7_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo',
  title: 'Bxd7+ Trade — quiet bishop pair edge',
  minutes: 6,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'bd7-open', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7',
      highlights: [{ square: 'd7', color: KEY }, { square: 'b5', color: SOFT }],
      say: "After Bb5+, Black plays …Bd7 — the easy trade. Black's idea: simplify, develop, and play a normal Sicilian. The problem is we don't agree to play a normal Sicilian — we take the trade and convert the bishop pair edge.",
      sayShort: '…Bd7 — easy trade.',
    }),
    b({
      id: 'bd7-trade', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7',
      highlights: [{ square: 'd7', color: KEY }],
      say: "Bxd7+ Qxd7 — bishops trade. Black's queen ends up on d7 (forced — the alternative …Nxd7 is too passive). We've simplified AND won the bishop pair. The middlegame plan is straightforward: castle, develop, convert structurally.",
      sayShort: 'Bxd7+ — bishop pair.',
    }),
    b({
      id: 'bd7-oo', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nf6 Re1',
      highlights: [{ square: 'g1', color: KEY }, { square: 'e1', color: SOFT }],
      say: "O-O …Nf6 Re1 — both kings safe, we lift the rook to e1 supporting e4. Standard Rossolimo development. The bishop pair we kept on the board is the structural edge that compounds for the rest of the game.",
      sayShort: 'O-O Re1 — bishop pair advantage.',
    }),
    b({
      id: 'bd7-c4', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nf6 Re1 Nc6 c4',
      highlights: [{ square: 'c4', color: KEY }],
      say: "…Nc6 c4 — Black develops the second knight, we push c4 setting up the Maroczy Bind structure. From here White's setup is: c4 + Nc3 + d3 (or d4) + bishop on the long diagonal eventually.",
      sayShort: 'c4 — Maroczy bind.',
    }),
    b({
      id: 'bd7-nc3', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nf6 Re1 Nc6 c4 g6 Nc3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'g6', color: SOFT }],
      say: "…g6 Nc3 — Black fianchettos for safety, we develop the queen knight. The position is now a closed Maroczy where Black's only plan is …Bg7 + …O-O and waiting. We have the active plan.",
      sayShort: 'Nc3 — develop.',
    }),
    b({
      id: 'bd7-convert', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nf6 Re1 Nc6 c4 g6 Nc3 Bg7 d3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "…Bg7 d3 — Black completes the fianchetto, we play d3 to keep the structure flexible. The middlegame plan from here is Nd5 outpost ideas + queenside expansion with a4 + slow conversion of the bishop pair.",
      sayShort: 'd3 — slow conversion.',
    }),
  ],
};

// ============================================================
// c3 Sideline (vs ...d6) — 177 games, 63.6% score
// Instead of Bb5+ we play c3 quietly, transposing into a Maroczy-
// style setup. Firouzja2003 (3072) victim of this slow squeeze.
// ============================================================
const C3_SIDELINE: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo',
  title: 'c3 Sideline — quiet Maroczy setup',
  minutes: 6,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'c3-open', moves: 'e4 c5 Nf3 d6 c3',
      highlights: [{ square: 'c3', color: KEY }],
      say: "3.c3 — instead of the Bb5+ Moscow line, we play the quiet c3 sideline preparing d4. This is the Alapin-style structure where we accept slower piece play in exchange for a small structural edge.",
      sayShort: 'c3 — quiet setup.',
    }),
    b({
      id: 'c3-nf6', moves: 'e4 c5 Nf3 d6 c3 Nf6 Bd3',
      highlights: [{ square: 'd3', color: SOFT }],
      say: "...Nf6 Bd3 — Black develops the knight, we play Bd3 covering the kingside attack diagonal. The Bd3 supports e4 AND prepares a future kingside expansion.",
      sayShort: 'Bd3 — kingside attacker.',
    }),
    b({
      id: 'c3-nc6', moves: 'e4 c5 Nf3 d6 c3 Nf6 Bd3 Nc6 Bc2',
      highlights: [{ square: 'c2', color: KEY }],
      say: "...Nc6 Bc2 — Black develops the queen knight, we retreat the bishop to c2 — the classical Spanish bishop dance. The Bc2 keeps the diagonal pointing at h7 AND avoids being exchanged.",
      sayShort: 'Bc2 — Spanish dance.',
    }),
    b({
      id: 'c3-bg4', moves: 'e4 c5 Nf3 d6 c3 Nf6 Bd3 Nc6 Bc2 Bg4 d3',
      highlights: [{ square: 'd3', color: SOFT }],
      say: "...Bg4 d3 — Black tries the pin on our knight, we play d3 supporting the centre. The position now resembles a Closed Spanish with one extra tempo for us.",
      sayShort: 'd3 — flexibility.',
    }),
    b({
      id: 'c3-develop', moves: 'e4 c5 Nf3 d6 c3 Nf6 Bd3 Nc6 Bc2 Bg4 d3 e6 O-O Be7',
      highlights: [{ square: 'g1', color: KEY }],
      say: "...e6 O-O ...Be7 — classical development for both. White's middlegame plan begins next: the Nbd2 reroute toward the kingside attack.",
      sayShort: 'O-O — develop.',
    }),
    b({
      id: 'c3-middlegame', moves: 'e4 c5 Nf3 d6 c3 Nf6 Bd3 Nc6 Bc2 Bg4 d3 e6 O-O Be7 Nbd2 O-O Re1',
      highlights: [{ square: 'd2', color: SOFT }, { square: 'e1', color: KEY }],
      say: "Nbd2 ...O-O Re1 — White develops the queen knight to d2 (preparing Nf1-Ng3 reroute), Black castles, we lift the rook to e1. The middlegame structure is now defined: White's kingside attack plan vs Black's queenside ...b5 expansion. Closed Spanish-style squeeze.",
      sayShort: 'Re1 — middlegame set.',
    }),
  ],
};

// ============================================================
// Bc4 vs ...d6 — 152 games, 65.1% score
// Italian-style Bc4 instead of Bb5+ in the Moscow variation.
// MichaelRoiz (2721) victim.
// ============================================================
const BC4_VS_D6: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo',
  title: 'Bc4 vs ...d6 — Italian-style transposition',
  minutes: 6,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'bc4-open', moves: 'e4 c5 Nf3 d6 Bc4',
      highlights: [{ square: 'c4', color: KEY }],
      say: "3.Bc4 — instead of Bb5+ checking, we play the Italian-style Bc4 aiming directly at f7. The bishop on c4 is more aggressive than Bb5+ but slower; Black gets time to develop AND we avoid the early trade.",
      sayShort: 'Bc4 — Italian setup.',
    }),
    b({
      id: 'bc4-nf6', moves: 'e4 c5 Nf3 d6 Bc4 Nf6 d3',
      highlights: [{ square: 'd3', color: SOFT }],
      say: "...Nf6 d3 — Black develops, we play d3 keeping the centre solid. The d3 also prepares Nbd2 + e4 expansion later.",
      sayShort: 'd3 — solid setup.',
    }),
    b({
      id: 'bc4-nc6', moves: 'e4 c5 Nf3 d6 Bc4 Nf6 d3 Nc6 c3',
      highlights: [{ square: 'c3', color: KEY }],
      say: "...Nc6 c3 — both develop, we play c3 preparing d4 expansion. The setup looks like an Italian Game but with c5 instead of e5 by Black — slightly worse structure for Black.",
      sayShort: 'c3 — prep d4.',
    }),
    b({
      id: 'bc4-bb3', moves: 'e4 c5 Nf3 d6 Bc4 Nf6 d3 Nc6 c3 e6 Bb3',
      highlights: [{ square: 'b3', color: KEY }],
      say: "...e6 Bb3 — Black plays the French-like ...e6, we retreat the bishop to b3 keeping the diagonal alive. The Bb3 also avoids the future ...Bxc4 trade.",
      sayShort: 'Bb3 — keep the diagonal.',
    }),
    b({
      id: 'bc4-castle', moves: 'e4 c5 Nf3 d6 Bc4 Nf6 d3 Nc6 c3 e6 Bb3 Be7 O-O O-O',
      highlights: [{ square: 'g1', color: KEY }, { square: 'g8', color: SOFT }],
      say: "...Be7 O-O ...O-O — both develop calmly and castle. The structure is now a Closed Italian-like setup with c5 instead of e5 — Black's structure is slightly worse.",
      sayShort: 'O-O — both safe.',
    }),
    b({
      id: 'bc4-middlegame', moves: 'e4 c5 Nf3 d6 Bc4 Nf6 d3 Nc6 c3 e6 Bb3 Be7 O-O O-O Re1 b5 Nbd2',
      highlights: [{ square: 'd2', color: KEY }],
      say: "Re1 ...b5 Nbd2 — White's rook supports the central squares, Black plays the queenside expansion ...b5, we develop the queen knight to d2 (ready for the Nf1-Ng3 reroute). Standard Italian-Spanish middlegame: White's kingside attack vs Black's queenside push.",
      sayShort: 'Nbd2 — KIA reroute square.',
    }),
  ],
};

// ============================================================
// vs ...g6 (Hyper-Accelerated Dragon) — 130 games, 74.6% score
// Black plays Dragon-style ...g6 early. We answer with c3 + d4
// reaching a Maroczy-like structure.
// ============================================================
const VS_G6_DRAGON: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo',
  title: 'vs ...g6 — Maroczy-like Dragon answer',
  minutes: 6,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'g6-open', moves: 'e4 c5 Nf3 g6 c3',
      highlights: [{ square: 'g6', color: SOFT }, { square: 'c3', color: KEY }],
      say: "...g6 — Black plays Dragon-style fianchetto early. We answer with c3 preparing d4 — this is the Smith-Morra-style setup against the Hyper-Accelerated Dragon.",
      sayShort: 'c3 — vs Hyper Dragon.',
    }),
    b({
      id: 'g6-d5', moves: 'e4 c5 Nf3 g6 c3 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say: "...d5 — Black challenges the centre. The d5 is the principled reply preventing our d4 expansion.",
      sayShort: '...d5 — central try.',
    }),
    b({
      id: 'g6-exd5', moves: 'e4 c5 Nf3 g6 c3 d5 exd5 Qxd5',
      highlights: [{ square: 'd5', color: ATK }],
      say: "exd5 ...Qxd5 — central trades, Black recaptures with the queen. The queen on d5 is centralised but exposed — we now play d4 with tempo.",
      sayShort: '...Qxd5 — exposed queen.',
    }),
    b({
      id: 'g6-d4', moves: 'e4 c5 Nf3 g6 c3 d5 exd5 Qxd5 d4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "d4 — central push attacks the c5-pawn AND prepares Nc3 attacking the queen. The Maroczy-like position favors White's space.",
      sayShort: 'd4 — Maroczy structure.',
    }),
    b({
      id: 'g6-bg7', moves: 'e4 c5 Nf3 g6 c3 d5 exd5 Qxd5 d4 Bg7',
      highlights: [{ square: 'g7', color: KEY }],
      say: "...Bg7 — Black completes the Dragon fianchetto. The position is now a Maroczy Bind with one extra tempo for us.",
      sayShort: '...Bg7 — Maroczy Bind.',
    }),
    b({
      id: 'g6-nbd2', moves: 'e4 c5 Nf3 g6 c3 d5 exd5 Qxd5 d4 Bg7 Nbd2 Nf6 dxc5',
      highlights: [{ square: 'd2', color: SOFT }, { square: 'c5', color: ATK }],
      say: "Nbd2 ...Nf6 dxc5 — we develop the queen knight to d2 (the c3-pawn blocks Nc3), Black develops the king knight, we trade off the c-pawn opening the centre.",
      sayShort: 'dxc5 — open the centre.',
    }),
    b({
      id: 'g6-middlegame', moves: 'e4 c5 Nf3 g6 c3 d5 exd5 Qxd5 d4 Bg7 Nbd2 Nf6 dxc5 Qxc5 Bc4 O-O O-O',
      highlights: [{ square: 'g1', color: KEY }, { square: 'g8', color: SOFT }],
      say: "...Qxc5 Bc4 ...O-O O-O — Black recaptures the c-pawn, both sides develop and castle. Middlegame structure: open centre + Black's queen on c5 (slightly exposed) + White's classical Bc4 piece coordination. White scores 74.6% from here.",
      sayShort: 'O-O — middlegame structure.',
    }),
  ],
};

export const PRO_NARODITSKY_ROSSOLIMO_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-rossolimo::Nc6 Rossolimo proper': NC6_ROSSOLIMO,
  'pro-naroditsky-rossolimo::e6 Open avoidance': E6_TAIMANOV,
  'pro-naroditsky-rossolimo::Bxd7+ Trade': BD7_TRADE,
  'pro-naroditsky-rossolimo::c3 Sideline': C3_SIDELINE,
  'pro-naroditsky-rossolimo::Bc4 vs ...d6': BC4_VS_D6,
  'pro-naroditsky-rossolimo::vs ...g6 (Hyper Dragon)': VS_G6_DRAGON,
};
