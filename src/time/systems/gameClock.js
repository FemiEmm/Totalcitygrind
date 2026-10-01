import { MINUTES_PER_DAY } from "../data/gameTimeConfig.js";

function normaliseMinuteOfDay(minutes) {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function isMinuteInsidePeriod(minuteOfDay, startMinute, endMinute) {
  if (startMinute <= endMinute) {
    return minuteOfDay >= startMinute && minuteOfDay < endMinute;
  }

  return minuteOfDay >= startMinute || minuteOfDay < endMinute;
}

export function createGameClock(config) {
  return {
    day: config.startingDay,
    minuteOfDay:
      config.startingHour * 60 +
      config.startingMinute,
  };
}

export function updateGameClock(clock, deltaSeconds, config) {
  clock.minuteOfDay +=
    deltaSeconds * config.gameMinutesPerRealSecond;

  while (clock.minuteOfDay >= MINUTES_PER_DAY) {
    clock.minuteOfDay -= MINUTES_PER_DAY;
    clock.day += 1;
  }
}

export function formatGameTime(minuteOfDay) {
  const normalisedMinutes = normaliseMinuteOfDay(minuteOfDay);
  const totalWholeMinutes = Math.floor(normalisedMinutes);
  const hour24 = Math.floor(totalWholeMinutes / 60);
  const minute = totalWholeMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${padNumber(minute)} ${period}`;
}

export function getTrafficPeriod(minuteOfDay, config) {
  const normalisedMinutes = normaliseMinuteOfDay(minuteOfDay);

  return (
    config.trafficPeriods.find((period) => {
      return isMinuteInsidePeriod(
        normalisedMinutes,
        period.startMinute,
        period.endMinute,
      );
    }) ?? config.normalTraffic
  );
}
