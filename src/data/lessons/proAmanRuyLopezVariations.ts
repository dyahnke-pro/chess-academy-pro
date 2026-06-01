import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Ruy Lopez variation lessons. Real data spines.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:ruy-lopez',
  'concept:pos-development',
  'https://www.chess.com/openings/Ruy-Lopez-Opening',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_RUY_LOPEZ_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── Closed Morphy main tab ──
  'pro-aman-ruy-lopez::Morphy (…a6)': {
    openingId: 'pro-aman-ruy-lopez',
    title: 'Closed Ruy — the Slow Squeeze',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'ba4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O', highlights: [H('a4')],
        say: "Against the Morphy …a6, White keeps the bishop with Ba4, develops, and castles. No rush — the Ruy is a long-term squeeze.",
        sayShort: 'O-O — keep bishop, castle.' }),
      b({ id: 'bb3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3', arrows: [A('a4', 'b3')], highlights: [H('f7'), H('b3')],
        say: "Re1 supports e4; when Black plays …b5, the bishop drops to b3, eyeing f7 and the long light diagonal. The bishop stays a long-term asset.",
        sayShort: 'Bb3 — eye f7.' }),
      b({ id: 'c3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O h3 d6 c3', highlights: [H('c3'), H('d4')],
        say: "h3 stops …Bg4 and c3 prepares the big d4 push — the heart of the Closed Ruy. White builds the centre slowly and methodically.",
        sayShort: 'c3 — prepare d4.' }),
      b({ id: 'middlegame', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O h3 d6 c3 Na5 Bc2 c5 d4', arrows: [A('b3', 'c2')], highlights: [H('d4')],
        say: "Black hits the bishop with …Na5; White reroutes to c2 and meets …c5 with the big d4 break. White has more space, a harmonious setup, and the classic Ruy squeeze — manoeuvre the knights kingside and press.",
        sayShort: 'd4 — the big break.' }),
    ],
  },

  // ── Berlin (…Nf6, 73 games) ──
  'pro-aman-ruy-lopez::Berlin (…Nf6)': {
    openingId: 'pro-aman-ruy-lopez',
    title: 'Anti-Berlin — the d3 Squeeze',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'd3', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3', highlights: [H('d3')],
        say: "Against the Berlin …Nf6, the modern d3 sidesteps the drawish endgame and keeps queens on the board. White plays for a slow, classical squeeze with a healthy pawn chain.",
        sayShort: 'd3 — avoid the endgame.' }),
      b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6', highlights: [H('d4'), H('c3')],
        say: "c3 prepares d4 and both sides castle. White's setup mirrors the Italian: a solid centre, the bishop pair option, and a slow build-up toward a central break.",
        sayShort: 'c3 — prepare d4.' }),
      b({ id: 'bxc6', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6 h3 a6 Bxc6 bxc6', highlights: [H('c6')],
        say: "h3 makes luft and Bxc6 damages Black's structure — the doubled c-pawns become a long-term target. White trades the bishop on his own terms to fix a permanent weakness.",
        sayShort: 'Bxc6 — give Black doubled pawns.' }),
      b({ id: 'middlegame', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6 h3 a6 Bxc6 bxc6 Re1 Ba7 Be3 Bxe3 Rxe3', arrows: [A('c1', 'e3')], highlights: [H('e3')],
        say: "White trades the dark bishops and reaches a comfortable middlegame with the better structure: Black's doubled c-pawns are a target, White's pieces are harmonious, and the plan is to press on the queenside weaknesses. A pleasant, low-risk edge.",
        sayShort: 'Rxe3 — better structure, press.' }),
    ],
  },
};
