import { notifyTransaction, createMarketReceiptId } from './transactionObservers.js';
function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function recordLedgerTransaction(economyState, transaction) {
  if (
    !transaction.direction ||
    !Number.isFinite(transaction.amount) ||
    transaction.amount <= 0
  ) {
    return;
  }

  economyState.transactions.unshift({
    id: `megapay-${economyState.nextTransactionNumber}`,
    type: transaction.type,
    label: transaction.label,
    amount: Math.round(transaction.amount),
    direction: transaction.direction,
    createdAt: Date.now(),
  });
  notifyTransaction(economyState, { ...transaction, marketEventId: createMarketReceiptId() });
  economyState.nextTransactionNumber += 1;
  economyState.transactions =
    economyState.transactions.slice(0, 100);
}

function setTransaction(economyState, transaction, config) {
  economyState.lastTransaction = transaction;
  economyState.feedbackSecondsRemaining = config.feedbackSeconds;
  recordLedgerTransaction(economyState, transaction);
  return transaction;
}

function syncLoanBalances(economyState) {
  economyState.quickLoanBalance = Math.max(
    0,
    Number(economyState.quickLoanBalance) || 0,
  );
  economyState.bankLoanBalance = Math.max(
    0,
    Number(economyState.bankLoanBalance) || 0,
  );
  economyState.loanBalance =
    economyState.quickLoanBalance + economyState.bankLoanBalance;
}

export function normaliseLoanState(economyState, config) {
  const hasSeparateBalances =
    Number.isFinite(economyState.quickLoanBalance) ||
    Number.isFinite(economyState.bankLoanBalance);

  if (
    (!hasSeparateBalances ||
      (
        Number(economyState.quickLoanBalance || 0) === 0 &&
        Number(economyState.bankLoanBalance || 0) === 0
      )) &&
    Number(economyState.loanBalance) > 0
  ) {
    economyState.quickLoanBalance = Number(economyState.loanBalance);
    economyState.bankLoanBalance = 0;
  }

  economyState.quickLoanInterestRemaining ??= 0;
  economyState.bankLoanInterestRemaining ??= 0;
  economyState.quickLoanBalance ??= 0;
  economyState.bankLoanBalance ??= 0;
  economyState.bankLoanEligible ??=
    economyState.lastProcessedDay >= (config.bankLoanOfferDay ?? 3);
  economyState.lastBankColdCallDay ??= 0;
  syncLoanBalances(economyState);
  return economyState;
}

export function createDanfoEconomyState(config, startingDay = 1) {
  return {
    money: config.startingMoney,
    lastProcessedDay: startingDay,
    totalPassengerFares: 0,
    totalRouteBonuses: 0,
    totalExpenses: 0,
    transactions: [],
    nextTransactionNumber: 1,
    quickLoanInterestRemaining: 0,
    bankLoanInterestRemaining: 0,
    loanBalance: 0,
    quickLoanBalance: 0,
    bankLoanBalance: 0,
    loanOfferReceived: startingDay >= config.loanOfferDay,
    bankLoanEligible:
      startingDay >= (config.bankLoanOfferDay ?? 3),
    lastBankColdCallDay: 0,
    ownedVehicleIds: [],
    selectedPrivateVehicleId: null,
    lastAgberoTicketDay: 0,
    lastRouteBonus: 0,
    lastTransaction: null,
    feedbackSecondsRemaining: 0,
    gameOver: false,
    gameOverReason: null,
  };
}

export function purchasePlayerVehicle({
  economyState,
  vehicle,
  atDealership,
  config,
}) {
  if (
    !vehicle ||
    !atDealership ||
    economyState.ownedVehicleIds.includes(vehicle.id) ||
    economyState.money < vehicle.price
  ) {
    return { success: false, vehicleId: null };
  }

  economyState.money -= vehicle.price;
  economyState.totalExpenses += vehicle.price;
  economyState.ownedVehicleIds.push(vehicle.id);
  economyState.selectedPrivateVehicleId = vehicle.id;

  setTransaction(
    economyState,
    {
      type: "vehicle-purchase",
      amount: vehicle.price,
      direction: "expense",
      label: `${vehicle.name.toUpperCase()} PURCHASED`,
    },
    config,
  );

  return { success: true, vehicleId: vehicle.id };
}

export function addMotoEaziFare(economyState, amount) {
  const fare = Math.max(0, Math.round(amount));
  economyState.money += fare;

  recordLedgerTransaction(economyState, {
    type: "moto-eazi-fare",
    amount: fare,
    direction: "income",
    label: "MOTO EAZI TRIP FARE",
  });

  return fare;
}

export function creditIncome({
  economyState,
  amount,
  type,
  label,
  config,
}) {
  const income = Math.max(0, Math.round(amount));

  if (income <= 0) {
    return null;
  }

  economyState.money += income;

  return setTransaction(
    economyState,
    {
      type,
      amount: income,
      direction: "income",
      label,
    },
    config,
  );
}

export function chargeExpense({
  economyState,
  amount,
  type,
  label,
  config,
}) {
  const cost = Math.max(0, Math.round(amount));

  if (cost <= 0) {
    return null;
  }

  economyState.money -= cost;
  economyState.totalExpenses += cost;

  return setTransaction(
    economyState,
    {
      type,
      amount: cost,
      direction: "expense",
      label,
    },
    config,
  );
}

export function addEmergencyBankLoan({
  economyState,
  amount,
  config,
}) {
  const principal = Math.max(0, Math.ceil(Number(amount) || 0));

  if (principal <= 0) {
    return { success: false, amount: 0 };
  }

  normaliseLoanState(economyState, config);
  economyState.money += principal;
  economyState.bankLoanBalance += principal;
  syncLoanBalances(economyState);

  setTransaction(
    economyState,
    {
      type: "emergency-medical-credit",
      amount: principal,
      direction: "income",
      label: `EMERGENCY MEDICAL CREDIT · BANK DEBT ₦${economyState.bankLoanBalance.toLocaleString()}`,
    },
    config,
  );

  return {
    success: true,
    amount: principal,
    balance: economyState.bankLoanBalance,
  };
}

export function offerBankLoan({
  economyState,
  currentDay,
  config,
}) {
  let newlyEligible = false;

  if (
    !economyState.loanOfferReceived &&
    currentDay >= config.loanOfferDay
  ) {
    economyState.loanOfferReceived = true;
    newlyEligible = true;
  }

  if (
    !economyState.bankLoanEligible &&
    currentDay >= (config.bankLoanOfferDay ?? 3)
  ) {
    economyState.bankLoanEligible = true;
    newlyEligible = true;
  }

  return newlyEligible;
}

export function borrowBankLoan({
  economyState,
  amount,
  atBank,
  config,
}) {
  const principal = Math.round(Number(amount));
  normaliseLoanState(economyState, config);

  if (
    !economyState.bankLoanEligible ||
    !atBank ||
    economyState.bankLoanBalance > 0 ||
    !Number.isFinite(principal) ||
    principal < config.minimumLoanAmount ||
    principal > config.maximumLoanAmount
  ) {
    return { success: false, amount: 0 };
  }

  const interest = Math.ceil(
    principal * config.bankLoanInterestRate,
  );
  economyState.money += principal;
  economyState.bankLoanBalance = principal + interest;
  economyState.bankLoanInterestRemaining = interest;
  syncLoanBalances(economyState);

  setTransaction(
    economyState,
    {
      type: "bank-loan",
      amount: principal,
      direction: "income",
      label: `BANK LOAN RECEIVED · REPAY ₦${economyState.bankLoanBalance.toLocaleString()}`,
    },
    config,
  );

  return {
    success: true,
    amount: principal,
    interest,
    balance: economyState.bankLoanBalance,
  };
}

export function borrowQuickLoan({
  economyState,
  config,
}) {
  normaliseLoanState(economyState, config);

  if (
    !economyState.loanOfferReceived ||
    economyState.quickLoanBalance > 0
  ) {
    return { success: false, amount: 0 };
  }

  const principal = config.quickLoanAmount;
  const interest = Math.ceil(
    principal * config.quickLoanInterestRate,
  );
  economyState.money += principal;
  economyState.quickLoanBalance = principal + interest;
  economyState.quickLoanInterestRemaining = interest;
  syncLoanBalances(economyState);

  setTransaction(
    economyState,
    {
      type: "quick-loan",
      amount: principal,
      direction: "income",
      label: `MEGAPAY QUICK LOAN · REPAY ₦${economyState.quickLoanBalance.toLocaleString()}`,
    },
    config,
  );

  return {
    success: true,
    amount: principal,
    interest,
    balance: economyState.quickLoanBalance,
  };
}

export function repayBankLoan({
  economyState,
  amount,
  receiver,
  loanType = "quick",
  config,
}) {
  normaliseLoanState(economyState, config);
  const payment = Math.round(Number(amount));
  const normalisedReceiver = String(receiver ?? "")
    .trim()
    .toLowerCase();

  if (
    !["bank", "megapay", "megapay bank"].includes(normalisedReceiver) ||
    economyState.loanBalance <= 0 ||
    !Number.isFinite(payment) ||
    payment <= 0 ||
    payment > economyState.money
  ) {
    return { success: false, amount: 0 };
  }

  const balanceKey =
    loanType === "bank" ? "bankLoanBalance" : "quickLoanBalance";
  if (economyState[balanceKey] <= 0) {
    return { success: false, amount: 0 };
  }

  const paid = Math.min(payment, economyState[balanceKey]);
  const interestKey = loanType === "bank" ? "bankLoanInterestRemaining" : "quickLoanInterestRemaining";
  const interestPaid = paid * (economyState[interestKey] || 0) / economyState[balanceKey];
  economyState[interestKey] = Math.max(0, (economyState[interestKey] || 0) - interestPaid);
  economyState.money -= paid;
  economyState.totalExpenses += paid;
  economyState[balanceKey] -= paid;
  syncLoanBalances(economyState);

  setTransaction(
    economyState,
    {
      type: "loan-repayment",
      interestPaid,
      amount: paid,
      direction: "expense",
      label:
        economyState[balanceKey] > 0
          ? "MEGAPAY LOAN REPAYMENT"
          : "MEGAPAY LOAN CLEARED",
    },
    config,
  );

  return {
    success: true,
    amount: paid,
    balance: economyState[balanceKey],
    totalBalance: economyState.loanBalance,
  };
}

export function addPassengerFare(economyState, amount) {
  const safeAmount = Math.max(0, Math.round(amount));

  economyState.money += safeAmount;
  economyState.totalPassengerFares += safeAmount;
  recordLedgerTransaction(economyState, {
    type: "passenger-fare",
    amount: safeAmount,
    direction: "income",
    label: "Passenger fares",
  });

  return safeAmount;
}

export function chargeAgberoPickup({ economyState, currentDay, boardedCount, config }) {
  if (!(boardedCount > 0)) return null;
  const day = Math.max(1, Math.floor(Number(currentDay) || 1));
  const firstPickup = economyState.lastAgberoTicketDay !== day;
  const amount = firstPickup ? 1000 : 300;
  const reason = firstPickup ? "owo ticket" : "owo loading";
  chargeExpense({
    economyState, amount, type: "agbero-payment",
    label: "Paid agbero " + amount.toLocaleString("en-NG") + " - " + reason,
    config,
  });
  economyState.lastAgberoTicketDay = day;
  return { amount, reason };
}

export function clearLastRouteBonus(economyState) {
  economyState.lastRouteBonus = 0;
}

export function processDailyGarageFees({
  economyState,
  currentDay,
  config,
}) {
  if (economyState.gameOver) {
    return null;
  }

  let latestTransaction = null;

  while (economyState.lastProcessedDay < currentDay) {
    const feeDay = economyState.lastProcessedDay + 1;
    const dailyGarageFee = config.dailyGarageFee;
    const dailyCarOwnerFee = config.dailyCarOwnerFee;
    const totalDailyFees =
      dailyGarageFee + dailyCarOwnerFee;

    if (economyState.money < totalDailyFees) {
      economyState.gameOver = true;
      economyState.gameOverReason = "daily-fees";

      latestTransaction = setTransaction(
        economyState,
        {
          type: "daily-fees-failed",
          amount: totalDailyFees,
          garageFee: dailyGarageFee,
          carOwnerFee: dailyCarOwnerFee,
          day: feeDay,
          label: "DAILY GARAGE AND CAR OWNER FEES UNPAID",
        },
        config,
      );

      return latestTransaction;
    }

    economyState.money -= totalDailyFees;
    economyState.totalExpenses += totalDailyFees;
    economyState.lastProcessedDay = feeDay;

    latestTransaction = setTransaction(
      economyState,
      {
        type: "daily-fees-paid",
        amount: totalDailyFees,
        direction: "expense",
        garageFee: dailyGarageFee,
        carOwnerFee: dailyCarOwnerFee,
        day: feeDay,
        label: "MIDNIGHT DAILY FEES PAID",
      },
      config,
    );
  }

  return latestTransaction;
}

export function processDailyBrtTax({
  economyState,
  currentDay,
  config,
}) {
  let latestTransaction = null;

  while (economyState.lastProcessedDay < currentDay) {
    const taxDay = economyState.lastProcessedDay + 1;
    const dailyBrtTax = Math.max(
      0,
      Math.round(config.dailyBrtTax ?? 5000),
    );

    economyState.money -= dailyBrtTax;
    economyState.totalExpenses += dailyBrtTax;
    economyState.lastProcessedDay = taxDay;

    latestTransaction = setTransaction(
      economyState,
      {
        type: "brt-daily-tax",
        amount: dailyBrtTax,
        direction: "expense",
        day: taxDay,
        label: "BRT DAILY TAX PAID",
      },
      config,
    );
  }

  return latestTransaction;
}

export function getFuelPurchaseCost(currentFuel, config) {
  return getFuelPurchaseQuote(currentFuel, "full", config).cost;
}

export function getFuelPurchaseQuote(
  currentFuel,
  requestedLitres,
  config,
) {
  const capacity = config.fuelTankCapacityLitres;
  const currentLitres = clamp(currentFuel, 0, 100) / 100 * capacity;
  const missingLitres = Math.max(0, capacity - currentLitres);
  const requested =
    requestedLitres === "full"
      ? missingLitres
      : Math.max(0, Number(requestedLitres) || 0);
  const litres = Math.min(requested, missingLitres);

  return {
    litres,
    cost: Math.ceil(litres * config.fuelCostPerLitre),
    resultingFuel: clamp(
      currentFuel + litres / capacity * 100,
      0,
      100,
    ),
  };
}

export function purchaseFuel({
  economyState,
  currentFuel,
  requestedLitres = "full",
  config,
  discountRate = 0,
}) {
  const quote = getFuelPurchaseQuote(
    currentFuel,
    requestedLitres,
    config,
  );
  const { cost: baseCost, litres, resultingFuel } = quote;
  const appliedDiscount = Math.min(0.5, Math.max(0, Number(discountRate) || 0));
  const cost = Math.round(baseCost * (1 - appliedDiscount));

  if (cost <= 0) {
    setTransaction(
      economyState,
      {
        type: "fuel-full",
        amount: 0,
        label: "FUEL TANK ALREADY FULL",
      },
      config,
    );

    return {
      success: false,
      fuel: currentFuel,
      cost: 0,
      litres: 0,
    };
  }

  if (economyState.money < cost) {
    setTransaction(
      economyState,
      {
        type: "insufficient-funds",
        amount: cost,
        label: "NOT ENOUGH MONEY FOR FUEL",
      },
      config,
    );

    return {
      success: false,
      fuel: currentFuel,
      cost,
      litres,
    };
  }

  economyState.money -= cost;
  economyState.totalExpenses += cost;

  setTransaction(
    economyState,
    {
      type: "fuel-purchase",
      amount: cost,
      direction: "expense",
      label: `FUEL PURCHASE · ${litres.toFixed(1)}L`,
    },
    config,
  );

  return {
    success: true,
    fuel: resultingFuel,
    cost,
    litres,
  };
}

export function getRepairPurchaseCost(currentDamage, config) {
  const repairAmount = clamp(currentDamage, 0, 100);
  const tier = config.repairPriceTiers?.find((candidate) => {
    return repairAmount <= candidate.maximumDamage;
  });
  const costPerPercent =
    tier?.costPerPercent ??
    config.repairCostPerDamagePercent;

  return Math.ceil(repairAmount * costPerPercent);
}

export function purchaseRepairs({
  economyState,
  currentDamage,
  config,
  mobileCallout = false,
  discountRate = 0,
}) {
  const repairCost = getRepairPurchaseCost(
    currentDamage,
    config,
  );
  const baseCost = repairCost > 0
    ? repairCost +
      (mobileCallout ? config.mechanicCalloutFee : 0)
    : 0;
  const appliedDiscount = Math.min(0.5, Math.max(0, Number(discountRate) || 0));
  const cost = Math.round(baseCost * (1 - appliedDiscount));

  if (cost <= 0) {
    setTransaction(
      economyState,
      {
        type: "no-damage",
        amount: 0,
        label: "DANFO DOES NOT NEED REPAIRS",
      },
      config,
    );

    return {
      success: false,
      damage: currentDamage,
      cost: 0,
    };
  }

  if (economyState.money < cost) {
    setTransaction(
      economyState,
      {
        type: "insufficient-funds",
        amount: cost,
        label: "NOT ENOUGH MONEY FOR REPAIRS",
      },
      config,
    );

    return {
      success: false,
      damage: currentDamage,
      cost,
    };
  }

  economyState.money -= cost;
  economyState.totalExpenses += cost;

  setTransaction(
    economyState,
    {
      type: "repair-purchase",
      amount: cost,
      direction: "expense",
      label: mobileCallout
        ? "MOBILE MECHANIC REPAIR"
        : "DANFO REPAIRED",
    },
    config,
  );

  return {
    success: true,
    damage: 0,
    cost,
  };
}

export function updateEconomyFeedback(economyState, deltaSeconds) {
  economyState.feedbackSecondsRemaining = clamp(
    economyState.feedbackSecondsRemaining - deltaSeconds,
    0,
    Number.POSITIVE_INFINITY,
  );

  if (
    economyState.feedbackSecondsRemaining === 0 &&
    !economyState.gameOver
  ) {
    economyState.lastTransaction = null;
  }
}
