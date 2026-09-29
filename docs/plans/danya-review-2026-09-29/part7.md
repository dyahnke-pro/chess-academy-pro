I read all of part7.txt (48 videos, 2,170 beats). The counts below come from a regex pass plus my own reading, so read them as approximate (≈).

**1. Behaviours not in the 22**
- **POSTMORTEM (the rewind).** After the game ends, the ply numbers jump back and he analyses branches off earlier moves. Seen in ≈24/48 videos (the regex flags ply resets; the Englund/King's Gambit repeat-rewinds were checked by hand). Examples: rkoC8 [2]"If White wants an Exchange Caro they should start with d4"; xoS71 [27]"Rewinding… This bishop actually won you the game."
- **TREE-TRIAGE.** In theory videos he lists every branch, then throws most away: "not serious", "no independent value", "transposes", "that concludes the line". Then he compresses what is left into one thing to remember. ≈7 videos, and it takes up most of their beats. Examples: vrZ3 [5]"f6 has no independent value", [9]"All you really have to remember is…"; zEytN [2138] (a one-line recap of the whole tree).
- **OPPONENT'S BEST.** He teaches the correct plan for the side the student is not playing. ≈10 videos. Examples: rkoC8 [7]"the most clinical way… a bishop to d3"; untay [12]"the engine prefers c6".
- **SHAPE TRANSFER.** He maps the current pawn structure onto a structure the student already knows. ≈10 videos. Examples: z92so [6]"a reversed Accelerated Dragon, a tempo up"; vrZ3 [9]"a Fried Liver where White has no d-pawn…". This differs from TRANS (analogy) because it is structure matched to structure, not a metaphor.
- **HISTORY/SOURCE.** He names the inventor, the first game, a book or a model game. ≈16 videos. Examples: tWGr [87] (Kolisch 1861); rkoC8 [25] (Svidler–Tomashevsky).
- **MINDSET SHIFT.** He announces that the goal has changed. ≈11 videos. Examples: vMY6 [25]"Now the mindset shifts… consolidate"; vtY88 [23]"the next two or three moves are where the game is won — don't autopilot".
- **SAFETY CHECK.** Before cashing in a tactic he checks the opponent's in-between resources. ≈5 videos. Examples: utcO [21]; u1ZS [51]"check for any mate threats against you — there are none".
- **CHECKLIST.** He gives a numbered precondition list for a pattern. 1 video, but a strong one: wdHX (the four-item Greek Gift checklist, [19–25]).
- **SELF-CORRECTION.** He admits his own error mid-game. ≈9 videos. Examples: zEqo [51]"a4 was a bad move… a real mistake"; xoS71 [33]"it's okay to admit a mistake".
- **PSYCH/BLUFF.** Opponent psychology: gambit players, bluffing, fear of offbeat lines. ≈19 videos, counting FEAR overlap. Examples: x-TMz [9]"using the psychology of gambit players against them"; vdWQ [16].
- **REPERTOIRE ADVICE.** What to play at your level, and his own credentials. ≈13 videos. Examples: uJCg [4]"For 1400-1500 I'd recommend the Accelerated Dragon"; utcO [7]"Forgiving beats fashionable".
- **DEFERRED PROMISE.** "I'll explain later / after the game." 4 videos. Example: s3ea [23].
- **NAMED METAPHOR LEXICON.** A small set of catch-phrases he reuses: biting on granite, red carpet, potential vs kinetic energy, screwdriver piece, dental filling. ≈19 videos. This is a sub-case of TRANS, but it is a reusable vocabulary rather than one-off analogies.
- **CLOCK/FORMAT.** Blitz or time-pressure framing of a decision. ≈7 videos. Example: wR42 [28] (park the rook on the opposite colour to the enemy bishop).

**2. How a video is sequenced**
- **Two formats.**
  - Game speedruns (≈38 videos) run: name the opening → develop → one structural thesis (usually a target square or pawn) → a tactic or break → conversion → postmortem.
  - Theory labs (≈7 videos: Englund, King's Gambit, KID Fianchetto, Torre, Najdorf) run: survey the branches → triage → deep main line → spoken recap.
- **Linking into one story.** A single thread carries the game. Examples: the d6 square in vH3f; "the c8 bishop has no home" in rkoC8; the d4 hole in xQ-L0.
- **Callbacks.** He returns to earlier ideas in ≈20 videos, e.g. zhfO [55]"the old idea was to deflect the bishop" and vrZ3 "your old friend the queen to a1".
- **Density.** Median 15 words per beat (mean 18.5). 703 of 2,170 beats (32%) are ≤10 words, mostly bare move notes. 253 beats carry no move at all: these are pure commentary or rewind markers. A typical beat carries one idea. Critical moments get multi-idea paragraphs of 60–150 words (rkoC8 [13], tWGr [21], ukVf [22]).
- **Pacing.** Roughly one teaching beat per 2–3 plies. Book moves and trades are silent or bare.

**3. Computable from engine + board, or needs authored content**
| Behaviour | Computable? | Inputs |
|---|---|---|
| POSTMORTEM | Yes | criticalityScan + refutedAlternative + the moves where the eval swung |
| TREE-TRIAGE | Yes | explorer frequency × engine eval (drop low-frequency or refuted branches); transposition by FEN match |
| OPPONENT'S BEST | Yes | engine best move for the other side |
| SHAPE TRANSFER | Partly | pawn-structure hash matched against a structure library; the names need a table |
| SAFETY CHECK | Yes | engine check of the opponent's in-between moves, captures and mates after the combination |
| CHECKLIST | Yes, if encoded | per-pattern precondition predicates (Greek Gift: Bxh2 available, knight can reach g4/g5, queen can reach h4/h5, defender covers) |
| MINDSET SHIFT | Yes | a material or eval threshold crossed flips the posture (attack ↔ consolidate) |
| SELF-CORRECTION | Yes | the student's own cpLoss |
| CLOCK/FORMAT | Partly | time control, if known |
| HISTORY/SOURCE | No, authored | — |
| PSYCH/BLUFF | No, authored | — |
| REPERTOIRE ADVICE | Authored, gated on rating | — |
| DEFERRED PROMISE | No, authored | — |
| NAMED METAPHOR LEXICON | Authored | a small fixed vocabulary keyed to computed triggers (e.g. "granite" = bishop blocked by a fixed pawn) |

**4. Refinements to the 22**
- **RULE and COND are the spine, and they are more common than you would expect.** Rules come with their exceptions: "bad bishops defend good pawns", "the f-pawn push is bad… except when castling long" (tgyq [11]). COND ("check this position is really the same", xp727 [12]) deserves higher priority.
- **ALOUD is dominant in theory labs and thin in game speedruns.** Those games use terse bare moves instead.
- **ELICIT is rarer than expected.** 16 of 48 videos have any question at all, mostly rhetorical ("How should you respond?"). It is heavier only in the streamer-coaching videos (vkmoh).
- **RATING** often means the OPPONENT's rating ("a 2439 opponent", "1100s are damn good"), not the student's level.
- **HABIT should split.** Board-scan habits (after a pawn push, check what it weakened; after pieces make contact, look for a tactic; ≈4–5 videos) are distinct from process habits (don't autopilot, safety check).
- **EPIST shows up as self-correction plus "I worried there'd be a defence"** (yXli [29]) more than as plain uncertainty.