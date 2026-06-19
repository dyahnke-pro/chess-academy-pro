import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration as SN } from '../../services/sublineLesson';

// HELPER C (oversight session took over after the KID/Grünfeld session hit an
// API error, David 2026-06-18) — King's Indian Defence deep sub-tries, OVERRIDE
// LAYER (spread after D4Flank → these deeper teach-past versions win, zero
// collision). STUDENT = BLACK. Every line board-verified vs course-sublines.json
// from a ground-truth ply-by-ply dump (G3 — no move invented, no piece claimed
// that isn't on the board). The KID bargain: Black concedes central space for a
// kingside pawn-storm in the closed lines, or counters in the centre (…e5/…c5/
// …d5) in the fianchetto and pawn-storm systems.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
const KID_WIKI = 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence';

// ── Classical Mar del Plata: White d5 closes, the wing race is on ──
// b4 (Bayonet Attack): White expands queenside; you storm the kingside faster.
const KID_BAYONET: SN = {
  intro: {
    say: "b4 is the Bayonet Attack — White grabs queenside space behind the closed d5 wedge. This is a pure wing race, and your attack at the king is the faster one. Challenge with …a5, reroute the knight to clear the f-pawn, and break with …f5 to set the kingside ablaze.",
    sayShort: '…a5, …Nd7, …f5 — race the king.',
  },
  beats: [
    { atMove: 17, say: "…a5 strikes back at the b4-pawn before White's queenside rolls — opening the a-file and gaining time to swing your forces kingside.", highlights: [H('a5', KEY), H('b4', SOFT)] },
    { atMove: 21, say: "…Nd7 clears the f-pawn's path. The knight heads for c5 or back to support …f5; the whole army now points at White's king.", highlights: [H('d7', KEY), H('f5', SOFT)] },
    { atMove: 23, say: "…f5 — the thematic break. With …f4 and …g5-g4 to come, your pawn-storm crashes into the kingside while White is still busy on the other wing.", highlights: [H('f5', ATK), H('f4', SOFT)] },
  ],
  sources: ['concept:att-kingside-storm', 'concept:pawn-chain', KID_WIKI],
};

// h3 (Makogonov-flavoured) then d5 — same wing race, …Nh5 routes to f4.
const KID_H3_MAKO: SN = {
  intro: {
    say: "h3 prepares g4 and curbs your pieces, but after …e5 d5 the centre locks and it's the familiar race. Swing the knight via …Nh5, prepare …f5, and once …f4 lands your kingside pawns roll straight at White's king.",
    sayShort: '…e5, …Nh5, …f5-f4 storm.',
  },
  beats: [
    { atMove: 11, say: "…e5 stakes your share of the centre. White closes with d5, and now both sides know where the play is: White on the queenside, you on the king.", highlights: [H('e5', KEY)] },
    { atMove: 13, say: "…Nh5 steps to the rim with purpose — it clears the f-pawn and eyes the f4 outpost the storm will hand it.", highlights: [H('h5', KEY), H('f4', SOFT)] },
    { atMove: 23, say: "…f4 clamps the kingside and fixes White's g3-pawn as a target. The pawns and pieces now avalanche toward h2 and g2.", highlights: [H('f4', ATK), H('g3', SOFT)] },
  ],
  sources: ['concept:att-kingside-storm', 'concept:pos-outpost', KID_WIKI],
};

// Gligoric (Be3) and the Nf3-first move orders — …Qe8 and the …Ng4 hit.
const KID_GLIGORIC: SN = {
  intro: {
    say: "Be3 is the Gligoric system — White supports d4 and waits. Answer with …Qe8, sidestepping any pin and readying …f5. When White releases with dxe5, …Ng4 harasses the bishop and recaptures the centre on e5, after which …f5 opens the floodgates.",
    sayShort: '…Qe8, …Ng4, …f5 break.',
  },
  beats: [
    { atMove: 13, say: "…Qe8 is the quiet key move: it unties the f6-knight from the d-file and clears d8, so …f5 can come with the queen ready to swing to g6 or h5.", highlights: [H('e8', KEY), H('f5', SOFT)] },
    { atMove: 15, say: "…Ng4 jumps in with tempo, hitting the e3-bishop and forcing it to declare itself before you reclaim e5.", arrows: [A('g4', 'e3')], highlights: [H('e3', ATK)] },
    { atMove: 21, say: "…f5 — the break arrives. Your knight sits proudly on e5, the centre is yours, and the kingside files crack open against White's king.", highlights: [H('f5', ATK), H('e5', SOFT)] },
  ],
  sources: ['concept:att-kingside-storm', 'concept:pos-center', KID_WIKI],
};

// Petrosian (d5) — White closes early; …a5 fixes the wing, then …Nh5/…f5 storm.
const KID_PETROSIAN: SN = {
  intro: {
    say: "d5 is the Petrosian idea — White slams the centre shut at once. Fix the queenside with …a5 so White can't easily expand there, then turn to your trump: …Nh5, …f5 and the kingside pawn-storm that defines the King's Indian.",
    sayShort: '…a5, …Nh5, …f5 storm.',
  },
  beats: [
    { atMove: 13, say: "…a5 grabs queenside space and gives the a-rook a job, blunting White's b4 plans before they start.", highlights: [H('a5', KEY)] },
    { atMove: 15, say: "…Nh5 clears the f-pawn and heads for f4 — the launchpad for everything that follows.", highlights: [H('h5', KEY), H('f4', SOFT)] },
    { atMove: 17, say: "…f5 lights the fuse. The recapture reopens the g-file and your bishop on c8 finally springs to life against White's king.", highlights: [H('f5', ATK)] },
  ],
  sources: ['concept:att-kingside-storm', 'concept:pawn-chain', KID_WIKI],
};

// Early Nf3/Nc3 before the full Sämisch/Classical commit — hit with …d5!
const KID_DGRUN: SN = {
  intro: {
    say: "With White's knight out before locking the centre, punch back Grünfeld-style: …d5! Strike at c4 and e4 while the centre is still fluid. After the trades you get a free-flowing, active game — …c5, …Bg4 and …Qa5 swarm White's centre and king, easily worth the loose b-pawn.",
    sayShort: '…d5! strike the fluid centre.',
  },
  beats: [
    { atMove: 7, say: "…d5 is the point: White hasn't built the big pawn centre yet, so you contest it immediately and seize active piece play.", highlights: [H('d5', ATK)] },
    { atMove: 13, say: "…c5 hammers White's d4-pawn and the doubled c3-pawn behind it — your pieces pour into the half-open files.", highlights: [H('c5', KEY), H('c3', SOFT)] },
    { atMove: 15, say: "…Bg4 pins the f3-knight to add to the pressure on d4; with …Qa5 hitting c3, White's centre is under siege for the pawn.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', KID_WIKI],
};

// Ne1 (knight reroute to d3) — same Mar del Plata race.
const KID_NE1: SN = {
  intro: {
    say: "Ne1 reroutes the knight toward d3 and c5 to support White's queenside play. You ignore it and race: …Nd7 frees the f-pawn, …a5 holds the queenside, and …f5 launches the storm that decides King's Indian middlegames.",
    sayShort: '…Nd7, …a5, …f5 race.',
  },
  beats: [
    { atMove: 17, say: "…Nd7 unblocks the f-pawn so …f5 can fire; the knight reroutes toward c5 and the kingside in one move.", highlights: [H('d7', KEY), H('f5', SOFT)] },
    { atMove: 19, say: "…a5 jams White's b4 advance and claims a5 for the rook, buying the time you need to attack.", highlights: [H('a5', KEY)] },
    { atMove: 23, say: "…f5 begins the assault. With White's knight off on the queenside, your storm reaches the king first.", highlights: [H('f5', ATK)] },
  ],
  sources: ['concept:att-kingside-storm', 'concept:pawn-chain', KID_WIKI],
};

// Sämisch (f3) — meet the broad e4/f3 wall with the Benoni …c5 + …b5 break.
const KID_SAEM_F3: SN = {
  intro: {
    say: "f3 is the Sämisch — a granite e4/f3 wall and ideas of Be3, Qd2 and a kingside pawn-storm of White's own. Hit the centre before it's finished: …c5 turns the game Benoni, …h5 freezes White's g4, and …b5 rips open the queenside where your play flows.",
    sayShort: '…c5, …h5, …b5 — Benoni counter.',
  },
  beats: [
    { atMove: 7, say: "…c5 challenges d4 at once; after d5 the structure is a Benoni where Black's queenside play is fast and natural.", highlights: [H('c5', KEY)] },
    { atMove: 15, say: "…h5 is prophylaxis — it stops White's g4 in its tracks, so the Sämisch attack never gets going.", highlights: [H('h5', SOFT)] },
    { atMove: 23, say: "…b5 is the break. The queenside cracks open exactly where your rooks and the g7-bishop's diagonal are aimed.", highlights: [H('b5', ATK)] },
  ],
  sources: ['concept:pos-prophylaxis', 'concept:att-queenside-attack', KID_WIKI],
};

// Four Pawns Attack (f4) — undermine the over-extended centre with …c5 + …e6.
const KID_4PAWNS: SN = {
  intro: {
    say: "f4 is the Four Pawns Attack — the broadest centre White can build, and the most brittle. Don't be impressed: …c5 and …e6 strike at the base, the d5/e4/f4 chain over-extends, and tactics like …Ng4 hit the e5-spearhead as the whole front collapses.",
    sayShort: '…c5, …e6 — crack the centre.',
  },
  beats: [
    { atMove: 11, say: "…c5 challenges d4 immediately. White must push d5, committing the centre and giving you a clear target to chisel at.", highlights: [H('c5', KEY)] },
    { atMove: 13, say: "…e6 undermines the d5-pawn at its base — the standard Benoni lever that pries the over-extended chain apart.", highlights: [H('e6', KEY), H('d5', SOFT)] },
    { atMove: 21, say: "…Ng4 lunges at the e5-spearhead; White's grand centre is now a row of weaknesses you'll pick off.", highlights: [H('g4', ATK), H('e5', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-backward', KID_WIKI],
};

// Averbakh-flavoured Bd3 — trade off White's good bishop and grab the pair.
const KID_AVERBAKH_BD3: SN = {
  intro: {
    say: "Bd3 places the bishop actively but on the wrong square — it can be challenged. Route the knight …Nc6-e5 to hit it; trading …Nxd3 hands you the two bishops, and …e6 breaks the centre for a sound, pleasant game.",
    sayShort: '…Nc6-e5, …Nxd3, win the pair.',
  },
  beats: [
    { atMove: 11, say: "…Nc6 heads for e5, the perfect square to confront the d3-bishop and pressure White's centre.", highlights: [H('c6', KEY), H('e5', SOFT)] },
    { atMove: 15, say: "…Nxd3 swaps off White's best minor piece and leaves you with the bishop pair — a lasting positional plus.", highlights: [H('d3', ATK)] },
    { atMove: 17, say: "…e6 strikes at d5; opening the centre suits the side with two bishops, and that side is you.", highlights: [H('e6', KEY)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', KID_WIKI],
};

// Sämisch with Bg5 — …c5 Benoni, …Qa5 pressure on c3, …b5 break.
const KID_SAEM_BG5: SN = {
  intro: {
    say: "Bg5 in the Sämisch pins toward your queen, but it does nothing to stop your plan. Play …c5 for the Benoni, drop the queen to a5 to lean on the c3-knight and the pin, and break with …b5 to blow open the queenside.",
    sayShort: '…c5, …Qa5, …b5 break.',
  },
  beats: [
    { atMove: 13, say: "…c5 turns it Benoni; after d5 your queenside play and the g7-bishop's diagonal are the long-term trumps.", highlights: [H('c5', KEY)] },
    { atMove: 15, say: "…Qa5 pressures the c3-knight and pins it against ideas on the a5-e1 diagonal, tying White down.", highlights: [H('a5', KEY), H('c3', SOFT)] },
    { atMove: 19, say: "…b5 is the break. The queenside tears open right where your heavy pieces and bishop are pointed.", highlights: [H('b5', ATK)] },
  ],
  sources: ['concept:att-queenside-attack', 'concept:tac-pin', KID_WIKI],
};

// Four Pawns e5 push — trade queens and chip at the overextended pawns.
const KID_4P_E5: SN = {
  intro: {
    say: "e5 is the most ambitious Four Pawns try, but it over-reaches. Take with …dxe5 and trade queens on d1 — without queens, White's sprawling pawns are just weaknesses. …Ne8 and …f6 chip them away and you emerge comfortably.",
    sayShort: '…dxe5, …Qxd1, …f6 undermine.',
  },
  beats: [
    { atMove: 11, say: "…dxe5 opens the position against the over-extended centre at the perfect moment.", highlights: [H('e5', KEY)] },
    { atMove: 13, say: "…Qxd1 trades queens — the simplest refutation of an attacking pawn-push is to remove the attacker's best piece.", highlights: [H('d1', ATK)] },
    { atMove: 17, say: "…f6 undermines the e5-pawn; White's centre dissolves and your pieces flood the freed squares.", highlights: [H('f6', KEY), H('e5', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-backward', KID_WIKI],
};

// Four Pawns + h3 — …Nh5 hits f4, …Ng3 exploits the loosened kingside.
const KID_4P_H3: SN = {
  intro: {
    say: "h3 in the Four Pawns props up g4 but loosens the kingside. Pounce: …Nh5 hits the f4-pawn, …Ng3 forks into the corner exploiting the holes h3 created, and …Qa5 piles onto the c3-pawn once you've doubled it. Black seizes the initiative.",
    sayShort: '…Nh5, …Ng3, …Qa5 initiative.',
  },
  beats: [
    { atMove: 11, say: "…Nh5 attacks the f4-pawn and dares White to weaken further — h3 already cost the g3-square.", highlights: [H('h5', KEY), H('f4', SOFT)] },
    { atMove: 15, say: "…Ng3 leaps into the hole h3 left, forking the rook and forcing White into an awkward Rg1.", highlights: [H('g3', ATK)] },
    { atMove: 19, say: "…Qa5 hits the c3-pawn you just doubled by trading on c3 — White's queenside is the new battleground and you're ahead in it.", highlights: [H('a5', KEY), H('c3', SOFT)] },
  ],
  sources: ['concept:pos-initiative', 'concept:tac-fork', KID_WIKI],
};

// Four Pawns Bd3 — central counterplay with …Nc6, …Bg4, …e5.
const KID_4P_BD3: SN = {
  intro: {
    say: "Bd3 in the Four Pawns develops, but it lets you hit back in the centre. …Nc6 leans on d4, …Bg4 pins the f3-knight, and …e5 breaks open the position where White's king still sits — full central counterplay.",
    sayShort: '…Nc6, …Bg4, …e5 counter.',
  },
  beats: [
    { atMove: 11, say: "…Nc6 pressures the d4-pawn, the keystone of White's broad centre.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 13, say: "…Bg4 pins the f3-knight, piling a second attacker onto d4 and tying White's defence in knots.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
    { atMove: 15, say: "…e5 breaks in the centre; the position cracks open with White's king still uncastled or freshly exposed.", highlights: [H('e5', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:tac-pin', KID_WIKI],
};

// Four Pawns deep e6 push — blunt it with …fxe6, consolidate, counterattack.
const KID_4P_E6: SN = {
  intro: {
    say: "e6 is White's deepest Four Pawns lunge, sacrificing the pawn to disrupt you. Take it cleanly with …fxe6 — the pawn is gone and so is White's attack. …Bd7 develops behind it and …Qb6 turns the tables, hitting b2 and d4.",
    sayShort: '…fxe6, …Bd7, …Qb6 counter.',
  },
  beats: [
    { atMove: 23, say: "…fxe6 swallows the lunging pawn and opens the f-file for your rook — the disruption fizzles.", highlights: [H('e6', KEY)] },
    { atMove: 25, say: "…Bd7 calmly develops, defending and preparing to contest the centre; greed punished, you simply consolidate the extra pawn.", highlights: [H('d7', KEY)] },
    { atMove: 27, say: "…Qb6 swings to the attack, eyeing b2 and the d4-square — Black is a pawn up and now the aggressor.", highlights: [H('b6', ATK), H('d4', SOFT)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-center', KID_WIKI],
};

// ── Fianchetto KID (g3) — central counter with …d5 or …e5/…c5 ──
// Nc3 after g3, before …d6 — strike with …d5 Grünfeld-style.
const KID_FIANCH_NC3_8: SN = {
  intro: {
    say: "In the Fianchetto with White's bishop heading to g2, …d5 is the principled counter. Contest the centre before White clamps it; after the trades …c5 and …Bf5 give you fast, active pieces and pressure that's well worth a sacrificed pawn.",
    sayShort: '…d5, …c5, …Bf5 activity.',
  },
  beats: [
    { atMove: 9, say: "…d5 challenges c4 and the centre head-on, the most ambitious answer to White's slow fianchetto setup.", highlights: [H('d5', ATK)] },
    { atMove: 13, say: "…c5 strikes at d4; the centre opens and your pieces find open lines faster than White's.", highlights: [H('c5', KEY)] },
    { atMove: 19, say: "…Bf5 develops with tempo and, with …Rab8 to follow, gives you raking activity for the pawn.", highlights: [H('f5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', KID_WIKI],
};

// Fianchetto, …d6/…c5 Yugoslav — …b5 queenside break.
const KID_FIANCH_NC3_10: SN = {
  intro: {
    say: "Against the Fianchetto you can also play the Yugoslav with …c5. White closes with d5, and then …a6 and …b5 prise open the queenside — your knights swing to e5 and the g7-bishop rakes the long diagonal.",
    sayShort: '…c5, …b5, …Nge5 play.',
  },
  beats: [
    { atMove: 11, say: "…c5 stakes a claim in the centre; if White closes with d5 you have the queenside break …b5 in reserve.", highlights: [H('c5', KEY)] },
    { atMove: 15, say: "…b5 cracks the queenside open, the thematic Yugoslav lever where your rooks belong.", highlights: [H('b5', ATK)] },
    { atMove: 23, say: "…Nge5 centralises a knight on its dream square, dominating the board from e5.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:att-queenside-attack', 'concept:pos-outpost', KID_WIKI],
};

// Fianchetto classical, …Nbd7/…e5 then h3 — …exd4 and …Nc5 central operation.
const KID_FIANCH_H3_14: SN = {
  intro: {
    say: "h3 is a useful waiting move, but it doesn't change your plan in the Fianchetto: …e5 stakes the centre, …exd4 opens it on your terms, and …Nc5 lands on a fine square hitting e4 — classic, harmonious King's Indian piece play.",
    sayShort: '…e5, …exd4, …Nc5 hits e4.',
  },
  beats: [
    { atMove: 15, say: "…Re8 backs up the …e5-point and prepares to meet the central tension along the e-file.", highlights: [H('e8', KEY), H('e5', SOFT)] },
    { atMove: 17, say: "…exd4 releases the tension just as White can't easily avoid trading — the centre opens for your pieces.", highlights: [H('d4', KEY)] },
    { atMove: 19, say: "…Nc5 swings to a dominant square, eyeing e4 and b3 and harassing White's centre.", highlights: [H('c5', ATK), H('e4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', KID_WIKI],
};

// Fianchetto, Qc2 — …e5/…exd4, …c6 + …Re8 pressure on e4.
const KID_FIANCH_QC2: SN = {
  intro: {
    say: "Qc2 supports e4 and eyes the queenside, but your central counterplay rolls on: …e5, …Qe7 to back the break, …exd4 to open the centre, and …c6 with …Re8 to pile onto the e4-pawn. A balanced, active Fianchetto middlegame.",
    sayShort: '…e5, …exd4, …c6, …Re8.',
  },
  beats: [
    { atMove: 13, say: "…e5 claims central space, the heart of every King's Indian plan.", highlights: [H('e5', KEY)] },
    { atMove: 15, say: "…Qe7 supports the …e5/…exd4 operation and connects the rooks to the centre.", highlights: [H('e7', KEY)] },
    { atMove: 17, say: "…exd4 opens the centre; …c6 and …Re8 will train your fire on the e4-pawn.", highlights: [H('d4', ATK), H('e4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', KID_WIKI],
};

// Modest e3 setup — …c5 strike, …Bg4 pin, …Nb4 hits the weak squares.
const KID_E3: SN = {
  intro: {
    say: "e3 is a quiet, modest setup — solid but unambitious, and it cedes you the centre. Strike with …c5, develop …Bg4 to pin the f3-knight, and jump …Nb4 toward c2 and d3; against passive play, active pieces give Black the better game.",
    sayShort: '…c5, …Bg4, …Nb4 active.',
  },
  beats: [
    { atMove: 9, say: "…c5 challenges d4 immediately; with White set up so quietly, you fight for the centre on equal-or-better terms.", highlights: [H('c5', KEY)] },
    { atMove: 17, say: "…Bg4 pins the f3-knight, increasing the pressure on White's centre and king's defender.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
    { atMove: 23, say: "…Nb4 eyes the c2- and d3-squares; the knight is a thorn White's passive setup struggles to dislodge.", highlights: [H('b4', ATK), H('c2', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:tac-pin', KID_WIKI],
};

// Fianchetto, …c6/…e5 with b3 — …exd4 central break at the right moment.
const KID_FIANCH_B3: SN = {
  intro: {
    say: "b3 supports a fianchetto-versus-fianchetto battle, but your central plan is unchanged: build with …e5 and …c6, expand with …a5 on the queenside, and uncork …exd4 when it opens the position in your favour.",
    sayShort: '…e5, …c6, …a5, …exd4.',
  },
  beats: [
    { atMove: 17, say: "…Re8 reinforces the …e5-point and readies the centre for action.", highlights: [H('e8', KEY), H('e5', SOFT)] },
    { atMove: 21, say: "…a5 gains queenside space and a foothold, restraining White's b3-b4.", highlights: [H('a5', KEY)] },
    { atMove: 23, say: "…exd4 breaks the centre open at the moment it most helps your pieces.", highlights: [H('d4', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', KID_WIKI],
};

// Classical, White O-O — the …exd4 (Smyslov) system, …Bb7 long diagonal.
const KID_CLASS_OO: SN = {
  intro: {
    say: "When White castles in the Classical, the clean equaliser is …exd4 — release the central tension, trade knights on d4, and develop the queen's bishop to b7 on the long diagonal. From there you press e4 and c4 with easy, harmonious play.",
    sayShort: '…exd4, …Nc6, …b6-…Bb7.',
  },
  beats: [
    { atMove: 13, say: "…exd4 releases the tension into a clean structure where your pieces flow toward White's centre.", highlights: [H('d4', KEY)] },
    { atMove: 17, say: "…Nc6 challenges the d4-knight, inviting trades that leave you comfortably placed.", highlights: [H('c6', KEY)] },
    { atMove: 23, say: "…Bb7 takes the long diagonal, training on e4 and the heart of White's centre.", arrows: [A('b7', 'e4')], highlights: [H('e4', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-open-file', KID_WIKI],
};

// Gligoric reached via Nf3 first (shifted indices) — same …Qe8/…Ng4/…f5 plan.
const KID_GLIGORIC_NF3: SN = {
  intro: {
    say: "Nf3 then Be3 reaches the Gligoric by transposition. Your recipe is unchanged: …e5 for the centre, …Qe8 to ready …f5, …Ng4 to harass the bishop and reclaim e5, then …f5 to throw the kingside open against White's king.",
    sayShort: '…e5, …Qe8, …Ng4, …f5.',
  },
  beats: [
    { atMove: 11, say: "…e5 stakes the centre, the foundation of the coming kingside attack.", highlights: [H('e5', KEY)] },
    { atMove: 13, say: "…Qe8 clears the d-file pin and prepares …f5 with the queen ready to swing to the kingside.", highlights: [H('e8', KEY), H('f5', SOFT)] },
    { atMove: 15, say: "…Ng4 hits the e3-bishop with tempo before recapturing on e5 — the centre and the initiative are yours.", arrows: [A('g4', 'e3')], highlights: [H('e3', ATK)] },
  ],
  sources: ['concept:att-kingside-storm', 'concept:pos-center', KID_WIKI],
};

// Be3 then d5 (var6) — …c5, …e6 central break, …Bf5-e4 strong bishop.
const KID_BE3_10: SN = {
  intro: {
    say: "Be3 followed by d5 closes the centre, so open a second front and trade off the bad bishop: …c5 fixes the structure, …e6 breaks at d5, and the freed light-squared bishop swings to f5 and e4 to dominate the light squares.",
    sayShort: '…c5, …e6, …Bf5-e4.',
  },
  beats: [
    { atMove: 11, say: "…c5 challenges the centre; after d5 you have the Benoni-style break …e6 in hand.", highlights: [H('c5', KEY)] },
    { atMove: 19, say: "…exd5 (after …e6) breaks the chain and frees your light-squared bishop, your worst piece in the locked centre.", highlights: [H('d5', KEY)] },
    { atMove: 23, say: "…Be4 plants the bishop in the centre of the board, a magnificent outpost commanding the light squares.", highlights: [H('e4', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', KID_WIKI],
};

// Makogonov dxe5 exchange — free piece play, …Qd6, …Nc6, …Be6.
const KID_MAKO_DXE5: SN = {
  intro: {
    say: "After h3, White's dxe5 exchange relieves the tension but hands you easy development. Recapture …dxe5, post the queen actively with …Qd6, expand with …c5, and develop …Nc6 and …Be6 — a comfortable, well-coordinated game with no weaknesses.",
    sayShort: '…dxe5, …Qd6, …Nc6, …Be6.',
  },
  beats: [
    { atMove: 13, say: "…dxe5 recaptures and opens the d-file; the symmetrical centre gives you free, harmonious development.", highlights: [H('e5', KEY)] },
    { atMove: 15, say: "…Qd6 centralises the queen actively, controlling key squares and supporting a later …c5.", highlights: [H('d6', KEY)] },
    { atMove: 23, say: "…Be6 completes development; every piece is in play and the position is dead level with chances for both.", highlights: [H('e6', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-open-file', KID_WIKI],
};

// Makogonov Be3 — …exd4, …Nc6, …Bxc3 saddling White with doubled pawns.
const KID_MAKO_BE3: SN = {
  intro: {
    say: "h3 then Be3 is a solid Makogonov try. Release the centre with …exd4, pressure d4 with …Nc6, and at the right moment …Bxc3 doubles White's pawns — you give up the fianchetto bishop for a concrete, lasting structural plus.",
    sayShort: '…exd4, …Nc6, …Bxc3 doubles pawns.',
  },
  beats: [
    { atMove: 13, say: "…exd4 opens the centre and removes White's space advantage cleanly.", highlights: [H('d4', KEY)] },
    { atMove: 15, say: "…Nc6 attacks the d4-knight, forcing concessions in White's centre.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 19, say: "…Bxc3 trades the bishop to inflict doubled, weak c-pawns — a permanent target you'll work against all game.", highlights: [H('c3', ATK)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-center', KID_WIKI],
};

// Makogonov Be2 — …exd4 then the …d5 freeing break equalises fully.
const KID_MAKO_BE2: SN = {
  intro: {
    say: "h3 with the modest Be2 is harmless. Release with …exd4, complete development with …Re8, and strike …d5 — the freeing break that solves all of Black's problems. Simplify into a balanced, comfortable ending.",
    sayShort: '…exd4, …Re8, …d5 frees Black.',
  },
  beats: [
    { atMove: 13, say: "…exd4 releases the central tension into an easy, equal structure.", highlights: [H('d4', KEY)] },
    { atMove: 17, say: "…d5 is the thematic freeing break; it strikes the centre and untangles your position completely.", highlights: [H('d5', ATK)] },
    { atMove: 21, say: "…Nxc3 simplifies into a level endgame where both sides' chances are balanced.", highlights: [H('c3', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', KID_WIKI],
};

export const SUBLINE_NARRATION_HELP_C: Record<string, SN> = {
  // King's Indian Defence — student BLACK, 27 dead-end lines / 46 keys
  'kings-indian-defence::0::b4@16': KID_BAYONET,
  'kings-indian-defence::0::h3@10': KID_H3_MAKO, 'kings-indian-defence::1::h3@10': KID_H3_MAKO, 'kings-indian-defence::5::h3@10': KID_H3_MAKO,
  'kings-indian-defence::0::Be3@12': KID_GLIGORIC, 'kings-indian-defence::1::Be3@12': KID_GLIGORIC, 'kings-indian-defence::2::Nf3@8': KID_GLIGORIC, 'kings-indian-defence::3::Nf3@8': KID_GLIGORIC, 'kings-indian-defence::5::Be3@12': KID_GLIGORIC, 'kings-indian-defence::6::Nf3@8': KID_GLIGORIC, 'kings-indian-defence::7::Be2@10': KID_GLIGORIC,
  'kings-indian-defence::0::d5@12': KID_PETROSIAN, 'kings-indian-defence::1::d5@12': KID_PETROSIAN,
  'kings-indian-defence::0::Nf3@6': KID_DGRUN, 'kings-indian-defence::1::Nf3@6': KID_DGRUN, 'kings-indian-defence::2::Nf3@6': KID_DGRUN, 'kings-indian-defence::5::Nf3@6': KID_DGRUN, 'kings-indian-defence::6::Nf3@6': KID_DGRUN, 'kings-indian-defence::7::Nf3@6': KID_DGRUN, 'kings-indian-defence::4::Nc3@6': KID_DGRUN,
  'kings-indian-defence::1::Ne1@16': KID_NE1,
  'kings-indian-defence::2::f3@4': KID_SAEM_F3, 'kings-indian-defence::4::f3@4': KID_SAEM_F3, 'kings-indian-defence::5::f3@4': KID_SAEM_F3, 'kings-indian-defence::6::f3@4': KID_SAEM_F3,
  'kings-indian-defence::2::f4@8': KID_4PAWNS, 'kings-indian-defence::3::Be2@10': KID_4PAWNS, 'kings-indian-defence::6::f4@8': KID_4PAWNS,
  'kings-indian-defence::2::Bd3@8': KID_AVERBAKH_BD3,
  'kings-indian-defence::2::Bg5@10': KID_SAEM_BG5,
  'kings-indian-defence::3::e5@10': KID_4P_E5,
  'kings-indian-defence::3::h3@10': KID_4P_H3,
  'kings-indian-defence::3::Bd3@10': KID_4P_BD3,
  'kings-indian-defence::3::e6@22': KID_4P_E6,
  'kings-indian-defence::4::Nc3@8': KID_FIANCH_NC3_8,
  'kings-indian-defence::4::Nc3@10': KID_FIANCH_NC3_10,
  'kings-indian-defence::4::h3@14': KID_FIANCH_H3_14,
  'kings-indian-defence::4::Qc2@12': KID_FIANCH_QC2,
  'kings-indian-defence::4::e3@6': KID_E3,
  'kings-indian-defence::4::b3@16': KID_FIANCH_B3,
  'kings-indian-defence::5::O-O@12': KID_CLASS_OO,
  'kings-indian-defence::6::Nf3@10': KID_GLIGORIC_NF3,
  'kings-indian-defence::6::Be3@10': KID_BE3_10,
  'kings-indian-defence::7::dxe5@12': KID_MAKO_DXE5,
  'kings-indian-defence::7::Be3@12': KID_MAKO_BE3,
  'kings-indian-defence::7::Be2@12': KID_MAKO_BE2,
};
