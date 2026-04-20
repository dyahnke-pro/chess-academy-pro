# Supabase migrations

One-user app, but we still treat the hosted Supabase project as
schema-as-code. Every schema or policy change ships as a numbered
migration in `supabase/migrations/` and is reviewed in a PR.

## Workflow

1. **Link your local CLI once per machine.**

   ```bash
   supabase login
   supabase link --project-ref <ref>   # ref lives in the Supabase dashboard URL
   ```

   This creates `.supabase/` (gitignored) with your link state.

2. **Create a new migration.**

   ```bash
   npm run db:migration:new -- my_change_name
   # equivalent to: supabase migration new my_change_name
   ```

   Edit the generated `supabase/migrations/<timestamp>_my_change_name.sql`.

3. **Try it locally** against the Supabase-provided Postgres shadow
   instance:

   ```bash
   npm run db:reset        # wipe + replay all migrations locally
   ```

4. **Check what's pending on the remote project:**

   ```bash
   npm run db:status
   ```

5. **Ship it.** Apply migrations to the live project:

   ```bash
   npm run db:push
   ```

## Rules

- **Never edit a migration that has already been applied to the live
  project.** Add a new migration instead. The file numbering is
  append-only.
- **Migrations must be idempotent where possible** (`create ... if not
  exists`, `on conflict do nothing`, `drop policy if exists`). We
  don't have a separate staging DB, so re-runs happen.
- **Storage buckets and RLS policies count as schema.** Put them in
  migrations, not the dashboard.
- **Client code never creates buckets or writes policies at runtime.**
  `syncService.ts` assumes `chess-academy-backups` exists and is
  protected by the policies in `0001_init_backups.sql`.

## What's in the baseline

`0001_init_backups.sql` creates the `chess-academy-backups` storage
bucket and per-user RLS policies. The client (`syncService.ts`)
uploads to `{userId}/backup-{timestamp}.json` — the policy matches
the leading path segment to `auth.uid()`.
