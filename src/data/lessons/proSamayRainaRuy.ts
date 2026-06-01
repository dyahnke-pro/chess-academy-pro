import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Ruy Lopez (White), 1,163 games. The main spine is the Closed
// Ruy (Chigorin …Na5) he reaches most. Two registers; no move-number prefixes in
// spoken text; green vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-development', 'concept:pos-center', 'concept:pos-space', 'https://www.chess.com/openings/Ruy-Lopez', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_RUY_LESSON: LessonScript = {
  openingId: 'pro-samayraina-ruy', title: "Samay's Ruy Lopez — the Closed Main", minutes: 8,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb5', moves: 'e4 e5 Nf3 Nc6 Bb5',
      arrows: [A('b5', 'c6')], highlights: [{ square: 'b5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "The Ruy Lopez — the deepest, most respected answer to e5. The bishop pins toward the c6-knight, the defender of e5, putting long-term pressure on Black's centre. This is positional chess at its finest, and it is Samay's main e5 weapon.",
      sayShort: 'Bb5 — pressure the e5-defender.' }),
    b({ id: 'morphy', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7',
      arrows: [A('a4', 'c2')], highlights: [{ square: 'a4', color: SOFT }, { square: 'e4', color: KEY }],
      say: "After a6 we keep the bishop alive with Ba4, develop Nf6, and castle — the Morphy main line. We are not afraid to give up the tension; our plan is the slow build-up that the Ruy is famous for. Black develops solidly with …Be7.",
      sayShort: 'Ba4, O-O — the Morphy main.' }),
    b({ id: 'c3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3',
      arrows: [], highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Re1 defends e4, Black expands with …b5 and we retreat the bishop to b3, where it eyes the f7-square. Then c3 — the key move — preparing the big d4 push and giving the bishop a retreat to c2. This is the classical Closed Ruy structure.",
      sayShort: 'c3 — prepare the d4 centre.' }),
    b({ id: 'chigorin', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4',
      arrows: [], highlights: [{ square: 'd4', color: KEY }, { square: 'a5', color: SOFT }],
      say: "h3 makes luft and stops …Bg4. Black goes for the Chigorin with …Na5 hitting the b3-bishop, which drops back to c2, and …c5. Now we play d4 — the central break the whole opening was building toward. White has a big centre and the more active pieces.",
      sayShort: 'd4 — the big central break.',
    }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4',
      arrows: [A('b1', 'd2'), A('c2', 'h7')], highlights: [{ square: 'd5', color: SOFT }, { square: 'h7', color: KEY }],
      say: "The Closed Ruy plan: maintain the d4-e4 centre, reroute the knight via Nbd2-f1-g3 toward the kingside, and aim the c2-bishop and queen at h7 for a kingside attack. White's space and the classic Ruy pieces give a durable, pressing initiative.",
      sayShort: 'Plan: Nbd2-f1-g3, attack h7.',
    }),
  ],
};
