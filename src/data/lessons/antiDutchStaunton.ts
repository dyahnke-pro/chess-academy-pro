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
      say: "The Dutch grabs kingside space with …f5 — but that pawn also loosens Black's king, and the Staunton Gambit pounces instantly: e4, offering the pawn to blow the position wide open. After fxe4 Nc3 Nf6 you play Bg5, hitting the f6-knight and threatening Bxf6 to shatter Black's kingside pawns. Sure, Black's up a pawn — but he's undeveloped, and you've got a lead in development and open lines. Fast, dangerous stuff.",
      sayShort: "e4 gambit, Bg5 — hit f6, open lines.",
      highlights: [H('f6', ATK), H('g5', SOFT)] }),
    b({ id: 'sta2', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 c6 f3 d5 fxe4 Nxe4 Nxe4 dxe4',
      say: "Black shores up with …c6 and …d5; you play f3 to undermine that extra e4-pawn right at its base. The exchanges fxe4 Nxe4 Nxe4 dxe4 leave Black clinging to a single pawn on e4 — weak, unsupported, and doomed to fall. And in return, you're miles ahead in development with both bishops itching to spring to life.",
      sayShort: "f3 — undermine the weak e4 pawn.",
      highlights: [H('e4', ATK)] }),
    b({ id: 'sta3', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 c6 f3 d5 fxe4 Nxe4 Nxe4 dxe4 Bc4 Qd6 c3',
      say: "Bc4 swings the bishop onto the a2-g8 diagonal, raking toward Black's stranded king — the one that lost the shelter of its f-pawn. …Qd6 covers the loose squares, and you play c3 to bolster d4 and clear the road for Qd2. Every single piece you own points at Black's position, while his kingside is airy and his king can't easily castle.",
      sayShort: "Bc4 — rake the diagonal at the king.",
      arrows: [A('c4', 'f7')], highlights: [H('f7', SOFT)] }),
    b({ id: 'sta4', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 c6 f3 d5 fxe4 Nxe4 Nxe4 dxe4 Bc4 Qd6 c3 Qg6 Qd2 Bf5 Ne2 Nd7',
      say: "Black consolidates with …Qg6, …Bf5 and …Nd7; you complete the picture — Qd2 connecting the plan, Ne2 heading for g3 or f4 to hit the loose e4-pawn and that f5-bishop. Black hangs onto the extra pawn for now, but it's fragile and your pieces are FAR more active. A genuine, pleasant edge — from a gambit most Dutch players dread on sight.",
      sayShort: "Qd2, Ne2 — round up the e4 pawn.",
      highlights: [H('e4', ATK), H('e2', SOFT)] }),
  ],
};
