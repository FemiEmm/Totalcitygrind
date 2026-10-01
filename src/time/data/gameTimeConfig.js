export const MINUTES_PER_DAY = 24 * 60;

export const GAME_TIME_CONFIG = Object.freeze({
  startingDay: 1,
  startingHour: 6,
  startingMinute: 0,

  // Standard pace: one in-game minute per real second makes one day 24 minutes.
  gameMinutesPerRealSecond: 1,

  trafficPeriods: Object.freeze([
    Object.freeze({
      id: "morning-rush",
      label: "MORNING RUSH",
      startMinute: 6 * 60,
      endMinute: 9 * 60,
      densityMultiplier: 1.8,
    }),
    Object.freeze({
      id: "evening-rush",
      label: "EVENING RUSH",
      startMinute: 17 * 60,
      endMinute: 22 * 60,
      densityMultiplier: 2,
    }),
  ]),

  normalTraffic: Object.freeze({
    id: "normal",
    label: "NORMAL",
    densityMultiplier: 1,
  }),
});
