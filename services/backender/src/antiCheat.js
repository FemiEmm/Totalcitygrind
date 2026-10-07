import { ApiError } from './auth.js';
import { read, transaction, storageDriver } from './store.js';
import { databasePool } from './storage/postgres.js';

export const ANTI_CHEAT_BALANCE_TRIGGER = 100_000_000;
export const ANTI_CHEAT_RISE_TRIGGER = 50_000_000;

function fileRow(playerId) {
  const row = read('antiCheat', playerId);
  return row || {
    playerId,
    transactionStatus: 'active',
    reason: null,
    flaggedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    trustedBalance: null,
    reportedBalance: null,
    increase: null,
    source: null,
  };
}

function publicStatus(row) {
  return {
    transactionStatus: row?.transactionStatus === 'review' ? 'review' : 'active',
    transactionsLocked: row?.transactionStatus === 'review',
    reason: row?.reason || null,
    flaggedAt: row?.flaggedAt || null,
  };
}

export async function antiCheatStatus(playerId) {
  if (storageDriver === 'file') return publicStatus(fileRow(playerId));
  const result = await databasePool().query(
    `select player_id,transaction_status,reason,flagged_at,reviewed_at,reviewed_by,trusted_balance,reported_balance,increase_amount,source
       from public.tcg_anticheat_flags
      where player_id=$1`,
    [playerId],
  );
  const row = result.rows[0];
  return publicStatus(row ? {
    transactionStatus: row.transaction_status,
    reason: row.reason,
    flaggedAt: row.flagged_at?.toISOString?.() || row.flagged_at || null,
  } : null);
}

export async function checkReportedBalance(playerId, reportedBalance, source = 'frontend') {
  const reported = Math.round(Number(reportedBalance));
  if (!Number.isSafeInteger(reported) || Math.abs(reported) > 1e12) {
    throw new ApiError(400, 'Invalid balance for account check');
  }
  const trusted = Math.round(Number(
    read('wallets', playerId)?.state?.economyState?.money ??
    read('profiles', playerId)?.money ??
    0
  ));
  const increase = reported - trusted;

  if (storageDriver === 'file') {
    const current = fileRow(playerId);
    if (current.transactionStatus !== 'review' && reported > ANTI_CHEAT_BALANCE_TRIGGER && increase >= ANTI_CHEAT_RISE_TRIGGER) {
      transaction((db) => {
        db.antiCheat ||= {};
        db.antiCheat[playerId] = {
          ...current,
          playerId,
          transactionStatus: 'review',
          reason: 'sudden_balance_increase',
          flaggedAt: new Date().toISOString(),
          reviewedAt: null,
          reviewedBy: null,
          trustedBalance: trusted,
          reportedBalance: reported,
          increase,
          source,
        };
      });
    }
    return {
      ...publicStatus(fileRow(playerId)),
      trustedBalance: trusted,
      reportedBalance: reported,
      increase,
      triggerBalance: ANTI_CHEAT_BALANCE_TRIGGER,
      triggerIncrease: ANTI_CHEAT_RISE_TRIGGER,
    };
  }

  if (reported > ANTI_CHEAT_BALANCE_TRIGGER && increase >= ANTI_CHEAT_RISE_TRIGGER) {
    await databasePool().query(
      `insert into public.tcg_anticheat_flags
         (player_id,transaction_status,reason,flagged_at,trusted_balance,reported_balance,increase_amount,source,updated_at)
       values ($1,'review','sudden_balance_increase',now(),$2,$3,$4,$5,now())
       on conflict (player_id) do update set
         transaction_status = case when public.tcg_anticheat_flags.transaction_status='review' then 'review' else excluded.transaction_status end,
         reason = case when public.tcg_anticheat_flags.transaction_status='review' then public.tcg_anticheat_flags.reason else excluded.reason end,
         flagged_at = case when public.tcg_anticheat_flags.transaction_status='review' then public.tcg_anticheat_flags.flagged_at else excluded.flagged_at end,
         reviewed_at = case when public.tcg_anticheat_flags.transaction_status='review' then public.tcg_anticheat_flags.reviewed_at else null end,
         reviewed_by = case when public.tcg_anticheat_flags.transaction_status='review' then public.tcg_anticheat_flags.reviewed_by else null end,
         trusted_balance = case when public.tcg_anticheat_flags.transaction_status='review' then public.tcg_anticheat_flags.trusted_balance else excluded.trusted_balance end,
         reported_balance = case when public.tcg_anticheat_flags.transaction_status='review' then public.tcg_anticheat_flags.reported_balance else excluded.reported_balance end,
         increase_amount = case when public.tcg_anticheat_flags.transaction_status='review' then public.tcg_anticheat_flags.increase_amount else excluded.increase_amount end,
         source = case when public.tcg_anticheat_flags.transaction_status='review' then public.tcg_anticheat_flags.source else excluded.source end,
         updated_at=now()`,
      [playerId, trusted, reported, increase, source],
    );
  }
  const status = await antiCheatStatus(playerId);
  return {
    ...status,
    trustedBalance: trusted,
    reportedBalance: reported,
    increase,
    triggerBalance: ANTI_CHEAT_BALANCE_TRIGGER,
    triggerIncrease: ANTI_CHEAT_RISE_TRIGGER,
  };
}

export async function assertTransactionsAllowed(playerId) {
  const status = await antiCheatStatus(playerId);
  if (status.transactionsLocked) {
    throw new ApiError(
      423,
      'Transactions are temporarily unavailable while this account is being reviewed.',
      'transactions_under_review',
    );
  }
  return status;
}
