function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function createPlayerStatusState(config) {
  return {
    health: config.maximumHealth,
    energy: config.maximumEnergy,
    dryGinCrashAtGameMinute: null,
  };
}

export function getAbsoluteGameMinute(clock) {
  return (clock.day - 1) * 24 * 60 + clock.minuteOfDay;
}

export function updatePlayerEnergy({
  status,
  elapsedGameMinutes,
  absoluteGameMinute,
  config,
}) {
  const energyPerGameMinute =
    config.maximumEnergy /
    (config.energyHoursFromFullToEmpty * 60);

  status.energy = clamp(
    status.energy - Math.max(0, elapsedGameMinutes) * energyPerGameMinute,
    0,
    config.maximumEnergy,
  );

  if (
    status.dryGinCrashAtGameMinute !== null &&
    absoluteGameMinute >= status.dryGinCrashAtGameMinute
  ) {
    status.energy = Math.min(
      status.energy,
      config.dryGinCrashEnergy,
    );
    status.dryGinCrashAtGameMinute = null;
  }
}

export function applyCollisionHealthLoss({
  status,
  collisionDamage,
  maximumCollisionDamage,
  config,
}) {
  if (collisionDamage <= 0) {
    return 0;
  }

  const severity = clamp(
    collisionDamage / Math.max(1, maximumCollisionDamage),
    0,
    1,
  );
  const healthLoss = Math.max(
    1,
    Math.round(
      severity * config.collisionHealthLossMaximum,
    ),
  );

  status.health = clamp(
    status.health - healthLoss,
    0,
    config.maximumHealth,
  );

  return healthLoss;
}

export function consumeFood({
  status,
  item,
  absoluteGameMinute,
  config,
}) {
  status.energy = clamp(
    status.energy + item.energy,
    0,
    config.maximumEnergy,
  );

  if (item.delayedCrash) {
    status.dryGinCrashAtGameMinute =
      absoluteGameMinute + config.dryGinCrashAfterMinutes;
  }
}

export function restorePlayerHealth(status, config) {
  const restored =
    config.maximumHealth - status.health;
  status.health = config.maximumHealth;
  return restored;
}

export function restoreEnergyFromSleep(
  status,
  hours,
  config,
) {
  status.energy = clamp(
    status.energy + hours * config.sleepEnergyPerHour,
    0,
    config.maximumEnergy,
  );
  status.dryGinCrashAtGameMinute = null;
}

