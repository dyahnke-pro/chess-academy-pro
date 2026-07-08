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
      say: "The Grünfeld hands you the centre — cxd5, and after the knight trades on c3 you recapture bxc3, building the classical phalanx on c3, d4 and e4. Black's entire strategy is to attack that centre with pieces and the …c5 break; YOUR entire strategy is to keep it standing — and then rolling.",
      sayShort: "bxc3 — the big c3-d4-e4 centre.",
      highlights: [H('c3', KEY), H('d4', KEY), H('e4', KEY)] }),
    b({ id: 'gru2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2',
      say: "Bc4 develops the bishop to its best diagonal, aiming at f7 and backing the centre; Black hits with …c5, the thematic Grünfeld lever. You play Ne2 — and this is the point — the knight belongs HERE, defending d4 and clearing the castle, not on f3 where the g7-bishop would pin it.",
      sayShort: "Bc4, Ne2 — support the centre.",
      highlights: [H('c4', KEY), H('d4', SOFT), H('c5', ATK)] }),
    b({ id: 'gru3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O',
      say: "Both sides develop and castle: Be3 defends d4 a second time, O-O tucks the king away. All of Black's pieces — the c6-knight, the g7-bishop — glare at your centre, but here's the thing: it's defended exactly as many times as it's attacked. The tension holds, and it holds in your favour.",
      sayShort: "Be3, O-O — over-defend d4, castle.",
      highlights: [H('d4', KEY), H('e3', SOFT)] }),
    b({ id: 'gru4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O Bg4 f3 Na5',
      say: "Black pins with …Bg4 and jabs the bishop with …Na5; you play f3 — the perfect move here, kicking the bishop AND reinforcing e4 in a single stroke. That knight on a5 is stranded on the rim. You've got the big centre, the bishop pair coming, and the more purposeful position — the Exchange Grünfeld played exactly right.",
      sayShort: "f3 — kick the bishop, cement e4.",
      highlights: [H('f3', KEY), H('e4', SOFT), H('a5', SOFT)] }),
  ],
};
