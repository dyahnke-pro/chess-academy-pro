import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Queen's Gambit Declined. Lead-the-eye
// §5a. Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose
// only. Deepest beat ≥20 plies (lessonDepth gate).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['book:qgd', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];

export const QGD_VARIATION_LESSONS: Record<string, LessonScript> = {
  'qgd::Ragozin Variation': {
    openingId: 'qgd', title: 'QGD — the Ragozin Variation', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'rg1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4', say: "The Ragozin — the most active way to play the Queen's Gambit Declined. Black sets up the solid …d5/…e6 wall, then adds a Nimzo-Indian touch with …Bb4, pinning the c3-knight against the queen. It marries QGD solidity with genuine piece pressure on White's centre.", sayShort: '…Bb4 — QGD solidity plus a Nimzo pin.', highlights: [H('b4', KEY)] }),
      b({ id: 'rg2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5 dxc4 e4 c5', say: "White pins back with Bg5 and Black strikes: …dxc4 grabs a pawn and clears the centre, then …c5! hits the d4-pawn immediately. Black refuses to sit passively — every move challenges White's centre while the pieces stay active.", sayShort: '…dxc4, …c5 — grab and hit the centre.', highlights: [H('c5', KEY), H('c4', SOFT)] }),
      b({ id: 'rg3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5 dxc4 e4 c5 Bxc4 cxd4 Nxd4 Qa5 Bd2 Qc5', say: "White regains the pawn with Bxc4, the centre dissolves after …cxd4 Nxd4, and Black's queen springs out: …Qa5 then …Qc5, eyeing the pinned knight and gaining time. Black's pieces are buzzing while White is still untangling.", sayShort: '…Qc5 — the queen sortie gains time.', highlights: [H('c5', KEY)] }),
      b({ id: 'rg4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5 dxc4 e4 c5 Bxc4 cxd4 Nxd4 Qa5 Bd2 Qc5 Bb5+ Bd7 Nb3 Qe7', say: "Bb5+ provokes …Bd7, developing with tempo, and after Nb3 the queen settles on …Qe7. There is the Ragozin tabiya: Black has dissolved the centre, developed every piece actively — the bishops on b4 and d7, the queen on e7 — and reached a balanced, dynamic middlegame. It scores an excellent 56% for Black at club level.", sayShort: '…Qe7 — active pieces, dynamic balance.', highlights: [H('e7', KEY), H('d7', SOFT), H('b4', SOFT)] }),
    ],
  },
  'qgd::Vienna Variation': {
    openingId: 'qgd', title: 'QGD — the Vienna (…dxc4 Counterplay)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'vi1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 dxc4', say: "The Vienna — the sharpest, most active way to handle the Queen's Gambit. Instead of the solid wall, Black snatches the c4-pawn and plays for piece activity and queenside expansion. The recommendation here is dynamic, not passive: Black will hold the pawn just long enough to gain space and free the light-squared bishop.", sayShort: '…dxc4 — grab the pawn, play actively.', highlights: [H('c4', SOFT)] }),
      b({ id: 'vi2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 dxc4 e3 a6 Bxc4 b5 Bd3 Bb7', say: "White recovers the pawn with Bxc4, and Black grabs queenside space — …a6 and …b5 build the pawn chain, and …Bb7 develops the once-bad bishop onto the long diagonal, raking toward White's king. Black has solved the French/QGD bishop problem and gained space, all from the …dxc4 counterpunch.", sayShort: '…b5, …Bb7 — space and the long diagonal.', highlights: [H('b7')] }),
      b({ id: 'vi3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 dxc4 e3 a6 Bxc4 b5 Bd3 Bb7 O-O Nbd7 e4 c5', say: "White builds the big centre with e4, and Black hits back immediately with …c5 — striking at d4 before White's centre can roll forward. This is the whole point of the active treatment: every white pawn advance is met by a black piece or pawn, and the position stays double-edged and rich.", sayShort: '…c5 — strike the centre at once.', highlights: [H('c5'), H('e4', SOFT)] }),
      b({ id: 'vi4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 dxc4 e3 a6 Bxc4 b5 Bd3 Bb7 O-O Nbd7 e4 c5 d5 c4 dxe6 fxe6', say: "White lunges d5; Black coolly pushes …c4, gaining a protected square and shoving the bishop back, and after dxe6 …fxe6 the f-file rips open for Black's rook. There is the recommended tabiya: Black has the extra c4-pawn, the open f-file, the long-diagonal bishop, and a fully sound, dynamically equal game. A genuinely active answer to the Queen's Gambit — the engine confirms full equality and club players score right at fifty percent.", sayShort: '…c4, …fxe6 — extra pawn, open f-file, equal.', highlights: [H('c4'), H('e6', SOFT)] }),
    ],
  },

  'qgd::Orthodox Defense Main Line': {
    openingId: 'qgd', title: 'QGD — The Orthodox Main Line', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'oqd1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7', say: "The Orthodox Queen's Gambit Declined — the most solid defence in chess. Black builds a bombproof wall: …e6, …Be7, …O-O and …Nbd7, conceding a little space in return for a position with no weaknesses whatsoever. The whole art is to free it without cracking it.", sayShort: '…Nbd7 — the rock-solid Orthodox wall.', highlights: [H('e6')] }),
      b({ id: 'oqd2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5', say: "Here is Capablanca's famous freeing manoeuvre. After …dxc4 prises open the bishop, …Nd5! offers a string of trades — the knight hits the g5-bishop and the c3-knight at once. Trading pieces is exactly how Black relieves the cramp of the QGD; less wood on the board means more room to breathe.", sayShort: "…Nd5 — Capablanca's freeing trade.", arrows: [A('d5', 'c3')], highlights: [H('d5')] }),
      b({ id: 'oqd3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3', say: "The trades roll off: Bxe7 …Qxe7 swaps the dark-squared bishops, and …Nxc3 Rxc3 removes a pair of knights. Each exchange loosens White's grip a notch and hands Black more elbow room. The position is simplifying straight toward equality.", sayShort: '…Nxc3 — trade down, loosen the grip.', highlights: [H('c3')] }),
      b({ id: 'oqd4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5 dxe5 Nxe5 Nxe5 Qxe5', say: "…e5! — the freeing break that crowns the whole plan. The pawn strikes the centre, and after the exchanges the queen lands on e5, central and active. The cramp is gone, the structure is symmetrical and sound, and Black is fully equal. This is Capablanca's recipe, still the backbone of the QGD a century on: defend like a fortress, then free with …e5.", sayShort: '…e5 — the freeing break, fully equal.', highlights: [H('e5')] }),
    ],
  },
  'qgd::Tartakower Variation': {
    openingId: 'qgd', title: 'QGD — The Tartakower (…b6 Hanging Pawns)', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 't1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6', say: "The Tartakower — the modern grandmaster choice. …h6 first questions the g5-bishop, then …b6 prepares to fianchetto and aim for the dynamic hanging-pawns structure. Black plays for active piece play rather than pure solidity.", sayShort: '…b6 — fianchetto, play for hanging pawns.', highlights: [H('b6'), H('g5', SOFT)] }),
      b({ id: 't2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7', say: "cxd5 …Nxd5 centralises the knight and invites trades; Bxe7 Qxe7 swaps the dark bishops. Recapturing with the knight keeps Black's structure flexible and heads toward the hanging-pawns middlegame.", sayShort: '…Nxd5 — centralise, invite trades.', highlights: [H('d5')] }),
      b({ id: 't3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6', say: "After Nxd5 …exd5 Black has the half-open e-file and a mobile centre; …Be6 develops the bishop to guard d5 and eye the queenside. The position takes shape: Black will build the classic c5/d5 hanging pawns.", sayShort: '…Be6 — guard d5, develop.', arrows: [A('e6', 'd5')], highlights: [H('e6'), H('d5')] }),
      b({ id: 't4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5', say: "…c5! There they are — the hanging pawns on c5 and d5. They look like targets, but they are also a mobile phalanx that controls key central squares and can roll forward with …d4 or …c4. Dynamic energy in exchange for a little static risk.", sayShort: '…c5 — the mobile hanging pawns.', highlights: [H('c5'), H('d5')] }),
      b({ id: 't5', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3 Rc8 Bb5 a6 dxc5 bxc5', say: "…Rc8 backs the c-pawn, …a6 questions the bishop, and after dxc5 …bxc5 Black has the hanging pawns intact with the half-open b-file for the rook. There is the Tartakower tabiya: active pieces, a mobile centre, and genuine winning chances from a defence — exactly why the elite trust it.", sayShort: '…bxc5 — hanging pawns, open b-file.', arrows: [A('c8', 'c5')], highlights: [H('c5'), H('a6')] }),
    ],
  },

  'qgd::Lasker Defense': {
    openingId: 'qgd', title: 'QGD — The Lasker Defense (…Ne4)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'l1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4', say: "The Lasker Defense — the simplest road to equality. …h6 prods the bishop, then …Ne4! the freeing leap: the knight hits the c3-knight and offers a string of trades, relieving Black's only cramp at a stroke. Emanuel Lasker's antidote to the QGD bind.", sayShort: '…Ne4 — the freeing simplifying leap.', arrows: [A('e4', 'c3')], highlights: [H('e4'), H('c3')] }),
      b({ id: 'l2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4 Bxe7 Qxe7 cxd5 Nxc3 bxc3', say: "Bxe7 Qxe7 trades the dark bishops, and …Nxc3 saddles White with doubled, isolated c-pawns after bxc3. Black has traded his cramped pieces and handed White a long-term structural weakness — the simplification cuts both ways, and Black comes out ahead structurally.", sayShort: '…Nxc3 — double White’s c-pawns.', highlights: [H('c3')] }),
      b({ id: 'l3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4 Bxe7 Qxe7 cxd5 Nxc3 bxc3 exd5 Qb3 Qd6', say: "…exd5 recaptures toward the centre, and …Qd6 centralises the queen, defending and eyeing the weak doubled c3-pawn and the kingside. Black is solid, free, and already pressing the structural weakness White just accepted.", sayShort: '…Qd6 — centralise, eye the weak c3-pawn.', highlights: [H('d6'), H('c3', SOFT)] }),
      b({ id: 'l4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4 Bxe7 Qxe7 cxd5 Nxc3 bxc3 exd5 Qb3 Qd6 c4 dxc4 Bxc4', say: "c4 …dxc4 Bxc4 liquidates further, and Black has reached the Lasker promised land: a symmetrical, weakness-free position with every minor piece either traded or active. There is the tabiya — full, comfortable equality with no cramp and nothing to defend. The Lasker is how you neutralise the QGD bind for good.", sayShort: '…dxc4 — liquidate to clean equality.', highlights: [H('c4')] }),
    ],
  },

  'qgd::Exchange Variation': {
    openingId: 'qgd', title: 'QGD — The Exchange (Minority Attack)', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'e1', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7', say: "The Exchange Variation — White releases the tension with cxd5, fixing the symmetrical Carlsbad structure. White's plan is famous: the minority attack, b4–b5, to create a weakness on Black's queenside. …Be7 develops; Black must know the correct counter-plan.", sayShort: '…Be7 — Carlsbad structure, develop.', highlights: [H('d5'), H('e7')] }),
      b({ id: 'e2', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8', say: "Black develops …Nbd7 and lifts …Re8 onto the e-file — the first step of the counter-plan: instead of passively defending the queenside, Black generates kingside and central play with …Ne4 and a rook on e8.", sayShort: '…Re8 — e-file, prep central play.', highlights: [H('e8')] }),
      b({ id: 'e3', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8 Qc2 c6 O-O Nf8', say: "…c6 builds the wall the minority attack will batter, and …Nf8 begins the classic regrouping — the knight heads for g6 (or e6) to defend and to swing into the kingside attack. Black answers a queenside plan with a kingside one.", sayShort: '…Nf8 — reroute toward the kingside.', highlights: [H('c6'), H('f8')] }),
      b({ id: 'e4', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8 Qc2 c6 O-O Nf8 Rab1 Ng6 b4 a6', say: "Rab1 and b4 launch the minority attack; Black brings …Ng6 to eye f4 and h4, and …a6 restrains the b4–b5 break, forcing White to spend time preparing it. Every tempo White invests on the queenside is a tempo Black uses on the king.", sayShort: '…Ng6, …a6 — restrain b5, build kingside.', arrows: [A('g6', 'f4')], highlights: [H('g6'), H('a6')] }),
      b({ id: 'e5', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8 Qc2 c6 O-O Nf8 Rab1 Ng6 b4 a6 a4 Bd6 b5', say: "…Bd6 swings the bishop to the b8–h2 diagonal, joining the kingside build-up, just as White finally pushes b5. There is the Exchange tabiya: a race of plans — White's minority attack on the queenside against Black's piece-storm on the king. Knowing this counter-plan turns a feared structure into a double-edged fight Black can win.", sayShort: '…Bd6 — bishop to the kingside diagonal.', highlights: [H('d6'), H('b5', SOFT)] }),
    ],
  },

  'qgd::Bf4 QGD': {
    openingId: 'qgd', title: 'QGD — The Modern Bf4 Lines', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'f1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7', say: "The modern Bf4 — White develops the dark bishop outside the pawn chain to f4 rather than pinning on g5, a favourite of the engine era. …Be7 develops solidly; Black will challenge that active bishop directly.", sayShort: '…Be7 — solid vs the f4-bishop.', highlights: [H('f4'), H('e7')] }),
      b({ id: 'f2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5', say: "White grabs queenside space with c5; Black hits back with …Nh5!, attacking the f4-bishop and forcing a decision. The knight on the rim looks odd but its job is concrete: remove White's best-placed minor piece.", sayShort: '…Nh5 — attack the f4-bishop.', arrows: [A('h5', 'f4')], highlights: [H('h5'), H('f4')] }),
      b({ id: 'f3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4', say: "…Nxf4 trades off White's good bishop, and exf4 leaves White with doubled, weakened f-pawns. Black has swapped a rim knight for White's best piece and damaged the kingside structure — a fine bargain.", sayShort: '…Nxf4 — trade the bishop, damage f-pawns.', highlights: [H('f4')] }),
      b({ id: 'f4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4 b6 b4 a5 a3 c6 O-O Qc7', say: "…b6 and …a5 chip at White's c5–b4 space chain; then the solid …c6 and …Qc7 complete a flexible setup — the queen eyes the doubled f4-pawn straight down the diagonal. No rush, and every Black piece has a job.", sayShort: '…Qc7 — solid, eye the doubled f4-pawn.', arrows: [A('c7', 'f4')], highlights: [H('f4'), H('c6')] }),
      b({ id: 'f5', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4 b6 b4 a5 a3 c6 O-O Qc7 g3 Ba6 Bxa6 Rxa6 Qe2 Raa8 Kg2 Bf6', say: "…Ba6 trades the light bishops, easing Black's game, and …Bf6 swings the dark bishop to the long diagonal, leaning on d4 and White's queenside. There is the Bf4 tabiya: the bishop pair traded down, White's doubled f-pawns a permanent target, and Black comfortably equal.", sayShort: '…Bf6 — trade down, equal, f-pawns weak.', highlights: [H('f6'), H('f4', SOFT)] }),
    ],
  },
};
