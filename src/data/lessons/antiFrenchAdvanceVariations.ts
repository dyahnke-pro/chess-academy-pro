import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-French Advance (3.e5) — per-variation master class. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json.
// The Advance Variation with the modern a3 plan: when Black closes with ...c4,
// White plays on both wings — b4-b5 against the queenside where Black's king
// lands, plus h4-h5 space. Spine both-sides-sound (full-ply engine scan, no
// blunder), engine-verified +0.42 at the terminus from White's side.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/French_Defence,_Advance_Variation'];
const OID = 'anti-french-advance';

/** The a3 Advance: meet ...c4 with a queenside pawn-storm plan (b4-b5) while
 *  Black castles long into it; White gains a clear plus. */
const ADVANCE_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Advance vs ...Qb6/...c4 — the a3 pawn-storm plan', minutes: 6,
  beats: [
    b({ id: 'adv-1', moves: 'e4 e6 d4 d5 e5 c5 c3 Qb6 Nf3 Nc6 a3',
      say: "In the Advance French, Black's whole game is pressure on d4 — Qb6 and Nc6 pile onto it while the c5-break gnaws at the base of your chain. a3 is the modern, prophylactic answer: it prepares b4 to grab queenside space and shore up the d4-point, and it takes the b4-square away from Black's pieces. Quiet, but deeply purposeful.",
      sayShort: "a3 — prepare b4, hold d4.",
      highlights: [H('a3', KEY), H('d4', SOFT)] }),
    b({ id: 'adv-2', moves: 'e4 e6 d4 d5 e5 c5 c3 Qb6 Nf3 Nc6 a3 c4 Nbd2 Na5 Be2',
      say: "Black locks the queenside with c4, releasing the central tension and committing to a pawn-storm plan; the knight swings to a5, heading for b3. You calmly redeploy — Nbd2 reroutes toward the kingside and shores up, and Be2 develops. With the centre closed, the game becomes a contest of pawn storms on opposite wings.",
      sayShort: "…c4 closes it — reroute with Nbd2.",
      highlights: [H('c4', SOFT), H('a5', KEY)] }),
    b({ id: 'adv-3', moves: 'e4 e6 d4 d5 e5 c5 c3 Qb6 Nf3 Nc6 a3 c4 Nbd2 Na5 Be2 Bd7 Rb1 Ne7',
      say: "Black completes development with Bd7 and reroutes the knight via e7 toward f5 or g6; you swing the rook to b1, loading the b-file to blast it open with b4 and b5. Read the geography: Black's king is about to castle queenside, straight into the path of your pawn storm.",
      sayShort: "Rb1 — load the b-file break.",
      highlights: [H('b1', KEY), H('b4', SOFT)] }),
    b({ id: 'adv-4', moves: 'e4 e6 d4 d5 e5 c5 c3 Qb6 Nf3 Nc6 a3 c4 Nbd2 Na5 Be2 Bd7 Rb1 Ne7 h4 O-O-O h5 h6',
      say: "Black castles long and you also gain space on the other flank with h4-h5; Black halts it with h6. The stage is set and it favours you: Black's king sits on the queenside exactly where your b1-rook and the b4-b5 break are aimed, while your own king stays flexible and safe. You hold a clear plus — press where his king lives.",
      sayShort: "b4-b5 at his king — a clear plus.",
      highlights: [H('c8', ATK), H('b1', KEY)] }),
  ],
};

export const ANTI_FRENCH_ADVANCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Advance Variation`]: ADVANCE_LESSON,
};
