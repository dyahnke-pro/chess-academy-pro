-- 0001_init_backups.sql
-- Baseline migration: storage bucket that syncService.ts writes to.
-- Paired with the CLI workflow documented in supabase/README.md.

-- Create the backups bucket idempotently so re-running this migration
-- against an environment where it already exists is safe.
insert into storage.buckets (id, name, public)
values ('chess-academy-backups', 'chess-academy-backups', false)
on conflict (id) do nothing;

-- Row-level security: only the owning user can read/write their own
-- backup objects. syncService.ts uses the anon key + a per-user
-- `syncUserId` path prefix, so policies gate on the leading path
-- segment matching the caller's uid.
alter table storage.objects enable row level security;

drop policy if exists "backups_own_read" on storage.objects;
create policy "backups_own_read"
  on storage.objects for select
  using (
    bucket_id = 'chess-academy-backups'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "backups_own_write" on storage.objects;
create policy "backups_own_write"
  on storage.objects for insert
  with check (
    bucket_id = 'chess-academy-backups'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "backups_own_delete" on storage.objects;
create policy "backups_own_delete"
  on storage.objects for delete
  using (
    bucket_id = 'chess-academy-backups'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
