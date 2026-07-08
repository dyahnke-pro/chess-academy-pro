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

// The Nf3 Steinitz — the sharp pawn-grab: White pins with Bb5; you win the c3-
// pawn with …Ne4/…Nxc3/…Qxc3. Engine-verified +0.05 from Black's side (a pawn
// up, White has just enough activity to balance it — for the ambitious player).
const STEINITZ_NF3_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-London — the sharp Steinitz pawn-grab (Nf3)', minutes: 6,
  beats: [
    b({ id: 'lon-nf3-1', moves: 'd4 d5 Bf4 c5 e3 Nc6 Nf3 Nf6 Bb5 Qa5+',
      say: "The Nf3 Steinitz: after …c5 and …Nc6 White develops Nf3 and pins your knight with Bb5. You strike back with the in-between check …Qa5+, developing the queen with tempo and eyeing White's loose queenside. This is the sharp, ambitious road against the London.",
      sayShort: "…Qa5+ — check, develop with tempo.",
      highlights: [H('a5', KEY), H('b5', SOFT)] }),
    b({ id: 'lon-nf3-2', moves: 'd4 d5 Bf4 c5 e3 Nc6 Nf3 Nf6 Bb5 Qa5+ Nc3 Ne4 Bxc6+ bxc6',
      say: "White blocks the check with Nc3; you leap in with the active …Ne4, and after Bxc6+ bxc6 you accept doubled c-pawns in return for a half-open b-file and fast, aggressive piece play. The position turns sharp and double-edged — exactly the messy fight the London player was hoping to avoid.",
      sayShort: "…Ne4 — active, sharp, double-edged.",
      highlights: [H('e4', KEY), H('c6', SOFT)] }),
    b({ id: 'lon-nf3-3', moves: 'd4 d5 Bf4 c5 e3 Nc6 Nf3 Nf6 Bb5 Qa5+ Nc3 Ne4 Bxc6+ bxc6 O-O Nxc3 bxc3 Qxc3',
      say: "You trade on c3 and snatch the pawn — …Nxc3, bxc3, …Qxc3 — grabbing material right out of White's camp. You are a clean pawn up. White will get some activity for it with the open b-file, but for the player who wants to beat the London rather than just equalize, this is a genuine winning try.",
      sayShort: "…Qxc3 — snatch the pawn, play for the win.",
      highlights: [H('c3', KEY)] }),
    b({ id: 'lon-nf3-4', moves: 'd4 d5 Bf4 c5 e3 Nc6 Nf3 Nf6 Bb5 Qa5+ Nc3 Ne4 Bxc6+ bxc6 O-O Nxc3 bxc3 Qxc3 Ne5 cxd4 exd4 Bf5',
      say: "White generates play with Ne5; you clarify the centre with …cxd4 and develop the bishop actively to f5. You hold the extra pawn while White has just enough activity to balance it — the engine calls it level. A sharp, ambitious way to meet the London a pawn to the good, for the player who plays for two results.",
      sayShort: "…Bf5 — hold the pawn, level and sharp.",
      highlights: [H('e5', SOFT), H('f5', KEY)] }),
  ],
};

export const ANTI_LONDON_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Accelerated London System, Steinitz Countergambit (c3)`]: STEINITZ_C3_LESSON,
  [`${OID}::Accelerated London System, Steinitz Countergambit (Nf3)`]: STEINITZ_NF3_LESSON,
};
