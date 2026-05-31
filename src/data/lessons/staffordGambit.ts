import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented trap-showcase for the Stafford Gambit. kind:'roadmap' — the
// Stafford is an objectively dubious SURPRISE TRAP (Black is a pawn down with
// no full comp), so this lesson teaches the WINNING trap line, framed honestly,
// not a sound system. The line is engine-verified to +4.8 for Black; every move
// chess.js-legal (G3). Sound main play is covered by the warnings.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:tac-sacrifice', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];

export const STAFFORD_GAMBIT_LESSON: LessonScript = {
  openingId: 'stafford-gambit',
  sources: SRC,
  title: 'Stafford Gambit — The Trap',
  minutes: 7,
  orientation: 'black',
  kind: 'roadmap',
  beats: [
    b({ id: 'open', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6', say: "The Stafford Gambit — a pure surprise trap. Be clear-eyed: after 3.Nxe5 Nc6 4.Nxc6 dxc6 Black is simply a pawn down with no sound compensation. Its value is the venom that follows if White relaxes for one move.", sayShort: '…Nc6 — the Stafford trap offer.', highlights: [H('e5')] }),
    b({ id: 'recapture', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6', say: "…dxc6 recaptures. The pawn is gone, but both bishops and the queen now have open lines toward White's king. Black plays for one thing: to lure a natural-looking move that loses on the spot.", sayShort: '…dxc6 — open lines, lay the trap.', highlights: [H('c6')] }),
    b({ id: 'setup', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5', say: "…Bc5 rakes the a7-g1 diagonal, the bishop trained squarely on f2. Everything is aimed at the one square in front of White's king.", sayShort: '…Bc5 — aim the bishop at f2.', arrows: [A('c5', 'f2')], highlights: [H('c5'), H('f2')] }),
    b({ id: 'trap', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 h3', say: "h3 — a move almost everyone plays on autopilot, stopping a future …Bg4. Here it is the fatal slip: it does nothing about the storm aimed at f2.", sayShort: 'h3 — the natural, losing move.', highlights: [H('h3'), H('f2')] }),
    b({ id: 'shot', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 h3 Nxe4 dxe4 Bxf2+', say: "…Nxe4! blows it open — and after dxe4, …Bxf2+! the bishop crashes in with check. The point: …Nxe4 first ripped open the d-file, so once the king is dragged out the d1-queen is left with no shelter.", sayShort: '…Bxf2+ — crash through with check.', highlights: [H('e4'), H('d1')] }),
    b({ id: 'win', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 h3 Nxe4 dxe4 Bxf2+ Kxf2 Qxd1', say: "Kxf2 …Qxd1 — Black wins the queen outright. That is the Stafford in one breath: objectively unsound, lethal against a single careless move. Spring it as a surprise, and respect the warnings for when White plays it right.", sayShort: '…Qxd1 — win the queen.', highlights: [H('d1')] }),
  ],
};
