import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Dutch: the Staunton Gambit (d4 f5 e4) — main-line master class. The
// student plays WHITE. A sharp surprise weapon: sacrifice the e4 pawn to rip
// open lines against the Dutch before Black is developed, hit the f6-knight with
// Bg5, and generate fast piece play. Objectively about level, but a dangerous
// practical try — Black must defend accurately or be overrun. Spine both-sides-
// sound (build-sound-spine.mjs), engine-verified (+0.25 White — active comp).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Dutch_Defence,_Staunton_Gambit'];

export const ANTI_DUTCH_STAUNTON_LESSON: LessonScript = {
  openingId: 'anti-dutch-staunton',
  sources: SRC,
  title: 'The Staunton Gambit — cracking the Dutch open',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'sta1', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5',
      say: "The Dutch grabs kingside space with f5, but that pawn also loosens Black's king. The Staunton Gambit strikes instantly: e4, offering the pawn to blow the position open. After fxe4 Nc3 Nf6 you play Bg5, attacking the f6-knight and threatening Bxf6 to wreck Black's kingside pawns. Black is a pawn up but undeveloped; you have a lead in development and open lines — dangerous, fast play.",
      sayShort: "e4 gambit, Bg5 — hit f6, open lines.",
      highlights: [H('f6', ATK), H('g5', SOFT)] }),
    b({ id: 'sta2', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 c6 f3 d5 fxe4 Nxe4 Nxe4 dxe4',
      say: "Black shores up with c6 and d5; you play f3 to undermine the extra e4-pawn at its base. The exchanges fxe4 Nxe4 Nxe4 dxe4 leave Black clinging to a single pawn on e4 — but it is weak, unsupported, and destined to fall. In return you are well ahead in development with both bishops ready to spring to life.",
      sayShort: "f3 — undermine the weak e4 pawn.",
      highlights: [H('e4', ATK)] }),
    b({ id: 'sta3', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 c6 f3 d5 fxe4 Nxe4 Nxe4 dxe4 Bc4 Qd6 c3',
      say: "Bc4 swings the bishop onto the a2-g8 diagonal, raking toward Black's stranded king that has lost the shelter of its f-pawn. Qd6 covers the loose squares, and you play c3 to bolster d4 and clear the way for Qd2. Every one of your pieces points at Black's position while his kingside is airy and his king cannot easily castle.",
      sayShort: "Bc4 — rake the diagonal at the king.",
      arrows: [A('c4', 'f7')], highlights: [H('f7', SOFT)] }),
    b({ id: 'sta4', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 c6 f3 d5 fxe4 Nxe4 Nxe4 dxe4 Bc4 Qd6 c3 Qg6 Qd2 Bf5 Ne2 Nd7',
      say: "Black consolidates with Qg6, Bf5 and Nd7; you complete the picture with Qd2 connecting the plan and Ne2 heading to g3 or f4 to hit the loose e4-pawn and the f5-bishop. Black holds the extra pawn for now, but it is fragile and your pieces are far more active — a genuine, pleasant edge from a gambit that most Dutch players fear on sight.",
      sayShort: "Qd2, Ne2 — round up the e4 pawn.",
      highlights: [H('e4', ATK), H('e2', SOFT)] }),
  ],
};
