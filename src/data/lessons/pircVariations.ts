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

/** Byrne Variation (Bg5, O-O-O) — opposite-side castling, mutual race. */
const BYRNE: LessonScript = {
  openingId: 'pirc-defence',
  title: 'Pirc — The Byrne Variation',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'y1', moves: 'e4 d6 d4 Nf6 Nc3 g6 Bg5',
      say: "Bg5 — the Byrne. White pins nothing yet but eyes the f6-knight and signals a sharp plan: queen to d2, castle queenside, and storm the kingside. The moment both kings sit on opposite wings, the game becomes a foot-race of pawn storms, and the faster attacker usually wins.",
      sayShort: 'Bg5 — the Byrne: White heads for opposite-side castling and a pawn-storm race.',
      highlights: [H('g5', KEY), H('f6', SOFT)] }),
    b({ id: 'y2', moves: 'e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 O-O O-O-O c6',
      say: "There it is: White castles long, committing the king to the queenside. That tells Black exactly where to attack — straight at White's king with c6 and the coming b5-b4. In opposite-castling positions you do not defend; you race.",
      sayShort: "White castles long; ...c6 begins Black's b5-b4 storm at White's king.",
      highlights: [H('c6', KEY), H('b5', SOFT)] }),
    b({ id: 'y3', moves: 'e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 O-O O-O-O c6 f4 b5 e5 b4',
      say: "Both storms break at once: White throws f4 and e5 at Black's king, Black hurls b5-b4 at White's. With b4 Black attacks the knight defending White's king — every tempo is gold here, and Black has not flinched.",
      sayShort: 'f4-e5 versus ...b5-b4 — both storms crash in; ...b4 hits the defender.',
      highlights: [H('b4', ATK), H('e5', SOFT)] }),
    b({ id: 'y4', moves: 'e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 O-O O-O-O c6 f4 b5 e5 b4 exf6 bxc3 Qxc3 exf6',
      say: "The pieces fly off: White grabs the f6-knight, Black smashes the knight shielding White's king, the queen recaptures on c3, and Black opens the centre by taking back on f6. The smoke clears to a wild, double-edged position — and crucially, White's king is the more exposed of the two.",
      sayShort: "Knights traded, White's king cover cracked — a wild position, White's king the airier.",
      highlights: [H('c3', KEY), H('f6', SOFT)] }),
    b({ id: 'y5', moves: 'e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 O-O O-O-O c6 f4 b5 e5 b4 exf6 bxc3 Qxc3 exf6 Bh4 d5',
      say: "And the hammer blow: d5. Black slams the centre open so the g7-bishop and the heavy pieces can pour down toward c3 and White's king. This is the Byrne in full cry — a hand-to-hand attacking battle where Black's initiative against the queenside king is very real. Know this race cold or do not enter it.",
      sayShort: "...d5 rips the centre open toward White's king — Black's attack is real.",
      highlights: [H('d5', ATK), H('c3', KEY)] }),
  ],
};

/** Lion Variation (...e5 instead of the fianchetto) — Philidor-like. */
const LION: LessonScript = {
  openingId: 'pirc-defence',
  title: 'Pirc — The Lion Variation',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'l1', moves: 'e4 d6 d4 Nf6 Nc3 e5',
      say: "The Lion — Black skips the fianchetto and plays e5 at once, steering into a Philidor-like structure. Instead of pressuring d4 from g7, Black confronts the centre directly. It is solid, flexible, and sidesteps a mountain of Austrian-Attack theory.",
      sayShort: 'The Lion: ...e5 instead of the fianchetto — a solid Philidor-like setup.',
      highlights: [H('e5', KEY), H('d4', SOFT)] }),
    b({ id: 'l2', moves: 'e4 d6 d4 Nf6 Nc3 e5 Nf3 Nbd7 Bc4 Be7 O-O O-O',
      say: "Black builds the Lion's house: the knight to d7 backing e5, the bishop modestly to e7, and the king safely castled. Nothing is committed, nothing is loose — Black keeps maximum flexibility and waits to see how White arranges before choosing a plan.",
      sayShort: '...Nbd7, ...Be7, castle — the flexible Lion setup, all options open.',
      highlights: [H('d7', KEY), H('e5', SOFT)] }),
    b({ id: 'l3', moves: 'e4 d6 d4 Nf6 Nc3 e5 Nf3 Nbd7 Bc4 Be7 O-O O-O a4 c6 Re1 Qc7 h3 b6',
      say: "Now the Lion shows its teeth on the queenside. Black plays c6 and b6, opening a home on b7 for the bishop and lining the queen up on c7. The whole army quietly turns toward the centre and queenside, ready to expand when the moment is right.",
      sayShort: '...c6, ...b6, ...Qc7 — Black coils for queenside and central expansion.',
      highlights: [H('b6', KEY), H('c7', SOFT)] }),
    b({ id: 'l4', moves: 'e4 d6 d4 Nf6 Nc3 e5 Nf3 Nbd7 Bc4 Be7 O-O O-O a4 c6 Re1 Qc7 h3 b6 Bg5 Bb7 dxe5 Nxe5',
      say: "White tries the Bg5 pin; Black calmly answers with the bishop to b7, eyeing the long light-squared diagonal straight at White's king. When White releases with dxe5, the knight recaptures and lands proudly in the centre on e5. Black has emerged from the Lion with a sound structure and active, well-placed pieces.",
      sayShort: '...Bb7 on the long diagonal, ...Nxe5 centralised — Black is comfortable and active.',
      highlights: [H('e5', KEY), H('b7', SOFT)] }),
  ],
};

/** Fianchetto System (g3, Bg2) — White's quietest; Black grabs space. */
const FIANCHETTO: LessonScript = {
  openingId: 'pirc-defence',
  title: 'Pirc — The Fianchetto System',
  minutes: 5,
  orientation: 'black',
  beats: [
    b({ id: 'f1', moves: 'e4 d6 d4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O',
      say: "White meets the Pirc with a fianchetto of their own — g3 and Bg2 — the quietest, most positional try. With no pawn storm coming, Black is free to play for the centre and for space. Two bishops staring down two long diagonals: this will be a slow, strategic battle.",
      sayShort: "g3 and Bg2 — White's quiet fianchetto. Black plays for centre and space.",
      highlights: [H('g2', SOFT), H('g7', KEY)] }),
    b({ id: 'f2', moves: 'e4 d6 d4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O Nge2 e5 O-O Nc6 d5 Ne7',
      say: "Black strikes the centre with e5 and develops the knight to c6 to pile on d4. White clamps with d5 — and that gift of a closed centre tells Black where to play. The knight reroutes from c6 to e7, heading for the magnificent f5 outpost where it will blockade and bite.",
      sayShort: '...e5 and ...Nc6 hit d4; after d5, the knight reroutes ...Ne7 toward f5.',
      highlights: [H('e5', KEY), H('e7', KEY), H('f5', SOFT)] }),
    b({ id: 'f3', moves: 'e4 d6 d4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O Nge2 e5 O-O Nc6 d5 Ne7 a4 Nd7 Be3 f5',
      say: "With the centre bolted shut by d5, Black knows exactly where to play: the kingside. The break is f5, gaining space and prying open lines for the g7-bishop and the rooks on the f-file. The knights reroute behind it — one toward f5, the other supporting from d7. In a locked Fianchetto position this thrust is Black's whole plan, and it gives fully equal, double-edged play.",
      sayShort: "...f5 — Black's thematic kingside break in the locked Fianchetto. Equal, sharp play.",
      highlights: [H('f5', ATK), H('e5', SOFT)] }),
  ],
};

/** Czech Defence (...c6 instead of ...g6) — compact, direct ...e5. */
const CZECH: LessonScript = {
  openingId: 'pirc-defence',
  title: 'Pirc — The Czech Defence',
  minutes: 5,
  orientation: 'black',
  beats: [
    b({ id: 'z1', moves: 'e4 d6 d4 Nf6 Nc3 c6',
      say: "A different face of the Pirc family: instead of g6, Black plays c6 — the Czech. There is no fianchetto here. Black builds a low, compact structure and aims to challenge the centre head-on with e5, dodging the sharpest Austrian theory entirely.",
      sayShort: 'The Czech: ...c6, no fianchetto — a compact setup aiming for a direct ...e5.',
      highlights: [H('c6', KEY)] }),
    b({ id: 'z2', moves: 'e4 d6 d4 Nf6 Nc3 c6 f4 Qa5',
      say: "White grabs space with f4; Black answers with the clever Qa5. The queen swings out early to pin the knight on c3 against nothing material yet, but it freezes White's centre and prepares the e5 break by taking the sting out of any pawn advance. A typically resourceful Czech idea.",
      sayShort: '...Qa5 pins the c3-knight and freezes the centre, preparing ...e5.',
      highlights: [H('a5', KEY), H('c3', SOFT)] }),
    b({ id: 'z3', moves: 'e4 d6 d4 Nf6 Nc3 c6 f4 Qa5 Bd3 e5 Nf3 Bg4',
      say: "Now the central blow: e5, challenging d4 directly. Black follows with Bg4, pinning the f3-knight so that the defender of d4 is tied down. Every Czech move points at the same target — White's broad centre — and Black's pieces coordinate around cracking it.",
      sayShort: '...e5 challenges d4, ...Bg4 pins its defender. The centre is under fire.',
      highlights: [H('e5', ATK), H('g4', SOFT)] }),
    b({ id: 'z4', moves: 'e4 d6 d4 Nf6 Nc3 c6 f4 Qa5 Bd3 e5 Nf3 Bg4 Be3 Nbd7 O-O Be7 h3 Bxf3 Qxf3 O-O Ne2 c5 dxe5 dxe5',
      say: "Black finishes development — Nbd7, Be7, castle — trades the bishop for the knight to loosen White's grip, then strikes again with c5. When the centre finally resolves with dxe5 dxe5, Black has a sound, harmonious position with no weaknesses. The Czech delivers exactly what it promises: a solid, principled game on Black's terms.",
      sayShort: '...c5 and ...dxe5 leave Black solid and harmonious — the Czech promise kept.',
      highlights: [H('e5', KEY), H('c5', SOFT)] }),
  ],
};

/** Austrian Attack with early e5 — meet it with ...c5 on the centre. */
const AUSTRIAN_E5C5: LessonScript = {
  openingId: 'pirc-defence',
  title: 'Pirc — Austrian: meeting an early e5',
  minutes: 4,
  orientation: 'black',
  beats: [
    b({ id: 'e1', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O e5',
      say: "In the Austrian, White sometimes pushes e5 immediately, lunging at the f6-knight and trying to bulldoze the centre forward. It looks frightening — but a pawn that advances is a pawn that no longer defends. This thrust can be met head-on.",
      sayShort: 'White lunges with an early e5 at the f6-knight — frightening, but answerable.',
      highlights: [H('e5', KEY), H('f6', SOFT)] }),
    b({ id: 'e2', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O e5 Nfd7',
      say: "The accurate retreat is Nfd7 — not back to the rim, but inward, where the knight still bites at e5 and supports the coming counter-break. The knight stays in the game; that is the whole point of choosing d7 over the passive corner.",
      sayShort: 'Retreat ...Nfd7 — inward and active, still pressing e5.',
      highlights: [H('d7', KEY), H('e5', SOFT)] }),
    b({ id: 'e3', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O e5 Nfd7 Be2 c5',
      say: "And the refutation of the rush: c5, striking the base that holds White's whole pawn chain together. Once the support under d4 is hit, White's grand centre starts to wobble. Black has met brute force with a precise central counter-punch — exactly the hypermodern idea the Pirc was built on.",
      sayShort: '...c5 hits the base of the chain — the overextended centre wobbles.',
      highlights: [H('c5', ATK), H('d4', KEY)] }),
  ],
};

export const PIRC_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pirc-defence::Austrian Attack': AUSTRIAN,
  'pirc-defence::Classical System': CLASSICAL,
  'pirc-defence::150 Attack': ATTACK_150,
  'pirc-defence::Byrne Variation': BYRNE,
  'pirc-defence::Lion Variation': LION,
  'pirc-defence::Fianchetto System': FIANCHETTO,
  'pirc-defence::Czech Defence': CZECH,
  'pirc-defence::Austrian Attack with e5 c5': AUSTRIAN_E5C5,
};
