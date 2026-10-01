function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function hashText(text) {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getWaitingCount(routeId, stopId, stopIndex, config) {
  const range =
    config.maximumWaitingPerStop -
    config.minimumWaitingPerStop +
    1;

  return (
    config.minimumWaitingPerStop +
    (hashText(`${routeId}:${stopId}:${stopIndex}`) % range)
  );
}

function createPassenger({
  passengerNumber,
  route,
  boardedStopIndex,
  destinationStopIndex,
  config,
}) {
  const travelledStops = destinationStopIndex - boardedStopIndex;

  return {
    id: `passenger-${passengerNumber}`,
    boardedStopId: route.stopIds[boardedStopIndex],
    destinationStopId: route.stopIds[destinationStopIndex],
    fare:
      config.baseFare +
      travelledStops * config.farePerStop,
  };
}

export function createDanfoPassengerState(config) {
  return {
    capacity: config.capacity,
    onboard: [],
    waitingByStopId: {},
    nextPassengerNumber: 1,
    lastStopResult: null,
    feedbackSecondsRemaining: 0,
  };
}

export function startDanfoPassengerRoute({
  passengerState,
  route,
  config,
}) {
  passengerState.capacity = config.capacity;
  passengerState.onboard = [];
  passengerState.waitingByStopId = {};
  passengerState.nextPassengerNumber = 1;
  passengerState.lastStopResult = null;
  passengerState.feedbackSecondsRemaining = 0;

  route.stopIds.forEach((stopId, stopIndex) => {
    const isFinalStop = stopIndex === route.stopIds.length - 1;

    passengerState.waitingByStopId[stopId] = isFinalStop
      ? 0
      : getWaitingCount(route.id, stopId, stopIndex, config);
  });
}

export function clearDanfoPassengerRoute(passengerState) {
  passengerState.onboard = [];
  passengerState.waitingByStopId = {};
  passengerState.nextPassengerNumber = 1;
  passengerState.lastStopResult = null;
  passengerState.feedbackSecondsRemaining = 0;
}

export function getWaitingPassengerCount(passengerState, stopId) {
  if (!stopId) {
    return 0;
  }

  return passengerState.waitingByStopId[stopId] ?? 0;
}

export function getAvailableSeatCount(passengerState) {
  return Math.max(
    0,
    passengerState.capacity - passengerState.onboard.length,
  );
}

export function processDanfoStop({
  passengerState,
  route,
  stop,
  stopIndex,
  config,
}) {
  const exitingPassengers = passengerState.onboard.filter(
    (passenger) => passenger.destinationStopId === stop.id,
  );

  const exitingPassengerIds = new Set(
    exitingPassengers.map((passenger) => passenger.id),
  );

  passengerState.onboard = passengerState.onboard.filter(
    (passenger) => !exitingPassengerIds.has(passenger.id),
  );

  const fareEarned = exitingPassengers.reduce(
    (total, passenger) => total + passenger.fare,
    0,
  );

  const isFinalStop = stopIndex >= route.stopIds.length - 1;
  const waitingCount = getWaitingPassengerCount(
    passengerState,
    stop.id,
  );

  let boardedCount = 0;

  if (!isFinalStop && waitingCount > 0) {
    const availableSeats = getAvailableSeatCount(passengerState);
    boardedCount = Math.min(availableSeats, waitingCount);
    const remainingDestinationCount =
      route.stopIds.length - stopIndex - 1;

    for (let index = 0; index < boardedCount; index += 1) {
      const destinationOffset =
        1 +
        (hashText(
          `${route.id}:${stop.id}:${passengerState.nextPassengerNumber}`,
        ) % remainingDestinationCount);

      passengerState.onboard.push(
        createPassenger({
          passengerNumber: passengerState.nextPassengerNumber,
          route,
          boardedStopIndex: stopIndex,
          destinationStopIndex: stopIndex + destinationOffset,
          config,
        }),
      );

      passengerState.nextPassengerNumber += 1;
    }

    passengerState.waitingByStopId[stop.id] =
      waitingCount - boardedCount;
  }

  const result = {
    stopId: stop.id,
    stopLabel: stop.label,
    boardedCount,
    exitedCount: exitingPassengers.length,
    fareEarned,
    remainingWaiting: getWaitingPassengerCount(
      passengerState,
      stop.id,
    ),
    occupiedSeats: passengerState.onboard.length,
    capacity: passengerState.capacity,
  };

  passengerState.lastStopResult = result;
  passengerState.feedbackSecondsRemaining = config.feedbackSeconds;

  return result;
}

export function updatePassengerFeedback(
  passengerState,
  deltaSeconds,
) {
  passengerState.feedbackSecondsRemaining = clamp(
    passengerState.feedbackSecondsRemaining - deltaSeconds,
    0,
    Number.POSITIVE_INFINITY,
  );

  if (passengerState.feedbackSecondsRemaining === 0) {
    passengerState.lastStopResult = null;
  }
}
