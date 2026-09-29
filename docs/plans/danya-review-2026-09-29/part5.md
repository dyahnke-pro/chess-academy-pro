I read part5.txt end to end: all 1,842 lines, 66 videos. Counts come from a keyword pass I then checked by eye. Treat them as approximate video counts, not ply counts.

**1. New behaviours (not in the 22)**
- **LOOSE** — lists the undefended ("type-two") pieces before calculating. Forgetting that a piece hangs at the end of a line is his named cause of miscalculation. ~28 videos. Examples: fz9td9L2uIo [32] "the knight on b5 is hanging… note all the undefended pieces"; d9qnuDDwiHQ [26] "what are the undefended pieces and pawns, how can you attack two at once?"
- **TERMS** — trade on your own terms: hold back the capture so the opponent has to take, or offer a trade while developing. ~12 videos. Examples: cmJbc_BzTp8 [13]; hBzXn8Kdaao [10]; hyAhvdIvtzQ [6].
- **REASSESS** — after a trade or a pawn push, ask which squares just opened or were given up. ~6 videos. Examples: fc8rxAMb7xI [31] "anytime you have a trade… what new squares"; h-9MlTRN-fk [27]; cmJbc_BzTp8 [35].
- **MIDDLEMAN** — "do I need the preparatory move, or is it only for safety?" ~8 videos. Examples: dowe5Oy7u_Y [21] "eliminate the middleman"; cmJbc_BzTp8 [47] "this is a safety move".
- **THRESH** — material decides method: up a piece, simplify hard; up a pawn, keep the open file. Also diminishing returns on extra pawns, and a queen trade is not a licence to drop principles. ~11 videos. Examples: bXAHcPB2hEk [20]; h-9MlTRN-fk [39]; hzotV0aslmY [28].
- **SELFCORR** — corrects himself on air: "stand corrected", "I overlooked", "mouse slipped". 6 videos. Examples: k4T6TJGOSA0 [40]; j2PgJHNFH0c [28].
- **XFER** — "this same motif appears in opening X / game Y", often with a historical game. Named-player or history references in ~21 videos; explicit cross-opening pattern transfer in ~7. Examples: cKeN_oR3VEA [17] (the QGD version of the trap); ieznxMQccW0 [19] (a 1996 Panov); iLiE-uWRfBc [10] (smothered mate in Caro and Shilling).
- **PSYCH** — play the person: gambiteers hate dry endgames; pick lines the opponent won't like. ~12 videos. Examples: hyAhvdIvtzQ [3]; dEjoCta8oOQ [6]; i8G7wozMNcU [12].
- **LVP** — the least-valuable piece does the job (defend a pawn with a pawn or knight, not the queen). ~8 videos. Examples: iQQDU3H7vaU [15]; hWVGjZaX7mU [6].
- **FLEX** — adapt the plan once the target changes. The target moved, so the attack changes. ~5 videos. Example: f5V0W6btKdY [12] (b3 changes the storm).
- **NONMOVE** — says what NOT to do and why: don't move the attacked piece, don't recapture automatically, don't trade on reflex. ~10 videos. Examples: cmJbc_BzTp8 [67]; k9EmWn_MvQc [24].
- **SECOND-BEST-TOO** — "there are 4–5 winning moves here, it's taste". Stops a student treating the engine's first choice as the only answer. ~8 videos. Examples: ieznxMQccW0 [14]; h-9MlTRN-fk [20].
- **ENGINE-HONEST** — cites the actual eval or accuracy figure ("+1.7", "98.4 vs 72.3", "engine needle jumps"). 5 videos.

**2. Video-level arc**
- The usual shape is four steps: name the opening, then play the game with per-move beats, then a post-game rewind, then a theory lesson on the alternatives. 38 of 66 videos jump back to an earlier ply at least once. The rewind is a whole second pass: the ply number falls back to 3–5 and the actual game move order is contrasted with the main line (examples: bRMHNmDMLqw, k4T6TJGOSA0, i8G7wozMNcU).
- One motif runs through the whole video. Examples: control of e5 in bRMHNmDMLqw; the d6 hole in k4T6TJGOSA0; the d4 clamp in fc8rxAMb7xI; the e5 pawn as a permanent weakness in br2ThhGdJXU. Later beats point back to it: "that's why you rerouted the knight".
- Density is bimodal:
  - Median is 15 beats at about 28 words each.
  - About 10 videos are bare move logs at 5–10 words per beat (jwFOi039eeg, k9lpwbZ1Cyw, ihv2TK04WPg, hw9tEjYabd8). These are distillation artefacts, not his style.
  - The other end is mega-beats of 300–900 words that pack a whole middlegame and conversion into one ply (bXAHcPB2hEk [20], hBzXn8Kdaao [16], ieznxMQccW0 [14], f5V0W6btKdY [12]).
  - A typical rich beat carries 2–3 ideas: the move, why, and the rejected alternative.
- Conversion always gets a stated method:
  - Finish development first.
  - Then pick trades or attack.
  - Cut off the king; ladder or rook-on-7th mate.
  - Make the passer.

**3. What can be computed**
- **Computable from engine + board:**
  - LOOSE: attacker/defender counts.
  - REASSESS: square-control diff before and after a move.
  - MIDDLEMAN: is the target move already legal and sound without the prep? Compare the eval with and without it.
  - THRESH: material delta mapped to a method rule table.
  - SECOND-BEST-TOO: count MultiPV moves within x cp.
  - ENGINE-HONEST: the eval itself.
  - NONMOVE (don't move the attacked piece): the engine's best move is not a retreat of the attacked piece.
  - LVP: the defender chosen has the lowest value among legal defenders.
  - FLEX: target pawn removed or moved, so re-target.
  - TERMS: partly — a capture is available but the engine prefers a developing move that keeps it.
- **Needs authored content:**
  - XFER: a motif-to-opening index; could be half-computed from the tactic detectors plus the corpus.
  - PSYCH: opponent-type knowledge.
  - SELFCORR: this should not be imitated, but its honest analogue (an earlier coach claim later refuted by the engine) is computable.

**4. Refinements to the 22**
- **COND** is far more frequent and more central than expected, about 15 videos. Examples: when is a pin dangerous (a two-part test, bRMHNmDMLqw [10]); when e6+g6 is fine (fc8rxAMb7xI [18]); pawn storms need not go in pairs (f5V0W6btKdY); bad bishops defend good pawns (dJYcXok1_wQ [12]). These are really tests with conditions, which is a better shape than one-line rules.
- **RATING** is very common (~20 videos). It sets what can be expected ("at 1400–1500 this matters more", "don't play the Scandi under 1600–1700"). It is not a volume knob, which is consistent with the heat-map rule.
- **ELICIT** is ~29 videos, but he usually answers his own question within a beat or two.
- **ALOUD** often includes a bust found live ("oh, there's a defense").
- **FEAR** splits in two:
  - dissolving a threat by checking whether it is real ("what is it actually attacking?", "worst-case test");
  - dissolving a bluff ("it just wanders in", h-9MlTRN-fk [6]). The bluff variant is computable: the attacker is unsupported and the opponent has no developed pieces.
- **PROPHY** shows up mostly as a pre-empting move with a named reason (dJYcXok1_wQ [36] Kh7; gpHLc41XR04 [61] "the Karpov move").
- **FREQ** is rarer than expected here (~6 videos).
- **TRANS** (analogy) is common (~20 videos) and vivid: "Frankfurt airport", "mansion in a ghost town", "queen as supporting actress". It needs to be authored or rotated.