import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-London (Black) — per-variation master class. The student plays BLACK.
// Keyed `${openingId}::${variationName}` to match anti-openings.json. The
// Steinitz Countergambit (…c5): strike at d4 at once, develop actively, and
// equalize with the bishop pair. Spine rebuilt with build-sound-spine.mjs (no
// both-sides blunder), engine-verified -0.18 from Black's side (≈ equal — the
// London is sound, so level is the honest goal). Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'];
const OID = 'anti-london-black';

const STEINITZ_C3_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-London — the Steinitz Countergambit (…c5)', minutes: 6,
  beats: [
    b({ id: 'lon-st-1', moves: 'd4 d5 Bf4 c5 e3 Nc6 c3 Bf5',
      say: "The Steinitz Countergambit is Black's most active anti-London: strike at d4 immediately with …c5, develop …Nc6 to pile on the pawn, and get the light bishop out to …Bf5 before …e6 ever shuts it in — the same good-bishop idea that makes the Caro-Kann so solid. You seize the initiative before White can settle into the usual London squeeze.",
      sayShort: "…c5, …Bf5 — active countergambit.",
      highlights: [H('c5', KEY), H('f5', ATK)] }),
    b({ id: 'lon-st-2', moves: 'd4 d5 Bf4 c5 e3 Nc6 c3 Bf5 Qb3 Qd7 Nf3 e6 dxc5 Bxc5',
      say: "White probes with Qb3, eyeing the b7-pawn along the file; you calmly cover it with …Qd7 along the seventh rank. When White releases the tension with dxc5, you recapture with the bishop — …Bxc5 — developed actively to a fine diagonal. Easy, harmonious development, both bishops working, and no London bind in sight.",
      sayShort: "…Qd7, …Bxc5 — defend and develop.",
      highlights: [H('d7', KEY), H('c5', SOFT)] }),
    b({ id: 'lon-st-3', moves: 'd4 d5 Bf4 c5 e3 Nc6 c3 Bf5 Qb3 Qd7 Nf3 e6 dxc5 Bxc5 Ne5 Qc8 Nd2 Nf6 Qa4 O-O',
      say: "White plants a knight on e5 and swings the queen to a4, probing for weaknesses. You unhurriedly regroup — the queen steps back to c8, the knight comes to f6, and you castle to safety. Everything is defended, your pieces are active, and White's probing has achieved precisely nothing.",
      sayShort: "…Nf6, …O-O — regroup, everything holds.",
      highlights: [H('e5', SOFT), H('f6', KEY)] }),
    b({ id: 'lon-st-4', moves: 'd4 d5 Bf4 c5 e3 Nc6 c3 Bf5 Qb3 Qd7 Nf3 e6 dxc5 Bxc5 Ne5 Qc8 Nd2 Nf6 Qa4 O-O Nxc6 bxc6',
      say: "White trades on c6 and you recapture with the b-pawn. Yes, it leaves you with doubled c-pawns — but in return you get the bishop pair and a half-open b-file bearing down on White's queenside. The engine calls it dead level: you've met the London head-on and equalized with the more active pieces. The countergambit did its job.",
      sayShort: "…bxc6 — bishop pair, open b-file, equal.",
      highlights: [H('c6', SOFT), H('b2', ATK)] }),
  ],
};

export const ANTI_LONDON_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Accelerated London System, Steinitz Countergambit (c3)`]: STEINITZ_C3_LESSON,
};
