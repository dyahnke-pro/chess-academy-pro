import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Philidor Defence. Lead-the-eye §5a: GREEN
// arrows (non-pawn origin, clear sight-line, named endpoint), YELLOW highlights
// (named key square), SOFT BLUE (secondary). Moves come from repertoire.json
// (DB-anchored, G3); prose only is authored.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PHILIDOR_DEFENCE_LESSON: LessonScript = {
  openingId: 'philidor-defence',
  sources: ['book:philidor-defence', 'concept:pos-center', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/Philidor_Defence'],
  title: 'Philidor Defence — A Master Class',
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'e4 e5 Nf3 d6', say: "The Philidor — Black's rock-solid answer to 1.e4. Rather than defend the e5-pawn with a piece, Black props it with the pawn …d6. The structure is humble but unbreakable: no weaknesses, no early tactics, and a clear plan to follow. Philidor himself called the pawns 'the soul of chess', and here they are the foundation.", sayShort: '…d6 — prop e5, build a solid base.', highlights: [H('e5'), H('d6')] }),
    b({ id: 'nf6', moves: 'e4 e5 Nf3 d6 d4 Nf6', say: "d4 challenges the centre; Black develops …Nf6, attacking the e4-pawn and refusing to resolve the tension. Modern theory avoids the old …exd4 and keeps the pawn on e5 as long as possible — the cramped but sound Philidor structure.", sayShort: '…Nf6 — hit e4, keep the tension.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
    b({ id: 'nbd7', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7', say: "Nc3 defends e4; Black plays the key Hanham move …Nbd7. The knight does triple duty — it overprotects e5, it stays flexible to reroute via f8 or b6, and it keeps the position compact. This is the heart of the modern Philidor.", sayShort: '…Nbd7 — Hanham knight, overprotect e5.', arrows: [A('d7', 'e5')], highlights: [H('e5')] }),
    b({ id: 'be7', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O', say: "Bc4 eyes f7; Black calmly develops …Be7 and castles. There is no rush — the Hanham set-up is about completing development behind a solid wall, then choosing the right moment to strike. Both kings are safe and the real game begins.", sayShort: '…Be7, …O-O — finish behind the wall.', highlights: [H('f7', SOFT)] }),
    b({ id: 'c6', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 b6', say: "Re1 props e4; Black prepares the freeing break with …c6 — controlling d5 and b5 — and develops the queenside with …b6, clearing b7 for the bishop. Every move serves the coming …d5 strike at the centre.", sayShort: '…c6, …b6 — prepare the …d5 break.', highlights: [H('c6'), H('d5', SOFT)] }),
    b({ id: 'bb7', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 b6 Be3 Bb7', say: "Be3 completes White's development; Black answers …Bb7. The bishop sits behind the c6-pawn for now, but it is loaded — the instant the centre opens, it will rake the long diagonal straight at e4 and the white king. Black is fully mobilised and ready.", sayShort: '…Bb7 — loaded behind c6, ready to spring.', highlights: [H('b7'), H('e4', SOFT)] }),
    b({ id: 'd5', moves: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 b6 Be3 Bb7 Qd2 d5', say: "Qd2, and Black uncorks the thematic …d5! The break that defines the modern Philidor: it strikes at the e4-pawn, frees the cramped position, and opens the long diagonal for the b7-bishop. After the dust settles Black has equalised fully from a structure that looked passive — humble pawns, soul of the position, doing exactly their job. The other tabs show White's sharper tries: the Exchange, the Antoshin, the Nimzowitsch, the …f5 Counter-Gambit, and the quiet Modern d3.", sayShort: '…d5 — the freeing break, full equality.', highlights: [H('d5'), H('e4')] }),
  ],
};
