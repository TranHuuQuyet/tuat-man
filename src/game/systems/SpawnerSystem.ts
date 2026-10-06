import Phaser from 'phaser';
import { DEFAULT_DOG, DOG_CONFIGS, pickRandomDogType } from '../data/dogs';
import type { DogConfig, DogType } from '../data/dogs';
import { LANES, TUNING } from '../data/tuning';
import type { Lane } from '../data/tuning';
import type { HazardType, ObstacleType, TrafficType } from '../data/trafficTypes';
import { DogEntity } from '../entities/DogEntity';
import { ObstacleEntity } from '../entities/ObstacleEntity';

export type SpawnPattern =
  // B.2 Patterns
  | 'SINGLE_TRAFFIC'
  | 'TWO_LANE_BLOCK'
  | 'SINGLE_DOG'
  | 'DOG_AND_TRAFFIC'
  | 'DOG_AND_BLOCK'
  | 'OFFSET_TRAFFIC'
  // B.3 Advanced Dog Patterns
  | 'RARE_DOG'
  | 'DOG_CHOICE'
  | 'DOG_TRAFFIC_DECISION'
  | 'RARE_DOG_PRESSURE'
  | 'DOG_SEQUENCE'
  // Legacy aliases
  | 'SINGLE_OBSTACLE'
  | 'DOG_TARGET'
  | 'DOG_AND_OBSTACLE';

export const TRAFFIC_TYPES: readonly TrafficType[] = ['motorbike', 'delivery_bike', 'taxi', 'delivery_truck'] as const;
export const OBSTACLE_TYPES: readonly ObstacleType[] = ['barricade', 'boxes', 'pothole', 'street_cart'] as const;

export interface SpawnPlanHazard {
  lane: Lane;
  z: number;
  type: HazardType;
}

export interface SpawnPlanDog {
  lane: Lane;
  z: number;
  type: DogType;
}

/**
 * Validates spawn pattern plans against Section 16 fairness rules.
 */
export function validateSpawnPattern(
  hazards: SpawnPlanHazard[],
  dogs: SpawnPlanDog[],
): boolean {
  // Rule A: Minimum reaction distance on spawn (z >= 0.50)
  for (const h of hazards) {
    if (h.z < 0.50) return false;
  }
  for (const d of dogs) {
    if (d.z < 0.50) return false;
  }

  // Rule B: Never block all 3 lanes at the same collision depth window (|z1 - z2| < 0.16)
  for (const h1 of hazards) {
    const overlapping = hazards.filter((h2) => Math.abs(h1.z - h2.z) < 0.16);
    const blockedLanes = new Set(overlapping.map((h) => h.lane));
    if (blockedLanes.size >= 3) {
      return false; // 3-lane impossible wall!
    }
  }

  // Rule C: Dog and solid hazard must NEVER be at the same lane + same depth window
  for (const dog of dogs) {
    for (const h of hazards) {
      if (dog.lane === h.lane && Math.abs(dog.z - h.z) < 0.20) {
        return false; // Dog occluded or obstructed by hazard!
      }
    }
  }

  // Rule D: If multiple dogs are spawned, they must not be bunched at identical depths
  for (let i = 0; i < dogs.length; i++) {
    for (let j = i + 1; j < dogs.length; j++) {
      if (Math.abs(dogs[i]!.z - dogs[j]!.z) < 0.18) {
        return false;
      }
    }
  }

  return true;
}

export class SpawnerSystem {
  private scene: Phaser.Scene;
  private spawnTimer = 0.4;
  private lastObstacleLane: Lane = 0;
  private isFirstWave = true;

  private obstaclePool: ObstacleEntity[] = [];
  private dogPool: DogEntity[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Pre-allocate initial pooled obstacle entities
    for (let i = 0; i < 14; i++) {
      const obs = new ObstacleEntity(this.scene, 0, 1.0, 'barricade');
      obs.deactivate();
      this.obstaclePool.push(obs);
    }

    // Pre-allocate initial pooled dog entities (Phase B.3)
    for (let i = 0; i < 6; i++) {
      const dog = new DogEntity(this.scene, DEFAULT_DOG, 0, 1.0);
      dog.deactivate();
      this.dogPool.push(dog);
    }
  }

  public acquireObstacle(lane: Lane, z: number, type: HazardType): ObstacleEntity {
    let obs = this.obstaclePool.pop();
    if (obs) {
      obs.init(lane, z, type);
    } else {
      obs = new ObstacleEntity(this.scene, lane, z, type);
    }
    return obs;
  }

  public recycleObstacle(obs: ObstacleEntity): void {
    obs.deactivate();
    if (!this.obstaclePool.includes(obs)) {
      this.obstaclePool.push(obs);
    }
  }

  public acquireDog(config: DogConfig, lane: Lane, z: number): DogEntity {
    let dog = this.dogPool.pop();
    if (dog) {
      dog.init(config, lane, z);
    } else {
      dog = new DogEntity(this.scene, config, lane, z);
    }
    return dog;
  }

  public recycleDog(dog: DogEntity): void {
    dog.deactivate();
    if (!this.dogPool.includes(dog)) {
      this.dogPool.push(dog);
    }
  }

  public update(
    dt: number,
    isPulling: boolean,
    activeDogsCount: number,
    onSpawnObstacle: (obs: ObstacleEntity) => void,
    onSpawnDog: (dog: DogEntity) => void,
  ): void {
    if (isPulling) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Phaser.Math.FloatBetween(
        TUNING.OBSTACLE_MIN_INTERVAL,
        TUNING.OBSTACLE_MAX_INTERVAL,
      );

      if (this.isFirstWave) {
        this.isFirstWave = false;
        // First wave: Chó Cỏ in LEFT lane at z = 0.55 for instant action!
        this.spawnPattern('SINGLE_DOG', onSpawnObstacle, onSpawnDog, {
          dogLane: -1,
          z: 0.55,
          dogType: 'grass_dog',
        });
        return;
      }

      // Pattern selection
      let pattern: SpawnPattern;
      if (activeDogsCount > 0) {
        // Dog already on road: spawn obstacles / traffic only
        const roll = Math.random();
        if (roll < 0.40) pattern = 'SINGLE_TRAFFIC';
        else if (roll < 0.70) pattern = 'OFFSET_TRAFFIC';
        else pattern = 'TWO_LANE_BLOCK';
      } else {
        const roll = Math.random();
        if (roll < 0.20) pattern = 'SINGLE_DOG';
        else if (roll < 0.38) pattern = 'DOG_AND_TRAFFIC';
        else if (roll < 0.50) pattern = 'DOG_CHOICE';
        else if (roll < 0.62) pattern = 'DOG_TRAFFIC_DECISION';
        else if (roll < 0.72) pattern = 'DOG_AND_BLOCK';
        else if (roll < 0.80) pattern = 'DOG_SEQUENCE';
        else if (roll < 0.86) pattern = 'RARE_DOG';
        else if (roll < 0.92) pattern = 'RARE_DOG_PRESSURE';
        else if (roll < 0.96) pattern = 'OFFSET_TRAFFIC';
        else pattern = 'TWO_LANE_BLOCK';
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
      dogType?: DogType;
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

      // --- PATTERN B: TWO-LANE BLOCK ---
      case 'TWO_LANE_BLOCK': {
        const safeLane: Lane = LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const blockedLanes = LANES.filter((l) => l !== safeLane);
        const obsZ = overrides?.obstacleZ ?? baseZ;
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
        const dogType = overrides?.dogType ?? pickRandomDogType();
        const dog = this.acquireDog(DOG_CONFIGS[dogType], lane, dogZ);
        onSpawnDog(dog);
        break;
      }

      // --- PATTERN D: DOG + TRAFFIC ---
      case 'DOG_AND_TRAFFIC':
      case 'DOG_AND_OBSTACLE': {
        const dogLane: Lane = overrides?.dogLane ?? LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const availableObstacleLanes = LANES.filter((l) => l !== dogLane);
        const obstacleLane: Lane = overrides?.obstacleLane ??
          availableObstacleLanes[Phaser.Math.Between(0, availableObstacleLanes.length - 1)]!;

        this.lastObstacleLane = obstacleLane;

        const obsZ = overrides?.obstacleZ ?? Math.max(0.72, baseZ - 0.24);
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        const type = overrides?.hazardType ?? this.pickRandomTrafficType();
        const dogType = overrides?.dogType ?? pickRandomDogType();

        const dog = this.acquireDog(DOG_CONFIGS[dogType], dogLane, dogZ);
        const obs = this.acquireObstacle(obstacleLane, obsZ, type);

        onSpawnDog(dog);
        onSpawnObstacle(obs);
        break;
      }

      // --- PATTERN E: DOG + BLOCK ---
      case 'DOG_AND_BLOCK': {
        const dogLane: Lane = overrides?.dogLane ?? 0;
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        const dogType = overrides?.dogType ?? pickRandomDogType();
        const dog = this.acquireDog(DOG_CONFIGS[dogType], dogLane, dogZ);
        onSpawnDog(dog);

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

      // --- PATTERN F: OFFSET TRAFFIC ---
      case 'OFFSET_TRAFFIC': {
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

      // --- PATTERN G: RARE DOG (Phú Quốc) ---
      case 'RARE_DOG': {
        const lane = overrides?.dogLane ?? 0;
        const dogZ = overrides?.dogZ ?? baseZ;
        const dog = this.acquireDog(DOG_CONFIGS.phu_quoc, lane, dogZ);
        onSpawnDog(dog);
        break;
      }

      // --- PATTERN H: DOG CHOICE (Two dogs at distinct lanes & depths) ---
      case 'DOG_CHOICE': {
        const lane1: Lane = overrides?.dogLane ?? -1;
        const lane2: Lane = overrides?.obstacleLane ?? 1;

        const dogZ1 = Math.max(0.68, baseZ - 0.26);
        const dogZ2 = baseZ > 0.95 ? 1.02 : baseZ;

        const dog1 = this.acquireDog(DOG_CONFIGS.grass_dog, lane1, dogZ1);
        const dog2 = this.acquireDog(DOG_CONFIGS.golden_dog, lane2, dogZ2);
        onSpawnDog(dog1);
        onSpawnDog(dog2);
        break;
      }

      // --- PATTERN I: DOG + TRAFFIC DECISION ---
      case 'DOG_TRAFFIC_DECISION': {
        const dogLane: Lane = overrides?.dogLane ?? 0;
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        const dogType = overrides?.dogType ?? pickRandomDogType();
        const dog = this.acquireDog(DOG_CONFIGS[dogType], dogLane, dogZ);
        onSpawnDog(dog);

        // Flanking lanes: 1 obstacle at z = 0.72, 1 traffic at z = 0.88
        const obs = this.acquireObstacle(-1, Math.max(0.70, baseZ - 0.28), 'barricade');
        const traffic = this.acquireObstacle(1, Math.max(0.85, baseZ - 0.12), 'taxi');
        onSpawnObstacle(obs);
        onSpawnObstacle(traffic);
        break;
      }

      // --- PATTERN J: RARE DOG + PRESSURE ---
      case 'RARE_DOG_PRESSURE': {
        const dog = this.acquireDog(DOG_CONFIGS.phu_quoc, 0, baseZ > 0.95 ? 1.02 : baseZ);
        onSpawnDog(dog);

        const obs1 = this.acquireObstacle(-1, Math.max(0.72, baseZ - 0.26), 'boxes');
        const obs2 = this.acquireObstacle(1, Math.max(0.72, baseZ - 0.26), 'delivery_truck');
        onSpawnObstacle(obs1);
        onSpawnObstacle(obs2);
        break;
      }

      // --- PATTERN K: DOG SEQUENCE ---
      case 'DOG_SEQUENCE': {
        // Forward planning: Obstacle in Lane 1, Dog 1 in Lane 2, Dog 2 in Lane 3
        const obsZ = Math.max(0.60, baseZ - 0.38);
        const dog1Z = Math.max(0.80, baseZ - 0.18);
        const dog2Z = baseZ > 0.95 ? 1.04 : baseZ;

        const obs = this.acquireObstacle(-1, obsZ, 'pothole');
        const dog1 = this.acquireDog(DOG_CONFIGS.grass_dog, 0, dog1Z);
        const dog2 = this.acquireDog(DOG_CONFIGS.golden_dog, 1, dog2Z);

        onSpawnObstacle(obs);
        onSpawnDog(dog1);
        onSpawnDog(dog2);
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
