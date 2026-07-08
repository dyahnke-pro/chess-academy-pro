import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Scandinavian (1.e4 d5 2.exd5 Qxd5 3.Nc3) — per-variation master classes.
// The student plays WHITE. Keyed `${openingId}::${variationName}` to match
// anti-openings.json. Spines rebuilt with build-sound-spine.mjs (masters-DB
// most-played, engine-checked each ply, no both-sides blunder) to a middlegame:
// Bronstein …Qd6 +0.77, Valencian …Qd8 +0.82 (both healthy White edges). The
// "Mieses" tab was dropped — it was a 12-ply prefix of the main line. Arrows:
// non-pawn pieces, clear sight-line (lessonIntegrity). Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const OID = 'anti-scandinavian';

/** vs 3...Qd6 (Bronstein) — fianchetto with g3/Bg2, Be3, castle, then Bf4
 *  chases the queen home; a lasting space + development edge (+0.77). */
const BRONSTEIN_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Scandinavian vs 3...Qd6 (Bronstein) — the g3 squeeze', minutes: 6,
  beats: [
    b({ id: 'sbr-1', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6',
      say: "The Bronstein: instead of the main-line a5, Black tucks the queen onto d6. It is a flexible square eyeing the kingside, but it has a cost — it blocks Black's own d-pawn and the f8-bishop's path. You will develop with tempo and turn that lost time into a lasting initiative.",
      sayShort: "…Qd6 — flexible, but it blocks Black in.",
      highlights: [H('d6', KEY)] }),
    b({ id: 'sbr-2', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4',
      say: "d4 stakes the big centre and Nf3 develops; then g3 begins a modern fianchetto, aiming the coming bishop down the long light diagonal at Black's queenside. Black pins the knight with Bg4. You already own more space and the more purposeful setup.",
      sayShort: "d4, g3 — centre plus fianchetto.",
      highlights: [H('d4', KEY), H('g4', SOFT)] }),
    b({ id: 'sbr-3', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6 Be3 e6',
      say: "Bg2 completes the fianchetto, raking the long diagonal, and Be3 develops while reinforcing d4. Black assembles a solid but passive shell with Nc6 and e6. You hold the centre, the space, and the freer, better-coordinated pieces — a comfortable, risk-free pull.",
      sayShort: "Bg2, Be3 — long diagonal, solid centre.",
      highlights: [H('g2', KEY), H('e3', SOFT), H('d4', SOFT)] }),
    b({ id: 'sbr-4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6 Be3 e6 h3 Bh5 O-O Be7 Bf4 Qd8',
      say: "h3 puts the question to the bishop, which drops to h5; you castle to safety, and then Bf4 hits the d6-square so the queen scurries all the way home to d8 — three tempi burned on queen moves. You stand clearly better: king safe, more space, and the fianchettoed bishop glaring at Black's position. A textbook Scandinavian squeeze.",
      sayShort: "Bf4 — chase the queen home, clearly better.",
      highlights: [H('f4', KEY), H('d8', ATK)] }),
  ],
};

/** vs 3...Qd8 (Valencian) — the most passive retreat; classical centre, win the
 *  bishop pair after ...Bg4xf3, then squeeze the cramped position (+0.82). */
const VALENCIAN_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Scandinavian vs 3...Qd8 (Valencian) — squeeze the passive retreat', minutes: 6,
  beats: [
    b({ id: 'sva-1', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8',
      say: "The Valencian: Black retreats the queen all the way home to d8 — the most solid Scandinavian square, but also the most passive. Black has conceded the centre and a big lead in development for nothing but a cramped, sturdy position. Your job is to seize the initiative and never let it go.",
      sayShort: "…Qd8 — solid but passive; seize the centre.",
      highlights: [H('d8', SOFT)] }),
    b({ id: 'sva-2', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 h3 Bxf3 Qxf3',
      say: "You build the classical centre with d4 and develop Nf3; Black pins it with Bg4, but after h3 he must part with the piece — Bxf3, and you recapture with the queen. Now you have the two bishops and a queen actively posted on f3, while Black has surrendered his good light-squared bishop for nothing concrete.",
      sayShort: "Qxf3 — win the bishop pair.",
      highlights: [H('f3', KEY)] }),
    b({ id: 'sva-3', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 h3 Bxf3 Qxf3 c6 Be3 e6 a3',
      say: "Black develops slowly with c6 and e6; you post the bishop on e3 and slot in the useful a3, taking the b4-square away from Black's pieces and preparing to expand. Every move tightens your grip — more space, more development, and the bishop pair for the long game.",
      sayShort: "Be3, a3 — tighten the grip.",
      highlights: [H('e3', KEY), H('a3', SOFT)] }),
    b({ id: 'sva-4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 h3 Bxf3 Qxf3 c6 Be3 e6 a3 Nd5 Nxd5 Qxd5 Qg3',
      say: "Black tries to free himself with the central Nd5, but you trade it off and, after Qxd5, swing the queen to g3 — eyeing g7 and the kingside while Black stays tied down. You are clearly better: the bishop pair, more space, and the sounder structure. The passive Scandinavian hands White exactly the pull you signed up for.",
      sayShort: "Qg3 — eye g7, keep the squeeze.",
      highlights: [H('g3', KEY), H('g7', ATK)] }),
  ],
};

export const ANTI_SCANDINAVIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Bronstein Variation`]: BRONSTEIN_LESSON,
  [`${OID}::Valencian Variation, Main Line`]: VALENCIAN_LESSON,
};
