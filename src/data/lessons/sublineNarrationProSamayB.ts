import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Samay Raina repertoire, batch B: Ruy Lopez, Italian,
// French Exchange, Caro-Kann (Accelerated Panov + Exchange), King's Gambit
// (student WHITE); Scandinavian (student BLACK). House voice, board-safe,
// line-grounded. Every entry answers the opponent's frequent deviation with the
// student-side plan.

const RUY = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const FR = ['concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'];
const CK = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const SC = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const KG = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Gambit'];

export const SUBLINE_NARRATION_PRO_SAMAY_B: Record<string, SublineNarration> = {
  'pro-samayraina-ruy::2::exd4@7': {
    intro: { say: "exd4 — Black releases the centre early in the Steinitz. Recapture Nxd4, and your knight sits proudly in the middle while Nc3, O-O and Re1 finish development. Black's cramped, passive setup gives you a lasting space edge; probe patiently and the extra room does the work.", sayShort: 'exd4 — Nxd4, then Nc3 and O-O.' }, sources: RUY,
  },
  'pro-samayraina-french-white::1::Nc6@7': {
    intro: { say: "Nc6 — Black develops naturally in the Exchange. Show the point of Bd3: play c3, Qf3 pressuring d5 and f7, then Ne2 heading to g3 or f4. Do not settle for symmetry — the queen sortie and the knight reroute build a real kingside initiative from a level structure.", sayShort: 'Nc6 — c3, Qf3, then Ne2-g3.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::c5@7': {
    intro: { say: "c5 — Black strikes at d4, and after Nf3 …c4 they gain space but releases the central tension. That hands you a free hand in the middle: retreat Be2, castle, then undermine with b3 and play f3-e4, or plant a knight on e5. The over-extended c4-pawn becomes a target.", sayShort: 'c5 — Be2 and b3, hit c4.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::Nf6@7': {
    intro: { say: "Nf6 — Black mirrors development in the Exchange. Keep it lively: O-O, Re1 and Bg5 pinning the knight, with c3 and Nbd2 to follow. The structure is symmetric but the initiative is not — grab the e-file and the better minor piece and press for the small edge.", sayShort: 'Nf6 — O-O, Re1, Bg5 pin.' }, sources: FR,
  },
  'pro-samayraina-caro-white::1::Qc7@9': {
    intro: { say: "Qc7 — Black eyes …Bg4 and central breaks in the Exchange. Sidestep the pin with Ne2, then f3 and O-O, and trade the good bishop with Bf4; add Qc2 and the slow pressure. Your extra tempo and the plan of a minority attack with b4-b5 give the classic Exchange pull.", sayShort: 'Qc7 — Ne2 and Bf4, then Qc2.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::Nf6@7': {
    intro: { say: "Nf6 — Black develops in the Exchange. Grab the initiative with Qb3, pressuring b7 and d5, then Bf4 to trade the good bishop and Nd2-f3. The minority attack with b4-b5 looms on the queenside; Black stays tied to their weaknesses while White presses on both flanks.", sayShort: 'Nf6 — Qb3 and Bf4, press queenside.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::g6@9': {
    intro: { say: "g6 — Black fianchettoes to fight for the long diagonal. Complete calmly: Nf3, O-O and Re1, then Bf4 or Bg5, and prepare the b4-b5 minority attack against the c6-square. The Exchange edge is small but real — press the queenside and keep the better structure.", sayShort: 'g6 — Nf3, O-O, then minority attack.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::e6@9': {
    intro: { say: "e6 — Black locks their own light-squared bishop inside the chain. Exploit it: Bf4 to trade the good bishop and meet …Bd6 with Bxd6, then Qc2, Nd2-f3 and O-O. Black is left with the bad bishop and a passive game; press d5 and the queenside minority attack.", sayShort: 'e6 — Bf4, trade, then punish bad bishop.' }, sources: CK,
  },

  // ===== Scandinavian Defense (student BLACK) =====
  'pro-samayraina-scandi::0::Bc4@6': {
    intro: { say: "Bc4 — White aims the bishop at f7 in the main line. Complete the solid Scandi setup: …Nf6, …c6 giving the queen a home, then …Bf5 or …Bg4 developing the light bishop outside the chain, and …e6 with …Nbd7. Neutralise the c4-bishop with …e6 and later …b5; a rock-solid, comfortable game.", sayShort: 'Bc4 — …Nf6 and …c6, then …Bf5.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Nf3@6': {
    intro: { say: "Nf3 — White develops naturally against your …Qa5 Scandi. Follow the classic path: …Nf6, …c6, …Bf5 getting the bishop active before …e6, then …Nbd7, …e6 and …Bd6 or …Be7 with castling. Solid and harmonious — you finish development smoothly and have no weaknesses to nurse.", sayShort: 'Nf3 — …Nf6, …c6, then …Bf5.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Bd2@8': {
    intro: { say: "Bd2 — White unpins and readies queenside castling. Carry on developing: …c6, …Bf5, …e6 and …Nbd7, then …Bd6 and castle. Watch for opposite-side castling — if White goes long, meet it with …b5 and a queenside pawn push. The bishop on f5 outside the chain keeps you comfortable.", sayShort: 'Bd2 — …c6 and …Bf5, then castle.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::g3@6': {
    intro: { say: "g3 — White fianchettoes to pressure d5 and the long diagonal. Contest the light squares: …Nf6, …c6, then …Bg4 pinning the f3-knight to trade off White's key attacker, followed by …e6 and …Nbd7. Once the light-square pressure is neutralised, your solid structure equalises with ease.", sayShort: 'g3 — …Nf6, …c6, then …Bg4 pin.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Ne5@10': {
    intro: { say: "Ne5 — White plants a knight on e5 in the Mieses. Challenge it rather than fear it: …Be6 developing, then …Nbd7 hitting the intruder, and after it moves or trades you complete with …e6 and …Bd6. Black is solid; kick the e5-knight and your comfortable structure remains.", sayShort: 'Ne5 — …Be6 and …Nbd7, challenge it.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Bd2@10': {
    intro: { say: "Bd2 — White prepares to castle long in the Mieses. Develop with purpose: …Bf5 outside the chain, …e6, …Nbd7 and …Bd6, then castle. If White heads queenside, launch …b5 and …a5 to open lines at their king; the queen on a5 is already aimed there. Solid and flexible.", sayShort: 'Bd2 — …Bf5 and …e6, prepare …b5.' }, sources: SC,
  },
  'pro-samayraina-kings-gambit::1::Bd6@9': {
    intro: { say: "Bd6 — Black develops the bishop toward your kingside and castles. Grab space with c4, hitting d5, then Nc3 and Bxf4 to reclaim the pawn; O-O completes it. The broad d4-c4 centre and the lead in development promise White a comfortable, pressing game against the Falkbeer.", sayShort: 'Bd6 — c4, Nc3, then Bxf4 regains.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Ne3@11': {
    intro: { say: "Ne3 — Black forks with the knight, but you are happy to trade: Bxe3 fxe3, and Black's f4-pawn vanishes while the e3-pawn is left weak and isolated. Open the f-file with your rook, round up e3 with Qd3 and Nc3, and the strong centre plus the files hand White the better game.", sayShort: 'Ne3 — Bxe3 fxe3, then round up e3.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::c6@9': {
    intro: { say: "c6 — Black challenges the d5-pawn. Simplify to your advantage: dxc6 Nxc6, then Bxf4 reclaiming the gambit pawn with a clean centre and a lead in development. Add Nc3 and Bc4, and Black's …c6 has merely cost time; White stands comfortably better with the healthier position.", sayShort: 'c6 — dxc6, then Bxf4 regains it.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Qxd5@9': {
    intro: { say: "Qxd5 — Black recaptures with the queen, bringing her out too early. Punish the tempo: Bxf4 regains the pawn, then Nc3 hits the d5-queen with gain of time, and O-O follows. Every developing move comes with a threat to the exposed lady; White seizes the initiative and the better game.", sayShort: 'Qxd5 — Bxf4, then Nc3 hits queen.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Qe7+@11': {
    intro: { say: "Qe7+ — Black checks, hoping to disrupt your king. Step up boldly with Kf2, a sound king move that shelters behind your own centre; the checks quickly run dry. Meet …Ne3 with Bxe3 fxe3, keep the two bishops and the strong d4-pawn, and White emerges better despite the missing castling rights.", sayShort: 'Qe7+ — Kf2, then Bxe3 meets …Ne3.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::c6@11': {
    intro: { say: "c6 — Black supports the d5-knight and readies …b5. Keep it simple: O-O, then Bxf4 recovering the pawn and Nbd2 or Nc3 developing with pressure on d5, and Re1 down the file. The broad d4-centre and your lead in development give White a comfortable, risk-free edge.", sayShort: 'c6 — O-O, Bxf4, then press d5.' }, sources: KG,
  },
};
