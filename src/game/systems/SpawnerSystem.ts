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

export interface SpawnPlanEntry {
  kind: 'dog' | 'obstacle';
  lane: Lane;
  z: number;
  dogType?: DogType;
  hazardType?: HazardType;
}

export interface SpawnPlan {
  pattern: SpawnPattern;
  hazards: SpawnPlanHazard[];
  dogs: SpawnPlanDog[];
}

export interface SpawnOverrides {
  dogLane?: Lane;
  obstacleLane?: Lane;
  z?: number;
  dogZ?: number;
  obstacleZ?: number;
  hazardType?: HazardType;
  dogType?: DogType;
}

/**
 * Validates planned spawn data against Section 16 fairness rules before pool acquisition.
 * Pure validation with zero side-effects.
 */
export function validateSpawnPattern(
  planOrHazards: SpawnPlan | SpawnPlanHazard[],
  maybeDogs?: SpawnPlanDog[],
  _playerLane?: Lane,
): boolean {
  let hazards: SpawnPlanHazard[];
  let dogs: SpawnPlanDog[];

  if ('hazards' in planOrHazards && 'dogs' in planOrHazards) {
    hazards = planOrHazards.hazards;
    dogs = planOrHazards.dogs;
  } else {
    hazards = planOrHazards as SpawnPlanHazard[];
    dogs = (maybeDogs ?? []) as SpawnPlanDog[];
  }

  // Rule A: Minimum reaction distance on spawn (z >= 0.50)
  for (const h of hazards) {
    if (h.z < 0.50) return false;
  }
  for (const d of dogs) {
    if (d.z < 0.50) return false;
  }

  // Rule B: Three-lane fairness (never block all 3 lanes at the same collision depth window |z1 - z2| < 0.16)
  for (const h1 of hazards) {
    const overlapping = hazards.filter((h2) => Math.abs(h1.z - h2.z) < 0.16);
    const blockedLanes = new Set(overlapping.map((h) => h.lane));
    if (blockedLanes.size >= 3) {
      return false; // 3-lane impossible wall!
    }
  }

  // Rule C: Dog and solid hazard must NEVER be at the same lane + same depth window (separation >= 0.20)
  for (const dog of dogs) {
    for (const h of hazards) {
      if (dog.lane === h.lane && Math.abs(dog.z - h.z) < 0.20) {
        return false; // Dog occluded or obstructed by hazard!
      }
    }
  }

  // Rule D: Dog reachability - ensure dog's lane is not blocked directly in front of the dog
  for (const dog of dogs) {
    for (const h of hazards) {
      if (dog.lane === h.lane && h.z < dog.z && dog.z - h.z < 0.25) {
        return false; // Hazard placed too close ahead of dog in same lane!
      }
    }
  }

  // Rule E: No impossible simultaneous dog targets (multiple dogs must be separated by >= 0.18 in depth)
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

  public obstaclePool: ObstacleEntity[] = [];
  public dogPool: DogEntity[] = [];

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

  public validateSpawnPattern(planOrHazards: SpawnPlan | SpawnPlanHazard[], maybeDogs?: SpawnPlanDog[]): boolean {
    return validateSpawnPattern(planOrHazards, maybeDogs);
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

  /**
   * Pure function: builds a plan representation before acquiring pooled entities.
   */
  public buildSpawnPlan(
    pattern: SpawnPattern,
    overrides?: SpawnOverrides,
  ): SpawnPlan {
    const baseZ = overrides?.z ?? 1.0;
    const hazards: SpawnPlanHazard[] = [];
    const dogs: SpawnPlanDog[] = [];

    switch (pattern) {
      // --- PATTERN A: SINGLE TRAFFIC ---
      case 'SINGLE_TRAFFIC':
      case 'SINGLE_OBSTACLE': {
        const availableLanes = LANES.filter((l) => l !== this.lastObstacleLane);
        const lane = overrides?.obstacleLane ?? availableLanes[Phaser.Math.Between(0, availableLanes.length - 1)]!;
        const obsZ = overrides?.obstacleZ ?? baseZ;
        const type = overrides?.hazardType ?? this.pickRandomTrafficOrObstacle();
        hazards.push({ lane, z: obsZ, type });
        break;
      }

      // --- PATTERN B: TWO-LANE BLOCK ---
      case 'TWO_LANE_BLOCK': {
        const safeLane: Lane = LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const blockedLanes = LANES.filter((l) => l !== safeLane);
        const obsZ = overrides?.obstacleZ ?? baseZ;
        const type1 = this.pickRandomObstacleType();
        const type2 = this.pickRandomTrafficType();
        hazards.push({ lane: blockedLanes[0]!, z: obsZ, type: type1 });
        hazards.push({ lane: blockedLanes[1]!, z: obsZ, type: type2 });
        break;
      }

      // --- PATTERN C: SINGLE DOG ---
      case 'SINGLE_DOG':
      case 'DOG_TARGET': {
        const lane = overrides?.dogLane ?? LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const dogZ = overrides?.dogZ ?? baseZ;
        const dogType = overrides?.dogType ?? pickRandomDogType();
        dogs.push({ lane, z: dogZ, type: dogType });
        break;
      }

      // --- PATTERN D: DOG + TRAFFIC ---
      case 'DOG_AND_TRAFFIC':
      case 'DOG_AND_OBSTACLE': {
        const dogLane: Lane = overrides?.dogLane ?? LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const availableObstacleLanes = LANES.filter((l) => l !== dogLane);
        const obstacleLane: Lane = overrides?.obstacleLane ??
          availableObstacleLanes[Phaser.Math.Between(0, availableObstacleLanes.length - 1)]!;
        const obsZ = overrides?.obstacleZ ?? Math.max(0.72, baseZ - 0.24);
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        const type = overrides?.hazardType ?? this.pickRandomTrafficType();
        const dogType = overrides?.dogType ?? pickRandomDogType();
        dogs.push({ lane: dogLane, z: dogZ, type: dogType });
        hazards.push({ lane: obstacleLane, z: obsZ, type });
        break;
      }

      // --- PATTERN E: DOG + BLOCK ---
      case 'DOG_AND_BLOCK': {
        const dogLane: Lane = overrides?.dogLane ?? 0;
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        const dogType = overrides?.dogType ?? pickRandomDogType();
        dogs.push({ lane: dogLane, z: dogZ, type: dogType });

        const blockedLanes = LANES.filter((l) => l !== dogLane);
        const obsZ = overrides?.obstacleZ ?? Math.max(0.72, baseZ - 0.26);
        const type1 = this.pickRandomObstacleType();
        const type2 = this.pickRandomTrafficType();
        hazards.push({ lane: blockedLanes[0]!, z: obsZ, type: type1 });
        hazards.push({ lane: blockedLanes[1]!, z: obsZ, type: type2 });
        break;
      }

      // --- PATTERN F: OFFSET TRAFFIC ---
      case 'OFFSET_TRAFFIC': {
        const lane1: Lane = LANES[Phaser.Math.Between(0, LANES.length - 1)]!;
        const remainingLanes = LANES.filter((l) => l !== lane1);
        const lane2: Lane = remainingLanes[Phaser.Math.Between(0, remainingLanes.length - 1)]!;
        const obsZ1 = Math.max(0.72, baseZ - 0.26);
        const obsZ2 = baseZ;
        const type1 = this.pickRandomTrafficType();
        const type2 = this.pickRandomTrafficOrObstacle();
        hazards.push({ lane: lane1, z: obsZ1, type: type1 });
        hazards.push({ lane: lane2, z: obsZ2, type: type2 });
        break;
      }

      // --- PATTERN G: RARE DOG (Phú Quốc) ---
      case 'RARE_DOG': {
        const lane = overrides?.dogLane ?? 0;
        const dogZ = overrides?.dogZ ?? baseZ;
        const dogType = overrides?.dogType ?? 'phu_quoc';
        dogs.push({ lane, z: dogZ, type: dogType });
        break;
      }

      // --- PATTERN H: DOG CHOICE (Two dogs at distinct lanes & depths) ---
      case 'DOG_CHOICE': {
        const lane1: Lane = overrides?.dogLane ?? -1;
        const lane2: Lane = overrides?.obstacleLane ?? 1;
        const dogZ1 = Math.max(0.68, baseZ - 0.26);
        const dogZ2 = baseZ > 0.95 ? 1.02 : baseZ;
        dogs.push({ lane: lane1, z: dogZ1, type: 'grass_dog' });
        dogs.push({ lane: lane2, z: dogZ2, type: 'golden_dog' });
        break;
      }

      // --- PATTERN I: DOG + TRAFFIC DECISION ---
      case 'DOG_TRAFFIC_DECISION': {
        const dogLane: Lane = overrides?.dogLane ?? 0;
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        const dogType = overrides?.dogType ?? pickRandomDogType();
        dogs.push({ lane: dogLane, z: dogZ, type: dogType });
        hazards.push({ lane: -1, z: Math.max(0.70, baseZ - 0.28), type: 'barricade' });
        hazards.push({ lane: 1, z: Math.max(0.85, baseZ - 0.12), type: 'taxi' });
        break;
      }

      // --- PATTERN J: RARE DOG + PRESSURE ---
      case 'RARE_DOG_PRESSURE': {
        const dogZ = overrides?.dogZ ?? (baseZ > 0.95 ? 1.02 : baseZ);
        dogs.push({ lane: 0, z: dogZ, type: 'phu_quoc' });
        hazards.push({ lane: -1, z: Math.max(0.72, baseZ - 0.26), type: 'boxes' });
        hazards.push({ lane: 1, z: Math.max(0.72, baseZ - 0.26), type: 'delivery_truck' });
        break;
      }

      // --- PATTERN K: DOG SEQUENCE ---
      case 'DOG_SEQUENCE': {
        const obsZ = Math.max(0.60, baseZ - 0.38);
        const dog1Z = Math.max(0.80, baseZ - 0.18);
        const dog2Z = baseZ > 0.95 ? 1.04 : baseZ;
        hazards.push({ lane: -1, z: obsZ, type: 'pothole' });
        dogs.push({ lane: 0, z: dog1Z, type: 'grass_dog' });
        dogs.push({ lane: 1, z: dog2Z, type: 'golden_dog' });
        break;
      }
    }

    return { pattern, hazards, dogs };
  }

  /**
   * Executes a validated plan by acquiring pooled objects and dispatching spawn callbacks.
   */
  public executeSpawnPlan(
    plan: SpawnPlan,
    onSpawnObstacle: (obs: ObstacleEntity) => void,
    onSpawnDog: (dog: DogEntity) => void,
  ): void {
    for (const h of plan.hazards) {
      const obs = this.acquireObstacle(h.lane, h.z, h.type);
      this.lastObstacleLane = h.lane;
      onSpawnObstacle(obs);
    }
    for (const d of plan.dogs) {
      const config = DOG_CONFIGS[d.type];
      const dog = this.acquireDog(config, d.lane, d.z);
      onSpawnDog(dog);
    }
  }

  /**
   * End-to-end spawn pipeline:
   * Pattern -> Build Plan -> Validate Plan -> If valid: Acquire & Spawn -> If invalid: Fallback
   */
  public spawnPattern(
    pattern: SpawnPattern,
    onSpawnObstacle: (obs: ObstacleEntity) => void,
    onSpawnDog: (dog: DogEntity) => void,
    overrides?: SpawnOverrides,
  ): SpawnPlan {
    let plan = this.buildSpawnPlan(pattern, overrides);

    // Strictly enforce validation before acquiring any pooled entities
    if (!validateSpawnPattern(plan)) {
      // Safe fallback order: invalid advanced pattern -> SINGLE_DOG -> SINGLE_TRAFFIC
      const fallbackPattern: SpawnPattern = plan.dogs.length > 0 ? 'SINGLE_DOG' : 'SINGLE_TRAFFIC';
      let fallbackPlan = this.buildSpawnPlan(fallbackPattern, { z: Math.max(0.70, overrides?.z ?? 1.0) });

      if (!validateSpawnPattern(fallbackPlan)) {
        fallbackPlan = this.buildSpawnPlan('SINGLE_TRAFFIC', { z: Math.max(0.70, overrides?.z ?? 1.0) });
      }

      if (validateSpawnPattern(fallbackPlan)) {
        plan = fallbackPlan;
      } else {
        // Guaranteed safe minimal plan
        plan = {
          pattern: 'SINGLE_TRAFFIC',
          hazards: [{ lane: 0, z: Math.max(0.70, overrides?.z ?? 1.0), type: 'motorbike' }],
          dogs: [],
        };
      }
    }

    this.executeSpawnPlan(plan, onSpawnObstacle, onSpawnDog);
    return plan;
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
