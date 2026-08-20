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

3. **Then the sync** (video alignment) — see "VIDEO SYNC" at the bottom.

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

---

# VIDEO SYNC — pickup state (2026-08-17)

Goal: make corpus notes fire at the position the teacher was actually showing.
Only ~11% of notes carry a position, which is most of why Learn goes quiet.

## SOLVED

- **Downloading works from this environment.** Valid cookies (Netscape, exported
  from a window you do NOT sign out of — signing out rotates them), `npm i -g
  deno` for the n-challenge, then **video-only DASH**:
  `yt-dlp --cookies /tmp/yt.txt --remote-components ejs:npm -f 135 -o v.mp4 <url>`
  Progressive formats are behind YouTube's SABR rollout and 403 even with good
  cookies. Transcripts pull fine and always did.
- **Hand calibration + deterministic tracking works end-to-end.** Verified on
  the pilot: 840 frames -> 71 settled positions -> the full lesson shape with a
  timestamp on every ply, including all 15 rewinds. See
  `scripts/video-align/README.md` for the procedure and the numbers.
- **Do NOT build a board detector.** One session was burned on it. Four scoring
  functions each looked right and measured wrong (see `detect_board.py`
  docstring). The geometry is three numbers you can read off a frame in
  seconds; supply them by eye and let code confirm them against the position
  you read. Geometry is per-SECTION — the board is resized between play,
  review and example games.

## THE REMAINING BLOCKER — it is the corpus, not the video

**0 of 11,426 notes carry `t`**, the transcript timestamp, so there is nothing
to join the video's timestamp->FEN against. `t` was added to `distill-v2` on
2026-08-16, after all 421 videos were distilled.

It cannot be recovered: 10,144 notes have no position and an empty `lineSan`
(chunk unidentifiable); 1,152 had `lineSan` rewritten by the anchor pass; the
130 remaining are `inferred`, which `isVerifiedPosition` rejects.

And the transcript aligner cannot substitute — measured **0 of 52 chunks**
aligned across 6 videos, matching the corpus's 130 `inferred` from 421 videos.

**So the join needs an ADDITIVE re-distill.** Additive because note ids are
content digests: regenerating prose mints new ids and orphans the 268
hand-written spoken forms. Add notes, never replace them, and dedupe against
the existing corpus by `contentKey`.

## ✅ WHAT LANDED 2026-08-17 — and it changes what the re-distill is FOR

The video half is done and proven on a full lesson. A **build** is now one
self-contained file, `data/video-tracks/<videoId>.json`, holding:

| | pilot lesson |
|---|---|
| track — every position with its timestamp | 153 plies, 31 rewinds, 3,245 frames |
| forks — the alternatives DEMONSTRATED | 10 forks, 24 options |
| openings — resolved from the MOVES, not the title | 12 named; subject `Traxler Counterattack` at 0.917 coverage |
| notes — hand-written, anchored by position | 5 |

`by-opening.json` indexes builds by opening, so the question asked later ("what
do we have for the Traxler") is the one the data answers.

### The title is not evidence — one of six disagreed with its own board

Resolving from the moves rather than the title was a precaution when it was
written. It is now a finding. The upload titled **"Opening Blunders!! | Scotch
Game | 900 Elo"** (`h-9MlTRN-fk`) never plays a Scotch: its single tracked game
is `1.e4 e5 2.Nf3 Nc6 3.Nc3`, runs 80 plies to a promotion, and resolves to
**Three Knights Opening at 0.979 coverage**. Verified by hand — the tracker
found one game, not several, and a misread does not survive eighty legal plies.

Had it been filed by its title, every note written from it would have taught
Three Knights material to students learning the Scotch. That is the same defect
as the mis-anchored corpus notes below, arriving through a different door.

Two things changed so this cannot pass silently again:

- `map-openings.mjs` now asks whether the title **can be describing this
  lesson**, using the lesson's own resolved openings as the candidate set, and
  records the answer as `titleCheck` on the build. The upload's `title` is left
  exactly as it is — it is the link back to the source, and rewriting it to what
  the board says would destroy that to make the record look tidier.
- `videoTrackIntegrity.test.ts` gates the opening-resolution layer, which had no
  gate at all despite being what a future session queries. Every claimed opening
  must be a real DB line AND a position the lesson stood on. Confirmed failing on
  the injected defect before being accepted.

Asked against the whole DB the check was WRONG on its first run: it flagged the
French video, whose title "French Defense, Adv. Nimzowitsch" resolves across
3,000 names to *Nimzowitsch Defense: French Connection*, a different opening
sharing two words — while that video's board had resolved French Advance
Nimzowitsch correctly. A warning that fires on correct input is one people learn
to skip, so the question was narrowed to the lesson's own openings. Now: five
confirm, one flags, two make no claim ("Trashing the Traxler", "Jobava London" —
`openingFromTitle` is deliberately conservative and neither is a full DB name
segment; it is left alone, since it tags the 58k-note corpus and loosening it to
satisfy two video titles would re-label thousands of notes).

**THE RE-DISTILL IS NOW ONLY FOR REPAIRING OLD NOTES.** That is the reframe.
New teaching does NOT need it: a hand-written note anchored to a tracked
position is already correct by construction, because the FEN is looked up from
the track rather than typed. The re-distill's remaining job is the 11,426
EXISTING notes, of which the ones we could check are largely mis-anchored — a
separate, optional, and lower-priority piece of work than it looked last night.

So there are two independent paths, and only one costs LLM money:

1. **Forward (free, works today)** — track a lesson, write its notes by hand,
   ship the build. No `t`, no re-distill, nothing to join.
2. **Backward (LLM spend, optional)** — additive re-distill so existing notes
   carry `t` and can be re-anchored against a track. Worth doing for openings
   where the old corpus is the only coverage; pointless where a fresh build
   exists.

## THE NOTES REACH THE APP NOW (2026-08-17, overnight)

Until this run a note lived in `data/video-tracks/<id>.json` and nothing in the
running app ever opened that directory — a record, not a build. The notes are
now emitted to `src/data/video-teachings.json` and merged into the PRIMARY note
pool in `danyaTeachingService`, so they are selected by the same retrieval every
other note goes through.

**36 hand-written notes across 10 openings**, each anchored to a position its
lesson actually reached: Traxler, Alapin, Three Knights, French Advance
Nimzowitsch, Jobava (two lessons), Modern, Belgrade, Englund, Ruy Lopez Bird.

Three decisions worth keeping:

- **Primary pool, not the gap tier, and FIRST in it.** The farmed corpora are
  consulted only where the primary is silent, which is right for notes distilled
  from audio and wrong for these: a video note's position was read off the screen
  frame by frame and chess.js-validated, and its prose was written by hand
  against that board. Order is the tie-break mechanism, so they go ahead of the
  distilled notes — measured: at the Englund position after 3…Qe7 a distilled
  note was being chosen over the hand-written one.
- **`positionSource: 'high'` is earned here.** For a farmed note that field means
  an anchor pass re-derived the position from a transcript. For these it means
  there was never an inference in the chain at all.
- **Anchors are screened by GENERICNESS, not depth.** A first cut used a six-ply
  minimum and threw away the Englund's best teaching, which lives at plies 4-5
  because the opening is short. Counting DB openings through a position settles
  it: 1.e4 e5 has 1020, 1.d4 e5 2.dxe5 has 8, five plies of the Three Knights has
  47. The limit is 100 openings, and depth is not consulted.

**Gate: `videoNotesSpeak.test.ts`** — asks the REAL selector at each note's own
position, and separately that each is reachable BY POSITION rather than only by
the move order the video used. That second check is the one that matters for a
real student: the tracker reads occupancy, so it cannot distinguish move orders
and legitimately returns a permutation (the Alapin came back as "c3 c5 e4 d5 …"
where a player types "e4 c5 c3 d5 …"). Matching on the move string alone, every
one of these notes would be silent in the app while passing every other check.

**What the writing has to avoid.** `noteTeachesChessNotItsSource` rejects prose
that describes the lesson instead of the board — "the lesson showed both …" is
meta, and it is the same rule as the narration voice's "never reference the
interface". Two notes were silently dropped by it before the sweep. Write about
the position, never about the video.

### Every pulled line gets hand-written notes (David 2026-08-17)

*"all openings we get corpus for will get hand written lines. So every line you
pull needs to be hand written by you to maintain accuracy and standard."*

There is no scoping question — pulling a line IS the commitment to write it, and
a build with no notes is an unpaid debt rather than a backlog item. Locked in
CLAUDE.md; gated by `videoTrackIntegrity.test.ts` ("every committed build carries
hand-written notes").

Paying it down took the corpus from 10 noted builds to **17, 45 notes**, and
removed **seven builds** rather than papering over them:

- **Six were MISTRACKED.** A King's Gambit lesson had tracked as `d3 c5 d4 d5`; a
  Najdorf video resolved to "Bird Opening"; a Danish Gambit to "Queen's Pawn
  Game". **Every move of those lines is LEGAL** — which is the point worth
  keeping: chess.js catches an impossible read, never a systematically wrong one,
  so every legality check passed on nonsense. Only the title check caught them.
- **One was too thin** to teach from (4 plies of a 30-minute video).

An unconfirmed title has two very different causes — the TITLE is wrong (the
"Scotch Game" upload that really does play 3.Nc3 for eighty plies, a fine build)
or the TRACK is wrong (junk). Nothing in the pipeline can tell them apart, so the
hand verdict is now REQUIRED and gated, and `map-openings` preserves it across
re-runs — it wiped the verdict on its next run and put a rescued build straight
back into the unresolved pile.

### Videos in, videos out

34 downloaded, **20 built, 14 refused**. The refusals are not a mystery and are
not a reader problem: both the calibrated and uncalibrated readers return zero
tracked games on the same files, while the geometry confirms against a start
position. That is the per-SECTION geometry case the README already documents —
he resizes the board between the game and the review — and the fix is to
calibrate each section separately rather than to loosen anything.

**Scanning no longer needs disk.** `scan_stream.py` pipes frames from ffmpeg and
scores them in memory. The file-based scanner wrote ~7,800 PNGs (~2.6GB) per
lesson, so this batch would have needed ~90GB against 23GB free — it worked at
six videos and could not have gone past about eight. Disk now stays flat at one
frame regardless of how many run at once.

**The title check earns its place twice over.** Built to catch the upload titled
"Scotch Game" that plays 3.Nc3 for eighty plies, it is now also catching bad
TRACKS: a Najdorf video resolving to "Bird Opening", a King's Gambit video to
"Mieses Opening". Those are mistracked games, not mislabelled ones, and the flag
is what keeps notes from being written off them. Nothing was written from any
unconfirmed build.

## AFTER DANYA: HANGING PAWNS (decided 2026-08-17, David: *"once Danya is done, move onto the next most important set of videos"*)

Every farmed corpus tags its notes with `yt:<videoId>`, so the video ids for
other creators are already in the repo — no new manifest is needed to harvest
any of them. Measured across the corpora:

| creator | videos | opening-tagged | position-keyed |
|---|---|---|---|
| **hangingpawns** | **404** | **100%** | **35%** |
| saintlouis | 1168 | 23% | 4% |
| gothamchess | 42 | 0% | 0% |
| hikaru | 33 | 6% | 3% |
| imrosen | 36 | 7% | 1% |

**Hanging Pawns is next, and it is not close.** Every one of its notes carries an
opening tag, because every video IS one opening — which is exactly the shape an
opening-training app wants. Saint Louis is three times the size and the wrong
shape: mostly lectures, endgames and history, with 4% of notes position-keyed.

Queue is built at `/tmp/todo-hp.txt`, ordered by how much teaching each video
produced (Ponziani, Najdorf English Attack, Closed Ruy, Yugoslav Dragon lead it).

**ONE THING MUST BE DONE BY HAND FIRST: read the Hanging Pawns board geometry off
a frame.** Danya's `370,-2,60` is his chess.com stream layout and will not hold
for a different channel. Per the standing rule, geometry is read by eye and
confirmed by `calibrate.py`, never guessed — two automated detectors already died
proving that. Until that read exists, a scan of these videos would produce grids
that match no legal move (refusal, harmless) or, worse, a legal-but-false line.

## NEXT STEP

Scope, then repeat path 1. Hand-writing does not parallelise, so the unit is
roughly ONE SESSION PER LESSON for notes against ~3 minutes of machine time.
Pick the 20-30 videos covering openings actually taught rather than the whole
channel — that decision is David's and is the only thing gating volume.

Downloads need fresh YouTube cookies (they expire within the hour; export from a
window you do NOT sign out of).

## WHAT THE VIDEO PROVED, ON ONE LESSON (2026-08-17)

Tracked the Traxler video end to end (3,245 frames -> 153 plies, 31 rewinds)
and checked its 19 corpus notes against the positions the lesson ACTUALLY
showed. This check was never possible before: the video is the only record of
what was on screen.

| | |
|---|---|
| notes from this video | 19 |
| no position at all | 12 |
| anchored | 7 |
| ...on the taught line | 3 |
| ...**on a line the lesson never taught** | **4** |

The four are `dt-5qk` (anchored in the Giuoco Pianissimo, `Bc4 Bc5 c3 d3`) and
`dt-5qr` / `dt-5qy` / `dt-5qz` (anchored in the `4.O-O … d4 Bxd4` line). This
video's branch is `Bc4 Nf6 Ng5`. So Traxler teaching is filed at positions from
other openings, and it WILL speak there.

**No existing gate catches this.** `noteDescribesPosition` asks whether the
prose is true of the board, and it can be — a sentence about a bishop on c4 is
board-true in the Pianissimo too. The question it cannot ask is whether the note
was ever ABOUT that position. Only the video answers that.

CAVEAT, stated because the sample is one video: "not shown" and "mis-anchored"
are different failures and were separated by hand here. The tracker records
SETTLED positions, so a position that existed for under half a second between
sampled frames is absent without being wrong — that is why `e4 e5 Nf3 Nc6` reads
as not-shown while being plainly on the path. Do not automate this distinction
without checking it the same way.

**This is the argument for the re-distill, and it is stronger than coverage.**
The value is not only that 12 notes gain a position; it is that 4 of 7 existing
anchors on this lesson are WRONG and currently unfalsifiable. Re-distilling with
`t` lets every note be placed against what the lesson actually displayed, rather
than against a DB spine search that picked a plausible-looking line.

### …and the selector SPEAKS them (measured 2026-08-17)

`videoAnchorCheck.report.test.ts` asks the real `noteAtPosition` at each of the
four anchors the video disproved. **Three of four are selected.** This is a live
defect, not a latent one.

    SPEAKS  dt-5qk @ Giuoco Pianissimo
    SPEAKS  dt-5qr @ 4.O-O d4 Bxd4   -> "Black must respond with tempo. If Bg4,
                                         White plays f3 … c3 forces the knight
                                         back to c6 …"
    silent  dt-5qy                    (outranked by dt-5qr at the same anchor,
                                       NOT rejected — it would speak alone)
    SPEAKS  dt-5qz @ 4.O-O d4 Bxd4

Two different harms:

1. `dt-5qr` speaks real teaching at a board from another line. A student in that
   line hears Traxler-video content presented as being about their position.
2. `dt-5qk` and `dt-5qz` are selected but return EMPTY spoken text. That is not
   harmless — they take the slot, so a correct note is never offered and the
   tier goes quiet. Exactly the shape of the piece-truth bug above, where
   selection passed over true notes and coverage silently died.

The second is the one no audit would have surfaced: it presents as SILENCE, and
silence reads as "the corpus has nothing here" rather than "the corpus had
something and this took its place."


---

# PLAN — tier-1 narration, the note backlog, and the walkthrough stall
_opened 2026-08-20. This CONTINUES step 3 ("the sync — video alignment") of the
2026-08-15 locked sequence at the top of this file. Every number below was
MEASURED, not recalled; re-measure before trusting any of it._

_opened 2026-08-20. Written to survive context loss: every number here was measured, not recalled._

## THE ONE-PARAGRAPH VERSION

The walkthrough calls the LLM at runtime because "not baked" falls through to a
model call instead of to hand-written narration. Three days of hand-written
notes exist but are spliced on TOP of generated prose, so they never prevent
that call. The job is to make the note corpus tier 1, delete the LLM arms, keep
gems on the same path, and fix the lesson that still cannot reach its leaf.

## MEASURED STATE (2026-08-20)

| thing | number |
|---|---|
| hand-written notes | 340, across 152 lesson files |
| …of those, ON a taught line (audible in Watch/Learn) | **123** |
| …off every taught line (free-play/review only) | 217 |
| openings covered by hand-written notes | 20 of 43 |
| gen-1 baked openings (`walkthrough-narrations.json`) | 23, generated 2026-08-01 |
| …matching a taught spine today | **1 of 23** |
| opening-tab beats reachable by position (`lessonBeatAt`) | 3,373 / 8,803 plies = 38.3%, **0 lines with zero** |
| pending tracks ("the dump") | 35, **0 with notes** |
| pending-track positions carrying the teacher's words | 1,744 — **336 on a taught line**, 1,408 off |
| corpus notes total / position-resolvable | 63,287 / 7,034 |

## THE DEFECT, WITH ANCHORS

`src/services/openingGenerator.ts`

| step | line | behaviour |
|---|---|---|
| cache | `:481` | tree with matching `genRev` (`:435`) → generation skipped entirely |
| bake lookup | `:1998` | `bakedNarrationFor(canonicalName, sans)` |
| **the decision** | `:2042` | `if (baked && branchesCovered)` → zero LLM; **`else` → LLM** |
| PASS 1 | `:2064` | `getCoachStructuredResponse` writes narration (2 attempts → template) |
| PASS 2 reword | `:2621`→`:2881` | `if (!baked)` → **second LLM call** |
| beat splice | `:2264`, `:2484` | `lessonBeatAt` decorates prose the LLM already wrote |
| note splice | `:1276` | `noteAtPosition` corpus notes |
| **gems** | `:4097` | punish/gem labels — **same LLM dependency** |

Chain as built: `baked → LLM ×2 → template`.
Chain as specified: `baked → hand-written opening-tab beats → computed`. No LLM, ever.

Measured on prod during ONE Copycat walkthrough: **5× `/api/llm/deepseek/chat/completions`**,
plus `/api/lichess-explorer` → **429**.

**Why it looks intermittent:** a warm device with a matching `genRev` never
generates, so it never calls the LLM. Every gen-rev bump re-exposes every device.

## DECISIONS LOG (David, 2026-08-20)

- Baking = rewording narration from the video. Not baked → hand-written opening-tab
  narration → computed. **No LLM or TTS for walkthrough teachings. Gems are prebaked too.**
- The 3 days of hand-written notes **are** baked by that definition; they are simply not
  wired as tier 1. Wiring, not rewriting, is the work.
- **Never add a line to rescue one note.** Bd2 (4.Bd2) was the only offender — removed.
- An unbaked line is **not** an un-teachable line: bake it, never revert it.
- **Only the NEW hand-written narrations get placed.** The 23 gen-1 bakes wait until we
  know specifically where they go.
- Old narrations are deleted **only** once new ones replace them
  (`REPLACED_BY_HANDWRITTEN`, currently an empty set — correct).
- Videos may be deleted once FEN + captions + timestamps are tied together.

## PHASES

### P0 — prep — DONE except captions
- [x] Verdicts: every track in both dirs now carries one (was: 6 with none, which read as passed).
      Caught 2 real mistracks (`NQQnQ9X9dL8` Scotch->Jobava, `nkDlJMpLezk` Alapin->Slav) before
      any prose was written over them. Pending: 26 confirmed / 0 unconfirmed / 3 mistracked /
      6 unverifiable-by-title / 0 none.
- [ ] NEW: `/api/audit-stream` answered `storage: memory` with 0 events where it was `redis`
      earlier the same day — in-memory is per-instance, so reads miss the instance that wrote.
      It is not a usable instrument until that is understood. Use PostHog for anything historical.

### P0 (original list) — prep (no build; removes blockers) — IN PROGRESS
- [ ] Bank captions for the 20 download-list videos that lack them. Cookie-free:
      `yt-dlp --extractor-args "youtube:player_client=web_embedded" --ignore-no-formats-error
       --write-auto-sub --skip-download --sub-format vtt --sub-langs en`
      (`harvest/transcript-queue.sh` already does exactly this.)
- [ ] **6 of the 35 pending tracks carry NO `titleCheck`** — indistinguishable from verified.
      Run `map-openings.mjs`; an absent verdict must never be read as passed.
      NEVER write notes against a mistracked track.

### P1 — the stall — MEASURED 2026-08-20, and it is NOT what three earlier readings said
**The lesson ADVANCES, then stops dead at ply 11.** Measured by matching the rendered board
against every ply of the taught line, sampling every 10s:

    10s ply 0 | 51s ply 1 | 61s ply 2 | 91s ply 3 | 131s ply 4 | 161s ply 5 | 211s ply 6
    231s ply 7 | 251s ply 8 | 281s ply 9 | 311s ply 10 | 331s ply 11 | ... ply 11 for 5+ more minutes

Ply 11 is `Kd1`, immediately after `Qxf2+` — the line's FIRST capture and first check. Beats
exist on BOTH sides of that boundary (plies 8-14 all have hand-written beats since this
session), so a missing beat is NOT the cause.

THREE WRONG READINGS TO NOT REPEAT:
- "still stalled from the start" — no: it walks 11 plies first.
- "it is a regeneration loop" — no: the board advances monotonically and never resets. The
  6 `/api/llm/` calls are BACKGROUND STAGE GENERATION (concepts/findMove/drill/punish), not
  the walkthrough regenerating.
- "32 pieces means it never moved" — a bad discriminator: this line has no capture until ply
  10, so 32 pieces is consistent with plies 0-9.

**THE SPINE IS THE DB'S, NOT THE TAUGHT LINE'S.** `openings-lichess.json` holds exactly ONE
entry on this prefix — "Vienna Game: Stanley Variation, Meitner-Mieses Gambit", **9 plies**
(`e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5`) — while `repertoire.json`'s Copycat runs 15. The
walkthrough builds from the DB plus extension moves and dies at ply 11, two past the DB's end.

**CONSEQUENCE OF THIS SESSION'S OWN WORK:** the beats authored for plies 12-15 are
UNREACHABLE from `/coach/teach`, because the tree ends around 11. They ARE reachable from the
opening tab, whose Watch plays the full taught pgn. So the Copycat fix helps the tab and does
not help the coach — the coach needs the tree extended, or the spine sourced from the taught
line, which is a separate decision (G3: the DB owns the moves).

**PHASE NEVER BECOMES `leaf`.** The leaf panel renders unconditionally once phase is `leaf`
(`hasStages` gates only the Continue button, `CoachTeachPage.tsx:11194`). It never rendered,
so the runner is returning at ply 11 WITHOUT scheduling any transition — matching the
documented failure where a callback bails on `if (ctrl.cancelled || !isCurrent()) return;`
and strands the phase. That is the thing to fix: a lesson must always land in leaf/fork.

- [ ] Root-cause ply 11 -> 12 specifically. Phase stays `narrating`, panel renders its chrome
      with NO narration body, no fork panel, no leaf panel, zero console errors.
      Suspects: the node's children shape at the check/capture boundary; a stale token in the
      runner bailing `if (ctrl.cancelled || !isCurrent()) return;` without scheduling anything.
- [ ] **PACING IS REAL AND MUST BE BUDGETED FOR.** ~20-40s per ply, so a 15-ply lesson is
      ~10 MINUTES. Every audit that gave it 9 minutes reported a false stall. Budget audits
      from the ply count, never a flat timeout.
- [ ] NOTE: the 7 Copycat beats added this session make the lesson LONGER (full beats replace
      short computed prose). Correct for teaching, but it lengthens the run.
- [ ] A lesson must ALWAYS fall through to computed narration rather than sit silent.
- [ ] Fix the picker line spoken twice (David flagged; not yet diagnosed).

### P2 — tier-1 wiring
- [ ] Make `:2042`'s `else` resolve: hand-written note (FEN-keyed) → opening-tab beat
      (`lessonBeatAt`) → computed. **Delete the LLM arms rather than guard them**, so nothing
      can quietly re-enter.
- [ ] Same for gems at `:4097`.
- [ ] Verify gems still fire with a preloaded plan: `findMatchingTraps` rejects a gem whose
      `setupFen` is not the position its `setupMoves` produce — that derivation must still hold.
- [ ] **GATE: a walkthrough completes with ZERO LLM calls.** Without it this regresses silently,
      exactly as it did here.
- [ ] Add `origin` to baked entries (`video-reworded` | `video-handwritten`) + a gate. The bake
      file has NO provenance field today; notes already carry `origin`.
- [ ] Keep bake keying position-based for gen 2. Gen 1's exact-spine match is a SAFETY INTERLOCK
      (order-indexed prose ⇒ one changed move misaligns every later idea). Prefix-only tolerance
      is safe; anything past divergence is not.

### P3 — distil the dump (35 tracks)
- [ ] Write notes from the captions at each anchor's timestamp (`at.mjs <vtt> <seconds>`).
      Verify EVERY board claim with chess.js first. Captions gate every note.
- [ ] Start with the 336 positions already on a taught line — **160 of them are the Alapin**,
      then Scotch 49, Najdorf 30, Italian 23.
- [ ] Move a track `video-pending/` → `video-tracks/` only once its notes are written.

### P4 — the 1,408 off-line positions + 217 stranded notes
- [ ] Re-anchor onto a taught line where the idea survives the move (cheapest, highest yield).
- [ ] Fork only where it clears count + score + middlegame depth AND is bakeable AND rescues >1 note.
- [ ] Otherwise leave to free play/review — a legitimate outcome, not a failure.

### P5 — prune + the old-narration download list
- [ ] **130 of the 150 drop videos are safe to delete** (track + paired narration exist).
      KEEP: 9 `needs-hand-geometry`, 1 mistracked (`CXvo1dMF1Qs`), 11 no-game.
- [ ] When all work is done: give David the download list to attach the OLD narrations,
      **ordered most-effect → least**. Raw data: `data/video-queues/priority-downloads.txt`
      (44 videos; 20 in taught openings; 24 already have captions).

## SEQUENCING LOGIC
P0 unblocks everything and needs nothing from David. P1 before P2 because determinism does not
help a lesson that cannot finish. P2 before P3 so newly written notes land in a path that
actually speaks them. P4 after P3 because re-anchoring is judged against the finished corpus.
P5 last — deleting inputs before the outputs are verified is unrecoverable.

## NEXT-SESSION PICKUP
1. Read this file, then `CLAUDE.md` §THREE NARRATION TIERS and §WE DO NOT ADD A LINE FOR ONE NOTE.
2. `git log --oneline -12` — everything lands on `main`.
3. Re-measure before trusting any number above; the measurement one-liners are in the session
   history and every one of them is cheap to re-run.
4. Do NOT "fix" the exact-spine bake match without reading why it exists (safety interlock).
