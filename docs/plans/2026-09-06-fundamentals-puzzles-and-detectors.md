# PLAN — Fundamentals: more puzzles on the tab, the D-rules into the computer, matched to app standard

David 2026-09-06: "Fundamentals computer got an upgrade. Plan how to add more
puzzles to this tab and how to match the standards of the rest of the app… make
sure to plan on adding the D files into computer and integrate properly." Then, on
the 200-maxim triage: the **D (deterministic)** rules are the prize — board/engine-
provable, so each can become a detector. "Detector already computes when and when
not to announce" — so the PATTERN+PUNISHMENT+COUNTERFACTUAL triad gates firing;
we do NOT pre-filter D rules for "spam." **Plan only. No fixes.**

Read `docs/APP_MAP.md` §5 (the review→fundamentals→weakness→drill pipeline) and
§11 (the tab) first — this plan is built on that map.

## BUILD STATUS (2026-09-06)
- **Wave 1 (endgame) — DONE + tested:** `passed-pawn-neglected`, `lost-the-opposition`,
  `passive-rook-endgame` (detectors + voice + tags + devices + real-game fixtures).
- **Wave 2 (middlegame) — DONE + tested:** `kept-bad-bishop`.
- **Phase B — DONE:** the tab's Drill button routes themed sections to `/tactics/drill`
  (`filterThemes` falls through to raw Lichess tags) and positional sections to
  `/tactics/mistakes` (own flagged positions). No new resolver service needed.
- **Phase C — DONE + tested:** `FundamentalsPage` rebuilt to the app hub standard
  (centered title + SmartSearchBar + 7 phase-section cards), each with Listen
  (grounded read-aloud) + Drill + the Opera-Game walk where a game exists.
- **DEFERRED (honest — "no false narrations / don't overstate the why"):** the detectors
  whose *why* isn't board-provable without more inputs — `overvalued-attack`,
  `botched-conversion` (need the pre-move eval threaded into `AttributionInput`),
  `left-book-early` (needs the opening-book DB in the pure attributor), and the
  infer-the-why cases `poisoned-pawn` (needs a trapped-queen lookahead),
  `wrong-chain-target`, `captured-from-centre`, `blocked-c-pawn`. The 3 approved-but-unused
  new tags (`pawn-majority`, `pawn-chain-target`, `strategic-target`) are NOT added until
  their detectors land — a tag no detector produces is dead. Follow-up: thread an optional
  `evalBefore` into `AttributionInput` to unlock the two orphan-tag fills.

## The three deliverables
- **A.** Add the D-rules to the fundamentals computer as new detectors + integrate
  the whole way through (tag → misconception → weakness → drill → review voice).
- **B.** Wire fundamentals → drillable puzzles, and surface "more puzzles" on the tab.
- **C.** Rebuild the `/coach/fundamentals` tab to the app hub + teaching standard.

## The taxonomy problem (must resolve first)
Two disconnected taxonomies exist (APP_MAP §11): the tab's **4 prose "pillars"**
(`FundamentalsTopic`: piece-values / center / development / king-safety) vs the
computer's **25 `FUNDAMENTAL_IDS`** (12 opening / 10 middlegame / 3 endgame). No code
links them. Resolution: author a single rollup
`FUNDAMENTAL_PILLAR: Record<FundamentalId, PillarId>` where `PillarId` EXPANDS the 4
pillars to phase/theme sections that cover every fundamental — proposed 7 sections:
**Opening play · The center · Development & activity · King safety · Pawn structure ·
Tactics & threats · Endgame technique.** The tab groups the fine fundamentals under
these; the coach chat lane keeps answering the coarse pillars. This rollup is the
join the tab renders from.

---

## Phase A — D-rules → detectors, integrated (the core ask)

**Authoring cost (APP_MAP §5b):** each detector is a `(Ctx) => att(...) | null` added to
the `DETECTORS` array in `principleAttribution.ts`, plus its id in `FUNDAMENTAL_IDS` +
`FUNDAMENTAL_TAG` (+ `CO_OCCURRENCE` if positional), plus a `fullVerdict`/`shortVerdict`/
`RECAP_NOUN` case in `principleVoice.ts`. **Reuse an existing `MisconceptionTagId` in
`FUNDAMENTAL_TAG` → the drill/weakness/UI layers need ZERO change.** A genuinely new tag
also touches `misconceptionTags.ts` + `misconceptionClassifier.ts`. The triad decides when
each fires; a rule with no punishment on the board simply stays silent.

**Ship in WAVES, endgame first (it's the thinnest — 3 of 25 today).** Each wave = one PR:
add the detectors, add the voice cases, add unit tests (§Gates), run ship-check.

### Wave 1 — Endgame (highest value)
| # | maxim | new `FundamentalId` | detection signature (from `Ctx`) | tag | drill source |
|---|---|---|---|---|---|
|30|passed pawns must be pushed|`passed-pawn-neglected`|friendly `isPassed` pawn exists; `best` pushes/supports it; played didn't and opp blockades/wins it|NEW `passed-pawn-neglected`|Lichess `passedPawn,advancedPawn,promotion` ✓|
|108|opposition / key squares|`lost-the-opposition`|K+P ending; `best` takes/keeps opposition or a key square; played surrendered it (CO_OCCURRENCE)|reuse `passive-king-endgame`|`pawnEndgame,zugzwang` ✓|
|45/70|activate the rook (7th / behind passer / cut off king)|`passive-rook-endgame`|rook ending; `best` activates the rook; played left it passive (CO_OCCURRENCE)|NEW `passive-rook`|`rookEndgame` + own positions|
|68|majority: candidate leads|`majority-mishandled`|healthy pawn majority; `best` advances the candidate; played crippled it (CO_OCCURRENCE)|NEW `pawn-majority`|own positions|
|22|K+Q/K+R basic mate|— fills existing tag —|K+Q or K+R vs lone K; move makes no progress to mate / risks stalemate|reuse `botched-conversion` (orphan)|own positions|
|149|don't relax when winning|— fills existing tag —|eval was winning (≥ +2 for mover); move drops it below winning (engine delta on persisted PV)|reuse `botched-conversion` (orphan)|own positions|
|49|OCB draw / fortress|`mishandled-ocb`|opposite-colored bishops; entered when it throws a win, or misplayed the fortress|reuse `botched-conversion`|`bishopEndgame` + own|

### Wave 2 — Middlegame / strategy
| # | maxim | `FundamentalId` | signature | tag | drill |
|---|---|---|---|---|---|
|40|don't attack unless better|— fills tag —|played a committal sac/attack; engine PV refutes (eval drop); `best` is quiet|reuse `overvalued-attack` (orphan; has themes)|`sacrifice,attackingF2F7,kingsideAttack` ✓|
|86|trade off the bad bishop|`kept-bad-bishop`|mover has a bad bishop (low `pieceMobility`, blocked by own pawns on its color); `best` trades/frees it; played didn't (CO_OCCURRENCE)|reuse `misplaced-piece`|own positions|
|69|attack the base of the chain|`wrong-chain-target`|pawn chain present; `best` strikes its base; played hit the head/elsewhere (CO_OCCURRENCE)|NEW `pawn-chain-target`|own positions|
|50|don't grab the b-pawn with the queen|`poisoned-pawn`|queen captured b2/b7; `best` declines; opp traps / wins big tempo on the queen on `after`|reuse `greedy-pawn-grab`|`trappedPiece,hangingPiece` ✓|
|21|f2/f7 pressure|`ignored-f7-pressure`|opp massing on the mover's f2/f7; `best` defends/pre-empts; played ignored it|reuse `missed-opponents-threat`|`attackingF2F7` ✓|
|89|trade with the healthier structure|— enrich existing —|extend `traded-active-for-passive`/`wrong-trade-for-material` to weigh pawn structure (`doubledPawns`/`isolatedPawns`/islands)|reuse `bad-trade`|own positions|
|47/72|two weaknesses / minority attack|`missed-second-weakness`|plan-level; low firing rate — add but expect it to lead Watch narration more than review|NEW `strategic-target`|own positions|

### Wave 3 — Opening (well covered; fill the gaps + the orphan tag)
| # | maxim | `FundamentalId` | signature | tag | drill |
|---|---|---|---|---|---|
|100|don't block the c-pawn|`blocked-c-pawn`|played Nc3/Nc6 in front of an unmoved c-pawn in a d-pawn structure; `best` develops without blocking|reuse `neglected-development`|own positions|
|23|premature Bg5/Bg4 pin|`premature-pin`|pinned the f6/f3 knight to the queen while opp uncastled; opp breaks (h6+g5 / …Qxpin) and `best` doesn't|reuse `tempo-handed`|own positions|
|17|capture toward the center|`captured-from-centre`|two pawn recaptures available; played the one AWAY from center; `best` is toward|reuse `space-conceded`|own positions|
|—|left theory into a worse line|— fills tag —|opening phase; move leaves the DB book line (`openings-lichess.json`) into an eval-worse position|reuse `left-book-early` (orphan)|opening-line|

### Wave 4 — The D-metric rules (board FACTS; add as detectors in their neglect+punishment form)
Per David, all D go in; the triad gates firing, so these are safe to add even if they fire
rarely. Each is framed as a neglect+punishment detector (not a bare metric):
`conceded-outpost` (#6/#64 — opp planted a knight on a hole `best` could have denied),
`passive-piece-left` (#16/#18 — `best` centralizes, played left the worst piece stuck →
already partly `worst-piece-unimproved`), `bishop-blunted-by-pawns` (#3/#81 — own pawns
fixed on the bishop's color), `conceded-open-file` (#8/#53 — `best` seizes/doubles on an
open file first), `damaged-own-structure` (#31/#32/#33 — created doubled/isolated pawns /
an extra island → overlaps `created-pawn-weakness`). Where a rule collapses into an existing
detector, EXTEND that detector's evidence rather than adding a near-duplicate id.
Pure geometry facts with no neglect form (#1 space, #4 king geometry, #24 Nf8, #82 color
coordination) stay as **board-analysis facts + Watch narration + drill position-filters**,
not attributions.

### Integration checkpoints (prove the wire fires, per CLAUDE.md "a wire that doesn't fire isn't a wire")
1. Detector fires on a crafted fixture → attribution returned (unit test per detector).
2. `principleVoice` speaks it (exhaustive switch — TS fails the build if a case is missing).
3. `misconceptionClassifier` returns the mapped tag on the same fixture.
4. A real note comes OUT of the weakness/drill surface for that tag (a `mistakePuzzle` is
   produced from a game containing the fault; the Weaknesses row + Training Plan item appear).

---

## Phase B — Fundamentals → puzzles (the "more puzzles" ask)

- **Two drill sources per fundamental** (APP_MAP §5d/§9): (a) a Lichess `puzzleThemes` tag
  where a real theme exists (tactical/mate/technique — the ✓ rows above), drilled via the
  existing `getPuzzleForThemeAtRating` / `TacticDrillPage` `filterThemes` hand-off; (b) the
  student's OWN flagged positions (`mistakePuzzles`), produced automatically once the new
  detector fires — this is the honest source for positional/strategic fundamentals with no
  Lichess theme. Never fabricate puzzles (empty > invented).
- **Author `puzzleThemes` on the tags that lack them** ONLY where a real Lichess theme maps
  cleanly (e.g. `passed-pawn-neglected` → `passedPawn,advancedPawn`; `lost-the-opposition`
  → `pawnEndgame,zugzwang`). Leave positional tags theme-less (they drill from own games).
- **Add a resolver** `fundamentalDrill(id)` → `{ puzzleThemes?: string[]; ownPositions: true }`
  reading `FUNDAMENTAL_TAG` → `getMisconceptionTag(tag).drill`. The tab's "Drill" button
  routes: themes present → `navigate('/tactics/drill', { state: { filterThemes } })`;
  else → the weakness/mistake drill filtered to that tag.
- **Grow the corpus honestly:** where a fundamental deserves more themed puzzles than
  `puzzles.json` carries, that's a data-acquisition task (flag it), not an invention.

---

## Phase C — Rebuild the tab to app standard (APP_MAP §12)

- **Hub shell:** make `/coach/fundamentals` a first-class hub — centered title +
  `SmartSearchBar` (`scope` unset) in `max-w-lg mx-auto w-full` + the standard scroll
  container; keep `PageHelp`. Reorganize the 4 flat pillar cards into the **7 rollup
  sections** (above); tapping a section drills into its fundamentals.
- **Each fundamental card** = the WLPP-lite the tab is missing: **Watch** (authored
  house-voice narration teaching the idea — this is where the **H maxims** live: two
  registers, board-true, `sources[]`, lead-the-eye where a position is shown) + **Drill**
  (Phase B) + **"See it in your games"** (deep-link to a review ply where the fundamental
  was flagged, when one exists — reuse the existing `/coach/review/:id` hand-off and the
  Opera-Game pattern). Board practice via `ConsistentChessboard` / `ChessLessonLayout`
  (now clip-proof) — no new board primitive.
- Keep the existing read-aloud pillar prose as the section intros (`assembleFundamentalsAnswer`,
  `useProseReader`/`speakReadAloud`, G5-exempt).

---

## Gates + audits
- **Unit:** one test per new detector (fires on the fixture, silent on the counterfactual);
  `principleVoice` exhaustiveness is compiler-enforced; `fundamentalDrill` resolver test;
  a `fundamentalPillar` rollup test (every `FundamentalId` maps to a `PillarId`).
- **Content gates (ship-check `GATE_TESTS`):** new narration on the tab goes through
  `perspectiveVoice` (you/they), `narrationAccuracy` (board-true), `narrationSources`
  (every unit sourced). Add the tab's cards to whichever coverage gate fits.
- **Audit (G1):** extend `scripts/audit-coach-fundamentals-prod.mjs` to drive the new
  hub → section → Watch (listener confirms voice fired) → Drill (a real puzzle loads and
  grades) → "see it in your games". Add its glob to the `--full` `AUDIT_MATRIX`.

## Sequencing
1. Wave-1 detectors + voice + tests (endgame) → ship-check → main.
2. Phase B resolver + `puzzleThemes` for the Wave-1 tags.
3. Phase C tab shell + section rollup + Wave-1 fundamentals' Watch/Drill cards.
4. Waves 2-3 detectors, then their tab cards. Wave 4 last.
5. Extend the audit each wave; post-deploy 3-instrument audit after each `main` push.

## Decisions log (David, 2026-09-06 — all three RESOLVED)
- **Tab structure → 7 phase sections** (NOT the 4 nested pillars): Opening play · The
  center · Development & activity · King safety · Pawn structure · Tactics & threats ·
  Endgame technique. Every `FundamentalId` rolls up under exactly one via
  `FUNDAMENTAL_PILLAR`. Phase C builds this.
- **The 5 new tags APPROVED** (`passed-pawn-neglected`, `passive-rook`, `pawn-majority`,
  `pawn-chain-target`, `strategic-target`) — added to `misconceptionTags.ts` +
  `misconceptionClassifier`; the rest of the table still reuses existing tags.
- **Positional drills = the student's OWN flagged positions** (`mistakePuzzles`), produced
  automatically when the detector fires. NO curated position sets authored this pass
  (accepted tradeoff: a brand-new user with no games has nothing to drill for a positional
  fundamental until they play — the themed/tactical fundamentals still drill from
  `puzzles.json` from day one). Revisit curated sets only if day-one coverage becomes a
  complaint.

## Open questions
- `left-book-early` needs a book-membership check in the opening phase — reuse the
  `openings-lichess.json` trie (`openingDetectionService`) or the repertoire set?
- Does the tab replace the coach-chat fundamentals lane or stay parallel? (Recommend
  parallel — shared `assembleFundamentalsAnswer` source.)

## Next-session pickup
Start Wave 1 in `principleAttribution.ts` (endgame detectors) using the authoring pattern
in APP_MAP §5b; one detector at a time with its fixture test. Do NOT touch `registry.ts`
(pro-rep/masterclass gate) — this work is in the review/weakness lane, not the lesson gate.
