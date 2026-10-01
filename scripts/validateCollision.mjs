import assert from "node:assert/strict";

import { PLAYER_DANFO } from "../src/player/data/playerDanfo.js";
import {
  createPlayerVehicle,
  getVehicleCollisionBox,
} from "../src/player/systems/playerVehicle.js";
import { rectanglesOverlap } from "../src/world/systems/worldCollision.js";

const vehicle = createPlayerVehicle(
  {
    x: 100,
    y: 100,
    rotation: Math.PI / 4,
  },
  PLAYER_DANFO,
);

const collisionBox = getVehicleCollisionBox(
  vehicle,
  PLAYER_DANFO,
);

const expectedRotatedSize =
  (PLAYER_DANFO.width + PLAYER_DANFO.length) /
  Math.sqrt(2);

assert.ok(
  Math.abs(collisionBox.width - expectedRotatedSize) < 0.001,
  "Rotated vehicle collision width must enclose every body corner",
);

assert.ok(
  Math.abs(collisionBox.height - expectedRotatedSize) < 0.001,
  "Rotated vehicle collision height must enclose every body corner",
);

assert.ok(
  Math.abs(
    collisionBox.x + collisionBox.width / 2 - vehicle.x,
  ) < 0.001,
  "Collision box must remain centred on the vehicle",
);

assert.equal(
  rectanglesOverlap(collisionBox, {
    x: vehicle.x - 5,
    y: vehicle.y - 5,
    width: 10,
    height: 10,
  }),
  true,
  "Vehicle collision box must overlap an object at its centre",
);

console.log("Current rotated collision-box checks: passed");
