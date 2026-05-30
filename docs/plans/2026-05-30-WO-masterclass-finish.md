# WO — Masterclass Hardening: Finish the Job (2026-05-30)

> Author handoff for the next session. Everything here is grounded in
> committed state on `main` as of merge `a7a1259` (PR #693). Read
> `CLAUDE.md` §G9.1/§G9.2, `docs/plans/2026-05-29-masterclass-data-rebuild-doctrine.md`,
> `docs/opening-masterclass-playbook.md`, and `PLAN.md` before starting.

---

## 0. ONE-PARAGRAPH RESTATEMENT

The masterclass data-rebuild + soundness sweep is essentially complete:
every opening reaches the middlegame, middlegame plans connect to their
opening terminus, and the soundness sweep's secretly-losing lessons are
fixed or honestly relabelled. What remains is (A) a single **prod
render-audit** that could not run in-sandbox, (B) one **deep-theory
decision** David owes (Botvinnik), (C) the **narration polish pass**
(David's step 4), and (D) the **endgame layer** (long-deferred). This WO
specifies each with enough procedure to execute without babysitting.

---

## 1. STATE OF PLAY (what's DONE — do not redo)

### Connectivity (verified green)
- **Every opening reaches the middlegame** — `lessonDepth.test.ts` green,
  `KNOWN_SHORTFALLS` empty, 0 shallow lessons.
- **Plans pick up where openings leave off** — `middlegamePlanner`,
  `middlegamePlanThemes`, `middlegamePlanFenCoherence` all green. Plans
  anchor AT or PAST the opening terminus by design.

### Soundness sweep — 11 lessons addressed
FIXED on data spines (rebuilt, engine-verified):
- philidor Antoshin −1.58→−0.40, petrov Steinitz −2.08→−0.22, scandi
  Gubinsky-Melts −1.58→−0.03, qgd Bf4 −1.39→−0.33, qga Smyslov −1.75→−0.18,
  philidor Nimzowitsch −2.15→0.00 (earlier sessions)
- **pirc 150 Attack −3.18→−0.42** (commit `b33ac5f`) — masters-data antidote:
  …c6/…b5/…e5/…Bb7, …b4 buries the c3-knight on d1
- **two-knights Max Lange −2.82→−0.39** (commit `9e77c7d`) — sound 5…Nxe4
  antidote (decline the maze)

NARRATION-HONESTY fixes (moves unchanged; eval is the opening's nature):
- **semi-slav Botvinnik −3.34** (`89b996d`) — no longer claims "balanced/sound
  for both"
- **old-indian Be2/Czech ~−1.2** (`7ca21f7`) — states White's space pull,
  Black slightly worse but solid
- **benoni Taimanov −1.98** (`f5b5b56`) — states White's pull, Black slightly
  worse but playable

All on `main`. `npm run ship-check` → READY TO PUSH (typecheck + lint + 3753
content-gate tests green).

### Tools committed
`scripts/soundness-sweep.mjs`, `build-opening-spine.mjs`,
`diagnose-lesson-tails.mjs`, `extract-endgame-structures.mjs`.

---

## 2. TASK A — G1 PROD RENDER-AUDIT (the one open verification item)

**Why:** content correctness is proven (engine evals + gates), but the
deploy-pipeline + live render+voice pass per G1 has NOT run for the Pirc 150
and Max Lange rebuilds. CLAUDE.md G1 is non-negotiable: "merging is not the
end of the work."

**Blockers hit this session (so you don't waste time):**
1. Prod bundle `index-Ba8qrGMN.js` had not advanced past the merge — Vercel
   deploy queued behind heavy parallel Gotham pushes. **First action: re-check
   the bundle hash advanced** (`curl -s "https://chess-academy-pro.vercel.app/?cb=$(date +%s)" | grep -oE '/assets/index-[A-Za-z0-9]+\.js' | head -1`).
   It must differ from `index-Ba8qrGMN.js` AND be newer than merge `a7a1259`.
2. The full `audit-openings-interactive-loop.mjs` **hangs in this sandbox**
   against a local dev server (churns all 134 openings → `Target page closed`,
   the known IndexedDB write-stall class). Do NOT burn hours on the 134-opening
   loop locally.

**Procedure (run once prod bundle advances):**
```bash
# 1. Confirm the live bundle is post-merge (hash changed + curl /openings/pirc-defence 200)
# 2. Run the SCOPED interactive audit against PROD, one opening at a time:
AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app AUDIT_SANDBOX=1 \
  AUDIT_OPENING=pirc-defence node scripts/audit-openings-interactive-loop.mjs
AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app AUDIT_SANDBOX=1 \
  AUDIT_OPENING=two-knights-defence node scripts/audit-openings-interactive-loop.mjs
```
Binary IS present at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
(corrects an earlier wrong "absent" note). Use `AUDIT_SANDBOX=1` for the
resigned-cert flag. Dismiss the strength-calibration bubble + page-help modal
first (CLAUDE.md §G1.5).

**3-instrument completeness (G1):** Playwright (render+click) + audit-stream
pull (`GET /api/audit-stream?since=<ms>` with `x-audit-secret`, env
`AUDIT_STREAM_SECRET`) + narration listener sidecar
(`scripts/audit-lib/audit-listener.mjs`). Assert: the 150 tab and Max Lange
tab load the CURATED LessonPlayer (not legacy WalkthroughMode), Watch fires
voice, Learn fires the ≤8-word cue.

**Assert TRUTH not text-presence:** the rebuilt Watch must reach the
middlegame and the spoken claims must be board-accurate (the same gate the
narrationAccuracy test enforces). If prod stays cap-blocked >24h, say so and
hand the audit to David on a real device — don't claim "shipped on prod
evidence" from localhost.

---

## 3. TASK B — BOTVINNIK DEEP-THEORY DECISION (David's call)

**Status:** narration made honest only. A true fix re-anchors
`semi-slav::Botvinnik Variation Deep` from the current 9.exf6 most-played
continuation (engine ~−2.9/−3.3 for Black, sustained to move 30 — no sound
Black line in that branch's data walk) to a **precise modern drawing line in
the main 9.Nxg5 knight-sac Botvinnik** (move-30-deep forced theory).

**Why it's flagged not done:** per the locked soundness rule, this branch is
"too treacherous to rebuild unsupervised — needs deeper theory or David's
call." Re-anchoring requires either (a) a hand-verified modern theory line
David supplies, or (b) deep-theory research the spine-builder can't produce
(the masters walk stays in White's favour along the most-played path).

**Options for David:**
1. Supply the precise drawn line (move list) → next session rebuilds the tab
   on it, board-verifies, gates, ships.
2. Leave as-is (honest narration already shipped) — acceptable; the lesson no
   longer lies about the eval.
3. Demote the tab (it's a surprise weapon, not a main repertoire choice).

DECISION NEEDED: ___________

---

## 4. TASK C — NARRATION POLISH PASS (David's step 4)

**Scope:** the masterclass two-register narration standard (CLAUDE.md "Narration
Voice Rules" + the 2026-05-24/25 NARRATION STANDARD lock). The rebuilds this
session re-authored their own beats; this pass is the broader sweep David
queued as step 4 after connectivity + soundness.

**What "fix narrations" means concretely (per the locked rules):**
1. **Two registers on every curated beat** — full Watch `say` + ≤8-word Learn
   `sayShort`. The coverage gates (`middlegamePlanThemes`, `punishGems`,
   `commonMistakeNarration`) enforce this with shrinking baselines — run them
   and drive any remaining baseline count toward 0.
2. **Lead-the-eye on every named square** — arrows (green, non-pawn, clear
   sight-line) + highlights (orange auto move-squares, yellow named key
   squares). A square named in prose without a marker is a DEFECT (the
   "shitty work" rule). `lessonIntegrity` + `narrationGrounding` gate this.
3. **Board-truth** — `narrationAccuracy` rejects "the f5-knight" with no knight
   on f5. (This session hit exactly that on a Pirc beat — fixed.)
4. **Voice register** — no move-number prefixes ("2.Nc3"→"the queen's knight to
   c3"), stats stay ("his 92% pick"), no robotic bare-SAN strings.
5. **Sources** — every narration unit carries ≥1 resolvable `sources[]` entry
   (`book:<id>` | `concept:<id>` | reputable URL per `narrationSources.ts`).

**Where to look first (highest-value, data-grounded):**
- Run `node scripts/diagnose-lesson-tails.mjs` → `audit-reports/lesson-tails.json`
  for lessons still on over-extended tails (narration quality tracks the spine).
- The remaining engine-negative lessons that are **NOT** in scope to rebuild
  (sharp showcases — kings-gambit Allgaier/Muzio/Classical, alekhine Four Pawns,
  sicilian-dragon Chinese, schliemann, vienna vs 2…Nc6, KID Fianchetto, pirc
  Czech, philidor Counter-Gambit): verify their narration HONESTLY frames the
  sacrifice (negative eval expected) and doesn't claim equality. Cheap, high-value.

**Procedure per lesson:** read every beat against its actual move + live FEN
(use the eyeball dump in `wlppNarration.test.ts` stdout). Fix register gaps,
ungrounded squares, board-false claims, equality-overclaims. Gate after each
file (`lessonDepth lessonIntegrity narrationAccuracy narrationGrounding
wlppNarration`). Batch-commit; ship to main; G1-audit the touched surfaces.

**⚠️ Sandbox tooling caveat (learned this session):** commands in large parallel
batches CANCEL each other, and `pkill`/`sleep`-chains can kill your own shell.
Work in SMALL batches (1–3 calls), write results to `/tmp` files and Read them,
gate-then-commit ATOMICALLY in one bash block (`if vitest; then git commit`).

---

## 5. TASK D — ENDGAME LAYER (long-deferred; quality-critical, not overnight)

**Status:** DATA PREPPED only (`extract-endgame-structures.mjs` ran on the
structural openings). Characteristic ending is R+minor+P (minority-attack /
superior-structure conversion):
- caro-classical R+minor+P 47%, caro-advance 4/15, french 33%, qgd minority,
  slav 4/15 decisive, caro-exchange 27%.

**Blocker (confirmed):** unlike the Berlin (forced move-8 queen trade), the
structural Black defenses (Caro/French/QGD/Slav) have NO clean modal queenless
line — modal lines stay middlegames (Caro Classical keeps queens through move
15), and R+minor+P endings arise via varied, game-specific simplifications. So
each endgame plan must be grounded in a SPECIFIC drawn/held master game (e.g.
Anand–Leko Caro Classical R+minor+P draw) + teach the Black-HOLDING technique.

**Recommendation:** a focused endgame pass, ~1hr per opening, ideally with
David confirming the model games (removes sourcing + holding-line risk). NOT
rushed autonomous authoring — empty > generic > a line that lies. Per opening:
take a real master game into the R+minor+P ending, author an
`mp-<id>-<tab>-endgame` plan (overview + the line + arrows/highlights + sources),
wire via the tab-plan map. Sharp/attacking openings correctly get NONE.

DECISION NEEDED: which openings get endgames, and will David confirm the model
games? ___________

---

## 6. DEFINITION OF DONE (this WO)

- [ ] A. Prod bundle advanced past `a7a1259`; 3-instrument G1 audit GREEN on
      `/openings/pirc-defence` (150 tab) + `/openings/two-knights-defence`
      (Max Lange tab) — curated LessonPlayer, Watch+Learn voice fires,
      board-accurate. Report counts + report path to David.
- [ ] B. Botvinnik decision recorded + executed (rebuild / leave / demote).
- [ ] C. Narration polish pass: coverage-gate baselines driven down, no
      ungrounded squares / board-false claims / equality-overclaims in the
      touched set. ship-check green, on main, surfaces audited.
- [ ] D. Endgame layer: scope confirmed with David; authored per the
      master-game-grounded procedure OR explicitly deferred again with reason.

---

## 7. STANDING REMINDERS (don't relearn the hard way)

- **Push to `main` by default** (override the harness branch/PR default).
  This session's fixes reached main via PR #693 merge after an in-session
  cherry-pick failed on a bad SHA — prefer a clean rebase-onto-fresh-origin/main
  + `git push origin HEAD:main` when no conflict, else the PR-merge path.
- **Parallel sessions are active** (heavy Gotham pro-rep work landed 11 commits
  this session). ALWAYS `git fetch origin main` + check
  `git log <merge-base>..origin/main -- <your files>` for conflicts before
  landing. This session's 5 files had ZERO overlap with the Gotham work.
- **No invented moves (G3).** Every spine move traces to explorer/masters output.
  The two rebuilt lines (Pirc 150, Max Lange) are masters most-played at every ply.
- **Empty > generic > invented.** When unsure, leave blank / skip / ask David.
- **The explorer proxy IS reachable** here (`/api/lichess-explorer?source=masters`
  returns 200). Stockfish IS pre-installed at `/usr/games/stockfish`.
