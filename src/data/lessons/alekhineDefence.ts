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
    // DATA-REBUILD (2026-05-30): tail re-authored on the most-played master line
    // (…Nc6 with the d5-break exchanges, engine −0.33 for Black), replacing the
    // older …N8d7 line that ran 38 plies past common theory in one summary beat.
    b({ id: 'develop', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 Nc6', say: "Be3 braces the big centre, and Black brings the last piece into the assault — …Nc6, the knight leaning on both d4 and e5. Now every Black piece points at White's pawn front; the hypermodern plan is fully loaded.", sayShort: '…Nc6 — pile onto the centre.', arrows: [A('c6', 'd4'), A('c6', 'e5')], highlights: [H('d4'), H('e5')] }),
    b({ id: 'crack', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 Nc6 exd6 cxd6 d5', say: "exd6 cxd6 opens the c-file for Black's rook, and White lunges d5 to chase the c6-knight — but prising the centre open only helps the side that has been aiming at it all along.", sayShort: '…cxd6, d5 — the centre cracks open.', highlights: [H('d5'), H('c6')] }),
    b({ id: 'exchanges', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 Nc6 exd6 cxd6 d5 exd5 Nxd5 Nxd5 Qxd5', say: "The centre dissolves — …exd5, the knights trade on d5, and White's queen recaptures, perched in the middle of the board. But that proud queen is a target, not a boast: Black is about to gain time hitting it.", sayShort: '…exchanges — White’s queen lands on d5.', highlights: [H('d5')] }),
    b({ id: 'close', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 Nc6 exd6 cxd6 d5 exd5 Nxd5 Nxd5 Qxd5 Be6 Qd2 d5 c5 Bf6', say: "…Be6 hits the d5-queen and gains a tempo; after Qd2 Black plants a pawn on …d5 and swings the bishop to f6 on the long diagonal. There is the Modern Alekhine in one breath: let White build the broad centre, trade it down, and emerge with the freer, easier game and the more active pieces. The other tabs show its sharper faces — the Four Pawns Attack, the Exchange, the Chase, and more.", sayShort: '…Bf6 — free and easy, the Alekhine bargain.', highlights: [H('e6'), H('d5'), H('f6', SOFT)] }),
  ],
};
