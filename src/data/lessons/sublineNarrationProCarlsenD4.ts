import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Carlsen-style 1.d4 repertoire. Queen's Pawn cluster
// (student WHITE: KID, QGD/Nimzo, Anti-Nimzo/Catalan, Queen's Indian, Bogo);
// Nimzo-Indian complex (student BLACK: Nimzo, QID, Catalan, Bogo); King's Indian
// (student BLACK: Fianchetto KID, Grünfeld, Makogonov, Sämisch). House voice,
// board-safe, line-grounded. Each entry answers the opponent's frequent
// deviation with the student-side plan.

// ---- Queen's Pawn cluster (student WHITE) source consts ----
const QP_KID = ['concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];
const QP_QGD = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];
const QP_NIM = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
const QP_CAT = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'];
const QP_QID = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defence'];
const QP_BOGO = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Bogo-Indian_Defence'];

// ---- Nimzo complex (student BLACK) source consts ----
const NIM = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
const N_QID = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defence'];
const N_CAT = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'];
const N_BOGO = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Bogo-Indian_Defence'];

// ---- King's Indian complex (student BLACK) source consts ----
const KID = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];
const K_GRU = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'];

export const SUBLINE_NARRATION_PRO_CARLSEN_D4: Record<string, SublineNarration> = {
  // ===== Queen's Pawn — King's Indian faced (student WHITE) =====
  'pro-carlsen-queens-pawn::0::O-O@7': {
    intro: { say: "O-O — Black castles into the Classical King's Indian. Complete the big centre with Nf3, Be2 and O-O, then when …e5 arrives close with d5 and swing to the queenside with c5 and b4. You attack where your space lives; let the …f5 storm come and answer it with a faster break on the far wing.", sayShort: 'O-O — Nf3 and Be2, then queenside.' }, sources: QP_KID,
  },
  'pro-carlsen-queens-pawn::0::Nbd7@11': {
    intro: { say: "Nbd7 — the Orthodox King's Indian, Black readying …e5. Castle, then answer …e5 with d5 and roll the queenside: Rb1, b4 and c5, prising open lines far from your own king. Your space and the wing break give White the faster attack in the classic King's Indian race.", sayShort: 'Nbd7 — castle, meet …e5 with d5.' }, sources: QP_KID,
  },
  'pro-carlsen-queens-pawn::0::Na6@11': {
    intro: { say: "Na6 — the Kazakh, the knight bound for c5. Castle, meet …e5 with d5, and when the knight reaches c5 hit it with b4 and Nd2, gaining tempo as you expand on the queenside. White dictates on the wing where the extra space tells.", sayShort: 'Na6 — d5, then b4 hits …Nc5.' }, sources: QP_KID,
  },
  'pro-carlsen-queens-pawn::0::Bg4@11': {
    intro: { say: "Bg4 — Black pins the f3-knight before …e5. Play Be3 and h3; if …Bxf3 then Bxf3 keeps the bishop pair raking the long diagonal, and after …e5 d5 you press the queenside with c5 and b4. The pin costs Black time you spend on space.", sayShort: 'Bg4 — h3 and Be3, keep bishops.' }, sources: QP_KID,
  },
  'pro-carlsen-queens-pawn::0::c5@11': {
    intro: { say: "c5 — Black strikes with a Benoni thrust. Answer d5, locking a Benoni structure where your extra centre pawn tells, then manoeuvre Nd2-c4 and expand with a4 and b4 or the e4-e5 break. Black gets the g7-bishop, but your space and passed-pawn potential give the pull.", sayShort: 'c5 — d5 Benoni, then Nd2-c4.' }, sources: QP_KID,
  },

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
  'pro-carlsen-queens-pawn::1::c5@9': {
    intro: { say: "c5 — Black challenges in the Normal Nimzo. Continue Nf3 and O-O, then meet …cxd4 with exd4 for the bishop pair and a mobile centre; the Bd3-Qc2 battery eyes h7, so once the centre steadies the e4 break opens the kingside attack. White plays for the initiative.", sayShort: 'c5 — Nf3, O-O, then e4 attack.' }, sources: QP_NIM,
  },
  'pro-carlsen-queens-pawn::1::dxc4@11': {
    intro: { say: "dxc4 — Black grabs the pawn in the Classical Nimzo. Recapture Bxc4, regaining it with a fine diagonal toward f7, then a3 to clarify the bishop and Qc2 or Re1 preparing e4. The bishop pair and central majority give White a comfortable, pressing game.", sayShort: 'dxc4 — Bxc4, then a3 and e4.' }, sources: QP_NIM,
  },
  'pro-carlsen-queens-pawn::1::b6@11': {
    intro: { say: "b6 — the Schlechter Nimzo, Black adding the light bishop to d5's defence. Castle, then release with cxd5 exd5 and target the d-pawn: Ne5, f3 and the e4 break, or b4-b5 undermining c6 later. The bishop pair and pressure on d5 keep White on top.", sayShort: 'b6 — O-O, cxd5, press d5.' }, sources: QP_NIM,
  },

  // ===== Queen's Pawn — Anti-Nimzo / Catalan (g3, student WHITE) =====
  'pro-carlsen-queens-pawn::2::Bb4+@7': {
    intro: { say: "Bb4+ — Black checks before you fianchetto. Block with Bd2; after the trade on d2 you recapture into a smooth Catalan, finish Bg2 and O-O, and press the long diagonal toward d5 and b7. The bishop and the c4-d4 space give White an easy, lasting pull.", sayShort: 'Bb4+ — Bd2, then Bg2 and O-O.' }, sources: QP_CAT,
  },
  'pro-carlsen-queens-pawn::2::dxc4@7': {
    intro: { say: "dxc4 — the Open Catalan, Black snatching the pawn. Do not chase it: Bg2 and O-O first, then regain it with Qc2 and Ne5 or a4 cracking …b5 support; the Catalan bishop on g2 rakes b7 and outweighs the pawn while Black untangles. Development is compensation and then some.", sayShort: 'dxc4 — O-O, then Qc2 regains it.' }, sources: QP_CAT,
  },
  'pro-carlsen-queens-pawn::2::c6@11': {
    intro: { say: "c6 — the Closed Catalan, Black bolstering d5 solidly. Build the classic plan: Qc2, b3 and Bb2, then Nbd2 and the e4 break to open the position for your fianchettoed bishop. Space and the g2-bishop promise a slow, durable squeeze.", sayShort: 'c6 — Qc2, b3, then e4 break.' }, sources: QP_CAT,
  },
  'pro-carlsen-queens-pawn::2::Nbd7@11': {
    intro: { say: "Nbd7 — Black develops flexibly in the Closed Catalan. Answer Qc2 and Rd1, keeping the c4-d5 tension, then b3, Bb2 and the e4 advance; if Black grabs …dxc4 you recover it with Qxc4 and the bishop dominates. A comfortable space edge for White.", sayShort: 'Nbd7 — Qc2 and Rd1, prep e4.' }, sources: QP_CAT,
  },
  'pro-carlsen-queens-pawn::2::b5@13': {
    intro: { say: "b5 — Black clings to the extra pawn in the Open Catalan. Undermine at once with a4: after …c6 the tension on b5 tells, and b3 or Ne5 pries the pawn loose while the g2-bishop already stares down the long diagonal. Black's queenside pawns become the targets.", sayShort: 'b5 — a4 undermines, then b3.' }, sources: QP_CAT,
  },
  'pro-carlsen-queens-pawn::2::b6@11': {
    intro: { say: "b6 — Black meets the Catalan bishop with its rival on b7. Play Qc2 and Rd1, then Nc3 hitting d5, or cxd5 exd5 to fix a target; the e4 break stays the goal, opening lines for your pieces. White keeps the more active game and the safer structure.", sayShort: 'b6 — Qc2 and Nc3, then e4.' }, sources: QP_CAT,
  },
  'pro-carlsen-queens-pawn::2::b6@13': {
    intro: { say: "b6 — Black readies …Bb7 to answer Qxc4 in the Open Catalan. Simply take: Qxc4 regains the pawn, and after …Bb7 the two long-diagonal bishops face off while your extra centre space and Rd1 pressure on the d-file give the edge. Straightforward and pleasant for White.", sayShort: 'b6 — Qxc4 regains, then Rd1.' }, sources: QP_CAT,
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
  'pro-carlsen-queens-pawn::3::d5@13': {
    intro: { say: "d5 — Black breaks in the centre of the Queen's Indian. Release with cxd5: after …exd5 the d-pawn becomes a target for Nc3, Ne5 and the pressure of your g2-bishop, and O-O completes a harmonious setup. White plays against the slight structural weakness with the freer pieces.", sayShort: 'd5 — cxd5, then Nc3 targets d5.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::3::d5@9': {
    intro: { say: "d5 — Black strikes before developing the bishop. Finish Bg2 and O-O, then cxd5 exd5 fixes a target on d5, or Nc3 keeps the tension aimed at the centre; either way your space and the fianchettoed bishop give the pull. Solid and pleasant for White.", sayShort: 'd5 — Bg2, O-O, then cxd5.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::3::b5@9': {
    intro: { say: "b5 — Black lunges on the queenside to free the a6-bishop. After cxb5 Bxb5 finish Bg2 and O-O; Black's pawns are loosened and the b5-bishop is exposed to a2-a4 gaining tempo, while your centre and the g2-bishop dominate. White emerges with the sounder game.", sayShort: 'b5 — cxb5, Bg2, then a4 tempo.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::3::O-O@13': {
    intro: { say: "O-O — Black castles in the Queen's Indian Intermezzo. Match with O-O, then Nc3 and Qc2, building toward the e4 break that opens the centre for your pieces; the g2-bishop and the extra space are the enduring pluses. Manoeuvre patiently and press.", sayShort: 'O-O — O-O, Nc3, then e4.' }, sources: QP_QID,
  },
  'pro-carlsen-queens-pawn::3::Bb7@13': {
    intro: { say: "Bb7 — Black lines the bishop up on the long diagonal. Castle, then Nc3 and Qc2, contesting the light squares and preparing e4; when the centre opens your space advantage and the harmonious pieces tell. A textbook Queen's Indian pull for White.", sayShort: 'Bb7 — O-O and Nc3, prep e4.' }, sources: QP_QID,
  },

  // ===== Queen's Pawn — Bogo-Indian faced (student WHITE) =====
  'pro-carlsen-queens-pawn::4::O-O@7': {
    intro: { say: "O-O — Black castles in the Bogo. Play a3, questioning the bishop: after …Bxd2+ Bxd2 you own the bishop pair, and e4 with Bd3 builds the broad centre you steer toward a kingside initiative. The two bishops and the space are a comfortable, lasting edge.", sayShort: 'O-O — a3, then e4 and Bd3.' }, sources: QP_BOGO,
  },
  'pro-carlsen-queens-pawn::4::d5@7': {
    intro: { say: "d5 — Black stakes the centre in the Bogo. Nudge the bishop with a3; after it retreats or trades, build with e3, b4 and Bb2, gripping the queenside and the long diagonal. If the tension breaks, cxd5 leaves Black's centre a target. White keeps the more comfortable space.", sayShort: 'd5 — a3, then b4 and Bb2.' }, sources: QP_BOGO,
  },
  'pro-carlsen-queens-pawn::4::d6@7': {
    intro: { say: "d6 — Black prepares …e5 in the Bogo. Play a3 to clarify the bishop, then e4 and Bd3 for the full centre; when …e5 comes, d5 gains space or dxe5 opens lines for your better-developed pieces. The centre and the bishop pair favour White.", sayShort: 'd6 — a3, then e4 and Bd3.' }, sources: QP_BOGO,
  },
  'pro-carlsen-queens-pawn::4::h6@11': {
    intro: { say: "h6 — a luft after Black has ceded the bishop pair with …Bxd2. Continue g3, Bg2 and O-O, then Qc2 or Re1 preparing e4; your two bishops and the central space are the enduring trumps, and Black's slowness gives you time. Press steadily on both centre and flank.", sayShort: 'h6 — Bg2 and O-O, prep e4.' }, sources: QP_BOGO,
  },
  'pro-carlsen-queens-pawn::4::Ne4@11': {
    intro: { say: "Ne4 — Black plants the knight, but with the dark bishop already on f4 it lacks lasting support. Play e3, Bd3 challenging the knight, and Qc2, then castle and roll the centre with the bishop pair; once …Ne4 is chased or traded your space decides. Solidly better for White.", sayShort: 'Ne4 — e3 and Bd3, challenge it.' }, sources: QP_BOGO,
  },
  'pro-carlsen-queens-pawn::4::d6@13': {
    intro: { say: "d6 — Black readies …e5 or …Nbd7 after conceding the bishop pair. Complete Bg2 and O-O, then e4 for the broad centre and Qc2 supporting the push; your two bishops rake the long diagonals while Black stays cramped. A pleasant, risk-free space edge for White.", sayShort: 'd6 — Bg2, O-O, then e4.' }, sources: QP_BOGO,
  },

  // ===== Nimzo-Indian (student BLACK) =====
  'pro-carlsen-nimzo::0::f3@6': {
    intro: { say: "f3 — the Sämisch, White grabbing the centre for f3-e4. Strike back with …d5 and …c5; after the trade on c3 White's doubled c-pawns are permanent targets, so pile up with …Nc6, …Ba6 hitting c4 and …Qa5. Black's pressure on the crippled queenside is the thematic answer.", sayShort: 'f3 — …d5 and …c5, hit c4.' }, sources: NIM,
  },
  'pro-carlsen-nimzo::0::Nf3@6': {
    intro: { say: "Nf3 — the quiet Three Knights Nimzo. Answer …c5 hitting d4, or …b6 and …Bb7 to fight for e4; you develop fast and keep …Bxc3 in reserve to double the pawns whenever it helps. A flexible, comfortable game for Black.", sayShort: 'Nf3 — …c5 or …b6 and …Bb7.' }, sources: NIM,
  },
  'pro-carlsen-nimzo::0::Ne2@8': {
    intro: { say: "Ne2 — the Reshevsky, White sidestepping doubled pawns but blocking his own bishop. Strike the centre with …d5 and …c5; the knight on e2 is clumsy, so open lines quickly with …cxd4 and …dxc4, and your freer pieces seize the initiative. Black is comfortably active.", sayShort: 'Ne2 — …d5 and …c5, open lines.' }, sources: NIM,
  },
  'pro-carlsen-nimzo::0::a3@10': {
    intro: { say: "a3 — White forces the question in the Classical Nimzo. Take …Bxc3, and after bxc3 the doubled pawns are the target: play …dxc4 and …c5, then …Qc7, …Nc6 and …e5, hammering the c4-pawn and the centre. The classic Nimzo trade favours Black.", sayShort: 'a3 — …Bxc3, then …dxc4 and …c5.' }, sources: NIM,
  },
  'pro-carlsen-nimzo::0::Bd2@8': {
    intro: { say: "Bd2 — White unpins quietly. Keep the tension: …b6 and …Bb7 fighting for e4, or …d5 with a solid centre; if White never challenges, your bishop stays a fine piece and …Bxc3 remains a resource. Easy, healthy development for Black.", sayShort: 'Bd2 — …b6 and …Bb7, or …d5.' }, sources: NIM,
  },
  'pro-carlsen-nimzo::0::cxd5@10': {
    intro: { say: "cxd5 — White clarifies in the Classical Nimzo. Recapture …exd5, giving you a mobile centre and the half-open e-file; follow with …Re8, …Bd6 or …Bf5 developing actively, and keep …Bxc3 to wreck the queenside if White allows it. Black has a free, harmonious game.", sayShort: 'cxd5 — …exd5, then …Re8 and …Bd6.' }, sources: NIM,
  },
  'pro-carlsen-nimzo::0::Ne2@10': {
    intro: { say: "Ne2 — White reroutes the knight in the Classical, but it blocks his bishop. Break with …c5 and …Nc6, hitting d4, and consider …dxc4 to open the position for your active pieces; the awkward e2-knight leaves White a step behind. Comfortable for Black.", sayShort: 'Ne2 — …c5 and …Nc6, hit d4.' }, sources: NIM,
  },
  'pro-carlsen-nimzo::0::Nf3@8': {
    intro: { say: "Nf3 — White develops naturally in the Nimzo. Answer …d5 and …c5 for a classical central strike, or …b6 and …Bb7 to battle for e4; keep …Bxc3 in reserve to hand White the doubled pawns when it suits. Flexible and pleasant for Black.", sayShort: 'Nf3 — …d5 and …c5, strike centre.' }, sources: NIM,
  },
  'pro-carlsen-nimzo::0::cxd5@12': {
    intro: { say: "cxd5 — the Gligorić System reaches its critical juncture. Recapture and steer toward White's isolated or hanging d-pawn: blockade the d5-square with …Nbd7-b6, develop …Be7 and …Rc8, and press the weakness with pieces. Black meets the isolated pawn with the reliable blockade-and-attack method.", sayShort: 'cxd5 — recapture, blockade d5, press pawn.' }, sources: NIM,
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
  'pro-carlsen-nimzo::1::Nbd2@8': {
    intro: { say: "Nbd2 — White props c4 passively in the fianchetto line. Return …Bb7, then strike with …c5 and …d5, opening the centre against White's cramped knight; your pieces flow to natural squares while the d2-knight blocks its own bishop. Easy equality with the freer game for Black.", sayShort: 'Nbd2 — …Bb7, then …c5 and …d5.' }, sources: N_QID,
  },
  'pro-carlsen-nimzo::1::Nc3@12': {
    intro: { say: "Nc3 — White develops in the Queen's Indian Intermezzo. Play …d5, striking the centre before White consolidates; after cxd5 exd5, or with the tension held, complete …O-O and …c6, and the light squares stay contested. Black reaches a sound, balanced middlegame.", sayShort: 'Nc3 — …d5, then …O-O and …c6.' }, sources: N_QID,
  },
  'pro-carlsen-nimzo::1::O-O@14': {
    intro: { say: "O-O — White castles in the Queen's Indian Intermezzo. Continue …d5 and …O-O, building the solid …c6-d5 wall against the g2-bishop, then …Nbd7 and …Bb7 rounding out; the structure is rock-solid and …c5 or …dxc4 breaks free later. Black is comfortably equal.", sayShort: 'O-O — …d5 and …O-O, then …Nbd7.' }, sources: N_QID,
  },
  'pro-carlsen-nimzo::1::Qb3@8': {
    intro: { say: "Qb3 — Timman's Line, White overprotecting c4 with the queen. Hit back with …Nc6 eyeing …Na5 to harass the queen and the c4-pawn, then …Be7 and …O-O; the queen on b3 becomes a target and your minors gain tempo. Black seizes the queenside initiative.", sayShort: 'Qb3 — …Nc6 and …Na5, harass queen.' }, sources: N_QID,
  },

  // ===== Nimzo complex — Catalan (student BLACK) =====
  'pro-carlsen-nimzo::2::Nf3@6': {
    intro: { say: "Nf3 — the main Catalan. Check with …Bb4+, and after Bd2 either trade or drop back …Be7, then …O-O and …dxc4; you grab the pawn and hold it with …a6 and …b5, or return it for smooth development. Black has the well-mapped, resilient Catalan defence.", sayShort: 'Nf3 — …Bb4+, then …O-O and …dxc4.' }, sources: N_CAT,
  },
  'pro-carlsen-nimzo::2::Ne5@12': {
    intro: { say: "Ne5 — White jumps in to recover the c4-pawn in the Open Catalan. Meet it with …Nc6 challenging the knight, or …Bb4 and …Nd5 activating your pieces; you either hold the extra pawn a while or return it for easy equality with …Bxe5 and …c5. Black stands fully comfortable.", sayShort: 'Ne5 — …Nc6, then …Nd5 and …c5.' }, sources: N_CAT,
  },
  'pro-carlsen-nimzo::2::Qc2@10': {
    intro: { say: "Qc2 — the Closed Catalan, White readying e4 and eyeing c4. Solidify with …c6, then …Nbd7, …b6 and …Bb7, building a compact structure that denies White the e4 break; when ready, …c5 or …dxc4 frees your game. Black holds a sound, resilient position.", sayShort: 'Qc2 — …c6 and …Nbd7, then …b6.' }, sources: N_CAT,
  },
  'pro-carlsen-nimzo::2::Nc3@10': {
    intro: { say: "Nc3 — White adds pressure on d5 in the Closed Catalan. Release with …dxc4, then …a6 and …b5 to hold the pawn, or play …c6 keeping the wall solid; either way you contest e4 and complete …Nbd7 and …Bb7. Black reaches a comfortable, well-known middlegame.", sayShort: 'Nc3 — …dxc4, then …a6 and …b5.' }, sources: N_CAT,
  },
  'pro-carlsen-nimzo::2::Qa4@12': {
    intro: { say: "Qa4 — White recovers the pawn in the Open Catalan. Develop …Nbd7 and …a6, preparing …b5 to gain a tempo if the queen must move, or simply …c5 returning the pawn for free piece play; the g2-bishop is blunted by your solid centre. Black equalises with active development.", sayShort: 'Qa4 — …Nbd7 and …a6, prep …b5.' }, sources: N_CAT,
  },

  // ===== Nimzo complex — Bogo-Indian (student BLACK) =====
  'pro-carlsen-nimzo::3::Bd2@6': {
    intro: { say: "Bd2 — the main Bogo-Indian. Trade …Bxd2+ or keep the bishop with …Qe7, then castle and aim for the …d6 and …e5 central break, or …b6 and …Bb7 on the long diagonal; White has no doubled pawns to attack, so play for a sound, flexible equality. Black is solid and active.", sayShort: 'Bd2 — …Bxd2+ or …Qe7, then …e5.' }, sources: N_BOGO,
  },
  'pro-carlsen-nimzo::3::Nc3@6': {
    intro: { say: "Nc3 — White declines to block and transposes to a Nimzo-Indian. Continue …O-O, then …d5 and …c5 striking the centre, holding …Bxc3 to inflict the doubled pawns whenever it helps; you are back in familiar Nimzo waters. Comfortable and well-charted for Black.", sayShort: 'Nc3 — …O-O, then …d5 and …c5.' }, sources: N_BOGO,
  },
  'pro-carlsen-nimzo::3::g3@8': {
    intro: { say: "g3 — White fianchettoes against the Bogo. Break with …d5, or play …b6 and …Bb7 to fight for the long diagonal, first clarifying with …Bxd2 when useful; White's setup is harmless once you strike the centre. Black develops smoothly to equality.", sayShort: 'g3 — …d5, or …b6 and …Bb7.' }, sources: N_BOGO,
  },
  'pro-carlsen-nimzo::3::e3@8': {
    intro: { say: "e3 — White develops modestly against the Bogo. Play …b6 and …Bb7, then …Bxd2 and …d6, aiming for the …e5 break, or strike immediately with …d5 and …c5; White's quiet build gives Black an easy, weakness-free game. Steer toward central counterplay.", sayShort: 'e3 — …b6 and …Bb7, then …e5.' }, sources: N_BOGO,
  },
  'pro-carlsen-nimzo::3::Bd3@12': {
    intro: { say: "Bd3 — White completes a broad centre in the Bogo. Challenge it with …e5 or …c5, then …Nc6 and …Re8 pressuring the pawns; if White pushes d5 you get …Ne7-g6 and the …f5 break like a King's Indian. Black strikes back in the centre for full play.", sayShort: 'Bd3 — …e5 or …c5, then …Nc6.' }, sources: N_BOGO,
  },
  'pro-carlsen-nimzo::3::e3@10': {
    intro: { say: "e3 — White chooses a modest centre in the Bogo. Free your game with …d5 and …c5 striking d4, or …b6 and …Bb7 with …d6 and …e5 to come; the retreated bishop on e7 regroups easily and White has no targets. Black equalises with active, purposeful moves.", sayShort: 'e3 — …d5 and …c5, strike d4.' }, sources: N_BOGO,
  },
  'pro-carlsen-nimzo::3::g3@10': {
    intro: { say: "g3 — White fianchettoes after prodding with a3 in the Bogo. Meet it with …d5, then …c6, …Nbd7 and …b6 with …Bb7, building a solid structure against the g2-bishop; …c5 or …e5 frees you when the moment is right. Black holds a comfortable, resilient game.", sayShort: 'g3 — …d5 and …c6, then …b6.' }, sources: N_BOGO,
  },
  'pro-carlsen-nimzo::3::Qc2@12': {
    intro: { say: "Qc2 — White supports the big e4-centre in the Bogo. Strike it with …e5 or …c5, then …Nc6 and …Re8, provoking a break in the pawn chain; a King's-Indian-style …Ne7-g6 and …f5 follows if White clamps with d5. Black gets rich central counterplay.", sayShort: 'Qc2 — …e5 or …c5, then …Re8.' }, sources: N_BOGO,
  },

  // ===== King's Indian — Fianchetto lines faced (student BLACK) =====
  'pro-carlsen-kid::0::h3@14': {
    intro: { say: "h3 — White makes luft in the Fianchetto King's Indian. Continue …Re8 and …exd4, then …Nc5 hitting e4, or …c6 and …a5 gaining queenside space; the fianchetto lines are strategic, so manoeuvre for the …e4 or …c6-d5 breaks. Black plays a patient, balanced middlegame.", sayShort: 'h3 — …Re8 and …exd4, then …Nc5.' }, sources: KID,
  },
  'pro-carlsen-kid::0::Nf3@8': {
    intro: { say: "Nf3 — the Immediate Fianchetto against the King's Indian. Set up the classical way: …d6, …Nbd7 and …e5, or choose …c5 for a Benoni flavour; once the centre defines itself you manoeuvre …Re8, …exd4 and …Nc5, or storm with …f5. Black has a sound, flexible game.", sayShort: 'Nf3 — …d6 and …Nbd7, then …e5.' }, sources: KID,
  },
  'pro-carlsen-kid::0::Qc2@14': {
    intro: { say: "Qc2 — White centralises the queen in the Fianchetto King's Indian. Play …Re8 and …exd4, opening the e-file for pressure, then …Nc5 or …c6 with …a5 to grip the queenside; the strategic fianchetto rewards patient manoeuvring toward the …e4 break. Black is comfortably placed.", sayShort: 'Qc2 — …Re8 and …exd4, then …Nc5.' }, sources: KID,
  },
  'pro-carlsen-kid::0::b3@14': {
    intro: { say: "b3 — White braces the centre with a queenside fianchetto in the King's Indian. Continue …Re8 and …c6, keeping the centre fluid, then …exd4 and …Nc5, or …a5-a4 to hit the b3-pawn; the strategic battle rewards careful manoeuvring. Black keeps a full, balanced share of the play.", sayShort: 'b3 — …Re8 and …c6, then …exd4.' }, sources: KID,
  },
  'pro-carlsen-kid::0::e3@10': {
    intro: { say: "e3 — White plays a restrained Fianchetto King's Indian. Strike the centre with …e5, develop …Nbd7 or …Nc6, and follow …Re8 and …exd4; with White's centre modest, you also eye …c6 and …d5 to seize space. Black equalises easily and can press for more.", sayShort: 'e3 — …e5 and …Nbd7, then …Re8.' }, sources: KID,
  },
  'pro-carlsen-kid::0::e3@14': {
    intro: { say: "e3 — White reinforces d4 quietly in the Fianchetto King's Indian. Play …Re8 and hold with …c6, then …exd4 or the …e4 clamp; the manoeuvring game suits Black, who steers the knights to c5 and the kingside and probes the light squares. Balanced and comfortable.", sayShort: 'e3 — …Re8 and …c6, then …exd4.' }, sources: KID,
  },
  'pro-carlsen-kid::0::Re1@16': {
    intro: { say: "Re1 — White defends e4 in the Fianchetto King's Indian. Break the centre with …exd4, then …Nc5 hitting e4, or keep tension with …c6 and …a5; if White holds firm, reroute …Nh5 and prepare …f5 for the kingside play. Black has active, well-founded counterchances.", sayShort: 'Re1 — …exd4, then …Nc5 hits e4.' }, sources: KID,
  },
  'pro-carlsen-kid::0::d5@16': {
    intro: { say: "d5 — White locks the centre in the Fianchetto King's Indian, and that suits you. With the centre closed, reroute …Nc5 and …a5 to grip the queenside, then swing the knights kingside and launch …Nh5, …f5 and …f4; the closed structure guarantees your attack a free run. Play for the kingside storm.", sayShort: 'd5 — …Nc5 and …a5, then …f5 storm.' }, sources: KID,
  },
  'pro-carlsen-kid::0::Be3@16': {
    intro: { say: "Be3 — White develops the bishop in the Fianchetto King's Indian. Hit it with …Ng4, or break with …exd4 and …Nc5 targeting e4; the bishop on e3 can become a mark for …Ng4 and …exd4 tricks. Black keeps the pieces active and the centre contested. Comfortable play.", sayShort: 'Be3 — …Ng4 hits it, or …exd4.' }, sources: KID,
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

  // ===== King's Indian — Makogonov (student BLACK) =====
  'pro-carlsen-kid::2::Bg5@10': {
    intro: { say: "Bg5 — the Makogonov King's Indian with an active pin. Strike …e5, and if the centre locks reroute …Nbd7 and …c6, chipping with …h6 to question the bishop; then the standard …f5 break and kingside storm follow once White commits to d5. Black gets the rich, double-edged King's Indian fight.", sayShort: 'Bg5 — …e5 and …c6, then …f5.' }, sources: KID,
  },
  'pro-carlsen-kid::2::Nf3@10': {
    intro: { say: "Nf3 — a flexible Makogonov King's Indian. Play …e5, then …Nc6 or …Na6 and …exd4, opening lines, or …c6 and …a5 for queenside space; if White locks with d5 you launch the …f5 break and the kingside avalanche. Black follows the trusted King's Indian plan.", sayShort: 'Nf3 — …e5 and …Nc6, then …f5.' }, sources: KID,
  },

  // ===== King's Indian — Sämisch (student BLACK) =====
  'pro-carlsen-kid::3::Bg5@10': {
    intro: { say: "Bg5 — the Steiner Attack against the Sämisch King's Indian. Counter the big centre with …c5, offering a Benoni-style pawn to open lines, or …Nc6 and …a6 with …Rb8 and …b5 on the queenside; …h6 also questions the bishop. Black strikes back rather than sitting passively. Sharp, double-edged play.", sayShort: 'Bg5 — …c5, or …Nc6 and …a6.' }, sources: KID,
  },
  'pro-carlsen-kid::3::Nge2@10': {
    intro: { say: "Nge2 — the classical Sämisch King's Indian setup. Break with …c5 hitting d4, or …e5 and after d5 the plan of …Nh5 and …f5 storming the king; on the queenside, …Nc6, …a6 and …b5 also cracks White open. Black chooses the wing and attacks the big centre. Rich, fighting chess.", sayShort: 'Nge2 — …c5, or …e5 then …f5.' }, sources: KID,
  },
  'pro-carlsen-kid::3::dxc5@12': {
    intro: { say: "dxc5 — the Sämisch Gambit, but the capture opens the game in your favour. Recapture …dxc5; if the queens come off you have a pleasant endgame, and either way …Nc6, …Be6 hitting c4 and …Rd8 hand you active pressure on White's loosened centre. Black develops fast against the extended pawns.", sayShort: 'dxc5 — …dxc5, then …Nc6 and …Be6.' }, sources: KID,
  },
  'pro-carlsen-kid::3::d5@12': {
    intro: { say: "d5 — White locks the centre in the Sämisch, a Benoni structure. Challenge it with …e6, prising open lines against d5, or shift wings: …Ne8 and …f5 for the kingside, or …a6 and …b5 in Benko style on the queenside. Black picks a break and attacks the fixed centre. Dynamic and sound.", sayShort: 'd5 — …e6, or …a6 and …b5.' }, sources: KID,
  },
  'pro-carlsen-kid::3::Qd2@14': {
    intro: { say: "Qd2 — White completes the Sämisch, connecting for O-O-O and a kingside pawn storm. Race on the other wing: …a6, …Rb8 and …b5 tearing open the queenside where the white king heads, or …cxd4 and …Be6 for piece play against c4; opposite-side attacks favour the faster striker. Black gets there first with the queenside break.", sayShort: 'Qd2 — …a6 and …Rb8, then …b5.' }, sources: KID,
  },
};
