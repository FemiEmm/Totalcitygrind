-- Fresh alpha storage. Run in the Supabase SQL Editor as the project owner.
-- Keep tcg_private OUT of the Data API exposed schemas.
begin;
create schema if not exists tcg_private;
revoke all on schema tcg_private from public, anon, authenticated;
create table if not exists tcg_private.store_meta (
  id smallint primary key check (id = 1),
  schema_version integer not null check (schema_version = 1),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists tcg_private.store_sections (
  section text primary key,
  payload jsonb not null
);
alter table tcg_private.store_meta enable row level security;
alter table tcg_private.store_sections enable row level security;
revoke all on all tables in schema tcg_private from public, anon, authenticated;
-- No browser policies or public RPC: only the trusted database connection can write.
insert into tcg_private.store_meta (id, schema_version) values (1, 1) on conflict do nothing;
insert into tcg_private.store_sections(section,payload) values
 ('version','1'::jsonb), ('users','{}'::jsonb), ('profiles','{}'::jsonb), ('sessions','{}'::jsonb)
on conflict do nothing;
commit;
