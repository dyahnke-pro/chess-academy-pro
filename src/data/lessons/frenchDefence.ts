import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / intent),
// highlights YELLOW (a key square the narration names) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// Black-oriented (the student plays Black). Every arrow originates on a
// non-pawn with a clear sight-line; every marked square is named in the prose
// (lessonIntegrity + narrationGrounding gates).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const FRENCH_DEFENCE_LESSON: LessonScript = {
  openingId: 'french-defence',
  title: 'The French Defence — A Master Class',
  minutes: 13,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'e4 e6', say: "Welcome to the French Defence — one of the oldest and most resilient answers to 1.e4. With 1…e6 Black makes a modest, purposeful move: it opens a path for the f8-bishop and, above all, prepares to challenge the centre with …d5 next. Black declines the symmetrical 1…e5 and instead plays to undermine White's centre rather than meet it head-on. The French is a counter-puncher's opening — cede a little space now, strike back on your own terms.", sayShort: '…e6 — prepare …d5 to hit the centre.', highlights: [H('e6'), H('d5', SOFT)] }),
    b({ id: 'd5', moves: 'e4 e6 d4 d5', say: "d4 d5 — and the lines are drawn. White builds the broad pawn centre on d4 and e4; Black immediately challenges it with …d5, creating the central tension that defines the whole opening. White now faces the French fork in the road: defend e4 with a knight, push past with e5, or trade on d5. The mainline Classical comes from the principled 3.Nc3.", sayShort: '…d5 — challenge e4, the tension begins.', highlights: [H('d5'), H('e4'), H('d4', SOFT)] }),
    b({ id: 'nc3-nf6', moves: 'e4 e6 d4 d5 Nc3 Nf6', say: "Nc3 defends the e4-pawn and develops; Black answers Nf6, a second attacker on e4 that dares White to resolve the tension. This is the Classical French. The pressure on e4 is now acute — leaving it would drop the pawn — so White almost always commits with the space-grabbing push e5.", sayShort: '…Nf6 — a second hit on e4.', arrows: [A('f6', 'e4', VIS)], highlights: [H('e4')] }),
    b({ id: 'e5-nfd7', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7', say: "e5! White seizes space and kicks the f6-knight, which drops back to d7 — the Steinitz mainline. White's pawn chain on d4 and e5 cramps Black, but it is also a target. The chain has a base — the d4-pawn — and the entire French plan is to assault it with the lever …c5. The d7-knight will reroute later; for now it eyes the e5-spearhead and supports the coming break.", sayShort: '…Nfd7 — retreat, then strike d4 with …c5.', highlights: [H('e5'), H('d4'), H('c5', SOFT)] }),
    b({ id: 'f4-c5', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5', say: "f4 reinforces the e5-spearhead and hints at a kingside pawn storm; Black hits back with …c5, the thematic French strike at the base of the chain. The d4-pawn is attacked, and Black will keep piling on it. Notice the structure: White owns space and the kingside; Black owns the queenside lever and a clear target.", sayShort: '…c5 — strike the base of the chain, d4.', highlights: [H('c5'), H('d4'), H('f4', SOFT)] }),
    b({ id: 'nf3-nc6', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6', say: "Nf3 defends d4 a second time; Black develops …Nc6, a second attacker on it. The c6-knight is the workhorse of the French — it presses d4, supports the …cxd4 break, and can swing to b4 or a5 later. The whole game now pivots on this one square.", sayShort: '…Nc6 — pile onto d4.', arrows: [A('c6', 'd4', VIS)], highlights: [H('d4')] }),
    b({ id: 'be3-be7', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Be7', say: "Be3 props d4 once more and develops; Black calmly plays …Be7, flexible and ready to castle. Now look at Black's one chronic problem — the c8-bishop, walled in behind its own pawn on e6. Freeing this bishop is the eternal French question, and Black has a modern answer coming: …b6 and …Bb7 to drop it onto the long diagonal.", sayShort: '…Be7 — develop, then free the c8-bishop.', highlights: [H('c8'), H('e6', SOFT)] }),
    b({ id: 'qd2-oo', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Be7 Qd2 O-O', say: "Qd2 connects White's rooks and leans toward the kingside; Black castles into safety. We've reached the classic Classical standoff — White with the big chain and space, Black with pressure on d4 and a plan on both wings. Black now turns to the two French levers: …f6 or …f5 against e5, and queenside expansion.", sayShort: 'O-O — castle, then hit e5 and d4.', highlights: [H('e5'), H('d4', SOFT)] }),
    b({ id: 'be2-b6', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Be7 Qd2 O-O Be2 b6', say: "Be2 finishes White's development; Black plays …b6, preparing the fianchetto …Bb7. This is the modern solution to the bad bishop — instead of trading it off, Black activates it on b7, aiming it down the long diagonal toward e4 and the white king's home on g2. The problem piece becomes a sniper.", sayShort: '…b6 — fianchetto the bad bishop to b7.', highlights: [H('b6'), H('b7'), H('e4', SOFT)] }),
    b({ id: 'oo-f5', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Be7 Qd2 O-O Be2 b6 O-O f5', say: "White castles; Black strikes with …f5! This is the key Classical break. Rather than hand White a free hand on the kingside, Black challenges the e5-spearhead head-on and prepares to open the f-file — the very file the f8-rook is sitting on. White typically takes en passant, and the position cracks open exactly where Black wants it.", sayShort: '…f5 — the Classical break, opening the f-file.', arrows: [A('f8', 'f5', VIS)], highlights: [H('f5'), H('e5')] }),
    b({ id: 'exf6-nxf6', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Be7 Qd2 O-O Be2 b6 O-O f5 exf6 Nxf6', say: "exf6 Nxf6 — the e5-pawn vanishes and the knight returns to f6, beautifully reborn. From f6 it eyes e4 and d5, the cramped French has sprung open, and every black piece suddenly breathes. This is the payoff: Black absorbed the space, struck the chain, and emerged with active pieces and real play against White's centre.", sayShort: '…Nxf6 — the knight springs back, eyeing e4.', arrows: [A('f6', 'e4', VIS)], highlights: [H('e4'), H('d5', SOFT)] }),
    b({ id: 'close', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Be7 Qd2 O-O Be2 b6 O-O f5 exf6 Nxf6 Kh1 Bb7 Rad1 Rc8 Qe1 Kh8', say: "The setups complete: White tucks the king with Kh1, centralises with Rad1 and regroups Qe1; Black fianchettoes …Bb7, swings the rook to the half-open c-file with …Rc8, and unpins with …Kh8. There stands the Classical French middlegame — the once-bad bishop reaches b7 and the long diagonal, the c-file and f-file hand the rooks their targets, and the d4-pawn remains the strategic fault-line. That's the French in one breath: concede space, strike the chain with …c5 and …f5, free the bishop to b7, and turn a cramped start into a position humming with counterplay. The other tabs show the opening's many faces — the space-grabbing Advance, the razor-sharp Winawer, the solid Rubinstein, the combative McCutcheon, and more.", sayShort: '…Bb7 — the French middlegame: counterplay everywhere.', highlights: [H('b7'), H('d4'), H('c5', SOFT)] }),
  ],
};
