-- Run AFTER 202610060001_backender_storage.sql. Fresh cloud database only.
-- This migration never imports the local Backender data file.
begin;
lock table tcg_private.store_meta in exclusive mode;
do $$ begin
 if exists(select 1 from tcg_private.store_sections where
   not (section='version' and payload='1'::jsonb) and
   not (section in ('users','profiles','sessions') and payload='{}'::jsonb)) then
   raise exception 'Existing alpha data detected. Stop and arrange an explicit migration; no data was removed.';
 end if;
end $$;
create table if not exists tcg_private.accounts (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.accounts enable row level security;
revoke all on tcg_private.accounts from public, anon, authenticated;
create table if not exists tcg_private.profiles (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.profiles enable row level security;
revoke all on tcg_private.profiles from public, anon, authenticated;
create table if not exists tcg_private.auth_sessions (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.auth_sessions enable row level security;
revoke all on tcg_private.auth_sessions from public, anon, authenticated;
create table if not exists tcg_private.wallets (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.wallets enable row level security;
revoke all on tcg_private.wallets from public, anon, authenticated;
create table if not exists tcg_private.game_saves (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.game_saves enable row level security;
revoke all on tcg_private.game_saves from public, anon, authenticated;
create table if not exists tcg_private.home_reservations (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.home_reservations enable row level security;
revoke all on tcg_private.home_reservations from public, anon, authenticated;
create table if not exists tcg_private.police_reservations (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.police_reservations enable row level security;
revoke all on tcg_private.police_reservations from public, anon, authenticated;
create table if not exists tcg_private.careers (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.careers enable row level security;
revoke all on tcg_private.careers from public, anon, authenticated;
create table if not exists tcg_private.career_notices (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.career_notices enable row level security;
revoke all on tcg_private.career_notices from public, anon, authenticated;
create table if not exists tcg_private.housing_accounts (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.housing_accounts enable row level security;
revoke all on tcg_private.housing_accounts from public, anon, authenticated;
create table if not exists tcg_private.properties (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.properties enable row level security;
revoke all on tcg_private.properties from public, anon, authenticated;
create table if not exists tcg_private.heist_accounts (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.heist_accounts enable row level security;
revoke all on tcg_private.heist_accounts from public, anon, authenticated;
create table if not exists tcg_private.club_accounts (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.club_accounts enable row level security;
revoke all on tcg_private.club_accounts from public, anon, authenticated;
create table if not exists tcg_private.government_accounts (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.government_accounts enable row level security;
revoke all on tcg_private.government_accounts from public, anon, authenticated;
create table if not exists tcg_private.election_votes (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.election_votes enable row level security;
revoke all on tcg_private.election_votes from public, anon, authenticated;
create table if not exists tcg_private.passenger_sessions (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.passenger_sessions enable row level security;
revoke all on tcg_private.passenger_sessions from public, anon, authenticated;
create table if not exists tcg_private.site_visits (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.site_visits enable row level security;
revoke all on tcg_private.site_visits from public, anon, authenticated;
create table if not exists tcg_private.passengers (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.passengers enable row level security;
revoke all on tcg_private.passengers from public, anon, authenticated;
create table if not exists tcg_private.election_candidates (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.election_candidates enable row level security;
revoke all on tcg_private.election_candidates from public, anon, authenticated;
create table if not exists tcg_private.wage_claims (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.wage_claims enable row level security;
revoke all on tcg_private.wage_claims from public, anon, authenticated;
create table if not exists tcg_private.club_events (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.club_events enable row level security;
revoke all on tcg_private.club_events from public, anon, authenticated;
create table if not exists tcg_private.shared_state (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.shared_state enable row level security;
revoke all on tcg_private.shared_state from public, anon, authenticated;
create table if not exists tcg_private.wallet_components (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.wallet_components enable row level security;
revoke all on tcg_private.wallet_components from public, anon, authenticated;
create table if not exists tcg_private.processed_requests (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.processed_requests enable row level security;
revoke all on tcg_private.processed_requests from public, anon, authenticated;
create table if not exists tcg_private.wallet_ledger (
 record_key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table tcg_private.wallet_ledger enable row level security;
revoke all on tcg_private.wallet_ledger from public, anon, authenticated;

-- Searchable account identities, enforced even across multiple API instances.
alter table tcg_private.accounts
 add column account_id uuid generated always as ((payload->>'id')::uuid) stored unique,
 add column username text generated always as (lower(payload->>'username')) stored not null unique,
 add column email text generated always as (nullif(lower(payload->>'email'),'')) stored unique,
 add constraint account_key_matches check(record_key=payload->>'id');
alter table tcg_private.profiles add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.wallets add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.game_saves add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.careers add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.career_notices add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.housing_accounts add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.heist_accounts add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.club_accounts add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.government_accounts add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.passenger_sessions add column player_id uuid generated always as (record_key::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;

alter table tcg_private.auth_sessions
 add column player_id uuid generated always as ((payload->>'userId')::uuid) stored references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred,
 add column refresh_hash text generated always as (payload->>'refreshHash') stored unique;
create index auth_sessions_player on tcg_private.auth_sessions(player_id);
alter table tcg_private.home_reservations
 add column player_id uuid generated always as ((payload->>'playerId')::uuid) stored not null unique references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred,
 add column weekly_rent bigint generated always as ((payload->>'weeklyRent')::bigint) stored not null check(weekly_rent>=0),
 add constraint home_key_matches check(record_key=payload->>'homeId');
alter table tcg_private.police_reservations
 add column player_id uuid generated always as ((payload->>'playerId')::uuid) stored not null unique references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
alter table tcg_private.properties
 add column owner_id uuid generated always as ((payload->>'ownerId')::uuid) stored not null references tcg_private.accounts(account_id) deferrable initially deferred,
 add column tenant_id uuid generated always as ((payload->>'tenantId')::uuid) stored unique deferrable initially deferred references tcg_private.accounts(account_id) deferrable initially deferred,
 add column occupant_id uuid generated always as ((payload->>'occupantId')::uuid) stored unique references tcg_private.accounts(account_id) deferrable initially deferred;
alter table tcg_private.game_saves
 add column revision bigint generated always as ((payload->>'revision')::bigint) stored not null check(revision>0);
alter table tcg_private.wallet_components add column player_id uuid generated always as ((payload->>'playerId')::uuid) stored not null references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
create index wallet_components_player on tcg_private.wallet_components(player_id);
alter table tcg_private.processed_requests add column player_id uuid generated always as ((payload->>'playerId')::uuid) stored not null references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
create index processed_requests_player on tcg_private.processed_requests(player_id);
alter table tcg_private.wallet_ledger add column player_id uuid generated always as ((payload->>'playerId')::uuid) stored not null references tcg_private.accounts(account_id) on delete cascade deferrable initially deferred;
create index wallet_ledger_player on tcg_private.wallet_ledger(player_id);

alter table tcg_private.processed_requests
 add column request_id text generated always as (payload->>'key') stored not null,
 add column fingerprint text generated always as (payload->'receipt'->>'fingerprint') stored not null,
 add constraint unique_player_request unique(player_id,request_id);
alter table tcg_private.wallet_components add constraint valid_wallet_amounts check(
 case payload->>'key'
 when 'economyState' then jsonb_typeof(payload->'value'->'money')='number'
   and (payload->'value'->>'money')::numeric between -1000000000000 and 1000000000000
   and trunc((payload->'value'->>'money')::numeric)=(payload->'value'->>'money')::numeric
 when 'bankSavingsState' then jsonb_typeof(payload->'value'->'balance')='number'
   and (payload->'value'->>'balance')::numeric between 0 and 1000000000000
   and trunc((payload->'value'->>'balance')::numeric)=(payload->'value'->>'balance')::numeric
 else true end);
alter table tcg_private.wallet_ledger
 add column sequence bigint generated always as ((payload->'entry'->>'id')::bigint) stored not null,
 add column amount bigint generated always as ((payload->'entry'->>'amount')::bigint) stored not null,
 add constraint unique_wallet_entry unique(player_id,sequence);
-- Financial receipts are immutable. Account deletion can still remove their rows.
create or replace function tcg_private.reject_receipt_update() returns trigger language plpgsql as $$
begin raise exception 'Committed transaction receipts cannot be edited'; end $$;
create trigger immutable_wallet_ledger before update on tcg_private.wallet_ledger for each row execute function tcg_private.reject_receipt_update();
create trigger immutable_processed_requests before update on tcg_private.processed_requests for each row execute function tcg_private.reject_receipt_update();
revoke all on function tcg_private.reject_receipt_update() from public,anon,authenticated;

-- The original empty bridge tables remain for rollback inspection, but are no longer read.
alter table tcg_private.store_meta drop constraint store_meta_schema_version_check;
-- Update the existing version before validating the replacement constraint.
update tcg_private.store_meta set schema_version=2,updated_at=now() where id=1;
alter table tcg_private.store_meta add constraint store_meta_schema_version_check check(schema_version=2);
commit;
