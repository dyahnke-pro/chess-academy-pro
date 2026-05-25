import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Queen's Gambit Declined (Orthodox /
// Capablanca freeing system). Lead-the-eye §5a: GREEN arrows (non-pawn origin,
// clear sight-line, named endpoint), YELLOW highlights (named key square), SOFT
// BLUE (secondary). Moves from repertoire.json (DB-anchored, G3); prose only.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const QGD_LESSON: LessonScript = {
  openingId: 'qgd',
  sources: ['book:qgd', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  title: "Queen's Gambit Declined — A Master Class",
  minutes: 13,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 d5 c4 e6', say: "The Queen's Gambit Declined — the most classical, rock-solid answer to 1.d4. Black declines the c4-pawn and instead props the d5-point with …e6, building the firm pawn chain that is the backbone of the whole defence. Solidity first; the QGD has equalised at world-championship level for over a century.", sayShort: '…e6 — decline, build the d5 chain.', highlights: [H('d5'), H('e6')] }),
    b({ id: 'be7', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7', say: "Nc3 and Bg5 pin the f6-knight against the queen; Black answers …Be7, calmly breaking the pin's sting and preparing to castle. No concessions — the dark-squared bishop takes its natural QGD post.", sayShort: '…Be7 — break the pin, prepare to castle.', highlights: [H('e7'), H('f6', SOFT)] }),
    b({ id: 'nbd7', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7', say: "Black castles and develops the classic …Nbd7 — the knight supports the …dxc4 and …e5 breaks to come and keeps the structure compact. This is the Orthodox QGD set-up that Capablanca and Lasker trusted with the black pieces.", sayShort: '…Nbd7 — Orthodox knight, prep the breaks.', highlights: [H('d7')] }),
    b({ id: 'dxc4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4', say: "After …c6 shores up the centre, Black uncorks the freeing capture …dxc4. Trading the d5-pawn for White's c-pawn gains a vital tempo on the d3-bishop and opens the position just as Black completes development — the timing is everything.", sayShort: '…dxc4 — capture with tempo on the bishop.', highlights: [H('c4'), H('c6', SOFT)] }),
    b({ id: 'nd5', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7', say: "The Capablanca freeing manoeuvre: …Nd5! The knight jumps to the centre, attacks the c3-knight, and forces trades — Bxe7 Qxe7 swaps the dark bishops and eases Black's only cramped piece off the board. Simplify, then equalise.", sayShort: '…Nd5 — the Capablanca freeing leap.', arrows: [A('d5', 'c3')], highlights: [H('d5'), H('c3')] }),
    b({ id: 'e5', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5', say: "…Nxc3 trades the second pair of knights, and then the thematic …e5! Black strikes at the d4-centre, claims his fair share of the board, and frees the position completely. This central break is the whole point of the Orthodox QGD.", sayShort: '…e5 — the freeing central break.', highlights: [H('e5'), H('d4', SOFT)] }),
    b({ id: 'exd4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5 Bb3 exd4 exd4 Nf6', say: "Bb3 retreats; …exd4 exd4 clarifies the centre, leaving White with an isolated d4-pawn, and …Nf6 redeploys the knight to its best square, eyeing the e4- and d5-outposts in front of that isolated pawn. Black's pieces target the weakness.", sayShort: '…Nf6 — eye the squares around the IQP.', arrows: [A('f6', 'd5')], highlights: [H('d4'), H('d5', SOFT)] }),
    b({ id: 'close', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5 Bb3 exd4 exd4 Nf6 Re1 Qd6 Ne5 Be6 Bxe6 fxe6 Qb3 Rab8', say: "Black finishes mobilising — …Qd6 centralises, …Be6 trades off White's good bishop, and after …fxe6 Black has a rock-solid pawn cluster blockading the isolated d4-pawn, with …Rab8 ready to meet any queenside pressure. There is the Orthodox QGD: a fully equal middlegame where White's isolated pawn is the only imbalance, and it favours Black. The other tabs show the Tartakower, the Lasker, the Exchange minority attack, and the modern Bf4 lines.", sayShort: '…Rab8 — blockade the IQP, fully equal.', highlights: [H('e6'), H('d4')] }),
  ],
};
