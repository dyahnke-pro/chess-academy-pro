import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Philidor: the Bc4 System — video-grounded Watch build #7 (David
// 2026-07-15). The student plays WHITE. The tricky move order taught in the
// dedicated video (paraphrased, never quoted — data/sources/
// danielnaroditsky-voice/per-opening/ transcripts): Bc4 BEFORE d4, echoing a
// famous world-championship-era game from the eighties. It disconcerts
// Philidor players, sets the Legal's-mate trap immediately, and transposes
// into the favorable d4 structure at will. Corpus: 79 games @ 63.9%
// (anti-philidor-white tree; the video teaching is the primary ground per the
// instructional-content doctrine). Engine-verified 2026-07-15: main +0.27 at
// 25 plies incl. the center fork trick + Bd3 answer; the Legal's-mate gem is
// a VERIFIED CHECKMATE line. Red-target grammar.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:tac-discovered', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Philidor_Defence'];

export const ANTI_PHILIDOR_LESSON: LessonScript = {
  openingId: 'anti-philidor',
  sources: SRC,
  title: 'Beating the Philidor — the Bc4 move order',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'aph-1', moves: 'e4 e5 Nf3 d6 Bc4',
      say: "The Philidor props up e5 with the d-pawn and waits. Everyone expects you to strike with d4 immediately — so don't. Bishop to c4 first, a move order used in a famous world-championship-era game from the eighties. It looks quiet. It isn't: the bishop clamps onto f7, the most tender square on Black's board, and a trap is already set that has won countless miniatures. Philidor players find this genuinely disconcerting — their prepared move orders assume the immediate d4.",
      sayShort: "Bc4 — clamp f7, set the trap.",
      arrows: [A('c4', 'f7')],
      highlights: [H('c4', SOFT), H('f7', RED)] }),
    b({ id: 'aph-2', moves: 'e4 e5 Nf3 d6 Bc4 Be7 Nc3',
      say: "Black develops sensibly — the bishop block is the safe reply — and you complete the knight development. Here's the beauty of this move order: it doesn't matter exactly when d4 comes, as long as it comes in a timely fashion. Knight to c3 first, castle next, or d4 right away — every road leads to the same favorable structure. Flexibility is a weapon: Black has to prepare for all of it.",
      sayShort: "Nc3 — flexible, d4 is coming.",
      highlights: [H('c3', SOFT), H('e7', KEY)] }),
    b({ id: 'aph-3', moves: 'e4 e5 Nf3 d6 Bc4 Be7 Nc3 Nf6 d4 exd4 Nxd4',
      say: "Now the strike: d4, opening the centre while Black's pieces are still finding squares. Black trades and the knight recaptures, landing on the central post. Compare the two positions: White has the more active bishop, the centralized knight, and the half-open d-file pointing at Black's backward d-pawn. The Philidor gave up the centre for solidity — your job from here is to make solidity feel like suffocation.",
      sayShort: "d4, Nxd4 — the centre is yours.",
      highlights: [H('d4', SOFT), H('d6', RED)] }),
    b({ id: 'aph-4', moves: 'e4 e5 Nf3 d6 Bc4 Be7 Nc3 Nf6 d4 exd4 Nxd4 O-O O-O',
      say: "Both sides castle — and now one warning that applies to this exact piece arrangement in almost every open game: the center fork trick. Black can play knight takes e4, and if you recapture, the d-pawn forks your bishop and knight and Black regains the piece. It is NOT a refutation — but you must know the answer in advance. It's coming on the next move.",
      sayShort: "Castled — beware the fork trick.",
      arrows: [A('f6', 'e4')],
      highlights: [H('e4', RED), H('f6', KEY)] }),
    b({ id: 'aph-5', moves: 'e4 e5 Nf3 d6 Bc4 Be7 Nc3 Nf6 d4 exd4 Nxd4 O-O O-O Nxe4 Nxe4 d5 Bd3',
      say: "There it is — knight takes, and the d-pawn springs forward, forking bishop and knight. The move that keeps everything is bishop to d3: step aside, keep the knight defended exactly long enough, and let Black take back the piece on YOUR terms. When the dust settles, material is level and White keeps the pull — the engine says about a quarter of a pawn, with the better bishop and the safer structure. The trick solved nothing; it just traded Black's best resource for a slightly worse endgame.",
      sayShort: "Bd3 — the fork trick, defused.",
      arrows: [A('d3', 'e4')],
      highlights: [H('d3', SOFT), H('d5', KEY), H('e4', RED)] }),
    b({ id: 'aph-6', moves: 'e4 e5 Nf3 d6 Bc4 Be7 Nc3 Nf6 d4 exd4 Nxd4 O-O O-O Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4 Nd7 Re1 Nf6 Bf3 c6 Bf4',
      say: "Into the middlegame: the bishop recaptures and then redeploys to f3, eyeing the queenside diagonal; the rook takes the open e-file; the dark-squared bishop comes to f4, staring at the d6-hole the Philidor left behind forever. Every White piece aims at something Black must defend. That's the whole system — a tricky move order, one trap, one trick to know, and a permanently more comfortable game.",
      sayShort: "Re1, Bf4 — press the d6 hole.",
      arrows: [A('e1', 'e7'), A('f4', 'd6')],
      highlights: [H('f4', SOFT), H('d6', RED), H('e1', SOFT)] }),
  ],
};
