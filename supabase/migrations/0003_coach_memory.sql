-- 0003_coach_memory.sql
-- WO-BRAIN-01: declare the long-term home for coach memory.
--
-- COACH-BRAIN-00 §"The Four Sources of Truth" puts user memory
-- (intent, conversation, preferences, hints, blunders, growth, game
-- history) on Supabase. UNIFY-01 already populates `useCoachMemoryStore`
-- (Zustand + Dexie). BRAIN-01 lays the table so a follow-up can wire
-- real-time sync without another migration.
--
-- See PR #318 (UNIFY-01) for the schema mirrored here.

create table if not exists public.coach_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists coach_memory_updated_at_idx
  on public.coach_memory (updated_at);

alter table public.coach_memory enable row level security;

drop policy if exists "coach_memory_own_select" on public.coach_memory;
create policy "coach_memory_own_select"
  on public.coach_memory for select
  using (auth.uid() = user_id);

drop policy if exists "coach_memory_own_upsert" on public.coach_memory;
create policy "coach_memory_own_upsert"
  on public.coach_memory for insert
  with check (auth.uid() = user_id);

drop policy if exists "coach_memory_own_update" on public.coach_memory;
create policy "coach_memory_own_update"
  on public.coach_memory for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "coach_memory_own_delete" on public.coach_memory;
create policy "coach_memory_own_delete"
  on public.coach_memory for delete
  using (auth.uid() = user_id);
