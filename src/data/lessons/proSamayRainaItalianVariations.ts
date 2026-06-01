import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Italian per-variation lessons (White). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-italian';
const SRC = ['concept:pos-development', 'concept:pos-outpost', 'https://www.chess.com/openings/Italian-Game', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const TWO_KNIGHTS: LessonScript = {
  openingId: OID, title: 'Italian — vs 3…Nf6 (Two Knights)', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3',
      arrows: [A('c4', 'f7')], highlights: [{ square: 'd3', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Against the Two Knights we keep it positional with d3 — sidestepping the wild Fried Liver and Traxler complications. Solid development and a quiet centre suit a player who wants understanding over memorised forcing lines.",
      sayShort: 'd3 — the calm Two Knights.' }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3',
      arrows: [], highlights: [{ square: 'c3', color: KEY }],
      say: "We castle, play Re1 and c3 — transposing into the familiar Pianissimo structure. Same plans, same ideas: a small centre, the Nbd2-f1-g3 reroute, and a slow squeeze. One structure to understand for the whole Italian.",
      sayShort: 'c3 — back to the Pianissimo.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6',
      arrows: [], highlights: [{ square: 'b5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "When Black chases the bishop with …Na5, we drop back to b5 and keep the tension. The plan stays the same — reroute the queen's knight kingside, prepare d4, and probe. Black's …Na5 sidelines a piece on the rim, which we exploit with central play.",
      sayShort: 'Bb5 — keep tension, play on.' }),
  ],
};

const HUNGARIAN: LessonScript = {
  openingId: OID, title: 'Italian — vs 3…Be7 (Hungarian)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'be7', moves: 'e4 e5 Nf3 Nc6 Bc4 Be7 d3 Nf6 O-O O-O',
      highlights: [{ square: 'e7', color: SOFT }, { square: 'd3', color: KEY }],
      say: "The Hungarian Defense (…Be7) is passive but solid — Black avoids the …Bc5 tension. We develop comfortably with d3 and castle, enjoying a free hand to expand against a cramped opponent.",
      sayShort: 'd3, O-O — free development.' }),
    b({ id: 'build', moves: 'e4 e5 Nf3 Nc6 Bc4 Be7 d3 Nf6 O-O O-O Re1 d6 c3 Na5 Bb5 a6',
      arrows: [], highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Re1, c3 and the same Pianissimo structure. Black's passive bishop on e7 does little; White calmly builds with the knight reroute and the d4 break in reserve. The space advantage is a lasting asset.",
      sayShort: 'c3 — Pianissimo squeeze.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bc4 Be7 d3 Nf6 O-O O-O Re1 d6 c3 Na5 Bb5 a6',
      arrows: [A('b1', 'd2')], highlights: [{ square: 'd4', color: KEY }],
      say: "The plan: Nbd2-f1-g3 to the kingside, then d4 to open the centre when Black is least ready. Against a passive setup, White simply improves piece by piece until the position cracks. Patience wins.",
      sayShort: 'Plan: reroute, then d4.' }),
  ],
};

export const PRO_SAMAYRAINA_ITALIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs 3…Nf6 (Two Knights)`]: TWO_KNIGHTS,
  [`${OID}::vs 3…Be7 (Hungarian)`]: HUNGARIAN,
};
