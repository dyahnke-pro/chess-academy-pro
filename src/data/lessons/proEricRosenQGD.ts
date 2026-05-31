import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Queen's Gambit Declined (Black). 725 games. The main spine is
// the Exchange/Carlsbad structure he reaches most: …e6, …d5, …c6, …Bd6 and the
// classic minority-attack defense. Two registers per beat; no move-number
// prefixes in spoken text; green vision arrows only.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pawn-minority-attack', 'concept:pos-development', 'https://www.chess.com/openings/Queens-Gambit-Declined', 'https://api.chess.com/pub/player/imrosen/games/archives'];

export const PRO_ERICROSEN_QGD_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-qgd', title: "Rosen's QGD — the Carlsbad", minutes: 7,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'qgd', moves: 'd4 d5 c4 e6',
      arrows: [A('d5', 'c4')], highlights: [{ square: 'd5', color: KEY }, { square: 'e6', color: SOFT }],
      say: "The Queen's Gambit Declined — the most solid answer to d4 there is. We support d5 with e6, declining the gambit pawn and building a granite centre. It is reliable, principled, and almost impossible to break down.",
      sayShort: '…e6 — decline, hold the centre.' }),
    b({ id: 'exchange', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5',
      arrows: [A('e6', 'd5')], highlights: [{ square: 'd5', color: KEY }],
      say: "White releases the tension with cxd5; we recapture …exd5, entering the Carlsbad structure. The pawn on d5 gives us a free, half-open e-file and active piece play — the trade-off for the slightly fixed centre.",
      sayShort: '…exd5 — the Carlsbad structure.' }),
    b({ id: 'c6', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "After Bg5 pins our knight, we play …c6 — the backbone of the Carlsbad defense. It braces d5 forever and prepares the standard regrouping. White will try a minority attack with b4-b5; we will counter on the kingside.",
      sayShort: '…c6 — brace d5, prep the defense.' }),
    b({ id: 'bd6', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Bd6 Bd3 h6 Bh4',
      arrows: [A('f8', 'd6')], highlights: [{ square: 'd6', color: KEY }, { square: 'h2', color: SOFT }],
      say: "…Bd6 develops the bishop actively toward h2 (not the passive …Be7), and after …h6 White keeps the pin with Bh4. The bishop on d6 is the key to our kingside counterplay — it eyes White's king the moment lines open.",
      sayShort: '…Bd6 — active bishop toward h2.' }),
    b({ id: 'oo', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Bd6 Bd3 h6 Bh4 O-O Nge2 Re8',
      arrows: [A('f8', 'e8')], highlights: [{ square: 'e8', color: KEY }, { square: 'e3', color: SOFT }],
      say: "We castle and bring the rook to e8, seizing the half-open e-file and pressuring White's e3-pawn. The position is balanced and rich: White will push b4-b5 on the queenside, and we answer with …Ne4 and a kingside pawn storm.",
      sayShort: '…Re8 — grab the e-file.' }),
    b({ id: 'plan', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Bd6 Bd3 h6 Bh4 O-O Nge2 Re8',
      arrows: [A('f6', 'e4'), A('f7', 'f5')], highlights: [{ square: 'e4', color: KEY }, { square: 'f5', color: SOFT }],
      say: "The Carlsbad blueprint for Black: meet White's minority attack on the queenside by counter-attacking on the kingside — …Ne4 jumping into the hole, …Bxh4 or …f5-f4 prying open lines at White's king. While White grinds slowly on the queenside, we play for the knockout. Rosen handles this structure against 3000-rated opposition.",
      sayShort: 'Plan: …Ne4, …f5 — kingside counter.' }),
  ],
};
