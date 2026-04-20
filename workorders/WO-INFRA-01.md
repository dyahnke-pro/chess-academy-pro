# WO-INFRA-01 — Core Infrastructure (build-once)

**Status:** Complete
**Scope:** One work order, one PR, done forever. Every item is
scaffolding that the app needs before new features start leaning
on it.

## What's in scope

Five independent-but-related pieces of infrastructure:

1. **Migration discipline** — Supabase CLI workflow, `supabase/`
   folder, npm scripts, baseline storage-bucket migration.
2. **Dexie versioning convention** — bump + upgrade function pattern
   documented; schema header comment points at the doc.
3. **Zustand shared-state contract** — `src/stores/userContext.ts`
   with canonical selectors + convenience hooks; covered by tests.
4. **Top-level ErrorBoundary** — the existing component is now also
   wrapped around `<App />` in `main.tsx`, above the router. (Per-
   route boundaries stay as they were — this catches init-time and
   StrictMode double-invoke crashes.)
5. **Vercel env var audit + docs** — `.env.example` at the repo
   root, full reference at `docs/vercel-env.md`.

## What's deliberately NOT in scope

- Migrating existing schema to new Supabase tables (no feature
  wants that yet).
- Rewriting existing components to use `userContext.ts` selectors.
  New features should use them; existing code can migrate when
  touched.
- Changing the per-route ErrorBoundary pattern in `App.tsx`.

## File checklist

- `supabase/config.toml` — Supabase CLI project config
- `supabase/migrations/0001_init_backups.sql` — baseline bucket + RLS
- `supabase/README.md` — migration workflow
- `src/db/README.md` — Dexie bump + upgrade convention
- `src/db/schema.ts` — header comment linking the convention doc
- `src/stores/userContext.ts` — canonical selectors + hooks
- `src/stores/userContext.test.ts` — selector tests
- `src/main.tsx` — outer-most ErrorBoundary wrap
- `.env.example` — all env vars with surface annotations
- `docs/vercel-env.md` — env var reference table
- `package.json` — `db:*` scripts
- `.gitignore` — `.supabase/`

## Completion gate

- `npm run typecheck` clean
- `npm run lint` clean
- `npm run test:run` passes
- PR opened as draft
