import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_alapin-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
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

export const SICILIAN_ALAPIN_VARIATION_LESSONS: Record<string, LessonScript> = {
  "sicilian-alapin::Alapin: 2...Nf6 3.e5 Nd5 4.d4 cxd4 5.cxd4 d6 (IQP Accepted)": {
    openingId: 'sicilian-alapin', title: 'Alapin — the IQP Accepted (play vs d4)', minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
    beats: [
      b({ id: 'iq1', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6', say: "Black provokes the Alapin's most testing structure on purpose. …Nf6 pokes e5, …Nd5 hops to a fine central square, and after the trades on d4 Black hits the chain with …d6. The plan is clear from move one: liquidate White's centre and leave him with an isolated d-pawn to defend.", sayShort: "…d6 — provoke White's isolated d-pawn.", highlights: [H('d5', SOFT)] }),
      b({ id: 'iq2', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb5 dxe5 Nxe5', say: "…Nc6 develops with a hit on d4, the knight retreats …Nb6 nudging the bishop, and …dxe5 finally dissolves White's spearhead. When the dust settles White is left with the isolated queen's pawn on d4 — exactly the weakness Black has been aiming at the whole time.", sayShort: '…dxe5 — liquidate to the isolated d4-pawn.', highlights: [H('d4')] }),
      b({ id: 'iq3', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb5 dxe5 Nxe5 Bd7 Nxd7 Qxd7 Nc3 e6 O-O Be7', say: "Black trades into the pure structure: …Bd7 and …Qxd7 swap a pair of minors, then …e6 and …Be7 erect the blockade. There is the recommended tabiya: White has the isolated d4-pawn, Black has the ideal blockading squares and the easier middlegame plan — pile on d4, trade pieces, win the endgame. The classic 'play against the IQP' recipe, and the reason this line is a comfortable equaliser.", sayShort: '…Be7 — blockade and besiege d4.', highlights: [H('d4'), H('e6', SOFT)] }),
    ],
  },

  "sicilian-alapin::Alapin: 2...d5 Central Counter (IQP Play)": {
  openingId: "sicilian-alapin",
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
  title: "Alapin — The 2...d5 Central Counter",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "d5", moves: "e4 c5 c3 d5", say: "The most direct answer: d5, striking the centre at once. Black refuses to let White build the big pawn duo and forces an immediate clarification.", sayShort: "d5 — strike the centre immediately.", highlights: [H("d5", KEY)] }),
    b({ id: "iqp", moves: "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6", say: "After exd5 Qxd5 the queen recaptures actively in the centre, and d4 leaves White with an isolated queen's pawn once the c-pawns come off. Black develops Nf6 with tempo and prepares to blockade and besiege that lone d-pawn.", sayShort: "Qxd5 and Nf6 — target the d-pawn.", highlights: [H("d4", KEY), H("f6", SOFT)] }),
    b({ id: "pieces", moves: "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6", say: "Black's pieces swarm the isolated pawn — Bg4 pins the f3-knight that defends d4, and e6 secures the d5-blockade square. The recipe against an isolated pawn is timeless: blockade it, pile on it, and trade into a better endgame.", sayShort: "Bg4 pins f3; e6 blockades d5.", arrows: [A("g4", "f3", ATK)], highlights: [H("d4", KEY)] }),
    b({ id: "verdict", moves: "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 h3 Bh5 O-O Nc6 Na3 a6 Nc2 cxd4", say: "Black completes development around the isolated pawn and finally captures cxd4, resolving the structure in his favour. The verdict on the central counter: Black gets a clean, principled game against a known weakness — exactly the comfortable equality the Alapin player hoped to avoid conceding.", sayShort: "cxd4 — resolve it; Black is comfortable.", highlights: [H("d4", KEY)] }),
  ],
},

  "sicilian-alapin::Alapin: 2...Nf6 Main Line (Endgame)": {
    openingId: 'sicilian-alapin', title: 'Alapin — the 2…Nf6 queen-trade endgame', minutes: 8, orientation: 'black',
    sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
    beats: [
      b({ id: 'nf1', moves: 'e4 c5 c3 Nf6 e5 Nd5', say: "…Nf6 attacks e4 immediately — the cleanest reply to the Alapin, because c3 already stole the natural developing square from White's queenside knight. When e5 chases, the knight hops to d5 and settles: no knight can trade it off through c3, and Black hasn't spent a single pawn move yet.", sayShort: '…Nd5 — the c3-pawn blocks its own knight.', highlights: [H('d5'), H('c3', SOFT)] }),
      b({ id: 'nf2', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6', say: "White builds the big centre and Black immediately dismantles it: …cxd4 trades the c-pawns, then …d6 hits the e5-spearhead. Every Black move either develops or bites on the centre — nothing is spent on defence.", sayShort: '…d6 — bite the e5-spearhead.', highlights: [H('e5')] }),
      b({ id: 'nf3', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb3 dxe5 dxe5', say: "…Nc6 leans on d4, and when the bishop comes to c4 the d5-knight steps to b6, hitting it and forcing Bb3. Then …dxe5 dissolves the centre entirely — and notice what just opened: the full d-file, with the queens staring at each other down it.", sayShort: '…dxe5 — open the d-file.', arrows: [A('b6', 'c4', ATK)], highlights: [H('d4', SOFT)] }),
      b({ id: 'nf4', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb3 dxe5 dxe5 Qxd1+', say: "…Qxd1 — check, and the whole point of the line: the queens come off on move nine on Black's terms. White has two recaptures — the king, surrendering castling, or the b3-bishop sliding back through c2 — and neither solves the standing problem: the e5-pawn is loose, and every Black developing move will aim at it.", sayShort: "Qxd1 — queens off on Black's terms.", highlights: [H('d1'), H('e5', SOFT)] }),
      b({ id: 'nf5', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb3 dxe5 dxe5 Qxd1+ Bxd1 Nc4 Ba4 Bd7', say: "Masters prefer Bxd1, keeping the castling option — so Black shows the second wave: …Nc4, the b6-knight's raid, hitting e5 and b2 at once. White's Ba4 counter-pins the c6-knight against the king, and …Bd7 calmly breaks the pin while adding a third defender to the queenside. Count the attackers on e5: two knights against one defender. The endgame is equal on paper and easier for Black on the board — this is the position the whole variation plays for.", sayShort: '…Bd7 — break the pin, besiege e5.', arrows: [A('c4', 'e5', ATK), A('c6', 'e5', ATK)], highlights: [H('e5'), H('d7', SOFT)] }),
    ],
  },

  
  
  "sicilian-alapin::Alapin: 2...Nf6 3.e5 Nd5 4.d4 cxd4 5.Nf3 (Alt Move Order)": {
    openingId: 'sicilian-alapin', title: 'Alapin — 5.Nf3, a different door to the same room', minutes: 7, orientation: 'black',
    sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
    beats: [
      b({ id: 'am1', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3', say: "Instead of recapturing at once, White develops — Nf3 first, leaving the d4-pawn in Black's pocket for a move. Don't be tempted to cling to it: the pawn always comes back. Black simply continues developing as if nothing happened.", sayShort: 'Nf3 — White delays the recapture.', highlights: [H('d4', SOFT)] }),
      b({ id: 'am2', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6', say: "…Nc6 develops, White collects the pawn with cxd4, and …d6 hits the e5-spearhead — and look at the board: we've transposed straight back into the main 2…Nf6 structure. The move order changed; the position didn't. This is the great comfort of the …Nf6 Alapin: White's little finesses all lead to the same room.", sayShort: '…d6 — same room, different door.', highlights: [H('e5')] }),
      b({ id: 'am3', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb3 dxe5 dxe5 Qxd1+', say: "The same sequence works move for move: …Nb6 nudges the bishop to b3, …dxe5 opens the d-file, and …Qxd1 trades the queens with check. Whether White recaptures with the king or slides the b3-bishop back to d1, the story is identical — the e5-pawn is a permanent target and Black develops against it for free. One plan to remember, two move orders covered.", sayShort: 'Qxd1 — the same endgame, memorised once.', highlights: [H('d1'), H('e5', SOFT)] }),
      b({ id: 'am4', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb3 dxe5 dxe5 Qxd1+ Bxd1 Nc4 Ba4 Bd7', say: "The master continuation: Bxd1 keeps the castling option, …Nc4 raids e5 and b2, Ba4 pins the c6-knight, and …Bd7 breaks the pin on the spot. Both knights now bear down on e5 with only the f3-knight holding it. Same room, same furniture — the transposition is complete, and so is Black's plan.", sayShort: '…Bd7 — transposition complete, e5 besieged.', arrows: [A('c4', 'e5', ATK), A('c6', 'e5', ATK)], highlights: [H('e5')] }),
    ],
  },

  "sicilian-alapin::Alapin: 2...d5 3.exd5 Qxd5 4.d4 Nc6 (with ...e5)": {
    openingId: 'sicilian-alapin', title: 'Alapin — 4…Nc6 and the …e5 counter-strike', minutes: 8, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
    beats: [
      b({ id: 'ne1', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nc6', say: "The queen recaptures on d5 and stands tall — the usual Nc3 harassment is impossible with White's pawn sitting on c3. …Nc6 develops with pressure on d4 and prepares the freeing blow this whole line is built around.", sayShort: '…Nc6 — c3 blocks the queen-kick.', highlights: [H('c3', SOFT), H('d4')] }),
      b({ id: 'ne2', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nc6 Nf3 e5', say: "…e5! — the counter-strike, hitting d4 a second time before White finishes developing. White has nothing better than to take, because defending d4 again would walk into …exd4 and …Bg4 pressure with the queen already centralised.", sayShort: '…e5 — strike before White develops.', arrows: [A('c6', 'd4', ATK)], highlights: [H('e5'), H('d4')] }),
      b({ id: 'ne3', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nc6 Nf3 e5 dxe5 Qxd1+ Kxd1', say: "After dxe5 the d-file stands open and …Qxd1 comes with check — the king must take, since no other piece reaches d1. Study this picture: material is equal, but White's king sits in the centre with rooks disconnected, while Black is about to develop with tempo against it.", sayShort: 'Qxd1 — check; the king must take.', highlights: [H('d1'), H('e5', SOFT)] }),
      b({ id: 'ne4', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nc6 Nf3 e5 dxe5 Qxd1+ Kxd1 Nge7 Bd3 Be6 Na3 O-O-O', say: "…Nge7 keeps the option of …Ng6 against the e5-pawn, …Be6 develops toward the queenside, and …O-O-O lands the rook on the open d-file, staring straight at the king on d1. Black has castled in an endgame White never chose — development and the safer king are the compensation for the pawn White still holds on e5.", sayShort: '…O-O-O — the rook hits the d-file first.', arrows: [A('d8', 'd3', ATK)], highlights: [H('d1', SOFT), H('e5')] }),
      b({ id: 'ne5', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nc6 Nf3 e5 dxe5 Qxd1+ Kxd1 Nge7 Bd3 Be6 Na3 O-O-O Kc2 Nd5 Bd2 h6', say: "With best play the picture sharpens: the White king walks to c2 by hand while …Nd5 re-centralises, hitting the c3-pawn and forcing Bd2 to babysit it. …h6 takes g5 away from White's pieces. Be honest about the ledger: White still holds the extra e5-pawn and the engine gives him a small pull — Black's full development, the d-file, and the walking king are genuine compensation, but this is the fighting choice, not the safe one. If you want risk-free equality, the …Nf6 recapture two tabs over is your line.", sayShort: '…h6 — activity for the pawn; the fighting choice.', arrows: [A('d5', 'c3', ATK)], highlights: [H('e5', SOFT), H('c3')] }),
    ],
  },

  "sicilian-alapin::Alapin: 2...d5 3.exd5 Nf6 (Knight Recapture)": {
    openingId: 'sicilian-alapin', title: 'Alapin — the …Nf6 knight recapture', minutes: 7, orientation: 'black',
    sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
    beats: [
      b({ id: 'kr1', moves: 'e4 c5 c3 d5 exd5 Nf6', say: "Instead of the immediate queen recapture, …Nf6 develops first and lets the d5-pawn wait — it isn't going anywhere White can hold it. The idea: recapture with the KNIGHT, keeping the queen home and giving White no target to develop against.", sayShort: '…Nf6 — the pawn can wait.', highlights: [H('d5')] }),
      b({ id: 'kr2', moves: 'e4 c5 c3 d5 exd5 Nf6 d4 cxd4 cxd4 Nxd5', say: "The c-pawns trade, and …Nxd5 collects the pawn with the piece the square was built for. Compare this with the queen lines: same structure — White's isolated pawn on d4 — but Black's queen never stepped out, and the knight on d5 is the textbook blockader, planted directly in front of the weakness.", sayShort: '…Nxd5 — the born blockader.', highlights: [H('d5'), H('d4', SOFT)] }),
      b({ id: 'kr3', moves: 'e4 c5 c3 d5 exd5 Nf6 d4 cxd4 cxd4 Nxd5 Nf3 Nc6 Be2', say: "…Nc6 adds the second piece against d4 and the position states its terms plainly: White must prove the isolated pawn is dynamic strength before Black finishes …e6, …Be7 and castles — after which the game becomes the grinding blockade-and-besiege ending every Alapin player dreads. The quietest line in the repertoire, and one of the most annoying to face.", sayShort: '…Nc6 — blockade now, besiege later.', arrows: [A('c6', 'd4', ATK)], highlights: [H('d4')] }),
      b({ id: 'kr4', moves: 'e4 c5 c3 d5 exd5 Nf6 d4 cxd4 cxd4 Nxd5 Nf3 Nc6 Be2 Bg4 O-O e6 Nc3 Be7 h3 Bh5 Qb3 Qb6', say: "…Bg4 develops with pressure on the f3-knight — d4's key defender — and …e6 plus …Be7 finish the wall around the d5-blockader. When Nc3 challenges the knight and Qb3 pokes at b7, Black answers with the move that defines the whole system: …Qb6, guarding b7 and offering the queen trade. Every exchange drifts the game toward the endgame where the isolated d4-pawn is pure weakness — masters have scored beautifully from here with Black for a century.", sayShort: '…Qb6 — trade queens, win the ending.', arrows: [A('h5', 'f3', ATK)], highlights: [H('d4'), H('b7', SOFT)] }),
    ],
  },
};
