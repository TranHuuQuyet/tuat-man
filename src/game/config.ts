/**
 * Global game constants.
 */

/** Logical design resolution — exact 9:16 portrait. */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

/** Night-time palette. */
export const COLORS = {
  nightSky: 0x0b0a1a,
  neonYellow: 0xffd23f,
  neonRed: 0xff3b3b,
  textLight: 0xf5f0e6,
} as const;

/** Scene keys. */
export const SCENE_KEYS = {
  boot: 'BootScene',
  ride: 'RideScene',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];
