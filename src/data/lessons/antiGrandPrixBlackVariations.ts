import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Grand-Prix (Black) — per-variation master class. The student plays BLACK.
// Keyed `${openingId}::${variationName}` to match anti-openings.json. vs the Bb5
// Grand Prix: meet it with …Nd4!, trade White's attacking bishop, provoke doubled
// c-pawns with …Bxc3, and simplify into a better endgame. Spine rebuilt with
// build-sound-spine.mjs (no both-sides blunder) and extended one ply past the
// queen trade to a STABLE even-material terminus (…Qxd1 Rxd1), engine-verified
// +0.27 from Black's side. The Bc4 tab is a main-line prefix (left as-is).
// Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'];
const OID = 'anti-grand-prix-black';

const BB5_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-Grand-Prix — the …Nd4 answer (Bb5)', minutes: 6,
  beats: [
    b({ id: 'gp-bb5-1', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4',
      say: "The Grand Prix Attack with Bb5: White pressures your c6-knight instead of the usual Bc4-and-f5 assault. Your strong reply is …Nd4! — the knight leaps to the centre, forking the b5-bishop and the f3-knight and grabbing the initiative. All at once, it's White who has to react to you.",
      sayShort: "…Nd4 — fork the bishop and knight.",
      highlights: [H('d4', KEY), H('b5', ATK)] }),
    b({ id: 'gp-bb5-2', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4 O-O Nxb5 Nxb5 d5',
      say: "You trade off White's dangerous light-squared bishop — …Nxb5 — and after Nxb5 you strike in the centre with …d5, hitting the e4-pawn and claiming your share of the board. White's best attacking piece is gone and the knight on b5 is offside. The Grand Prix's fire is already fizzling out.",
      sayShort: "…Nxb5, …d5 — trade the bishop, hit the centre.",
      highlights: [H('b5', SOFT), H('d5', KEY)] }),
    b({ id: 'gp-bb5-3', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4 O-O Nxb5 Nxb5 d5 d3 a6 Nc3 Bxc3 bxc3',
      say: "You expand with …d5 and chase the knight back with …a6; then comes a fine positional decision — …Bxc3, giving up your fianchetto bishop to saddle White with doubled, crippled c-pawns. Trading your good bishop for a permanent weakness in White's structure is a bargain well worth making here.",
      sayShort: "…Bxc3 — inflict doubled c-pawns.",
      highlights: [H('c3', ATK), H('d5', SOFT)] }),
    b({ id: 'gp-bb5-4', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4 O-O Nxb5 Nxb5 d5 d3 a6 Nc3 Bxc3 bxc3 dxe4 dxe4 Qxd1 Rxd1',
      say: "The centre clarifies and the queens come off — …Qxd1, Rxd1 — leaving a queenless middlegame where White's doubled c-pawns are a permanent target. You hold the sounder structure and the more comfortable game, and the engine even gives you the edge. The Grand Prix Attack, so feared for its kingside assault, has been calmly defused into a better endgame for Black.",
      sayShort: "…Qxd1 — into a better endgame.",
      highlights: [H('c3', ATK), H('c2', ATK)] }),
  ],
};

export const ANTI_GRAND_PRIX_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Grand Prix Attack (Bb5)`]: BB5_LESSON,
};
