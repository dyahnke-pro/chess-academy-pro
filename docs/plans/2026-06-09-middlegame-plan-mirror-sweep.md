# Middlegame-plan "mirrors the opening" sweep — 2026-06-09

**Trigger (David):** noticed some middlegame plans *mirror the opening and don't advance the ideas*. Sweep for ALL such plans, save to memory, find GROUNDED continuations, STOP before building.

## What "mirrors the opening" means here
A middlegame plan's playable line is supposed to start at the opening's terminal
(a real middlegame position, G9.3 Gate C) and then EXECUTE the plan — the pawn
break, the piece maneuver, the actual idea the overview advertises. The offenders
below instead **anchor at an opening-phase position (move 3-7)** and spend their
line on **castling + natural development** — replaying opening theory rather than
demonstrating the middlegame plan.

## Detection (grounded, reproducible)
- Anchor still opening-phase: `criticalPositionFen` fails the reachesMiddlegame metric (fullmove<8, uncastled, <2+2 minors developed).
- Line development-dominated: walking `playableLines[0].moves`, the count of real plan moves (pawn levers / pieces landing in the enemy half / pawn breaks) is 0, or dev moves outnumber plan moves 3:1.
- **37 / 529** plans match.

## Grounded continuations
Each offender's "grounded line" below is the **most-played MASTER continuation** from its current anchor, walked (via `/api/lichess-explorer?source=masters`) until a real middlegame is reached — game counts in parens. That terminal position is the correct **re-anchor**; the plan's thematic line should then be authored FROM there (the build step, NOT done here).
- `stop=reached-middlegame`: clean walk to a middlegame anchor.
- `stop=thin(Ng)`: masters play thins out fast — for **[PRO]** entries the grounded source should be the *player's own game corpus* (G9.1), with masters as a cross-check; for classical openings a shorter authored thematic line off the deepest common position.

### A. Pure mirror — line executes ZERO plan moves (worst) (13)

#### `mp-benkogambit-declined` — Benko Declined: Trade Light Bishops, Press the Queenside
- opening: `benko-gambit`
- current anchor: `6` move, line plays: `e4 g6 Bxc4 Bg7 O-O O-O h3 Ba6` (plan moves: 0, dev: 8)
- anchor FEN: `rnbqkb1r/p3pppp/3p1n2/2pP4/2p5/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 6`
- **grounded continuation (masters):** `e4(147) g6(94) Bxc4(122) Bg7(110)`  [thin(60g)]
- **re-anchor FEN (middlegame):** `rnbqk2r/p3ppbp/3p1np1/2pP4/2B1P3/2N2N2/PP3PPP/R1BQK2R w KQkq - 1 8`

#### `mp-dutchdefence-classical` — Dutch Classical: Flexible Outpost Play
- opening: `dutch-defence`
- current anchor: `4` move, line plays: `Nf3 Be7 O-O O-O c4 d6 Nc3 Qe8` (plan moves: 0, dev: 8)
- anchor FEN: `rnbqkb1r/pppp2pp/4pn2/5p2/3P4/6P1/PPP1PPBP/RNBQK1NR w KQkq - 0 4`
- **grounded continuation (masters):** `c4(1248) d5(1530) Nf3(748) c6(1414) O-O(2114) Bd6(2163)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `rnbqk2r/pp4pp/2pbpn2/3p1p2/2PP4/5NP1/PP2PPBP/RNBQ1RK1 w kq - 2 7`

#### `mp-frenchdefence-fortknox` — Fort Knox: The Impregnable Setup
- opening: `french-defence`
- current anchor: `5` move, line plays: `Nf3 Bc6 Bd3 Nd7 O-O Ngf6 Nc3 Be7` (plan moves: 0, dev: 8)
- anchor FEN: `rn1qkbnr/pppb1ppp/4p3/8/3PN3/8/PPP2PPP/R1BQKBNR w KQkq - 1 5`
- **grounded continuation (masters):** `Nf3(2759) Bc6(2787) Bd3(2582) Nd7(2462) O-O(1778) Ngf6(1518)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r2qkb1r/pppn1ppp/2b1pn2/8/3PN3/3B1N2/PPP2PPP/R1BQ1RK1 w kq - 7 8`

#### `mp-frenchdefence-tarrasch` — Tarrasch: Siege of the Isolated Pawn
- opening: `french-defence`
- current anchor: `6` move, line plays: `c3 Nc6 Ndf3 Rb8 Bd3 b5 Ne2 g6` (plan moves: 0, dev: 8)
- anchor FEN: `rnbqkb1r/pp1n1ppp/4p3/2ppP3/3P1P2/8/PPPN2PP/R1BQKBNR w KQkq - 0 6`
- **grounded continuation (masters):** `c3(1520) Nc6(2076) Ndf3(1965) Qb6(1194) g3(565) cxd4(355) cxd4(355) Bb4+(269) Kf2(268) g5(156) fxg5(99) Ndxe5(95) Nxe5(90) Nxe5(90)`  [thin(69g)]
- **re-anchor FEN (middlegame):** `r1b1k2r/pp3p1p/1q2p3/3pn1P1/1b1P4/6P1/PP3K1P/R1BQ1BNR w kq - 0 13`

#### `mp-nimzoindian-saemisch` — Nimzo Sämisch: Blockade the Big Centre
- opening: `nimzo-indian`
- current anchor: `6` move, line plays: `e3 Nc6 Bd3 O-O Ne2 b6 e4 Ne8` (plan moves: 0, dev: 8)
- anchor FEN: `rnbqk2r/pp1p1ppp/4pn2/2p5/2PP4/P1P5/4PPPP/R1BQKBNR w KQkq - 0 6`
- **grounded continuation (masters):** `e3(504) Nc6(298) Bd3(272) O-O(165) Ne2(495) b6(414)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r1bq1rk1/p2p1ppp/1pn1pn2/2p5/2PP4/P1PBP3/4NPPP/R1BQK2R w KQ - 0 9`

#### `mp-progothamchess-pirc-150-b5` — vs 150 Attack: …c6 + …b5 Queenside Counterattack
- opening: `pro-gothamchess-pirc-defense`
- current anchor: `6` move, line plays: `Nbd7 g4 Nb6` (plan moves: 0, dev: 3)
- anchor FEN: `rnbqkb1r/p3pp1p/2pp1np1/1p6/3PP3/2N1BP2/PPPQ2PP/R3KBNR b KQkq - 1 6`
- **grounded continuation (masters):** `Nbd7(383) g4(265) Nb6(203)`  [thin(73g)]
- **re-anchor FEN (middlegame):** `r1bqkb1r/p3pp1p/1npp1np1/1p6/3PP1P1/2N1BP2/PPPQ3P/R3KBNR w KQkq - 1 8`

#### `mp-progothamchess-qgd-tartakower-b6` — QGD Tartakower: …b6 + …Bb7 Fianchetto
- opening: `pro-gothamchess-qgd`
- current anchor: `7` move, line plays: `Qc2 b6 Rd1 Bb7` (plan moves: 0, dev: 4)
- anchor FEN: `rnbqk2r/ppp2pp1/4pb1p/3p4/2PP4/2N2N2/PP2PPPP/R2QKB1R w KQkq - 0 7`
- **grounded continuation (masters):** `e3(1408) O-O(1428) Rc1(1207) c6(954) Bd3(846) Nd7(753)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r1bq1rk1/pp1n1pp1/2p1pb1p/3p4/2PP4/2NBPN2/PP3PPP/2RQK2R w K - 2 10`

#### `mp-queensindian-main` — Queen's Indian: Both Bishops on the Long Diagonals
- opening: `queens-indian`
- current anchor: `4` move, line plays: `g3 Bb7 Bg2 Be7 O-O O-O Re1 Na6` (plan moves: 0, dev: 8)
- anchor FEN: `rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 0 4`
- **grounded continuation (masters):** `g3(35375) Ba6(21671) b3(12402) Bb4+(8986) Bd2(8978) Be7(8741) Bg2(6974)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `rn1qk2r/p1ppbppp/bp2pn2/8/2PP4/1P3NP1/P2BPPBP/RN1QK2R b KQkq - 4 7`

#### `mp-scandinaviandefence-portuguese` — Scandinavian Portuguese: Active Pieces for the Pawn
- opening: `scandinavian-defence`
- current anchor: `5` move, line plays: `Qxe2 Qxd5 Nf3 e6 O-O Nc6 Be3 O-O-O` (plan moves: 0, dev: 8)
- anchor FEN: `rn1qkb1r/ppp1pppp/5n2/3P4/3P4/8/PPP1bPPP/RNBQK1NR w KQkq - 0 5`
- **grounded continuation (masters):** `Qxe2(225) Qxd5(224) Nf3(224) e6(148) O-O(105)`  [thin(68g)]
- **re-anchor FEN (middlegame):** `rn2kb1r/ppp2ppp/4pn2/3q4/3P4/5N2/PPP1QPPP/RNB2RK1 b kq - 1 7`

#### `mp-scotchgame-mieses` — Mieses: Space, the c4 Clamp, and the Bishop Pair Fight
- opening: `scotch-game`
- current anchor: `7` move, line plays: `Qe2 Nd5 c4 Nb6 Nd2 Qe6 b3 a5` (plan moves: 0, dev: 8)
- anchor FEN: `r1b1kb1r/p1ppqppp/2p2n2/4P3/8/8/PPP2PPP/RNBQKB1R w KQkq - 1 7`
- **grounded continuation (masters):** `Qe2(5552) Nd5(5538) c4(4477) Ba6(2534) b3(1683) g6(1017) f4(485) d6(234) Qf2(190) Nf6(146) Be2(104) dxe5(104)`  [thin(64g)]
- **re-anchor FEN (middlegame):** `r3kb1r/p1p1qp1p/b1p2np1/4p3/2P2P2/1P6/P3BQPP/RNB1K2R w KQkq - 0 13`

#### `mp-sicilianalapin-d5` — Alapin 2...d5: Blockade the Isolated Pawn
- opening: `sicilian-alapin`
- current anchor: `4` move, line plays: `d4 Nf6 Nf3 e6 Bd3 Be7 O-O O-O` (plan moves: 0, dev: 8)
- anchor FEN: `rnb1kbnr/pp2pppp/8/2pq4/8/2P5/PP1P1PPP/RNBQKBNR w KQkq - 0 4`
- **grounded continuation (masters):** `d4(11425) Nf6(6287) Nf3(5979) e6(2725) Na3(1994) Nc6(720) Be3(383) cxd4(374) Nb5(374) Qd8(236) Nbxd4(229) Nd5(154) Nxc6(88) bxc6(88)`  [thin(59g)]
- **re-anchor FEN (middlegame):** `r1bqkb1r/p4ppp/2p1p3/3n4/8/2P1BN2/PP3PPP/R2QKB1R w KQkq - 0 11`

#### `mp-siciliandragon-classical` — Classical: Comfortable Equality
- opening: `sicilian-dragon`
- current anchor: `6` move, line plays: `Be2 Bg7 O-O O-O Be3 Nc6 Nb3 a6` (plan moves: 0, dev: 8)
- anchor FEN: `rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6`
- **grounded continuation (masters):** `Be3(14549) Bg7(13918) f3(13120) O-O(7712) Qd2(7108) Nc6(7077)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 3 9`

#### `mp-trompowskyattack-e6` — 2...e6: Opposite-Castling f-Pawn Storm
- opening: `trompowsky-attack`
- current anchor: `6` move, line plays: `Qd2 Nd7 O-O-O a6 f4 b5 Nf3` (plan moves: 0, dev: 7)
- anchor FEN: `rnb1kb1r/ppp2pp1/3ppq1p/8/3PP3/2N5/PPP2PPP/R2QKBNR w KQkq - 0 6`
- **grounded continuation (masters):** `Qd2(442) g5(161)`  [thin(75g)]
- **re-anchor FEN (middlegame):** `rnb1kb1r/ppp2p2/3ppq1p/6p1/3PP3/2N5/PPPQ1PPP/R3KBNR w KQkq - 0 7`

### B. Partial — anchored in opening, dev-dominated, 1-2 plan moves (24)

#### `mp-alekhinedefence-scandtrans` — Alekhine: Simplified Safety
- opening: `alekhine-defence`
- current anchor: `5` move, line plays: `Nxe5 Nd7 Nxd7 Bxd7 Bc4 Bf5 O-O e6` (plan moves: 2, dev: 6)
- anchor FEN: `rnbqkb1r/ppp1pppp/8/3np3/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 5`
- **grounded continuation (masters):** `Nxe5(2547) c6(1523) Be2(805) Bf5(596) O-O(535) Nd7(536)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r2qkb1r/pp1npppp/2p5/3nNb2/3P4/8/PPP1BPPP/RNBQ1RK1 w kq - 4 8`

#### `mp-benkogambit-main` — Benko: The Queenside Squeeze
- opening: `benko-gambit`
- current anchor: `6` move, line plays: `Nc3 d6 Nf3 Nbd7 e4 Bxf1 Kxf1 g6` (plan moves: 1, dev: 7)
- anchor FEN: `rn1qkb1r/3ppppp/b4n2/2pP4/8/8/PP2PPPP/RNBQKBNR w KQkq - 0 6`
- **grounded continuation (masters):** `Nc3(1721) d6(1002) Nf3(484) g6(478) g3(637) Bg7(630) Bg2(758)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `rn1qk2r/4ppbp/b2p1np1/2pP4/8/2N2NP1/PP2PPBP/R1BQK2R b KQkq - 2 9`

#### `mp-birdsopening-main` — Bird's: the Qh4 Kingside Attack
- opening: `birds-opening`
- current anchor: `4` move, line plays: `Bg2 c6 O-O Bg4 Ne5 h5 h3 Be6` (plan moves: 2, dev: 6)
- anchor FEN: `rnbqk1nr/ppp1ppbp/6p1/3p4/5P2/5NP1/PPPPP2P/RNBQKB1R w KQkq - 1 4`
- **grounded continuation (masters):** `Bg2(876) Nf6(424) O-O(902) O-O(765) d3(803) c5(628)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `rnbq1rk1/pp2ppbp/5np1/2pp4/5P2/3P1NP1/PPP1P1BP/RNBQ1RK1 w - - 0 7`

#### `mp-carokann-exchange` — Caro Exchange: Own the c-File
- opening: `caro-kann`
- current anchor: `6` move, line plays: `Ne2 Nf6 Bf4 e5 dxe5 Nxe5 Bb5+ Kd8` (plan moves: 2, dev: 6)
- anchor FEN: `r1b1kbnr/ppq1pppp/2n5/3p4/3P4/2PB4/PP3PPP/RNBQK1NR w KQkq - 1 6`
- **grounded continuation (masters):** `Ne2(729) Bg4(635) O-O(350) e6(284) Qe1(260) Bxe2(97) Qxe2(97)`  [thin(64g)]
- **re-anchor FEN (middlegame):** `r3kbnr/ppq2ppp/2n1p3/3p4/3P4/2PB4/PP2QPPP/RNB2RK1 b kq - 0 9`

#### `mp-frenchdefence-advance` — Advance: The Queenside Clamp
- opening: `french-defence`
- current anchor: `6` move, line plays: `Be2 Nge7 O-O cxd4 cxd4 Nf5 Nc3 Rc8` (plan moves: 2, dev: 6)
- anchor FEN: `r2qkbnr/pp1b1ppp/2n1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6`
- **grounded continuation (masters):** `Be2(3582) Nge7(2272) Na3(1167) cxd4(911) cxd4(904) Nf5(824)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r2qkb1r/pp1b1ppp/2n1p3/3pPn2/3P4/N4N2/PP2BPPP/R1BQK2R w KQkq - 1 9`

#### `mp-frenchdefence-burn` — Burn: The Bishop Pair Unleashed
- opening: `french-defence`
- current anchor: `7` move, line plays: `Qd3 Nc6 O-O-O Nb4 Qb3 Qd5 Qxd5 Nxd5` (plan moves: 2, dev: 6)
- anchor FEN: `rnbqk2r/ppp1bp1p/4pp2/8/3PN3/8/PPP2PPP/R2QKBNR w KQkq - 0 7`
- **grounded continuation (masters):** `Nf3(1961) f5(1013) Nc3(849) a6(678) g3(392) b5(411) Bg2(410) Bb7(411) O-O(383)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `rn1qk2r/1bp1bp1p/p3p3/1p3p2/3P4/2N2NP1/PPP2PBP/R2Q1RK1 b kq - 3 11`

#### `mp-frenchdefence-classical` — Classical: The Opposite-Wing Race
- opening: `french-defence`
- current anchor: `7` move, line plays: `f4 a6 Nf3 c5 Qd2 Nc6 O-O-O c4` (plan moves: 1, dev: 7)
- anchor FEN: `rnb1k2r/pppnqppp/4p3/3pP3/3P4/2N5/PPP2PPP/R2QKBNR w KQkq - 0 7`
- **grounded continuation (masters):** `f4(1923) a6(979) Nf3(830) c5(675) dxc5(333) Nc6(221) Qd2(117) Qxc5(193) O-O-O(106)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r1b1k2r/1p1n1ppp/p1n1p3/2qpP3/5P2/2N2N2/PPPQ2PP/2KR1B1R b kq - 1 11`

#### `mp-frenchdefence-exchange` — Exchange: Seize the Only Open File
- opening: `french-defence`
- current anchor: `5` move, line plays: `Bd3 Bd6 Qe2+ Be6 c4 dxc4 Bxc4 Qe7` (plan moves: 1, dev: 7)
- anchor FEN: `rnbqkb1r/ppp2ppp/5n2/3p4/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 2 5`
- **grounded continuation (masters):** `Bd3(1618) Bd6(878) O-O(674) O-O(674) Bg5(347) Bg4(299)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `rn1q1rk1/ppp2ppp/3b1n2/3p2B1/3P2b1/3B1N2/PPP2PPP/RN1Q1RK1 w - - 8 8`

#### `mp-londonsystem-main` — London: the e5-Knight and Kingside Expansion
- opening: `london-system`
- current anchor: `5` move, line plays: `Qb3 Nf6 Nd2 c4 Qc2 Nh5 Bg5 h6` (plan moves: 2, dev: 6)
- anchor FEN: `r1b1kbnr/pp2pppp/1qn5/2pp4/3P1B2/2P1P3/PP3PPP/RN1QKBNR w KQkq - 1 5`
- **grounded continuation (masters):** `Qb3(152) c4(147) Qc2(136)`  [thin(70g)]
- **re-anchor FEN (middlegame):** `r1b1kbnr/pp2pppp/1qn5/3p4/2pP1B2/2P1P3/PPQ2PPP/RN2KBNR b KQkq - 1 6`

#### `mp-pircdefence-austrian` — Austrian Attack: Race on the Wings
- opening: `pirc-defence`
- current anchor: `5` move, line plays: `Nf3 O-O Bd3 Na6 O-O c5 d5 Nc7` (plan moves: 1, dev: 7)
- anchor FEN: `rnbqk2r/ppp1ppbp/3p1np1/8/3PPP2/2N5/PPP3PP/R1BQKBNR w KQkq - 1 5`
- **grounded continuation (masters):** `Nf3(6728) O-O(4809) Bd3(3066) Na6(1474) O-O(1279) c5(1270)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r1bq1rk1/pp2ppbp/n2p1np1/2p5/3PPP2/2NB1N2/PPP3PP/R1BQ1RK1 w - - 0 8`

#### `mp-pircdefence-fianchetto` — Fianchetto System: Win the Kingside with ...f5
- opening: `pirc-defence`
- current anchor: `5` move, line plays: `Bg2 O-O Nge2 Na6 O-O c5 h3 cxd4` (plan moves: 1, dev: 7)
- anchor FEN: `rnbqk2r/ppp1ppbp/3p1np1/8/3PP3/2N3P1/PPP2P1P/R1BQKBNR w KQkq - 1 5`
- **grounded continuation (masters):** `Bg2(1882) O-O(2510) Nge2(2371) e5(1649) h3(1089) Nc6(546)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r1bq1rk1/ppp2pbp/2np1np1/4p3/3PP3/2N3PP/PPP1NPB1/R1BQK2R w KQ - 1 8`

#### `mp-proamancaro-twoknights` — Easy Development and the …Bg4 Pin
- opening: `pro-aman-caro-kann`
- current anchor: `7` move, line plays: `d4 O-O Bd3 Re8+ Be3 Bg4 Qc2 Nd7` (plan moves: 1, dev: 7)
- anchor FEN: `rnbqk2r/pp3ppp/2pb1p2/8/8/2P2N2/PP1P1PPP/R1BQKB1R w KQkq - 1 7`
- **grounded continuation (masters):** `(none)`  [thin(3g)]
- **re-anchor FEN (middlegame):** `rnbqk2r/pp3ppp/2pb1p2/8/8/2P2N2/PP1P1PPP/R1BQKB1R w KQkq - 1 7`

#### `mp-pronarocaro-fantasy-central-break` — Fantasy — central break refutation (the 75% plan)
- opening: `pro-naroditsky-caro-kann`
- current anchor: `3` move, line plays: `dxe4 fxe4 e5 Nf3 Be6 Bd3 Nd7 O-O` (plan moves: 2, dev: 6)
- anchor FEN: `rnbqkbnr/pp2pppp/2p5/3p4/3PP3/5P2/PPP3PP/RNBQKBNR b KQkq - 0 3`
- **grounded continuation (masters):** `e6(1210) Nc3(1071) Bb4(772) Bf4(261) Ne7(140)`  [thin(77g)]
- **re-anchor FEN (middlegame):** `rnbqk2r/pp2nppp/2p1p3/3p4/1b1PPB2/2N2P2/PPP3PP/R2QKBNR w KQkq - 4 6`

#### `mp-pronarocaro-advance-bf5-piece-storm` — Advance Bf5 — knight-storm conversion
- opening: `pro-naroditsky-caro-kann`
- current anchor: `6` move, line plays: `Nc6 dxc5 Nge7 c3 Ng6 b4 Ngxe5 Nxe5` (plan moves: 2, dev: 6)
- anchor FEN: `rn1qkbnr/pp3ppp/4p3/2ppPb2/3P4/4BN2/PPP1BPPP/RN1QK2R b KQkq - 1 6`
- **grounded continuation (masters):** `cxd4(1851) Nxd4(1851) Ne7(1846) Nd2(755) Nbc6(743) N2f3(721)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r2qkb1r/pp2nppp/2n1p3/3pPb2/3N4/4BN2/PPP1BPPP/R2QK2R b KQkq - 4 9`

#### `mp-pronaroFantasyCaro-bishop-pair-attack` — Fantasy Caro — Bc4, c3, weather Black's …e5
- opening: `pro-naroditsky-fantasy-caro`
- current anchor: `4` move, line plays: `e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3` (plan moves: 1, dev: 7)
- anchor FEN: `rnbqkbnr/pp2pppp/2p5/8/3PP3/8/PPP3PP/RNBQKBNR b KQkq - 0 4`
- **grounded continuation (masters):** `e5(473) Nf3(470) Bg4(288) Bc4(182) Nd7(170) O-O(98)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r2qkbnr/pp1n1ppp/2p5/4p3/2BPP1b1/5N2/PPP3PP/RNBQ1RK1 b kq - 5 7`

#### `mp-queensgambit-slav` — Slav: Build the Big Centre with e4
- opening: `queens-gambit`
- current anchor: `4` move, line plays: `Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4` (plan moves: 2, dev: 6)
- anchor FEN: `rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 2 4`
- **grounded continuation (masters):** `Nc3(52159) e6(32490) Bg5(26052) h6(16545) Bh4(10028) dxc4(9266) e4(9179) g5(8995) Bg3(8986) b5(9069) Be2(7020) Bb7(6406) O-O(3084)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `rn1qkb1r/pb3p2/2p1pn1p/1p4p1/2pPP3/2N2NB1/PP2BPPP/R2Q1RK1 b kq - 3 10`

#### `mp-scandinaviandefence-icelandic` — Scandinavian: The Icelandic Initiative
- opening: `scandinavian-defence`
- current anchor: `5` move, line plays: `d4 Bb4+ Bd2 Qe7 Bxb4 Qxb4+ Nd2 Nc6` (plan moves: 2, dev: 6)
- anchor FEN: `rn1qkb1r/ppp2ppp/4bn2/8/2P5/8/PP1P1PPP/RNBQKBNR w KQkq - 0 5`
- **grounded continuation (masters):** `Nf3(133)`  [thin(75g)]
- **re-anchor FEN (middlegame):** `rn1qkb1r/ppp2ppp/4bn2/8/2P5/5N2/PP1P1PPP/RNBQKB1R b KQkq - 1 5`

#### `mp-scandinaviandefence-main` — Scandinavian: The Active Queen and f5-Bishop
- opening: `scandinavian-defence`
- current anchor: `5` move, line plays: `Bc4 Nf6 Nf3 Bf5 Bd2 e6 Nd5 Qd8` (plan moves: 1, dev: 7)
- anchor FEN: `rnb1kbnr/pp2pppp/2p5/q7/3P4/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 5`
- **grounded continuation (masters):** `Nf3(865) Nf6(606) Bc4(1334) Bf5(1334) Bd2(1124) e6(1239) Nd5(674) Qd8(674) Nxf6+(670) gxf6(418) Bb3(173) Nd7(121) Qe2(104) Qc7(97) Nh4(80) Bg6(80)`  []
- **re-anchor FEN (middlegame):** `r3kb1r/ppqn1p1p/2p1ppb1/8/3P3N/1B6/PPPBQPPP/R3K2R w KQkq - 6 13`

#### `mp-scotchgame-kasparov` — Kasparov Nb3: Opposite Castling, the Pawn-Storm Race
- opening: `scotch-game`
- current anchor: `5` move, line plays: `Nb3 Bb6 Nc3 Nf6 Qe2 O-O Bg5 Nd4` (plan moves: 2, dev: 6)
- anchor FEN: `r1bqk1nr/pppp1ppp/2n5/2b5/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- **grounded continuation (masters):** `Be3(2701) Qf6(2588) c3(2717) Nge7(2456) Bc4(1671) Ne5(867)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r1b1k2r/ppppnppp/5q2/2b1n3/2BNP3/2P1B3/PP3PPP/RN1QK2R w KQkq - 3 8`

#### `mp-scotchgame-steinitz` — Steinitz Qh4: Punish the Early Queen with Development
- opening: `scotch-game`
- current anchor: `5` move, line plays: `Nb5 Bb4+ c3 Ba5 Nd2 Bb6 g3 Qe7` (plan moves: 2, dev: 6)
- anchor FEN: `r1b1kbnr/pppp1ppp/2n5/8/3NP2q/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- **grounded continuation (masters):** `Nc3(153) Bb4(152) Be2(89)`  [thin(51g)]
- **re-anchor FEN (middlegame):** `r1b1k1nr/pppp1ppp/2n5/8/1b1NP2q/2N5/PPP1BPPP/R1BQK2R b KQkq - 4 6`

#### `mp-siciliandragon-antibg5` — Anti-Dragon Bg5: Seize the Initiative
- opening: `sicilian-dragon`
- current anchor: `6` move, line plays: `Bg5 Bg7 Bb5+ Nbd7 Qe2 O-O O-O-O a6` (plan moves: 2, dev: 6)
- anchor FEN: `rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6`
- **grounded continuation (masters):** `Be3(14549) Bg7(13918) f3(13120) O-O(7712) Qd2(7108) Nc6(7077)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 3 9`

#### `mp-siciliannajdorf-6g3` — 6.g3 Fianchetto: Easy Equality
- opening: `sicilian-najdorf`
- current anchor: `6` move, line plays: `e5 Nde2 Be7 Bg2 b5 Nd5 Nbd7 Nec3` (plan moves: 1, dev: 7)
- anchor FEN: `rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N3P1/PPP2P1P/R1BQKB1R b KQkq - 0 6`
- **grounded continuation (masters):** `e5(2812) Nde2(1565) Be7(914) Bg2(852) O-O(476) O-O(372)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `rnbq1rk1/1p2bppp/p2p1n2/4p3/4P3/2N3P1/PPP1NPBP/R1BQ1RK1 b - - 5 9`

#### `mp-siciliansveshnikov-kalashnikov` — Kalashnikov: Seize the d4 Outpost
- opening: `sicilian-sveshnikov`
- current anchor: `5` move, line plays: `Nb5 d6 c4 Be7 N1c3 a6 Na3 f5` (plan moves: 1, dev: 7)
- anchor FEN: `r1bqkbnr/pp1p1ppp/2n5/4p3/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 0 5`
- **grounded continuation (masters):** `Nb5(8985) d6(7632) N1c3(3709) a6(3639) Na3(3633) b5(1927) Nd5(1922) Nge7(760) c4(538) Nd4(340) Be3(137) Nxd5(137) cxd5(127) Be7(88)`  [thin(76g)]
- **re-anchor FEN (middlegame):** `r1bqk2r/4bppp/p2p4/1p1Pp3/3nP3/N3B3/PP3PPP/R2QKB1R w KQkq - 1 12`

#### `mp-slavdefence-main` — Slav: Trade on c3, then Win the e4-Pawn
- opening: `slav-defence`
- current anchor: `5` move, line plays: `a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O` (plan moves: 1, dev: 7)
- anchor FEN: `rnbqkb1r/pp2pppp/2p2n2/8/2pP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5`
- **grounded continuation (masters):** `a4(17051) Bf5(14102) Ne5(6631) Nbd7(4569) Nxc4(4566) Qc7(2423) g3(2237) e5(2212) dxe5(2193) Nxe5(2193) Bf4(2186)`  [reached-middlegame]
- **re-anchor FEN (middlegame):** `r3kb1r/ppq2ppp/2p2n2/4nb2/P1N2B2/2N3P1/1P2PP1P/R2QKB1R b KQkq - 1 10`

## Next step (STOP here — do NOT build yet)
Per David: this is the audit + grounded-continuation research only. The build
step (a future session, on approval) re-anchors each plan's `criticalPositionFen`
at the grounded middlegame terminus above and authors a thematic playable line
that EXECUTES the declared pawnBreaks/pieceManeuvers from there — then re-runs
middlegamePlanThemes / narrationAccuracy / lessonIntegrity. [PRO] entries pull
the continuation from the player's game corpus, not the masters explorer.
