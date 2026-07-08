import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-QID (Fianchetto, g3) — per-variation master class. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json. The
// Traditional …Bb7 line: contest the long light diagonal with Bg2, meet …Ne4
// with Bd2, leap into e5, and squeeze. Spine rebuilt with build-sound-spine.mjs
// (no both-sides blunder), engine-verified +0.41. The …Bb4+ "Check" tab was
// dropped (an 11-ply prefix of the main lesson). Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defence'];
const OID = 'anti-qid-fianchetto';

const TRAD_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'QID Fianchetto vs …Bb7 — the e5 squeeze', minutes: 6,
  beats: [
    b({ id: 'qid-trad-1', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O',
      say: "The Queen's Indian: Black fianchettoes with b6 and Bb7 to fight for the e4-square and the long light diagonal. You answer in kind — g3 and Bg2 — contesting the very same diagonal. This is the main line: a subtle battle for the light squares. Both sides castle and the maneuvering begins.",
      sayShort: "Bg2 — contest the long diagonal.",
      highlights: [H('g2', KEY), H('e4', SOFT)] }),
    b({ id: 'qid-trad-2', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Bd2 f5',
      say: "Black plants a knight on e4 and props it up with f5, a Dutch-flavoured wedge. You challenge the outpost with Bd2, preparing to trade it off and dispute the light squares. The whole fight is about the e4-square — win control of it and Black's setup loses its point.",
      sayShort: "Bd2 — challenge the e4-knight.",
      highlights: [H('e4', ATK), H('d2', KEY)] }),
    b({ id: 'qid-trad-3', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Bd2 f5 Ne5 Nxc3 Bxc3',
      say: "You leap into e5 with the knight — a dominant central post — and after the trade on c3 your bishop recaptures there, raking the long dark diagonal toward Black's king. The e4-knight is gone, your pieces command the centre, and Black's f5-wedge now looks like a weakness rather than a strength.",
      sayShort: "Ne5, Bxc3 — dominate the centre.",
      highlights: [H('e5', KEY), H('c3', SOFT)] }),
    b({ id: 'qid-trad-4', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Bd2 f5 Ne5 Nxc3 Bxc3 Bxg2 Kxg2 a5',
      say: "Black trades the light bishops with Bxg2; you recapture Kxg2, the king snug behind the pawns. Black grabs space with a5. You emerge clearly on top: the powerful knight on e5, the bishop raking the long diagonal, and the central pawns on c4-d4. A pleasant, lasting edge from the main-line Queen's Indian.",
      sayShort: "Kxg2 — knight on e5, lasting edge.",
      highlights: [H('e5', KEY), H('c4', SOFT), H('d4', SOFT)] }),
  ],
};

export const ANTI_QID_FIANCHETTO_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Fianchetto Variation, Traditional Line`]: TRAD_LESSON,
};
