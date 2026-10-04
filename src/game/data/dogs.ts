import { TUNING } from './tuning';

export interface DogConfig {
  id: string;
  name: string;
  hookMinZ: number;
  hookMaxZ: number;
  pullResistance: number;
  pullRequiredPower: number;
  pullTimeLimit: number;
  value: number;
  score: number;
}

export const DEFAULT_DOG: DogConfig = {
  id: 'vang_co',
  name: 'Chó Vàng Cỏ',
  hookMinZ: TUNING.DOG_HOOK_MIN_Z,
  hookMaxZ: TUNING.DOG_HOOK_MAX_Z,
  pullResistance: TUNING.PULL_RESISTANCE_BASE,
  pullRequiredPower: TUNING.PULL_TARGET_POWER,
  pullTimeLimit: 5.5,
  value: 150,
  score: 500,
};
