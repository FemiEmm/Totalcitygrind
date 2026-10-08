import { northernApproachRoads } from '../data/northernApproaches.js';
// Only the woodland approach roads carry this penalty; estate and city streets stay unchanged.
export function northernRoadSpeedMultiplier(position) {
  return northernApproachRoads.some(road => position.x >= road.x && position.x < road.x + road.width && position.y >= road.y && position.y < road.y + road.height) ? 0.5 : 1;
}
