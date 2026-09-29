Read all 1,642 lines of part3.txt. It holds 53 videos. Counts are videos, from a hand tally, so treat them as ±1–2.

**1. Behaviours not in the 22**

- **SELF-ERR — he admits his own mistake mid-game and switches to damage control** (8). This is about his own move, which is different from EPIST. JyTKdxfD8no [13] "a genuine blunder that simply drops the knight. Damage-control time." QxHsw4ZS2Ts [17] "the opening experiment has misfired dreadfully … I just missed the knight to g4." Computable: a large cpLoss on the student's own move, then the next beat changes priorities.
- **TRIAGE — a ranked priority list for a bad or special state** (7). Examples: down a piece, develop first. King weak, castle by hand. Consolidating, king safety over positional principles. QxHs [17] "Two things matter most: first, the immediate threats… second, whether you have any counterplay." NqtT3roFaBs [17]. Computable from state: material, king exposure, development count.
- **PROCEDURE — a numbered search order for one tactical situation** (7). This is more specific than HABIT. QxHs [17]: both queens hang, so ask "can I move with check → with a mate threat → desperado". NqtT [10]: against a fork, can one piece defend both? NnQmNvrOmCI [15]: "when a line fails, back up to the last move where you had a choice." Lkxw7bVvnHs [13]: count guards against attackers. Computable once the trigger is detected; the procedure text is authored.
- **CONVERT — names the method for cashing in an advantage** (9). Trade down or attack, "pick the simple win over the beautiful one", "most clinical path", "play as if material were level". OE2pJpVVzYw [26], Nd2NeAbF3k8 [36], RehhbTF00qQ [42], JyT [14 recap]. Computable: a won eval, then choose the method by king exposure and piece count.
- **STAKES — says a decision does NOT matter** (7). "Don't overthink, 10–15 seconds" (Nd2 [34]). "It absolutely doesn't matter as long as you're taking something" (MvaAX4pTvYU [37]). "Two or three valid alternatives, a matter of taste" (MvaA [30]). Computable: a small cp gap among the top engine lines. This is the inverse of MOMENT.
- **ROUTE — plans a piece's journey by destination** (8). "Find the destination, then the fastest route" (PACqm__Sne8 [39]). He also recaps the route afterwards: "the knight traveled b1-d2-c4-a5-c6-e7" (JwmxAagJ7bQ [57]). Computable: outposts plus knight shortest path.
- **ASK-CHANGE — "after any trade, ask how the position changed"** (6). He re-checks a move he rejected earlier. MWMloBpKuVg [19] "just because a move is bad in one position doesn't mean it's bad in another." RUYbO35XVCE [13] "the revisit-the-move method". Computable: re-run the engine on a previously rejected candidate and flag the flip.
- **DOUBLE-DUTY — praises one move that does two jobs** (6). KJTX68hK87w [22] castle long "makes the king safe AND defends c7". R2skmBe07aQ [16]. Computable: count the move's functions (defends, attacks, develops, prevents).
- **NAMED-FAULT — labels a thinking error** (6). Labels include "one-move-itis", "type-two undefended piece", "the urge to attack something", "Russian schoolboy" as a style. QOb_ElHrC14 [4]: "creating a threat isn't inherently good." Partly computable: the move threatens something, loses cp, and adds a weakness.
- **COUNTERFACTUAL — a thought experiment to find a quiet move** (4). JyT [38]: "if you could remove one of your own pawns, which?" JwmxA [55]: "this would be mate but for the escape square — can I take it first?" Computable from a null-move probe or an engine run with a piece removed.
- **INTENT-READ — "what does the opponent want next?" before choosing** (7). KAH-POAsnyE [24], JyT [32], MWMlo [23]. This sits near PROPHY but is the question, not the prevention. Computable from the opponent's engine best move after a null move.
- **PRESCRIBE — repertoire advice: who should play this** (9). Nd2 "1800–1900 worth considering". KNwKz9Ssi8c [12] "wouldn't tell a 600 to buy the book". LORE, the history behind a name, appears in 7: Chigorin, Panov 1844, Torre, Ruy's priest. HOMEWORK, pointing to an engine, book, Chessable or "15 minutes of your own analysis", appears in 8. All three are authored content.
- **PERSONA — humour and vivid metaphor** (12+). "Winning the lottery and complaining the hundred-dollar bills are crumpled", "Frankfurt Airport", "retired to the beaches", "defensive driving". Authored only.

**2. How a video is built**

- **The game, then a rewind.** 31 of 53 have a post-game section where the ply numbers jump back to the opening. Those sections are dense tree lectures (sidelines, "the engine prefers", correct defence) plus a list of takeaways (RehhbT, LJa5Df75CJI "two dials").
- **Opening.** The name and the theory choice come in the first 3–6 beats, usually with ELICIT or TEMPT.
- **Middlegame.** Carries the heaviest teaching.
- **Conversion.** Short, and nearly always CONVERT plus a mate or tactic.
- **One story per game.** He ties the game to one thread: the d4 target (Chigorin), the d5 square (Belgrade), prevent-castling on the e-file (MmF7dhysiAQ).
- **Callbacks.** The same idea "over and over" (a5 three times in KwU9YZOZkQU). "Keep c3 in your pocket" at JwmxA [27] pays off at [41]. "The idea I taught last game" links videos (8 videos do this).
- **Density is bimodal.** About 35% of beats are bare echoes ("a6.", "Black castles."). About 15% are mega-beats with 5–15 ideas (NqtT [17], MWMlo [23], KV90PAgPO2A [20]). Typical middle beats carry 1–2 ideas.
- **Near-empty videos.** QUk_oflYX0M and Qkv7D-BGAt4 are pure move dictation, and RSZfxqk9wNc is close to it. They are close to zero teaching and should be excluded as style exemplars.

**3. Computable or authored** — given per item above.
- **Computable from engine + board:** SELF-ERR, TRIAGE triggers, CONVERT, STAKES, ROUTE, ASK-CHANGE, DOUBLE-DUTY, COUNTERFACTUAL, INTENT-READ.
- **Authored:** PRESCRIBE, LORE, HOMEWORK, PERSONA, and the wording of PROCEDURE and NAMED-FAULT.

**4. Refinements to the 22**

- **More common than expected:**
  - ORDER (move order) appears in about 14 videos and is often the whole point, e.g. "don't assume different move orders transpose" (NqtT, MWMlo).
  - COND appears in about 12, as "verdicts are concrete, never universal laws" (LLidbvIUZ5I [11]).
  - FEAR appears in about 10, as "ignore it, just castle" or "the tactics defend themselves" (LvWVEAyZzxc [15], R2sk [23]).
  - ELICIT appears in about 12, usually as a rhetorical question he answers himself.
  - EVALHON often comes with engine numbers ("plus six") and with book-versus-engine disagreement.
- **Rare in this part:** ROLE (worst piece) in about 3; FREQ in about 4.
- **Worth splitting:** TRANS in this part is mostly a MOTIF CROSS-LINK between openings, not metaphor: "same as the Jobava London", "Fantasy Caro", "the Gligoric King's Indian", "Petrosian–Spassky 1966" (about 9 videos). That one is computable by matching positions across openings. Metaphor belongs under PERSONA.
- **Worth folding in:** PRACT here includes opponent modelling: "bet on a blunder", "she's low on time", "under a stream of threats blunders come".
- **Rule-breaking is itself a pattern** (about 8 videos). He states a principle and then breaks it with a reason: "the rule to take toward the centre is highly overrated" (KwbAHRLJ1RY [8]), "pawn structure is routinely overrated", "plans are overrated". This is a sub-form of COND.