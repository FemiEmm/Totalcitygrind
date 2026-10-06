const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const positive = value => Math.max(0, number(value));
const unique = value => [...new Set(Array.isArray(value) ? value : [])];

// Pure calculation shared with Backender. Borrowed/job vehicles and rented homes have no owned value.
export function calculateNetWorth(state = {}, catalogue) {
  const economy = state.economyState || {};
  const property = state.propertyState || {};
  const business = state.businessState || {};
  const market = state.stockMarketState || {};
  const cash = number(economy.money);
  const savings = positive(state.bankSavingsState?.balance);
  const stocks = Object.entries(catalogue.stocks).reduce((sum, [id, fallback]) =>
    sum + Math.floor(positive(market.holdings?.[id])) * positive(market.prices?.[id] ?? fallback), 0);
  const properties = unique(property.ownedPropertyIds).reduce((sum, id) => sum + positive(catalogue.properties[id]), 0);
  const vehicles = unique(economy.ownedVehicleIds).reduce((sum, id) => sum + positive(catalogue.vehicles[id]), 0);
  const businesses = (business.officeOwned ? catalogue.businessOffice : 0) + Object.entries(catalogue.businesses).reduce((sum, [id, asset]) =>
    sum + Math.min(asset.max, Math.floor(positive(business.assetCounts?.[id]))) * asset.price, 0);
  // loanBalance mirrors the two balances; mortgage arrears are already included in mortgage.balance.
  const loans = economy.quickLoanBalance != null || economy.bankLoanBalance != null
    ? positive(economy.quickLoanBalance) + positive(economy.bankLoanBalance) : positive(economy.loanBalance);
  const debts = loans + positive(property.mortgage?.balance);
  return { cash, savings, stocks, properties, vehicles, businesses, debts,
    total: Math.round(cash + savings + stocks + properties + vehicles + businesses - debts) };
}

export function rankWealth(rows) {
  const sorted = [...rows].sort((a, b) => b.wealth - a.wealth || Number(Boolean(a.fictional)) - Number(Boolean(b.fictional)) || a.id.localeCompare(b.id));
  let rank = 0;
  return sorted.map((row, index) => {
    if (!index || row.wealth !== sorted[index - 1].wealth) rank = index + 1;
    return { ...row, rank };
  });
}
