# PositionFacts — the board-truth calculator (engine-fused narration, phase 2)

**David 2026-08-26.** The coach voices facts computed in code (G0). Today's
calculator (`scripts/voiced-authoring/fuse-engine.mjs`) extracts ~20% of what
Stockfish + chess.js already know — eval, best move, a 3-ply PV. This plan builds
the FULL `PositionFacts` per position, ranks it into a board-true briefing, and
feeds it to the DNA-voice phraser (offline: I phrase by hand; live: `voiceFacts`).
It closes the gap between "the engine gives a number" and "Danya explains why."

## The three layers (locked in conversation)

1. **Calculator (`PositionFacts`)** — pure code, no LLM. Everything the engine + board know.
2. **Ranked briefing** — fact → board-true clause, ordered by decision-impact. **NO hard cap.** The general's need-to-know hierarchy; vital never dropped, the voice flexes depth.
3. **DNA phrasing** — offline I phrase by hand per `docs/DNA-outline.md`; live `voiceFacts` phrases the same packet. Same facts, two phrasers.

## The general's briefing hierarchy (Layer 2 order)

1. **Status** — winning/losing, decided or live (eval + WDL).
2. **Incoming fire** — the threat, *calculated out* + latent threats down the road; what's hanging (SEE).
3. **The order + purpose** — best move and *why* (best move + PV reason).
4. **Is it forced?** — only-move vs. quiet-choice (MultiPV gap / criticality).
5. **State of forces** — best/worst piece + *why it's strong* (pieceValueRead + perturbation), weak squares, structure.
6. **The campaign** — where it's heading (structure→plan, PV trajectory).

## Trajectory principle

Every vital fact is voiced as a **played-out engine line, not a snapshot**: the
best move is the PV; the threat is the opponent's PV played out + the latent
threat two moves away; the plan is structure→where-it-leads.

## Already built — REUSE, do not reinvent

- `src/services/pieceValueRead.ts` — per-piece contribution table from `eval` (which pieces are working). ✓
- `src/services/stockfishEngine.ts` — `evalBoard()` sends `eval`; ships `MultiPV 3`; `setMultiPv()` to 256; persistent worker; `go movetime`. ✓
- `src/services/positionalRead.ts`, `liveTacticsContext.ts`, `tacticsDetector.ts` — SEE / threats / positional. ✓ (live-side reuse)
- `EvalBar` + `stockfishCache` / `stockfishFenCache` — continuous eval + free re-asks. ✓
- `groundedAnswer.ts` (`assembleEngineReasoning`, `explainBestMoveGrounded`, `describeMoveGeometry`, …) — the fact-computer leaf. ✓
- `voiceFacts` (`coachApi.ts`) — the G0 chokepoint. ✓
- NNUE **incremental accumulator** — inside Stockfish (free by shipping it). ✓

## The missing items to build (the FIRST-identified list — do not miss any)

1. **Positional feature vector** — per-piece mobility, bad bishop (pawns on its colour), outposts, weak/backward/isolated/doubled pawns, open/half-open files, king attacker-vs-defender count, pieces with no safe square. (partial in `positionalRead`; complete it)
2. **Threat, CALCULATED OUT** — opponent's PV played out (null-move) + **latent threats** that appear 2–3 ply down the road, not one immediate null-move.
3. **MultiPV criticality** — top-3 (or wider) spread → only-move vs. quiet.
4. **Full PV + refutation branches** — the six-move calculation + the tempting alternatives' refutation PVs ("if the knight takes, then…").
5. **Move classification WITH the reason** — not just cpLoss label: hung a piece (SEE) / missed a forcing win / walked into the threat / second-best plan.
6. **Structure → plan** — IQP / hanging pawns / Carlsbad / closed centre → canonical plan set.
7. **WDL** — win/draw/loss band (the practical read).
8. **seldepth** — forcing-depth signal.
9. **Perturbation causal why-probe** — leave-one-out on a piece's *supporters* ("the bishop leans on d5; take it and it's ordinary"). The one genuinely-NEW capability. Cheap: static eval, no search.
10. **THE CRITICALITY SCORE (keystone)** — reads the cheap stream; (a) gates the deep search, (b) speaks "key moment — don't rush," (c) decides deep-vs-light, (d) gives silence-when-quiet. Everything hangs off it.

## The cost architecture (the cheat code)

- **Cheap continuous layer, every move** (tap the warm eval-bar engine + cache): eval, cpLoss (stream diff), WDL, shallow MultiPV-3, per-piece read, hanging-piece (SEE), board features. The positional "why" is a **static eval — no search — cheap**; perturbation probes are static evals too.
- The cheap layer computes the **criticality score**, which is the deep-search gate AND the "key moment" narration AND the silence gate — one signal, four jobs.
- **Expensive deep search only where the score trips a wire:** tight/huge MultiPV gap (only-move / big edge), a threat/hanging piece (calculate its follow-through), a forcing line hinted (seldepth spike / checks-captures PV), an eval swing, or a declared teaching keystone.

## Build phases

- **Phase 0** — this plan doc. `done`
- **Phase 1** — `position-facts.mjs` (THE Phase-1 calculator; supersedes `fuse-engine.mjs`'s packet — carries everything it did + more). `done`. Emits a durable `PositionFacts` JSON per ply (`--json` → `audit-reports/position-facts/<id>.json`) so nothing is ephemeral, plus a readable criticality tape. Per ply, all board-true from one `go depth D` MultiPV-5 + WDL (+ a cheap after-search only when the played move blunders outside the fan):
  - opening (DB prefix) · evalAfter · **cpLoss + label** (book..blunder) · best SAN · **full PV (~10 ply)** · **candidates[5]** · **WDL (practical read)** · seldepth · forcing/material · loose (SEE-lite) · trap (shallow-vs-deep) · **CRITICALITY {V,O,T,F,L,score,band}**.
  - **Criticality score** = 0.42·volatility(spread/300) + 0.20·onlyMove(gap12/150) + 0.16·trap(shallow-vs-deep) + 0.12·forcing(material/seldepth) + 0.10·loose; floors: loose≥3 → ≥55, mate-in-air → ≥80. Bands: <20 quiet · 20–45 think · 45–70 key · ≥70 CRITICAL.
  - **Proven on Kramnik:** CRITICAL exactly on Kramnik's Rfe1 blunder (gap12 291) and on Bxg7/exd5; quiet through the KID development. **Validated on a clean game (MVL) + a scramble (Nepo)** so thresholds aren't Kramnik-overfit.
  - **CALIBRATION NOTE (do not lose):** the score flags *sharp / only-move / forcing* moments — the true "don't rush" moments — and deliberately stays quiet in calm positions. It does NOT (and should NOT) predict every blunder-in-a-calm-position: Black's calm …Nfd7 slip is caught **retrospectively by cpLoss/label**, not by prospective criticality — crying "critical!" before every calm move would be wolf-crying. Two separate jobs: criticality = prospective "this is sharp"; cpLoss = retrospective "that was a slip." Phase 2's threat-out adds the *must-defend* class (opponent has a concrete threat) — a third, distinct signal.
- **Phase 2** — threat *calculated out*: give the opponent the move (flipped-FEN null-move, chess.js-guarded), search at `SF_THREAT_DEPTH` (14) → their best line = the threat played out; `forcingWinsMaterial` on that line = `threat.net` (concrete standing threat), `latentLandsAt` = `threat.landsAt` (the ply the material actually falls). Fold a **must-defend** component `Tr` into criticality (rebalanced weights **V.35 O.15 T.12 F.10 L.08 Tr.20**, sum 1.0) + a floor (`threatNet≥3 → score≥50`). Plus **refutation branches**: after a mistake/blunder, capture the opponent's punishing PV (why the move failed, played out) from the after-search (out-of-fan) or the in-fan candidate's own continuation (no extra search); and every candidate now carries a short PV ("if the knight takes, then…"). `done`
  - **CALIBRATION (do not lose):** threat-out is the *third, distinct* signal — **must-defend** (the opponent has a concrete threat you must meet), NOT a second blunder-predictor. It correctly does **not** try to pre-flag Kramnik's calm …Nfd7 slip — that stays a *retrospective* cpLoss catch (crying "critical!" before every calm-but-blunderable move is wolf-crying). The earlier "…Nfd7 must light up" hope was superseded by the validated two-signal design (see `docs/plans/artifacts/position-facts-phase1-validation.md`). Threat-out lights up where a **standing** threat really exists.
- **Phase 3** — perturbation causal why-probe + move-reason classification. `done`
  - **State of forces** (every ply, one static `eval`): NNUE per-piece contribution table + material/positional bucket split, ported from `src/services/pieceValueRead.ts`. `forces` = mover's best piece / worst minor / opponent's best, each by **delta vs its own kind** (scale-free — the outperforming piece, not the naturally-big queen).
  - **Perturbation why-probe** (gated to key+, the genuinely-NEW capability): leave-one-out on the SUPPORTERS (`chess.attackers(sq,color)` — real defenders by construction) of the mover's delta-best piece; remove each, re-`eval`, measure the star's contribution drop. Biggest drop ≥ 0.5 = the load-bearing supporter. Proven board-true: KID `knightf6←bishopg7 (−2.86)` (the fianchetto bishop IS the f6 knight's key defender), `knightc3←pawnb2`, `knightd7←knightc5`.
  - **Move-reason** (why, not just the label — from signals in hand): bad → `hung-piece` (SEE now) / `ignored-threat` (standing must-defend unmet) / `walked-into-tactic` (refutation wins material a few ply in) / `missed-forcing-win` / `lost-the-thread`; good → `only-move` / `defends-threat` / `imprecise-defence` / `wins-material` / `best` / `solid` / `second-best`. Validated: Kramnik `Kxg7`→only-move, `Qd2(45)`→defends-threat, `Qd2(57)`→imprecise-defence, `Rfe1`/`Nfd7`→lost-the-thread; Nepo `f4`→walked-into-tactic, `cxb4`/`f3`→hung-piece.
- **Phase 4** — positional feature vector + structure→plan. `done`
  - **Feature vector** (mechanical — pure chess.js/FEN, board-true by construction): doubled / isolated / passed pawns, open + half-open files, bad bishop (≥4 friendly pawns on its colour), king-zone attacker-vs-defender count, and a **phase** read (opening/middlegame/endgame via piece count + home-minor count).
  - **structure→plan** (conservative, canonical): isolated queen pawn / hanging pawns / closed centre / open centre, each with the mainstream plan for both sides ("translation, not invention"). **Rank-guarded** — the DYNAMIC isolani (d4/d5) only, never a d6 weakness dressed as a strength (the outpost-bug class); structure suppressed in the opening.
  - Validated on Kramnik: the false d6-IQP "strength" claims are gone (10→2, both real d5 isolani); closed-centre correctly does NOT fire (this KID line never locked with …e5).
- **Phase 5** — Layer-2 ranked-briefing renderer (`render-briefing.mjs`), fact→board-true clause in the general's hierarchy, **no hard cap**. `done`
  - 1 STATUS (eval+WDL, band-change only, "decided" gated to agree with the post-move eval) · 2 INCOMING (threat calculated out + landsAt) · 3 THE MOVE + WHY (teach-both baked in for bad moves) · 4 FORCED? (only-move / MultiPV gap) · 5 FORCES (best/worst piece, perturbation "leans on", weak pawns, edge type) · 6 CAMPAIGN (structure→plan, PV trajectory).
  - Per-move facts (status/threat/move) fire every ply; standing facts (forces/structure/edge) use a say-once set (pieceValueRead's pattern) so they're stated when they first appear/change, not re-read every ply. Proven: Qd2(45) renders "Incoming: they threaten the queen (Qxd4…) — lands at once" → "Qd2 meets the threat" — the general's briefing exactly.
- **Phase 6** — re-cut the Kramnik narration off full `PositionFacts`; board-truth gate. `done`
  - Re-cut the crux beats (32/34/35) with the exact facts: ply 32 …Nfd7 corrected from "almost four points" to the real ~3 (cpLoss 301) with the concrete refutation (Bxg7 strips the king, b4 wins the c5 knight); ply 34 …Kxg7 now stated as the FORCED recapture it is (leave the g7-bishop and Bxf8 takes the rook — threat net 5 @1); ply 35 Rfe1 sharpened around the missed b4 kill.
  - **Honesty catch (locked in `engine-fused-narration.md` rule 6):** the threat probe flagged ply 45 Qd2 as a +9 must-defend, but it's a MUTUAL queen attack the mover resolves by capturing first — a trade tension, not a one-sided hang. The existing "sidestepping the trade" was kept; the "hanging queen" rewrite the heuristic invited would have OVERSTATED it. The calculator grounds; the author reads which flags are truly one-sided.
  - **Gate:** `verify-shard.mjs` → 55/57 authored, **fidelity 0 / board-truth 0 / missing 0**.

**OFFLINE BUILD 100% COMPLETE** (Phases 0–6). Phase 7 (live runtime wiring into
`groundedAnswer.ts` / `voiceFacts` + the play/teach surfaces + the "key moment —
don't rush" event) is the separate, WITH-David pass — NOT started here.
- **Phase 7 — live wiring (IN PROGRESS, David greenlit 2026-08-26).** The runtime stack is built + tested: `criticality.ts` (score) · `narrationImportance.ts` (speak/rank verdict) · `threatOut.ts` (must-defend, turn-aware) · `perturbation.ts` (leans-on) · `positionFacts.ts` (composer → kind-tagged DNA clauses, both sides: student decision + opponent intent + how to undermine their piece). Reconciled with `scanCriticality`/`findHangingPieces`/`parseEvalTable`/`criticalityThresholds` — no second criticality, no duplicated detection. `clauseText(items, exclude)` lets each surface emit only what its existing lanes don't cover.
  - **Wired (all on `main`):**
    - Learn — `CoachTeachPage.handleStudentMove` (excludes `must-defend`; the tactics lane already covers it).
    - Read-this-position — `usePositionNarration` (excludes `must-defend`; injected into `additionalContext`).
    - Phase-transition narration — `usePhaseNarration` (excludes `key-moment`+`convert`; appended to `transitionSentence`, and it now breaks the silence gate so a concrete fact speaks even with no ritual/lookahead).
    - Play-live — `useLiveCoach` via `groundedMoveFeedback`'s `extraFacts` seam (excludes `must-defend`+`key-moment` — pure-play surface).
    - Hints — `useHintSystem`, Tier 2/3 only (Tier 1's honesty contract bans piece/square names, so the named clauses are withheld and the perturbation probe is not paid for; excludes `key-moment`+`student-leans`).
  - **Deliberately NOT wired (honest no-yes-man call, not a gap):**
    - **Tactics drill** — silent by contract (Narration Voice Rule #8: "Drill positions stay silent") and already corpus-covered via `tacticNoteForPuzzleThemes`. A live voice supply here would break the rule OR duplicate the note. Teaching stays WRITTEN-only.
    - **Matchup / Watch** — pre-baked Tier-1 narration (`bakedNarrationFor` / voiced corpus). PositionFacts is a *live* Tier-3 fact-supply; it has no job where the prose is already authored + gated offline.
  - **Audit:** post-deploy 3-instrument run on the touched surfaces (in progress).

## Decisions log

- **2026-08-26** Build offline (`fuse-engine`) first as the reference implementation — non-destructive, provable on the Kramnik game; the live side mirrors it by reusing the TS services. Runtime wiring is a later, separate pass with David.
- **2026-08-26** The criticality score is the keystone and is built first (Phase 1).
- **2026-08-26** Layer 2 has **no hard cap** — rank by decision-impact; the vital tier is never dropped, the voice flexes depth.
- **2026-08-26** Same `PositionFacts` feeds both phrasers (hand offline / `voiceFacts` live), unifying the two narration pipelines.

### Phase 7 design decisions (David, live design session 2026-08-26 — see CLAUDE.md "THE COMPUTER DECIDES WHAT IS SPOKEN")

- **Use case ranking:** #1 is strengthening the EXISTING computed narration
  (weakest at Tier 3 — no bake, no note); then post-game review (criticality =
  turning-point selection; move-reason+refutation = precise fault). Also:
  "read this position", hints, matchup/Watch demos, tactics drill.
- **DNA runs through BOTH the computer and the LLM.** Computer writes
  DNA-structured facts (ranked briefing); LLM carries the DNA register too;
  `preferRaw` speaks the computed prose and bypasses the LLM where it's tight.
- **The computer decides what is spoken, not the LLM.** Importance is COMPUTED
  (selection + order); the LLM voices everything handed to it, in order.
- **Importance filter = rating-scaled decision-leverage**, NOT "eval-bar moved"
  (that fails on sharp-but-flat / decided blow-out / standing threat / quiet
  lesson). A fact speaks when ANY of {decision-leverage (`scanCriticality`),
  realized swing (cpLoss), must-defend (null-move threat), declared teaching
  beat} fires, each rating-scaled, gated by a contested (WDL) check. Silence =
  quiet + nothing threatened + no teaching beat.
- **Reconcile, do not duplicate.** `scanCriticality` is the existing grounded
  criticality primitive — build the composite ON it, never a second parallel
  criticality. Reuse `describeStructure` (features), the grounded move-reason
  family (`moveRating`/`whyItFailed`/`describeMoveMerit`), and `detectNewThreat`.
- **Walk-overs to remove (verified superseded, surgical):** the
  `opponentsBestPiece` best-piece/outpost branch of `buildPlayCommentary`
  (superseded by `pieceQualityLines`); overlapping `buildPositionalRead` /
  `assessPositionalEdge` / `describeMoveConsequence`; and the dead files
  `narrationEngine.ts` (0 refs) + `layeredNarration.ts` (test-only). Each
  proven dead/superseded before deletion (David's "verify it's actually dead"
  rule) — grep all consumers first.

## Sequencing logic

Criticality first because it is load-bearing for everything else: it decides
when the expensive facts (deep PV, branches, perturbation) are even computed, and
it is itself a top-tier briefing fact ("key moment"). Threat-out and the
why-probe come next because they are the two facts that most separate our
narration from a snapshot. Structure→plan and the renderer are last because they
consume the facts the earlier phases produce.

## Next-session pickup

**Phases 0–6 (the offline build) are DONE.** The calculator is
`scripts/voiced-authoring/position-facts.mjs` (per-ply `PositionFacts` →
`audit-reports/position-facts/<id>.json` + a criticality tape); the Layer-2
renderer is `scripts/voiced-authoring/render-briefing.mjs` (→ `<id>-briefing.json`
+ readable briefing). Regenerate for any video with:
```bash
git show 09120f6:data/video-narration/<id>.json > data/video-narration/<id>.json
SF_DEPTH=18 SF_THREAT_DEPTH=14 node scripts/voiced-authoring/position-facts.mjs <id> --json
node scripts/voiced-authoring/render-briefing.mjs <id> --json
```
Validated on Kramnik (clean) / MVL (blitz) / Nepo (scramble). Kramnik re-cut is
gated 0/0/0.

**The two remaining bodies of work, both DOWNSTREAM of this and NOT started:**
1. **Author the 9 sparse videos** off the briefing (hand, zero LLM), per
   `docs/engine-fused-narration.md`. This is the immediate producer-side use.
2. **Phase 7 — live wiring, WITH David only.** Extend `groundedAnswer.ts`, route
   criticality into `voiceFacts` + the play/teach surfaces, add the "key moment —
   don't rush" narration event. Do NOT start unprompted.
