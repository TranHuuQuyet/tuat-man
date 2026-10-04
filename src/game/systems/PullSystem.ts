import { SFX } from '../audio/SoundEffects';
import { TUNING } from '../data/tuning';
import { DogEntity } from '../entities/DogEntity';
import { EventBus, GAME_EVENTS } from '../EventBus';
import type { PullProgressData } from '../EventBus';

export type PullOutcome = 'IN_PROGRESS' | 'CAUGHT' | 'ESCAPED';

export interface TapFeedback {
  rating: 'PERFECT' | 'GOOD' | 'MISS';
  powerGained: number;
}

export class PullSystem {
  public currentDog: DogEntity | null = null;
  public pullPower: number = TUNING.PULL_BASE_POWER;
  public timeLeft = 0;
  public totalTime = 0;
  private lastTapTime = 0;
  private tapCount = 0;
  private strugglePhase = 0;

  public startPull(dog: DogEntity): void {
    this.currentDog = dog;
    this.pullPower = TUNING.PULL_BASE_POWER;
    this.totalTime = dog.config.pullTimeLimit;
    this.timeLeft = dog.config.pullTimeLimit;
    this.lastTapTime = performance.now();
    this.tapCount = 0;
    this.strugglePhase = 0;

    SFX.playHookHit();
    this.emitProgress();
  }

  public registerTap(): TapFeedback {
    if (!this.currentDog) return { rating: 'MISS', powerGained: 0 };

    const now = performance.now();
    const deltaMs = now - this.lastTapTime;
    this.lastTapTime = now;
    this.tapCount++;

    let rating: 'PERFECT' | 'GOOD' | 'MISS' = 'GOOD';
    let powerGained: number = TUNING.PULL_GOOD_POWER;

    // First tap or rhythmic taps within the sweet rhythm window
    if (this.tapCount === 1) {
      rating = 'GOOD';
      powerGained = TUNING.PULL_GOOD_POWER;
    } else if (deltaMs >= TUNING.PULL_PERFECT_WINDOW_MIN_MS && deltaMs <= TUNING.PULL_PERFECT_WINDOW_MAX_MS) {
      rating = 'PERFECT';
      powerGained = TUNING.PULL_PERFECT_POWER;
    } else if (deltaMs < 80) {
      // Spamming unrealistically fast (off-cadence flutter)
      rating = 'MISS';
      powerGained = TUNING.PULL_MISS_POWER;
    } else if (deltaMs > 450) {
      // Slow hesitation
      rating = 'MISS';
      powerGained = TUNING.PULL_MISS_POWER;
    } else {
      rating = 'GOOD';
      powerGained = TUNING.PULL_GOOD_POWER;
    }

    this.pullPower = Math.min(100, this.pullPower + powerGained);
    SFX.playPullTap(rating);
    this.emitProgress(rating);

    return { rating, powerGained };
  }

  public update(dt: number): PullOutcome {
    if (!this.currentDog) return 'IN_PROGRESS';

    // Condition 1: Win when reaching 100%
    if (this.pullPower >= this.currentDog.config.pullRequiredPower) {
      SFX.playCatch();
      this.currentDog = null;
      return 'CAUGHT';
    }

    this.timeLeft -= dt;
    this.strugglePhase += dt * 5;

    // Dynamic resistance: dog fights back harder when power is between 40% and 75%
    const resistanceMultiplier = 1.0 + Math.sin(this.strugglePhase) * 0.35;
    const currentDrain = this.currentDog.config.pullResistance * resistanceMultiplier * dt;

    this.pullPower = Math.max(0, this.pullPower - currentDrain);

    this.emitProgress();

    // Check win again in case tap occurred right after drain
    if (this.pullPower >= this.currentDog.config.pullRequiredPower) {
      SFX.playCatch();
      this.currentDog = null;
      return 'CAUGHT';
    }

    // Condition 2: Lose if timer expires OR power drops to 0 after tapping has begun
    if (this.timeLeft <= 0 || (this.tapCount > 0 && this.pullPower <= 0)) {
      SFX.playEscape();
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
