import { read, transaction, storageDriver } from './store.js';
import { databasePool } from './storage/postgres.js';

function messageRow(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    recipientId: row.recipient_id,
    recipientUsername: row.recipient_username,
    text: row.message_text,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function transferRow(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    recipientId: row.recipient_id,
    recipientUsername: row.recipient_username,
    amount: Number(row.amount),
    createdAt: new Date(row.created_at).getTime(),
    claimedAt: row.claimed_at ? new Date(row.claimed_at).getTime() : null,
  };
}

function adRow(row) {
  return {
    id: row.id,
    billboardId: row.billboard_id,
    playerId: row.player_id,
    username: row.username,
    bookingDate: typeof row.booking_date === 'string' ? row.booking_date : row.booking_date.toISOString().slice(0, 10),
    imagePath: row.image_path,
    amountPaid: Number(row.amount_paid),
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function listMessages(playerId) {
  if (storageDriver === 'file') {
    return (read('directMessages') || []).filter((row) => row.senderId === playerId || row.recipientId === playerId).slice(-500);
  }
  const result = await databasePool().query(
    `select id,sender_id,sender_username,recipient_id,recipient_username,message_text,created_at
       from public.tcg_direct_messages
      where sender_id=$1 or recipient_id=$1
      order by created_at asc
      limit 500`,
    [playerId],
  );
  return result.rows.map(messageRow);
}

export async function createMessage(row) {
  if (storageDriver === 'file') {
    return transaction((db) => {
      db.directMessages ||= [];
      db.directMessages.push(row);
      db.directMessages = db.directMessages.slice(-5000);
      return row;
    });
  }
  const result = await databasePool().query(
    `insert into public.tcg_direct_messages
       (id,sender_id,sender_username,recipient_id,recipient_username,message_text,created_at)
     values ($1,$2,$3,$4,$5,$6,to_timestamp($7/1000.0))
     returning id,sender_id,sender_username,recipient_id,recipient_username,message_text,created_at`,
    [row.id,row.senderId,row.senderUsername,row.recipientId,row.recipientUsername,row.text,row.createdAt],
  );
  return messageRow(result.rows[0]);
}

export async function listTransfers(playerId) {
  if (storageDriver === 'file') {
    return (read('playerTransfers') || []).filter((row) => row.senderId === playerId || row.recipientId === playerId).slice(-200).reverse();
  }
  const result = await databasePool().query(
    `select id,sender_id,sender_username,recipient_id,recipient_username,amount,created_at,claimed_at
       from public.tcg_player_transfers
      where sender_id=$1 or recipient_id=$1
      order by created_at desc
      limit 200`,
    [playerId],
  );
  return result.rows.map(transferRow);
}

export async function createTransfer(row) {
  if (storageDriver === 'file') {
    return transaction((db) => {
      db.playerTransfers ||= [];
      db.playerTransfers.push(row);
      db.playerTransfers = db.playerTransfers.slice(-2000);
      return row;
    });
  }
  const result = await databasePool().query(
    `insert into public.tcg_player_transfers
       (id,sender_id,sender_username,recipient_id,recipient_username,amount,created_at,claimed_at)
     values ($1,$2,$3,$4,$5,$6,to_timestamp($7/1000.0),null)
     returning id,sender_id,sender_username,recipient_id,recipient_username,amount,created_at,claimed_at`,
    [row.id,row.senderId,row.senderUsername,row.recipientId,row.recipientUsername,row.amount,row.createdAt],
  );
  return transferRow(result.rows[0]);
}

export async function claimTransfers(playerId) {
  if (storageDriver === 'file') {
    return transaction((db) => {
      db.playerTransfers ||= [];
      const now = Date.now(), rows = [];
      for (const row of db.playerTransfers) {
        if (row.recipientId === playerId && !row.claimedAt) {
          row.claimedAt = now;
          rows.push({ ...row });
        }
      }
      return rows;
    });
  }
  const result = await databasePool().query(
    `update public.tcg_player_transfers
        set claimed_at=now()
      where recipient_id=$1 and claimed_at is null
      returning id,sender_id,sender_username,recipient_id,recipient_username,amount,created_at,claimed_at`,
    [playerId],
  );
  return result.rows.map(transferRow);
}

export async function listPlaceAds(bookingDate) {
  if (storageDriver === 'file') {
    return (read('placeAds') || []).filter((row) => row.bookingDate === bookingDate).sort((a,b) => a.createdAt-b.createdAt || String(a.id).localeCompare(String(b.id)));
  }
  const result = await databasePool().query(
    `select id,billboard_id,player_id,username,booking_date,image_path,amount_paid,created_at
       from public.tcg_place_ads
      where booking_date=$1::date
      order by billboard_id,created_at,id`,
    [bookingDate],
  );
  return result.rows.map(adRow);
}

export async function hasPlaceAdBooking(playerId, billboardId, bookingDate) {
  if (storageDriver === 'file') {
    return (read('placeAds') || []).some((row) => row.playerId === playerId && row.billboardId === billboardId && row.bookingDate === bookingDate);
  }
  const result = await databasePool().query(
    `select 1 from public.tcg_place_ads where player_id=$1 and billboard_id=$2 and booking_date=$3::date limit 1`,
    [playerId,billboardId,bookingDate],
  );
  return result.rowCount > 0;
}

export async function createPlaceAd(row) {
  if (storageDriver === 'file') {
    return transaction((db) => {
      db.placeAds ||= [];
      const duplicate = db.placeAds.some((entry) => entry.playerId === row.playerId && entry.billboardId === row.billboardId && entry.bookingDate === row.bookingDate);
      if (duplicate) {
        const error = new Error('You already booked this billboard for this date');
        error.code = 'PLACE_AD_DUPLICATE';
        throw error;
      }
      db.placeAds.push(row);
      db.placeAds = db.placeAds.slice(-10000);
      return row;
    });
  }
  const result = await databasePool().query(
    `insert into public.tcg_place_ads
       (id,billboard_id,player_id,username,booking_date,image_path,amount_paid,created_at)
     values ($1,$2,$3,$4,$5::date,$6,$7,to_timestamp($8/1000.0))
     returning id,billboard_id,player_id,username,booking_date,image_path,amount_paid,created_at`,
    [row.id,row.billboardId,row.playerId,row.username,row.bookingDate,row.imagePath,row.amountPaid,row.createdAt],
  );
  return adRow(result.rows[0]);
}
