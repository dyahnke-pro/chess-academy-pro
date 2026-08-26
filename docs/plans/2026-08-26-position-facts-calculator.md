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
- **Phase 2** — threat *calculated out*: give the opponent the move (flipped-FEN null-move, chess.js-guarded), search → their best line = the threat played out; scan the opponent PV for the ply a NEW threat lands (latent). Fold a threat component into the criticality score (must-defend). Re-run Kramnik → …Nfd7 must light up. Then full PV + refutation branches. `next` `in progress`
- **Phase 3** — perturbation causal why-probe (leave-one-out on supporters) + move-reason classification. `pending`
- **Phase 4** — complete positional feature vector + structure→plan. `pending`
- **Phase 5** — Layer-2 ranked-briefing renderer (fact→clause, general's hierarchy, no cap). `pending`
- **Phase 6** — re-cut the Kramnik narration off full `PositionFacts` to show the lift; board-truth gate. `pending`
- **Phase 7 (separate, WITH David)** — live wiring: extend `groundedAnswer.ts`, route criticality into `voiceFacts` + the play/teach surfaces, add the "key moment — don't rush" narration event. **NOT in this offline pass.** `pending`

## Decisions log

- **2026-08-26** Build offline (`fuse-engine`) first as the reference implementation — non-destructive, provable on the Kramnik game; the live side mirrors it by reusing the TS services. Runtime wiring is a later, separate pass with David.
- **2026-08-26** The criticality score is the keystone and is built first (Phase 1).
- **2026-08-26** Layer 2 has **no hard cap** — rank by decision-impact; the vital tier is never dropped, the voice flexes depth.
- **2026-08-26** Same `PositionFacts` feeds both phrasers (hand offline / `voiceFacts` live), unifying the two narration pipelines.

## Sequencing logic

Criticality first because it is load-bearing for everything else: it decides
when the expensive facts (deep PV, branches, perturbation) are even computed, and
it is itself a top-tier briefing fact ("key moment"). Threat-out and the
why-probe come next because they are the two facts that most separate our
narration from a snapshot. Structure→plan and the renderer are last because they
consume the facts the earlier phases produce.

## Next-session pickup

Phase 1 lands the criticality score in `fuse-engine` + a Kramnik proof
(`audit-reports/engine-packets/`). Resume at Phase 2 (threat-out + PV branches).
All offline; no runtime touched until Phase 7 with David.
