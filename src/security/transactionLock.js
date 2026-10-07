let locked = false;

export function setTransactionLock(value) {
  locked = value === true;
}

export function isTransactionLocked() {
  return locked;
}
