-- Total City Grind anti-cheat review lock.
-- Backender reads/writes this table through the existing DATABASE_URL.
-- No browser policy is granted. Players cannot clear their own review flag.

create table if not exists public.tcg_anticheat_flags (
  player_id uuid primary key references tcg_private.accounts(account_id) on delete cascade,
  transaction_status text not null default 'active'
    check (transaction_status in ('active','review')),
  reason text,
  flagged_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  trusted_balance bigint,
  reported_balance bigint,
  increase_amount bigint,
  source text,
  updated_at timestamptz not null default now()
);

create index if not exists tcg_anticheat_review_idx
  on public.tcg_anticheat_flags(transaction_status, flagged_at desc)
  where transaction_status = 'review';

alter table public.tcg_anticheat_flags enable row level security;
revoke all on public.tcg_anticheat_flags from anon, authenticated;

-- Manual review / unlock example in Supabase SQL Editor:
-- update public.tcg_anticheat_flags
-- set transaction_status='active', reviewed_at=now(), reviewed_by='manual-review', updated_at=now()
-- where player_id='PLAYER-UUID-HERE';
