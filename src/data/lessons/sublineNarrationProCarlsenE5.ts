import type { SublineNarration } from '../../services/sublineLesson';
const SCOTCH = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'];
const FOURK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'];
const KG = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Gambit'];

export const SUBLINE_NARRATION_PRO_CARLSEN_E5: Record<string, SublineNarration> = {

  // --- Tab 3: Scotch ---
  'pro-carlsen-ruy-lopez::3::Nf6@7': {
    intro: { say: "Nf6 — the main-line Mieses Scotch. After Nxc6 bxc6 e5 Qe7 Qe2 Nd5, gain space with c4 hitting the knight, then Nd2 and the queenside pressure; Black's doubled c-pawns are the long-term weakness. White's centre and better structure give the classic Scotch edge.", sayShort: 'Nf6 — c4 hits Nd5, press c6.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::Bb4+@7': {
    intro: { say: "Bb4+ — the Malaniuk check, provoking c3. After c3 Bc5 Be3 you have a broad pawn front; add Bc4 and O-O, and meet …Bxd4 with cxd4, building a strong centre. White's space and the bishop pair reward the extra central pawn.", sayShort: 'Bb4+ — c3 and Be3, build centre.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::Qf6@7': {
    intro: { say: "Qf6 — Black eyes the d4-knight and f2. After Be3 Bc5 support with c3, then Bc4 and O-O, blunting the pressure while you keep the centre. Trade off Black's active bishop and the healthier structure plus lead in development give White the pull.", sayShort: 'Qf6 — c3 and Bc4, hold centre.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::Bb4+@9': {
    intro: { say: "Bb4+ — the Romanishin check after Nb3. Meet it with c3, and after …Be7 grab space with f4 and Bd3, castling into a big kingside build. The advancing f-pawn and central pawns give White an aggressive, space-grabbing game with the initiative.", sayShort: 'Bb4+ — c3 then f4, grab space.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::a5@11': {
    intro: { say: "a5 — Black halts your a4-a5 clamp but loosens b5. Continue Nc3 and Bg5, then Nd5 or Bc4 with pressure, castling to safety. The weakened b5-square and White's harmonious development give a pleasant edge; occupy the outpost and press.", sayShort: 'a5 — Nc3 and Bg5, use b5.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::Qf6@11': {
    intro: { say: "Qf6 — Black centralises the queen in the Potter Scotch. After Qe2 continue Be3 and Nc3, keeping a5 in reserve to hit the b6-bishop, then castle. White's space and easier development outweigh the queen sortie; complete the pieces and press the queenside.", sayShort: 'Qf6 — Qe2 and Be3, then a5.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::4::g6@5': {
    intro: { say: "g6 — Black fianchettoes in the Three Knights. After d4 exd4 Nxd4 Bg7, develop Be3 and Bc4 or Bd3, castle, and use your strong d4-knight and central space. Black's setup is solid but passive, so White's freer development and the pull on the long diagonal give the edge.", sayShort: 'g6 — Be3 and Bc4, use centre.' }, sources: FOURK,
  },

  // --- Tab 3: Scotch (Black side) ---
  'pro-carlsen-1e5::3::Bc4@6': {
    intro: { say: "Bc4 — the Scotch Gambit, White giving a pawn for quick development. Reply …Nf6, and if e5 hits the knight strike back with …d5, forking the bishop and freeing your game; against O-O play …Bc5 or …Be7 and …O-O. Return the pawn if needed — accurate development leaves Black comfortably equal.", sayShort: 'Bc4 — …Nf6, then …d5 hits back.' }, sources: SCOTCH,
  },
  'pro-carlsen-1e5::3::Bd3@10': {
    intro: { say: "Bd3 — White develops after the central trades. Play …Bd6 and …O-O, then …Re8 seizing the open e-file and …Bg4 or …c6 to shore up d5. Your pieces flow to active squares and the open position gives Black easy equality; contest the e-file and press for the initiative.", sayShort: 'Bd3 — …Bd6 and …O-O, then …Re8.' }, sources: SCOTCH,
  },
  'pro-carlsen-1e5::3::c3@6': {
    intro: { say: "c3 — the Göring Gambit; decline it cleanly with …d5. After exd5 Qxd5 cxd4 …Bg4 pins the f3-knight, and you pressure the isolated d4-pawn with …O-O-O, …Nf6 and …Bxf3. Black's active pieces and the target on d4 give a comfortable, fully equal game.", sayShort: 'c3 — …d5, then …Bg4 pins f3.' }, sources: SCOTCH,
  },
  'pro-carlsen-1e5::3::Nd2@10': {
    intro: { say: "Nd2 — the Tartakower, White rerouting the knight toward b3. You have already freed with …d5; now play …Bd6 and …O-O, then …Re8 on the open file and …c6 or …Bg4 supporting the centre. Black's easy development and active pieces give equal, comfortable play; occupy the e-file first.", sayShort: 'Nd2 — …Bd6 and …O-O, then …Re8.' }, sources: SCOTCH,
  },
  'pro-carlsen-1e5::3::Qe2@10': {
    intro: { say: "Qe2 — White grabs space with e5, driving your knight to d5. Retreat the bishop …Bb6 and castle, then hit the e5-pawn with …d6 and …Re8; the advanced pawn becomes a target. Black's centralised d5-knight and active bishop give full counterplay — undermine e5 and the position is balanced.", sayShort: 'Qe2 — …Bb6 and …O-O, then …d6.' }, sources: SCOTCH,
  },

  // ===== pro-carlsen-kings-gambit (student WHITE) =====
  // --- Tab 0: Falkbeer Countergambit / Declined ---
  'pro-carlsen-kings-gambit::0::c6@5': {
    intro: { say: "c6 — the Nimzowitsch-Marshall, Black opening lines against your d5-pawn. Develop soundly: Nc3 and Nf3, then Bd3 or Bc4 and O-O, capturing on c6 or advancing when it helps. Give back the f4-pawn for smooth development; White's lead in pieces and the safer king outweigh Black's counterplay.", sayShort: 'c6 — Nc3 and Nf3, hold d5.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::0::Bd6@7': {
    intro: { say: "Bd6 — the Modern Transfer, Black developing behind the f4-pawn. Build the broad centre with c4 and d4, then Bd3 and O-O, and regain the pawn with Bxf4 at the right moment. White's pawns on c4 and d4 grip the centre; complete development and the space edge plus the recovered pawn tell.", sayShort: 'Bd6 — c4 and d4, then Bxf4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::0::bxc6@11': {
    intro: { say: "bxc6 — Black recaptures, accepting doubled c-pawns. Aim the bishop with Bc4, castle, and win back f4 with Bxf4 or d4 and Bxf4; then Nc3 and pressure the weak c-pawns. White's lead in development and the healthier structure give a comfortable, pressing edge.", sayShort: 'bxc6 — Bc4 and O-O, then Bxf4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::0::Qxd5@7': {
    intro: { say: "Qxd5 — Black grabs the pawn with the queen and is chased back by Nc3. Exploit the lost time: build with d4 and Bc4, castle, and regain f4 with Bxf4. Black's queen tour has cost tempi, so White's broad centre and development lead give a clear, pleasant initiative.", sayShort: 'Qxd5 — Nc3 gains tempo, then d4.' }, sources: KG,
  },

  // --- Tab 1: King's Gambit Accepted, Bishop's Gambit ---
  'pro-carlsen-kings-gambit::1::d5@5': {
    intro: { say: "d5 — Black hits back with the Bledow counter. Take Bxd5, and after …Nf6 Nc3 …Bb4 develop Nge2, eyeing the f4-pawn, then castle and play d4 for the centre. White's active d5-bishop and quick development are the gambit's compensation; regain f4 with the knight and keep the initiative.", sayShort: 'd5 — Bxd5, then Nge2 and O-O.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::1::Qh4+@5': {
    intro: { say: "Qh4+ — the Cozio check; play Kf1, the whole point of the Bishop's Gambit — you give up castling but gain time chasing the queen. After Nf3 and d4 you own a huge centre; break the kingside pawns with h4, hitting g5, and the exposed queen and loose pawns become targets.", sayShort: 'Qh4+ — Kf1, then d4 and h4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::1::Nc6@5': {
    intro: { say: "Nc6 — the Maurian, Black developing naturally. Seize the centre with d4 and Nc3, then Nf3 and O-O, regaining the pawn with Bxf4 when convenient. White's broad pawn centre and rapid development are the gambit's reward; finish castling and the pressure plus recovered material give the edge.", sayShort: 'Nc6 — d4 and Nc3, then Bxf4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::1::Ne7@5': {
    intro: { say: "Ne7 — the Steinitz Defense, Black bracing to meet d4 with …d5. After Nc3, d4 and the trades on d5, the check Bb5+ pins the c6-knight; then Nf3, O-O and Bxf4 recover the pawn. White's lead in development and pressure on the pinned knight and d5-pawn give a comfortable game.", sayShort: 'Ne7 — d4 and Bb5+, then Bxf4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::1::cxd5@11': {
    intro: { say: "cxd5 — Black recaptures, leaving an isolated d5-pawn. Check with Bb5+, trade or provoke …Bd7, then Nf3, O-O and Bxf4, regaining the pawn and blockading d5. White's lead in development and the target on the isolated pawn give a clean, pressing game; pile on d5 with the pieces.", sayShort: 'cxd5 — Bb5+, then O-O and Bxf4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::1::c6@5': {
    intro: { say: "c6 — the Lopez Defense, Black preparing …d5. Develop Nc3 and Bb3, tucking the bishop, then meet …d5 with exd5 and reopen the centre with d4; follow with Nf3, O-O and Bxf4. White's harmonious development and pressure on the light squares around f7 outweigh the gambit pawn.", sayShort: 'c6 — Nc3 and Bb3, then d4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::1::d6@5': {
    intro: { say: "d6 — Black plays solidly, then checks with …Qh4+ meeting Kf1. Build the centre with d4, trade the light bishops after …Be6 with Bxe6, and develop Nf3, hitting the h4-queen with tempo. White's broad centre and the initiative against the exposed queen give fine compensation; regain f4 and press.", sayShort: 'd6 — d4 and Nf3, chase the queen.' }, sources: KG,
  },
};
