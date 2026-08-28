import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Pirc/Modern: the 150 Battery & d5 Squeeze — video-grounded Watch build
// (David 2026-07-15). The student plays WHITE. The taught system: the
// traditional Be3/Qd2 dark-square battery with Nf3, the space-gaining d5
// punch the moment Black castles and commits the knight to c6, the Bh6 trade
// of the fianchetto bishop, prophylactic a3, queenside castling, and central
// pressure. Every move chess.js-legal; spine engine-verified end-to-end
// (+0.92 at the Bh6 handoff, +0.67 at the move-14 terminus, best-play both
// sides — 2026-07-15 derivation). Grounded in the player corpus:
// data/sources/danielnaroditsky-trees/anti-pirc-white.json (793 games, 68%);
// the …Nc6→d5 punch is also the corpus's most-played continuation in the g6
// Pirc (138-game line). Teaching ideas mined from the flagged video segment —
// paraphrased, never quoted (data/sources/danielnaroditsky-voice/per-opening/
// anti-pirc-modern.md).
//
// FIRST LESSON AUTHORED TO THE RED-TARGET GRAMMAR (docs/plans/
// 2026-07-15-watch-line-target-grammar.md): every attack/threat/weakness the
// narration names is PAINTED — attacker or strong-point in blue, the
// attack/plan ray as an arrow, the TARGET/VICTIM square in red.

const KEY = 'rgba(255,214,0,0.88)';   // yellow — key square the narration names
const SOFT = 'rgba(80,140,255,0.32)'; // blue — context / strong point
const RED = 'rgba(239,68,68,0.72)';   // red — the TARGET/VICTIM square
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'];

export const ANTI_PIRC_BATTERY_LESSON: LessonScript = {
  openingId: 'anti-pirc-battery',
  sources: SRC,
  title: 'The 150 Battery & the d5 Squeeze',
  minutes: 7,
  orientation: 'white',
  beats: [
    b({ id: 'apb-1', moves: 'e4 d6 d4 Nf6 Nc3 g6',
      say: "The Pirc invites you to take the whole centre, planning to chip at it from a fianchetto. Across 793 games in your grandmaster corpus this position scores 68 percent for White — but only if you know what the setup actually wants. So take the centre: both pawns forward, knight to c3. Black develops the knight, tucks the bishop toward g7, and waits for you to overextend. You won't.",
      sayShort: "Take the centre — e4, d4, Nc3.",
      highlights: [H('e4', SOFT), H('d4', SOFT), H('g7', KEY)] }),
    b({ id: 'apb-2', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be3',
      say: "Develop the king's knight, then start the real plan: bishop to e3. This is the traditional dark-square battery — the bishop eyes the long dark diagonal from the other side, and the queen is coming to d2 behind it. The single most important piece on Black's side of the board is that bishop on g7. The whole system exists to trade it off and leave the dark squares around his king undefended.",
      sayShort: "Be3 — the battery begins.",
      arrows: [A('e3', 'h6')],
      highlights: [H('e3', SOFT), H('g7', RED)] }),
    b({ id: 'apb-3', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be3 O-O Qd2',
      say: "Black castles, and the queen slides to d2, stacking the battery. Now bishop to h6 is always hanging in the air — offering the trade Black least wants. Notice what you have NOT done: no early pawn storm, no lunge. Centre first, battery second, and every Black plan has to reckon with the h6 trade before it can breathe.",
      sayShort: "Qd2 — battery stacked, Bh6 looms.",
      arrows: [A('e3', 'h6')],
      highlights: [H('d2', SOFT), H('h6', KEY), H('g7', RED)] }),
    b({ id: 'apb-4', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be3 O-O Qd2 Nc6 d5',
      say: "The knight comes to c6 to lean on d4 — and this is the moment the whole system pivots on. The pawn goes to d5, hitting the knight and gaining space. In your corpus this exact punch is the most common continuation once Black castles and commits that knight — and the engine confirms it: White is nearly a pawn better already. The knight has one good square to run to, and it's backwards.",
      sayShort: "d5 — punch the knight, grab space.",
      highlights: [H('d5', SOFT), H('c6', RED)] }),
    b({ id: 'apb-5', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be3 O-O Qd2 Nc6 d5 Nb8 Bh6',
      say: "All the way home to b8 — a full retreat, and Black's development clock just rewound two moves. Now cash the battery: bishop to h6, forcing the question on g7. This position has been reached at the top level, and it is simply better for White — more space, the better bishop trade coming, and Black stuck untangling. This is the picture the whole system plays for.",
      sayShort: "Bh6 — force the bishop trade.",
      arrows: [A('h6', 'g7')],
      highlights: [H('h6', SOFT), H('g7', RED), H('b8', RED)] }),
    b({ id: 'apb-6', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be3 O-O Qd2 Nc6 d5 Nb8 Bh6 c6 Bxg7 Kxg7 a3',
      say: "Black chips at your space with the c-pawn — the standard reaction — and you complete the trade on g7. His king now guards the dark squares personally. Then a quiet move that wins games: pawn to a3. Before castling long, you take the b4 square away from every Black piece, forever. Prophylaxis first, king safety second, attack third — that's the professional order of operations.",
      sayShort: "Trade on g7, then a3 — prophylaxis.",
      highlights: [H('g7', KEY), H('a3', SOFT), H('b4', RED)] }),
    b({ id: 'apb-7', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be3 O-O Qd2 Nc6 d5 Nb8 Bh6 c6 Bxg7 Kxg7 a3 Nbd7 O-O-O cxd5 exd5',
      say: "Castle queenside — opposite wings, the rook landing on d1 behind your wedge, and your king walking away from the side where you intend to attack. When Black finally trades on d5, recapture with the e-pawn: the pawn on d5 is a wedge that cramps everything Black owns, and the e-file opens for your rooks, pointing straight at e7. Look at the two camps: every white piece has a job; Black's are still negotiating with each other.",
      sayShort: "Castle long — the d5 wedge holds.",
      highlights: [H('c1', SOFT), H('d5', SOFT), H('e7', RED)] }),
    b({ id: 'apb-8', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be3 O-O Qd2 Nc6 d5 Nb8 Bh6 c6 Bxg7 Kxg7 a3 Nbd7 O-O-O cxd5 exd5 Nb6 Re1 Bd7 Ng5 Rc8',
      say: "Into the middlegame: rook to the open e-file, and the knight leaps to g5 — suddenly f7 and h7 both need an answer, with the e7-pawn stuck on the open file behind them. The engine keeps White comfortably on top here with best play from both sides. From this position the plans are simple: pile on e7, probe f7, and let the space advantage grind. That's the whole system — battery, squeeze, trade, prophylaxis, pressure.",
      sayShort: "Ng5 — f7 and h7 both burn.",
      arrows: [A('g5', 'f7'), A('g5', 'h7'), A('e1', 'e7')],
      highlights: [H('g5', SOFT), H('f7', RED), H('h7', RED), H('e7', RED)] }),
  ],
};
