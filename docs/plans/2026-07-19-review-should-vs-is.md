# Post-game review: SHOULD (from the 10 Naroditsky transcripts) vs IS

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
| Story-as-evidence (famous game / live DB search / personal loss) | ❌ missing |
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

## Already fixed this session (was broken, now green)
- Recap counted the OPPONENT's errors → now counts yours (#9).
- Book-departure flagged move 1 / a single master game → honest now (#10).
- The walk taught NOTHING on your moves → now ~77% grounded coverage (#11).
- "Why'd you play that?" fired on the opponent's move → now your side only (#8).
