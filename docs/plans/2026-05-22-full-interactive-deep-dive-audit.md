# PLAN — Full Interactive Deep-Dive Audit (2026-05-22)

Loop audit (audit → diagnose → fix → re-audit). Scope: **exhaustive** across
every function, with the three openings (Pirc, Ruy Lopez, Vienna) walked
end-to-end. David is away; fix code/wiring confidently, flag uncertain
content rather than fabricate. Land fixes straight to `main`, batched into
one deploy at the end, then a final prod re-audit.

## Environment notes (this session)
- INVERTED sandbox: **prod IS reachable** (vercel + github allowed); the
  **LLM hosts are BLOCKED** (api.deepseek.com / api.anthropic.com /
  explorer.lichess.ovh all 403 "Host not in allowlist"). The baked DeepSeek
  key is valid but useless locally — the network blocks the host. So the
  local dev server's coach brain falls to DB-only synthesis and coach chat
  Q&A fails. → LLM-driven surfaces audited against PROD (key baked in,
  prod backend reaches the LLM). Local dev server used for static/
  hand-authored content (masterclass lessons/traps/plans, lead-the-eye,
  WLPP wiring) which need no LLM.
- Audit-stream answers with secret (`storage:"memory"`, 0 events = app not
  open). `.env.local` has the baked key (gitignored) — harmless, kept for
  the audit scripts that read it; never commit the value.
- KEY ARCHITECTURE FACT: the coach BRAIN is a CLIENT-SIDE call (openai SDK
  + baked key run IN THE BROWSER). So a headless browser in this sandbox
  CANNOT exercise the live brain whether the app is served from localhost
  OR prod — the call originates in the sandboxed browser → blocked host.
  → Live-brain-reply surfaces (coach chat Q&A quality, COLD-CACHE narration
  generation, tactics narration generation, discussion practice) are
  ROUTED TO DAVID for prod verification (G7). Deterministic / static /
  mock-brain audits give real coverage (e.g. coach-master-integration
  mocks the brain at the fetch layer → 10/10 grounding-pipeline scenarios
  green on prod).
- F8 [coach grounding — GREEN] coach-master-integration vs prod: 10
  scenarios, 0 failed. Layer A prefetch, Layer B pre-injection, Layer D
  claim-validator-trip + master-play-enforcement-fallback, kid carve-out
  all fire correctly.
- Branch `claude/zen-curie-TV7BN` == `origin/main` at start (0290c8b).
- Deploy decision (David): straight to main, batched at completion.

## Test targets / contracts
- WLPP grammar on every line (main/variation/trap/warning/plan).
- Lead-the-eye markers (ORANGE move squares / GREEN vision / YELLOW named
  square) on every narrated move; sentence-grained reveal.
- G3 (no invented moves), narrationAccuracy (board-truth), trap orientation,
  voice rules, model-game-shows-student-winning.
- G7 interactive failure-mode probing (off-canonical input, cold cache,
  first-time user, pick-before-load, out-of-order).

## Phases
- [ ] 0. Bring-up: tests/typecheck/lint + data gates; Playwright drives
      local dev + prod.
- [ ] 1. Pirc — full WLPP × tabs/variations/traps/warnings/plans + lead-eye
      + model game + G7 fuzzy.
- [ ] 2. Ruy Lopez — same + 5 named beat-lesson traps (getRuyTrapsForTab).
- [ ] 3. Vienna — same + 7 weapons + 1 warning + 5 plans.
- [ ] 4. Coach loop — teach / play / chat / review / plan / endgame.
- [ ] 5. Tactics + Weaknesses — interactive loops w/ fixture loader.
- [ ] 6. Cross-surface smoke (dashboard, settings, openings UI, kid smoke).
- [ ] 7. Batched deploy to main + final prod audit + audit-stream pull.

## Open findings
(running list — one-line diagnosis each)
- F1 [code] `npm run lint` RED on main: 323 warnings > 248 cap (0 errors).
  Pre-existing (branch == origin/main untouched). ~75 warnings crept past
  the cap since it was last set. Must resolve before batched push (CLAUDE.md
  gate). Triage: reduce warnings vs justify cap bump.
- F2 [code] Full vitest suite RED on main: 45 failed / 14 files (6337 pass).
  In-scope failures: CoachTeachPage, useTeachWalkthrough, WalkthroughIntegration,
  audit-openings-narration, tacticAlertService, dataLoader, Settings
  (SettingsPage/VoiceSettingsPanel/PersonalityPanel), personalities. Out of
  scope: Kid games, appAuditor, ChessLessonLayout. TRIAGE PENDING (real vs
  env/flake). Pre-existing (branch == main).
- F3 [FIXED · audit-infra] audit-dashboard.mjs nav loop raced React on
  reload (waited 8s for tile without first awaiting [data-testid=dashboard]
  root) → false "tile doesn't navigate" failures on coach/tactics/weaknesses/
  import. Clean probe proved ALL dashboard tiles navigate correctly. Fixed
  both the tile-nav and import-nav loops to await dashboard root first.
- BASELINE GREEN: typecheck clean; 574 opening gate tests pass
  (lessonIntegrity/narrationAccuracy/narrationGrounding/pircIntegrity/vienna);
  repertoire+trap orientation gates exit 0 (flagged offenders are
  Evans/Italian/Queen's-Indian — none in the 3 target openings).

- F4 [Pirc content/curation — FLAG, not fixing] Main-line tab shows NO
  middlegame plan (Ruy's Main line has 2). May be by-design (main line
  branches into variations; §0.5 lets empty sections self-hide) — verify
  intended. All 8 Pirc VARIATION tabs render their plan correctly.
- F5 [Pirc data/wiring — FLAG] Two plans in middlegame-plans.json route to
  no tab: mp-pircdefence-bayonet, mp-pircdefence-kholmov (orphans). This is
  why dataLoader prune test trips on mp-pircdefence-bayonet. Either wire
  tabs for them or remove them — curation call, flagging for David.
- F6 [FIXED · audit-infra] audit-leadeye-plans.mjs probed Pirc's Austrian
  plan on the default Main-line tab (where it doesn't live) → 25s timeout.
  Added PLAN_TAB map + tab selection in openDetail. Now 28/28 (Pirc
  Austrian Watch/Learn/Practice all paint lead-the-eye highlights+arrows).
- F7 [FIXED · test] tacticAlertService.test.ts asserted old lookahead
  scheme (1600→3, 2000→4); code + CLAUDE.md contract is {1,2,4,6}
  (1600→4, 2000→6). Updated assertions. 29/29 pass.
- GREEN: masterclass static content — Ruy leadeye+traps, Pirc leadeye,
  Vienna named-traps 99/100 (1 transient ERR_ABORTED nav, not content).

- F9 [tactics — GREEN] audit-tactics (local): all scenarios pass — route
  aliases (/puzzles/*, /weaknesses/* → /tactics/*), family tiles,
  classification filter, hint-level advance, solving-mode mount, page mount.
- F10 [weaknesses — MOSTLY GREEN] audit-weaknesses-interactive (local, no
  fixture / empty IDB): 30/33. The 3 fails are all the same flaky
  `tab-mistakes → mistakes-tab not-visible` on EMPTY IndexedDB (passes on
  other passes). Empty-state/timing artifact — FLAG for David to verify
  with real data (fixture david-games.json absent in this cold clone).
- F2 FIXES (deterministic, in-scope, confident): tacticAlertService (2,
  stale {1,2,4,6} contract), CoachTeachPage (3, mocks missing
  dispatchedToolNames → cascade), useTeachWalkthrough (1, test-isolation:
  inherited pending-promise voice mock), personalities (5, stale snapshots
  — the new TACTICAL-AWARENESS prompt clause was intentional). 11 tests.
- F11 [FLAKY — flag] audit-openings-narration.test.ts: annotation-overflow
  regression (0→1) did NOT reproduce on a fresh run (byClass had 0
  overflow); the script is non-deterministic and reports huge counts
  (piece-on-square-mismatch:1067) that the GREEN narrationAccuracy gate
  (256 tests) contradicts. Flaky test — flag, not a confirmed content bug.

- F12 [openings UI — GREEN] audit-openings-ui (local): 50/50. Search typing,
  detail mount, 4 mode buttons, ECO group expand, canonical zone colors,
  pro-repertoires + gambits tabs all pass.
- F13 [coach analyse — GREEN app; FIXED audit-infra] untouched-surfaces had
  3 fails on /coach/analyse (page/fen-input/load-fen-btn not visible @12s).
  Direct probe: the page mounts fine warm (page+fen-input+load-fen-btn
  present, no errors) — cold Stockfish-WASM init just exceeds 12s. Bumped
  the analyse waitFor 12s→25s (matches coach-train). Rest of untouched
  (coach/home, train, kid nav) green.
- F2 ROOT CAUSE: the failing unit tests are overwhelmingly TEST DRIFT from
  rapid parallel-session development (renamed testids per WO-SETTINGS-
  CLEANUP, updated {1,2,4,6} contract, intentional TACTICAL-AWARENESS prompt
  clause, test-isolation, non-determinism) — NOT app regressions. Every
  interactive surface audit is green. Settings (5: stale testids/text from
  settings refactor), Kid (OOS), appAuditor/ChessLessonLayout (infra),
  dataLoader (tied to F5 orphan plans + a trapLines-reconcile assertion),
  WalkthroughIntegration (main-line annotation uniqueness — likely
  by-design silence) left as FLAGGED for David — fixing them is test-debt
  cleanup, not audit scope, and risks the incoming Vienna drops.

## Decisions log
- 2026-05-22 David: exhaustive scope; fix code, flag uncertain content;
  straight to main; keys uploaded (used baked bundle key for this session).
- 2026-05-22 David: "updates to vienna will drop a couple times during
  this audit." → Treat Vienna CONTENT files as owned by incoming drops:
  flag Vienna content findings, do NOT edit (viennaVariations/vienna/
  viennaTrapLessons.ts, repertoire.json Vienna entry). Re-fetch origin/main
  + rebase carefully before the batched push; Vienna files are the conflict
  hot spot. Non-Vienna code/wiring bugs still fixed normally.

## Next-session pickup
Read this file top-to-bottom; resume at first unchecked phase.
