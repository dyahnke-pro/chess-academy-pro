import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Carlsen 1.e4 e5 repertoire. pro-carlsen-ruy-lopez
// (Italian / Anti-Berlin / Petrov / Scotch / Four-Knights, student WHITE) and
// pro-carlsen-kings-gambit (student WHITE) answer the opponent's Black
// deviation; pro-carlsen-1e5 is the mirror BLACK repertoire (student BLACK,
// "…" notation) meeting White's deviations after 1.e4 e5. House voice,
// board-safe, line-grounded — each entry names the opponent move, then the
// student-side plan for the actual structure in that line's moves.

const ITAL = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Italian_Game'];
const RUY = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const PETR = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];
const SCOTCH = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'];
const FOURK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'];
const KG = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Gambit'];

export const SUBLINE_NARRATION_PRO_CARLSEN_E5: Record<string, SublineNarration> = {
  // ===== pro-carlsen-ruy-lopez (student WHITE) =====
  // --- Tab 0: Italian, Two Knights / Giuoco Pianissimo ---
  'pro-carlsen-ruy-lopez::0::Be7@7': {
    intro: { say: "Be7 — Black chooses the quiet bishop instead of Bc5. Build the standard Pianissimo: O-O, Re1 and c3, then the Nbd2-f1-g3 reroute, and break with d4 once your pieces are set. The passive setup concedes space, so your extra central tempo and the c4-bishop's eye toward f7 give an easy, lasting pull.", sayShort: 'Be7 — O-O, c3, then reroute and d4.' }, sources: ITAL,
  },
  'pro-carlsen-ruy-lopez::0::O-O@11': {
    intro: { say: "O-O — Black castles in the Pianissimo. Mirror with Re1 and Nbd2, reroute the knight Nf1-g3, and prepare the d4 break at the ideal moment. This slow manoeuvring battle rewards White's extra space and lead in the reroute; press on the kingside once the centre opens.", sayShort: 'O-O — Re1 and Nbd2, then d4.' }, sources: ITAL,
  },
  'pro-carlsen-ruy-lopez::0::a6@11': {
    intro: { say: "a6 — Black readies …Ba7, tucking the bishop before a coming d4. Continue Re1, Nbd2 and h3, then the Nf1-g3 reroute, striking with d4 when everything is ready. The quiet Italian hands White a risk-free space edge and harmonious development.", sayShort: 'a6 — Re1 and Nbd2, then d4.' }, sources: ITAL,
  },
  'pro-carlsen-ruy-lopez::0::h6@7': {
    intro: { say: "h6 — Black spends a tempo to stop Ng5 and Bg5. Just build: c3, O-O and Nbd2, aiming for the d4 break. The luft costs time in a quiet position, so your smooth development and central space give a comfortable, risk-free game.", sayShort: 'h6 — c3, O-O, then d4.' }, sources: ITAL,
  },
  'pro-carlsen-ruy-lopez::0::O-O@9': {
    intro: { say: "O-O — Black castles early in the Pianissimo. Reply c3 and Re1, then Nbd2-f1-g3 rerouting the knight while you prepare d4. The extra central space and tempo give White the small, durable edge the quiet Italian is built to press.", sayShort: 'O-O — c3 and Re1, then reroute.' }, sources: ITAL,
  },
  'pro-carlsen-ruy-lopez::0::h6@11': {
    intro: { say: "h6 — a luft in the Pianissimo. Play Nbd2 and Re1, completing the reroute toward g3, then break with d4 at the right moment. It is a slow manoeuvring battle where White's central space and lead in development give the better game; patience is rewarded.", sayShort: 'h6 — Nbd2 and Re1, then d4.' }, sources: ITAL,
  },
  'pro-carlsen-ruy-lopez::0::a6@9': {
    intro: { say: "a6 — Black prepares …Ba7 and a queenside expansion. Continue c3, Re1 and Nbd2, keeping the option of a4 to clamp, and build toward d4. The quiet structure lets White develop first and strike the centre with the better-placed pieces.", sayShort: 'a6 — c3 and Re1, then d4.' }, sources: ITAL,
  },
  'pro-carlsen-ruy-lopez::0::Bb6@11': {
    intro: { say: "Bb6 — Black retreats the bishop out of a coming d4's path. Continue Nbd2, Re1 and h3, then prepare d4 with tempo. White's harmonious setup and the central break give a pleasant, no-risk pull; the b6-bishop bites on granite while your pieces flow.", sayShort: 'Bb6 — Nbd2 and Re1, then d4.' }, sources: ITAL,
  },

  // --- Tab 1: Ruy Lopez, Anti-Berlin (Bb5, d3) ---
  'pro-carlsen-ruy-lopez::1::d6@7': {
    intro: { say: "d6 — the solid Anti-Berlin. Build slowly with c3, O-O and Nbd2, keeping the b5-bishop and rerouting toward the kingside before d4. Black's setup is sound but passive, so White's space and the familiar Ruy manoeuvring give a nagging, long-term edge.", sayShort: 'd6 — c3, O-O, then reroute.' }, sources: RUY,
  },
  'pro-carlsen-ruy-lopez::1::Qe7@11': {
    intro: { say: "Qe7 — Black connects for queenside castling after the exchange on c6. Play Nbd2 and Re1, heading for Nc4 and the d4 break; your healthy kingside majority is the trump, while Black's doubled c-pawns are a long-term target. Trade into a favourable structure and press.", sayShort: 'Qe7 — Nbd2 and Nc4, target c6.' }, sources: RUY,
  },
  'pro-carlsen-ruy-lopez::1::Bg4@11': {
    intro: { say: "Bg4 — Black pins the f3-knight after the exchange on c6. Break the pin with h3, and if …Bh5 add Nbd2 and g4, or simply Qe2; your kingside pawn majority and Black's doubled c-pawns define the game. Untangle calmly and grind the healthier structure.", sayShort: 'Bg4 — h3 breaks pin, press majority.' }, sources: RUY,
  },
  'pro-carlsen-ruy-lopez::1::Bd6@11': {
    intro: { say: "Bd6 — Black regroups the bishop toward the kingside. Continue Nbd2 and Re1, angling for Nc4 to hit the d6-bishop and prepare d4. With the healthier pawns and a kingside majority, White holds the only lasting imbalance; improve patiently and press.", sayShort: 'Bd6 — Nbd2 and Nc4, then d4.' }, sources: RUY,
  },
  'pro-carlsen-ruy-lopez::1::Qd6@11': {
    intro: { say: "Qd6 — Black centralises the queen after the trade on c6. Play Nbd2 with Nc4 to follow, gaining a tempo on the queen and steering toward d4. Your kingside majority is healthy while Black's doubled c-pawns linger; nudge the pieces and squeeze.", sayShort: 'Qd6 — Nbd2 then Nc4 hits queen.' }, sources: RUY,
  },

  // --- Tab 2: Petrov, Classical Attack ---
  'pro-carlsen-ruy-lopez::2::Nc6@11': {
    intro: { say: "Nc6 — the Mason-Showalter Petrov, Black developing and eyeing …Bg4. Castle, then strike with c4 to open the centre against d5, and pressure the e4-knight with Re1 and Nc3. White's freer development and the queenside space give the small, well-mapped edge the Classical Petrov promises.", sayShort: 'Nc6 — O-O and c4, hit d5.' }, sources: PETR,
  },
  'pro-carlsen-ruy-lopez::2::Be7@11': {
    intro: { say: "Be7 — Black develops solidly in the Classical Petrov. Play O-O and c4, challenging d5, then Re1 and Nc3 to pressure the e4-knight. The symmetrical centre favours the better-developed side; White's initiative and slight space edge are yours to press slowly.", sayShort: 'Be7 — O-O and c4, press e4.' }, sources: PETR,
  },
  'pro-carlsen-ruy-lopez::2::Bf5@11': {
    intro: { say: "Bf5 — Black offers to trade off your active d3-bishop. Castle and meet …Bxd3 with Qxd3, keeping a comfortable centre, then break with c4 against d5. White's lead in development and the pressure on the e4-knight give a pleasant, risk-free pull.", sayShort: 'Bf5 — O-O, recapture Qxd3, then c4.' }, sources: PETR,
  },

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
  'pro-carlsen-ruy-lopez::3::Nf6@13': {
    intro: { say: "Nf6 — Black completes development in the Potter Scotch. Continue a5, chasing the b6-bishop, then Bg5 or Be3 and O-O, with Nd5 ideas to follow. White's queenside space from a4-a5 and the active pieces give a comfortable, pressing middlegame.", sayShort: 'Nf6 — a5 chases bishop, then O-O.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::a5@11': {
    intro: { say: "a5 — Black halts your a4-a5 clamp but loosens b5. Continue Nc3 and Bg5, then Nd5 or Bc4 with pressure, castling to safety. The weakened b5-square and White's harmonious development give a pleasant edge; occupy the outpost and press.", sayShort: 'a5 — Nc3 and Bg5, use b5.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::Nge7@13': {
    intro: { say: "Nge7 — Black routes the knight toward g6 in the Potter. Play a5 to chase the b6-bishop, then Be3 and Nd5, seizing the central outpost. White's queenside space and the strong knight give the better game; clamp first, then invade.", sayShort: 'Nge7 — a5, then Be3 and Nd5.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::Qf6@11': {
    intro: { say: "Qf6 — Black centralises the queen in the Potter Scotch. After Qe2 continue Be3 and Nc3, keeping a5 in reserve to hit the b6-bishop, then castle. White's space and easier development outweigh the queen sortie; complete the pieces and press the queenside.", sayShort: 'Qf6 — Qe2 and Be3, then a5.' }, sources: SCOTCH,
  },
  'pro-carlsen-ruy-lopez::3::Qf6@13': {
    intro: { say: "Qf6 — Black eyes f2 and the centre after Nc3. Play Be3 defending, then a5 chasing the b6-bishop and Nd5 hitting the queen with tempo. White's queenside space and the central outpost give a clear, comfortable edge; harass the queen and take d5.", sayShort: 'Qf6 — Be3 and a5, then Nd5.' }, sources: SCOTCH,
  },

  // --- Tab 4: Four Knights / Three Knights ---
  'pro-carlsen-ruy-lopez::4::O-O@13': {
    intro: { say: "O-O — Black castles in the Scotch Four Knights. Reply O-O, then Bg5 and Qf3, eyeing e5 and the pressure on the pinned f6-knight. Black's doubled c-pawns are a permanent weakness while White's bishops and lead in development supply the initiative.", sayShort: 'O-O — Bg5 and Qf3, target c6.' }, sources: FOURK,
  },
  'pro-carlsen-ruy-lopez::4::O-O@15': {
    intro: { say: "O-O — Black castles before regaining d5. Play O-O and Bg5, and after …cxd5 add Qf3 with pressure on d5 and the kingside. White's superior structure — Black's c-pawns stay doubled — and the two bishops give a small but real edge to nurse.", sayShort: 'O-O — O-O and Bg5, then Qf3.' }, sources: FOURK,
  },
  'pro-carlsen-ruy-lopez::4::Bb4@7': {
    intro: { say: "Bb4 — Black pins the c3-knight before capturing. Strike with d5, hitting the c6-knight and gaining space, or grab the pawn with Nxe5, the well-known tactic when Black is careless. Either way White's centre and initiative come first; keep the pieces active and the pin loses its sting.", sayShort: 'Bb4 — d5 hits Nc6, or Nxe5.' }, sources: FOURK,
  },
  'pro-carlsen-ruy-lopez::4::g6@5': {
    intro: { say: "g6 — Black fianchettoes in the Three Knights. After d4 exd4 Nxd4 Bg7, develop Be3 and Bc4 or Bd3, castle, and use your strong d4-knight and central space. Black's setup is solid but passive, so White's freer development and the pull on the long diagonal give the edge.", sayShort: 'g6 — Be3 and Bc4, use centre.' }, sources: FOURK,
  },
  'pro-carlsen-ruy-lopez::4::Bc5@9': {
    intro: { say: "Bc5 — Black attacks the d4-knight with the bishop. Play Be3, offering to trade, and meet …Bxd4 with Bxd4, keeping the bishop pair and a fine central knight if it stays. White's harmonious development and the pressure down the centre give a comfortable, familiar edge.", sayShort: 'Bc5 — Be3, recapture Bxd4, keep bishops.' }, sources: FOURK,
  },
  'pro-carlsen-ruy-lopez::4::Qe7+@15': {
    intro: { say: "Qe7+ — Black checks before regaining d5. Interpose Qe2, offering the trade; after …Qxe2+ Bxe2 you reach an endgame where Black's doubled c-pawns are the lasting weakness and your bishop pair tells. Simplify with confidence — the healthier structure is the edge.", sayShort: 'Qe7+ — Qe2 trades, press doubled pawns.' }, sources: FOURK,
  },

  // ===== pro-carlsen-1e5 (student BLACK) =====
  // --- Tab 0: Italian, Two Knights / Modern Bishop (Black side) ---
  'pro-carlsen-1e5::0::d4@6': {
    intro: { say: "d4 — White strikes the centre in the Two Knights. Take with …exd4, and after e5 play the key …d5, hitting the c4-bishop and blunting the pawn; you return the material and reach a sound, active game. Do not fear the open lines — your pieces come out fast and the e5-pawn becomes a target.", sayShort: 'd4 — …exd4, then …d5 frees.' }, sources: ITAL,
  },
  'pro-carlsen-1e5::0::c3@12': {
    intro: { say: "c3 — White readies the d4 push in the quiet Italian. Reroute with …Na5, questioning the light bishop, or …Nd7 heading for f8 and g6, and prepare the …d5 break with …c6. Keep the centre solid; once you free with …d5 your pieces are as active as White's and the game is balanced.", sayShort: 'c3 — …Na5 or …Nd7, then …d5.' }, sources: ITAL,
  },
  'pro-carlsen-1e5::0::Bb3@10': {
    intro: { say: "Bb3 — White tucks the bishop safe on b3 before …Na5 ideas. Continue …d6 and …Nd7, rerouting toward f8 and g6, or play …a5 and …a4 to harass the bishop; the …d5 break stays your long-term freeing idea. A calm, equal middlegame where activity decides.", sayShort: 'Bb3 — …d6 and …Nd7, aim …d5.' }, sources: ITAL,
  },
  'pro-carlsen-1e5::0::Nc3@8': {
    intro: { say: "Nc3 — White develops naturally in the Modern Bishop's setup. Castle with …O-O, then …d6 and …Na5 to trade the light bishop, or …Nd4 planting the knight on a strong central square. Solid development and the timely …d5 or …Nd4 keep Black comfortably equal.", sayShort: 'Nc3 — …O-O and …d6, then …Na5.' }, sources: ITAL,
  },
  'pro-carlsen-1e5::0::c3@8': {
    intro: { say: "c3 — White prepares d4 and a slow centre. Castle with …O-O, then …d6 and reroute …Nd7 toward f8 and g6, keeping …d5 in reserve. When your pieces are ready the …d5 break equalises cleanly; until then hold the solid structure and match White's space.", sayShort: 'c3 — …O-O and …d6, prepare …d5.' }, sources: ITAL,
  },
  'pro-carlsen-1e5::0::Nc3@10': {
    intro: { say: "Nc3 — White brings the knight out after castling. Reply …d6 and …Na5, offering to trade the c4-bishop, or …Nd4 occupying the fine central outpost. With harmonious development and the …d5 break in hand, Black keeps full equality; contest the centre and activate the pieces.", sayShort: 'Nc3 — …d6, then …Na5 or …Nd4.' }, sources: ITAL,
  },
  'pro-carlsen-1e5::0::c3@10': {
    intro: { say: "c3 — White readies d4 in the Pianissimo. Continue …d6 and …Nd7, heading for f8 and g6, or …Na5 to swap the light bishop, always eyeing the …d5 freeing break. The position is balanced; meet White's central push with active piece play and timely …d5.", sayShort: 'c3 — …d6 and …Nd7, aim …d5.' }, sources: ITAL,
  },
  'pro-carlsen-1e5::0::a4@10': {
    intro: { say: "a4 — White grabs queenside space and stops …b5. Answer …d6 and …a5, fixing the pawns, then reroute …Nd7 to c5 or f8-g6 and prepare …d5. The a4-push loosens b4 and b3 for your pieces; play calmly and the …d5 break equalises.", sayShort: 'a4 — …d6 and …a5, then …Nd7.' }, sources: ITAL,
  },
  'pro-carlsen-1e5::0::Bb3@8': {
    intro: { say: "Bb3 — White retreats the bishop to safety before castling. Play …O-O and …d6, then …Nd7 rerouting toward g6, or …a5 and …a4 to harry the bishop. The …d5 break remains your freeing resource; develop calmly and Black stands fully equal.", sayShort: 'Bb3 — …O-O and …d6, aim …d5.' }, sources: ITAL,
  },

  // --- Tab 1: Ruy Lopez, Berlin (Black side) ---
  'pro-carlsen-1e5::1::d3@6': {
    intro: { say: "d3 — the quiet Anti-Berlin. Develop …Bc5, hitting f2 and eyeing the centre, then …O-O and …d6 with a comfortable, well-placed setup. If White trades on c6 you gain the bishop pair; otherwise play …a6 and reroute the knights. A sound, equal Berlin.", sayShort: 'd3 — …Bc5 and …O-O, then …d6.' }, sources: RUY,
  },
  'pro-carlsen-1e5::1::Nc3@16': {
    intro: { say: "Nc3 — White develops in the Berlin Wall endgame. Your trumps are the two bishops, so unbundle them: …Ke8, …h5 gaining kingside space, then …Be7 and …Be6, pressing the e5-pawn. Queens are off and your king is safe; play the long endgame with the bishop pair and the pressure on e5.", sayShort: 'Nc3 — …Ke8 and …h5, press e5.' }, sources: RUY,
  },
  'pro-carlsen-1e5::1::Re1@8': {
    intro: { say: "Re1 — the Rio Gambit, pressuring your e4-knight. Retreat …Nd6, hitting the b5-bishop, and after the trades on c6 and e5 develop …Be7 and …O-O; the position is level and solid. Return the pawn if needed and complete development — Black equalises without trouble.", sayShort: 'Re1 — …Nd6 hits bishop, then …Be7.' }, sources: RUY,
  },
  'pro-carlsen-1e5::1::Rd1+@16': {
    intro: { say: "Rd1+ — a check to nudge your king in the Berlin endgame. Step aside …Ke8, the standard square, keeping the bishop pair intact; then …h5, …Be7 and …Be6, pressing e5. The king is safe with queens off, and the two bishops give Black the long-term chances in the endgame.", sayShort: 'Rd1+ — …Ke8, then …Be7 and …Be6.' }, sources: RUY,
  },
  'pro-carlsen-1e5::1::dxe5@10': {
    intro: { say: "dxe5 — White recaptures before trading on c6. Play …Nxb5, winning the bishop pair, and after the knight lands you have a solid, equal game with the two bishops. The e5-pawn is not going anywhere; finish developing with …Be7 or …Nc6 and press the slight structural pluses.", sayShort: 'dxe5 — …Nxb5, grab the bishops.' }, sources: RUY,
  },
  'pro-carlsen-1e5::1::Bf4@18': {
    intro: { say: "Bf4 — White props the e5-pawn with the bishop. Continue developing your pair: …Be7, …Be6 and …h5, contesting the kingside, then bring a rook to d8. With queens off and the bishop pair, Black grinds the long endgame; probe e5 and the light squares patiently.", sayShort: 'Bf4 — …Be7 and …Be6, contest e5.' }, sources: RUY,
  },

  // --- Tab 2: Ruy Lopez, Closed (Black side) ---
  'pro-carlsen-1e5::2::a3@16': {
    intro: { say: "a3 — a quiet Closed Ruy where White delays d4. Unfurl the Chigorin plan: …Na5 hitting the b3-bishop, …c5 grabbing space, then …Nc6 and …Re8 with …Bf8, preparing the …d5 break. Black's queenside space and the classic regrouping give a rich, balanced middlegame.", sayShort: 'a3 — …Na5 and …c5, then …Nc6.' }, sources: RUY,
  },
  'pro-carlsen-1e5::2::a4@16': {
    intro: { say: "a4 — White pressures your b5-pawn on the queenside. Push …b4, gaining space and fixing the pawns, or defend with …Bd7 and …Rb8; then reroute …Na5 or …Nd7 and prepare …c5 and …d5. The extra queenside space after …b4 favours Black; play on the wing where you are stronger.", sayShort: 'a4 — …b4 grabs space, then …c5.' }, sources: RUY,
  },
  'pro-carlsen-1e5::2::Bd2@16': {
    intro: { say: "Bd2 — White develops modestly in the Closed Ruy. Carry out the standard plan: …Na5 hitting the b3-bishop, …c5 and …Nc6, then …Re8 and …Bf8, building toward …d5. Black's harmonious regrouping and queenside space give a comfortable, fully equal game; break with …d5 when ready.", sayShort: 'Bd2 — …Na5 and …c5, prepare …d5.' }, sources: RUY,
  },

  // --- Tab 3: Scotch (Black side) ---
  'pro-carlsen-1e5::3::Bc4@6': {
    intro: { say: "Bc4 — the Scotch Gambit, White giving a pawn for quick development. Reply …Nf6, and if e5 hits the knight strike back with …d5, forking the bishop and freeing your game; against O-O play …Bc5 or …Be7 and …O-O. Return the pawn if needed — accurate development leaves Black comfortably equal.", sayShort: 'Bc4 — …Nf6, then …d5 hits back.' }, sources: SCOTCH,
  },
  'pro-carlsen-1e5::3::Nc3@8': {
    intro: { say: "Nc3 — White develops in the Schmidt Scotch. Pin with …Bb4, and after Nxc6 bxc6 play …O-O and the freeing …d5, opening the centre for your active pieces. Black's doubled c-pawns are compensated by the bishop pair and quick development; the …d5 break equalises cleanly.", sayShort: 'Nc3 — …Bb4, then …O-O and …d5.' }, sources: SCOTCH,
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

  // --- Tab 4: Four Knights (Black side) ---
  'pro-carlsen-1e5::4::d4@6': {
    intro: { say: "d4 — White opens with the Scotch Four Knights. Take …exd4, and after Nxd4 pin with …Bb4; then …O-O and the freeing …d5, striking the centre. Black's active bishop and quick castling equalise, and the …d5 break gives your pieces full scope. A reliable, well-tested reply.", sayShort: 'd4 — …exd4 and …Bb4, then …d5.' }, sources: FOURK,
  },
  'pro-carlsen-1e5::4::g3@6': {
    intro: { say: "g3 — the Glek System, White fianchettoing the light bishop. Strike the centre with …d5, and after exd5 Nxd5 you free your game before White's fianchettoed bishop settles on g2; then …Bc5 or …Be7 and …O-O. Meeting the flank plan with a central break is the classical antidote — Black stands equal.", sayShort: 'g3 — …d5, free the centre.' }, sources: FOURK,
  },
  'pro-carlsen-1e5::4::a3@6': {
    intro: { say: "a3 — the Gunsberg, a slow waiting move. Punish it centrally with …d5, and after exd5 Nxd5 your pieces spring to life with the freer game; alternatively …Bc5 and …O-O keep it solid. When White dawdles on the flank, the …d5 break in the centre gives Black comfortable equality or better.", sayShort: 'a3 — …d5 hits the centre.' }, sources: FOURK,
  },
  'pro-carlsen-1e5::4::Bxc6@10': {
    intro: { say: "Bxc6 — White trades to damage your pawns in the Double Spanish. Recapture …dxc6, taking the bishop pair and opening the d-file for your queen and rooks; then …Bd6, …Re8 and …Bg4 with active pieces. The doubled c-pawns are cosmetic — the two bishops and open lines give Black the pleasant side.", sayShort: 'Bxc6 — …dxc6, take the bishops.' }, sources: FOURK,
  },
  'pro-carlsen-1e5::4::d3@8': {
    intro: { say: "d3 — the quiet Double Spanish. Break the symmetry with …Bxc3, and after bxc3 play …d6 and reroute …Ne7 to g6, targeting White's doubled c-pawns while …c5 clamps the centre. Trading the pin for a structural target is the Metger idea; Black gets an easy, thematic game against the weakened pawns.", sayShort: 'd3 — …Bxc3, then …d6 and …Ne7.' }, sources: FOURK,
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
  'pro-carlsen-kings-gambit::0::Bd7@9': {
    intro: { say: "Bd7 — Black interposes against your check. Trade Bxd7+, and after the recapture castle, play d4 and regain the f4-pawn with Bxf4; simple, strong development. You have removed a defender and keep the initiative — complete the pieces and press the extra activity while f4 falls.", sayShort: 'Bd7 — Bxd7+ then O-O and Bxf4.' }, sources: KG,
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
  'pro-carlsen-kings-gambit::1::Bb4@9': {
    intro: { say: "Bb4 — Black pins the c3-knight in the Bogoljubow. Support with Nge2, defending f4 and preparing to castle, then O-O and Bxf4, regaining the pawn with a strong centre. If the bishop takes on c3 your pawns recapture toward the centre; White's development and the broad d4-e4 front hold the initiative.", sayShort: 'Bb4 — Nge2 and O-O, then Bxf4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::1::Bb4@7': {
    intro: { say: "Bb4 — the Bogoljubow pin before …c6. Reinforce with Nge2, guarding f4 and readying O-O, then castle and regain the pawn with Bxf4. Keep the strong c4-bishop trained toward f7 and your knights coordinated; White's fast development and the central pawns are ample compensation for the gambit pawn.", sayShort: 'Bb4 — Nge2, then O-O and Bxf4.' }, sources: KG,
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
  'pro-carlsen-kings-gambit::1::Nc6@7': {
    intro: { say: "Nc6 — Black develops in the Bogoljubow. Grab the centre with d4, then Nf3 and O-O, regaining the pawn with Bxf4 in due course. Your pawns on d4 and e4 and the bishop's aim toward f7 give the gambit's full value; complete development and the central space plus recovered material hand White the edge.", sayShort: 'Nc6 — d4 and Nf3, then Bxf4.' }, sources: KG,
  },

  // --- Tab 2: King's Gambit Declined, Classical (…Bc5) ---
  'pro-carlsen-kings-gambit::2::Bg4@11': {
    intro: { say: "Bg4 — Black pins the f3-knight. Question it with h3, and after …Bxf3 Qxf3 you gain the bishop pair; then Na4 trades off the active c5-bishop and f5 grabs kingside space. White's two bishops and the space from f5 give a pleasant, pressing game — challenge the pin, then expand.", sayShort: 'Bg4 — h3, then Na4 and f5.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::2::a6@11': {
    intro: { say: "a6 — Black readies …b5 and …Ba7. Clamp with a4, halting the queenside expansion, then trade the strong bishop with Be3 or Na4 and grab space with f5. White's kingside majority and the f5-break give the initiative; neutralise the c5-bishop and push where you are stronger.", sayShort: 'a6 — a4 clamps, then Be3 and f5.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::2::Nc6@7': {
    intro: { say: "Nc6 — Black develops in the KGD Classical. Continue Bc4 and d3, eyeing f7, then reroute Na4 to trade the c5-bishop and expand with f5. Keep the centre solid with the f4-e4-d3 chain and grab kingside space; White's better pawn front and the f5-break give a comfortable pull.", sayShort: 'Nc6 — Bc4 and d3, then Na4.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::2::O-O@9': {
    intro: { say: "O-O — Black castles into the kingside where your pawns aim. Play d3, then Na4 or Be3 to trade the c5-bishop and expand with f5 and g4, storming the castled king. White's kingside pawn majority becomes an attack once Black has committed the king; neutralise the bishop, then advance.", sayShort: 'O-O — d3 and Na4, then f5-g4 storm.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::2::Na5@11': {
    intro: { say: "Na5 — Black hits your c4-bishop from the rim. Retreat Bb3, and if …Nxb3 axb3 opens the a-file for your rook; then trade the c5-bishop with Be3 or Na4 and grab space with f5. The knight on a5 is offside, so White's kingside space and the f5-break give the better game.", sayShort: 'Na5 — Bb3, then f5 and Be3.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::2::exf4@11': {
    intro: { say: "exf4 — Black releases the tension and grabs the f-pawn. Recapture Bxf4, developing with tempo and opening the f-file for your rook; then O-O, Nd5 and pressure on f7. White's active pieces, the half-open f-file, and the strong centre give a pleasant initiative — the bishop on f4 and knight to d5 do the work.", sayShort: 'exf4 — Bxf4, then O-O and Nd5.' }, sources: KG,
  },
  'pro-carlsen-kings-gambit::2::Ng4@11': {
    intro: { say: "Ng4 — Black lunges at f2. Simply play h3, kicking the knight; the …Nxf2 sacrifice fails to Kxf2 since the knight cannot escape, so it retreats and loses time. If you prefer, Rf1 or Qe2 guards f2 first. Either way White keeps the solid centre and the extra pawn, and the offside knight hands you the initiative.", sayShort: 'Ng4 — h3 kicks it, keep centre.' }, sources: KG,
  },
};
