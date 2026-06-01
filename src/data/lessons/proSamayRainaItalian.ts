import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Italian Game (White), 920 games. Giuoco Pianissimo main
// (c3/d3 slow build). Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_ITALIAN_LESSON: LessonScript = {
  openingId: 'pro-samayraina-italian', title: "Samay's Italian — the Pianissimo", minutes: 7,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bc4', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
      arrows: [A('c4', 'f7')], highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say: "The Italian Game — the oldest opening in chess and a perfect club weapon. The bishop develops actively to c4, eyeing the f7-square, the weakest point in Black's camp. Black mirrors with …Bc5. We are heading for a slow, rich middlegame.",
      sayShort: 'Bc4 — eye the f7 weakness.' }),
    b({ id: 'c3', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3',
      arrows: [], highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "c3 and d3 — the Giuoco Pianissimo, the 'very quiet game'. We build a small, sturdy centre and prepare a slow expansion. No early fireworks; we want a position rich in plans where understanding beats memorisation.",
      sayShort: 'c3, d3 — the quiet build-up.' }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4',
      arrows: [], highlights: [{ square: 'a4', color: KEY }],
      say: "Both sides castle and complete development. We play Re1 and a4 — gaining queenside space and stopping Black's …b5. The position is balanced and maneuvering; White's plan is to expand and probe on both wings.",
      sayShort: 'Re1, a4 — gain queenside space.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7',
      arrows: [A('b1', 'd2')], highlights: [{ square: 'd4', color: KEY }, { square: 'f1', color: SOFT }],
      say: "The plan: reroute the knight via Nbd2-f1-g3 toward the kingside, prepare the central d4 break at the right moment, and slowly build pressure. The Pianissimo is a long game of small improvements — exactly where a well-prepared player out-thinks the opponent.",
      sayShort: 'Plan: Nbd2-f1-g3, then d4.',
    }),
  ],
};
