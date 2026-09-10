# The Coach Audit — the Standing Net (plan)

**Locked with David 2026-09-10.** Deliverable choices:
- **Standing net** — a DURABLE, re-runnable audit suite covering every coach
  function, DRIVEN BY HAND (the 2026-07-24 "you push the buttons, not a bot"
  standard). It re-runs on every future build; a regression lights up red next
  time, not just now.
- **First run = the broken-map.** The net's first full pass produces the thing
  David wants now: a complete, ranked register of everything broken (works vs
  should-work, per function). **NO fixes until the whole map exists and David
  has reviewed it.** Fixes are a separate later phase; the net stays after.
- **Full sweep, risk-ordered.** Every function, organized into tracks, highest-
  risk / highest-traffic first.
- **Layered method.** See it in person AND cross-check every observed moment
  against an independent oracle, plus gated test-drive hooks to force exact
  states. Accuracy over speed (David: "not the quickest — the best way to
  actually see how each function works vs how it should").

Inventory this audits: `docs/coach-tab-feature-map.md`. Architecture:
`docs/coach-system-map.md`. Grounding law: `CLAUDE.md` G0/G1/G3.

---

## 1. The accuracy thesis — why layered, not a happy-path click-through

"See it in person" is NECESSARY but NOT SUFFICIENT. The UI can render and speak
fluently while the underlying fact is wrong. So the audit pins each function at
the LAYER it actually lives and judges it against an independent ORACLE — never
against "did something render." Four failure modes it must defend against, each
of which has burned this repo:

1. **Fluent-but-wrong** — a grounded answer that is fluent and internally
   consistent but describes a DIFFERENT position (the note-selection-by-name
   bug: "Bxf7+ works if the d6-bishop is defended" narrated at move two). No gate
   catches it; only an oracle checked against THIS board does.
2. **Silent no-op false-green** — a function never actually reached, logged `ok`
   (the 2026-06-12 audit that reported 13/14 "ok" with 8 functions never
   exercised). A step that can't prove it reached its post-state = BROKEN, never
   ok.
3. **Harness-didn't-reach** — prod unreachable read as "surface down" / falling
   back to localhost and calling it prod. The audit must prove it reached the
   real surface before concluding anything about the product.
4. **Looks-right-is-wrong** — the arrow renders on the wrong piece, the narration
   names an empty square, the eval is stale. Caught only by asserting board-truth
   per ply, live, against chess.js/Stockfish.

## 2. The oracle per function type (the crux — "how it SHOULD work")

Every function is judged against an INDEPENDENT source of truth, not its own
output. This table is what makes the audit "accurate" rather than "observational."

| Function type | The oracle (independent "should") |
|---|---|
| Board verdict / eval / best-move / mate / draw | Fresh Stockfish run + chess.js legality + syzygy tablebase (≤7 pieces). The coach's number must match a number the audit computes itself. |
| Live tactic (fork/pin/skewer/hanging) | chess.js scan + Stockfish PV. A named tactic MUST be real on the board; an un-named one MUST genuinely not exist. |
| Opening ID / master-play / theory moves | The DB (`openings-lichess.json`, `openings-masters-db.json`). The move must RESOLVE in the DB; frequencies must match the DB, not memory. |
| Candidate-move / why-best / alternatives | Stockfish MultiPV — cp-loss vs best, PV lines, must match. |
| Personal-analytics answers (~35 intents) | Recompute the stat DIRECTLY from the seeded Dexie games (win-rate, weakest opening, blunder rate…) and compare to what the coach says. |
| Corpus / teaching note | (a) the note's own taught line must PRODUCE the observed FEN (position-keyed selection, not name); (b) every claim board-true (`narrationAccuracy`). |
| Any spoken narration line | Every piece/square it names is TRUE on the board at that exact ply. The `narrationAccuracy` contract, checked LIVE during the drive, not just at build time. |
| Arrows / highlights | Origin sits on the real moving piece; destination = the real from→to; vision arrows have a clear sight-line (`lessonIntegrity`). |
| Tools (hands) | The board state actually changed as specified (FEN before/after), or `ok:false` was returned honestly (no fake success). |
| Weakness spine / learning loop | Seed a KNOWN profile/games fixture → assert the exact ranked output AND that it re-ranks live narration (a real "note comes OUT" proof, never an import check). |
| Verbosity / register / perspective | silent = zero voice; brief = ≤2 sentences/≤30 words (briefCap fires); register correct per surface; `perspectiveVoice` (no we/our), live. |

## 3. The instruments — all together, every run (per §G1)

1. **Deterministic preflight** — computes the oracle truth (chess.js/Stockfish/
   tablebase/DB/recomputed-stat) BEFORE the browser, so the drive has the right
   answer in hand to compare against.
2. **Playwright interactive drive** — I STEER it: push the real buttons, dismiss
   the real pop-ups (consent/calibration/help/end-of-Watch), feed real messy
   input. Prod-primary (verify the bundle hash advanced first); localhost only to
   iterate the script, never as the "done" evidence.
3. **Audit-stream pull, before + after** — the delta = exactly this run's emitted
   events (brain calls, navigation, narration, tool calls, errors). Proves what
   the app DID internally.
4. **Narration listener sidecar** — captures what the voice ACTUALLY spoke, its
   source + verbosity tag. Silence where a keystone should speak is a bug only
   this catches. (Runs MUTED — `muteTtsForAudit` — never spends TTS budget.)
5. **The per-function coverage grid** — every function → reached? (which step /
   assertion) → verdict {works / BROKEN / can't-verify}. A function whose target
   is absent, or that no-ops, is BROKEN(not-reached), never silently omitted.
6. **The vacuity control** — point the finished driver at a BLANK app; if it
   still prints PASS, the audit is lying (`audit-vacuity-check`). Run per driver.
7. **DEGRADE=llm and DEGRADE=llm+engine** — the G0 accuracy proof unique to this
   codebase: with the LLM (and then the engine) dead, the coach must STILL answer
   correctly in the raw computed register. A surface that refuses or goes silent
   under `DEGRADE=llm` was never inverted — it was only asking the model nicely.
   This is a first-class accuracy check, not an edge case.

## 4. The tracks — the whole coach, risk-ordered (each a hand-driven driver)

Build + run ONE track at a time, in this order, so the broken-map fills
incrementally with the scariest failures first. Per track: the driver script
lands in `scripts/audit-*.mjs`, I hand-drive it, its findings append to the
register (§6), then the next track. Each track's DONE = every listed function
REACHED and judged vs its oracle, coverage grid shows zero "not reached", the
vacuity control passed.

Every track exercises a deliberate **input space** (accuracy = covering where the
function's behavior actually varies), not one canonical call: canonical happy
path + off-canonical (typos, British spelling, abbreviations, diacritics) +
cold-cache (cleared IndexedDB) + pick-before-load + out-of-order + edge positions
(decided game, sharp-but-flat, standing threat, ≤7-piece tablebase, first-move,
mate-in-1).

**Track 1 — Chat Q&A grounding accuracy (~55 intents).** Highest blast radius
(G0 correctness; the fluent-but-wrong risk lives here). Drive every intent on
real + edge positions/fixtures; cross-check each assembler's claim against the §2
oracle (Stockfish / DB / recomputed stat). Include the refusal & fallback paths
(tool-down "fails loud", ungrounded-player-stat refusal, import-your-games gate,
number-fidelity net) and the deterministic commands (move/takeback/reset,
walkthrough control, opening capture, settings-as-actions). Run under
`DEGRADE=llm`. Entry: `/coach/chat` + `/coach/analyse` + inline chat.

**Track 2 — The fact-computers + the spine.** `positionFacts`, `computeImportance`,
`criticalityScan`, `causalChain`, `computePvLine`, `tacticsDetector`, `threatOut`,
`theoryDeparture`, `structurePlan`, and the `userImportance` selector. Oracle-
driven property tests over many FENs (does the computed fact match chess.js/
Stockfish?) + the "note comes OUT per surface" contract + adversarial positions
(decided game must stay silent, sharp-but-flat must fire, standing threat must
surface). This is the brain; a wrong fact here poisons every surface downstream.

**Track 3 — Learn walkthrough (`/coach/teach`).** The state machine
(idle→narrating→fork→trap→gem→leaf→stage-menu→quiz→drill), voice-gated
auto-advance (never outruns/repeats), forks (pause + ask, no auto-advance),
inline traps + gem pickers, drills (wrong move → grounded why + plays the line
out), find-the-move (answer by moving the piece), leaf play-out locked to the
watched SANs, teaching-ledger recap. Assert arrows-match-board + narration-
accuracy at EVERY played ply (live, per §2). Off-canonical opening names,
cold-cache generation, pick-a-stage-before-ready.

**Track 4 — Play (`/coach/play`).** First assert the SILENT CONTRACT: the coach
does NOT volunteer chess talk mid-game (`useLiveCoach` inert). Then the things
that DO fire: phase-transition beats (grounded + board-correct, no eval readout),
blunder interception (grounded why + Continue/Takeback/Try-best), hint ladder,
Why?, Read-position, taught-slip injection, finalize→persist→thinking-errors
capture. Full game to a natural end, multiple openings, both colors.

**Track 5 — Review (`/coach/review/:id`).** Seed a REAL unanalyzed game, run the
genuine pipeline (MultiPV 8), walk every ply. Drive every diagnostic card by
CLICKING (find-the-shot hint ladder, spot-the-sequence, blunder rewind, turning-
point preview-then-commit, trap card, show-me-better, opening-theory lecture,
cameos, ask-about-position). Free-board exploration graded correctly. Say-once
engine holds (no repeats). Assert mistake-enrollment + weakness-feed actually
wrote. Reference standard: `audit-review-real-game.mjs`.

**Track 6 — The 23 tools.** Each hand-invoked; verify the board state before/
after (hands) or the returned data vs the DB/engine (lookups); gating (`ok:false`
when a surface didn't wire the callback — no fake success); grounding teeth
(opening-phase raw FEN rejected, illegal SAN rejected, path must be in the routes
manifest). Flag `record_blunder` as partially-wired (placeholder store).

**Track 7 — Voice / personality / verbosity / perspective.** 4 personalities
render their register correctly; verbosity silent/brief/full is a HARD contract
(briefCap fires, silent = truly silent); read-aloud taps bypass verbosity; two
registers correct per surface; `perspectiveVoice` (no we/our) live in what's
actually spoken. Operator contract: user sovereignty over moves, student's
pieces off-limits, ground-before-claim.

**Track 8 — Openings WLPP + endgame + fundamentals + supporting surfaces.** The
full-play WLPP loop (Watch→Learn→Practice→Play, each rung unlocking the next,
Play locked to the taught line), punish-gems, soundness (no line leaves the
student worse than ≈−1.0 except honest gambits), endgame 7 tabs + tablebase
trainer, fundamentals scorecard, library read-aloud, pro-games, plan, train.
This is the `audit-punish-gems-loop` full-play + continuity + soundness scope.

**Track 9 — The learning loop, end-to-end.** Seed known games → mistakes enroll
into My Mistakes → weakness spine ranks them → live narration re-ranks on the
matched hole → custom-lesson picker aggregates the top holes → drills feed back →
lifecycle escalates a recurred hole. Prove the ROUND-TRIP with the seeded
fixture (`seed-weakness-profile.mjs`), a real "the boosted candidate came OUT"
proof — not an import check.

## 5. Test-drive hooks — the "reach into code" the layered method needs

To put a surface into the EXACT state a function needs (a specific FEN, an
unlocked ladder, a seeded weakness profile, a mid-walkthrough fork), the audit
adds gated, **non-shipping** `__seed*` / `__playMove` hooks. These are AUDIT
INSTRUMENTATION, never a behavior change — they do not alter what a real user
sees. They are the ONLY code touched during the mapping phase; product behavior
is not fixed until the map is complete (David's rule). Where a surface can be
driven through the real UI without a hook, it is — hooks are the last resort, and
each one is flagged in the register so David sees exactly what was added.

## 6. The deliverable — the ranked broken-map (the register)

`docs/audits/coach-broken-map-2026-09-10.md` (human) + a JSON sidecar (machine).
ONE ROW PER FUNCTION:

| field | meaning |
|---|---|
| id / name | the function (from the feature-map inventory) |
| surface | where it lives |
| spec | how it SHOULD work, cited to CLAUDE.md / the code contract |
| oracle | the independent source of truth used (§2) |
| how-driven | the exact interaction + input-space samples used |
| observed | what it actually did (with evidence) |
| verdict | works / **BROKEN** / can't-verify(device) |
| severity | P0 (breaks paid UX / wrong at the board) · P1 (wrong teaching / degraded) · P2 (rough edge) |
| evidence | screenshot + audit-stream events + narration-listener transcript |
| diagnosis | one line — SYMPTOM **and** likely DISEASE (per the sweep rule: is this one bug or a family?) |

No fix column. Rows ranked most-broken-first. When a break looks like one sample
of a class, the diagnosis says so, so the later fix phase sweeps the family, not
the spot.

## 7. What genuinely CANNOT be seen in the sandbox → route to David's device

Flagged explicitly in the register, never rubber-stamped: real iOS TTS decode /
MediaSource streaming, mic turn-taking, device touch gestures, and on-device
persistence-across-reload of a fresh unlock write. These get `can't-verify
(device)` + a note for David to confirm on his phone.

## 8. Sequencing + definition of "the map is done"

- Order: Track 1 → 9 as above (risk-first). Each track = build driver → hand-
  drive on prod → append findings → move on. The map fills incrementally.
- Effort: many hand-driven sessions. Quality over speed, per David's call.
- **The MAP is complete when:** every function in the feature-map inventory has a
  verdict row + evidence; the coverage grid across all tracks shows zero "not
  reached"; the vacuity control passed on every driver; and the `DEGRADE=llm`
  pass ran on every coach-answer surface. Only THEN do we open the fixes phase.
- The suite (the standing net) persists in `scripts/audit-*.mjs`, is added to the
  Post-Deploy matrix in `CLAUDE.md` + `docs/AUDIT_INDEX.md`, and re-runs every
  future build.

## 9. Open decisions for David

1. **Environment** — prod-primary (deploy-verifying, the CLAUDE.md standard) is
   assumed; localhost only to iterate a driver. Confirm, or want the first pass
   on localhost for speed?
2. **Native surfaces** — the paying userbase is iOS; a few things only fully
   exercise on device (§7). Confirm those go to `can't-verify(device)` for you to
   check, rather than blocking the map.
3. **Start signal** — this plan is not started as code until you say go (you
   asked for the plan only). On go, Track 1 (chat grounding) leads.
