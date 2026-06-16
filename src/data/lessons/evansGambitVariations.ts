import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
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

export const EVANS_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  "evans-gambit::Evans Gambit: Anderssen Variation": {
    openingId: 'evans-gambit', title: 'Evans Gambit — the Anderssen Accepted', minutes: 11, orientation: 'white',
    sources: ['book:evans-gambit', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
    beats: [
      b({ id: 'an1', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3', say: "The Evans Gambit — White throws the b-pawn at the bishop with b4, and after …Bxb4 plays c3. Why give up a pawn? For tempo and a centre: c3 hits the bishop AND prepares d4, so White will build a big pawn front with gain of time. This is the most romantic and dangerous gambit in the open games, and it is fully sound.", sayShort: 'c3 — gain a tempo, prepare d4.', highlights: [H('c3', SOFT)] }),
      b({ id: 'an2', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Bb6 cxd4', say: "…Ba5 retreats, and White crashes through: d4 and, after …exd4 and castling, cxd4 — White has the full classical centre on d4 and e4, the bishop pair, a big lead in development, and the king already safe. The sacrificed pawn bought all of that. Black is cramped and behind.", sayShort: 'cxd4 — the full centre, for one pawn.', highlights: [H('d4'), H('e4', SOFT)] }),
      b({ id: 'an3', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Bb6 cxd4 d6 Nc3 Nf6 e5 dxe5 dxe5', say: "Nc3 develops with tempo, and White strikes again with e5! — gaining space and hounding the f6-knight. After the exchanges White recaptures dxe5, keeping a powerful pawn on e5 and a dominant position. The engine is blunt: White is clearly better here, around plus-one. This is the Evans at its best — the pawn is a distant memory, the initiative is everything.", sayShort: 'e5, dxe5 — White is clearly better.', highlights: [H('e5')] }),
    ],
  },

  "evans-gambit::Evans Gambit: Morphy Attack": {
    openingId: 'evans-gambit', title: 'Evans Gambit — the Morphy Attack', minutes: 10, orientation: 'white',
    sources: ['book:evans-gambit', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
    beats: [
      b({ id: 'mo1', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6', say: "The same Evans bargain — b4 and c3 to grab the centre with tempo. Here Black plays the solid …d6 to brace e5 before White's avalanche. White will still get the broad centre and the lead in development that justify the pawn; the only question is how Black tries to weather the storm.", sayShort: '…d6 — Black braces; White keeps the centre.', highlights: [H('e5', SOFT)] }),
      b({ id: 'mo2', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 d5', say: "cxd4 rebuilds the centre, and d5! is the Morphy thrust — the pawn jabs forward, gaining space and kicking the c6-knight to the rim. White seizes a big spatial bind while Black's pieces are shoved backward, all powered by the gambit's head start in development.", sayShort: 'd5 — gain space, knight to the rim.', highlights: [H('d5')] }),
      b({ id: 'mo3', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 d5 Na5 Bb2 Nf6', say: "…Na5 is driven to the edge, and White completes the dream set-up with Bb2 — both bishops now rake the long diagonals, the Bc4 at f7 and the Bb2 down toward g7. There is the Morphy tabiya: full compensation for the pawn, two raking bishops, a space-gripping pawn on d5, and Black's a5-knight stranded. The engine calls it dead level, but it is White who is attacking and far easier to play.", sayShort: 'Bb2 — two raking bishops, full comp.', highlights: [H('b2'), H('a5', SOFT)] }),
    ],
  },

  "evans-gambit::Evans Gambit: Slow Variation": {
    openingId: 'evans-gambit', title: 'Evans Gambit — the Slow (Qb3) Variation', minutes: 10, orientation: 'white',
    sources: ['book:evans-gambit', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
    beats: [
      b({ id: 'sl1', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6', say: "The positional face of the Evans. After b4 …Bxb4 c3 …Ba5 d4, Black holds the centre with …d6 instead of grabbing more. White will not rush — the recommendation here is a slow squeeze: recover the initiative (and often the pawn) by piling pressure on Black's weakest point, the f7-square.", sayShort: '…d6 — Black holds; White plays the slow squeeze.', highlights: [H('d4', SOFT)] }),
      b({ id: 'sl2', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6 Qb3 Qd7 dxe5 dxe5', say: "Qb3! — the key move, building the Qb3-plus-Bc4 battery aimed straight at f7, the eternal weak point in front of Black's king. After dxe5 dxe5 the centre clears and Black is tied to defending f7, unable to develop freely. The pressure, not the pawn count, is what matters.", sayShort: 'Qb3 — the battery hammers f7.', arrows: [A('c4', 'f7', ATK)], highlights: [H('f7')] }),
      b({ id: 'sl3', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6 Qb3 Qd7 dxe5 dxe5 O-O Bb6 Rd1 Qe7', say: "White castles and swings the rook to d1, seizing the open d-file and gaining tempo on Black's queen, which is driven to the passive e7. There is the Slow Evans tabiya: White has the open d-file, the f7-pressure, the better development and the initiative — full, lasting compensation for the pawn, with an easy and pleasant game. The romantic gambit, played like a positional grandmaster.", sayShort: 'Rd1 — open file, pressure, full comp.', highlights: [H('d1')] }),
    ],
  },

  "evans-gambit::Evans Gambit Declined": {
  openingId: "evans-gambit",
  sources: ['book:evans-gambit', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  title: "Evans Gambit — Declined (...Bb6)",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "d1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6", say: "When Black declines with ...Bb6, refusing the b4-pawn, White doesn't win the big attack for free — but he doesn't lose anything either. He keeps the b4-pawn's gain of space and prepares a4, which will gain still more queenside room and start to harass the b6-bishop.", sayShort: "…Bb6 — Black declines the gambit.", highlights: [H("b6", KEY), H("b4", SOFT)] }),
    b({ id: "d2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6 Nc3 Nf6 Nd5", say: "a4 a6 Nc3 Nf6 Nd5! — White grabs space with a4 and plants the knight on the dominant d5-outpost, the central square that rules the declined lines. From d5 it hits the f6-knight and cramps Black's whole position.", sayShort: "Nd5 — the knight seizes the outpost.", arrows: [A("d5", "f6", ATK)], highlights: [H("d5", KEY)] }),
    b({ id: "d3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6 Nc3 Nf6 Nd5 Nxd5 exd5 Nd4 a5 Ba7 d6", say: "Nxd5 exd5 Nd4 a5 Ba7 d6! — White trades, gains the d5-pawn wedge, plays a5 to chase the bishop to the passive a7-square, and strikes with d6 to fracture Black's structure. The space and that awkward a7-bishop hand White a pleasant, lasting edge.", sayShort: "a5, d6 — clamp space, trap the a7-bishop.", highlights: [H("d5", KEY), H("a7", SOFT)] }),
    b({ id: "d4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6 Nc3 Nf6 Nd5 Nxd5 exd5 Nd4 a5 Ba7 d6 cxd6 c3 Nc6 O-O", say: "cxd6 c3 Nc6 O-O — White recaptures, kicks the d4-knight back with c3, and castles. The Evans Declined tabiya: White enjoys more space, the d5-pawn, and the freer game. Declining the gambit doesn't equalise — it just spares Black the worst of the direct attack.", sayShort: "O-O — more space, the freer game.", highlights: [H("d5", KEY)] }),
  ],
},

  "evans-gambit::Evans Gambit: Compromised Defence": {
  openingId: "evans-gambit",
  sources: ['book:evans-gambit', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  title: "Evans Gambit — The Compromised Defence",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "c1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3", say: "The Compromised Defence — Black greedily grabs everything with ...dxc3, snatching a second pawn. It is the most principled test of the gambit and by far the sharpest: White is now two pawns down, but he has a colossal lead in development and a wide-open position that is begging for an attack.", sayShort: "…dxc3 — Black grabs a second pawn.", highlights: [H("c3", KEY)] }),
    b({ id: "c2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3 Qb3 Qf6 e5 Qg6", say: "Qb3! Qf6 e5 Qg6 — the key. Qb3 backs the c4-bishop in a battery aimed straight at f7, forcing Black onto the defensive, and then e5 gains space with tempo, kicking the queen around. White's pieces swarm while Black's stay tangled. Two pawns mean nothing against this.", sayShort: "Qb3! e5 — the battery hits f7.", arrows: [A("c4", "f7", ATK)], highlights: [H("f7", KEY)] }),
    b({ id: "c3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3 Qb3 Qf6 e5 Qg6 Nxc3 Nge7 Ba3", say: "Nxc3 Nge7 Ba3! — White regains a pawn and swings the bishop to a3, raking the long dark diagonal and stopping Black from castling into safety. Every White piece is active and pointed at the enemy camp while Black is still desperately untangling.", sayShort: "Ba3 — rake the diagonal, stop castling.", highlights: [H("a3", KEY)] }),
    b({ id: "c4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3 Qb3 Qf6 e5 Qg6 Nxc3 Nge7 Ba3 O-O Rad1 Bb6 Rfe1 Na5", say: "O-O Rad1 Bb6 Rfe1 Na5 — both rooks swing to the central d1- and e1-files, every White piece bearing down on Black. The Compromised Defence tabiya: White is nominally down a pawn, but the overwhelming activity and central control give a powerful, lasting attack — the romantic gambit's dream scenario.", sayShort: "Rad1, Rfe1 — the rooks crash in.", highlights: [H("d1", KEY), H("e1", SOFT)] }),
  ],
},

  "evans-gambit::Evans Gambit: Lasker Defence": {
  openingId: "evans-gambit",
  sources: ['book:evans-gambit', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  title: "Evans Gambit — Lasker's Defence",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "l1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Be7", say: "Lasker's Defence — Emanuel Lasker's cool-headed antidote that took the sting out of the Evans for a century. Black takes the pawn but then retreats the bishop to e7 instead of the exposed ...Ba5, planning to give material straight back, trade pieces, and defuse the attack. The c4-bishop still eyes f7, but Black has a precise plan.", sayShort: "…Be7 — Lasker's solid retreat.", arrows: [A("c4", "f7", ATK)], highlights: [H("f7", KEY)] }),
    b({ id: "l2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Be7 d4 Na5 Be2 d6", say: "d4 Na5 Be2 d6 — White builds the centre; Black plays ...Na5 to trade off the dangerous light-squared bishop and ...d6 to blunt the pawn centre. This is Lasker's whole idea: simplify, hand back the extra material, and reach a sound, defensible position with no exposed pieces.", sayShort: "…Na5 …d6 — simplify and blunt the centre.", highlights: [H("d4", KEY)] }),
    b({ id: "l3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Be7 d4 Na5 Be2 d6 Qa4+ c6 dxe5 dxe5 Nxe5", say: "Qa4+ c6 dxe5 dxe5 Nxe5 — White wins a pawn back with the queen check and centralises the knight on e5, eyeing f7 once more. Material equality is restored and White's pieces are the more active. The famous Kasparov-Anand world-championship game of 1995 reached exactly this kind of position.", sayShort: "Nxe5 — recover the pawn, centralise.", arrows: [A("e5", "f7", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "l4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Be7 d4 Na5 Be2 d6 Qa4+ c6 dxe5 dxe5 Nxe5 Nf6 O-O Qc7 Nf3", say: "Nf6 O-O Qc7 Nf3 — White tucks the knight back and keeps a small but pleasant edge: more active pieces and easier development, even against Lasker's best defence. That is the modern verdict on the Evans — the Lasker holds objectively, but White still plays for a comfortable initiative and the e4-centre, exactly as Kasparov did against Anand.", sayShort: "Nf3 — a small, pleasant pull remains.", highlights: [H("e4", KEY)] }),
  ],
},
};
