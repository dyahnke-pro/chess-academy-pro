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

## State of in-flight work (NOT shipped, awaiting his go)
- Accuracy depth 12→16 (`gameAnalysisService.ts`) + `analysisDepth` stamp +
  re-analyze-when-stale gate + type field: **edited locally, uncommitted.**
  Two tests being updated to the new contract (one fixture left). Held per
  "don't fix yet."
</content>
</invoke>
