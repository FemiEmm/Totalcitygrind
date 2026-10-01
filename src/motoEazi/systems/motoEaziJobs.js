import { GRID_SIZE } from "../../world/data/mapConstants.js";

const RATING_HISTORY_LIMIT = 20;
const SECONDS_PER_TILE = 3;
const MINIMUM_EXPECTED_SECONDS = 60;
const MORNING_RUSH_START_MINUTE = 6 * 60;
const MORNING_RUSH_END_MINUTE = 9 * 60;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getExpectedRideSeconds(request) {
  if (!request?.pickup || !request.destinations?.length) {
    return MINIMUM_EXPECTED_SECONDS;
  }

  let distance = 0;
  let previous = request.pickup;
  request.destinations.forEach((destination) => {
    distance += distanceBetween(previous, destination);
    previous = destination;
  });

  const travelSeconds = (distance / GRID_SIZE) * SECONDS_PER_TILE;
  const stopAllowance = Math.max(0, request.destinations.length - 1) * 18;
  return Math.max(
    MINIMUM_EXPECTED_SECONDS,
    Math.round(travelSeconds + stopAllowance),
  );
}

function getCollisionStars(collisionCount) {
  if (collisionCount <= 0) return 5;
  if (collisionCount === 1) return 4;
  if (collisionCount === 2) return 3;
  if (collisionCount === 3) return 2;
  return 1;
}

function getTimePenalty(elapsedSeconds, expectedSeconds) {
  if (elapsedSeconds <= expectedSeconds) return 0;
  if (elapsedSeconds <= expectedSeconds * 1.25) return 1;
  return 2;
}

function getRideStars(request) {
  if (!request) return 5;
  return clamp(
    getCollisionStars(request.collisionCount ?? 0) -
      getTimePenalty(
        request.elapsedSeconds ?? 0,
        request.expectedSeconds ?? MINIMUM_EXPECTED_SECONDS,
      ),
    1,
    5,
  );
}

function getFareMultiplier(rating) {
  return 0.55 + (clamp(Number(rating) || 1, 1, 5) - 1) * 0.175;
}

function getRideDistanceTiles(request) {
  if (!request?.pickup || !request.destinations?.length) return 0;
  let distance = 0;
  let previous = request.pickup;
  request.destinations.forEach((destination) => {
    distance += distanceBetween(previous, destination);
    previous = destination;
  });
  return distance / GRID_SIZE;
}

function getDistanceFare(request) {
  const distanceTiles = getRideDistanceTiles(request);
  const extraStops = Math.max(0, (request?.destinations?.length ?? 1) - 1);
  const rawFare = 900 + distanceTiles * 245 + extraStops * 850;
  return Math.max(1800, Math.round(rawFare / 100) * 100);
}

function getRequestPoolForRating(requests, rating) {
  const sorted = [...requests].sort((first, second) => first.fare - second.fare);
  if (rating >= 4.5) return sorted.slice(Math.floor(sorted.length * 0.55));
  if (rating >= 3.5) return sorted.slice(Math.floor(sorted.length * 0.3));
  if (rating >= 2.5) return sorted;
  if (rating >= 1.5) return sorted.slice(0, Math.ceil(sorted.length * 0.7));
  return sorted.slice(0, Math.ceil(sorted.length * 0.45));
}

function resetActiveRideMetrics(state) {
  state.rideElapsedSeconds = 0;
  state.rideExpectedSeconds = 0;
  state.rideCollisionCount = 0;
  state.projectedStars = 5;
}

function isMorningRush(minuteOfDay) {
  const minute = ((Number(minuteOfDay) || 0) % (24 * 60) + 24 * 60) % (24 * 60);
  return minute >= MORNING_RUSH_START_MINUTE && minute < MORNING_RUSH_END_MINUTE;
}

function getOfferBatchSize(state, minuteOfDay) {
  const minimum = isMorningRush(minuteOfDay) ? 3 : 1;
  return minimum + (state.nextRequestIndex % 2);
}

function getNextOfferDelaySeconds(state) {
  return 4 + ((state.nextRequestIndex * 3 + state.offers.length) % 6);
}

function syncLegacyOffer(state) {
  state.offer = state.offers[0] ?? null;
}

function createOffer(state, requests) {
  const pool = getRequestPoolForRating(requests, state.driverRating);
  if (pool.length === 0) return null;

  const unavailableIds = new Set([
    ...state.offers.map((offer) => offer.id),
    ...(state.activeRequest ? [state.activeRequest.id] : []),
  ]);
  let baseRequest = null;
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = pool[(state.nextRequestIndex + offset) % pool.length];
    if (!unavailableIds.has(candidate.id)) {
      baseRequest = candidate;
      state.nextRequestIndex =
        (state.nextRequestIndex + offset + 1) % Math.max(1, pool.length);
      break;
    }
  }

  if (!baseRequest) return null;
  const distanceFare = getDistanceFare(baseRequest);
  const fare = Math.max(
    500,
    Math.round((distanceFare * getFareMultiplier(state.driverRating)) / 100) * 100,
  );
  const offer = {
    ...baseRequest,
    fare,
    distanceTiles: Number(getRideDistanceTiles(baseRequest).toFixed(1)),
    expectedSeconds: getExpectedRideSeconds(baseRequest),
  };
  state.offers.push(offer);
  syncLegacyOffer(state);
  return offer;
}

export function createMotoEaziState() {
  return {
    nextRequestIndex: 0,
    offers: [],
    offer: null,
    waitingForOffers: false,
    pendingOfferCount: 0,
    secondsUntilNextOffer: 0,
    activeRequest: null,
    stage: "idle",
    destinationIndex: 0,
    completedRequestIds: [],
    rejectedCount: 0,
    driverRating: 5,
    ratingHistory: [],
    rideElapsedSeconds: 0,
    rideExpectedSeconds: 0,
    rideCollisionCount: 0,
    projectedStars: 5,
    lastRideResult: null,
  };
}

export function restoreMotoEaziState(state, savedState, requests) {
  Object.assign(state, createMotoEaziState(), savedState ?? {});

  const requestById = new Map(
    requests.map((request) => [request.id, request]),
  );
  const restoreRequest = (savedRequest) => {
    if (!savedRequest?.id) return null;
    const baseRequest = requestById.get(savedRequest.id);
    return baseRequest ? { ...baseRequest, ...savedRequest } : null;
  };

  const savedOffers = Array.isArray(savedState?.offers)
    ? savedState.offers
    : savedState?.offer
      ? [savedState.offer]
      : [];
  state.offers = savedOffers.map(restoreRequest).filter(Boolean);
  syncLegacyOffer(state);
  state.pendingOfferCount = Math.max(
    0,
    Math.floor(Number(savedState?.pendingOfferCount) || 0),
  );
  state.secondsUntilNextOffer = Math.max(
    0,
    Number(savedState?.secondsUntilNextOffer) || 0,
  );
  state.waitingForOffers =
    Boolean(savedState?.waitingForOffers) && state.pendingOfferCount > 0;
  state.activeRequest = restoreRequest(savedState?.activeRequest);
  state.ratingHistory = (savedState?.ratingHistory ?? [])
    .map((rating) => clamp(Math.round(Number(rating) || 1), 1, 5))
    .slice(-RATING_HISTORY_LIMIT);
  state.driverRating = clamp(Number(savedState?.driverRating) || 5, 1, 5);

  if (!state.activeRequest) {
    state.stage = "idle";
    state.destinationIndex = 0;
    resetActiveRideMetrics(state);
  } else {
    state.stage = state.stage === "dropoff" ? "dropoff" : "pickup";
    state.destinationIndex = Math.min(
      Math.max(0, Number(state.destinationIndex) || 0),
      state.activeRequest.destinations.length - 1,
    );
    state.rideElapsedSeconds = Math.max(0, Number(state.rideElapsedSeconds) || 0);
    state.rideExpectedSeconds = Math.max(
      MINIMUM_EXPECTED_SECONDS,
      Number(state.rideExpectedSeconds) || getExpectedRideSeconds(state.activeRequest),
    );
    state.rideCollisionCount = Math.max(
      0,
      Math.floor(Number(state.rideCollisionCount) || 0),
    );
    state.projectedStars = getRideStars({
      collisionCount: state.rideCollisionCount,
      elapsedSeconds: state.rideElapsedSeconds,
      expectedSeconds: state.rideExpectedSeconds,
    });
  }

  return state;
}

export function waitForMotoEaziRequest(state, requests, minuteOfDay = 0) {
  if (
    state.activeRequest ||
    state.waitingForOffers ||
    state.offers.length > 0 ||
    requests.length === 0
  ) {
    return state.offers;
  }

  const batchSize = getOfferBatchSize(state, minuteOfDay);
  state.pendingOfferCount = batchSize;
  state.waitingForOffers = true;
  state.secondsUntilNextOffer = 0.75;
  return state.offers;
}

export function updateMotoEaziOffers({
  state,
  requests,
  deltaSeconds = 0,
}) {
  if (
    state.activeRequest ||
    !state.waitingForOffers ||
    state.pendingOfferCount <= 0
  ) {
    return null;
  }

  state.secondsUntilNextOffer -= Math.max(0, Number(deltaSeconds) || 0);
  if (state.secondsUntilNextOffer > 0) return null;

  const offer = createOffer(state, requests);
  state.pendingOfferCount -= 1;
  if (state.pendingOfferCount <= 0 || !offer) {
    state.pendingOfferCount = 0;
    state.waitingForOffers = false;
    state.secondsUntilNextOffer = 0;
  } else {
    state.secondsUntilNextOffer = getNextOfferDelaySeconds(state);
  }
  return offer;
}

export function acceptMotoEaziRequest(state, requestId = null) {
  if (state.offers.length === 0 || state.activeRequest) {
    return false;
  }

  const selectedOffer =
    state.offers.find((offer) => offer.id === requestId) ?? state.offers[0];
  state.activeRequest = { ...selectedOffer };
  state.offers = [];
  state.offer = null;
  state.waitingForOffers = false;
  state.pendingOfferCount = 0;
  state.secondsUntilNextOffer = 0;
  state.stage = "pickup";
  state.destinationIndex = 0;
  resetActiveRideMetrics(state);
  state.rideExpectedSeconds = getExpectedRideSeconds(state.activeRequest);
  return true;
}

export function rejectMotoEaziRequest(state, requestId = null) {
  if (state.offers.length === 0) {
    return false;
  }

  const rejectedIndex = requestId
    ? state.offers.findIndex((offer) => offer.id === requestId)
    : 0;
  if (rejectedIndex < 0) return false;
  state.offers.splice(rejectedIndex, 1);
  syncLegacyOffer(state);
  state.rejectedCount += 1;
  return true;
}
export function getMotoEaziTarget(state) {
  if (!state.activeRequest) {
    return null;
  }

  if (state.stage === "pickup") {
    return state.activeRequest.pickup;
  }

  return state.activeRequest.destinations[state.destinationIndex] ?? null;
}

export function recordMotoEaziCollision(state) {
  if (!state.activeRequest || state.stage !== "dropoff") return false;
  state.rideCollisionCount += 1;
  state.projectedStars = getRideStars({
    collisionCount: state.rideCollisionCount,
    elapsedSeconds: state.rideElapsedSeconds,
    expectedSeconds: state.rideExpectedSeconds,
  });
  return true;
}

export function updateMotoEaziJob({
  state,
  vehicle,
  speedKmh,
  deltaSeconds = 0,
  detectionRadius = 85,
}) {
  if (state.activeRequest && state.stage === "dropoff") {
    state.rideElapsedSeconds += Math.max(0, Number(deltaSeconds) || 0);
    state.projectedStars = getRideStars({
      collisionCount: state.rideCollisionCount,
      elapsedSeconds: state.rideElapsedSeconds,
      expectedSeconds: state.rideExpectedSeconds,
    });
  }

  const target = getMotoEaziTarget(state);

  if (
    !target ||
    speedKmh > 5 ||
    Math.hypot(vehicle.x - target.x, vehicle.y - target.y) > detectionRadius
  ) {
    return null;
  }

  if (state.stage === "pickup") {
    state.stage = "dropoff";
    state.destinationIndex = 0;
    state.rideElapsedSeconds = 0;
    state.rideCollisionCount = 0;
    state.projectedStars = 5;
    state.rideExpectedSeconds = getExpectedRideSeconds(state.activeRequest);
    return {
      type: "passenger-picked-up",
      request: state.activeRequest,
      expectedSeconds: state.rideExpectedSeconds,
    };
  }

  if (state.destinationIndex < state.activeRequest.destinations.length - 1) {
    state.destinationIndex += 1;
    return {
      type: "drop-complete",
      request: state.activeRequest,
    };
  }

  const completedRequest = state.activeRequest;
  const stars = getRideStars({
    collisionCount: state.rideCollisionCount,
    elapsedSeconds: state.rideElapsedSeconds,
    expectedSeconds: state.rideExpectedSeconds,
  });
  state.ratingHistory.push(stars);
  state.ratingHistory = state.ratingHistory.slice(-RATING_HISTORY_LIMIT);
  state.driverRating = Number(
    (
      state.ratingHistory.reduce((total, rating) => total + rating, 0) /
      state.ratingHistory.length
    ).toFixed(1),
  );
  state.lastRideResult = {
    stars,
    collisionCount: state.rideCollisionCount,
    elapsedSeconds: Math.round(state.rideElapsedSeconds),
    expectedSeconds: state.rideExpectedSeconds,
    fare: completedRequest.fare,
  };
  state.completedRequestIds.push(completedRequest.id);
  state.completedRequestIds = state.completedRequestIds.slice(-100);
  state.activeRequest = null;
  state.stage = "idle";
  state.destinationIndex = 0;
  resetActiveRideMetrics(state);

  return {
    type: "request-complete",
    request: completedRequest,
    fare: completedRequest.fare,
    stars,
    driverRating: state.driverRating,
    result: state.lastRideResult,
  };
}