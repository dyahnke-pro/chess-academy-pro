import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Queen's Indian Defence. Lead-the-eye
// §5a. Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose
// only. Deepest beat ≥20 plies. The Kasparov (Nc3/a3) line shares the Petrosian
// a3-structure, so it folds into the Petrosian tab; the deep Fianchetto / 4.e3 /
// Classical lines fold into the main pill.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defence'];

export const QUEENS_INDIAN_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'queens-indian::Queen\'s Indian: Fianchetto Variation (Deep)': {
    openingId: 'queens-indian', title: "Queen's Indian — the Fianchetto Battle", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'fd1', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 d5', say: "The main Fianchetto battle — both sides fianchetto and White adds Nc3, the most testing set-up. Black's recommendation is to meet strength with strength: …d5, challenging the centre directly rather than sitting passively. The fight is for the light squares and the e4-break, and Black grabs his share.", sayShort: '…d5 — challenge the centre directly.', highlights: [H('d5', SOFT)] }),
      b({ id: 'fd2', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 d5 cxd5 Nxd5 Nxd5 Bxd5', say: "After cxd5 the knights trade on d5 and Black recaptures …Bxd5, the bishop landing on a fine central square where it stares down the long diagonal at White's king and queenside. The position has simplified, but Black's pieces are active and there are no weaknesses to defend.", sayShort: '…Bxd5 — active bishop on the long diagonal.', highlights: [H('d5')] }),
      b({ id: 'fd3', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 d5 cxd5 Nxd5 Nxd5 Bxd5 Qc2 f5', say: "Qc2 eyes the queen-trade and the centre, but Black answers with the ambitious …f5! — clamping the e4-square for good and grabbing kingside space. This is the modern, fighting Queen's Indian: not a passive hold, but an active bid to control the light squares and play for the initiative.", sayShort: '…f5 — clamp e4, grab the initiative.', highlights: [H('f5')] }),
      b({ id: 'fd4', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 d5 cxd5 Nxd5 Nxd5 Bxd5 Qc2 f5 Bf4 Nc6', say: "Bf4 develops the last minor with a glance at c7, and Black brings the knight out — …Nc6, eyeing d4 and supporting the …f5 advance. There is the recommended tabiya: Black is fully developed, owns e4, has the active d5-bishop and kingside space. Be honest — White's extra central space gives a tiny pull, but Black is comfortable, active, and scoring around forty-five percent. A sound, fighting equaliser, not a passive crouch.", sayShort: '…Nc6 — active, comfortable, owns e4.', highlights: [H('c6'), H('f5', SOFT)] }),
    ],
  },

  'queens-indian::Queen\'s Indian: 4.e3 System': {
    openingId: 'queens-indian', title: "Queen's Indian — vs the 4.e3 System", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'e31', moves: 'd4 Nf6 c4 e6 Nf3 b6 e3 Bb7 Bd3 Be7', say: "The 4.e3 System — White develops modestly with e3 and Bd3, a flexible, low-theory set-up that keeps the centre fluid and the bishop pointed at Black's kingside. Black's recommendation is to develop naturally and strike in the centre; there is nothing to fear from White's quiet build-up.", sayShort: '…Be7 — develop, prepare …d5.', highlights: [H('e3', SOFT)] }),
      b({ id: 'e32', moves: 'd4 Nf6 c4 e6 Nf3 b6 e3 Bb7 Bd3 Be7 O-O O-O Nc3 d5 cxd5 exd5', say: "Both castle, and after Nc3 Black strikes …d5; this time …exd5 recaptures with the pawn, accepting a clean central pawn on d5 and the half-open e-file. Black gets a small, solid centre and easy development — exactly the kind of position the Queen's Indian player is comfortable steering.", sayShort: '…exd5 — solid centre, half-open e-file.', highlights: [H('d5')] }),
      b({ id: 'e33', moves: 'd4 Nf6 c4 e6 Nf3 b6 e3 Bb7 Bd3 Be7 O-O O-O Nc3 d5 cxd5 exd5 b3 Nbd7 Bb2 c5', say: "White double-fianchettoes with b3 and Bb2; Black completes the picture with …Nbd7 and the freeing …c5, hitting d4. Now the central tension is Black's to release on his terms, the b7-bishop and the d5-pawn jointly fighting for the centre. Symmetrical, balanced, double-edged.", sayShort: '…c5 — free the game, hit d4.', highlights: [H('c5'), H('d4', SOFT)] }),
      b({ id: 'e34', moves: 'd4 Nf6 c4 e6 Nf3 b6 e3 Bb7 Bd3 Be7 O-O O-O Nc3 d5 cxd5 exd5 b3 Nbd7 Bb2 c5 Ne5 Re8', say: "White posts the knight aggressively on e5, and Black calmly challenges it — …Re8 backs the e-file and prepares to meet the knight with …Nxe5 or …Bd6. There is the 4.e3 tabiya: a balanced, manoeuvring middlegame where Black is fully developed and equal, the engine reading it as level. White's modest system gives no advantage against accurate, active play.", sayShort: '…Re8 — challenge Ne5, fully equal.', highlights: [H('e5')] }),
    ],
  },

  'queens-indian::Queen\'s Indian: Classical Variation (...Be7)': {
    openingId: 'queens-indian', title: "Queen's Indian — the Classical …Be7", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'qc1', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7', say: "The Queen's Indian — Black's soundest answer to 1.d4 Nf3, recommended because it is almost impossible to crack. Black fianchettoes …b6 and …Bb7, contesting the long light diagonal and the e4-square that White's g2-bishop wants. With …Be7 Black keeps it flexible and solid; the whole defence is built on controlling e4.", sayShort: '…Bb7, …Be7 — contest the e4-square.', highlights: [H('b7')] }),
      b({ id: 'qc2', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4', say: "Both castle, White develops Nc3 — and Black uncorks the thematic …Ne4! The knight jumps to the very square the whole opening fights over, blocking the g2-bishop's diagonal and forcing trades. This is why the line is so reliable: Black grabs the key central square and simplifies White's attacking pieces off the board.", sayShort: '…Ne4 — seize the key central square.', arrows: [A('e4', 'c3')], highlights: [H('e4')] }),
      b({ id: 'qc3', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 f5', say: "After …Nxc3 Qxc3, Black plays the ambitious …f5 — clamping e4 permanently and grabbing kingside space. This is the modern, fighting Queen's Indian: not just equality, but a real grip on the light squares and active play, the Bb7 and the f5-pawn jointly ruling e4.", sayShort: '…f5 — clamp e4, fight for the initiative.', highlights: [H('f5')] }),
      b({ id: 'qc4', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 f5 d5 Bf6', say: "White grabs space with d5; Black redeploys …Bf6, the bishop swinging to the long dark diagonal to pressure d4 and the queenside. There is the Classical Queen's Indian tabiya: Black is rock-solid, owns e4, has kingside space and active bishops, and scores well above fifty percent at club level. A sound, fighting equaliser — exactly why it is a mainstay of elite repertoires.", sayShort: '…Bf6 — active bishops, comfortable for Black.', highlights: [H('f6'), H('d5', SOFT)] }),
    ],
  },

  'queens-indian::Queen\'s Indian: Kasparov Variation (Nc3/a3)': {
    openingId: 'queens-indian', title: "Queen's Indian — the Kasparov/Petrosian Centre", minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'qk1', moves: 'd4 Nf6 c4 e6 Nf3 b6 Nc3 Bb7 a3', say: "White's most ambitious anti-Queen's-Indian: Nc3 and a3, the Kasparov–Petrosian set-up. The a3 stops …Bb4 and prepares to build a big e4-centre. Why recommend Black's reply here? Because the recipe against a broad centre is well known and reliable: let White build it, then chip it down.", sayShort: 'a3 — White readies a big centre.', highlights: [H('e4', SOFT)] }),
      b({ id: 'qk2', moves: 'd4 Nf6 c4 e6 Nf3 b6 Nc3 Bb7 a3 d5 cxd5 Nxd5 Qc2 Be7 e4 Nxc3 bxc3', say: "Black strikes with …d5 immediately; after the trades on c3, White recaptures with the b-pawn and erects the classical centre — pawns on c3, d4 and e4. It looks imposing, but those doubled c-pawns and the broad front are exactly the targets Black's pieces will swarm.", sayShort: '…d5 — invite the centre, then target it.', highlights: [H('e4'), H('c3', SOFT)] }),
      b({ id: 'qk3', moves: 'd4 Nf6 c4 e6 Nf3 b6 Nc3 Bb7 a3 d5 cxd5 Nxd5 Qc2 Be7 e4 Nxc3 bxc3 O-O Bd3 c5', say: "Black castles and plays the key lever …c5, hammering at the base of White's centre on d4. The whole plan crystallises: trade off White's proud pawns, leave the c3-pawn weak, and let the Bb7 rake the long diagonal once e4 is challenged. Black plays against the centre, not in fear of it.", sayShort: '…c5 — hit the base of the centre.', highlights: [H('c5'), H('d4', SOFT)] }),
      b({ id: 'qk4', moves: 'd4 Nf6 c4 e6 Nf3 b6 Nc3 Bb7 a3 d5 cxd5 Nxd5 Qc2 Be7 e4 Nxc3 bxc3 O-O Bd3 c5 O-O Qc7 Qe2 Nd7 Bb2 Nf6 Rad1', say: "Both sides complete development around the central tension — …Qc7, …Nd7-f6 pressing e4, against White's Bb2 and rooks. There is the tabiya, and the engine actually likes Black a touch: the broad white centre is more weakness than strength, with the c3-pawn chronically loose and the long diagonal Black's. A genuinely comfortable, fighting equaliser against White's most ambitious try.", sayShort: '…Nf6 — pressure e4; Black is comfortable.', highlights: [H('f6'), H('e4', SOFT)] }),
    ],
  },

  'queens-indian::Queen\'s Indian: Petrosian Variation (a3)': {
    openingId: 'queens-indian', title: "Queen's Indian — The Petrosian (a3 Systems)", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'p1', moves: 'd4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5', say: "The Petrosian — White spends a tempo on a3 to rule out …Bb4 and prepare a big Nc3/e4 centre. Black changes plans accordingly: if the e4-square can't be blockaded, fight for the centre directly with …d5, a Queen's-Gambit-style strike. (White's Nc3-then-a3 Kasparov move-order reaches the same structures.)", sayShort: '…d5 — strike the centre directly.', highlights: [H('d5')] }),
      b({ id: 'p2', moves: 'd4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5 cxd5 Nxd5 Qc2 Be7 e4 Nxc3 bxc3', say: "cxd5 …Nxd5, then e4 builds the broad centre and …Nxc3 bxc3 leaves White with doubled c-pawns. Black accepts a slightly cramped but rock-solid position with a clear structural target — the c-pawns — to work against.", sayShort: '…Nxc3 — double the c-pawns.', highlights: [H('e4'), H('c3')] }),
      b({ id: 'p3', moves: 'd4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5 cxd5 Nxd5 Qc2 Be7 e4 Nxc3 bxc3 O-O Bd3 c5', say: "Black castles, and …c5! strikes at the base of White's centre, the thematic break against the big pawn duo. The b7-bishop comes alive on the long diagonal as the centre opens, and the doubled c-pawns become a real weakness.", sayShort: '…c5 — strike the centre at its base.', highlights: [H('c5')] }),
      b({ id: 'p4', moves: 'd4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5 cxd5 Nxd5 Qc2 Be7 e4 Nxc3 bxc3 O-O Bd3 c5 O-O Qc7 Qe2 Nc6 Rd1', say: "…Qc7 and …Nc6 develop with pressure on d4 and the queenside. There is the Petrosian tabiya: White's imposing centre balanced by the doubled c-pawns and Black's pressure against d4, a sound, fighting position where Black is fully equal.", sayShort: '…Nc6 — pressure d4, fully equal.', arrows: [A('c6', 'd4')], highlights: [H('c6'), H('d4')] }),
    ],
  },

  'queens-indian::Queen\'s Indian: Nimzowitsch Variation (...Bb4+)': {
    openingId: 'queens-indian', title: "Queen's Indian — The …Bb4+ Simplification", minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'n1', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Bb4+', say: "The simplifying …Bb4+ — Black inserts the check to trade off the dark-squared bishops before settling in. A clean, low-maintenance way to play the QID: fewer pieces, fewer problems, the same fight for e4.", sayShort: '…Bb4+ — trade the dark bishops.', highlights: [H('b4')] }),
      b({ id: 'n2', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Bb4+ Bd2 Bxd2+ Qxd2 O-O Nc3 Ne4', say: "Bd2 …Bxd2+ Qxd2 swaps the bishops, Black castles, and …Ne4! occupies the key square — backed by the b7-bishop, just as in the main line. Trading the dark bishops hasn't loosened a thing.", sayShort: '…Ne4 — seize e4 after the trade.', arrows: [A('b7', 'e4')], highlights: [H('e4'), H('b7')] }),
      b({ id: 'n3', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Bb4+ Bd2 Bxd2+ Qxd2 O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 d6', say: "…Nxc3 trades again and …d6 underpins a future …e5 break. With the dark bishops off and the structure solid, Black has the simplest path to comfortable equality the Queen's Indian offers.", sayShort: '…d6 — underpin the …e5 break.', highlights: [H('d6')] }),
      b({ id: 'n4', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Bb4+ Bd2 Bxd2+ Qxd2 O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 d6 O-O Nd7 Qc2', say: "Black completes development with …Nd7, the knight ready to support …e5. There is the …Bb4+ tabiya: a stripped-down, weakness-free position with the b7-bishop on the long diagonal and easy equality — the QID for the player who wants solidity above all.", sayShort: '…Nd7 — finish up, easy equality.', highlights: [H('d7', SOFT)] }),
    ],
  },

  'queens-indian::Queen\'s Indian: Miles Variation (...Ba6)': {
    openingId: 'queens-indian', title: "Queen's Indian — The Miles …Ba6", minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'm1', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6', say: "The Miles …Ba6 — the modern main line. Instead of the routine …Bb7, Black throws the bishop to a6, attacking the c4-pawn at once and forcing White to spend time defending it before completing the fianchetto. A sharp, concrete way to fight the g3 systems.", sayShort: '…Ba6 — hit c4 immediately.', arrows: [A('a6', 'c4')], highlights: [H('a6'), H('c4')] }),
      b({ id: 'm2', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 Qa4 Bb7 Bg2 c5', say: "Qa4 defends c4, so …Bb7 returns to the long diagonal having provoked the awkward queen move, and …c5 strikes at d4. Black has gained concrete concessions from the …Ba6 thrust and now opens the centre on his terms.", sayShort: '…c5 — strike d4 on your terms.', highlights: [H('c5'), H('d4', SOFT)] }),
      b({ id: 'm3', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 Qa4 Bb7 Bg2 c5 dxc5 bxc5 O-O Be7', say: "dxc5 …bxc5 gives Black hanging pawns on c5 and the half-open b-file for the rook — a dynamic, mobile structure with active piece play. …Be7 develops; Black has the more purposeful position.", sayShort: '…bxc5 — hanging pawns, open b-file.', highlights: [H('c5')] }),
      b({ id: 'm4', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 Qa4 Bb7 Bg2 c5 dxc5 bxc5 O-O Be7 Nc3 O-O Rd1 Qb6 Bf4 d6', say: "Black castles, and …Qb6 plants the queen actively, defending c5 and eyeing b2 and d4; …d6 braces the centre. There is the Miles tabiya: a mobile hanging-pawn centre, the open b-file, the active queen, and the bishop pair's energy — a fighting Queen's Indian that plays for the initiative, not just equality.", sayShort: '…Qb6 — active queen, fighting game.', highlights: [H('b6'), H('d6', SOFT)] }),
    ],
  },
};
