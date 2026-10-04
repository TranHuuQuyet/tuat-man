import { DogEntity } from '../entities/DogEntity';
import { EventBus, GAME_EVENTS } from '../EventBus';

export interface HookResult {
  success: boolean;
  message: string;
  dog?: DogEntity;
}

export class HookSystem {
  private lastHookAttemptTime = 0;
  private minInterval = 0.18;

  public attemptHook(dogs: DogEntity[], currentTime: number): HookResult {
    if (currentTime - this.lastHookAttemptTime < this.minInterval) {
      return { success: false, message: 'SPAM' };
    }
    this.lastHookAttemptTime = currentTime;

    const targetDog = dogs.find((d) => d.active && !d.hooked && d.isInHookRange());

    if (!targetDog) {
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, {
        success: false,
        message: 'MÓC HỤT! (CHƯA VÀO TẦM)',
      });
      return { success: false, message: 'MÓC HỤT! (CHƯA VÀO TẦM)' };
    }

    const roll = Math.random();
    if (roll <= targetDog.config.hookSuccessRate) {
      targetDog.setHooked(true);
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, {
        success: true,
        message: 'ĐÃ MÓC TRÚNG! KÉO MAU!',
      });
      return {
        success: true,
        message: 'ĐÃ MÓC TRÚNG! KÉO MAU!',
        dog: targetDog,
      };
    } else {
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, {
        success: false,
        message: 'MÓC HỤT! (CHÓ NÉ ĐƯỢC)',
      });
      return {
        success: false,
        message: 'MÓC HỤT! (CHÓ NÉ ĐƯỢC)',
      };
    }
  }
}
