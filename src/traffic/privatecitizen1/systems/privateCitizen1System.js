import {
  PRIVATE_CITIZEN_1_ROUTE_ID,
} from "../data/privateCitizen1Route.js";

export function isPrivateCitizen1Vehicle(vehicle) {
  return vehicle?.routeId === PRIVATE_CITIZEN_1_ROUTE_ID;
}

export function ensurePrivateCitizen1Spawn({
  state,
  routes,
  createAndAddVehicle,
}) {
  const existingVehicle = state.vehicles.some((vehicle) => {
    return isPrivateCitizen1Vehicle(vehicle);
  });

  if (existingVehicle) {
    return false;
  }

  const route = routes.find((candidate) => {
    return candidate.id === PRIVATE_CITIZEN_1_ROUTE_ID;
  });

  if (!route) {
    return false;
  }

  return Boolean(createAndAddVehicle(route));
}

export function updatePrivateCitizen1StartWait(
  vehicle,
  deltaSeconds,
) {
  if (!isPrivateCitizen1Vehicle(vehicle)) {
    return false;
  }

  if (
    (vehicle.privateCitizen1StartWaitRemainingSeconds ?? 0) <= 0
  ) {
    return false;
  }

  vehicle.privateCitizen1StartWaitRemainingSeconds = Math.max(
    0,
    vehicle.privateCitizen1StartWaitRemainingSeconds -
      Math.max(0, deltaSeconds ?? 0),
  );

  vehicle.speed = 0;
  vehicle.blocked = false;
  vehicle.waitingAtPrivateCitizenStart = true;

  if (vehicle.privateCitizen1StartWaitRemainingSeconds <= 0) {
    vehicle.waitingAtPrivateCitizenStart = false;
  }

  return true;
}

export function releasePrivateCitizen1MergeReservation(
  vehicle,
  reservations,
) {
  const reservationKey =
    vehicle?.privateCitizen1MergeReservationKey ?? null;

  if (!reservationKey) {
    return false;
  }

  if (
    reservations instanceof Map &&
    reservations.get(reservationKey) === vehicle.id
  ) {
    reservations.delete(reservationKey);
  }

  vehicle.privateCitizen1MergeReservationKey = null;
  vehicle.waitingForPrivateCitizenMerge = false;
  return true;
}

/*
  Reserve the destination tile before Private Citizen 1 enters a merge.

  The occupancy callback checks the live traffic and player collision state.
  Returning true means the car must remain at its current waypoint.
*/
export function shouldBlockVehicleForPrivateCitizenMergeReservation({
  vehicleId,
  reservationOwner,
  proposedPositionOverlapsReservedTile,
}) {
  return Boolean(
    reservationOwner &&
    reservationOwner !== vehicleId &&
    proposedPositionOverlapsReservedTile
  );
}

export function updatePrivateCitizen1MergeReservation({
  vehicle,
  target,
  reservations,
  isReservationTileOccupied,
}) {
  if (!isPrivateCitizen1Vehicle(vehicle)) {
    return false;
  }

  if (!target?.reserveBeforeMerge) {
    releasePrivateCitizen1MergeReservation(
      vehicle,
      reservations,
    );
    return false;
  }

  if (!(reservations instanceof Map)) {
    vehicle.speed = 0;
    vehicle.blocked = true;
    vehicle.waitingForPrivateCitizenMerge = true;
    return true;
  }

  const column = target.reserveTileColumn ?? target.tileColumn;
  const row = target.reserveTileRow ?? target.tileRow;
  const reservationKey = `${column}:${row}`;

  if (
    vehicle.privateCitizen1MergeReservationKey &&
    vehicle.privateCitizen1MergeReservationKey !== reservationKey
  ) {
    releasePrivateCitizen1MergeReservation(
      vehicle,
      reservations,
    );
  }

  const existingOwner = reservations.get(reservationKey);

  if (existingOwner && existingOwner !== vehicle.id) {
    vehicle.speed = 0;
    vehicle.blocked = true;
    vehicle.waitingForPrivateCitizenMerge = true;
    vehicle.hardBlockedSeconds = 0;
    vehicle.towStallSeconds = 0;
    return true;
  }

  const tileOccupied = Boolean(
    isReservationTileOccupied?.({
      column,
      row,
    }),
  );

  // Do not create a reservation while any part of another vehicle is
  // inside the tile's safety area. Private Citizen 1 waits for a proper
  // gap first.
  if (!existingOwner && tileOccupied) {
    vehicle.speed = 0;
    vehicle.blocked = true;
    vehicle.waitingForPrivateCitizenMerge = true;
    vehicle.hardBlockedSeconds = 0;
    vehicle.towStallSeconds = 0;
    return true;
  }

  if (!existingOwner) {
    reservations.set(reservationKey, vehicle.id);
  }

  vehicle.privateCitizen1MergeReservationKey = reservationKey;

  // The player or another external vehicle may enter after the tile was
  // reserved. Keep the reservation, but wait until the safety area is
  // physically clear before merging.
  if (tileOccupied) {
    vehicle.speed = 0;
    vehicle.blocked = true;
    vehicle.waitingForPrivateCitizenMerge = true;
    vehicle.hardBlockedSeconds = 0;
    vehicle.towStallSeconds = 0;
    return true;
  }

  vehicle.waitingForPrivateCitizenMerge = false;
  return false;
}

/*
  Called before normal vehicle movement.

  Returns true while Private Citizen 1 must remain parked.
*/
export function updatePrivateCitizen1Dwell(
  vehicle,
  gameMinutesElapsed,
) {
  if (!isPrivateCitizen1Vehicle(vehicle)) {
    return false;
  }

  if ((vehicle.privateCitizen1DwellRemainingMinutes ?? 0) <= 0) {
    return false;
  }

  vehicle.privateCitizen1DwellRemainingMinutes = Math.max(
    0,
    vehicle.privateCitizen1DwellRemainingMinutes -
      Math.max(0, gameMinutesElapsed ?? 0),
  );

  vehicle.speed = 0;
  vehicle.blocked = false;
  vehicle.waitingAtPrivateCitizenStop = true;

  if (vehicle.privateCitizen1DwellRemainingMinutes <= 0) {
    vehicle.privateCitizen1CompletedDwellPointIndex =
      vehicle.pointIndex;
  }

  return true;
}

/*
  Called after the car reaches its current waypoint but before the normal
  route point is advanced.

  Returns true when a new parking wait has started.
*/
export function beginPrivateCitizen1WaypointDwell(vehicle) {
  if (!isPrivateCitizen1Vehicle(vehicle)) {
    return false;
  }

  const target = vehicle.route?.points?.[vehicle.pointIndex];
  const dwellMinutes = Math.max(0, target?.dwellMinutes ?? 0);

  if (
    dwellMinutes <= 0 ||
    vehicle.privateCitizen1CompletedDwellPointIndex ===
      vehicle.pointIndex
  ) {
    vehicle.waitingAtPrivateCitizenStop = false;
    vehicle.privateCitizen1CompletedDwellPointIndex = null;
    return false;
  }

  vehicle.privateCitizen1DwellRemainingMinutes = dwellMinutes;
  vehicle.waitingAtPrivateCitizenStop = true;
  vehicle.speed = 0;
  vehicle.blocked = false;
  return true;
}
