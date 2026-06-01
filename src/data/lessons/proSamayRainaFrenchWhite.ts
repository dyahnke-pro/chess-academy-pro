import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — vs French Defense (White). His real, data-derived line is the
// Exchange (exd5 exd5) — low-theory, symmetrical, club-friendly. Two registers;
// no move-number prefixes in spoken text; green vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-development', 'concept:pos-open-file', 'https://www.chess.com/openings/French-Defense-Exchange-Variation', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_FRENCH_WHITE_LESSON: LessonScript = {
  openingId: 'pro-samayraina-french-white', title: "Samay vs the French — Exchange", minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'exd5', moves: 'e4 e6 d4 d5 exd5 exd5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'e6', color: SOFT }],
      say: "Against the French we play the Exchange — exd5. It is the practical club choice: no memorising the sharp Winawer or the locked Advance chains. The position opens up and, crucially, it frees Black's bad light-squared bishop too, so we must play for activity, not just symmetry.",
      sayShort: 'exd5 — open, practical French.' }),
    b({ id: 'bd3', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O',
      arrows: [A('f1', 'd3')], highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "We develop the bishop actively to d3, eyeing h7, mirror Black's …Bd6, and castle. The structure is symmetrical, so the edge comes from being first to the good squares and creating a tiny imbalance — exactly the kind of game where a prepared player out-plays a club opponent.",
      sayShort: 'Bd3, O-O — active development.' }),
    b({ id: 'plan', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Re1 Bg4 c3 Nbd7',
      arrows: [A('c1', 'g5')], highlights: [{ square: 'e1', color: KEY }, { square: 'd5', color: SOFT }],
      say: "The plan: seize the open e-file with Re1, brace the centre with c3, pin Black's defenders with Bg5, and play the minority attack or a kingside build-up. Break the symmetry first and the small initiative snowballs — the Exchange is far from a dead draw when you play it for a win.",
      sayShort: 'Plan: Re1, Bg5, break the symmetry.' }),
  ],
};
