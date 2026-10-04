import { GAME_WIDTH } from '../config';
import { TUNING } from '../data/tuning';

export interface ScreenPoint {
  x: number;
  y: number;
  scale: number;
  roadWidth: number;
}

export function projectRoad(roadX: number, z: number): ScreenPoint {
  const clampedZ = Math.max(0.001, Math.min(1.0, z));
  const depthFactor = Math.pow(1 - clampedZ, 1.35);

  const screenY = TUNING.HORIZON_Y + (TUNING.ROAD_BOTTOM_Y - TUNING.HORIZON_Y) * depthFactor;
  const currentRoadWidth = TUNING.ROAD_TOP_WIDTH + (TUNING.ROAD_BOTTOM_WIDTH - TUNING.ROAD_TOP_WIDTH) * depthFactor;

  const centerX = GAME_WIDTH / 2;
  const screenX = centerX + (roadX * (currentRoadWidth / 2));
  const scale = 0.15 + 0.85 * depthFactor;

  return {
    x: screenX,
    y: screenY,
    scale,
    roadWidth: currentRoadWidth,
  };
}
