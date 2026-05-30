import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Caro-Kann Defense, PER-VARIATION Watch lessons.
// Board-accurate, two-register narration (G9.3 Gates A-D). Student = BLACK.
// Every line is a solid, fully-playable Caro (engine −0.15 to −0.7); narration
// frames Black as equalising / accepting a tiny pull for a sound structure —
// never as winning.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:caro-kann',
  'https://www.chess.com/openings/Caro-Kann-Defense',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Classical 4…Bf5 (Main Line) — bishop out, trade, O-O-O race ──
const CLASSICAL_MAIN: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Classical 4…Bf5 (Main Line)',
  minutes: 12, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bf5', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5',
      arrows: [{ from: 'f5', to: 'e4', color: VIS }], highlights: [{ square: 'f5', color: KEY }],
      say: "The Classical Caro. We trade on e4 and develop the light-squared bishop OUTSIDE the pawn chain with Bf5, hitting the knight. This is the whole point of the Caro over the French — that bishop is free and active before we ever play …e6.",
      sayShort: 'Bf5 — free the good bishop.' }),
    b({ id: 'trade', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3',
      arrows: [{ from: 'h7', to: 'd3', color: VIS }], highlights: [{ square: 'd3', color: KEY }],
      say: "White chases the bishop with h4-h5; we calmly tuck it to h7, just as planned. When White offers the trade with Bd3, we take — swapping off White's attacking light-squared bishop and taking the venom out of the position. We're left with a clean, easy game.",
      sayShort: 'Bxd3 — trade the attacker.' }),
    b({ id: 'mg-castle', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7',
      arrows: [{ from: 'c7', to: 'c5', color: VIS }], highlights: [{ square: 'c1', color: SOFT }, { square: 'c5', color: KEY }],
      say: "Now …e6 walls in nothing — our bad bishop is already gone — and we finish developing. White castles long, so here's the middlegame: we castle short and roll the c- and b-pawns at his king. A flawless structure and a battering ram. We're a sliver worse on the engine, but rock-solid with a clear plan.",
      sayShort: '…c5/…b5 — storm his king.' }),
  ],
};

// ── Classical Capablanca (Bf4, Kb1, Ne5) — meet the outpost with …c5 ──
const CAPABLANCA: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Classical Capablanca (Ne5 Outpost)',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'setup', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 h5 Bh7 Nf3 Nd7 Bd3 Bxd3 Qxd3',
      highlights: [{ square: 'h7', color: SOFT }], say: "Same Classical recipe — bishop out to f5, retreat to h7 under the h-pawn advance, then trade off White's light bishop on d3. We've neutralised White's best attacker and kept our trademark sound structure. No weaknesses, no bad pieces.",
      sayShort: 'Bxd3 — neutralise the attacker.' }),
    b({ id: 'castle', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 h5 Bh7 Nf3 Nd7 Bd3 Bxd3 Qxd3 e6 Bf4 Ngf6 O-O-O Be7 Kb1 O-O',
      highlights: [{ square: 'g8', color: SOFT }, { square: 'c1', color: SOFT }], say: "We develop and castle kingside; White sets up with Bf4 and Kb1 and goes long. Opposite-side castling again — which suits us perfectly. Our pawns are aimed at White's king, his at ours, and our structure is the sounder of the two.",
      sayShort: 'O-O — opposite castling, we\'re ready.' }),
    b({ id: 'mg-ne5', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 h5 Bh7 Nf3 Nd7 Bd3 Bxd3 Qxd3 e6 Bf4 Ngf6 O-O-O Be7 Kb1 O-O Ne5',
      arrows: [{ from: 'd7', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'c5', color: SOFT }],
      say: "White plants a knight on the e5-outpost — the most annoying piece in the position. The middlegame plan: challenge it directly with …Nxe5 to trade it off, then launch …c5 and …b5 at White's king on the queenside. Remove White's one active piece, open lines toward his king, and our solid Caro does the rest.",
      sayShort: '…Nxe5 then …c5/…b5.' }),
  ],
};

// ── Tartakower / Two Knights 3…Nf6 — French-Advance structure, …c5 ──
const TARTAKOWER: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Tartakower / Two Knights 3…Nf6',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c6 Nc3 d5 Nf3 Nf6 e5 Ne4',
      arrows: [{ from: 'f6', to: 'e4', color: VIS }], highlights: [{ square: 'e4', color: KEY }],
      say: "When White develops both knights, we play …Nf6 and, after e5, leap into e4 — a bold, active post right in White's half. This is the sharp Tartakower line: instead of a quiet Caro we get a dynamic, French-Advance-style fight where our pieces come alive.",
      sayShort: 'Ne4 — the active outpost.' }),
    b({ id: 'trade', moves: 'e4 c6 Nc3 d5 Nf3 Nf6 e5 Ne4 Ne2 Qb6 d4 e6 Ng3 Nxg3 hxg3',
      arrows: [{ from: 'e4', to: 'g3', color: VIS }], highlights: [{ square: 'b6', color: KEY }],
      say: "We bring the queen to b6, pressuring b2 and d4, and when White challenges the e4-knight we trade it for the g3-knight. White recaptures with the h-pawn, damaging his own kingside structure. We've kept the position sharp and given White doubled g-pawns to worry about.",
      sayShort: 'Qb6 + …Nxg3 — keep it sharp.' }),
    b({ id: 'mg-c5', moves: 'e4 c6 Nc3 d5 Nf3 Nf6 e5 Ne4 Ne2 Qb6 d4 e6 Ng3 Nxg3 hxg3 c5',
      arrows: [{ from: 'c6', to: 'c5', color: VIS }], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "And the freeing break — …c5, hitting d4 and opening the position for our pieces. Here's the middlegame: it's a French-Advance structure, but with our queen active on b6, White's kingside slightly damaged, and the …c5 lever cracking the centre. It's the sharpest, most double-edged Caro line — dynamic equality where the better-prepared side wins.",
      sayShort: '…c5 — crack the centre open.' }),
  ],
};

// ── Two Knights 2.Nc3 d5 3.Nf3 Bg4 — pin, trade, rock-solid ──
const TWO_KNIGHTS_BG4: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Two Knights 3…Bg4',
  minutes: 10, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bg4', moves: 'e4 c6 Nc3 d5 Nf3 Bg4',
      arrows: [{ from: 'c8', to: 'g4', color: VIS }], highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: SOFT }],
      say: "Against the Two Knights, the cleanest equaliser: …Bg4, pinning the f3-knight. We develop our light-squared bishop actively and immediately create pressure. The whole line is about trading pieces to reach a safe, simple position.",
      sayShort: 'Bg4 — pin the knight.' }),
    b({ id: 'trade', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 Bd3 dxe4 Nxe4 Nxe4 Qxe4 Nd7',
      highlights: [{ square: 'd7', color: SOFT }], say: "When questioned, we trade on f3 — giving up the bishop for the knight to simplify — then exchange the central pawns and knights. Every trade takes us closer to a clean, weakness-free position where White's slight space edge means nothing.",
      sayShort: 'Bxf3 — trade into simplicity.' }),
    b({ id: 'mg-plan', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 Bd3 dxe4 Nxe4 Nxe4 Qxe4 Nd7 O-O Nf6',
      arrows: [{ from: 'f6', to: 'e4', color: SOFT }], highlights: [{ square: 'd5', color: SOFT }],
      say: "We round things out with …Nf6, hitting White's centralised queen. Here's the middlegame: a rock-solid, slightly cramped but utterly sound position. The plan is simple — …Bd6 or …Be7, castle, and break with …c5 or …e5 when ready. White has a tiny pull; we have a fortress that's almost impossible to crack. Classic Caro safety.",
      sayShort: '…Nf6, …c5 — solid and safe.' }),
  ],
};

// ── Advance 3.e5 Bf5 — the good bishop is out, …c5 break ──
const ADVANCE_BF5: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Advance 3.e5 Bf5',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bf5', moves: 'e4 c6 d4 d5 e5 Bf5',
      arrows: [{ from: 'c8', to: 'f5', color: VIS }], highlights: [{ square: 'f5', color: KEY }],
      say: "White grabs space with the Advance, e5. And here's why the Caro beats the French: before we lock the centre with …e6, we get our light-squared bishop OUT to f5. In the French this bishop is a lifelong prisoner; in the Caro it's free and active. That one difference is the whole point.",
      sayShort: 'Bf5 — the bishop escapes first.' }),
    b({ id: 'c5', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7 Nbd2 Nc6 c3 cxd4 cxd4',
      arrows: [{ from: 'c6', to: 'c5', color: VIS }], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We develop behind the safety of our structure and strike with the thematic …c5, hitting the base of White's chain on d4. After the trades, White is left with an isolated d4-pawn to defend. We've turned his space advantage into a target.",
      sayShort: '…c5 — hit the d4-base.' }),
    b({ id: 'mg-plan', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7 Nbd2 Nc6 c3 cxd4 cxd4',
      arrows: [{ from: 'd7', to: 'b6', color: SOFT }], highlights: [{ square: 'd4', color: KEY }],
      say: "Here's the middlegame, and the engine calls it dead level. We have the active light-squared bishop on f5, knights pressuring the isolated d4-pawn, and an easy plan: …Be7, …O-O, double on the c- and d-files, and pile onto d4. White's space is neutralised; our pieces are better placed. This is the Caro at its best — equal and easy to play.",
      sayShort: '…Be7, …O-O — blockade and press d4.' }),
  ],
};

// ── Advance 3.e5 c5 — challenge the centre at once ──
const ADVANCE_C5: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Advance 3.e5 c5',
  minutes: 10, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'e4 c6 d4 d5 e5 c5',
      arrows: [{ from: 'c6', to: 'c5', color: VIS }], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "An aggressive alternative against the Advance: instead of …Bf5, we hit the centre immediately with …c5, challenging d4 before White is set up. We're refusing to let White enjoy his space — we strike at its foundation right away.",
      sayShort: 'c5 — challenge the centre now.' }),
    b({ id: 'bxc5', moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 a3 Bxc5 Nf3 Nc6 Bd3 Nge7',
      arrows: [{ from: 'f8', to: 'c5', color: VIS }], highlights: [{ square: 'c5', color: SOFT }],
      say: "White grabs the pawn with dxc5; we prepare …e6 and round it back up with …Bxc5, developing the bishop to an active diagonal. We bring the knights out to c6 and e7 — the e7-square keeps our structure flexible and supports a future …f6 break.",
      sayShort: '…Bxc5 — regain the pawn, develop.' }),
    b({ id: 'mg-plan', moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 a3 Bxc5 Nf3 Nc6 Bd3 Nge7 b4 Bb6',
      arrows: [{ from: 'f7', to: 'f6', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'b6', color: SOFT }],
      say: "White gains queenside space with b4; we tuck the bishop to b6, still active. Here's the middlegame plan: castle, then undermine White's cramping e5-pawn with …f6. Once e5 falls or trades, the position opens up for our pieces and our slightly freer development tells. A dynamic, fully equal fight — exactly what an active Caro player wants.",
      sayShort: '…O-O then …f6 — undermine e5.' }),
  ],
};

// ── Exchange 3.exd5 — symmetric, effortless equality ──
const EXCHANGE: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Exchange 3.exd5',
  minutes: 10, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6',
      highlights: [{ square: 'd5', color: KEY }], say: "The Exchange Caro — the most harmless try. White trades on d5 and we recapture, reaching a symmetric structure: our d5-pawn mirrors White's d4. We develop naturally with …Nc6 and …Nf6. There's nothing to fear here; we just play good moves and equalise effortlessly.",
      sayShort: '…cxd5 — symmetric and solid.' }),
    b({ id: 'develop', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6 Bxd6 Qxd6',
      arrows: [{ from: 'c8', to: 'g4', color: VIS }], highlights: [{ square: 'g4', color: SOFT }],
      say: "We get our light-squared bishop out to g4 BEFORE playing …e6 — the eternal Caro priority — then meet White's queenside probe with …Qd7 and trade the dark bishops on d6. Every piece reaches a good square; nothing gets buried. Harmonious development is the whole battle here.",
      sayShort: 'Bg4 first — never bury the bishop.' }),
    b({ id: 'mg-plan', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6 Bxd6 Qxd6 O-O O-O',
      highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Both sides castle into a dead-level, symmetric middlegame. Here's the plan: contest the only open file with …Rac8, and look for the …Ne4 or …Ne7-f5 outpost to give our knight a great square. With no weaknesses and easy piece play, we hold comfortable equality and play for the long game. The Exchange Caro is a draw offer we happily decline.",
      sayShort: '…Rac8, …Ne4 — easy equality.' }),
  ],
};

// ── Panov-Botvinnik 4.c4 — the Grünfeld-style …g6 defence ──
const PANOV: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Panov-Botvinnik 4.c4',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 g6',
      arrows: [{ from: 'f8', to: 'a3', color: SOFT }], highlights: [{ square: 'g6', color: KEY }],
      say: "The Panov is White's most ambitious Caro try — c4, going for an Isolated-Queen's-Pawn attack. Our cleanest answer is the Grünfeld-style …g6, fianchettoing the bishop to point straight at White's centre. We let White have his isolated pawn and aim every piece at it.",
      sayShort: '…g6 — fianchetto against the IQP.' }),
    b({ id: 'develop', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 g6 cxd5 Nxd5 Bc4 Nb6 Bb3 Bg7 Nf3 O-O O-O Nc6',
      arrows: [{ from: 'g7', to: 'd4', color: VIS }], highlights: [{ square: 'g7', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We trade on d5, develop the fianchetto bishop to g7 — raking the long diagonal toward d4 — and castle. The bishop on g7 and the knight on c6 both pressure White's isolated d4-pawn. We're fully developed, perfectly safe, and already targeting White's one weakness.",
      sayShort: 'Bg7 + …Nc6 — gang up on d4.' }),
    b({ id: 'mg-plan', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 g6 cxd5 Nxd5 Bc4 Nb6 Bb3 Bg7 Nf3 O-O O-O Nc6 d5 Na5 Re1 Nxb3 axb3',
      highlights: [{ square: 'd5', color: KEY }, { square: 'b3', color: SOFT }],
      say: "White pushes d5 to free his bishop, but we trade it off — and after axb3 White has doubled, weak b-pawns and an advanced d5-pawn that can become a target. Here's the middlegame: blockade the d5-pawn with …Nd7-blockade or …e6, pressure the doubled b-pawns, and let our beautiful g7-bishop dominate. A balanced fight where Black has clear targets. The Panov holds no terror with the …g6 setup.",
      sayShort: 'blockade d5, target the b-pawns.' }),
  ],
};

// ── Fantasy 3.f3 — decline the pawn grab, develop solidly ──
const FANTASY: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann', title: 'Caro-Kann — Fantasy 3.f3',
  minutes: 10, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5',
      arrows: [{ from: 'e7', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "The Fantasy Variation — White props up the centre with the odd-looking f3. We trade on e4 and strike back immediately with …e5, hitting d4 and refusing to let White build a comfortable big centre. The key is to stay solid and not get greedy.",
      sayShort: '…e5 — hit back in the centre.' }),
    b({ id: 'bg4', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4',
      arrows: [{ from: 'c8', to: 'g4', color: VIS }], highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: SOFT }],
      say: "Instead of grabbing the d4-pawn — which leads to a dangerous gambit for White — we play the calm, strong …Bg4, pinning the f3-knight. We develop with pressure and keep the position simple. Declining the pawn is the mature choice: solidity over greed.",
      sayShort: 'Bg4 — decline the pawn, pin instead.' }),
    b({ id: 'mg-plan', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bd6',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd6', color: SOFT }],
      say: "We develop harmoniously — …Nd7, …Ngf6, …Bd6 — defending our e5-pawn and covering all the key squares. Here's the middlegame, and the engine calls it equal. We have a solid central pawn on e5, the bishop pin on g4, and easy development. The plan: castle, keep the centre stable, and play a calm, balanced game. By declining White's gambit pawn, we took all the danger out of the Fantasy.",
      sayShort: '…Bd6 — solid, balanced, safe.' }),
  ],
};

export const PRO_GOTHAMCHESS_CARO_KANN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-caro-kann::Classical 4...Bf5 (Main Line)': CLASSICAL_MAIN,
  'pro-gothamchess-caro-kann::Classical Capablanca 4...Bf5 5.Ng3 Bg6 6.h4': CAPABLANCA,
  'pro-gothamchess-caro-kann::Tartakower / Two Knights 3...Nf6': TARTAKOWER,
  'pro-gothamchess-caro-kann::Two Knights 2.Nc3 d5 3.Nf3 Bg4': TWO_KNIGHTS_BG4,
  'pro-gothamchess-caro-kann::Advance Variation 3.e5 Bf5': ADVANCE_BF5,
  'pro-gothamchess-caro-kann::Advance Variation 3.e5 c5': ADVANCE_C5,
  'pro-gothamchess-caro-kann::Exchange Variation 3.exd5': EXCHANGE,
  'pro-gothamchess-caro-kann::Panov-Botvinnik Attack 3.exd5 cxd5 4.c4': PANOV,
  'pro-gothamchess-caro-kann::Fantasy Variation 3.f3': FANTASY,
};
