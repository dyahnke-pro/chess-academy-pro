# WO-COACH-CHAT-TRACE-01 — Chat Surfaces & Intent Fragmentation Map

**Audit-only deliverable.** No code changes. This document maps every coach-chat surface in the app, the state each can read/write, and the exact break point that caused Dave's "coach played c5 instead of c6" bug on a Home-dashboard Caro-Kann request.

---

## 1. Surface inventory

| # | Surface | Component (file) | Route | Input handler | Dispatcher(s) | System addition | Mount lifecycle |
|---|---|---|---|---|---|---|---|
| 1 | **Home dashboard (SmartSearchBar → GlobalCoachDrawer → GameChatPanel)** | `src/components/Search/SmartSearchBar.tsx` + `src/components/Coach/GlobalCoachDrawer.tsx` + `src/components/Coach/GameChatPanel.tsx` | `/` (SmartSearchBar), drawer mounted globally in `AppLayout` — available on **all** routes | `SmartSearchBar.askCoach` (118), then `GameChatPanel.handleSend` (160) | `routeChatIntent` (266) — **not** `detectInGameChatIntent` (gated out, see §3) | `GAME_NARRATION_ADDITION` via `getGameSystemPromptAddition()` (396) | Drawer persistent (AppLayout); GameChatPanel survives drawer toggles via `savedMessagesRef` (`GlobalCoachDrawer.tsx:51`) |
| 2 | **Standalone Coach Chat** (`CoachChatPage`) | `src/components/Coach/CoachChatPage.tsx` | `/coach/chat` (`App.tsx:180`) | `handleSend` (99) | `routeChatIntent` (167), `runCoachTurn` (236) | `getChatSystemPromptAdditions(hasAnalysisData)` (204) | Mounts on nav, unmounts on leave; hydrates chat history from `useCoachSessionStore` + Dexie |
| 3 | **Coach tab in-game chat** (`CoachGamePage` → `GameChatPanel`) | `src/components/Coach/CoachGamePage.tsx` + `src/components/Coach/GameChatPanel.tsx` | `/coach/play` (`App.tsx:172`) — embedded as desktop split-pane (`CoachGamePage.tsx:3113`) or mobile drawer (3055) | `GameChatPanel.handleSend` (160) | `detectInGameChatIntent` (203) **←** only surface that uses this, `routeChatIntent` (266), `runAgentTurn` (418) | `GAME_NARRATION_ADDITION` via `getGameSystemPromptAddition()` (396) | Desktop persistent, mobile toggle-drawer |
| 4 | **Review "Ask about this position"** | `src/components/Coach/CoachGameReview.tsx` (expandable panel at line 2470) | `/coach/game/review` / `/coach/play` post-game | `handleAskSend` (555) | `getCoachChatResponse` (597) | `POSITION_ANALYSIS_ADDITION` (597) | Panel mounts when `askExpanded` flips; resets on move nav (610) |
| 5 | **Review "Practice in Chat"** | `src/components/Coach/CoachGameReview.tsx` (button at 2515 / 1893) | Same as #4 | `handlePracticeInChat` (1433) | **None** — calls `onPracticeInChat?(prompt)` prop (1438) | — (deferred to parent) | Button only, no state of its own |

**No other coach-chat surfaces found.** (Puzzles and Openings are explicitly out of scope per the WO.)

---

## 2. State scope

| Surface | Message history | Opening intent (`requestedOpeningMoves`) | Shared with others? |
|---|---|---|---|
| 1. Home dashboard | `GameChatPanel` component `useState` (100); mirrored to `GlobalCoachDrawer.savedMessagesRef` (51) via `onMessagesUpdate` | **No read, no write.** `isGameOver` is hard-coded to `true` (`GlobalCoachDrawer.tsx:271`), which short-circuits the `!isGameOver` intent path; no `onPlayOpening` prop is passed. | History isolated to this drawer instance; `savedMessagesRef` is a component ref (lost on full remount / refresh). |
| 2. CoachChatPage | `useCoachSessionStore.chatMessages` (Zustand → Dexie `coachSessions`) | No direct read/write of `requestedOpeningMoves`. Calls `routeChatIntent`, which emits a URL `path` param the caller navigates to. | Shared history with any future `useCoachSessionStore` consumer (none today). No cross-surface state. |
| 3. In-game chat | `GameChatPanel` component `useState` (separate instance from #1). Mirrored via `onMessagesUpdate` → `CoachGamePage.initialChatMessages`. | **Write via prop callback only.** `onPlayOpening={handleOpeningRequest}` → `setRequestedOpeningMoves` in CoachGamePage (375). | History not shared with #1 even though it's the **same component class** — separate mount, separate state. |
| 4. Review Ask | `askResponse` / `isAskStreaming` component `useState` (local scope, function-scoped ephemeral) | N/A (review is post-game; `requestedOpeningMoves` is live-play only) | Isolated. |
| 5. Review Practice-in-Chat | None (button emits a prompt string to a parent callback) | N/A | N/A |

**`requestedOpeningMoves` lives as a single `useState` in `CoachGamePage.tsx:373`.** It is not in any Zustand store, context, Dexie table, or global singleton. It resets to `null` on every CoachGamePage mount and on five internal reset paths (see `setRequestedOpeningMoves(null)` call sites at lines 1074, 1112, 1557, 2141, 2452).

---

## 3. Failure trace — Dave's Caro-Kann ran Sicilian

### 3a. Intent capture on the Home dashboard

1. Dave types "Play the Caro-Kann as Black" into the SmartSearchBar on the home dashboard. `SmartSearchBar.askCoach` (line 118) calls `setCoachDrawerOpen(true)` + `setCoachDrawerInitialMessage(text)` (119–120).
2. `GlobalCoachDrawer` mounts `GameChatPanel` with `isGameOver={true}` (hardcoded — `GlobalCoachDrawer.tsx:271`) and **no `onPlayOpening` prop** (props list ends at line 281). The comment at 267–270 explicitly says this: "The GameChatPanel gates routing behind isGameOver; passing true here unblocks that path for the global/floating drawer."
3. `GameChatPanel.handleSend` runs. The in-game branch `if (!isGameOver)` (line 202) is **skipped**, so `detectInGameChatIntent` never runs on this surface.
4. The `if (isGameOver)` branch (line 258) runs instead. It calls `routeChatIntent(text, {...})` (266).
5. `routeChatIntent` parses via `parseCoachIntent` → `{kind: 'play-against', subject: 'caro-kann' (post-alias: 'Caro-Kann Defense'), side: 'black'}` → returns `{path: '/coach/session/play-against?subject=Caro-Kann%20Defense&side=black', ackMessage, intent}` (`coachIntentRouter.ts:150-160`).
6. Line 281 of GameChatPanel fires `navigate(routed.path)` → routes to `/coach/session/play-against?…`.
7. **`coach-opening-intent-set` does NOT fire at this point** — no audit is emitted until CoachGamePage's `handleOpeningRequest` runs (CoachGamePage.tsx:383-389), which requires navigation to complete and `?subject=` to be read.

### 3b. State persistence across navigation

- No Zustand slice, no Context, no Dexie row holds the opening intent between step 3a and step 3c.
- The intent survives **only as URL query params**: `?subject=Caro-Kann Defense&side=black`.
- `CoachSessionPage` (`/coach/session/:kind`) on mount for `kind === 'play-against'` rebuilds a params object from `subject`, `side`, `difficulty`, `focus`, `opening`, `openingPgn`, `narrate` and redirects to `/coach/play?…` (CoachSessionPage.tsx:106-121).
- If any of the following happens between the ack-and-navigate at step 3a.6 and CoachGamePage's on-mount effect at step 3c, intent is lost with no recovery channel:
  - User dismisses the drawer before `navigate()` fires.
  - User taps the Coach tab in the bottom nav before the drawer's navigation completes (navigates to `/coach/play` with no query params).
  - Browser back/forward button fires.
  - `CoachSessionPage`'s param-forwarding omits `subject` (it reads only specific keys — extra keys or aliasing are dropped).
  - A resume-game path overrides the fresh route.

### 3c. Move-selector read on Coach tab

1. `CoachGamePage` mounts. `searchParams` is read once in the on-mount effect at lines 405–418:
   ```ts
   const seed = searchParams.get('opening') ?? subjectParam;  // subjectParam = searchParams.get('subject')
   if (!seed) return;
   if (initialGameFen) return;
   subjectAppliedRef.current = true;
   handleOpeningRequest(seed);
   ```
2. `handleOpeningRequest(seed)` (line 375 post WO-COACH-OPENING-INTENT-01) calls `getOpeningMoves(seed)` and emits `coach-opening-intent-set`.
3. The coach-turn effect (line 1458) reads `requestedOpeningMoves` from the SAME `useState` and calls `tryOpeningBookMove`.

This read path only works when the URL carries `?subject=` or `?opening=`. **There is no fallback channel if the URL didn't survive.**

### 3d. The exact break point (one sentence)

> Opening intent lives as a single component-local `useState` in `CoachGamePage.tsx:373`; the only way Home-dashboard chat can reach that state is to navigate with a `?subject=` URL parameter that survives two intermediate routes (`GlobalCoachDrawer → CoachSessionPage → CoachGamePage`), and any interruption or alternate navigation path (e.g., Dave tapping the Coach tab manually after the ack posts) silently drops the intent with no shared state, no audit trail, and no recovery channel.

Dave's "intent was captured by Home chat, move-selector on Coach tab couldn't read it" is precisely this: the capture produced a route target, not a state write; the move-selector reads state only.

---

## 4. Dispatch helpers inventory

| Call site | Function | Addition prepended | Used by surface # |
|---|---|---|---|
| `CoachGameReview.handleAskSend` (597) | `getCoachChatResponse` | `POSITION_ANALYSIS_ADDITION` | 4 |
| `CoachGamePage.handleStartPractice` (1322) | `generateNarrativeSummary` (→ `getCoachChatResponse` internally) | `GAME_POST_REVIEW_ADDITION` | review fallback |
| `CoachGameReview` narrativeSummary effect (239) | `generateNarrativeSummary` | `GAME_POST_REVIEW_ADDITION` | review |
| `coachFeatureService.generateReviewNarration` (562–588) | `getCoachChatResponse` × 2 (intro + segments) | `REVIEW_INTRO_ADDITION`, `REVIEW_MOVE_SEGMENT_ADDITION` | review walk |
| `usePositionNarration` (224) | `getCoachChatResponse` | `POSITION_NARRATION_ADDITION` | Read Position (not a chat surface) |
| `usePhaseNarration` (~255) | `getCoachChatResponse` | `PHASE_NARRATION_ADDITION` | phase narration (not a chat surface) |
| `GameChatPanel.handleSend` (418) | `runAgentTurn` → internally calls `callAnthropicStream` / `callDeepSeekStream` | `getGameSystemPromptAddition()` → `GAME_NARRATION_ADDITION` | 1, 3 |
| `CoachChatPage.handleSend` (236) | `runCoachTurn` | `getChatSystemPromptAdditions(hasAnalysisData)` (includes optional `analysisContext`) | 2 |
| `GameChatPanel.handleSend` (203) | `detectInGameChatIntent` | — (local intent detector, not an LLM call) | **3 only** |
| `GameChatPanel.handleSend` (266), `CoachChatPage.handleSend` (167) | `routeChatIntent` | — (post-game intent router; navigates) | 1, 2 |

**Two parallel intent-capture paths:**
- **Pipeline A (URL-based):** surfaces 1 + 2 → `routeChatIntent` → `navigate('/coach/session/play-against?subject=…')` → CoachSessionPage → CoachGamePage → `handleOpeningRequest`.
- **Pipeline B (callback-based):** surface 3 → `detectInGameChatIntent` → `onPlayOpening(name)` → `handleOpeningRequest` directly (no navigation).

The same `GameChatPanel` component takes **different** paths depending on its `isGameOver` prop, which is fixed at `true` in the drawer and `false` during active play. Surfaces 4 + 5 don't capture intent at all.

---

## 5. Audit log emit points

Post-WO-COACH-OPENING-INTENT-01 these audits exist:

| Kind | Emit site | When it fires |
|---|---|---|
| `coach-opening-intent-set` | `CoachGamePage.handleOpeningRequest` (383, 395) | **Only after** `handleOpeningRequest` runs. That requires either Pipeline A's `?subject=` URL read **or** Pipeline B's `onPlayOpening` prop. |
| `coach-opening-intent-consulted` | Coach-turn effect (1478 book hit, 1513 fallback) | On every coach turn where `requestedOpeningMoves` is non-null. |
| `coach-opening-intent-cleared` | Five `setRequestedOpeningMoves(null)` sites, tagged `handleRestart` / `handleColorChange` / `resetWithPrompt` / `play-again` / end-of-book | Wherever live-play state resets. |

**Expected timeline for Dave's working flow (Caro-Kann from Home):**
1. Dave types message → drawer posts ack → `navigate('/coach/session/play-against?subject=Caro-Kann Defense&side=black')`.
2. CoachSessionPage redirects to `/coach/play?subject=Caro-Kann Defense&side=black`.
3. CoachGamePage on-mount effect (405) reads `subjectParam = 'Caro-Kann Defense'`, calls `handleOpeningRequest`, which fires **`coach-opening-intent-set`** with `intent=Caro-Kann Defense plies=6`.
4. Dave plays 1.e4. Coach turn effect (1458) calls `tryOpeningBookMove` → returns `c7c6`. Fires **`coach-opening-intent-consulted`** with `moveChosen='c7c6', source='book'`.

**Dave's failing timeline (what almost certainly happened — audit log from his session wasn't provided, but the diagnosis is deterministic given the code map):**
1. Dave typed from Home chat.
2. `routeChatIntent` fired and returned a navigate path.
3. **Navigate never completed OR Dave reached `/coach/play` through a different path** (bottom nav, existing-tab state, browser history) — `?subject=` never reached CoachGamePage's mount effect.
4. `handleOpeningRequest` never ran.
5. `coach-opening-intent-set` never fired.
6. Coach-turn effect ran with `requestedOpeningMoves = null` → `tryOpeningBookMove` returned null → `getAdaptiveMove` picked c5 (a common Stockfish response to 1.e4 at moderate ELO).
7. **Zero `coach-opening-intent-*` audits in the log for this game** — the smoking gun signature.

We can ask Dave to dump `__AUDIT__.copy()` from DevTools after reproducing; the absence of `coach-opening-intent-set` confirms Pipeline A silently failed at the URL hop.

---

## 6. The break point named clearly

> **Opening intent is held only as a local `useState` inside `CoachGamePage.tsx` and is reachable from the Home dashboard chat exclusively by navigating to `/coach/play?subject=…`.** The GameChatPanel inside `GlobalCoachDrawer` is hardcoded `isGameOver={true}` with no `onPlayOpening` prop (`GlobalCoachDrawer.tsx:260-282`), so it has no callback channel into the game — only a URL route. Any interruption of that route (user tap on bottom nav, drawer dismissal, resume-game override, param forwarding gap) silently drops the intent because no shared store or context holds it. The in-game GameChatPanel uses a completely different intent pipeline (`onPlayOpening` callback prop wired to `handleOpeningRequest`), so the two instances of the same component behave differently by design.

---

## 7. Proposed unify WO shape

The next WO (call it `WO-COACH-CHAT-UNIFY-01`) should:

### State
- Add `intendedOpening: { name: string; side: 'white' | 'black' | null; setAt: number } | null` to a **global** Zustand slice. `useCoachSessionStore` is the natural home (already persisted to Dexie and shared between CoachChatPage and future consumers). Expose `setIntendedOpening(next)` and `clearIntendedOpening(source: string)`.
- Move audit emission **into the slice's setter** so every write is observable regardless of the caller. `coach-opening-intent-set` / `coach-opening-intent-cleared` fire from the store action; callers don't have to remember to emit.

### Capture
- Extract a surface-agnostic `tryCaptureOpeningIntent(text): { name, side } | null` helper. It merges today's `detectInGameChatIntent` + `routeChatIntent`'s play-against branch into one unconditional check — no more `isGameOver` gate, no more URL-vs-callback bifurcation.
- Wire that helper into every chat input: SmartSearchBar voice path, GameChatPanel (both drawer + in-game instances), CoachChatPage, review Ask, review Practice-in-Chat.
- Each wiring: `if (intent = tryCaptureOpeningIntent(text)) store.setIntendedOpening(intent)`. The URL-navigate behavior stays as a user-visible side effect, but it's no longer the ONLY channel.

### Read
- CoachGamePage on mount reads the slice first; if `intendedOpening` is set, seeds `requestedOpeningMoves` from it. URL `?subject=` becomes a fallback / deep-link path that also writes to the slice.
- Drop the component-local `requestedOpeningMoves` useState in favor of a derived selector from the slice (or keep the local state but sync from slice on mount — whichever proves lighter-touch).

### Clear semantics
- Slice clears on explicit user "free play / cancel opening" intent, on game-end, on end-of-book-fallback, and optionally with a TTL (e.g., 15 minutes) to avoid a week-old intent leaking into a new session.

### Verification
- Regression test: set `intendedOpening = Caro-Kann Defense, side=black` via the slice, mount CoachGamePage, play 1.e4 → assert coach plays c6. Covers Dave's failure case with zero URL dependency.
- Audit test: setter emits `coach-opening-intent-set` exactly once per write.

### Files likely touched (estimated 5–6)
- `src/stores/coachSessionStore.ts` — add slice.
- `src/services/appAuditor.ts` — no new kinds needed (reuse existing set/cleared/consulted).
- `src/services/openingIntentCapture.ts` (new) — `tryCaptureOpeningIntent` helper.
- `src/components/Coach/GameChatPanel.tsx` — wire helper, drop `isGameOver` gate on intent path.
- `src/components/Coach/CoachGamePage.tsx` — read from slice; keep URL fallback.
- `src/components/Coach/GlobalCoachDrawer.tsx` — no code change needed; drawer's chat now writes to the slice via GameChatPanel's new wiring.

**Not in scope for the unify WO:**
- Review Ask / Practice-in-Chat opening capture — review is post-game, intent has no consumer there. Explicitly skip.
- Multi-opening repertoire, UI pickers, or settings screens. Chat-driven capture only.
