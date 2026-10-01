function getRentAmountDue(state) {
  return state.rent.amount + state.rent.lateFee;
}

export function createLifeObligationState(config) {
  return {
    notificationRevision: 0,
    familyTrust: 0,
    discountCoupons: 0,
    rent: {
      amount: config.weeklyRent,
      nextDueDay: config.firstRentDueDay,
      status: "current",
      lateFee: 0,
      missedPayments: 0,
      lastLateFeeDueDay: null,
      lastPaidDay: null,
    },
    schoolFees: {
      status: "inactive",
      amount: config.schoolFeesAmount,
      paidAmount: 0,
      requestedDay: null,
      deadlineDay: null,
      lastReminderDay: null,
      reminderCount: 0,
      outcome: null,
    },
    familyRequests: {
      activeId: null,
      nextIndex: 0,
      nextActivationDay: null,
      entries: Object.fromEntries((config.familyRequests ?? []).map((request) => [
        request.id,
        { ...request, status: "locked", paidAmount: 0, requestedDay: null, deadlineDay: null, lastReminderDay: null, reminderCount: 0, completedDay: null },
      ])),
    },
  };
}

export function restoreLifeObligationState(state, savedState, config = null) {
  if (!savedState) return;
  state.notificationRevision =
    Number(savedState.notificationRevision) || 0;
  state.familyTrust = Number(savedState.familyTrust) || 0;
  state.discountCoupons = Math.max(0, Math.floor(Number(savedState.discountCoupons) || 0));
  Object.assign(state.rent, savedState.rent ?? {});
  Object.assign(state.schoolFees, savedState.schoolFees ?? {});
  if (!state.familyRequests) {
    state.familyRequests = createLifeObligationState(config ?? { familyRequests: [] }).familyRequests;
  }
  const savedFamily = savedState.familyRequests ?? {};
  const isLegacyFamilySave =
    !savedState.familyRequests ||
    Object.keys(savedFamily.entries ?? {}).length === 0;
  state.familyRequests.activeId = savedFamily.activeId ?? state.familyRequests.activeId;
  state.familyRequests.nextIndex = Number(savedFamily.nextIndex) || 0;
  state.familyRequests.nextActivationDay = savedFamily.nextActivationDay ?? null;
  Object.entries(savedFamily.entries ?? {}).forEach(([id, entry]) => {
    state.familyRequests.entries[id] = {
      ...(state.familyRequests.entries[id] ?? {}),
      ...entry,
    };
  });
  if (
    isLegacyFamilySave &&
    state.schoolFees.status === "paid" &&
    !state.familyRequests.activeId &&
    state.familyRequests.nextIndex === 0
  ) {
    // The next daily lifecycle pass will deliver the first post-school request.
    state.familyRequests.nextActivationDay = 1;
  }
}

export function processLifeObligationDay({
  state,
  currentDay,
  config,
}) {
  const events = [];
  const rent = state.rent;

  if (
    currentDay >= rent.nextDueDay - config.rentReminderDays &&
    currentDay <= rent.nextDueDay &&
    rent.status === "current"
  ) {
    rent.status = "due";
    state.notificationRevision += 1;
    events.push("rent-reminder");
  }

  if (
    currentDay > rent.nextDueDay &&
    currentDay <= rent.nextDueDay + config.rentGraceDays &&
    !["paid", "overdue"].includes(rent.status)
  ) {
    rent.status = "grace";
    state.notificationRevision += 1;
    events.push("rent-grace");
  }

  if (
    rent.status !== "owned" &&
    currentDay > rent.nextDueDay + config.rentGraceDays &&
    rent.lastLateFeeDueDay !== rent.nextDueDay
  ) {
    rent.status = "overdue";
    rent.lateFee += Math.ceil(
      rent.amount * config.rentLateFeeRate,
    );
    rent.missedPayments += 1;
    rent.lastLateFeeDueDay = rent.nextDueDay;
    state.notificationRevision += 1;
    events.push("rent-overdue");
  }

  const schoolFees = state.schoolFees;
  if (schoolFees.status === "active") {
    const daysRemaining = schoolFees.deadlineDay - currentDay;
    const reminderInterval =
      daysRemaining <= config.schoolFeesUrgentWindowDays
        ? config.schoolFeesUrgentReminderDays
        : config.schoolFeesReminderDays;

    if (
      currentDay > schoolFees.requestedDay &&
      currentDay - schoolFees.lastReminderDay >= reminderInterval
    ) {
      schoolFees.lastReminderDay = currentDay;
      schoolFees.reminderCount += 1;
      state.notificationRevision += 1;
      events.push("school-fees-reminder");
    }
  }

  if (
    schoolFees.status === "active" &&
    currentDay > schoolFees.deadlineDay
  ) {
    schoolFees.status = "late";
    schoolFees.outcome = "deadline-missed";
    state.familyTrust -= 1;
    state.notificationRevision += 1;
    events.push("school-fees-late");
  }

  const family = state.familyRequests;
  const definitions = config.familyRequests ?? [];
  if (schoolFees.status === "paid" && !family.activeId && family.nextIndex < definitions.length) {
    family.nextActivationDay ??= currentDay + config.familyRequestDelayDays;
    if (currentDay >= family.nextActivationDay) {
      const definition = definitions[family.nextIndex];
      const entry = family.entries[definition.id];
      entry.status = "active";
      entry.requestedDay = currentDay;
      entry.deadlineDay = currentDay + definition.deadlineDays;
      entry.lastReminderDay = currentDay;
      family.activeId = definition.id;
      family.nextActivationDay = null;
      state.notificationRevision += 1;
      events.push("family-request-activated");
    }
  }

  if (family.activeId) {
    const definition = definitions.find((request) => request.id === family.activeId);
    const entry = family.entries[family.activeId];
    if (definition && entry?.status === "active" && currentDay > entry.deadlineDay) {
      entry.status = "late";
      state.familyTrust -= 1;
      state.notificationRevision += 1;
      events.push("family-request-late");
    } else if (definition && entry && currentDay - entry.lastReminderDay >= config.familyRequestReminderDays) {
      entry.lastReminderDay = currentDay;
      entry.reminderCount += 1;
      state.notificationRevision += 1;
      events.push("family-request-reminder");
    }
  }

  return events;
}

export function payWeeklyRent({
  state,
  currentDay,
}) {
  const amount = getRentAmountDue(state);
  const rent = state.rent;

  rent.lastPaidDay = currentDay;
  rent.lateFee = 0;
  rent.status = "current";
  rent.nextDueDay += 7;
  while (rent.nextDueDay <= currentDay) {
    rent.nextDueDay += 7;
  }
  state.notificationRevision += 1;
  return amount;
}

export function endWeeklyRent(state) {
  state.rent.status = "owned";
  state.rent.lateFee = 0;
  state.notificationRevision += 1;
}

export function activateSchoolFees({
  state,
  currentDay,
  config,
}) {
  if (state.schoolFees.status !== "inactive") {
    return false;
  }

  state.schoolFees.status = "active";
  state.schoolFees.requestedDay = currentDay;
  state.schoolFees.deadlineDay =
    currentDay + config.schoolFeesDeadlineDays;
  state.schoolFees.lastReminderDay = currentDay;
  state.schoolFees.reminderCount = 0;
  state.notificationRevision += 1;
  return true;
}

export function paySchoolFees({
  state,
  requestedAmount,
  currentDay,
}) {
  const schoolFees = state.schoolFees;

  if (!["active", "late"].includes(schoolFees.status)) {
    return { success: false, amount: 0, completed: false };
  }

  const remaining = Math.max(
    0,
    schoolFees.amount - schoolFees.paidAmount,
  );
  const amount = Math.min(
    remaining,
    Math.max(0, Math.round(Number(requestedAmount) || 0)),
  );

  if (amount <= 0) {
    return { success: false, amount: 0, completed: false };
  }

  schoolFees.paidAmount += amount;
  const completed = schoolFees.paidAmount >= schoolFees.amount;

  if (completed) {
    const wasLate = currentDay > schoolFees.deadlineDay;
    schoolFees.status = "paid";
    schoolFees.outcome = wasLate ? "paid-late" : "paid-on-time";
    state.familyTrust += wasLate ? 1 : 2;
    state.familyRequests.nextActivationDay ??= currentDay + 7;
  } else {
    schoolFees.outcome = "partial-payment";
  }

  state.notificationRevision += 1;
  return { success: true, amount, completed };
}

export function payFamilyRequest({ state, requestedAmount, currentDay, config }) {
  const definition = (config.familyRequests ?? []).find((request) => request.id === state.familyRequests.activeId);
  const entry = definition ? state.familyRequests.entries[definition.id] : null;
  if (!definition || !entry || !["active", "late"].includes(entry.status)) {
    return { success: false, amount: 0, completed: false, reward: null };
  }
  const remaining = Math.max(0, definition.amount - entry.paidAmount);
  const amount = Math.min(remaining, Math.max(0, Math.round(Number(requestedAmount) || 0)));
  if (amount <= 0) return { success: false, amount: 0, completed: false, reward: null };
  entry.paidAmount += amount;
  const completed = entry.paidAmount >= definition.amount;
  if (completed) {
    entry.status = "paid";
    entry.completedDay = currentDay;
    state.familyTrust += definition.trust;
    state.familyRequests.activeId = null;
    state.familyRequests.nextIndex += 1;
    state.familyRequests.nextActivationDay = currentDay + config.familyRequestDelayDays;
  }
  state.notificationRevision += 1;
  return { success: true, amount, completed, reward: completed ? definition.reward : null, definition };
}

export function getLifeObligationView(state) {
  return {
    notificationRevision: state.notificationRevision,
    familyTrust: state.familyTrust,
    discountCoupons: state.discountCoupons,
    rent: {
      ...state.rent,
      amountDue: getRentAmountDue(state),
      daysUntilDue: null,
    },
    schoolFees: {
      ...state.schoolFees,
      remainingAmount: Math.max(
        0,
        state.schoolFees.amount - state.schoolFees.paidAmount,
      ),
    },
    familyRequests: {
      ...state.familyRequests,
      entries: Object.values(state.familyRequests.entries ?? {}),
    },
  };
}
