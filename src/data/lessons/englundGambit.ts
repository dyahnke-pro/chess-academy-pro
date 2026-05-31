import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented trap-showcase for the Englund Gambit. kind:'roadmap' — the
// Englund (1…e5 vs 1.d4) is objectively a pawn down with no full comp, a pure
// surprise trap. This teaches the WINNING …Qb4+ raid (engine +3.6 for Black,
// chess.js-legal, G3), framed honestly. Sound play is covered by the warnings.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:tac-sacrifice', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Englund_Gambit'];

export const ENGLUND_GAMBIT_LESSON: LessonScript = {
  openingId: 'englund-gambit',
  sources: SRC,
  title: 'Englund Gambit — The Trap',
  minutes: 6,
  orientation: 'black',
  kind: 'roadmap',
  beats: [
    b({ id: 'open', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7', say: "The Englund Gambit — 1…e5!? against 1.d4, a pure surprise trap. Honestly: Black is a pawn down for not enough. But …Nc6 and …Qe7 set a snare — the queen eyes the e5-pawn AND the b4-square, and one natural White move walks right into it.", sayShort: '…Qe7 — eye e5 and b4, set the trap.', highlights: [H('e5'), H('b4')] }),
    b({ id: 'trap', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4', say: "Bf4 — sensible-looking development, defending the extra pawn. It is exactly the move the Englund is hunting.", sayShort: 'Bf4 — the natural, losing move.', highlights: [H('f4')] }),
    b({ id: 'check', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+', say: "…Qb4+! The queen leaps out with check, forking the white king on e1 and the undefended b2-pawn. White must deal with the check first.", sayShort: '…Qb4+ — check and fork b2.', arrows: [A('b4', 'e1')], highlights: [H('b4'), H('b2')] }),
    b({ id: 'grab', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2', say: "Bd2 blocks the check, and …Qxb2 snatches the pawn — now the queen also bears down on the rook in the corner on a1. White is already scrambling.", sayShort: '…Qxb2 — grab the pawn, hit a1.', arrows: [A('b2', 'a1')], highlights: [H('b2'), H('a1')] }),
    b({ id: 'win', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4', say: "Bc3 defends the rook — but …Bb4! piles onto the bishop, which is tied to that defence and cannot survive the extra attacker. Black wins material. The Englund trap, sprung — a surprise weapon, no more, no less.", sayShort: '…Bb4 — overload the bishop, win material.', arrows: [A('b4', 'c3')], highlights: [H('b4'), H('c3')] }),
  ],
};
