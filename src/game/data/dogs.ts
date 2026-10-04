export interface DogConfig {
  id: string;
  name: string;
  hookMinZ: number;
  hookMaxZ: number;
  hookSuccessRate: number;
  pullResistance: number;
  pullRequiredPower: number;
  pullTimeLimit: number;
  value: number;
  score: number;
}

export const DEFAULT_DOG: DogConfig = {
  id: 'vang_co',
  name: 'Chó Vàng Cỏ',
  hookMinZ: 0.16,
  hookMaxZ: 0.58,
  hookSuccessRate: 0.88,
  pullResistance: 15,
  pullRequiredPower: 100,
  pullTimeLimit: 5.5,
  value: 150,
  score: 500,
};
