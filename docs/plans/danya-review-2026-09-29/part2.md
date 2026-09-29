Read all 1,628 lines of part2.txt: 40 video headers. EBVoRuZdlVY has no beats, and JXcULXtKu1Q has only one. FqVMAv3wKes (Ruy 1550) is pure move description with zero teaching, so treat it as a defective distillation. Counts below are out of the 38 usable videos and are hand counts from reading, except where marked as script-measured.

**1. Behaviours not in the 22**
- **FRAMEWORK:** a numbered checklist or taxonomy the student can reuse. Seen in 7 videos.
  - J6MDnL_B83w[26–27]: four ways to stop a threat (move it, defend it, interfere, counter-threat).
  - EfHnGTCO1s4[45]: two types of undefended piece. Also the two-factor pin test (EfHn[4], GwJ8[20], HAMh[27], ILYW[11]) and "three reasons White is better" (G_V3[13]).
- **LITMUS TEST:** one question that decides whether an idea works. 6 videos.
  - Fz0_pECE5vo[30]: "would you still play it if the threat vanished?"
  - HvrXmUORIcQ[47]: best-case/worst-case test. HVKBVYhxpEY[20]: the Greek gift needs g5 free.
- **CONTRAST:** two near-identical positions side by side, naming the one difference that changes the verdict. 9 videos.
  - J6MD[12]: the bishop on g5 instead of e2 makes …e5 fail. DspU9zQ6ff8[72–75]: "compare this position carefully." JKxl[1516]: "discerning that distinction is exactly what separates levels."
- **WHAT-CHANGED SCAN:** after a move, ask which squares were vacated, which files opened, and what the opponent's last move gave up. 7 videos.
  - Fz0[19] / JEMV[16]: "whenever a pawn advances it vacates a square." HiCe[6]: "take stock of what has changed." EPS5[22]: found the tactic "by evaluating the drawback of Black's previous move."
- **IDEA REVIVAL:** a plan that failed earlier is re-tested once the position changes. 4 videos.
  - JEMV[28]: "a move that failed a moment ago doesn't stay refused forever." HvrX[32]: "be stubborn — remove the obstacle."
- **MULTI-JOB COUNT:** counts a move's functions out loud ("two jobs", "three jobs at once", "kills two birds"). 12 videos. Examples: E0cM[16], GwJ8[25], ILYW[24], EfHn[40].
- **SELF-CORRECTION:** confesses and fixes his own mistake (miscalculation, mouse slip, "I wrongly said during the game"). 9 videos. Examples: EfHn[45–46], INCk[27–35], G_V3[13], FtTd[18], GwJ8[30]. This is different from EPIST: EPIST admits limits, this retracts his own move.
- **CONVERSION HEURISTICS:** rules for when you are up material (open the centre, keep developing, diminishing returns, take free stuff, go for mate rather than pawns). 8 videos.
  - HiCe[6]: open the centre when up a queen, keep developing. ILYW[27] / H0Fl[22]: the second pawn matters more than the third.
- **OPENING MAP:** places the line relative to other openings. 15 videos.
  - FtTd[9]: "a Pirc a tempo up". ILYW[9]: "a reverse QGD". Fz0[6]: "a Scandinavian as the wrong colour". GwJ8[6]: "an Alekhine with c3/c5 in". IaOX[5]: "Ruy-Lopez-style structure".
- **ANECDOTE / LINEAGE:** named games, players and history. 9 videos. Examples: EPS5[3] (the Soviet GM joke), JKxl[1499–1505] (losing to Gupta), H0Fl[22] (the Capablanca game), ILYW[3] (Trompowsky's name), JKxl[30] (Adams–Caruana 2009).
- **IMAGERY:** vivid one-liners. At least 14 videos. Examples: "bites on granite", "Frankfurt-airport move", "Jenga base", "medal for the wrong achievement", "layup vs three", "the sniper's post".
- **CANDIDATE EXHAUSTION / QUIET MOVE:** check every move of a type, and prize the non-forcing move. 5 videos.
  - GwJ8[6]: "look at EVERY knight move." Jt5b[49]: "quiet inclusions decide the game." G_V3[18]: "a sacrifice doesn't mean every move must be forcing."

**2. Video arc (the report has counts only where a script or hand count backs them)**
- **Backtracking:** 31 of the 38 usable videos jump back more than 4 plies. The shape is: name the opening, play the game, finish, then "let's go over it". The review returns to plies 3–10, branches into 2–6 alternatives (often with frequency or engine numbers), and returns to the game position. In the review-heavy videos (F7UD, G_V3, IEns, JKxl) the review is longer than the game itself.
- **Asides:** about 290 beats carry no move — lessons parked on a ply (script-measured).
- **Beat length:** 7 to 107 words per video average, typical around 30.
- **Mega-beats:** 10 videos squash whole middlegames into one 300–1,300-word beat. That is a distillation artifact, not his cadence.
- **Ideas per beat (my estimate):** about 60% carry one idea plus its reason, 30% carry two or three, and plain move-naming makes up the rest.
- **Returning to earlier ideas:** the same plan is re-invoked across plies (F7UD's f4/e5 plan, 5+ times; G_V3's knight to b5/c7 ×6). Mid-game ideas are also paid off at the finish (Jt5b: the dark squares weakened by h5 become the mating net).
- **Game to game:** he often links to previous videos ("in the previous game you faced…": F7UD, INCk, Jt5b[5]).

**3. Computable or authored**

| Behaviour | Computable? | Inputs / notes |
|---|---|---|
| WHAT-CHANGED | Yes | attack maps before and after the move |
| CONTRAST | Yes | two FENs + engine eval of the same move in each |
| MULTI-JOB | Yes | count attacks, defends, develops, controls, x-rays |
| LITMUS | Yes | null-threat re-eval; worst-case line from the engine PV |
| IDEA REVIVAL | Yes | re-test a previously refuted move with the engine |
| CONVERSION | Yes | trigger on material diff |
| CANDIDATE EXHAUSTION | Yes | enumerate one piece's legal moves; quiet move with top eval |
| FRAMEWORK | Partly | the categories need authoring; applying them is computable (defender counts, pawn shield) |
| OPENING MAP | Partly | structure/FEN matching across the opening database |
| SELF-CORRECTION | Review only | computable in post-game review (played move vs engine) |
| ANECDOTE, IMAGERY | Authored | phrase bank / corpus |

**4. Refinements to the 22**
- **More common than expected:**
  - COST and ORDER are pervasive (30+ videos).
  - FREQ comes mostly as engine or database citations.
  - Grading the opponent's moves out loud ("inaccuracy", "decisive mistake", "best move, no dispute") appears in about 25 videos. EVALHON should explicitly include this cpLoss labelling.
- **Rarer than expected:**
  - FEAR appears mostly as "nothing to fear / paper tiger" (8 videos).
  - RATING is said aloud in about 12 videos, usually to justify a choice of line, not to scale how much he says.
- **COND overlaps LITMUS.** Split them: COND = "this pattern doesn't apply here"; LITMUS = the reusable test that decides it.
- **PRACT has a sub-form, engine-vs-human:** "engine's top move is crazy, I recommend X" (F7UD, G_V3, IEns).