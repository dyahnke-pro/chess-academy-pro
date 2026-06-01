import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Réti / KIA variation lessons. Real data spines.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:chess-fundamentals',
  'concept:pos-development',
  'https://www.chess.com/openings/Reti-Opening',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_RETI_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── vs …d5 main tab ──
  'pro-aman-reti::vs …d5 (QGD structure)': {
    openingId: 'pro-aman-reti',
    title: 'Réti vs …d5 — the QGD Structure',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'd4', moves: 'Nf3 d5 d4 Nf6 c4 e6', highlights: [H('c4'), H('e6')],
        say: "Against …d5, White transposes into a Queen's Gambit Declined with d4 and c4 — a sound, classical structure with a comfortable space edge.",
        sayShort: 'c4 — into a QGD.' }),
      b({ id: 'develop', moves: 'Nf3 d5 d4 Nf6 c4 e6 e3 Be7 Nc3', arrows: [A('b1', 'c3')], highlights: [H('c3')],
        say: "Simple, principled development: e3 frees the bishop, Nc3 adds a piece to the centre. No tricks — just good habits and a durable edge.",
        sayShort: 'Nc3 — sound development.' }),
      b({ id: 'castle', moves: 'Nf3 d5 d4 Nf6 c4 e6 e3 Be7 Nc3 O-O Bd3 b6', highlights: [H('b7')],
        say: "Both castle; Black fianchettoes …b6 and …Bb7. White's pieces are harmoniously placed and the centre is firmly in hand.",
        sayShort: 'Bd3 — harmonious setup.' }),
      b({ id: 'middlegame', moves: 'Nf3 d5 d4 Nf6 c4 e6 e3 Be7 Nc3 O-O Bd3 b6 cxd5 exd5 O-O', highlights: [H('d5')],
        say: "cxd5 fixes a slightly loose d5-pawn as a long-term target, and White castles into a healthy middlegame with the small, classic edge: better development and an easy plan to pile on d5.",
        sayShort: 'cxd5 — fix a target.' }),
    ],
  },

  // ── vs …g6 (KIA/e4 setup, 537 games) ──
  'pro-aman-reti::vs …g6 (KIA)': {
    openingId: 'pro-aman-reti',
    title: 'Réti vs …g6 — the King’s Indian Attack',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'e4', moves: 'Nf3 g6 d4 Bg7 e4 d6', highlights: [H('e4'), H('d4')],
        say: "When Black fianchettoes …g6, White builds a big classical centre with d4 and e4 — meeting the King's-Indian setup head-on with space and a clear attacking plan.",
        sayShort: 'e4 — big classical centre.' }),
      b({ id: 'bd3', moves: 'Nf3 g6 d4 Bg7 e4 d6 c3 Nf6 Bd3', arrows: [A('f1', 'd3')], highlights: [H('d3')],
        say: "c3 supports the centre and Bd3 develops the bishop toward Black's king. White's setup is solid and ready to expand once development is complete.",
        sayShort: 'Bd3 — support and aim at the king.' }),
      b({ id: 'castle', moves: 'Nf3 g6 d4 Bg7 e4 d6 c3 Nf6 Bd3 O-O O-O Nc6', highlights: [H('c6')],
        say: "Both sides castle; Black develops …Nc6 to pressure the centre. White has a broad pawn front and the easy plan of finishing development before pushing.",
        sayShort: 'O-O — broad front, finish up.' }),
      b({ id: 'middlegame', moves: 'Nf3 g6 d4 Bg7 e4 d6 c3 Nf6 Bd3 O-O O-O Nc6 h3 e5 Re1', highlights: [H('e5'), H('e1')],
        say: "Black strikes the centre with …e5; White supports with h3 and the rook to e1, holding a healthy, space-rich middlegame. White has the bigger centre, the safer king, and the choice of where to break — a comfortable position built on sound principles.",
        sayShort: 'Re1 — hold the centre, choose a break.' }),
    ],
  },

  // ── Double Fianchetto (g3, 455 games) ──
  'pro-aman-reti::Double Fianchetto (g3)': {
    openingId: 'pro-aman-reti',
    title: 'Réti Double Fianchetto — Pressure the Long Diagonals',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'g3', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7', arrows: [A('f1', 'g2')], highlights: [H('g2')],
        say: "The hypermodern Réti: White fianchettoes …g3 and Bg2, pressuring the centre from the long diagonal instead of occupying it. A flexible, low-risk setup that's hard to attack.",
        sayShort: 'Bg2 — pressure the long diagonal.' }),
      b({ id: 'castle', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6', highlights: [H('d3')],
        say: "Both sides castle and mirror the setup; d3 supports a later e4 break. White keeps everything flexible, ready to expand in the centre when the moment is right.",
        sayShort: 'd3 — prepare e4.' }),
      b({ id: 'e4', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nbd2 Nbd7 e4', highlights: [H('e4')],
        say: "White completes the King's-Indian-Attack setup and breaks with e4, grabbing the centre at last. The patient build-up pays off — White expands with everything ready behind it.",
        sayShort: 'e4 — the central break.' }),
      b({ id: 'middlegame', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nbd2 Nbd7 e4 e5 h3', highlights: [H('e5'), H('e4')],
        say: "Black answers …e5 and White plays h3 to secure the structure, reaching a rich King's-Indian-Attack middlegame. White has the classic plan: a space edge, the bishop raking the long diagonal, and a kingside expansion to come. A comfortable, principled position.",
        sayShort: 'h3 — secure, then expand.' }),
    ],
  },
};
