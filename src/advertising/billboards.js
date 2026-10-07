export const PLACE_AD_PRICE = 10000;
export const PLACE_AD_SLOT_MINUTES = 30;
export const PLACE_AD_TIME_ZONE = "Africa/Lagos";

export const BILLBOARDS = Object.freeze([
  Object.freeze({ id: "billboard-01", label: "Billboard 1", buildingId: "residential-plot-001", district: "Ifako-Ijaiye LGA", gridX: 29, gridY: 2 }),
  Object.freeze({ id: "billboard-02", label: "Billboard 2", buildingId: "residential-plot-002", district: "Ifako-Ijaiye LGA", gridX: 27, gridY: 9 }),
  Object.freeze({ id: "billboard-03", label: "Billboard 3", buildingId: "residential-plot-003", district: "Ifako-Ijaiye LGA", gridX: 18, gridY: 11 }),
  Object.freeze({ id: "billboard-04", label: "Billboard 4", buildingId: "residential-plot-005", district: "Ifako-Ijaiye LGA", gridX: 27, gridY: 14 }),
  Object.freeze({ id: "billboard-05", label: "Billboard 5", buildingId: "work-plot-003", district: "Ikeja LGA", gridX: 53, gridY: 2 }),
  Object.freeze({ id: "billboard-06", label: "Billboard 6", buildingId: "work-plot-010", district: "Ikeja LGA", gridX: 54, gridY: 5 }),
  Object.freeze({ id: "billboard-07", label: "Billboard 7", buildingId: "work-plot-012", district: "Ikeja LGA", gridX: 37, gridY: 9 }),
  Object.freeze({ id: "billboard-08", label: "Billboard 8", buildingId: "work-plot-013", district: "Ikeja LGA", gridX: 39, gridY: 9 }),
  Object.freeze({ id: "billboard-09", label: "Billboard 9", buildingId: "nightlife-plot-017", district: "Mushin LGA", gridX: 32, gridY: 25 }),
  Object.freeze({ id: "billboard-10", label: "Billboard 10", buildingId: "nightlife-plot-021", district: "Mushin LGA", gridX: 55, gridY: 25 }),
]);

export const BILLBOARD_BY_BUILDING_ID = new Map(BILLBOARDS.map((billboard) => [billboard.buildingId, billboard]));
export const BILLBOARD_BY_ID = new Map(BILLBOARDS.map((billboard) => [billboard.id, billboard]));

function zonedParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLACE_AD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function realWorldAdDate(date = new Date()) {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function realWorldAdSlot(date = new Date()) {
  const parts = zonedParts(date);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return Math.floor(minutes / PLACE_AD_SLOT_MINUTES);
}

export function activeAdForBillboard(bookings, billboardId, date = new Date()) {
  const today = realWorldAdDate(date);
  const ordered = (Array.isArray(bookings) ? bookings : [])
    .filter((booking) => booking.billboardId === billboardId && booking.bookingDate === today)
    .slice()
    .sort((first, second) => Number(first.createdAt) - Number(second.createdAt) || String(first.id).localeCompare(String(second.id)));
  if (!ordered.length) return null;
  return ordered[realWorldAdSlot(date) % ordered.length] || null;
}

export function scheduledTimesForBooking(bookings, bookingId) {
  const ordered = (Array.isArray(bookings) ? bookings : [])
    .slice()
    .sort((first, second) => Number(first.createdAt) - Number(second.createdAt) || String(first.id).localeCompare(String(second.id)));
  const index = ordered.findIndex((booking) => booking.id === bookingId);
  if (index < 0 || !ordered.length) return [];
  const slotsPerDay = (24 * 60) / PLACE_AD_SLOT_MINUTES;
  const result = [];
  for (let slot = index; slot < slotsPerDay; slot += ordered.length) {
    const totalMinutes = slot * PLACE_AD_SLOT_MINUTES;
    const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minute = String(totalMinutes % 60).padStart(2, "0");
    result.push(`${hour}:${minute}`);
  }
  return result;
}
