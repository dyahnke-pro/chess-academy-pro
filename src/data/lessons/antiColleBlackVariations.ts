import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Colle (Black) — per-variation master classes. The student plays BLACK.
// Keyed `${openingId}::${variationName}` to match anti-openings.json. The main
// Colle-Koltanowski c3 (…Bd6 neutralises the attack, -0.12 ≈ equal) and the
// greedy dxc5 pawn-grab (undermine and regain, +0.05 ≈ equal). Spines rebuilt
// with build-sound-spine.mjs (no both-sides blunder), material verified per beat
// (dxc5 line: White grabs a pawn, Black regains it cleanly). Other Colle move-
// order tabs (b3/Nbd2/Be2/c4) deferred/left as-is. Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Colle_System'];
const OID = 'anti-colle-black';

/** vs the c3 Colle — the …Bd6 antidote: match White's diagonal, deny the attack,
 *  equalize. Engine-verified -0.12. */
const C3_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-Colle — the …Bd6 antidote (c3)', minutes: 6,
  beats: [
    b({ id: 'col-c3-1', moves: 'd4 d5 Nf3 Nf6 e3 c5 c3',
      say: "The Colle System: White sets up the quiet e3-c3-Nf3 triangle, planning Bd3 and a later e4 break with a kingside attack. The antidote is active, natural development — and above all getting your dark-squared bishop to its best diagonal with …Bd6, BEFORE White's setup can generate anything.",
      sayShort: "…head for …Bd6 — the antidote.",
      highlights: [H('c3', SOFT), H('d5', KEY)] }),
    b({ id: 'col-c3-2', moves: 'd4 d5 Nf3 Nf6 e3 c5 c3 e6 Bd3 Nc6 Nbd2 Bd6',
      say: "You develop with purpose — …Nc6 and …e6 — and then the critical …Bd6, planting your bishop on the very b8-h2 diagonal White covets, staring back at his attacking bishop on d3. This is the whole point: mirror White's setup and his 'attack' has nothing left to bite on.",
      sayShort: "…Bd6 — mirror the diagonal, kill the attack.",
      highlights: [H('d6', KEY), H('c6', SOFT)] }),
    b({ id: 'col-c3-3', moves: 'd4 d5 Nf3 Nf6 e3 c5 c3 e6 Bd3 Nc6 Nbd2 Bd6 O-O O-O dxc5 Bxc5 b4 Bd6',
      say: "Both sides castle; White grabs space with dxc5 and b4, but you simply retreat the bishop to d6 — right back to its ideal diagonal. You are fully developed, comfortable, and equal, with no weaknesses. White's queenside pawns have lunged forward and created precisely nothing.",
      sayShort: "…Bd6 again — comfortable and equal.",
      highlights: [H('d6', KEY), H('b4', SOFT)] }),
    b({ id: 'col-c3-4', moves: 'd4 d5 Nf3 Nf6 e3 c5 c3 e6 Bd3 Nc6 Nbd2 Bd6 O-O O-O dxc5 Bxc5 b4 Bd6 Bb2 Ne5 Nxe5 Bxe5',
      say: "White fianchettoes with Bb2, but you seize the centre — …Ne5, and after the trade your bishop recaptures on e5, a commanding post staring down the long diagonal at White's king. Fully equal, active, and comfortable: the Colle is completely neutralized, and if anyone is pressing now, it's you.",
      sayShort: "…Bxe5 — central bishop, you're pressing.",
      highlights: [H('e5', KEY)] }),
  ],
};

/** vs the greedy dxc5 — undermine the b4/c3 chain with …a5/…b6 and regain the
 *  pawn cleanly. Engine-verified +0.05 (dead equal). */
const DXC5_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-Colle — punish the greedy dxc5', minutes: 6,
  beats: [
    b({ id: 'col-dx-1', moves: 'd4 d5 Nf3 Nf6 e3 c5 dxc5',
      say: "Here White grabs the pawn with dxc5, hoping to cling to it with b4. Don't chase it in a panic — the pawn is loose and overextended. You'll calmly develop, then strike at White's queenside chain with …a5 and …b6 to undermine it, and the material comes back with a comfortable, equal game.",
      sayShort: "…dxc5 grabbed — undermine, don't panic.",
      highlights: [H('c5', ATK)] }),
    b({ id: 'col-dx-2', moves: 'd4 d5 Nf3 Nf6 e3 c5 dxc5 e6 b4 a5 c3 axb4 cxb4 b6',
      say: "White clings to the pawn with b4 and c3, but you go straight at the chain: …a5 and …b6 strike at both of its defenders. The whole queenside structure is a house of cards — every pawn move White makes to hold c5 just manufactures another target for you.",
      sayShort: "…a5, …b6 — hit the pawn chain.",
      highlights: [H('b4', ATK), H('c5', ATK)] }),
    b({ id: 'col-dx-3', moves: 'd4 d5 Nf3 Nf6 e3 c5 dxc5 e6 b4 a5 c3 axb4 cxb4 b6 a4 bxc5 bxc5 Bxc5',
      say: "The chain collapses: …bxc5 and …Bxc5 win the pawn back cleanly, and your bishop emerges actively developed on c5. Material is level again, White's queenside pawns are gone, and you have easy, harmonious development. White's greedy grab has completely backfired.",
      sayShort: "…Bxc5 — regain the pawn, active bishop.",
      highlights: [H('c5', KEY)] }),
    b({ id: 'col-dx-4', moves: 'd4 d5 Nf3 Nf6 e3 c5 dxc5 e6 b4 a5 c3 axb4 cxb4 b6 a4 bxc5 bxc5 Bxc5 Nbd2 Ba6 Bxa6 Nxa6',
      say: "You trade off the light bishops with …Ba6, simplifying into a clean, equal middlegame. You have no weaknesses, active pieces, and White's isolated a4-pawn is a long-term liability to nurse. A model refutation of the greedy dxc5 — met by calm undermining, never by panic.",
      sayShort: "…Ba6 — simplify, target the a4-pawn.",
      highlights: [H('a6', SOFT), H('a4', ATK)] }),
  ],
};

export const ANTI_COLLE_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Colle System (c3)`]: C3_LESSON,
  [`${OID}::Colle System (dxc5)`]: DXC5_LESSON,
};
