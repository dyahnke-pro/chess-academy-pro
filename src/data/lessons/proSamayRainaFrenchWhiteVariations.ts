import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — vs French per-variation lessons (White). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-french-white';
const SRC = ['concept:pawn-chain', 'concept:pos-development', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const WINAWER: LessonScript = {
  openingId: OID, title: 'vs French — Winawer (3…Bb4)', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3',
      arrows: [], highlights: [{ square: 'c3', color: KEY }, { square: 'e5', color: SOFT }],
      say: "The sharp Winawer: Black pins and trades on c3. We recapture with the b-pawn — accepting doubled pawns in return for the bishop pair and a massive pawn centre. The doubled c-pawns control d4; the position is double-edged and rich.",
      sayShort: 'bxc3 — bishop pair + big centre.' }),
    b({ id: 'qg4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4',
      arrows: [], highlights: [{ square: 'g4', color: KEY }, { square: 'g7', color: SOFT }],
      say: "Qg4! The poisoned-pawn main line — the queen swings out to attack g7 and the kingside. Black must decide between weakening the kingside or sacrificing material. This is the critical Winawer battleground where White plays for a direct attack.",
      sayShort: 'Qg4 — hit g7, go for the king.' }),
    b({ id: 'plan', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4',
      arrows: [A('h7', 'h2')], highlights: [{ square: 'h7', color: KEY }, { square: 'c3', color: SOFT }],
      say: "The plan: grab the kingside pawns with the queen, then use the extra material and the passed h-pawn while Black gets counterplay against the doubled c-pawns. A wild, concrete race — White's h-pawn and bishop pair versus Black's central pressure.",
      sayShort: 'Plan: take h7, run the h-pawn.' }),
  ],
};

const RUBINSTEIN: LessonScript = {
  openingId: OID, title: 'vs French — Rubinstein (3…dxe4)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'dxe4', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3',
      arrows: [], highlights: [{ square: 'e4', color: KEY }],
      say: "The solid Rubinstein: Black gives up the centre with …dxe4. We recapture on e4 with the knight and develop Nf3. White has a free, easy game with more space and the better development — the price Black pays for a rock-solid but passive structure.",
      sayShort: 'Nxe4, Nf3 — easy space edge.' }),
    b({ id: 'develop', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3',
      arrows: [], highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "We trade a pair of knights and develop the bishop to d3, aiming at h7. White's pieces are more active and the c8-bishop remains Black's chronic problem piece. A pleasant, risk-free edge to play with.",
      sayShort: 'Bd3 — active, aim at h7.' }),
    b({ id: 'plan', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 c5 dxc5 Bxc5',
      arrows: [A('d1', 'e2'), A('c1', 'g5')], highlights: [{ square: 'd4', color: SOFT }, { square: 'e6', color: KEY }],
      say: "The plan: castle, develop the queen and dark bishop actively, and pressure the e6/d-file while Black untangles the light-squared bishop. With more space and better pieces, White presses a small but persistent advantage.",
      sayShort: 'Plan: develop fully, press e6.' }),
  ],
};

export const PRO_SAMAYRAINA_FRENCH_WHITE_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Winawer (3…Bb4)`]: WINAWER,
  [`${OID}::Rubinstein (3…dxe4)`]: RUBINSTEIN,
};
