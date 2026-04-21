# Supabase RLS checklist

Every new Supabase table ships with Row-Level Security **enabled** and
at least one policy. No exceptions. This is the baseline audit every
migration review runs through.

## Checklist for a new table

- [ ] `alter table public.<name> enable row level security;` is in the
      migration.
- [ ] The table has a `user_id uuid` column that references
      `auth.users(id) on delete cascade`, OR a clear justification for
      why the table is not user-owned (rare; global lookup tables only).
- [ ] The primary key includes `user_id` (for 1-many) or `user_id` is
      indexed (for 1-per-user via `unique`).
- [ ] An "own rows only" policy is declared:
      ```sql
      create policy "<table>_own"
        on public.<name>
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
      ```
- [ ] The policy is `drop policy if exists ... create policy ...` so
      re-running the migration is idempotent.
- [ ] Verified manually in Supabase Studio that user B cannot SELECT
      user A's rows (sanity check every new table).
- [ ] If the table is read by the anon role (rare, e.g. public
      leaderboards), a separate `for select using (<predicate>)` policy
      is declared — do NOT widen the own-rows policy.

## Storage bucket policies

Storage objects use a different pattern (see
`0001_init_backups.sql`): the folder prefix must match
`auth.uid()::text`, enforced via `storage.foldername(name)[1]`.

## Review rule

A PR that adds a migration without matching RLS policies is **not
mergeable**. Reviewers reject it and the author updates the migration
before re-requesting review.
