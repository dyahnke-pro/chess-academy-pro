# PLAN — wire the YouTube teaching corpus into every surface that TEACHES a position (2026-08-03)

David, across this session:
- *"Would wiring in the YouTube note corpus to review help us improve review?"*
- *"Adding notes to tactics also. Tactics does not advance on its own and there
  are no forward or back buttons. I think they are being hidden somehow."*
- *"Identify other areas this belongs in… Maybe 'read this position'?"*
- *"Plan each integration and make sure the narration tenses matches each…
  Phase transition might be another good place. Basically anywhere that
  analyzes a chess position?"*

---

## 0. My answer to "basically anywhere that analyzes a position?"

**No — and the distinction is the whole design.** The filter is not *analyzes*
a position, it's **teaches ABOUT a position while the student is not currently
being tested on it.**

Three tests a surface must pass before it gets corpus notes:

1. **Does it TEACH, or does it TEST?** A note during a puzzle attempt is a
   spoiler, and it violates the locked narration rule #8 ("drill positions stay
   silent — the board is the lesson at that point"). Teaching surfaces get notes
   live; testing surfaces get them **only after the attempt resolves**.
2. **Does it have a register I can convert the note INTO?** A corpus note is
   written in one voice (present-tense live teaching). Every destination has its
   own tense (§2). No conversion rule = no wiring.
3. **Is it adult?** `/kid/*` is **permanently excluded** — kid non-negotiable
   #3/#5 bans adult coach personality from bleeding in, and the corpus is adult
   coach content. Not a phase, a permanent boundary.

Everything that passes all three is in scope. That's ~7 surfaces, and **two of
them are already wired** — which is the good news: the pattern is proven, it
just never reached the rest.

---

## 1. Inventory (measured 2026-08-03)

### The corpus

| corpus | notes | delivery |
|---|---|---|
| `src/data/danya-teachings.json` (primary) | 8,162 | bundled import |
| `public/data/hangingpawns-teachings.json` | 10,209 | fetched |
| `public/data/saintlouis-teachings.json` | 36,530 | fetched |
| **total** | **~54,900** | |

Danya phase split: **opening 1,870 / middlegame 4,355 / endgame 751 / concept
1,186.** The mass is in the MIDDLEGAME — where every surface is thinnest and
where the masters DB has already run out of games.

Note shape: `{ id, opening, lineSan[], phase, explains, teaches, plans }`.
Positioned by opening-name + `lineSan` prefix + structure signature — **not**
FEN. `lineSan` is often empty (opening-level notes).

### Who already reads it

| surface | corpus wired? | via |
|---|---|---|
| coach chat / facts package | ✅ | `teachingNoteForBoard` (5-tier) |
| **phase transition** (`usePhaseNarration`) | ✅ | `transitionTeachingForGame` (own 4-tier chain) |
| walkthrough / Watch | ⚠️ partial | `noteAtPosition` — **tier 1 only** (known gap) |
| think-aloud, fork talk, opening generator | ✅ | `teachingNoteForBoard` |
| **post-game review** (~20 facet computers) | ❌ **zero** | — |
| **tactics** (all 14 files) | ❌ **zero** | — |
| **read this position** (`usePositionNarration`) | ❌ **zero** | — |
| endgame page | ❌ | — |
| kid surfaces | ❌ **by contract** | permanently excluded |

David guessed phase transition — it's already there, and
`transitionTeachingForGame` is the **reference implementation** every new
integration copies: exact FEN → recent prefix → opening family (deepest first)
→ gap tier. Don't reinvent it.

### The retrieval chain is already built and already board-gated

`teachingNoteForBoard(historySans, fen, openingName)` = exact position →
secondary/gap (`secondarySupportNotes`) → structure transfer
(`notesForStructure`, filtered by `validateBoardClaims`) → concept tier → null.
Guards (`noteLineGuard`: `noteContradictsLine`, `notePhaseMismatchesBoard`,
`noteOpeningConflicts`) live inside it.

**No surface has to build retrieval. Each one only has to: call it, convert the
register, gate it, and decide when to stay silent.**

---

## 2. THE REGISTER TABLE (the load-bearing part)

Every corpus note is authored in **present-tense live teaching** voice ("White
fights for d5 and trades off its defender"). Splicing that raw into a
retrospective review breaks the locked two-register law (2026-07-19). So each
destination declares its tense and its conversion rule, and **the note text
never reaches the user unmodified** — it rides in the FACTS package and
`voiceFacts` phrases it (G0: code selects and gates, the model only phrases).

| # | surface | tense / register | person | conversion rule | forbidden |
|---|---|---|---|---|---|
| R1 | **post-game review** | PAST, retrospective | 2nd ("you") | idea → what the student's own moves did or missed against it | present tense; "White wants…" framing; any implication the game is still running |
| R2 | **phase transition** (in-game) ✅ live | PRESENT, forward-looking | 2nd | idea → the plan **from here**, both sides | past tense; mistake-recap (that's review's job); "the best move was" |
| R3 | **read this position** | PRESENT, descriptive | 3rd/neutral | idea → what this structure **is**, stated about the board, not the player | imperative ("you should"); prediction; move recommendations (it's a READ, not a hint) |
| R4 | **tactics — after resolve** | PRESENT, pattern-naming | 2nd | idea → the **named pattern** + where it recurs (rule #7: name the pattern, not the move) | anything before the attempt resolves; praise (rule #5); restating the move (rule #3) |
| R5 | **walkthrough / Watch** ⚠️ partial | PRESENT, live demo | 3rd ("White… Black…") | idea as-is — this is the note's **native** register | "your plan" (it's not the student's game); mistake framing |
| R6 | **Learn rung** | move dictation ONLY (spoken) | — | note goes to the **written narration below the board**, never the voice | speaking the note (locked 2026-06-05) |
| R7 | **endgame** | PRESENT, technique | 2nd | idea → the conversion/holding technique to execute | opening-phase notes (phase gate must hold) |

R5/R6 are the same data path with different delivery — one flag, not two builds.

**Every conversion is a code transform + a gate, never a prompt instruction.**
"Ask the LLM to rewrite it in past tense" is exactly the G0 disease. The
converter emits a neutral FACT; `voiceFacts` owns the phrasing at the surface's
declared register.

---

## 3. TACTICS — the reported bug (diagnose BEFORE adding notes)

David: *"Tactics does not advance on its own and there are no forward or back
buttons. I think they are being hidden somehow."* Both symptoms are real. Two
separate causes, one confirmed in code, one strong hypothesis to verify.

### Bug T1 — no auto-advance. **CONFIRMED in code.**

`TacticDrillPage.tsx:146` `handlePuzzleComplete` grades the puzzle, bumps the
session + Elo rating, pushes to `resultsRef`, and **prefetches the next puzzle
into `puzzleHistory`** (line ~214) — but it **never calls `goNext()` and never
touches `currentIndex`**. The next puzzle is loaded and then just sits there.
The student is stranded on a solved board with no cue that anything happened.

*Fix:* advance on resolve, after a short beat so the student sees the final
position (and, per T3 below, hears the pattern note). Respect a "hold" when the
attempt failed — a missed puzzle deserves the retry/solution beat before moving
on. This is also the natural anchor for the note (§4).

### Bug T2 — nav below the fold. **HYPOTHESIS, verify with a viewport probe.**

The nav DOES render — `TacticDrillPage.tsx:322`, inside `phase === 'solving'`,
no extra gate, testids `puzzle-nav` / `nav-prev` / `nav-next` present. So it is
not conditionally hidden. What it IS: **rendered BELOW a full-height board**
inside `flex flex-col flex-1 overflow-y-auto` with
`pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]`. On a phone the
`PuzzleBoard` eats the viewport and the nav sits under the fold — reachable
only by scrolling, which reads exactly as "hidden somehow."

Two corroborating smells: the page uses `6.5rem` bottom padding where the
project standard is `4.5rem`, and there is no board-height cap
(`ChessLessonLayout` exists precisely to cap board height on short viewports —
this page doesn't use it).

*Verify first, don't guess:* Playwright at iPhone viewport, assert
`nav-next` is **in the initial viewport** (`boundingBox()` within the visual
viewport, not merely `isVisible()` — `isVisible()` returns true for
below-the-fold elements and is what would have let this ship).

*Fix if confirmed:* cap board height / move nav above the fold (adopt the
`ChessLessonLayout` rhythm), and correct the padding to the standard.

### Bug T3 — silent surface

`TacticDrillPage` has **zero** `voiceService` calls. There is no post-solve
teaching moment at all today. That's the slot §4 fills.

---

## 4. Phased build

Each phase is one PR-sized chunk landing on `main` per the deployment policy.
**Phase 0 gates everything after it.**

### Phase 0 — MEASURE FIRST — `DONE (2026-08-04)`

Instrument: `src/services/teachingCoverage.report.test.ts` →
`audit-reports/teaching-coverage.json`. David's ask: *"Audit walkthrough and
teach x opening to make sure coverage is 100% and tell me the difference
between the two."*

**Headline: neither path has silent plies. Coverage of NARRATION is already
100% on both. The gap is not presence — it's GROUNDING.**

| | teach-me-X (`generateOpeningFromDbNarration`) | Watch (`LessonPlayer`) |
|---|---|---|
| openings | 43 measured (any of ~3,000 DB entries reachable) | **125 curated (43 masterclass + 82 pro)** |
| plies / beats | 1,310 plies | 346 masterclass beats |
| narration present | 100% (written per ply at runtime) | 100% (hand-authored) |
| **corpus-grounded** | **10.9%** (143/1,310) | **0%** |
| corpus-grounded WITH tiered retrieval | **70.4%** (922/1,310) | n/a (bake-time only) |
| still silent after tiers | 388 plies (29.6%) | n/a |
| legacy `WalkthroughMode` fallbacks | n/a | **0** — G9.3 Gate A is satisfied everywhere |
| both registers on every beat | n/a | **346/346** |

Three findings that change the plan:

- **The teach path is corpus-grounded on 1 ply in 9.** David's *"teach me x is
  working perfectly"* is running on computed prose for 89% of its plies. The
  corpus is doing far less work than the surface's quality suggests.
- **Tier-1-only is the whole gap.** Swapping `noteAtPosition` →
  `teachingNoteForBoard` takes it **10.9% → 70.4%, a 6.4×**. That single change
  is the largest measured win in this plan — **promote Phase 6 to run right
  after Phase 1.**
- **Gate A is clean.** All 43 masterclass AND all 82 pro openings have a
  registered `LessonScript`; zero fall through to the ungated auto-annotations.
  The G9.3 GothamChess defect is fixed. Nothing to repair there.

**Go/no-go: GO.** 70.4% tiered reach on real opening lines clears the 20% bar
by a wide margin.

Still to measure (review-specific, does not block Phase 6): silent-ply rate in
`generateReviewNarration` over the 646-game sweep, and corpus survivor rate at
those plies.

#### Original Phase 0 spec (retained)

Do not build blind. Extend `src/services/reviewCorpusSweep.test.ts` (already
drives full production narration over 646 real model games) to emit a coverage
report per surface-shape:

- **silent-ply rate** — plies where `narration === null`, split by phase.
- **corpus-hit rate** — for those plies, does `teachingNoteForBoard` return a
  note, and at which tier (exact / support / structure / concept)?
- **survivor rate** — how many of those survive `validateBoardClaims` +
  `noteLineGuard` at that exact ply?

Output: `audit-reports/corpus-coverage.json`.

**Go/no-go: if the survivor rate on silent middlegame plies is <20%, the corpus
doesn't reach real games and we stop and say so.** Honest gate.

### Phase 1 — the shared seam — `pending`

New leaf: `src/services/corpusNoteFacts.ts`. One retrieval + one converter per
register, so seven surfaces don't grow seven variants.

```ts
export type NoteRegister = 'review' | 'phase' | 'read' | 'tactic' | 'watch' | 'endgame';

export interface CorpusNoteFacts {
  idea: string;        // the teaching idea as a neutral FACT (never the note's prose)
  plan: string | null; // note.plans, when board-true here
  tier: 'exact' | 'support' | 'structure' | 'concept';
  noteId: string;      // provenance for sources[] + audit — NEVER spoken
  corpus: string;      // danya | hangingpawns | saintlouis
}

export function corpusNoteFacts(args: {
  historySans: string[];
  fen: string;
  openingName: string | null;
  phase: 'opening' | 'middlegame' | 'endgame';
  register: NoteRegister;
  studentColorWB?: 'w' | 'b';
}): CorpusNoteFacts | null;
```

- Wraps `teachingNoteForBoard` (all tiers) — never `noteAtPosition` alone.
- Re-runs `validateBoardClaims` at THIS ply (belt and braces; the exact tier
  doesn't self-filter).
- Applies the §2 register conversion in **code**.
- Returns null on any failed gate. Silence is always a valid answer.

Gate: `corpusNoteFacts.test.ts` — board-truth on fixtures, null on
contradiction / phase-mismatch / opening-conflict, one case per register
asserting the tense contract, deterministic ordering.

### Phase 2 — REVIEW, middlegame slot (highest value) — `pending`

`coachFeatureService.ts:~1677`: `buildMiddlegameOrientation` fires and leaves
`narration === null` when it returns nothing. Add the corpus as the **fallback**
rung in that first-match-wins ladder, `narrationSource: 'corpus'`, register
`review`.

Ordering is deliberate: computed board reads keep priority (specific to THIS
board); the corpus fills the silence behind them. Budget ≤3 corpus beats/game to
start — tune from Phase 0.

### Phase 3 — TACTICS — `pending`

**🚨 CORRECTION (David 2026-08-04, from his two screenshots): there are TWO
tactics surfaces with DIFFERENT registers. My earlier single "tactic" register
was wrong.**

| surface | source | register | note timing |
|---|---|---|---|
| `TacticDrillPage` ("Find the Mate") | random Lichess puzzles | **R4** present, pattern-naming | **after** resolve only (spoiler) |
| `MistakePuzzleBoard` | **HIS OWN GAME** | **R1** past, retrospective | **BEFORE** the attempt — it's orientation, not a spoiler |

David: *"Tactics just need a solid analysis of the stale position. Maybe include
the moves that played out before to summarize where the user 'stood in the game'
— winning/losing/critical moment analysis. From your mistakes and calculations."*

He's right, and it changes the design: a mistake puzzle is a **fragment of his
own game shown with zero memory of how he got there**. Telling him "you were +2
and about to convert" does NOT reveal the move — so unlike a pattern note, the
orientation can and should fire BEFORE the attempt.

#### What his screenshot actually shows (diagnosed in code)

Spoken line: *"Uh oh — Ng5 dropped about 3.5 pawns — a serious swing. Find the
right move. Middlegame positions require checking for checks, captures, and
threats on every move."* / `Move 30 • 350cp loss`.

Three defects, all confirmed in `src/services/mistakeNarration.ts`:

- **M1 — the "where you stood" clause is gated behind the wrong field.**
  `buildContextSentence` (line 56) returns `''` unless `opponentName` **or**
  `gameDate` is set (line 71). The eval clause — `advantageText(evalBefore)`,
  the ONE sentence that says whether he was winning — is appended *inside* that
  block (line 78). So a puzzle with a known `evalBefore` but no opponent
  metadata silently drops the standing. That's his screenshot: no context
  sentence at all. **Eval context must not depend on opponent metadata.**
- **M2 — the tail is a hardcoded generic pool.** `PHASE_CONTEXT` (line 279) is
  3 fixed strings per phase; "Middlegame positions require checking for checks,
  captures, and threats…" is literally string #2. It is identical on every
  middlegame puzzle forever, names no square and no piece, and violates
  narration rules #1 (concrete over generic) and #6 (no meta). **Delete the
  pool**; replace with a board-computed read, silent when there's nothing
  concrete to say (empty > generic).
- **M3 — nothing walks the preceding moves.** `MistakePuzzle.moves` is the
  FORWARD solution line, not the game history. The history is reachable —
  `sourceGameId` → the `games` record — but no code follows it. So "how you got
  here" is currently unknowable to the narration even though the data is one
  join away.

#### The fix: a stale-position orientation

New leaf `src/services/mistakeOrientation.ts`, register **R1 (past,
retrospective, 2nd person)**, built from data already on the puzzle + its source
game:

1. **Where you stood** — `evalBefore` → winning / better / level / worse /
   lost, stated unconditionally (kills M1).
2. **How you got here** — the last few plies from the source game + the opening
   name: the short story of the position, not a move list.
3. **Why this is the moment** — the eval swing across this ply (`evalBefore` vs
   `cpLoss`) framed as the critical moment: *"this was the ply the game turned."*
4. **What the position is** — board-computed structural read (replaces M2's
   generic pool) + a corpus note via `corpusNoteFacts(register: 'review')`.

None of 1-4 names the best move, so none is a spoiler. The move-level teaching
still waits for the attempt to resolve.

#### Build order for this phase

Order matters: **fix the surface, then teach on it.**

1. **T2 viewport probe** → confirm/deny the below-the-fold diagnosis.
2. **T1 auto-advance** + **T2 layout fix** (nav reachable without scrolling).
3. **T3 the note** — on resolve only, register `tactic`: name the **pattern**
   the puzzle showed and where it recurs. Never before the attempt resolves
   (spoiler + rule #8). Never praise (rule #5). Never restate the move (#3).
   Silent when no note survives the gates — a puzzle with no teaching note is a
   puzzle that simply ends.

Puzzle themes give a strong retrieval key for the RANDOM puzzles — the concept
tier (`conceptNotesFor`) is the natural first hop there, not the position tier.
Mistake puzzles are the opposite: they carry a real opening + real history, so
the position/support tiers apply.

---

## 3b. "Is walkthrough the same as teach-me-X?" — NO. Three engines, one word.

David: *"walkthrough is the same as teach x opening isn't it? Because teach me x
is working perfectly!"*

They are different code paths, and **that is exactly why teach-me-X feels
right and the others don't** — teach-me-X is the only one with the corpus.

| what the user does | engine | corpus? |
|---|---|---|
| `/coach/teach` → "teach me the Caro-Kann" | `useTeachWalkthrough` → **`generateOpeningFromDbNarration`** (`openingGenerator.ts`) | ✅ spliced (`noteAtPosition`, tier 1) |
| opening detail → **Watch**, opening HAS a `LessonScript` | curated `LessonPlayer` (hand-authored beats) | ❌ none — beats are static |
| opening detail → **Watch**, opening has NO `LessonScript` | legacy `WalkthroughMode` + `src/data/annotations/` | ❌ none, and the annotations are the ungated auto-generated swamp (G9.3 Gate A) |

So "walkthrough" names three different things in this app. The one David says
works perfectly is the DB-narration engine **with corpus notes spliced in** —
which is the strongest single piece of evidence in this plan that the corpus is
what makes a surface feel taught rather than described.

Consequences for the plan:
- **Phase 6's target is the teach engine's splice** (upgrade tier-1-only
  `noteAtPosition` → the full tiered seam). That path already works; this makes
  it work on the ~7 of 10 plies it currently goes quiet on.
- **Curated `LessonScript` beats stay hand-authored** — do NOT splice corpus
  notes into them at runtime. They're already reviewed and gated; runtime
  splicing could only drift them (same reasoning as the Tier-1 baked-narration
  rule). The corpus improves those at BAKE time, not at read time.
- The legacy `WalkthroughMode` path is a pre-existing G9.3 Gate A defect, not a
  corpus problem. Out of scope here; noted so it isn't confused with one.

### Phase 4 — READ THIS POSITION — `pending`

`usePositionNarration` already assembles a facts package
(`formatReadingFacts` + `buildFedTacticsContext` + engine). Add
`corpusNoteFacts(register: 'read')` as one more fact in that package.

This is the **cheapest high-value integration in the plan**: the wiring is a
single fact added to an existing package, and the surface is already exempt from
the verbosity gate (`speakReadAloud`, third sanctioned carve-out) so the note
can actually be heard on Silent/Brief.

Constraint: it's a READ, not a hint. Describe what the structure IS; never
recommend a move.

### Phase 5 — PHASE TRANSITION deepening — `pending`

Already wired via `transitionTeachingForGame`, but its chain differs from
`teachingNoteForBoard` (no structure-transfer tier, no concept tier). Bring it
onto the shared seam so an opening the corpus never covers still gets the
transition ritual. Low risk, already-proven surface. Keep register `phase`
(present, forward-looking) — do NOT let review's retrospective phrasing leak in.

### Phase 6 — WALKTHROUGH gap (the freebie) — `pending`

CLAUDE.md's open known-gap: the walkthrough splice calls `noteAtPosition` only,
so a Tier-2 opening teaches from notes on 3 plies and computed prose on the
other 7. Swap it to the shared seam (exact tier still FIRST). Registers R5/R6:
voice stays move-dictation on Learn, the note goes to the written narration
below the board.

### Phase 7 — ENDGAME — `pending`

751 endgame notes. `CoachEndgamePage` has essentially no teaching voice today.
Register `endgame` (present, technique). Phase gate must hold — an opening note
must never reach an endgame board.

### Phase 8 — summary + drill loop — `pending`

The highest-tier corpus beat becomes review's named "idea to take away", tagged
into the misconception bucket so it feeds `addMistakePuzzleFromCapture` → the
drill queue. Closes the loop instead of ending at the review screen.

---

## 5. Gates + audits

- `corpusNoteFacts.test.ts` (new) — retrieval, register/tense per surface,
  board-truth, silence-on-failure.
- `reviewCorpusSweep.test.ts` (extend) — **the load-bearing gate.** Every
  corpus-sourced line passes the existing deterministic board-truth scanner over
  646 real games. Baseline-free: zero violations.
- `reviewNarrationFidelity` / `reviewBoardAwareness` — stay green (no register
  drift, no seat-stamp leaks).
- **Tense regression gate (new):** per register, assert forbidden constructions
  never appear (no past tense in `phase`/`read`, no "you" in `watch`, no
  imperative in `read`). Cheap deterministic scan; this is what stops the
  registers blurring six months from now.
- Post-deploy, per the audit standard: `scripts/audit-review-real-game.mjs`
  (the 18/18 reference) extended with corpus-beat assertions, plus a new
  `scripts/audit-tactics-drill.mjs` proving auto-advance fires, nav is **in the
  viewport** at phone size, and the post-solve note SPOKE (3 instruments —
  Playwright + audit-stream + narration listener).
- `npm run ship-check` before every push.

---

## 6. Decisions — ANSWERED by David 2026-08-04

1. **Corpus priority vs computed reads** → **computed reads win, corpus fills
   the silence.** ("1 good.")
2. **Tactics advance** → **hold on a miss, auto-advance on a solve** — AND
   **add forward/back arrows**, on the mistake-puzzle surface too (his
   screenshot has none there at all). ("2 yes but also add forward and back
   arrows.")
3. **Beat budget** → ≤3 corpus beats per review to start. ("3 yes.")
4. **Attribution** → notes stay depersonalized; `noteId` is an internal
   debugging breadcrumb for `sources[]` + the audit trail, **never spoken and
   never shown**. No channel or person is ever named — the house-voice rule
   already forbids it. Nothing about this reaches the user.

---

## 7. Next-session pickup

Start at **Phase 0** — the coverage report is the go/no-go for everything after
it. The one exception that does NOT wait on Phase 0: the **tactics T1/T2 bugs**
(§3) are real defects independent of the corpus and can ship immediately.
