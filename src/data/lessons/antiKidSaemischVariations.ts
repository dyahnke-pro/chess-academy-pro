import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-KID Sämisch (f3/Be3) — per-variation master classes. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json. The
// Panno …Nc6 (+0.73, the space bind) and …a6 (+0.46, trade into a pawn-up
// endgame). Spines rebuilt with build-sound-spine.mjs (no both-sides blunder).
// The Orthodox …e5 tab was dropped (a 12-ply prefix of the main lesson). The
// sharp …c5 (Benko-style b5 sac) and …Nbd7 (opposite-castling attack) lines are
// deferred for a careful pass. Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence,_S%C3%A4misch_Variation'];
const OID = 'anti-kid-saemisch';

/** vs 6...Nc6 (Panno) — the Sämisch bind: Nge2/Qd2, meet …e5 with d5, keep the
 *  space clamp. Engine-verified +0.73. */
const NC6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Sämisch KID vs …Nc6 (Panno) — the space bind', minutes: 6,
  beats: [
    b({ id: 'kid-nc6-1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nc6',
      say: "The Sämisch against the King's Indian: you answer with the rock-solid f3 and Be3, building a granite centre. Black chooses the Panno setup with Nc6, planning queenside expansion by a6 and Rb8-b5. You have the classic Sämisch bind — huge space and a flexible plan on either wing.",
      sayShort: "f3/Be3 — the granite Sämisch bind.",
      highlights: [H('c4', KEY), H('d4', KEY), H('e4', KEY)] }),
    b({ id: 'kid-nc6-2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nc6 Nge2 a6 Qd2 Rb8',
      say: "You develop with Nge2 and Qd2 — the standard Sämisch build, the queen eyeing the kingside for a future Bh6 and pawn storm. Black prepares his flank play with a6 and Rb8. The battle lines are drawn: your central bind against his queenside expansion, and you're comfortably on top.",
      sayShort: "Nge2, Qd2 — the standard build.",
      highlights: [H('d2', KEY), H('d4', SOFT)] }),
    b({ id: 'kid-nc6-3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nc6 Nge2 a6 Qd2 Rb8 Rc1 Bd7 Nd1 e5',
      say: "You calmly meet the queenside build with Rc1, guarding the file, and reroute the knight via d1 to reinforce. Black breaks in the centre with e5. But your structure is rock-solid — you'll simply close the centre and your space advantage remains a lasting, nagging asset.",
      sayShort: "Rc1, Nd1 — reinforce, absorb …e5.",
      highlights: [H('c1', KEY), H('e5', SOFT)] }),
    b({ id: 'kid-nc6-4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nc6 Nge2 a6 Qd2 Rb8 Rc1 Bd7 Nd1 e5 d5 Ne7',
      say: "You clamp the centre shut with d5, seizing maximum space, and Black's knight retreats to e7 to reroute. You hold a clear, pleasant edge — the Sämisch bind at its best: more space, a safe king, and play on both wings while Black stays cramped. The King's Indian has been contained.",
      sayShort: "d5 — clamp shut, clear edge.",
      highlights: [H('d5', KEY), H('c4', SOFT)] }),
  ],
};

/** vs 6...a6 — trade in the centre (dxc5, queens off) and win the loose c5-pawn
 *  for a favourable endgame. Engine-verified +0.46. */
const A6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Sämisch KID vs …a6 — trade down a pawn up', minutes: 6,
  beats: [
    b({ id: 'kid-a6-1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6',
      say: "Against your f3/Be3 Sämisch, Black plays the flexible a6, angling for c5 or b5 counterplay on the queenside. You have the big Sämisch centre and space; the question is whether Black's flank play or your central bind carries the day. Handled accurately, it's your bind that wins.",
      sayShort: "…a6 — flexible flank prep.",
      highlights: [H('c4', KEY), H('d4', KEY), H('a6', SOFT)] }),
    b({ id: 'kid-a6-2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 dxc5 dxc5',
      say: "You develop Qd2 and Black strikes with c5; you take dxc5 and after dxc5 the d-file swings open. This exchange has cost Black his central foothold — his d-pawn is gone, and your pieces are ready to pour down the newly-opened d-file into his position.",
      sayShort: "dxc5 — open the d-file.",
      highlights: [H('d1', SOFT), H('c5', ATK)] }),
    b({ id: 'kid-a6-3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 dxc5 dxc5 Qxd8 Rxd8 Bxc5',
      say: "The queens come off — Qxd8 Rxd8 — and you snap up the loose pawn with Bxc5. You've won a clean pawn and reached a favourable endgame: an extra pawn and the more active pieces. With the queens gone, the King's Indian's dynamism evaporates and pure technique takes over.",
      sayShort: "Bxc5 — win the pawn, into the endgame.",
      highlights: [H('c5', KEY)] }),
    b({ id: 'kid-a6-4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 a6 Qd2 c5 dxc5 dxc5 Qxd8 Rxd8 Bxc5 Nc6 Bb6 Rd6',
      say: "Black develops Nc6 and contests the file with Rd6; you tuck the bishop back to b6, holding the extra pawn securely. The endgame is clearly better for White — a healthy extra pawn, more space, and no real counterplay for Black. Convert the material edge with patient, careful technique.",
      sayShort: "Bb6 — hold the pawn, convert.",
      highlights: [H('b6', KEY), H('c4', SOFT)] }),
  ],
};

/** vs 6...Nbd7 — the ambitious plan: castle long and storm with h4-h5, ignoring
 *  material for the opposite-wing attack. Engine-verified +1.12 (extended one ply
 *  past the pawn-grabs to the key attacking move h5, even material). */
const NBD7_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Sämisch KID vs …Nbd7 — castle long and storm', minutes: 6,
  beats: [
    b({ id: 'kid-n7-1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nbd7',
      say: "The Sämisch against …Nbd7: Black develops the knight to a flexible square, supporting the …e5 and …c5 breaks. This is your cue for the most ambitious plan in the whole variation — castle queenside and launch a kingside pawn storm at Black's king, while your own king sits safe on the far wing.",
      sayShort: "…Nbd7 — time for the opposite-wing storm.",
      highlights: [H('c4', KEY), H('d4', KEY), H('e4', KEY)] }),
    b({ id: 'kid-n7-2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nbd7 Qd2 a6 O-O-O Rb8',
      say: "Qd2 completes the battery and you castle long — king tucked safe on the queenside, rooks connected, and the g- and h-pawns freed to storm. Black readies his own counter-attack with a6 and Rb8. It's a race of opposite-wing assaults, and you are the one aiming straight at the enemy king.",
      sayShort: "O-O-O — king safe, pawns freed to storm.",
      highlights: [H('d2', KEY), H('c1', SOFT)] }),
    b({ id: 'kid-n7-3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nbd7 Qd2 a6 O-O-O Rb8 e5 Ne8 h4 c5',
      say: "You strike in the centre with e5, driving the knight back to e8, and then h4 lights the fuse — the pawn storm is under way. Black hits back with …c5 on the queenside. Both attacks are racing now, but yours is closer to the enemy king and it moves first.",
      sayShort: "e5, h4 — light the fuse.",
      highlights: [H('e5', KEY), H('h4', KEY), H('c5', SOFT)] }),
    b({ id: 'kid-n7-4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nbd7 Qd2 a6 O-O-O Rb8 e5 Ne8 h4 c5 dxc5 Nxe5 h5',
      say: "Here's the key idea: after pawns are grabbed on both sides — dxc5, …Nxe5 — you play h5 WITHOUT a second thought for the material. The attack is everything. h5 rips into g6 to pry open the h-file straight at Black's king, and the engine confirms you are winning the race by a clear margin. Even material, but a decisive assault. This is the Sämisch dream against …Nbd7.",
      sayShort: "h5 — ignore the pawns, open the h-file.",
      highlights: [H('h5', KEY), H('g6', ATK)] }),
  ],
};

export const ANTI_KID_SAEMISCH_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Sämisch Variation, Yates Defense`]: NC6_LESSON,
  [`${OID}::Sämisch Variation, Normal Defense (a6)`]: A6_LESSON,
  [`${OID}::Sämisch Variation, Normal Defense (Nbd7)`]: NBD7_LESSON,
};
