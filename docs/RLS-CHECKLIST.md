# RLS Checklist — Supabase

**Read this before opening any WO that adds or alters a Supabase
table.** Skipping a step here is how data leaks happen.

Chess Academy Pro is single-user, but Supabase is multi-tenant by
construction (every project ships with `auth.users`). Treat every
table as if a second user might exist tomorrow — RLS is the only
boundary that protects them.

## For every new table

- [ ] **Table created in a new migration file.** Never edit
  `0001_init.sql` or any previously-shipped migration. Add
  `0002_<topic>.sql`, `0003_<topic>.sql`, etc. Naming: zero-padded
  index + short snake_case topic.
- [ ] **`enable row level security`** is set on the table in the
  same migration that creates it. No table ships without RLS.
- [ ] **`force row level security`** when the data is sensitive.
  This blocks even the table owner from bypassing policies.
- [ ] **`user_id uuid not null references auth.users(id) on delete cascade`**
  is the canonical owner column. Use exactly this name and shape so
  policies stay copy-paste consistent.
- [ ] **At least one explicit policy per operation** the app needs:
  - `select` policy: `using (user_id = (select auth.uid()))`
  - `insert` policy: `with check (user_id = (select auth.uid()))`
  - `update` policy: `using (...)` AND `with check (...)` (both)
  - `delete` policy: `using (user_id = (select auth.uid()))`
  Never write a single all-purpose `for all` policy — it makes
  intent ambiguous and hides update/delete bugs.
- [ ] **Service-role-only tables** (background workers, admin
  metadata) get RLS enabled but NO policies, then access via the
  service role key on the server only. Document this in a SQL
  comment on the table.
- [ ] **Indexes on every column used in a policy `using` clause**
  (typically `user_id`). Without this, RLS turns every query into a
  full table scan.
- [ ] **`updated_at timestamptz default now()` + trigger** on tables
  that mutate. Standard helper:
  ```sql
  create trigger set_updated_at
    before update on public.<table>
    for each row execute function moddatetime('updated_at');
  ```
  (`moddatetime` ships with the `moddatetime` extension — enable it
  in the migration if not already on.)

## For every column added to an existing table

- [ ] If the column is sensitive (PII, API keys, payment info),
  ensure no policy exposes it implicitly via `select *` to other
  users. Tighten the `select` policy or move the column to a
  service-role-only sibling table.
- [ ] Backfill defaults are migration-time, not application-time.
  Use `default <value>` + an `update` in the migration if the column
  is `not null`.

## Testing

- [ ] **Manual policy test:**
  ```sql
  set local role authenticated;
  set local "request.jwt.claims" to '{"sub": "<test-user-uuid>"}';
  select * from public.<table>;  -- should only see own rows
  ```
- [ ] **Rollback rehearsal:** apply on a throwaway DB
  (`supabase db reset`), insert sample data, verify policies, then
  drop. Catches column-name typos in policy bodies that the planner
  won't.

## When in doubt

- Default to **deny**, then add the narrowest policy that unblocks
  the feature.
- Service role bypasses RLS — only use the service role key in
  server code (Vercel functions / Edge Functions), never in the
  browser bundle.
- A table without any policy and RLS enabled is locked to everyone
  except the service role. That is a valid, safe default state for
  a brand-new table while you write its policies.
