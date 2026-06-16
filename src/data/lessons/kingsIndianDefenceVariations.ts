import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the King's Indian Defence. Lead-the-eye
// §5a. Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose
// only. Deepest beat ≥20 plies (lessonDepth gate). The Classical Mar del Plata,
// Sämisch, Petrosian and Averbakh tabs were authored 2026-06-16 after engine +
// win%-verifying each curated line (Mar del Plata +0.43/82% masters, Sämisch
// -0.77/47% club, Petrosian -0.24/53% club, Averbakh -0.34/46% club — all clear
// the gate; the earlier deferral is resolved).
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
      b({ id: 'fi4', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qb6 Re1 Re8 d5 cxd5 cxd5 Nc5', say: "…Re8 backs the centre, and after d5 …cxd5 cxd5 the knight leaps …Nc5! — a powerful outpost glaring at the e4-pawn and the d3- and b3-squares, immune to pawns. There is the Fianchetto tabiya: Black has the dominant knight, the open c-file, and active queenside play to lean on. Be honest about the verdict — White's extra central space gives a small, lasting pull, so Black is a shade worse, but the c5-outpost and queenside pressure keep this a comfortable, fully playable fight.", sayShort: '…Nc5 — outpost, queenside play; a shade passive.', arrows: [A('c5', 'e4')], highlights: [H('c5'), H('e4')] }),
    ],
  },

  'kings-indian-defence::Classical Main Line (Mar del Plata)': {
    openingId: 'kings-indian-defence', title: "King's Indian — The Mar del Plata Race", minutes: 12, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'mdp1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7', say: "The main line of the whole King's Indian. White plays d5, locking the centre and gaining queenside space; Black reroutes with …Ne7, the knight heading for g6 to support the coming kingside storm. With the centre shut, the game splits into two races on opposite wings — and Black's target is the enemy king.", sayShort: '…Ne7 — reroute for the kingside storm.', highlights: [H('d5'), H('e7', SOFT)] }),
      b({ id: 'mdp2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 f3 f5', say: "Both sides regroup for their attacks: White's knight swings via e1 toward d3 to prop the queenside break, and Black's …Nd7 clears the f-pawn's path. Then …f5 — the storm begins, the pawn lunging at e4 to blast open lines toward White's king.", sayShort: '…f5 — the kingside storm begins.', highlights: [H('f5'), H('e4', SOFT)] }),
      b({ id: 'mdp3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 f3 f5 Be3 f4 Bf2 g5', say: "…f4 jams the kingside shut and plants the spearhead, chasing the bishop back to f2; then …g5 launches the pawn avalanche. The plan is brutal and simple — roll …g4, prise open the g- and h-files, and mate the king. Black asks no permission and needs no finesse here.", sayShort: '…f4, …g5 — the pawn avalanche rolls.', highlights: [H('f4'), H('g5')] }),
      b({ id: 'mdp4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 f3 f5 Be3 f4 Bf2 g5 Nd3 Ng6 c5 Nf6 cxd6 cxd6', say: "Now the races run side by side: White strikes with c5 on the queenside, Black brings the pieces home for the attack with …Ng6 and …Nf6. After cxd6 cxd6 the c-file opens for White — but every tempo White spends there is a tempo Black spends storming the king. It is a pure sprint, and the question is only who arrives first.", sayShort: '…Ng6, …Nf6 — mass the pieces for the attack.', highlights: [H('g6'), H('c5', SOFT)] }),
      b({ id: 'mdp5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 f3 f5 Be3 f4 Bf2 g5 Nd3 Ng6 c5 Nf6 cxd6 cxd6 Rc1 Rf7 Nb5 a6 Na3 b5', say: "White piles onto the c-file and pokes Nb5; Black calmly holds with …a6 and …b5, shutting the queenside down — and then lifts the rook with …Rf7, swinging it to g7 or h7 to join the assault. With …g4 next, Black's attack is the faster and the deadlier. This is the Mar del Plata dream, and the practical record proves it: at master and club level Black scores enormously well from here.", sayShort: '…b5, …Rf7 — hold queenside, …g4 looms.', highlights: [H('b5'), H('f7'), H('g4')] }),
    ],
  },

  'kings-indian-defence::Saemisch Variation': {
    openingId: 'kings-indian-defence', title: "King's Indian — The Sämisch Counterstroke", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'sa1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5', say: "The Sämisch — White braces the centre with f3 and builds a slow, massive set-up with Be3 and Qd2, aiming for a kingside pawn storm of his own. Black hits back in the centre at once with …e5, refusing to sit passively while White piles up.", sayShort: '…e5 — strike before White is ready.', highlights: [H('e5')] }),
      b({ id: 'sa2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5', say: "White locks with d5, and Black uncorks the sharp …Nh5 — the knight jumps to the rim with venom, eyeing f4 and clearing the way for …f5 and the queen to swing out. This is the modern, combative answer to the Sämisch: meet White's slow build-up with immediate, concrete aggression.", sayShort: '…Nh5 — sharp, eye f4 and …Qh4.', arrows: [A('h5', 'f4')], highlights: [H('h5'), H('f4')] }),
      b({ id: 'sa3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5 Qd2 Qh4+', say: "Qd2 develops — and Black strikes with …Qh4+! The check is the point: it drags White's kingside into disarray and forces a concession, because blocking with g3 hands Black a concrete tactical sequence that wins material and shatters the structure.", sayShort: '…Qh4+ — the disruptive check.', highlights: [H('h4')] }),
      b({ id: 'sa4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5 Qd2 Qh4+ g3 Nxg3 Qf2 Nxf1 Qxh4 Nxe3', say: "g3 Nxg3! and the combination rolls — Qf2 …Nxf1 snaffles the rook, Qxh4 …Nxe3 and Black emerges with a rook and two minor pieces plus a wrecked white kingside for the queen. The engine rates the resulting mess about level, and at the board it is far easier to play Black: the f1-knight and e3-knight have torn White's position apart. The Sämisch's slow ambitions, refuted by a single forcing stroke.", sayShort: '…Nxe3 — the forcing combination lands.', highlights: [H('e3'), H('f1')] }),
    ],
  },

  'kings-indian-defence::Petrosian System (Bg5)': {
    openingId: 'kings-indian-defence', title: "King's Indian — The Petrosian System", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'pe1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 a5', say: "The Petrosian — instead of castling, White locks the centre early with d5 and plans Bg5, pinning and pressuring. Black answers …a5, a typical King's Indian prophylactic move: it grabs queenside space and slams the door on White's b4 break before it can start.", sayShort: "…a5 — stop White's b4 break.", highlights: [H('a5'), H('d5', SOFT)] }),
      b({ id: 'pe2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 a5 Bg5 h6 Bh4 Na6', say: "Bg5 pins the f6-knight; Black puts the question with …h6, and after Bh4 develops …Na6 — the knight heads for the superb c5-outpost, where it pressures e4 and the queenside and cannot be chased by a pawn. Black untangles without making a single concession.", sayShort: '…Na6 — reroute toward the c5-outpost.', arrows: [A('a6', 'c5')], highlights: [H('a6'), H('c5')] }),
      b({ id: 'pe3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 a5 Bg5 h6 Bh4 Na6 Nd2 Qe8', say: "Nd2 reroutes toward the queenside, and Black plays the quiet, clever …Qe8 — unpinning the f6-knight and preparing …Nh7 to break the pin entirely and then push …f5. Every move serves the one King's Indian dream: free the f-pawn and storm the kingside.", sayShort: '…Qe8 — unpin, prepare …Nh7 and …f5.', highlights: [H('e8')] }),
      b({ id: 'pe4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 a5 Bg5 h6 Bh4 Na6 Nd2 Qe8 O-O Nh7 f3 Bd7', say: "…Nh7 finally snaps the pin and clears f6 for the pawn; …Bd7 completes development, the bishop ready to swing to h3 via …Bh3 ideas or to back the queenside. There is the Petrosian tabiya: the centre locked, …f5 loaded, Black with the easier plan and a fully equal, two-sided game. Patient prophylaxis, then the storm.", sayShort: '…Nh7, …Bd7 — pin broken, …f5 next.', highlights: [H('h7'), H('d7', SOFT)] }),
    ],
  },

  'kings-indian-defence::Averbakh Variation': {
    openingId: 'kings-indian-defence', title: "King's Indian — The Averbakh Variation", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'av1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5 c5', say: "The Averbakh — White develops Bg5 before Nf3, pinning nothing yet but discouraging the usual …e5 (which would hang to dxe5). Black sidesteps cleverly with …c5, a Benoni-style strike at the centre that changes the character entirely and refuses White's intended setup.", sayShort: '…c5 — the Benoni-style strike.', highlights: [H('c5')] }),
      b({ id: 'av2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5 c5 d5 h6', say: "d5 grabs space, locking a Benoni structure — and Black inserts …h6, putting the question to the g5-bishop right away. White must decide: retreat and lose the pin's point, or commit the bishop, in either case spending time Black will use to seize the initiative on the dark squares.", sayShort: '…h6 — question the pinning bishop.', highlights: [H('h6')] }),
      b({ id: 'av3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5 c5 d5 h6 Bf4 e6 dxe6 Bxe6', say: "Bf4 keeps an eye on d6, but …e6! breaks open the centre; after dxe6 …Bxe6 Black has the bishop superbly placed, eyeing c4 and the queenside light squares, with the half-open e-file and active piece play. The Averbakh's restraining idea has been turned into an open game in Black's favour.", sayShort: '…Bxe6 — break open, activate the bishop.', highlights: [H('e6')] }),
      b({ id: 'av4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5 c5 d5 h6 Bf4 e6 dxe6 Bxe6 Bxd6 Re8 Nf3 Nc6 O-O Nd4 Bg3', say: "White grabs the d6-pawn, but it is a poisoned meal: …Re8 pins down the loose pieces, …Nc6 and the thumping …Nd4! plant a monster knight in the heart of White's position, hitting e2, f3 and c2. After Bg3 Black has full compensation and the initiative for the pawn — active, equal, and far easier to handle. The Averbakh defanged.", sayShort: '…Nd4 — the monster knight, full comp.', arrows: [A('d4', 'e2'), A('d4', 'f3')], highlights: [H('d4'), H('e2')] }),
    ],
  },
};
