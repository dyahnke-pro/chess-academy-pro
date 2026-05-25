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
      b({ id: 'f4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4 b6 b4 a5 a3 Ba6', say: "…b6 strikes at the head of White's c5–b4 space chain, …a5 undermines the b4-pawn, and …Ba6 offers to trade the light bishops, easing Black's game. There is the Bf4 tabiya: White's queenside space neutralised at its base, the bishop pair traded down, and Black comfortably equal with the better minor-piece trades behind him.", sayShort: '…Ba6 — undermine c5/b4, trade bishops.', highlights: [H('a5'), H('b6')] }),
    ],
  },
};
