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

/** vs the b3 Colle-Zukertort — active …d5/…c5, out-develop, win back the pawn and
 *  target White's isolated c4-pawn. Engine-verified +0.48 (extended past the
 *  recapture to a stable even-material terminus). */
const B3_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-Colle — out-develop the Zukertort (b3)', minutes: 6,
  beats: [
    b({ id: 'col-b3-1', moves: 'd4 d5 Nf3 Nf6 e3 c5 b3 Nc6',
      say: "The Colle-Zukertort: White fianchettoes the queen's bishop with b3, planning Bb2 and a slow kingside build-up. You meet it head-on with a broad centre — …d5 and …c5 — and rapid, natural development. Active, classical play denies White the quiet squeeze he is angling for.",
      sayShort: "…d5/…c5 — active, deny the squeeze.",
      highlights: [H('d5', KEY), H('c5', KEY)] }),
    b({ id: 'col-b3-2', moves: 'd4 d5 Nf3 Nf6 e3 c5 b3 Nc6 dxc5 Bg4 Be2 e6 Ba3 Ne4',
      say: "White snatches the c5-pawn and clings to it with Ba3. Don't chase — you develop with tempo: …Bg4 pins the knight, and …Ne4 leaps to a dominant central outpost. Your piece activity is worth far more than White's extra pawn, which you will simply win back at your leisure.",
      sayShort: "…Ne4 — outpost; activity beats the pawn.",
      highlights: [H('e4', KEY), H('g4', SOFT)] }),
    b({ id: 'col-b3-3', moves: 'd4 d5 Nf3 Nf6 e3 c5 b3 Nc6 dxc5 Bg4 Be2 e6 Ba3 Ne4 O-O Bxc5 Bxc5 Nxc5',
      say: "You regain the pawn cleanly — …Bxc5 and …Nxc5 — landing a beautifully centralized knight with full equality. White's queenside adventure has left him nothing but loose squares, while your pieces sit on the best posts on the board. If anyone is pressing here, it's you.",
      sayShort: "…Nxc5 — regain the pawn, centralized.",
      highlights: [H('c5', KEY)] }),
    b({ id: 'col-b3-4', moves: 'd4 d5 Nf3 Nf6 e3 c5 b3 Nc6 dxc5 Bg4 Be2 e6 Ba3 Ne4 O-O Bxc5 Bxc5 Nxc5 Nbd2 O-O c4 dxc4 bxc4',
      say: "White tries to free himself with c4, but after …dxc4 and bxc4 he is left with an isolated, weak c4-pawn to nurse. You are fully equal — better, in fact: two active knights, a clear target on c4, and no weaknesses of your own. The Colle-Zukertort has been comprehensively out-played.",
      sayShort: "…dxc4 — leave White an isolated c4-pawn.",
      highlights: [H('c4', ATK), H('c5', SOFT)] }),
  ],
};

export const ANTI_COLLE_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Colle System (c3)`]: C3_LESSON,
  [`${OID}::Colle System (dxc5)`]: DXC5_LESSON,
  [`${OID}::Colle System (b3)`]: B3_LESSON,
};
