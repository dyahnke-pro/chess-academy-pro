import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — London System, PER-VARIATION Watch lessons (White). Each
// spine is a line from his real corpus walked to a middlegame; variation NAMES
// match pro-repertoires.json exactly (the `${openingId}::${name}` key — Gate A).
// Two registers per beat, no move-number prefixes in spoken text; green vision
// arrows only.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const OID = 'pro-ericrosen-london';
const SRC = [
  'concept:pos-development', 'concept:pos-outpost',
  'https://www.chess.com/openings/London-System',
  'https://api.chess.com/pub/player/imrosen/games/archives',
];

// ── vs …d5 Classical: the c3/d4 structure, trade dark bishops, play on e5 ──
const VS_D5: LessonScript = {
  openingId: OID, title: 'London — vs …d5 Classical', minutes: 7,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'd4 d5 Bf4 Nf6 e3 c5',
      arrows: [], highlights: [{ square: 'c5', color: KEY }],
      say: "When Black meets us with a classical d5 and then hits the centre with c5, we are on the main road of the London. The position is symmetrical and solid; our edge comes from being first to the good squares.",
      sayShort: '…d5, …c5 — the classical main.' }),
    b({ id: 'develop', moves: 'd4 d5 Bf4 Nf6 e3 c5 Nf3 Nc6 Nbd2',
      highlights: [{ square: 'd2', color: KEY }, { square: 'f3', color: SOFT }],
      say: "Nf3 and Nbd2 — note the knight goes to d2, not c3, so the c-pawn stays free to support d4 with c3. This is the flexible London structure: both knights developed, the centre braced, nothing committed.",
      sayShort: 'Nbd2 — keep c3 for the centre.' }),
    b({ id: 'tension', moves: 'd4 d5 Bf4 Nf6 e3 c5 Nf3 Nc6 Nbd2 cxd4 exd4 Bf5 c3',
      arrows: [], highlights: [{ square: 'd4', color: KEY }, { square: 'c3', color: KEY }],
      say: "Black releases the tension and develops the bishop to f5. We recapture toward the centre and play c3, building the little pawn triangle c3-d4 that is the backbone of the whole system — the d4-pawn is now bomb-proof.",
      sayShort: 'c3 — brace d4 forever.' }),
    b({ id: 'trade', moves: 'd4 d5 Bf4 Nf6 e3 c5 Nf3 Nc6 Nbd2 cxd4 exd4 Bf5 c3 e6 Be2 Bd6 Bxd6 Qxd6',
      arrows: [], highlights: [{ square: 'd6', color: KEY }],
      say: "When Black offers to trade the dark-squared bishops with Bd6, we take — Bxd6. Trading off Black's good bishop leaves us with the slightly better minor pieces and a clean structure to play against. The queen recaptures on d6.",
      sayShort: 'Bxd6 — trade Black’s good bishop.' }),
    b({ id: 'castle', moves: 'd4 d5 Bf4 Nf6 e3 c5 Nf3 Nc6 Nbd2 cxd4 exd4 Bf5 c3 e6 Be2 Bd6 Bxd6 Qxd6 O-O',
      arrows: [A('f3', 'e5')], highlights: [{ square: 'e5', color: KEY }, { square: 'g1', color: SOFT }],
      say: "We castle into a comfortable, risk-free middlegame: the c3-d4 wall, the half-open e-file, and the standard plan of Ne5 and a minority push on the queenside. Nothing flashy — just a pleasant edge this repertoire converts against very strong opposition.",
      sayShort: 'O-O — risk-free edge, aim Ne5.' }),
  ],
};

// ── vs …e6 setup: Black offers the bishop trade; we keep Ne5 + Bd3 ──
const VS_E6: LessonScript = {
  openingId: OID, title: 'London — vs …e6 Setup', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'd4 Nf6 Bf4 e6 e3 d5',
      highlights: [{ square: 'e6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black plays a restrained e6 and d5 — a Queen's-Gambit-Declined-style wall. It is solid, but it shuts in Black's own light-squared bishop on c8, the classic problem piece. We keep building.",
      sayShort: '…e6, …d5 — Black’s bishop is boxed in.' }),
    b({ id: 'ne5', moves: 'd4 Nf6 Bf4 e6 e3 d5 Nf3 Bd6 Ne5',
      arrows: [A('e5', 'f7')], highlights: [{ square: 'e5', color: KEY }],
      say: "Black challenges our bishop with Bd6; instead of trading, we leap into e5. The knight there is worth more than the bishop trade — it cannot be kicked and it cements our grip on the centre and the kingside.",
      sayShort: 'Ne5 — outpost over the trade.' }),
    b({ id: 'support', moves: 'd4 Nf6 Bf4 e6 e3 d5 Nf3 Bd6 Ne5 O-O Nd2 c5 c3 Nc6 Bd3',
      arrows: [A('d3', 'h7')], highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: KEY }],
      say: "We back the e5-knight with the d2-knight, brace the centre with c3, and swing the bishop to d3 — pointing straight at h7. Now the e5-knight and the d3-bishop form a battery aimed at Black's castled king. This is the attacking version of the London.",
      sayShort: 'Bd3 — battery on h7.' }),
    b({ id: 'plan', moves: 'd4 Nf6 Bf4 e6 e3 d5 Nf3 Bd6 Ne5 O-O Nd2 c5 c3 Nc6 Bd3',
      arrows: [A('d1', 'f3')], highlights: [{ square: 'f7', color: KEY }],
      say: "The attacking blueprint from here: Qf3 or Qh5 joining the bishop and knight, f4 to lock the outpost, then a kingside pawn storm. Against a passive …e6 setup, this repertoire turns the quiet London into a direct assault on f7 and h7.",
      sayShort: 'Plan: f4, queen up, storm the king.' }),
  ],
};

// ── vs …c5 early (…Qb6 hit): Na3-Nc4 defends b2/d4 with tempo ──
const VS_C5: LessonScript = {
  openingId: OID, title: 'London — vs …c5 and …Qb6', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'qb6', moves: 'd4 Nf6 Bf4 c5 e3 Qb6',
      arrows: [A('b6', 'b2')], highlights: [{ square: 'b6', color: KEY }, { square: 'b2', color: KEY }],
      say: "The critical test of the London: Black hits the centre with c5 and immediately jumps the queen to b6, attacking both the d4-pawn and the loose b2-pawn. Many White players panic here. We have a clean solution.",
      sayShort: '…Qb6 — double-hit on b2 and d4.' }),
    b({ id: 'na3', moves: 'd4 Nf6 Bf4 c5 e3 Qb6 Na3',
      arrows: [A('a3', 'c4')], highlights: [{ square: 'a3', color: KEY }],
      say: "Na3 — the modern antidote. It looks ugly on the rim, but the knight is heading to c4, where it hits the b6-queen with tempo and defends everything. We refuse to weaken our queenside with b3 or Qc1.",
      sayShort: 'Na3 — knight reroutes to c4.' }),
    b({ id: 'nc4', moves: 'd4 Nf6 Bf4 c5 e3 Qb6 Na3 d6 Nc4 Qc7',
      arrows: [A('c4', 'b6')], highlights: [{ square: 'c4', color: KEY }, { square: 'c7', color: SOFT }],
      say: "After d6, the knight lands on c4 hitting the queen, which retreats to c7. We have gained a tempo, kept our structure intact, and the knight on c4 is a monster — eyeing d6, b6 and e5.",
      sayShort: 'Nc4 — hit the queen, gain tempo.' }),
    b({ id: 'develop', moves: 'd4 Nf6 Bf4 c5 e3 Qb6 Na3 d6 Nc4 Qc7 Nf3 g6 h3 Bg7 Be2',
      highlights: [{ square: 'c4', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We finish with Nf3, h3 to deny Black's pieces g4, and Be2. White is fully developed with the better-placed pieces and a rock-solid centre, having calmly defused Black's most aggressive try. This repertoire scores heavily from here.",
      sayShort: 'Be2 — defused, better placed.' }),
  ],
};

// ── vs King's Indian …d6: the e4 + O-O-O + h4 attacking hybrid ──
const VS_D6: LessonScript = {
  openingId: OID, title: 'London — vs …d6 (e4 attacking hybrid)', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd6', moves: 'd4 Nf6 Bf4 d6 Nc3 g6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'g6', color: SOFT }],
      say: "When Black plays a King's-Indian setup with d6 and g6 but holds back from d5, we are handed the centre — so we take all of it. Nc3 prepares the big push.",
      sayShort: '…d6, …g6 — Black cedes the centre.' }),
    b({ id: 'e4', moves: 'd4 Nf6 Bf4 d6 Nc3 g6 e4 Bg7',
      highlights: [{ square: 'e4', color: KEY }, { square: 'd4', color: KEY }],
      say: "e4! This is the aggressive face of the London — a full pawn centre on d4 and e4 with the bishop already developed to f4. We have a Pirc-style position but with our problem bishop already outside the pawn chain.",
      sayShort: 'e4 — grab the full centre.' }),
    b({ id: 'qd2', moves: 'd4 Nf6 Bf4 d6 Nc3 g6 e4 Bg7 Qd2 O-O O-O-O',
      arrows: [A('f4', 'h6')], highlights: [{ square: 'c1', color: KEY }, { square: 'h6', color: SOFT }],
      say: "Qd2 connects with the f4-bishop, eyeing the h6-square for a bishop trade and a kingside hack, and we castle queenside. Now the two kings sit on opposite wings — and that means a pawn-storm race we are set up to win.",
      sayShort: 'Qd2, O-O-O — opposite-side castling.' }),
    b({ id: 'h4', moves: 'd4 Nf6 Bf4 d6 Nc3 g6 e4 Bg7 Qd2 O-O O-O-O c6 h4',
      arrows: [], highlights: [{ square: 'h4', color: KEY }, { square: 'g6', color: KEY }],
      say: "h4! The storm begins. With opposite castling we throw the h-pawn at Black's fianchetto: h4-h5 will pry open the h-file straight onto the king. Bxh6 and a rook-lift follow. This is the most dangerous weapon in this repertoire's London — calm setup, violent finish.",
      sayShort: 'h4 — storm the fianchetto.' }),
  ],
};

export const PRO_ERICROSEN_LONDON_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs …d5 Classical`]: VS_D5,
  [`${OID}::vs …e6 Setup`]: VS_E6,
  [`${OID}::vs …c5 and …Qb6`]: VS_C5,
  [`${OID}::vs …d6 (e4 Attacking Hybrid)`]: VS_D6,
};
