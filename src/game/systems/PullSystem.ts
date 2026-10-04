import { TUNING } from '../data/tuning';
import { DogEntity } from '../entities/DogEntity';
import { EventBus, GAME_EVENTS } from '../EventBus';
import type { PullProgressData } from '../EventBus';

export type PullOutcome = 'IN_PROGRESS' | 'CAUGHT' | 'ESCAPED';

export class PullSystem {
  public currentDog: DogEntity | null = null;
  public pullPower = 20;
  public timeLeft = 0;
  public totalTime = 0;
  private lastTapTime = 0;

  public startPull(dog: DogEntity): void {
    this.currentDog = dog;
    this.pullPower = 25;
    this.totalTime = dog.config.pullTimeLimit;
    this.timeLeft = dog.config.pullTimeLimit;
    this.lastTapTime = performance.now();

    this.emitProgress();
  }

  public registerTap(): { rating: 'PERFECT' | 'GOOD' | 'MISS'; powerGained: number } {
    if (!this.currentDog) return { rating: 'MISS', powerGained: 0 };

    const now = performance.now();
    const deltaMs = now - this.lastTapTime;
    this.lastTapTime = now;

    let rating: 'PERFECT' | 'GOOD' | 'MISS' = 'GOOD';
    let powerGained: number = TUNING.PULL_GOOD_POWER;

    if (deltaMs >= 100 && deltaMs <= 240) {
      rating = 'PERFECT';
      powerGained = TUNING.PULL_PERFECT_POWER;
    } else if (deltaMs < 100) {
      rating = 'GOOD';
      powerGained = TUNING.PULL_GOOD_POWER;
    } else {
      rating = 'GOOD';
      powerGained = TUNING.PULL_GOOD_POWER;
    }

    this.pullPower = Math.min(100, this.pullPower + powerGained);
    this.emitProgress(rating);

    return { rating, powerGained };
  }

  public update(dt: number): PullOutcome {
    if (!this.currentDog) return 'IN_PROGRESS';

    this.timeLeft -= dt;
    this.pullPower = Math.max(0, this.pullPower - this.currentDog.config.pullResistance * dt);

    this.emitProgress();

    if (this.pullPower >= this.currentDog.config.pullRequiredPower) {
      this.currentDog = null;
      return 'CAUGHT';
    }

    if (this.timeLeft <= 0) {
      this.currentDog = null;
      return 'ESCAPED';
    }

    return 'IN_PROGRESS';
  }

  private emitProgress(rating?: 'PERFECT' | 'GOOD' | 'MISS'): void {
    const data: PullProgressData = {
      power: Math.round(this.pullPower),
      target: 100,
      rating,
      timeLeft: Math.max(0, this.timeLeft),
    };
    EventBus.emit(GAME_EVENTS.PULL_PROGRESS, data);
  }

  public cancel(): void {
    this.currentDog = null;
  }
}
