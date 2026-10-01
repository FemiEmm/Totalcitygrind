import { MUTIU_STREET_RACE } from "../data/illegalStreetRace.js";

function moveTowards(value, target, maximumChange) {
  if (value < target) return Math.min(value + maximumChange, target);
  if (value > target) return Math.max(value - maximumChange, target);
  return target;
}

function normaliseAngle(angle) {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function turnTowards(current, target, maximumChange) {
  const difference = normaliseAngle(target - current);
  return normaliseAngle(
    current + Math.max(-maximumChange, Math.min(maximumChange, difference)),
  );
}

function collisionRadius(vehicle, fallback = 36) {
  const width = Number(vehicle?.width ?? vehicle?.collisionWidth ?? fallback);
  const length = Number(vehicle?.length ?? vehicle?.collisionLength ?? fallback * 1.7);
  return Math.max(16, Math.min(width, length) * 0.48);
}

function overlapsVehicle(x, y, vehicle, other, padding = 4) {
  return Math.hypot(x - other.x, y - other.y) <
    collisionRadius(vehicle) + collisionRadius(other) + padding;
}

const COURSE_POINTS = [MUTIU_STREET_RACE.start, ...MUTIU_STREET_RACE.route];
const COURSE_SEGMENT_LENGTHS = COURSE_POINTS.slice(1).map((point, index) =>
  Math.hypot(point.x - COURSE_POINTS[index].x, point.y - COURSE_POINTS[index].y),
);

function progressAlongCourse(x, y) {
  let completedDistance = 0;
  let bestProgress = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < COURSE_POINTS.length - 1; index += 1) {
    const start = COURSE_POINTS[index];
    const end = COURSE_POINTS[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const projection = lengthSquared <= 0
      ? 0
      : Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared));
    const projectedX = start.x + dx * projection;
    const projectedY = start.y + dy * projection;
    const distance = Math.hypot(x - projectedX, y - projectedY);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestProgress = completedDistance + COURSE_SEGMENT_LENGTHS[index] * projection;
    }
    completedDistance += COURSE_SEGMENT_LENGTHS[index];
  }

  return bestProgress;
}

export function getIllegalStreetRaceLivePlace(state, player) {
  if (state.status === "complete" && state.playerPlace) return state.playerPlace;
  const playerProgress = progressAlongCourse(player.x, player.y);
  return 1 + state.opponents.filter((opponent) => {
    if (opponent.finishTime !== null) return true;
    return progressAlongCourse(opponent.x, opponent.y) > playerProgress + 2;
  }).length;
}

function createOpponent(definition, index) {
  return {
    ...definition,
    previousX: definition.x,
    previousY: definition.y,
    previousRotation: definition.rotation,
    speed: 0,
    finishTime: null,
    displayLabel: null,
    routeIndex: 0,
    evasionSide: index % 2 === 0 ? -1 : 1,
    evasionSeconds: 0,
    blockedSeconds: 0,
  };
}

export function createIllegalStreetRaceState() {
  return {
    status: "idle",
    countdownSeconds: 0,
    elapsedSeconds: 0,
    opponents: [],
    playerPlace: null,
    reward: 0,
    resultVisible: false,
  };
}

export function startIllegalStreetRace(state) {
  state.status = "countdown";
  state.countdownSeconds = MUTIU_STREET_RACE.countdownSeconds;
  state.elapsedSeconds = 0;
  state.opponents = MUTIU_STREET_RACE.opponents.map(createOpponent);
  state.playerPlace = null;
  state.reward = 0;
  state.resultVisible = false;
}

function canOpponentMove(state, opponent, x, y, player, playerConfig) {
  const playerProxy = {
    ...player,
    width: playerConfig?.width,
    length: playerConfig?.length,
  };
  if (overlapsVehicle(x, y, opponent, playerProxy, 2)) return false;

  return !state.opponents.some((other) =>
    other !== opponent &&
    other.finishTime === null &&
    overlapsVehicle(x, y, opponent, other, 2),
  );
}

function hasVehicleAhead(state, opponent, directionX, directionY, player, playerConfig) {
  const lookAhead = collisionRadius(opponent) * 2.8 + Math.max(30, opponent.speed * 0.35);
  const probeX = opponent.x + directionX * lookAhead;
  const probeY = opponent.y + directionY * lookAhead;
  return !canOpponentMove(state, opponent, probeX, probeY, player, playerConfig);
}

function updateOpponent(state, opponent, player, playerConfig, deltaSeconds) {
  opponent.previousX = opponent.x;
  opponent.previousY = opponent.y;
  opponent.previousRotation = opponent.rotation;
  if (opponent.finishTime !== null) return;

  const target = MUTIU_STREET_RACE.route[opponent.routeIndex];
  if (!target) {
    opponent.finishTime = state.elapsedSeconds;
    opponent.speed = 0;
    return;
  }

  const dx = target.x - opponent.x;
  const dy = target.y - opponent.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 18) {
    opponent.routeIndex += 1;
    if (opponent.routeIndex >= MUTIU_STREET_RACE.route.length) {
      opponent.x = MUTIU_STREET_RACE.finish.x;
      opponent.y = MUTIU_STREET_RACE.finish.y;
      opponent.finishTime = state.elapsedSeconds;
      opponent.speed = 0;
    }
    return;
  }

  const courseDirectionX = dx / distance;
  const courseDirectionY = dy / distance;
  if (
    opponent.evasionSeconds <= 0 &&
    hasVehicleAhead(
      state,
      opponent,
      courseDirectionX,
      courseDirectionY,
      player,
      playerConfig,
    )
  ) {
    opponent.evasionSeconds = 1.35;
  }

  const evading = opponent.evasionSeconds > 0;
  const lateralStrength = evading ? 0.82 * opponent.evasionSide : 0;
  const directionLength = Math.hypot(1, lateralStrength);
  const directionX =
    (courseDirectionX - courseDirectionY * lateralStrength) / directionLength;
  const directionY =
    (courseDirectionY + courseDirectionX * lateralStrength) / directionLength;
  const desiredRotation = Math.atan2(directionY, directionX) + Math.PI / 2;
  opponent.rotation = turnTowards(
    opponent.rotation,
    desiredRotation,
    Math.PI * 1.65 * deltaSeconds,
  );
  opponent.speed = moveTowards(
    opponent.speed,
    opponent.maximumSpeed,
    opponent.acceleration * deltaSeconds,
  );

  const travel = Math.min(distance, opponent.speed * deltaSeconds);
  let proposedX = opponent.x + directionX * travel;
  let proposedY = opponent.y + directionY * travel;
  let canMove = canOpponentMove(
    state,
    opponent,
    proposedX,
    proposedY,
    player,
    playerConfig,
  );

  if (!canMove) {
    opponent.blockedSeconds += deltaSeconds;
    opponent.evasionSeconds = Math.max(opponent.evasionSeconds, 1.35);
    const retreat = Math.min(12, travel * 0.35);
    proposedX = opponent.x - courseDirectionX * retreat;
    proposedY = opponent.y - courseDirectionY * retreat;
    canMove = canOpponentMove(
      state,
      opponent,
      proposedX,
      proposedY,
      player,
      playerConfig,
    );

    if (!canMove && opponent.blockedSeconds > 0.45) {
      opponent.evasionSide *= -1;
      opponent.blockedSeconds = 0;
    }
  } else {
    opponent.blockedSeconds = 0;
  }

  if (canMove) {
    opponent.x = proposedX;
    opponent.y = proposedY;
    opponent.evasionSeconds = Math.max(0, opponent.evasionSeconds - deltaSeconds);
  } else {
    opponent.speed *= 0.28;
  }
}

function resolvePlayerRaceCollision(state, player, playerConfig) {
  const playerProxy = {
    ...player,
    width: playerConfig?.width,
    length: playerConfig?.length,
  };
  const collision = state.opponents.find((opponent) =>
    opponent.finishTime === null &&
    overlapsVehicle(player.x, player.y, playerProxy, opponent, 1),
  );
  if (!collision) return false;

  const playerPreviousX = Number.isFinite(player.previousX)
    ? player.previousX
    : player.x;
  const playerPreviousY = Number.isFinite(player.previousY)
    ? player.previousY
    : player.y;
  const opponentPreviousX = Number.isFinite(collision.previousX)
    ? collision.previousX
    : collision.x;
  const opponentPreviousY = Number.isFinite(collision.previousY)
    ? collision.previousY
    : collision.y;
  const playerTravelX = player.x - playerPreviousX;
  const playerTravelY = player.y - playerPreviousY;
  const opponentTravelX = collision.x - opponentPreviousX;
  const opponentTravelY = collision.y - opponentPreviousY;
  let normalX = player.x - collision.x;
  let normalY = player.y - collision.y;
  const normalLength = Math.hypot(normalX, normalY);

  if (normalLength > 0.001) {
    normalX /= normalLength;
    normalY /= normalLength;
  } else {
    const fallbackLength = Math.hypot(opponentTravelX, opponentTravelY) || 1;
    normalX = opponentTravelX / fallbackLength;
    normalY = opponentTravelY / fallbackLength;
  }

  const playerClosing = playerTravelX * -normalX + playerTravelY * -normalY;
  const opponentClosing =
    opponentTravelX * normalX + opponentTravelY * normalY;
  const opponentHitPlayer = opponentClosing > playerClosing;
  const hitterRecoil = 5;
  const victimNudge = 3;

  // Return both vehicles to a safe frame, then nudge the hitter backwards and
  // the struck vehicle forwards. This is deliberately a small arcade bounce.
  player.x =
    playerPreviousX +
    normalX * (opponentHitPlayer ? victimNudge : hitterRecoil);
  player.y =
    playerPreviousY +
    normalY * (opponentHitPlayer ? victimNudge : hitterRecoil);
  collision.x =
    opponentPreviousX -
    normalX * (opponentHitPlayer ? hitterRecoil : victimNudge);
  collision.y =
    opponentPreviousY -
    normalY * (opponentHitPlayer ? hitterRecoil : victimNudge);
  player.speed = opponentHitPlayer
    ? Math.min(7, Math.max(3, Math.abs(player.speed ?? 0) * 0.1))
    : -Math.min(7, Math.max(3, Math.abs(player.speed ?? 0) * 0.1));
  collision.speed = opponentHitPlayer
    ? 0
    : Math.max(4, collision.speed * 0.3);
  collision.evasionSeconds = 1.1;
  collision.evasionSide *= -1;
  return true;
}

export function updateIllegalStreetRace(
  state,
  player,
  deltaSeconds,
  playerConfig = null,
) {
  const safeDelta = Math.max(0, deltaSeconds);
  if (state.status === "countdown") {
    state.countdownSeconds = Math.max(0, state.countdownSeconds - safeDelta);
    if (state.countdownSeconds <= 0) {
      state.status = "active";
      return { type: "started" };
    }
    return null;
  }

  if (state.status !== "active") return null;

  state.elapsedSeconds += safeDelta;
  state.opponents.forEach((opponent) => {
    updateOpponent(state, opponent, player, playerConfig, safeDelta);
  });
  resolvePlayerRaceCollision(state, player, playerConfig);

  if (
    Math.hypot(
      player.x - MUTIU_STREET_RACE.finish.x,
      player.y - MUTIU_STREET_RACE.finish.y,
    ) > MUTIU_STREET_RACE.finish.radius
  ) {
    return null;
  }

  state.playerPlace = 1 + state.opponents.filter((opponent) =>
    opponent.finishTime !== null,
  ).length;
  state.reward = MUTIU_STREET_RACE.rewards[state.playerPlace] ?? 0;
  state.status = "complete";
  state.resultVisible = true;

  return {
    type: "complete",
    place: state.playerPlace,
    reward: state.reward,
    elapsedSeconds: state.elapsedSeconds,
  };
}

export function resetIllegalStreetRace(state) {
  Object.assign(state, createIllegalStreetRaceState());
}