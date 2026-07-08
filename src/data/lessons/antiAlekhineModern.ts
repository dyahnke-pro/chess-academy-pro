import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Alekhine: the Modern/Exchange (1.e4 Nf6 2.e5 Nd5 3.d4 d6 4.Nf3) — main-
// line master class. The student plays WHITE. The Alekhine provokes your pawns
// forward; you oblige with a big centre, chase the knight around, and cash the
// space + development lead. Spine both-sides-sound (build-sound-spine.mjs),
// engine-verified (+0.54 White). chess.js-legal. Arrows: non-pawn, clear line.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'];

export const ANTI_ALEKHINE_MODERN_LESSON: LessonScript = {
  openingId: 'anti-alekhine-modern',
  sources: SRC,
  title: 'Beating the Alekhine — the big centre',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'ale1', moves: 'e4 Nf6 e5 Nd5 d4',
      say: "The Alekhine is a dare. Black pokes his knight to f6 and INVITES you to chase it with pawns, betting your centre gets overextended and falls. So take the dare — but take it soundly. e5 kicks the knight to d5, d4 plants the broad centre. His whole plan is to nibble at that centre; yours is to prop it up, develop behind it, and slowly turn all that space into a bind he can't breathe in.",
      sayShort: "e5, d4 — grab the big centre.",
      highlights: [H('e5', KEY), H('d4', KEY), H('d5', SOFT)] }),
    b({ id: 'ale2', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2',
      say: "Black leans on the e5-pawn with …d6 and pins your knight with …Bg4. No drama required — you just develop: Nf3, Be2, everything defended, everything calm. And remember what kind of game this is: the Modern Alekhine is a slow squeeze, not a shootout. Patience is the whole skill here.",
      sayShort: "Nf3, Be2 — calm development.",
      highlights: [H('e5', SOFT), H('f3', SOFT)] }),
    b({ id: 'ale3', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 h3 Bh5',
      say: "Both sides finish up; you tuck the king away with O-O and put the question to the bishop with h3. It holds the pin with …Bh5 — fine — but you've pocketed a useful tempo and kept your structure spotless. And now everything is in place for the move you've been building toward.",
      sayShort: "O-O, h3 — castle and probe.",
      highlights: [H('h3', SOFT)] }),
    b({ id: 'ale4', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 h3 Bh5 c4 Nb6 exd6 cxd6',
      say: "And here it is: c4, the space-gainer. It shoves the d5-knight back to the miserable b6-square and stakes out a big c4-d4 duo. Then exd6 dissolves the tension exactly when it suits you — after …cxd6, Black is saddled with a backward pawn on d6, sitting on a half-open file. That's a target that isn't going anywhere.",
      sayShort: "c4 — kick the knight, gain space.",
      arrows: [A('c4', 'd5')], highlights: [H('c4', KEY), H('d5', ATK), H('d6', SOFT)] }),
    b({ id: 'ale5', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 h3 Bh5 c4 Nb6 exd6 cxd6 Nc3 O-O Re1 d5',
      say: "Nc3 and Re1 finish the job; Black lashes out with …d5 to free himself, but it's too late to change the story. Whether you clamp with c5 or trade it off, you keep more space, a lead in development, and simply the easier position to play. That's the Alekhine bargain — and it has paid off in full.",
      sayShort: "Nc3, Re1 — space and the easier game.",
      highlights: [H('d5', SOFT), H('c4', SOFT)] }),
  ],
};
