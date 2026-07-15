import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Accelerated Dragon (Black) — video-grounded Watch build #14 (David
// 2026-07-15). The student plays BLACK. Grounded on the dedicated theory
// video (the tempo-saving …d5 doctrine, the Ng4 rule, the Ng8 retreat, the
// Maróczy Nf6-first trap) + the Maróczy mastering/endgame videos + the
// corpus: 756 hyper-accelerated games @ 53.2% and 101 Nc6-order games @
// 64.9% (data/sources/danielnaroditsky-trees/{hyper-,}accel-dragon.json).
// Engine-verified 2026-07-15: mainline +0.42 at 26 plies; the Qd2?! Ng4
// crush +3.31; Ng8 holds 0.07; Maróczy e5?? Qa5+ trap +1.04; the Maróczy
// proper runs −0.42 (White's space vs the unbreakable structure — narrated
// honestly, never as equality). Red-target grammar.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Accelerated_Dragon'];

export const ACCEL_DRAGON_LESSON: LessonScript = {
  openingId: 'accel-dragon',
  sources: SRC,
  title: 'The Accelerated Dragon',
  minutes: 7,
  orientation: 'black',
  beats: [
    b({ id: 'acd-1', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6',
      say: "The Accelerated Dragon — and the name is literal. The regular Dragon plays the fianchetto AFTER spending a move on d6; this opening plays it immediately, and that one saved tempo is the entire identity. Here's the promise you're making to yourself: the d-pawn stays home until it can jump to d5 in a single move. Guard that promise and White's most dangerous setups lose their teeth. Break it, and you've transposed into a theory war you didn't sign up for.",
      sayShort: "Fianchetto now — the d-pawn waits.",
      highlights: [H('g6', SOFT), H('d7', KEY)] }),
    b({ id: 'acd-2', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6',
      say: "The bishop lands on the long diagonal — the piece this whole opening is built around — and the knight develops with discipline. Notice what Black did NOT play: d6. That innocent move would hand White a free transposition into the mainline Dragon with f3, where the theory runs razor-sharp for thirty moves. One more standing rule to pocket now: the moment White's queen steps off d1, the knight hop to g4 is in the air — trading your knight for the dark-squared bishop leaves YOUR dragon bishop without a rival.",
      sayShort: "Bg7, Nf6 — still no d6.",
      highlights: [H('g7', SOFT), H('f6', SOFT), H('d6', KEY)] }),
    b({ id: 'acd-3', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 f3 O-O Qd2',
      say: "White builds the famous attacking setup — f3, queen to d2, castling long on the horizon — expecting a mainline Dragon and a race of opposite-side attacks. This is the trap strong players walk into by habit, because against the ACCELERATED move order the setup simply doesn't work. Why? Count Black's tempi: no d6 was ever played. The break that mainline Dragon players dream about for twenty moves is available right now, in one move.",
      sayShort: "White sets up — the trap is theirs.",
      highlights: [H('f3', SOFT), H('d2', SOFT), H('d5', KEY)] }),
    b({ id: 'acd-4', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 f3 O-O Qd2 d5',
      say: "There it is — d5, the whole opening in one move. The pawn strikes the centre and hits e4, and every move White spent preparing the Dragon-killing setup is suddenly furniture: f3 blocks the knight's best square, the queen on d2 stares at a pawn that already left. The engine's verdict on this position is dead level — which, as Black, six moves into White's pet attacking line, is a small victory in itself. And the play from here is all yours.",
      sayShort: "d5 in one move — setup refuted.",
      highlights: [H('d5', SOFT), H('e4', RED), H('f3', RED)] }),
    b({ id: 'acd-5', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 f3 O-O Qd2 d5 exd5 Nxd5 Nxd5 Qxd5 Nxc6 Qxc6',
      say: "The trades run, and look what's left standing: Black's queen arrived on d5 and now sits on c6 owning the half-open file, and the g7-bishop — with every obstacle traded away — breathes fire down the whole long diagonal, straight at b2. White's next move is forced in spirit: something must block that bishop or the queenside collapses. When your opponent's moves start being ABOUT your pieces, the opening has succeeded.",
      sayShort: "Queen active — the bishop breathes fire.",
      arrows: [A('g7', 'b2')],
      highlights: [H('c6', SOFT), H('b2', RED)] }),
    b({ id: 'acd-6', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 f3 O-O Qd2 d5 exd5 Nxd5 Nxd5 Qxd5 Nxc6 Qxc6 Bd4 Bxd4 Qxd4 Be6',
      say: "White rushes the bishop to d4 to silence the dragon, the trade happens on Black's terms, and the last piece develops: bishop to e6, sliding onto the diagonal that runs all the way down to a2. Take stock — Black finished development first, owns the c-file pressure, and holds the safer structure, with the engine giving Black the pull in a line WHITE chose. That's the Accelerated Dragon: one saved tempo, patiently guarded, cashed in as a permanent initiative.",
      sayShort: "Be6 — development done, Black pulls.",
      arrows: [A('e6', 'a2')],
      highlights: [H('e6', SOFT), H('a2', RED)] }),
  ],
};
