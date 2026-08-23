# SEQUENCE — locked with David 2026-08-15

1. **The hand-written notes land** (other session). Keyed by note id into
   `public/data/corpus-spoken.json`; `spokenBeatText` returns them VERBATIM, so
   whatever is written is exactly what is spoken. Confirm that session has
   COMMITTED before it is stopped — two engine commits nearly stranded in a
   container tonight, and a container is reclaimed without warning.

2. **Full audit.** Muted, always: `await ctx.addInitScript(muteTtsForAudit)`.
   An audit needs to know WHAT was said, not to hear it — the listener reads the
   text out of `coach-narration-spoken`, so synthesising bills for audio nobody
   is in the room for.

   SCOPE — everything below is currently UNAUDITED on prod:
   - `ee5a7cb9` UCI_Elo + MultiPV live/review + searchmoves. The priority: it
     changes how the opponent PICKS MOVES in a live game, and no unit test can
     tell you whether a 1729 now faces a 1729.
   - `bacb0c04` the no-dead-lanes gate
   - `f156bb76` bake gate change + moveOrderArrows, AND ~471 notes baked with
     the length/move gates lifted whose wording is live and unheard
   - the hand-written notes from step 1

   Instrument: `scripts/audit-teach-corpus-spoken-prod.mjs`, verdict from
   PostHog by `audit_run_id`. Its marks now come from the BAKE, so a
   hand-written note appearing in the transcript IS the proof it fired.

3. **Then the sync** (video alignment) — see the section below.

# PLAN — computed voice narration (2026-08-15, active)

David: *"I'm willing to spend your context on better hand written notes. But you
need to guarantee me that you can get them to fire when they are supposed to!!!"*

This is the pickup doc for that. Everything below is measured, not assumed.

---

## THE GUARANTEE, AND THE ORDER THAT MAKES IT ONE

**Wording has ZERO effect on whether a note is selected.** Selection runs on the
note's POSITION metadata — `isVerifiedPosition`, `noteDescribesPosition`,
`noteStaysInScope`, phase match, `noteOpeningConflicts`. Once a note IS selected,
`spokenBeatText` returns its bake entry **verbatim** ("THE BAKE WINS"), no model
in the path.

So the failure mode is not bad prose. It is **writing beautiful prose for notes
that were never going to be selected** — the same shape as every bug this session
found. Do it in this order and it cannot happen:

1. **MEASURE which note ids actually get selected** on the openings we teach.
   `computedVoiceAudit.report.test.ts` walks 12 openings through the real
   selectors and records the tier + note that spoke per ply.
2. **WRITE spoken forms only for those ids**, straight into
   `public/data/corpus-spoken.json` keyed by note id: `{ "<id>": { "spoken": "…" } }`.
   No LLM call — that file is a plain Map lookup at runtime.
3. **VERIFY** with the muted prod audit. The probe's marks now come FROM the bake,
   so the new wording appearing in the PostHog transcript IS the proof it fired.

**Known-good example to copy:** `dt-48c` ("Black's main tricky move is queen to
e7…") is PROVEN to fire — heard on prod 2026-08-15, matched by the probe. It has
**no bake entry**, so it currently speaks as raw distilled transcript pruned to
one sentence. It is the first note to hand-write, and the template for the rest.

### ✅ DONE 2026-08-16 — the three steps, in that order

1. **MEASURED.** `src/services/selectedNotes.report.test.ts` walks every
   repertoire line through the real splice (`noteAtPosition` → board-truth
   grade over `spokenBeatText`, exactly what `noteArrowSourceAt` does) and
   names the ids that speak. A second pass asks the same selector at each
   note's OWN anchor, which is what catches a note like `dt-48c` — Englund
   Gambit, no repertoire line plays it, so the first walk never sees it.
   - 370 distinct notes speak on the lines we ship; **107 had no bake entry.**
   - 830 of 6,738 anchored notes are selectable at their own anchor; **251
     unbaked.** Union of the two: **266 notes** speaking raw transcript.
2. **WROTE all 266 by hand** into `src/data/corpus-spoken-handwritten.json`
   (+2 more the gate fix below exposed = 268). Every one passes the REAL
   `gateSpoken`, imported from the bake script rather than copied.
   `scripts/merge-handwritten-spoken.mjs` (`npm run merge-handwritten`)
   validates and merges them into the shipped bake; hand-written wins, and the
   bake script only ever fills gaps, so a later re-bake cannot undo them.
   - One note is deliberately **silent**: `dt-1ee` is anchored in the Open
     Sicilian and its prose teaches the Grünfeld. A rewrite would only launder
     the misfile, so it is marked `unspeakable`. That is PLAN item 2 answered
     for this one case, by measurement: it is a misfile, not a comparison.
3. **VERIFIED end-to-end.** Re-running the measurement: **unbaked selected = 0**
   on both walks, and 102 of the 106 hand-written notes that speak on
   repertoire lines are spoken VERBATIM. The other 4 lose a sentence to
   `gradeNarrationText` — the board-truth gate cutting a clause that is not
   true at that particular ply, which is the system working, not a defect.

**Gate fix found while writing:** `saysTempo` in `gateSpoken` matched
"temporary" with a bare `includes('tempo')`, then demanded the rewrite say
tempo — ordering an author to assert a chess concept the note never raised.
Word boundaries now. It exposed two machine-baked lines that had genuinely
dropped "compensation"; both were hand-written.

**Gates:** `handwrittenSpoken.test.ts` (in ship-check) fails the build if the
hand-written file and the shipped bake drift, which is the failure mode that
would keep the app speaking while nobody hears the reviewed words.

### The rules a hand-written spoken form must satisfy
(`gateSpoken` in `scripts/bake-spoken-notes.mjs` — length and move gates were
REMOVED 2026-08-15 on David's call; these remain)
- **Anchored note** (has `lineSan`): may name only squares the SOURCE named.
  `invented square` is still a rejection — an unearned claim.
- **Floating note** (no `lineSan`): may name **NO** square and **NO** move. Its
  geometry belongs to another game.
- No verbatim lifting: ≥6-word shared run with the source is a rejection
  (plagiarism guard — 1,071 notes hit this; it is working as intended).
- No banned phrases ("excellent", praise), no control tokens.
- Keep the note's chess terms (compensation, initiative, prophylaxis…) — do not
  simplify them away.
- **Length and move order are FINE now.** A note may walk a line; the board draws
  it (`moveOrderArrows`).

---

## WHAT LANDED TONIGHT (all on `main`, ship-check green)

| Fix | Evidence |
|---|---|
| `pvSpoke` no longer lets the routine plan silence the corpus | suppression 93.9% → 19.8% |
| Teaching ladder asks every tier | tiers-with-something-that-never-spoke 5 → 0 |
| Coach could not see mate **at all** (guard nullified its own inputs) | now any depth; "it would stop the mate" |
| Delta's "why" — grammar corruption; better move never named on structural reads | 3/5 → 4/5 with a why |
| Bake taught as the wrong colour ("we offer the gambit" to a Black student) | fixed |
| Full Stockfish capture: wdl, seldepth, nodes, nps, bounds, hashfull | was 4 of 13 fields; `nodesPerSecond` was hardcoded 0 |
| `UCI_LimitStrength` + `UCI_Elo` | never sent; engine now told the Elo directly |
| `eval` mining — per-piece quality + material/positional split | "your rook on a1 is doing the least of anything you own" |
| MultiPV 3 live / 8 review, `go searchmoves` | |
| **Prefetch hang** — a dropped prefetch was `await`ing the brain search | 79/79; live candidate for coach stalls |
| No-dead-lanes gate in ship-check | 10 lanes + all 13 package ranks |
| Move-order arrows | dt-48c draws 6 arrows instead of 6 SANs in audio |
| Audit instrument (was measuring raw corpus, not the bake) | 0 → 10 marks matched on prod |
| **Selection asked its piece-truth question of `plans`** — a field most notes leave empty and no tier speaks, while the student hears `spokenBeatText`. The gate caught them (238 refusals in one 44-ply game); nothing stopped them being offered. | `noteSpeaksOnlyPiecesOnBoard` in `phaseFits` + structure + transition + both "Key idea" sites. Priced: 10 boards, 10 offered, **10 kept, 0 refused, 0 silent** — the tier finds a true note instead of going quiet. Gate `noteSelectionPieceTruth.test.ts` (6 real failures without the fix). |

---

## 2026-08-16 — WHAT DAVID'S OWN GAME EXPOSED, AND WHAT IS LEFT

He played a full game on Learn, pasted the 300-entry log, and named three
things: narration calling out wrong pieces, the opponent playing better than
him, and later — from a second reading — "a lot of suggestions are bad", "the
useless rook and queen battery on the 8th rank", and "I never heard a tactic
alert for the opponent when it came to a fork".

**Every one had the same shape: a value already computed, and thrown away
before it reached the thing that needed it.** That is the pattern to look for
first on this surface; it has now been the answer six times in one day.

| Defect | Root | Evidence |
|---|---|---|
| Sentences about pieces not on the board | Selection asked `namedPiecesExistOnBoard` of `note.plans` — empty on most notes, spoken by no tier — while the student hears `spokenBeatText` | 238 refusals in a 44-ply game → **0**; coverage unchanged (10 boards, 10 offered, 10 kept) |
| 130 `claim-validator-trip` in a 12-move game | The gate is the tier's SELECTION PREDICATE, so every candidate it passed over logged a trip. 43% of a 300-entry buffer; the visible window was 4 minutes | probes tally silently, one rollup per turn |
| Opponent "played way better than I was" | `UCI_LimitStrength`/`UCI_Elo` never sent — three mechanisms stood in for a rating | `elo=1320 (requested 1237)` on every opponent move |
| "Winning the pawn on f5" | Any capture was called a win; nothing asked about defenders. His opponent's bishop on e6 covered f5 | legal-move swap: win / trade / no claim |
| "Your strongest reply is Be3" | MultiPV 3 runs and the runner-up was discarded, so a 10-18cp spread was spoken as a superlative | 175/169/158 at d14, top two swap by d20 → "Two good moves here" |
| Battery on the 8th rank | `findBatteries` never asked what the battery was aimed at | ray continued past the front piece; his position now yields none |
| No fork warning | The Learn alert passed `analysis: null`, and the whole forward scan sits behind `if (analysis && …)`. It could only ever see forks that had already landed | `stockfishCache.get` is sync and the depth-14 read was already cached on the unwarned plies |

**STILL OPEN**

1. **"That let them win a rook"** — spoken on a board where he was +1.7 and no
   line at depth 10/12/14/16/20 wins anyone a rook. Replaying `whatItAllowed`
   with the engine's real line from that position produces a DIFFERENT and true
   sentence, so it was fed a stale board or another ply's line. Unrecoverable
   from his log, because only the sentence was logged. `backwardLook.drawback`
   now logs `(fenAfter, replyPvUci, cpLoss)` — the beat is a pure function of
   those three, so the next occurrence replays offline in one call. **Needs one
   live occurrence; do not guess at it.**
2. **Relevance, not truth** — the last class standing. "As a rule in these
   positions: the bishop pins, then trades itself for the knight" on a board
   with no pin. Names no square, and both pieces exist, so every gate passes
   it. True somewhere, useless here.
3. Re-run the 3-instrument prod audit for the whole stack.

**NOT DOING, deliberately:** grading the material claim a second time against
the engine eval. The swap is legal-move-driven, so it already respects pins,
checks and blocked recaptures for free; a second opinion computed from evals at
a different depth would disagree with the first without being better. One
source of truth.

---

## OPEN, RANKED

1. ~~**Hand-write the spoken forms**~~ — DONE for every note that can currently
   be heard (see above). What is left is notes that are NOT selectable today:
   ~4,600 lack a bake entry, but 5,908 of the 6,738 anchored ones fail
   selection at their own anchor, so prose for them changes nothing. The next
   move on coverage is to find out WHY they fail selection (which gate drops
   them, and whether it should) — a measurement, not a writing job.
2. **`corpus-position` selecting notes about other positions** — a Najdorf ply
   spoke "…a Fried Liver situation". The exact-tier predicate is already heavily
   guarded, so this needs measurement before touching: it may be a legitimate
   COMPARISON rather than a misfile. Measure, then decide. Do not guess — that is
   what produced the c8-bishop and near-zero-threshold bugs.
3. **The bake remainder** — resumable, writes incrementally, currently 60,753
   entries / 60,433 spoken. A one-time LLM spend David has sanctioned but
   deprioritised in favour of hand-written notes.
4. **Gem lane still 0%** on real games — the lookup is healthy (60/60) and
   `pickTaughtSlip` exists, but `slipsAllowed` gates medium/auto to
   `studentElo < 1000`, so David at ~1729 can never see it. His call.

---

## INSTRUMENTS

- `src/services/computedVoiceAudit.report.test.ts` — 12 openings, real Stockfish
  WASM from `node_modules`, ~3 min. The regression instrument for lane coverage.
- `src/services/laneReachability.test.ts` — in ship-check. Fails the build when a
  lane becomes structurally unable to speak.
- `scripts/audit-teach-corpus-spoken-prod.mjs` — muted prod audit.
  `AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app`
  Verdict lands in PostHog keyed by `audit_run_id` (local listener cannot attach
  over https). **`muteTtsForAudit` is armed — audits cost zero TTS.**

## THE LESSON THIS SESSION KEEPS TEACHING

Five lanes were found computing correctly and reaching nobody; two more nearly
shipped that way, including one caught minutes before by probing a real position.
Every one passed its own unit tests, because **a test that calls a function with
values chosen to satisfy it can never ask whether those values occur.**

Probe a real position. Measure before writing. A green test is not a working
feature.
