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
- **Phase 1** — `fuse-engine` → `PositionFacts` scaffold + **the criticality score first**. Extend per-ply extraction to MultiPV-3 spread, WDL, seldepth, forcing-line, hanging-piece (chess.js SEE-lite). Compute the score + band (quiet / worth-a-think / key-moment / THE moment). **Prove on the Kramnik game: the score spikes on the two blunders and stays dark through the quiet development.** `in progress`
- **Phase 2** — threat *calculated out* (opponent PV + latent-threat scan) + full PV + refutation branches. `pending`
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
