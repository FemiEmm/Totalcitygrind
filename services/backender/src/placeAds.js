export const PLACE_AD_PRICE = 10000;
export const PLACE_AD_TIME_ZONE = 'Africa/Lagos';
export const BILLBOARD_IDS = new Set(Array.from({ length: 10 }, (_, index) => `billboard-${String(index + 1).padStart(2, '0')}`));

export function realWorldAdDate(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: PLACE_AD_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function validateBookingDate(value) {
  const date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error('Choose a valid real-world date'), { status: 400 });
  const today = realWorldAdDate();
  if (date < today) throw Object.assign(new Error('Choose today or a future date'), { status: 400 });
  const todayUtc = Date.parse(`${today}T00:00:00Z`);
  const chosenUtc = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(chosenUtc) || chosenUtc - todayUtc > 90 * 86400000) throw Object.assign(new Error('Ads can be booked up to 90 days ahead'), { status: 400 });
  return date;
}

export function validateImagePath(value, { playerId, billboardId, bookingDate }) {
  const path = String(value || '');
  const escapedPlayer = String(playerId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedBillboard = String(billboardId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedDate = String(bookingDate).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedDate}/${escapedBillboard}/${escapedPlayer}-[A-Za-z0-9-]+\\.(png|jpg|webp)$`);
  if (!pattern.test(path)) throw Object.assign(new Error('Invalid ad image upload path'), { status: 400 });
  return path;
}
