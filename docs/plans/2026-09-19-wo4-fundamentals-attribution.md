# WO-4 — does a real game produce ATTRIBUTED fundamentals that land in the model?

**Session 2026-09-19. REPAIR ONLY — no detectors added** (David 2026-09-19: "the
main concept doesnt work yet so theres no point in stregthening something that
doesnt work"). Owned: `autoAnalyzeGame.ts`, `principleAttribution.ts`,
`principleVoice.ts`, `fundamentalsCatalog.ts`, `FundamentalsPage.tsx`,
`coachFeatureService.ts` (contested, untouched — nothing here needed it).

Every number below was MEASURED, not recalled: 47 real lichess games (rated
blitz/rapid, both players 1000–2000, fetched 2026-09-19 — the app's real user
band), annotated by the app's OWN Stockfish 18 WASM build at the sweep's own eval
depth (BATCH_SHALLOW_DEPTH=12; the corpus-wide numbers use the depth-12 best
move too — the depth-18 best-move refinement is reproduced only on the
committed fixture game), then pushed through the app's OWN pipeline unstubbed
(`analyzeGameOnWorker` → `db.games` → `autoAnalyzeGameMisconceptions` →
`captureMisconception` → `classifyMisconception` → `logMisconception`). The
harness is `src/services/fundamentalsPipeline.realGame.test.ts`; the corpus is
gitignored research data under `data/sources/wo4-corpus/`; the report it writes
is `audit-reports/wo4-attribution-measure.json`.

---

## J2 — YES, the wire fires. Here is exactly how far it reaches.

**Corpus:** 47 games · 2,795 plies · 1,396 student plies · **154 student
blunders/mistakes** (the sweep's own grading, book-exempt, shallow-noise floor).

**Capture → attribute → model, measured:**

| stage | rows | of flagged |
|---|---|---|
| flagged student moves | 154 | 100% |
| `misconceptionTags` rows written | 154 | 100% — every flagged move is captured |
| …carrying a `fundamentalId` (attribution fired) — BEFORE this WO | 68 | 44.2% |
| …carrying a `fundamentalId` — AFTER the `evalAfterPlayed` repair | **79** | **51.3%** |
| …falling through to `other` — BEFORE the repair | 41 | 26.6% |
| …falling through to `other` — AFTER | **35** | **22.7%** |
| rows the **Fundamentals scorecard** sees (`getFundamentalCounts`) | 79 | — |
| rows the **formal weakness profile** sees (`getMisconceptionProfile({countedOnly:true})`, what `weaknessSpine` + `weaknessAnalyzer` read) | **0** | **0%** |

### The `learned` gate — the number you asked for

`shouldCount: opts.learned`, and `autoAnalyzeGameMisconceptions` hardcodes
`learned: false` (autoAnalyzeGame.ts:262). That function is the ONLY entry from
batch analysis (`gameAnalysisService:1955`), from opening a review
(`CoachGameReview:314`) and from a finished coach game (`CoachGamePage:2023`).
So on the recording path **`learned` is false 100% of the time — 154 of 154
rows landed `counted:false`.** The only `learned:true` writers are the
interactive surfaces (the Learn picker, the review's manual capture, the
drill players).

**Is it starving the model?** Yes — but not in the way the comment defends
against. The comment says counting these rows would double-count the same
games' `mistakePuzzles`. That is true of the TAG. It is false of the
FUNDAMENTAL: `fundamentalId` lives ONLY on `MisconceptionTagRecord` (the one
reader is `getFundamentalCounts`), a `MistakePuzzle` carries no fundamental at
all, and `getMisconceptionProfile({countedOnly:true})` drops every one of these
rows. Net: **for every real analyzed game, the fundamental the computer proved
reaches the Fundamentals TAB and never reaches the weakness SPINE.** The
scorecard says "you slip on loose pieces 19×"; the ranker that decides what the
coach teaches next has never heard of it.

**Not changed, per the WO.** The gate sits on WO-3's territory (double-counting
in `weaknessSpine`/`misconceptionService`) and flipping it blindly WOULD
double-count the tag. The clean fix is not "flip `learned`": it is to give the
spine a fundamental-aware reader (aggregate `fundamentalId` over ALL rows, the
way the scorecard already does) so the fundamental counts once and the tag is
left alone. That is a spine change — David's call, and WO-3's file.

### The repair that WAS in scope (found by the measurement, fixed, re-measured)

`BlunderForAnalysis.evalAfterPlayed` has existed since the eval-gated
fundamentals landed; the review path (`coachFeatureService:1453`) and the
interactive capture (`GameReviewWeaknessCapture:80`) both fill it; the
annotation carries the number (`evaluation`). The sweep builder in
`autoAnalyzeGameMisconceptions` passed `evalBefore` and DROPPED it.
`botched-conversion` (#33) gates on `evalBefore` + `evalAfterPlayed` with no
PV — so on the recording path a student who threw away +3 could never be filed
under it. **0 of 154 before, 11 of 154 after**, same games, same engine numbers.
One spread line, mirroring `evalBefore` exactly (mover-POV, mate sentinel
skipped). Gate: three tests in `autoAnalyzeGameMisconceptions.test.ts` built
from one of the real firings (lichess y36gvNEs, +4.12 with Qd5 → +0.14 after
Nc3), with two negative controls: no after-eval → silent; still winning after
(+2.50) → silent. The NUMBER decides, not its presence.

`overvalued-attack` and `poisoned-pawn` still cannot fire on this path — they
gate on the PV (`pvWinsMaterial`) and the sweep persists none. That is a
correct silence, not a gap to paper over.

### What fired, what never did (47 games)

Fired: loose-piece 19 · tempo-handed 11 · passive-when-forcing-existed 11 ·
botched-conversion 11 (after repair) · ignored-threat 7 · created-pawn-weakness
5 · neglected-development 4 · rook-ignored-open-file 3 · buried-own-bishop 2 ·
greedy-pawn-grab 2 · kept-bad-bishop 1 · king-left-in-centre 1 ·
early-queen-sortie 1 · same-piece-twice 1.

**19 of 33 never fired** on 47 amateur games: space-conceded, early-edge-pawns,
knights-before-bishops, premature-centre-break, knight-to-the-rim,
weakened-king-shield, overextended-pawn, traded-active-for-passive,
wrong-trade-for-material, worst-piece-unimproved, all six endgame detectors,
overvalued-attack, poisoned-pawn, capture-toward-centre. Most of the silent ones
are CO_OCCURRENCE rows (they speak only when nothing move-verified attached,
and `loose-piece` attaches first on most amateur blunders) or PV-gated. That is
design, not a defect — but it means the heat map's opening/endgame rows will
stay GREY for most students, and grey means TEACH (CLAUDE.md).

---

## J3 — the attribution gap, ranked by REAL frequency

The WO named five tags with no detector. Two of them (`overvalued-attack`,
`botched-conversion`) HAVE detectors now (#30, #33) — `FUNDAMENTAL_TAG` maps
them. The real gap is three: `no-plan`, `calculation-depth`,
`left-book-early`.

**Measured frequency in real captures: 0, 0, 0.** And that is structural, not
sample size: the classifier's cheap board-check path can return exactly 12
tags, and none of the three is among them. A writer census over `src/`:

| tag | writers in `src/` (non-test) | fires on the recording path |
|---|---|---|
| `no-plan` | **none** | never |
| `left-book-early` | **none** | never |
| `calculation-depth` | one — `CoachGameReview.tsx:2081`, the interactive find-the-shot card | never (interactive only) |

So the WO's premise ("the cheap board-check path still tags them") is false.
Nothing tags them. What the gap actually COSTS is the fallthrough: **35 of 154
flagged moves (22.7%) still land on `other`** after this WO's repair (41 before
it) — a real slip the computer could not name. That 23% is the mass a detector
would have to explain.

**Ranking, for when section 14 builds them (NOT this WO):** ranked by the
evidence that already exists on the board for each, since none has a
frequency yet —
1. **`calculation-depth`** — the only one with a live writer, and the app
   already computes its evidence (`criticalityScan` gapCp, the forcing-scan
   method beat). Highest leverage per line of code.
2. **`left-book-early`** — `theoryDeparture` already computes the departure
   ply; the detector is a join, not a new computer.
3. **`no-plan`** — needs `planRace`/`deriveNextPlans` to say the student had a
   plan available and played nothing toward it; the least-computed of the three
   today.

---

## J1 — the taxonomy is JOINED

The tab and the coach chat teach four classical PILLARS
(`groundedAnswer.FundamentalsTopic`: piece-values / development / centre /
king-safety). The computer attributes 33 `FundamentalId`s (not 34, not 25 —
`FUNDAMENTAL_IDS.length`; both stale counts corrected in APP_MAP). NO code
linked one to the other. `piece-values` — the pillar about the currency of
every trade — had ZERO fundamentals filed under it.

`fundamentalsCatalog.FUNDAMENTAL_PILLAR: Record<FundamentalId, FundamentalPillar | null>`
— total by type, so a NEW fundamental fails to compile until someone decides
its pillar. `null` is an explicit ANSWER (pawn structure, threat habits, endgame
technique are genuinely not among the four pillars — and `passive-king-endgame`
under king-safety would teach the opposite of the truth), never a fallthrough.
`piece-values` now grades `loose-piece`, `wrong-trade-for-material`,
`poisoned-pawn`.

Same repair on the page: `FundamentalSectionId` derives from
`FUNDAMENTAL_SECTION_IDS` (one list, not a hand copy in the page and another in
the test); `SECTION_TEACHING: Record<FundamentalSectionId, pillar | authored prose>`
replaces the page's `Record<string, string>` read as `SECTION_PROSE[id] ?? ''`
(a section with no entry rendered silently BLANK); the seven sections build from
an exhaustive chrome Record. The join FIRES: a pillar section now shows the
student's rolled-up standing (`pillarStanding`) — grey stays silent.

Gates: `fundamentalsCatalog.test.ts` (join total, every pillar non-empty,
null-honoured, blank-card impossible, two negative controls),
`FundamentalsPage.test.tsx` (the standing renders across sections; grey and
null-pillar render nothing), prod audit `scripts/audit-fundamentals-tab-prod.mjs`
(3-instrument, muted, vacuity-checked OK).

---

## Stale facts corrected in `docs/APP_MAP.md`
§5a "calls `captureMisconception` once/game" → loops every flagged move, gated
once/game, `learned:false`. §5b "25 FUNDAMENTAL_IDS" → 33. §5d "5 tags have no
detector" → 3, with the writer census. §11 "no code links…" → the join.

## Next-session pickup
- The spine reader for `fundamentalId` (the real fix for the `learned` gate) —
  WO-3's file, David's call. Do not flip `learned`.
- Section 14 detectors in the order above. `calculation-depth` first.
- The corpus + annotator + fixture extractor live under
  `data/sources/wo4-corpus/` (gitignored); rerun the measurement half of
  `fundamentalsPipeline.realGame.test.ts` after any detector lands to get the
  before/after for free.
