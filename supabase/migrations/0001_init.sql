-- 0001_init.sql — migration baseline
--
-- Chess Academy Pro is a single-user PWA whose primary data store is
-- Dexie/IndexedDB on the device. Supabase is reserved for optional
-- cloud sync and any future server-side features (e.g. shared coach
-- memory, multi-device flashcard SRS).
--
-- This migration is intentionally minimal: it establishes the
-- migrations-table baseline, enables the extensions every subsequent
-- migration is allowed to assume, and documents the policy that
-- every future WO that touches Supabase MUST add a NEW migration
-- file (0002_*.sql, 0003_*.sql, …) — never edit this one.
--
-- Snapshot scope: as of WO-INFRA-01 there are no application tables
-- in Supabase yet. All persistent app data lives in Dexie (see
-- src/db/schema.ts). Subsequent migrations will introduce the cloud
-- mirror tables plus their RLS policies — see docs/RLS-CHECKLIST.md
-- before adding any.

-- pgcrypto: gen_random_uuid() for surrogate keys in future tables.
create extension if not exists "pgcrypto";

-- Marker row so `select * from public._chess_academy_meta` confirms
-- the baseline migration ran and identifies the schema version that
-- application code expects. Future migrations bump `schema_version`.
create table if not exists public._chess_academy_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public._chess_academy_meta (key, value)
values ('schema_version', '1')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public._chess_academy_meta (key, value)
values ('baseline_migration', '0001_init')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- RLS reminder: when a real application table is added in a later
-- migration, it MUST enable RLS and define explicit policies. See
-- docs/RLS-CHECKLIST.md. The meta table above is intentionally
-- service-role-only (no policies, RLS off) since application code
-- never reads or writes it directly.
