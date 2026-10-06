import { STARTER_HOMES } from '../data/starterHomes.js';
import { getPropertyById } from "../data/properties.js";
import { createRentalState } from "./propertyRentalSystem.js";

export function createPropertyState() {
  return {
    activeHomeId: "starter-rental",
    starterHomeId: null,
    playerName: "Driver",
    ownedPropertyIds: [],
    mortgage: null,
    secondMapUnlocked: false,
    starterHomeRisk: {
      lastTheftDay: 0,
      missingCarPart: false,
    },
    rentals: createRentalState(),
  };
}

export function restorePropertyState(state, savedState) {
  if (!savedState) return;
  state.activeHomeId = savedState.activeHomeId ?? state.activeHomeId;
  state.starterHomeId = STARTER_HOMES.some(home => home.id === savedState.starterHomeId) ? savedState.starterHomeId : null;
  state.playerName = String(savedState.playerName || 'Driver').trim().slice(0, 24) || 'Driver';
  state.ownedPropertyIds = Array.isArray(savedState.ownedPropertyIds)
    ? [...savedState.ownedPropertyIds]
    : [];
  state.mortgage = savedState.mortgage ? { ...savedState.mortgage } : null;
  state.secondMapUnlocked = Boolean(savedState.secondMapUnlocked);
  state.starterHomeRisk = {
    lastTheftDay: Math.max(0, Number(savedState.starterHomeRisk?.lastTheftDay) || 0),
    missingCarPart: Boolean(savedState.starterHomeRisk?.missingCarPart),
  };
  state.rentals = createRentalState(savedState.rentals);
}

export function getPropertyPurchaseQuote(property, paymentMethod) {
  if (!property || property.tenure !== "ownership") return null;
  if (paymentMethod === "mortgage") {
    return {
      amountDueNow: property.deposit,
      financedAmount: property.price - property.deposit,
    };
  }
  return { amountDueNow: property.price, financedAmount: 0 };
}

export function purchaseProperty({
  state,
  propertyId,
  paymentMethod,
  money,
  savings = 0,
  currentDay,
}) {
  const property = getPropertyById(propertyId);
  const quote = getPropertyPurchaseQuote(property, paymentMethod);
  if (
    !property ||
    !quote ||
    state.ownedPropertyIds.includes(propertyId) ||
    (property.requiresPropertyId &&
      !state.ownedPropertyIds.includes(property.requiresPropertyId)) ||
    state.mortgage ||
    money + savings < quote.amountDueNow
  ) {
    return { success: false, amount: 0, property: null };
  }

  state.ownedPropertyIds.push(property.id);
  state.activeHomeId = property.id;
  state.secondMapUnlocked ||= property.id === "wealthy-estate-home";
  state.mortgage =
    paymentMethod === "mortgage"
      ? {
          propertyId: property.id,
          balance: quote.financedAmount,
          weeklyPayment: property.weeklyPayment,
          nextDueDay: currentDay + 7,
          paymentsRemaining: property.mortgageWeeks,
          arrears: 0,
          missedPayments: 0,
        }
      : null;

  return {
    success: true,
    amount: quote.amountDueNow,
    cashAmount: Math.min(Math.max(0, money), quote.amountDueNow),
    savingsAmount: Math.max(0, quote.amountDueNow - Math.max(0, money)),
    property,
    paymentMethod,
  };
}

export function processPropertyMortgageDay({
  state,
  currentDay,
  availableMoney,
  availableSavings = 0,
}) {
  const mortgage = state.mortgage;
  if (!mortgage || currentDay < mortgage.nextDueDay) return null;
  const amountDue = Math.min(mortgage.weeklyPayment + (mortgage.arrears || 0), mortgage.balance);
  const available = Math.max(0, availableMoney) + Math.max(0, availableSavings);
  const paidAmount = Math.min(amountDue, available);
  const cashAmount = Math.min(Math.max(0, availableMoney), paidAmount);
  const savingsAmount = Math.max(0, paidAmount - cashAmount);
  const unpaidAmount = Math.max(0, amountDue - paidAmount);
  mortgage.balance = Math.max(0, mortgage.balance - paidAmount);
  mortgage.nextDueDay += 7;
  if (unpaidAmount > 0) {
    const penalty = Math.max(1, Math.ceil(unpaidAmount * 0.1));
    mortgage.balance += penalty;
    mortgage.arrears = unpaidAmount + penalty;
    mortgage.missedPayments = Math.max(0, Number(mortgage.missedPayments) || 0) + 1;
    const propertyId = mortgage.propertyId;
    const repossessed = mortgage.missedPayments >= 5;
    if (repossessed) {
      state.ownedPropertyIds = state.ownedPropertyIds.filter((id) => id !== propertyId);
      state.activeHomeId = "starter-rental";
      if (propertyId === "wealthy-estate-home") state.secondMapUnlocked = false;
      state.mortgage = null;
    }
    return { type: "missed", amount: amountDue, paidAmount, cashAmount, savingsAmount, unpaidAmount, penalty, missedPayments: repossessed ? 5 : mortgage.missedPayments, repossessed, propertyId };
  }
  mortgage.arrears = 0;
  mortgage.missedPayments = 0;
  mortgage.paymentsRemaining = Math.max(0, Math.ceil(mortgage.balance / mortgage.weeklyPayment));
  if (mortgage.balance === 0) state.mortgage = null;
  return { type: "paid", amount: amountDue, paidAmount, cashAmount, savingsAmount };
}
export function getHomeSleepMultiplier(state) {
  if (state.activeHomeId === "wealthy-estate-home") return 1.2;
  if (getPropertyById(state.activeHomeId)?.tenure === "ownership") return 1.1;
  return 1;
}




