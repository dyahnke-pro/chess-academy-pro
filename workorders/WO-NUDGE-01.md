# WO-NUDGE-01 — Activation-Cue / Nudge System

**Status:** Not Started
**Dependencies:** WO-17 (gamification / streaks), WO-18 (settings), WO-05 (puzzle SRS → "due mistakes")
**Priority:** High — "how do users discover this feature" is itself a feature

---

## Instructions

Complete work order WO-NUDGE-01: the activation-cue / nudge system.
Read `BLUEPRINT.md` for the technical specification.
Read `CLAUDE.md` for coding conventions (strict TS, Tailwind utility-only, named exports, Dexie-persistent state, Zustand runtime state, co-located tests).
Build the nudge substrate that surfaces new features, spaced-repetition due work, and streak risk inside the app itself. When done update `MANIFEST.md` and commit with git.

The feature's thesis: **discovery is a first-class product surface.** A training feature that the user never finds is a feature that doesn't exist. This work order makes activation into a system instead of a wish.

---

## 1. Toast / Banner System

Generic notification primitive used by every other part of this work order.

### Component API

`src/components/ui/Toast.tsx` — single toast card, mounted by the container.
`src/components/ui/ToastContainer.tsx` — portal-rendered stack in the top-right (desktop) / top-center (mobile, above the bottom nav).

```typescript
interface ToastMessage {
  id: string;                       // uuid, stable for dedupe
  kind: 'info' | 'success' | 'warning' | 'nudge' | 'changelog';
  title: string;
  body?: string;
  icon?: LucideIcon;                // optional lucide-react icon
  cta?: { label: string; to: string } | { label: string; onClick: () => void };
  durationMs?: number;              // null / undefined = sticky, user must dismiss
  dedupeKey?: string;               // if set, a toast with the same key cannot show twice in 24h
}
```

### Store

Extend `src/stores/appStore.ts` with a `toasts: ToastMessage[]` field plus actions:
- `showToast(msg: Omit<ToastMessage, 'id'>): string` — returns id
- `dismissToast(id: string): void`
- `clearToasts(): void`

Dedupe enforcement: before pushing, if `dedupeKey` is set, check Dexie `meta[toast_shown_${dedupeKey}]` timestamp; skip if within 24h. On show, write the timestamp.

### Visual

- Slide-in from the top using Framer Motion (`AnimatePresence`, y: -40 → 0, spring).
- Kind-tinted left border (semantic colors via CSS variables, not hardcoded Tailwind colors — match existing `OfflineBanner` pattern).
- Dismiss via the X button (always) or auto-timeout if `durationMs` is set.
- Stack max 3 visible at once; further toasts queue and shift in when one clears.
- Respects `prefers-reduced-motion`.

### Mount point

Render `<ToastContainer />` once in `src/components/ui/AppLayout.tsx` next to the existing `OfflineBanner` and `InstallPrompt`. Do NOT mount inside route components.

---

## 2. Daily Nudge Engine

Runtime service that decides what, if anything, to show the user today. Runs once per app session on mount and on `visibilitychange` when the tab becomes visible again after > 6h.

### Service

`src/services/nudgeEngine.ts`

```typescript
interface NudgeCandidate {
  id: string;                  // stable, e.g. 'streak-at-risk', 'due-mistakes', 'new-feature-coach-v2'
  priority: number;            // 0 highest
  kind: ToastMessage['kind'];
  build: () => Omit<ToastMessage, 'id'>;
  shouldShow: () => Promise<boolean>;
  cooldownHours: number;       // min hours between showings of this same id
}

export async function runDailyNudges(): Promise<void>;
```

Procedure:
1. Collect candidates from the registry (below).
2. For each candidate: skip if last-shown-at < `cooldownHours` ago (read from Dexie `meta[nudge_shown_${id}]`).
3. Filter by `shouldShow()`.
4. Sort by priority ascending.
5. Show **only the top 1** via `showToast()` — no toast storms. Record the shown timestamp.

### Candidates (initial set)

1. **`streak-at-risk`** — priority 0, cooldown 20h. Triggers when `currentStreak > 0`, last session was > 20h ago, and local time is between 4pm and midnight. CTA: "Keep your X-day streak" → `/`.
2. **`due-mistakes`** — priority 10, cooldown 24h. Triggers when `getWoodpeckerDue().length + getDueFlashcards().length >= 5`. CTA: "Review N due items" → `/puzzles`.
3. **`new-feature-*`** — priority 20, cooldown per-feature-infinite (only ever shown once per user; dedupe via `meta[changelog_seen_${slug}]`). Triggers on first app open after a release that introduced the feature. CTA opens the changelog modal to the relevant entry.
4. **`inactive-return`** — priority 30, cooldown 72h. Triggers when the user hasn't opened the app in > 3 days. Soft, encouraging copy — NOT guilt-tripping.

Priorities are integers, not an enum, so future candidates can slot between these.

### Tests

`src/services/nudgeEngine.test.ts` covers each candidate's `shouldShow` truth table, cooldown enforcement (shown within window → skipped), priority resolution (higher-priority candidate pre-empts), and the "only one toast per run" rule.

---

## 3. `<NewFeaturePin>` — Nav Callouts

Small pulsing dot that renders next to a navigation item, training mode, or settings tab to draw the eye. Dismissed the first time the user visits the target surface.

### Component

`src/components/ui/NewFeaturePin.tsx`

```typescript
interface NewFeaturePinProps {
  featureId: string;     // e.g. 'coach-explain-position'
  children: React.ReactNode;
  position?: 'top-right' | 'inline';   // default 'top-right'
}
```

Behavior:
- On mount, reads Dexie `meta[pin_seen_${featureId}]`. If present → render children untouched.
- Otherwise wraps children and overlays an 8px dot (Framer Motion scale pulse, 2s loop) tinted with the "nudge" semantic color.
- Exposes `markFeaturePinSeen(featureId)` helper that the target surface calls on mount (via `useEffect`) to clear the dot forever.

### Integration examples

- Nav item for the Coach tab when `WO-AGENT-COACH-V2` landed: `<NewFeaturePin featureId="coach-explain-position"><NavLink to="/coach">Coach</NavLink></NewFeaturePin>`.
- Settings tab when new sync options appear.
- Opening card when a variation was newly deepened by `WO-DEEP-THEORY`.

Do NOT render a pin when the parent nav item is already the active route.

### Tests

`src/components/ui/NewFeaturePin.test.tsx`: renders children always; shows dot when unseen; hides dot after `markFeaturePinSeen`; survives rerenders (Dexie read is cached per featureId in a module-level `Map` to avoid flicker on nav transitions).

---

## 4. Changelog Modal

A "What's New" modal, surfaced automatically the first time the user opens the app after an update, and on demand from Settings → About.

### Data

`src/data/changelog.json` — array of entries, newest first:

```json
{
  "entries": [
    {
      "slug": "coach-explain-position",
      "version": "1.14.0",
      "releasedAt": "2026-04-15",
      "title": "Ask the coach about any position",
      "summary": "Paste a FEN or use the board in front of you — the coach will run Stockfish and explain it in plain language.",
      "cta": { "label": "Try it", "to": "/coach" },
      "featureIds": ["coach-explain-position"]
    }
  ]
}
```

### Component

`src/components/ui/ChangelogModal.tsx`

- Opens on app launch when the current app version (pulled from `package.json` via Vite's `__APP_VERSION__` define) is newer than `meta[changelog_last_seen_version]`.
- Lists all entries since the last-seen version.
- Each entry: title, date, summary, CTA button.
- On close: writes the current version to `meta[changelog_last_seen_version]` AND writes `meta[changelog_seen_${slug}]` for each listed entry (so the `new-feature-*` nudges never fire for entries the user already saw here).
- Re-openable from Settings → About → "What's new".

### Build wiring

`vite.config.ts` — add `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`. Declare `__APP_VERSION__: string` in `src/vite-env.d.ts`.

### Tests

`src/components/ui/ChangelogModal.test.tsx`: opens on first launch after version bump; lists only entries newer than last-seen; closing marks every shown entry as seen; does not open if `changelog_last_seen_version === __APP_VERSION__`.

---

## 5. Feature-Flag Naming & PostHog Wiring

Wire **PostHog** as the single analytics + feature-flag source of truth. This gives us a way to dark-launch new training modes, measure activation of the nudges we just built, and roll back without a deploy.

### Dependencies

Add `posthog-js` to `package.json`. Wrap it in our own service (no direct PostHog imports outside this service) so provider swaps are mechanical.

### Service

`src/services/analyticsService.ts` — extend the existing placeholder:

```typescript
export function initAnalytics(): void;              // idempotent
export function track(event: string, props?: Record<string, unknown>): void;
export function identify(userId: string, traits?: Record<string, unknown>): void;
export function isFeatureEnabled(flag: string): boolean;
export function getFeatureVariant(flag: string): string | boolean | undefined;
export function reloadFlags(): Promise<void>;
```

Init config:
- API key from `import.meta.env.VITE_POSTHOG_KEY`. If missing, every call is a no-op (no crashes in local dev / test).
- `api_host: 'https://us.i.posthog.com'`.
- `autocapture: false` — we track explicitly. Autocapture pollutes events with chessboard drag noise.
- `capture_pageview: false` — emit our own `page_viewed` with the route.
- Respects the existing `settings.analytics_opt_out` Dexie flag; when opted out, never init.

### Flag naming convention (enforced by lint rule)

```
ff_<area>_<name>            feature flag, boolean or variant
exp_<area>_<name>           A/B experiment
kill_<area>_<name>          kill-switch (defaults to OFF; set to ON to disable a feature in prod)
```

Examples: `ff_nudge_changelog_modal`, `exp_coach_greeting_variant`, `kill_voice_polly`.

Add a single allowlist in `src/constants/featureFlags.ts`:

```typescript
export const FEATURE_FLAGS = {
  ff_nudge_changelog_modal: 'ff_nudge_changelog_modal',
  ff_nudge_new_feature_pins: 'ff_nudge_new_feature_pins',
  ff_nudge_daily_engine: 'ff_nudge_daily_engine',
  kill_voice_polly: 'kill_voice_polly',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
```

`isFeatureEnabled` takes a `FeatureFlag`, not a raw string — that's how we enforce the naming convention at the type level. Adding a flag anywhere in the app means adding it to this file.

Add an ESLint rule (custom, under `eslint.config.js`) that forbids string literals matching `/^(ff|exp|kill)_/` outside `src/constants/featureFlags.ts`.

### Events to instrument (first pass)

- `nudge_shown` — `{ id, kind, priority }`
- `nudge_cta_clicked` — `{ id }`
- `nudge_dismissed` — `{ id, reason: 'x' | 'timeout' | 'route-change' }`
- `changelog_opened` — `{ trigger: 'auto' | 'settings' }`
- `changelog_entry_cta` — `{ slug }`
- `new_feature_pin_seen` — `{ featureId }`

### Tests

`src/services/analyticsService.test.ts`: no-ops when key missing; no-ops when opted out; `identify` buffers until init; `track` forwards props; `isFeatureEnabled` returns false when PostHog hasn't finished bootstrapping (fail-closed).

---

## 6. Wiring It All Together

- `AppLayout` mounts `<ToastContainer />`, `<ChangelogModal />`, and calls `runDailyNudges()` from a top-level `useEffect`.
- `SettingsPage` Profile tab gains an "Analytics" toggle (opt-out; default opt-in) that writes `analytics_opt_out` to Dexie and calls `posthog.opt_out_capturing()` / `opt_in_capturing()`.
- `SettingsPage` About tab gains a "What's new" button that opens `<ChangelogModal />` in "manual" mode.
- Whenever a feature lands behind a `new-feature-*` nudge / pin, its PR bumps `package.json` version and adds an entry to `changelog.json` in the same commit. This is enforced by a CI check in a follow-up WO; for now, document it in the Deployment Policy section of `CLAUDE.md`.

---

## 7. File Organization (expected new/modified files)

### New Components
```
src/components/ui/Toast.tsx
src/components/ui/ToastContainer.tsx
src/components/ui/NewFeaturePin.tsx
src/components/ui/ChangelogModal.tsx
```

### New Services
```
src/services/nudgeEngine.ts
```

### New Data / Constants
```
src/data/changelog.json
src/constants/featureFlags.ts
```

### Modified
```
src/services/analyticsService.ts      — PostHog integration, feature-flag helpers
src/stores/appStore.ts                — toasts slice, showToast/dismissToast/clearToasts
src/components/ui/AppLayout.tsx       — mount ToastContainer + ChangelogModal, run nudges
src/components/Settings/SettingsPage.tsx — analytics opt-out, "What's new" button
src/types/index.ts                    — ToastMessage, NudgeCandidate, ChangelogEntry
vite.config.ts                        — define __APP_VERSION__
src/vite-env.d.ts                     — declare __APP_VERSION__
eslint.config.js                      — flag-naming lint rule
package.json                          — add posthog-js
```

### New Tests (co-located)
```
Toast.test.tsx
ToastContainer.test.tsx
NewFeaturePin.test.tsx
ChangelogModal.test.tsx
nudgeEngine.test.ts
analyticsService.test.ts (extend)
```

---

## 8. Acceptance Criteria

1. All six sections above fully implemented — no partial features.
2. `npm run test:run` passes.
3. `npm run typecheck` — zero errors.
4. `npm run lint` — zero errors, including the new flag-naming rule.
5. Manual check: launching the app fresh with an unseen changelog entry surfaces the modal exactly once; re-opening the app the next day does NOT resurface it.
6. Manual check: completing zero sessions for > 20h between 4pm and midnight triggers the `streak-at-risk` toast at most once per 20h.
7. Manual check: removing `VITE_POSTHOG_KEY` from `.env` and reloading does not crash — analytics is silently a no-op.
8. `MANIFEST.md` updated with WO-NUDGE-01 completion notes.
9. Committed with git.
