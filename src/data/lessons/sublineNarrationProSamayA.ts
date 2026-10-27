import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Samay Raina repertoire batch A: Open Sicilian (student
// WHITE), the Sicilian Defence answers (student BLACK), and the 1.e4 e5 open games
// — Ruy Lopez, Scotch, Four Knights (student BLACK). House voice, board-safe,
// line-grounded. Every entry answers the opponent's frequent deviation with the
// student-side plan.

const MAROC = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const OSIC = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SICB = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SICB_C = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SCOTCH = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'];

export const SUBLINE_NARRATION_PRO_SAMAY_A: Record<string, SublineNarration> = {
  // ===== Open Sicilian (student WHITE) — Nc6 lines =====
  'pro-samayraina-open-sicilian::0::g6@7': {
    intro: { say: "g6 — the Accelerated Dragon, inviting a quick fianchetto. Clamp the centre with c4, the Maróczy Bind: the pawns on c4 and e4 take d5 and b5 away from Black, and after Nc3, Be2 and O-O you enjoy a lasting space squeeze. Deny the freeing breaks and press slowly on the queenside.", sayShort: 'g6 — c4 Maroczy Bind, squeeze.' }, sources: MAROC,
  },
  'pro-samayraina-open-sicilian::0::e5@7': {
    intro: { say: "e5 — the Kalashnikov, kicking the knight to grab space at the cost of a hole. Retreat Nb5 eyeing d6, and after …d6 reroute the knights with N1c3 and Na3; the d5-square becomes your permanent prize. Meet …b5 calmly and manoeuvre a knight toward d5 for a durable positional edge.", sayShort: 'e5 — Nb5, then aim knights at d5.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::0::e6@7': {
    intro: { say: "e6 — a flexible Scheveningen shell. Develop Nc3 and Be3, then Qd2 preparing the English Attack: O-O-O, f3 and g4 storm the kingside while Black is still catching up. Keep an eye on d5 and pour the pawns at the enemy king.", sayShort: 'e6 — Be3 and Qd2, then g4 storm.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::0::Qb6@7': {
    intro: { say: "Qb6 — the early queen sortie on b6 eyes d4 and b2. Simply retreat Nb3, gaining a tempo by nudging the queen, then Nc3 and Be3 with smooth development. The queen stands awkwardly out on b6, and your lead in space and time gives an easy game.", sayShort: 'Qb6 — Nb3 gains tempo, then Nc3.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::0::Qc7@7': {
    intro: { say: "Qc7 — Black eyes e5 and readies a quick queenside expansion. Develop Nc3 and Be3, then Qd2 for the English Attack with O-O-O, f3 and g4. You castle long and race the kingside pawns while the d5-square stays firmly under your control.", sayShort: 'Qc7 — Nc3, Be3, Qd2 English Attack.' }, sources: OSIC,
  },

  // ===== Open Sicilian (student WHITE) — e6 / Taimanov lines =====
  'pro-samayraina-open-sicilian::1::a6@7': {
    intro: { say: "a6 — the Kan, a flexible small-centre setup. Develop Bd3 aiming at the kingside, and if …Bc5 pokes at d4 step back with Nb3; then Qg4 pressures g7 and provokes weaknesses. A restrained, space-based edge where Black must play precisely to free the game.", sayShort: 'a6 — Bd3 and Nb3, then Qg4.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::Nf6@7': {
    intro: { say: "Nf6 — heading for a Scheveningen with …d6 to come. Hit it hard with the Keres Attack: Nc3 and g4, gaining space and driving the knight before Black castles. Follow with g5, h4 and a rolling pawn storm while your own king stays flexible.", sayShort: 'Nf6 — Nc3 then g4, Keres storm.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::a6@9': {
    intro: { say: "a6 — a Taimanov setup, keeping options open. Develop Nc3, Be2 and O-O, a calm classical build, then choose Be3 and f4 or a3 and Kh1 depending on Black's plan. Deny the …d5 and …b5 breaks, keep the space, and the position plays itself.", sayShort: 'a6 — Nc3, Be2, O-O, calm build.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::d6@9': {
    intro: { say: "d6 — Black transposes toward a Scheveningen structure. Continue Nc3 and Be3, then Qd2 and the choice between O-O-O with a kingside storm or a quiet Be2 and O-O. Guard d5, finish developing, and let your space advantage do the work.", sayShort: 'd6 — Nc3 and Be3, then Qd2.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::2::Bg7@5': {
    intro: { say: "Bg7 — the Pterodactyl, delaying the cxd4 capture to fianchetto first. Exploit the move order with dxc5, and after Qa5+ block with c3; Black regains the pawn with Qxc5, but Na3 then develops with tempo toward b5 and c4. You keep a broad centre and a comfortable lead in development.", sayShort: 'Bg7 — dxc5 and c3, then Na3.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::2::Nc6@7': {
    intro: { say: "Nc6 — Black develops and heads for a Dragon. Clamp with c4, the Maróczy Bind: the pawns on c4 and e4 smother the …d5 and …b5 breaks. Follow with Nc3, Be2 and Be3, and squeeze slowly; Black's fianchetto looks pretty but has little to bite on.", sayShort: 'Nc6 — c4 Maroczy Bind, then Nc3.' }, sources: MAROC,
  },
  'pro-samayraina-open-sicilian::2::Bg7@7': {
    intro: { say: "Bg7 — the fianchetto first, still steering into a Maróczy. Grab the bind with c4, then Be3 and Nc3 for the classic clamp; if Black tries Ng4, tuck the bishop to d2 or trade on d4. Keep the c4-e4 wall intact and squeeze the space Black cannot break.", sayShort: 'Bg7 — c4 bind, then Be3 and Nc3.' }, sources: MAROC,
  },
  'pro-samayraina-open-sicilian::2::d6@9': {
    intro: { say: "d6 — a straight Dragon setup. Develop Be3, then choose your system: Be2, O-O and f3 for a calm build, or Qd2 and O-O-O for the Yugoslav Attack. Cover d5, coordinate your pieces, and steer the middlegame toward your extra space.", sayShort: 'd6 — Be3, then Be2 or Qd2.' }, sources: OSIC,
  },

  // ===== Sicilian Defence (student BLACK) — Bowdler Attack (2.Bc4) =====
  'pro-samayraina-sicilian-black::0::Qe2+@8': {
    intro: { say: "Qe2+ — a nagging check to disrupt your development. Block with …Be7, a natural developing move, and after Bb5+ interpose …Bd7 offering a trade. The checks lead nowhere: you finish with …Nf6, …O-O and …Nc6, and the healthy centre and free pieces leave Black comfortable.", sayShort: 'Qe2+ — …Be7, then …Bd7 blocks.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::Bb3@8': {
    intro: { say: "Bb3 — the bishop drops back to keep pressure on d5. Guard the pawn naturally with …Nf6, then …Be7 and …O-O, and support the centre with …Nc6 or …c6. Your pieces develop with ease; the open position suits Black once the king is safe.", sayShort: 'Bb3 — …Nf6 and …Be7, guard d5.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::d4@10': {
    intro: { say: "d4 — White breaks in the centre before castling. Develop …Nf6, hitting nothing loose and preparing …Be7 and …O-O, and only then release the tension with …cxd4. Do not chase pawns early; sound development leaves Black with an easy, balanced middlegame.", sayShort: 'd4 — …Nf6, then …Be7 and …O-O.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::Qe2+@10': {
    intro: { say: "Qe2+ — another disruptive check. Interpose …Be7, a developing block, then castle …O-O and unpin the position at your leisure. White's queen sortie gains nothing lasting; Black continues …Nf6 and …Bd7 with a comfortable open game.", sayShort: 'Qe2+ — …Be7 blocks, then …O-O.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::Bxc6+@10': {
    intro: { say: "Bxc6+ — White trades to inflict doubled pawns. Recapture …bxc6, and welcome it: you gain the bishop pair and a broad pawn centre, with the half-open b-file for your rooks. Develop …Nf6, …Bd6 and …O-O; the two bishops outweigh the small structural cost.", sayShort: 'Bxc6+ — …bxc6, bishop pair and centre.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::Nf3@6': {
    intro: { say: "Nf3 — a natural developing move in the Alapin. Continue …Nf6, then …e6 and …Nc6, hitting the d4-pawn and completing development smoothly. Follow with …Be7 and …O-O; Black's harmonious setup and pressure on d4 give an easy, equal game.", sayShort: 'Nf3 — …Nf6, then …e6 and …Nc6.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::dxc5@10': {
    intro: { say: "dxc5 — White releases the centre and grabs a pawn. Regain it immediately with …Qxc5, and the queen sits well eyeing c2 and the queenside. Follow with …Nc6, …e6 and long-castle ideas; Black develops fast and the level material leaves a comfortable game.", sayShort: 'dxc5 — …Qxc5 regains, then develop.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::Qa4+@10': {
    intro: { say: "Qa4+ — a check that also hits your bishop. Block with …Bd7, chasing the queen and gaining time, and after Qb3 strike with …cxd4. The queen sortie costs White tempo, and Black completes development with …Nc6 and …e6 for a comfortable, balanced position.", sayShort: 'Qa4+ — …Bd7 gains time, then …cxd4.' }, sources: SICB,
  },

  // ===== Sicilian Defence (student BLACK) — Closed, Grand Prix, 2.Nc3 lines =====
  'pro-samayraina-sicilian-black::3::g3@4': {
    intro: { say: "g3 — the Closed Sicilian, White fianchettoing to press the long diagonal. Mirror the setup: …g6 and …Bg7, then …d6, …e6 and …Nge7, keeping the structure flexible. Aim for the …b5 and …d5 breaks in time; Black gets a sound middlegame with chances on both wings.", sayShort: 'g3 — …g6 and …Bg7, mirror setup.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Bb5@4': {
    intro: { say: "Bb5 — White pins and eyes a trade on c6. Sidestep with …Nd4, planting the knight in the centre and gaining a tempo on the bishop, then …e6 and …Nf6 developing naturally. The active …Nd4 gives Black an easy, comfortable game with no structural concessions.", sayShort: 'Bb5 — …Nd4 centralizes, then …e6.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Bc4@12': {
    intro: { say: "Bc4 — the bishop targets f7 and e6. Strike back with …d5, hitting it and claiming the centre; the bishop retreats and you stand with a broad c6-d5-e6 pawn front. Develop …Nf6, …Bd6 and …O-O; the strong centre and active pieces give Black a comfortable, promising middlegame.", sayShort: 'Bc4 — …d5 hits it, claims centre.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::3::f4@4': {
    intro: { say: "f4 — the Grand Prix Attack, White aiming for a kingside pawn storm. Fianchetto for defence and counterplay: …g6 and …Bg7, then …d6, …e6 and …Nge7, avoiding the pin on the c6-knight. Break with …d5 or …b5; the …e6 and …Nge7 setup takes the sting out of the attack.", sayShort: 'f4 — …g6 and …Bg7, then …e6.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Be2@12': {
    intro: { say: "Be2 — a modest developing move in this open Sicilian. Continue …Ne7, heading for g6 or f5, then …d5 striking with your c6-d5-e6 pawn front. Add …Bd6 and …O-O; the mobile centre and active bishops give Black a comfortable, promising game.", sayShort: 'Be2 — …Ne7, then …d5 hits centre.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::3::Nge2@4': {
    intro: { say: "Nge2 — the Chameleon, keeping White's setup flexible. Develop naturally: …Nf6 and …d5, challenging the centre at once, or …g6 and …Bg7 for a Closed structure. With White's knight passive on e2, the immediate …d5 break gives Black a comfortable share of the centre.", sayShort: 'Nge2 — …Nf6, then …d5 break.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Qg4@12': {
    intro: { say: "Qg4 — an early queen raid on g7. Defend with …Qf6, guarding the pawn and offering to contest the centre, then …d5 and …Bd6 with smooth development. The queen must lose time retreating; Black's central pawns and quick development seize the initiative.", sayShort: 'Qg4 — …Qf6 guards g7, then …d5.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Be3@12': {
    intro: { say: "Be3 — White offers to trade your active bishop. Accept with …Bxe3, and after fxe3 White is left with doubled, damaged kingside pawns. Build with …d5, …Ne7 and …O-O; Black's sound centre against White's ragged structure gives the more comfortable game.", sayShort: 'Be3 — …Bxe3 doubles White pawns.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::e5@12': {
    intro: { say: "e5 — White grabs kingside space, but the pawn can become a target. Reroute with …Ne7, heading for f5 or g6 to press e5, then …d6 undermining it. Develop the bishops and castle; the pressure on the advanced e5-pawn gives Black an active, comfortable game.", sayShort: 'e5 — …Ne7, then …d6 undermines it.' }, sources: SICB,
  },

  // ===== 1.e4 e5 open games (student BLACK) — Scotch =====
  'pro-samayraina-open-e5::1::Nxc6@8': {
    intro: { say: "Nxc6 — the Mieses main line, White trading and pushing e5. Recapture …bxc6, and when e5 hits the knight, play …Qe7 pinning the pawn, then …Nd5 centralising. Continue …Ba6 and …g6 with …Bg7; the solid pawn mass and active pieces give Black a comfortable, well-tested game.", sayShort: 'Nxc6 — …bxc6, then …Qe7 and …Nd5.' }, sources: SCOTCH,
  },
  'pro-samayraina-open-e5::1::Bc4@6': {
    intro: { say: "Bc4 — the Scotch Gambit, White sacrificing the d4-pawn for quick development against f7. Grab it and hold on soundly: …Nf6 hitting e4, then …Bc5 or …Bb4+ and …d6 to blunt the attack, or the sharp …Nxe4 line. Return the pawn if needed for development; Black equalises with careful, active play.", sayShort: 'Bc4 — …Nf6 hits e4, then …Bc5.' }, sources: SCOTCH,
  },
  'pro-samayraina-open-e5::1::c3@6': {
    intro: { say: "c3 — the Göring Gambit, offering a second pawn. Decline cleanly with …d5, hitting e4 and freeing your game; after exd5 …Qxd5 the centre opens in your favour, and cxd4 …Bg4 pins the knight with pressure on d4. Black develops fast and comfortably, sidestepping all the gambit tricks.", sayShort: 'c3 — …d5 declines, then …Qxd5 and …Bg4.' }, sources: SCOTCH,
  },
};
