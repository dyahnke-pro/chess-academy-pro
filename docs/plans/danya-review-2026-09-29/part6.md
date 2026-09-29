I read part6.txt end to end: 57 videos, 1,851 beats. The per-video counts below are hand counts backed by grep, so treat them as approximate (±1–2).

## 1. Behaviours not in the 22

| Name | Definition | Videos | Examples |
|---|---|---|---|
| **ANTI-DOGMA** | Says a principle out loud, then overrules it for a concrete reason ("don't be a slave to the rule") | ~8 | kO4qTTR0B7o[34] "stay away from categorical thoughts"; ndNfx0HHcLk[15] "the general rule bows to the concrete point" |
| **AUTOPILOT-GUARD** | Before an "obvious" recapture or capture, checks for an in-between move or a better capture | ~12 | kYbh2NTFsS8[36] "never capture on autopilot"; mCzuNeWLYBs[39] check first, then fork |
| **GEOMETRY-TRIGGER** | "Whenever pattern X is on the board, look for Y" (IF board shape THEN look), not a general rule | ~9 | rgLTiUZAWQY[17] knight on g6 → h4–h5 traps it; mCzuNeWLYBs[20] king and queen a knight's move apart → find the fork square; pipfrQRET80[18] file opens → check on the 2nd/7th rank |
| **SAFETY-PRECHECK** | Before grabbing material, lists the grabbing piece's escapes or the opponent's desperado checks | ~5 | qhHtJcXkkfg[22] "list the queen's escapes"; o29kg7LLAVg[14] "no e-file mate first" |
| **SELF-POST-MORTEM** | Names his own blunder, shows the win he missed, sometimes retracts what he said during the game | ~8 | ktoa6lk6qNk[61–77] missed g4; rMNFLg1gLoI[16] "what I said in the game was wrong" |
| **CONVERSION-PROTOCOL** | Once ahead: develop, trade, don't overpress, make a passer, activate the king, watch for stalemate | ~10 | qW-mT-FbLnA[21–49]; rgLTiUZAWQY[61–85] stalemate watch; rk_9n_Kj6EE "diminishing returns" |
| **OPP-INTENT-READ** | "What did that move want? Where are their pieces heading?" — a pause before his own plan | ~7 | nbKeE_rF-Zc[18]; qfiO5HGBWWc[30] |
| **RE-EVAL/PIVOT** | When the structure changes, re-take stock and switch plan or target | ~6 | kqgaZ8Tfhyk[22] "how has it changed?"; n64LCdoBzaU[53] "when one plan has run its course" |
| **MOTIF-TRANSFER** | The same structure or plan recurs in another opening | ~9 | nSASokndzVQ[11] same as the Portuguese Scandinavian; rgLTiUZAWQY[23] identical to an Alapin structure |
| **PEDIGREE** | Names the player or game behind an idea, or tells a personal game story | ~14 | ngKFZPlhP2c[5] Tarrasch/Horowitz history; n781_V5I0ac[9] Petrosian–Pachman; nkDlJMpLezk: his 2005 and 2013 games |
| **IMAGERY** | A memorable metaphor for a piece or square | ~15 | ktoa6lk6qNk[40] "Atlas holding up the world"; qfiO5HGBWWc[28] "unanchored bowling pins" |
| **STYLE-CHOICE** | Offers near-equal options framed by temperament (peaceful vs fighting, "keep pieces for spice") | ~7 | oQmhJz4XF_k[6]; o12epkA2jeE[12] "you choose the fun game" |
| **BRANCH-DRILL** | After the game, a long "if White X → you Y" tree through the likely replies | ~8 | lryqtSMy4pY: 80 back-jumps in one video; rMNFLg1gLoI |
| **HUMAN-FACTORS** | Panic, fear of queen sacrifices, "pattern-spotting beats deep calculation", opening psychology | ~6 | lyUZn39V6TY[7] London players' psychology; o29kg7LLAVg[13] irrational fear of a queen sac |
| **STUDY-METHOD** | How to learn outside the game | ~5 | nkDlJMpLezk: analyse where the course stops; r7W4yl6y29c[32] calculate on your turn, think concepts on theirs; rk_9n_Kj6EE: how to decode an engine move |
| **CLOSING-TAKEAWAY** | Numbered "core points" at the end | ~6 | lLzLAJcRn-Q[16]; m6_i2xT7mgM[22] |
| **DEFINE** | Defines basic terms (pin, weak square, manoeuvre, double check) | 1–2, only at the ~1000 level | mCzuNeWLYBs |

## 2. Video-level arc

- **Game, then rewind (~20 videos):** name the opening and what people play at this level → recommend a line → play the middlegame → convert → rewind to the opening's key alternatives. 34 of 57 videos jump back in ply at least once.
- **Theory lecture (~6):** an extended branch tree (lryqtSMy4pY, lLzLAJcRn-Q, ngKFZPlhP2c, nkDlJMpLezk, rMNFLg1gLoI, rk_9n_Kj6EE).
- **Distilled principle-per-beat (~12):** fewer than 20 beats, and every beat is a lesson (lLkqjBOGgek, lyUZn39V6TY, n64LCdoBzaU, qlEZdH3nEZs, pipfrQRET80).
- **Linking moves into one story:** he uses "whole point" payoff callbacks. Examples: kYbh2NTFsS8[40] "the whole point of the last move"; m6_i2xT7mgM[30] the payoff of not pushing c5 earlier; lLkqjBOGgek[51] "the knight that waited becomes the hero"; n781_V5I0ac[9] "their downfall traced back to e6". Blame is traced back to a single causal move.
- **Density:** mostly one idea per beat. 19% of beats are 8 words or fewer (bare moves); these dominate mIzJ3LYZvKw (45 of 55) and pXBR9CxK3lQ (48 of 99). Only 2% of beats are 80+ words: multi-idea monologues clustered at critical moments or in the post-game.

## 3. Computable or authored?

- **Computable from engine + board:**
  - AUTOPILOT-GUARD: engine compares the zwischenzug to the plain recapture.
  - GEOMETRY-TRIGGER: pattern detectors (alignments, knight-fork squares, loose pieces, rim knights).
  - SAFETY-PRECHECK: mobility of the grabbing piece, opponent checks.
  - OPP-INTENT-READ: null-move / threat of the last move.
  - RE-EVAL/PIVOT: detect a change in pawn structure.
  - CONVERSION-PROTOCOL: triggered by the material/eval gap.
  - BRANCH-DRILL: DB + engine tree (the phrasing is templated).
  - MOTIF-TRANSFER: pawn-structure hash matched across openings.
  - CLOSING-TAKEAWAY: summarise the beats that fired.
  - STYLE-CHOICE: engine near-equal MultiPV + trade/imbalance delta. The framing needs the student's profile.
- **Partly computable:** SELF-POST-MORTEM (the engine finds the missed win; the admission is register). HUMAN-FACTORS (clock and rating are data; the psychology is authored).
- **Authored:** PEDIGREE, IMAGERY (a rotated phrase bank), STUDY-METHOD, ANTI-DOGMA (it needs the principle it overrides, though the override can be detected as engine disagreeing with a heuristic), DEFINE (templated glossary).

## 4. Refinements to the 22

- **HABIT is too coarse.** It is the largest family and should split into AUTOPILOT-GUARD, GEOMETRY-TRIGGER, SAFETY-PRECHECK and OPP-INTENT-READ — all of them engine-computable.
- **COND is a special case of ANTI-DOGMA.** The override is much more common than a pure "this pattern doesn't apply here".
- **RATING and FREQ are very common** ("at this level", "below 1600", "under 2200"). FREQ often comes paired with a quality verdict: qN8kNz0_c3s[16] notes the database's most popular reply is the worst of the three.
- **EVALHON shows up as live engine or book look-ups**, and he corrects himself on camera (o29kg7LLAVg, rMNFLg1gLoI).
- **ELICIT is rarer than expected** (~8 videos), and usually a rhetorical "how should you continue?" rather than a real pause.
- **RECALL (refrain) is weak within a single video.** Callbacks are causal ("the whole point", "traced back to") rather than repeated phrases.
- **TRANS vs MOTIF-TRANSFER:** TRANS as general analogy is less common than MOTIF-TRANSFER, which is structural, not rhetorical, and therefore computable.
- **TEMPT and ALOUD dominate the long beats.** Rejected moves are almost always refuted with a concrete short line.