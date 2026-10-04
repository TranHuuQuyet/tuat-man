import Phaser from 'phaser';
import { DEFAULT_DOG } from '../data/dogs';
import { TUNING } from '../data/tuning';
import { DogEntity } from '../entities/DogEntity';
import { ObstacleEntity } from '../entities/ObstacleEntity';

export class SpawnerSystem {
  private scene: Phaser.Scene;
  private obstacleTimer = 2.4;
  private dogTimer = 0.2; // Immediate first dog on game start for instant action!
  private lastObstacleLane = 0;
  private isFirstDog = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public update(
    dt: number,
    isPulling: boolean,
    onSpawnObstacle: (obs: ObstacleEntity) => void,
    onSpawnDog: (dog: DogEntity) => void,
  ): void {
    // If pulling, freeze new obstacle spawning to maintain fair focus on the tug-of-war
    if (isPulling) return;

    // Obstacle timer
    this.obstacleTimer -= dt;
    if (this.obstacleTimer <= 0) {
      this.obstacleTimer = Phaser.Math.FloatBetween(
        TUNING.OBSTACLE_MIN_INTERVAL,
        TUNING.OBSTACLE_MAX_INTERVAL,
      );

      // 3 clear lanes: Left (-0.55), Center (0.0), Right (0.55)
      const lanes = [TUNING.LANE_LEFT, TUNING.LANE_CENTER, TUNING.LANE_RIGHT];
      const availableLanes = lanes.filter((l) => l !== this.lastObstacleLane);
      const lane = availableLanes[Phaser.Math.Between(0, availableLanes.length - 1)]!;
      this.lastObstacleLane = lane;

      const obs = new ObstacleEntity(this.scene, lane, 1.0);
      onSpawnObstacle(obs);
    }

    // Dog timer
    this.dogTimer -= dt;
    if (this.dogTimer <= 0) {
      this.dogTimer = Phaser.Math.FloatBetween(
        TUNING.DOG_MIN_INTERVAL,
        TUNING.DOG_MAX_INTERVAL,
      );

      // Dogs spawn on roadside shoulders (Left: -1.15, Right: 1.15)
      const side = Math.random() < 0.5 ? -1.15 : 1.15;
      const initialZ = this.isFirstDog ? 0.48 : 1.0;
      this.isFirstDog = false;

      const dog = new DogEntity(this.scene, DEFAULT_DOG, side, initialZ);
      onSpawnDog(dog);
    }
  }

  public reset(): void {
    this.obstacleTimer = 2.4;
    this.dogTimer = 0.2;
    this.lastObstacleLane = 0;
    this.isFirstDog = true;
  }
}
