import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Latvian Gambit — video-grounded Watch build #10 (David 2026-07-15).
// The student plays WHITE. TAUGHT line (instructional-content doctrine: only
// 5 corpus games — the video + engine carry this build, flagged as taught):
// meet 2…f5 with the immediate d4 central strike — "your hand plays it before
// your brain registers" (paraphrased). Engine-verified 2026-07-15: the …exd4
// branch runs to +1.00 for White behind the e5 wedge; the …fxe4 branch is
// +0.55 at 15s depth after Nxe5. Red-target grammar.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Latvian_Gambit'];

export const ANTI_LATVIAN_LESSON: LessonScript = {
  openingId: 'anti-latvian',
  sources: SRC,
  title: 'Refuting the Latvian Gambit',
  minutes: 5,
  orientation: 'white',
  beats: [
    b({ id: 'alv-1', moves: 'e4 e5 Nf3 f5',
      say: "The Latvian Gambit — a King's Gambit with the colors reversed and a tempo down, which tells you everything about its objective merit. Black throws the f-pawn forward, exposing the king's diagonal on move two, and hopes you'll either grab greedily or freeze. There's a reason a famous teaching grandmaster's rule of thumb is simply: never play f-five. Your job is to prove it.",
      sayShort: "The Latvian — f5, really?",
      highlights: [H('f5', RED), H('e8', KEY)] }),
    b({ id: 'alv-2', moves: 'e4 e5 Nf3 f5 d4',
      say: "The reply your hand should play before your brain finishes registering the gambit: d4, the immediate central strike. Black weakened the centre and the king in one move — so open the centre NOW, while the weakness is at its rawest. No memorization required yet; just the principle that a flank lunge is answered in the middle.",
      sayShort: "d4 — punish in the centre.",
      highlights: [H('d4', SOFT), H('e5', RED), H('f5', RED)] }),
    b({ id: 'alv-3', moves: 'e4 e5 Nf3 f5 d4 exd4 e5',
      say: "When Black trades in the centre, the e-pawn advances — and this wedge is the whole refutation. It cramps everything: the g8-knight's best square is gone, the f5-pawn is now a permanent hole-maker rather than an attacker, and Black's king sits behind an airy diagonal for the rest of the game. The engine gives White a full pawn's worth of advantage here — against a gambit, while material is still EQUAL. That's what a positional refutation looks like.",
      sayShort: "e5 — the decisive wedge.",
      highlights: [H('e5', SOFT), H('f6', KEY), H('e8', RED)] }),
    b({ id: 'alv-4', moves: 'e4 e5 Nf3 f5 d4 exd4 e5 d6 Bc4',
      say: "Black chips at the wedge; you develop the bishop to the diagonal that Black personally opened with the f-pawn. Look where it points: straight through to the king, with the g8-square — the knight's home — under surveillance. Every developing move you make from here doubles as an attacking move, because the second move of the game left the target fixed forever.",
      sayShort: "Bc4 — the diagonal Black opened.",
      arrows: [A('c4', 'g8')],
      highlights: [H('c4', SOFT), H('g8', RED)] }),
    b({ id: 'alv-5', moves: 'e4 e5 Nf3 f5 d4 exd4 e5 d6 Bc4 d5 Bb3 Bc5 Nxd4 Qh4 Be3',
      say: "Black tries activity — the pawn push, the bishop, even the early queen lunge — and calm development answers everything: the bishop tucks back to b3, ready for the diagonal to reopen, the knight collects the d4-pawn, and the dark-squared bishop reinforces that knight while asking Black's c5-bishop what it actually accomplishes. Material is level, the engine keeps White a clean pawn's worth ahead positionally, and Black's initiative was spent before it started. The Latvian refuted: one central strike, one wedge, and development that attacks by existing.",
      sayShort: "Be3 — calm answers everything.",
      highlights: [H('e3', SOFT), H('h4', RED), H('d4', KEY)] }),
  ],
};
