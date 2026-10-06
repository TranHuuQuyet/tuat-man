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
    overrides?: { dogLane?: Lane; obstacleLane?: Lane; z?: number; dogZ?: number; obstacleZ?: number },
  ): void {
    const baseZ = overrides?.z ?? 1.0;

    switch (pattern) {
      case 'SINGLE_OBSTACLE': {
        const availableLanes = LANES.filter((l) => l !== this.lastObstacleLane);
        const lane = overrides?.obstacleLane ?? availableLanes[Phaser.Math.Between(0, availableLanes.length - 1)]!;
        this.lastObstacleLane = lane;
        const obsZ = overrides?.obstacleZ ?? baseZ;
        const obs = new ObstacleEntity(this.scene, lane, obsZ);
        onSpawnObstacle(obs);
        break;
      }

      case 'TWO_LANE_BLOCK': {
        // Pick one safe lane that remains open (player can always pass)
        const safeLane: Lane = LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const blockedLanes = LANES.filter((l) => l !== safeLane);
        const obsZ = overrides?.obstacleZ ?? baseZ;
        for (const lane of blockedLanes) {
          const obs = new ObstacleEntity(this.scene, lane, obsZ);
          onSpawnObstacle(obs);
        }
        break;
      }

      case 'DOG_TARGET': {
        const lane = overrides?.dogLane ?? LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const dogZ = overrides?.dogZ ?? baseZ;
        const dog = new DogEntity(this.scene, DEFAULT_DOG, lane, dogZ);
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

        // Depth separation: Obstacle is ahead (closer to player at ~0.78), Dog is behind in the distance (~1.02)
        // Separated by at least 0.22 z-units to prevent flat wave spawn
        const obsZ = overrides?.obstacleZ ?? Math.max(0.65, baseZ - 0.22);
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);

        const dog = new DogEntity(this.scene, DEFAULT_DOG, dogLane, dogZ);
        const obs = new ObstacleEntity(this.scene, obstacleLane, obsZ);

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
