import Phaser from 'phaser';
import { DEFAULT_DOG } from '../data/dogs';
import { LANES, TUNING } from '../data/tuning';
import type { Lane } from '../data/tuning';
import type { HazardType, ObstacleType, TrafficType } from '../data/trafficTypes';
import { DogEntity } from '../entities/DogEntity';
import { ObstacleEntity } from '../entities/ObstacleEntity';

export type SpawnPattern =
  | 'SINGLE_TRAFFIC'
  | 'TWO_LANE_BLOCK'
  | 'SINGLE_DOG'
  | 'DOG_AND_TRAFFIC'
  | 'DOG_AND_BLOCK'
  | 'OFFSET_TRAFFIC'
  // Legacy Phase A aliases for compatibility
  | 'SINGLE_OBSTACLE'
  | 'DOG_TARGET'
  | 'DOG_AND_OBSTACLE';

export const TRAFFIC_TYPES: readonly TrafficType[] = ['motorbike', 'delivery_bike', 'taxi', 'delivery_truck'] as const;
export const OBSTACLE_TYPES: readonly ObstacleType[] = ['barricade', 'boxes', 'pothole', 'street_cart'] as const;

export class SpawnerSystem {
  private scene: Phaser.Scene;
  private spawnTimer = 0.4; // First wave quickly after start for immediate action
  private lastObstacleLane: Lane = 0;
  private isFirstWave = true;
  private obstaclePool: ObstacleEntity[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Pre-allocate initial pooled obstacle entities to avoid runtime allocations
    for (let i = 0; i < 14; i++) {
      const obs = new ObstacleEntity(this.scene, 0, 1.0, 'barricade');
      obs.deactivate();
      this.obstaclePool.push(obs);
    }
  }

  /**
   * Acquires a pooled obstacle or creates one if the pool is exhausted.
   */
  public acquireObstacle(lane: Lane, z: number, type: HazardType): ObstacleEntity {
    let obs = this.obstaclePool.pop();
    if (obs) {
      obs.init(lane, z, type);
    } else {
      obs = new ObstacleEntity(this.scene, lane, z, type);
    }
    return obs;
  }

  /**
   * Returns an inactive obstacle back to the pool.
   */
  public recycleObstacle(obs: ObstacleEntity): void {
    obs.deactivate();
    if (!this.obstaclePool.includes(obs)) {
      this.obstaclePool.push(obs);
    }
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
        // First wave: Dog in LEFT lane at z = 0.55 for instant accessible action!
        this.spawnPattern('SINGLE_DOG', onSpawnObstacle, onSpawnDog, { dogLane: -1, z: 0.55 });
        return;
      }

      // Pattern selection weighted for high replayability and clear decision moments
      let pattern: SpawnPattern;
      if (activeDogsCount > 0) {
        // Dog already on road: spawn traffic / obstacles only (no second dog bunching)
        const roll = Math.random();
        if (roll < 0.40) {
          pattern = 'SINGLE_TRAFFIC';
        } else if (roll < 0.70) {
          pattern = 'OFFSET_TRAFFIC';
        } else {
          pattern = 'TWO_LANE_BLOCK';
        }
      } else {
        const roll = Math.random();
        if (roll < 0.25) {
          pattern = 'SINGLE_DOG';
        } else if (roll < 0.45) {
          pattern = 'DOG_AND_TRAFFIC';
        } else if (roll < 0.60) {
          pattern = 'DOG_AND_BLOCK';
        } else if (roll < 0.80) {
          pattern = 'SINGLE_TRAFFIC';
        } else if (roll < 0.92) {
          pattern = 'OFFSET_TRAFFIC';
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
    overrides?: {
      dogLane?: Lane;
      obstacleLane?: Lane;
      z?: number;
      dogZ?: number;
      obstacleZ?: number;
      hazardType?: HazardType;
    },
  ): void {
    const baseZ = overrides?.z ?? 1.0;

    switch (pattern) {
      // --- PATTERN A: SINGLE TRAFFIC ---
      case 'SINGLE_TRAFFIC':
      case 'SINGLE_OBSTACLE': {
        const availableLanes = LANES.filter((l) => l !== this.lastObstacleLane);
        const lane = overrides?.obstacleLane ?? availableLanes[Phaser.Math.Between(0, availableLanes.length - 1)]!;
        this.lastObstacleLane = lane;
        const obsZ = overrides?.obstacleZ ?? baseZ;
        const type = overrides?.hazardType ?? this.pickRandomTrafficOrObstacle();
        const obs = this.acquireObstacle(lane, obsZ, type);
        onSpawnObstacle(obs);
        break;
      }

      // --- PATTERN B: TWO-LANE BLOCK (Guaranteed 1 Safe Lane) ---
      case 'TWO_LANE_BLOCK': {
        // Always pick 1 safe lane that remains 100% unobstructed
        const safeLane: Lane = LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const blockedLanes = LANES.filter((l) => l !== safeLane);
        const obsZ = overrides?.obstacleZ ?? baseZ;

        // One obstacle + one traffic vehicle for visual variety
        const type1 = this.pickRandomObstacleType();
        const type2 = this.pickRandomTrafficType();

        const obs1 = this.acquireObstacle(blockedLanes[0]!, obsZ, type1);
        const obs2 = this.acquireObstacle(blockedLanes[1]!, obsZ, type2);
        onSpawnObstacle(obs1);
        onSpawnObstacle(obs2);
        break;
      }

      // --- PATTERN C: SINGLE DOG ---
      case 'SINGLE_DOG':
      case 'DOG_TARGET': {
        const lane = overrides?.dogLane ?? LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const dogZ = overrides?.dogZ ?? baseZ;
        const dog = new DogEntity(this.scene, DEFAULT_DOG, lane, dogZ);
        onSpawnDog(dog);
        break;
      }

      // --- PATTERN D: DOG + TRAFFIC (Depth Staggered) ---
      case 'DOG_AND_TRAFFIC':
      case 'DOG_AND_OBSTACLE': {
        // Dog and traffic in distinct lanes (NEVER in the same lane)
        const dogLane: Lane = overrides?.dogLane ?? LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const availableObstacleLanes = LANES.filter((l) => l !== dogLane);
        const obstacleLane: Lane = overrides?.obstacleLane ??
          availableObstacleLanes[Phaser.Math.Between(0, availableObstacleLanes.length - 1)]!;

        this.lastObstacleLane = obstacleLane;

        // Depth separation: Hazard is ahead at ~0.76, Dog is behind at ~1.02
        const obsZ = overrides?.obstacleZ ?? Math.max(0.72, baseZ - 0.24);
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        const type = overrides?.hazardType ?? this.pickRandomTrafficType();

        const dog = new DogEntity(this.scene, DEFAULT_DOG, dogLane, dogZ);
        const obs = this.acquireObstacle(obstacleLane, obsZ, type);

        onSpawnDog(dog);
        onSpawnObstacle(obs);
        break;
      }

      // --- PATTERN E: DOG + BLOCK (High Value Decision Moment) ---
      case 'DOG_AND_BLOCK': {
        // Dog in chosen lane (e.g. CENTER), the other 2 lanes have hazards
        const dogLane: Lane = overrides?.dogLane ?? 0;
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        const dog = new DogEntity(this.scene, DEFAULT_DOG, dogLane, dogZ);
        onSpawnDog(dog);

        // Flanking lanes have hazards staggered ahead at ~0.76
        const blockedLanes = LANES.filter((l) => l !== dogLane);
        const obsZ = overrides?.obstacleZ ?? Math.max(0.72, baseZ - 0.26);

        const type1 = this.pickRandomObstacleType();
        const type2 = this.pickRandomTrafficType();

        const obs1 = this.acquireObstacle(blockedLanes[0]!, obsZ, type1);
        const obs2 = this.acquireObstacle(blockedLanes[1]!, obsZ, type2);
        onSpawnObstacle(obs1);
        onSpawnObstacle(obs2);
        break;
      }

      // --- PATTERN F: OFFSET TRAFFIC (S-Curve Weaving Rhythm) ---
      case 'OFFSET_TRAFFIC': {
        // 2 lanes occupied, but at clearly separated depths:
        // First vehicle at z = 0.74, second vehicle at z = 1.0
        const lane1: Lane = LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const remainingLanes = LANES.filter((l) => l !== lane1);
        const lane2: Lane = remainingLanes[Phaser.Math.Between(0, remainingLanes.length - 1)]!;

        this.lastObstacleLane = lane2;

        const obsZ1 = Math.max(0.72, baseZ - 0.26);
        const obsZ2 = baseZ;

        const type1 = this.pickRandomTrafficType();
        const type2 = this.pickRandomTrafficOrObstacle();

        const obs1 = this.acquireObstacle(lane1, obsZ1, type1);
        const obs2 = this.acquireObstacle(lane2, obsZ2, type2);
        onSpawnObstacle(obs1);
        onSpawnObstacle(obs2);
        break;
      }
    }
  }

  public pickRandomTrafficType(): TrafficType {
    const roll = Math.random();
    if (roll < 0.40) return 'motorbike';
    if (roll < 0.70) return 'delivery_bike';
    if (roll < 0.90) return 'taxi';
    return 'delivery_truck';
  }

  public pickRandomObstacleType(): ObstacleType {
    const roll = Math.random();
    if (roll < 0.35) return 'barricade';
    if (roll < 0.60) return 'boxes';
    if (roll < 0.80) return 'pothole';
    return 'street_cart';
  }

  public pickRandomTrafficOrObstacle(): HazardType {
    return Math.random() < 0.6 ? this.pickRandomTrafficType() : this.pickRandomObstacleType();
  }

  public reset(): void {
    this.spawnTimer = 0.4;
    this.lastObstacleLane = 0;
    this.isFirstWave = true;
  }
}
