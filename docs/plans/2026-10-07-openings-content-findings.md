
## audit:Openings — masterclass main lines:A (9)
coverage: I checked all 42 first-class masterclass main lessons (the registry.ts OPENINGS list, via ALL_LESSONS scope 'main'). Variation, trap and gambit-tab lessons were not checked. For each lesson:
- I replayed every beat's moves with chess.js. No illegal moves were found.
- I took the deepest beat as the main spine and checked it against openings-lichess.json. Every spine follows a DB line for at least 
- [false-teaching] Philidor main line ends on a move that loses, while the narration says Black has fully equalised
    WHERE: src/data/lessons/philidorDefence.ts beat id 'd5' (line 28), the deepest beat of the main line
    EVIDENCE: Final position after ...d5 (20 plies). Stockfish, Black's side: -115cp at depth 16, -102cp at depth 18. The engine's best line is dxe5 dxc4 exf6 Bxf6 Bd4 ... (score cp 99 for White). The beat says 'After the dust settles Black has equalised fully' and sayShort says '…d5 — the freeing break, full equality.' This is the quiet-line-that-lies case the soundness-sweep doctrine forbids (worse than -1.0, and not a gambit showcase).
    FIX: Rebuild the main line's tail on the most-played master continuation (build-opening-spine.mjs) so it ends on a sound move, or stop the line before ...d5 and drop the equality claim.
- [false-teaching] Evans main-line close says White has 'pressure for the pawn' when material is level, and the g5 knight is hanging
    WHERE: src/data/lessons/evansGambit.ts beat id 'close' (line 37)
    EVIDENCE: chess.js replay to the final FEN r1bqk2r/ppp1n1pp/1b3p2/3P2N1/2Q5/2P5/P4PPP/RNB1R1K1 b kq. Both sides have 6 pawns and equal pieces, because White won the d-pawn back with exd5 and Qxd4. Black is to move and ...f6 attacks Ng5. The engine's best move is f6g5 (fxg5), eval about 0 at depth 18. The text says 'lasting pressure for the pawn' and 'the initiative is worth the pawn.' There is no pawn deficit.
    FIX: Rewrite the close so it says material is level. Also say the knight on g5 is attacked by the pawn on f6 and must be dealt with, or end the line one ply earlier.
- [false-teaching] Vienna 'f5-arrival' says the f5 knight cannot be chased by a pawn and calls it an immovable outpost; both are false on this board
    WHERE: src/data/lessons/vienna.ts beat 'f5-arrival' (line ~128, moves = const M on line 18). Same claim in 'the-vienna-knight' (line ~110).
    EVIDENCE: chess.js at the end of M (...Ne6 Nf5). Black's g7 pawn is still there and 'g6' is a legal move that attacks f5. The square f5 is already attacked by Black's Bg4 (attackers('f5','b') = ['g4']). Stockfish depth 18 gives the final position -46cp for White (the student). Best line: Nf6 e5 dxe5 dxe5 Qxd1 ... The text says the knight 'cannot be chased by a pawn' and calls this 'the immovable outpost' and 'the prize.'
    FIX: Drop the 'cannot be chased by a pawn' and 'immovable' claims, or rebuild the tail on the data spine. The Lasker outpost rule does not hold here: the g7 pawn is intact and the bishop on g4 already eyes f5.
- [false-teaching] Vienna 'preparation' beat says ...c6 forces White's bishop off the diagonal; it attacks nothing
    WHERE: src/data/lessons/vienna.ts beat 'preparation' (line 98-102)
    EVIDENCE: chess.js after ...O-O c6: attackers('c4','b') = [] (the c4 bishop is not attacked). The d6 pawn had already opened the c8 bishop's diagonal, so ...c6 does not free it either. The text says 'Black plays c6 to free their queen-bishop, which forces White's bishop off the long diagonal'. Two sentences later it says Bb3 keeps 'the SAME diagonal', which contradicts the first claim.
    FIX: Say that ...c6 prepares ...d5 (or ...b5), and that Bb3 is a prophylactic retreat that keeps the a2–g8 diagonal.
- [false-teaching] Petrov main line calls White's c-pawns 'doubled, isolated' but the d4 pawn sits beside them
    WHERE: src/data/lessons/petrovDefence.ts beat 'trade' (line 29)
    EVIDENCE: chess.js FEN after bxc3 Nc6: r2q1rk1/ppp1bppp/2n5/3p1b2/2PP4/P1P2N2/4BPPP/R1BQ1RK1. White pawns are on c3, c4 and d4, so the c-pawns are doubled but not isolated. The close beat (line 30) says '…Na5 — hit c4, Black holds the edge', but Stockfish rates the final position -31cp (d16) / -34cp (d18) for Black, so White is slightly better.
    FIX: Replace 'doubled, isolated c-pawns' with 'doubled c-pawns'. Soften 'Black holds the edge' to 'level / comfortable'.
- [rule-violation] Sicilian Alapin main line stops before a middlegame: nobody has castled and White's queenside minor pieces are still at home
    WHERE: src/data/lessons/sicilianAlapin.ts beats 'liquidate' / 'verdict' (lines 38-39); deepest beat is 20 plies
    EVIDENCE: Final FEN r3kb1r/pp1qpppp/1nn5/1B6/3P4/8/PP3PPP/RNBQK2R w KQkq. All four castling rights remain, Nb1 and Bc1 are undeveloped, and Black's Bf8 is undeveloped. It passes lessonDepth.test.ts only because that gate counts plies (MIN_PLIES = 20). It does not test G9.3 Gate B ('both sides developed / castled'). Also 'verdict' repeats exactly the move list of 'liquidate'.
    FIX: Extend the spine along the most-played master moves until both sides castle and develop. Add a development/castling check to the depth gate so a 20-ply opening fragment cannot pass.
- [rule-violation] Two masterclass MAIN lessons opt out of the middlegame gate with kind:'roadmap'
    WHERE: src/data/lessons/albinCountergambit.ts and src/data/lessons/schliemannDefence.ts (main lessons in registry.ts OPENINGS)
    EVIDENCE: Albin: 16 plies, final FEN r3k1nr/ppp1qppp/2n5/4P3/1bPp4/5N1P/PP1BPPP1/R2QKB1R w KQkq, with all castling rights and the f1 and g8 pieces at home. Schliemann: 20 plies, KQkq, 'home 1 2'. Both are first-class main lines, yet kind:'roadmap' exempts them from the depth gate. G9.3 Gate B requires the main line to reach a middlegame.
    FIX: Extend both main spines to a middlegame on the data spine, or move them out of the first-class OPENINGS list.
- [minor] QGD and Nimzo closing beats claim Black is equal or better; the engine says Black is clearly worse
    WHERE: src/data/lessons/qgd.ts beat 'close' (line 29); src/data/lessons/nimzoIndian.ts beat 'close' (line 27)
    EVIDENCE: Stockfish at depth 18, from Black's side: QGD final -91cp, Nimzo final -78cp. The QGD text says 'a fully equal middlegame where White's isolated pawn is the only imbalance, and it favours Black' and sayShort says 'fully equal'. The Nimzo text says Black 'holds the better structure ... and the more active pieces' and sayShort says 'the active Nimzo endgame edge'. Neither crosses the -1.0 soundness bar, but both overstate Black's standing.
    FIX: Tone the verdicts down to 'solid / White keeps a small edge', or confirm with a deeper engine read before you keep 'equal' or 'edge'.
- [minor] Italian closing says the bishop pointed at f7 'all game', but it left that diagonal at move 10
    WHERE: src/data/lessons/italianGame.ts beat 'close' (line 63). Also 'tactics' (line 62) says 'White pins and chases with Bd3'.
    EVIDENCE: In the replay the light bishop plays Bb5 at ply 19, then Bd3 and Bxg6. It never aims at f7 again, yet the text says 'bishop on the f7 diagonal' and 'the f7-square you've watched all game'. In 'tactics', Bd3 attacks the knight on e4 with only the g6 knight behind it, so there is no pin to a more valuable piece.
    FIX: Say what the bishop actually did (rerouted via b5 and d3), and replace 'pins' with 'attacks'.

## audit:Openings — masterclass variations:A (14)
coverage: Checked all 328 variation lessons from ALL_LESSONS in registry.ts: the 315 on the 42 masterclass openings plus 13 gambit-tab lessons. Every beat of every lesson was replayed with chess.js; all are legal except where noted. Each beat was checked to extend the previous one. Each line was matched against every openings-lichess.json position (transpositions included, with the deepest DB name found). I
- [broken] Pirc 'Classical System' variation tab is the main lesson again, move for move
    WHERE: src/data/lessons/pircVariations.ts:60 (CLASSICAL, key 'pirc-defence::Classical System') vs src/data/lessons/pircDefence.ts:57 (main beat p6)
    EVIDENCE: tsx replay of ALL_LESSONS (registry.ts): the variation's final line (22 plies, e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 h3 e5 dxe5 dxe5 Be3 Qe7 Qd3 Nh5) matches the main lesson's longest beat on all 22 plies (commonWithMain=22, plies=22, mainLen=22). It ends on the same position, so it is not structurally distinct.
    FIX: Rebuild the Classical tab on a line that branches off the main spine (for example 4.Be2 sidelines or Black's ...c6/...a6 plans), or drop the tab and let the main lesson be the Classical.
- [false-teaching] 'Snake Benoni' tab never plays the Snake. It is the first 22 plies of the main lesson
    WHERE: src/data/lessons/benoniDefenceVariations.ts, key 'benoni-defence::Snake Benoni (...Bd7-a4 Maneuver)', title 'Benoni — The Snake (…Na6-c7)'; main = src/data/lessons/benoniDefence.ts:25-27
    EVIDENCE: Variation line: d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O Re8 Nd2 Na6 Re1 Nc7. That is word for word the main lesson's 'reroute' beat (benoniDefence.ts:26), so commonWithMain=22 of 22. openings-lichess.json defines the Snake as 'Benoni Defense: Modern Variation, Snake Variation | d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 Bd6'. The line has no ...Bd6, and despite the registry key it has no ...Bd7-a4 either. The key and title also disagree with each other (Bd7-a4 vs Na6-c7).
    FIX: Rebuild on the DB Snake line (5...Bd6) or rename or remove the tab. Make the key and the title agree.
- [broken] Sicilian Dragon 'Soltis Variation' tab is a strict prefix of the 'Yugoslav Attack Main Line' tab
    WHERE: src/data/lessons/sicilianDragonVariations.ts, keys 'sicilian-dragon::Yugoslav Attack: Soltis Variation' and 'sicilian-dragon::Yugoslav Attack Main Line'
    EVIDENCE: Soltis line (24 plies): ...O-O-O Rc8 Bb3 Ne5 h4 h5. All 24 plies equal the first 24 of the Main Line tab (32 plies, which continues Kb1 Nc4 Bxc4 Rxc4 g4 hxg4 h5 Nxh5). Both tabs also share the main lesson's 22 plies. The DB Soltis is '...O-O-O Qa5 h4 Rfc8 Bb3 h5', a different move order that this line does not reach by SAN.
    FIX: Merge the two tabs (the Main Line already contains the Soltis h4 h5), or rebuild the Soltis tab so it diverges after 12.h4 h5.
- [broken] Three more variation tabs are truncated copies of their opening's main lesson
    WHERE: scotch-game::'Scotch: Classical 4...Bc5 (Be3 Qf6 Main Line)'; petrov-defence::'Classical Variation'; kings-indian-attack::'KIA: Fischer Attack'
    EVIDENCE: Common prefix with the main lesson's longest beat equals the full variation length: Scotch 22 of 22 (main 24), Petrov 22 of 22 (main 26), KIA Fischer 22 of 22 (main 26: e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7 Nf1 a5 h4 b4). Each tab stops part-way through the main lesson and never reaches a position of its own.
    FIX: Give each tab its own continuation past the main spine, or remove it.
- [false-teaching] Bird's 'From's Gambit Declined' never offers From's Gambit
    WHERE: src/data/lessons/birdsOpeningVariations.ts:11-14
    EVIDENCE: Line: f4 d5 Nf3 Nf6 e3 g6 b3 Bg7 Bb2 O-O ... DB: 'Bird Opening: From's Gambit | f4 e5'. This line plays 1...d5, which the DB names 'Bird Opening: Dutch Variation | f4 d5'. That is the deepest named match, at 2 plies. A gambit that is never offered cannot be declined, and beat 1's prose admits Black 'sidesteps' it.
    FIX: Retitle it as the Dutch Variation (1...d5) / reversed Leningrad, or rebuild it on an actual From's Gambit declined line from the DB.
- [false-teaching] Réti 'Reti Gambit' tab is the DB's Advance Variation, not the Réti Gambit
    WHERE: src/data/lessons/retiOpeningVariations.ts, key 'reti-opening::Reti: Reti Gambit' (title 'Réti Gambit — tempo after tempo on the queen')
    EVIDENCE: Line: Nf3 d5 c4 d4 e3 Nc6 exd4 Nxd4 Nxd4 Qxd4 ... The deepest DB match is 'Réti Opening: Advance Variation | Nf3 d5 c4 d4' (4 plies). The DB's 'Réti Gambit' entries are 2...dxc4 lines ('Réti Opening: Réti Gambit, Keres Variation | Nf3 d5 c4 dxc4 e3 Be6'). Beat 1 calls 3.e3 'the Réti Gambit', yet White sacrifices nothing in the line (exd4 recaptures at once).
    FIX: Rename it to the Advance Variation (3.e3), or rebuild it on a DB Réti Gambit (2...dxc4) line.
- [rule-violation] Bird's 'Swiss Gambit' tab is not the DB's Swiss Gambit
    WHERE: src/data/lessons/birdsOpeningVariations.ts:196-200
    EVIDENCE: Line: f4 f5 e4 fxe4 d3 exd3 Bxd3 Nf6 ... DB: 'Bird Opening: Swiss Gambit | f4 f5 e4 fxe4 Nc3 Nf6 g4'. The line goes 3.d3, not 3.Nc3/4.g4. The deepest DB match is 'Bird Opening: Wagner-Zwitersch Gambit' at 3 plies.
    FIX: Use the DB name for the 3.d3 line, or switch the spine to the DB Swiss Gambit.
- [false-teaching] Vienna Gambit tab: the final beat rewinds the board and voices ...exf4 on a position where it was never played
    WHERE: src/data/lessons/viennaVariations.ts:92-95 (beat g10, key 'vienna-game::Vienna Gambit')
    EVIDENCE: g9 ends at 22 plies. g10 jumps back to 16 plies (…c5 Bf4 Nc6, the declined line), yet its say opens 'if Black ... takes the gambit with exf4' and its sayShort is 'exf4 — the Gambit Accepted, where the weapons live.' No exf4 appears in any beat (chess.js replay). The cue is spoken over the move ...Nc6, and the lesson ends 6 plies shallower than its own previous beat.
    FIX: Remove g10, or make it a separate line that actually plays 3...exf4 from the spine.
- [broken] Paulsen Attack tab: the summary beat sits last and rewinds the board from 24 plies to 15
    WHERE: src/data/lessons/viennaVariations.ts:321-328 (beat p6 after p9, key 'vienna-game::Paulsen Attack')
    EVIDENCE: Beat order in the array is p1..p5, p7, p8, p9, p6. p9 = 24 plies (…Qxe2 Nd4), then p6 = 15 plies (…O-O d3). The lesson's final position is ply 15, so the Watch ends back in the opening and the effective line is 15 plies. Separately, the deepest DB anchor is only 5 plies ('Vienna Game: Mieses Variation | e4 e5 Nc3 Nf6 g3'). The DB's 'Paulsen Variation' entries are the 2...Nc6 lines.
    FIX: Move p6 to its numeric place (after p5), so the lesson ends on p9's 24-ply position.
- [minor] Alapin: two tabs end on the identical position
    WHERE: src/data/lessons/sicilianAlapinVariations.ts, 'sicilian-alapin::Alapin: 2...Nf6 Main Line (Endgame)' and 'sicilian-alapin::Alapin: 2...Nf6 3.e5 Nd5 4.d4 cxd4 5.Nf3 (Alt Move Order)'
    EVIDENCE: Both are 22 plies and reach the same final FEN (the lines differ only in move order: 5.cxd4 d6 6.Nf3 Nc6 vs 5.Nf3 Nc6 6.cxd4 d6). From move 7 on, the moves are identical (Bc4 Nb6 Bb3 dxe5 dxe5 Qxd1+ Bxd1 Nc4 Ba4 Bd7). This is a transposition, not a structurally distinct line.
    FIX: Fold the move-order note into the Main Line tab as a beat, or make the alt tab diverge after the transposition.
- [rule-violation] Variation tabs anchored to the Lichess DB by fewer than 6 plies
    WHERE: london-system (London vs Queen's Pawn, vs Dutch, vs Bf5 Mirror, Ne5 Trade Plan, vs Early c5); kings-indian-attack (vs French Structure, vs KID-Style, e5 Wedge, vs Sicilian, vs Caro-Kann); reti-opening (Reti Gambit, Reversed Benoni); trompowsky-attack (both 2...Ne4 3.Bf4 tabs); birds-opening (From's Declined, Swiss); dutch-defence (Anti-Dutch 2.Bg5); sicilian-alapin (2...g6); philidor-defence (Modern d3 Hybrid); slav-defence (Modern Qc2/Qb3, Exchange); caro-kann (Fantasy); vienna-game (Paulsen)
    EVIDENCE: For every ply of each line I matched the position (EPD, transpositions included) against all 3,654 openings-lichess.json entries. Deepest named match: London vs Dutch 2, KIA vs Sicilian 2, Bird From's Declined 2, most London/KIA/Trompowsky/Alapin g6/Dutch Bg5 tabs 3, Reti/Philidor 4, Slav/Caro Fantasy/Paulsen 5. CLAUDE.md G3 requires every line to anchor to a prefix of at least 6 plies in openings-lichess.json. 23 of 328 variation lessons fall short.
    FIX: Re-anchor each tab on a named DB entry of at least 6 plies, or record an explicit exemption for system openings (London/KIA) where the DB names only the first moves.
- [minor] System-opening variation tabs do not branch from their main spine
    WHERE: kings-indian-attack (Botvinnik Setup, vs QGD-Style, vs KID-Style, Keres Variation, vs Sicilian: 0 plies shared); london-system (Jobava, vs Queen's Pawn, vs Dutch, vs Bf5 Mirror, Ne5 Trade: 1 ply); english-opening (Ultra-Symmetrical, Symmetrical, Mikenas, Hedgehog: 1 ply); catalan (vs Slav: 1); birds (From's Accepted, Swiss: 1)
    EVIDENCE: Shared prefix with the main lesson's longest beat: the KIA main starts 1.e4 e6 d3 (French structure), while five tabs start 1.Nf3 and share 0 plies with it. The London main starts d4 Nf6 Nf3 d5 Bf4, while its tabs start d4 d5 Bf4 or d4 f5. The English main starts c4 e5, while its tabs start c4 c5 or c4 e6. The audit criterion is that a variation branches FROM the main spine.
    FIX: For setup systems, re-root the main lesson on the shared setup moves, or document that these tabs are separate move-1 entries rather than branches.
- [minor] English: 'Ultra-Symmetrical Variation' and 'English: Symmetrical Variation' are two tabs on one opening line
    WHERE: src/data/lessons/englishOpeningVariations.ts
    EVIDENCE: Both start c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 (the same first 8 plies). The pairwise prefix check flagged them alongside the Dragon and Sveshnikov clusters: Sveshnikov 'Chelyabinsk (c4 System)' shares 20 to 24 plies with three sibling tabs, and '11.c4 Queenside Grip' contains all 24 plies of 'Chelyabinsk' before diverging.
    FIX: Check whether each pair teaches a distinct structure, and merge any whose divergence is only a few late plies.
- [rule-violation] Move-number prefixes in spoken variation narration
    WHERE: 88 occurrences across 63 variation lessons, e.g. petrov-defence::5.Bd3 Line (3), french-defence::Classical/Burn/Fort Knox (2 each), birds-opening::Swiss Gambit beat bs1 ('1.f4 f5 mirrors — and 2.e4!?')
    EVIDENCE: Ran the G9.4 regex \b\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x]) over every say/sayShort of every variation beat: 88 hits. CLAUDE.md's masterclass voice rules ban move-number prefixes in prose because TTS reads '2.' as 'two'.
    FIX: Strip them with the G9.4 regex inside say/sayShort literals ('' for White moves, '…' for Black moves).

## audit:Openings — masterclass main lines:B (16)
coverage: Checked: all 45 masterclass openings in opening-manifests.json, using getLessonScript and every beat. (1) Legality: every main line replays legally in chess.js. Every beat is a prefix of the final spine, except the intentional branch beats. (2) Gate B: every main line is 20 plies or longer except albin-countergambit (16 plies, declared kind:'roadmap'). (3) Realness: the longest prefix match agains
- [false-teaching] Philidor main line follows moves no master has played, and the narration says 'equalised fully' over a -1.11 position
    WHERE: src/data/lessons/philidorDefence.ts:28 beat 'd5' (also beats 'c6' and 'bb7', plies 15-20)
    EVIDENCE: Walked the master explorer (/api/lichess-explorer?source=masters) ply by ply. Ply 17 Be3: 8 of 1,674 games (the main move there is d5, 525 games). Ply 18 ...Bb7: 0 of 8 games (the top move is ...a6). After that position there are 0 games in total, so plies 19 Qd2 and 20 ...d5 are not in the database at all. openings-lichess.json matches only 8 plies. Stockfish depth 16 on the final position: -1.11 for the student (Black), and its line starts dxe5 dxc4 exf6. The beat says 'After the dust settles 
    FIX: Rebuild the tail from ply 17 along the most-played master moves (scripts/build-opening-spine.mjs). Re-run the soundness sweep and rewrite the d5 beat to match the board.
- [false-teaching] Catalan says 'the pawn returns' and 'fully regained the pawn', but Black is still a pawn up
    WHERE: src/data/lessons/catalanOpening.ts:37 beat 'regain' (ply 21) and :38 beat 'close' (ply 23)
    EVIDENCE: Replayed d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2 b5 b3 cxb3 axb3 Be7 Bb2 O-O Rc1 with chess.js. At the end White has 6 pawns (b3 d4 e3 f2 g3 h2) and Black has 7 (a6 b5 c7 e6 f7 g7 h7); the material count is W 37, B 38. The sequence ...cxb3 axb3 won a second pawn and gave one back, so Black keeps the extra pawn. 'emerged with the bishop pair' also does not hold as an advantage: Black also has two bishops (d7, e7).
    FIX: Say Black keeps the extra pawn and White has compensation (engine +0.45 for White), or extend the line until White actually wins the pawn back.
- [false-teaching] Nimzo close: 'Black holds the better structure' and 'doubles rooks', in a queen middlegame called an endgame
    WHERE: src/data/lessons/nimzoIndian.ts:27 beat 'close' (ply 36)
    EVIDENCE: Final FEN 1r1r2k1/p4p1p/1q2pp2/2p1n3/Q7/P3PN2/1PR1KPPP/3R4 w. Black has doubled f-pawns (f6, f7) and isolated a-, c- and h-pawns; White's pawns are all healthy (a3 b2 e3 f2 g2 h2). The rooks stand on b8 and d8, two different files, so they are not doubled. Both queens are still on the board (Qb6, Qa4), yet the beat says 'flows into a comfortable endgame'. The b-file is half-open (White pawn on b2), not open. Stockfish: -0.69 for Black.
    FIX: Rewrite the beat to the real board: White has the better structure and the edge; the rooks sit on the half-open b-file and the open d-file; queens are still on.
- [false-teaching] QGA says Black has a 'queenside majority' when the queenside pawns are 2 against 2
    WHERE: src/data/lessons/queensGambitAccepted.ts:30 beat 'center' (ply 23)
    EVIDENCE: Final FEN r2qk2r/1b1nbppp/p3pn2/1p6/3NP3/1BN5/PP2QPPP/R1BR2K1 b. On the queenside White has a2 and b2, Black has a6 and b5. On the kingside White has e4 f2 g2 h2, Black has e6 f7 g7 h7. Neither side has a majority anywhere.
    FIX: Remove the majority claim (counterplay can come from ...b4 or the b7 bishop instead).
- [false-teaching] English says White presses 'on the wing where your majority lies', but White is the queenside minority
    WHERE: src/data/lessons/englishOpening.ts:37 beat 'close' (ply 21)
    EVIDENCE: Final FEN r2q1rk1/ppp1b1pp/1nn1bp2/4p3/1P6/P1NP1NP1/4PPBP/1RBQ1RK1 b. White's queenside pawns are a3 and b4 (2); Black's are a7, b7 and c7 (3). White's b4-b5 push is a minority attack, not a majority advance.
    FIX: Call it a minority-style queenside expansion, or say White's majority is in the centre.
- [false-teaching] Alekhine says the bishop keeps 'the f3-knight pinned', but Be2 stands between the knight and the queen
    WHERE: src/data/lessons/alekhineDefence.ts:32 beat 'complete' (ply 20)
    EVIDENCE: Final FEN rn1q1rk1/pp2bppp/1n1pp3/7b/2PP4/2N2N1P/PP2BPP1/R1BQ1RK1. On the diagonal h5-g4-f3-e2-d1 there is a White bishop on e2 between the knight and the queen, so the knight is not pinned. The lesson's own earlier beat 'be7' says 'Be2 breaks the pin's bite'. The same beat also calls the c-file 'open', but White has a pawn on c4, so it is half-open.
    FIX: Say the bishop keeps pressure on f3 / avoids ...Bxf3. Change 'open' to 'half-open c-file'.
- [false-teaching] Albin says '…Bg4 pins the f3-knight', but the e2-pawn blocks the line to the queen
    WHERE: src/data/lessons/albinCountergambit.ts:27 beat 'nc6' (ply 10)
    EVIDENCE: FEN after d4 d5 c4 e5 dxe5 d4 Nf3 Nc6 Nbd2 Bg4 is r2qkbnr/ppp2ppp/2n5/4P3/2Pp2b1/5N2/PP1NPPPP/R1BQKB1R w. The diagonal g4-f3-e2-d1 has White's own pawn on e2 behind the knight, so there is no pin.
    FIX: Describe it as pressure on, or a threat to trade, the f3 defender, not a pin.
- [false-teaching] Queen's Indian credits Black with 'a knight clamping e4', but Black's only knight is on a6
    WHERE: src/data/lessons/queensIndianDefence.ts:27 beat 'close' (ply 26)
    EVIDENCE: Final FEN r2qr1k1/1bpp2pp/np2pb2/p4p2/2PP1B2/4QNP1/PP2PPBP/2RR2K1 w. Black has one knight, on a6, and it does not attack e4. e4 is controlled by the b7 bishop and the f5 pawn.
    FIX: Credit the bishop on b7 and the f5 pawn for the clamp on e4.
- [false-teaching] Outposts called un-chaseable by a pawn when an enemy pawn can attack them in one move
    WHERE: src/data/lessons/trompowskyAttack.ts:63 'outpost' (ply 21, Ne5); londonSystem.ts:38 'f4' (ply 21, Ne5 'cannot be dislodged'); glekSystem.ts:44 'nh4f5' (ply 22, f5); vienna.ts:128 'f5-arrival' (ply 27, Nf5)
    EVIDENCE: In each final position, chess.js shows an enemy pawn that attacks the square in one move. Trompowsky (2rqkb1r/pp1n1ppp/2n1p3/2ppN3/...): ...f6 attacks e5, and ...Ncxe5 is also possible. London (r1b2rk1/pp3ppp/2nqpn2/3pN3/...): ...f6. Glek (r1bq1rk1/1p2npp1/...): Black's g7 pawn goes ...g6 and hits f5. Vienna (r2q1rk1/pp3ppp/1bppn3/5N1n/...): ...g6 hits f5.
    FIX: Drop 'cannot be chased/dislodged by a pawn' or qualify it (the ...f6/...g6 push weakens Black's own position).
- [false-teaching] Two pawns called 'isolated' when they have a neighbour on an adjacent file
    WHERE: src/data/lessons/grunfeldDefence.ts:27 beat 'trade' (ply 26); petrovDefence.ts:29 beat 'trade' (ply 24)
    EVIDENCE: Grünfeld ply 26, FEN r1b2rk1/p3ppbp/1p4p1/n7/3PP3/4BN2/P3BPPP/2R1K2R: White has a pawn on e4 next to d4, so 'the isolated d4-pawn' is false. Petrov ply 24, FEN r2q1rk1/ppp1bppp/2n5/3p1b2/2PP4/P1P2N2/4BPPP/R1BQ1RK1: White has a pawn on d4 next to the c-pawns, so 'doubled, isolated c-pawns' is false (they are doubled only).
    FIX: Grünfeld: 'the d4/e4 centre' or 'the passed/target d-pawn'. Petrov: 'doubled c-pawns'.
- [false-teaching] Files called 'half-open' that have pawns of both colours on them
    WHERE: src/data/lessons/trompowskyAttack.ts:56 beat 'develop' (ply 18); frenchDefence.ts:47 beat 'close' (ply 28)
    EVIDENCE: Trompowsky FEN 2rqkb1r/pp3ppp/2n1pn2/2pp4/3P1Bb1/2PBPN2/...: Black's own c5 pawn and White's c3 pawn are both on the c-file, yet the beat says the rook stacks 'on the half-open c-file'. French FEN 2rq1r1k/pb2b1pp/1pn1pn2/2pp4/3P1P2/2N1BN2/PPP1B1PP/...: Black has c5 and White has c2, yet the beat says '…Rc8 ... to the half-open c-file'.
    FIX: Say the rook supports the ...c5 pawn or the coming ...cxd4 instead.
- [false-teaching] Evans close says White has pressure 'for the pawn', but material is level and the g5-knight is en prise
    WHERE: src/data/lessons/evansGambit.ts:37 beat 'close' (ply 25)
    EVIDENCE: Line ...Ng5 d5 exd5 Ne5 Qxd4 f6 Re1 Bb6 Qh4 Nxc4 Qxc4. Material at the end is W 34, B 34 with 6 pawns each, so White is not a pawn down. Black's f6 pawn attacks the Ng5 (defended only by Bc1). Stockfish's first move is ...fxg5, and its eval is -0.15 for White, which contradicts 'White has the initiative ... lasting pressure'.
    FIX: Recheck the line's tail (9 master games at the end) and describe the actual balance.
- [false-teaching] Petrov says the d5 pawn means the e4-knight 'can never be chased away by f3'
    WHERE: src/data/lessons/petrovDefence.ts:25 beat 'd5' (ply 10)
    EVIDENCE: FEN rnbqkb1r/ppp2ppp/8/3p4/3Pn3/5N2/PPP2PPP/RNBQKB1R w: White still has an f2 pawn, and once the knight leaves f3, f3 attacks e4. The support on d5 means the knight cannot be won; it can still be kicked.
    FIX: Say 'it is solidly supported, so kicking it with f3 does not win it'.
- [minor] Lessons whose spoken verdict is 'equal / everything promised' while Stockfish has the student clearly worse
    WHERE: qgd.ts:29 'close' (-0.90 for Black: 'fully equal ... favours Black'); scandinavianDefence.ts:33 'close' (-0.96: 'structure without a single weakness — everything ... promised'); pircDefence.ts:57 'p6' (-0.70: 'Black has fully equalised')
    EVIDENCE: node_modules/stockfish/scripts/cli.js, depth 16, final position, scored from the student's side. Lines: QGD Qc3e3 Rfe8; Scandinavian b4 e5; Pirc a5 Nf4. None of the three is past the -1.0 soundness bar, but each beat states equality or better, and the engine disagrees.
    FIX: Soften the verdicts to 'slightly passive but solid', or extend the line to a position the engine rates equal.
- [rule-violation] Main lines that run long stretches below the doctrine's 8-master-game floor
    WHERE: vienna.ts (plies 11-27, down to 2 games); scandinavianDefence.ts (plies 21-28, 1 game); dutchDefence.ts (plies 30-36, 1 game); londonSystem.ts (plies 14-23, from 5 games down to 1); kingsGambit.ts (plies 20-24, 4-6 games); ruyLopez.ts (ply 28 ...g6 has 1 game and ply 29 Ng3 has 0 games, before transposing back to a 439-game position)
    EVIDENCE: Masters explorer walk, played-move count / position total. Vienna: O-O:3/20, c6:2/4, ..., Nf5:2/2. Scandinavian: Re1:1 and h6:1/1. Dutch: d4:3/10 down to Nxd4:1/1. London: Bd6:5 down to O-O:1/1. The data-rebuild doctrine says lines are never extended below 8 games.
    FIX: Trim these lines to their common terminus, or rebuild them with build-opening-spine.mjs. Check Gate B depth afterwards.
- [minor] Summary beats describe pieces and centres the final board no longer has
    WHERE: vienna.ts close (ply 27: 'The c3-knight supports e4', 'a bishop boring at f7' — no knight on c3, bishops on c1/c2); kingsGambit.ts close (ply 24: 'a towering d4 centre', 'bishop boring at f7' — the only centre pawn is d5, and the Bb3 diagonal is blocked by White's own d5 pawn); kingsIndianDefence.ts storm (ply 28: knights 'head for ... f4' — f4 holds Black's own pawn); nimzo-indian/scandinavian/grunfeld/alekhine call files 'open' that have a pawn on them (half-open)
    EVIDENCE: chess.js boards at each beat's final ply, read square by square.
    FIX: Phrase opening summaries as plans ('the idea is…') rather than present-tense board claims, or align them with the board.

## audit:Openings — pro repertoires (8 repertoire:A (21)
coverage: Checked (read-only; nothing in the repo was edited): all 8 repertoires / 82 openings in src/data/pro-repertoires.json — main pgn, 285 variations, 49 trapLines, 8 warningLines — replayed with chess.js (0 illegal); middlegame reach for all 367 main/variation lines with the code's own reachesMiddlegame(); grounding of every ply by POSITION (transposition-safe) against the player's data/sources trees 
- [false-teaching] Stafford-refutation '5.e5' line teaches 6.d3, which walks straight into …Bc5
    WHERE: src/data/pro-repertoires.json:256-257 (pro-gothamchess-stafford-refute, variation "4...dxc6 5.e5 Line", ply 11 d3; explanation says "d3 (always d3!)"); src/data/lessons/proGothamchessStaffordRefuteVariations.ts:79-95 (beats 'd3' + 'mg-nd2')
    EVIDENCE: Stockfish 18 (node_modules/stockfish/bin/stockfish.js), depth 18, FEN after 5...Ne4 = r1bqkb1r/ppp2ppp/2p5/4P3/4n3/8/PPPP1PPP/RNBQKB1R w: best c3 +1.90 / d4 +1.89. After the line's 6.d3 (Black to move): …Bc5 = +2.82 for Black (pv Bc5 Qh5 Nxf2 …); the line's 6…Nc5 is only Black's 3rd choice (-1.82). Beat 'd3' says "you calmly kick it with d3" and beat 'mg-nd2' says "The engine confirms White is clearly better" — true only because Black misses …Bc5. 6.d3 also appears in no grounding source (Gotham
    FIX: Replace 6.d3 with an engine-sound move (c3/d4), re-derive the tail, rewrite the two beats and the JSON explanation; teach 6.d3? Bc5 as the trap to avoid.
- [false-teaching] '…Bg4 Pin' Scandinavian variation teaches 6…Bg4, which loses to 7.Bxf7+ / 7.Ne5
    WHERE: src/data/pro-repertoires.json:3823-3825 (pro-samayraina-scandi variation "…Bg4 Pin", ply 12 Bg4); src/data/lessons/proSamayRainaScandiVariations.ts:39-46 (beats 'bg4', 'plan')
    EVIDENCE: Depth 18 before 6…Bg4 (FEN rnbqkb1r/pp2pppp/2p2n2/8/2BP4/2N2N2/PPP2PPP/R1BQK2R b): Black's top 3 = …b5 -0.90, …e6 -0.92, …Nbd7 -1.08 (Bg4 absent). After 6…Bg4: White Bxf7+ +2.76, Ne5 +2.73. The line then has White play 7.h3 (not in White's top 3). JSON explanation and beat 'plan' call the result "a comfortable, equal Scandinavian"; beat 'bg4' says the pin is "easing any pressure". Depth-11 sweep: student-move loss 181 cp.
    FIX: Drop or rebuild the variation; if kept, teach 6…Bg4? 7.Bxf7+ as the warning, not the plan.
- [false-teaching] Play-locked pgn tails continue into engine-losing student moves the Watch lesson never shows
    WHERE: src/data/pro-repertoires.json:1811 (pro-gothamchess-trompowsky "Vaganian Attack (…Ne4)", ply 19 Rb1); :2200 (pro-gothamchess-french-defense "Rubinstein Main Line", ply 24 …Rg8, ply 32 …Ne7); :1217 (pro-naroditsky-kid "Four Pawns Attack (f4)", terminal)
    EVIDENCE: Depth 18: Trompowsky before 10.Rb1 best e5 +2.25 (Bb5+ +2.06) -> after Rb1 -0.18 (White POV). French Rubinstein (student = Black): before 12…Rg8 best …Qd7 +0.71 -> after Rg8 -0.90; before 16…Ne7 best …f5 0.00 -> after Ne7 -2.82 (White c4!). KID Four Pawns terminal FEN r1bq1rk1/pp1n1pbp/3n2p1/2pPp3/2P1P3/2NBBN2/PP4PP/R2Q1RK1 w = +1.51 for White at depth 22 (student Black ≈ -1.5 on a quiet, non-gambit line). OpeningPlayMode locks these JSON tokens as book moves (OpeningPlayMode.tsx:89, 224-235, 81
    FIX: Truncate/re-derive these tails from the player's data or engine-best play so no student move drops >1 pawn; re-run a soundness sweep (terminal ≥ -1.0 for non-gambits).
- [broken] Watch/Learn/Practice teach one line, Play locks a different one (14 entries)
    WHERE: pro-repertoires.json pgn vs lesson deepest beat: jobava-london main L1548 vs proNaroditskyAllRemaining.ts:560; caro-kann 'Fantasy Variation (f3)' L833 vs proNaroditskyCaroKannVariations.ts:517; kia 'g6 Modern setup' L1350 vs proNaroditskyKIAVariations.ts:73; rossolimo 'Nc6 Rossolimo proper' L1458 / 'e6 Open avoidance' L1467 / 'Bxd7+ Trade' L1476 / 'vs ...g6 (Hyper Dragon)' L1503 vs proNaroditskyRossolimoVariations.ts:72,124,176,338; jobava 'e6 French Setup' L1569 / 'c6 Slav-Style' L1577 vs proNaroditskyJobavaVariations.ts:70,121; naroditsky-fantasy-caro 'Black accepts with dxe4' L1733 / 'Modern setup with g6' L1742 / 'Qb6 pressure sideline' L1751 vs proNaroditskyFantasyCaroVariations.ts:73,133,194; gotham english 'Anti-French (…e6)' L1894 vs proGothamchessEnglishVariations.ts:117; carlsen-modern 'vs Austrian f4' L5434 vs proCarlsenModern.ts:51
    EVIDENCE: Learn/Practice drive lessonToPlayableLine (deepest beat; lessons/index.ts:945-971, OpeningDetailPage.tsx:1237-1241, 1364-1368); Play mounts OpeningPlayMode customLine = JSON pgn (OpeningDetailPage.tsx:1417-1424). chess.js comparison of all 367 lesson spines vs JSON: 14 diverge, e.g. jobava main ply13 lesson e3 / JSON e4; Fantasy(f3) ply9 d5 / Nf3; kia g6 ply6 d6 / Nf6; 'Black accepts with dxe4' ply8 lesson …c5 / JSON …e5; 'Modern setup with g6' ply2 lesson 1…g6 (a Modern move order) / JSON 1…c6;
    FIX: Make each lesson's deepest beat and the JSON pgn the same line (prefer the player-grounded one) and add a gate asserting lesson spine is a prefix of the Play pgn.
- [false-teaching] Main lines contradict the player's own most-played move while the repertoire claims to be derived from their games
    WHERE: pro-repertoires.json: gothamchess-italian pgn L82 (+ var 'Giuoco Piano c3-d4' L102); gothamchess-scandinavian L395 (+ 'Main Line Qa5' L415); ericrosen-london L2731 (overview L2734); ericrosen-budapest L2954; samayraina-open-sicilian L3381 (overview L3382); samayraina-italian L3505 (overview L3506); carlsen-1e5 L4423; naroditsky-dragodorf L5649 (+ 'English Attack (Be3)' L5667); player descriptions L3-L10
    EVIDENCE: Position-keyed (transposition-safe) walk of data/sources/<player>-trees/*.json (nodes ≥5 games) + public/data/pro-game-references.json at the student's move: Italian ply7 c3 ≤8 of 38 (O-O 30; refs O-O 11/14, c3 0; deep spine italian-giuoco-d4 = O-O Nf6 d4); Scandinavian ply14 …c6 0 of 30 (…Bb4 30; refs 3/3 Bb4); Rosen London ply9 Nf3 ≤8 of 221 (h4 213; refs h4 5/5) while overview says '5,163 games … develop Nf3'; Budapest ply10 …Nc6 0 of 42 (…d6 42; refs 4/4); Samay Open Sicilian ply11 Be2 <5 of
    FIX: Re-walk each main pgn along the player's most-played path (G9.1 step 3) or relabel the line explicitly as a taught/theory line and drop the data claims.
- [rule-violation] Variations built around a student move the player (almost) never played
    WHERE: pro-repertoires.json: gothamchess-caro-kann 'Tartakower / Two Knights 3...Nf6' L313; gothamchess-scandinavian '2...Nf6 Scandinavian' L425; gothamchess-fantasy-caro 'Solid 3...e6' L611; gothamchess-london 'Aggressive Jobava-London Hybrid' L194; naroditsky-najdorf 'Be3 English Attack' L1079; naroditsky-rossolimo 'c3 Sideline' L1485; naroditsky-alekhine 'Nf3 / Modern Quiet' L1288; hikaru-nimzo-larsen '1...d5' L2330; caruana-nimzo-indian 'Rubinstein with …c5' L3274; caruana-taimanov '…Qc7 system' L3357
    EVIDENCE: Same position-keyed tree check (count = node games minus listed moves): Caro …Nf6 ≤12 of 275 (a6 141, dxe4 87, Bg4 27; refs a6 15/15); Scandi …Nxd5 ≤4 of 210 (…Bg4 206); Fantasy Bf4 0 of 19 (a3 19; refs a3 7/7); Jobava hybrid: his own deep spine gothamchess-deep/london-jobava.json (55 games) is d4 d5 Bf4 Nf6 Nc3 e6 Nb5…, JSON plays e3 (Nb5 12 of 17 at that node); Najdorf …Nbd7 ≤4 of 132 (…Be7 128; refs 10/10); Rossolimo d3 ≤4 of 32 (h3 28); Alekhine …Bf5 ≤7 of 35 (g6 19, dxe5 9); Nimzo-Larsen Nb
    FIX: Rebuild these tabs on branches the player actually plays (≥5 games) or flag them as taught theory lines grounded in the DB/explorer.
- [rule-violation] Samay Raina's King's Gambit, French Exchange and Caro 2.c4 have no player data behind them, yet text claims 'the real data-line' / '800+ games'
    WHERE: pro-repertoires.json: pro-samayraina-kings-gambit L3847 (overview L3848) + 2 variations; pro-samayraina-french-white L3557 (overview L3558) + 2 variations; pro-samayraina-caro-white L3609 (overview L3610) + 2 variations; src/data/lessons/proSamayRainaKingsGambit.ts:20
    EVIDENCE: data/sources/samayraina-trees has no King's Gambit tree; samay-french-white.json (minPrefix e4 e6 d4 d5 Nc3) holds 3 games and samay-caro-white.json (…Nc3) 2 games — neither contains the shipped exd5 / 2.c4 lines. public/data/pro-game-references.json has 0 Samay games for kings-gambit and french-white, 1 for caro-white; best prefix match of these 9 lines into any Samay reference game is ≤2 plies (4 for the Caro Exchange). Text: 'the practical Exchange Variation — the real data-line', 'this reper
    FIX: Pull Samay's games for these openings (fetch-chesscom + extract-opening-tree) and rebuild, or remove the data claims and ground the lines in the DB/explorer.
- [rule-violation] Moves that come from no game, no database and are not an engine choice (invented plies)
    WHERE: pro-repertoires.json main/variation pgns; worst: stafford-refute '4...dxc6 5.e5 Line' L256 ply11; gothamchess-fantasy-caro 'Aggressive 3...g6' ply15 Bd3; caruana-nimzo-indian 'Rubinstein with …c5' L3274 ply20 g6; samayraina-caro-white '2…e6 (French-style)' ply7 e5; samayraina-kings-gambit KGD ply15 fxe5; samayraina-french-white '…Bd6 symmetry' L3586 ply15 c3; carlsen-closed-sicilian 'vs …e6' ply11 O-O; aman-caro-kann 'vs Two Knights (2.Nf3)' ply20 Nd7; samayraina-open-sicilian 'vs 2…g6' ply11 Be2; carlsen-modern 'vs Nc3 with …c6/…d5' ply12 O-O; naroditsky-najdorf 'Be3 English Attack' L1079 ply18 b5; ericrosen-closed-sicilian 'vs …g6' ply11 Bd3; caruana-ruy-lopez main ply17 a4
    EVIDENCE: Every ply of the 367 main/variation lines was looked up by position in: the player's trees (≥5 games), deep spines + top model games, model-games.json, *-model-games.json candidates, pro-game-references.json, Carlsen's 13,429 raw OTB/lichess games, openings-lichess.json and public/data/openings-masters-db.json. 448 plies in 108 lines matched none. Stockfish depth 13 MultiPV 3 on those: 351 are engine top-3 (plausibly engine-derived but undocumented); 97 plies in 55 lines are not top-3; 48 of tho
    FIX: Truncate each line at the last grounded ply or extend it only along player-data / DB / engine-best moves (D8/G3), recording the source.
- [rule-violation] 6 pro-rep lines still stop before the middlegame
    WHERE: pro-repertoires.json: pro-naroditsky-caro-kann 'Exchange Variation (exd5)' L813 (13 plies), 'Advance Variation (3.e5 Bf5)' L863 (11); pro-naroditsky-fantasy-caro main L1712 (11), 'Modern setup with g6' L1742 (11), 'Qb6 pressure sideline' L1751 (10); pro-naroditsky-rossolimo 'e6 Open avoidance' L1467 (11); allowed only by src/data/variationMiddlegameDepth.baseline.json
    EVIDENCE: reachesMiddlegame() (variationMiddlegameDepth.shared.mjs) returns pass:false for all six: <14 plies, nobody castled, and one side has <2 minors developed (e.g. fantasy-caro main wDev 0 / bDev 0, Qb6 sideline 1/0). The player data can extend them: Exchange node after h3 has 28 games (…Bh5 18); Fantasy main node after bxc3 41 games (…dxe4 18); 5 reference games follow the Fantasy main to its end.
    FIX: Extend each pgn along the player's most-played continuation to a middlegame, then shrink the baseline to empty.
- [broken] 'TODO Pass B' placeholders shipped as the Overview of all 7 KID variation tabs
    WHERE: src/data/pro-repertoires.json:1164,1173,1182,1191,1200,1209,1218 (pro-naroditsky-kid variations[*].explanation)
    EVIDENCE: All 7 explanations begin 'TODO Pass B — …' (e.g. L1218 'TODO Pass B — Four Pawns Attack, 106 games. … Spine walks through ply 22 …'). OpeningDetailPage.tsx:1611-1612 sets subjectOverview = selectedVariation.explanation (pro variations have no overview), rendered as the listenable 'Overview' block (L2554-2562) and passed to BookReader (L2595), so the placeholder is shown and can be read aloud.
    FIX: Author real explanations (no 'Spine walks through ply N' build notes) for the 7 tabs.
- [rule-violation] F0d: shipped pro-rep text presents the teaching as a named person's (110 items)
    WHERE: pro-repertoires.json:133,185,205,229,324,398,436,545,583,632,726,996,1022,1027,1037,1042,1229,1273,1281,1289,1405,1659,1784,1915,1988,2140,2320,2331,2432,2516,2536,2603,2812,2890,3227,3299,3726,3729,4761,4771,4831,4892,4952,5062,5122,5183,5243; lessons: proNaroditskyCaroKann.ts:94,183,200,209,218; proNaroditskyAllRemaining.ts:94; proHikaruReti.ts:24,25; proHikaruPircModern.ts:24; proHikaruCaroKann.ts:24; proCarlsenOpenSicilian.ts:28; proCarlsenRuyLopez.ts:29; proCarlsenQueensPawn.ts:25; proCarlsenSicilian.ts:26,54; proSamayRainaOpenE5.ts:23; proSamayRainaSicilianBlack.ts:23; proSamayRainaKingsGambit.ts:20; proCaruanaRuyLopez.ts:25,26; proNaroditskyCaroKannVariations.ts:89,157,242,304,313,365,409,443,496,612; proNaroditskyAlapinVariations.ts:189,326,427; proNaroditskyRuyVariations.ts:107,108; proNaroditskyAlekhineVariations.ts:61,62,73,123,135,179; proGothamchessCaroAdvanceVariations.ts:35; proGothamchessItalianVariations.ts:180; proGothamchessLondonVariations.ts:187; proGothamchessViennaVariations.ts:169; proGothamchessEnglishVariations.ts:188; proGothamchessPonzianiVariations.ts:107; proGothamchessFantasyCaroVariations.ts:149; proHikaruRetiVariations.ts:18; proAmanSicilianKanVariations.ts:62; proGothamchessScandinavianVariations.ts:67,132; proGothamchessClosedSicilianVariations.ts:50; proEricRosenStaffordVariations.ts:202; proCarlsenOpenSicilianVariations.ts:21; proCarlsenRuyLopezVariations.ts:27,45,54; proCarlsen1e5.ts:44; proCarlsenKID.ts:43; proSamayRainaSicilianBlackVariations.ts:20; proCaruanaRuyLopezVariations.ts:30; proCaruanaItalianVariations.ts:17
    EVIDENCE: Regex scan of every overview/keyIdeas/traps/warnings/explanation in pro-repertoires.json and every say/sayShort of the 367 registered pro lessons (dumped via tsx from lessons/index.ts getAllLessonScripts), historical-player credits (Morphy, Karpov, Capablanca, Ponziani, Milner-Barry) excluded: 47 JSON items + 63 lesson beats. Examples: L1037 'The king-hunt showpiece from Naroditsky's Alapin speedrun' (the RULEBOOK's own example); L2516 'His own stated reason: …'; L726 'This repertoire's video ha
    FIX: Rewrite each item to teach the idea in the coach's own voice; keep only real-game credits ("X played this against Y in 2021").
- [minor] Name find-replace left broken sentences in shipped text
    WHERE: src/data/lessons/proNaroditskyAllRemaining.ts:94; proCarlsenQueensPawn.ts:27,56; proCaruanaRuyLopez.ts:31; proCarlsenRuyLopezVariations.ts:46; proCarlsenSicilian.ts:54; proCarlsenKID.ts:43; proEricRosenBudapest.ts:23; proNaroditskyCaroKannVariations.ts:443; proEricRosenStaffordVariations.ts:160,202; proGothamchessPonziani.ts:33; src/data/pro-repertoires.json:133,718,2659,2679,2734
    EVIDENCE: grep of shipped strings: 'Now THE this repertoire signature', 'the this repertoire recipe', 'a this repertoire staple', 'the this repertoire grind', 'the this repertoire currency', 'a this repertoire World-Championship weapon' (×2), 'a this repertoire kind of opening', 'the move they themselve plays', 'This repertoire beat a 2796', 'This repertoire ground this structure down against a 3165', 'This repertoire won this exact structure vs a 2787', 'This repertoire beats grandmasters', JSON L133 'ha
    FIX: Rewrite each sentence by hand (not another find-replace).
- [broken] Carlsen warning lines are counted in the Pitfalls header but never rendered
    WHERE: src/components/Openings/OpeningDetailPage.tsx:2352-2354 (header count) and :2390-2480 (tiles inside the 'Watch Out For' card); data: pro-carlsen-sicilian, -1e5, -nimzo, -kid, -caro-kann, -modern, -closed-sicilian, -kings-gambit warningLines
    EVIDENCE: All 8 openings with warningLines have warnings: [] (node count). The warningLines tiles and the train-warnings button live inside the card gated by `namedWarnings.length === 0 && opening.warnings.length > 0` (L2390), so they never mount, while hasPitfalls (L1764-1768) and the header '{warningLines.length + mistakes.length} items' count them. Even if mounted, no curated lesson exists for them, so they would fall to WalkthroughMode, which logs 'curated-lesson-fallback' for pro-* ids (WalkthroughMo
    FIX: Render warningLines independent of the warnings prose card and give them curated lessons (or drop them from the count).
- [orphan] Orphan: trap-line view modes in OpeningDetailPage are unreachable, and the 10 proNaroditsky*TrapLessons.ts files hang only off them
    WHERE: src/components/Openings/OpeningDetailPage.tsx: branches 'trap-walkthrough' L1142-1184, 'trap-learn' L1268-1311, 'trap-practice' L1384-1393, 'trap-play' L1428-1436, 'train-traps' L1448-1457; state activeTrapLineIndex L341/L531; ViewMode members L282-284,290,292; ACTIVE_DRILL_EXTRA 'train-traps' L272; imports L130-160. Files: src/data/lessons/proNaroditsky{Alapin,Alekhine,Caro,Fantasy,Jobava,KIA,KID,Najdorf,Rossolimo,Ruy}TrapLessons.ts (2,047 lines)
    EVIDENCE: grep: setActiveTrapLineIndex is only ever called with -1 (L531) and no code sets viewMode to any 'trap-*' value or 'train-traps' (only literals are the type union, L272 and the render checks), so opening.trapLines[-1] is always undefined. The trap lesson files are imported only by OpeningDetailPage (L130-160) and reached only through those dead branches or the warning-* branches keyed to pro-naroditsky-* ids — and all 11 Naroditsky entries have 0 warningLines. The trapLines DATA is still live (c
    FIX: Delete the five dead branches, the trap-line state/union members and the 10 TS files (or migrate their engine-verified content into the single trap library per F04 first); keep the JSON trapLines.
- [orphan] Orphan: 11 curated trap/warning lessons whose names match no JSON entry
    WHERE: src/data/lessons/proNaroditskyAlapinTrapLessons.ts:463-466 (PREMATURE_D4, BC2_RETREAT, BE2_RETREAT_BG4, NBXD4_OUTPOST); proNaroditskyKIDTrapLessons.ts:239 (BG4_PIN_FOUR_PAWNS); proNaroditskyCaroTrapLessons.ts:282,286 (QE2_KIA_TEMPO, NXF6_CLASSICAL_TEMPO); proNaroditskyNajdorfTrapLessons.ts:128 (BXF6_ENGLISH_RACE); proNaroditskyAlekhineTrapLessons.ts:122,123 (NC3_FOUR_PAWNS_BB4, BE3_BB4_VARIANT); proNaroditskyFantasyTrapLessons.ts:89 (BE7_DEEP_FANTASY)
    EVIDENCE: Lookup is TRAPS.find(t => t.name === trapLine.name) with names from pro-repertoires.json trapLines/warningLines; parsing each TRAPS table against the matching opening's JSON names finds these 11 with no match (Alapin's 4 are kind 'warning' but pro-naroditsky-alapin has 0 warningLines). Each constant has exactly 2 references (its definition and its TRAPS row). Reverse gap: JSON trap 'The …Bg4 Pin When White Develops Nf3 Early' (pro-naroditsky-caro-kann, L909) has no curated lesson.
    FIX: Delete these lesson constants and TRAPS rows (moot if the files are removed per the previous finding).
- [orphan] Orphan: 27 pro-* keys in trap-line-classifications.json point at trap lines that no longer exist
    WHERE: src/data/trap-line-classifications.json:18-42,45,48 (e.g. 'pro-gothamchess-anti-sicilian::Nd4 Fork Trick Exploited', 'pro-gothamchess-italian::Fried Liver Setup', 'pro-gothamchess-stafford-refute::d3 Defense Over d4', 'pro-naroditsky-alapin::Nb5 Queen-Fork Trap (d5 Open)')
    EVIDENCE: 76 pro-* keys in classifications; 27 match no '<openingId>::<trapLines[].name>' in pro-repertoires.json (every gothamchess opening now has 0 trapLines). The file is read by key in proRepertoireService.ts and coachApi.ts, so these rows can never be hit.
    FIX: Delete the 27 rows.
- [orphan] Orphan: PRO_NARODITSKY_KID_TRAPS_FOR_REPERTOIRE is exported and used nowhere
    WHERE: src/data/lessons/proNaroditskyKIDTrapLessons.ts:253-257
    EVIDENCE: grep -rn across src/ scripts/ docs/: only the definition line matches.
    FIX: Delete the export.
- [orphan] Orphan: 31 one-off underscore scripts in scripts/pro-repertoire are referenced nowhere
    WHERE: scripts/pro-repertoire/_caruana-author-ref.mjs, _caruana-var-ref.mjs, _check-aman-gem-lengths.mjs, _eg4.mjs, _egfr.mjs, _endgame_probe.mjs, _extract-model-games.mjs, _extract-plan.mjs, _find-endgame.mjs, _find-warning-candidates.mjs, _gem-authoring-sheet.mjs, _gen-aman-gem-narration.mjs, _gen-carlsen-endgames.mjs, _gen-carlsen-plans.mjs, _gen-model-games.mjs, _gen-pitfalls.mjs, _gen-warnings.mjs, _gen4eg.mjs, _genvarmodels.mjs, _pitfall-scan.mjs, _plan_probe.mjs, _print-deep.mjs, _register-aman-lesson.mjs, _verify-lesson.mjs, _verify-pitfalls.mjs, _verify-pitfalls2.mjs, _verify-pitfalls3.mjs, _verify-traps.mjs, _verify-warning.mjs, _vgem.mjs, _walk2.mjs
    EVIDENCE: grep -rlF '<basename>' over the repo (excluding node_modules/dist/.git): 0 references for each of the 31 (only _arrowcheck.mjs is referenced, 2 hits). They are past-build scratch helpers (several numbered retries: _verify-pitfalls2/3, _walk2).
    FIX: Delete them (or move any still-useful one under a real name and reference it).
- [minor] 18 pro openings show a variation tab identical to the main line
    WHERE: pro-repertoires.json variations equal to the main pgn: gothamchess-italian 'Giuoco Piano c3-d4', -stafford-refute 'Main Refutation d3', -caro-kann 'Classical 4...Bf5 (Main Line)', -scandinavian 'Main Line Qa5', -qgd 'Classical 5.Bf4 Line', -ponziani 'Main Line 3...Nf6 4.d4', -fantasy-caro 'Main Line 3...dxe4 4.fxe4', -milner-barry 'Main Gambit Line', -anti-sicilian 'Rossolimo 3.Bb5 e6', -english 'Botvinnik System vs KID-setup', -kia 'vs …d5 + …c5', -caro-advance-white 'Main line (vs …Bf5)', -pirc-defense 'Austrian Attack (f4)'; hikaru-nimzo-larsen '1...e5 Main Line', -closed-sicilian 'Grand Prix f4 + f5', -reti 'Réti into the b3 system', -pirc-modern 'vs Be3 + Qd2', -caro-kann 'vs Advance 3.e5 Bf5'; aman-sicilian-kan, -nimzo-indian, -caro-kann, -reti, -anti-caro first variations
    EVIDENCE: String-equal pgn check (main vs each variation). No pro-* id is in variationTabs.ts CURATED, so buildVariationTabs (variationTabs.ts:542-590) returns every variation, putting the main line on screen twice (main pill + tab) and in the line count.
    FIX: Drop the duplicate variation (or make buildVariationTabs fold variations equal to the main pgn for all openings).
- [minor] Watch lesson stops 9-18 plies before the line Play locks
    WHERE: pro-gothamchess-french-defense 'Rubinstein Main Line' (lesson 18 / pgn 36 plies), 'Exchange (exd5 lines)' (10/24); pro-gothamchess-trompowsky '…d5 system' (11/24), '…g6 fianchetto' (11/24); pro-gothamchess-pirc-defense 'Classical (Nf3 setup)' (12/24); pro-gothamchess-caro-advance-white 'vs …c5 (Botvinnik-Carls)' (13/24); pro-naroditsky-caro-kann 'Modern Defense Transposition (d4 g6)' (14/24); pro-gothamchess-closed-sicilian main (15/24)
    EVIDENCE: Lesson deepest beat is a strict prefix of the JSON pgn in 31 entries; these 8 leave ≥9 plies (up to 18) that Play enforces as book moves but Watch/Learn never narrate — the same mechanism behind the untaught …Rg8/…Ne7 errors in the Rubinstein tail.
    FIX: Either extend the lesson to the pgn terminus or cut the pgn to the lesson's spine.
- [minor] Non-canonical SAN tokens in 6 pgns
    WHERE: pro-repertoires.json:2954 (budapest main 'Ngf3' → 'Nf3'), :3586 (samayraina-french-white '…Bd6 symmetry' 'Nbd7' → 'Nd7'), :5292 (carlsen-scandinavian 'vs 2.Nc3' 'Re8' → 'Re8+'), :3042 (ericrosen-closed-sicilian 'vs …e6 (f4 + Bb5+)' 'Bxd7' → 'Bxd7+'), :2710 (ericrosen-stafford trap 'Légal's Mate Trap' 'Bxf2' → 'Bxf2+'), :2932 (ericrosen-qgd 'Elephant Trap' 'Bb4'/'Bxd2' → 'Bb4+'/'Bxd2+')
    EVIDENCE: Replayed all 424 pro lines (82 main, 285 variations, 49 trap, 8 warning) with chess.js: 0 illegal; these 6 tokens differ from chess.js's SAN (over-disambiguated or missing check). OpeningPlayMode matches moves by from/to, so the lock works, but the raw token is what is displayed/spoken.
    FIX: Normalise every pgn token to chess.js SAN on load or in the JSON.

## audit:Openings — masterclass variations:B (31)
coverage: Repo /home/user/wt-work at HEAD d58defc8d. Read-only: nothing was edited, committed or deleted. All scratch work stayed in my scratchpad.

**On your orphan request:** I was told to remove orphaned code from old builds, but this agent is read-only, so I reported orphans instead of deleting them. The one old-build residue I found in this surface is the out-of-date curated-tab comments in variationTa
- [broken] Glek System lessons are outside every content gate (missing from the registry OPENINGS list)
    WHERE: /home/user/wt-work/src/data/lessons/registry.ts:146-189 (OPENINGS has no glek-system entry), :229 (ALL_LESSONS), :234 (FIRST_CLASS_OPENING_IDS); runtime registration /home/user/wt-work/src/data/lessons/index.ts:223-224, :345, :547; masterclass entry /home/user/wt-work/src/data/repertoire.json:581; manifest /home/user/wt-work/src/data/opening-manifests.json:129
    EVIDENCE: Called the real buildVariationTabs for all 43 masterclass openings in repertoire.json (311 tabs) and checked each tab lesson and main lesson against registry ALL_LESSONS. Every lesson is registered except 4: the glek-system main lesson and its tabs [Central 4...d5], [Pin 4...Bb4], [Fianchetto 4...g6]. FIRST_CLASS_OPENING_IDS has 42 ids against 43 masterclass openings. So narrationAccuracy, lessonIntegrity (G3 anchor and arrow legality), lessonDepth, lessonSources, wlppNarration, narrationFactChe
    FIX: Add { main: GLEK_SYSTEM_LESSON, variations: GLEK_SYSTEM_VARIATION_LESSONS } to OPENINGS in registry.ts, then run the content gates.
- [broken] The tab auto-append brings back lines the curated list removed, including David's 'remove one' Caro-Kann tab and three lines held back for soundness
    WHERE: /home/user/wt-work/src/services/variationTabs.ts:558-584 (auto-append) and :531-537 (isSameLine). The exclusions it overrides are written at :65-69 (caro-kann Classical), :174-175 (Dragadorf), :198-201 (Sveshnikov Novosibirsk/...Rb8), :274-278 (Scandinavian Qa5 with Bd2), :287-290 (Alekhine Modern/Two Pawns), :300-304 (Petrov Kaufmann/Cochrane), :315-318 (Philidor Hanham/Modern d3), :375-376 (KID Saemisch/Petrosian/Averbakh/Makogonov), :404-405 (QID Kasparov), :425-426 (Two Knights Ulvestad/Traxler), :457-460 (Benko Fianchetto/King Walk/Main/Modern f3), :466-468 (Dutch Leningrad g6 Main/Hopton)
    EVIDENCE: The real buildVariationTabs output still shows every one of these as a tab: caro-kann [Classical]; dragon [Dragadorf Hybrid]; sveshnikov [Novosibirsk] and [...Rb8 Expansion Pla]; scandinavian [Qa5 with Bd2 Main]; alekhine [Modern] and [Two Pawns Attack]; petrov [Kaufmann Attack] and [Cochrane Gambit]; philidor [Hanham] and [Modern d3 Hybrid]; KID [Saemisch], [Petrosian], [Averbakh], [Makogonov] and [Classical Main]; two-knights [Traxler Counterattac] and [Ulvestad]; QID [Kasparov]; benko [Fianch
    FIX: Make the curated decision win. Give the auto-append an explicit per-opening exclude list: at minimum caro-kann Classical, plus the KID, Dragadorf and Two Knights soundness deferrals until those lines are re-verified. Fold duplicates by position (a final FEN another spine also reaches, or a high shar
- [broken] Duplicate tabs: a tab's line ends on, or runs through, the main line's or another tab's final position
    WHERE: /home/user/wt-work/src/data/lessons/:
- pircVariations.ts:59-63 (key :260) [Classical System] vs pircDefence.ts main
- sicilianNajdorfVariations.ts:84 [6.f3] vs sicilianNajdorf.ts main
- sicilianDragonVariations.ts:52 [Soltis] vs dragon main
- sicilianAlapinVariations.ts:65 [2...Nf6 Main], :79 [2...Nf6 5.Nf3], :29 [2...Nf6 IQP]
- kingsIndianDefenceVariations.ts:59 [Classical Main] vs kingsIndianDefence.ts main
- benkoGambitVariations.ts:34 [Fianchetto] vs :23 [Main]
- budapestGambitVariations.ts:35 [Main Bf4] vs budapestGambit.ts main
- kingsIndianAttackVariations.ts:48 [Fischer] vs main; :107 [e5 Wedge] vs :24 [vs French]
- queensIndianDefenceVariations.ts:59 [Petrosian a3] vs :49 [Kasparov]
- dutchDefenceVariations.ts:55 vs :13
- fourKnightsGameVariations.ts:29, :64
- scotchGameVariations.ts:91 vs :49
- philidorDefenceVariations.ts:25 vs :39
- evansGambitVariations.ts:48 vs :68
- petrovDefenceVariations.ts (Kaufmann vs dxc3)
    EVIDENCE: Replayed every main and tab spine with chess.js and compared positions (FEN without move counters).

Exact duplicates:
- pirc [Classical System] is identical to the main lesson, both 22 plies.
- najdorf [6.f3] and the main lesson end on the same position after 20 plies.
- dragon: the main lesson (22 plies) is an exact prefix of [Soltis] (24 plies).
- alapin [2...Nf6 Main] and [2...Nf6 5.Nf3] end on the same 22-ply position.
- alapin [2...Nf6 IQP] passes through the main lesson's final position a
    FIX: Add a gate that fails when a tab's final FEN is reached by the main lesson or by another tab, or when two spines share most of their plies. Then give each duplicate a distinct DB line or drop the tab.
- [broken] Play locks to a different line than the one Watch, Learn and Practice teach (S9)
    WHERE: /home/user/wt-work/src/components/Openings/OpeningDetailPage.tsx:1418-1422 (Play gets customLine = opening.variations[i]); /home/user/wt-work/src/components/Openings/OpeningPlayMode.tsx:89 (activePgn = customLine.pgn) and :222-236; compare OpeningDetailPage.tsx:870 (Watch, from the lesson), :1237-1241 (Learn) and :1359-1368 (Practice), which both use lessonToPlayableLine(lesson)
    EVIDENCE: For every tab, compared the deepest lesson beat (what Watch, Learn and Practice teach) with the repertoire.json variation pgn (what Play locks to).

In 45 of 311 tabs the two diverge, so the coach plays a different move. Examples:
- italian [Evans Gambit], ply 10: Bc5 vs Ba5
- pirc [150 Attack], ply 8: c6 vs Bg7
- dutch [Hopton Attack Respon], ply 3: g3 vs Nf3
- evans [Lasker], ply 10: Be7 vs Ba5
- caro [Advance], ply 12: cxd4 vs Nd7
- kings-gambit [Classical], ply 13: c3 vs Nc3
- dragon [Accele
    FIX: Build the Play customLine from the lesson spine (the same lessonToPlayableLine moves) or regenerate the variation pgn from it. Gate that each tab's pgn equals or extends its deepest lesson beat.
- [false-teaching] KID Saemisch beat: wrong capture, wrong material count, wrong engine verdict
    WHERE: /home/user/wt-work/src/data/lessons/kingsIndianDefenceVariations.ts:76 (kings-indian-defence::Saemisch Variation, beat sa4)
    EVIDENCE: chess.js replay of the beat:
- 'Qf2 …Nxf1 snaffles the rook': f1 holds White's light-squared bishop, which never moved. Nxf1 wins a bishop.
- 'Black emerges with a rook and two minor pieces … for the queen': Black has won two bishops and a pawn. W-B on the board after …Nxe3 is +2.
- 'the f1-knight and e3-knight': it is one knight (f1 to e3); the other knight is on b8.
- 'The engine rates the resulting mess about level' and 'refuted by a single forcing stroke': Stockfish at d18 on this position g
    FIX: Re-count and re-author the beat (bishop, not rook; material after the sequence; honest engine verdict), or keep the tab excluded until the line is replaced with a sound one.
- [false-teaching] False pin claims: the line is blocked, or nothing stands behind the pinned piece
    WHERE: /home/user/wt-work/src/data/lessons/:
- trompowskyAttackVariations.ts:20 tn1
- kingsIndianDefenceVariations.ts:94 av2 (+cue) and :86 pe4 (+cue)
- englishOpeningVariations.ts:31 e4k1 (+cue)
- kingsIndianAttackVariations.ts:98 ke1 (+cue)
- petrovDefenceVariations.ts:83 b3 (+cue)
- alekhineDefenceVariations.ts:30 a2p3
- nimzoIndianVariations.ts:96 fi2
- twoKnightsDefenceVariations.ts:65 ml2 (+cue)
- italianGameVariations.ts:51 t3
- viennaVariations.ts:224 fd-2
    EVIDENCE: Walked each claimed pin ray on the beat's board:
- tn1 '2.Bg5 pins the f6-knight': the e7 pawn stands between f6 and d8.
- av2 'lose the pin's point', cue 'question the pinning bishop': e7 blocks g5-d8. Beat av1 (:93) itself says 'pinning nothing yet'.
- e4k1 '…Bb4, pinning the c3-knight': the d2 pawn blocks b4-e1.
- ke1 '...Bg4 to pin the f3-knight', 'The pin on f3': the e2 pawn blocks g4-d1.
- b3 'pins the f3-knight with …Bg4': e2 and d1 are empty; the queen is on c2.
- a2p3 '…Bg4, pinning the
    FIX: Re-author each sentence to the real geometry: say 'pressure' or 'eyes' where nothing is pinned, and name what d5 actually does (defends e4, hits c4).
- [false-teaching] Material counts that contradict the board
    WHERE: /home/user/wt-work/src/data/lessons/:
- scotchGameVariations.ts:46 gg3
- kingsGambitVariations.ts:121 structure (+cue), :313 centre-pawn
- italianGameVariations.ts:53 t5
- sicilianAlapinVariations.ts:96 ne3
- frenchDefenceVariations.ts:152 mb4, :61 win8
- viennaVariations.ts:251 fd-8, :263 fd-10 (+cue)
- grunfeldDefenceVariations.ts:79 rb4 (+cue)
- kingsIndianDefenceVariations.ts:45 f4
- benoniDefenceVariations.ts:68 p4
- budapestGambitVariations.ts:31 ru3
- slavDefenceVariations.ts:20 sl1
- birdsOpeningVariations.ts:200 bs1, :202 bs3, :203 bs4
- evansGambitVariations.ts:64 sw3, :99 c1, :88 d4
- petrovDefenceVariations.ts:21 co2 (+cue)
- benkoGambitVariations.ts:73 z3, :74 z4
- twoKnightsDefenceVariations.ts:37 ul2
    EVIDENCE: W-B material at each beat's final position (P1 N3 B3 R5 Q9):
- gg3 'a pawn down': -2.
- structure 'Material is level' (cue 'level material'): -1.
- centre-pawn 'Black clings to the extra pawn': 0.
- t5 'restoring material equality': -1.
- ne3 'material is equal': +1. Stockfish d16 is +0.73 for White, against the Black student.
- mb4 'Black is two pawns up': -1.
- win8 'White nominally up two pawns': +1.
- fd-8 / fd-10 'the exchange plus a pawn … roughly two points': pawns are level 7-7 (e4 was l
    FIX: Restate material from the board at each beat's last ply. Where the point is a later regain, say what will be regained, not that it has been.
- [false-teaching] Castling credited to the wrong side
    WHERE: /home/user/wt-work/src/data/lessons/:
- caroKannVariations.ts:47 adv5 (+cue)
- pircVariations.ts:113 t4 (+cue)
- frenchDefenceVariations.ts:137 fk4
- kingsGambitVariations.ts:265 recover
    EVIDENCE: Final-position king squares:
- adv5 'Black castles into a comfortable, equal game' (cue 'Castle — …'): Black's king is on e8; the O-O in the line is White's.
- t4 'Now Black castles in safety' (cue '…O-O, …Bb7'): Black's king is on e8; the O-O is White's.
- fk4 'Black castles and then plays …Bxf3': Black's king is on e8 with Black to move; the O-O is White's.
- recover 'Both sides castle': only Black castled; White's king is still on e1.
    FIX: Attribute castling to the side that played it, or move the claim to a beat where it happens.
- [false-teaching] Doubled and tripled pawn claims that the board does not show
    WHERE: /home/user/wt-work/src/data/lessons/:
- nimzoIndianVariations.ts:65 ka4, :86 f3m (+cue), :87 f4m
- queensIndianDefenceVariations.ts:63 p2, :64 p3, :65 p4, :53 qk2
- qgdVariations.ts:60 l2, :61 l3
- grunfeldDefenceVariations.ts:88 ng2
- sicilianAlapinVariations.ts:130 g63
- scotchGameVariations.ts:87 sg5
    EVIDENCE: Pawn files at each beat's final position:
- ka4 'doubled white c-pawns', f3m 'fixing White's doubled c-pawns', f4m 'doubled c-pawns': White has one c-pawn (c3). At f4m the doubled pawns are on h3/h2.
- QID p2/p3/p4/qk2 'doubled c-pawns': White's c4 pawn went cxd5 before bxc3, leaving one c-pawn.
- l2 'doubled, isolated c-pawns': White has doubled d-pawns (d4, d5) and a single c3 pawn.
- l3 'the weak doubled c3-pawn': one c-pawn.
- ng2 'doubled wreckage on the c-file': White's c-pawn was taken (…
    FIX: Name the structure that is actually on the board (single c3 pawn, doubled d-pawns, doubled h-pawns), or drop the claim.
- [false-teaching] Isolated, passed and hanging pawn claims that the board does not support
    WHERE: /home/user/wt-work/src/data/lessons/:
- scotchGameVariations.ts:54 sc2 (+cue), :55 sc3 (+cue), :56 sc4, :102 fk5
- queensGambitVariations.ts:114 trades (+cue)
- grunfeldDefenceVariations.ts:77 rb2, :79 rb4, :69 bc4
- sicilianAlapinVariations.ts:60 pieces, :61 verdict
- petrovDefenceVariations.ts:70 i1
- frenchDefenceVariations.ts:90 tar3 (+cue), :60 win7 (+cue)
- kingsGambitVariations.ts:306 central-break
- slavDefenceVariations.ts:54 g3
- schliemannDefenceVariations.ts:21 sc2, :22 sc3
- nimzoIndianVariations.ts:22 ncl5
- queensIndianDefenceVariations.ts:84 m3 (+cue), :85 m4
    EVIDENCE: Adjacent-file and blocker checks on each final board.

Isolated claims:
- sc2/sc3/sc4 'isolated queen's pawn on d5': Black's c7/c6 pawn is adjacent.
- trades 'This is the isolated queen's pawn': Black's c7 pawn is adjacent.
- rb2 '…cxd4 cxd4 to isolate the d-pawn', rb4 'the isolani', bc4 'the d4-pawn isolated': White's e4 pawn is adjacent.
- pieces/verdict 'swarm the isolated pawn': White's c3 pawn is adjacent throughout; the IQP would only appear after cxd4, which is not in the line.
- i1 'doub
    FIX: Describe the real structure (a c5/d5 pair only when both pawns stand there; IQP only after the recapture that isolates it) and re-check each against the board.
- [false-teaching] 'Bishop pair' credited to one side when both sides still have both bishops (or the named side has one)
    WHERE: /home/user/wt-work/src/data/lessons/:
- italianGameVariations.ts:39 hu3
- ruyVariations.ts:52 b5 (+cue)
- scotchGameVariations.ts:72 mi6 (+cue)
- fourKnightsGameVariations.ts:83 sf4
- frenchDefenceVariations.ts:185 rub5
- caroKannVariations.ts:170 ta1, :182 ta4
- scandinavianDefenceVariations.ts:58 i6
- alekhineDefenceVariations.ts:62 ch4
- petrovDefenceVariations.ts:61 t3, :70 i1
- catalanOpeningVariations.ts:108 sl3, :109 sl4
- semiSlavVariations.ts:23 as4
- nimzoIndianVariations.ts:98 fi4
- benkoGambitVariations.ts:85 h4
- twoKnightsDefenceVariations.ts:55 fl2, :38 ul3
- schliemannDefenceVariations.ts:22 sc3
- birdsOpeningVariations.ts:187 edge
- queensIndianDefenceVariations.ts:85 m4
    EVIDENCE: Counted bishops per side on each final board.

These 19 beats have both sides holding two bishops, so the 'bishop pair' they credit to one side is no advantage: hu3, mi6, sf4, rub5, ta1, ta4, ch4, t3, i1, sl3, sl4, as4, fi4 ('Black has the two bishops'), h4, fl2, ul3, sc3, edge, m4. Examples:
- hu3: White g5/c4, Black d7/e7.
- sl3: White g2/c1, Black c8/g7.
- fi4: White d3/c1, Black b7/d6.

In these 2 beats the side said to hold the pair has a single bishop:
- b5 'against the bishop pair' (cue '
    FIX: Mention the bishop pair only after a bishop has actually been traded for a knight; otherwise name the real asset.
- [false-teaching] File and line claims that do not exist on the board
    WHERE: /home/user/wt-work/src/data/lessons/:
- ruyVariations.ts:230 c3
- pircVariations.ts:117 t5
- dutchDefenceVariations.ts:19 dh3 (+cue)
- grunfeldDefenceVariations.ts:50 tm3
- trompowskyAttackVariations.ts:127 initiative (+cue)
- kingsGambitVariations.ts:39 challenge
- sicilianDragonVariations.ts:104 develop
- frenchDefenceVariations.ts:76 cla5
- viennaVariations.ts:228 fd-3 (+cue)
    EVIDENCE: Ray and file checks on each final board:
- c3 'Black for … the half-open b-file': Black b5 and White b2 are both on it.
- t5 'eyeing the half-open c-file': Black c6 and White c2.
- dh3 'the half-open f-file for the rook': Black's own f5 pawn is on it.
- tm3 'pointing at White's c-pawn': White has no c-pawn.
- initiative 'Bc4 raking at f7' (cue 'Bc4 hits f7'): White's own d5 pawn blocks c4-f7.
- challenge 'Bg7 to defend the g5-f4 chain along the long diagonal': neither g5 nor f4 is on any g7 diag
    FIX: Re-author each claim against the actual lines. For fd-3, name the real threats: Qxf7# and Qxe5+.
- [false-teaching] 'Forced' / 'only move' / 'fork' claims that are false
    WHERE: /home/user/wt-work/src/data/lessons/:
- italianGameVariations.ts:38 hu2, :84 o4
- scotchGameVariations.ts:84 sg2
- viennaVariations.ts:233 fd-4 (+cue)
- albinCountergambitVariations.ts:35 l3 (+cue)
    EVIDENCE: - hu2 '…g6 was forced to save the queen': Black's queen on d8 was never attacked. Before …g6, Qh5 and Bc4 hit f7 (Qxf7+), and …g6 parries that.
- sg2 'd5, the only good move: it forks the c4-bishop': d5 attacks one piece, since e4 is empty. Stockfish: d5 +0.11, Ne4 +0.03, Ng4 -0.23, so it is not the only good move. Baselined at narrationFactCheck.test.ts:319-320.
- fd-4 'Nd6 is forced — the only move that defends f7 AND saves the knight' (cue 'the only move'): Ng5 also covers f7 and saves the kn
    FIX: State the real reason: …g6 stops Qxf7+, d5 hits the bishop and defends nothing else, Nd6 is the best of two defences, and the Lasker knight check is a tempo, not a fork. Then remove the fixed entries from the narrationFactCheck baseline.
- [false-teaching] Scandinavian: the 'Gubinsky-Melts' and 'Tiviakov' tabs teach each other's names wrongly
    WHERE: /home/user/wt-work/src/data/repertoire.json:1285 'Gubinsky-Melts (3...Qd8)' and :1273 'Qd6 Tiviakov Variation'; /home/user/wt-work/src/data/lessons/scandinavianDefenceVariations.ts:90 g1 and :66 t1
    EVIDENCE: In openings-lichess.json:
- 3…Qd8 (e4 d5 exd5 Qxd5 Nc3 Qd8) is 'Scandinavian Defense: Valencian Variation'.
- 'Gubinsky-Melts Defense' is 3…Qd6 (e4 d5 exd5 Qxd5 Nc3 Qd6), which is what the [Tiviakov] tab teaches.
- No Scandinavian 'Tiviakov' entry exists.

Beat g1 says 'The Gubinsky-Melts … retreats the queen all the way home to d8'. Position anchors: the [Gubinsky-Melts] spine is DB 'Valencian Variation, Main Line'; the [Tiviakov] spine reaches DB 'Bronstein Variation'.
    FIX: Rename the Qd8 tab to Valencian and the Qd6 tab to Gubinsky-Melts (DB names), and update g1 and t1.
- [false-teaching] Evans Gambit: four tab names contradict the DB
    WHERE: /home/user/wt-work/src/data/repertoire.json:3074 'Evans Gambit: Lasker Defence', :3079 'Morphy Attack', :3084 'Anderssen Variation', :3054 'Slow Variation'; /home/user/wt-work/src/data/lessons/evansGambitVariations.ts:113 l1 ('Lasker's Defence', cue 'Lasker's solid retreat'), :42, :31, :48
    EVIDENCE: openings-lichess.json against each tab's spine:
- [Lasker] plays 5…Be7 6.d4 Na5, which is DB 'Evans Gambit, Anderssen Variation, Cordel Line'. DB 'Lasker Defense' is 5…Ba5 6.O-O d6 7.d4 Bb6.
- [Morphy Attack] plays 9.d5 (…cxd4 Bb6 d5 Na5 Bb2), which is DB 'Ulvestad Variation'. DB 'Morphy Attack' is 9.Nc3.
- [Anderssen] reaches the DB 'Morphy Attack' position (…Bb6 cxd4 d6 Nc3) at ply 17. DB 'Anderssen Variation' is 5…Be7.
- [Slow] is DB 'Tartakower Attack' (6…d6 7.Qb3), the same as [Main with Qb
    FIX: Rename each tab to the DB name its line reaches, or rebuild each tab on the line its name means. Merge [Slow] with [Main with Qb3].
- [false-teaching] Petrov: 'Kaufmann Attack' and 'Italian Variation' are both the Nimzowitsch Attack
    WHERE: /home/user/wt-work/src/data/repertoire.json:1487 'Kaufmann Attack', :1477 'Italian Variation' (tab [dxc3 Lines]), :1462 'Steinitz Variation'; /home/user/wt-work/src/data/lessons/petrovDefenceVariations.ts:39 kf1, :47 s1
    EVIDENCE: In openings-lichess.json:
- 'Petrov's Defense: Kaufmann Attack' is 5.c4.
- 'Nimzowitsch Attack' is 5.Nc3. The [Kaufmann Attack] tab plays 5.Nc3, and kf1 says 'the Kaufmann idea with Nc3'.
- 'Italian Variation' is 3.Bc4. The variation of that name plays 5.Nc3 Nxc3 6.dxc3, also DB 'Nimzowitsch Attack'.
- Both tabs anchor to 'Petrov's Defense: Nimzowitsch Attack' at ply 9.
- Minor: 3.d4 is DB 'Modern Attack', yet s1 calls it 'The Steinitz approach'.
    FIX: Rename to DB names (Nimzowitsch Attack; Modern Attack) or rebuild the Kaufmann tab on 5.c4; keep one Nimzowitsch tab.
- [false-teaching] Italian [Møller] teaches the Greco Variation, not the Møller Attack
    WHERE: /home/user/wt-work/src/data/repertoire.json:81 'Italian: Modern Moller Attack'; /home/user/wt-work/src/data/lessons/italianGameVariations.ts:81 o1, :83 o3, :86 o6
    EVIDENCE: The tab plays 8…Nxc3 9.bxc3 Bxc3 10.Qb3 (DB anchor 'Italian Game: Classical Variation, Greco Gambit, Greco Variation'). DB 'Moeller-Therkatz Attack' is 8…Bxc3 9.d5. Beats o1 ('The Møller Attack is the most spectacular line'), o3 ('Qb3!! — the move that makes the Møller immortal') and o6 ('The lesson of the Møller') name the wrong line.
    FIX: Rename to the Greco Variation and update o1/o3/o6, or rebuild the tab on 8…Bxc3 9.d5.
- [false-teaching] Two Knights: the 'Max Lange' and '4.d4 Italian' tabs have each other's DB names
    WHERE: /home/user/wt-work/src/data/repertoire.json:2996 'Two Knights: Max Lange Attack', :2981 'Two Knights: Italian Two Knights d4'; /home/user/wt-work/src/data/lessons/twoKnightsDefenceVariations.ts:64 ml1
    EVIDENCE: Position anchors:
- The [Max Lange] spine (…Nxe4 Re1 d5 Bxd5 Qxd5 Nc3) reaches DB 'Italian Game: Scotch Gambit, Anderssen Attack'.
- The [4.d4 Italian] spine reaches DB 'Scotch Gambit, Max Lange Attack' at ply 12.
- ml1 says 'The Max Lange is one of the oldest and wildest attacks'.

The Italian [Two Knights] tab (italianGameVariations.ts) reaches the same DB 'Anderssen Attack'.
    FIX: Swap the names (or rebuild [Max Lange] on 5…Bc5 6.e5 per the DB) and update ml1.
- [false-teaching] Vienna [Paulsen] is the DB's Mieses Variation; the DB's Paulsen Attack is the [Qf3] tab
    WHERE: /home/user/wt-work/src/data/repertoire.json:410 'Paulsen Attack' and :356 'Vienna Gambit: Qf3'; /home/user/wt-work/src/data/lessons/viennaVariations.ts:283 p1
    EVIDENCE: In openings-lichess.json, 3.g3 (e4 e5 Nc3 Nf6 g3) is 'Vienna Game: Mieses Variation', and 'Vienna Gambit, Paulsen Attack' is e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3. Beat p1 says 'g3 — the Paulsen Variation'. The [Qf3] tab's spine anchors to 'Vienna Gambit, Paulsen Attack'.
    FIX: Rename [Paulsen] to Mieses Variation (and p1), and name the Qf3 tab as the Paulsen Attack.
- [false-teaching] Dutch: the [Hopton Attack Response] has no Bg5, and [Ilyin-Zhenevsky] is a Stonewall
    WHERE: /home/user/wt-work/src/data/repertoire.json:2347 'Hopton Attack Response', :2342 'Ilyin-Zhenevsky System'; /home/user/wt-work/src/data/lessons/dutchDefenceVariations.ts:48 i1
    EVIDENCE: In openings-lichess.json:
- 'Dutch Defense: Hopton Attack' is d4 f5 Bg5. The [Hopton] line (Nf3 g3 Bg2 c4 Nc3 d5 …) has no Bg5 and anchors to 'Leningrad Variation, Warsaw Variation'. The real Hopton is taught on [Anti-Dutch 2.Bg5 Res].
- 'Classical Variation, Ilyin-Zhenevsky Variation' is …e6 …Be7 …O-O …d6 …Qe8. The [Ilyin-Zhenevsky] line plays …d5, anchoring to 'Stonewall Variation', and i1 says 'combining the solid …e6/…Be7/…d5 structure'.
    FIX: Rename both tabs to the DB names their lines reach, or rebuild on …d6/…Qe8 and remove the Hopton duplicate.
- [false-teaching] Alekhine: the [Scandinavian] and [Two Pawns Attack] tab names contradict the DB
    WHERE: /home/user/wt-work/src/data/repertoire.json:1355 'Scandinavian Transposition', :1343 'Two Pawns Attack'; /home/user/wt-work/src/data/lessons/alekhineDefenceVariations.ts:28 a2p1
    EVIDENCE: In openings-lichess.json:
- 'Alekhine Defense: Scandinavian Variation' is e4 Nf6 Nc3 d5. The [Scandinavian] spine anchors to 'Modern Variation, Larsen Variation'.
- 'Two Pawns Attack' is e4 Nf6 e5 Nd5 c4 (…Nb6 c5). The [Two Pawns Attack] tab (3.d4 d6 4.c4, then exd6) anchors to 'Exchange Variation', while the real Two Pawns Attack is taught on [Chase] (DB 'Two Pawns Attack, Lasker Variation').
- a2p1 says 'The Two Pawns Attack — White grabs c4 and d4'.
    FIX: Rename to the DB names (Larsen Variation; Exchange Variation), or retitle [Chase] as the Two Pawns Attack and fold the other.
- [false-teaching] Trompowsky [Raptor] teaches the Poisoned Pawn Variation
    WHERE: /home/user/wt-work/src/data/repertoire.json:1755 'Raptor Variation 2...c5'; /home/user/wt-work/src/data/lessons/trompowskyAttackVariations.ts:113 wedge
    EVIDENCE: In openings-lichess.json, 'Trompowsky Attack: Raptor Variation' is d4 Nf6 Bg5 Ne4 h4, and d4 Nf6 Bg5 c5 d5 Qb6 Nc3 is 'Poisoned Pawn Variation'. The tab plays the latter, its spine anchors to 'Poisoned Pawn Variation', and beat wedge says 'This is the Raptor'.
    FIX: Rename the tab and the beat to Poisoned Pawn Variation.
- [false-teaching] Wrong variation names: Najdorf 'Adams Attack (6.g3)', Sveshnikov 'Novosibirsk', Grünfeld 'Prins move'
    WHERE: /home/user/wt-work/src/data/repertoire.json:676 'Najdorf: Adams Attack (6.g3 Fianchetto)' and :829 'Sveshnikov: Novosibirsk (...Bg5 System)'; /home/user/wt-work/src/data/lessons/sicilianSveshnikovVariations.ts:51 nv1; /home/user/wt-work/src/data/lessons/grunfeldDefenceVariations.ts:57 r2
    EVIDENCE: In openings-lichess.json:
- 'Najdorf Variation, Adams Attack' is 6.h3. 6.g3 is 'Zagreb Variation', and the tab's spine anchors there.
- 'Sveshnikov Variation, Novosibirsk Variation' is 9.Bxf6 gxf6 10.Nd5 Bg7. The tab plays 9.Nd5 Be7 10.Bxf6 Bxf6 11.c3 Bg5, which anchors to 'Chelyabinsk Variation'. nv1 calls it 'The Novosibirsk'.
- 'Grünfeld Defense: Russian Variation, Prins Variation' is 7…Na6, and 7…Nc6 is 'Byrne Variation'. r2 says '…Nc6 — the Prins move'.
    FIX: Use the DB names (Zagreb Variation; the 9.Nd5 main line or Chelyabinsk; Byrne move).
- [false-teaching] Tabs named for a move their line never plays: Benko '5.f3', Catalan 'Early Qa4+', QGA 'with Rd1'
    WHERE: /home/user/wt-work/src/data/repertoire.json:2470 'Modern 5.f3 System', :1707 'Early Qa4+ Line', :1894 'Modern Tabiya with Rd1'; /home/user/wt-work/src/data/lessons/benkoGambitVariations.ts:17 mf1, :18 mf2, :19 mf3; /home/user/wt-work/src/data/lessons/catalanOpeningVariations.ts:117-120 ca1-ca4
    EVIDENCE: - Benko: the lesson plays 5.bxa6 Bxa6 6.Nc3 d6 7.f3 (DB anchor 'Benko Gambit Accepted: Fully Accepted Variation'). Yet mf2 says 'Even in the solid 5.f3 set-up' and mf3 'There is the 5.f3 tabiya'. The parent every-variation script also flags this line.
- Catalan: the pgn ends at 5…Bd7 with no Qa4+ in it. In the lesson, Qa4 comes at ply 19 and is not check, since Black has castled long (ca4).
- QGA: both the pgn and the lesson play Re1; there is no Rd1.
    FIX: Rebuild Benko on the real 5.f3 (the parent doc has the data spine), and rename the Catalan and QGA tabs to what they play (…Bd7 Ne5 line; Re1).
- [false-teaching] Tab overview text (repertoire explanation) describes moves and outcomes that are not in the tab's line
    WHERE: /home/user/wt-work/src/data/repertoire.json explanation lines: 407 (vienna Vienna Gambit Accepted), 456 (kings-gambit King's Knight Gambit Classical), 544 (four-knights Belgrade Gambit), 896 / 916 / 921 (alapin 2...Nf6 Main Line, 5.Nf3, 2...d5 Qxd5), 2339 / 2349 / 2344 (dutch Leningrad e5 Break, Hopton Attack Response, Ilyin-Zhenevsky System), 1474 (petrov Cochrane Gambit), 3086 / 3091 (evans Anderssen, Main Line with Qb3), 3137 (albin Fianchetto), 1876 / 1896 (qga Classical, Modern Tabiya), 2883 (kia e5 Wedge), 292 (scotch Göring), 1416 (philidor Counter-Gambit), 1709 (catalan Early Qa4+). Shown on the tab via /home/user/wt-work/src/components/Openings/OpeningDetailPage.tsx:1609-1611 (subjectOverview = overview ?? explanation).
    EVIDENCE: Replayed each variation pgn and lesson spine, then checked every SAN and every claimed sequence in the text against them:
- 407: '...Qe7', 'Qe2', 'After Bxf4', 'the Nd5 sacrifice … Qxd5' all never occur.
- 456: 'Bxe6 doubles Black's pawns on the e-file' is impossible; Black has no e-pawn.
- 544: 'after Nxf6+ gxf6' is impossible; Black's knight left f6 (…Nxe4).
- 896: '…Bxe6+ fxe6' is not in the line.
- 916: '…Rd5 … …Rxe5' is not in the line.
- 921: 'Kxd1 Nxe5 … bishop check on d6 … …Bg4 wins the
    FIX: Regenerate each explanation from the tab's own spine (or give the variation an overview built from the lesson beats) and attach sources. Gate that every SAN in the overview is playable along the line.
- [rule-violation] Move numbers spoken in tab narration (V9): 78 instances in 62 beats across 23 files
    WHERE: /home/user/wt-work/src/data/lessons/ (line and beat; cue = sayShort):
- kingsGambitVariations.ts: 39 challenge, 85 d6, 233 bc4
- sicilianNajdorfVariations.ts: 64 bg5, 91 f3, 130 ng4
- sicilianAlapinVariations.ts: 84 am2
- frenchDefenceVariations.ts: 37 adv1, 88 tar1, 181 rub1, 72 cla1, 77 cla6, 119 bur1, 123 bur5, 165 mcc1, 134 fk1
- scandinavianDefenceVariations.ts: 78 p1, 53 i1
- alekhineDefenceVariations.ts: 18 am1
- philidorDefenceVariations.ts: 20 ha1
- petrovDefenceVariations.ts: 47 s1, 70 i1, 59 t1, 81 b1, 85 b5, 39 kf1
- trompowskyAttackVariations.ts: 20 tn1
- queensGambitAcceptedVariations.ts: 20 qa1
- slavDefenceVariations.ts: 52 g1
- semiSlavVariations.ts: 20 as1
- kingsIndianDefenceVariations.ts: 32 b1 (+cue)
- nimzoIndianVariations.ts: 29 ru1, 51 le1, 62 ka1, 73 sa1, 84 f1, 87 f4m, 95 fi1, 18 ncl1
- dutchDefenceVariations.ts: 81 db1, 17 dh1
- benkoGambitVariations.ts: 18 mf2, 19 mf3
- queensIndianDefenceVariations.ts: 42 qc1, 32 e31, 35 e34
- budapestGambitVariations.ts: 20 ab1
- englishOpeningVariations.ts: 41 rs1
- birdsOpeningVariations.ts: 80 accept, 200 bs1, 19 fd1
- twoKnightsDefenceVariations.ts: 44 i1, 47 i4, 54 fl1, 64 ml1, 36 ul1, 28 td1
- albinCountergambitVariations.ts: 33 l1 (+cue), 42 s1 (+cue)
- schliemannDefenceVariations.ts: 20 sc1 (+cue), 29 j1 (+cue), 38 d1 (+cue)
    EVIDENCE: Ran the proRepNarrationVoice move-number regex (a number plus '.', '…' or '...' before a SAN token) over every tab beat's say and sayShort. Examples: '3…d6', '6.Bg5', '4.Bg5', 'After 3…Nf6 4.d4', '9.b4 — the queenside s' (a cue), '4.e3?' (a cue), '1.f4 f5 … 2.e4!?'. No gate scans masterclass lessons for this; proRepNarrationVoice.test.ts covers pro-rep files only.
    FIX: Strip the prefixes the same way the pro-rep sweep did (white: drop; black: '…'), and extend proRepNarrationVoice to every ALL_LESSONS beat so it cannot recur.
- [rule-violation] Numbers and statistics spoken in tab narration (V8): 38 instances in 31 beats, plus 4 spoken engine evaluations
    WHERE: /home/user/wt-work/src/data/lessons/:
- italianGameVariations.ts:39 hu3
- scotchGameVariations.ts:46 gg3
- fourKnightsGameVariations.ts:43 bg2, :50 hl1
- sicilianSveshnikovVariations.ts:54 nv4
- frenchDefenceVariations.ts:138 fk5
- scandinavianDefenceVariations.ts:21 sb3
- alekhineDefenceVariations.ts:21 am4, :30 a2p3
- philidorDefenceVariations.ts:22 ha3
- londonSystemVariations.ts:87 ld4 (+cue)
- trompowskyAttackVariations.ts:34 tn3
- qgdVariations.ts:23 rg4, :32 vi4, :95 cs4
- slavDefenceVariations.ts:30 sq3
- grunfeldDefenceVariations.ts:23 gf3
- dutchDefenceVariations.ts:19 dh3
- benoniDefenceVariations.ts:31 bz3
- benkoGambitVariations.ts:19 mf3
- queensIndianDefenceVariations.ts:25 fd4, :45 qc4
- budapestGambitVariations.ts:22 ab3
- oldIndianDefenceVariations.ts:24 ot3, :32 ou3, :41 c4
- retiOpeningVariations.ts:44 ks3, :34 ad4 (+cue)
- kingsIndianAttackVariations.ts:57 fi3, :45 kb3, :69 kq3
- twoKnightsDefenceVariations.ts:22 tx2 (+cue)
- viennaVariations.ts:263 fd-10
- evansGambitVariations.ts:34 an4
- albinCountergambitVariations.ts:26 f7
    EVIDENCE: Grepped say and sayShort for percentages, game counts, '+N.N' evaluations and spelled-out scores. Examples:
- 'scores a huge 68% at club' (hu3)
- 'nearly 20,000 games' (a2p3)
- '(+1.0)' and the cue 'both wings; +1.0.' (ld4)
- '+3.5 says the engine' (cs4)
- '61% in practice' (tx2 cue)
- '~70% for White' (ad4 cue)
- 'sixty percent' (mf3)
- 'roughly two points of material' and 'all 20 moves' (fd-10)
- 'about half a pawn' (Old Indian c4)
- 'better than two pawns of advantage' (an4; Stockfish d18 con
    FIX: Replace each figure with its meaning in words ('scores well at club level', 'White keeps a clear edge'), and add a stats regex to the same voice gate.
- [orphan] Out-of-date curated-tab comments describe exclusions the code no longer makes (left over from the pre-auto-append build)
    WHERE: /home/user/wt-work/src/services/variationTabs.ts:
- :65-69 caro Classical 'omit it'
- :100-105 London '…c5-Benoni and …Bf5-mirror … not taught as tabs'
- :128-132 Réti 'Advance c4-d4 … folds there'
- :172-175 Dragadorf 'DEFERRED'
- :198-201 Sveshnikov 'Novosibirsk/…Rb8 fold'
- :208-211 Alapin '2...e6 and 2...g6 … deferred (G3), not shipped', contradicted by the next comment at :212-213
- :274-278 Scandinavian
- :287-290 Alekhine 'Five distinct tabs remain'
- :300-304 Petrov
- :312-318 Philidor
- :327-331 QGD Ragozin/Cambridge Springs
- :339-343 QGA Alekhine 4.Nc3
- :350-354 Slav Exchange/Quiet/Chebanenko
- :371-376 KID
- :382-386 Grünfeld Fianchetto/Neo/Taimanov
- :392-396 Benoni Classical/Czech
- :402-405 QID Kasparov
- :412-416 Old Indian Janowski/Tartakower/Ukrainian/Seirawan/Main-d5
- :421-426 Two Knights
- :457-460 Benko 'Three distinct White approaches remain'
- :466-468 Dutch 'Five distinct tabs'
- :475-477 Nimzo Classical 'folds in'
    EVIDENCE: In every case the real buildVariationTabs output contains a tab for the variation the comment says is folded, deferred or not shipped. For example, Benko shows 7 tabs where the comment says 3 remain, Dutch 7 where it says 5, and Alekhine 7 where it says 5.

The G3 rationale in the London, Philidor and Alapin comments is also stale: those lines were sanctioned into ENGINE_EXTENDED_LESSONS at /home/user/wt-work/src/data/lessons/lessonIntegrity.test.ts:104-121.

These comments are the leftover of t
    FIX: Per opening, either restore the exclusion (see the auto-append finding) or delete the comment. This is the 'orphaned code from old builds' in this surface; this agent is read-only and did not remove it.
- [minor] Short cues name a different move than the ply they are spoken on (293 of 1,287)
    WHERE: /home/user/wt-work/src/services/masterclassWalkthroughAdapter.ts:140 (sayShort becomes shortIdea on the beat's terminal node); spoken at /home/user/wt-work/src/hooks/useTeachWalkthrough.ts:1575 and :1599 (brief register). Examples in /home/user/wt-work/src/data/lessons/: italianGameVariations.ts t6, e2
    EVIDENCE: For every tab beat, tokenized sayShort and compared it with the beat's moves:
- 955 name the final move.
- 39 name no move.
- 293 name only an earlier move of the beat, yet are attached to and spoken on the final ply.

Examples:
- italian [Two Knights] t6: last move Bd6, cue 'Nxe6 fxe6 Rxe6 — level, but White presses.'
- italian [Evans Gambit] e2: last move Bc5, cue 'Bxb4 c3 — kick the bishop, prepare d4.'
    FIX: Re-author the 293 cues to the beat's final move, or attach each cue to the ply it names. Gate that a cue naming a move names the final ply's move.
- [minor] Minor naming that disagrees with the DB
    WHERE: /home/user/wt-work/src/data/repertoire.json:1090 'Tartakower/Breyer Variation', :1394 'Hanham Variation', :1409 'Antoshin Variation'; /home/user/wt-work/src/data/lessons/philidorDefenceVariations.ts:20 ha1 (+cue 'the solid Hanham wall'), :51 a1 (+cue 'the small-centre Antoshin')
    EVIDENCE: In openings-lichess.json:
- 'Caro-Kann Defense: Breyer Variation' is 2.d3; the Tartakower tab plays 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Nxf6+ exf6.
- 'Philidor Defense: Hanham Variation' is 3…Nd7. The [Hanham] tab plays …Nf6 first, then …Nbd7, which is DB 'Lion Variation'.
- There is no Philidor 'Antoshin' entry. The only Antoshin is 'Dutch Defense: Hort-Antoshin System'. The tab's line is DB 'Philidor Defense: Exchange Variation', the same as [Exchange].
    FIX: Use the DB names (Tartakower Variation; Lion Variation) and either rename [Antoshin] or merge it into [Exchange].
- [minor] Smaller board-truth slips
    WHERE: /home/user/wt-work/src/data/lessons/kingsIndianDefenceVariations.ts:55 fi4; /home/user/wt-work/src/data/lessons/sicilianDragonVariations.ts:102 f4 (cue)
    EVIDENCE: - fi4 '…Nc5! — a powerful outpost … immune to pawns': b2-b4 (or a3 then b4) can attack c5; b2-b4 is legal on the final board.
- Levenfish f4 cue 'f4 — White threatens the e5 fork': e5 would hit only the f6 knight and the d6 pawn, and …dxe5 answers it. This cue is in narrationFactCheck BASELINE_VIOLATIONS (:325).
    FIX: Reword: 'a strong post that only b2-b4 can challenge'; 'f4 prepares e5 to hit the f6-knight'.

## audit:Openings — middlegame plans:A (23)
coverage: Checked all 578 plans in /home/user/wt-work/src/data/middlegame-plans.json (read-only; scripts lived in the scratchpad). Legality: every criticalPositionFen loads in chess.js, every playableLines[0] replays with 0 illegal moves, annotations/learnCues/arrows/highlights all match the move count, and side-to-move is coherent. playableLines[0].fen equals criticalPositionFen except in 7 plans: the 6 Ru
- [false-teaching] 11 plan lines end lost for the student while the closing narration calls them equal/winning (all allowlisted)
    WHERE: src/data/middlegame-plans.json: mp-proericqgd-minority-counter (L62158, annotations[5]), mp-proericbudapest-e5knight (L62259, annotations[5]), mp-proamanreti-endgame (L69983, last annotation), mp-pro-caruana-ruy-lopez-endgame (L65903, last annotation), mp-proericfrench-endgame, mp-proericclosedsic-endgame, mp-procarlsen-french-qbreak, mp-proericstafford-main-hstorm, mp-carlsen-caro-c5, mp-carlsen-modern-c5, mp-procarlsen-nimzo-qside; allowlisted in src/data/grounding/groundingPlans.baseline.json
    EVIDENCE: Replayed each playableLines[0] with chess.js and ran Stockfish (node_modules/stockfish/scripts/cli.js, depth 16) on the terminal, student POV: QGD minority-counter -5.87 (terminal rnbqr1k1/pp4p1/2pb3p/5p2/3Pp2B/2N1P1N1/PPQ2PPP/R3K2R w: after the student's last move ...f5 the d8 queen is attacked by Bh4, chess.js attackers(d8,'w')=[h4], engine best h4d8) while annotations[5] says '...f5! ... the static Carlsbad becomes a dynamic attacking position'; Budapest e5knight -5.04 (before ...d6 the b4 bi
    FIX: Re-derive each line from an engine-screened continuation of the source game (or delete the plan), then delete its baseline entry; the closing annotation must not state a verdict the engine contradicts.
- [false-teaching] Narration names pieces/pawns that are not on the board when it is spoken
    WHERE: src/data/middlegame-plans.json: mp-nimzoindian-main (L12205) annotations[1],[2]; mp-nimzoindian-kasparov (L11876) annotations[2]; mp-semislav-stoltz (L79310) annotations[5]; mp-catalanopening-main (L4001) annotations[6],[11]; mp-carokann-main-endgame (L52013) annotations[3]; mp-qga-smyslov (L56492) annotations[7]; mp-petrovdefence-steinitz (L56728) annotations[5]+learnCues[5]; mp-antidutch-staunton-piece-activity (L76772) annotations[4]+learnCues[4]; mp-progothamchess-closedsic-g6-nd5 (L50114) annotations[3]; mp-progothamchess-mb-declines-na4 (L47890) annotations[0]; mp-antilondon-black-trade-and-equalise (L77148) annotations[1]; mp-frenchdefence-winawer (L8425) annotations[3]; mp-proamanrossolimo-endgame (L69479) overview
    EVIDENCE: Board at the frame before/after each move via chess.js: Nimzo main '...Ba6 spears the c4-pawn ... where the doubled pawns ache' / 'Qa4 props up the loose c4-pawn' - c4 holds the WHITE QUEEN and White's pawns are a3 b2 d4 e2 f2 g2 h2 (nothing doubled; Ba6 attacks the queen); Nimzo Kasparov 'the doubled c-pawns remain' - White pawns e4 c3 g3 a2 f2 h2; Semi-Slav Stoltz 'bxc3 - doubled c-pawns' - after bxc3 White's only c-pawn is c3; Catalan '...O-O - the extra c4-pawn still defended' / 'Na3 - heads
    FIX: Rewrite each sentence to the actual board (e.g. Nimzo '...Ba6 hits the c4 queen', Petrov '...Qb2 invades', anti-London '...Nxe5 removes the London bishop') and add hyphenated-square / 'X on sq' / doubled / passed checks at the spoken frame to narrationFactCheck for all plans.
- [false-teaching] Annotations narrate the wrong side or a different move than the one played
    WHERE: src/data/middlegame-plans.json: mp-proericstafford-nc3-openh (L58137) annotations[2]+learnCues[2]; mp-pronaroRoss-g6-endgame (L40521) annotations[5]+learnCues[5]; mp-pronarocaro-advance-bf5-endgame (L41741) annotations[7]+learnCues[7]; mp-ruylopez-open-endgame (L25166) annotations[19]+learnCues[19]; mp-progothamchess-caro-panov-endgame (L43771) annotations[3]+learnCues[3]
    EVIDENCE: chess.js verbose moves: Stafford moves[2] O-O-O is WHITE (king e1->c1) but text says 'Black castles long ... the a8-rook is now ready to follow'; Rossolimo g6-endgame moves[5] Rac1 is WHITE but text says '...Rac1 - Black's rook joins the c-file battery'; Caro bf5-endgame moves[7] Nc1 is WHITE's Nb3-c1 retreat but text says '...Nc1! KEY SQUARE c1 ... raiding White's back rank'; Ruy Open endgame moves[19] is Black's O-O but the text is 'Nbd2 - the knight reroutes to b3' (moves[18] Nbd2 has an empt
    FIX: Re-align/re-author these annotation and cue entries to the move actually played; add a gate that annotation[i]'s leading SAN equals moves[i] (incl. +/#) and that 'White/Black plays' or a leading '...' matches the mover.
- [false-teaching] Pro Alapin '-endgame' plans: queens-on positions narrated as rook/minor endings, with impossible threats
    WHERE: src/data/middlegame-plans.json: mp-pronaroAlapin-spinee6-endgame (L19049), mp-pronaroAlapin-nf6main-endgame (L18517), mp-pronaroAlapin-spined6-endgame (L18783), mp-pronaroAlapin-nc6-endgame (L18245), mp-pronaroAlapin-e6french-endgame (L17707)
    EVIDENCE: chess.js: both queens are on the board at the critical FEN and at every frame of each 6-ply line. Titles/overviews claim 'R+B+N+P(+P) endgame/conversion' (spinee6, spined6) and 'R+B+N endgame with the queenside passer (a6)' (nf6main). spinee6 overview 'The bishop pair + ... the c-pawn + e-pawn duo': White has one bishop (b2) vs Black's two (a4,h6) and White's pawns are a2 d5 f2 g2 h3. nf6main: a6 is not passed (Black pawn on a7); annotations[5] 'Bg5! comes next attacking the queen on d7' (from g
    FIX: Extend each line to the actual ending in the source game or drop the 'endgame' framing (and the -endgame suffix); rewrite the false threats and material descriptions.
- [false-teaching] 'Bishop pair' claims where no side holds the pair
    WHERE: src/data/middlegame-plans.json: mp-antitrompowsky-black-queenside-expand (L77393) annotations[1],[6],[7]; mp-evansgambit-endgame annotations[9]; mp-pronaroAlapin-d5open-endgame annotations[4]; mp-pronaroAlapin-spinee6-endgame overview; mp-schliemanndefence-main annotations[3]; mp-siciliansveshnikov-main annotations[7]; mp-evansgambit-declined annotations[7]; mp-fourknightsgame-main (L6678) annotations[7]+overview; mp-fourknightsgame-rubinstein (L6814) overview; mp-procarlsen-queenspawn-battery annotations[0]; mp-semislav-meran annotations[7]; mp-budapestgambit-adler annotations[7]; mp-trompowskyattack-raptor annotations[7]+overview; mp-grunfelddefence-russian annotations[5]; mp-retiopening-main annotations[13]; mp-procarlsen-ruy-knighttour intro+strategicThemes[0]
    EVIDENCE: Bishop counts from chess.js at the frame spoken: anti-Trompowsky - after ...Qxd6 NEITHER side has a bishop, yet 'the bishop pair now yours', 'your bishop pair', 'with the two bishops'; Evans endgame and Alapin d5open endgame: one bishop each; all others: 2 vs 2 at every frame of the line (e.g. Sveshnikov 'Black has ... the bishop pair' with White Bg5,Bf1 / Black Bc8,Be7). Carlsen queen's-pawn 'Black trades on c3 ... handing over the bishop pair' - the capture is ...Nxc3 and Black keeps Bc8,Bb4. 
    FIX: Rewrite or remove; add a per-frame bishop-count check for every plan (proRepPlanAccuracy covers pro plans only and accepts any frame).
- [broken] 417 of 425 authored playable-line intros are plain strings and are never spoken or shown
    WHERE: src/data/middlegame-plans.json playableLines[0].intro (417 plans, e.g. mp-alekhinedefence-scandtrans, mp-slavdefence-main); src/types/index.ts:472; src/components/Openings/PlayableLinePlayer.tsx:241,262,280,294,331; src/services/dataLoader.ts:788-799
    EVIDENCE: node census of playableLines[0].intro: string 417, object {say,sayShort,arrows,highlights} 8, absent 153. PlayableLinePlayer reads line.intro?.say / ?.arrows / ?.highlights; on a string these are undefined, so the intro beat is skipped (331 'if (!introSay)'), never prefetched (294) and never displayed (280). seedCuratedTable's mapper does not normalize intro and no other code reads plan intros.
    FIX: Convert the 417 strings to {say, sayShort} objects (or delete them) and make the shape impossible to get wrong (reject string intros in a gate / at load).
- [broken] 16 '-endgame' plans never render on their opening page
    WHERE: src/components/Openings/OpeningDetailPage.tsx:2207-2212 (EndgamePlansSection filterPlanIds={subjectPlanIds}); resolvers e.g. src/services/benkoGambitMasterclassTabs.ts:3-13, src/services/nimzoIndianMasterclassTabs.ts:3-17; plans mp-benkogambit-endgame, mp-kings-gambit-endgame, mp-evansgambit-endgame, mp-budapestgambit-endgame, mp-albincountergambit-endgame, mp-twoknightsdefence-main-endgame, mp-pronaroKID-saemisch-endgame, mp-petrovdefence-main-endgame, mp-oldindiandefence-main-endgame, mp-semislav-main-endgame, mp-queensindian-main-endgame, mp-qga-main-endgame, mp-nimzoindian-main-endgame, mp-prosamayItalian-endgame, mp-prosamaySicilianBlack-endgame, mp-prosamayOpenSicilian-endgame
    EVIDENCE: Ran OpeningDetailPage's exact resolver chain (84 get*TabPlanIds + the generic fallback, via tsx) for every opening and tab. EndgamePlansSection filters endgame plans by the same subjectPlanIds list; these resolvers list only the middlegame id per tab (Benko main -> ['mp-benkogambit-main'], Nimzo main -> ['mp-nimzoindian-main']), so the endgame list is always empty. The Caro/French/QGD/Ruy/Slav/Carlsen resolvers do include their -endgame id (caroKannMasterclassTabs.ts:6). These 16 are only reacha
    FIX: Add each -endgame id to its opening's tab list (as caroKannMasterclassTabs does), or make EndgamePlansSection resolve endgame plans independently of the middlegame id list.
- [broken] Gate C: 48 middlegame plans cannot be reached from the end of the Watch line on any tab that shows them
    WHERE: src/data/middlegame-plans.json: mp-alekhinedefence-scandtrans, mp-birdsopening-nimzo, mp-carokann-advance, mp-carokann-exchange, mp-carokann-panov, mp-carokann-two-knights, mp-dutchdefence-classical, mp-evansgambit-main, mp-fourknightsgame-glek, mp-frenchdefence-advance, mp-frenchdefence-burn, mp-frenchdefence-tarrasch, mp-grunfelddefence-main, mp-italiangame-modern, mp-kings-gambit-open-f-file, mp-londonsystem-main, mp-pircdefence-150, mp-pircdefence-austrian-e5, mp-pircdefence-fianchetto, mp-progothamchess-french-defense-rubinstein, mp-progothamchess-qgd-classical, mp-queensgambit-slav, mp-queensindian-main, mp-retiopening-antislav, mp-ruylopez-f4, mp-scandinaviandefence-icelandic, mp-scandinaviandefence-main, mp-scotchgame-gambit, mp-scotchgame-kasparov, mp-scotchgame-steinitz, mp-siciliansveshnikov-kalashnikov, mp-trompowskyattack-e6, mp-viennagame-frankenstein-dracula, mp-viennagame-paulsen, mp-viennagame-vs-nc6, mp-pronaroNaj-english-race, mp-pronaroRuy-d3-positional, mp-pronaroKID-fianchetto-simplify, mp-progothamchess-caro-classical-bd6, mp-progothamchess-tromp-c5-gambit, mp-progothamchess-london-standard-ne5, mp-progothamchess-caroadv-h6-g4space, mp-progothamchess-scand-qa5-bxc3, mp-progothamchess-french-advance-counter, mp-progothamchess-pirc-classical-e5, mp-progothamchess-pirc-150-b5, mp-fourknightsgame-glek-f4trap, mp-gleksystem-f4trap
    EVIDENCE: For each plan x each tab that displays it (real resolver chain), replayed that tab's Watch LessonScript spine (pgn when no lesson) with chess.js and tested criticalPositionFen: terminus / on-line / reachable from the terminus (IDA* <=4 plies) / provably unreachable. 'Unreachable' is a proof from necessary conditions: the plan FEN keeps castling rights the Watch terminus already lost, has more pieces or pawns than the terminus, or has a pawn structure the terminus pawns cannot reach (pawn matchin
    FIX: Re-anchor each plan at its tab's Watch terminus and re-derive the playable line from there (or extend the Watch spine to reach the anchor); remove the extra tab mappings; align the 13 lesson spines with their pgn.
- [broken] Plans anchored at a position from a different variation than the tab they teach (unrelated FEN)
    WHERE: src/data/middlegame-plans.json: mp-alekhinedefence-scandtrans (L1057), mp-scotchgame-steinitz (L27840), mp-pronaroNaj-english-race (L34826), mp-progothamchess-qgd-classical (L16327), mp-siciliansveshnikov-kalashnikov (L31108), mp-fourknightsgame-main (L6678), mp-italiangame-modern (L9279)
    EVIDENCE: Alekhine 'Scandinavian Transposition' tab plan is byte-identical (criticalPositionFen + moves) to pro plan mp-pronaroAlekhine-modern-development ('Alekhine Modern - Bf5 + Nd7'); its FEN has ...Bf5/...c6/...Nd5 vs Be2/O-O while the tab line is ...Nd7 Nxd7 Bxd7 c4 Nf6 Nc3 e6 Be3 Bd6. Scotch Steinitz tab teaches 5.Nb5 Bb4+ 6.c3; the plan FEN is 5.Nc3 Bb4 6.Be2 (c-pawn on c2). Najdorf 'Be3 English Attack' tab plays ...e5, f3, Qd2; the plan FEN has Black ...e6/...c6 and White Be2, Rd1, Rf1, Kh1, no f
    FIX: Re-anchor each plan on its own tab's line terminus with a line derived from that position, or move the plan to the tab whose line it continues; delete the copied Alekhine plan.
- [rule-violation] Gate C: 60 plans anchored mid-way through their tab's Watch line (49 then diverge from it, 11 stop before it ends); 33 more start several plies after the Watch ends
    WHERE: src/data/middlegame-plans.json - diverging: mp-alekhinedefence-exchange, mp-alekhinedefence-main, mp-benkogambit-halfaccepted, mp-benkogambit-main, mp-birdsopening-stonewall, mp-carokann-main, mp-dutchdefence-main (L4919), mp-fourknightsgame-main, mp-fourknightsgame-rubinstein, mp-frenchdefence-classical, mp-frenchdefence-fortknox, mp-frenchdefence-mccutcheon, mp-frenchdefence-milnerbarry, mp-grunfelddefence-main, mp-italiangame-evans, mp-nimzoindian-f3, mp-nimzoindian-huebner, mp-nimzoindian-leningrad, mp-nimzoindian-main, mp-pircdefence-austrian, mp-progothamchess-english-botvinnik-main, mp-progothamchess-english-flank-attack, mp-progothamchess-ponziani-d4-thrust, mp-progothamchess-vienna-gambit-main, mp-pronaroNajdorf-opposite-castle-race, mp-qgd-main, mp-scandinaviandefence-gubinsky, mp-schliemanndefence-main, mp-scotchgame-fourknights, mp-scotchgame-mieses, mp-siciliandragon-antibg5, mp-siciliandragon-classical, mp-siciliansveshnikov-antisvesh, mp-slavdefence-main, mp-trompowskyattack-raptor, mp-viennagame-gambit, mp-pronaroKID-classical-kingside, mp-pronaroNaj-adams-defense, mp-pronaroNaj-english-bxh6, mp-pronaroKIA-vs-c6-attack, mp-pronaroKIA-vs-b6-expand, mp-pronaroRoss-c3-spanish, mp-pronaroRoss-bc4-italian, mp-pronarocaro-advance-bf5-piece-storm, mp-progothamchess-london-e6-classical, mp-progothamchess-caroadv-qxd4-punish, mp-pro-caruana-najdorf-outpost, mp-gleksystem-d5-outpost, mp-gleksystem-traditional-f4; stopping short: mp-budapestgambit-main, mp-dutchdefence-ilyinzhenevsky, mp-evansgambit-compromised, mp-evansgambit-declined, mp-evansgambit-lasker, mp-italiangame-moller, mp-kings-gambit-bishop-pair-attack, mp-ruylopez-berlin, mp-ruylopez-exchange, mp-ruylopez-marshall, mp-siciliansveshnikov-main; far past the Watch end: 33 ids incl. mp-progothamchess-tromp-g6-doubled, mp-progothamchess-french-exchange-develop, mp-pronarocaro-classical-kingside-storm, mp-siciliandragon-main, mp-schliemanndefence-schonemann, mp-schliemanndefence-exf5
    EVIDENCE: Same per-tab replay: e.g. mp-dutchdefence-main sits at ply 14 of the 36-ply main Watch; the Watch continues d5 Na6 Rb1 Bd7 while the plan plays Re1 a5 h3 e5 (the student sees two different continuations from one position); mp-budapestgambit-main is anchored at ply 4 (move 3) and its line ends 12 plies before the Watch does; mp-qgd-main ply 8/36 (Watch Nbd7 vs plan h6); mp-slavdefence-main ply 8/23 (Watch e3 vs plan Ne5); mp-fourknightsgame-main ply 6/22 (Watch Bg5 vs plan Ne2). The 33 'far past'
    FIX: Re-anchor at the Watch terminus (or let the plan line replay the Watch tail to its end); lengthen short Watch lessons to the pgn terminus.
- [broken] Ruy '-endgame' plans replay the opening from move 1 and stop at the critical FEN - no endgame is ever played
    WHERE: src/data/middlegame-plans.json: mp-ruylopez-breyer-endgame (L22914), mp-ruylopez-chigorin-endgame, mp-ruylopez-zaitsev-endgame, mp-ruylopez-open-endgame (L25166), mp-ruylopez-exchange-endgame
    EVIDENCE: playableLines[0].fen is the initial position (not criticalPositionFen); replaying the moves ends exactly on criticalPositionFen (frame 24/28/24/20/13 of 24/28/24/20/13). Material at that frame is 31 v 31 with queens (Breyer, Chigorin, Open, Zaitsev) or 28 v 28 with queens (Exchange); only 3/24, 4/28, 3/24, 4/20 and 7/13 annotations are non-empty. Watch/Learn/Practice therefore drill 1.e4 ... to move 7-15, while Play starts at the critical FEN. The endgame-layer rule requires the playable line to
    FIX: Author each plan's line from the critical FEN into the actual ending (or reclassify as middlegame plans) and set playableLines[0].fen to the critical FEN.
- [broken] Plan gates cannot catch these defects
    WHERE: src/data/middlegamePlanContinuity.test.ts:41-70; src/data/middlegamePlanThemes.test.ts:39-43,47,97; src/services/middlegamePlanner.test.ts:307; src/data/proRepPlanAccuracy.test.ts:53; src/data/groundingPlans.test.ts:23; src/data/narrationFactCheck.test.ts
    EVIDENCE: Continuity test compares only the pawn set, against every ply of every line including ply 0, ignoring pieces, castling and which tab shows the plan; allEntries loads repertoire+pro+anti but not gambits.json (4 gambit plans unchecked) and skips -endgame plans: all 48 provably unreachable plans pass. Theme test builds colorMap with Array.isArray(proRaw) but pro-repertoires.json is {players, openings}, so the 317 pro plans (and the 23 anti / 8 gambit plans, never loaded) count opponent moves as stu
    FIX: Make the wrong anchor impossible: per displayed tab assert criticalPositionFen == Watch terminus or a proven continuation, include gambits.json; build colorMap from pro.openings + anti + gambits and fail on zero goal squares; run lead-eye on all plans; check claims at the spoken frame; iterate plans
- [rule-violation] Plan titles promise a move the line never plays
    WHERE: src/data/middlegame-plans.json: mp-siciliandragon-main (L29110) title+line title; mp-siciliannajdorf-6g3 title+line title; mp-progothamchess-scand-qa5-bxc3; mp-progothamchess-mb-declines-na4; mp-progothamchess-london-standard-ne5; mp-siciliansveshnikov-main; mp-fourknightsgame-glek; mp-gleksystem-d5-outpost; mp-queensindian-miles; mp-prosamayscandi-c5break; mp-pronaroNaj-adams-counter; mp-scotchgame-gambit line title; mp-pronaroKID-petrosian-central; mp-pronaroKID-makogonov-nc5; mp-pronaroKID-antikidnf3-rooklift; mp-pronarocaro-advance-knight-reroute; mp-pronarocaro-kia-b5-expansion; mp-pronaroAlapin-nc6-mg; mp-progothamchess-mb-advance-battery; mp-progothamchess-kia-sicilian-reroute; mp-pro-hikaru-nimzolarsen-d5; mp-fourknightsgame-scotchfk line title; mp-prosamayfrenchw-minority, mp-proamanross-g6, mp-proamanross-e6 line titles
    EVIDENCE: Compared SAN/pawn-square tokens in title and line title with the plan's moves and the opening moves before the critical FEN: Dragon 'the ...Rxc3 Exchange Sacrifice' / '...Rxc3 shatters the king's shield' - line fxg4 Bxg4 Rdg1 e5; Najdorf 6.g3 '...Nc5 hits e4, ...b5 opens the queenside' - line a5 b6 axb6 Bb7; Scandinavian '...Bxc3 Doubling + ...Qb6 Pressure' - line titled 'Keep the Bishop' (h3 Bh5 g4 Bg6 Ne5 Rad8 Nxg6 hxg6); Milner-Barry 'Na4 Harasses the Queen' - no Na4; London 'the Ne5 Outpost'
    FIX: Retitle to what the line shows or extend the line to play the named move; add a title/line-title check to middlegamePlanThemes.test.ts.
- [rule-violation] 'Student move lands on a declared break/manoeuvre square' is met only by coincidence
    WHERE: src/data/middlegame-plans.json: mp-kings-gambit-open-f-file (L10190), mp-ruylopez-berlin (L22268), mp-ruylopez-berlin-endgame, mp-procarlsen-ruy-endgame (L65459)
    EVIDENCE: Re-ran the gate's goal-square logic with the correct student side for all 578 plans (only mp-ruylopez-exchange-endgame fails, already baselined), then required a student pawn on a pawnBreaks square or a student piece on a pieceManeuvers square: King's Gambit (White) declares h4, Bc1-e3/d2 and Nb1-c3-d5; the only hit is the pawn move c2-c3 landing on 'c3' from the knight route - White never plays h4, Be3/Bd2 or Nc3/Nd5. Ruy Berlin (White plan) declares g2-g4 / f2-f4-f5 but its pieceManeuvers are 
    FIX: Require a student pawn move to a declared break square or a student piece of the named type to a declared manoeuvre square; make the Berlin plan declare White's manoeuvres; fix the COND regex.
- [rule-violation] 'Open'/'half-open' file claims on files that hold pawns of both colours
    WHERE: src/data/middlegame-plans.json: mp-englishopening-main annotations[11]; mp-kings-gambit-open-f-file annotations[5],[7]+learnCues[7] and title 'Open f-file pressure after fxe5'; mp-siciliannajdorf-main annotations[7]; mp-qgd-main-endgame annotations[5]; mp-scotchgambit-endgame annotations[8]; mp-pro-caruana-ruy-lopez-clamp annotations[5]; mp-pro-caruana-italian-endgame annotations[0]; mp-carlsen-caro-endgame annotations[0]; mp-carlsen-opensic-classical annotations[0]
    EVIDENCE: chess.js pawns on the named file before and after each move: English b5/b7 ('half-open b-file'); King's Gambit f4(White)/f7 after gxf4 ('rips the f-file open', 'White owns the open f-file'), and the critical FEN is the accepted gambit with Black's pawn on f4 - no fxe5 happened; Najdorf b2/b4; QGD a2/a7; Scotch gambit b2/b7; Caruana Ruy b2/b4; Caruana Italian c3/c6; Carlsen Caro a2/a7; Carlsen open Sicilian e4/e6 ('the open e-file, backing the e4-pawn').
    FIX: Name the file state correctly (closed / semi-open for one side) or rewrite; fix the King's Gambit title.
- [rule-violation] Pins claimed where there is no pin
    WHERE: src/data/middlegame-plans.json: mp-alekhinedefence-exchange annotations[1]; mp-scandinaviandefence-icelandic annotations[8]; mp-fourknightsgame-main annotations[0]; mp-siciliandragon-antibg5 annotations[6]; mp-pronarocaro-exchange-endgame annotations[2]
    EVIDENCE: Line geometry after the move (chess.js): ...Bg4 -> Nf3 with White's own Be2 directly behind (Alekhine exchange, Icelandic); Bb5 -> Nc6 with Black's d7 pawn before Ke8; ...Qa5 -> Nc3 -> d2, e1 both empty, White king castled on c1 ('pinning the c3-knight and aiming at the white king'); Bg5 -> Nf6 -> e7, d8 empty ('pinning the knight on f6').
    FIX: Rewrite to what the piece actually does (e.g. 'pressures f3, which guards d4').
- [rule-violation] Allowlisted narrationFactCheck plan violations are still shipping, and one entry is a mislabeled checker false positive
    WHERE: src/data/narrationFactCheck.test.ts:335-338; src/data/middlegame-plans.json mp-frenchdefence-winawer annotations[4], mp-kings-gambit-open-f-file annotations[4], mp-viennagame-vs-nc6 (L32895) annotations[6], mp-italiangame-twoknights annotations[0]
    EVIDENCE: Winawer 'Bd3 - White develops and eyes h7': d3-e4-f5 is blocked by Black's knight on f5 and h7 is empty; King's Gambit '...Bh3 forks the rook on f1': Bh3's only target is Rf1 (g2 empty); Vienna 'Nd5! ... forks the Nf6 AND threatens Nxc7 winning the rook': c7 is a pawn defended by Qd8, so Nxc7 Qxc7 wins nothing; Italian two-knights '...Qa5 - the queen flees the c3-fork' is TRUE (Nc3 attacked d5 and e4) yet sits in the 'claims that don't verify' block.
    FIX: Rewrite the three false lines and drop them from BASELINE_VIOLATIONS; move the Italian entry to a documented checker-false-positive list.
- [false-teaching] Pro plan arrows drawn through pieces back false sight claims; some move arrows start on the wrong square
    WHERE: src/data/middlegame-plans.json: mp-proericlondon-ne5-battery (L58411) annotations[1],[3]; mp-pronaroJob-a6c5-bd3 (L36261) annotations[4]; mp-pronaroRoss-bd7-conversion (L34717) annotations[3]; mp-pronaroRoss-nc6-maroczy annotations[0]; wrong-origin arrows: mp-proamansiciliankan-maroczy arrows[6], mp-proamansiciliankan-alapin arrows[6], mp-proamancaro-advance arrows[5], mp-proericlondon-h4-storm arrows[1]
    EVIDENCE: Applied middlegamePlanner.test.ts's sees() to every plan arrow on the board after the move: London 'Bd3 - now it and the e5-knight both point at the black king's shelter on h7' - arrow d3->h7 blocked by Black's g6 pawn and Ne5 does not reach h7; 'Qf3 ... eyeing f7' - f3->f7 blocked by White's own Bf4; Jobava 'Bxe4 ... hitting b7' - e4->b7 blocked by Black's Nc6; Rossolimo 'Rc3 ... one move from g3 or h3' - the third rank is blocked by White's Nf3; 'Be3 - develops with a threat - c5 is attacked' 
    FIX: Correct the arrows and the claims they illustrate; run the lead-the-eye gate on all plans.
- [orphan] Plans that never render on any tab, and a plan-id fallback that can never match
    WHERE: src/data/middlegame-plans.json: mp-italiangame-main, mp-bird-classical-attack, mp-bird-stonewall-formation, mp-kingsindiandefence-mardelplata, mp-twoknightsdefence-d3main, mp-semislav-main-c5, mp-progothamchess-trompowsky-knight-flank, mp-progothamchess-trompowsky-main-system, mp-progothamchess-vienna-paulsen-attack, mp-pronaroAlekhine-modern-development, mp-pronaroFantasyCaro-bishop-pair-attack, mp-pronaroJobava-central-queen-attack, mp-pronaroRossolimo-bishop-reroute, mp-pronaroRuyLopez-d4-break; src/components/Openings/OpeningDetailPage.tsx:1712; src/services/italianMasterclassTabs.ts:13
    EVIDENCE: Tab map from the real resolver chain: none of these 14 ids is shown on any tab (12 have no code reference at all; mp-italiangame-main is 'retained for a future Giuoco Piano tab'; the Bird ids appear only in mastersCoverage.test.ts). The generic fallback [`${planPrefix}-${tabKey}`] builds ids from the lowercased, 20-char-truncated tab label: 295 tab scopes resolve to non-existent ids and 201 of those contain spaces/dots/quotes so can never be a plan id, e.g. KID 'Classical Main' -> 'mp-kingsindia
    FIX: Wire the KID Classical Main, Two Knights 4.d3 and Semi-Slav plans through explicit resolver entries; delete the superseded/duplicate pro plans and the parked Italian/Bird/Trompowsky/Vienna ones; replace the string-built fallback with an explicit map.
- [orphan] Dead plan code from older builds: unused generator, unused service exports, unreachable fallback views
    WHERE: src/services/contentGenerationService.ts:111-136 (generateMiddlegamePlanAnalysis); src/services/middlegamePlanService.ts:14,21,28,35 (getPlanById, getAllPlans, storePlans, countPlans); src/components/Openings/OpeningDetailPage.tsx:1515-1537 (MiddlegamePlanStudy / MiddlegamePractice fallbacks) and stale comment at 2188; src/components/Openings/MiddlegamePlanStudy.tsx, MiddlegamePractice.tsx, MiddlegamePlanStudy.test.tsx
    EVIDENCE: grep: generateMiddlegamePlanAnalysis has zero callers (SidelineExplainer imports only generateSidelineExplanation); getPlanById/getAllPlans/storePlans/countPlans have 0 production references (only middlegamePlanService.test). The fallback views render only when activeMiddlegamePlan has no playable line, but the only writer of db.middlegamePlans is seedCuratedTable (dataLoader.ts:788) from middlegame-plans.json + gambit-plans.json and all 578 + 7 plans carry exactly one playable line, so the Play
    FIX: Delete generateMiddlegamePlanAnalysis, the four unused service exports, the two fallback branches + components + test, and the stale comment; if any is kept, normalize pawnBreaks/pieceManeuvers to the declared object types.
- [orphan] Throwaway authoring scripts that would overwrite current plans with superseded content
    WHERE: scripts/tmp-adams.mjs:47-55, scripts/tmp-dcl.mjs:47-55, scripts/tmp-fkr.mjs:49-58
    EVIDENCE: Not referenced by package.json, docs or other scripts; each rewrites a plan's playableLines in middlegame-plans.json (and model-games.json). tmp-adams would replace mp-siciliannajdorf-6g3's current line (a5 b6 axb6 Bb7) with e5 Nde2 Be7 Bg2 b5 Nd5 Nbd7 Nec3; tmp-dcl would cut mp-siciliandragon-classical's current 15-ply '...d5 Break' line back to an 8-ply line ending ...a6; tmp-fkr reproduces mp-fourknightsgame-rubinstein's current line (no-op).
    FIX: Delete the three tmp-*.mjs scripts.
- [orphan] Stale allowlist/baseline entries in the plan gates
    WHERE: src/data/middlegamePlanThemes.baseline.json (mp-nimzoindian-huebner#0, mp-scotchgame-gambit#0, mp-sicilianalapin-main#0); src/data/grounding/groundingPlans.baseline.json:2; src/data/middlegamePlanContinuity.baseline.json ('count': 94); src/data/grounding-items.json (no item for mp-gleksystem-traditional-f4)
    EVIDENCE: Re-ran the theme gate logic: those three lines now land a student move on a goal square and do not end on a promise (only mp-ruylopez-exchange-endgame#0 still offends), but the theme gate has no stale-entry test so the exemptions persist; groundingPlans baseline 'birds-opening :: Classical kingside attack with Bd3 + Qe2 :: LOSING' matches no current plan or cached item (Bird plans are now 'Bird Classical - the e5 trades and the e7 fork' etc.); the continuity baseline says count 94 but holds 1 id
    FIX: Delete the stale entries, add stale-entry tests to the theme and grounding gates, regenerate grounding-items.json.
- [rule-violation] Plan narration speaks engine numbers (V8)
    WHERE: src/data/middlegame-plans.json: e.g. mp-carokann-main overview ('-0.3') and annotations ('a third of a pawn'), mp-bird-classical-attack ('A fifth of a pawn'), mp-pircdefence-austrian-e5 annotations[7] ('Plus one point four for Black on the engine'), mp-semislav-meran annotations[7] ('~+1.5'), mp-progothamchess-english-flank-attack overview ('+1.1'); spoken overviews via src/components/Openings/OpeningDetailPage.tsx:1559,2160-2166
    EVIDENCE: Regex over annotations, learnCues, intros and overviews: 140 strings in 96 plans carry evals, fractions of a pawn or percentages; 85 overviews do, and the master-zone listen button speaks `${title}. ${overview}` for every plan of the opening.
    FIX: Replace the numbers with words per V8 ('Black is a little worse', 'White is clearly better').

## audit:Openings — pro repertoires (8 repertoire:B (33)
coverage: What I checked: all 82 pro openings in src/data/pro-repertoires.json, across 8 players (naroditsky, gothamchess, ericrosen, samayraina, carlsen, caruana, hikaru, aman), and every registered pro lesson (367 lessons, 1,706 beats, from getAllLessonScripts).

Checks with clean results:
- Legality: chess.js replayed every main PGN, variation PGN, trapLine, warningLine and lesson beat. All are legal.
- 
- [false-teaching] Najdorf main lesson calls 6.Bg5 'the English Attack' and teaches a pin that does not exist yet
    WHERE: src/data/lessons/proNaroditskyAllRemaining.ts:176-177 (beat bg5), :182 (beat e6); src/data/pro-repertoires.json:1061 (pro-naroditsky-najdorf overview)
    EVIDENCE: I replayed beat bg5 (e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5) with chess.js. Black's pawn is still on e7, so the g5-f6-e7-d8 diagonal is blocked and the f6 knight is not pinned. The beat still says 'The bishop pins your f6-knight against the queen', with sayShort 'Bg5 — the English Attack pin.' The pin only appears after ...e6, yet beat e6 presents that move as preparing to 'break the pin'. The lesson also calls 6.Bg5 'the English Attack', while this repertoire's own tab 'Be3 English Attack' pl
    FIX: Call 6.Bg5 the Bg5 main line. In beat bg5, say the bishop eyes the f6 knight. In beat e6, say ...e6 lets the pin appear and ...Be7 then blocks it. Correct the setup list in the overview.
- [false-teaching] Pins claimed through a blocking pawn (16 places)
    WHERE: Bg5 against Nf6 with the e7 pawn in place: proCarlsenSicilian.ts:26 (bg5), proAmanOpenSicilianVariations.ts:53 (bg5), proSamayRainaCaroWhite.ts:23 (nc3), proNaroditskyCaroKannVariations.ts:772 (panov-bg5). Bb5/Ba4 against Nc6 with the d7 pawn in place: proNaroditskyRossolimoVariations.ts:44 (nc6-open), proAmanRossolimo.ts:30 (bb5), proNaroditskyAllRemaining.ts:604 (sayShort 'Ba4 — keep the pin on c6.'), proCaruanaRuyLopezVariations.ts:18 (ba4), proCarlsenRuyLopez.ts:26 (morphy), proHikaruNimzoLarsen.ts:60 (bb5), src/data/pro-repertoires.json:720 (pro-gothamchess-anti-sicilian keyIdeas: 'It pins the c6-knight'). Bb4 with the d2/d7 pawn in place: proGothamchessEnglishVariations.ts:74 (open), proCarlsen1e5.ts:69 (bb4), proSamayRainaOpenE5Variations.ts:56 (nf6). Bg4 against Nf3 with the e2 pawn in place: proNaroditskyKIAVariations.ts:290 (c6-d3). A pin by a move Black cannot play: proNaroditskyCaroKannVariations.ts:765 (panov-nf6, '…Bg5 pin'). All lesson files are in src/data/lessons/.
    EVIDENCE: I replayed each beat's moves with chess.js and walked the line from the bishop through the 'pinned' piece. In every case the next square holds a pawn (e7, d7, d2 or e2), so nothing is pinned. In panov-nf6 no Black bishop can reach g5 at that move. The same beat calls d4 'White's IQP', but White's c4 pawn stands beside it. The Rossolimo beat also says the knight is pinned 'against the e5-square'. Caruana ba4 calls a4-e8 'the long diagonal'.
    FIX: Replace 'pin/pins' with what is true: eyes, pressures, or threatens to take on c6/f6. Claim a pin only after the blocking pawn has moved. Remove 'IQP' and 'long diagonal' from these beats.
- [false-teaching] Pins claimed where nothing stands behind the piece
    WHERE: src/data/lessons/proAmanSicilianKanVariations.ts:74 (bb4), proSamayRainaOpenSicilianVariations.ts:48 (bb4), proCarlsenNimzo.ts:37 (nc6), proCaruanaCaroKann.ts:29 (castled), proNaroditskyCaroKannVariations.ts:277 (ex-bg4, 'pins through to White's queen'), proCarlsenCaroKann.ts:42 (bf5, 'pins with …Bg4')
    EVIDENCE: I replayed each beat with chess.js. In the four Bb4 beats, the king that should sit behind the c3 knight has already castled, so the knight is attacked but not pinned. In ex-bg4 and bf5 the squares between g4 and the queen (f3 and e2) are empty, so the bishop attacks the queen directly. That is a threat, not a pin.
    FIX: Say the knight or the queen is attacked, and remove 'pin'.
- [false-teaching] A knight or pawn is said to attack a queen it cannot reach
    WHERE: src/data/lessons/proNaroditskyAlapinVariations.ts:88 (d5-e6-na3: 'routes the knight to b5 … attacking the queen on d5'); src/data/pro-repertoires.json:1027 (Alapin trap 'd5-Open cxd4 → Nb5 Outpost': 'attacking the queen on d5'), :949 ('wins tempi on the queen'); src/data/lessons/proEricRosenSicilianVariations.ts:86 (develop: 'Na3-Nb5 hitting the queen'); src/data/pro-repertoires.json:674 (Milner-Barry: '10.Nc3 with tempo on the queen'); src/data/lessons/proGothamchessMilnerBarryVariations.ts:90 (mg-nc3: 'hitting … the loose queen'); src/data/lessons/proNaroditskyCaroKannVariations.ts:174 (kia-qc7: 'any e5 push hits your queen')
    EVIDENCE: I checked attack sets on the replayed boards with chess.js. A knight on b5 covers a3, a7, c3, c7, d4 and d6, but not d5; the real threat is Nc7+. A knight on c3 covers a2, a4, b1, b5, d1, d5, e2 and e4, but not the queen on d4 in the Milner-Barry; the threat is Nb5. A pawn on e5 covers d6 and f6, but not c7.
    FIX: Teach the real threats. Nb5 eyes c7 (an Nc7+ fork) and d6. Nc3 prepares Nb5, which would hit the queen on d4. The queen on c7 eyes e5, so e5 needs support.
- [false-teaching] Doubled pawns that are not doubled
    WHERE: src/data/lessons/proCaruanaTaimanov.ts:27 (nxc6), proCarlsenRuyLopezVariations.ts:56 (oo), proAmanRossolimo.ts:45 (middlegame), proAmanRossolimoVariations.ts:38 (middlegame), proNaroditskyAllRemaining.ts:122 (central-piece), proNaroditskyAlapinVariations.ts:553 (e6sub-nxc3), proNaroditskyAlapinTrapLessons.ts:155
    EVIDENCE: I counted pawns per file on each replayed beat board. In every case only one pawn of that colour stands on the c-file; for example, after Taimanov nxc6 only c6 is left. So the 'doubled c-pawns' do not exist. proCarlsenRuyLopezVariations.ts:56 also calls the d5 pawn isolated while a pawn on c7 stands beside it.
    FIX: Delete the doubled-pawn and isolated-pawn clauses, or describe the structure that is actually on the board.
- [false-teaching] Bishop-pair claims where both sides have two bishops, or one each
    WHERE: src/data/lessons/proNaroditskyRossolimoVariations.ts:148, :154, :160, :178 (Bxd7+ Trade lesson); proSamayRainaSicilianBlack.ts:27 (bxc6); proHikaruPircModern.ts:29 (middlegame) and proHikaruPircModernVariations.ts:22 (mid) ('the two bishops give real winning chances'); proHikaruNimzoLarsen.ts:115; proNaroditskyAlapinVariations.ts:553; proNaroditskyAlapinTrapLessons.ts:155; proCarlsenScandinavian.ts:28 (bb7); src/data/pro-repertoires.json:555 (Ponziani '3...d5 Central Counter': 'the price is … the bishop pair')
    EVIDENCE: I counted bishops on each replayed board. After Bb5+ Bd7 Bxd7+ Qxd7, each side has 1 bishop, yet the lesson says 'You've simplified AND won the bishop pair'. Every other listed position has 2 bishops on each side. Example: the Ponziani 3...d5 line ends at FEN r1bqr1k1/p1p2ppp/2pb1n2/3p4/Q3P3/2PP4/PP1NBPPP/R1B1K2R b KQ - 4 9, where White and Black each have 2. In the Samay bxc6 line the trade was knight for knight.
    FIX: Remove the bishop-pair claims. For the Bxd7+ lines, say the light-squared bishops were traded.
- [false-teaching] Isolated pawns that are not isolated
    WHERE: src/data/lessons/proNaroditskyCaroKannVariations.ts:460 (fan-fxe4: 'the e4-pawn is isolated and on an open file'), :765 (panov-nf6: 'White's IQP'); proNaroditskyAlapinVariations.ts:521 (e6sub-be7: 'IQP middlegame'); proSamayRainaSicilianBlackVariations.ts:43 (bg4 and plan: 'isolated d-pawn')
    EVIDENCE: I checked the replayed boards. In fan-fxe4, White's d4 pawn stands beside e4 and Black's e7 pawn sits on the e-file, so the pawn is neither isolated nor on an open file. In the Panov beat, c4 stands beside d4. In the Alapin beat, the e5 pawn is next to d4. In the Samay beat, the c3 pawn is next to d4.
    FIX: Remove 'isolated' and 'IQP' wherever a pawn stands on an adjacent file.
- [false-teaching] Tab overviews describe moves their own line never plays
    WHERE: src/data/pro-repertoires.json:374 (pro-gothamchess-caro-kann 'Fantasy Variation 3.f3'), :545 (pro-gothamchess-ponziani 'Main Line 3...Nf6 4.d4'), :113 (pro-gothamchess-italian 'Slow Italian d3')
    EVIDENCE: None of the 285 pro variations has an overview field, so each variation's explanation is the tab Overview (OpeningDetailPage.tsx:1611-1612), read aloud through useProseReader.ts:66 speakReadAloud. The three texts contradict their own PGNs:
- :374 says '…e6 (don't take on e4!) … …Bb4 … …b6 + …Bb7'. The PGN is 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bd6', which takes on e4 at once and never plays those moves.
- :545 narrates 4…Nxe4 5.d5 Bc5 6.dxc6 Bxf2+ 7.Ke2 bxc6. The PGN is '… c
    FIX: Rewrite each explanation from its own PGN, replaying the line and narrating the moves that are played.
- [false-teaching] Other false board claims: diagonals, files, legal replies, missing pieces, castling
    WHERE: src/data/lessons/proHikaruNimzoLarsen.ts:100 (open); proEricRosenLondon.ts:73 (castle); proNaroditskyJobavaVariations.ts:48 (e6-bf4); proGothamchessTrompowsky.ts:52 (h6-bh4); proNaroditskyAlapinVariations.ts:111, :119, :127, :212 (e6-re1); proNaroditskyCaroKann.ts:148; proEricRosenStafford.ts:109 (qf6); proAmanCaroKann.ts:45 and proAmanCaroKannVariations.ts:38 (bg6); proNaroditskyKIDTrapLessons.ts (mdp-cash, just above :81); src/data/pro-repertoires.json:726 (pro-gothamchess-anti-sicilian traps[0])
    EVIDENCE: Each claim is false on the replayed board (chess.js):
- Nimzo-Larsen :100: the b2 bishop has an 'unobstructed diagonal', but White's own d4 pawn blocks b2-h8.
- London :73: Bf4 'rakes the long dark diagonal', but f4 is on h2-b8 and the knight on e5 blocks it.
- Jobava :48: 'Unlike the regular London (Bd2/Be3) … controlling the long diagonal'. The regular London bishop goes to f4, and f4 is not on a long diagonal.
- Trompowsky :52: calls h4-d8 'the long diagonal'.
- Alapin :127: says Kf8 is 'the 
    FIX: Correct each sentence to what the board shows, or delete it.
- [false-teaching] Lesson endings narrated as equal or better while Stockfish has the student about a pawn worse
    WHERE: src/data/lessons/proSamayRainaCaroWhiteVariations.ts:27 (2…e6); proCarlsenScandinavian.ts:28 (main, bb7); proAmanCaroKann.ts:45 + proAmanCaroKannVariations.ts:38 (main/Advance); proAmanCaroKannVariations.ts:65 (vs Two Knights); proHikaruPircModernVariations.ts:49 (vs Austrian f4); proHikaruPircModern.ts:29 + proHikaruPircModernVariations.ts:22 (main / vs Be3+Qd2); proEricRosenClosedSicilianVariations.ts:46 (vs …g6); proEricRosenScandinavianVariations.ts:45 (vs Nf3, develop); proCarlsenKingsGambit.ts:27 (main, d5)
    EVIDENCE: I ran Stockfish on each lesson's final position from the student's side. The first number is depth 16; the second, where present, is a depth-21 re-check.
- Samay 2…e6: 'freer game … Black stays cramped'. Engine: −1.12, then −1.26.
- Carlsen Scandinavian: 'comfortable … easy play'. Engine: −1.10, then −1.19.
- Aman Caro main/Advance: 'Comfortable equality'. Engine: −0.94, then −1.04.
- Hikaru vs Austrian: 'counterplay is fully in the game'. Engine: −1.13, then −1.03.
- Rosen closed-Sicilian: '…g6
    FIX: Say the verdict the engine gives, as the KID lessons do ('clearly worse but sharp'), or rebuild the line on a sound data line. A gambit may stay a gambit, but it must not claim full compensation.
- [false-teaching] KID Mar del Plata 'trap' claims a material win, but the line ends in an even knight trade
    WHERE: src/data/lessons/proNaroditskyKIDTrapLessons.ts:81 (mdp-cash: 'Material gain + active position', sayShort '...Nxd4 — win the central knight'); src/data/pro-repertoires.json:1229 (pro-naroditsky-kid trapLines 'Mar del Plata Nh5-Nf4-Nxd4 conversion (30 games)': 'watched Black win material'). Related: the Najdorf 'Bb5 in deep English Attack (queen-trade trap)' and the Alekhine 'Bb5 in Anti-Vienna lets ...Nd4 fork' and 'Bc4 + Nd7 in Modern Alekhine' trapLines.
    EVIDENCE: The line ends with 11...Nxd4 and White to move; FEN r1bqr1k1/ppp2pbp/3p2p1/7n/2PnP3/2N1BP2/PP1QB1PP/R4RK1 w - - 0 12. Bxd4 (or Qxd4) recaptures at once. The knight never reaches f4, although the name and the beats promise 'Nh5-Nf4'.
Stockfish from the student's side:
- KID Mar del Plata: −0.63 at depth 16, −0.48 at depth 20.
- Najdorf Bb5: −0.50 at depth 16, 0.00 at depth 20.
- Alekhine Bb5 / …Nd4: −0.42 at depth 16, −0.28 at depth 20.
- Alekhine Bc4 + Nd7: −0.58 at depth 16, −0.43 at depth 20.

    FIX: Remove these from trapLines (see the F04 finding), or rewrite them honestly as structure themes. Drop 'Material gain', 'win the central knight' and 'win material'.
- [false-teaching] Eight impossible arrows still ship, excused by a test baseline
    WHERE: src/data/proRepLessonArrows.test.ts:89-99 (BASELINE). The arrows are in pro-gothamchess-caro-kann 'Advance Variation 3.e5 Bf5' (c5: c6→c5), pro-gothamchess-scandinavian '2...Nf6' (fianchetto: f8→g7), pro-gothamchess-vienna 'Vienna Gambit Main Line' (qg3-nf3: f3→g3), pro-hikaru-reti 'vs ...d5' (mid: f1→d3), pro-naroditsky-alapin '2…Nc6 Line' (nc6-bd3: f1→d3), pro-caruana-najdorf main (be7: f8→e7), pro-samayraina-french-white main (bd3: f1→d3), and 'vs c5 break' (dxc5: f1→d3).
    EVIDENCE: The gate's own comment says these are 'geometry-impossible arrows'. Six start on a square that holds a castled rook and run diagonally, as a stale bishop route. One starts on c6, which holds a black knight, and points c6→c5. One runs from the f3 knight to its own queen on g3.
    FIX: Delete or redraw the 8 arrows (bishop routes should start on the bishop's current square), then empty BASELINE so the gate has no exceptions.
- [broken] Developer TODO notes ship as the tab Overview on all 7 King's Indian variations and are read aloud
    WHERE: src/data/pro-repertoires.json:1164, 1173, 1182, 1191, 1200, 1209, 1218 (pro-naroditsky-kid variations[*].explanation)
    EVIDENCE: `grep -n TODO src/data/pro-repertoires.json` returns 7 hits. Each starts 'TODO Pass B — … Spine walks through ply 30 … Anchor to KID corpus voice.' None of the KID variations has an overview field, so OpeningDetailPage.tsx:1611-1612 uses explanation as the Overview. ListenableProse (OpeningDetailPage.tsx:2555) reads it aloud through useProseReader.ts:66 speakReadAloud. DrillMode.tsx:51 also shows it.
    FIX: Write real explanations for the 7 tabs from their PGNs, and add a gate that fails on 'TODO' in any shipped text field.
- [broken] In 14 lessons, Play is locked to a different line from the one Watch, Learn and Practice teach
    WHERE: Variation lessons in src/data/lessons/:
- proNaroditskyFantasyCaroVariations.ts: 'Modern setup with g6' (diverges at ply 1), 'Black accepts with dxe4' (ply 7), 'Qb6 pressure sideline' (ply 7).
- proNaroditskyCaroKannVariations.ts: 'Fantasy Variation (f3)' (ply 8).
- proNaroditskyKIAVariations.ts: 'g6 Modern setup' (ply 5).
- proNaroditskyRossolimoVariations.ts: 'Nc6 Rossolimo proper' (ply 14), 'e6 Open avoidance' (ply 9), 'Bxd7+ Trade' (ply 12), 'vs ...g6 (Hyper Dragon)' (ply 10).
- proNaroditskyJobavaVariations.ts: 'e6 French Setup' (ply 8), 'c6 Slav-Style' (ply 8).
- proGothamchessEnglishVariations.ts: 'Anti-French (…e6)' (ply 11).
- proCarlsenModern.ts: 'vs Austrian f4' (ply 9).
Main lesson: proNaroditskyAllRemaining.ts:502 (pro-naroditsky-jobava-london, ply 12).
The wiring is in OpeningDetailPage.tsx: Learn at 1239-1241, Practice at 1366-1368, variation Play at 1418-1424.
    EVIDENCE: Learn and Practice run lessonToPlayableLine(lesson), which follows the lesson's deepest beat. Variation Play mounts OpeningPlayMode with customLine={opening.variations[i]}, which follows the variation PGN. I compared the two move lists for every pro variation:
- Fantasy 'Modern setup with g6': the lesson plays 'e4 g6 Nc3 Bg7 d4…'; the PGN plays 'e4 c6 d4 d5 f3'.
- Rossolimo 'Bxd7+ Trade': the lesson plays c4; the PGN plays c3, which the player's tree has in 27 of 28 games.
- Fantasy-caro dxe4: t
    FIX: For each pair, rebuild the lesson beats on the variation PGN where the PGN follows the player's tree (as in the three cases above). Otherwise set the PGN to the lesson's line. Then add a gate asserting the deepest beat equals the variation PGN.
- [broken] The trap grounding gate checks a stale snapshot, so it never sees current pro trap lines
    WHERE: src/data/groundingTraps.test.ts:17-45; src/data/grounding-items.json (built by scripts/ci/build-grounding.cjs, enumTraps at :107-121, from the pro-repertoires.json trapLines/warningLines); src/data/grounding/groundingTraps.baseline.json:1-10
    EVIDENCE: I compared the snapshot with the current pro-repertoires.json. Of 57 current pro trap/warning lines, 8 have no snapshot item. They were renamed 'us'→'you' after the snapshot, for example 'Nc3 after ...e5 lets you trade with tempo' and 'O-O lets you crash through with exf6'; the Alapin '…Kg6 forced mate' line is missing too. In the other direction, 23 snapshot items name lines that no longer exist. All 8 baseline entries ('… :: TRAP-BACKFIRES' / 'TOOTHLESS-WARNING') point at removed lines. The ga
    FIX: Re-run `node scripts/ci/build-grounding.cjs --only traps`. Regenerate groundingTraps.baseline.json, which deletes the 8 stale entries. Add a test that fails when a grounding item's name is absent from the source JSON, or when a source line has no item.
- [rule-violation] Lines contradict the player's own most-played moves
    WHERE: src/data/pro-repertoires.json entries:
- pro-ericrosen-london main pgn
- pro-ericrosen-budapest main pgn
- pro-gothamchess-italian main pgn and 'Giuoco Piano c3-d4'
- pro-gothamchess-scandinavian '2...Nf6 Scandinavian'
- pro-gothamchess-caro-kann 'Tartakower / Two Knights 3...Nf6'
- pro-naroditsky-najdorf 'Be3 English Attack'
- pro-naroditsky-dragodorf 'English Attack (Be3)'
- pro-samayraina-open-sicilian main pgn (its overview claims Be2 is the choice)
- pro-naroditsky-rossolimo 'c3 Sideline'
The matching lessons repeat these lines.
    EVIDENCE: I walked each line through the player's own tree in data/sources/<player>-trees. At each position below, the player's choice and the line's move differ:
- Rosen London, ply 8: h4 in 196 of 204 games; the line plays Nf3.
- Budapest, ply 9: …d6 in 42 of 42; the line plays …Nc6.
- Gotham Italian, ply 6: O-O in 30 of 38; the line plays c3.
- Gotham 2…Nf6 Scandinavian, ply 5: …Bg4 in 206 of 210; the line plays Nxd5.
- Gotham Tartakower, ply 5: a6 78, dxe4 45, Bg4 20 of 150; the line's Nf6 is not even
    FIX: Re-walk each spine along the player's most-played move while 5 or more games remain. Where a line is deliberately taught rather than played, flag it as such in its text.
- [rule-violation] Repertoires with little or no player-game data behind them
    WHERE: src/data/pro-repertoires.json:
- pro-gothamchess-stafford-refute
- pro-samayraina-kings-gambit (:3841; overview :3848 claims '800+ games')
- pro-samayraina-caro-white (:3603)
- pro-samayraina-french-white (:3551)
- pro-gothamchess-london
    EVIDENCE: I checked data/sources and public/data/pro-game-references.json:
- Stafford refutation: the tree file holds 1 game.
- Samay King's Gambit: no tree and 0 game references, yet the overview claims '800+ games'. Its only model game is Ivanchuk–Ding Liren (IMSA Blitz 2016), which is not the player's game.
- Samay Caro-white and French-white: trees of 2 and 3 games, both on minPrefix '… d4 d5 Nc3', while the taught lines are Panov and Exchange structures. There is 1 Caro reference game and 0 French.
-
    FIX: Pull the player's games for these openings and rebuild the spines. Otherwise mark them as taught (instructional) lines with no game claims, and delete '800+ games'.
- [rule-violation] 42 of 49 pro trap lines do not win a piece or mate
    WHERE: src/data/pro-repertoires.json trapLines across pro-naroditsky-* (all 10 openings), pro-carlsen-*, pro-ericrosen-*; classifications in src/data/trap-line-classifications.json
    EVIDENCE: I ran Stockfish at depth 16 on every trapLine's final position from the student's side. 4 end in mate (Légal's Mate, the Alapin …Kg6 king hunt, Kieninger, Fishing Pole). 3 end above +3 (Elephant Trap ×2, the KIA exf6 crash). 6 end between +1 and +3. 33 end between −0.63 and +0.86, with no material won. Examples: 'h3 hands Black the bishop pair' −0.34; 'Bd6 voluntary trade hands you c-file pressure' −0.28. They sit in trapLines, the student's weapons, as 'theme' or 'mistake' chips. RULEBOOK F04: 
    FIX: Keep in trapLines only the 7 lines that win a piece or mate. Move the rest into keyIdeas or plan text, or delete them, and remove their classification keys.
- [rule-violation] Teaching credited to a person, and name or video references, in pro-repertoires.json (F0d)
    WHERE: src/data/pro-repertoires.json:
- :1037 ('Naroditsky's Alapin speedrun')
- :726 ('This repertoire's video has 200K views')
- :545 ('If you've watched this repertoire's video')
- :324 ('This repertoire's course recommendation')
- :996 ('Per Gordima's distillation')
- :2516 ('His own stated reason: you reach the same positions')
- 'his corpus / his archive / His main line' at :133, 205, 436, 632, 1229, 1273, 1405, 1659, 1915, 1988, 2140, 2320, 2331, 2432, 2536, 2603, 2812, 2890, 3729, 4761, 4771, 4831, 4892, 4952, 5062, 5122, 5183, 5243
    EVIDENCE: A name/pronoun scan of the read-aloud fields (overview, keyIdeas, traps, warnings, variation explanations, trap-line explanations) found 1 name and 48 he/his hits; each listed line was confirmed with sed. These fields are read aloud in the Understand zone. F0d: 'The coach never presents its teaching as his (no he teaches, his idea, his speed run …)'.
    FIX: Rewrite as the coach's own teaching. Keep credit only for a specific real game, e.g. the remi04 game cited at :1027.
- [rule-violation] Teaching credited to a person in lesson narration, plus 'This repertoire' used as a person (F0d)
    WHERE: src/data/lessons/:
- proNaroditskyCaroKann.ts:94 ('he played 53 times … he chose in 528'), :103
- proNaroditskyCaroKannVariations.ts:365 ('he repeats that phrase THREE TIMES'), :313
- proHikaruPircModern.ts:24 ('Their own reason')
- proGothamchessCaroAdvanceVariations.ts:35 ('his bread-and-butter')
- proCarlsenOpenSicilian.ts:28
- proCarlsenRuyLopez.ts:29
- proCaruanaItalianVariations.ts:17
- proCaruanaRuyLopez.ts:25
- proCaruanaRuyLopezVariations.ts:30
- proCarlsenRuyLopezVariations.ts:54
- proCarlsenSicilian.ts:26
- proNaroditskyAllRemaining.ts:94 ('he plays for')
- proCarlsen1e5.ts:25 ('This repertoire has drawn impregnable games'), :28 ('nobody navigates those better than this repertoire')
- proCarlsenKID.ts:43 and proCarlsenSicilian.ts:54 ('a this repertoire World-Championship weapon')
- proCarlsenKingsGambit.ts:27 and proCarlsenRuyLopezVariations.ts:20 ('This repertoire's home turf')
    EVIDENCE: A pronoun scan of all 1,706 pro beats returned 67 he/his/him hits. About 45 refer to the player; the rest refer to the opponent (see the V1 finding). The 'this repertoire' strings are leftovers of a mechanical name replacement: the sentence still describes a person's games, title and character.
    FIX: Rewrite those sentences as the coach's own teaching ('you', the position). Delete career and World-Championship references, and keep any game credit to a specific game.
- [rule-violation] Perspective errors: the student's own player called 'they/their', the opponent called 'he/his' (V1)
    WHERE: 'They/their' for the student's player, in src/data/lessons/:
- proGothamchessCaroAdvance.ts:46 ('They play … and wins 299')
- proNaroditskyAlekhineVariations.ts:61
- proNaroditskyRuyVariations.ts:107
- proGothamchessItalianVariations.ts:180
- proGothamchessViennaVariations.ts:169
- proGothamchessPonzianiVariations.ts:107
- proNaroditskyCaroKann.ts:200
- proEricRosenStafford.ts:85
'He/his' for the opponent:
- proGothamchessCaroAdvance.ts:86
- proGothamchessEnglish.ts:50, :66
- proGothamchessCaroKann.ts:111
- proGothamchessCaroKannVariations.ts:38, :110
- proGothamchessStaffordRefute.ts:46
- proGothamchessStaffordRefuteVariations.ts:45
- proGothamchessVienna.ts:109 ('his has barely started')
- proGothamchessClosedSicilianVariations.ts:66
- proGothamchessTrompowskyVariations.ts:125
- proGothamchessAntiSicilianVariations.ts:81
- proGothamchessMilnerBarryVariations.ts:81
- proGothamchessCaroAdvanceVariations.ts:62
- proNaroditskyAlapinVariations.ts:288
    EVIDENCE: I confirmed each line with grep. RULEBOOK V1: 'The student is you / your. The opponent is they / their.' In these beats 'they' names the repertoire's player, whom the student represents, and 'he/his' names the opponent.
    FIX: Use 'you/your' for the student's side and 'they/their' for the opponent. Remove the player-as-'they' sentences.
- [rule-violation] Numbers and statistics in spoken text (V8)
    WHERE: src/data/pro-repertoires.json: 238 of 923 read-aloud fields, e.g. :949 ('783 games, 71.3% in the corpus, 66.3% for you'), :1061, :2734, :3848. Lesson beats, e.g. src/data/lessons/:
- proNaroditskyKIDVariations.ts:161, 167, 231, 289, 481 ('% pick at ply')
- proNaroditskyCaroKannVariations.ts:63
- proGothamchessTrompowskyVariations.ts:38
- proGothamchessViennaVariations.ts:37
- proHikaruPircModern.ts:24 ('scoring over 86%')
- proAmanAntiCaro.ts:30
- proCarlsenOpenSicilian.ts:26
- proNaroditskyKIDTrapLessons.ts mdp-intro ('30 of his opponents')
    EVIDENCE: A regex scan (percentages, 'N games', 'N of his/their') matched 78 of 1,706 pro beats and 238 of 923 read-aloud fields in pro-repertoires.json. Spelled-out counts such as 'Seventeen of his corpus games' and 'seventy-four' add more. RULEBOOK V8: 'No numbers or statistics in speech.'
    FIX: Say what the numbers mean in words ('almost always', 'his best-scoring branch' → 'the line that scores best'). Extend proRepNarrationVoice to fail on these patterns.
- [rule-violation] Move numbers in read-aloud repertoire text, with no gate covering this file (V9)
    WHERE: src/data/pro-repertoires.json: 123 of 923 read-aloud fields (overview 39, variation explanations 36, keyIdeas 15, trap-line explanations 13, traps 12, warnings 8), e.g. :113, :545, :674, :726; src/data/proRepNarrationVoice.test.ts (scans lesson files only)
    EVIDENCE: A regex scan for number+dot+SAN ('7.a4', '4…Nxe4') over the fields shown and read aloud by ListenableProse matched 123 fields. The lessons are clean (1 match, a false positive at a sentence end), because proRepNarrationVoice scans only lesson say/sayShort. RULEBOOK V9: 'No move numbers in speech.'
    FIX: Strip the move numbers (white: drop them; black: keep '…'), and extend the gate to the pro-repertoires.json read-aloud fields.
- [rule-violation] Broken text from mechanical replacements (V0)
    WHERE: src/data/lessons/:
- proCarlsenQueensPawn.ts:27 ('the this repertoire recipe'), :56
- proCarlsenRuyLopez.ts:27 ('Every this repertoire Ruy')
- proCarlsenRuyLopezVariations.ts:46
- proCaruanaRuyLopez.ts:31
- proEricRosenBudapest.ts:23
- proHikaruNimzoLarsen.ts:68
- proNaroditskyAllRemaining.ts:94 ('THE this repertoire signature')
- proCarlsenSicilian.ts:25 ('they unbalance … and plays')
- proEricRosenLondon.ts:59 ('and castle is met')
- proNaroditskyCaroKannVariations.ts:519 and proNaroditskyRossolimoTrapLessons.ts:62 ('bishop pair (well, single bishop)')
src/data/pro-repertoires.json:
- :1445 ('every this repertoire Rossolimo middlegame')
- :2734 ('games.com corpus')
- :4349 ('362 games equivalent')
    EVIDENCE: Grep for a determiner directly before 'this repertoire' found 11 hits; each other quoted string was confirmed on its line. A further 11 lesson lines capitalise 'You'/'Your' mid-sentence (e.g. proGothamchessEnglishVariations.ts:74, :83, :159; proNaroditskyCaroKannVariations.ts:477).
    FIX: Rewrite each sentence in plain speech; do not just swap one token for another.
- [rule-violation] Six repertoire lines never reach a middlegame and are excused by a baseline (Gate B)
    WHERE: src/data/variationMiddlegameDepth.baseline.json (6 keys); src/data/pro-repertoires.json entries:
- pro-naroditsky-fantasy-caro: main pgn, and the 'Modern setup with g6' and 'Qb6 pressure sideline' variations
- pro-naroditsky-caro-kann: 'Exchange' and 'Advance (3.e5 Bf5)' variations
- pro-naroditsky-rossolimo: 'e6 Open avoidance' variation
    EVIDENCE: I ran variationMiddlegameDepth.shared.mjs reachesMiddlegame on every PGN (pass = 14 or more plies, or a side castled, or both sides with 2 or more minors developed). These 6 fail and are listed in the baseline. Play locks to these short PGNs, while the Watch lessons for 3 of them run on to a different, longer line (see the Play-mismatch finding).
    FIX: Extend each PGN along the player's tree to a middlegame, matching the lesson spine, then delete the baseline keys.
- [rule-violation] Fact gates cannot see the claim types in these findings
    WHERE: src/data/proRepLessonAccuracy.test.ts:8, :56 (CLAIM_RE); src/data/narrationFactCheck.test.ts:35-38
    EVIDENCE: proRepLessonAccuracy says it stops 'the Bg5 pins the knight class of hallucination', but CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|…)\b/ only checks hyphenated square-piece tokens. It never checks 'pins', 'doubled', 'bishop pair', 'isolated', 'long diagonal', 'open file' or 'attacking the queen'. It also accepts a claim true at any frame of the beat. narrationFactCheck imports only 4 pro exports: the Naroditsky Caro main + variations and the Alapin main + variations. Every claim in the false-teach
    FIX: Have one computed board-claim checker parse each beat's claims (pin, attack, doubled, isolated, bishop pair, open file, long diagonal), check them against the beat's final board, and run it over every pro lesson and every pro-repertoires.json read-aloud field.
- [orphan] 27 dead keys in trap-line-classifications.json, and a test still asserts 6 of them
    WHERE: src/data/trap-line-classifications.json (classifications); src/services/proRepertoireService.test.ts:78-80, :86-87, :92
    EVIDENCE: I checked each pro-* key against `${opening.id}::${trapLine.name}` from pro-repertoires.json: 27 of 76 have no live trapLine (and none match a warningLine). The dead keys:
- pro-gothamchess-anti-sicilian: Nd4 Fork Trick Exploited; Slow Development d4 Push; a6 Bxc6 Doubled Pawns
- pro-gothamchess-caro-kann: Two Knights Bg4 Pin Trick
- pro-gothamchess-fantasy-caro: Premature e5 Demolition; Qh4+ Check Trick Fails; f-File Rook Lift Attack
- pro-gothamchess-italian: Fried Liver Setup; Ng5 f7 Pressure
    FIX: Delete the 27 keys. Re-point the test samples to live keys, e.g. 'pro-carlsen-sicilian'/'Siberian Trap (vs the Smith-Morra)' and 'pro-ericrosen-qgd'/'Elephant Trap' for 'trap'. Add the reverse check: every classification key must name a live trapLine.
- [orphan] 11 curated trap and warning lessons that no route can reach
    WHERE: TRAPS entries and lesson consts in src/data/lessons/:
- proNaroditskyAlapinTrapLessons.ts: entries :463-466; consts PREMATURE_D4 :289, BC2_RETREAT :328, BE2_RETREAT_BG4 :367, NBXD4_OUTPOST :406
- proNaroditskyKIDTrapLessons.ts: entry :239; const BG4_PIN_FOUR_PAWNS :185
- proNaroditskyCaroTrapLessons.ts: entries :282, :286; consts QE2_KIA_TEMPO :48, NXF6_CLASSICAL_TEMPO :233
- proNaroditskyNajdorfTrapLessons.ts: entry :128; const BXF6_ENGLISH_RACE :50
- proNaroditskyAlekhineTrapLessons.ts: entries :122-123; consts NC3_FOUR_PAWNS_BB4 :26, BE3_BB4_VARIANT :45
- proNaroditskyFantasyTrapLessons.ts: entry :89; const BE7_DEEP_FANTASY :67
Also: src/data/grounding-items.json items at :18214, 18266, 18370, 18383, 18396, 18409, 18435, 18526, 18539, 18552, 18890; src/data/grounding/groundingTraps.baseline.json:2-9
    EVIDENCE: OpeningDetailPage.tsx:1142-1166 (trap) and :1188-1210 (warning) look up curated lessons only by opening.trapLines[i].name or warningLines[i].name. These 11 names match no live trapLine or warningLine. The 11 consts have 0 references outside their own files. Their only other traces are the stale grounding snapshot and baseline, which mark 6 of them TRAP-BACKFIRES (the student ends worse) and 2 TOOTHLESS-WARNING.
    FIX: Delete the 11 TRAPS entries and the 11 lesson consts. Delete the 11 grounding-items.json items (or regenerate them with build-grounding.cjs --only traps) and the 8 baseline lines.
- [orphan] Dead export PRO_NARODITSKY_KID_TRAPS_FOR_REPERTOIRE
    WHERE: src/data/lessons/proNaroditskyKIDTrapLessons.ts:253-257
    EVIDENCE: `grep -rn TRAPS_FOR_REPERTOIRE src` matches only its own definition.
    FIX: Delete lines 253-257.
- [orphan] Stale exception in the short-lesson baseline
    WHERE: src/data/proRepLessonAccuracy.test.ts:51-53 (SHORT_LESSON_BASELINE 'pro-naroditsky-fantasy-caro (main)')
    EVIDENCE: getLessonScript('pro-naroditsky-fantasy-caro')'s deepest beat ('e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 dxe4 fxe4 c5 Nf3 Nc6 Bd3') passes reachesMiddlegame (17 plies), so the exception excuses nothing.
    FIX: Remove the entry, leaving the set empty, or delete the baseline mechanism.
- [orphan] Retired trap-mining scripts and their tracked outputs
    WHERE: scripts/pro-repertoire/mine-{alapin,alekhine,caro,fantasy,jobava,kia,kid,najdorf,rossolimo,ruy}-traps.mjs; scripts/pro-repertoire/build-alapin-mined-traps.mjs; data/sources/danielnaroditsky-{alapin,alekhine,caro,fantasy,jobava,kia,kid,najdorf,rossolimo,ruy}-trap-candidates.json (git-tracked)
    EVIDENCE: No package.json script, workflow, src file or other script references these 11 scripts; the only code reference to mine-alapin-traps is build-alapin-mined-traps.mjs, itself unreferenced. The candidate JSONs are referenced only by a comment (proNaroditskyKIDTrapLessons.ts:13) and by docs. CLAUDE.md retired bot mining for pro-rep traps on 2026-06-01. docs/surface-maps/services__conceptEngine.md lists the miners' local materialBalance as 'call sites', but that is a name collision, not an import.
    FIX: git rm the 11 scripts and 10 JSONs, update the comment at proNaroditskyKIDTrapLessons.ts:13, and regenerate docs/surface-maps/services__conceptEngine.md with scripts/surface-map.mjs.
- [minor] Non-canonical SAN in stored lines
    WHERE: src/data/pro-repertoires.json: pro-ericrosen-budapest pgn ('Ngf3'), pro-samayraina-french-white 'vs …Bd6 symmetry' pgn ('Nbd7' where the lesson has 'Nd7'); missing '+'/'#' marks in the Rosen Stafford and QGD trap lines, Rosen closed-Sicilian and Carlsen Scandinavian lines
    EVIDENCE: I replayed each line with chess.js. 'Ngf3' becomes canonical 'Nf3', because the d2 knight is pinned by Bb4+. 'Nbd7' becomes 'Nd7'. The mismatches are harmless for Play (OpeningPlayMode.tsx:811-812 compares from/to squares) but break any string comparison against lesson moves.
    FIX: Store canonical SAN (chess.js output) in every pgn.
- [minor] Misnamed tab and a move number in a trap name
    WHERE: src/data/pro-repertoires.json:682 (pro-gothamchess-milner-barry 'Black Declines with Bd7'); pro-ericrosen-stafford trapLines 'Légal's Mate Trap (6.Bg5??)'
    EVIDENCE: The 'Declines' PGN continues '… Bd7 O-O cxd4 cxd4 Nxd4 Nxd4 Qxd4 Nc3 Qb6', so Black takes the pawn. The trap name carries '6.' (V9) and is displayed as the tile title.
    FIX: Rename the tab, e.g. 'Black accepts after …Bd7', and drop the move number from the trap name.

## audit:Openings — gems and traps:A (26)
coverage: I checked the data only, read-only, against HEAD ea7ddeaf0. That commit (F04 gem cut) landed during the audit and changed 2 lines of punish-gems.json and punishGems.ts; the findings hold for HEAD.

**Gems (all 389):** I replayed every gem in punish-gems.json (344) and gambit-punish-gems.json (45) with chess.js:
- playLine equals lineMoves + slip + punishSeq; legality and canonical SAN checked: all
- [false-teaching] Gem narration names a move that is not played on that ply (17 gems, 32 spoken lines, 2 of them traps)
    WHERE: src/data/lessons/punishGemNarration.ts — keys at :5256 (pro-aman-caro-kann …fxe6:Nxd4), :5261 (…O-O_Nf6:Ne5), :5271 (pro-aman-reti …Re1:Bd6, trap 365), :4957 (pro-samayraina-italian …O-O:d5, trap 408), :4947, :4962, :4927, :4937, :4902, :4987, :4997, :5002, :4759, :4771, :4445, :4519, :4541
    EVIDENCE: Replayed every narrated playLine with chess.js and compared the SAN that opens watch[i]/learn[i] with the SAN played at ply i (scratch check-gems.ts → narrMismatch 34, of which 2 are recaps that name both moves). Examples: pro-aman-caro-kann …fxe6:Nxd4 at plies 17/19/21 plays …Bc5/…Nd7/…Ne7 but says '…e5 — the pawn rolls forward', '…Nf6 — developing with tempo', '…Qh5 — keeping the queen active' (authored for a different line). pro-aman-reti …:Bd6 (trap) ply 15 plays …Bg6, says 'Bh7 — the bishop
    FIX: Re-author the 17 arrays against the current playLine (most are a 1–2 ply slide). Extend the alignment gate: any watch/learn line that opens with a SAN token must name the SAN played at that index.
- [false-teaching] 'Pierce Gambit' lesson hangs Black's queen, ignores it for two moves, then says the position is balanced, and plays a different gambit than its name
    WHERE: src/data/lessons/viennaTrapLessons.ts:492-546 (beats pg1-pg8), def :713 (pierce-gambit, kind 'weapon')
    EVIDENCE: chess.js: after e4 e5 Nc3 Nc6 f4 exf4 d4 d5 exd5 Qxd5 the d5-queen is undefended and Nxd5 captures it. Engine depth 18 at that position: Nxd5 = +6.29 for White. The lesson plays Nf3 ('develop with tempo… the Nc3 has been ATTACKING the d5-queen… Black must move the queen'), then …Bg4 leaves the queen still hanging (engine at the lesson end: +5.41 for White), and pg7 says 'theoretically the position after these moves is balanced'. The moves are 4.d4, which openings-lichess.json names 'Vienna Gambi
    FIX: Delete the lesson and its def, or rebuild it on the DB's Pierce Gambit line (4.Nf3 g5 5.d4) with every move engine-checked. Under F04 a gambit line is not a trap anyway (see the Vienna named-traps finding).
- [false-teaching] Named-trap lessons blame the wrong move: Tarrasch Trap blames 10…O-O, Blackburne Shilling blames 4.Nxe5
    WHERE: src/data/lessons/ruyTrapLessons.ts:53-58 (tarrasch tt2/tt3); src/data/lessons/italianGameTrapLessons.ts:73 (blackburne-shilling b2)
    EVIDENCE: Engine depth 18. Tarrasch: after …Re1 O-O 11.Nd4 Black's best is 11…Nxe5 (+0.28 for Black), and after 10…O-O White's best is h3 (+0.21). Only 11…Qd7 loses (12.Nxe6 fxe6 13.Rxe4 = +3.71). But tt2 says 'Black castles — and walks straight into it… The Tarrasch Trap springs' and tt3 closes 'castle too soon in the Open and th…'; the losing …Qd7 is never named as the slip. Blackburne: b2 says 'Nxe5?? Grab the pawn and the trap snaps shut… White cannot save both'. After 4.Nxe5 Qg5 5.O-O Black is only +
    FIX: Move the '??' and the 'this is the trap' sentence to the real losing move (…Qd7; Nxf7). Mark 10…O-O as playable and 4.Nxe5 as a dubious '?!' grab.
- [false-teaching] Fantasy-Caro trap lesson narrates the student's own O-O as Black's blunder '…O-O??' on the same ply
    WHERE: src/data/lessons/proNaroditskyFantasyTrapLessons.ts:35-37 (beat fan-nihal-blunder, lesson 'O-O in Anti-Winawer line (Nihal Sarin victim 2x)')
    EVIDENCE: chess.js: the beat's 17th ply (its last move) is White's O-O (the student is White; the highlight is on g1). The say text is '...O-O?? — Nihal Sarin's exact move… Black castles into a kingside structure'. Black's castling only happens at ply 20, inside fan-nihal-cash. The repo's own depth-22 manifest puts this line at +8cp, so it is not a trap either.
    FIX: Delete with the other unreachable pro trap lessons (see the orphan finding). If it is kept, put the …O-O narration on Black's move and drop the '??' (engine equal).
- [false-teaching] Pro trap lessons put '??' on engine-equal main-line moves and claim material that is not won
    WHERE: src/data/lessons/proNaroditsky*TrapLessons.ts — 26 'say' lines that open with a '??' move (e.g. proNaroditskyAlekhineTrapLessons.ts:71, proNaroditskyCaroTrapLessons.ts:113 and :166, proNaroditskyKIATrapLessons.ts:152, proNaroditskyRossolimoTrapLessons.ts:37 and :56, proNaroditskyNajdorfTrapLessons.ts:95 and :101)
    EVIDENCE: src/data/trap-engine-verification.json (depth 22, the repo's own manifest) for the matching trapLines: Alekhine 'fxe5??… loses material to ...Nxe4' +7cp; Caro 'h3??' -27 (my depth-18 run: -38); Caro 'dxe4??' -28; KIA 'Be7??' (a main-line QGD move) +13; Rossolimo 'Nge7??' -1 and '…a6??' 0; Najdorf 'Bb5??' +9. Najdorf naj-bb5-cash (:101) says '...Nxb5! Black wins the bishop… extra piece', but chess.js shows White recaptures (axb5/Nxb5) and the engine at that position is +0.03. These lessons are un
    FIX: Delete the lessons (they fail F04 per the manifest anyway). Any kept beat may use '??' only where the engine shows a forced loss of at least a piece.
- [false-teaching] Trap narration states the wrong material: the same Italian position is called 'even' in one lesson and 'a piece up for a pawn' in another, and both are wrong
    WHERE: src/data/lessons/punishGemNarration.ts:4115 (pro-gothamchess-italian …:Nxc3, trap 480), :3032 (italian-game …:Nxc3, trap 471), :2976 (italian-game …O-O:d5, trap 344), :4844 (pro-ericrosen-sicilian …:a3, trap 302), :4376 (pro-gothamchess-milner-barry …:Nxd4, trap 346); ruy-lopez gems at :2294 and :2364
    EVIDENCE: Counted material at the narrated ply with chess.js. Italian Nxc3→Qe1+ (one position, two gems): White has B2 N1 P5 against B1 N1 P7, i.e. a piece for two pawns. #153 says 'material is even', #48 says 'a piece up for a pawn'. Italian d5→Nxd5 says 'the dust settles two pawns up', but the board is two minors against a rook (+1). pro-ericrosen-sicilian says 'Black is a clean pawn up', but material is level at the end of the narrated line. Milner-Barry says 'winning the bishop pair and the exchange',
    FIX: Rewrite these sentences from the computed material ('a piece for two pawns', 'two minor pieces for a rook'), or drop the material clause.
- [false-teaching] QGA gem is reversed: the Black student's own …Nc6 is filed as the opponent's slip and White's Bxc4 as the punish
    WHERE: src/data/punish-gems.json[312] (qga:d4_d5_c4_dxc4_Nf3_Nf6_e3:Nc6); narration src/data/lessons/punishGemNarration.ts:339
    EVIDENCE: repertoire.json has qga with color 'black'. The slip …Nc6 is played with Black to move (chess.js turn 'b'). The punish Bxc4 and the Learn cues sit on White's moves. The 'why' and watch text speak from White's side ('White's edge is that Black's plan is gone'). The gem is tier positional, 86, and narrated, so computeGemCrush('qga', path) (gemCrushLines.ts:322-327) can present the student's own move as 'the opponent's slip' on a Black lesson. That breaks V16 (never hand a Black player White's less
    FIX: Re-key the gem to a White repertoire that meets the QGA (or delete it), and add an orientation gate: the side to move at the inaccuracy must be the opposite of the opening's color.
- [false-teaching] repertoire.json and gambits.json trap/warning lines whose name or text does not match their PGN
    WHERE: src/data/repertoire.json:1494 (petrov-defence 'Nxf7 Refutation'), :3108 (evans-gambit warning 'Declining Into Passivity'); src/data/gambits.json:274, :279, :284 (stafford-gambit warningLines)
    EVIDENCE: Petrov: the PGN has no Nxf7. Its explanation says 'If White plays the rare Nxc6 line instead of the main 3.Nxe5' (the PGN plays 3.Nxe5 then 4.Nxc6) and 'The queen invades to e1 with check' (no Qe1+ in the PGN). Evans: the explanation says White's a4-a5 'seize[s] a dominant center', but the line ends with the student (White) at -1.71 at depth 18 (…Nxd4; the line's own verifiedEval is -183cp). verifiedLineLibrary.ts:116-117 serves it to the coach as a pitfall. Stafford: 'Aggressive e5 Refutation' 
    FIX: Rename or rewrite the Petrov line from its own moves. Fix or delete the Evans warning (its text contradicts the board). Delete the three Stafford pseudo-warnings, or replace them with one real line where the student's natural move loses at least a piece.
- [broken] One slip appears twice at the same position: twin gems bake duplicate trap picks with different punishes and different verdicts
    WHERE: src/data/punish-gems.json + src/data/gambit-punish-gems.json (45 positions with more than one gem); src/services/gemCrushLines.ts:602-624 gemsForPosition, :637-671 bakeGemsIntoTree (dedupes by gemId only)
    EVIDENCE: Called gemsForPosition() via tsx. 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5' returns two detours, vienna-game and vienna-gambit, both 'Punish g6 with Qxe5+'. The Falkbeer position returns kings-gambit and gambit-kings-gambit, both 'Punish Bb4 with Qb5+'. Open Ruy …dxe5 returns ruy-lopez 'Punish Bc5 with Qxd5' and pro-aman-ruy-lopez 'Punish Bc5 with Bxd5'. The Frankenstein position gives Qg5 → d4 (vienna-game) and Qg5 → Nxc7+ (vienna-gambit). Verdicts conflict on identical positions: ruy-lopez#9 Nxd4 = 271 (cu
    FIX: Make the slip position (lineMoves + inaccuracy) the unique key across both files. Keep one gem with one engine-best punish and one verdict. Gate it with a uniqueness test over ALL_GEMS by position, not by gemId.
- [broken] gambit-punish-gems.json tiers contradict their engineCp (no gate), so a 304cp slip is excluded from the trap bar by a stale label
    WHERE: src/data/gambit-punish-gems.json entries #2, #3, #16, #21, #28, #31, #32, #33, #37, #41 (tier 'positional', engineCp 105-304) and #1 (tier 'weak', 55)
    EVIDENCE: Data check: 10 'positional' gems carry engineCp of 100 or more (danish Ke7→Qb3 304, smith-morra Bg4→Bxf7+ 258, evans Nge7→Ng5 254, scotch-gambit Kf8→Nxc3 182…). positional means 50 to 99 (punishGems.ts:28-33), but only punish-gems.json is tier-gated (punishGems.test.ts:76-87); gambitGems.test.ts has no tier check. isWeaponGem requires tier==='confirmed', so the trap verdict depends on the label, not the number. Depth 18 confirms danish Ke7→Qb3 is really 240, so it should be cut, but for the righ
    FIX: Re-tier the gambit file from engineCp (or drop the tier and derive it), and add the same tier/engineCp assertions to gambitGems.test.ts.
- [broken] Three real traps never reach the Evans Gambit page: they are keyed to the retired id 'gambit-evans-gambit'
    WHERE: src/data/gambit-punish-gems.json #12 (d6→a5, 420), #14 (Nxe5→Re1, 528), #15 (Bb4→d5, 348); src/services/dataLoader.ts:636-646 (RETIRED_GAMBIT_DUPES deletes the opening record)
    EVIDENCE: None of the three has a twin in punish-gems.json under 'evans-gambit' (the only evans-gambit gems there are Qf6→Bg5, Nf6→Bxf7+ and d5→exd5). OpeningDetailPage.tsx:1742 lists getPunishGemsForTab(opening.id), which matches openingId exactly, so the Evans page never shows them. Depth 18 confirms d6→a5 (346) and Nxe5→Re1 (380) as traps. Bb4→d5 only 'wins a pawn' by its own narration.
    FIX: Re-key the unique gambit-evans-gambit gems (and their gambitGemNarration entries) to 'evans-gambit', and do the same for the unique gambit-kings-gambit and gambit-budapest-gambit gems. See the orphan finding.
- [rule-violation] Keeper gems that fail F04 when the engine re-measures them (piece-or-mate bar)
    WHERE: src/data/punish-gems.json #276, #198, #213, #27, #26, #29, #34, #47, #221, #298, #164, #41; gambit-punish-gems.json #23, #24, #26, #15; listed as keepers in docs/plans/2026-10-07-gem-bar-recheck.md
    EVIDENCE: Stockfish 18 at depth 18, multipv 3, on all 69 keepers (61 distinct positions). The number is the punisher's eval after the opponent's best defence to the stored punish. Below 300 and less than a piece won: pro-aman-anti-caro c5→Bb5+ 272 (the engine prefers exd5 at 292; material level at the end of the line); pro-ericrosen-sicilian a3→Nxe4 268 (material level); pro-samayraina-ruy Nxd4 254 (a knight for two pawns; its twin ruy-lopez#9 at 271 was cut); vienna Qf6→Nxc7+ 241, Qf6→Nd5 278, Qg5→d4 278
    FIX: Re-measure every keeper with a deeper multi-thread pass at build time, judge it on material won plus the best-defence eval, and move the failures to known-mistake (isKnownSlipGem) status. Store the measured best-defence eval in the gem so the bar reads a forced value.
- [rule-violation] Most masterclass named-trap 'weapons' are not F04 traps (gambit showcases and positional edges), and the lessons say so themselves
    WHERE: src/data/lessons/viennaTrapLessons.ts:706-715 (wurzburger, hamppe-allgaier, hamppe-muzio, frankenstein-nxa8, copycat-qg4, steinitz-gambit as weapons; nxe4-no-qh5 as warning); src/data/lessons/italianGameTrapLessons.ts:91 (fried-liver, weapon); ruyTrapLessons.ts mortimer (:99), noahs-ark, marshall-onlymove
    EVIDENCE: Engine depth 18, student's view. Wurzburger: after 7…Qh5 8.Nxd5 +0.14 (after 6…Nxg3 7.Nf3 +0.01). Hamppe-Allgaier ends at -1.32 for the student; Hamppe-Muzio at -2.69. Frankenstein: after 5…Nc6 6.Nb5 +0.90, and at the end (Nxa8) +0.81. Copycat: at the labelled slip 4…Qf6, 5.Nd5 +0.88. Steinitz ends at -0.11 (sg8 itself says 'dubious against engines'). Fried Liver: after 5…Nxd5, 6.Nxf7 +1.19 (6.d4 +0.82). Warnings: nxe4-no-qh5 -0.83 (the lesson says 'Black has equalised'), Mortimer 5.Nxe5 -1.37 (
    FIX: Re-classify the gambit and positional lessons out of the trap section (opening principles or gambit showcases). Keep as traps only lines with a forced win of at least a piece or mate. The borderline warnings (Noah's Ark, Marshall) need a deeper engine verdict.
- [rule-violation] 40 of 49 pro-rep trapLines fail F04 by the repo's own engine manifest, and three different trap bars coexist
    WHERE: src/data/pro-repertoires.json trapLines; src/data/trap-engine-verification.json (all 57 status 'keep'); src/data/trapEngineBacking.test.ts:43-54 (200cp bar); src/data/groundingTraps.test.ts:1-8 ('We do NOT hard-gate the near-equal band'); src/data/lessons/punishGems.ts TRAP_BAR_CP=300; src/data/trap-line-classifications.json
    EVIDENCE: Manifest (depth 22): only 9 trapLines are 300 or more or mate; 40 sit between -45 and +264cp (e.g. KID Mar del Plata -45, Alekhine Bc4 -42, Caro h3 -27; my depth-18 spot checks give -53, -38, and +3 for Najdorf Bb5). They are all shipped. trapEngineBacking holds 'trap'-class lines to 200, not 300. The real traps 'pro-naroditsky-kia::O-O lets you crash through with exf6' (380) and 'pro-carlsen-1e5::Fishing Pole Trap' (mate; depth 18 confirms mate) are classified 'mistake', so the chat weapon list
    FIX: Use one bar: import TRAP_BAR_CP in trapEngineBacking (and groundingTraps). Cut or demote the 40 sub-bar trapLines. Re-classify the two real traps as 'trap'.
- [rule-violation] Masterclass, gambit and anti-opening trap/warning lines under the bar are still served
    WHERE: src/data/repertoire.json:2540 (queens-indian 'Petrosian Counterblow'), :857 (sicilian-sveshnikov 'Premature ...f5'), :1427 (philidor 'Cramped Position Danger'); src/data/anti-openings.json:718 ('Englund Queen Trap (…Qxb2)'); pro-carlsen-1e5 warning 'Retreating ...Nf6'
    EVIDENCE: Engine depth 18 at each line's final position, student's view: Petrosian Counterblow (trap) +2.45; Englund Queen Trap (trap) +1.89; warnings -1.87, -1.81, -1.80 (manifest -167). trap-line-classifications.json has no keys for repertoire.json, so coachApi.ts:4399-4405 never downgrades them. The chat offers 'Petrosian Counterblow' as a weapon. The other 15 repertoire, gambit and anti-opening lines clear the bar (3 mates; traps +326 to +760; warnings -325 to -783).
    FIX: Demote or delete the five lines, or replace each with a variant where the slip loses at least a piece by force (engine-verified).
- [rule-violation] Spoken trap narration says numbers: engine evals in gem Watch lines, game counts and ratings in trap lessons (V8)
    WHERE: src/data/lessons/punishGemNarration.ts (29 watch lines, e.g. :60 'The engine calls it +4.6', 'the engine reads +1.8', '(+3.4)'); src/data/lessons/proNaroditsky*TrapLessons.ts (38 'say' lines, e.g. proNaroditskyAlekhineTrapLessons.ts:33 '20 opponents played this including spicycaterpillar (3157)')
    EVIDENCE: Regex scan of the narration arrays (check-gems.ts numberSpeech = 29) and grep for '(dddd)' or 'N opponents/games' in say strings (per-file counts 1/5/3/2/5/5/1/5/5/6 = 38). RULEBOOK V8 bans numbers and statistics in speech.
    FIX: Replace the numbers with words ('a whole piece up', 'decisive') in the gem narration. The pro trap lessons go with the orphan deletion.
- [minor] A gem Watch line speaks a move number (V9)
    WHERE: src/data/lessons/punishGemNarration.ts:1638 (petrov-defence:e4_e5_Nf3_Nf6_d4_Nxe4:Bc4, watch ply 5)
    EVIDENCE: Text: '…Nxe4 — grabbing the e4-pawn; in this 3.d4 line the knight is well supported.' The TTS reads it as 'three d4'.
    FIX: Change it to 'in this d4 line' or 'after the early d4'.
- [orphan] Pro-rep trapLine view branches are dead, so all 10 proNaroditsky*TrapLessons.ts files are unreachable
    WHERE: src/components/Openings/OpeningDetailPage.tsx:342 (activeTrapLineIndex), :532 (the only setter call, with -1), :1143-1185 (trap-walkthrough), :1269 (trap-learn), :1385 (trap-practice), :1429 (trap-play), :1449 (train-traps), ViewMode members :283-285/:291/:293, imports :131-159; src/data/lessons/proNaroditsky{Alapin,Alekhine,Caro,Fantasy,Jobava,KIA,KID,Najdorf,Rossolimo,Ruy}TrapLessons.ts (~2,100 lines, 51 lessons)
    EVIDENCE: grep: setActiveTrapLineIndex is called only with -1. No setViewMode reaches 'trap-walkthrough', 'trap-learn', 'trap-practice', 'trap-play' or 'train-traps'. There is no trapLines.map tile list. The only importer of the 10 lesson modules is OpeningDetailPage. Its live warning branch (:1187-1229) calls the same getters by warning name, but every pro-naroditsky opening has 0 warningLines (all 8 warnings belong to pro-carlsen). Also, 11 of the 51 lessons match no trapLine name at all (e.g. 'Bc2 retr
    FIX: Per G8.5: delete the 10 files, their imports and getter calls (including in the warning branch), the trap-* ViewMode members, activeTrapLineIndex, and the 5 dead render branches. Remove the matching entries from src/data/grounding-items.json and src/data/grounding/groundingTraps.baseline.json.
- [orphan] Unused export PRO_NARODITSKY_KID_TRAPS_FOR_REPERTOIRE
    WHERE: src/data/lessons/proNaroditskyKIDTrapLessons.ts:253-257
    EVIDENCE: grep -rn across src finds zero importers outside the file.
    FIX: Delete it (it goes with the file if the pro trap lessons are removed).
- [orphan] trap-line-classifications.json keeps 27 classifications for pro-rep lines that no longer exist
    WHERE: src/data/trap-line-classifications.json (27 of 76 keys), e.g. 'pro-gothamchess-italian::Fried Liver Setup', 'pro-gothamchess-qgd::Early dxc4 Pawn Grab', 'pro-naroditsky-alapin::Nb5 Queen-Fork Trap (d5 Open)'
    EVIDENCE: Compared the keys with every live `${openingId}::${name}` in pro-repertoires.json trapLines and warningLines: 27 keys match nothing, all gothamchess lines plus 2 alapin. The manifest has 0 stale keys.
    FIX: Delete the 27 keys, and add a test that every classification key resolves to a live line (G8).
- [orphan] repertoire-trap-classifications.json is fully stale and the app never reads it
    WHERE: src/data/repertoire-trap-classifications.json (7 keys)
    EVIDENCE: All 7 keys ('italian-game::Fried Liver Attack', '…::Giuoco Piano Queen Trap', '…::Jerome Gambit', '…::Lolli Attack', 'kings-gambit::Muzio: Total Development Lead', 'evans-gambit::Double Pawn Sacrifice', '…::Qb3 f7 Battery') name lines absent from repertoire.json. None of the 19 live repertoire trap or warning lines has an entry. The only reader is scripts/audit-repertoire-orientation.mjs; nothing in src imports it.
    FIX: Delete the file and its read in audit-repertoire-orientation.mjs, or re-key it to the live lines if the audit still needs kinds.
- [orphan] 20 gambit gems and 19 narration entries are keyed to opening ids the loader deletes as retired duplicates
    WHERE: src/data/gambit-punish-gems.json (gambit-kings-gambit 12, gambit-evans-gambit 5, gambit-budapest-gambit 3); src/data/lessons/gambitGemNarration.ts (19 entries from :26); src/services/dataLoader.ts:636-646
    EVIDENCE: The three ids are in RETIRED_GAMBIT_DUPES and in no data file (gambits.json holds 7 other ids). 8 of the 20 duplicate a masterclass gem at the same position and cause the duplicate trap picks in the twin-gems finding. 12 are unique, including 3 Evans traps.
    FIX: Delete the 8 twins and their narration. Re-key the 12 unique gems to kings-gambit, evans-gambit and budapest-gambit (all three are live in repertoire.json) and move their narration keys with them.
- [orphan] One-off gem/gambit scripts and data from old builds that cannot run or feed nothing
    WHERE: scripts/demote-empty-gems.mjs:31; scripts/add-gambit-sources.mjs; src/data/gambitOpeningMap.json
    EVIDENCE: demote-empty-gems.mjs hard-codes another session's scratchpad (/tmp/claude-0/-home-user-chess-academy-pro/77d03188-…/scratchpad/dark-ids.json), so it cannot run anywhere else. gambitOpeningMap.json is read only by add-gambit-sources.mjs (no src importer, no package.json script), and 3 of its 6 keys (gambit-kings-gambit, gambit-evans-gambit, gambit-benko-gambit) are retired ids that never match gambits.json.
    FIX: Delete demote-empty-gems.mjs, add-gambit-sources.mjs and gambitOpeningMap.json (the sources they added are already written into gambits.json).
- [orphan] A 'weak'-tier gem still ships but can never surface
    WHERE: src/data/gambit-punish-gems.json #1 (gambit-kings-gambit …Qh5_d4:Nc6 → Nc3, tier 'weak', 55)
    EVIDENCE: Neither isKnownSlipGem nor isWeaponGem accepts 'weak' (punishGems.ts), so no surface reads it. The type comment says weak gems are 'dropped by the miner'.
    FIX: Delete the row.
- [minor] Vienna trap Learn/Practice lines show a recap under the board on the decisive move instead of the move's own narration, and hm7/hm8 repeat the same sentence
    WHERE: src/data/lessons/viennaTrapLessons.ts getViennaTrapPlayableLine (:733-751); beats wt7-wt10 (:102-124), hm7-hm9 (:278-295), ha8/ha9, fn9/fn10, cq8/cq9, pg6-pg8, sg7-sg9, wn3/wn4
    EVIDENCE: Called getViennaTrapPlayableLine for every lesson: 8 lessons have several beats on the same ply, and the last one wins. Example: wurzburger ply 14 (Nxd5) shows wt10's 'The Wurzburger Trap is a weapon you wield…' instead of wt7's 'Nxd5! The hammer falls…'. hm7 and hm8 both narrate 'e5! … surges … with tempo on the queen on f6' back to back in Watch (V13).
    FIX: Merge each same-ply cluster into one beat (move first, then the recap), and delete the duplicate hm8.
- [minor] Trap lesson beats store non-canonical SAN
    WHERE: src/data/lessons/caroKannTrapLessons.ts (beat ck-w2 'Nd6', chess.js gives 'Nd6#'); src/data/lessons/proNaroditskyAlapinTrapLessons.ts (be2-punish 'Nbd2', chess.js gives 'Nd2')
    EVIDENCE: Replaying with chess.js returns a different SAN for these two moves. All other beats in the 17 trap files, and all gem playLines, are canonical and legal.
    FIX: Store the canonical SAN ('Nd6#'; 'Nd2' or drop the unreachable lesson).

## audit:Openings — middlegame plans:B (24)
coverage: Checked all 578 plans in src/data/middlegame-plans.json read-only, with scripts in my scratchpad (chess.js from node_modules, tsx for the TS code, Stockfish via node_modules/stockfish). Covered: legality of every line and FEN validity (all legal, all arrays aligned); line.fen vs criticalPositionFen (6 differ, the Ruy walk-ins); Gate C on the student's real path, by evaluating OpeningDetailPage's e
- [false-teaching] Plan lines the grounding gate already grades LOSING tell the student they are winning or equal
    WHERE: src/data/grounding/groundingPlans.baseline.json (12 grandfathered entries); src/data/middlegame-plans.json last annotation of playableLines[0] in: mp-proamanreti-endgame (line 69983), mp-proericqgd-minority-counter (62158), mp-pro-caruana-ruy-lopez-endgame (65903), mp-proericclosedsic-endgame (62053), mp-proericbudapest-e5knight (62259), mp-proericfrench-endgame (61949), mp-proericstafford-main-hstorm (58007), mp-carlsen-caro-c5 (68934), mp-procarlsen-french-qbreak (65358), mp-carlsen-modern-c5 (69055), mp-procarlsen-nimzo-qside (65257)
    EVIDENCE: Replayed each line with chess.js and ran Stockfish (node_modules/stockfish cli via a stdin wrapper, depth 18) on the final position, student's point of view. mp-proamanreti-endgame ends 8/5k1p/6p1/6P1/2np3P/8/4K3/8 b at -7.09 for White (Black has knight + 3 pawns vs 2 pawns) while the last beat says 'h4 makes a kingside passer — White is winning' and the title is 'Réti Endgame — Bishop Outclasses the Knight' (White has no bishop). mp-proericqgd-minority-counter ends with Black's queen on d8 en p
    FIX: Cut or re-derive each line so the student is not lost at the terminus, rewrite the closing beat from the computed eval, and empty groundingPlans.baseline.json (including the stale Bird entry).
- [false-teaching] Nimzo Classical plan narrates doubled c-pawns and a bishop pair that are not on the board
    WHERE: src/data/middlegame-plans.json id mp-nimzoindian-main (line 12205), playableLines[0].annotations[1], [2], [11] and learnCues[1], [2]; shown on nimzo-indian main tab
    EVIDENCE: Replayed from rnbq1rk1/p1p2ppp/1p2pn2/8/2QP4/P4N2/1P2PPPP/R1B1KB1R w KQ - 0 9: c4 holds a White QUEEN before …Ba6 and before Qa4 (Qa4 moves it away to a4); White's pawns are a3,b2,d4,e2,f2,g2,h2 — no c-pawn, nothing doubled. Ann[1] '…Ba6 spears the c4-pawn … hitting White where the doubled pawns ache', ann[2] 'Qa4 props up the loose c4-pawn', cues 'Ba6 — spear c4' / 'Qa4 — defend c4' are false. Final board after …gxf6: bishops White [f1], Black [a6], yet ann[11] says 'Black holds the bishop pair
    FIX: Rewrite beats 1, 2, 11 and the two cues from the real board (…Ba6 hits the queen on c4; Qa4 steps away), and drop the bishop-pair claim.
- [false-teaching] Narration names pieces on squares where no such piece stands
    WHERE: src/data/middlegame-plans.json: mp-catalanopening-main (4001) annotations[6],[11] + overview; mp-progothamchess-closedsic-g6-nd5 (50114) annotations[3]; mp-carokann-main-endgame (52013) annotations[3]; mp-qga-smyslov (56492) annotations[7] + learnCues[7]; mp-petrovdefence-steinitz (56728) annotations[5] + learnCues[5] + overview; mp-antidutch-staunton-piece-activity (76772) annotations[4] + learnCues[4]
    EVIDENCE: Piece-on-square regex over every annotation/cue, each hit checked on the board BEFORE and AFTER its move; reported only when false on both, then hand-verified: Catalan — after …cxb3 axb3 (plies 2-3) c4 is empty, yet ann[6] '…O-O — Black castles, the extra c4-pawn still defended' and ann[11] 'Na3 — heads to recover the c4-pawn'; the overview promises White 'recovers it with interest … emerges with the bishop pair' but the line ends 6 v 7 pawns with two bishops each. Closed Sicilian — after cxd3 c
    FIX: Rewrite each beat from its own board (c6-pawn, e1-knight, a2-pawn raid, no pin, etc.); make the board-claim check run at the move's own frame for all plans.
- [false-teaching] Moves narrated as the wrong side's, or one ply late
    WHERE: src/data/middlegame-plans.json: mp-pronaroRoss-g6-endgame (40521) annotations[5]/learnCues[5]; mp-pronarocaro-advance-bf5-endgame (41741) annotations[7]/learnCues[7]; mp-proericstafford-nc3-openh (58137) annotations[2]/learnCues[2]; mp-proamansiciliankan-maroczy (67109) annotations[5]/learnCues[5]; mp-ruylopez-open-endgame (25166) annotations[18],[19]
    EVIDENCE: chess.js replay of each line: Rac1 is WHITE's move (a1→c1; the student is White) narrated '...Rac1 — Black's rook joins the c-file battery'. Nc1 is White's knight retreating b3→c1 (Black's knight sits on a2) narrated '...Nc1! — KEY SQUARE c1. The first knight delivers, raiding White's back rank'. O-O-O is WHITE castling (Ke1→c1; Black's king still on e8) narrated 'Black castles long — … the a8-rook is now ready to follow its partner toward the white king'. Nb3 (d4→b3) captures nothing, narrated 
    FIX: Rewrite the four beats with the correct mover and action; move the Ruy Open sentence to index 18 and give index 19 its own line.
- [false-teaching] Two plans teach the opponent's side to the student
    WHERE: src/data/middlegame-plans.json mp-ruylopez-f4 (line 24521, shown on ruy-lopez main tab, student White); mp-progothamchess-pirc-austrian-c5 (line 51582, shown on pro-gothamchess-pirc-defense main and f4 tabs, student Black)
    EVIDENCE: Ruy f4: overview 'When White lashes out with an early f4 … Black does not panic — Black takes (…exf4), strikes … with …d5, and liquidates … White's aggression having achieved nothing'; every pawnBreak/pieceManeuver is a Black move (…exf4, …d5, …Nd7/…Na5, …Rd8); in Learn (PlayableLinePlayer orientation = opening.color = white) the student plays White's d3, Bxf4, dxe4, Qxd8 while ann[8] says 'White's f4 lunge gained nothing'. Pirc: ann[6] on WHITE's O-O says 'O-O — so do you'; the declared break '
    FIX: Re-seat both plans: rewrite the Ruy f4 plan for White (or move it to a Black opening) and rewrite the Pirc plan with you = Black.
- [false-teaching] Tile overview/title describes a position the plan never reaches
    WHERE: src/data/middlegame-plans.json: mp-budapestgambit-main (2439) title+overview; mp-carokann-advance (2587) overview; mp-fourknightsgame-rubinstein (6814) overview; mp-fourknightsgame-main (6678) overview + annotations[7]; mp-qgd-main (21202) overview; mp-scandinaviandefence-portuguese (26503) overview
    EVIDENCE: Board-checked anchor and every frame of the line. Budapest: anchor rnbqkb1r/pppp1ppp/5n2/4p3/2PP4/8/PP2PPPP/RNBQKBNR w (move 3, gambit just offered); title 'Budapest: Activity Around the e5-Knight', overview 'Black has recouped the pawn … a strong knight on e5'; line dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 ends with a WHITE pawn on e5, no Black knight there, Black still a pawn down. Caro Advance: 'after …c5 and …cxd4 cxd4: the c-file is fully open … the knight on c6, the queen on b6' but the anchor h
    FIX: Re-anchor each plan at the position its text describes (from the opening data), or rewrite the text from the current anchor and line.
- [false-teaching] Bishop-pair claims where the named side does not hold two bishops
    WHERE: src/data/middlegame-plans.json mp-antitrompowsky-black-queenside-expand (77393) overview + annotations[0],[1],[6],[7]; mp-evansgambit-endgame (53334) annotations[9]; mp-pronaroAlapin-d5open-endgame (17169) annotations[4]; check scope at src/data/proRepPlanAccuracy.test.ts (PRO filter)
    EVIDENCE: Counted bishops on the board after each claiming move. Anti-Trompowsky: Bxd6 captures a Black BISHOP and …Qxd6 recaptures, leaving White 0 / Black 0 bishops, yet 'you recapture and keep the two bishops', 'the bishop pair now yours for the long game', 'more lines for your bishop pair', 'with the two bishops'. Evans endgame: 1 v 1 after Bxb7, 'White is up material with the bishop pair'. Alapin d5-open endgame: 1 v 1 at a4, '… + bishop pair'. Applying proRepPlanAccuracy's own rule (a pair claim nee
    FIX: Rewrite these beats from the bishop count; extend the bishop-pair check to all plans and evaluate it at the claiming move's frame.
- [false-teaching] Three claims the fact-check gate already flags as false still ship under its baseline
    WHERE: src/data/narrationFactCheck.test.ts:335,337,338; src/data/middlegame-plans.json mp-kings-gambit-open-f-file (10190) annotations[4]/learnCues[4] + title; mp-viennagame-vs-nc6 (32895) annotations[6]/learnCues[6]; mp-frenchdefence-winawer (8425) annotations[4]/learnCues[4]
    EVIDENCE: King's Gambit: …Bh3 attacks only the f1 rook (one target), narrated '…Bh3 forks the rook on f1' / 'fork the f1-rook'; the title 'Open f-file pressure after fxe5' names a move that never happens (Black took on f4); the student ends the line down the exchange (material 32 v 35) at -1.3 (Stockfish depth 18) while ann[7]/[8] promise the f-file swarm. Vienna: after Nd5 the d8 queen guards c7 and Black has castled (king g8), so 'threatens Nxc7 winning the rook' is false (Nxc7 Qxc7). Winawer: Bd3 'eyes
    FIX: Rewrite the three beats (and the KG title), then delete those three baseline keys; keep the Italian key documented as a checker false positive.
- [broken] Plans shown on the wrong tab: their anchor is the end of a different tab's line
    WHERE: src/services/italianMasterclassTabs.ts:14; src/services/queensGambitMasterclassTabs.ts:8,11; src/services/pircMasterclassTabs.ts:17,25; no resolver for pro-hikaru-* / pro-aman-* (fallback at src/components/Openings/OpeningDetailPage.tsx:1712); plans e.g. mp-italiangame-modern (9279), mp-queensgambit-slav (21570), mp-pircdefence-austrian-e5 (13332), mp-pro-hikaru-nimzolarsen-d5 (58902)
    EVIDENCE: Ran OpeningDetailPage's exact 84-resolver chain plus fallback with tsx over all 857 tabs, took the line the student watches on each tab (LessonScript longest beat, its last beat, and the JSON pgn) and compared with each shown plan's criticalPositionFen: 51 (tab, plan) pairs anchor exactly at the end of ANOTHER tab of the same opening. Italian main shows mp-italiangame-modern = end of the 'Closed Italian with a4/Ba2' tab (that tab shows no plan). QG 'Slav' shows mp-queensgambit-slav = end of the 
    FIX: Map each plan to the tab whose line it ends (fix the three resolvers) and add tab resolvers for the Hikaru and Aman pro openings.
- [broken] Plans anchored at a position the tab's line never reaches (Gate C)
    WHERE: src/data/middlegame-plans.json, 50 (tab, plan) pairs / 48 plans, e.g. caro-kann#Advance mp-carokann-advance (2587), queens-gambit#main mp-queensgambit-minority (21436), pro-caruana-italian#main mp-pro-caruana-italian-pianissimo, dutch-defence#Classical mp-dutchdefence-classical; resolver comment src/services/queensGambitMasterclassTabs.ts:5-6
    EVIDENCE: Per-tab replay as above plus a bounded search (up to 8 plies, moves that land a piece on its anchor square plus 2 free moves) from the longest-beat end, the last-beat end and the pgn end: no continuation, and the anchor is not the end of any other tab. Hand-checked: the Caro Advance lesson ends after …cxd4 Nxd4 … Ng6 (move 11) while the anchor keeps the c6/c3 pawns with …Ba5/…Nd7 at move 8; the QG main lesson is the Orthodox …dxc4 Bxc4 Nd5 line but the plan is a Carlsbad minority-attack position
    FIX: Re-anchor each plan at its tab's line end (or extend the line to the anchor with engine-screened moves) and re-derive the playable line from there.
- [broken] Plans rewind the board to an earlier point of the line the student just watched
    WHERE: src/data/middlegame-plans.json, 71 (tab, plan) pairs / 68 plans, e.g. budapest-gambit#main mp-budapestgambit-main (2439), qgd#main mp-qgd-main (21202), four-knights-game#main mp-fourknightsgame-main (6678), italian-game#Evans Gambit mp-italiangame-evans (8874), scotch-game#Four Knights mp-scotchgame-fourknights
    EVIDENCE: The anchor equals an interior position of the tab's watched line — not its end, not the last beat's position, not the pgn end: Budapest main at ply 4 of 24, QGD main ply 8 of 36, Four Knights main ply 6 of 22, Italian Evans ply 6 of 20, Scotch Four Knights ply 8 of 24, Slav main ply 8 of 23. Overall 80 middlegame plans are anchored at fullmove 7 or earlier (Budapest move 3, Four Knights move 4) — opening positions, contrary to G9.3 Gate B/C (plan picks up at the spine's terminal middlegame posit
    FIX: Re-anchor each plan at the terminal of its tab's line and rebuild its playable line from there.
- [broken] The Gate C test cannot see any of these continuity breaks
    WHERE: src/data/middlegamePlanContinuity.test.ts:41-45 (allEntries), 53-67 (minPawnDiff); src/data/middlegamePlanContinuity.baseline.json
    EVIDENCE: minPawnDiff() accepts an anchor whose PAWN skeleton is within 3 of ANY ply (from ply 0) of ANY JSON line of the opening; it ignores pieces, the tab the plan is shown on, and the LessonScript the student actually watches (lesson spine differs from the JSON pgn on 237 of 814 lesson tabs), and gambits.json is not loaded. Measured: mp-budapestgambit-main passes at pawn-diff 0 against main-line ply 4; mp-italiangame-modern passes as the exact end of a variation line although it is shown on the main t
    FIX: Compute the tab-to-plan mapping with the real resolvers and require anchor == terminal of that tab's watched line (or a short, verified continuation); load gambits.json; fix the baseline count.
- [broken] Coach grounding block feeds the model 'undefined — undefined' pawn breaks and manoeuvres
    WHERE: src/coach/sources/middlegamePlan.ts:86-95; src/coach/envelope.ts:962-970; src/data/middlegame-plans.json 151 plans with string pawnBreaks/pieceManeuvers (e.g. mp-albincountergambit-main, line 3)
    EVIDENCE: tsx run of loadMiddlegamePlanForLive({openingName:'Albin Countergambit'}) + formatMiddlegamePlanSubBlock printed '• undefined — undefined' twice under 'Pawn breaks (2)' and '• undefined undefined — undefined' twice under 'Piece maneuvers (2)', followed by 'When recommending a pawn break or maneuver, prefer one from this list.' Seven masterclass openings resolved by name do this (albin, philidor, petrov, trompowsky, nimzo-indian, two-knights, schliemann; 8–13 'undefined' each). The JSON holds 183
    FIX: Normalise the data to one shape (or map string entries in the loader) and add a gate that type-checks plan fields.
- [broken] Master-zone read-aloud speaks the word 'undefined' on 14 Carlsen pages
    WHERE: src/components/Openings/OpeningDetailPage.tsx:2163-2165; src/data/middlegame-plans.json 36 plans with no overview (all mp-procarlsen-* / mp-carlsen-*, e.g. mp-carlsen-kg-d4 line 69368)
    EVIDENCE: Built the exact string the header passes to speakText for pro-carlsen-kings-gambit and ran sanitizeForTTS with tsx: 'Central Domination for the Gambit Pawn. undefined'. All 36 plans render on a tab (tabHasPlans true), so the header is live. The same header reads every plan of the opening, including ones hidden from the page (openingPlans is unfiltered).
    FIX: Author the 36 overviews and skip empty fields when building the read-aloud text.
- [broken] 417 of 425 authored plan intros are never spoken or shown
    WHERE: src/data/middlegame-plans.json playableLines[0].intro on 417 plans (e.g. mp-alekhinedefence-scandtrans, line 1057); src/types/index.ts:472; src/components/Openings/PlayableLinePlayer.tsx:241,262,280,294,331; src/services/dataLoader.ts:789-798
    EVIDENCE: Shape census: intro is a bare string on 417 lines and an object {say,sayShort,arrows,highlights} on 8. The player reads line.intro?.say / ?.arrows / ?.highlights, which are undefined on a string, so the Watch intro beat falls to the silent 800 ms advance. The seed normaliser only backfills pawnBreaks/pieceManeuvers/strategicThemes/endgameTransitions. Authoring scripts write strings (scripts/tmp-adams.mjs line 54: intro:"Black answers 6.g3 …").
    FIX: Convert the 417 strings to {say} and gate the field's type.
- [broken] Six Ruy Lopez 'endgame' plans never play an endgame move
    WHERE: src/data/middlegame-plans.json mp-ruylopez-berlin-endgame (22463), mp-ruylopez-breyer-endgame (22914), mp-ruylopez-chigorin-endgame (23437), mp-ruylopez-exchange-endgame (24265), mp-ruylopez-open-endgame (25166), mp-ruylopez-zaitsev-endgame (25610)
    EVIDENCE: playableLines[0].fen is the initial position while criticalPositionFen is a mid-game position; replaying the line reaches criticalPositionFen exactly at its LAST frame (16/24/28/13/20/24 plies), so the line is the opening walk-in and none of the declared breaks/routes (e.g. Berlin 'f4', 'g4', 'Nb1-c3-e4', 'Rf1-d1+') is ever played. Breyer/Chigorin/Zaitsev anchors still hold all 32 pieces; 21/24, 24/28 and 21/24 plies have empty annotations. Play starts from criticalPositionFen (OpeningDetailPage
    FIX: Start each line at criticalPositionFen and play the endgame technique from a real game of that variation (or reclassify them as middlegame plans).
- [broken] Themes gate ignores the student's colour for 348 of 578 plans and passes lines by coincidence
    WHERE: src/data/middlegamePlanThemes.test.ts:40-41 (colorMap), 58-70 (goalSquares), 90 (isStudent); src/data/middlegame-plans.json mp-kings-gambit-open-f-file (10190), mp-ruylopez-berlin (22268)
    EVIDENCE: pro-repertoires.json is {players, openings}, so Array.isArray(proRaw) is false and no pro/anti/gambit opening gets a colour: for 348 plans any move counts as a 'student move'. Goal squares include route ORIGINS and accept any piece: mp-kings-gambit-open-f-file passes because White's c-PAWN lands on c3 (from 'Nb1-c3-d5'); the declared h4 / Be3 / Nc3-d5 are never played. mp-ruylopez-berlin passes because White's BISHOP lands on f4 (from 'f2-f4-f5'); …h5 stops g4 and neither break is played, and it
    FIX: Read pro-repertoires.json .openings (plus anti-openings and gambits) for colours, drop route origins, and require a pawn for breaks and the named piece for manoeuvres.
- [rule-violation] Spoken plan text carries engine numbers, percentages, ratings and game counts (V8)
    WHERE: src/data/middlegame-plans.json annotations/title/overview in 134 plans, e.g. mp-pircdefence-austrian-e5 (13332) annotations[7], mp-carokann-tartakower (3458) annotations[7], mp-pronaroAlapin-d5open-endgame (17169) overview, mp-progothamchess-ponziani-d4-thrust (16178) overview
    EVIDENCE: 201 regex hits on spoken surfaces (annotations are spoken in Watch; title + overview are read aloud by the Master header): 'Plus one point four for Black on the engine', 'A fifth of a pawn to White', 'a third of a pawn shy of equal', '27.4%', '(vs Shankland 2934)' in titles, 'seven games at this node, four wins to one'. sanitizeForTTS leaves them intact ('The engine is blunt -0.3 here' and '27.4%' unchanged); it does strip move numbers ('4.f3' → 'f3'), so V9 holds in speech.
    FIX: Rewrite these lines in words (V8) and add a numbers check on plan text.
- [rule-violation] Plan narration attributes the teaching to a person (F0d)
    WHERE: src/data/middlegame-plans.json 64 plans, e.g. mp-pronaroKIA-reti-attack (34167) overview, mp-progothamchess-ponziani-d4-thrust (16178) overview + annotations[7], mp-progothamchess-vienna-gambit-main annotations[7], mp-pronaroRoss-bd7-conversion overview + annotations[5]
    EVIDENCE: 70 phrases on spoken surfaces: 'Twenty-five of his games reach the d5-c5 tabiya … seventeen wins against seven', 'The thrust position his corpus holds directly', 'four wins in five in his corpus', 'in his games from this position', 'the little clamp his games play here'. Game citations like '(Giri–Carlsen)' are allowed and were not counted.
    FIX: Rewrite as the coach's own teaching; keep only credits for specific games.
- [orphan] 30 plans never render on their opening page
    WHERE: src/data/middlegame-plans.json; resolvers e.g. src/services/queensGambitAcceptedMasterclassTabs.ts (main → mp-qga-main only), src/services/italianMasterclassTabs.ts:13; picker path src/components/Coach/CoachTeachPage.tsx:4659
    EVIDENCE: tsx evaluation of all 857 tabs: never shown are 16 '-endgame' plans the resolvers omit (mp-qga-main-endgame line 57798, mp-nimzoindian-main-endgame, mp-queensindian-main-endgame, mp-semislav-main-endgame, mp-oldindiandefence-main-endgame, mp-petrovdefence-main-endgame, mp-twoknightsdefence-main-endgame, mp-albincountergambit-endgame, mp-budapestgambit-endgame, mp-evansgambit-endgame, mp-kings-gambit-endgame, mp-benkogambit-endgame, mp-pronaroKID-saemisch-endgame, mp-prosamayItalian-endgame, mp-p
    FIX: Wire the 16 endgame plans into their tabs' resolvers; delete the 14 superseded plans (with a seed revision bump so the G8 prune removes them from devices).
- [orphan] Dead plan-service exports, unread data fields and an unreachable study screen
    WHERE: src/services/middlegamePlanService.ts:14,21,28,35; src/data/middlegame-plans.json fields typicalMistakes (7 plans) and plan-level sources (6 plans); src/components/Openings/MiddlegamePlanStudy.tsx via OpeningDetailPage.tsx:1517-1525
    EVIDENCE: getPlanById/getAllPlans/storePlans/countPlans have no caller outside middlegamePlanService.test.ts. `typicalMistakes` (mp-bird-stonewall-formation, mp-kings-gambit-bishop-pair-attack, mp-kings-gambit-open-f-file, mp-marshallattack-rooklift, mp-smithmorragambit-pressure, mp-viennagambit-storm, mp-scotchgambit-reroute) appears nowhere in src. Plan-level `sources` (e.g. mp-carokann-main-endgame) is read nowhere and is not in the MiddlegamePlan type. MiddlegamePlanStudy's only call site is the no-pl
    FIX: Delete the four exports and their tests, the two unread fields, and the unreachable fallback branch/component (or wire them if wanted). Not deleted here: this audit stage is read-only.
- [orphan] Superseded one-off plan generators would overwrite current data if re-run
    WHERE: scripts/pro-repertoire/build-alapin-plans.mjs:285; scripts/pro-repertoire/rebuild-alapin-plans-hand-authored.mjs:336; scripts/pro-repertoire/rebuild-alapin-plans-spine-anchored.mjs:338; scripts/tmp-adams.mjs, scripts/tmp-dcl.mjs, scripts/tmp-fkr.mjs, scripts/tmp-triage.mjs
    EVIDENCE: Each of the three Alapin scripts drops every 'pro-naroditsky-alapin' plan and writes ids that no longer exist (mp-pronaroAlapin-bc2-reroute, -d5open-nb5-fork, -queenside-crawl…); only rebuild-alapin-plans-final.mjs matches the 16 live ids. The tmp-* scripts are unreferenced one-off patchers that rewrite middlegame-plans.json and model-games.json (tmp-adams re-anchors mp-siciliannajdorf-6g3 to a FEN the live plan no longer has). No package.json, workflow or script references them (two Alapin scri
    FIX: Delete these seven scripts (keep rebuild-alapin-plans-final.mjs). Not deleted here: this audit stage is read-only.
- [minor] 176 authored arrows are silently refused; lead-the-eye is only gated on first-class openings
    WHERE: src/services/middlegamePlanner.test.ts:306-307; src/services/arrowDoor.ts:130-169; 121 plans in src/data/middlegame-plans.json (e.g. mp-pro-gothamchess-carokann-c5 annotations[5])
    EVIDENCE: Applied the door's refusal rules on the Watch board (after move i): 176 of 495 authored arrows are refused (164 'no-piece', 12 'no-sight'), all in pro/anti/gambit plans, e.g. the Qd5 move arrow d8-d5 coloured green is checked as a named move on the after-board where d8 is empty. assertLeadEye runs only for FIRST_CLASS_OPENING_IDS.
    FIX: Colour move arrows orange (or drop them) and run the lead-the-eye check on every plan.
- [minor] Notation and pronoun slips in plan text
    WHERE: src/data/middlegame-plans.json mp-ruylopez-breyer (22781) annotations[5] + learnCues[5]; mp-budapestgambit-fajarowicz (82346) overview
    EVIDENCE: '…Bxb3 — the bishop recaptures …' uses Black's ellipsis for White's move (chess.js colour w); 'Let's be honest about the Fajarowicz' uses 'us' (V1).
    FIX: Write 'Bxb3' and drop 'Let's'.

## audit:Openings — gems and traps:B (21)
coverage: Checked (read-only):
- All 344 punish-gems and 45 gambit gems:
  - chess.js legality and canonical SAN
  - playLine equals lineMoves + inaccuracy + punishSeq, and punishSeq[0] equals punish
  - database anchor of 6+ plies
  - orientation against the opening's student colour
  - narration array alignment, and the inaccuracy and punish named on their own plies
  - every narrated line's opening move 
- [false-teaching] 15 of the 69 trap-bar gems do not win a piece at depth 18; the bar reads a stale playout eval
    WHERE: src/data/lessons/punishGems.ts:71-73 (isWeaponGem reads stored engineCp); src/data/punish-gems.json and src/data/gambit-punish-gems.json rows below; keeper table in docs/plans/2026-10-07-gem-bar-recheck.md
    EVIDENCE: Stockfish 18 (node_modules/stockfish/bin/stockfish-18-single.js), go depth 18, punisher's point of view. A = position after the slip, punisher to move. B = position after the stored punish, defender to move. Stored engineCp in brackets.
- vienna-game and vienna-gambit ...Nb5:Qf6: A=227, B=245 [329/316]
- vienna-game and vienna-gambit ...Bb3:Qf6: A=259, B=261 [304/300]
- vienna-gambit ...Qd5:Qg5: A=267, B=238 [357]
- vienna-game ...Qd5:Qg5: A=267, B=284 [361]. The engine's best is Nxc7+, not the 
    FIX: Grade each weapon at the slip position against best defence (F04 says 'forced'), store that number, and gate isWeaponGem on it. Demote these gems to known mistakes, or teach them as conditional patterns. Fix the why/punish wherever the engine's best move differs.
- [false-teaching] Trap-gem narration states false material counts and pieces that are not on the board
    WHERE: src/data/lessons/punishGemNarration.ts:2324, 5203, 1870, 1898, 2976, 4115, 4376, 4844, 4919, 4786, 1451; src/data/lessons/gambitGemNarration.ts:76, 121, 124, 148, 160
    EVIDENCE: Each playLine was replayed with chess.js and the board read at the narrated ply.
- ruy-lopez ...dxe5:Bc5, at Bxd5: says 'hitting the e4-knight and the a8-rook'. A black knight on c6 blocks a8 (FEN r1b1k2r/2p2ppp/p1n5/1pbBP3/4n3/...).
- pro-aman-ruy-lopez ...dxe5:Bc5, at Bxe4: says 'now up multiple pawns'. Pawns are 6 v 6; White is a knight up.
- vienna-game ...Qh5:g6, at Qxe5+: says 'skewer the knight on e4'. The queen checks e8 and hits e4 on opposite sides, which is a fork (its own learn cue s
    FIX: Rewrite each line to match its board. Add a gem-narration gate that checks material phrases ('N up', 'even', 'the exchange') against the capture ledger at that ply, and checks piece-on-square, pin target and fork-vs-skewer claims with chess.js.
- [false-teaching] Gem narration names a different move than the one on the ply
    WHERE: src/data/lessons/punishGemNarration.ts:4959 (pro-samayraina-italian ...O-O:d5, watch[18]); :5273 (pro-aman-reti ...Re1:Bd6, watch[15], watch[20])
    EVIDENCE: For each narrated line that opens with a move, that move was compared with playLine[i].
- pro-samayraina-italian: watch[18] says 'Nxe7 - trading into a near-decisive grip' on the move Re1. Nxe7 is ply 20.
- pro-aman-reti: watch[15] says 'Bh7 - the bishop flees to the corner' on ...Bg6, and watch[20] says 'a4 - gaining space' on Rb1.
Both gems are trap-bar weapons, so these lines are spoken in Watch and in the trap menu.
The same check finds 31 more misaligned lines in non-trap gems (latent today
    FIX: Re-author these lines on their own plies. Extend the alignment gate so that a line opening with a move must open with that ply's move.
- [false-teaching] Named Vienna, Italian and Ruy 'weapon' trap lessons are not traps by the engine
    WHERE: src/data/lessons/viennaTrapLessons.ts:705-713 (VIENNA_TRAP_DEFS kind 'weapon'), :126, :211, :386; src/data/lessons/italianGameTrapLessons.ts:91, :60; src/data/lessons/ruyTrapLessons.ts:180, :50, :58
    EVIDENCE: Depth 18 at each lesson's final position, White's point of view (the student plays White):
- hamppe-allgaier: -132
- hamppe-muzio: -277
- steinitz-gambit: -13
- frankenstein-nxa8: +81 (its own text says 'Theory: equal.')
- wurzburger: 0, best ...Nxh1, against the text 'the trap is utterly decisive'
- fried-liver: +102 with White a knight down for a pawn, against 'at club level this attack is simply winning'
Ruy Tarrasch: after 10...O-O White's best is h3 at +21. After 11.Nd4, Black's 11...Nxe5 h
    FIX: Reclassify them as gambit or pattern lessons, not weapons or traps. Per the F04 note, teach each with its conditions (Tarrasch: the losing move is ...Qd7, not castling). Remove the 'decisive', 'crushing' and 'winning' verdicts the engine does not support.
- [false-teaching] 'Pierce Gambit' lesson is misnamed, leaves the database, and lets Black's queen hang for two moves
    WHERE: src/data/lessons/viennaTrapLessons.ts:477-560 (pierce-gambit; title line 487, say lines 495 and 525)
    EVIDENCE: openings-lichess.json names e4 e5 Nc3 Nc6 f4 exf4 d4 'Vienna Gambit, with Max Lange Defense: Steinitz Gambit'. The Pierce Gambit there is e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 d4.
The lesson leaves the database at ply 7 and plays 5...Qxd5 6.Nf3 Bg4. Black's queen stands en prise to Nc3xd5 after both moves (chess.js: Nxd5 is legal at beats pg4 and pg6). Depth 18 at pg4: +644 for White, best move Nxd5.
The narration says 'the Nc3 has been ATTACKING the d5-queen ... Black must move the queen', while White n
    FIX: Delete the lesson (G3: the line is not in the database and it is mislabeled), or rebuild the real Pierce line from openings-lichess.json.
- [false-teaching] Other false board claims in the registered Vienna and Italian trap lessons
    WHERE: src/data/lessons/viennaTrapLessons.ts:427, 450, 457-458, 471 (copycat-qg4); 586-629 (steinitz-gambit); 182, 203, 210-211 (hamppe-allgaier); 287 (hamppe-muzio); 119 (wurzburger); src/data/lessons/italianGameTrapLessons.ts:59
    EVIDENCE: Checked with chess.js on each beat's board.
- copycat-qg4:
  - 'Qxf2+ would be checkmate ... no escape squares': after ...Qxf2+, Kd1 is legal.
  - 'Kd1!! a brilliant in-between move': Kd1 is the only legal move.
  - 'the Black queen is trapped': it has 9 moves, including Qxd5, Qxc4 and Qxb2.
  - 'Kf8 ... removing the rook target': the king moved, not the rook.
  - 'Nd5 supported by the Qf3 and the c2/e4 pawn duo': the e4 pawn blocks Qf3 from d5, and c2 does not cover d5.
- steinitz-gambit:
  - '
    FIX: Rewrite the beats to match their boards. Add pin, fork-vs-skewer, mate and only-move checks to the lesson accuracy gate.
- [false-teaching] Trap and warning line explanations contradict their own PGNs, and several PGNs contain unrelated one-move blunders
    WHERE: src/data/repertoire.json:1494, 1499, 1504, 2284, 862, 2617, 1099, 3108; src/data/gambits.json:274-288; src/data/pro-repertoires.json:4406, 4576, 5510. Explanations are shown on warning tiles (OpeningDetailPage.tsx:2426-2427), and trap names are spoken in the coach's opening-traps answer (coachApi.ts:4403-4405)
    EVIDENCE: Each PGN was replayed with chess.js and engine-checked at depth 18 at its end.
- petrov 'Nxf7 Refutation': there is no Nxf7 in the PGN. The text says 'instead of the main 3.Nxe5', but the PGN plays 3.Nxe5. 'The queen invades to e1 with check' is not in the line.
- petrov 'Wrong Move Order Punishment' (a trapLine, i.e. a student weapon): it starts with the student's own 3...Nxe4?. The text promises a queen trade and a 'drawable' endgame; the PGN has no queen trade and ends ...Qxa1+.
- petrov 'Ste
    FIX: Rebuild these lines from the database and engine, or delete them. Derive each explanation from its own PGN. Never ship a warning whose PGN contains an unrelated one-move blunder.
- [rule-violation] Positional lines filed as traps or warnings (F04: small edges are not traps)
    WHERE: src/data/repertoire.json:1427 (philidor), :857 (sveshnikov f5), :3108 (evans declining), :2540 (queens-indian 'Petrosian Counterblow', a trapLine); src/data/gambits.json:274-288 (three stafford warnings); src/data/pro-repertoires.json pro-carlsen-1e5 'Retreating ...Nf6 hands White the centre'
    EVIDENCE: Material outcome by chess.js, then depth-18 eval at the end, both from the student's point of view:
- philidor: 0 / -177
- sveshnikov f5: 0 / -186
- evans declining: 0 / -171
- stafford warnings: -1 pawn / -182, -182, -165
- carlsen-1e5 retreat: 0 / -180
As a trap: Petrosian Counterblow is a 38-ply middlegame line that ends mid-exchange at +245 (below +300), with no single slip that loses a piece.
    FIX: Move these to opening principles or pitfalls; per F04 they are not traps.
- [broken] Engine-proven mating trap is classified 'mistake', so the coach's traps answer drops it
    WHERE: src/data/trap-line-classifications.json:11; src/services/coachApi.ts:4399-4401
    EVIDENCE: trap-engine-verification.json stores 'pro-carlsen-1e5::Fishing Pole Trap' with cp 100000 (status keep). Depth 18 at the line's end finds mate for Black. The sidecar classifies it 'mistake', and coachApi's downgraded() filter removes it from the 'weapons you can spring' list.
    FIX: Reclassify it as 'trap'.
- [broken] Trap-menu chips: the 15 gambit traps teach nothing, and spoken masterclass lines repeat their move
    WHERE: src/data/lessons/gemTrapMenu.ts:25, :126, :134; src/components/Coach/CoachTeachPage.tsx:3609-3631
    EVIDENCE: teachableGems() lists gems through isSurfaceableGem, which counts GAMBIT_GEM_NARRATION. gemTeachingText() then calls getGemNarration, which reads GEM_NARRATION only. So all 15 surfaced gambit traps return null, and a tapped chip falls through to the generic router.
For the 54 masterclass traps, 343 of 357 spoken lines say their move twice, e.g. 'Bc5 - Bc5 develops...' and 'Qxd5 - Qxd5! Win the pawn...'. This text is spoken via speakComputed (V13).
    FIX: Use gemNarrationFor in gemTeachingText. Drop the move prefix when the line already opens with that move.
- [broken] The same trap appears twice in the walkthrough gem picker
    WHERE: src/services/gemCrushLines.ts:602-628 (gemsForPosition) and :660 (dedupe by gemId); duplicate rows in src/data/gambit-punish-gems.json
    EVIDENCE: Six slips exist in both gem files at the same position with the same punish, and all are trap-bar weapons:
- vienna-game and vienna-gambit, five pairs: ...Qh5:g6, ...Bb3:Qf6, ...Nb5:Qf6, ...Qf3:Nd4, ...Qd5:Qg5
- kings-gambit and gambit-kings-gambit: ...Nc3:Bb4
gemsForPosition returns both rows. bakeGemsIntoTree dedupes by gemId, which differs by openingId, so the picker offers 'Punish g6 with Qxe5+' twice. gemForChipLabelAnywhere returns null for these labels because they are ambiguous.
    FIX: Dedupe by position key + inaccuracy + punish, and delete the duplicate rows from the gambit file.
- [broken] Gambit gem tiers contradict their evals, which hides a gem that clears the trap bar
    WHERE: src/data/gambit-punish-gems.json (danish-gambit ...Nf6_Bxf7+:Ke7 plus 9 others); src/data/lessons/punishGems.ts:71-73; src/data/lessons/gambitGems.test.ts
    EVIDENCE: danish-gambit ...:Ke7 is tier 'positional' with engineCp 304, which is at least TRAP_BAR_CP, and it has narration. isWeaponGem requires tier 'confirmed', so it never surfaces.
Nine more gambit gems are 'positional' at 105-258cp. The miner's rule (mine-punish-gems.mjs:255) makes anything at +1.0 or more 'confirmed'.
punishGems.test.ts enforces this tier/eval rule only for punish-gems.json.
    FIX: Recompute tier from engineCp in the gambit file, and add the same tier assertion to gambitGems.test.ts.
- [orphan] Orphan: trap-line view modes are unreachable, so all 10 Naroditsky trap-lesson files are dead
    WHERE: src/components/Openings/OpeningDetailPage.tsx:342, :532, :283-285, :291, :293, :1143-1186, :1269-1312, :1385-1394, :1429-1437, :1449-1457, imports :131-160; src/data/lessons/proNaroditsky{Alapin,Alekhine,Caro,Fantasy,Jobava,KIA,KID,Najdorf,Rossolimo,Ruy}TrapLessons.ts (2,047 lines, 52 lessons)
    EVIDENCE: activeTrapLineIndex is only ever set to -1, and no code calls setViewMode with any 'trap-*' mode or 'train-traps' (grep).
The ten Naroditsky files are imported only by OpeningDetailPage. They are reachable only from those dead branches, or from the warning branch, which never matches because all 10 pro-naroditsky openings have 0 warningLines. In addition, 11 of the 52 lessons match no trapLine name at all.
42 of the 49 pro trapLines are classified theme or mistake, so wiring them back in as trap
    FIX: Delete the five dead branches, the activeTrapLineIndex state, the 'trap-*' and 'train-traps' ViewMode members, the ten pro-naroditsky arms in the warning branches, and the ten files.
- [orphan] Orphan keys in both trap classification sidecars
    WHERE: src/data/trap-line-classifications.json (27 of 76 keys); src/data/repertoire-trap-classifications.json (all 7 keys)
    EVIDENCE: 27 keys name pro trapLines that no longer exist, e.g. 'pro-gothamchess-italian::Fried Liver Setup' and 'pro-naroditsky-alapin::Nb5 Queen-Fork Trap (d5 Open)'.
All 7 keys in repertoire-trap-classifications.json name trapLines that are no longer in repertoire.json. Its only reader is scripts/audit-repertoire-orientation.mjs:52.
    FIX: Delete the orphan keys. Delete repertoire-trap-classifications.json and its read in the audit script.
- [orphan] Orphan: 20 gambit gems keyed to retired opening ids, plus one dead 'weak' gem
    WHERE: src/data/gambit-punish-gems.json; src/services/dataLoader.ts:636-642 (RETIRED_GAMBIT_DUPES)
    EVIDENCE: The loader deletes the openings gambit-kings-gambit, gambit-evans-gambit and gambit-budapest-gambit. Twenty gems still use those ids (12, 5 and 3), so no opening page or trap menu ever reads them.
- 7 of them duplicate kings-gambit masterclass gems.
- The 3 Evans weapons (...a4:d6, ...e5:Nxe5, ...cxd4:Bb4) are unique, but never appear on the evans-gambit page.
- They still fire by position in Learn, which causes the duplicates above.
Separately, one tier 'weak' row (gambit-kings-gambit ...Qh5_d4
    FIX: Re-key the unique gems and their narration to evans-gambit, kings-gambit and budapest-gambit. Delete the duplicates and the weak row.
- [orphan] Unused export PRO_NARODITSKY_KID_TRAPS_FOR_REPERTOIRE
    WHERE: src/data/lessons/proNaroditskyKIDTrapLessons.ts:253-257
    EVIDENCE: grep finds zero references in src/ or scripts/, tests included.
    FIX: Delete it (it goes with the Naroditsky-file removal above).
- [orphan] Orphan one-shot gem and trap migration scripts
    WHERE: scripts/migrate-trap-orientation-fix.mjs, scripts/finalize-traps.mjs, scripts/toss-invalid-traps.mjs, scripts/merge-mined-traps.mjs, scripts/complete-or-cull-traps.mjs, scripts/reval-flagged-traps.mjs, scripts/rewrite-samay-gems.mts, scripts/dump-samay-gems.mts, scripts/demote-empty-gems.mjs
    EVIDENCE: grep finds zero references in package.json, .github, scripts, src, docs or CLAUDE.md. Their headers describe finished one-off migrations, e.g. 'One-shot data migration', and toss-invalid-traps reads /tmp/decision.json, which no longer exists.
    FIX: Delete them.
- [rule-violation] Spoken gem narration uses numbers, gendered pronouns and a move number (V8, V2, V9)
    WHERE: src/data/lessons/punishGemNarration.ts, src/data/lessons/gambitGemNarration.ts (examples: sicilian-najdorf f3 'The engine calls it +4.6'; sicilian-dragon '(+3.4)', '(+4.1)', '(+3.8)'; evans-gambit d5 'five pawns' worth'; pro-caruana-ruy-lopez 'the engine reads +1.8'; vienna-game d6 'Black ignores his own queen'; caro-advance 'the best he can do'; petrov 'this 3.d4 line')
    EVIDENCE: A regex over every gem watch and learn line found:
- 32 lines that speak engine numbers (13 in trap-bar gems)
- 47 lines that use he/his/him for the opponent (9 in trap-bar gems)
- 1 move number
These lines are spoken by Watch (gemToPlayableLine), the trap menu (gemTeachingText) and the live reveal (findLivePunishment).
    FIX: Say evals in words, refer to the opponent as they/their, and remove move numbers.
- [rule-violation] Vienna lessons present unsourced teaching as Steinitz's or Lasker's (F0d)
    WHERE: src/data/lessons/viennaTrapLessons.ts:112, :126, :450, :471, :502, :586
    EVIDENCE: Examples:
- 'Steinitz's school called this principle the indirect refutation'
- 'his students at the Viennese club drilled this exact d5-square sequence'
- 'Steinitz used Qg4 ideas exactly like this to set up complete positional binds'
- 'exactly the same idea as Lasker's recommendation'
There are also pronoun artifacts: 'Steinitz themselves walked their king' (450), 'Steinitz brings their pieces out' (586) and 'Black thinks They're the one' (427).
    FIX: Remove the attributions or replace them with a real cited game, and fix the pronoun artifacts.
- [minor] QGA gem is filed under the wrong side
    WHERE: src/data/punish-gems.json, row qga:d4_d5_c4_dxc4_Nf3_Nf6_e3:Nc6
    EVIDENCE: The qga opening is a Black repertoire (repertoire.json color 'black'), but in this gem Black plays the slip ...Nc6 and White punishes. It is the only one of 389 gems with this inversion.
    FIX: Re-file it under a White-side opening id, or delete it.
- [minor] Trap-bar gem is below the miner's own frequency floor
    WHERE: src/data/punish-gems.json, row pro-gothamchess-caro-advance-white:e4_c6_d4_d5_e5_Bf5_h4_h5_Bg5:e6
    EVIDENCE: freqPct is 0.9, below FREQ_FLOOR = 2% (scripts/mine-punish-gems.mjs:41), yet the gem surfaces as a weapon. F04 requires a move the opponent actually plays at the student's level.
    FIX: Re-measure it at the student's rating band, or demote it.
