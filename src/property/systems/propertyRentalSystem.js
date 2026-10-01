import { getPropertyById } from "../data/properties.js";

export function createRentalState(saved = null) {
  return {
    listings: saved?.listings && typeof saved.listings === "object"
      ? JSON.parse(JSON.stringify(saved.listings))
      : {},
    messages: Array.isArray(saved?.messages) ? saved.messages.slice(-30) : [],
  };
}

export function getRentalChance(propertyId, weeklyRent) {
  const fairRent = propertyId === "wealthy-estate-home" ? 85000 : 30000;
  return Math.max(15, Math.min(92, Math.round((fairRent / Math.max(1000, weeklyRent)) * 78)));
}

export function listOwnedHome({ propertyState, propertyId, weeklyRent, currentDay }) {
  const property = getPropertyById(propertyId);
  const rent = Math.max(1000, Math.round(Number(weeklyRent) || 0));
  if (!property || !propertyState.ownedPropertyIds.includes(propertyId) || propertyState.activeHomeId === propertyId) return null;
  const listing = {
    propertyId, weeklyRent: rent, chance: getRentalChance(propertyId, rent),
    status: "listed", listedDay: currentDay, nextCheckDay: currentDay + 1,
    nextDueDay: null, overdue: 0, lateCount: 0,
  };
  propertyState.rentals.listings[propertyId] = listing;
  addRentalMessage(propertyState, currentDay, propertyId, `${property.name} is on the market for ₦${rent.toLocaleString()} weekly. Tenant chance: ${listing.chance}%.`);
  return listing;
}

export function removeVacantListing(propertyState, propertyId, currentDay) {
  const listing = propertyState.rentals.listings[propertyId];
  if (!listing || listing.status === "rented") return false;
  delete propertyState.rentals.listings[propertyId];
  addRentalMessage(propertyState, currentDay, propertyId, "The vacant property was removed from the market.");
  return true;
}

export function handleLateTenant(propertyState, propertyId, action, currentDay) {
  const listing = propertyState.rentals.listings[propertyId];
  if (!listing || listing.status !== "late") return false;
  if (action === "evict") {
    Object.assign(listing, { status: "listed", overdue: 0, nextCheckDay: currentDay + 1, nextDueDay: null });
    addRentalMessage(propertyState, currentDay, propertyId, "The tenant was evicted. The house is vacant and listed again.");
  } else {
    listing.status = action === "remind" ? "reminded" : "patient";
    listing.nextDueDay = currentDay + (action === "remind" ? 1 : 3);
    addRentalMessage(propertyState, currentDay, propertyId, action === "remind" ? "The Realtor sent a firm reminder." : "You gave the tenant extra time to pay.");
  }
  return true;
}

export function processRentalDay(propertyState, currentDay, random = Math.random) {
  const events = [];
  Object.values(propertyState.rentals.listings).forEach((listing) => {
    const property = getPropertyById(listing.propertyId);
    if (!property || propertyState.activeHomeId === listing.propertyId) return;
    if (listing.status === "listed" && currentDay >= listing.nextCheckDay) {
      if (random() * 100 < listing.chance) {
        listing.status = "rented";
        listing.nextDueDay = currentDay + 7;
        events.push(messageEvent(propertyState, currentDay, listing.propertyId, `A tenant rented ${property.name} for ₦${listing.weeklyRent.toLocaleString()} weekly.`));
      } else listing.nextCheckDay = currentDay + 1;
      return;
    }
    if (!["rented", "patient", "reminded"].includes(listing.status) || currentDay < listing.nextDueDay) return;
    const lateChance = Math.min(0.32, 0.1 + listing.lateCount * 0.04);
    if (listing.status === "rented" && random() < lateChance) {
      listing.status = "late";
      listing.overdue += listing.weeklyRent;
      listing.lateCount += 1;
      events.push(messageEvent(propertyState, currentDay, listing.propertyId, `${property.name}'s tenant delayed the rent. You can wait, remind them, or evict.`, "late"));
      return;
    }
    const amount = listing.weeklyRent + listing.overdue;
    Object.assign(listing, { status: "rented", overdue: 0, nextDueDay: currentDay + 7, lateCount: Math.max(0, listing.lateCount - 1) });
    events.push({ ...messageEvent(propertyState, currentDay, listing.propertyId, `${property.name} rent received: ₦${amount.toLocaleString()}.`, "paid"), amount });
  });
  return events;
}

function messageEvent(propertyState, day, propertyId, text, type = "info") {
  addRentalMessage(propertyState, day, propertyId, text);
  return { type, propertyId, text };
}

function addRentalMessage(propertyState, day, propertyId, text) {
  propertyState.rentals.messages.push({ day, propertyId, text });
  propertyState.rentals.messages = propertyState.rentals.messages.slice(-30);
}
