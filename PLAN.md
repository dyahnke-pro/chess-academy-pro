# PLAN — coach-teach navigation capture fix (2026-09-12)

## Disease (root cause, empirically confirmed on prod)
`/coach/teach`'s `handleSubmit` runs a custom pre-flight that captures any short,
non-`?`, non-conversational input as an OPENING NAME (bare-name capture,
`CoachTeachPage.tsx` ~line 4046). It NEVER calls the navigation spine
(`matchNavigationRoute` / `dispatchCoachTurn`). So navigation/management
imperatives get fuzzy-matched to an opening.

Prod probe (2026-09-12, muted):
- "manage my repertoire" → teaches the Sicilian ❌
- "take me to my repertoire" → teaches the Sicilian ❌ (nav verb present, never dispatched)
- "edit my openings" → wrong "did you mean" picker ❌
- "what does the tactics tab do?" → correct app-help answer ✅ (NOT a bug — stale prior hypothesis)

## Fix (surgical, low blast radius)
1. `navigationRouter.ts` — extend `NAV_INTENT_RE` with `manage|edit|organi[sz]e|build`
   so "manage/edit my repertoire/openings" count as navigation. SAFE: `matchNavigationRoute`
   requires BOTH a nav verb AND a known route topic (`matchRouteByTopic`), so a
   verb without a destination ("manage my time", "build an attack") still falls through.
2. `CoachTeachPage.tsx` — add a navigation-dispatch block after the training-aid
   block (~line 3656), before opening-name resolution: `matchNavigationRoute(text)`
   → echo user, ack, audit, `navigate(path)`, return. Mirrors the training-aid dispatch.
   No change to bare-name capture (downstream re-resolves; navigation now catches the class first).

## Blast radius
- `NAV_INTENT_RE` is shared by `matchNavigationRoute` (dispatchCoachTurn nav on ALL surfaces).
  Verb+topic gate keeps it from over-firing. Covered by `navigationRouter.test.ts`.
- No change to `matchRouteByTopic` (app-help path untouched — already correct).

## Gates / verify
- `navigationRouter.test.ts` — add the new-verb cases + a "verb w/o topic → null" guard.
- Re-run the prod probe: all 3 nav phrasings navigate; "what does the tactics tab do?" still app-helps.
- ship-check + push to branch.

## Status
- [x] root-caused on prod
- [x] navigationRouter verbs + test (11/11 green)
- [x] teach nav dispatch (typecheck + ship-check green)
- [x] shipped to main (60f4e8c) + branch
- [x] re-audit on prod — 5/5 (3 nav phrasings navigate to /openings; app-help + bare-name regression-clean)
- [x] audit method locked into CLAUDE.md (exhaustive coach-question routing standard)
