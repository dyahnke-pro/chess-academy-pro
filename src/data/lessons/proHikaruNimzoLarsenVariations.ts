import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';
import { PRO_HIKARU_NIMZO_LARSEN_LESSON } from './proHikaruNimzoLarsen';

// Pro Hikaru — Nimzo-Larsen (1.b3) PER-VARIATION Watch lessons. Student = WHITE.
// Each walks his real data spine (data/sources/hikaru-deep/nimzo-larsen-*.json) to
// a middlegame, board-accurate, two registers, no move-number prefixes (G9.4).
// Voice grounded in data/sources/hikaru-voice/per-opening/nimzo-larsen.md.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://en.wikipedia.org/wiki/Nimzowitsch%E2%80%93Larsen_Attack',
  'https://api.chess.com/pub/player/hikaru/games/archives',
];
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });

function lesson(title: string, beats: LessonBeat[]): LessonScript {
  return { openingId: 'pro-hikaru-nimzo-larsen', title, minutes: 8, orientation: 'white', kind: 'variation', sources: SRC, beats };
}

// ── 1...d5 — reversed-London double fianchetto ──
const D5 = lesson("Nimzo-Larsen vs 1...d5 — the Reversed London", [
  b({ id: 'd5-fianch', moves: 'b3 d5 Bb2 Nf6 Nf3 g6', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "Against the solid d5, Hikaru fianchettoes and develops naturally — Bb2 and Nf3. Black mirrors with a kingside fianchetto, but the b2-bishop already owns the long diagonal toward g7.", sayShort: 'Bb2, Nf3 — claim the diagonal.' }),
  b({ id: 'd5-centre', moves: 'b3 d5 Bb2 Nf6 Nf3 g6 e3 Bg7 d4', arrows: [A('d2', 'd4')], highlights: [H('d4')], say: "With e3 and d4, White builds a reversed-London centre. The d4-pawn anchors the position and the dark-squared bishop behind it points straight at Black's king.", sayShort: 'd4 — build the centre.' }),
  b({ id: 'd5-c4', moves: 'b3 d5 Bb2 Nf6 Nf3 g6 e3 Bg7 d4 O-O c4', arrows: [A('c2', 'c4')], highlights: [H('c4')], say: "Black castles and Hikaru strikes with c4 — challenging d5 and grabbing queenside space. The position is a comfortable space-edge where White's pieces flow naturally.", sayShort: 'c4 — challenge d5, take space.' }),
  b({ id: 'd5-mid', moves: 'b3 d5 Bb2 Nf6 Nf3 g6 e3 Bg7 d4 O-O c4 c6 Nbd2 Bg4 Bd3', arrows: [A('f1', 'd3')], highlights: [H('d3')], say: "Black props up d5 with c6 and pins the f3-knight, but White completes development — Nbd2 and Bd3 — onto the b1-h7 diagonal. Two bishops, a broad centre, the easier game: the Nimzo-Larsen pull.", sayShort: 'Bd3 — two bishops, easier game.' }),
]);

// ── 1...Nf6 — double fianchetto battle ──
const NF6 = lesson("Nimzo-Larsen vs 1...Nf6 — Contest the Long Diagonal", [
  b({ id: 'nf6-fianch', moves: 'b3 Nf6 Bb2 g6 e3 Bg7 Nf3 O-O', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "Black develops flexibly and fianchettoes; Hikaru does the same. Both dark-squared bishops eye the long diagonal — the whole game will be a fight over who controls it.", sayShort: 'Bb2 — contest the diagonal.' }),
  b({ id: 'nf6-d4', moves: 'b3 Nf6 Bb2 g6 e3 Bg7 Nf3 O-O d4 d6 Be2', highlights: [H('d4')], say: "White takes the bigger centre with d4 and develops the bishop to e2. Black's setup is solid but passive — White has more space and the freer pieces.", sayShort: 'd4 — the bigger centre.' }),
  b({ id: 'nf6-castle', moves: 'b3 Nf6 Bb2 g6 e3 Bg7 Nf3 O-O d4 d6 Be2 Nbd7 O-O b6 c4', arrows: [A('c2', 'c4')], highlights: [H('c4')], say: "Both sides finish developing; White castles and expands with c4. The d4-c4 duo cramps Black while the b2-bishop waits for the centre to open.", sayShort: 'c4 — expand, cramp Black.' }),
  b({ id: 'nf6-mid', moves: 'b3 Nf6 Bb2 g6 e3 Bg7 Nf3 O-O d4 d6 Be2 Nbd7 O-O b6 c4 Bb7 Qc2 Re8', arrows: [A('d1', 'c2')], highlights: [H('c2')], say: "Black fianchettoes the other bishop and contests the centre, but White lines the queen up on c2 behind the broad centre. Every piece is harmonious — a classic Nimzo-Larsen space-and-pieces edge.", sayShort: 'Qc2 — harmony, White is better.' }),
]);

// ── 1...c5 — reversed Sicilian, extra tempo ──
const C5 = lesson("Nimzo-Larsen vs 1...c5 — Reversed Sicilian", [
  b({ id: 'c5-dev', moves: 'b3 c5 Bb2 Nc6 e3 Nf6 Nf3', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "c5 invites a reversed Sicilian — and White has the extra tempo. Bb2 and Nf3 develop while the bishop leans down the long diagonal at the e5 and g7 squares.", sayShort: 'Bb2, Nf3 — reversed Sicilian, a tempo up.' }),
  b({ id: 'c5-d4', moves: 'b3 c5 Bb2 Nc6 e3 Nf6 Nf3 g6 d4', arrows: [A('d2', 'd4')], highlights: [H('d4')], say: "Black fianchettoes and Hikaru breaks with d4 — opening the centre while ahead in development. The position cracks open in White's favour.", sayShort: 'd4 — open it, ahead in development.' }),
  b({ id: 'c5-cap', moves: 'b3 c5 Bb2 Nc6 e3 Nf6 Nf3 g6 d4 cxd4 Nxd4 Bg7 Be2 O-O O-O', highlights: [H('d4')], say: "After the trade on d4 White recaptures with the knight, planting it in the centre, and both sides castle. White has the active pieces, the bishop pair's pressure, and a pleasant Maroczy-style grip.", sayShort: 'Nxd4 — central knight, pleasant grip.' }),
]);

// ── 1...b6 — symmetric, grab the centre first ──
const B6 = lesson("Nimzo-Larsen vs 1...b6 — Grab the Centre First", [
  b({ id: 'b6-mirror', moves: 'b3 b6 Bb2 Bb7 Nf3 Nf6 e3 e6', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "Black mirrors the fianchetto with b6 and Bb7 — but White moved first, so he's a tempo ahead in the symmetrical race. Both bishops stare down the long diagonals.", sayShort: 'Bb2 — symmetric, a tempo up.' }),
  b({ id: 'b6-d4', moves: 'b3 b6 Bb2 Bb7 Nf3 Nf6 e3 e6 d4 Be7 Bd3', arrows: [A('f1', 'd3')], highlights: [H('d4'), H('d3')], say: "Using that extra tempo, Hikaru grabs the centre first with d4 and develops the bishop to the active d3-square. White is the one calling the shots.", sayShort: 'd4, Bd3 — seize the centre.' }),
  b({ id: 'b6-mid', moves: 'b3 b6 Bb2 Bb7 Nf3 Nf6 e3 e6 d4 Be7 Bd3 O-O Nbd2', highlights: [H('d4')], say: "Black castles and White completes development with Nbd2 — every piece poised behind the d4-pawn. A small but real space edge in the symmetrical structure, exactly the comfortable position Hikaru wants.", sayShort: 'Nbd2 — small, lasting edge.' }),
]);

// ── 1...g6 — full centre vs the fianchetto ──
const G6 = lesson("Nimzo-Larsen vs 1...g6 — Take the Full Centre", [
  b({ id: 'g6-dev', moves: 'b3 g6 Bb2 Nf6 e3 Bg7 Nf3 O-O', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "Black fianchettoes early; White develops behind the b2-bishop. The two dark-squared bishops face off on the long diagonal, and White will use his space to keep the upper hand.", sayShort: 'Bb2 — face off on the diagonal.' }),
  b({ id: 'g6-d4', moves: 'b3 g6 Bb2 Nf6 e3 Bg7 Nf3 O-O d4 d6 Be2', highlights: [H('d4')], say: "Hikaru takes the full centre with d4. Black's King's-Indian-style setup is solid but passive — White's extra space gives him the easier middlegame to play.", sayShort: 'd4 — full centre, more space.' }),
  b({ id: 'g6-mid', moves: 'b3 g6 Bb2 Nf6 e3 Bg7 Nf3 O-O d4 d6 Be2 Nbd7 O-O Re8 c4', arrows: [A('c2', 'c4')], highlights: [H('c4')], say: "Both sides finish; White castles and clamps with c4. The big d4-c4 centre and the open long diagonal hand White a comfortable space advantage — and these positions often simplify into a favourable rook-and-minor endgame.", sayShort: 'c4 — clamp, comfortable edge.' }),
]);

// ── 1...e6 — French-like, his best scorer ──
const E6 = lesson("Nimzo-Larsen vs 1...e6 — Open Lines After the Trades", [
  b({ id: 'e6-dev', moves: 'b3 e6 Bb2 d5 e3 Nf6 Nf3 Be7', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "e6 heads for a French-like structure; White develops Bb2, Nf3 and a small pawn chain. The b2-bishop bides its time on the long diagonal while White prepares the central break.", sayShort: 'Bb2, Nf3 — prepare the break.' }),
  b({ id: 'e6-d4', moves: 'b3 e6 Bb2 d5 e3 Nf6 Nf3 Be7 d4 O-O Bd3', arrows: [A('f1', 'd3')], highlights: [H('d4'), H('d3')], say: "Hikaru builds with d4 and swings the bishop to d3 — the b1-h7 diagonal now points at Black's castled king. White has a harmonious, classical attacking setup.", sayShort: 'd4, Bd3 — aim at the king.' }),
  b({ id: 'e6-open', moves: 'b3 e6 Bb2 d5 e3 Nf6 Nf3 Be7 d4 O-O Bd3 c5 O-O Nc6 c4 cxd4 Nxd4', highlights: [H('d4')], say: "Black strikes with c5 and the centre trades; White recaptures with the knight on d4. The lines open, both bishops rake the board, and White has the more active pieces — his best-scoring line for good reason.", sayShort: 'Nxd4 — open lines, active pieces.' }),
]);

export const PRO_HIKARU_NIMZO_LARSEN_VARIATION_LESSONS: Record<string, LessonScript> = {
  // The 1...e5 main-line tab reuses the curated main lesson (its spine IS the e5 line).
  'pro-hikaru-nimzo-larsen::1...e5 Main Line': PRO_HIKARU_NIMZO_LARSEN_LESSON,
  'pro-hikaru-nimzo-larsen::1...d5': D5,
  'pro-hikaru-nimzo-larsen::1...Nf6': NF6,
  'pro-hikaru-nimzo-larsen::1...c5': C5,
  'pro-hikaru-nimzo-larsen::1...b6 Symmetric': B6,
  'pro-hikaru-nimzo-larsen::1...g6': G6,
  'pro-hikaru-nimzo-larsen::1...e6': E6,
};
