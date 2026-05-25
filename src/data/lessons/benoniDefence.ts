import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Benoni Defence (Modern Main). Lead-the-eye
// §5a. Moves from repertoire.json (DB-anchored, G3); prose only.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-space', 'concept:pos-initiative', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Modern_Benoni'];

export const BENONI_DEFENCE_LESSON: LessonScript = {
  openingId: 'benoni-defence',
  sources: SRC,
  title: 'Benoni Defence — A Master Class',
  minutes: 13,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 c5 d5 e6', say: "The Modern Benoni — an unbalanced, fighting defence. Black plays …c5 to provoke d5, then …e6 to chip at the wedge, deliberately accepting an asymmetric structure: White gets a central space advantage, Black gets a queenside pawn majority and dynamic piece play. A defence that plays for the win.", sayShort: '…e6 — provoke and chip the d5-wedge.', highlights: [H('c5'), H('e6'), H('d5', SOFT)] }),
    b({ id: 'struct', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6', say: "…exd5 cxd5 fixes the Benoni structure: White's protected pawn on d5, Black's …d6/…c5 phalanx and a queenside pawn majority. The half-open e-file is Black's, the half-open c-file's pressure is White's — the battle lines of every Benoni.", sayShort: '…d6 — the Benoni structure is set.', highlights: [H('d5'), H('d6')] }),
    b({ id: 'fianch', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7', say: "…g6 and …Bg7 — the fianchetto is the heart of the Benoni. The bishop on g7 rakes the long diagonal toward d4 and b2, and once Black plays …b5 and the queenside opens, it becomes a monster. White's big centre is the target.", sayShort: '…Bg7 — the long-diagonal monster.', highlights: [H('g7')] }),
    b({ id: 'castle', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O Re8', say: "Both castle, and …Re8 takes the half-open e-file, pressuring the e4-pawn and supporting the central breaks. Black's pieces flow to natural, active posts — the Benoni gives Black a clear, aggressive plan.", sayShort: '…Re8 — seize the e-file, press e4.', arrows: [A('e8', 'e4')], highlights: [H('e8'), H('e4')] }),
    b({ id: 'reroute', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O Re8 Nd2 Na6 Re1 Nc7', say: "White redeploys Nd2 to guard the breaks; Black reroutes …Na6–c7, the knight heading to support the …b5 thrust. Every black piece is being marshalled toward the queenside, where Black's pawn majority will roll.", sayShort: '…Nc7 — marshal toward the …b5 break.', highlights: [H('c7'), H('a6', SOFT)] }),
    b({ id: 'b5', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O Re8 Nd2 Na6 Re1 Nc7 a4 b6 h3 Rb8 Bb5 Re7 Bf1 a6 Nc4 b5', say: "…Rb8 backs the b-pawn, …a6 prepares, and …b5! the thematic Benoni break finally lands. The queenside majority surges forward, opening lines for the rooks and the g7-bishop straight at White's position. There is the Benoni in full: White's space against Black's rolling queenside and roaring bishop. The other tabs show the Fianchetto, the Taimanov, and the Four Pawns Attack.", sayShort: '…b5 — the queenside break surges.', highlights: [H('b5')] }),
  ],
};
