import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the King's Indian Defence. Lead-the-eye
// §5a. Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose
// only. Deepest beat ≥20 plies (lessonDepth gate). The Sämisch/Petrosian/
// Averbakh tabs are deferred pending engine-soundness verification of their
// sharp curated lines (when unsure, skip — playbook §0.5).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];

export const KINGS_INDIAN_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'kings-indian-defence::Bayonet Attack (9.b4)': {
    openingId: 'kings-indian-defence', title: "King's Indian — The Bayonet Attack (9.b4)", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'b1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4', say: "The Bayonet — White skips the slow build-up and charges 9.b4 at once, racing on the queenside before Black's kingside attack gets rolling. It's the critical modern test of the King's Indian: pure speed against pure speed.", sayShort: '9.b4 — the queenside speed-race.', highlights: [H('b4')] }),
      b({ id: 'b2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4 Nh5', say: "Black answers …Nh5 — the knight clears the f-pawn's path and heads for f4, the dream outpost beside the white king. No time wasted defending the queenside; Black commits everything to the attack.", sayShort: '…Nh5 — clear the f-pawn, head for f4.', arrows: [A('h5', 'f4')], highlights: [H('h5'), H('f4')] }),
      b({ id: 'b3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4 Nh5 Re1 f5', say: "…f5! The storm begins. The f-pawn lunges forward to pry open lines at the white king, and the whole kingside pawn mass is ready to follow. Black's plan needs no preparation — it is the same in every Classical King's Indian: attack the king.", sayShort: '…f5 — open lines at the king.', highlights: [H('f5')] }),
      b({ id: 'b4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4 Nh5 Re1 f5 Ng5 Nf6 f3 f4', say: "Ng5 probes, …Nf6 reinforces, and …f4! locks the kingside and plants the spearhead. There is the Bayonet tabiya: a flat-out race — White's b4–c5 break against Black's …f4–g5–g4 king-hunt. Whoever arrives first wins, and Black's target is the king itself.", sayShort: '…f4 — spearhead set, the race is on.', highlights: [H('f4')] }),
    ],
  },

  'kings-indian-defence::Four Pawns Attack': {
    openingId: 'kings-indian-defence', title: "King's Indian — The Four Pawns Attack", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'f1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5', say: "The Four Pawns Attack — White grabs the maximum with pawns on c4, d4, e4 and f4. It looks crushing, but it is over-extension waiting to be punished. Black strikes at once with …c5, refusing to let that proud centre stand unchallenged.", sayShort: '…c5 — challenge the huge centre.', highlights: [H('c5'), H('d4', SOFT)] }),
      b({ id: 'f2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 d5 e6 Be2 exd5 cxd5 Re8', say: "d5 e6 — Black hits the centre a second time, and after …exd5 cxd5 the rook swings to …Re8, training on the e-file straight at White's overextended e4-pawn. Every white pawn advance becomes a target for Black's pieces.", sayShort: '…Re8 — pile on the e-file.', arrows: [A('e8', 'e4')], highlights: [H('e8'), H('e4')] }),
      b({ id: 'f3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 d5 e6 Be2 exd5 cxd5 Re8 e5 dxe5 fxe5 Ng4', say: "White lunges e5, but …Ng4! pounces — the knight attacks the e5-pawn and the f2-point, exploiting the holes the pawn-storm left behind. The over-extended centre starts to crack under the tactical pressure.", sayShort: '…Ng4 — pounce on e5 and f2.', arrows: [A('g4', 'e5')], highlights: [H('g4'), H('e5')] }),
      b({ id: 'f4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 d5 e6 Be2 exd5 cxd5 Re8 e5 dxe5 fxe5 Ng4 Bg5 Qb6 O-O Nxe5 Nxe5 Rxe5 Bf4 Re8', say: "…Qb6 adds pressure, and …Nxe5! wins the pawn back by force — Nxe5 Rxe5 Bf4 …Re8 and the dust settles with Black's pieces active and White's grand centre dismantled. There is the Four Pawns tabiya: over-extension punished, exactly as the King's Indian promises.", sayShort: '…Nxe5 — regain the pawn, centre dismantled.', highlights: [H('e5'), H('e8')] }),
    ],
  },

  'kings-indian-defence::Fianchetto Variation': {
    openingId: 'kings-indian-defence', title: "King's Indian — The Fianchetto Variation", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'fi1', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6', say: "The Fianchetto — White's most positional anti-King's-Indian, meeting Black's g7-fianchetto with one of its own. The g2-bishop guards the long light diagonal and the d5/e4 squares, blunting the typical kingside attack. Black must play more patiently here.", sayShort: '…d6 — set up vs the calm fianchetto.', highlights: [H('g7'), H('d6', SOFT)] }),
      b({ id: 'fi2', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5', say: "Black develops …Nbd7 — flexible, supporting the centre — and plays the thematic …e5. Even against the restraining fianchetto, the central break is Black's bid for activity, challenging d4 and opening lines for the pieces.", sayShort: '…e5 — the central break.', highlights: [H('e5')] }),
      b({ id: 'fi3', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qb6', say: "…c6 prepares to challenge the centre with …d5 or …b5, and …Qb6 develops with pressure — the queen eyes the d4-pawn down the diagonal and the b2-point. Black builds queenside counterplay to balance White's space.", sayShort: '…Qb6 — pressure d4 and the queenside.', arrows: [A('b6', 'd4')], highlights: [H('b6'), H('d4')] }),
      b({ id: 'fi4', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qb6 Re1 Re8 d5 cxd5 cxd5 Nc5', say: "…Re8 backs the centre, and after d5 …cxd5 cxd5 the knight leaps …Nc5! — a powerful outpost glaring at the e4-pawn and the d3- and b3-squares, immune to pawns. There is the Fianchetto tabiya: Black with a dominant knight, open c-file, and active queenside play, fully equal against White's solid setup.", sayShort: '…Nc5 — the dominant outpost knight.', arrows: [A('c5', 'e4')], highlights: [H('c5'), H('e4')] }),
    ],
  },
};
