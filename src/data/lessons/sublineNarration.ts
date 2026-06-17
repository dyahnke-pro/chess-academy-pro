import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { CourseSubline } from '../../services/openingCourse';
import type { SublineNarration } from '../../services/sublineLesson';

// HAND-AUTHORED subline narration (David 2026-06-17: "these are hand authored").
// Each entry is written by hand, grounded in the real DB line + verified against
// the board (G3) — never generated, never templated. Keyed
// `${openingId}::${variationIndex}::${triggerMove}@${atPly}` so it binds to the
// exact deviation in course-sublines.json. Un-authored sublines fall back to the
// converter's honest baseline (a factual frequency frame + a silent, arrow-led
// walk) — empty beats the way silence beats filler. Authored incrementally, the
// most common / most instructive deviations first.

const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

export const sublineKey = (openingId: string, variationIndex: number, s: CourseSubline): string =>
  `${openingId}::${variationIndex}::${s.triggerMove}@${s.atPly}`;

const SUBLINE_NARRATION: Record<string, SublineNarration> = {
  // Caro-Kann, Advance Variation (var 1) — the Short System, White's most
  // common try here (about a third of games). Line:
  // e4 c6 d4 d5 e5 Bf5 Nf3 e6 Bd3 Bxd3 Qxd3 c5 a3 c4
  'caro-kann::1::Bd3@8': {
    intro: {
      say: "The Short Variation — by far the most common Advance try, about a third of White's games here. White challenges your light-squared bishop with Bd3, offering to trade the very piece the Caro worked so hard to free outside the pawn chain. Don't flinch: that bishop has already done its job, so you swap it off and get straight to the real plan — breaking the centre with …c5.",
      sayShort: 'Bd3 — trade, then strike …c5.',
    },
    beats: [
      { atMove: 9, say: "…Bxd3. Trading your 'good' bishop looks wrong, but it has already earned its keep sitting outside the chain on f5 — and the recapture drags White's queen out early to d3, where it becomes a target you'll hit in two moves.", highlights: [H('d3', KEY)] },
      { atMove: 11, say: "There's the soul of the Caro Advance — …c5, smashing into d4 at the very base of White's pawn chain. First you neutralised the light bishop; now you dissolve the centre that was cramping you.", arrows: [A('c5', 'd4')], highlights: [H('d4', KEY)] },
      { atMove: 13, say: "…c4! and the point lands: the pawn jabs the queen on d3 with tempo and seizes queenside space, clamping White's position. You've reached a comfortable Short-System picture — a clear plan and the initiative on the queenside, the pawn the Caro promised paying off.", highlights: [H('c4', ATK), H('d3', KEY)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // Caro-Kann, Two Knights with …Bg4 (var 2) — White's dominant continuation,
  // grabbing space with e5. Line:
  // e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 e5 c5
  'caro-kann::2::e5@12': {
    intro: {
      say: "e5 — White grabs the centre and shifts into an Advance-style structure, by far the most common path here, over half the games. But you've already swapped your light bishop for the f3-knight, so you carry no bad piece into this — answer in true Caro style by hitting the base of the chain with …c5.",
      sayShort: 'e5 — strike back with …c5.',
    },
    beats: [
      { atMove: 13, say: "…c5 — hammering d4, the foot of White's d4-e5 pawn chain. This is the Caro's whole method: undermine the chain at its base rather than sit and defend. With your problem bishop long gone and no weaknesses to nurse, you get a free, comfortable game against the broad centre.", highlights: [H('d4', KEY), H('c5', ATK)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // Caro-Kann, Exchange Variation (var 5) — White develops Nf3. Line:
  // e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 Nf3 Bg4
  'caro-kann::5::Nf3@8': {
    intro: {
      say: "Nf3 — White just develops in the Exchange, the calm main path here. Your reply is pure Caro: …Bg4, bringing the light bishop out free and active OUTSIDE the pawn chain before you ever play …e6, and pinning the knight to the queen on the way out.",
      sayShort: 'Nf3 — pin it with …Bg4.',
    },
    beats: [
      { atMove: 9, say: "…Bg4 — the Caro's signature move. The light-squared bishop, the piece that suffocates in most …e6 defences, steps out actively and pins the f3-knight against the queen. You'll develop everything else behind it and simply never own a bad bishop in this whole game.", highlights: [H('f3', KEY), H('g4', SOFT)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },
};

/** Hand-authored narration for a subline, or null to use the honest baseline. */
export function getSublineNarration(
  openingId: string,
  variationIndex: number,
  subline: CourseSubline,
): SublineNarration | null {
  return SUBLINE_NARRATION[sublineKey(openingId, variationIndex, subline)] ?? null;
}

export const _SUBLINE_NARRATION = SUBLINE_NARRATION;
