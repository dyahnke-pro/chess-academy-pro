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
