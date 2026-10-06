export type Lane = -1 | 0 | 1;
export const LANES: readonly Lane[] = [-1, 0, 1] as const;

export const TUNING = {
  // Road & Perspective
  HORIZON_Y: 420,
  ROAD_BOTTOM_Y: 1280,
  ROAD_TOP_WIDTH: 110,
  ROAD_BOTTOM_WIDTH: 640,
  ROAD_SEGMENTS: 16,

  // Speed & Ramp (Phase B.4 Authoritative Progression)
  BASE_SPEED: 0.28,
  MAX_WORLD_SPEED: 0.35, // 1.25x speed cap
  SPEED_ACCELERATION: 0.12, // Smooth acceleration towards target cruising speed
  SPEED_RAMP_DURATION: 100, // Reaches max speed gradually over 100 seconds of run
  ROAD_STRIPE_SPEED: 1.8,

  // Lanes (Phase B.4 Responsive 3-Lane Model)
  LANE_LEFT: -0.55,
  LANE_CENTER: 0.0,
  LANE_RIGHT: 0.55,
  LANE_DIVIDER_LEFT: -0.33,
  LANE_DIVIDER_RIGHT: 0.33,
  LANE_SWITCH_SPEED: 16.0, // Snappy ~140ms visual lane transition
  LANE_SWITCH_COOLDOWN: 0.08, // Rapid responsiveness without double trigger

  // Player
  PLAYER_Z: 0.12,
  PLAYER_STEER_SPEED: 2.3,
  PLAYER_LEAN_MAX_ANGLE: 0.26,
  PLAYER_COLLISION_RADIUS_X: 38,
  PLAYER_COLLISION_RADIUS_Y: 26,

  // Dog Hook Window
  DOG_MIN_INTERVAL: 4.2,
  DOG_MAX_INTERVAL: 7.0,
  DOG_APPROACH_Z: 0.55,
  DOG_HOOK_MAX_Z: 0.44, // Hook window open
  DOG_HOOK_MIN_Z: 0.13, // Hook window close (beside bike)
  DOG_SIDE_REACH_THRESHOLD: 0.42, // Max lane offset from player to dog

  // Pull Tug-of-War Tuning
  PULL_BASE_POWER: 40,
  PULL_TARGET_POWER: 100,
  PULL_RESISTANCE_BASE: 14, // Power drain per second
  PULL_PERFECT_WINDOW_MIN_MS: 110,
  PULL_PERFECT_WINDOW_MAX_MS: 260,
  PULL_PERFECT_POWER: 18,
  PULL_GOOD_POWER: 11,
  PULL_MISS_POWER: 3,

  // Obstacle Spawning & Dodging
  OBSTACLE_MIN_INTERVAL: 2.8,
  OBSTACLE_MAX_INTERVAL: 4.8,

  // Camera & Shakes (Phase B.4 Normalized Camera Juice)
  TILT_LERP: 0.18,
  CAMERA_FOLLOW_STRENGTH: 22, // Subtle horizontal follow in pixels
  CAMERA_LANE_PUNCH_PX: 10, // Quick impulse on lane change
  CAMERA_SPEED_ZOOM_FACTOR: 0.06, // Slight wide-angle expansion at top speed
  SHAKE_HOOK_INTENSITY: 0.007,
  SHAKE_HOOK_DURATION: 120,
  SHAKE_PULL_INTENSITY: 0.003,
  SHAKE_NEAR_MISS_INTENSITY: 0.005,
  SHAKE_NEAR_MISS_DURATION: 110,
  SHAKE_CATCH_INTENSITY: 0.016,
  SHAKE_CATCH_DURATION: 250,
  SHAKE_CRASH_INTENSITY: 0.038,
  SHAKE_CRASH_DURATION: 650,
} as const;

export function getLaneRoadX(lane: Lane): number {
  if (lane === -1) return TUNING.LANE_LEFT;
  if (lane === 1) return TUNING.LANE_RIGHT;
  return TUNING.LANE_CENTER;
}

export function getNearestLane(roadX: number): Lane {
  const dLeft = Math.abs(roadX - TUNING.LANE_LEFT);
  const dCenter = Math.abs(roadX - TUNING.LANE_CENTER);
  const dRight = Math.abs(roadX - TUNING.LANE_RIGHT);
  if (dLeft <= dCenter && dLeft <= dRight) return -1;
  if (dRight <= dCenter && dRight <= dLeft) return 1;
  return 0;
}
