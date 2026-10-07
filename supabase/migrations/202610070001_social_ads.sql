-- Total City Grind social features + PlaceAd.
--
-- Architecture:
--   * Messages and player transfers are read/written by Backender through the
--     existing PostgreSQL DATABASE_URL connection.
--   * PlaceAd booking rows are also handled by Backender through DATABASE_URL.
--   * PlaceAd IMAGE FILES are uploaded directly by the browser to the public
--     Supabase Storage bucket using the normal public/anon key.
--   * No Supabase service-role key is required by Render for this feature.

create table if not exists public.tcg_direct_messages (
  id uuid primary key,
  sender_id uuid not null,
  sender_username text not null check (char_length(sender_username) between 3 and 24),
  recipient_id uuid not null,
  recipient_username text not null check (char_length(recipient_username) between 3 and 24),
  message_text text not null check (char_length(message_text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists tcg_direct_messages_sender_created_idx
  on public.tcg_direct_messages(sender_id, created_at desc);
create index if not exists tcg_direct_messages_recipient_created_idx
  on public.tcg_direct_messages(recipient_id, created_at desc);
alter table public.tcg_direct_messages enable row level security;

create table if not exists public.tcg_player_transfers (
  id uuid primary key,
  sender_id uuid not null,
  sender_username text not null check (char_length(sender_username) between 3 and 24),
  recipient_id uuid not null,
  recipient_username text not null check (char_length(recipient_username) between 3 and 24),
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists tcg_player_transfers_sender_created_idx
  on public.tcg_player_transfers(sender_id, created_at desc);
create index if not exists tcg_player_transfers_recipient_claim_idx
  on public.tcg_player_transfers(recipient_id, claimed_at, created_at desc);
alter table public.tcg_player_transfers enable row level security;

create table if not exists public.tcg_place_ads (
  id uuid primary key,
  billboard_id text not null check (billboard_id in (
    'billboard-01','billboard-02','billboard-03','billboard-04','billboard-05',
    'billboard-06','billboard-07','billboard-08','billboard-09','billboard-10'
  )),
  player_id uuid not null,
  username text not null check (char_length(username) between 3 and 24),
  booking_date date not null,
  image_path text not null,
  amount_paid bigint not null default 10000 check (amount_paid = 10000),
  created_at timestamptz not null default now(),
  unique (billboard_id, booking_date, player_id)
);

-- Compatibility if the earlier draft migration was already run.
alter table public.tcg_place_ads add column if not exists image_path text;
alter table public.tcg_place_ads add column if not exists image_url text;
alter table public.tcg_place_ads alter column image_url drop not null;

create index if not exists tcg_place_ads_schedule_idx
  on public.tcg_place_ads(booking_date, billboard_id, created_at, id);
alter table public.tcg_place_ads enable row level security;

-- PlaceAd artwork bucket. The bucket is public for display because every player
-- must be able to render the active billboard image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-ads',
  'place-ads',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may view billboard artwork.
drop policy if exists "Public can view place ads" on storage.objects;
create policy "Public can view place ads"
on storage.objects
for select
to public
using (bucket_id = 'place-ads');

-- The game frontend uploads artwork directly with the normal Supabase anon key.
-- Bucket size + MIME restrictions above still apply. No update/delete policy is
-- granted, so clients cannot overwrite or remove existing ads.
drop policy if exists "Game can upload place ads" on storage.objects;
create policy "Game can upload place ads"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'place-ads');
