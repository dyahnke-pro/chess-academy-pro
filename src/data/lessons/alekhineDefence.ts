import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for Alekhine's Defence. Lead-the-eye §5a: GREEN
// arrows (non-pawn origin, clear sight-line, named endpoint), YELLOW highlights
// (named key square), SOFT BLUE (secondary). DB-anchored, masters-extended ≥20p.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const ALEKHINE_DEFENCE_LESSON: LessonScript = {
  openingId: 'alekhine-defence',
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
  title: "Alekhine's Defence — A Master Class",
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'e4 Nf6', say: "Alekhine's Defence — the ultimate provocation. Black answers 1.e4 with 1…Nf6, attacking the e4-pawn and daring White to chase the knight forward. The idea is hypermodern: invite White to build a big pawn centre, then prove it over-extended and tear it down with the pieces.", sayShort: '…Nf6 — provoke, then undermine.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
    b({ id: 'nd5', moves: 'e4 Nf6 e5 Nd5', say: "e5 chases the knight and grabs space; …Nd5 hops to an active central square. White has gained territory — exactly as Black wanted. That advanced e5-pawn is not a strength but a target, and Black will start chipping at the centre at once.", sayShort: '…Nd5 — active hop; the centre is a target.', highlights: [H('d5'), H('e5', SOFT)] }),
    b({ id: 'd6', moves: 'e4 Nf6 e5 Nd5 d4 d6', say: "d4 builds the broad centre, and Black strikes immediately with …d6, hitting the e5-spearhead. This is the Alekhine in a nutshell: the moment White over-commits pawns, Black undermines them. White must decide how to handle the tension on e5.", sayShort: '…d6 — strike the e5-spearhead.', highlights: [H('d6'), H('e5')] }),
    b({ id: 'bg4', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4', say: "Nf3 defends e5; Black plays the Modern …Bg4, pinning the knight and pressuring the support of both d4 and e5. Instead of a wild pawn race, the Modern Alekhine develops solidly and leans on White's centre with pieces. Pin, pressure, undermine.", sayShort: '…Bg4 — pin f3, lean on the centre.', arrows: [A('g4', 'f3')], highlights: [H('f3')] }),
    b({ id: 'be7', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7', say: "Be2 breaks the pin's bite, and Black completes a sound setup with …e6 and …Be7, ready to castle. No loose ends — Black is fully developed and the e5/d4 centre is firmly in the cross-hairs, with …c5, …dxe5, and the pieces all bearing down on it.", sayShort: '…e6, …Be7 — solid, eye the centre.', highlights: [H('e5', SOFT)] }),
    b({ id: 'nb6', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O', say: "c4 kicks the knight to b6 and White's centre looks enormous — but it is also a vast target. Black castles, fully developed, and prepares to dismantle the over-extended pawns. The bigger White's centre, the more there is to attack.", sayShort: 'O-O — fully developed vs the big centre.', highlights: [H('b6'), H('c4', SOFT)] }),
    b({ id: 'undermine', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 N8d7 exd6 cxd6', say: "Be3 props the centre, …N8d7 brings the last knight to bear on e5, and after exd6 cxd6 the spearhead is gone — Black has traded off White's advanced pawn and opened the c-file for the rook. The over-extended centre is already crumbling.", sayShort: '…cxd6 — the e5-spearhead is gone.', highlights: [H('d6'), H('e5', SOFT)] }),
    b({ id: 'close', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 N8d7 exd6 cxd6 b3 Nf6 Rc1 Nbd7 h3 Bh5 g4 Bg6 Nh4 d5 Nxg6 hxg6 Bf3 dxc4 bxc4 Rc8 c5 b6', say: "The long manoeuvring battle plays out: Black reroutes the knights, trades the light bishops, strikes the centre with …d5, and chips at c4 with …dxc4 and …b6. There is the Modern Alekhine middlegame — White's once-imposing centre reduced to a pair of pawns under pressure, Black's pieces active on the open c- and h-files. The hypermodern bargain paid off: let White build, then tear it down. The other tabs show the opening's sharper faces — the Four Pawns Attack, the Exchange, the Chase, the Voronezh, and more.", sayShort: '…b6 — the centre dismantled, Black active.', highlights: [H('c4'), H('d5', SOFT)] }),
  ],
};
