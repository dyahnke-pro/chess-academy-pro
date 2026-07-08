import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Trompowsky: per-variation master classes for Black's alternatives to the
// main 2...Ne4 jump. The student plays BLACK. Two distinct, sound sidesteps:
//   • 2...e6 — the solid decline; allow White the broad centre, take the bishop
//     pair after Bxf6, clamp with ...g5. Engine-verified dead level (-0.03).
//   • 2...c5 — the sharp Vaganian; strike d4 at once, accept doubled f-pawns
//     for the two bishops + a half-open g-file. Objectively White is a shade
//     better (-0.25) but Black has real, practical compensation — framed
//     honestly, never over-claimed. Both spines chess.js-legal, both-sides-
//     sound (full-ply engine scan, no mid-line blunder), reaching a middlegame.
// Keyed `${openingId}::${variationName}` to match anti-openings.json. Arrows:
// non-pawn pieces with a clear sight-line only (lessonIntegrity); most lead-the-
// eye work is highlights on the named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-bishop-pair', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'];
const OID = 'anti-trompowsky-black';

/** 2...e6 — the solid decline. Concede the broad centre, take the bishop pair
 *  after Bxf6, clamp the kingside with ...g5. Dead level (-0.03). */
const E6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Trompowsky vs 2...e6 — take the bishop pair, clamp with ...g5', minutes: 6,
  beats: [
    b({ id: 'te6-1', moves: 'd4 Nf6 Bg5 e6',
      say: "Instead of the sharp ...Ne4, you can decline solidly with ...e6. You free the f8-bishop and prepare ...h6 and ...Be7 to question the g5-bishop. You concede White a broad centre for now, but your structure is rock-solid and completely without weaknesses.",
      sayShort: "…e6 — the solid decline.",
      highlights: [H('e6', KEY), H('g5', SOFT)] }),
    b({ id: 'te6-2', moves: 'd4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6',
      say: "White grabs the full centre with e4; you immediately prod the bishop with …h6. After Bxf6 you recapture with the queen — …Qxf6. Count what just happened: White has traded off his dark-squared bishop, so you now own the two bishops, and your queen sits actively on f6, eyeing d4 and the long dark diagonal.",
      sayShort: "…Qxf6 — win the bishop pair.",
      highlights: [H('f6', ATK), H('d4', SOFT)] }),
    b({ id: 'te6-3', moves: 'd4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6 Nc3 d6 Qd2 g5',
      say: "You settle the structure with …d6, keeping the centre under control, and then play the thematic …g5! The pawn grabs kingside space, takes the f4- and h4-squares away from White's pieces, and clears g7 for your bishop. With the two bishops and no weaknesses, you are already fully equal.",
      sayShort: "…g5 — clamp the kingside.",
      highlights: [H('g5', KEY), H('d6', SOFT)] }),
    b({ id: 'te6-4', moves: 'd4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6 Nc3 d6 Qd2 g5 O-O-O Bg7 g3',
      say: "White castles queenside; you complete the setup with …Bg7, the bishop pointing down the long diagonal at White's centre. The position is dead level and rich in play: you have the bishop pair and a sound, flexible structure, with the plan of …Nd7, …e5 and pressure across the board. A comfortable, purposeful game from a single quiet move.",
      sayShort: "…Bg7 — level, bishop pair, easy play.",
      highlights: [H('g7', KEY), H('e5', SOFT)] }),
  ],
};

/** 2...c5 — the sharp Vaganian Gambit. Strike d4 at once; after Bxf6 gxf6 take
 *  the two bishops + a half-open g-file for the doubled pawns. Objectively White
 *  is a shade better (-0.25) but Black has genuine practical compensation. */
const C5_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Trompowsky vs 2...c5 — the Vaganian, bishop pair for structure', minutes: 6,
  beats: [
    b({ id: 'tc5-1', moves: 'd4 Nf6 Bg5 c5',
      say: "The sharp road: …c5, the Vaganian. You strike at d4 immediately and dare White to take on f6. This is a fighter's choice — you are happy to accept doubled pawns because you value the bishop pair and open lines more than a tidy structure.",
      sayShort: "…c5 — the sharp Vaganian.",
      highlights: [H('c5', KEY), H('d4', SOFT)] }),
    b({ id: 'tc5-2', moves: 'd4 Nf6 Bg5 c5 Bxf6 gxf6',
      say: "White takes the knight, and you recapture toward the centre with …gxf6. Yes, your f-pawns are doubled — but in return you have the two bishops and a half-open g-file aimed straight at White's kingside. This is the whole point of the gambit: structure traded for dynamic, long-term pressure.",
      sayShort: "…gxf6 — bishops + open g-file.",
      highlights: [H('f6', SOFT), H('g8', SOFT)] }),
    b({ id: 'tc5-3', moves: 'd4 Nf6 Bg5 c5 Bxf6 gxf6 d5 Qb6 Qc1 f5',
      say: "White claims space with d5; you swing …Qb6, leaning on b2 and the dark squares and forcing White's queen to the passive c1 to defend. Then you roll …f5, seizing kingside space and opening diagonals for your bishops. Your pieces are coming alive fast.",
      sayShort: "…Qb6 and …f5 — seize the initiative.",
      highlights: [H('b6', ATK), H('f5', KEY)] }),
    b({ id: 'tc5-4', moves: 'd4 Nf6 Bg5 c5 Bxf6 gxf6 d5 Qb6 Qc1 f5 c4 Bg7 Nc3 d6',
      say: "White buttresses the d5-wedge with c4; you fianchetto …Bg7 onto the long diagonal and play …d6 to blunt the centre and prepare your pieces. Your dark-squared bishop is a monster with no rival — White gave his away on f6 — and it rakes the whole long diagonal.",
      sayShort: "…Bg7, …d6 — the unopposed dark bishop.",
      highlights: [H('g7', KEY), H('d6', SOFT)] }),
    b({ id: 'tc5-5', moves: 'd4 Nf6 Bg5 c5 Bxf6 gxf6 d5 Qb6 Qc1 f5 c4 Bg7 Nc3 d6 e3 Nd7 Qc2 Nf6',
      say: "White finishes a solid setup; you bring the knight …Nd7-f6 to hammer the d5-pawn. Be honest about the verdict: objectively White is a shade better, with the extra central space. But your bishop pair and the half-open g-file give real, lasting practical compensation — this is a genuine fighter's choice, not a free equalizer. Play the pressure you understand.",
      sayShort: "…Nf6 — hit d5; honest practical comp.",
      highlights: [H('f6', KEY), H('d5', SOFT)] }),
  ],
};

export const ANTI_TROMPOWSKY_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Solid Line (2...e6)`]: E6_LESSON,
  [`${OID}::Vaganian Gambit (2...c5)`]: C5_LESSON,
};
