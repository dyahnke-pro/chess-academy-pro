import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Budapest Gambit. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// These are GAMBIT sub-lines that resolve before the middlegame proper, so they
// are `kind: 'roadmap'` (the sanctioned depth-gate opt-out for lessons that
// intentionally stop short) — the curated pgn ends once the pawn is recouped.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'];

export const BUDAPEST_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'budapest-gambit::Budapest Gambit: Alekhine Variation with Bc5': {
    openingId: 'budapest-gambit', title: 'Budapest — the Alekhine with …Bc5', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ab1', moves: 'd4 Nf6 c4 e5 dxe5 Ng4', say: "The Budapest Gambit — Black throws the e-pawn at White with …e5 and, after dxe5, leaps …Ng4 to chase it back. Why recommend it? Because it is a genuine surprise weapon: most 1.d4 players are unprepared, and Black gets fast, natural development and immediate piece activity in return for the temporary pawn.", sayShort: '…Ng4 — chase the gambit pawn.', highlights: [H('g4', SOFT)] }),
      b({ id: 'ab2', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6', say: "White holds the pawn with Nf3, and Black develops with maximum aggression — …Bc5 hits the f2-point, …Nc6 piles toward e5. Every black piece flies out toward White's king while White is still untangling. This is the Budapest's whole idea: a development lead and pressure for one pawn.", sayShort: '…Bc5, …Nc6 — pile toward f2 and e5.', highlights: [H('c5')] }),
      b({ id: 'ab3', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Nc3 Ngxe5 Nxe5 Nxe5 Be2 d6 O-O O-O b3 Re8', say: "Black regains the pawn cleanly — …Ngxe5 and …Nxe5 — and reaches a healthy, active position: …d6, …O-O and …Re8 putting the rook on the half-open e-file. There is the tabiya: material is level, Black is comfortably developed with active pieces, and the practical score is right at fifty percent. A sound, easy-to-play surprise weapon that fully equalises.", sayShort: '…Re8 — pawn regained, active and equal.', highlights: [H('e5'), H('e8', SOFT)] }),
    ],
  },

  'budapest-gambit::Budapest Gambit: Rubinstein Variation': {
    openingId: 'budapest-gambit', title: 'Budapest — the Rubinstein (Bishop Pair)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ru1', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+', say: "The Rubinstein, with White's natural Bf4 guarding the extra e5-pawn. Black develops actively — …Nc6 attacks e5, and …Bb4+ is the key check, forcing White to block and setting up a concrete plan: trade on c3 to wreck White's queenside pawns and win the bishop pair.", sayShort: '…Bb4+ — the check that wins structure.', highlights: [H('b4', SOFT)] }),
      b({ id: 'ru2', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nc3 Bxc3+ bxc3 Qe7', say: "…Bxc3+ bxc3 — Black doubles White's c-pawns and gives up the dark-squared bishop for the knight, then …Qe7 renews the attack on the e5-pawn. The structural damage is permanent: those doubled, isolated c-pawns will be a long-term weakness in any endgame.", sayShort: '…Qe7 — regain e5, c-pawns are wrecked.', highlights: [H('c3')] }),
      b({ id: 'ru3', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nc3 Bxc3+ bxc3 Qe7 Qd5 f6 exf6 Nxf6 Qd3 d6 g3 O-O', say: "After Qd5 …f6 exf6 …Nxf6 Black regains the pawn and castles into a sound, fully-developed position. There is the Rubinstein tabiya: material level, Black has comfortable development and a clear long-term trump — White's shattered c-pawns. A pawn given for activity, paid back with interest in structure; an honest, low-risk way to play the Budapest.", sayShort: "…O-O — equal, White's c-pawns weak.", highlights: [H('f6')] }),
    ],
  },

  'budapest-gambit::Budapest Gambit: Main Bf4 Line': {
    openingId: 'budapest-gambit', title: 'Budapest — the Main Bf4 Line', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'mb1', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2', say: "The critical test of the Budapest: White defends the e5-pawn with Bf4 and meets …Bb4+ with the solid Nbd2, declining to damage his own structure. This is where Black must know the plan precisely — develop with tempo and recover the pawn without conceding the initiative for nothing.", sayShort: "Nbd2 — White's solid critical try.", highlights: [H('e5', SOFT)] }),
      b({ id: 'mb2', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 Nxe5 Nxe5 e3 Bxd2+ Qxd2', say: "…Qe7 piles onto e5, a3 questions the bishop, and Black executes the recovery: …Ngxe5, the knights trade, and …Bxd2+ removes White's developing piece. Black has methodically regained the gambit pawn and exchanged into a sound, simplified position.", sayShort: '…Bxd2+ — recover the pawn, simplify.', highlights: [H('e5')] }),
      b({ id: 'mb3', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 Nxe5 Nxe5 e3 Bxd2+ Qxd2 d6 Be2 O-O O-O Bf5 Rfd1', say: "Black finishes harmoniously — …d6, …O-O and the active …Bf5 developing the last piece. There is the Main Line tabiya: material is level and Black is fully developed. Be honest about it — this is White's best try and he keeps a small pull from the bishop pair and slightly freer game, so Black is a touch worse here, but it is comfortable, solid, and easy to hold. Knowing this line is what makes the Budapest safe to play.", sayShort: '…Bf5 — solid, a shade worse but easy.', highlights: [H('f5', SOFT)] }),
    ],
  },

  'budapest-gambit::Budapest Gambit: Adler Variation': {
    openingId: 'budapest-gambit', title: 'Budapest — The Adler (3.Nf3)', minutes: 8, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'a1', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5', say: "The Adler — White declines Bf4 and defends the e5-pawn with Nf3 instead. Black develops the bishop actively to …Bc5, aiming straight at f2 near the white king and keeping the pressure on e5. A natural, aggressive set-up.", sayShort: '…Bc5 — active bishop, eye f2.', highlights: [H('c5')] }),
      b({ id: 'a2', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Be2 Ngxe5 Nxe5 Nxe5', say: "…Nc6 adds a second attacker on e5, and …Ngxe5 Nxe5 …Nxe5 recoups the gambit pawn, the knight landing actively in the centre. Material is level and Black's pieces are humming.", sayShort: '…Nxe5 — recoup the pawn, centralise.', highlights: [H('e5')] }),
      b({ id: 'a3', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Be2 Ngxe5 Nxe5 Nxe5 O-O O-O b3', say: "Both sides castle and White fianchettoes with b3. There is the Adler tabiya: the pawn recouped, the bishop active on c5, the knight strong on e5, and a comfortable, weakness-free game for Black out of the gambit.", sayShort: '…O-O — recouped, active, comfortable.', highlights: [H('e5'), H('c5', SOFT)] }),
    ],
  },

  'budapest-gambit::Budapest Gambit: Fajarowicz Variation': {
    openingId: 'budapest-gambit', title: 'Budapest — The Fajarowicz (3…Ne4)', minutes: 10, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'f1', moves: 'd4 Nf6 c4 e5 dxe5 Ne4', say: "The Fajarowicz — the wildest, trappiest Budapest. Instead of the routine …Ng4, Black leaps …Ne4!?, planting the knight in White's half of the board where it eyes c3, d2 and a host of dark-square tricks. A surprise weapon for the brave.", sayShort: '…Ne4 — the wild central leap.', highlights: [H('e4')] }),
      b({ id: 'f2', moves: 'd4 Nf6 c4 e5 dxe5 Ne4 Nf3 Bb4+', say: "White defends the e5-pawn with Nf3, and …Bb4+! checks at once — classic Fajarowicz harassment, lancing the bishop in from b4 to drag a white piece to d2 before Black has even tried to win the pawn back.", sayShort: '…Bb4+ — check, harass at once.', highlights: [H('b4'), H('e5')] }),
      b({ id: 'f3', moves: 'd4 Nf6 c4 e5 dxe5 Ne4 Nf3 Bb4+ Nbd2 Nc6 a3 Nxd2 Bxd2 Bxd2+ Qxd2', say: "Nbd2 blocks the check, …Nc6 develops, and a3 asks the bishop its intentions. Black resolves everything with a clean sweep on d2 — …Nxd2, Bxd2, …Bxd2+, Qxd2 — trading the minor pieces down to a simplified queen-and-knight middlegame. Be honest: Black is still a pawn down. But White's extra e5-pawn is weak and Black's remaining pieces are the more active.", sayShort: 'Qxd2 — trade down, a pawn down but active.', highlights: [H('d2'), H('e5')] }),
      b({ id: 'f4', moves: 'd4 Nf6 c4 e5 dxe5 Ne4 Nf3 Bb4+ Nbd2 Nc6 a3 Nxd2 Bxd2 Bxd2+ Qxd2 Qe7 Qc3 b6 e3', say: "…Qe7 immediately trains the queen on the extra e5-pawn, so Qc3 steps aside onto the long diagonal; …b6 and e3 prepare a fianchetto and shore up the centre. The pawn-down gambit has become a maneuvering fight where Black's pressure on e5 keeps White busy.", sayShort: '…Qe7 — hound the e5-pawn.', highlights: [H('e7'), H('e5'), H('c3'), H('b6'), H('e3')] }),
      b({ id: 'f5', moves: 'd4 Nf6 c4 e5 dxe5 Ne4 Nf3 Bb4+ Nbd2 Nc6 a3 Nxd2 Bxd2 Bxd2+ Qxd2 Qe7 Qc3 b6 e3 Bb7 Be2 O-O-O', say: "…Bb7 trains the bishop down the long diagonal at White's queenside, Be2 develops, and …O-O-O tucks the king to c8 and slams the rook onto the d-file. There is the Fajarowicz middlegame: a pawn down on paper, but with the safer king, the active b7-bishop, the half-open d-file and the chronic e5-target, Black has genuine practical compensation — the trappy fight the Fajarowicz is played for.", sayShort: '…O-O-O — king to c8, rook to the d-file.', highlights: [H('b7'), H('c8'), H('e5')] }),
    ],
  },
};
