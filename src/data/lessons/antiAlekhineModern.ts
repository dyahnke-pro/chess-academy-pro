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
      say: "The Alekhine dares your pawns forward with Nf6, and you take the dare: e5 kicks the knight to d5, and d4 plants a broad pawn centre. Black's plan is to prod at this centre and hope it becomes overextended; your plan is to support it, develop behind it, and turn the space into a bind.",
      sayShort: "e5, d4 — grab the big centre.",
      highlights: [H('e5', KEY), H('d4', KEY), H('d5', SOFT)] }),
    b({ id: 'ale2', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2',
      say: "Black hits the e5-pawn with d6 and develops the bishop to g4 to pin your knight. You develop naturally — Nf3 and Be2 — keeping everything defended. No need to rush; the Modern line is a slow squeeze, not a shootout.",
      sayShort: "Nf3, Be2 — calm development.",
      highlights: [H('e5', SOFT), H('f3', SOFT)] }),
    b({ id: 'ale3', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 h3 Bh5',
      say: "Both sides finish developing; you tuck the king away with O-O and put the question to the bishop with h3. It holds the pin with Bh5, but you have gained a useful tempo and kept your structure intact. Everything is ready for the central expansion.",
      sayShort: "O-O, h3 — castle and probe.",
      highlights: [H('h3', SOFT)] }),
    b({ id: 'ale4', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 h3 Bh5 c4 Nb6 exd6 cxd6',
      say: "c4 is the key gain-space move — it chases the d5-knight to the passive b6 square and stakes out a broad c4-d4 duo. Then exd6 dissolves the tension favourably: after cxd6 Black is left with a backward d6-pawn on the half-open file, a permanent target.",
      sayShort: "c4 — kick the knight, gain space.",
      arrows: [A('c4', 'd5')], highlights: [H('c4', KEY), H('d5', ATK), H('d6', SOFT)] }),
    b({ id: 'ale5', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 h3 Bh5 c4 Nb6 exd6 cxd6 Nc3 O-O Re1 d5',
      say: "Nc3 and Re1 complete your development; Black strikes back with d5 to free himself, but even after c4-c5 or a trade you keep the more comfortable game. The Alekhine bargain has paid off: more space, a lead in development, and the easier position to play.",
      sayShort: "Nc3, Re1 — space and the easier game.",
      highlights: [H('d5', SOFT), H('c4', SOFT)] }),
  ],
};
