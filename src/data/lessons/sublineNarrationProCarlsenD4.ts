import type { SublineNarration } from '../../services/sublineLesson';
const QP_QGD = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];
const QP_NIM = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
const QP_CAT = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'];
const QP_QID = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defence'];
const QP_BOGO = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Bogo-Indian_Defence'];

// ---- Nimzo complex (student BLACK) source consts ----
const NIM = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
const N_QID = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defence'];
const N_CAT = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'];
const K_GRU = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'];

export const SUBLINE_NARRATION_PRO_CARLSEN_D4: Record<string, SublineNarration> = {

  // ===== Queen's Pawn — QGD & Nimzo faced (student WHITE) =====
  'pro-carlsen-queens-pawn::1::d5@5': {
    intro: { say: "d5 — the Queen's Gambit Declined Exchange, a Carlsbad structure. The plan writes itself: Bd3, Qc2 and O-O, then the minority attack with b4-b5, cracking Black's c6-pawn to leave a weakness on an open file. Slow, technical, and long a White favourite.", sayShort: 'd5 — Carlsbad; run the minority attack.' }, sources: QP_QGD,
  },
  'pro-carlsen-queens-pawn::1::c5@7': {
    intro: { say: "c5 — the Rubinstein Nimzo, Black hitting the centre. Develop Nf3 and O-O, and meet …cxd4 with exd4, accepting hanging pawns or an isolated d-pawn that hand you the bishop pair and central mass. Nudge the bishop with a3 and aim the whole build at the e4 break.", sayShort: 'c5 — Nf3 and O-O, aim e4.' }, sources: QP_NIM,
  },
  'pro-carlsen-queens-pawn::1::b6@7': {
    intro: { say: "b6 — the St. Petersburg Nimzo, Black fianchettoing against e4. Ne2 keeps your pawns intact: after a3 the knight recaptures on c3, and you build the broad centre with f3 and e4 while Black's queen-bishop only bites on d5. The healthy structure and space favour White.", sayShort: 'b6 — Ne2, then a3 and e4.' }, sources: QP_NIM,
  },

  // ===== Queen's Pawn — Anti-Nimzo / Catalan (g3, student WHITE) =====
  'pro-carlsen-queens-pawn::2::Bb4+@7': {
    intro: { say: "Bb4+ — Black checks before you fianchetto. Block with Bd2; after the trade on d2 you recapture into a smooth Catalan, finish Bg2 and O-O, and press the long diagonal toward d5 and b7. The bishop and the c4-d4 space give White an easy, lasting pull.", sayShort: 'Bb4+ — Bd2, then Bg2 and O-O.' }, sources: QP_CAT,
  },
  'pro-carlsen-queens-pawn::2::dxc4@7': {
    intro: { say: "dxc4 — the Open Catalan, Black snatching the pawn. Do not chase it: Bg2 and O-O first, then regain it with Qc2 and Ne5 or a4 cracking …b5 support; the Catalan bishop on g2 rakes b7 and outweighs the pawn while Black untangles. Development is compensation and then some.", sayShort: 'dxc4 — O-O, then Qc2 regains it.' }, sources: QP_CAT,
  },

  // ===== Queen's Pawn — Queen's Indian faced (student WHITE) =====
  'pro-carlsen-queens-pawn::3::Bb7@7': {
    intro: { say: "Bb7 — the main Queen's Indian, bishops contesting the long diagonals. Finish Bg2 and O-O, then Nc3 and Qc2, meeting …Ne4 by challenging it and preparing the e4 break; you fight for the central light squares where your extra tempo tells. A rich manoeuvring middlegame favouring White.", sayShort: 'Bb7 — Bg2, O-O, then Nc3.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::3::Bb4+@7': {
    intro: { say: "Bb4+ — Black checks before completing the fianchetto. Interpose Bd2; whether Black trades or retreats …Be7, you fill in Bg2, O-O and Nc3, then press the centre with e4. The extra space and the strong g2-bishop hand White a comfortable game.", sayShort: 'Bb4+ — Bd2, then Bg2 and e4.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::3::Bb7@9': {
    intro: { say: "Bb7 — Black returns the bishop to b7 after prodding c4 with …Ba6. Your b3 has shored the pawn, so complete Bg2, O-O and Nc3, then aim for the e4 break; the queenside is solid and your central space is the trump. Calm, controlled, and better for White.", sayShort: 'Bb7 — Bg2 and O-O, then e4.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::3::d5@9': {
    intro: { say: "d5 — Black strikes before developing the bishop. Finish Bg2 and O-O, then cxd5 exd5 fixes a target on d5, or Nc3 keeps the tension aimed at the centre; either way your space and the fianchettoed bishop give the pull. Solid and pleasant for White.", sayShort: 'd5 — Bg2, O-O, then cxd5.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::3::b5@9': {
    intro: { say: "b5 — Black lunges on the queenside to free the a6-bishop. After cxb5 Bxb5 finish Bg2 and O-O; Black's pawns are loosened and the b5-bishop is exposed to a2-a4 gaining tempo, while your centre and the g2-bishop dominate. White emerges with the sounder game.", sayShort: 'b5 — cxb5, Bg2, then a4 tempo.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::4::h6@11': {
    intro: { say: "h6 — a luft after Black has ceded the bishop pair with …Bxd2. Continue g3, Bg2 and O-O, then Qc2 or Re1 preparing e4; your two bishops and the central space are the enduring trumps, and Black's slowness gives you time. Press steadily on both centre and flank.", sayShort: 'h6 — Bg2 and O-O, prep e4.' }, sources: QP_BOGO,
  },
  'pro-carlsen-queens-pawn::4::Ne4@11': {
    intro: { say: "Ne4 — Black plants the knight, but with the dark bishop already on f4 it lacks lasting support. Play e3, Bd3 challenging the knight, and Qc2, then castle and roll the centre with the bishop pair; once …Ne4 is chased or traded your space decides. Solidly better for White.", sayShort: 'Ne4 — e3 and Bd3, challenge it.' }, sources: QP_BOGO,
  },

  // ===== Nimzo-Indian (student BLACK) =====
  'pro-carlsen-nimzo::0::f3@6': {
    intro: { say: "f3 — the Sämisch, White grabbing the centre for f3-e4. Strike back with …d5 and …c5; after the trade on c3 White's doubled c-pawns are permanent targets, so pile up with …Nc6, …Ba6 hitting c4 and …Qa5. Black's pressure on the crippled queenside is the thematic answer.", sayShort: 'f3 — …d5 and …c5, hit c4.' }, sources: NIM,
  },

  // ===== Nimzo complex — Queen's Indian (student BLACK) =====
  'pro-carlsen-nimzo::1::a3@6': {
    intro: { say: "a3 — the Petrosian Queen's Indian, White ruling out …Bb4. Develop …Bb7 and strike …d5, challenging c4 and the centre; after cxd5 exd5 you have a fine structure, or keep tension with …Be7 and …O-O. Black equalises comfortably by contesting the light squares.", sayShort: 'a3 — …Bb7 and …d5, contest centre.' }, sources: N_QID,
  },
  'pro-carlsen-nimzo::1::Nc3@6': {
    intro: { say: "Nc3 — the Kasparov Queen's Indian. Answer …Bb7, then …Bb4 pinning or …Ne4 hitting the knight, fighting hard for the e4-square; if White plays for e4 you meet it with …f5 or …d5. Black keeps the light-square battle fully alive.", sayShort: 'Nc3 — …Bb7 and …Bb4, fight e4.' }, sources: N_QID,
  },
  'pro-carlsen-nimzo::1::Qc2@8': {
    intro: { say: "Qc2 — White supports c4 and eyes e4 in the fianchetto Queen's Indian. Hit back with …Ba6 and …c5; after d5 exd5 cxd5 your …Bb7 rakes the pawn on d5, and …Be7, …O-O and …Re8 pile pressure on it. Black plays against the advanced pawn with active pieces.", sayShort: 'Qc2 — …Ba6 and …c5, target d5.' }, sources: N_QID,
  },
  'pro-carlsen-nimzo::1::e3@6': {
    intro: { say: "e3 — the modest Spassky Queen's Indian. Develop …Bb7, …Be7 and …O-O, then free the game with …d5 or …c5 striking d4; White's quiet setup gives Black an easy equality with no weaknesses. Steer toward the …c5 break and active pieces.", sayShort: 'e3 — …Bb7 and …Be7, then …d5.' }, sources: N_QID,
  },
  'pro-carlsen-nimzo::1::Qa4@8': {
    intro: { say: "Qa4 — White pins toward the queenside in the fianchetto Queen's Indian. Retreat …Bb7, blunting the g2-bishop, then …c5 and …Be7 to break in the centre; the queen on a4 is loose, and …Nc6 or …a5 can gain tempo later. Black comfortably completes development.", sayShort: 'Qa4 — …Bb7 and …c5, break centre.' }, sources: N_QID,
  },
  'pro-carlsen-nimzo::1::Qb3@8': {
    intro: { say: "Qb3 — Timman's Line, White overprotecting c4 with the queen. Hit back with …Nc6 eyeing …Na5 to harass the queen and the c4-pawn, then …Be7 and …O-O; the queen on b3 becomes a target and your minors gain tempo. Black seizes the queenside initiative.", sayShort: 'Qb3 — …Nc6 and …Na5, harass queen.' }, sources: N_QID,
  },

  // ===== Nimzo complex — Catalan (student BLACK) =====
  'pro-carlsen-nimzo::2::Nf3@6': {
    intro: { say: "Nf3 — the main Catalan. Check with …Bb4+, and after Bd2 either trade or drop back …Be7, then …O-O and …dxc4; you grab the pawn and hold it with …a6 and …b5, or return it for smooth development. Black has the well-mapped, resilient Catalan defence.", sayShort: 'Nf3 — …Bb4+, then …O-O and …dxc4.' }, sources: N_CAT,
  },

  // ===== King's Indian complex — Grünfeld (student BLACK) =====
  'pro-carlsen-kid::1::Nf3@6': {
    intro: { say: "Nf3 — the Three Knights Grünfeld. Complete …Bg7 and castle, then hit the centre with …c5 or grab …dxc4; the Grünfeld idea never changes — let White build a big pawn centre, then blast it apart with pieces and pawn breaks. Black gets dynamic, active play.", sayShort: 'Nf3 — …Bg7 and …O-O, then …c5.' }, sources: K_GRU,
  },
  'pro-carlsen-kid::1::Nf3@12': {
    intro: { say: "Nf3 — the Modern Exchange Grünfeld. You already have …c5 striking the big centre; follow with …O-O, …Nc6 and …Bg4, piling on d4, then …cxd4 cxd4 leaves White's centre loose for …Qa5 and …Rd8. Black attacks the pawn centre by the book with fast pieces.", sayShort: 'Nf3 — …Nc6 and …Bg4, hit d4.' }, sources: K_GRU,
  },
  'pro-carlsen-kid::1::Bf4@6': {
    intro: { say: "Bf4 — the Brinckmann Attack Grünfeld. Play …Bg7 and …O-O, then break with …c5 hitting d4 and …dxc4 opening lines; the bishop on f4 can be harassed by …Nh5 or …c5-c4 ideas later. Black counters White's centre with the usual Grünfeld energy. Active and sound.", sayShort: 'Bf4 — …Bg7 and …O-O, then …c5.' }, sources: K_GRU,
  },
  'pro-carlsen-kid::1::Bd2@8': {
    intro: { say: "Bd2 — an Exchange Grünfeld sidestep, White keeping the pawns intact. Continue …Bg7 and …O-O, then …c5 and …Nc6 striking d4; the knight on d5 sits proudly for now, and after …Nxc3 or …Nb6 you round out with pressure on the centre. Black plays actively for equality and more.", sayShort: 'Bd2 — …Bg7 and …O-O, then …c5.' }, sources: K_GRU,
  },
  'pro-carlsen-kid::1::Bg5@6': {
    intro: { say: "Bg5 — the Stockholm Grünfeld. Hit back with …Ne4, and after Bh4 trade …Nxc3; then …dxc4 grabs a pawn and …Be6 defends it, with …Bg7, …O-O and …b5 to hold your extra material. Black snatches the pawn and consolidates for a sound edge.", sayShort: 'Bg5 — …Ne4, then …dxc4 and …Be6.' }, sources: K_GRU,
  },
  'pro-carlsen-kid::1::Be3@12': {
    intro: { say: "Be3 — the main Exchange Grünfeld. With …c5 already hitting d4, continue …Qa5 pinning c3, …Nc6 and …Bg4 or …cxd4, dismantling White's proud centre; the classic Grünfeld pressure on c3 and d4 gives fast, active piece play. Black fights for the initiative.", sayShort: 'Be3 — …Qa5 and …Nc6, hit d4.' }, sources: K_GRU,
  },
  'pro-carlsen-kid::1::Qa4+@12': {
    intro: { say: "Qa4+ — White checks to disrupt in the Exchange Grünfeld. Block …Nd7, then …O-O and …c5 hitting d4, with …Nb6 gaining a tempo on the loose queen; the check costs White the time you spend attacking the centre. Black keeps the thematic Grünfeld initiative.", sayShort: 'Qa4+ — …Nd7, then …c5 and …Nb6.' }, sources: K_GRU,
  },
  'pro-carlsen-kid::1::Bb5+@12': {
    intro: { say: "Bb5+ — White checks to provoke a committal …c6 in the Exchange Grünfeld. Block …c6, chasing the bishop back, then …O-O and …Qa5 pressuring c3, with …b5 and …c5 to break on the queenside; the tempo on the bishop evens out. Black keeps a solid, active Grünfeld.", sayShort: 'Bb5+ — …c6, then …O-O and …Qa5.' }, sources: K_GRU,
  },
};
