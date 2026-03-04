# TWO-13: E2E Tests — Offline & PWA

**Status:** Not Started
**Dependencies:** WO-20, TWO-12

---

## Objective

End-to-end tests verifying offline functionality and PWA behavior.

---

## Test Suites

### 1. Offline Puzzle Solving (`e2e/offline-puzzles.spec.ts`)

- Load app online, let service worker cache
- Go offline (`context.setOffline(true)`)
- Navigate to Puzzles → puzzles load from cache
- Solve a puzzle → works correctly offline
- SRS data persists locally

### 2. Offline Opening Explorer (`e2e/offline-openings.spec.ts`)

- Load openings online
- Go offline
- Opening explorer works (data from IndexedDB)
- Move tree is interactive

### 3. Offline Coach Fallback (`e2e/offline-coach.spec.ts`)

- Go offline
- Coach commentary falls back to templates
- Offline banner appears
- Template responses have correct personality tone

### 4. Coming Back Online (`e2e/online-restore.spec.ts`)

- Start offline
- Come back online (`context.setOffline(false)`)
- "Back online" toast appears
- Coach switches back to LLM mode
- Sync resumes (if enabled)

### 5. App Reload Offline (`e2e/offline-reload.spec.ts`)

- Load app online
- Go offline
- Reload page → app shell loads from service worker cache
- Core features work

---

## Files Created

```
e2e/
  offline-puzzles.spec.ts
  offline-openings.spec.ts
  offline-coach.spec.ts
  online-restore.spec.ts
  offline-reload.spec.ts
```
