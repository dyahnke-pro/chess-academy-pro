import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Sicilian, PER-VARIATION Watch lessons (Black). Each spine is
// from his real corpus walked to a middlegame; variation NAMES match
// pro-repertoires.json exactly. Two registers per beat; no move-number prefixes;
// green vision arrows only.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const OID = 'pro-ericrosen-sicilian';
const SRC = [
  'concept:pos-development', 'concept:pos-initiative',
  'https://www.chess.com/openings/Sicilian-Defense',
  'https://api.chess.com/pub/player/imrosen/games/archives',
];

// ── Taimanov (…e6): flexible …Qc7/…a6, then …Bb4 or …Nf6 ──
const TAIMANOV: LessonScript = {
  openingId: OID, title: 'Sicilian — Taimanov (…e6)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6',
      highlights: [{ square: 'e6', color: KEY }, { square: 'c6', color: SOFT }],
      say: "The Taimanov: …e6 keeps the structure maximally flexible — Black has not committed the d- or g-pawns and can choose the right setup based on what White does. …Nc6 hits the d4-knight at once.",
      sayShort: '…e6 — keep it flexible.' }),
    b({ id: 'qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6',
      arrows: [A('c7', 'c2')], highlights: [{ square: 'c7', color: KEY }, { square: 'a6', color: SOFT }],
      say: "…Qc7 eyes the c-file and the e5/c2 squares, and …a6 prevents any Nb5 ideas while preparing …b5 expansion. This is the Taimanov's calling card: a low-commitment, hard-to-attack setup.",
      sayShort: '…Qc7, …a6 — the Taimanov shell.' }),
    b({ id: 'oppo', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Qd2 Nf6 O-O-O Bb4',
      arrows: [A('b4', 'c3')], highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: KEY }],
      say: "When White castles long for an attack, …Nf6 develops and …Bb4 pins the c3-knight — the standard counter. We damage White's queenside pawns or win the bishop pair, and our own …b5-…b4 storm comes fast in the opposite-castling race.",
      sayShort: '…Bb4 — pin and counter-attack.' }),
    b({ id: 'plan', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Qd2 Nf6 O-O-O Bb4',
      arrows: [], highlights: [{ square: 'b5', color: KEY }, { square: 'c3', color: SOFT }],
      say: "The plan in the opposite-castling fight: …Bxc3 to wreck White's king cover, then …b5-…b4 and …Rb8 storming the queenside. With the bishop pair gone and the c-file open, Black's attack is the faster one. This repertoire thrives in this chaos.",
      sayShort: 'Plan: …Bxc3, …b5-b4 storm.' }),
  ],
};

// ── vs Rossolimo (Bb5): …d6, trade the bishop, solid structure ──
const ROSSOLIMO: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Rossolimo (Bb5)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb5', moves: 'e4 c5 Nf3 Nc6 Bb5 d6',
      arrows: [A('b5', 'c6')], highlights: [{ square: 'd6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "The Rossolimo: White pins and threatens to trade on c6, doubling our pawns. We answer …d6 — a flexible move that prepares …Bd7 to break the pin and keeps our structure healthy. No need to fear the bishop.",
      sayShort: '…d6 — flexible, prepare …Bd7.' }),
    b({ id: 'bd7', moves: 'e4 c5 Nf3 Nc6 Bb5 d6 O-O Bd7 Re1 a6 Bf1',
      arrows: [], highlights: [{ square: 'd7', color: KEY }, { square: 'f1', color: SOFT }],
      say: "…Bd7 unpins, and after …a6 White retreats the bishop to f1 rather than trade — admitting the pin led nowhere. We have an easy game with the bishop pair preserved and a sound pawn structure.",
      sayShort: '…Bd7, …a6 — the pin fizzles.' }),
    b({ id: 'trade', moves: 'e4 c5 Nf3 Nc6 Bb5 d6 O-O Bd7 Re1 a6 Bf1 Bg4 h3 Bxf3 Qxf3 e6',
      arrows: [], highlights: [{ square: 'f3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "…Bg4 and …Bxf3 trades the light bishop for White's knight — relieving any pressure and, crucially, taking control of the d4-square. After …e6 Black has a rock-solid Hedgehog-style structure with no weaknesses.",
      sayShort: '…Bxf3 — grab d4, solid Hedgehog.' }),
    b({ id: 'plan', moves: 'e4 c5 Nf3 Nc6 Bb5 d6 O-O Bd7 Re1 a6 Bf1 Bg4 h3 Bxf3 Qxf3 e6',
      arrows: [A('f8', 'e7'), A('d8', 'c7')], highlights: [{ square: 'd4', color: KEY }],
      say: "The plan from here is classic Hedgehog: …Be7, …O-O, …Qc7 and …Rfc8, control d4 and d5, and wait for White to overextend before striking with …b5 or …d5. This repertoire neutralises the Rossolimo into a comfortable, fighting game.",
      sayShort: 'Plan: Hedgehog setup, then …b5/…d5.' }),
  ],
};

// ── vs Alapin (c3): …d5 the principled central hit ──
const ALAPIN: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Alapin (c3)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'e4 c5 c3 d5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'c3', color: SOFT }],
      say: "Against the Alapin's c3 (preparing d4), the principled reply is …d5! — striking the centre before White builds it. Because c3 blocks the natural Nc3, White cannot comfortably support e4, and Black equalises at once.",
      sayShort: '…d5 — hit the centre first.' }),
    b({ id: 'qxd5', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6',
      arrows: [], highlights: [{ square: 'd5', color: KEY }],
      say: "We recapture with the queen on d5, and unlike the Scandinavian the queen is safe here — c3 means there is no Nc3 to chase it. After …Nf6 and …e6 Black develops smoothly with an open, comfortable position.",
      sayShort: '…Qxd5 — safe, no Nc3 to chase it.' }),
    b({ id: 'develop', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Nb5 Qd8',
      arrows: [], highlights: [{ square: 'c6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "White tries to gain tempo with Na3-Nb5 hitting the queen, but after …Qd8 the knight on b5 has no real target and will have to retreat. Black completes development with …Be7 and …O-O and stands at least equal with the freer game.",
      sayShort: '…Qd8 — sidestep, finish developing.' }),
  ],
};

// ── vs Closed/Nc3: transpose to an open Taimanov-style game ──
const CLOSED: LessonScript = {
  openingId: OID, title: 'Sicilian — vs 2.Nc3', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 c5 Nc3 e6',
      highlights: [{ square: 'e6', color: KEY }],
      say: "When White plays Nc3 first (threatening a Closed Sicilian or a transposition), we keep it flexible with …e6, ready to meet an Open Sicilian with our Taimanov setup or a Closed one with a quick …d5 or …g6.",
      sayShort: '…e6 — flexible vs early Nc3.' }),
    b({ id: 'open', moves: 'e4 c5 Nc3 e6 Nf3 Nc6 d4 cxd4 Nxd4',
      arrows: [A('c6', 'd4')], highlights: [{ square: 'd4', color: KEY }],
      say: "If White goes for the open game with Nf3 and d4, we transpose straight into our familiar Taimanov structure — …Nc6 and a flexible shell. We are simply on home turf, having forced White to reveal their hand.",
      sayShort: 'Transpose into the Taimanov.' }),
    b({ id: 'taimanov', moves: 'e4 c5 Nc3 e6 Nf3 Nc6 d4 cxd4 Nxd4 Qc7 Be3 a6 Qd2 Nf6 O-O-O Bb4',
      arrows: [A('b4', 'c3')], highlights: [{ square: 'c7', color: KEY }, { square: 'b4', color: KEY }],
      say: "…Qc7 and …a6 reach the exact low-commitment Taimanov setup from the main repertoire, and when White castles long, …Nf6 and …Bb4 pin the knight and launch the …b5-…b4 counter-attack. One opening to learn, reached by several move orders — the whole point of this repertoire's flexible …e6 Sicilian.",
      sayShort: '…Bb4 — same Taimanov counter.' }),
  ],
};

export const PRO_ERICROSEN_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Taimanov (…e6)`]: TAIMANOV,
  [`${OID}::vs Rossolimo (Bb5)`]: ROSSOLIMO,
  [`${OID}::vs Alapin (c3)`]: ALAPIN,
  [`${OID}::vs 2.Nc3`]: CLOSED,
};
