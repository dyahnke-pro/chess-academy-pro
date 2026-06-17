import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Scandinavian Defence masterclass.
// Lead-the-eye §5a: GREEN arrows (non-pawn origin, clear sight-line, named
// endpoint), YELLOW highlights (named key square), SOFT BLUE (secondary).
// Lines DB-anchored + masters-extended ≥20 plies.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const SCANDINAVIAN_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'scandinavian-defence::Qa5 with Bd2 Main Line': {
    openingId: 'scandinavian-defence', title: 'Scandinavian — Qa5 vs Bd2 (…Bg4)', minutes: 10, orientation: 'black', sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    beats: [
      b({ id: 'sb1', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Bd2 Bg4', say: "The Scandinavian with …Qa5 — Black recaptures with the queen and tucks it to a5 out of harm's way. Against White's Bd2, the key is …Bg4: Black develops the light-squared bishop ACTIVELY and prepares to trade it, solving the one piece that is awkward in this whole opening.", sayShort: '…Bg4 — develop and trade the problem bishop.', highlights: [H('g4', KEY), H('a5', SOFT)] }),
      b({ id: 'sb2', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Bd2 Bg4 Be2 Bxe2 Ngxe2 Nc6 O-O O-O-O', say: "Black trades …Bxe2 — the problem bishop gone — develops …Nc6 hitting d4, and castles queenside, onto the opposite wing from White. That signals a sharp, mutual-attack middlegame, exactly the kind of game Black is happy to enter here.", sayShort: '…Bxe2, …O-O-O — opposite-wings fight.', highlights: [H('c6', KEY)] }),
      b({ id: 'sb3', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Bd2 Bg4 Be2 Bxe2 Ngxe2 Nc6 O-O O-O-O Ne4 Qf5 Nxf6 gxf6 c3 Rg8', say: "White jumps Ne4, Black sidesteps …Qf5, and after the trade Nxf6 …gxf6 Black's g-file rips open for the rook on …Rg8, aimed straight at White's king. There is the Qa5 tabiya: opposite-side castling, the bad bishop already swapped off, the queen active on f5 and the open g-file — a comfortable, fully equal, double-edged game that scores an excellent 54% for Black at club level.", sayShort: '…Rg8 — open g-file, equal and sharp.', highlights: [H('f5', KEY), H('g8', SOFT)] }),
    ],
  },
  'scandinavian-defence::Qa5 Main Line': {
    openingId: 'scandinavian-defence', title: 'Scandinavian — The Solid …c6 Qa5', minutes: 10, orientation: 'black',
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    beats: [
      b({ id: 'q1', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5', say: "The classical Qa5 Scandinavian, played the solid way. Black recaptures with the queen and retreats to a5, the most popular square — active, eyeing the a5-e1 diagonal, and ready to support a slow, sturdy setup.", sayShort: '…Qa5 — the solid main retreat.', highlights: [H('a5')] }),
      b({ id: 'q2', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5', say: "…Nf6 and the trademark …Bf5 — the bishop comes out before …e6, the whole point of the Scandinavian. From f5 it eyes the b1-h7 diagonal and c2, and it will never be a bad bishop.", sayShort: '…Bf5 — bishop out before …e6.', arrows: [A('f5', 'c2')], highlights: [H('f5'), H('c2', SOFT)] }),
      b({ id: 'q3', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6', say: "Bc4 e6, and now the solid move …c6. It gives the queen a safe retreat to c7, shores up d5 and b5, and prepares …Nbd7. This is the patient, rock-solid treatment — no weaknesses, just a sound structure to outplay from.", sayShort: '…c6 — solid; opens c7 for the queen.', highlights: [H('c6'), H('e6', SOFT)] }),
      b({ id: 'q4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6 Qe2 Bb4 O-O-O Nbd7', say: "Qe2 and …Bb4 pin the c3-knight; then White castles long — O-O-O — and Black develops …Nbd7. The kings are heading to opposite wings, which turns this quiet line into a pawn-storm race.", sayShort: '…Bb4, …Nbd7 — opposite-side fight looms.', arrows: [A('b4', 'c3')], highlights: [H('c3')] }),
      b({ id: 'q5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6 Qe2 Bb4 O-O-O Nbd7 Kb1 O-O', say: "Kb1 tucks the white king; Black castles short — and the battle lines are drawn. With the kings on opposite wings, Black throws the queenside pawns at b1 with …b5-b4 while the queen already glares from a5. The solid Scandinavian becomes a sharp attacking race.", sayShort: '…O-O — race the b5-b4 pawns at b1.', highlights: [H('a5')] }),
    ],
  },

  'scandinavian-defence::Nf6 Modern Variation': {
    openingId: 'scandinavian-defence', title: 'Scandinavian — The …Nf6 Modern', minutes: 10, orientation: 'black',
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    beats: [
      b({ id: 'm1', moves: 'e4 d5 exd5 Nf6', say: "The Modern Scandinavian — instead of recapturing with the queen, Black plays …Nf6, offering to regain the pawn with a piece and avoid the early queen sortie entirely. Black accepts a temporary pawn deficit for fast, harmonious development.", sayShort: '…Nf6 — regain d5 with the knight.', highlights: [H('f6'), H('d5', SOFT)] }),
      b({ id: 'm2', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6', say: "d4 Nxd5 — the knight recaptures, centralised — and …g6 prepares a King's-Indian-style fianchetto. Black will park the bishop on g7 and pressure White's big centre on the long diagonal.", sayShort: '…g6 — fianchetto, KID-style.', highlights: [H('d5'), H('g6')] }),
      b({ id: 'm3', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O', say: "…Bg7 lands on the long diagonal and both sides castle. The bishop on g7 rakes toward d4 and b2; Black's whole plan is to chip at White's centre with the pieces and the coming …Nc6 and …c5 or …Bxc3.", sayShort: '…Bg7 — the long-diagonal sniper.', arrows: [A('g7', 'd4')], highlights: [H('d4')] }),
      b({ id: 'm4', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O c4 Nb6 Nc3 Nc6', say: "c4 kicks the knight to b6; Black develops …Nc6, hitting d4. White has the broad centre, but it is also a target — Black swarms it with pieces, exactly the King's Indian recipe applied to the Scandinavian.", sayShort: '…Nc6 — pile onto the d4-centre.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'm5', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O c4 Nb6 Nc3 Nc6 d5 Na5 c5 Bxc3 bxc3 Nxd5', say: "d5 pushes by, c5 hits the b6-knight — and Black uncorks …Bxc3! bxc3 Nxd5. The g7-bishop crashes off the c3-knight to wreck White's queenside, and the d5-knight returns to win back the pawn with a superb position: doubled white c-pawns and the knight dominating the centre.", sayShort: '…Bxc3, …Nxd5 — wreck c-pawns, win d5.', arrows: [A('d5', 'c3')], highlights: [H('d5'), H('c3')] }),
      b({ id: 'm6', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O c4 Nb6 Nc3 Nc6 d5 Na5 c5 Bxc3 bxc3 Nxd5 Qd4 Nc6', say: "Qd4 centralises with a fork-threat, but …Nc6 hits the queen and consolidates. There is the Modern tabiya: material restored, White saddled with doubled, weak c-pawns, and Black's knights swarming the centre. The fianchetto plan delivered a clean structural edge.", sayShort: '…Nc6 — hit the queen, consolidate the edge.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
    ],
  },

  'scandinavian-defence::Icelandic Gambit': {
    openingId: 'scandinavian-defence', title: 'Scandinavian — The Icelandic Gambit', minutes: 10, orientation: 'black',
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    beats: [
      b({ id: 'i1', moves: 'e4 d5 exd5 Nf6 c4 e6', say: "The Icelandic Gambit — pure dynamite. After 3…Nf6 4.c4, Black plays …e6!, offering a second pawn to blast the position open. The point is speed: Black will recapture, develop with checks, and hurl every piece into the game while White is still untangling.", sayShort: '…e6 — gambit for a development lead.', highlights: [H('e6'), H('c4', SOFT)] }),
      b({ id: 'i2', moves: 'e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+', say: "dxe6 Bxe6 — Black has the bishop pair and a big lead in development for the pawn — and …Bb4+ develops with check, forcing White to react rather than build. Every tempo counts in a gambit, and Black spends none.", sayShort: '…Bb4+ — develop with check.', highlights: [H('b4')] }),
      b({ id: 'i3', moves: 'e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+ Bd2 Qe7 Bxb4 Qxb4+ Qd2 Nc6', say: "Bd2 Qe7, then the trade Bxb4 Qxb4+ drags the white queen and king around while Black develops …Nc6 with tempo, hitting d4. Black is down a pawn but every piece is active and White has not finished developing — textbook gambit compensation.", sayShort: '…Nc6 — develop with tempo, hit d4.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'i4', moves: 'e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+ Bd2 Qe7 Bxb4 Qxb4+ Qd2 Nc6 d5 O-O-O', say: "d5 tries to gain space and hit the c6-knight, but Black just castles long — …O-O-O — slamming the rook onto the open d-file against White's uncastled king. The initiative is worth far more than the pawn.", sayShort: '…O-O-O — rook to the d-file, king safe.', arrows: [A('d8', 'd5')], highlights: [H('d5')] }),
      b({ id: 'i5', moves: 'e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+ Bd2 Qe7 Bxb4 Qxb4+ Qd2 Nc6 d5 O-O-O Nc3 Bg4 f3 Rhe8+', say: "Nc3 develops, …Bg4 pins, f3 — and Black smashes through with …Rhe8+! The second rook joins with check down the open e-file, hunting the king stuck in the centre. White is on the defensive with the extra pawn meaningless.", sayShort: '…Rhe8+ — pile on the e-file with check.', highlights: [H('e8', SOFT)] }),
      b({ id: 'i6', moves: 'e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+ Bd2 Qe7 Bxb4 Qxb4+ Qd2 Nc6 d5 O-O-O Nc3 Bg4 f3 Rhe8+ Be2 Bf5', say: "Be2 blocks, and …Bf5 reroutes the bishop to keep raking White's position. There is the Icelandic tabiya: a pawn down, but with both rooks on the central files, the bishop pair, and White's king stranded — a raging initiative that has scored brilliantly. The gambit's pitch is simple: time beats material.", sayShort: '…Bf5 — keep the initiative roaring.', highlights: [H('f5')] }),
    ],
  },

  'scandinavian-defence::Qd6 Tiviakov Variation': {
    openingId: 'scandinavian-defence', title: 'Scandinavian — The …Qd6 Tiviakov', minutes: 10, orientation: 'black',
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    beats: [
      b({ id: 't1', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6', say: "The Tiviakov — the modern, ultra-flexible queen retreat. Instead of a5, Black drops the queen to d6, where it controls key central and kingside squares, stays out of harm's way, and keeps every setup open. Sergei Tiviakov scored countless wins from this rock-solid square.", sayShort: '…Qd6 — flexible, safe central retreat.', highlights: [H('d6')] }),
      b({ id: 't2', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6', say: "d4 Nf6, and the prophylactic …a6 — a small but key move. It gives the queen luft, prevents any Nb5 leap at the d6-queen, and prepares a flexible setup with …Bg4 or …Bf5. Black takes the sting out of White's tricks before developing.", sayShort: '…a6 — luft; stop Nb5 ideas.', highlights: [H('a6')] }),
      b({ id: 't3', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6', say: "White fianchettoes with g3 and Bg2; Black pins with …Bg4 and develops …Nc6, hitting d4. Black mirrors the solid setup and pressures the centre, with the …Qd6 queen flexibly placed behind it all.", sayShort: '…Bg4, …Nc6 — pin and press d4.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 't4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6 O-O O-O-O', say: "Both castle on opposite wings — White short, Black long with …O-O-O. The rook hits the open d-file and the king is safe; now Black eyes the …e5 break to challenge White's centre while the heavy pieces fight for the d-file.", sayShort: '…O-O-O — rook to the d-file; eye …e5.', highlights: [H('e5', SOFT)] }),
      b({ id: 't5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6 O-O O-O-O d5 Ne5 Bf4 Nxf3+ Bxf3 Bxf3', say: "d5 lunges and chases the c6-knight, but Black is ready: …Ne5 centralises, and the trades …Nxf3+ Bxf3 Bxf3 swap into a comfortable position where Black's pieces are active and the structure is sound. There is the Tiviakov tabiya — the flexible …Qd6 setup delivers a safe, fully playable middlegame with no weaknesses.", sayShort: '…Bxf3 — trade into a sound game.', highlights: [H('d5'), H('e5', SOFT)] }),
    ],
  },

  'scandinavian-defence::Portuguese Variation': {
    openingId: 'scandinavian-defence', title: 'Scandinavian — The Portuguese Gambit', minutes: 10, orientation: 'black',
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    beats: [
      b({ id: 'p1', moves: 'e4 d5 exd5 Nf6 d4 Bg4', say: "The Portuguese Gambit — a sharp, modern try. After 3…Nf6 4.d4, Black plays …Bg4!?, pinning ideas and refusing to spend a move recapturing on d5 yet. Black offers the pawn for rapid, active development and pressure on White's centre.", sayShort: '…Bg4 — pin first, regain d5 later.', highlights: [H('g4')] }),
      b({ id: 'p2', moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5', say: "Be2 Bxe2 Qxe2 trades the light bishops, and …Qxd5 finally collects the pawn back — with the queen actively centralised and Black fully developed-to-be. The gambit was really a clever move-order to reach an active, equal game.", sayShort: '…Qxd5 — regain the pawn, queen active.', highlights: [H('d5')] }),
      b({ id: 'p3', moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 Nf3 e6 O-O Nc6', say: "Nf3 e6 and …Nc6 complete development, the knight hitting d4. Black has no weaknesses, the queen is active on d5, and the pieces flow out smoothly — the Portuguese has transposed into a comfortable, pressure-on-d4 middlegame.", sayShort: '…Nc6 — develop, press d4.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'p4', moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 Nf3 e6 O-O Nc6 c4 Nxd4', say: "c4 hits the queen, but Black has …Nxd4! — a little tactic: the knight grabs the d4-pawn because the c4-pawn has abandoned its defender. Black wins the centre pawn and stays comfortable.", sayShort: '…Nxd4 — little tactic, grab the pawn.', highlights: [H('d4')] }),
      b({ id: 'p5', moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 Nf3 e6 O-O Nc6 c4 Nxd4 Nxd4 Qxd4 Rd1 Qg4 f3 Qf5', say: "Nxd4 Qxd4 Rd1 chases the queen, but …Qg4 and after f3 …Qf5 the queen settles actively, eyeing the kingside light squares. There is the Portuguese tabiya: full equality with an active queen and easy development — the gambit pawn recovered and the position sound.", sayShort: '…Qf5 — queen lands active; full equality.', highlights: [H('f5')] }),
    ],
  },

  'scandinavian-defence::Gubinsky-Melts (3...Qd8)': {
    openingId: 'scandinavian-defence', title: 'Scandinavian — The …Qd8 Gubinsky-Melts', minutes: 10, orientation: 'black',
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    beats: [
      b({ id: 'g1', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8', say: "The Gubinsky-Melts — the most patient Scandinavian of all. Black retreats the queen all the way home to d8. It looks passive, but the point is profound: the queen can never be harassed again, so Black simply develops smoothly and solidly behind a Caro-like structure with no target.", sayShort: '…Qd8 — queen home, no more harassment.', highlights: [H('d8')] }),
      b({ id: 'g2', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4', say: "d4 Nf6 and …Bg4 — the light bishop comes out, pinning the f3-knight before Black ever plays …e6. Same Scandinavian principle as the main line: get the good bishop active outside the pawn chain first.", sayShort: '…Bg4 — pin f3, bishop out early.', arrows: [A('g4', 'f3')], highlights: [H('f3')] }),
      b({ id: 'g3', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 Bc4 e6 h3 Bh5', say: "Bc4 e6, and after h3 the bishop keeps the pin with …Bh5, maintaining the tension on f3. Black has a sound, French-like structure but with the bishop already developed — no bad piece, no weaknesses, just patient pressure.", sayShort: '…Bh5 — keep the pin on f3.', highlights: [H('h5'), H('f3', SOFT)] }),
      b({ id: 'g4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 Bc4 e6 h3 Bh5 O-O c6 Bg5 Be7', say: "White castles and develops actively — Bg5 pins the f6-knight — but Black stays rock-solid with …c6 and …Be7, calmly breaking the pin. The Caro-like structure gives White nothing to bite on.", sayShort: '…Be7 — solid, break the pin.', arrows: [A('g5', 'f6')], highlights: [H('f6')] }),
      b({ id: 'g5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 Bc4 e6 h3 Bh5 O-O c6 Bg5 Be7 Re1 O-O Qd3 Nbd7 Ne5 Nxe5', say: "Black castles into safety, develops …Nbd7, and when White plants the knight on e5 simply trades it off with …Nxe5. There is the Gubinsky tabiya: Black rock-solid, no weaknesses, fully equal — the patient Scandinavian's reward.", sayShort: '…Nxe5 — trade off, dead equal.', highlights: [H('e5')] }),
    ],
  },
};
