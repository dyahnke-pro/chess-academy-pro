# Post-game review: SHOULD (from the 10 Naroditsky transcripts) vs IS

> **⏱️ STATUS UPDATE 2026-07-20** — the per-row IS column below is the 2026-07-19
> snapshot and is now STALE. Closed since then: variation re-naming (§2),
> opponent development-lag read (§2), the 📖 Opening Theory lecture with per-move
> WHY + line-dives + depth-to-move-12 (§3), the diagnostic question set
> restructured to a ranked 2-mid-game+turning-point BUDGET with trap + hint-ladder
> (§4), opening-SPECIFIC dev plans (§1), graded register verdicts (§6),
> conversion pattern naming (§7). CUT: guess-eval + type-not-move. HIDDEN (code
> kept): principle-quiz + theory-departure card. Biggest still-open cluster: §6
> register texture (named mini-concepts, discipline mantras, story-as-evidence).
> See the QUESTION-PLACEMENT STRUCTURE + DONE sections lower in this doc.

**Source of "should":** `data/sources/naroditsky-voice/review-register-rubric.md` — the
distillation of the 10 post-game-review transcripts analyzed this session (§1 structural
pattern, §2 density, §3 theory callouts, §4 question-before-answer, §5 register
fingerprint, §6 rubric R1–R10). Every "should" below is a behavior Naroditsky actually
does on the tape. **IS** = verified in the 2026-07-19 audit of the Knight_Mare_01 vs
iankane21 review (+ code reading). Status: ✅ works · ⚠️ partial · ❌ missing · ❓ unverified.

## 1. Structural teaching (§1)
| Should (from tape) | IS |
|---|---|
| Structural beat = ANCHOR (trigger) → PLAN (square-by-square itinerary) → TARGET (one named weakness, "because") → WARNING (counter-rule) → TRANSFER (cross-ref another opening) | ⚠️ #11 gives center/space/open-file/piece-control, but NOT the full anchor→plan→**named target** "because" chain, no warning, no transfer |
| Piece routes as itineraries ("f3→d2→c4"), not single moves | ❌ missing |

## 2. Density + naming (§2)
| Should | IS |
|---|---|
| Name opening in 1–3 moves; re-name the variation at every branch; flag transpositions [R1] | ⚠️ names it once (summary); no per-branch/variation re-naming; no transposition flags |
| ~85–95% of YOUR opening moves get a why (even "castles, straightforward" tags) [R2] | ⚠️ ~77% now (#11), board-mechanics only |
| Comment opponent moves only when off-book / inaccurate / plan-changing [R4] | ⚠️ does flag opponent slips, but repeats the SAME line ("X was stronger") verbatim [R10 fail] |
| Level-targeted commentary ("for 1750 I talk to 1750s") | ❌ missing |

## 3. Theory / book callouts (§3)
| Should | IS |
|---|---|
| Book-departure shape: status vs theory + the main line + WHY it's main + practical verdict + source honesty + live DB counts, THEN check it | ⚠️ now honest about WHERE (#10) + names main move + game count; but no "why main is main", no practical verdict, no live-check |

## 4. Question-before-answer (§4) — the diagnostic core
| Should | IS |
|---|---|
| Find-the-move ("spot the crusher") | ❓ find-the-shot code exists; unverified it fires (audit stalled at the picker) |
| Explain-the-WHY (why is it an inaccuracy?) — the "why'd you play that?" probe | ✅ (just fixed #8 → fires on YOUR move only) |
| Type-not-move ("what TYPE of move — checks/desperados?") | ❌ missing |
| Choice-between-two ("which pawn to take?") | ❌ missing |
| Goal-first / withhold-the-square (name piece + goal, hide square) | ❓ guided-find code exists; unverified |
| Hint ladders on stall | ⚠️ a Hint button exists; no laddered hints |
| Trap questions ("most-popular-wrong-answer") | ❌ missing |
| Post-answer grading (warm, precise; wrong answers get a reasoned burial) | ⚠️ buckets the answer; grading prose unverified |
| Prediction-as-question (guess-the-eval) | ❌ missing |
| Reveal restates the LOGIC not just the move [R6] | ⚠️ gives a grounded "why better" on flagged moves; not a full logic deconstruction |

## 5. WALKING LINES — the through-line of the whole tape (David's named gap)
| Should | IS |
|---|---|
| **Play the better line OUT on the board, move-by-move, with the why per move** (the crusher / the refutation / the alternative) | ❌ **MISSING** — the PV engine (`pvPlayback.ts`) exists but is wired ONLY to find-the-shot; the walk says "X was stronger" (a name), never plays the line out |
| **Show the MAIN THEORY line you deviated from**, walked | ❌ missing — book-departure names the main move, doesn't walk it |
| **Show BOTH lines** — the practical line you played AND the engine-best alternative | ❌ missing |
| Model-game cameo — a famous game with the same idea, walked (§5.13 "story-as-evidence") | ❓ Phase-2 cameo code exists; unverified it fires |
| "Reverse-engineer the win / work backwards" (§5.11 meta-cognitive) | ❌ missing |

## 6. Register fingerprint (§5) — HOW he talks
| Should | IS |
|---|---|
| Facts→verdict ordering; "because"-chains two deep [S18/S20] | ⚠️ partial on flagged moves |
| Graded move vocabulary (inaccuracy→mistake→blunder; interesting→strong→classy→crushing) | ⚠️ badges only; no "classy/crushing" texture |
| Persona metaphors ("monster on a7", "the bishop from hell") | ❌ missing |
| Named mini-concepts — coin + define + reuse (LPDO, tabiya, one-piece-threshold) | ❌ missing |
| Rule + immediate counter-rule [R7] | ❌ missing |
| Calibrated honesty markers ("as far as I know", then check) | ⚠️ book-departure hedges; no live-check |
| Warmth brief/dry/milestone-only [R9] | ✅ (no per-move cheerleading) |
| Meta-cognitive narration of his own search | ❌ missing |
| Discipline mantras in conversion ("simple chess, no adventures") [R8] | ❌ missing (conversion phase is silent-but-empty) |
| Story-as-evidence (famous game / live DB search / a GM's own loss) | ❌ missing — 🔒 SOURCING GUARD (David 2026-07-19): draw anecdotes/illustrative games from ANY GM with a CITED example, spread across many players — NEVER exclusively Danya's own stories (legal), NEVER verbatim; original prose teaching the public-domain idea, sourced. Emulate the self-deprecating-loss STYLE, don't lift his specific stories. |
| Psychology-of-opponent reads ("one blunder follows another") | ❌ missing |
| Dry humor at positions, never the student | ❌ missing |

## 7. Conversion / endgame (§R8)
| Should | IS |
|---|---|
| Silence in conversion + name the mating pattern / endgame technique | ⚠️ goes silent, but never NAMES the pattern; middlegame past move 12 gets badges only |

## 8. Loop + correctness (not from the tape, but table stakes)
| Should | IS |
|---|---|
| Accurate engine grades; recap counts YOUR errors | ✅ (grades ✅; recap fixed #9) |
| "Why'd you play that?" fires on YOUR move only | ✅ (fixed #8) |
| Feed mistakes → mistake-puzzles / weakness buckets / drills | ❓ code exists; unverified end-to-end here |
| Result + move count correct on the summary | ❌ **BUG** — showed "Draw · 30 moves" for a 16-move WIN |

---

## ✅ PROGRESS THIS SESSION (2026-07-19) — before → now

| Gap | Was | Now | How (all G0-grounded) |
|---|---|---|---|
| **§5 Walk the better line** (the #1 gap) | ❌ named the move only | ✅ **plays the engine PV out on the board, per-move why + closing eval verdict** | `computePvLine` + `PlyFacts`; pieces move (it's a concrete line). Verified firing live (×2/game). |
| **§1 Structural TARGET ("because")** | ⚠️ said "gains space" | ✅ names the created enemy weakness — isolated/doubled pawn, or the outpost's "no pawn can ever challenge it" | `boardStructure` before→after delta |
| **§1 Anchor + §2 both-sides plans** | ❌ missing | ✅ **TWO plan beats — opening developing plan (when the opening's identified) + middlegame orientation (pawn majorities / opposite-castling race), shown with ARROWS not by moving pieces** | pawn-majority + development from chess.js; blue=your plan, amber=opponent |
| **§7 Conversion / pattern naming** | ⚠️ badges only past move 12 | ✅ names back-rank / smothered mate + the endgame phase (rook/queen/minor) | mate geometry + `endgameType`, else silent |
| **Result / move-count bug** | ❌ "Draw · 30 moves" on a 16-move win | ✅ correct ("Victory · 16 moves") | reads the raw score + color |
| **Picker fired on OPPONENT's move** (reviewed games) | ❌ | ✅ gates on COLOR (isCoachMove is unreliable for imported games) | side-to-move === student color |
| **"can land a null" leak** | ❌ | ✅ silent when no real tactic | guided-find returns null |

Every item above ships with unit tests + is verified firing in the live localhost
review of the Knight_Mare_01 Pirc (audit-this-review.mjs, full walk 31/31, 0 errors).

## The biggest gaps, ranked (should-be minus is)

1. **WALKING LINES (§5).** The #1 thing on the tape and the #1 thing missing — he constantly
   plays lines out on the board (the crusher, the refutation, the alternative, the main theory
   line) move-by-move with the why. We compute the PV (`pvPlayback.ts`) but only for find-the-shot;
   we never *play out* "here's the line you should've played" or "here's the main theory line."
   **Both lines, walked, with per-move why.** (Task #5.)
2. **STRUCTURAL BEATS with a NAMED TARGET + counter-rule (§1, R3, R7).** We say "gains space";
   he says "gains space *because the d5 outpost is now untouchable, but don't push f5 or you hand
   over e5*." Anchor→plan→target→warning.
3. **BOTH SIDES' PLANS (§2).** We teach your moves; he frames your plan AND the opponent's.
4. **THE DIAGNOSTIC QUESTION FAMILY (§4).** We have one probe ("why'd you play that?"); the tape
   has ~10 (type-not-move, choice-between-two, trap questions, guess-the-eval, hint ladders).
5. **CONVERSION DISCIPLINE + PATTERN NAMING (§R8).** Past move 12 the walk is empty; he names the
   mate/endgame technique and speaks discipline mantras.
6. **REGISTER TEXTURE (§5).** Persona metaphors, named mini-concepts, rule+counter-rule,
   story-as-evidence, opponent-psychology, dry humor — none present; this is what makes it feel
   like *him* vs a badge-labeler.
7. **RESULT/MOVE-COUNT BUG.** "Draw · 30 moves" on a 16-move win — a plain correctness bug.

## 🔒 G0 GROUNDING PLAN — the computed source of truth for EVERY item (NO hallucinations)

David 2026-07-19, emphatic: "WE ARE NOT CODING IN HALLUCINATIONS." G0 = the LLM VOICES
facts computed in code; it invents ZERO chess content. Every feature below names the
CODE that computes the fact; the model only phrases it (via `voiceFacts`). If a fact
can't be computed, the feature stays SILENT — never guessed.

| Feature | G0 source of the FACT (computed in code) | LLM's only job |
|---|---|---|
| Structural ANCHOR (trigger) | `boardStructure.describeStructure` (center lock / chain / fianchetto / open file) + chess.js piece placement | phrase the named trigger |
| Structural PLAN (piece route) | the REAL continuation — the game's own moves OR the masters-DB typical maneuver (`lookupMasterPlay` walked), chess.js-validated. **NEVER invent "f3→d2→c4"** | phrase the real route |
| Structural TARGET ("because X") | `boardStructure` weak-square/pawn detection (backward/isolated pawn, hole, outpost square). Name ONLY a weakness the detector actually finds | phrase the found weakness |
| WARNING / counter-rule | only when Stockfish confirms the refutation exists (engine eval of the "lazy" move) | phrase the engine-confirmed caveat |
| TRANSFER / cross-reference | only when a real shared `concept-id` recurs (`chess-concepts.json`); else silent | phrase the recurrence |
| Opening / variation naming | `detectOpening` + `openingDetectionService` per branch (the DB trie) | say the DB name |
| Both sides' PLANS | student plan = the game's own continuation + masters typical plan for the structure; opponent plan = same from their side (`lookupMasterPlay`/`boardStructure`) | phrase the computed plans |
| Book-departure (why-main + verdict) | `scanTheoryDeviation` + masters DB frequency/eval (`lookupMasterPlay`) — main move, game count, win% ARE the DB's | phrase the DB facts |
| Find-the-move / crusher | `computePvLine` first move = Stockfish best (already G0) | pose the question |
| Type-not-move | `detectTactics` classifies the move TYPE (check/capture/fork/desperado) | phrase the type |
| Choice-between-two | Stockfish evals of the two candidate moves | phrase which + why |
| Goal-first (withhold square) | engine best move; name piece+goal, hide the destination square (code withholds it) | pose the guided question |
| Hint ladder | properties of the engine best move (piece type, from-square) revealed in stages | phrase each rung |
| Guess-the-eval | Stockfish eval of the position | pose + reveal the number |
| Reveal restates LOGIC | `explainBestMoveGrounded` + `pvPlayback` PlyFacts (the concrete mechanism) | phrase the causal chain |
| **Walk the better line** | `computePvLine(fenBefore, {firstUci: bestMove})` → real engine PV; per-ply why from `PlyFacts`/`renderPlyFactLine` | phrase per-ply |
| **Walk the main theory line** | `lookupMasterPlay` walked from the departure FEN (the DB's most-played continuation) | phrase per-ply |
| **Show BOTH lines** | line A = the game's actual moves; line B = the engine PV — both real | phrase the contrast |
| Model-game cameo | a REAL master game with a matching `structureSignature` (`boardStructure` + masters/`model-games.json`); cite id/players/event | phrase the parallel |
| Conversion pattern name | `detectTactics` / mate-pattern detector / `boardStructure.endgameType` — name ONLY a detected pattern | say the pattern name |
| Register texture (metaphor / mini-concept / rule+counter-rule / humor) | **decoration on a TRUE computed fact** — the move/weakness/pattern is computed; the metaphor never adds a chess claim. A mini-concept label applies only when the concept is DETECTED | phrase the true fact in-register |
| Story-as-evidence | a REAL cited game/anecdote (masters DB / documented game), ANY GM, spread — never invented, never verbatim, never all-Danya (legal) | phrase the sourced story |
| Opponent-psychology read | computed from the eval curve (a real swing after their prior error → "one slip follows another") | phrase the observed pattern |
| Result + move count | read straight from the `GameRecord` (result tag + `history.length`) | display the true values |

**The rule for every build:** compute the fact → if computable, `voiceFacts` phrases it → if
NOT computable, SILENCE. No feature ever asks the LLM for a move, an eval, a line, a plan,
a weakness, a pattern name, or a "story" it makes up. Audit each with the harness: replay to
the ply and assert every spoken claim is TRUE on the board (the `narrationAccuracy` contract).

## Already fixed this session (was broken, now green)
- Recap counted the OPPONENT's errors → now counts yours (#9).
- Book-departure flagged move 1 / a single master game → honest now (#10).
- The walk taught NOTHING on your moves → now ~77% grounded coverage (#11).
- "Why'd you play that?" fired on the opponent's move → now your side only (#8).

## Live-test fixes (David's on-device audit log, 2026-07-19 → 07-20)
Fixed this pass (from the 300-entry audit log + his notes):
- **§6 register texture DONE** — graded verdicts scale to the fact ("Ouch — that
  one hurts" on a 3-pawn drop, "a little loose" on an inaccuracy, "clean" not
  "crushing" on a quiet move), persona, dry humor, rule-with-boundary added to
  `voiceReviewLines`. Verified: real-game audit R10 no-repetition green.
- **Better-line playout dropped every per-move why** — the flagged ply's ~5s
  clip was still playing when the playout fired; the no-overlap guard (not gated
  on `force`) killed each why (log: "dropped overlapping line" ×N). Now paced on
  `voiceService.isPlaying()` (wait-idle before+after each line) so one why speaks
  per move, in order. + green lead-the-eye arrows on each played move
  (`walkExplorationArrows`) — the line had none.
- **`uncategorized`** — reveal voiced the internal bucket label and counted
  unrelated opening slips as one "pattern." `composeCallbackLine` now returns
  null for `other`/uncategorized (the holding pen is a review queue, not a
  pattern). Test added.
- **Board froze behind the card** — `handleWalkForward` no-op'd while the faucet
  / turning-point card was open. Forward now dismisses the card + advances (the
  escape hatch), which also fixes "went back to answer, couldn't go forward."
- **OPP audit robustness** — assert on `data-narration-source="opponent"`, not
  brittle post-rephrase keywords.

## Still OPEN from the live test (next passes)
- **Opponent structure + development read** — narrate the opponent's opening/
  structure and the "too many pawn moves → development suffered" observation.
  Currently opponent moves ONLY speak when they're errors. Compute from
  `boardStructure` + a pawn-move-count vs piece-development heuristic; G0.
- **Cameo** — make it a pop-up card (like the mistake card) + coach ANNOUNCES it
  + pick a game sharing a TACTIC/structure more relevant than pawn-majority +
  arrows over the cameo moves.
- **Turning-point question** — chips are bare SAN ("15…Nd7"); David can't recall
  positions. Give board context (step the board to each candidate, or thumbnail).
- **PostHog review telemetry** — `review_started/narration/completed` wired
  (captureEvent) but added today; re-verify ingestion after next test.
- **§4 diagnostic question family** — type-not-move / choice-between-two /
  guess-the-eval / hint ladders (speced above).

## Register split — decision log (David 2026-07-20)
David: divide the transcript behaviors by LIVE game-play (in-game/Watch register)
vs POST-GAME review register (the two-register rule, 2026-07-19). Outcome:

DEFERRED TO THE WATCH BUILD (in-game register — belongs on /coach/teach
walkthrough + matchup "Watch a full game" + model games, NOT on /coach/review):
- Ambition scale / setup options ("most ambitious is f4; also Bb3, Bc4") — l65FZlRkWcM
- Sister-opening analogy ("the Pirc is the KID minus the c4 pawn") — TIpUDMzQVmU
- Two-axis grading while CHOOSING a move (objective vs practical) — CnODsrMCQQg
- Transposition awareness as it arises ("move-ordered into a line you don't play") — fABTn305-Eg
These are present-tense, as-it-happens teaching — build them into the Watch
narrator when we build out the Watch section. David: "save for when we build
out the watch section."

NEVER BUILD (deliberate inversion — in-game habits we reject):
- Honesty/hedging markers ("as far as I know… we'll check after") — we're the
  computer, we KNOW we're right (David locked).
- Meta-cognitive fake-search narration ("scratch that, he played Rh5") — we
  compute deterministically.

STAYS ON REVIEW (retrospective register — the next build targets here):
- Type-not-move question (B3). ✅ built + WIRED (reviewTypeQuestion.ts) — "what
  KIND of move — check/capture/quiet?", computed from the engine best move,
  fires once per game on a forcing best move. David: "add both!"
- Trap question / poisoned-capture (B7). ✅ built + WIRED (reviewTrapQuestion.ts)
  — "take it or leave it?", answer by static exchange, reveal plays out the
  losing swap. Fires once when the student faced a poisoned capture.
- Guess-the-eval question. ❌ REMOVED (David 2026-07-20: "we dont need guess the
  eval questions" — abstract, not tied to a decision). Service+wiring deleted.
- Hint LADDER on the find-shot (B6). ✅ shipped (dfd4e3e) — piece→from→move.
- Opening theory tour: per-move WHY on best lines + depth to move 12. ✅
  shipped (13a5e33 / 8068e51) — David's "A / theory 1-12 locked in."
- Opponent structure + development read (the loud live-test miss). ✅ shipped
  (d7aa4cd) — pawn-heavy + minors-home read, once per game, grounded.
- Structural pawn beat anchor→plan→target per pawn event (R3). 🟡
- Variation re-naming inside the move-walk (A2). 🟡
- Cameo variety / transfer beat (C13/R10). 🟡

## 🔒 QUESTION-PLACEMENT STRUCTURE — locked (David 2026-07-20)

David: "I don't want the user overwhelmed with questions. Insert them ONLY when
relevant — like find-the-shot before a miss." The structure:

- **Narration** (spoken, never a stop): per-move why, opening-dev plan,
  middlegame orientation, opponent reads, variation naming, conversion. Flows.
- **Mid-game STOPS — budget 2, ranked by severity (`reviewQuestionPlan.ts`):**
  a question fires ONLY at a planned ply, tied to the student's ACTUAL move:
  - find-shot — you were winning + missed a notable move (+ sequence stage +
    better-line playout, all inside this one stop)
  - trap — your flagged move GRABBED poisoned material (SEE loss)
  - why-picker — any other slip (+ rewind as a FOLLOW-ON, not a new stop)
- **End STOP (1):** turning-point (board-preview chips).
- **Total stops ≤ 3** (2 mid-game + turning-point). Rewind rides its blunder
  stop; cameo is a rare skippable OFFER, not a forced stop.
- **On-demand button (not a stop):** 📖 Opening Theory.
- **REMOVED:** guess-eval (abstract), type-not-move (cut — David),
  theory-departure CARD (redundant with the Opening Theory button — David
  "remove 3 and 4"), principle-quiz (extra quiz — David). Cameo KEPT.

DONE (David 2026-07-20):
- **Opening-specific plans** (IMG_4560). ✅ The dev-plan beat now leads with the
  opening's CURATED key idea (resolveCuratedOpeningIdeas → repertoire.json) for
  the classical set, and NAMES the opening + states one side's plan for
  uncurated lines — never the "both sides have the exact same plan" collapse.
  Follow-up option: for UNCURATED openings, derive a specific plan from the
  masters CONTINUATION (async lookupMasterPlay) — would give the Zukertort etc.
  a data-grounded plan instead of the board-computed developing clause.

DEFERRED (David 2026-07-20, "later fix"):
- **Board sizing** — review board must fit the screen (IMG_4559).
- **Move-accuracy %** mismatch vs chess.com — needs deeper Stockfish depth.
- Move-accuracy % doesn't match chess.com. Likely needs DEEPER Stockfish
  analysis (higher depth/nodes per ply) so the per-move eval + accuracy formula
  line up with chess.com's. Not a review-narration bug — an analysis-depth job.
