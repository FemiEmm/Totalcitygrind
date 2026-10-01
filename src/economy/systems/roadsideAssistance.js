function getZoneCentre(zone) {
  return {
    x: zone.x + (zone.width ?? 0) / 2,
    y: zone.y + (zone.height ?? 0) / 2,
  };
}

export function findNearestFuelService(
  player,
  fuelPumps,
  fallbackPosition,
) {
  const candidates = fuelPumps.map((fuelPump) => ({
    fuelPump,
    position: getZoneCentre(fuelPump),
  }));

  if (candidates.length === 0) {
    return {
      fuelPump: null,
      position: {
        x: fallbackPosition.x,
        y: fallbackPosition.y,
      },
    };
  }

  return candidates.reduce((nearest, candidate) => {
    const distance = Math.hypot(
      player.x - candidate.position.x,
      player.y - candidate.position.y,
    );

    if (!nearest || distance < nearest.distance) {
      return { ...candidate, distance };
    }

    return nearest;
  }, null);
}

export function getRoadsideFuelQuote({
  player,
  fuelPumps,
  fallbackPosition,
  currentFuel,
  gridSize,
  config,
}) {
  const nearestService = findNearestFuelService(
    player,
    fuelPumps,
    fallbackPosition,
  );
  const distanceWorldUnits = Math.hypot(
    player.x - nearestService.position.x,
    player.y - nearestService.position.y,
  );
  const distanceTiles = Math.max(
    0,
    distanceWorldUnits / Math.max(1, gridSize),
  );
  const deliveredFuelPercent = Math.min(
    config.roadsideFuelDeliveryPercent,
    Math.max(0, 100 - currentFuel),
  );
  const deliveredLitres =
    (deliveredFuelPercent / 100) *
    config.fuelTankCapacityLitres;
  const fuelCost = deliveredLitres * config.fuelCostPerLitre;
  const deliveryCost =
    config.roadsideFuelBaseFee +
    distanceTiles * config.roadsideFuelDistanceFeePerTile;

  return {
    cost: Math.ceil(fuelCost + deliveryCost),
    deliveredFuelPercent,
    distanceTiles,
    nearestService,
  };
}
