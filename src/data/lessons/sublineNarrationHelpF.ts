import type { AnnotationHighlight } from '../../types';
import type { SublineNarration as SN } from '../../services/sublineLesson';

// HELPER F (oversight session finishing the subline tail after the parallel
// sessions stopped, David 2026-06-18/19) — the remaining gambit, anti-gambit and
// classical-defence sub-tries. OVERRIDE LAYER (spread after D4Flank → deeper
// teach-past versions win). Every line board-verified vs course-sublines.json
// from a ground-truth ply dump, and every terminus engine-checked from the
// STUDENT's perspective (G3 + soundness). Honest framing: gambit-trap lines where
// the opponent erred get the punishment; the gambiteer's own lines are framed as
// active compensation with the BEST moves shown (David: gambits lose material, so
// the user needs the best continuations), never a false claim of advantage.
// Beats lead the eye with highlights; the converter auto-paints each move-arrow.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const ALBIN_WIKI = 'https://en.wikipedia.org/wiki/Albin_Countergambit';
const ENGLUND_WIKI = 'https://en.wikipedia.org/wiki/Englund_Gambit';
const STAFFORD_WIKI = 'https://en.wikipedia.org/wiki/Petroff_Defence';
const SCANDI_WIKI = 'https://en.wikipedia.org/wiki/Scandinavian_Defense';
const PIRC_WIKI = 'https://en.wikipedia.org/wiki/Pirc_Defence';
const FRENCH_WIKI = 'https://en.wikipedia.org/wiki/French_Defence';
const NIMZO_WIKI = 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence';
const QGD_WIKI = 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined';
const SLAV_WIKI = 'https://en.wikipedia.org/wiki/Slav_Defense';
const DUTCH_WIKI = 'https://en.wikipedia.org/wiki/Dutch_Defence';
const GRUN_WIKI = 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence';
const QID_WIKI = 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense';
const KID_WIKI = 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence';

// ════ ALBIN COUNTERGAMBIT — student BLACK (the gambiteer) ═══════════════════
// The soul of the Albin is the …d4 wedge pawn: a thorn deep in White's camp that
// cramps his pieces and screens your development. You play around it, regain e5,
// and pounce on greedy or careless tries with the famous Lasker-Trap tactics.
const ALB_A3: SN = {
  intro: {
    say: "With a3 and b4 White grabs queenside space, but your …d4 wedge is the boss of the board. Develop the knights to e7 and g6 to round up the e5-pawn; you regain the material with active, harmonious pieces and full compensation.",
    sayShort: '…Nge7-g6 regains e5.',
  },
  beats: [
    { atMove: 9, say: "…Nge7 heads for g6 — the ideal route to recover the e5-pawn while your d4-wedge keeps White cramped.", highlights: [H('e7', KEY), H('g6', SOFT)] },
    { atMove: 15, say: "…Ncxe5 recovers the gambit pawn; the dust settles with active pieces and an equal, lively game.", highlights: [H('e5', ATK), H('d4', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', ALBIN_WIKI],
};
const ALB_NBD2: SN = {
  intro: {
    say: "Nbd2 develops quietly, so build your bind: …a5 to fix the queenside, …Nge7-g6 to pressure e5, and push the wedge to …d3, jamming a pawn into White's position. Black keeps lasting, active compensation for the pawn.",
    sayShort: '…a5, …Ng6, …d3 wedge.',
  },
  beats: [
    { atMove: 11, say: "…Nge7 routes the knight to g6, eyeing the e5-pawn and the f4-square.", highlights: [H('g6', SOFT)] },
    { atMove: 15, say: "…d3 rams the wedge deeper, splitting White's position and cramping his pieces for the whole game.", highlights: [H('d3', ATK)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', ALBIN_WIKI],
};
const ALB_E3: SN = {
  intro: {
    say: "e3 declines the gambit's spirit and just trades in the centre. Take with …exd4, check with …Bb4+, and complete development; the symmetrical position is comfortably equal and you've solved all your problems.",
    sayShort: '…exd4, …Bb4+ equalise.',
  },
  beats: [
    { atMove: 5, say: "…exd4 recaptures, dissolving the gambit into an equal, open game.", highlights: [H('d4', KEY)] },
    { atMove: 7, say: "…Bb4+ develops with check, gaining time before castling to safety.", highlights: [H('b4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', ALBIN_WIKI],
};
const ALB_QA4: SN = {
  intro: {
    say: "Qa4+ tries to win the loose e3-pawn, but it walks into your attack: …Nc6 blocks, …Qh4 swings the queen to the kingside, and …exf2+ rips open White's king. Black gets a raging initiative worth far more than the pawn.",
    sayShort: '…Nc6, …Qh4, …exf2+ attack.',
  },
  beats: [
    { atMove: 11, say: "…Nc6 blocks the check and develops — the queen on a4 is now offside while you attack.", highlights: [H('c6', KEY)] },
    { atMove: 13, say: "…Qh4 swings to the kingside, threatening …exf2+ and a direct assault on the exposed king.", highlights: [H('h4', ATK)] },
    { atMove: 15, say: "…exf2+ tears open the king; White's monarch is hunted while his queen sits useless on the rim.", highlights: [H('f2', ATK)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-king-safety', ALBIN_WIKI],
};
const ALB_ND2: SN = {
  intro: {
    say: "Nd2 lets you launch the queen raid: …dxe3 fxe3 …Qh4+! drags the king around, and …Qe4 then …Qxh1 snatches the rook in the corner. The Albin's tactical venom in full flow.",
    sayShort: '…Qh4+, …Qe4, …Qxh1.',
  },
  beats: [
    { atMove: 11, say: "…Qh4+ checks and seizes the initiative, forcing White's kingside to weaken with g3.", highlights: [H('h4', ATK)] },
    { atMove: 21, say: "…Qxh1 grabs the rook in the corner — the raid nets material in classic Albin style.", highlights: [H('h1', ATK)] },
  ],
  sources: ['concept:tac-trap', 'concept:pos-initiative', ALBIN_WIKI],
};
const ALB_LASKER: SN = {
  intro: {
    say: "This is the famous Lasker Trap! After …Bb4+ Bd2 dxe3, if White greedily grabs with Bxb4, then …exf2+ wins — because Kxf2 leaves the d1-queen undefended, and …Qxd1 simply takes it. A picture-perfect Albin punishment.",
    sayShort: '…exf2+, …Qxd1 wins the queen.',
  },
  beats: [
    { atMove: 11, say: "…exf2+ is the trap's hinge: the pawn checks, and whatever White does, the d1-queen falls.", highlights: [H('f2', ATK)] },
    { atMove: 13, say: "…Qxd1 collects the queen — Bxb4 fatally abandoned its defence. The Lasker Trap delivers.", highlights: [H('d1', ATK)] },
  ],
  sources: ['concept:mate-legal', 'concept:tac-trap', ALBIN_WIKI],
};
const ALB_KE2: SN = {
  intro: {
    say: "Ke2 is an ugly way to cling to the pawn, forfeiting castling. Punish the exposed king: …Be6 and …c5 buttress the d4-wedge, …Bg4 pins, and your superior development gives Black the clearly better game.",
    sayShort: '…Be6, …c5, …Bg4 vs the king.',
  },
  beats: [
    { atMove: 9, say: "…Be6 develops and supports the d4-wedge while White's king languishes on e2.", highlights: [H('e6', KEY), H('d4', SOFT)] },
    { atMove: 17, say: "…Bg4 pins toward the awkward king, piling pressure on White's tangled position.", highlights: [H('g4', ATK)] },
  ],
  sources: ['concept:pos-king-safety', 'concept:pos-development', ALBIN_WIKI],
};
const ALB_A3_6: SN = {
  intro: {
    say: "An early a3 keeps things calm. Develop solidly: …Nc6 and …g6 with …Be7, then …f6 to challenge the e5-pawn. Black regains the material and reaches a sound, near-equal game with the d4-wedge still cramping White.",
    sayShort: '…Nc6, …g6, …f6.',
  },
  beats: [
    { atMove: 7, say: "…Nc6 develops, pressuring the e5-pawn and supporting the d4-wedge.", highlights: [H('c6', KEY)] },
    { atMove: 13, say: "…f6 challenges the e5-pawn directly, opening lines to recover the material.", highlights: [H('f6', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', ALBIN_WIKI],
};
const ALB_E4: SN = {
  intro: {
    say: "e4 over-extends to defend e5, handing you a second wedge target. Develop …Nc6 and …Nge7, push …d3 to jam White's position, and round up the centre; Black's active pieces give full compensation and more.",
    sayShort: '…Nc6, …Nge7, …d3 wedge.',
  },
  beats: [
    { atMove: 7, say: "…Nc6 develops with pressure on the e5-pawn that White's e4 now over-stretches.", highlights: [H('c6', KEY)] },
    { atMove: 11, say: "…d3 jams the wedge deep into White's camp, cramping his development.", highlights: [H('d3', ATK)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', ALBIN_WIKI],
};
const ALB_NF3_8: SN = {
  intro: {
    say: "With e4 and Nf3 White props up the centre, so manoeuvre to undermine it: …Nge7-g6 attacks e5, and …Ngxe5 then …Nxf3+ regains the pawn while exchanging into a balanced, comfortable position.",
    sayShort: '…Ng6, …Ngxe5 regain.',
  },
  beats: [
    { atMove: 11, say: "…Ng6 zeroes in on the e5-pawn, preparing to recover the gambit material.", highlights: [H('g6', SOFT), H('e5', KEY)] },
    { atMove: 21, say: "…Ngxe5 recaptures the pawn; the simplifications leave a sound, equal game.", highlights: [H('e5', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', ALBIN_WIKI],
};
const ALB_E5_12: SN = {
  intro: {
    say: "After f4 and f6, White's e5 push backfires badly. …Bb4+ develops with check, …Ng4 leaps in, and …Ne3! forks the queen and rook — Black wins material and emerges clearly on top.",
    sayShort: '…Bb4+, …Ng4, …Ne3 fork.',
  },
  beats: [
    { atMove: 13, say: "…Bb4+ checks and develops, dragging White's pieces into a tangle.", highlights: [H('b4', KEY)] },
    { atMove: 17, say: "…Ne3 forks the queen and the f1-rook — a decisive tactical strike. White is busted.", highlights: [H('e3', ATK)] },
  ],
  sources: ['concept:tac-fork', 'concept:pos-initiative', ALBIN_WIKI],
};
const ALB_BF4_8: SN = {
  intro: {
    say: "Bf4 develops naturally to guard e5. Reply in kind: …Nge7-g6 challenges the bishop and the pawn, …Bc5 and …h5 gain kingside space, and Black regains material with a comfortable, balanced position.",
    sayShort: '…Ng6, …Bc5, …h5.',
  },
  beats: [
    { atMove: 9, say: "…Nge7 routes toward g6, hitting both the f4-bishop and the e5-pawn.", highlights: [H('g6', SOFT)] },
    { atMove: 15, say: "…Bc5 develops actively, eyeing f2 and supporting the d4-wedge.", highlights: [H('c5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-space', ALBIN_WIKI],
};
const ALB_NF3_10: SN = {
  intro: {
    say: "With f4 and Nf3 White over-defends e5, so blow it open: …fxe5 and after f5, …Bxf5 then …e4 sends a pawn avalanche forward. Black's central pawns and active pieces seize the initiative.",
    sayShort: '…fxe5, …e4 pawn storm.',
  },
  beats: [
    { atMove: 11, say: "…fxe5 strikes the centre open, freeing your pieces and pawns to advance.", highlights: [H('e5', KEY)] },
    { atMove: 15, say: "…e4 rolls the central pawns forward, cramping White and gaining a powerful initiative.", highlights: [H('e4', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', ALBIN_WIKI],
};
const ALB_BD3_8: SN = {
  intro: {
    say: "Bd3 leaves e5 underdefended — so take it: …Nxe5! wins the pawn back at once, …Bb4+ develops with check, and …d3 plants the wedge. Black is comfortably better with the extra central presence.",
    sayShort: '…Nxe5! regains, …d3 wedge.',
  },
  beats: [
    { atMove: 9, say: "…Nxe5 recovers the gambit pawn immediately — Bd3 failed to hold it.", highlights: [H('e5', ATK)] },
    { atMove: 15, say: "…d3 wedges deep into White's position, cramping him for the long haul.", highlights: [H('d3', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', ALBIN_WIKI],
};
const ALB_E6_10: SN = {
  intro: {
    say: "White's e6 break tries to disrupt you, but …Bxe6 just develops a piece for free. Castle long with …O-O-O, and your superior development and the d4-wedge leave Black firmly in command.",
    sayShort: '…Bxe6, …O-O-O, dominate.',
  },
  beats: [
    { atMove: 11, say: "…Bxe6 captures the lunging pawn and develops the bishop to a fine diagonal.", highlights: [H('e6', KEY)] },
    { atMove: 15, say: "…O-O-O castles into the attack, throwing the rook onto the open file behind the wedge.", highlights: [H('c8', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', ALBIN_WIKI],
};

// ════ ENGLUND GAMBIT — student BLACK (the gambiteer) ════════════════════════
// The Englund is a surprise weapon built around the …Qe7/…Qb4+ trick. Against
// natural greed it bites hard; these are the lines where White stumbles into the
// trap and Black wins material outright.
const ENG_NC3: SN = {
  intro: {
    say: "After …Qb4+, the natural-looking Nc3 walks into the trap: …Qxf4 grabs the bishop, and the knight tour Nd5-Nxc7+ chasing material lets you untangle with …Qe4 and …Nxe5. Black ends up a clear pawn ahead with the initiative.",
    sayShort: '…Qxf4 wins the bishop.',
  },
  beats: [
    { atMove: 9, say: "…Qxf4 snaps off the bishop — Nc3 left it undefended, and the gambit pays off in material.", highlights: [H('f4', ATK)] },
    { atMove: 15, say: "…Nxe5 recovers and consolidates; Black is a healthy pawn up with active pieces.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:tac-trap', 'concept:pos-initiative', ENGLUND_WIKI],
};
const ENG_NBD2: SN = {
  intro: {
    say: "Nbd2 surrenders the dark-squared bishop: …Qxf4 wins it, and after the regrouping you round up the e5-pawn with …Nxe5. Black emerges a clean pawn up — the Englund's trap sprung perfectly.",
    sayShort: '…Qxf4, …Nxe5 a pawn up.',
  },
  beats: [
    { atMove: 9, say: "…Qxf4 captures the bishop the gambit was aimed at — material won.", highlights: [H('f4', ATK)] },
    { atMove: 17, say: "…Nxe5 reclaims the central pawn, leaving Black materially ahead and active.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:tac-trap', 'concept:pos-initiative', ENGLUND_WIKI],
};
const ENG_QD2: SN = {
  intro: {
    say: "Qd2 defends the bishop but invites the deepest trap of all: …Qxb2! grabs the pawn and the rook, and after c3 …Qxa1 the queen raids the corner. Black wins an exchange and stays on top through the complications.",
    sayShort: '…Qxb2, …Qxa1 — win the rook.',
  },
  beats: [
    { atMove: 9, say: "…Qxb2 snatches the b-pawn and threatens the a1-rook — the queen invades.", highlights: [H('b2', ATK)] },
    { atMove: 11, say: "…Qxa1 grabs the rook in the corner; Black is up the exchange in classic Englund fashion.", highlights: [H('a1', ATK)] },
  ],
  sources: ['concept:tac-trap', 'concept:pos-initiative', ENGLUND_WIKI],
};
const ENG_C3: SN = {
  intro: {
    say: "c3 blocks the queen's path to b2, but …Qxf4 still wins the bishop. Shuffle the queen to safety via f5 and h5, snatch a pawn with …Qxg4, and consolidate; Black keeps a material plus.",
    sayShort: '…Qxf4 wins the bishop.',
  },
  beats: [
    { atMove: 9, say: "…Qxf4 captures the loose bishop — the trap delivers material again.", highlights: [H('f4', ATK)] },
    { atMove: 21, say: "…Nxe5 recovers the central pawn, leaving Black ahead with an active queen.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:tac-trap', 'concept:pos-initiative', ENGLUND_WIKI],
};
const ENG_QD3: SN = {
  intro: {
    say: "After …Qxb2 …Bb4, the try Qd3 fails to trap your queen: …Qxa1 grabs the rook, and the trades on c3 leave you up the exchange. Round up e5 with …Nxe5 and convert the material edge.",
    sayShort: '…Qxa1, …Nxe5 up the exchange.',
  },
  beats: [
    { atMove: 13, say: "…Qxa1 takes the rook — Qd3 couldn't close the net, and Black banks the exchange.", highlights: [H('a1', ATK)] },
    { atMove: 19, say: "…Nxe5 recovers the pawn; Black is up material with a sound position.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:tac-trap', 'concept:pos-initiative', ENGLUND_WIKI],
};
const ENG_NFD2: SN = {
  intro: {
    say: "Nfd2 defends, but after …Bxc3 and …Qxc3 you've traded down a pawn ahead. Recover e5 with …Qxe5, develop …Nh6 and …d6, and Black holds a comfortable extra pawn in a simplified position.",
    sayShort: '…Bxc3, …Qxe5 a pawn up.',
  },
  beats: [
    { atMove: 13, say: "…Bxc3 trades to break White's queenside coordination and keep the material.", highlights: [H('c3', ATK)] },
    { atMove: 17, say: "…Qxe5 recovers the central pawn; Black is up a clean pawn and consolidating.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-center', ENGLUND_WIKI],
};
const ENG_NXC3: SN = {
  intro: {
    say: "When White recaptures Nxc3, …Qxa1+ grabs the rook in the corner. After the knight retreats you regain e5 and trade into a position where Black's extra material tells. The trap pays in full.",
    sayShort: '…Qxa1+ wins the rook.',
  },
  beats: [
    { atMove: 15, say: "…Qxa1+ snatches the rook with check — Black is up the exchange.", highlights: [H('a1', ATK)] },
    { atMove: 19, say: "…Nxe5 recovers the pawn, leaving Black materially ahead.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:tac-trap', 'concept:pos-initiative', ENGLUND_WIKI],
};
const ENG_NBD2_12: SN = {
  intro: {
    say: "After …Bb4, Nbd2 lets you trade favourably: …Bxc3 and …Bxd2+ pick up material, and …Qxa2 snatches another pawn. Black emerges with extra pawns and an exposed White king to target.",
    sayShort: '…Bxc3, …Qxa2 grab pawns.',
  },
  beats: [
    { atMove: 13, say: "…Bxc3 breaks up White's queenside, keeping your material advantage.", highlights: [H('c3', ATK)] },
    { atMove: 17, say: "…Qxa2 grabs another pawn; White's king is exposed and Black is winning material.", highlights: [H('a2', ATK)] },
  ],
  sources: ['concept:pos-initiative', 'concept:tac-trap', ENGLUND_WIKI],
};

// ════ STAFFORD GAMBIT — student BLACK (the gambiteer) ═══════════════════════
const STAF_NXF7: SN = {
  intro: {
    say: "Nxf7 is the greediest try and the worst: after …Kxf7 your king is safe enough while White's attack fizzles. Hit back with …Nxe4 and …d5; Black grabs the initiative and stands clearly better despite the airy king.",
    sayShort: '…Kxf7, …Nxe4, …d5 take over.',
  },
  beats: [
    { atMove: 7, say: "…Kxf7 simply takes the knight — White has given up a piece for two pawns and a fleeting check or two.", highlights: [H('f7', KEY)] },
    { atMove: 9, say: "…Nxe4 grabs a central pawn and activates the knight; Black seizes the initiative.", highlights: [H('e4', ATK)] },
    { atMove: 11, say: "…d5 strikes the centre and opens lines for your bishops — the king walks to safety as you attack.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-center', STAFFORD_WIKI],
};

// ════ SCANDINAVIAN — student BLACK ══════════════════════════════════════════
const SCAN_OO: SN = {
  intro: {
    say: "With the …Qa5 Scandinavian, White's quiet O-O lets you complete a harmonious setup: …Qb6 pressures b2 and d4, …Be7 and …Nbd7 develop, and the …Bxh3 sacrifice on a careless Nh4 wins the d4-pawn. Black is comfortably equal with active pieces.",
    sayShort: '…Qb6, …Nbd7, even game.',
  },
  beats: [
    { atMove: 15, say: "…Qb6 eyes b2 and d4, keeping White's centre under pressure.", highlights: [H('b6', KEY), H('d4', SOFT)] },
    { atMove: 21, say: "…Bxh3 punishes Nh4: the light-squared bishop crashes through, and …Qxd4 recovers the centre pawn.", highlights: [H('h3', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', SCANDI_WIKI],
};
const SCAN_NC3: SN = {
  intro: {
    say: "In the …Nf6/…e6 Scandinavian, after White's Nc3 you strike with …Ne4 and …Bxc4, grabbing the bishop pair and a pawn while pinning along the e-file. The tactics flow in Black's favour to a pleasant game.",
    sayShort: '…Ne4, …Bxc4 active.',
  },
  beats: [
    { atMove: 11, say: "…Ne4 jumps to a strong central square, hitting White's pieces and opening tactical chances.", highlights: [H('e4', KEY)] },
    { atMove: 13, say: "…Bxc4 snatches the pawn and the bishop pair; Black takes the initiative.", highlights: [H('c4', ATK)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-bishop-pair', SCANDI_WIKI],
};

// ════ PIRC — student BLACK ══════════════════════════════════════════════════
const PIRC_H4: SN = {
  intro: {
    say: "In the 150 Attack White castles long and storms with h4-h5. You must counter precisely on the queenside: …b5-b4 chases the c3-knight, …Qa5 adds pressure, and the key resource …Ba6 trades White's strong light bishop, blunting the attack to a roughly balanced fight.",
    sayShort: '…b5-b4, …Qa5, …Ba6 trade.',
  },
  beats: [
    { atMove: 13, say: "…b5 launches the queenside counter-storm — the race is on, and your attack must be just as fast.", highlights: [H('b5', ATK)] },
    { atMove: 19, say: "…Ba6 is the accuracy that holds: trading White's powerful light-squared bishop defuses the kingside assault.", highlights: [H('a6', KEY)] },
  ],
  sources: ['concept:att-queenside-attack', 'concept:pos-king-safety', PIRC_WIKI],
};
const PIRC_BD3: SN = {
  intro: {
    say: "In the Austrian Attack, Bd3 supports the centre. Counter classically: …Nc6 pressures d4, and after White's e5 push you strike back with …dxe5 and …Nh5, then …Bg4 and …f6 to break the centre open. Black gets full central counterplay.",
    sayShort: '…Nc6, …dxe5, …f6 break.',
  },
  beats: [
    { atMove: 11, say: "…Nc6 develops with pressure on d4, the keystone of White's big centre.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 19, say: "…f6 undermines the e5-pawn, prising the over-extended centre apart.", highlights: [H('f6', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', PIRC_WIKI],
};

// ════ FRENCH (Exchange) — student BLACK ═════════════════════════════════════
const FR_H3: SN = {
  intro: {
    say: "The Exchange French is dead symmetrical, and h3 is a slow waiting move. Mirror with …h6, develop …c6 and …Nbd7, and reroute …Nh5 toward f4; Black equalises completely and plays for the small initiative in a balanced middlegame.",
    sayShort: '…h6, …c6, …Nbd7 symmetrical.',
  },
  beats: [
    { atMove: 13, say: "…h6 keeps the symmetry, denying White's pieces the g5-square just as he denied yours.", highlights: [H('h6', SOFT)] },
    { atMove: 21, say: "…Nh5 reroutes toward f4, seeking the only imbalance in a symmetrical position.", highlights: [H('h5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', FRENCH_WIKI],
};

// ════ NIMZO-INDIAN (Leningrad Bg5) — student BLACK ══════════════════════════
const NIM_BXF6: SN = {
  intro: {
    say: "In the Leningrad Nimzo, after …h6 Bxf6 you recapture the structure White wants: …Bxc3+ doubles his pawns, and …Qxf6 keeps the bishop pair with a solid game. Then …b6 and …Bb7 develop, and …g5 with …Qg6 grabs kingside space. Black is fully equal.",
    sayShort: '…Bxc3+, …Qxf6, bishop pair.',
  },
  beats: [
    { atMove: 9, say: "…Bxc3+ inflicts doubled c-pawns — the structural concession that defines the Nimzo bargain.", highlights: [H('c3', ATK)] },
    { atMove: 11, say: "…Qxf6 recaptures, keeping the bishop pair and a comfortable, flexible position.", highlights: [H('f6', KEY)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-bishop-pair', NIMZO_WIKI],
};

// ════ QGD (Exchange) — student BLACK ════════════════════════════════════════
const QGD_CXD5: SN = {
  intro: {
    say: "The Exchange QGD gives Black a solid, well-mapped game. Recapture …exd5, develop …Be7 and …c6, and execute the classic knight regrouping …Nf8-g6 to defend the kingside and eye f4. Black is rock-solid and equal, with the minority attack to watch for.",
    sayShort: '…exd5, …c6, …Nf8-g6.',
  },
  beats: [
    { atMove: 9, say: "…exd5 recaptures into the Carlsbad structure — solid and thoroughly understood.", highlights: [H('d5', KEY)] },
    { atMove: 19, say: "…Nf8 begins the classic regrouping to g6, reinforcing the kingside and eyeing f4.", highlights: [H('f8', SOFT), H('g6', KEY)] },
  ],
  sources: ['concept:pawn-minority-attack', 'concept:pos-development', QGD_WIKI],
};

// ════ SLAV — student BLACK ══════════════════════════════════════════════════
const SLAV_BXF6: SN = {
  intro: {
    say: "After …h6 Bxf6, recapture with …Qxf6 — you keep the bishop pair in a sound Slav structure. Develop …Nd7, release with …dxc4, and complete with …Bd6 and …e5; Black equalises comfortably and frees the position with the central break.",
    sayShort: '…Qxf6, …dxc4, …e5 free.',
  },
  beats: [
    { atMove: 11, say: "…Qxf6 recaptures, banking the bishop pair in an open, comfortable position.", highlights: [H('f6', KEY)] },
    { atMove: 23, say: "…e5 strikes the centre, completing equality and activating your pieces.", highlights: [H('e5', ATK)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', SLAV_WIKI],
};

// ════ ANTI-QID FIANCHETTO — student WHITE (facing the QID) ══════════════════
const AQ_D5_5: SN = {
  intro: {
    say: "Against …d5, the Bg5 pin gives you a pleasant edge. After …Bb4+ and …c5, the exchanges on d5 and c5 leave Black with hanging pawns to defend, and Bb5 plus Bxf6 keep the initiative. White is comfortably better.",
    sayShort: 'Bg5 pin, press the hanging pawns.',
  },
  beats: [
    { atMove: 18, say: "Bb5 develops with tempo, pressuring Black's loose queenside as the structure opens.", highlights: [H('b5', KEY)] },
    { atMove: 22, say: "Bxf6 removes a key defender, exposing Black's centre to your active pieces.", highlights: [H('f6', ATK)] },
  ],
  sources: ['concept:pos-initiative', 'concept:tac-pin', QID_WIKI],
};
const AQ_BB4_5: SN = {
  intro: {
    say: "When Black checks with …Bb4+, Bd2 invites the trade and you recapture toward the centre. Fianchetto with g3 and Bg2, claim the centre with the c4/d4 duo, and meet …c5 with dxc5 and b4, keeping a small but persistent space edge.",
    sayShort: 'Bd2, g3-Bg2, hold the edge.',
  },
  beats: [
    { atMove: 8, say: "Qxd2 recaptures toward the centre, leaving White harmoniously placed with the bishop pair to come.", highlights: [H('d2', KEY)] },
    { atMove: 22, say: "b4 gains queenside space, pressing your structural plus in a pleasant position.", highlights: [H('b4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', QID_WIKI],
};
const AQ_C5_5: SN = {
  intro: {
    say: "Black's early …c5 invites a Benoni structure where your space tells. Clamp with d5, build the big centre with e4, and develop Bf4 and Bd3; White enjoys a classic space advantage and the easier middlegame.",
    sayShort: 'd5 clamp, e4 centre.',
  },
  beats: [
    { atMove: 6, say: "d5 clamps the centre and gains space — the Benoni structure favours the side with more room.", highlights: [H('d5', KEY)] },
    { atMove: 12, say: "e4 erects the full centre; your pieces enjoy the freer game.", highlights: [H('e4', KEY)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', QID_WIKI],
};
const AQ_BB7_7: SN = {
  intro: {
    say: "Against the …Bb7 fianchetto, trade the dark bishops after …Bb4+ Bd2, fianchetto your own bishop, and break with cxd5. The knight jump Ne5 and Qb5 then probe Black's slightly loose queenside, keeping White a touch better.",
    sayShort: 'Bg2, cxd5, Ne5 probes.',
  },
  beats: [
    { atMove: 18, say: "cxd5 opens the centre, fixing Black's structure for you to target.", highlights: [H('d5', KEY)] },
    { atMove: 20, say: "Ne5 centralises the knight and eyes the weak light squares around Black's king.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', QID_WIKI],
};
const AQ_BB4_7: SN = {
  intro: {
    say: "After …b6 …Bb4+, trade with Bd2 and fianchetto. Black's …Ne4 and …Bxe4 simplify, but Rac1 and Qe3 keep your pieces active on the c-file and centre, preserving a small, comfortable edge for White.",
    sayShort: 'Bd2, Bg2, Rac1 edge.',
  },
  beats: [
    { atMove: 20, say: "Rac1 seizes the half-open c-file, the natural pressure point in these structures.", highlights: [H('c1', KEY)] },
    { atMove: 22, say: "Qe3 centralises, eyeing the queenside and supporting your space advantage.", highlights: [H('e3', KEY)] },
  ],
  sources: ['concept:pos-open-file', 'concept:pos-development', QID_WIKI],
};
const AQ_BB7_9: SN = {
  intro: {
    say: "Against the …Ba6/…Bb7 setup, build the double-fianchetto with b3 and Bb2, develop solidly, and break with cxd5. Ne5 and Rc1 give White a small, pleasant pull with the safer structure.",
    sayShort: 'b3-Bb2, cxd5, Ne5.',
  },
  beats: [
    { atMove: 16, say: "cxd5 opens lines just as your pieces reach their best squares.", highlights: [H('d5', KEY)] },
    { atMove: 18, say: "Ne5 centralises into the position, dominating from the strong central square.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', QID_WIKI],
};
const AQ_D5_9: SN = {
  intro: {
    say: "When Black plays …Ba6 then …d5, complete the double fianchetto with Bg2 and Bb2 and exchange on d5. The knight outpost on e5 plus pressure on the c-file leave White comfortably the better placed.",
    sayShort: 'Bb2, cxd5, Ne5 outpost.',
  },
  beats: [
    { atMove: 16, say: "cxd5 clarifies the centre, fixing a target on d5 for your pieces.", highlights: [H('d5', KEY)] },
    { atMove: 18, say: "Ne5 lands on the central outpost, the hub of White's pleasant position.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-center', QID_WIKI],
};
const AQ_B5_9: SN = {
  intro: {
    say: "Black's ambitious …b5 over-reaches on the queenside. Keep calm with Qc2 and Bg2, untangle the centre, and after …bxc4 bxc4 you reach an open position where Black's loosened pawns and your better structure give White the edge.",
    sayShort: 'Qc2, Bg2, exploit …b5.',
  },
  beats: [
    { atMove: 14, say: "Qd1 calmly retreats, sidestepping the bishop and keeping your structure intact.", highlights: [H('d1', SOFT)] },
    { atMove: 22, say: "Nbd2 develops toward the weakened queenside squares …b5 left behind.", highlights: [H('d2', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', QID_WIKI],
};

// ════ ANTI-KID SÄMISCH — student WHITE ══════════════════════════════════════
const AKS_D5_5: SN = {
  intro: {
    say: "When Black tries the Grünfeld-style …d5 against your setup, Bf4 and Rc1 keep pressure, and after the exchanges and e4-e5 you push the c-pawn to c6, jamming Black's queenside. White holds an enduring space and structural edge.",
    sayShort: 'Bf4, e4-e5, c6 jam.',
  },
  beats: [
    { atMove: 16, say: "e4 erects the broad centre, the foundation of White's space advantage.", highlights: [H('e4', KEY)] },
    { atMove: 22, say: "c6 rams a pawn deep into Black's camp, cramping his queenside development.", highlights: [H('c6', ATK)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', KID_WIKI],
};
const AKS_OO: SN = {
  intro: {
    say: "Against a quick …O-O, build the full e4 centre and meet …e5 with d5, locking the position your way. The h3/g3 plan curbs Black's …f5 storm, and exf5 opens lines toward Black's king while you stay better.",
    sayShort: 'e4, d5 clamp, blunt …f5.',
  },
  beats: [
    { atMove: 12, say: "d5 closes the centre on your terms, gaining space and defining the pawn structure.", highlights: [H('d5', KEY)] },
    { atMove: 16, say: "exf5 opens lines toward Black's king before his kingside storm gathers steam.", highlights: [H('f5', KEY)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', KID_WIKI],
};

// ════ ANTI-ENGLUND — student WHITE (refuting the gambit) ════════════════════
const AE_F6_7: SN = {
  intro: {
    say: "The simplest refutation: keep the extra pawn and develop. After …f6 exf6 …Nxf6, you build with e4, Nc3 and Bf4, castle, and convert the healthy extra pawn. No tricks, just sound chess and a winning structure.",
    sayShort: 'exf6, e4, keep the pawn.',
  },
  beats: [
    { atMove: 10, say: "e4 erects a big centre on top of your extra pawn — Black has nothing for the material.", highlights: [H('e4', KEY)] },
    { atMove: 14, say: "Bf4 develops actively; White is simply a sound pawn up with the better position.", highlights: [H('f4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', ENGLUND_WIKI],
};
const AE_BE7_7: SN = {
  intro: {
    say: "Trade the dark bishops with Bxe7, return the e5-pawn at the right moment, and emerge with the cleaner structure. e3, Be2 and Qd3-a3 develop smoothly; White keeps a clear, risk-free edge.",
    sayShort: 'Bxe7, e3, smooth edge.',
  },
  beats: [
    { atMove: 8, say: "Bxe7 trades into a position where Black's gambit compensation has simply evaporated.", highlights: [H('e7', KEY)] },
    { atMove: 20, say: "Qa3 eyes the queenside and the d6-pawn, keeping Black tied down.", highlights: [H('a3', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', ENGLUND_WIKI],
};
const AE_NGE7_7: SN = {
  intro: {
    say: "Return the pawn cleanly with exd6 and develop with e4, Nc3 and Be3-Bb5. The bishop pair and central majority give White a stable, clear advantage with none of Black's hoped-for tricks.",
    sayShort: 'exd6, e4, Bb5 — clear plus.',
  },
  beats: [
    { atMove: 10, say: "e4 stakes out the centre; White's structure and development leave Black with nothing for the pawn.", highlights: [H('e4', KEY)] },
    { atMove: 16, say: "Bb5 develops with pressure, harassing Black's pieces and the queenside.", highlights: [H('b5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', ENGLUND_WIKI],
};
const AE_H6_9: SN = {
  intro: {
    say: "Against the …Qd7/…h6 setup, hold the e5-pawn with Bf4-g3, return it only on your terms with exd6, and develop the knights. White consolidates the extra material into a clearly superior position.",
    sayShort: 'Bg3, exd6, consolidate.',
  },
  beats: [
    { atMove: 10, say: "Bf4 holds the e5-pawn and keeps the extra material that refutes the gambit.", highlights: [H('f4', KEY)] },
    { atMove: 20, say: "Nc4 redeploys actively, eyeing the dark squares and Black's loose setup.", highlights: [H('c4', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', ENGLUND_WIKI],
};
const AE_DXE5_9: SN = {
  intro: {
    say: "When Black recaptures …dxe5, trade queens with Qxd7+ — without queens the gambiteer has zero attacking chances. Develop e4, Bd2-e3 and Bb5; White's sound structure and active pieces hold a comfortable edge.",
    sayShort: 'Qxd7+, trade into a clean game.',
  },
  beats: [
    { atMove: 10, say: "Qxd7+ trades queens, snuffing out every shred of Black's gambit initiative.", highlights: [H('d7', KEY)] },
    { atMove: 22, say: "Bb5 develops with tempo into a pleasant, queenless middlegame.", highlights: [H('b5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-king-safety', ENGLUND_WIKI],
};
const AE_NGE7_5: SN = {
  intro: {
    say: "Hold the pawn with Bf4 and return it with exd6 to reach a clean position. Trade the dark bishops, castle long, and develop with Qd2 and Na4; White keeps the structural and developmental advantage throughout.",
    sayShort: 'Bf4, exd6, castle long.',
  },
  beats: [
    { atMove: 6, say: "Bf4 holds the extra pawn and develops with tempo against Black's setup.", highlights: [H('f4', KEY)] },
    { atMove: 22, say: "O-O-O completes development, leaving White better-placed and material-ahead in spirit.", highlights: [H('c1', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', ENGLUND_WIKI],
};
const AE_F6_5: SN = {
  intro: {
    say: "Black's wild …f6 and …g5 over-extends fatally. Calmly retreat Bg3, and the breaks exf6 and f7+ rip the position open; Qd5+ and the queen raid round up material decisively. White wins.",
    sayShort: 'Bg3, exf6, f7+ crushes.',
  },
  beats: [
    { atMove: 10, say: "exf6 cracks open Black's reckless kingside; the king is hopelessly exposed.", highlights: [H('f6', ATK)] },
    { atMove: 16, say: "Qd5+ forks into Black's position, collecting material as the king is hunted.", highlights: [H('d5', ATK)] },
  ],
  sources: ['concept:pos-king-safety', 'concept:tac-fork', ENGLUND_WIKI],
};
const AE_QF5_9: SN = {
  intro: {
    say: "Against …Qf5, return the pawn with exd6 and develop naturally. The bishop on g3 and the b4-h3 pawn nudges chase Black's queen around, and White consolidates a clear, comfortable advantage.",
    sayShort: 'exd6, harass the queen.',
  },
  beats: [
    { atMove: 10, say: "exd6 returns the pawn to complete development with a healthy structure.", highlights: [H('d6', KEY)] },
    { atMove: 18, say: "b4 gains queenside space and chases Black's wandering queen, keeping the initiative.", highlights: [H('b4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', ENGLUND_WIKI],
};
const AE_NXE5_9: SN = {
  intro: {
    say: "When Black grabs back on e5, trade the dark bishops and the queens via Qd2 and Qxg5, then knight to b5 hits the weak dark squares. White retains the cleaner structure and a stable edge.",
    sayShort: 'Qd2, Nb5, cleaner game.',
  },
  beats: [
    { atMove: 14, say: "Qxg5 keeps the position simple and the structure sound after the bishop trade.", highlights: [H('g5', KEY)] },
    { atMove: 18, say: "Nb5 probes the weak dark squares in Black's camp, keeping White on top.", highlights: [H('b5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-weak-squares', ENGLUND_WIKI],
};

// ════ ANTI-DUTCH STAUNTON GAMBIT — student WHITE ════════════════════════════
const AD_EXF3_9: SN = {
  intro: {
    say: "In the Staunton Gambit, when Black returns the pawn with …exf3, recapture Nxf3 and pour into the open lines: Qd2, Bh6 and O-O-O aim everything at Black's king. White's lead in development and the open f-file give a dangerous, better game.",
    sayShort: 'Nxf3, Bh6, O-O-O attack.',
  },
  beats: [
    { atMove: 10, say: "Nxf3 recaptures and develops, opening the f-file toward Black's king.", highlights: [H('f3', KEY)] },
    { atMove: 14, say: "Bh6 challenges the fianchetto bishop, the key defender of Black's king.", highlights: [H('h6', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-king-safety', DUTCH_WIKI],
};
const AD_E3_9: SN = {
  intro: {
    say: "When Black tries to hold the pawn with …e3, recapture the structure and seize the open lines: Qxe3, O-O-O and the g4-h4 pawn storm crash into Black's king. White's huge development lead converts to a strong attack.",
    sayShort: 'Qxe3, O-O-O, g4-h4 storm.',
  },
  beats: [
    { atMove: 14, say: "O-O-O connects the rooks and points everything at Black's king.", highlights: [H('c1', KEY)] },
    { atMove: 16, say: "g4 launches the kingside pawn storm; Black's defences are stretched thin.", highlights: [H('g4', ATK)] },
  ],
  sources: ['concept:att-kingside-storm', 'concept:pos-development', DUTCH_WIKI],
};
const AD_EXF3_11: SN = {
  intro: {
    say: "After …c6 …Qa5 …exf3, recapture Nxf3 and develop with Bc4 and Bd3 toward Black's king. The lead in development and open lines give White a clear initiative and the better game.",
    sayShort: 'Nxf3, Bd3, initiative.',
  },
  beats: [
    { atMove: 12, say: "Nxf3 recaptures and develops, keeping the initiative White's gambit play earns.", highlights: [H('f3', KEY)] },
    { atMove: 16, say: "Bd3 aims at the kingside; White's pieces are far more active.", highlights: [H('d3', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', DUTCH_WIKI],
};
const AD_D5_11: SN = {
  intro: {
    say: "When Black strikes back with …d5, the central exchanges and Bxf6 win the battle for the dark squares. After the queen trade White's better structure and active pieces secure a clear, lasting advantage.",
    sayShort: 'fxe4, Bxf6, structural edge.',
  },
  beats: [
    { atMove: 18, say: "Bxf6 shatters Black's kingside pawns, leaving permanent weaknesses to target.", highlights: [H('f6', ATK)] },
    { atMove: 20, say: "Bd3 develops toward the weakened kingside; White holds a clear edge.", highlights: [H('d3', KEY)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-development', DUTCH_WIKI],
};
const AD_D5_9: SN = {
  intro: {
    say: "Against …d5, open the centre with fxe4 and develop Bc4 with pressure on f7. Bxf6 and the trade on d2 leave White with the bishop pair and the cleaner position — a comfortable, better game.",
    sayShort: 'fxe4, Bc4, bishop pair.',
  },
  beats: [
    { atMove: 12, say: "Bc4 develops with pressure on the f7-square, exploiting your lead in development.", highlights: [H('c4', KEY)] },
    { atMove: 16, say: "Bxf6 wins the dark-square battle, keeping White structurally superior.", highlights: [H('f6', ATK)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-development', DUTCH_WIKI],
};
const AD_E3_11: SN = {
  intro: {
    say: "When Black props the pawn with …e3, recapture with Bxe3 and storm with h4-h5-h6, cramping Black's kingside. The knight to e4 and the open lines give White a powerful initiative against the exposed king.",
    sayShort: 'Bxe3, h4-h5-h6 cramp.',
  },
  beats: [
    { atMove: 12, say: "Bxe3 recaptures and develops, keeping White's pieces aimed at the king.", highlights: [H('e3', KEY)] },
    { atMove: 18, say: "h6 cramps Black's kingside, fixing a permanent weakness near the king.", highlights: [H('h6', ATK)] },
  ],
  sources: ['concept:att-kingside-storm', 'concept:pos-development', DUTCH_WIKI],
};
const AD_EXF3_9B: SN = {
  intro: {
    say: "After …c6, when Black returns the pawn with …exf3, recapture Nxf3 and complete a powerful setup with Bd3, O-O and Rae1. White's lead in development and the open centre yield a dangerous attacking position.",
    sayShort: 'Nxf3, Bd3, O-O, Rae1.',
  },
  beats: [
    { atMove: 10, say: "Nxf3 recaptures and develops with the initiative firmly in White's hands.", highlights: [H('f3', KEY)] },
    { atMove: 18, say: "Rae1 centralises the rook, completing a menacing attacking setup.", highlights: [H('e1', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-open-file', DUTCH_WIKI],
};
const AD_E3_9B: SN = {
  intro: {
    say: "When Black holds with …e3 here, recapture Qxe3, develop f4 and Nf3, and castle long with the h4 storm to follow. White's huge development lead and the open lines deliver a strong, lasting attack.",
    sayShort: 'Qxe3, f4, O-O-O attack.',
  },
  beats: [
    { atMove: 12, say: "Qxe3 recaptures, keeping the centre and the open lines for your pieces.", highlights: [H('e3', KEY)] },
    { atMove: 22, say: "O-O-O connects the rooks behind a coming kingside storm.", highlights: [H('c1', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:att-kingside-storm', DUTCH_WIKI],
};

// ════ ANTI-GRÜNFELD EXCHANGE — student WHITE ════════════════════════════════
const AGE_BG7_5: SN = {
  intro: {
    say: "Against the early …Bg7, build the broad centre with e4 and meet Black's …h5 with the h4/Bg5 setup. d5 gains space, and after dxe6 your central pawns and active pieces give White a comfortable space edge.",
    sayShort: 'e4 centre, d5 space.',
  },
  beats: [
    { atMove: 6, say: "e4 erects the big centre — the whole point of meeting the Grünfeld with the Exchange.", highlights: [H('e4', KEY)] },
    { atMove: 18, say: "d5 gains space and challenges Black's setup, keeping White comfortably better.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', GRUN_WIKI],
};
const AGE_OO_13: SN = {
  intro: {
    say: "In the Exchange with Bc4, after …O-O develop Ne2 and castle, then build with Be3 and Rb1. Your broad d4/e4 centre and the bishop pair give White the classic Grünfeld-Exchange space advantage; meet …c5 with d-file pressure.",
    sayShort: 'Ne2, Be3, big centre.',
  },
  beats: [
    { atMove: 14, say: "Ne2 supports the centre and prepares to meet …c5 without weakening d4.", highlights: [H('e2', KEY)] },
    { atMove: 18, say: "Be3 reinforces d4, the keystone of White's imposing centre.", highlights: [H('e3', KEY), H('d4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-bishop-pair', GRUN_WIKI],
};
const AGE_C5_11: SN = {
  intro: {
    say: "When Black hits with …c5 early, develop Nf3 and Be3, brace the centre, and after the queen trade your healthy structure and central pawns endure. White keeps a small but real space advantage into the endgame.",
    sayShort: 'Nf3, Be3, hold the centre.',
  },
  beats: [
    { atMove: 12, say: "Nf3 develops and defends d4, keeping your centre intact under pressure.", highlights: [H('f3', KEY), H('d4', SOFT)] },
    { atMove: 14, say: "Be3 braces the centre; White's structure outlasts Black's counterplay.", highlights: [H('e3', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', GRUN_WIKI],
};
const AGE_C5_13: SN = {
  intro: {
    say: "After Bc4 and …c5, develop Ne2 and Be3 and castle; your big centre stands firm. When Black redeploys …Na5, the bishop drops back to d3 and White keeps the broad pawn centre and a pleasant, lasting space edge.",
    sayShort: 'Ne2, Be3, Bd3 — keep space.',
  },
  beats: [
    { atMove: 16, say: "Be3 reinforces d4, holding the centre together against …c5.", highlights: [H('e3', KEY), H('d4', SOFT)] },
    { atMove: 20, say: "Bd3 retreats to safety, preserving the bishop and the central majority.", highlights: [H('d3', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', GRUN_WIKI],
};

export const SUBLINE_NARRATION_HELP_F: Record<string, SN> = {
  // Albin Countergambit — student BLACK
  'albin-countergambit::0::a3@8': ALB_A3, 'albin-countergambit::1::Nf3@6': ALB_A3, 'albin-countergambit::2::Nf3@6': ALB_A3,
  'albin-countergambit::0::Nbd2@8': ALB_NBD2,
  'albin-countergambit::0::e3@4': ALB_E3, 'albin-countergambit::1::e3@4': ALB_E3, 'albin-countergambit::2::e3@4': ALB_E3,
  'albin-countergambit::1::Qa4+@10': ALB_QA4,
  'albin-countergambit::1::Nd2@8': ALB_ND2,
  'albin-countergambit::1::Kxf2@12': ALB_LASKER,
  'albin-countergambit::1::Ke2@8': ALB_KE2,
  'albin-countergambit::1::a3@6': ALB_A3_6, 'albin-countergambit::2::a3@6': ALB_A3_6,
  'albin-countergambit::1::e4@6': ALB_E4,
  'albin-countergambit::2::Nf3@8': ALB_NF3_8,
  'albin-countergambit::2::e5@12': ALB_E5_12,
  'albin-countergambit::2::Bf4@8': ALB_BF4_8,
  'albin-countergambit::2::Nf3@10': ALB_NF3_10,
  'albin-countergambit::2::Bd3@8': ALB_BD3_8,
  'albin-countergambit::2::e6@10': ALB_E6_10,
  // Englund Gambit — student BLACK
  'englund-gambit::0::Nc3@8': ENG_NC3,
  'englund-gambit::0::Nbd2@8': ENG_NBD2,
  'englund-gambit::0::Qd2@8': ENG_QD2,
  'englund-gambit::0::c3@8': ENG_C3,
  'englund-gambit::0::Qd3@12': ENG_QD3,
  'englund-gambit::0::Nfd2@12': ENG_NFD2,
  'englund-gambit::0::Nxc3@14': ENG_NXC3,
  'englund-gambit::0::Nbd2@12': ENG_NBD2_12,
  // Stafford Gambit — student BLACK
  'stafford-gambit::0::Nxf7@6': STAF_NXF7, 'stafford-gambit::1::Nxf7@6': STAF_NXF7,
  // Scandinavian — student BLACK
  'scandinavian-defence::0::O-O@14': SCAN_OO, 'scandinavian-defence::6::O-O@14': SCAN_OO,
  'scandinavian-defence::2::Nc3@10': SCAN_NC3,
  // Pirc — student BLACK
  'pirc-defence::3::h4@12': PIRC_H4,
  'pirc-defence::7::Bd3@10': PIRC_BD3,
  // French (Exchange) — student BLACK
  'french-defence::4::h3@12': FR_H3,
  // Nimzo-Indian (Leningrad) — student BLACK
  'nimzo-indian::3::Bxf6@8': NIM_BXF6,
  // QGD (Exchange) — student BLACK
  'qgd::6::cxd5@8': QGD_CXD5,
  // Slav — student BLACK
  'slav-defence::6::Bxf6@10': SLAV_BXF6,
  // anti-QID fianchetto — student WHITE
  'anti-qid-fianchetto::0::d5@5': AQ_D5_5, 'anti-qid-fianchetto::1::d5@5': AQ_D5_5,
  'anti-qid-fianchetto::0::Bb4+@5': AQ_BB4_5, 'anti-qid-fianchetto::1::Bb4+@5': AQ_BB4_5,
  'anti-qid-fianchetto::0::c5@5': AQ_C5_5, 'anti-qid-fianchetto::1::c5@5': AQ_C5_5,
  'anti-qid-fianchetto::0::Bb7@7': AQ_BB7_7,
  'anti-qid-fianchetto::0::Bb4+@7': AQ_BB4_7, 'anti-qid-fianchetto::1::Bb4+@7': AQ_BB4_7,
  'anti-qid-fianchetto::0::Bb7@9': AQ_BB7_9,
  'anti-qid-fianchetto::0::d5@9': AQ_D5_9,
  'anti-qid-fianchetto::0::b5@9': AQ_B5_9,
  // anti-KID Sämisch — student WHITE
  'anti-kid-saemisch::0::d5@5': AKS_D5_5, 'anti-kid-saemisch::1::d5@5': AKS_D5_5, 'anti-kid-saemisch::2::d5@5': AKS_D5_5, 'anti-kid-saemisch::3::d5@5': AKS_D5_5, 'anti-kid-saemisch::4::d5@5': AKS_D5_5,
  'anti-kid-saemisch::0::O-O@7': AKS_OO, 'anti-kid-saemisch::1::O-O@7': AKS_OO, 'anti-kid-saemisch::2::O-O@7': AKS_OO, 'anti-kid-saemisch::3::O-O@7': AKS_OO, 'anti-kid-saemisch::4::O-O@7': AKS_OO,
  // anti-Englund — student WHITE
  'anti-englund::1::f6@7': AE_F6_7,
  'anti-englund::1::Be7@7': AE_BE7_7,
  'anti-englund::1::Nge7@7': AE_NGE7_7,
  'anti-englund::1::h6@9': AE_H6_9,
  'anti-englund::1::dxe5@9': AE_DXE5_9,
  'anti-englund::1::Nge7@5': AE_NGE7_5,
  'anti-englund::1::f6@5': AE_F6_5,
  'anti-englund::1::Qf5@9': AE_QF5_9,
  'anti-englund::1::Nxe5@9': AE_NXE5_9,
  // anti-Dutch Staunton — student WHITE
  'anti-dutch-staunton::1::exf3@9': AD_EXF3_9,
  'anti-dutch-staunton::1::e3@9': AD_E3_9,
  'anti-dutch-staunton::2::exf3@11': AD_EXF3_11,
  'anti-dutch-staunton::2::d5@11': AD_D5_11,
  'anti-dutch-staunton::2::d5@9': AD_D5_9,
  'anti-dutch-staunton::2::e3@11': AD_E3_11,
  'anti-dutch-staunton::2::exf3@9': AD_EXF3_9B,
  'anti-dutch-staunton::2::e3@9': AD_E3_9B,
  // anti-Grünfeld Exchange — student WHITE
  'anti-grunfeld-exchange::0::Bg7@5': AGE_BG7_5, 'anti-grunfeld-exchange::1::Bg7@5': AGE_BG7_5,
  'anti-grunfeld-exchange::0::O-O@13': AGE_OO_13,
  'anti-grunfeld-exchange::0::c5@11': AGE_C5_11, 'anti-grunfeld-exchange::1::c5@11': AGE_C5_11,
  'anti-grunfeld-exchange::1::c5@13': AGE_C5_13,
};
