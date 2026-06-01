import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Open Games / …e5 (Black), 3,196 games. He answers 1.e4 with
// …e5 and defends the Ruy/Italian classically. Two registers; no move-number
// prefixes in spoken text; green vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Ruy-Lopez', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_OPEN_E5_LESSON: LessonScript = {
  openingId: 'pro-samayraina-open-e5', title: "Samay's …e5 — the Closed Ruy", minutes: 8,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6',
      arrows: [A('f6', 'e4')], highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
      say: "We answer e4 with the classical …e5 — fighting for the centre head-on. Against the Ruy we play the main line: …a6 to question the bishop, then …Nf6 hitting e4. This is the most respected, most principled defense to e4.",
      sayShort: '…a6, …Nf6 — the Ruy main.' }),
    b({ id: 'be7', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3',
      arrows: [], highlights: [{ square: 'b5', color: KEY }, { square: 'a4', color: SOFT }],
      say: "We develop …Be7, castle, and expand on the queenside with …b5, kicking the bishop to b3. …d6 supports e5 and opens the c8-bishop's diagonal. This is the rock-solid Closed Ruy setup that has served champions for a century.",
      sayShort: '…b5, …d6 — solid Closed Ruy.' }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O',
      highlights: [{ square: 'g8', color: SOFT }, { square: 'e5', color: KEY }],
      say: "We castle into a complete, harmonious position. The centre holds firm on e5, every piece has a job, and Black has a clear plan to come — counterplay against White's centre on the queenside and in the centre itself.",
      sayShort: '…O-O — harmonious and solid.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O',
      arrows: [A('c6', 'a5')], highlights: [{ square: 'a5', color: SOFT }, { square: 'c5', color: KEY }],
      say: "The plan: the Chigorin maneuver …Na5 to hit the b3-bishop, then …c5 to challenge White's coming d4 and grab queenside space. Black holds the centre, expands on the queenside, and looks for the …d5 break. A complete, dynamic counter to the Ruy.",
      sayShort: 'Plan: …Na5, …c5, fight for d5.',
    }),
  ],
};
