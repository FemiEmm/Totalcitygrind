function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function moveTowards(value, target, maximumChange) {
  if (value < target) {
    return Math.min(value + maximumChange, target);
  }

  if (value > target) {
    return Math.max(value - maximumChange, target);
  }

  return target;
}

function isPressed(pressedKeys, ...keys) {
  return keys.some((key) => pressedKeys.has(key));
}

function getGear(vehicle, config) {
  return config.gears[vehicle.gearIndex];
}

export function createPlayerVehicle(start, config) {
  return {
    x: start.x,
    y: start.y,
    rotation: start.rotation ?? 0,
    speed: 0,
    gearIndex: config.startingGearIndex,
    isParked: true,
    isColliding: false,
    collisionDamageCooldown: 0,
    collisionResponseCooldown: 0,
    lastSafeX: start.x,
    lastSafeY: start.y,
    lastSafeRotation: start.rotation ?? 0,
    shiftCooldown: 0,
    width: config.width,
    length: config.length,
  };
}

export function getVehicleGearLabel(vehicle, config) {
  if (vehicle.isParked) {
    return "P";
  }

  const gear = getGear(vehicle, config);

  if (
    config.transmission === "automatic" &&
    gear.direction > 0
  ) {
    return `D${gear.label}`;
  }

  return gear.label;
}

export function getVehicleSpeedKmh(vehicle, config) {
  return Math.round(
    Math.abs(vehicle.speed) * config.speedToKmh,
  );
}

export function shiftGearUp(vehicle, config) {
  const nextGearIndex = Math.min(
    vehicle.gearIndex + 1,
    config.gears.length - 1,
  );

  if (nextGearIndex === vehicle.gearIndex) {
    return false;
  }

  const nextGear = config.gears[nextGearIndex];

  if (
    nextGear.direction !== 0 &&
    Math.sign(vehicle.speed) !== 0 &&
    Math.sign(vehicle.speed) !== nextGear.direction &&
    Math.abs(vehicle.speed) > 5
  ) {
    return false;
  }

  vehicle.gearIndex = nextGearIndex;
  return true;
}

export function shiftGearDown(vehicle, config) {
  const nextGearIndex = Math.max(
    vehicle.gearIndex - 1,
    0,
  );

  if (nextGearIndex === vehicle.gearIndex) {
    return false;
  }

  const nextGear = config.gears[nextGearIndex];

  if (
    nextGear.direction !== 0 &&
    Math.sign(vehicle.speed) !== 0 &&
    Math.sign(vehicle.speed) !== nextGear.direction &&
    Math.abs(vehicle.speed) > 5
  ) {
    return false;
  }

  vehicle.gearIndex = nextGearIndex;
  return true;
}

export function getVehicleCollisionShape(
  vehicle,
  config,
  position = vehicle,
  padding = 0,
) {
  return {
    x: position.x,
    y: position.y,
    width: config.width + padding * 2,
    length: config.length + padding * 2,
    rotation: position.rotation,
  };
}

export function getVehicleCollisionBox(
  vehicle,
  config,
  position = vehicle,
) {
  const collisionShape = getVehicleCollisionShape(
    vehicle,
    config,
    position,
  );
  const halfWidth = collisionShape.width / 2;
  const halfLength = collisionShape.length / 2;
  const cosine = Math.cos(collisionShape.rotation);
  const sine = Math.sin(collisionShape.rotation);

  const corners = [
    { x: -halfWidth, y: -halfLength },
    { x: halfWidth, y: -halfLength },
    { x: halfWidth, y: halfLength },
    { x: -halfWidth, y: halfLength },
  ].map((corner) => ({
    x:
      collisionShape.x +
      corner.x * cosine -
      corner.y * sine,
    y:
      collisionShape.y +
      corner.x * sine +
      corner.y * cosine,
  }));

  const xValues = corners.map((corner) => corner.x);
  const yValues = corners.map((corner) => corner.y);
  const minimumX = Math.min(...xValues);
  const maximumX = Math.max(...xValues);
  const minimumY = Math.min(...yValues);
  const maximumY = Math.max(...yValues);

  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX,
    height: maximumY - minimumY,
  };
}

function applyRollingResistance(
  vehicle,
  deltaSeconds,
  config,
  neutral,
) {
  const resistance = neutral
    ? config.neutralRollingResistance
    : config.rollingResistance;

  vehicle.speed = moveTowards(
    vehicle.speed,
    0,
    resistance * deltaSeconds,
  );
}

function getAutomaticDriveGearIndex(vehicle, config) {
  const firstIndex = config.firstDriveGearIndex;
  const lastIndex = config.lastDriveGearIndex;

  if (
    vehicle.gearIndex < firstIndex ||
    vehicle.gearIndex > lastIndex
  ) {
    return firstIndex;
  }

  return vehicle.gearIndex;
}

function updateAutomaticTransmission(
  vehicle,
  pressedKeys,
  deltaSeconds,
  config,
) {
  vehicle.shiftCooldown = Math.max(
    0,
    vehicle.shiftCooldown - deltaSeconds,
  );

  const throttlePressed = isPressed(
    pressedKeys,
    "w",
    "arrowup",
  );

  const reversePressed = isPressed(
    pressedKeys,
    "s",
    "arrowdown",
  );

  if (vehicle.speed > 5) {
    vehicle.gearIndex = getAutomaticDriveGearIndex(
      vehicle,
      config,
    );
  } else if (vehicle.speed < -5) {
    vehicle.gearIndex = config.reverseGearIndex;
  } else if (reversePressed && !throttlePressed) {
    vehicle.gearIndex = config.reverseGearIndex;
  } else if (throttlePressed && !reversePressed) {
    vehicle.gearIndex = getAutomaticDriveGearIndex(
      vehicle,
      config,
    );
  }

  if (
    vehicle.shiftCooldown > 0 ||
    vehicle.speed <= 0 ||
    vehicle.gearIndex < config.firstDriveGearIndex
  ) {
    return;
  }

  const currentGear = getGear(vehicle, config);
  const nextGearIndex = Math.min(
    vehicle.gearIndex + 1,
    config.lastDriveGearIndex,
  );

  const previousGearIndex = Math.max(
    vehicle.gearIndex - 1,
    config.firstDriveGearIndex,
  );

  const shiftUpSpeed = currentGear.maxSpeed * 0.82;
  const previousGear = config.gears[previousGearIndex];
  const shiftDownSpeed = previousGear.maxSpeed * 0.68;

  if (
    throttlePressed &&
    vehicle.gearIndex < config.lastDriveGearIndex &&
    vehicle.speed >= shiftUpSpeed
  ) {
    vehicle.gearIndex = nextGearIndex;
    vehicle.shiftCooldown = config.automaticShiftDelay;
    return;
  }

  if (
    vehicle.gearIndex > config.firstDriveGearIndex &&
    vehicle.speed <= shiftDownSpeed
  ) {
    vehicle.gearIndex = previousGearIndex;
    vehicle.shiftCooldown = config.automaticShiftDelay;
  }
}

function updateAutomaticSpeed(
  vehicle,
  pressedKeys,
  deltaSeconds,
  config,
) {
  const throttlePressed = isPressed(
    pressedKeys,
    "w",
    "arrowup",
  );

  const reversePressed = isPressed(
    pressedKeys,
    "s",
    "arrowdown",
  );

  const gear = getGear(vehicle, config);

  if (throttlePressed && reversePressed) {
    vehicle.speed = moveTowards(
      vehicle.speed,
      0,
      config.braking * deltaSeconds,
    );
    return;
  }

  if (throttlePressed) {
    if (vehicle.speed < -5) {
      vehicle.speed = moveTowards(
        vehicle.speed,
        0,
        config.braking * deltaSeconds,
      );
      return;
    }

    const driveGear = getGear(vehicle, config);

    vehicle.speed = moveTowards(
      vehicle.speed,
      driveGear.maxSpeed,
      driveGear.acceleration * deltaSeconds,
    );
    return;
  }

  if (reversePressed) {
    if (vehicle.speed > 5) {
      vehicle.speed = moveTowards(
        vehicle.speed,
        0,
        config.braking * deltaSeconds,
      );
      return;
    }

    const reverseGear = config.gears[config.reverseGearIndex];

    vehicle.speed = moveTowards(
      vehicle.speed,
      -reverseGear.maxSpeed,
      reverseGear.acceleration * deltaSeconds,
    );
    return;
  }

  const exceedsGearLimit =
    gear.direction > 0 &&
    Math.abs(vehicle.speed) > gear.maxSpeed;

  if (exceedsGearLimit) {
    vehicle.speed = moveTowards(
      vehicle.speed,
      gear.maxSpeed,
      config.engineBraking * deltaSeconds,
    );
    return;
  }

  applyRollingResistance(
    vehicle,
    deltaSeconds,
    config,
    false,
  );
}

function updateManualSpeed(
  vehicle,
  pressedKeys,
  deltaSeconds,
  config,
) {
  const throttlePressed = isPressed(
    pressedKeys,
    "w",
    "arrowup",
  );

  const brakePressed = isPressed(
    pressedKeys,
    "s",
    "arrowdown",
  );

  const gear = getGear(vehicle, config);

  if (brakePressed) {
    vehicle.speed = moveTowards(
      vehicle.speed,
      0,
      config.braking * deltaSeconds,
    );
    return;
  }

  if (gear.direction === 0) {
    applyRollingResistance(
      vehicle,
      deltaSeconds,
      config,
      true,
    );
    return;
  }

  const targetSpeed =
    gear.maxSpeed * gear.direction;

  const movingAgainstGear =
    Math.sign(vehicle.speed) !== 0 &&
    Math.sign(vehicle.speed) !== gear.direction;

  if (movingAgainstGear) {
    vehicle.speed = moveTowards(
      vehicle.speed,
      0,
      config.braking * deltaSeconds,
    );
    return;
  }

  if (throttlePressed) {
    vehicle.speed = moveTowards(
      vehicle.speed,
      targetSpeed,
      gear.acceleration * deltaSeconds,
    );
    return;
  }

  const exceedsGearLimit =
    Math.abs(vehicle.speed) > gear.maxSpeed;

  if (exceedsGearLimit) {
    vehicle.speed = moveTowards(
      vehicle.speed,
      targetSpeed,
      config.engineBraking * deltaSeconds,
    );
    return;
  }

  applyRollingResistance(
    vehicle,
    deltaSeconds,
    config,
    false,
  );
}

function updateSpeed(vehicle, pressedKeys, deltaSeconds, config) {
  if (vehicle.isParked) {
    vehicle.speed = 0;
    return;
  }

  if (config.transmission === "automatic") {
    updateAutomaticTransmission(
      vehicle,
      pressedKeys,
      deltaSeconds,
      config,
    );

    updateAutomaticSpeed(
      vehicle,
      pressedKeys,
      deltaSeconds,
      config,
    );

    updateAutomaticTransmission(
      vehicle,
      pressedKeys,
      0,
      config,
    );

    return;
  }

  updateManualSpeed(
    vehicle,
    pressedKeys,
    deltaSeconds,
    config,
  );
}

function updateSteering(
  vehicle,
  pressedKeys,
  deltaSeconds,
  config,
  canOccupy,
  steeringBias = 0,
) {
  const steeringLeft = isPressed(
    pressedKeys,
    "a",
    "arrowleft",
  );

  const steeringRight = isPressed(
    pressedKeys,
    "d",
    "arrowright",
  );

  const steeringInput =
    clamp(Number(steeringRight) - Number(steeringLeft) + steeringBias, -1, 1);

  if (steeringInput === 0 || Math.abs(vehicle.speed) < 4) {
    return;
  }

  const speedRatio = clamp(
    Math.abs(vehicle.speed) / 90,
    0.25,
    1,
  );

  const reverseDirection = vehicle.speed < 0 ? -1 : 1;

  const nextRotation =
    vehicle.rotation +
    steeringInput *
      config.steeringSpeed *
      speedRatio *
      reverseDirection *
      deltaSeconds;

  const rotatedPosition = {
    x: vehicle.x,
    y: vehicle.y,
    rotation: nextRotation,
  };

  const rotatedCollisionShape = getVehicleCollisionShape(
    vehicle,
    config,
    rotatedPosition,
  );

  if (canOccupy(rotatedCollisionShape)) {
    vehicle.rotation = nextRotation;
  }
}

function getCollisionDamage(vehicle, config) {
  const speedKmh =
    Math.abs(vehicle.speed) * config.speedToKmh;

  if (
    speedKmh <
    config.collisionDamageMinimumSpeedKmh
  ) {
    return 0;
  }

  const damageRange =
    config.collisionDamageMaximumSpeedKmh -
    config.collisionDamageMinimumSpeedKmh;

  const speedAboveMinimum =
    speedKmh -
    config.collisionDamageMinimumSpeedKmh;

  const severity = clamp(
    speedAboveMinimum / damageRange,
    0,
    1,
  );

  return Math.max(
    1,
    Math.round(
      severity * config.collisionDamageMaximum,
    ),
  );
}

function updatePosition(
  vehicle,
  deltaSeconds,
  config,
  canOccupy,
) {
  vehicle.collisionDamageCooldown = Math.max(
    0,
    vehicle.collisionDamageCooldown - deltaSeconds,
  );

  const distance = vehicle.speed * deltaSeconds;

  if (Math.abs(distance) < 0.001) {
    vehicle.isColliding = false;

    return {
      collided: false,
      damage: 0,
    };
  }

  const movementX =
    Math.sin(vehicle.rotation) * distance;
  const movementY =
    -Math.cos(vehicle.rotation) * distance;

  const fullPosition = {
    x: vehicle.x + movementX,
    y: vehicle.y + movementY,
    rotation: vehicle.rotation,
  };

  if (
    canOccupy(
      getVehicleCollisionShape(
        vehicle,
        config,
        fullPosition,
      ),
    )
  ) {
    vehicle.x = fullPosition.x;
    vehicle.y = fullPosition.y;
    vehicle.lastSafeX = vehicle.x;
    vehicle.lastSafeY = vehicle.y;
    vehicle.lastSafeRotation = vehicle.rotation;
    vehicle.isColliding = false;

    return {
      collided: false,
      damage: 0,
    };
  }

  const collisionDamage =
    vehicle.collisionDamageCooldown <= 0
      ? getCollisionDamage(vehicle, config)
      : 0;

  const horizontalPosition = {
    x: vehicle.x + movementX,
    y: vehicle.y,
    rotation: vehicle.rotation,
  };

  if (
    canOccupy(
      getVehicleCollisionShape(
        vehicle,
        config,
        horizontalPosition,
      ),
    )
  ) {
    vehicle.x = horizontalPosition.x;
  }

  const verticalPosition = {
    x: vehicle.x,
    y: vehicle.y + movementY,
    rotation: vehicle.rotation,
  };

  if (
    canOccupy(
      getVehicleCollisionShape(
        vehicle,
        config,
        verticalPosition,
      ),
    )
  ) {
    vehicle.y = verticalPosition.y;
  }

  vehicle.isColliding = true;

  if (collisionDamage > 0) {
    vehicle.collisionDamageCooldown =
      config.collisionDamageCooldownSeconds;
  }

  const impactDirection =
    Math.sign(distance) ||
    Math.sign(vehicle.speed) ||
    1;
  const backwardX = -Math.sin(vehicle.rotation) * impactDirection;
  const backwardY = Math.cos(vehicle.rotation) * impactDirection;
  const baseBounceDistance =
    config.collisionBounceDistance ?? 7;
  let separated = false;

  for (
    let multiplier = 1;
    multiplier <= 3;
    multiplier += 1
  ) {
    const separationPosition = {
      x:
        vehicle.x +
        backwardX * baseBounceDistance * multiplier,
      y:
        vehicle.y +
        backwardY * baseBounceDistance * multiplier,
      rotation: vehicle.rotation,
    };

    if (
      canOccupy(
        getVehicleCollisionShape(
          vehicle,
          config,
          separationPosition,
        ),
      )
    ) {
      vehicle.x = separationPosition.x;
      vehicle.y = separationPosition.y;
      vehicle.lastSafeX = vehicle.x;
      vehicle.lastSafeY = vehicle.y;
      vehicle.lastSafeRotation = vehicle.rotation;
      separated = true;
      break;
    }
  }

  if (
    !separated &&
    Number.isFinite(vehicle.lastSafeX) &&
    Number.isFinite(vehicle.lastSafeY)
  ) {
    const lastSafePosition = {
      x: vehicle.lastSafeX,
      y: vehicle.lastSafeY,
      rotation:
        vehicle.lastSafeRotation ?? vehicle.rotation,
    };

    if (
      canOccupy(
        getVehicleCollisionShape(
          vehicle,
          config,
          lastSafePosition,
        ),
      )
    ) {
      vehicle.x = lastSafePosition.x;
      vehicle.y = lastSafePosition.y;
      vehicle.rotation = lastSafePosition.rotation;
    }
  }

  vehicle.speed = 0;
  vehicle.collisionResponseCooldown =
    config.collisionResponseCooldownSeconds ?? 0.12;

  return {
    collided: true,
    damage: collisionDamage,
  };
}

export function updatePlayerVehicle({
  steeringBias = 0,
  vehicle,
  pressedKeys,
  deltaSeconds,
  config,
  canOccupy,
}) {
  vehicle.collisionResponseCooldown = Math.max(
    0,
    (vehicle.collisionResponseCooldown ?? 0) - deltaSeconds,
  );

  if (vehicle.collisionResponseCooldown <= 0) {
    updateSpeed(vehicle, pressedKeys, deltaSeconds, config);
  } else {
    vehicle.speed = 0;
  }

  updateSteering(
    vehicle,
    pressedKeys,
    deltaSeconds,
    config,
    canOccupy,
    steeringBias,
  );

  return updatePosition(
    vehicle,
    deltaSeconds,
    config,
    canOccupy,
  );
}
