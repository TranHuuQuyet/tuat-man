import { TUNING } from './tuning';

/**
 * The 4 Vietnamese dog archetypes in "Tuất Man".
 */
export type DogType =
  | 'grass_dog'            // Chó Cỏ (Standard / Common) - 60%
  | 'golden_dog'           // Chó Vàng (Fast / Mobile) - 25%
  | 'neighborhood_poodle'  // Poodle Xóm (Small / Precision) - 10%
  | 'phu_quoc';            // Chó Phú Quốc (Rare / High Value) - 5%

export interface DogConfig {
  id: DogType;
  type: DogType;
  name: string;
  speedFactor: number;        // Speed multiplier against base road speed
  targetSize: number;         // Lateral hitbox / hook alignment multiplier
  pullDifficulty: number;     // Pull resistance multiplier (1.00 - 1.30)
  reward: number;             // Cash reward ($150, $200, $250, $500)
  score: number;              // Score bonus (500, 750, 1000, 2000)
  rarityWeight: number;       // Spawn probability weight (60, 25, 10, 5)
  hookMinZ: number;
  hookMaxZ: number;
  pullResistance: number;
  pullRequiredPower: number;
  pullTimeLimit: number;
}

export const DOG_CONFIGS: Record<DogType, DogConfig> = {
  // 1. Chó Cỏ (Basic / Common)
  grass_dog: {
    id: 'grass_dog',
    type: 'grass_dog',
    name: 'Chó Cỏ',
    speedFactor: 1.00,
    targetSize: 1.00,
    pullDifficulty: 1.00,
    reward: 150,
    score: 500,
    rarityWeight: 60,
    hookMinZ: TUNING.DOG_HOOK_MIN_Z,
    hookMaxZ: TUNING.DOG_HOOK_MAX_Z,
    pullResistance: TUNING.PULL_RESISTANCE_BASE * 1.00,
    pullRequiredPower: TUNING.PULL_TARGET_POWER,
    pullTimeLimit: 5.5,
  },

  // 2. Chó Vàng (Fast / Mobile)
  golden_dog: {
    id: 'golden_dog',
    type: 'golden_dog',
    name: 'Chó Vàng',
    speedFactor: 1.10,
    targetSize: 1.00,
    pullDifficulty: 1.10,
    reward: 200,
    score: 750,
    rarityWeight: 25,
    hookMinZ: TUNING.DOG_HOOK_MIN_Z,
    hookMaxZ: TUNING.DOG_HOOK_MAX_Z,
    pullResistance: TUNING.PULL_RESISTANCE_BASE * 1.10,
    pullRequiredPower: TUNING.PULL_TARGET_POWER,
    pullTimeLimit: 5.0,
  },

  // 3. Poodle Xóm (Small / Precision)
  neighborhood_poodle: {
    id: 'neighborhood_poodle',
    type: 'neighborhood_poodle',
    name: 'Poodle Xóm',
    speedFactor: 1.00,
    targetSize: 0.78,
    pullDifficulty: 1.15,
    reward: 250,
    score: 1000,
    rarityWeight: 10,
    hookMinZ: TUNING.DOG_HOOK_MIN_Z,
    hookMaxZ: TUNING.DOG_HOOK_MAX_Z,
    pullResistance: TUNING.PULL_RESISTANCE_BASE * 1.15,
    pullRequiredPower: TUNING.PULL_TARGET_POWER,
    pullTimeLimit: 4.8,
  },

  // 4. Chó Phú Quốc (Rare / High Value)
  phu_quoc: {
    id: 'phu_quoc',
    type: 'phu_quoc',
    name: 'Chó Phú Quốc',
    speedFactor: 1.15,
    targetSize: 1.05,
    pullDifficulty: 1.30,
    reward: 500,
    score: 2000,
    rarityWeight: 5,
    hookMinZ: TUNING.DOG_HOOK_MIN_Z,
    hookMaxZ: TUNING.DOG_HOOK_MAX_Z,
    pullResistance: TUNING.PULL_RESISTANCE_BASE * 1.30,
    pullRequiredPower: TUNING.PULL_TARGET_POWER,
    pullTimeLimit: 4.5,
  },
};

export const DEFAULT_DOG: DogConfig = DOG_CONFIGS.grass_dog;

export const DOG_TYPES: readonly DogType[] = [
  'grass_dog',
  'golden_dog',
  'neighborhood_poodle',
  'phu_quoc',
] as const;

/**
 * Pick a random dog type based on the 60% / 25% / 10% / 5% distribution.
 */
export function pickRandomDogType(): DogType {
  const roll = Math.random() * 100;
  if (roll < 60) return 'grass_dog';
  if (roll < 85) return 'golden_dog';
  if (roll < 95) return 'neighborhood_poodle';
  return 'phu_quoc';
}

export function getDogConfig(type: DogType): DogConfig {
  return DOG_CONFIGS[type];
}
