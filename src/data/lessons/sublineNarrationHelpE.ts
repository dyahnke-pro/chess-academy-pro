import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration as SN } from '../../services/sublineLesson';

// HELPER E (oversight session took over after the KID/Grünfeld session hit an
// API error, David 2026-06-18) — Queen's Indian Defence deep sub-tries, OVERRIDE
// LAYER (spread after D4Flank → deeper teach-past versions win, zero collision).
// STUDENT = BLACK. Every line board-verified vs course-sublines.json from a
// ground-truth ply-by-ply dump (G3). The QID bargain: …b6 and …Bb7 (or …Ba6 to
// hit c4) clamp the e4-square and the long diagonal; Black equalises with the
// …d5 break, the …Ne4 simplification, or the …c5 strike, then plays for the
// minutely better structure.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
const QID_WIKI = 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense';

// Fianchetto, White Nc3 — the …Ne4 simplification neutralises everything.
const QID_NC3_SIMPL: SN = {
  intro: {
    say: "Nc3 eyes e4 and d5, so contest it the classic Queen's Indian way: …Ne4! From there you trade pieces down — the knight, then the light-squared bishops on g2 — and reach a rock-solid, fully equal position where …Bf6 leans on White's d4-pawn.",
    sayShort: '…Ne4 — simplify to equality.',
  },
  beats: [
    { atMove: 11, say: "…Ne4 is the thematic simplifier: the knight seizes e4 and invites trades that defuse White's setup.", highlights: [H('e4', KEY)] },
    { atMove: 19, say: "…Bxg2 trades off White's powerful fianchetto bishop, removing the main attacker on the long diagonal.", highlights: [H('g2', ATK)] },
    { atMove: 23, say: "…Bf6 settles on the long diagonal, training on the d4-pawn — the position is dead level and easy to play.", arrows: [A('f6', 'd4')], highlights: [H('d4', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', QID_WIKI],
};

// Fianchetto, White Re1 — the …d5 freeing break.
const QID_RE1_D5: SN = {
  intro: {
    say: "Re1 readies e4, so strike first with …d5 — the freeing break that solves Black's game. After the central exchanges, …Nbd7 and …Ne4 give your pieces fine squares and full equality.",
    sayShort: '…d5 — the freeing break.',
  },
  beats: [
    { atMove: 13, say: "…d5 contests the centre before White can play e4 — the standard equaliser in these fianchetto lines.", highlights: [H('d5', KEY)] },
    { atMove: 17, say: "…Nbd7 develops harmoniously, supporting the coming …Ne4 jump.", highlights: [H('d7', KEY)] },
    { atMove: 19, say: "…Ne4 plants the knight on a strong central square, fully equalising.", highlights: [H('e4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// Fianchetto, mass trades, White Bf4 — trade dark bishops via …Bd6.
const QID_BF4_18: SN = {
  intro: {
    say: "After the heavy exchanges on d5, Bf4 tries to keep an edge — but …Bd6 challenges it head-on, and trading the dark-squared bishops leaves a symmetrical, dead-equal position you hold comfortably.",
    sayShort: '…Bd6, …Bxf4 — trade to equality.',
  },
  beats: [
    { atMove: 19, say: "…Bd6 challenges the f4-bishop directly, offering the trade that kills White's last try for an edge.", highlights: [H('d6', KEY)] },
    { atMove: 21, say: "…Bxf4 trades the dark-squared bishops, simplifying into a balanced position.", highlights: [H('f4', ATK)] },
    { atMove: 23, say: "…Na6 develops toward c5 or b4; your pieces are active and the game is level.", highlights: [H('a6', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', QID_WIKI],
};

// Fianchetto, trades, White Re1 — …Be4 seizes the diagonal, …Qd5 centralises.
const QID_RE1_18: SN = {
  intro: {
    say: "When White plays Re1 after the d5-trades, grab the diagonal that defines the Queen's Indian: …Be4 dominates the long light squares, …Nc6 develops with pressure on d4, and …Qd5 centralises for complete equality.",
    sayShort: '…Be4, …Nc6, …Qd5 central.',
  },
  beats: [
    { atMove: 19, say: "…Be4 seizes the long diagonal, planting the bishop on a commanding central square.", highlights: [H('e4', KEY)] },
    { atMove: 21, say: "…Nc6 develops with pressure on the d4-pawn — White's only central foothold.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 23, say: "…Qd5 centralises the queen, eyeing both wings; Black is fully equal with the more active pieces.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-open-file', QID_WIKI],
};

// Fianchetto, White d5 push — …exd5/…c6 undermine, regroup, …Bf6 long diagonal.
const QID_D5_12: SN = {
  intro: {
    say: "d5 grabs space but commits the centre. Take with …exd5, undermine with …c6, and regroup your knight; once the dust settles, …Bf6 commands the long diagonal and White's advanced pawn has become a target rather than a strength.",
    sayShort: '…exd5, …c6 undermine.',
  },
  beats: [
    { atMove: 13, say: "…exd5 accepts the challenge and opens the e-file; White's space melts once the pawn is exchanged.", highlights: [H('d5', KEY)] },
    { atMove: 15, say: "…c6 strikes at the d5-pawn's base, the standard lever against an advanced centre pawn.", highlights: [H('c6', KEY), H('d5', SOFT)] },
    { atMove: 23, say: "…Bf6 takes the long diagonal, pressuring the centre — Black has equalised comfortably.", highlights: [H('f6', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-chain', QID_WIKI],
};

// Petrosian (a3/Nc3) with Bg5 — solid …Be7, trade down to equality.
const QID_PETRO_BG5: SN = {
  intro: {
    say: "In the Petrosian System with a3, Bg5 pins toward your queen. Answer solidly: …Be7 breaks the pin, you castle, and the exchanges on d5 and e7 leave you with the excellent …Bd5 bishop and a comfortable, equal game.",
    sayShort: '…Be7, trade to equality.',
  },
  beats: [
    { atMove: 11, say: "…Be7 calmly breaks the pin and prepares to castle — no need for loosening moves.", highlights: [H('e7', KEY)] },
    { atMove: 15, say: "…Nxd5 recaptures in the centre, inviting the simplifying trades that suit Black.", highlights: [H('d5', KEY)] },
    { atMove: 19, say: "…Bxd5 leaves the bishop superbly placed on the long diagonal — Black is fully equal.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', QID_WIKI],
};

// Petrosian, e3 — …Nxc3 doubles the pawns, …c5 break, …Qc7 pressure.
const QID_PETRO_E3: SN = {
  intro: {
    say: "With the modest e3, White keeps things solid — so damage the structure: …Nxc3 saddles White with doubled c-pawns, then …c5 strikes the centre and …Qc7 trains on the weakened queenside. A clear long-term target for Black.",
    sayShort: '…Nxc3, …c5, …Qc7 vs pawns.',
  },
  beats: [
    { atMove: 13, say: "…Nxc3 inflicts doubled c-pawns — the permanent structural weakness you'll work against.", highlights: [H('c3', ATK)] },
    { atMove: 19, say: "…c5 strikes at the centre, opening lines toward White's compromised pawns.", highlights: [H('c5', KEY)] },
    { atMove: 21, say: "…Qc7 lines up on the c-file, pressuring the doubled pawns once the centre clears.", highlights: [H('c7', KEY), H('c3', SOFT)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-center', QID_WIKI],
};

// Petrosian, Bd2 — …Be7/…Nxc3/…c5 with active play.
const QID_PETRO_BD2: SN = {
  intro: {
    say: "Bd2 quietly recaptures, but you keep the initiative: …Be7 develops, …Nxc3 doubles the pawns, and …c5 strikes the centre — after the exchanges your active pieces and White's weak pawns leave you comfortably placed.",
    sayShort: '…Be7, …Nxc3, …c5 active.',
  },
  beats: [
    { atMove: 13, say: "…Be7 develops smoothly and prepares to castle into safety.", highlights: [H('e7', KEY)] },
    { atMove: 17, say: "…Nxc3 doubles White's pawns, fixing a structural weakness to target.", highlights: [H('c3', ATK)] },
    { atMove: 19, say: "…c5 strikes the centre; the position opens to the benefit of your better structure.", highlights: [H('c5', KEY)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-center', QID_WIKI],
};

// Petrosian, Qc2 — the immediate …c5 counter, …Ne4 strong knight.
const QID_PETRO_QC2: SN = {
  intro: {
    say: "Qc2 defends c4 and eyes the centre, so hit back at once with …c5! After the exchanges you develop naturally and post …Ne4 on a strong central square — a comfortable, balanced middlegame with no weaknesses.",
    sayShort: '…c5 counter, …Ne4 outpost.',
  },
  beats: [
    { atMove: 11, say: "…c5 strikes at d4 immediately, contesting the centre before White consolidates.", highlights: [H('c5', KEY)] },
    { atMove: 21, say: "…Ne4 plants the knight on a strong central outpost, fully equalising.", highlights: [H('e4', KEY)] },
    { atMove: 23, say: "…Ndf6 reinforces the e4-knight and completes a harmonious setup.", highlights: [H('f6', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', QID_WIKI],
};

// Petrosian (a3) with Bf4 — …Nh5 challenges the bishop, then …d5/…c5.
const QID_BF4_8: SN = {
  intro: {
    say: "An early Bf4 eyes c7, so challenge it straight away: …Nh5 hits the bishop and forces it back, after which the standard …d5 and …c5 breaks give Black a free, equal game.",
    sayShort: '…Nh5 hits the bishop.',
  },
  beats: [
    { atMove: 9, say: "…Nh5 attacks the f4-bishop, forcing it to a worse square and gaining a tempo.", arrows: [A('h5', 'f4')], highlights: [H('f4', ATK)] },
    { atMove: 15, say: "…d5 contests the centre, the reliable equaliser once the bishop is sidelined.", highlights: [H('d5', KEY)] },
    { atMove: 21, say: "…c5 strikes at d4, completing Black's comfortable central counterplay.", highlights: [H('c5', KEY)] },
  ],
  sources: ['concept:pos-tempo', 'concept:pos-center', QID_WIKI],
};

// Nc3-first with Bg5 — …h6 questions, …c5 break, …Ne4 simplify.
const QID_BG5_8: SN = {
  intro: {
    say: "Bg5 pins the f6-knight, so put the question with …h6. Whether the bishop retreats or trades, you follow with …c5 to hit the centre and …Ne4 to simplify into an easy, equal middlegame.",
    sayShort: '…h6, …c5, …Ne4 simplify.',
  },
  beats: [
    { atMove: 11, say: "…h6 questions the g5-bishop, forcing it to declare itself.", highlights: [H('g5', SOFT)] },
    { atMove: 13, say: "…c5 strikes at d4, the standard central counter.", highlights: [H('c5', KEY)] },
    { atMove: 17, say: "…Ne4 simplifies via the central outpost, neutralising White's pieces.", highlights: [H('e4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// Nimzo-QID hybrid (…Bb4+), Nbd2 — …a5 holds the bishop, win the bishop pair.
const QID_NIMZO_NBD2: SN = {
  intro: {
    say: "…Bb4+ borrows a Nimzo idea, and after Nbd2 you keep the bishop with …a5. White's clumsy knight regrouping costs time, you end up with the bishop pair, and …c5 then breaks the centre for the better game.",
    sayShort: '…a5 holds the bishop pair.',
  },
  beats: [
    { atMove: 11, say: "…O-O completes development before resolving the bishop on b4.", highlights: [H('g8', KEY)] },
    { atMove: 13, say: "…a5 secures the b4-bishop, denying White the b4-push and clinging to the bishop pair.", highlights: [H('a5', KEY)] },
    { atMove: 21, say: "…c5 strikes at the centre; with the bishop pair in hand, opening the position favours you.", highlights: [H('c5', KEY)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', QID_WIKI],
};

// Nimzo-QID, Bd2 trade, then Rfe1 — solid …Ne4/…d6 setup.
const QID_NIMZO_RFE1: SN = {
  intro: {
    say: "After …Bb4+ and the trade on d2, this is a solid, time-tested equalising setup: …Ne4 forces simplification, …Nxc3 trades into a clean structure, and …d6 with …Nd7 builds a flexible, rock-solid position. White's edge is nominal.",
    sayShort: '…Ne4, …Nxc3, …d6 solid.',
  },
  beats: [
    { atMove: 15, say: "…Ne4 hits the queen and invites simplification, easing any pressure.", highlights: [H('e4', KEY)] },
    { atMove: 19, say: "…d6 builds the classic solid centre, preparing …Nd7 and …e5 or …c5 breaks.", highlights: [H('d6', KEY)] },
    { atMove: 23, say: "…Re8 contests the e-file, completing a flexible, equal setup.", highlights: [H('e8', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', QID_WIKI],
};

// Nimzo-QID, Bd2 trade, then O-O — …d6/…c5/…cxd4 freeing.
const QID_NIMZO_OO: SN = {
  intro: {
    say: "With the bishops traded on d2, castle and play the freeing plan: …d6 builds the centre, …c5 strikes at d4, and …cxd4 opens the position with …Nc6 to follow. A clean, symmetrical equality.",
    sayShort: '…d6, …c5, …Nc6 free.',
  },
  beats: [
    { atMove: 15, say: "…d6 builds a flexible centre, the foundation of Black's setup.", highlights: [H('d6', KEY)] },
    { atMove: 17, say: "…c5 strikes at d4, the standard freeing break.", highlights: [H('c5', KEY)] },
    { atMove: 21, say: "…Nc6 develops with pressure, completing equality.", highlights: [H('c6', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// Nimzo-QID, Bd2 trade, then b4 — meet queenside space calmly.
const QID_NIMZO_B4: SN = {
  intro: {
    say: "This is the same solid Nimzo-QID structure, and White's b4 grabs queenside space without changing your plan: …Ne4 and …Nxc3 simplify, …d6 anchors the centre, and …Re8 contests the e-file. Black is comfortably equal.",
    sayShort: '…Ne4, …d6, …Re8 equal.',
  },
  beats: [
    { atMove: 15, say: "…Ne4 simplifies, trading pieces to reduce White's space advantage.", highlights: [H('e4', KEY)] },
    { atMove: 19, say: "…d6 anchors the centre and prepares the freeing breaks.", highlights: [H('d6', KEY)] },
    { atMove: 23, say: "…Re8 takes the e-file; Black's position is solid and balanced.", highlights: [H('e8', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// Nimzo-QID, Rad1 — the …f5 kingside expansion plan.
const QID_NIMZO_RAD1: SN = {
  intro: {
    say: "When White centralises with Rad1, reach for active play: …Qe7 reroutes, …f5 grabs kingside space and clamps e4, and …Bxg2 trades off White's fianchetto bishop. Black takes the initiative on the kingside.",
    sayShort: '…Qe7, …f5, …Bxg2 active.',
  },
  beats: [
    { atMove: 23, say: "…Qe7 reroutes the queen, clearing d8 and supporting the coming …f5 advance.", highlights: [H('e7', KEY)] },
    { atMove: 25, say: "…f5 gains kingside space and clamps the e4-square — Black seizes the initiative.", highlights: [H('f5', ATK)] },
    { atMove: 27, say: "…Bxg2 trades off White's strong fianchetto bishop, leaving Black comfortably active.", highlights: [H('g2', ATK)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', QID_WIKI],
};

// Fianchetto …Be7/…Ne4, Bd2 — …Bf6 pressure, …Nxd2 simplify, bishop pair.
const QID_BD2_14: SN = {
  intro: {
    say: "After …Ne4, Bd2 offers to challenge the knight. Respond with …Bf6, pressuring d4; trading …Nxd2 hands you the bishop pair, and …c5 then breaks the centre for an active, slightly preferable game.",
    sayShort: '…Bf6, …Nxd2, …c5.',
  },
  beats: [
    { atMove: 15, say: "…Bf6 trains on the d4-pawn, supporting the e4-knight and eyeing the long diagonal.", arrows: [A('f6', 'd4')], highlights: [H('d4', ATK)] },
    { atMove: 19, say: "…Nxd2 trades to gain the bishop pair — a lasting positional asset.", highlights: [H('d2', KEY)] },
    { atMove: 21, say: "…c5 strikes the centre; with two bishops, opening lines suits Black.", highlights: [H('c5', KEY)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', QID_WIKI],
};

// Fianchetto …Ne4, Nxe4 — mass simplification, …Bxg2, …c5.
const QID_NXE4_14: SN = {
  intro: {
    say: "When White grabs the e4-knight, recapture …Bxe4 and continue the great Queen's Indian simplification: …Bxg2 removes the fianchetto bishop, and …Bf6 with …c5 leaves a balanced, easy position where neither side has any weakness.",
    sayShort: '…Bxe4, …Bxg2, …c5 equal.',
  },
  beats: [
    { atMove: 15, say: "…Bxe4 recaptures on the long diagonal, keeping your grip on the light squares.", highlights: [H('e4', KEY)] },
    { atMove: 17, say: "…Bxg2 trades off White's fianchetto bishop, the key defender of his king.", highlights: [H('g2', ATK)] },
    { atMove: 23, say: "…c5 strikes at the centre, completing comfortable equality.", highlights: [H('c5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', QID_WIKI],
};

// …Ba6 main line, White b3 — …Bb4+ provokes, …d5 central break.
const QID_BA6_B3: SN = {
  intro: {
    say: "…Ba6 hits the c4-pawn, and b3 defends but weakens the long diagonal. Provoke with …Bb4+, redeploy …Be7, and break with …d5 — White's slightly loosened queenside gives Black a comfortable, fully equal game.",
    sayShort: '…Bb4+, …d5 break.',
  },
  beats: [
    { atMove: 9, say: "…Bb4+ checks to provoke a concession before retreating — White's bishop on d2 is passively placed.", highlights: [H('b4', KEY)] },
    { atMove: 15, say: "…d5 contests the centre, the principled break once development is complete.", highlights: [H('d5', KEY)] },
    { atMove: 19, say: "…Re8 takes the e-file, completing a harmonious, equal setup.", highlights: [H('e8', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// …Ba6, White Qc2 — …c5 break with comfortable play.
const QID_BA6_QC2: SN = {
  intro: {
    say: "…Ba6 forces Qc2 to a slightly awkward defence of c4. Retreat …Bb7 onto the long diagonal, strike with …c5, and after dxc5 recapture …Bxc5 — Black is well-developed and comfortably equal.",
    sayShort: '…c5, …Bxc5 comfortable.',
  },
  beats: [
    { atMove: 11, say: "…c5 strikes at d4 immediately, the standard counter to White's centre.", highlights: [H('c5', KEY)] },
    { atMove: 13, say: "…Bxc5 recaptures with an active bishop, eyeing White's kingside.", highlights: [H('c5', KEY)] },
    { atMove: 19, say: "…d6 anchors the centre, completing a sound and balanced position.", highlights: [H('d6', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// …Ba6, White Nbd2 (passive) — …d5/…c5 central play.
const QID_BA6_NBD2: SN = {
  intro: {
    say: "…Ba6 ties White's knight to the passive defence of c4 with Nbd2. Redeploy …Bb7, then roll out the central breaks …d5 and …c5; White's clumsy setup leaves Black with the freer, more comfortable game.",
    sayShort: '…Bb7, …d5, …cxd4.',
  },
  beats: [
    { atMove: 9, say: "…Bb7 redeploys to the long diagonal now that …Ba6 has provoked the awkward Nbd2.", highlights: [H('b7', KEY)] },
    { atMove: 15, say: "…d5 contests the centre, exploiting White's passively-placed pieces.", highlights: [H('d5', KEY)] },
    { atMove: 23, say: "…cxd4 opens the position, where Black's freer development tells.", highlights: [H('d4', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', QID_WIKI],
};

// …Ba6, White Qb3 — …Nc6-a5 harasses the queen, …c5 break.
const QID_BA6_QB3: SN = {
  intro: {
    say: "Qb3 defends c4 from an exposed square. Pounce: …Nc6 hits d4, …Na5 harasses the queen and the c4-pawn, and …c5 breaks the centre. White's queen sortie costs time and Black takes over the initiative.",
    sayShort: '…Nc6, …Na5 hit the queen.',
  },
  beats: [
    { atMove: 9, say: "…Nc6 develops with pressure on d4, the centre's anchor.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 11, say: "…Na5 attacks the b3-queen and the c4-pawn, gaining time and the initiative.", arrows: [A('a5', 'b3')], highlights: [H('b3', ATK)] },
    { atMove: 13, say: "…c5 strikes the centre while White's queen is misplaced.", highlights: [H('c5', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-tempo', QID_WIKI],
};

// …Ba6, White Qa4/O-O — …c5/…cxd4, trade g2 bishop, …Nc6.
const QID_BA6_OO: SN = {
  intro: {
    say: "After …Ba6 and Qa4, White castles — so liquidate the centre: …c5 and …cxd4 open the position, …Bxg2 removes the fianchetto bishop, and …Nc6 hits the centralised knight. Clean, simplifying equality.",
    sayShort: '…cxd4, …Bxg2, …Nc6.',
  },
  beats: [
    { atMove: 13, say: "…cxd4 opens the centre, trading down toward equality.", highlights: [H('d4', KEY)] },
    { atMove: 15, say: "…Bxg2 removes White's powerful fianchetto bishop.", highlights: [H('g2', ATK)] },
    { atMove: 21, say: "…Nc6 hits the d4-knight, forcing trades that complete equality.", highlights: [H('c6', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// e3/Bd3 quiet system, White b3 — …c5/…Bxc5 freeing.
const QID_E3_B3: SN = {
  intro: {
    say: "The quiet e3/Bd3 system is solid but unambitious. Play …d5 and then …c5 to challenge the centre; after the exchanges, …Bxc5 gives you an active bishop and …Nbd7 a flexible setup. Easy, balanced equality.",
    sayShort: '…c5, …Bxc5 active.',
  },
  beats: [
    { atMove: 15, say: "…c5 strikes at d4, opening the game against White's modest centre.", highlights: [H('c5', KEY)] },
    { atMove: 19, say: "…Bxc5 recaptures with an active, well-placed bishop.", highlights: [H('c5', KEY)] },
    { atMove: 21, say: "…Nbd7 develops flexibly, completing a comfortable position.", highlights: [H('d7', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// e3/Bd3, White Re1 — …dxc4/…c5/…Bb4 active.
const QID_E3_RE1: SN = {
  intro: {
    say: "Against Re1 in the quiet system, open the game on your terms: …dxc4 wins a tempo on the bishop, …c5 strikes the centre, and …Bb4 develops actively. Black equalises with no difficulty.",
    sayShort: '…dxc4, …c5, …Bb4.',
  },
  beats: [
    { atMove: 15, say: "…dxc4 grabs a tempo by hitting the d3-bishop as it recaptures.", highlights: [H('c4', KEY)] },
    { atMove: 17, say: "…c5 strikes at d4, freeing Black's game.", highlights: [H('c5', KEY)] },
    { atMove: 23, say: "…Bb4 develops the bishop actively, pinning and pressuring White's pieces.", highlights: [H('b4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-tempo', QID_WIKI],
};

// e3/Bd3, White Qe2 — …c5/…Nc6/…Na5 pressure the bishop.
const QID_E3_QE2: SN = {
  intro: {
    say: "Qe2 supports e4, so undermine the centre with …c5 and develop …Nc6 to pressure d4. The leap …Na5 then harasses White's bishop on c4, and Black emerges with an easy, equal game.",
    sayShort: '…c5, …Nc6, …Na5.',
  },
  beats: [
    { atMove: 15, say: "…c5 strikes at d4, challenging the centre before White can play e4.", highlights: [H('c5', KEY)] },
    { atMove: 17, say: "…Nc6 develops with pressure on the d4-pawn.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 23, say: "…Na5 hits the c4-bishop, forcing concessions and equalising fully.", arrows: [A('a5', 'c4')], highlights: [H('c4', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', QID_WIKI],
};

// e3/Bd3, White a3 — …dxc4/…c5/…Nxc5.
const QID_E3_A3: SN = {
  intro: {
    say: "a3 is a slow waiting move that does nothing to fight for the centre. Play …dxc4 to win a tempo, …c5 to strike at d4, and route the knight …Nxc5 to a fine square. Black is comfortably equal, if not better.",
    sayShort: '…dxc4, …c5, …Nxc5.',
  },
  beats: [
    { atMove: 15, say: "…dxc4 wins a tempo on the recapturing bishop.", highlights: [H('c4', KEY)] },
    { atMove: 19, say: "…c5 strikes at the centre, freeing your position.", highlights: [H('c5', KEY)] },
    { atMove: 21, say: "…Nxc5 routes the knight to an active central square.", highlights: [H('c5', KEY)] },
  ],
  sources: ['concept:pos-tempo', 'concept:pos-center', QID_WIKI],
};

// e3/Bd3, White Nc3 — …d5/…exd5/…c5 hanging-pawns play.
const QID_E3_NC3: SN = {
  intro: {
    say: "Nc3 supports e4, so meet it with …d5 at once. After …exd5 and …c5 you reach a balanced hanging-pawns structure; …Nbd7 and …Re8 complete a flexible, equal setup with the better long-term piece play.",
    sayShort: '…d5, …c5, …Nbd7.',
  },
  beats: [
    { atMove: 11, say: "…d5 contests the centre directly, the reliable equaliser.", highlights: [H('d5', KEY)] },
    { atMove: 15, say: "…c5 strikes at d4, fixing the structure to Black's liking.", highlights: [H('c5', KEY)] },
    { atMove: 17, say: "…Nbd7 develops flexibly, eyeing the e5- and c5-squares.", highlights: [H('d7', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-hanging', QID_WIKI],
};

// e3/Bd3, White Ne5 — …c5/…Nc6 challenge the knight, …Bxc6, …Rc8.
const QID_E3_NE5: SN = {
  intro: {
    say: "Ne5 plants a knight in the centre, so challenge it: …c5 strikes at d4 and …Nc6 offers to trade the strong knight. After …Bxc6 you have a sound structure and the open c-file with …Rc8 for fully equal play.",
    sayShort: '…c5, …Nc6, …Bxc6.',
  },
  beats: [
    { atMove: 15, say: "…c5 strikes at d4, opening the centre against White's setup.", highlights: [H('c5', KEY)] },
    { atMove: 17, say: "…Nc6 challenges the e5-knight, offering to trade off White's best piece.", arrows: [A('c6', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 19, say: "…Bxc6 recaptures toward the centre, reinforcing d5 and the long diagonal.", highlights: [H('c6', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-open-file', QID_WIKI],
};

export const SUBLINE_NARRATION_HELP_E: Record<string, SN> = {
  // Queen's Indian Defence — student BLACK, 33 dead-end lines / 36 keys
  'queens-indian::0::Nc3@10': QID_NC3_SIMPL, 'queens-indian::4::Nc3@10': QID_NC3_SIMPL,
  'queens-indian::0::Re1@12': QID_RE1_D5, 'queens-indian::4::Re1@12': QID_RE1_D5,
  'queens-indian::0::Bf4@18': QID_BF4_18,
  'queens-indian::0::Re1@18': QID_RE1_18,
  'queens-indian::0::d5@12': QID_D5_12, 'queens-indian::4::d5@12': QID_D5_12,
  'queens-indian::1::Bg5@10': QID_PETRO_BG5, 'queens-indian::2::Bg5@10': QID_PETRO_BG5,
  'queens-indian::1::e3@12': QID_PETRO_E3, 'queens-indian::2::e3@12': QID_PETRO_E3,
  'queens-indian::1::Bd2@12': QID_PETRO_BD2, 'queens-indian::2::Bd2@12': QID_PETRO_BD2,
  'queens-indian::1::Qc2@10': QID_PETRO_QC2, 'queens-indian::2::Qc2@10': QID_PETRO_QC2,
  'queens-indian::1::Bf4@8': QID_BF4_8,
  'queens-indian::2::Bg5@8': QID_BG5_8,
  'queens-indian::3::Nbd2@10': QID_NIMZO_NBD2,
  'queens-indian::3::Rfe1@22': QID_NIMZO_RFE1,
  'queens-indian::3::O-O@14': QID_NIMZO_OO,
  'queens-indian::3::b4@22': QID_NIMZO_B4,
  'queens-indian::3::Rad1@22': QID_NIMZO_RAD1,
  'queens-indian::4::Bd2@14': QID_BD2_14,
  'queens-indian::4::Nxe4@14': QID_NXE4_14,
  'queens-indian::5::b3@8': QID_BA6_B3,
  'queens-indian::5::Qc2@8': QID_BA6_QC2,
  'queens-indian::5::Nbd2@8': QID_BA6_NBD2,
  'queens-indian::5::Qb3@8': QID_BA6_QB3,
  'queens-indian::5::O-O@12': QID_BA6_OO,
  'queens-indian::6::b3@14': QID_E3_B3,
  'queens-indian::6::Re1@14': QID_E3_RE1,
  'queens-indian::6::Qe2@14': QID_E3_QE2,
  'queens-indian::6::a3@14': QID_E3_A3,
  'queens-indian::6::Nc3@10': QID_E3_NC3,
  'queens-indian::6::Ne5@14': QID_E3_NE5,
};
