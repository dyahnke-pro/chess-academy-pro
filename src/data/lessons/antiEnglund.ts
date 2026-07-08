import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Englund (White): d4 e5 dxe5 Nc6 Nf3 Qe7 — main-line master class. The
// student plays WHITE. The Englund Gambit is unsound; the cleanest punishment is
// to let Black overreach with ...Qxb2 and then TRAP the greedy queen with Nc3,
// Rb1, Nd5 and Rb5. Spine both-sides-sound (build-sound-spine.mjs), engine-
// verified (+1.97 White).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Englund_Gambit'];

export const ANTI_ENGLUND_LESSON: LessonScript = {
  openingId: 'anti-englund',
  sources: SRC,
  title: 'Refuting the Englund Gambit — trap the queen',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'eng1', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4',
      say: "The Englund Gambit chucks a pawn with …e5 for cheap tricks — it's just unsound, and the way you punish it is by staying rock-solid. Take the pawn, develop Nf3 to guard it, and when the queen swings to e7 threatening to win e5 back, Bf4 defends everything while developing. You're a healthy pawn up, without a care in the world.",
      sayShort: "Bf4 — hold the pawn, develop.",
      highlights: [H('e5', KEY), H('f4', SOFT)] }),
    b({ id: 'eng2', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2',
      say: "Black lashes out — …Qb4+ and then grabs on b2, snatching a second pawn with the queen. It looks greedy because it IS greedy: that queen's now buried deep in your camp with no plan to get out. And you're about to make Black pay dearly for sending his most valuable piece off pawn-hunting.",
      sayShort: "…Qxb2? — the queen overreaches.",
      highlights: [H('b2', ATK)] }),
    b({ id: 'eng3', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Nc3 Bb4 Rb1',
      say: "Nc3 develops with a threat, and Rb1 swings the rook onto the b-file — hitting the queen and slamming the door on its retreat. Feel the net tightening: every developing move you make ALSO chases that queen, and it's running clean out of safe squares.",
      sayShort: "Nc3, Rb1 — spring the net.",
      arrows: [A('b1', 'b2')], highlights: [H('b1', KEY), H('b2', ATK)] }),
    b({ id: 'eng4', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Nc3 Bb4 Rb1 Qa3 Nd5 Ba5 Rb5',
      say: "The queen bolts to a3; you spring Nd5, threatening the fork on c7, and Rb5 attacks the bishop while keeping the queen boxed on the rim. Black's tied in absolute knots — pieces hanging, queen trapped on the edge — and you're winning by a mile. That's the Englund's just reward: greed, punished by a hunt.",
      sayShort: "Nd5, Rb5 — the hunt, winning.",
      arrows: [A('d5', 'c7')], highlights: [H('d5', KEY), H('a3', ATK), H('c7', SOFT)] }),
  ],
};
