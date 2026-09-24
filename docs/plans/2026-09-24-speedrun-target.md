# The target: two Naroditsky speedruns, read end to end (2026-09-24)

Sources (reference only, transcripts gitignored, never quoted): 700-Elo speedrun
`js6ZLkfXwEg` (Four Knights Scotch, won a piece, converted by passer) and
2300-Elo speedrun `SDIQje8v5SY` (Jobava London win + Accelerated Dragon loss).
Paraphrased teaching moves, each mapped to what we compute today.

## LOW ELO (700) — SAFETY and PRINCIPLE, asked as questions
| # | What he does | Ours today |
|---|---|---|
| L1 | Hanging check EVERY move, stated as the opponent's plan: "he wants to take the knight, then after we recapture our bishop is undefended — put it on a defended square" | `detectNewThreat` + stopped/incoming threat; we state the threat, not "he wants X, then Y" as a 2-step plan |
| L2 | Count: "two attackers, one defender — it falls" | `pressureCount` / `[count]` ✅ |
| L3 | Candidates as a question: "where does this bishop develop WITH TEMPO? two good squares, c5 and b4" | methodBeat candidates (tier-gated) — only at critical moments, never as "two good squares" |
| L4 | Principle + its EXCEPTION: "queen out early is bad — except when no knight can hit it"; "take toward the centre — with exceptions"; "one piece twice is fine here because it creates tension" | `[rule]` principle-once ✅; the EXCEPTION is never said |
| L5 | Take free material, never at random: "a hanging pawn that costs nothing — take it" | `[loose]` / grab — partial |
| L6 | ONE move, TWO jobs: "d5 guards the knight AND opens the bishop; if he trades queens, a pawn is a small price" | multi-effect missing (coverage #23) |
| L7 | Refuted alternative with reason: "f5 instead? doesn't develop the bishop and weakens the king — fine, not great" | `[refuted]` ✅ (cost only; "doesn't do job X" missing) |
| L8 | Strategy when AHEAD: two ways to win — attack with the extra piece, or trade; choose trade because his pieces are active ("trade before you blunder") | `conversionMethod` step ✅; the CHOICE and its reason missing |
| L9 | Future self: luft before the back rank bites | `[prophylaxis]` partial |
| L10 | Conversion: find the passer, remove the blockader, push | `conversionMethod` ✅ |
| L11 | What the opponent's structural move COST him: "c5 leaves a hole on d5, weakens d/c pawns, blocks his own bishop" | `[stopped]` covers threats only; structural cost of THEIR move missing |

## HIGH ELO (2300) — PLAN, VISUALISATION, METHOD
| # | What he does | Ours today |
|---|---|---|
| H1 | Name the opening's KEY IDEA: "Ne5 is the key idea of the Jobava — without it the setup is less than perfect" | opening named; key idea not computed |
| H2 | Refute the POPULAR WRONG answer: "Nb5 is harmless because of Rc8, not Qa5 — that's the common wrong answer" | refuted alt by frequency ✅; "the common wrong answer" framing partial |
| H3 | Hidden vulnerability: "the f5 bishop is in more trouble than it looks — g4, h4" | `latentDanger` partial |
| H4 | Visualise a line to its point: "Nxe5 dxe5 Nxg4 Bb5+ — the king must walk to e7" | line-as-proof (`proofCut`) ✅ |
| H5 | METHOD — don't panic, split the position into separate elements | missing |
| H6 | METHOD — three ways to meet a check: go through the boxes before calling mate | missing |
| H7 | METHOD — question the knee-jerk: "don't rush to win the pawn back — castle long, their pieces are undeveloped" | missing |
| H8 | Verdict by one clear comparison: "forget everything else, compare development" | `phaseVerdictLine` (≥1 reason) partial — lists reasons, doesn't pick THE one |
| H9 | METHOD — the wishlist: "what do I want? a rook on e8 → which LEAST valuable piece gets it there → Nc7" | missing |
| H10 | Use the lesser piece; keep the queen for the big job | missing |
| H11 | Maneuver plan: "Na3-c4-d6, the outpost cuts his position in two" | `lookaheadPlan` waypoints partial |
| H12 | Attentiveness to change: "that pawn just lost its supporter" | `[delta]` (describe) partial |
| H13 | Timing: transform the advantage once the improvements are made — "have I brought my pieces in? then switch to attack" | `moveTiming` partial |
| H14 | Opponent's plan as the battle: "everything revolves around d6" | `planRace` / opponent plan partial |

## The shape both share
~25–30 words per move. Lead with the QUESTION or the threat, then the reason,
then (if needed) a 2–4 ply proof. He talks about what the opponent WANTS far
more than what a piece EYES. Low Elo = safety + principle (+ its exception);
high Elo = plan + method. Same voice, different layer — exactly the layers
build. The biggest missing class across both is METHOD (L3 as habit, H5–H10).
