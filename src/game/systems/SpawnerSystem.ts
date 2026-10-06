import Phaser from 'phaser';
import { DEFAULT_DOG } from '../data/dogs';
import { LANES, TUNING } from '../data/tuning';
import type { Lane } from '../data/tuning';
import { DogEntity } from '../entities/DogEntity';
import { ObstacleEntity } from '../entities/ObstacleEntity';

export type SpawnPattern =
  | 'SINGLE_OBSTACLE'
  | 'TWO_LANE_BLOCK'
  | 'DOG_TARGET'
  | 'DOG_AND_OBSTACLE';

export class SpawnerSystem {
  private scene: Phaser.Scene;
  private spawnTimer = 0.4; // First wave quickly after start for immediate action
  private lastObstacleLane: Lane = 0;
  private isFirstWave = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public update(
    dt: number,
    isPulling: boolean,
    activeDogsCount: number,
    onSpawnObstacle: (obs: ObstacleEntity) => void,
    onSpawnDog: (dog: DogEntity) => void,
  ): void {
    // If pulling, freeze spawning to maintain fair focus on tug-of-war
    if (isPulling) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Phaser.Math.FloatBetween(
        TUNING.OBSTACLE_MIN_INTERVAL,
        TUNING.OBSTACLE_MAX_INTERVAL,
      );

      if (this.isFirstWave) {
        this.isFirstWave = false;
        // First wave: Dog in LEFT lane at z = 0.55 for instant action!
        this.spawnPattern('DOG_TARGET', onSpawnObstacle, onSpawnDog, { dogLane: -1, z: 0.55 });
        return;
      }

      // Pattern selection
      let pattern: SpawnPattern;
      if (activeDogsCount > 0) {
        // Dog already on road: spawn obstacles only
        pattern = Math.random() < 0.7 ? 'SINGLE_OBSTACLE' : 'TWO_LANE_BLOCK';
      } else {
        const roll = Math.random();
        if (roll < 0.35) {
          pattern = 'DOG_AND_OBSTACLE';
        } else if (roll < 0.65) {
          pattern = 'DOG_TARGET';
        } else if (roll < 0.85) {
          pattern = 'SINGLE_OBSTACLE';
        } else {
          pattern = 'TWO_LANE_BLOCK';
        }
      }

      this.spawnPattern(pattern, onSpawnObstacle, onSpawnDog);
    }
  }

  public spawnPattern(
    pattern: SpawnPattern,
    onSpawnObstacle: (obs: ObstacleEntity) => void,
    onSpawnDog: (dog: DogEntity) => void,
    overrides?: { dogLane?: Lane; obstacleLane?: Lane; z?: number },
  ): void {
    const z = overrides?.z ?? 1.0;

    switch (pattern) {
      case 'SINGLE_OBSTACLE': {
        const availableLanes = LANES.filter((l) => l !== this.lastObstacleLane);
        const lane = overrides?.obstacleLane ?? availableLanes[Phaser.Math.Between(0, availableLanes.length - 1)]!;
        this.lastObstacleLane = lane;
        const obs = new ObstacleEntity(this.scene, lane, z);
        onSpawnObstacle(obs);
        break;
      }

      case 'TWO_LANE_BLOCK': {
        // Pick one safe lane that remains open (player can always pass)
        const safeLane: Lane = LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const blockedLanes = LANES.filter((l) => l !== safeLane);
        for (const lane of blockedLanes) {
          const obs = new ObstacleEntity(this.scene, lane, z);
          onSpawnObstacle(obs);
        }
        break;
      }

      case 'DOG_TARGET': {
        const lane = overrides?.dogLane ?? LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const dog = new DogEntity(this.scene, DEFAULT_DOG, lane, z);
        onSpawnDog(dog);
        break;
      }

      case 'DOG_AND_OBSTACLE': {
        // Dog and obstacle in distinct lanes (NEVER the same lane)
        const dogLane: Lane = overrides?.dogLane ?? LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const availableObstacleLanes = LANES.filter((l) => l !== dogLane);
        const obstacleLane: Lane = overrides?.obstacleLane ??
          availableObstacleLanes[Phaser.Math.Between(0, availableObstacleLanes.length - 1)]!;

        this.lastObstacleLane = obstacleLane;

        const dog = new DogEntity(this.scene, DEFAULT_DOG, dogLane, z);
        const obs = new ObstacleEntity(this.scene, obstacleLane, z);

        onSpawnDog(dog);
        onSpawnObstacle(obs);
        break;
      }
    }
  }

  public reset(): void {
    this.spawnTimer = 0.4;
    this.lastObstacleLane = 0;
    this.isFirstWave = true;
  }
}
