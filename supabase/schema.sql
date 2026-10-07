-- Safe to re-run.
create extension if not exists pgcrypto;

create table if not exists public.episodes (
  id               uuid primary key default gen_random_uuid(),
  title            text        not null,
  season           int         not null default 1,
  episode          int         not null,
  description      text,
  thumbnail_path   text,
  duration_seconds int,
  release_date     date,
  is_current       boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint episodes_episode_number_positive check (episode > 0),
  constraint episodes_season_positive check (season > 0)
);

create table if not exists public.episode_parts (
  id               uuid primary key default gen_random_uuid(),
  episode_id       uuid        not null references public.episodes(id) on delete cascade,
  part_number      integer     not null,
  storage_path     text        not null,
  duration_seconds int,
  created_at       timestamptz not null default now(),
  constraint episode_parts_part_positive check (part_number >= 0),
  constraint episode_parts_path_not_blank check (length(trim(storage_path)) > 0),
  constraint episode_parts_unique_number unique (episode_id, part_number)
);

create unique index if not exists episodes_one_current on public.episodes (is_current) where is_current;
create index if not exists episode_parts_episode_order on public.episode_parts (episode_id, part_number);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists episodes_updated_at on public.episodes;
create trigger episodes_updated_at before update on public.episodes
  for each row execute function public.set_updated_at();

alter table public.episodes enable row level security;
alter table public.episode_parts enable row level security;

drop policy if exists "Read current episode" on public.episodes;
create policy "Read current episode" on public.episodes
  for select to anon, authenticated
  using (is_current);

drop policy if exists "Read current episode parts" on public.episode_parts;
create policy "Read current episode parts" on public.episode_parts
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.episodes e
      where e.id = episode_parts.episode_id
        and e.is_current
    )
  );

-- Create the Storage bucket in Supabase Storage manually:
-- Bucket name: videos
-- Public: false (recommended for signed URLs). Set VITE_BUCKET_IS_PUBLIC=false.
-- Path structure example:
--   videos/episode-01/part_000.mp4
--   videos/episode-01/part_001.mp4
--   videos/episode-01/part_002.mp4

-- Read access for the browser when bucket is private.
drop policy if exists "Read videos bucket" on storage.objects;
create policy "Read videos bucket" on storage.objects
  for select to anon
  using (bucket_id = 'videos');

-- Example workflow for publishing a new episode:
-- begin;
--   update public.episodes set is_current = false where is_current;
--   insert into public.episodes (title, season, episode, description, thumbnail_path, duration_seconds, release_date, is_current)
--   values ('Episode 06', 1, 6, 'New chapter...', 'episode-06/thumbnail.jpg', null, current_date, true)
--   returning id;
--
--   insert into public.episode_parts (episode_id, part_number, storage_path, duration_seconds)
--   values
--     ((select id from public.episodes where title = 'Episode 06' and is_current order by created_at desc limit 1), 0, 'episode-06/part_000.mp4', null),
--     ((select id from public.episodes where title = 'Episode 06' and is_current order by created_at desc limit 1), 1, 'episode-06/part_001.mp4', null),
--     ((select id from public.episodes where title = 'Episode 06' and is_current order by created_at desc limit 1), 2, 'episode-06/part_002.mp4', null);
-- commit;
--
-- Once the new episode is fully uploaded and validated, delete the old files and old rows if desired.
