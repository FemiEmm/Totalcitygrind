const observers = new WeakMap();
export function observeTransactions(state, listener) { observers.set(state, listener); }
export function notifyTransaction(state, transaction) {
  const listener = observers.get(state);
  if (listener) listener(transaction);
}

let receiptSequence = 0;
export function createMarketReceiptId() {
  // LAN HTTP previews may not expose randomUUID; receipts must still work there.
  return globalThis.crypto?.randomUUID?.() ?? ('market-' + Date.now() + '-' + receiptSequence++ + '-' + Math.random().toString(36).slice(2));
}
