import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Nimzo: the Classical / Capablanca (d4 Nf6 c4 e6 Nc3 Bb4 Qc2) — main-line
// master class. The student plays WHITE. Qc2 is the point: it defends c3 in
// advance so that after ...Bxc3+ you recapture with the QUEEN, dodging the
// doubled pawns the Nimzo is built to inflict, and banking the bishop pair. The
// Nimzo is a top-tier defence, so be honest: this is a solid, roughly level game
// where White's small trump is the two bishops. Spine both-sides-sound
// (build-sound-spine.mjs), engine-verified (+0.08 White).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];

export const ANTI_NIMZO_QC2_LESSON: LessonScript = {
  openingId: 'anti-nimzo-qc2',
  sources: SRC,
  title: 'The Nimzo — 4.Qc2 and the bishop pair',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'nim1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2',
      say: "The Nimzo-Indian pins your c3-knight, threatening to take it and wreck your queenside pawns with doubled c-pawns. Qc2 is the classical antidote: it defends the knight in advance, so if Black ever trades on c3 you recapture with the queen — no doubled pawns, and you pocket the bishop pair. Be honest: the Nimzo is a first-rate defence and this is roughly equal; the two bishops are your small, lasting trump.",
      sayShort: "Qc2 — dodge the doubled pawns.",
      highlights: [H('c3', KEY), H('b4', SOFT)] }),
    b({ id: 'nim2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3',
      say: "You castle-proof the position and then put the question with a3. Black takes — Bxc3+ — and you recapture with the queen. There they are: the two bishops, a clean pawn structure, and the makings of a big centre. The trade handed you the bishop pair without a single structural blemish.",
      sayShort: "Qxc3 — the bishop pair, clean pawns.",
      highlights: [H('c3', KEY)] }),
    b({ id: 'nim3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 f3',
      say: "Black develops the bishop to b7, contesting the long diagonal and eyeing your e4-square. You answer with Bg5 to pin the f6-knight and f3 to clamp e4 — because e4 is where your bishop pair wants to expand. Slowly you prepare to build the broad centre that lets two bishops breathe.",
      sayShort: "Bg5, f3 — clamp e4, prep the centre.",
      highlights: [H('e4', KEY), H('f3', SOFT)] }),
    b({ id: 'nim4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 f3 h6 Bh4 d5 cxd5 exd5 e3 Re8',
      say: "Black frees his game with d5; you trade and complete development with e3. The position is balanced and solid — no illusions of an advantage here — but you hold the bishop pair and the safer structure. In a long game, on an open board, those two bishops are the edge that quietly tells. A pleasant, riskless position to outplay from.",
      sayShort: "e3 — level and solid, bishops the edge.",
      highlights: [H('d5', SOFT)] }),
  ],
};
