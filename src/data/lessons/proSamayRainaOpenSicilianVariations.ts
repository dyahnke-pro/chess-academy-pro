import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Open Sicilian per-variation lessons (White). Each spine is
// from his real corpus walked to a middlegame; variation NAMES match
// pro-repertoires.json exactly (the `${openingId}::${name}` key — Gate A). Two
// registers; no move-number prefixes in spoken text; green vision arrows only.

const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-open-sicilian';
const SRC = ['concept:pos-outpost', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Open', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const SVESHNIKOV: LessonScript = {
  openingId: OID, title: 'Open Sicilian — vs 2…Nc6 (Sveshnikov)', minutes: 7,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc6', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "When Black plays the Sveshnikov with an early e5, the knight jumps to b5 — heading for the d6-square and pressuring the hole Black just created on d5. Black's central pawns look impressive, but the d5-square is a permanent home for our pieces.",
      sayShort: 'Ndb5 — punish the d5-hole.' }),
    b({ id: 'bg5', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5',
      arrows: [A('g5', 'f6')], highlights: [{ square: 'f6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "After d6 we pin and pressure the f6-knight with Bg5 — the knight that guards d5. Removing or distracting it is the whole battle: once it goes, the d5-square is ours forever.",
      sayShort: 'Bg5 — attack the d5-defender.' }),
    b({ id: 'na3', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Bxf6 gxf6 Na3 b5',
      arrows: [A('a3', 'c4')], highlights: [{ square: 'd5', color: KEY }, { square: 'f6', color: SOFT }],
      say: "Black kicks the b5-knight and we trade on f6, shattering Black's kingside pawns. The knight reroutes via a3 toward c4 and d5. Black has the bishop pair and central pawns, but the chronic d5-weakness and the doubled f-pawns give White a long-term structural target — the main Sveshnikov battleground.",
      sayShort: 'Na3 — reroute toward d5.' }),
  ],
};

const TAIMANOV: LessonScript = {
  openingId: OID, title: 'Open Sicilian — vs 2…e6 (Taimanov)', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be2',
      highlights: [{ square: 'e6', color: SOFT }, { square: 'c7', color: KEY }],
      say: "Against the flexible Taimanov (…e6 and …Qc7) we keep it simple with the classical Be2 development. Black's setup is solid but passive; we develop, castle, and look to clamp down with a knight or the f4-f5 break later.",
      sayShort: 'Be2 — solid vs the Taimanov.' }),
    b({ id: 'oo', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be2 a6 O-O Nf6 Be3',
      arrows: [A('e3', 'a7')], highlights: [{ square: 'e3', color: KEY }],
      say: "We castle and develop the bishop to e3, building the standard English-Attack-style structure. The pieces are harmoniously placed and White keeps a pleasant space edge with Black still needing to find a plan.",
      sayShort: 'O-O, Be3 — harmonious setup.' }),
    b({ id: 'bb4', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be2 a6 O-O Nf6 Be3 Bb4',
      arrows: [A('b4', 'c3')], highlights: [{ square: 'b4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black pins with …Bb4, but White is comfortable: Na4 or a quick Nd5 break solves the pin and seizes the initiative. The Taimanov gives Black a sound but cramped game — exactly the kind of position White grinds.",
      sayShort: 'vs …Bb4 — Na4/Nd5 and press.' }),
  ],
};

const ACC_DRAGON: LessonScript = {
  openingId: OID, title: 'Open Sicilian — vs 2…g6 (Dragon)', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'g6', moves: 'e4 c5 Nf3 g6 d4 cxd4 Nxd4 Nf6 Nc3 Bg7 Be3',
      arrows: [A('e3', 'a7')], highlights: [{ square: 'g6', color: SOFT }, { square: 'e3', color: KEY }],
      say: "Against the Dragon fianchetto we set up the English Attack: Be3, preparing f3, Qd2 and a kingside pawn storm with h4-h5. The Dragon bishop is dangerous, so we race to attack the king before it bites.",
      sayShort: 'Be3 — head for the English Attack.' }),
    b({ id: 'develop', moves: 'e4 c5 Nf3 g6 d4 cxd4 Nxd4 Nf6 Nc3 Bg7 Be2 Nc6 Be3 O-O',
      arrows: [A('d4', 'c6')], highlights: [{ square: 'd4', color: KEY }, { square: 'g8', color: SOFT }],
      say: "With the calmer Be2 setup we develop solidly, castle, and keep the strong knight on d4 controlling the centre. Against the Accelerated move order we are careful to meet …d5 ideas, but the extra space and the firm centre keep White on top.",
      sayShort: 'Be2, Be3 — solid, hold the centre.' }),
    b({ id: 'plan', moves: 'e4 c5 Nf3 g6 d4 cxd4 Nxd4 Nf6 Nc3 Bg7 Be2 Nc6 Be3 O-O',
      arrows: [A('d1', 'd2')], highlights: [{ square: 'h4', color: KEY }, { square: 'f3', color: SOFT }],
      say: "The plan against any Dragon setup: Qd2, f3 to blunt the g7-bishop and support e4, then castle long and storm the kingside with h4-h5, prying open the h-file against Black's fianchettoed king. Attack the king before the Dragon bishop roars.",
      sayShort: 'Plan: Qd2, f3, h4-h5 storm.' }),
  ],
};

export const PRO_SAMAYRAINA_OPEN_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs 2…Nc6 (Sveshnikov)`]: SVESHNIKOV,
  [`${OID}::vs 2…e6 (Taimanov)`]: TAIMANOV,
  [`${OID}::vs 2…g6 (Dragon)`]: ACC_DRAGON,
};
