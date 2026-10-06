import { FAMILY_REQUESTS } from "./familyRequests.js";

export const LIFE_OBLIGATION_CONFIG = Object.freeze({
  weeklyRent: 20000,
  firstRentDueDay: 7,
  rentReminderDays: 2,
  rentGraceDays: 2,
  rentLateFeeRate: 0.1,
  schoolFeesAmount: 75000,
  schoolFeesDeadlineDays: 90,
  schoolFeesReminderDays: 14,
  schoolFeesUrgentReminderDays: 4,
  schoolFeesUrgentWindowDays: 14,
  schoolFeesPartialAmount: 25000,
  familyRequestDelayDays: 7,
  familyRequestReminderDays: 10,
  familyRequests: FAMILY_REQUESTS,
});
