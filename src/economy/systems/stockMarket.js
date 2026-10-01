import { STOCK_COMPANIES } from "../data/stockMarket.js";

function seededMovement(day, companyId) {
  let hash = Math.max(1, Math.round(Number(day) || 1));
  for (const character of companyId) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 2654435761) >>> 0;
  }
  hash ^= hash << 13;
  hash ^= hash >>> 17;
  hash ^= hash << 5;
  return ((hash >>> 0) / 4294967295) * 2 - 1;
}

export function createStockMarketState() {
  return {
    lastUpdatedDay: 1,
    prices: Object.fromEntries(STOCK_COMPANIES.map((company) => [company.id, company.openingPrice])),
    previousPrices: Object.fromEntries(STOCK_COMPANIES.map((company) => [company.id, company.openingPrice])),
    holdings: Object.fromEntries(STOCK_COMPANIES.map((company) => [company.id, 0])),
    investedPrincipal: Object.fromEntries(STOCK_COMPANIES.map((company) => [company.id, 0])),
  };
}

export function restoreStockMarketState(state, savedState = {}) {
  const fresh = createStockMarketState();
  state.lastUpdatedDay = Math.max(1, Math.round(Number(savedState.lastUpdatedDay) || 1));
  state.prices = { ...fresh.prices, ...(savedState.prices ?? {}) };
  state.previousPrices = { ...fresh.previousPrices, ...(savedState.previousPrices ?? {}) };
  state.holdings = { ...fresh.holdings, ...(savedState.holdings ?? {}) };
  state.investedPrincipal = { ...fresh.investedPrincipal, ...(savedState.investedPrincipal ?? {}) };
  for (const company of STOCK_COMPANIES) {
    if (savedState.investedPrincipal?.[company.id] != null) continue;
    const quantity = Math.max(0, Math.round(Number(state.holdings[company.id]) || 0));
    const price = Math.max(25, Math.round(Number(state.prices[company.id]) || company.openingPrice));
    state.investedPrincipal[company.id] = quantity * price;
  }
}

export function updateStockMarketForDay(state, currentDay) {
  const targetDay = Math.max(1, Math.round(Number(currentDay) || 1));
  const payouts = [];
  while (state.lastUpdatedDay < targetDay) {
    const nextDay = state.lastUpdatedDay + 1;
    for (const company of STOCK_COMPANIES) {
      const currentPrice = Math.max(25, Math.round(Number(state.prices[company.id]) || company.openingPrice));
      state.previousPrices[company.id] = currentPrice;
      const movement = seededMovement(nextDay, company.id) * company.volatility;
      const nextPrice = Math.max(25, Math.round(currentPrice * (1 + movement)));
      state.prices[company.id] = nextPrice;
      const quantity = Math.max(0, Math.round(Number(state.holdings[company.id]) || 0));
      const change = (nextPrice - currentPrice) * quantity;
      if (change > 0) {
        payouts.push({ companyId: company.id, companyName: company.name, amount: change });
      } else if (change < 0) {
        state.investedPrincipal[company.id] = Math.max(
          0,
          Math.round(Number(state.investedPrincipal[company.id]) || 0) + change,
        );
      }
    }
    state.lastUpdatedDay = nextDay;
  }
  return {
    payouts,
    totalPayout: payouts.reduce((total, payout) => total + payout.amount, 0),
  };
}

export function getStockMarketView(state) {
  return STOCK_COMPANIES.map((company) => {
    const price = Math.max(25, Math.round(Number(state.prices[company.id]) || company.openingPrice));
    const previousPrice = Math.max(25, Math.round(Number(state.previousPrices[company.id]) || price));
    const quantity = Math.max(0, Math.round(Number(state.holdings[company.id]) || 0));
    const invested = Math.max(0, Math.round(Number(state.investedPrincipal[company.id]) || 0));
    return {
      ...company,
      price,
      previousPrice,
      changePercent: ((price - previousPrice) / previousPrice) * 100,
      quantity,
      // "Invested" is the player's remaining principal while "current" is
      // the live market value of the shares still held.
      investedAmount: invested,
      currentAmount: price * quantity,
      value: invested,
    };
  });
}

export function buyStock(state, companyId, availableMoney) {
  const price = Math.max(0, Math.round(Number(state.prices[companyId]) || 0));
  if (!price || Number(availableMoney) < price || !(companyId in state.holdings)) return null;
  state.holdings[companyId] = Math.max(0, Math.round(Number(state.holdings[companyId]) || 0)) + 1;
  state.investedPrincipal[companyId] = Math.max(0, Math.round(Number(state.investedPrincipal[companyId]) || 0)) + price;
  return price;
}

export function sellStock(state, companyId) {
  const quantity = Math.max(0, Math.round(Number(state.holdings[companyId]) || 0));
  const principal = Math.max(0, Math.round(Number(state.investedPrincipal[companyId]) || 0));
  if (quantity <= 0) return null;
  const proceeds = Math.max(0, Math.round(principal / quantity));
  state.holdings[companyId] = quantity - 1;
  state.investedPrincipal[companyId] = Math.max(0, principal - proceeds);
  return proceeds;
}

