-- 0004_shared_opening_cache.sql
-- Cross-user shared opening cache. When user A generates a lesson
-- for "Sicilian Najdorf", the LLM-built tree is written here. When
-- user B requests the same opening, they get user A's tree instantly
-- without spending another LLM call.
--
-- Trade-offs:
--   - Quality risk: a broken tree from one user pollutes everyone.
--     Mitigation: client validates every tree on read (assertTreeShape
--     + validateTreeMoveLegality) and silently falls through to LLM
--     re-gen on validation failure.
--   - Pollution risk: anyone with the anon key can write. Mitigation:
--     prompt_version column lets us invalidate the whole cache when
--     prompts change; client can also force-regen via /clearcache.
--   - Cost: writes are cheap (single row); reads are FREE on the
--     LLM-call side.

create table if not exists public.shared_opening_cache (
  -- Lowercase, trimmed opening name. Same key the local Dexie cache
  -- uses (normalizeOpeningName in src/services/openingGenerator.ts).
  normalized_name text primary key,
  -- Display name as the LLM emitted it (e.g. "Sicilian Defense:
  -- Najdorf Variation"). Surfaced in UI.
  display_name text not null,
  -- ECO code (e.g. "B90").
  eco text not null,
  -- The full WalkthroughTree JSON. Mirrors the local Dexie schema.
  tree jsonb not null,
  -- When the entry was generated. Used for cache age sanity checks.
  generated_at timestamptz not null default now(),
  -- Which user generated it (Supabase auth.uid()). Optional; null
  -- when written by an unauthenticated client.
  generated_by_user_id text,
  -- Bumped whenever the system prompt changes meaningfully. Reads
  -- ignore rows below the current version so old shapes don't leak.
  -- Client compares against PROMPT_VERSION constant in
  -- src/services/sharedOpeningCache.ts; mismatches force regen.
  prompt_version int not null default 1
);

create index if not exists shared_opening_cache_eco_idx
  on public.shared_opening_cache (eco);
create index if not exists shared_opening_cache_version_idx
  on public.shared_opening_cache (prompt_version);

-- Row-level security: anyone can read, anyone with the anon key can
-- write. For a small-team deployment (single owner + brother) the
-- write surface is the same population as the read surface, so the
-- simpler write policy is appropriate. If multi-tenant adoption
-- happens later, gate writes on auth.uid() being non-null.
alter table public.shared_opening_cache enable row level security;

drop policy if exists "shared_opening_cache_read_all" on public.shared_opening_cache;
create policy "shared_opening_cache_read_all"
  on public.shared_opening_cache for select
  using (true);

drop policy if exists "shared_opening_cache_write_anon" on public.shared_opening_cache;
create policy "shared_opening_cache_write_anon"
  on public.shared_opening_cache for insert
  with check (true);

drop policy if exists "shared_opening_cache_update_owner" on public.shared_opening_cache;
create policy "shared_opening_cache_update_owner"
  on public.shared_opening_cache for update
  using (
    -- Allow updates only by the original generator OR the anon key
    -- (so a user can refresh their own write or a server-side job
    -- can backfill prompt_version).
    generated_by_user_id is null
    or generated_by_user_id = auth.uid()::text
  );
