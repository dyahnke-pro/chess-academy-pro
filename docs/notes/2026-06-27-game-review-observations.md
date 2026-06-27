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

## State of in-flight work (NOT shipped, awaiting his go)
- Accuracy depth 12→16 (`gameAnalysisService.ts`) + `analysisDepth` stamp +
  re-analyze-when-stale gate + type field: **edited locally, uncommitted.**
  Two tests being updated to the new contract (one fixture left). Held per
  "don't fix yet."
</content>
</invoke>
