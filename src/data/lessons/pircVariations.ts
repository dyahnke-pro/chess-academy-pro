import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pirc Defence — per-variation master classes (Black's side). Student
// plays BLACK: orientation 'black', narration from Black's view. Every
// line is the curated DB-grounded repertoire.json pirc-defence pgn,
// chess.js-legal. Arrows only on non-pawn pieces with a clear sight-line
// (lessonIntegrity enforces); breaks + key squares use highlights.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
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

/** Austrian Attack (f4) — White's most aggressive try; a wing race. */
const AUSTRIAN: LessonScript = {
  openingId: 'pirc-defence',
  title: 'Pirc — The Austrian Attack',
  minutes: 7,
  orientation: 'black',
  beats: [
    b({ id: 'a1', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4',
      say: "f4 — the Austrian Attack, White's most ambitious answer to the Pirc. White grabs an enormous pawn centre on e4, d4 and f4 and dreams of an e5 push that chases your knight and rolls forward. This is the critical test: that centre is either a battering ram or, if Black hits it correctly, an overextended target.",
      sayShort: 'f4 — the Austrian: a huge e4-d4-f4 centre. A battering ram, or a target.',
      highlights: [H('f4', KEY), H('e4', KEY), H('d4', KEY)] }),
    b({ id: 'a2', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6',
      say: "Black develops unhurried — Bg7, castle — and then the quiet star move: Na6. The knight heads for c7, where it eyes the b5 and e6 breaks and adds a defender to the centre. It looks offside, but it is the modern, well-tested route in this exact line.",
      sayShort: 'Calm development, then ...Na6 — bound for c7 to support the coming breaks.',
      highlights: [H('a6', KEY), H('c7', SOFT)] }),
    b({ id: 'a3', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5',
      say: "And there it is — c5, smashing into d4. This is how Black fights a big centre: not by blockading it but by striking its base. If White ever takes on c5, the d-file opens and the g7-bishop's diagonal roars to life. The centre is now under real pressure.",
      sayShort: '...c5 strikes the base of the centre — the standard way to fight the Austrian.',
      highlights: [H('c5', ATK), H('d4', KEY)] }),
    b({ id: 'a4', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Nc7',
      say: "White declines the capture and clamps the centre shut with d5, gaining space. But the locked centre hands Black a clear plan: the knight swings to c7, ready to prepare b5, prying open the queenside where Black will play. A closed centre means the action shifts to the wings.",
      sayShort: 'd5 locks the centre; ...Nc7 prepares ...b5 — Black plays on the queenside.',
      highlights: [H('d5', KEY), H('c7', KEY), H('b5', SOFT)] }),
    b({ id: 'a5', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Nc7 a4 Rb8 Qe1 b6 Qh4',
      say: "Now the two attacks declare themselves. White lifts the queen — Qe1 to h4 — aiming the heavy pieces at Black's king. Black answers with cold-blooded preparation: a4 is met by Rb8 and b6, readying b5 and the bishop to b7. This is the Austrian's essence: a pure race, White at the king, Black on the queenside. Know your plan and play it fast.",
      sayShort: "A race: White's Qh4 at the king, Black's ...Rb8-b6-b5 on the queenside. Play fast.",
      highlights: [H('h4', SOFT), H('b6', KEY), H('b5', SOFT)] }),
  ],
};

/** Classical System (Nf3, Be2) — White's solid, quiet main line. */
const CLASSICAL: LessonScript = {
  openingId: 'pirc-defence',
  title: 'Pirc — The Classical System',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'c1', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O',
      say: "The Classical System: White develops naturally with Nf3 and the modest Be2, with no early pawn storm. This is the solid, principled main line — White simply finishes development and keeps the centre. Black is comfortable here, completing the fianchetto and castling.",
      sayShort: "Nf3 and Be2 — White's solid, no-storm main line. Black is comfortable.",
      highlights: [H('e2', SOFT), H('g7', KEY)] }),
    b({ id: 'c2', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7',
      say: "Black sets up the standard equalising scheme: c6 to control b5 and d5, then the knight to d7. The knight on d7 is doing one job above all — supporting the e5 break that is coming next. Quiet, purposeful, every piece pointed at the centre.",
      sayShort: '...c6 and ...Nbd7 — the knight readies the central ...e5 break.',
      highlights: [H('c6', SOFT), H('d7', KEY), H('e5', SOFT)] }),
    b({ id: 'c3', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 h3 e5',
      say: "e5 — the freeing break, right on cue. Black challenges d4 directly and stakes a claim in the centre at last. After the long, patient build-up, this is the move that gives the Pirc its equal, healthy game.",
      sayShort: 'The freeing break: ...e5 challenges d4 and equalises.',
      highlights: [H('e5', ATK), H('d4', KEY)] }),
    b({ id: 'c4', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 h3 e5 dxe5 dxe5 Be3 Qe7',
      say: "White releases with dxe5 dxe5, the d-file opens, and Black holds a solid pawn on e5. The queen steps to e7 — connecting the rooks, guarding e5, and eyeing the open file. The position is symmetrical in spirit and dead equal; Black has solved every opening problem.",
      sayShort: '...dxe5 opens the d-file; ...Qe7 backs e5. Fully equal.',
      highlights: [H('e5', KEY), H('d8', SOFT)] }),
    b({ id: 'c5', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 h3 e5 dxe5 dxe5 Be3 Qe7 Qd3 Nh5',
      say: "The final touch: Nh5, swinging the knight toward the f4-square where it would be a monster, and clearing the f-pawn's path. From a passive-looking opening Black has reached a position with active pieces and easy equality — exactly what the Classical Pirc promises against White's quiet setup.",
      sayShort: '...Nh5 eyes the f4 outpost — active pieces, easy equality.',
      highlights: [H('h5', KEY), H('f4', SOFT)] }),
  ],
};

/** 150 Attack (Be3, Qd2, Bh6) — trade the dark bishop, castle long, storm. */
const ATTACK_150: LessonScript = {
  openingId: 'pirc-defence',
  title: 'Pirc — The 150 Attack',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 't1', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 O-O',
      say: "The 150 Attack — a blunt, club-crushing plan that even strong amateurs wield: Be3 and Qd2, lining up to trade the dark-squared bishops with Bh6, castle queenside, and hurl the h-pawn at Black's king. Simple and dangerous. Black must know the antidote cold.",
      sayShort: "Be3 + Qd2 — the 150 Attack: trade dark bishops, castle long, storm with h4.",
      highlights: [H('e3', SOFT), H('d2', SOFT)] }),
    b({ id: 't2', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 O-O f3 c6',
      say: "White plays f3 — propping up e4 and clearing the way for g4 and h4. Black's reply is the key to the whole defence: c6. It looks humble, but it is the launch-pad for Black's counter-race, preparing b5 and freeing the queen to swing out. Against a flank attack, you counter in the centre and on the other wing — fast.",
      sayShort: "f3 readies the storm; ...c6 launches Black's queenside counter-race.",
      highlights: [H('f3', SOFT), H('c6', KEY), H('b5', SOFT)] }),
    b({ id: 't3', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 O-O f3 c6 Bh6',
      say: "Bh6 — the point of the system. White offers to trade off your magnificent g7-bishop, the great defender of your king's dark squares. Letting it go feels uncomfortable, but the engines and the theory agree this is fine for Black, because Black's counterplay arrives in time.",
      sayShort: 'Bh6 offers to trade your key g7 defender — and it is fine to allow it.',
      highlights: [H('h6', KEY), H('g7', SOFT)] }),
    b({ id: 't4', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 O-O f3 c6 Bh6 Bxh6 Qxh6',
      say: "After Bxh6 Qxh6, the dark-squared bishops are gone and White's queen sits aggressively on h6. Yes, your king's dark squares are a touch airier — but that is the deal. In exchange you have a clean, fast target on the queenside and no weaknesses there. The whole game now turns on speed.",
      sayShort: "Dark bishops off, White's queen on h6 — Black trades that for queenside speed.",
      highlights: [H('h6', SOFT)] }),
    b({ id: 't5', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 O-O f3 c6 Bh6 Bxh6 Qxh6 Qa5',
      say: "And Black strikes first: Qa5. The queen leaps into the game, eyeing the c3-knight and the queenside, and lends weight to the coming b5-b4. This is the 150 Attack distilled — White races the h-pawn at your king, you race the b-pawn at White's. Whoever knows the plan and plays it faster wins the race.",
      sayShort: "...Qa5 — Black's queen joins the race, eyeing c3 and backing ...b5-b4.",
      highlights: [H('a5', ATK), H('c3', KEY), H('b5', SOFT)] }),
  ],
};

/** Pirc variation master classes, keyed `pirc-defence::<variation name>`
 *  to match the repertoire.json variation names. */
export const PIRC_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pirc-defence::Austrian Attack': AUSTRIAN,
  'pirc-defence::Classical System': CLASSICAL,
  'pirc-defence::150 Attack': ATTACK_150,
};
