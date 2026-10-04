import Phaser from 'phaser';
import { DEFAULT_DOG } from '../data/dogs';
import { TUNING } from '../data/tuning';
import { DogEntity } from '../entities/DogEntity';
import { ObstacleEntity } from '../entities/ObstacleEntity';

export class SpawnerSystem {
  private scene: Phaser.Scene;
  private obstacleTimer = 1.6;
  private dogTimer = 2.4;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public update(
    dt: number,
    isPulling: boolean,
    onSpawnObstacle: (obs: ObstacleEntity) => void,
    onSpawnDog: (dog: DogEntity) => void,
  ): void {
    if (isPulling) return;

    this.obstacleTimer -= dt;
    if (this.obstacleTimer <= 0) {
      this.obstacleTimer = Phaser.Math.FloatBetween(
        TUNING.OBSTACLE_MIN_INTERVAL,
        TUNING.OBSTACLE_MAX_INTERVAL,
      );

      const lanes = [-0.55, 0.0, 0.55];
      const lane = lanes[Phaser.Math.Between(0, lanes.length - 1)]!;
      const obs = new ObstacleEntity(this.scene, lane, 1.0);
      onSpawnObstacle(obs);
    }

    this.dogTimer -= dt;
    if (this.dogTimer <= 0) {
      this.dogTimer = Phaser.Math.FloatBetween(
        TUNING.DOG_MIN_INTERVAL,
        TUNING.DOG_MAX_INTERVAL,
      );

      const side = Math.random() < 0.5 ? -1.15 : 1.15;
      const dog = new DogEntity(this.scene, DEFAULT_DOG, side, 1.0);
      onSpawnDog(dog);
    }
  }

  public reset(): void {
    this.obstacleTimer = 1.6;
    this.dogTimer = 2.4;
  }
}
