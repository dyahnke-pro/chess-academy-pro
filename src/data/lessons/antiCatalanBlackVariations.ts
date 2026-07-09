import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Catalan (Black) — per-variation master class. The student plays BLACK.
// Keyed `${openingId}::${variationName}` to match anti-openings.json. The Open
// Catalan, Alekhine Variation (Qa4+): grab the c4-pawn, make White spend time
// regaining it, and free the game with …c5. Spine rebuilt with build-sound-
// spine.mjs (no both-sides blunder), engine-verified -0.27 from Black's side
// (solid; the Catalan keeps a small nagging pull, honestly framed). Highlights
// mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Catalan_Opening'];
const OID = 'anti-catalan-black';

const ALEKHINE_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-Catalan — Open Defense, Alekhine (Qa4+)', minutes: 6,
  beats: [
    b({ id: 'cat-alk-1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Qa4+',
      say: "The Open Catalan: you grab the c4-pawn with …dxc4, and in the Alekhine Variation White hurries to win it back with the check Qa4+. This is the principled approach against the Catalan — take the pawn, make White spend time recovering it, and use those free tempi to complete your development. Solid and equalizing.",
      sayShort: "…dxc4 — take the pawn, make White chase.",
      highlights: [H('c4', KEY), H('a4', SOFT)] }),
    b({ id: 'cat-alk-2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Qa4+ Nbd7 Qxc4 a6 Qc2 c5',
      say: "You block the check with …Nbd7; White regains the pawn with Qxc4, and you gain a tempo on the queen with …a6, preparing …b5. Then comes the key freeing break — …c5, striking directly at White's centre. This is Black's whole plan in the Open Catalan: undermine d4 and march toward full equality.",
      sayShort: "…c5 — the freeing central break.",
      highlights: [H('c5', KEY), H('a6', SOFT)] }),
    b({ id: 'cat-alk-3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Qa4+ Nbd7 Qxc4 a6 Qc2 c5 Nf3 b6 dxc5 Bxc5',
      say: "You expand with …b6, preparing the bishop's fianchetto, and after White resolves the tension with dxc5 you recapture actively — …Bxc5. Your pieces flow out naturally: the dark bishop sits on a great diagonal, the light bishop heads for b7, and White's extra central space has quietly evaporated.",
      sayShort: "…Bxc5 — active recapture, easy pieces.",
      highlights: [H('c5', SOFT), H('b6', KEY)] }),
    b({ id: 'cat-alk-4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Qa4+ Nbd7 Qxc4 a6 Qc2 c5 Nf3 b6 dxc5 Bxc5 Ne5 Nd5 Nd3 Bb7',
      say: "White probes with Ne5; you centralize a knight on d5, and after Nd3 you complete the fianchetto with …Bb7, both bishops raking the long diagonals. You are solidly equal — no weaknesses, active pieces, everything developed. White retains only the tiniest of pulls, and Black is comfortable and safe. The Catalan has been neutralised.",
      sayShort: "…Bb7 — solid, both bishops active.",
      highlights: [H('d5', KEY), H('b7', SOFT)] }),
  ],
};

export const ANTI_CATALAN_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Open Defense, Alekhine Variation`]: ALEKHINE_LESSON,
};
