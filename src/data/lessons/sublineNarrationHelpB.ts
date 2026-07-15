import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration as SN } from '../../services/sublineLesson';

// HELPER B (claude oversight session jumped in, David 2026-06-18) — Benoni /
// gambit / Dutch bucket of the d4-flank narration tail, OVERRIDE LAYER (spread
// after D4Flank → deeper teach-past versions win, zero collision with C's file).
// Every line below is board-verified against course-sublines.json (G3).
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

// ── anti-Budapest (student WHITE) — neutralise the gambit, keep the edge ──
// Ng4 line, …g5 lunge.  d4 Nf6 c4 e5 dxe5 Ng4 Bf4 g5 Bg3 Nc6 Nf3 Bg7 h4 Ngxe5 Nxe5 Nxe5
const AB_G5: SN = {
  intro: {
    say: "…g5 — Black throws a pawn at your f4-bishop to break the grip on e5. Don't oblige a retreat into trouble: Bg3 keeps the bishop guarding e5, and …g5 has gravely loosened Black's own kingside. You'll strike that weakness with h4 and stand clearly better even once the gambit pawn comes back.",
    sayShort: '…g5 — Bg3 holds, h4 punishes.',
  },
  beats: [
    { atMove: 8, say: "Bg3 — the calm retreat. The bishop still eyes e5 and stays safe, while …g5 has ripped holes around Black's king that can never be repaired. You've given nothing and Black has weakened everything.", highlights: [H('e5', KEY), H('g5', SOFT)] },
    { atMove: 12, say: "h4 — prising open the kingside Black just loosened. Even after he rounds up the e5-pawn, his exposed king and the open h-file leave you with the clearly better game. …g5 was the mistake; h4 is the refutation.", highlights: [H('g5', ATK), H('h4', SOFT)] },
  ],
  sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// Ng4 line, …Bb4+.  d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Bb4+ Nd2 Nc6 Nf3 Qe7 e3 Ngxe5 Nxe5 Nxe5
const AB_BB4: SN = {
  intro: {
    say: "…Bb4+ — a developing check to disrupt your build-up. Just block it: Nd2 brings a piece out and shields the king, and you calmly finish developing with Nf3 and e3 while holding the extra e5-pawn. Black will regain it, but you keep the smoother position and the freer pieces.",
    sayShort: '…Bb4+ — block Nd2, keep developing.',
  },
  beats: [
    { atMove: 8, say: "Nd2 — block the check WITH a developing move. Nothing is loosened, the e5-pawn stays defended for now, and you simply get your pieces out faster than Black can untangle his gambit.", highlights: [H('e5', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// Ng4 line, …Nc6.  d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nc3 Bxc3+ bxc3 Qe7 Qd5 f6 exf6 Nxf6
const AB_NC6: SN = {
  intro: {
    say: "…Nc6 — piling onto the e5-pawn at once. You defend it naturally: Nf3 props e5, and when Black pins with …Bb4+ you meet it with Nc3, accepting doubled c-pawns in return for the bishop pair and a strong centre. Qd5 then hits hard and you emerge comfortably better.",
    sayShort: '…Nc6 — hold e5 with Nf3.',
  },
  beats: [
    { atMove: 8, say: "Nf3 — the knight props up the e5-pawn that …Nc6 is attacking. You hold your extra material and keep developing; the Budapest's whole point is to win e5 back quickly, and you simply don't let it go cheaply.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// Fajarowicz …Ne4.  d4 Nf6 c4 e5 dxe5 Ne4 a3 d6 Qc2 Nc5 b4 Ne6 exd6 Bxd6 Bb2
const AB_NE4: SN = {
  intro: {
    say: "…Ne4 — the Fajarowicz, betting on piece activity rather than regaining the pawn directly. The clean antidote is space: a3 and b4 build a big queenside bind, Qc2 covers e4, and you hand the pawn back on your terms with exd6 — emerging with the bishop pair, a space advantage, and Black's knights with nowhere to go.",
    sayShort: '…Ne4 — bind with a3, b4.',
  },
  beats: [
    { atMove: 10, say: "b4 — the clamp. You give the gambit pawn back with exd6 in a moment, but in return you seize the whole queenside, keep the bishop pair, and leave Black's adventurous knight short of squares. Activity for a pawn is the Fajarowicz idea — deny the activity and you're just better.", highlights: [H('b4', ATK), H('c4', SOFT)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};

// ── Albin Counter-Gambit (student BLACK) — the …d4 wedge + opposite-wing attack.
// The move-14 deviations all branch from one tabiya; the plan never changes.
// Spine: d4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Bg4 Bg2 Qd7 O-O O-O-O
const ALBIN_TABIYA: SN = {
  intro: {
    say: "You're in the Albin main tabiya, and White's move here is just one of many tries — your plan never changes. The …d4 wedge is the soul of the gambit: it jams deep into White's camp and refuses to be shifted. With the kings on opposite wings you've got the head start — storm White's king with …h5-h4 while …Nge7-g6 rounds up the e5-pawn. Sharp, attacking, full of practical venom.",
    sayShort: 'Hold d4, storm with …h5-h4.',
  },
  beats: [
    { atMove: 5, say: "…d4 — the soul of the Albin. Your pawn jams deep into White's position, cramping his pieces and refusing to be dislodged. Every plan you have is built around protecting and using this wedge.", highlights: [H('d4', ATK)] },
    { atMove: 9, say: "…Bg4 — pinning the f3-knight, the very piece that most wants to chip away at your proud d4-pawn. Pin its attacker and the wedge only grows stronger.", highlights: [H('f3', KEY)] },
    { atMove: 13, say: "…O-O-O — castling straight into the attack. Kings on opposite wings means a race, and you have the jump: hurl the h-pawn at White's king while the d4-wedge keeps him too cramped to strike back in time.", highlights: [H('d4', ATK)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
};

// ── Staunton Gambit vs Dutch (student WHITE) — gambit the e-pawn for development.
// …d5 grab.  d4 f5 e4 fxe4 Nc3 d5 Qh5+ g6 Qxd5 Nf6 Qxd8+ Kxd8
const STAUNTON_D5: SN = {
  intro: {
    say: "…d5 — Black tries to cling to the extra pawn behind a big centre. Punish it at once: Qh5+ forces …g6 (shredding the light squares Black's …f5 already loosened), and Qxd5 wins the pawn straight back. After Qxd8+ the queens come off and you're simply better — a healthy structure against Black's wrecked kingside.",
    sayShort: '…d5 — Qh5+ then Qxd5 regains it.',
  },
  beats: [
    { atMove: 8, say: "Qxd5 — the gambit pawn is back, and Qxd8+ next trades queens into an ending where your structure is clean and Black's …f5-…g6 kingside is full of holes. The Staunton's investment pays off with no risk at all.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// Bg5 line, …e6.  d4 f5 e4 fxe4 Nc3 Nf6 Bg5 e6 Nxe4 Be7 Bxf6 Bxf6 c3 O-O Nf3 Nc6 h4
const STAUNTON_E6: SN = {
  intro: {
    say: "…e6 — Black returns the pawn to develop solidly. That's fine by you: Nxe4 regains it immediately, and the Staunton has done its job — you have a lead in development, the half-open f-file, and the lingering weakness of Black's …f5 to work against. Pure attacking compensation, pawn already recovered.",
    sayShort: '…e6 — Nxe4 regains it, you lead.',
  },
  beats: [
    { atMove: 8, say: "Nxe4 — the pawn's back and the gambit was really just development bait. You stand with the freer pieces, the open f-file pointing at f7, and Black's loosened kingside to target. The Staunton paid for itself.", highlights: [H('e4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// Bg5 lines where Black holds e4 — White strikes its base with f3.
// …g6: d4 f5 e4 fxe4 Nc3 Nf6 Bg5 g6 f3   |   …c6: …Bg5 c6 f3
const STAUNTON_F3: SN = {
  intro: {
    say: "Black hangs onto the e4-pawn, so undermine it at the base: f3. The whole Staunton idea is that the extra pawn is a liability — once you play f3 and the centre clears, you regain it with a lead in development, the open f-file aimed at f7, and Black's …f5-weakened kingside to attack. The pawn was never the point.",
    sayShort: 'Hold the pawn? — f3 wins it back.',
  },
  beats: [
    { atMove: 8, say: "f3 — striking the e4-pawn at its base. As the centre opens you'll round the pawn back up with your pieces already developed and the f-file pointing at Black's king. The Staunton gambit collects its investment with interest.", highlights: [H('e4', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// Bg5 line, …Nc6.  d4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qe2 Nf7 Bxf6 exf6 Nxe4
const STAUNTON_NC6: SN = {
  intro: {
    say: "…Nc6 develops but ignores the e4-pawn's fate. Punish the loose play: d5 kicks the knight with gain of tempo, and after the trades Nxe4 simply restores material. You come out with more space, the bishop pair traded into a lead, and the open f-file — a clean Staunton dividend.",
    sayShort: '…Nc6 — d5 kicks, Nxe4 regains.',
  },
  beats: [
    { atMove: 8, say: "d5 — shoving the c6-knight offside with tempo before you scoop the e4-pawn back. …Nc6 spent a move on a piece that now has to retreat, and you convert the time into the better game.", highlights: [H('d5', ATK)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};

// ── anti-Englund (student WHITE) — the 1…e5 gambit refuted by a big centre.
// Shared var-0 spine: d4 e5 dxe5 Nc6 Nf3 Qe7 Nc3 Nxe5 e4  (Black's move 9+ varies)
const ANTI_ENGLUND: SN = {
  intro: {
    say: "1…e5 — the Englund Gambit, an unsound bid for cheap tricks. You grabbed the pawn with dxe5 and now just develop classically: Nf3, Nc3, and a broad e4-centre. Black scrambles to win the pawn back, but his queen is stranded on e7 and his pieces are loose — whatever he throws at you here, you come out with the centre, the development lead, and a clearly better game.",
    sayShort: 'Englund refuted — build the e4 centre.',
  },
  beats: [
    { atMove: 8, say: "e4 — the refutation in a single move. Black has clawed the pawn back, but you've planted a broad centre with the knight on c3 behind it and a clean lead in development, while his queen still languishes on e7. The Englund's tricks are spent; you are simply better.", highlights: [H('e4', KEY), H('e7', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};

// ── anti-Benoni push (student WHITE) — meet …c5 with d5, the space bind.
//    Every line runs through d5@4. ──
const ANTI_BENONI: SN = {
  intro: { say: "…c5 — Black heads for a Benoni. You answer with d5, seizing space instead of allowing equality. That advanced pawn is the engine of your whole edge: it cramps Black for the rest of the game while you brace it with e4 and develop Nc3, Nf3, Be2. If he lashes out with the Benko …b5, you can grab it or decline — the wedge and your space tell either way.", sayShort: '…c5 — answer d5, bind the space.' },
  beats: [
    { atMove: 4, say: "d5 — the space-grabbing advance. You decline the symmetrical game and push, and this wedge cramps Black's whole position. Back it with e4, develop naturally, and squeeze — the Benoni is sharp, but the space is yours.", highlights: [H('d5', ATK)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};

// ── anti-London (student BLACK) — hit the loose b2, seize the initiative.
//    Every line shares …c5@3. ──
// ── anti-QGD Exchange (student WHITE) — Carlsbad + minority attack.
//    Every line shares cxd5@4. ──
const ANTI_QGD_X: SN = {
  intro: { say: "cxd5 — the Exchange QGD, steering into the Carlsbad structure. Your plan is the textbook minority attack: roll b4-b5 to crack open the c6-pawn and saddle Black with a lasting weakness, while Bf4/Bg5 and Nge2 hold the centre. A clean, low-risk way to grind for the win.", sayShort: 'cxd5 — Carlsbad; minority attack b4-b5.' },
  beats: [
    { atMove: 4, say: "cxd5 — entering the Carlsbad. After …exd5 the structure is fixed and your plan is set: b4-b5 to undermine c6, leaving Black a weak pawn to besiege. Slow, safe, and one of the most reliable winning tries against the QGD.", highlights: [H('c6', KEY)] },
  ],
  sources: ['concept:pawn-minority-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};

// ── anti-Catalan (student BLACK) — Open Catalan: grab c4 and hold it. ──
const ANTI_CATALAN: SN = {
  intro: { say: "g3 — the Catalan, planning to rule the long light diagonal with Bg2. Take the gambit pawn with …dxc4 and don't rush to give it back: …a6 and …b5 hold it, making White prove his compensation. The Bg2 bishop's pressure is real, but with the pawn in hand and a solid setup Black is comfortably fine.", sayShort: '…dxc4 — grab it, hold with …a6/…b5.' },
  beats: [
    { atMove: 7, say: "…dxc4 — the Open Catalan. You grab the c4-pawn and prepare …a6 and …b5 to keep it, forcing White to demonstrate real compensation for the diagonal. No need to be generous — make him work for the pawn back.", highlights: [H('c4', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// Bb4+ Ragozin (3.Nf3 … Bg5 Bb4+) and Nimzo (3.Nc3 Bb4) move orders.
const ANTI_CAT_NF3: SN = {
  intro: { say: "Nf3 — White delays the fianchetto. Answer …d5 and, after Bg5, the useful …Bb4+: you check and develop, then trade or hold the pin, steering into a sound Ragozin-flavoured structure where Black equalises comfortably and the light-square fight is even.", sayShort: '…d5 then …Bb4+ — sound and equal.' },
  beats: [
    { atMove: 7, say: "…Bb4+ — checking and developing in one. White must block, and you'll either trade the bishop for the knight or keep the pin; either way you reach a comfortable Ragozin where the centre is contested and Black is fine.", highlights: [H('c3', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const ANTI_CAT_NC3: SN = {
  intro: { say: "Nc3 — this transposes to a Nimzo-Indian. Answer …Bb4, pinning the knight that guards e4 and fighting for the central light square. Trade it to wreck White's c-pawns or hold the pin — a comfortable, well-charted equality, the Catalan defused.", sayShort: 'Nc3 — Nimzo: pin with …Bb4.' },
  beats: [
    { atMove: 5, say: "…Bb4 — the Nimzo pin. The bishop nails the c3-knight, e4's defender, and you contest the centre at once. Trade for the doubled c-pawns or keep squeezing the pin — either road is comfortable for Black.", highlights: [H('c3', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};

// ── anti-Nimzo Qc2 (Classical / Capablanca, student WHITE) ──────────────────
// Spine: d4 Nf6 c4 e6 Nc3 Bb4 Qc2. The whole point of Qc2 is that if Black ever
// plays …Bxc3+, the QUEEN recaptures — no doubled c-pawns, and White banks the
// bishop pair with a clean structure. Board-verified vs course-sublines.json.
const NIMZO_WIKI = 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence';

// 5…d5 — Black leaves the Nimzo for the Ragozin; Bg5 pin nets a clean pawn.
const NQ_RAGOZIN: SN = {
  intro: {
    say: "…d5 leaves the Nimzo for the Ragozin — Black pins your c3-knight to lean on the centre. Answer with Bg5, a pin of your own on the f6-knight. The forcing trades that follow hand you an extra, healthy pawn while Black's kingside is left shattered with doubled f-pawns.",
    sayShort: '…d5 Ragozin — Bg5, win a pawn.',
  },
  beats: [
    { atMove: 6, say: "Bg5 develops with a pin of its own: the f6-knight is tied to the d8-queen down the diagonal, so Black can no longer comfortably prop up d5.", arrows: [A('g5', 'f6')], highlights: [H('f6', KEY)] },
    { atMove: 12, say: "Take the pinned knight. After the queenside trades, Black must recapture with …gxf6 — splitting the kingside into permanently doubled, weak pawns.", highlights: [H('f6', ATK)] },
    { atMove: 16, say: "The king sits safely on e2: no enemy minor pieces remain to harass it, and you own the open b- and c-files plus a clean extra pawn.", highlights: [H('e2', KEY)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:tac-pin', NIMZO_WIKI],
};

// 7…d5 — transposes to a QGD/Carlsbad; quiet space edge, Bb2 + c-file.
const NQ_D5: SN = {
  intro: {
    say: "…d5 steers into a Queen's Gambit Declined structure — solid but passive. Keep your pieces harmonious, fianchetto the dark bishop to b2 behind the centre, and grind on the half-open c-file with a lasting space advantage.",
    sayShort: '…d5 — QGD: Bb2 and the c-file.',
  },
  beats: [
    { atMove: 12, say: "Release the tension. After …exd5 Black holds the slightly loose Carlsbad centre, and the c-file opens up for your rooks to work.", highlights: [H('d5', KEY)] },
    { atMove: 22, say: "The bishop swings to b2, lining up on the long diagonal behind the knight — once that knight steps aside, the diagonal points straight at Black's king.", highlights: [H('b2', KEY)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-open-file', NIMZO_WIKI],
};

// 7…c5 (and the 9…Bxc5 move-order) — dxc5, then a3/b4 with tempo + e4 centre.
const NQ_C5: SN = {
  intro: {
    say: "…c5 strikes at your centre, but dxc5 and the recapture …Bxc5 just gain you time: that bishop becomes a target for a3 and b4, you plant a pawn on e4, and your smoother development leaves you comfortably better.",
    sayShort: '…c5 — dxc5, then a3-b4 with tempo.',
  },
  beats: [
    { atMove: 8, say: "Take the pawn. Black recaptures with the bishop, but that piece is now a hook for a3 and a later b4.", highlights: [H('c5', KEY)] },
    { atMove: 14, say: "a3 prepares b4 — gaining queenside space and nudging the c5-bishop back to a passive square.", highlights: [H('c5', ATK)] },
    { atMove: 22, say: "Development complete, e4 stakes out the full centre. Your pieces are ready and Black has no real counterplay.", highlights: [H('e4', KEY)] },
  ],
  sources: ['concept:pos-tempo', 'concept:pos-center', NIMZO_WIKI],
};

// 5…c5 — a Benoni try; d5 clamps, active bishops on c4/h6.
const NQ_C5_5: SN = {
  intro: {
    say: "…c5 invites a Benoni. Push d5 to clamp the centre on your terms; the advanced d-pawn and your active bishops give you a durable space advantage and pressure on Black's king.",
    sayShort: '…c5 — d5 clamps the centre.',
  },
  beats: [
    { atMove: 6, say: "d5 gains space and fixes the centre your way — Black's …exd5 only opens lines for your better-placed pieces.", highlights: [H('d5', KEY)] },
    { atMove: 16, say: "Bc4 takes aim from behind, supporting the d5-pawn and preparing to prise open the centre.", highlights: [H('c4', KEY), H('d5', SOFT)] },
    { atMove: 22, say: "Bh6 plants beside Black's king, hitting the weak dark squares around g7 that …g6 left behind.", highlights: [H('h6', KEY), H('g7', ATK)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', NIMZO_WIKI],
};

// 7…d6 — a modest setup; the Na4 manoeuvre nets the bishop pair.
const NQ_D6: SN = {
  intro: {
    say: "…d6 is a restrained, modest setup. Steer for the bishop pair: after …c5, the Na4 manoeuvre swaps off Black's dark-squared bishop, leaving you two bishops and the more pleasant game.",
    sayShort: '…d6 — Na4 nets the bishop pair.',
  },
  beats: [
    { atMove: 14, say: "Na4 targets the c5-bishop — Black's most active piece — to win the bishop pair.", arrows: [A('a4', 'c5')], highlights: [H('c5', KEY)] },
    { atMove: 16, say: "Take the bishop. With two bishops against bishop and knight, patiently open the position to give them scope.", highlights: [H('c5', ATK)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-prophylaxis', NIMZO_WIKI],
};

// 7…Nc6 — blocks Black's own c-pawn; a3 wins the pair, then opposite-side storm.
const NQ_NC6: SN = {
  intro: {
    say: "…Nc6 blocks Black's own c-pawn — an awkward square for it. Play a3 to win the bishop pair after …Bxc3, castle queenside, and roll the kingside pawns with g4 while Black's break crawls.",
    sayShort: '…Nc6 — a3, take the pair, g4 storm.',
  },
  beats: [
    { atMove: 12, say: "a3 forces the question: Black retreats or trades on c3, handing you the bishop pair either way.", highlights: [H('b4', KEY)] },
    { atMove: 16, say: "Castle queenside, into the attack — with the bishops aimed at the kingside, g4-g5 will come crashing through.", highlights: [H('c1', KEY)] },
    { atMove: 22, say: "g4 launches the storm; Black's …e5 and …a5 are too slow to race your kingside avalanche.", highlights: [H('g4', ATK)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:att-kingside-storm', NIMZO_WIKI],
};

// 7…b6 — swap-and-pressure-e4 plan; e4 centre, doubled c-pawns but f4-f5 attack.
const NQ_B6: SN = {
  intro: {
    say: "…b6 prepares …Bxc3 and pressure on e4 from b7. Let it happen: e4 builds a broad centre, and though you accept doubled c-pawns, the bishop pair plus a quick f4-e5-f5 storm gives you a powerful kingside initiative.",
    sayShort: '…b6 — e4 centre, f4-f5 storm.',
  },
  beats: [
    { atMove: 8, say: "e4 grabs the whole centre at once — the Qc2 dividend: the e-pawn rolls up unhindered by any pin.", highlights: [H('e4', KEY)] },
    { atMove: 12, say: "Bd3 backs the e4-pawn and points at the kingside, the front piece of your two-bishop attacking battery.", highlights: [H('d3', KEY)] },
    { atMove: 22, say: "f5 tears open lines as Black castles into the other wing — your attack simply arrives first.", highlights: [H('f5', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:att-kingside-storm', NIMZO_WIKI],
};

// 7…O-O — the main line; e4 then e5 with a big-centre clamp.
const NQ_OO: SN = {
  intro: {
    say: "…O-O is the main line. Grab the centre with e4; after …d5 e5 the knight is kicked to e4 and you build a big space advantage. The play is sharp — keep your bishops active and target the kingside that …c5 leaves loose.",
    sayShort: '…O-O — e4, e5, big-centre clamp.',
  },
  beats: [
    { atMove: 8, say: "e4 takes the centre — once more the Qc2 point, the e-pawn striding forward without pin worries.", highlights: [H('e4', KEY)] },
    { atMove: 10, say: "e5 gains space and drives the f6-knight to e4 — active-looking, but a piece you can challenge at leisure.", highlights: [H('e5', KEY)] },
    { atMove: 18, say: "Bf4 develops behind the e5-spearhead, eyeing the dark squares near Black's king; the bishops are your trumps in the melee.", highlights: [H('f4', KEY)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', NIMZO_WIKI],
};

// 9…Na6 (after 7…c5 8.dxc5) — rim knight; fianchetto + bishop pair.
const NQ_NA6: SN = {
  intro: {
    say: "…Na6 regains the c5-pawn but parks the knight on the rim. Fianchetto with g3 and Bg2: you bank the bishop pair when Black trades on c3, and the g2-bishop rakes the long light diagonal against Black's centre.",
    sayShort: '…Na6 — g3, Bg2, take the pair.',
  },
  beats: [
    { atMove: 10, say: "g3 prepares the fianchetto — the bishop belongs on g2, bearing down the long light-squared diagonal.", highlights: [H('g2', KEY)] },
    { atMove: 12, say: "Bg2 rakes the open diagonal to b7; with the bishop pair coming, the light squares belong to you.", arrows: [A('g2', 'b7')], highlights: [H('b7', ATK)] },
    { atMove: 14, say: "a3 invites …Bxc3, when Qxc3 keeps the pawns intact and leaves you the two bishops.", highlights: [H('b4', KEY)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pawn-fianchetto', NIMZO_WIKI],
};

// 9…Qc7 (after 7…c5 8.dxc5) — queen regains the pawn slowly; develop and dominate.
const NQ_QC7: SN = {
  intro: {
    say: "…Qc7 wins the c5-pawn back with the queen, but at the cost of time. Just develop: a3 hits the bishop, e4 claims the centre, and your lead in development leaves you comfortably better while Black scrambles to catch up.",
    sayShort: '…Qc7 — develop fast, claim the centre.',
  },
  beats: [
    { atMove: 10, say: "a3 questions the b4-bishop with tempo, before Black is anywhere near organised.", highlights: [H('b4', KEY)] },
    { atMove: 12, say: "e4 seizes the full centre — your pieces flow out while the queen sortie cost Black development.", highlights: [H('e4', KEY)] },
    { atMove: 16, say: "Bg5 pressures the f6-knight and completes your development; the better-coordinated side stands clearly better here.", arrows: [A('g5', 'f6')], highlights: [H('f6', ATK)] },
  ],
  sources: ['concept:pos-tempo', 'concept:pos-development', NIMZO_WIKI],
};

export const SUBLINE_NARRATION_HELP_B: Record<string, SN> = {
  // anti-Nimzo Qc2 (Classical / Capablanca) — student WHITE, 10 lines / 24 keys
  'anti-nimzo-qc2::0::d5@5': NQ_RAGOZIN, 'anti-nimzo-qc2::1::d5@5': NQ_RAGOZIN, 'anti-nimzo-qc2::2::d5@5': NQ_RAGOZIN,
  'anti-nimzo-qc2::0::d5@7': NQ_D5, 'anti-nimzo-qc2::2::d5@7': NQ_D5,
  'anti-nimzo-qc2::0::c5@7': NQ_C5, 'anti-nimzo-qc2::1::c5@7': NQ_C5, 'anti-nimzo-qc2::2::Bxc5@9': NQ_C5,
  'anti-nimzo-qc2::0::c5@5': NQ_C5_5, 'anti-nimzo-qc2::1::c5@5': NQ_C5_5, 'anti-nimzo-qc2::2::c5@5': NQ_C5_5,
  'anti-nimzo-qc2::0::d6@7': NQ_D6, 'anti-nimzo-qc2::1::d6@7': NQ_D6, 'anti-nimzo-qc2::2::d6@7': NQ_D6,
  'anti-nimzo-qc2::0::Nc6@7': NQ_NC6, 'anti-nimzo-qc2::1::Nc6@7': NQ_NC6, 'anti-nimzo-qc2::2::Nc6@7': NQ_NC6,
  'anti-nimzo-qc2::0::b6@7': NQ_B6, 'anti-nimzo-qc2::1::b6@7': NQ_B6, 'anti-nimzo-qc2::2::b6@7': NQ_B6,
  'anti-nimzo-qc2::1::O-O@7': NQ_OO, 'anti-nimzo-qc2::2::O-O@7': NQ_OO,
  'anti-nimzo-qc2::2::Na6@9': NQ_NA6,
  'anti-nimzo-qc2::2::Qc7@9': NQ_QC7,
  // anti-Catalan — Open Catalan dxc4@7 (12) + Ragozin/Nimzo transpositions (4)
  'anti-catalan-black::0::Nf3@6': ANTI_CATALAN, 'anti-catalan-black::0::Ne5@10': ANTI_CATALAN, 'anti-catalan-black::0::Qa4+@8': ANTI_CATALAN, 'anti-catalan-black::0::a4@10': ANTI_CATALAN,
  'anti-catalan-black::1::Nf3@6': ANTI_CATALAN, 'anti-catalan-black::1::Nf3@8': ANTI_CATALAN, 'anti-catalan-black::1::Nf3@10': ANTI_CATALAN, 'anti-catalan-black::1::Nd2@10': ANTI_CATALAN, 'anti-catalan-black::1::Be3@12': ANTI_CATALAN, 'anti-catalan-black::1::Qd3@12': ANTI_CATALAN, 'anti-catalan-black::1::Nf3@12': ANTI_CATALAN, 'anti-catalan-black::1::Nc3@10': ANTI_CATALAN,
  'anti-catalan-black::0::Nf3@4': ANTI_CAT_NF3, 'anti-catalan-black::1::Nf3@4': ANTI_CAT_NF3,
  'anti-catalan-black::0::Nc3@4': ANTI_CAT_NC3, 'anti-catalan-black::1::Nc3@4': ANTI_CAT_NC3,
  // anti-London (all share …c5@3)
  // anti-QGD Exchange (all share cxd5@4)
  'anti-qgd-exchange::0::c6@7': ANTI_QGD_X, 'anti-qgd-exchange::0::Qxd5@5': ANTI_QGD_X, 'anti-qgd-exchange::0::Bb4@7': ANTI_QGD_X, 'anti-qgd-exchange::0::c5@7': ANTI_QGD_X, 'anti-qgd-exchange::0::Be6@7': ANTI_QGD_X, 'anti-qgd-exchange::0::Nf6@5': ANTI_QGD_X, 'anti-qgd-exchange::0::Nc6@7': ANTI_QGD_X, 'anti-qgd-exchange::0::Be7@9': ANTI_QGD_X, 'anti-qgd-exchange::0::h6@11': ANTI_QGD_X, 'anti-qgd-exchange::0::Bf5@11': ANTI_QGD_X,
  'anti-qgd-exchange::1::c6@7': ANTI_QGD_X, 'anti-qgd-exchange::1::Qxd5@5': ANTI_QGD_X, 'anti-qgd-exchange::1::Bb4@7': ANTI_QGD_X, 'anti-qgd-exchange::1::c5@7': ANTI_QGD_X, 'anti-qgd-exchange::1::Be6@7': ANTI_QGD_X, 'anti-qgd-exchange::1::Nf6@5': ANTI_QGD_X, 'anti-qgd-exchange::1::Nc6@7': ANTI_QGD_X, 'anti-qgd-exchange::1::c6@9': ANTI_QGD_X, 'anti-qgd-exchange::1::Bb4@9': ANTI_QGD_X, 'anti-qgd-exchange::1::Nbd7@9': ANTI_QGD_X,
  // anti-Benoni push — every line shares d5@4
  'anti-benoni-push::0::d6@13': ANTI_BENONI, 'anti-benoni-push::0::e6@5': ANTI_BENONI, 'anti-benoni-push::0::Bg7@13': ANTI_BENONI, 'anti-benoni-push::0::g6@5': ANTI_BENONI, 'anti-benoni-push::0::e5@5': ANTI_BENONI, 'anti-benoni-push::0::Bxa6@9': ANTI_BENONI, 'anti-benoni-push::0::d6@5': ANTI_BENONI, 'anti-benoni-push::0::Bg7@11': ANTI_BENONI, 'anti-benoni-push::0::e6@9': ANTI_BENONI,
  'anti-benoni-push::1::Be7@11': ANTI_BENONI, 'anti-benoni-push::1::d6@7': ANTI_BENONI, 'anti-benoni-push::1::a6@11': ANTI_BENONI, 'anti-benoni-push::1::Nbd7@11': ANTI_BENONI, 'anti-benoni-push::1::a6@7': ANTI_BENONI, 'anti-benoni-push::1::Bg4@11': ANTI_BENONI, 'anti-benoni-push::1::Be7@7': ANTI_BENONI, 'anti-benoni-push::1::Qa5@11': ANTI_BENONI, 'anti-benoni-push::1::b5@5': ANTI_BENONI, 'anti-benoni-push::1::g6@5': ANTI_BENONI,
  'anti-benoni-push::2::b5@5': ANTI_BENONI, 'anti-benoni-push::2::e6@5': ANTI_BENONI, 'anti-benoni-push::2::e5@5': ANTI_BENONI, 'anti-benoni-push::2::d6@5': ANTI_BENONI, 'anti-benoni-push::2::d6@7': ANTI_BENONI, 'anti-benoni-push::2::O-O@9': ANTI_BENONI, 'anti-benoni-push::2::d6@9': ANTI_BENONI, 'anti-benoni-push::2::e6@9': ANTI_BENONI, 'anti-benoni-push::2::a6@9': ANTI_BENONI, 'anti-benoni-push::2::Qa5@9': ANTI_BENONI,
  // anti-Englund (var-0 e4-centre cluster)
  'anti-englund::0::Nxf3+@9': ANTI_ENGLUND,
  'anti-englund::0::Nf6@9': ANTI_ENGLUND,
  'anti-englund::0::d6@9': ANTI_ENGLUND,
  'anti-englund::0::Nc6@9': ANTI_ENGLUND,
  'anti-englund::0::Nf6@11': ANTI_ENGLUND,
  'anti-englund::0::d6@11': ANTI_ENGLUND,
  'anti-englund::0::d5@11': ANTI_ENGLUND,
  'anti-englund::0::Nxf3+@11': ANTI_ENGLUND,
  'anti-englund::0::g6@11': ANTI_ENGLUND,
  'anti-englund::0::h6@11': ANTI_ENGLUND,
  // anti-Budapest
  'anti-budapest::0::g5@7': AB_G5,
  'anti-budapest::2::g5@7': AB_G5,
  'anti-budapest::0::Bb4+@7': AB_BB4,
  'anti-budapest::1::Bb4+@7': AB_BB4,
  'anti-budapest::1::Nc6@7': AB_NC6,
  'anti-budapest::2::Nc6@7': AB_NC6,
  'anti-budapest::1::Nc6@9': AB_G5,
  'anti-budapest::0::Ne4@5': AB_NE4,
  'anti-budapest::1::Ne4@5': AB_NE4,
  'anti-budapest::2::Ne4@5': AB_NE4,
  // Albin Counter-Gambit — move-14 tabiya cluster (all var 0)
  'albin-countergambit::0::Nbd2@14': ALBIN_TABIYA,
  'albin-countergambit::0::a3@14': ALBIN_TABIYA,
  'albin-countergambit::0::Qa4@14': ALBIN_TABIYA,
  'albin-countergambit::0::Bf4@14': ALBIN_TABIYA,
  'albin-countergambit::0::Bg5@14': ALBIN_TABIYA,
  'albin-countergambit::0::b3@14': ALBIN_TABIYA,
  'albin-countergambit::0::Re1@14': ALBIN_TABIYA,
  // Staunton Gambit vs Dutch
  'anti-dutch-staunton::0::d5@5': STAUNTON_D5,
  'anti-dutch-staunton::1::d5@5': STAUNTON_D5,
  'anti-dutch-staunton::2::d5@5': STAUNTON_D5,
  'anti-dutch-staunton::0::e6@7': STAUNTON_E6,
  'anti-dutch-staunton::1::e6@7': STAUNTON_E6,
  'anti-dutch-staunton::2::e6@7': STAUNTON_E6,
  'anti-dutch-staunton::0::g6@7': STAUNTON_F3,
  'anti-dutch-staunton::2::g6@7': STAUNTON_F3,
  'anti-dutch-staunton::0::c6@7': STAUNTON_F3,
  'anti-dutch-staunton::1::c6@7': STAUNTON_F3,
  'anti-dutch-staunton::1::Nc6@7': STAUNTON_NC6,
  'anti-dutch-staunton::2::Nc6@7': STAUNTON_NC6,
};
