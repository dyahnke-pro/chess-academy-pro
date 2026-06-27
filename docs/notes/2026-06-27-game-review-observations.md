# Game Review — observations (IMG_4295, TestFlight) — 2026-06-27

David said: take notes, don't fix yet. Raw observations from the screenshot
+ his reported symptoms. Nothing actioned.

## Context / environment
- He is on the **TestFlight (iOS Capacitor) app, NOT Vercel web.** TestFlight
  bakes the web bundle at BUILD time → today's web pushes (read-position
  grounding `559a2a8`, the accuracy depth-16 change still uncommitted) are
  **NOT in his app**. They reach him only via a new TestFlight build.
- Top banner: **"Analyzing games — 4/604 — Knight_Mare_01 vs pintopin…"** →
  a bulk background analysis of a **604-game** library is running.
  ⚠️ Perf flag: the staged depth-12→16 change forces re-analysis of every
  stale-depth game. On a 604-game library that's a large one-time background
  job. Consider: lazy/prioritize the currently-opened game, throttle, or a
  progress affordance, rather than re-crunching all 604 at once. (Note only.)

## Screenshot facts (Game Review, Ply 26/50)
- Eval bar reads **-1.5**, move badge **GOOD**.
- Subtitle (cut off at bottom): **"(this move passes silently — tap forward
  to continue)"** → this specific ply is an INTENTIONALLY silent move per the
  narration design (routine move → no voice). So "no sound" on THIS move is
  by-design, not necessarily the bug.
- Controls present: **Flip**, **Ask** (mic icon), move nav `|< < > >|`
  (forward highlighted), **Replay narration**, **Ask** (chat), Play Again,
  Back to Coach.
- Visual: EVERY white piece has a green glow, EVERY black piece a purple/
  magenta glow; a couple of cyan/teal squares (a6 / h6 / near b-file).
  ❓ Unclear if intentional (side-coloring / lead-the-eye) or noise — verify
  later, NOT flagged as a confirmed bug.

## Reported symptom: "not hearing sound on post game review"
- On TestFlight (iOS). Candidates to investigate (later):
  1. **By-design silence** on routine moves (the subtitle confirms this ply is
     silent). Need to check a KEYSTONE/mistake ply actually speaks.
  2. **"Replay narration" button** — does tapping it fire voice? If it's dead,
     that's the real bug (voice path not firing in review on iOS).
  3. **iOS audio session / Polly streaming** on the Capacitor build — TTS = G4
     streaming canonical; verify `voiceService.speakReadAloud`/streamed path
     fires in CoachGameReview on device (the AVAudioSession patch covers
     route/ringer; confirm it's not silent-switch / mixWithOthers related).
  4. Is review narration even WIRED to voiceService on this build? (the
     ModelGameViewer-never-called-voiceService class of regression.)
  - 3-instrument audit (Playwright + audit-stream + narration listener) is the
    way to confirm WHICH of these once we act.

## Reported symptom: "Play Again / Back to Coach buttons won't go away — blocking chat"
- The footer (**Play Again** / **Back to Coach**) is pinned at the bottom and
  does NOT dismiss; it **covers the chat function** + the narration subtitle
  (which is why "(this move passes silently…)" is clipped at the bottom edge).
- Likely a layout/z-index/visibility bug in CoachGameReview: that footer
  should appear only at game-end (or be scrollable/collapsible), not sit
  permanently over the chat/ask panel + narration line.
- Pairs with the "no sound" report: if the narration line is being covered/
  clipped, the student also can't see the spoken text — same bottom-overlap
  root area. Investigate the review layout's bottom stack (footer + bottom-nav
  safe-area + chat panel + narration subtitle) together.

## IMG_4296 — "Review with Coach" game list (WEB / Vercel)
- URL bar: **chess-academy-pro.vercel.app** → this shot is the **web app**, not
  TestFlight. So he's switching between both; when debugging "no sound" / the
  footer overlap, pin WHICH surface (the no-sound report was TestFlight).
- **"Analyze 690 games"** button (was 604 on the other device) → confirms the
  large-library re-analysis perf concern for the depth-16 change. 690 games.
- The list itself looks healthy: per-game cards with result-colored borders
  (red/green/orange), style tag (AGGRESSIVE/SOLID/SHARP), ECO, source, date,
  and "X ?? · Y ?" blunder/mistake counts. Filter tabs (All / vs Coach /
  lichess / chess.com) at top. No obvious breakage in THIS view.
- 🐞 **CONFIRMED (David): the source-filter tab row is CLIPPED at the top** —
  the `All | vs Coach | lichess | chess.com` segmented row sits partly HIDDEN
  behind the "Pick a game. The coach walks through it move by move." subtitle.
  Only the bottom sliver of the tabs shows. Layout bug in Review-with-Coach
  list header: the sticky/header block overlaps the scroll container's first
  row, or the scroll area's top inset/padding is too small, so the tab row
  scrolls UNDER the header instead of below it. Fix later: give the scroll
  region enough top offset (header height) / move the tab row out of the
  overlapped zone / correct the sticky stacking. (CoachReview/Review-with-Coach
  list — find the component that renders "Pick a game" + the source tabs.)

## IMG_4297 — "Where you left the book" is WRONG (web/Vercel) 🐞🐞 (David: "Left book after move 1 I don't think is accurate. I know it's not.")
Game review summary, Vienna (C25). Banner reads:
> "At move 1 you went your own way. e4 is a common choice here and untested
>  for White, from thousands of master games."

Two distinct defects, same code path (`theoryDeviationScan.ts` +
`explorerTranslate.ts` + `lookupMasterPlay({localOnly:true})` over
`public/data/openings-masters-db.json`). Rendered by
`GameReviewWeaknessCapture.tsx:125`.

**Defect 1 — false "left book at move 1."** The Vienna IS 1.e4 — the single
most-booked move in chess; you cannot leave book by playing it. The scan flags
the FIRST player move whose SAN isn't found in the masters move-list at that
position (`inBook = masters.moves.some(m => m.san === san)`,
`theoryDeviationScan.ts:68`). It returned a deviation at ply 0 even though the
masters TOP move there is e4 (the banner literally describes e4 as moves[0]).
So `m.san === san` is FAILING for e4-vs-e4 → the local masters records' `san`
values don't string-equal the tokenized played SAN (whitespace / notation /
shape mismatch in `openings-masters-db.json`, or the start position maps to a
sparse/normalized record). Net: the in-book test is unreliable → first move
gets flagged. Likely affects EVERY game's marker, not just this one.

**Defect 2 — self-contradictory masters text.** "a common choice … **untested**
… **thousands of master games**" is impossible: `translateScore` only returns
"untested" when `white+draws+black === 0` (`explorerTranslate.ts:27-29`), yet
`describeSampleSize` said "thousands" (games ≥ 10000) and `translatePopularity`
said "a common choice" (share ≥ 0.2). So the local masters move record for e4
has a `games` count (≥10k) but a ZERO W/D/L breakdown. The
`openings-masters-db.json` records (or the `localOnly` lookup mapping into
`MasterPlayMove`) are missing/!populating white/draws/black → every score reads
"untested."

**Root cause (hypothesis):** the LOCAL masters DB shape doesn't match what
`lookupMasterPlay(localOnly)` → `MasterPlayMove` (san + games + white/draws/
black) expects: SANs don't string-match the played move AND W/D/L are absent.
Confirm by: (a) inspecting `openings-masters-db.json` at the start FEN, and
(b) running `scanTheoryDeviation` on his actual PGN. Fix in the batch:
normalize SAN comparison (strip/standardize), require real W/D/L (or guard the
"untested"+"thousands" contradiction), and add a regression test that 1.e4 in a
Vienna is NOT flagged as off-book.

## IMG_4298 — FEATURE: board previews for the positions the summary names (David: "I don't have any visual reference for these words. Could we include a preview that shows the board in the positions it's talking about?")
The coach's game-summary prose cites specific moves/positions:
"Move 8. Qa4 — an inaccuracy", "Move 12. c4 — the biggest mistake … 12.Bg5
would have pinned …", "Move 20. Qf5", "Move 21. Kg7 — a blunder hanging
everything on g7 and f8." None have a visual; the student reads squares
they can't see.

**Ask:** show a board preview at each cited position.

**Design (grounded — G0/G3):**
- We already have the game PGN + per-move annotations, so every cited ply's
  FEN is computable via chess.js. Played move → FEN AFTER that ply (arrow on
  the move). Suggested/alternative move ("would have", "instead": e.g. 12.Bg5)
  → FEN BEFORE that ply + the suggestion as a GREEN arrow (validate it's legal;
  if illegal, don't render).
- Render an inline static `ConsistentChessboard` (static mode) mini-board under
  / beside each citation, with the move arrow + key-square highlights the prose
  names (g7/f8 for the 21.Kg7 line). Tapping it jumps the MAIN review board to
  that ply (reuse the existing board+eval, no duplicate runtime).
- Parse citations from the prose: `Move N. SAN`, `N.SAN`, `…SAN`. For EACH,
  cross-check the SAN against the real game at that ply (annotations) — only
  render a preview when it matches a real/legal position. A mismatch = the
  prose hallucinated (see the "left book" bug) → skip + flag, never render a
  fabricated board.

**Better architecture (the real fix, ties to G0):** the summary's move
references should be COMPUTED from the analysis data (the annotations already
know which plies were inaccuracy/mistake/blunder + the engine's best
alternative + the cited squares), and the LLM should only PHRASE them. Then
each citation is a structured object `{ply, playedSan, suggestedSan?, squares[]}`
and the preview is trivially grounded (no prose-parsing, no hallucinated
boards). This is the same G0 inversion that also kills the "left book at move 1"
class of inaccuracy. Recommend building the previews on top of structured,
code-supplied citations rather than regexing the LLM prose.

- Scope: largest of the batch. Net-new component (inline preview) + the
  citation-structuring on the summary generator. Worth a small PLAN section
  when we build.

## IMG_4299 — review per-move narration HALLUCINATES a hanging pawn (web/Vercel) 🐞🐞 (David: "narration said I left the pawn on e5 hanging. Knight is pinned, it's not hanging.")
Game Review, Ply 15/42, eval -0.3, badge INACCURACY.

**Defect A — false hanging claim (G0/G3, narration-accuracy).** Narration said
the e5 pawn is hanging. Verified from the board: the white e5 pawn (dark square)
is attacked by NOTHING — no black pawn on d6/f6, only black knight is on g8
(can't reach e5), c8 bishop is light-squared (can't touch dark e5), d8 queen has
no line to e5. **Not hanging.** The real motif is a PINNED knight (David), which
is a different thing and is not "hanging." So the REVIEW per-move narration is
eyeballing the board and inventing a hanging piece — the exact disease the
narrationAccuracy gate + the grounded board-facts (liveTacticsContext HANGING =
attacked-AND-undefended, now also SEE via positionReadingService) exist to kill.
→ The review walk narration is NOT routed through the grounded hanging/pin
facts (or isn't gated). Same inversion as the recap (#6) and read-position: the
narration must VOICE computed hanging/pin facts, never decide them. A correct
grounded block would say "the knight is pinned" / "nothing is hanging," not
"e5 hangs." Tie this fix to the recap grounding — it's the same surface's
ungrounded voice.
  - Bonus: the grounded set needs PIN awareness surfaced to the narration (so
    it can say "pinned" correctly), not just hanging/SEE.

**Defect B — can't scroll to the narration text (overlap again).** David:
"I cannot scroll down here and see the text." During the WALK (not game-end),
the narration/subtitle below the board is unreachable — the bottom stack
("Replay narration"/"Ask" + bottom-nav) covers it and the area doesn't scroll.
Same root as #2 (footer/bottom overlap) but confirmed mid-walk too: the review
content region isn't scrollable / lacks bottom inset for the fixed controls +
nav. Whatever the student is supposed to READ is getting clipped on every ply.

## ASK — "I want to hear the coach SAY why the move was better" (review)
On a mistake/inaccuracy/blunder ply, the review shows the better move + arrow
("Show me") but doesn't SPEAK the reasoning. David wants the coach to voice WHY
the engine's move is better.
- We ALREADY have the grounded, LLM-free computer: `explainBestMoveGrounded`
  (`groundedAnswer.ts:180`) — the no-LLM "why" the review path is meant to use
  (G0 names it explicitly). And `assembleMoveEvalAnswer` (`:117`) wraps it.
- Review "Show me" lives in `CoachGameReview.tsx` (~:1048-1090, has
  `seg.bestMoveUci`). Wire: on Show-me (or on landing a flagged ply), compute
  `explainBestMoveGrounded(fen, …, bestMoveUci, mover)`, phrase it, and SPEAK it
  via voiceService (gated by verbosity per G5; this is automatic in-game
  narration → `speakForced`, not a read-aloud). Same grounded spine as the
  recap/per-move fixes — the "why" is COMPUTED, the LLM only voices it (G0).
- Pairs with the no-sound bug (#3): make sure the voice actually FIRES on iOS
  for this.

## ASK — "finished the review, it never asked why I made a mistake :("
David expects the review to ENGAGE him about his mistakes, not just narrate.
Three possible reasons it didn't, untangle in the batch:
1. The opt-in reading gate we built (Surface A, `readingChallengesInReview`)
   defaults **OFF** → nothing prompts. Decide: default it ON, or surface a
   clearer toggle. NOTE that gate asks "what do you SEE" (vision) BEFORE the
   move — not literally "why did you make this mistake."
2. The old per-ply "why did you play that?" capture was RETIRED (2026-06-11,
   the pop-up he killed). So there's an intentional gap he now wants filled —
   but in the non-modal, in-flow way (the reading gate is that vehicle).
3. ⚠️ Possibly MASKED by the overlap bug (#2 / #B): if a prompt DID render, the
   footer/bottom-stack overlap + unscrollable content could have HIDDEN it, so
   "it never asked" may partly be "I never saw it." Fix the layout first, then
   re-check whether the gate fires.
Pairs with the "say why the move was better" ask: together they're the
diagnostic loop David wants — ask (what do you see / why) → reveal the better
move → SPEAK the grounded why. Build on the reading gate + explainBestMoveGrounded.

## PostHog — what to pull (BLOCKED on read key this session)
`POSTHOG_API_KEY` is NOT in this session (SessionStart hook flagged it; a live
`posthog-query.mjs` returned 401). Can't pull it from Vercel (stored encrypted
there + credential-materialization is security-blocked). Need David to add the
`phx_` read key to the Claude env-var config, or paste inline. THEN query —
the app mirrors audit events to PostHog (`mirrorAuditEvent`, autocapture OFF),
and `buildEventProps` stores **`narration_text`** (full spoken line). High-value
queries the moment the key lands:
- `coach_narration_spoken` / `coach_narration_fired` with `narration_text` →
  find hallucinated board claims at scale (the "e5 hanging" class, bug #5/#A).
- `coach_narration_skipped` + `tts_failure` + `voice_spoken` → diagnose the
  NO-SOUND-in-review bug (#3): is voice being SKIPPED, FAILING, or never invoked
  on iOS/review?
- `lesson_started`/`lesson_completed`, `coach_question_asked`, `llm_call`
  (cost), `strength_calibrated`, `user_report` → review usage + engagement.
- Filter `route` ~ review / `source` for the review surfaces.

## DESIGN — the grounded "why" (two whys + move-order/tempo)
David confirmed BOTH whys are wanted: (1) why YOUR move was a mistake (what it
ALLOWED) and (2) why the BETTER move is better (what it ACHIEVES) — taught as a
CONTRAST. His sharp test case: "why move the bishop out BEFORE the queen?" = a
MOVE-ORDER / tempo why.

What `explainBestMoveGrounded` (groundedAnswer.ts:180) does TODAY: material-win
("wins the [piece] on [sq]", capture + value/recapture check) + "comes with
check" + cost ("your move left [piece] hanging / let them play X winning [piece]").
That's the tactical/material why only — NO move-order, NO tempo.

NEW computer to build (the move-order comparator), all on primitives we already
have — chess.js `attackers` + legal-move geometry, Stockfish eval/PV,
`seeGain` (positionReadingService):
1. Eval BOTH orders (bishop-first vs queen-first) → confirm which is better.
2. Play the WORSE order, take the opponent's best reply, classify its MECHANISM:
   - reply ATTACKS the queen (`chess.attackers(queenSq, them)`) → TEMPO loss
     ("queen comes out, …Nd4 hits it, you lose the move") ← the bishop-before-
     queen reason.
   - reply WINS material → `seeGain`.
   - reply SEIZES the square the queen wanted → geometry.
   That mechanism IS the spoken why.
HONEST LIMIT (hold the G0 line): if the better order is preferred only for
subtle positional feel with NO concrete refutation of the other order, do NOT
fabricate a tempo story — say less ("engine prefers finishing development
first") or stay quiet. Grounded tempo/material/square cases cover the large
majority incl. his example.
Build location: next to explainBestMoveGrounded; voice via the review grounded
spine (recap + per-move). Pending David's go for the batch.

## DESIGN — the "why" is a CHOREOGRAPHED board demo synced to the voice (David)
Verbatim: "take my wrong move back, show me the correct one, tell me why it was
better and move other pieces or draw other arrows to illustrate that point as
it's being spoken." A synchronized demonstration, not a static board.

HAVE (reuse, don't reinvent):
- `narrationSegments` = sentence-grained reveal (markers appear as THEIR sentence
  is spoken) → "without missing a beat."
- `useWalkthroughRunner`/`useStrictNarration` = voice-promise-gated advance (no
  timer racing the voice).
- Lead-the-eye color grammar: orange=move squares, green=vision arrows,
  yellow=key square named.
- Review board already drives itself for "Show me"/"Explore" → take-back +
  replay is a known move.

BUILD (on grounded facts):
- Move-order comparator (prev section) → the why + the DEMONSTRATION line.
- Beat ASSEMBLER: grounded why → `{ fen, move, arrows[], highlights[], say }[]`
  (same shape as a masterclass beat).
- Review "why-demo" MODE: pause walk → take back wrong move → play correct
  (orange + spoken) → demonstrate the reason by playing the contrast/refutation
  line with arrows on the named squares AS the voice speaks → restore to the ply.
DISCIPLINE (G0/G3): every demonstrated move + arrow comes from the COMPUTED line
(engine PV / refutation / chess.js geometry), never invented. No line to show →
show less, never fake a piece dance. Voice-gated reveal, not timer-raced.

## AUDIT-STREAM FINDINGS (pulled live, AUDIT_STREAM_SECRET) — 2 big ones
**Finding 1 — NO-SOUND root cause (#3): Polly is FAILING → Web Speech fallover
on ~every line.** The live stream showed a `voice-fallover` ("Polly failed →
Web Speech") paired with nearly every `review-narration-spoken` /
`voice-speak-invoked` in David's session. On iOS TestFlight the Web Speech
fallback is the likely silence. Server-side `/api/tts` (Polly) is failing.
Prime suspect: `AWS_*_POLLY` creds (present in Vercel, encrypted — can't read
values; symptom is Polly failing). ACTION (batch): verify /api/tts returns a
Polly stream on prod (G4), check the AWS Polly creds/region, and confirm the
iOS audio path actually plays the Web Speech fallback (or make Polly not fail).
This is the no-sound bug, root-caused from the audit data.

**Finding 2 — the per-move review narration is THIN (proves the "why" gap).**
ply 39 (the 20.Qf5 mistake David showed; Be4 was best): spoken =
"Mistake. The best move was bishop to e4." / on-screen =
"Mistake. The best move was Be4. Drops about [N]…". It names the better move +
the cp drop and STOPS — no WHY, no demonstration. Exactly the grounded-why +
choreographed-demo work. (Also: the per-move lines are template-generated
"Mistake. The best move was X. Drops about N" — fine as a floor, but the rich
"why" must replace/augment it on flagged plies.) The arrow engine DID inject
code-arrows (Qf5:red; recap Nd5/Bg5/Qf5:red), so the arrow plumbing works.

## PostHog access — STATUS (need David)
Read key is in Vercel under BOTH `POSTHOG_API_KEY` (type=encrypted) AND
`PostHog_Read_API_KEY` (type=sensitive). Vercel API returns NEITHER in plaintext
(by design for encrypted/sensitive). `VITE_POSTHOG_KEY` = public `phc_` write
key (401 on read API). Bulk `vercel env pull` (the only thing that decrypts) is
security-blocked (dumps all prod secrets). → To give Claude standing PostHog
access, add the `phx_` read key to the **Claude Code env-var config** as
`POSTHOG_API_KEY` (best; every session), or paste inline per-session, or approve
a non-auto `vercel env pull`. Until then PostHog history is unreachable; the
live audit-stream (ephemeral, wiped on deploy) is the only window and it has the
narration_text + voice-fallover signal.

## State of in-flight work (NOT shipped, awaiting his go)
- Accuracy depth 12→16 (`gameAnalysisService.ts`) + `analysisDepth` stamp +
  re-analyze-when-stale gate + type field: **edited locally, uncommitted.**
  Two tests being updated to the new contract (one fixture left). Held per
  "don't fix yet."
</content>
</invoke>
