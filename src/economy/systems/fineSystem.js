export function createFineState(config) {
  return {
    outstandingAmount: 0,
    entries: [],
    nextFineNumber: 1,
    vehicleImpounded: false,
    impoundThreshold: config.fineImpoundThreshold,
  };
}

export function issueOutstandingFine({
  state,
  amount,
  label,
  gameDay,
  gameTime,
}) {
  const fine = {
    id: `fine-${state.nextFineNumber}`,
    label,
    amount: Math.max(0, Math.round(amount)),
    gameDay,
    gameTime,
  };

  if (fine.amount <= 0) {
    return null;
  }

  state.nextFineNumber += 1;
  state.entries.unshift(fine);
  state.entries = state.entries.slice(0, 50);
  state.outstandingAmount += fine.amount;

  if (state.outstandingAmount >= state.impoundThreshold) {
    state.vehicleImpounded = true;
  }

  return fine;
}

export function clearOutstandingFines(state) {
  const paidAmount = state.outstandingAmount;
  state.outstandingAmount = 0;
  state.entries = [];
  state.vehicleImpounded = false;
  return paidAmount;
}

