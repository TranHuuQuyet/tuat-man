/**
 * Global game constants. Gameplay tuning values will live in `game/data/*`
 * (data-driven), not here. This file only holds engine/viewport-level config.
 */

/** Logical design resolution — exact 9:16 portrait. All game coordinates use this space. */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

/** Night-time palette used by foundation screens. Art direction expands this in Phase 3. */
export const COLORS = {
  nightSky: 0x0b0a1a,
  neonYellow: 0xffd23f,
  neonRed: 0xff3b3b,
  textLight: 0xf5f0e6,
} as const;

/** Scene keys — single source of truth to avoid string typos across scenes. */
export const SCENE_KEYS = {
  boot: 'BootScene',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];
