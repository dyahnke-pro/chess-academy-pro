import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Caro-Kann variation master classes (Black). Spines built move-by-move
// from the Lichess masters DB (most-played master move at each ply), so
// they're DB-anchored + masters-legit by construction. chess.js-legal;
// highlights land only on squares the narration names (§5b). Keyed
// `${openingId}::${variationName}` to match the repertoire variation names.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string; moves: string; say: string; sayShort?: string;
  arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const ADVANCE: LessonScript = {
  openingId: 'caro-kann',
  sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  title: 'Caro-Kann — The Advance Variation',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  beats: [
    b({ id: 'adv1', moves: 'e4 c6 d4 d5 e5 Bf5',
      say: "The Advance — e5 grabs space and locks the centre. Here is the Caro's revenge on the French: BEFORE playing e6, Black gets the light bishop out to f5. In the French that bishop dies behind e6; in the Caro it is already free.",
      sayShort: "Advance e5 locks it — …Bf5 escaped first.",
      highlights: [H('f5', KEY), H('e6', SOFT), H('e5', SOFT)] }),
    b({ id: 'adv2', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5',
      say: "Only now e6, the bishop safely outside. Then the thematic strike: c5, hitting d4 — the base of White's chain. You undermine a pawn chain at its base — Black plays for the break, never passive defence.",
      sayShort: "…e6, …c5 — strike the chain's base, undermine.",
      highlights: [H('c5', ATK), H('d4', KEY), H('e6', SOFT)] }),
    b({ id: 'adv3', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7',
      say: "White props the chain with Be3; Black trades on d4 and routes the knight up through e7 — bound for the strong c6 and f5 squares where it presses White's centre.",
      sayShort: "…cxd4, reroute the knight via e7 to f5.",
      highlights: [H('d4', SOFT), H('e7', KEY), H('c6', SOFT), H('f5', SOFT)] }),
    b({ id: 'adv4', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7 Nd2 Nbc6 N2f3 Be4',
      say: "Both knights develop, and the bishop slides to e4 — a magnificent post in the heart of the board, raking the long diagonal toward White's king.",
      sayShort: "…Be4 — a monster post on the long diagonal.",
      highlights: [H('e4', KEY)] }),
    b({ id: 'adv5', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7 Nd2 Nbc6 N2f3 Be4 O-O Ng6',
      say: "Black castles into a comfortable, equal game: the bishop dominates e4, the knight on g6 leans on e5, and the open c-file invites the rooks. The Advance held no terror — Black undermined the chain and freed every piece.",
      sayShort: "Castle — bishop rules e4, the c-file opens; equal.",
      highlights: [H('e4', KEY), H('e5', SOFT), H('g6', SOFT)] }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: 'caro-kann',
  sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  title: 'Caro-Kann — The Exchange Variation',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  beats: [
    b({ id: 'ex1', moves: 'e4 c6 d4 d5 exd5 cxd5',
      say: "The Exchange — White releases the tension on d5. Black recaptures cxd5 and gets exactly what the Caro wants: a healthy, symmetrical centre, an open c-file for the rooks, and not one weakness to defend.",
      sayShort: "Exchange cxd5 — symmetrical, sound, open c-file.",
      highlights: [H('d5', KEY)] }),
    b({ id: 'ex2', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4',
      say: "Black develops naturally and, true to the Caro, gets the light bishop out to g4 — active, outside the chain — before ever committing to e6.",
      sayShort: "Develop, …Bg4 out before e6 — the Caro habit.",
      highlights: [H('g4', KEY), H('e6', SOFT)] }),
    b({ id: 'ex3', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6',
      say: "Now e6, and Bd6 offers to trade White's active bishop on f4 — swap off the good piece and Black's structure simply outlasts White's.",
      sayShort: "…e6, …Bd6 — challenge and trade f4's bishop.",
      highlights: [H('e6', SOFT), H('d6', KEY), H('f4', SOFT)] }),
    b({ id: 'ex4', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6 Bxd6 Qxd6 O-O O-O Rfe1 Qc7',
      say: "Bishops come off, both sides castle, and the queen settles on c7 — eyeing the open c-file and the kingside. Dead level, easy to play: the Exchange's bark is far worse than its bite.",
      sayShort: "Trade, castle, …Qc7 on the c-file — equal.",
      highlights: [H('c7', KEY)] }),
  ],
};

const TWO_KNIGHTS: LessonScript = {
  openingId: 'caro-kann',
  sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  title: 'Caro-Kann — The Two Knights',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  beats: [
    b({ id: 'tk1', moves: 'e4 c6 Nc3 d5 Nf3 Bg4',
      say: "The Two Knights — White brings both knights out fast. Black answers with Bg4, the bishop out and pinning the f3-knight to the queen before the centre is even resolved.",
      sayShort: "…Bg4 — out early, pinning the f3-knight.",
      highlights: [H('g4', KEY)] }),
    b({ id: 'tk2', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6',
      say: "Prodded by h3, Black trades on f3 — yes, giving up the bishop pair, but for it White's structure is committed and Black's wall on e6 is granite. A fair trade in a solid game.",
      sayShort: "…Bxf3, …e6 — bishop pair for granite structure.",
      highlights: [H('f3', SOFT), H('e6', KEY)] }),
    b({ id: 'tk3', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 Be2 Nf6 O-O Nbd7 d4 dxe4 Nxe4 Nxe4 Qxe4 Nf6',
      say: "Black develops, castles, and breaks with dxe4 to trade pieces and ease any cramp. Then Nf6 hits the queen on e4 and gains a tempo.",
      sayShort: "…dxe4, …Nf6 — hits the e4-queen with tempo.",
      highlights: [H('e4', KEY)] }),
    b({ id: 'tk4', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 Be2 Nf6 O-O Nbd7 d4 dxe4 Nxe4 Nxe4 Qxe4 Nf6 Qd3 Be7 c4 O-O',
      say: "Pieces traded, Black tucks the bishop on e7 and castles into a comfortable game — no weaknesses, smooth development, nothing for White to bite on. The Two Knights gives Black an easy equality.",
      sayShort: 'Be7, castle — no weaknesses, easy equality.',
      highlights: [H('e7', KEY)] }),
  ],
};

const PANOV: LessonScript = {
  openingId: 'caro-kann',
  sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  title: 'Caro-Kann — The Panov-Botvinnik Attack',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  beats: [
    b({ id: 'pa1', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6',
      say: "The Panov — White plays c4 for an aggressive game with an isolated d-pawn looming. Black meets it head-on: Nf6 develops and pressures the centre at once. No passivity here.",
      sayShort: "Panov c4 — answer …Nf6, pressure the centre.",
      highlights: [H('c4', KEY), H('f6', SOFT)] }),
    b({ id: 'pa2', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4',
      say: "e6 opens the bishop, and Bb4 pins the c3-knight — Black piles pressure on White's centre instead of sitting and waiting.",
      sayShort: "…e6, …Bb4 — pin c3, pressure the centre.",
      highlights: [H('b4', KEY), H('e6', SOFT)] }),
    b({ id: 'pa3', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5 Bd2 Nc6 Bd3 O-O',
      say: "After the trade on d5, Black's knight lands on d5 — the perfect blockading square in front of White's isolated pawn. Nc6 and O-O finish development around that blockade.",
      sayShort: "…Nd5 — blockade the isolated pawn, then develop.",
      highlights: [H('d5', KEY)] }),
    b({ id: 'pa4', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5 Bd2 Nc6 Bd3 O-O O-O Be7 a3 Bf6 Qc2 g6',
      say: "Black redeploys the bishop to f6 to lean on d4, and g6 shores up the kingside. With the blockade on d5 and pressure on d4, Black is at least equal against the isolated pawn — and often the one playing for the win.",
      sayShort: "…Bf6, …g6 — blockade d5, pressure d4; equal.",
      highlights: [H('f6', KEY), H('d4', KEY), H('g6', SOFT), H('d5', SOFT)] }),
  ],
};

const FANTASY: LessonScript = {
  openingId: 'caro-kann',
  sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  title: 'Caro-Kann — The Fantasy Variation',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  beats: [
    b({ id: 'fa1', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5',
      say: "The Fantasy — White props the centre with f3. Black's principled reply: dxe4, and then e5! — striking d4 at once and prising the position open before White is developed.",
      sayShort: "Fantasy f3 — take e4, then …e5 hits d4.",
      highlights: [H('e5', ATK), H('e4', SOFT), H('d4', KEY)] }),
    b({ id: 'fa2', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7',
      say: "Bg4 pins the f3-knight, the bishop out and active; Nd7 props up the e5-pawn. Black is already the better-coordinated side.",
      sayShort: "…Bg4 pins f3, …Nd7 holds e5 — better coordinated.",
      highlights: [H('g4', KEY), H('e5', SOFT)] }),
    b({ id: 'fa3', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bd6 Bg5 O-O',
      say: "Black develops smoothly — Bd6 aims at the kingside, then castle. That early e5 has handed Black a free, classical game with easy piece play.",
      sayShort: "…Bd6, castle — the early …e5 freed Black.",
      highlights: [H('d6', KEY), H('e5', SOFT)] }),
    b({ id: 'fa4', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bd6 Bg5 O-O Nbd2 Qc7 Qe1 Bh5',
      say: "The queen swings to c7, piling on e5 and the kingside; the bishop drops to h5 to keep the pin alive. Fully developed and on the front foot, Black has turned White's Fantasy into Black's comfort.",
      sayShort: "…Qc7, …Bh5 keeps the pin — Black presses.",
      highlights: [H('c7', KEY), H('h5', KEY), H('e5', SOFT)] }),
  ],
};

const TARTAKOWER: LessonScript = {
  openingId: 'caro-kann',
  sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  title: 'Caro-Kann — The Tartakower Variation',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  beats: [
    b({ id: 'ta1', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6',
      say: "The Tartakower — Black recaptures with exf6, deliberately doubling the f-pawns. The payment buys real assets: the half-open e-file, the bishop pair, and a sturdy structure with no square for White to attack.",
      sayShort: "…exf6 — doubled pawns for the open e-file, bishops.",
      highlights: [H('f6', KEY)] }),
    b({ id: 'ta2', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O',
      say: "Bd6 trains the bishop on White's kingside, then Black castles. Those doubled f-pawns are not weak — they clamp the central squares e5 and g5, denying White's pieces the natural outposts.",
      sayShort: "…Bd6, castle — the doubled pawns clamp e5.",
      highlights: [H('d6', KEY), H('e5', SOFT), H('g5', SOFT)] }),
    b({ id: 'ta3', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5',
      say: "The rook swings to the open e-file with check on e8, and h5 begins a kingside pawn storm. Black holds the easier, more natural attacking plan.",
      sayShort: "…Re8+ on the open file, then …h5 attacks.",
      highlights: [H('e8', KEY), H('h5', ATK)] }),
    b({ id: 'ta4', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5 O-O h4 h3 Nd7 Bd2 Nf8',
      say: "h4 and h3 cramp White's king; the knight reroutes via d7 to f8, heading for the kingside. Solid structure, the bishop pair, and the initiative — the Tartakower's bargain pays off.",
      sayShort: "…h4-h3 cramp the king; knight reroutes to f8.",
      highlights: [H('h4', ATK), H('h3', SOFT), H('d7', SOFT), H('f8', KEY)] }),
  ],
};

const CLASSICAL: LessonScript = {
  openingId: 'caro-kann',
  sources: ['book:caro-kann', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  title: 'Caro-Kann — The Classical Variation',
  minutes: 9,
  orientation: 'black',
  kind: 'variation',
  beats: [
    b({ id: 'cl1', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5',
      say: "The Classical — the flagship Caro-Kann, and the reason to play the whole opening. After the centre is traded, Black develops the light-squared bishop to f5, OUTSIDE the pawn chain, before ever playing …e6. That single difference is what makes the Caro better than the French: the bishop that rots on c8 in the French here becomes an active, well-placed piece.",
      sayShort: '…Bf5 — the good bishop, out before …e6.',
      highlights: [H('f5', KEY)] }),
    b({ id: 'cl2', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7',
      say: "White harasses the bishop with Ng3 and the h4-h5 thrust; Black calmly tucks it to g6 and plays the prophylactic …h6 to give it the h7-square. Then …Nd7 develops, preparing …Ngf6 and …e6. Black's pieces come out smoothly to their best squares with no concessions.",
      sayShort: '…Bg6, …h6, …Nd7 — calm, ideal development.',
      highlights: [H('g6', KEY), H('h6', SOFT), H('d7', SOFT)] }),
    b({ id: 'cl3', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bf4 Ngf6',
      say: "h5 forces the bishop to h7, but on Bd3 Black trades it for White's strong attacking bishop — happily swapping a piece that has done its job for one that wanted to do damage. Then …e6 frees the position and …Ngf6 completes development. The point: Black has no bad pieces and no weak pawns, a famously durable structure.",
      sayShort: '…Bxd3, …e6, …Ngf6 — no bad pieces left.',
      highlights: [H('f6', KEY), H('e6', SOFT)] }),
    b({ id: 'cl4', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bf4 Ngf6 O-O-O Be7 Ne4 O-O',
      say: "White castles long and Black short — the classic opposite-wings tabiya. But Black is fully developed, rock-solid, and has the easier game: just complete with …Be7 and castle, then strike at White's king with the freeing …c5 break. Solid, principled, and statistically Black's best Caro-Kann.",
      sayShort: '…O-O — solid, then the …c5 break.',
      highlights: [H('e7', KEY), H('c5', ATK)] }),
  ],
};

export const CARO_VARIATION_LESSONS: Record<string, LessonScript> = {
  'caro-kann::Classical Variation': CLASSICAL,
  'caro-kann::Advance Variation': ADVANCE,
  'caro-kann::Exchange Variation': EXCHANGE,
  'caro-kann::Two Knights Variation': TWO_KNIGHTS,
  'caro-kann::Panov-Botvinnik Attack': PANOV,
  'caro-kann::Fantasy Variation': FANTASY,
  'caro-kann::Tartakower/Breyer Variation': TARTAKOWER,
};
