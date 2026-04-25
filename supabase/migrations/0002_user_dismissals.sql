-- 0002_user_dismissals.sql
-- Per-user dismissal ledger for nudges, changelog pins, and new-feature
-- callouts. A row (user_id, key) means "this user has dismissed the
-- nudge/pin identified by `key`". The nudge engine consults this table
-- (via src/stores/userContext.ts → useDismissals) before firing any
-- toast or rendering a NewFeaturePin so the user never sees the same
-- prompt twice.

create table if not exists public.user_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Lookup pattern is always "give me all dismissed keys for this user",
-- covered by the primary key. No secondary index needed.

alter table public.user_dismissals enable row level security;

-- A user can read, insert, update, and delete only their own rows.
-- This follows docs/RLS-CHECKLIST.md: every new table gets RLS enabled
-- and an "own rows only" policy gated on auth.uid().
drop policy if exists "user_dismissals_own" on public.user_dismissals;
create policy "user_dismissals_own"
  on public.user_dismissals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
