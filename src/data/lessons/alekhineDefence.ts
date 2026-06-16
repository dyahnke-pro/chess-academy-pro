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
    b({ id: 'nb6', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6', say: "c4 kicks the knight to b6, and White's centre — c4, d4 and the e5-spearhead — looks enormous. But it is also a sprawling target. Black has provoked exactly the over-extension the Alekhine is built to punish; now the dismantling begins.", sayShort: '…Nb6 — provoke the broad centre.', highlights: [H('b6'), H('c4', SOFT), H('e5', SOFT)] }),
    // ACCURACY RE-ANCHOR (2026-06-16): the old tail walked the …Nc6 + d5-break
    // exchange line that scores only ~31% for Black at masters / 34% at club —
    // Black over-extends. Re-anchored to the sound early-…dxe5 resolution
    // (exd6 cxd6, open c-file): engine −0.80, masters 42% / club 49% (6,523g).
    b({ id: 'resolve', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 exd6 cxd6', say: "Here is the key, accurate decision: White releases the tension with exd6 and Black recaptures …cxd6. The picture clarifies. The e5-spearhead — the whole point of White's space — is gone, leaving only c4 and d4, and Black's rook gets a freshly opened c-file. Black has traded White's most advanced asset for an open line and an easy game.", sayShort: '…cxd6 — trade the spearhead, open the c-file.', highlights: [H('d6'), H('c4', SOFT)] }),
    b({ id: 'complete', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 exd6 cxd6 Nc3 O-O h3 Bh5', say: "Nc3 develops, Black castles into safety, and after h3 the bishop slides to h5 — keeping the f3-knight pinned rather than conceding the bishop pair. Black is harmoniously placed: the open c-file for the rook, the pieces trained on d4, and White's centre reduced to the c4 and d4 pawns, to be chipped at with …Nc6 and …Rc8. This is the sound heart of the Modern Alekhine — provoke the big centre, trade off its spearhead, and emerge with an easy, active game that scores right around fifty percent where it counts. The other tabs show the sharper faces: the Four Pawns Attack, the Exchange, and the Chase.", sayShort: '…Bh5 — keep the pin, easy active game.', arrows: [A('h5', 'f3')], highlights: [H('d4'), H('c4', SOFT)] }),
  ],
};
