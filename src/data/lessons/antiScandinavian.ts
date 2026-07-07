import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Scandinavian (1.e4 d5 2.exd5 Qxd5) — main-line master class. The student
// plays WHITE. Black recaptures with the queen early, so White develops with
// tempo (Nc3 hits the queen), builds a big centre for free, and emerges with the
// bishop pair and a lead in development. Spine is both-sides-sound
// (build-sound-spine.mjs) to a middlegame, engine-verified (+0.60 White).
// chess.js-legal. Arrows: non-pawn pieces, clear sight-line. Highlights: named
// squares.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];

/** Main line vs 2...Qxd5 3.Nc3 Qa5: develop with tempo, build the d4 centre,
 *  chase the loose pieces with Ne4/Ng3, and bank the bishop pair + development
 *  lead — a clean, low-maintenance edge. */
export const ANTI_SCANDINAVIAN_LESSON: LessonScript = {
  openingId: 'anti-scandinavian',
  sources: SRC,
  title: 'Beating the Scandinavian — develop with tempo',
  minutes: 7,
  orientation: 'white',
  beats: [
    b({ id: 'sca1', moves: 'e4 d5 exd5 Qxd5 Nc3',
      say: "The Scandinavian grabs your e-pawn but pays for it: after exd5 Qxd5, Black's queen is out early, and Nc3 develops a piece while HITTING it. Every tempo Black spends shuffling that queen to safety is a tempo you spend building your position. This tempo gift is the entire theme of the line.",
      sayShort: "Nc3 — develop and hit the queen.",
      arrows: [A('c3', 'd5')], highlights: [H('d5', ATK), H('c3', KEY)] }),
    b({ id: 'sca2', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4',
      say: "The queen retreats to a5; you simply build. d4 stakes out a big centre, Nf3 develops, and Bc4 throws the bishop to its most active diagonal, eyeing f7. Black must spend a move on c6 just to give the queen a bolt-hole. You are a clear tempo ahead in development with more space.",
      sayShort: "d4, Nf3, Bc4 — build for free.",
      arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', ATK)] }),
    b({ id: 'sca3', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6',
      say: "Black develops the bishop to f5, outside the pawn chain — sensible. You play Bd2, unpinning the c3-knight and readying long castling, and Black shores up with e6. Quiet, but you keep nudging: the whole position points at Black's slightly loose pieces.",
      sayShort: "Bd2 — unpin, ready to castle long.",
      highlights: [H('d2', KEY), H('f5', SOFT)] }),
    b({ id: 'sca4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Ne4 Qd8 Ng3',
      say: "Now you harry with the knight. Ne4 attacks the f6-knight and forces the queen back to d8 — another tempo lost for Black — and Ng3 hits the bishop on f5. Piece by piece you gain time and drive Black's forces onto worse squares while your own coil.",
      sayShort: "Ne4, Ng3 — chase with tempo.",
      arrows: [A('e4', 'f6'), A('g3', 'f5')], highlights: [H('e4', KEY), H('f6', ATK), H('f5', ATK)] }),
    b({ id: 'sca5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Ne4 Qd8 Ng3 Bg4 c3 Nbd7 h3 Bxf3',
      say: "The bishop sidesteps to g4, pinning your f3-knight; you support the centre with c3, finish development, and h3 puts the question. When Black trades with Bxf3, you recapture with the queen and pick up the bishop pair. The tally: two bishops, a big centre, more space, and a lasting, comfortable edge — exactly what the Scandinavian hands you.",
      sayShort: "h3 — win the bishop pair, comfortable edge.",
      highlights: [H('f3', KEY), H('d4', SOFT)] }),
  ],
};
