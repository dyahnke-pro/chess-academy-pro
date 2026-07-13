# Learn + Post-Game Review — Coaching Behavior Map (2026-07-13)

Exhaustive inventory of the EXACT coaching behavior across `/coach/teach` (Learn)
and the Post-Game Review flow, for the full-behavior audit. Each behavior:
ID · trigger · code path (file:line) · expected behavior · testid(s) · audit assertion.

Sections:
- **A. Learn — intent routing & opening resolution** (mapper 1) — below
- **B. Learn — walkthrough runtime + voice + faucet + guided-find** (mapper 2) — below
- **C. Post-Game Review** (mapper 3) — below

> `handleSubmit` (CoachTeachPage.tsx:1446–3922) is a FIRST-MATCH dispatcher —
> branches evaluated top→bottom, order is load-bearing. Everything above the
> brain fallback is deterministic (G0). Correction: `validateArrowClaims`
> (arrowClaimValidator.ts) is NOT wired here; arrows are code-derived
> (`applyCandidateArrows` + `groundArrows`), G6 satisfied via `learn.arrows.codederived`.

---

## A. Learn — intent routing & opening resolution
Files: `CoachTeachPage.tsx` (handleSubmit), `openingDetectionService.ts`.

### A0. Pre-routing (per turn, non-terminal)
- `learn.pre.turnid` — mints one turnId per turn (all audits share it).
- `learn.pre.retry` — re-ask ≥40% token overlap <5min → `user-retry-detected` + PostHog.
- `learn.pre.qclass` / `.shortfollowup` — `followup-context-check` naming expected grounding audits.
- `learn.pre.clearchoices` — clears prior `[CHOICES:]` picker each turn.

### A1. Deterministic command routing (bypass brain, ordered)
- `learn.route.walkctl.new|stop|resume` — active/paused walkthrough control (teardown / resume, not restart). Assert: `coach-surface-migrated ...walkthroughControl control "X"`; "stop" not fuzzy-matched as opening.
- `learn.route.coachmove` — dictated "play d4"/"castle kingside" (chess.js-legal) → play-now / side-swap / armed-pending.
- `learn.pause.midnarration` — any submit during narration → `walkthrough.pause()`.
- `learn.route.clearcache` — `/clearcache` → db.cachedOpenings.clear() + hardRefresh().
- `learn.route.setting` — "set narration to brief"/"turn off hints"/"dark theme" → persist pref + `coach-setting-changed`.
- `learn.route.playergame` — "how does carlsen play the catalan" → disk lookup → chesscom fallback → silent model-game walkthrough (BEFORE fuzzy matcher). Assert: game board mounts, not a "did you mean" picker.
- `learn.route.trainingaid` — "drill calculation"/"fork puzzle"/"work on weaknesses" → startMistakeDrills / pickCoachDrill / navigate(aid.path).
- `learn.route.middlegame` — "middlegame plans in the Pirc" → findPlansForOpening → 1 auto-start / >1 picker (`middlegame-plan-picker`,`-choice-{id}`) / 0 honest ask.

### A2. Stage-keyword + FACE parsing (non-terminal)
- `learn.parse.stage.{drill,punish,concepts,findmove,playreal}` — STAGE_PATTERNS set stageHint, strip keyword.
- `learn.parse.face` — "Face: X" → faceMode, teach the counter, cache key `Face:` prefixed.
- `learn.parse.movereport.guard` — `opts.coachReplyPlayed` or /^i (just )?played/ → isMoveReport SKIPS opening router ("e4" can't fuzzy-match). Assert: "I played e4." never pops a picker.
- `learn.capture.forget` / `.opening` — clears / sets `intendedOpening` in coach memory.

### A3. requestedName derivation
- `learn.name.teachverb` — "teach me X"/"walk me through X" → requestedName=X.
- `learn.name.stagestripped` / `.bare` — "drill Vienna"→Vienna / "Pirc defense"→bare route.
- `learn.name.qaskip` — 24 Q&A predicates SKIP fuzzy matcher → pre-flight → brain. Assert: "am I improving?" pops no picker.

### A4. Tier 0 fuzzy resolution (fuzzyMatchOpening)
- `learn.fuzzy.autoaccept` — score ≥0.92 & gap ≥0.15 → canonicalize ("Najdorff"→Najdorf).
- `learn.fuzzy.ambiguous` — "did you mean…?" + `coach-choice-chips`/`-chip-{i}`; short-circuits; logs `fuzzyPickerScores`.
- `learn.fuzzy.nomatch` — "asdfgh" → no picker → pre-flight reject.
- `learn.chip.tap` — chip tap → `chip-tap-resolved` + re-run handleSubmit(canonical).

### A5. Resolution tiers (requestedName truthy)
- `learn.tier1.static` — static registry (Vienna) → instant walkthrough.
- `learn.tier1_5.linepicker` — broad family ≥5 subvars → `line-picker`/`-{eco}`/`-mode-play`/`-mode-face`/`-dismiss`; short-circuits.
- `learn.picker.tap` — tile tap → submit fullName / `Face: fullName`.
- `learn.tier2.dexiecache` — cached tree → instant + regen missing stages.
- `learn.tier2_5.preflight` — getOpeningMoves null → falls to brain (catches "Ok"/fragments), no 60s gen.
- `learn.tier2_5.sharedcache` — Supabase shared row → pull + start.
- `learn.tier3.llmgen` — DB-valid no cache → `teach-generation-progress` → generateOpening → cache+start; fail → honest fallback.
- `learn.returning.chooser` — completed opening → `walkthrough-choose-mode` chooser.

### A6. Brain fallback (grounded Q&A + move narration)
- `learn.brain.ask` — anything unterminated → LiveState (FEN priority override>walkthrough>gameRef) + eval/lichess/tactics → coachService.ask (DeepSeek, maxToolRoundTrips 4). Assert: `coach-surface-migrated viaSpine=true` + streamed bubble.
- `learn.brain.qa.grounded` — 24 Q&A classes (progress/opening-profile/traps/mistakes/tactics/phase/accuracy/records/…) → voiceFacts/groundedAnswer, spoken whole ≤600c.
- `learn.brain.qa.bestmove` — "best move here?" → engineBestMoveUci threaded → grounded (even off-book).
- `learn.brain.movenarration` — step-by-step / engine-driven → play_move excluded, LLM narrates computed reply + G6 arrow directive.
- `learn.brain.walkthroughhandoff` — LLM `start_walkthrough_for_opening` → in-place (never legacy `/coach/session/walkthrough`).
- `learn.brain.boardmove` — board move → resolveCoachReplyMove (dictated>book>adaptive engine) → narration turn.
- `learn.brain.choices` / `.voice` / `.error` — `[CHOICES:]` chips / `[VOICE:]` speak / "Hit a snag" on throw.

### A7. Arrow/claim grounding (G0, audit + code-derived)
- `learn.arrows.codederived` — code resolves every named move's arrow (Stockfish-rank color) + dedupe by square-pair (fixes 2026-06-12 key flood); groundArrows re-validates on live FEN.
- `learn.arrows.voicegrounding` / `.tacticgate` — strip disproven-board + ungrounded-tactic sentences before TTS/bubble; `claim-validator-trip`.
- `learn.arrows.setboardaudit` / `.voicedivergence` — audit-only `claim-validator-trip` gates.

### A8. openingDetectionService primitives
- `resolve.aliases` (NAME_ALIASES: kid→KID, najdorf, spanish→Ruy, qgd/qga/nid…), `resolve.tiers` (exact>prefix>substring>token, RESOLVER_MIN_FUZZY_LEN=4 + stopwords), `resolve.terminalfilter` (hide ≤8-ply namesakes from pickers, keep detect unfiltered), `resolve.spine`, `resolve.forks` (findSiblingExtensionBranches), `resolve.branchpoints` (findContinuationsAtPly), `resolve.linepicker` (≥5 subvars), `resolve.curated`, `resolve.family`.

---

## B. Learn — walkthrough runtime + voice + faucet + guided-find

Files: `useTeachWalkthrough.ts` (WT state machine), `CoachTeachPage.tsx` (wiring),
`useDiscussionPractice.ts` + `discussionPractice.ts` (faucet),
`guidedFindTheMove.ts`, `DiscussionPracticePanel.tsx`, `slipDetector.ts`.

Phases: `idle | choose-mode | narrating | fork | trap-prompt | trap-playing | leaf | paused | stage-menu | quiz | drill`.

### B1. Walkthrough state machine
- `learn.wt.start` — start(tree) with intro, no chooser → phase `narrating`, speaks intro then walks root. testid `walkthrough-narrating-panel`. Assert: audit "walkthrough started"; board at start FEN.
- `learn.wt.start.no-intro` — empty intro → straight to narrateAndAdvance(root).
- `learn.wt.choose-mode` — start(tree,{showChooser}) returning student → `choose-mode`, no autoplay. testids `walkthrough-choose-{mode,walkthrough,stages,cancel}`. Assert: audit "chooser shown (previously completed)"; no auto-narrate.
- `learn.wt.narrate.segmented` — node.narration[] → arrows/highlights set per segment BEFORE its sentence spoken; backup timer = sum of segment budgets.
- `learn.wt.narrate.single` — node.idea → voice-promise is primary gate, backup safety only.
- `learn.wt.linear-advance` — 1 child → recurse after POST_NARRATION_BUFFER_MS (400ms).
- `learn.wt.fork` — >1 child → phase `fork`, picker + auto-advance down child0 after FORK_AUTO_ADVANCE_MS (4000ms). testids `walkthrough-fork-panel`, `-fork-option-{i}`, `-fork-deepdive-{i}`, `-pause-from-fork`, `-end-from-fork`.
- `learn.wt.pickFork` — tap fork-option-{i} → play chosen branch; audit "fork picked".
- `learn.wt.backtrack` — leaf `walkthrough-backtrack` → trims to last fork, phase `fork`.
- `learn.wt.leaf` — 0 children → phase `leaf`; fires markStageComplete(opening,'walkthrough') once. testids `walkthrough-leaf-panel`, `-continue-learning`, `-leaf-play-real`, `-leaf-deepdive-{i}`, `-end-from-leaf`.
- `learn.wt.skip` — `walkthrough-skip` (narrating only) → cancel voice+timer, jump to next/fork/leaf.
- `learn.wt.pause` — `walkthrough-pause`/chat question → cleanup, phase `paused`. Auto-pause audit fires on chat.
- `learn.wt.resume` — `walkthrough-resume`/"resume"/brain re-call while paused → re-narrate current node (RESUME not restart).
- `learn.wt.stop` — any `walkthrough-end-*` → teardown, phase `idle`, board → free-play.
- `learn.wt.trap-prompt` — punish lesson setupMoves === pathSans → stash deferred transition, narrate trap intro, phase `trap-prompt`. testids `walkthrough-trap-prompt`, `-trap-accept`, `-trap-skip`.
- `learn.wt.trap-accept` — animate inaccuracy→punishment→followup (voice-gated), then advancePastTrap.
- `learn.wt.trap-skip` — resume ORIGINAL deferred transition (not always the fork).
- `learn.wt.stage-menu` — Continue-learning/choose-stages → phase `stage-menu`, mergeStagesFromCache(). testids `walkthrough-stage-menu`, `-stage-{punish,findmove,concepts,drill,play}`, `-watch-again-from-menu`, `-end-from-menu`.
- `learn.wt.stage-pending` — pick ungenerated stage → pendingStageJump, stay on menu, auto-jump when filled. testids `walkthrough-stage-pending`, `-stage-pending-cancel`. Assert: loading state, not empty quiz.
- `learn.wt.stage-cancel` — cancel pending jump → back to menu.

### B2. Stages — quiz / drill / punish
- `learn.stage.quiz.start` — startStage(concepts|findMove) → phase `quiz`, board uses question path FEN (not leaf). testids `walkthrough-quiz-panel`, `-quiz-choice-{i}`, `-quiz-next`, `-quiz-empty`, `-quiz-complete`.
- `learn.stage.quiz.pick` — quiz-choice-{i} → feedback+explanation, no auto-advance.
- `learn.stage.quiz.findmove-board` — drag on board (findMove) → attemptFindMoveAnswer maps SAN→choice.
- `learn.stage.quiz.next` — quiz-next → advance; last Q → markStageComplete + backToStageMenu.
- `learn.stage.drill.start` — startStage(drill) → line picker. testids `walkthrough-drill-picker`, `-drill-line-{i}`, `-drill-empty`.
- `learn.stage.drill.select` — drill-line-{i} → interactive board at start FEN.
- `learn.stage.drill.move` — correct → advance + auto-play opponent reply; wrong → correction card. testids `walkthrough-drill-active`, `-drill-wrong`, `-drill-complete`.
- `learn.stage.drill.ack` / `.restart` — dismiss correction / reset to move 0.
- `learn.stage.punish.picker` — startStage(punish) → punish list w/ kind chips. testids `walkthrough-punish-picker`, `-punish-lesson-{i}`, `-punish-kind-{i}`, `-punish-empty`.
- `learn.stage.punish.play` — punish-lesson-{i} → one-shot punish tree (setup→inaccuracy→fork of punishment+distractors→leaf). testids `walkthrough-punish-leaf`, `-punish-back-to-lessons`.
- `learn.stage.punish.exit` — back-to-lessons → restore parent tree (no re-narrate), markStageComplete(punish).
- `learn.stage.watch-again` — restart walkthrough from move 1.

### B3. Voice / narration contract
- `learn.voice.gated-advance` — voice promise primary gate; backup = 3×wpm heuristic (MIN 3000ms).
- `learn.voice.verbosity` — per-speak resolveCoachNarration: full→speakForced(text); brief→shortText or silent-paced; silent→no audio, reading-pace resolve. NO auto-truncation.
- `learn.voice.two-register` — Watch=full; Learn(brief)=shortText/shortIdea.
- `learn.voice.faucet-narration` — reveals/guided-find route through speakForced (honor gate).

### B4. Arrows on coach moves + validation
- `learn.arrows.code-derived` — code resolves every NAMED move's arrow (applyCandidateArrows); LLM markers cleared; groundArrows re-validates vs live FEN.
- `learn.arrows.dedupe` — dedupeArrowsBySquarePair (fixes the 2026-06-12 duplicate-key flood + dropped arrow). Assert: no duplicate arrow key.
- `learn.arrows.chain-merge` — lead-the-eye chain arrows merged (not wiped), cleared on student move.
- `learn.arrows.step-by-step-obligation` — step-by-step turn REQUIRES arrow on played move + every SAN (G6).

### B5. "Why did you play that?" faucet (LEARN only, interruptive:true; inert elsewhere)
- `learn.faucet.eval` — every student move: Stockfish before+after (depth 14), mover-POV cpLoss; engine down → no guess.
- `learn.faucet.gate` — slipWarrantsInterjection: <1000 blunder(≥200); 1000–2000 mistake(≥100); >2000 inaccuracy(≥50). Below bar = silent capture.
- `learn.faucet.probe` — CLEAN neutral "Why'd you play that?" — ZERO board facts, identical good/bad. testid `discussion-prompt`.
- `learn.faucet.picker` — deterministic reason chips + Type toggle + Hint + severity chip. testids `discussion-reason-picker`, `-reason-option`, `-type-toggle`, `-hint`, `-severity`, `-input`, `-send`, `-skip`.
- `learn.faucet.hint` — Hint = honest "couldn't say" → reveal, logs was_hint.
- `learn.faucet.reveal` — after commit: buildSlipReveal (classification + hanging piece + best move + engine reasoning walk); NEVER LLM coachNote (G0); spoken via speakForced; routed to chat; pop-up closes. testid `discussion-thinking`.
- `learn.faucet.bucket` — captureMisconception → weakness bucket (gated shouldCount=learned); recurring tag → callback.
- `learn.faucet.mistake-puzzle` — counted slip w/ bestSan → addMistakePuzzleFromCapture (drillable later).
- `learn.faucet.good-move` — near-best + mover-owned tactic + off 8-ply cooldown → NON-BLOCKING atta-boy, no picker.
- `learn.faucet.dismiss-on-move` — play another move over open probe → card clears, silent capture "(played on)".
- `learn.faucet.skip` — discussion-skip → reset, no capture.
- `learn.faucet.review-entry` — raiseSlipPrompt (review path, no re-eval; shares submitReason).

### B6. Guided-find-the-move (P2)
- `learn.guided.gate` — student winning (eval ≥150cp) + ≥8 legal + move is mate/capture/check/tactic + no other question + ply gap.
- `learn.guided.ask` — names PIECE+GOAL, WITHHOLDS square; narration handed only the question. testids `guided-find-card`, `-hint`, `-skip`.
- `learn.guided.answer-board` — found→confirm+stands; retry→undo + retry prompt (no opponent reply); stale→clear.
- `learn.guided.hint` / `.skip` — reveal move/square / dismiss.
- `learn.guided.superseded` — active walkthrough clears open guided-find.
- `learn.guided.hold-variant` — review blunder-rewind HOLD challenge (no notability gate).

### B7. Adjacent in-the-moment questions (one-at-a-time discipline)
- `learn.threat-check` — a student piece genuinely hanging → ask which; tactics facts suppressed; guided-find priority. testids `threat-check-card`, `-option`, `-skip`.
- `learn.fork-talk` — near-equal different-character options (max 3/game) → deliberate both roads.
- `learn.think-aloud` — middlegame, one best move, throttled → deliberate WITHOUT naming the move.

### B8. Board-move → coach-reply loop
- `learn.reply.engine-plays` — ENGINE picks coach reply (1–2s think), LLM NARRATES only (play_move excluded) → words match board.
- `learn.reply.grounded-facts` — code computes capture/check/mate + grounded why + real tactics, handed to LLM (can't invent).
- `learn.reply.dictated-move` — "play d4"/"castle kingside" parsed vs chess.js legal (never invented); play-now / side-swap / armed-pending.
- `learn.reply.auto-pause-chat` — typing during narration pauses voice+advance.

### Key constants
- WT: POST_NARRATION_BUFFER_MS=400, FORK_AUTO_ADVANCE_MS=4000, backup MIN 3000/MAX 45000, BACKUP_WPM=180×3.0.
- Faucet: SLIP_CP {inaccuracy:50, mistake:100, blunder:200}, GOOD_MOVE_MAX_CPLOSS=20, GOOD_MOVE_MIN_PLY_GAP=8, ANALYSIS_DEPTH=14.
- Guided-find: MIN_EVAL_CP=150, MIN_LEGAL_MOVES=8.
- Probe invariant: buildWhyPrompt() === "Why'd you play that?" (zero board facts).

## C. Post-Game Review
Both entry paths render `CoachGameReview.tsx`. Post-game: `CoachGamePage` inline at
`status==='postgame'` (no gameId → hint-scoping/auto-enroll inert). Standalone:
`/coach/review/:gameId` (`CoachReviewSessionPage`, loads GameRecord + Stockfish if needed).
One-prompt-per-moment: handleWalkForward early-returns if any of readingGate | faucetPhase | shotState | shotReveal | turningQ | rewindOffer is active.

### C-A. Reaching review
- `review.gameover.overlay` — checkmate/stalemate/draw/flag → status 'gameover', result+keyMoments, overlay. testids `coach-game-page`, `skip-to-review-btn`.
- `review.gameover.resign` — Resign → finalizeGame('loss','resign').
- `review.gameover.skip` — "Review Game →" → status 'postgame' (skip 3.5s). Assert: `review-summary-card` mounts.
- `review.gameover.autoTransition` — 3.5s idle → auto postgame + clearCoachPlayState (no resumable prompt next).

### C-B. Persistence
- `review.persist.game` — ≥MIN_PERSIST_PLIES + gameId → db.games.add source='coach' (annotations, coachAnalysis, ECO, tags). Assert: games row w/ source coach + PGN.
- `review.persist.pipelineFanout` — after add → detectBadHabits + generateMistakePuzzles → computeWeaknessProfile + autoAnalyzeGameMisconceptions.
- `review.persist.floorSkip` — <MIN_PERSIST_PLIES → review shows but NO db row.

### C-C. Standalone load
- `review.session.load` — Stockfish analyze if needed → "Preparing your review…" then walk (non-zero accuracy).
- `review.session.colorInfer` — infer student color from names/handles.
- `review.session.loadError` — missing/broken PGN → error + "Back to game list" (not infinite spinner).
- `review.session.deepLink` — `?move=N` → lands ply N on first paint.

### C-D. Summary card
- `review.summary.render` — result banner + hero accuracy + eval graph + phase grades + classification pills + opening. testids `review-summary-card`, `result-banner`, `summary-eval-graph`, `opening-label`, `coach-narrative`.
- `review.summary.narrative` — streams coach paragraph; reject → degraded "Review is unavailable…" (not spoken).
- `review.summary.startPrep` — CTA "Preparing…"+spinner disabled until walkNarration.segments>0 → "Start". testid `start-walk-btn`.
- `review.summary.start` — Start → walk UI, `review-walk-started`. Assert: `coach-game-review-walk` mounts.
- `review.summary.missedOpp` — callout → `/tactics/mistakes` scoped sourceGameId. testid `missed-opportunities-callout`.
- `review.summary.weaknessCapture` — GameReviewWeaknessCapture affordance.
- `review.summary.legacyButtons` — quick/full review buttons NOT rendered on walk path.

### C-E. Auto-enroll (on open)
- `review.autoEnroll.mistakes` — mount w/ gameId → background generateMistakePuzzlesFromGame (idempotent) + autoAnalyzeGameMisconceptions; UI never waits.
- `review.mistakeBridge.threshold` — CP_LOSS_THRESHOLD=150 → only ≥150cp errors become puzzles.

### C-F. Walk stepping
- `review.walk.render` — board + classification badge + 4-btn nav + narration banner. testids `coach-game-review-walk`, `review-nav-controls`, `review-classification-badge`, `review-narration-banner`.
- `review.walk.intro` — ply 0 grounded intro once, `review-opened`.
- `review.walk.forward` — fwd/→ advance 1 ply, animate+speak; GUARDED (no-op while question open). testid `review-forward-btn`.
- `review.walk.back` — back/← step 1 SILENT. testid `review-back-btn`.
- `review.walk.start/end` — jump ply 0 (speak intro) / last ply; disabled at bounds.
- `review.walk.moveSound` — chime per ply transition (not ply-0 boot).
- `review.walk.narrationToggle` — Stop/Replay CURRENT ply only, no auto-advance. testid `walk-narration-toggle-btn`.
- `review.walk.moveList` — tap move/key-moment → jumpToPly.
- `review.walk.hintCallout` — hinted ply → "You asked for help here…" prefix (scoped gameId).
- `review.walk.citations` — mini-boards for flagged moves (played red/best green).
- `review.walk.emptyState` — 0 moves → "No moves to review." testid `coach-game-review`.
- `review.walk.shortGame` — usableCount 0 → intro-only, summary fallback, `review-walk-skipped`.
- Nav ceiling = full game length (silent plies still advance board).

### C-G. Find-the-shot card (missed winning shot)
- `review.shot.ask` — student mistake while winning (eval ≥150cp) + notable best → pause, hide best-arrow, SQUARE-FREE question. testids `review-find-shot-card`, `-hint`, `-skip`. Assert: question has no answer square; arrow suppressed.
- `review.shot.answerFound` — correct board move → reveal+cost+prosody spike, `outcome found`. testid `review-find-shot-reveal`.
- `review.shot.wrongRetry` — wrong → take-back (shotBoardEpoch) + retry.
- `review.shot.stale` — FEN drifted → silently clear.
- `review.shot.hint`/`.skip`/`.continue` — reveal SAN / advance / dismiss (→ rewind on blunder).

### C-H. Why-faucet (non-winning mistake)
- `review.faucet.raise` — costed non-winning mistake + readingChallengesInReview → Learn faucet picker (surface coach-review, shouldCount true), walk paused.
- `review.faucet.resume` — answer/skip → advance (or rewind on blunder).
- `review.faucet.panel` — picker → reveal → weakness bucket tagged game-review.

### C-I. Blunder rewind
- `review.rewind.offer` — blunder resolves → find last holdable student ply (HOLDABLE_CP=-50, gap≥3) → offer. testid `review-rewind-card`.
- `review.rewind.accept` — jump to holdable ply + HOLD challenge. testid `review-rewind-accept`.
- `review.rewind.decline` — dismiss + advance. testid `review-rewind-decline`.

### C-J. Turning-point (end of walk)
- `review.turning.ask` — last ply, once → "where did it turn?" ≤4 candidates (swing ≥1.0 pawn, need ≥2). testids `review-turning-point-card`, `turning-point-pick-<ply>`.
- `review.turning.pick` — grade (biggest swing correct) → reveal + prosody spike if correct. testid `review-turning-point-reveal`.
- `review.turning.done` — dismiss. testid `review-turning-point-done`.

### C-K. Explore / Show-me
- `review.explore.toggle` — error ply w/ best move → "Explore this position" flips board to fenBefore playable. testid `walk-explore-toggle-btn`.
- `review.explore.play` — play → Stockfish ~1500 replies once; `review-walk-explored`.
- `review.explore.resume` — Resume → snap back to real line. testid `walk-resume-game-btn`.
- `review.explore.autoResume` — nav away mid-explore → auto-clear, `review-walk-resumed`.
- `review.showMe.playout` — "Show me" → best move + Stockfish continues the GOOD line silent ≤4 plies. testid `walk-show-me-btn`. Assert: shows the correct plan, not the punishment.

### C-L. Engine lines & Ask
- `review.engineLines.toggle` — off by default → MultiPV top-3 PVs w/ eval + 5-ply preview. testids `review-engine-lines-toggle`, `-panel`, `-line-<i>`.
- `review.ask.send` — Ask → coachService.ask (surface review) w/ tactics + full SANs; extracts `[VOICE:]`; board tools LOCKED (play/takeback/set/reset refuse). testids `walk-ask-toggle-btn`, `walk-ask-panel`, `walk-ask-response`. Assert: onPlayMove returns ok:false; timeline unchanged.

### C-M. Voice register
- `review.voice.segments` — per-ply narration DETERMINISTIC (buildReviewSegments): classification stems + better SAN + grounded why; opponent/routine null (silent); no "Great move!".
- `review.voice.intro` — grounded defaultIntroText; voiceFacts warms phrasing only (no new fact).
- `review.voice.verbosity` — silent skips intro LLM; brief caps tokens.
- `review.voice.supersede` — nav cuts voice cleanly (token counter + stop), no racing timers.
- `review.spokenLines` — shot/rewind/turning prompts via speakForced; prosodySpike only on correct/found.

### C-N. Retired/legacy (inert — assert ABSENT)
- `review.retired.blunderCapture` — useReviewBlunderCapture is inert stub; `review-blunder-capture` NEVER renders.
- `review.legacy.readingGate` — ReviewReadingChallenge no longer set.
- `review.legacy.analysisPhase` — old analysis/what-if/practice/best-line UI DELETED; walk is the only surface.

### C-O. Missed-tactics & exit
- `review.missedTactics.list` — list (type+swing), tap → jumpToPly. testids `walk-missed-tactics`, `-tactic-<i>`.
- `review.practiceInChat` — "Practice in Chat" → `/coach/chat?q=`. testid `walk-practice-in-chat-btn`.
- `review.exit` — Play Again → `/coach/play`; Back to Coach → back-target. testids `walk-play-again-btn`, `walk-back-to-coach-btn`, `review-bottom-bar`.

### Audit-stream kinds
review-opened, review-walk-started, review-walk-skipped, review-nav, review-playback-step,
review-narration-spoken, review-segments-generated, review-walk-explored, review-walk-resumed,
review-show-me-started/-finished, review-engine-lines-toggled. PostHog: review_find_shot_asked/result,
review_rewind_offered/result, review_turning_point_asked/result.

---

## Coverage grid & audit build — NEXT
Build/extend audit scripts to exercise EVERY behavior above with a per-behavior
coverage grid (reached? which assertion? pass/fail). Silent no-op = FAIL. Existing
instruments: `audit-coach-teach-functional.mjs`, `audit-coach-teach-loop.mjs`,
`audit-coach-full-games.mjs` (review leg). Gaps to add: the full faucet flow (slip →
picker → reveal → bucket), find-the-shot / rewind / turning-point cards, explore/show-me,
engine-lines, stage quiz/drill/punish, line-picker & fuzzy pickers, dictated coach-move.
Run localhost (Chromium can't reach prod here) → fix breaks → CI leg vs prod.
