import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Grünfeld: the Exchange (d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3) —
// main-line master class. The student plays WHITE. The Grünfeld cedes the centre
// to attack it; you build the classical c3-d4-e4 phalanx and defend it against
// ...c5 and the g7-bishop. Spine both-sides-sound (build-sound-spine.mjs),
// engine-verified (+0.33 White). chess.js-legal.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'];

export const ANTI_GRUNFELD_EXCHANGE_LESSON: LessonScript = {
  openingId: 'anti-grunfeld-exchange',
  sources: SRC,
  title: 'The Exchange Grünfeld — the classical centre',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'gru1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7',
      say: "The Grünfeld hands you the centre — cxd5, and after the knight trades on c3 you recapture with bxc3, building the classical big phalanx on c3, d4 and e4. Black's whole strategy is to attack this centre with pieces and the c5-break; your whole strategy is to keep it standing and rolling.",
      sayShort: "bxc3 — the big c3-d4-e4 centre.",
      highlights: [H('c3', KEY), H('d4', KEY), H('e4', KEY)] }),
    b({ id: 'gru2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2',
      say: "Bc4 develops the bishop to its best diagonal, aiming at f7 and supporting the centre; Black hits with c5, the thematic Grünfeld lever. You play Ne2 — the knight belongs here, defending d4 and clearing the way to castle, rather than on f3 where the g7-bishop would pin it.",
      sayShort: "Bc4, Ne2 — support the centre.",
      highlights: [H('c4', KEY), H('d4', SOFT), H('c5', ATK)] }),
    b({ id: 'gru3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O',
      say: "Both sides develop and castle: Be3 defends d4 a second time, and O-O tucks the king to safety. Black's pieces — the c6-knight, the g7-bishop — all point at your centre, but it is defended as many times as it is attacked. The tension holds in your favour.",
      sayShort: "Be3, O-O — over-defend d4, castle.",
      highlights: [H('d4', KEY), H('e3', SOFT)] }),
    b({ id: 'gru4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O Bg4 f3 Na5',
      say: "Black pins with Bg4 and hits the bishop with Na5; you play f3 — the perfect move here, kicking the bishop AND reinforcing e4 in one stroke. The knight on a5 sits offside on the rim. You have the big centre, the bishop pair coming, and the more purposeful position — the Exchange Grünfeld played the right way.",
      sayShort: "f3 — kick the bishop, cement e4.",
      highlights: [H('f3', KEY), H('e4', SOFT), H('a5', SOFT)] }),
  ],
};
