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
      say: "The Englund Gambit throws a pawn away with e5 for cheap tricks; it is simply unsound, and you punish it by keeping things solid. You take the pawn, develop Nf3 to guard it, and when the queen comes to e7 threatening to regain e5, Bf4 defends everything while developing. You are a healthy pawn up with no problems.",
      sayShort: "Bf4 — hold the pawn, develop.",
      highlights: [H('e5', KEY), H('f4', SOFT)] }),
    b({ id: 'eng2', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2',
      say: "Black lashes out — Qb4+ and then grabs on b2, snatching a second pawn with the queen. This looks greedy because it IS greedy: the queen is now deep in your camp with no escape plan. You are about to make Black pay for sending his most valuable piece pawn-hunting.",
      sayShort: "…Qxb2? — the queen overreaches.",
      highlights: [H('b2', ATK)] }),
    b({ id: 'eng3', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Nc3 Bb4 Rb1',
      say: "Nc3 develops with a threat, and Rb1 swings the rook onto the b-file, hitting the queen and cutting off its retreat down the board. The net is tightening: every developing move you make also chases the queen, and it is running out of safe squares.",
      sayShort: "Nc3, Rb1 — spring the net.",
      arrows: [A('b1', 'b2')], highlights: [H('b1', KEY), H('b2', ATK)] }),
    b({ id: 'eng4', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Nc3 Bb4 Rb1 Qa3 Nd5 Ba5 Rb5',
      say: "The queen flees to a3; you leap in with Nd5, threatening a fork on c7, and Rb5 attacks the bishop while keeping the queen boxed in on the edge. Black is tied in knots — pieces hanging, queen trapped on the rim — and you are winning by a wide margin. This is the Englund's just reward: greed punished by a hunt.",
      sayShort: "Nd5, Rb5 — the hunt, winning.",
      arrows: [A('d5', 'c7')], highlights: [H('d5', KEY), H('a3', ATK), H('c7', SOFT)] }),
  ],
};
