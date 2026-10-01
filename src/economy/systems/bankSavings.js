const RATE_OFFERS = Object.freeze([
  Object.freeze({ rate: 0.02, weight: 35 }),
  Object.freeze({ rate: 0.05, weight: 35 }),
  Object.freeze({ rate: 0.1, weight: 15 }),
  Object.freeze({ rate: 0.15, weight: 15 }),
]);

function chooseRate() {
  let draw = Math.random() * 100;
  for (const offer of RATE_OFFERS) {
    draw -= offer.weight;
    if (draw < 0) return offer.rate;
  }
  return 0.02;
}

function addMessage(state, { type, label, amount = 0, direction = "notice" }) {
  state.messages.unshift({
    id: `savings-${state.nextMessageNumber}`,
    type,
    label,
    amount: Math.max(0, Math.round(Number(amount) || 0)),
    direction,
    createdAt: Date.now() + state.nextMessageNumber,
  });
  state.nextMessageNumber += 1;
  state.messages = state.messages.slice(0, 60);
}

export function createBankSavingsState(currentDay = 1) {
  const day = Math.max(1, Math.floor(Number(currentDay) || 1));
  const rate = chooseRate();
  const state = {
    balance: 0,
    weeklyRate: rate,
    rateWeek: Math.floor((day - 1) / 7) + 1,
    lastProcessedDay: day,
    messages: [],
    nextMessageNumber: 1,
  };
  addMessage(state, {
    type: "savings-rate",
    label: `MONDAY SAVINGS RATE · ${Math.round(rate * 100)}% THIS WEEK`,
  });
  return state;
}

export function restoreBankSavingsState(state, savedState, currentDay = 1) {
  if (savedState && typeof savedState === "object") {
    Object.assign(state, savedState);
  }
  state.balance = Math.max(0, Number(state.balance) || 0);
  state.weeklyRate = [0.02, 0.05, 0.1, 0.15].includes(Number(state.weeklyRate))
    ? Number(state.weeklyRate)
    : 0.02;
  state.rateWeek = Math.max(1, Math.floor(Number(state.rateWeek) || 1));
  state.lastProcessedDay = Math.max(
    1,
    Math.floor(Number(state.lastProcessedDay) || Number(currentDay) || 1),
  );
  state.messages = Array.isArray(state.messages) ? state.messages : [];
  state.nextMessageNumber = Math.max(
    1,
    Math.floor(Number(state.nextMessageNumber) || state.messages.length + 1),
  );
}

export function processBankSavingsDay(state, currentDay) {
  const targetDay = Math.max(1, Math.floor(Number(currentDay) || 1));
  const events = [];
  while (state.lastProcessedDay < targetDay) {
    state.lastProcessedDay += 1;
    const day = state.lastProcessedDay;
    if ((day - 1) % 7 !== 0) continue;

    if (state.balance > 0) {
      const interest = Math.max(1, Math.round(state.balance * state.weeklyRate));
      state.balance += interest;
      addMessage(state, {
        type: "savings-interest",
        label: `SAVINGS INTEREST CREDITED · ${Math.round(state.weeklyRate * 100)}%`,
        amount: interest,
        direction: "savings-income",
      });
      events.push({ type: "interest", amount: interest });
    }

    state.weeklyRate = chooseRate();
    state.rateWeek = Math.floor((day - 1) / 7) + 1;
    addMessage(state, {
      type: "savings-rate",
      label: `MONDAY SAVINGS RATE · ${Math.round(state.weeklyRate * 100)}% THIS WEEK`,
    });
    events.push({ type: "rate", rate: state.weeklyRate });
  }
  return events;
}

export function depositIntoSavings(state, economyState, requestedAmount) {
  const amount = Math.min(
    Math.max(0, Math.round(Number(requestedAmount) || 0)),
    Math.max(0, economyState.money),
  );
  if (amount <= 0) return false;
  economyState.money -= amount;
  state.balance += amount;
  addMessage(state, {
    type: "savings-deposit",
    label: "TRANSFERRED TO SAVINGS",
    amount,
    direction: "transfer-out",
  });
  return true;
}

export function withdrawFromSavings(state, economyState, requestedAmount) {
  const amount = Math.min(
    Math.max(0, Math.round(Number(requestedAmount) || 0)),
    state.balance,
  );
  if (amount <= 0) return false;
  state.balance -= amount;
  economyState.money += amount;
  addMessage(state, {
    type: "savings-withdrawal",
    label: "WITHDRAWN FROM SAVINGS",
    amount,
    direction: "transfer-in",
  });
  return true;
}

export function withdrawSavingsForExpense(state, requestedAmount, label = "SAVINGS PAYMENT") {
  const amount = Math.min(
    Math.max(0, Math.round(Number(requestedAmount) || 0)),
    state.balance,
  );
  if (amount <= 0) return 0;
  state.balance -= amount;
  addMessage(state, {
    type: "savings-expense",
    label,
    amount,
    direction: "transfer-out",
  });
  return amount;
}
