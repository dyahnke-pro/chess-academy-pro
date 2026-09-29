I read all 1,753 lines of part4.txt, which covers 68 videos. The counts below are rough tallies from my notes, not exact.

**1. Teaching behaviours missing from the 22**

- **RE-EVAL (the same move, a different verdict):** he rejects a move, then later endorses it because the position changed, or compares two nearly identical positions ("method of comparison"). About 9 videos. Examples: WQFc [24] "the very Bg4 I rejected earlier is now excellent"; YgMV [4] knight to d5 "big red X… circumstances changed"; _j8a [6]; Vy6j [16]; YXz0 [24].
- **TRIGGER→SCAN:** a board feature fires a named search. About 11 videos. Examples: TNaK [31] "the moment f3 is played, start looking for the typical tactic"; Ytkf [20–21] "whenever a pawn moves… queen and king on one diagonal → look for a pin"; Y-a6 [32] "two pieces a knight's distance apart → the fork should light up"; UXKY [11] "alarm bells".
- **PROCEDURE (explicit checklists):** SDIQ [18] "three ways to meet a check, tick all three boxes"; YgMV [4] "check both move orders"; Y-a6 [19] "look for their checks first"; Y-a6 [85] defensive fork; _X7t [32] "update your picture of the board after exchanges"; _4xb [32] "what if I just do it anyway?". About 7 videos.
- **MULTI-JOB:** he counts a move's purposes ("three jobs", "triple duty", "insurance policy"). About 9 videos. Examples: SV-y9 [56], _4xb [22], YgMV [11], bC5n [25].
- **TRANSFORM:** convert the advantage, or give material back ("space is like money", "kill your darlings"). About 8 videos. Examples: SXsV [7, 32], Wgl8 [15], TYKV [11], U7pq [10].
- **SIMPLIFY-WHEN-AHEAD:** take the rook, trade, choose the safe path, "collect the harvest". About 12 videos. Examples: WM0v [32], SDIQ [43], aoWD [32], bFLE [28].
- **TEMP/PERM:** sorts assets into temporary and permanent. About 4 videos. Examples: TSM7 [32–36], TPTu [5] "a development lead is dynamic; the f-pawn weakness is permanent".
- **TENSION:** "keep the tension, let them decide". About 5 videos. Examples: TSM7 [16], TYKV [17], WQFc [10].
- **INDUCE:** play a move to provoke the reply you want. About 6 videos. Examples: TSM7 [9] "Qa5+ induces Nc3"; aEKS [32] "drag the king toward the fire".
- **PLAN-REPAIR:** "modify rather than abandon". TSM7 [31–32], UVJ75 [26]. 3 videos.
- **BEST-CASE TEST:** "even if a4–a5–a6 all worked, …b5". UiNS [24]. Rare.
- **RULE-BREAK LICENCE:** permission to break a principle. About 9 videos. Examples: SV-y9 [31] "you're allowed not to castle"; U8zA [5] "at 1500 you start bending rules"; XzgnI [22]; WQFc [38] "how far a move retreats says nothing".
- **OPP-MODEL (intent reading and opponent psychology):** about 10 videos. Examples: YgMV [8] "what does my opponent want?"; W8Yp [6] "sizable chunks of time → unfamiliar"; RzfG [16] "London players hate Nc3"; Y-a6 [34].
- **CLOCK:** time as the deciding factor. About 6 videos. Examples: aCOx [44], UVJ75 [67].
- **VOCAB (coined terms):** glue move (U8zA, ZlIq), Pillsbury knight, collinear move (_X7t), type-two piece, LPDO, hook, umbrella, "bites on granite", "Russian schoolboy". About 15 videos.
- **LORE (history, people, games):** TNaK (Marshall 1917, Alexander), X6HE (Carlsbad), YzI6 (Fischer, Giri), bFLE (Esserman, Dubov, Shankland). About 8 videos.
- **SELF-CRITIQUE:** he names his own errors. TYKV [124], ac2e [40] "Rc1 was short-sighted", _X7t [61], WSEA. About 6 videos.

**2. Video-level arc**

- **Shapes:**
  - Game plus post-game replay: about 38 of 68. The ply numbers jump back and he re-walks the opening with sidelines.
  - A few selected beats with no replay: about 20.
  - Spectator games narrated off engine evals (_zT8, aHzb, _WmB, VkAq, _ZmP): 5.
  - Bare move dictation with no teaching (VeHy, Zko_): 2. They should be excluded as a source.
  - Pure theory tours (RzfG, parts of bFLE): 2–3.
- **Sequence:** the opening is named in the first 1–5 plies in about 55 videos. Then he states ONE governing plan question ("can White get e4 in?" SXsV; "everything aims at d4" aoWD). Middlegame beats refer back to that question. Conversion gets an explicit "technique" beat in about 25 videos.
- **Linking and recall:** the story is built around a thesis, a target square or a weak piece. Recurring refrains come back across plies, e.g. SDIQ's Bb5+ and g5 ideas return 4 times, and TYKV's h5 plan is revisited as a mistake.
- **Density:** during play it is usually 1 idea per ply (plus a bare move name on filler plies). Critical moments and post-game replays turn into 5–15 idea paragraphs (U8zA [30], YgMV [4], bFLE [1706]). So density follows the moment, not the ply.

**3. Computable, or needs authored content**

- **Computable from engine + board + detectors:**
  - RE-EVAL: engine verdict of the same move in two positions.
  - TRIGGER→SCAN: feature detector (f-pawn push, pieces aligned, knight distance) plus the tactic detector.
  - MULTI-JOB: count threats and defences before and after the move.
  - SIMPLIFY: material lead plus engine eval.
  - TENSION: whether a capture releases the tension, plus its eval cost.
  - INDUCE: forcing move plus the opponent's best reply.
  - BEST-CASE: engine playout of the student's plan.
  - PLAN-REPAIR: plan-race / computePvLine.
  - CLOCK: needs clock data.
- **Partly computable:**
  - PROCEDURE: the checklists are fixed templates, and whether a step applies is computed.
  - TEMP/PERM: material vs development vs structure classifier.
  - TRANSFORM: when the eval holds after giving material back.
  - OPP-MODEL: intent via null-move threat is computable; the psychology is authored.
  - VOCAB: detectors exist (collinear, loose piece, hook); the label is authored.
- **Authored:** LORE, RULE-BREAK licences, SELF-CRITIQUE.

**4. Refinements to the 22**

- **TRANS is far more common than expected, and it is mostly cross-OPENING mapping:** "Scandinavian of 1.d4", "Dragon on steroids", "reverse French", "Spanish on steroids", Benko-style, "same idea as the Scotch". About 20 videos. Much of it can be computed from structure and ECO similarity.
- **FREQ often comes with hard numbers:** 59% (RzfG), 30k vs 40 games (TPTu), 21k vs 2k (WSEA), 75–80% (_X7t). Result stats deserve their own slot.
- **EVALHON splits:** sometimes he openly overrules the engine ("engine calls it equal, White is comfortably better", Ybg_ [12]; KIA Kh1 "the engine will laugh").
- **ELICIT is heavy only in live-commentary videos** (SDIQ, U8zA, ZlIq, YgMV, _j8a). It is rare in the distilled beats.
- **FEAR usually comes as a method, "isolate the separate elements / don't hit the panic button"** (SDIQ [17], Y-a6 [17]). Treat it as a procedure, not reassurance.
- **RATING is mostly used to prescribe repertoire** ("don't play offbeat lines as Black until nearly master", Catalan "best left alone below master"), not to scale the explanation.
- **COND and RE-EVAL are the same move in his teaching, "circumstances changed".** That is his dominant way of stating a pattern's limits.