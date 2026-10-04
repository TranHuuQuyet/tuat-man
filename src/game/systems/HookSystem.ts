import { DogEntity } from '../entities/DogEntity';
import { EventBus, GAME_EVENTS } from '../EventBus';

export type HookMissReason = 'NO_DOG' | 'TOO_FAR' | 'TOO_LATE' | 'WRONG_SIDE' | 'SPAM';

export interface HookResult {
  success: boolean;
  message: string;
  reason?: HookMissReason;
  dog?: DogEntity;
}

export class HookSystem {
  private lastHookAttemptTime = 0;
  private minInterval = 0.12; // 120ms debounce for rapid clicking/tapping

  public attemptHook(dogs: DogEntity[], playerRoadX: number, currentTime: number): HookResult {
    if (currentTime - this.lastHookAttemptTime < this.minInterval) {
      return { success: false, message: 'SPAM', reason: 'SPAM' };
    }
    this.lastHookAttemptTime = currentTime;

    // Filter available active dogs that aren't hooked yet
    const candidateDogs = dogs.filter((d) => d.active && !d.hooked && !d.escaped);

    if (candidateDogs.length === 0) {
      const msg = 'KHÔNG CÓ CHÓ!';
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'NO_DOG' });
      return { success: false, message: msg, reason: 'NO_DOG' };
    }

    // Sort by proximity (lowest z that is ahead of player)
    candidateDogs.sort((a, b) => a.z - b.z);
    const nearestDog = candidateDogs[0]!;

    const hookState = nearestDog.getHookState();

    // Reason 1: Dog is too far ahead
    if (hookState === 'OUT_OF_RANGE' || hookState === 'APPROACHING') {
      const msg = 'CHƯA TỚI! (CÒN Ở XA)';
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'TOO_FAR' });
      return { success: false, message: msg, reason: 'TOO_FAR' };
    }

    // Reason 2: Dog has already passed behind the bike
    if (hookState === 'PASSED') {
      const msg = 'QUÁ TRỄ! (CHÓ ĐÃ QUA)';
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'TOO_LATE' });
      return { success: false, message: msg, reason: 'TOO_LATE' };
    }

    // Reason 3: Dog is in hook window (HOOKABLE), but is player on the right side of the road?
    // Left dog (roadX < 0): player cannot reach from far right lane (playerRoadX > 0.35)
    // Right dog (roadX > 0): player cannot reach from far left lane (playerRoadX < -0.35)
    const isDogOnLeft = nearestDog.roadX < 0;
    if (isDogOnLeft && playerRoadX > 0.35) {
      const msg = 'QUÁ XA! LÁI SANG TRÁI ĐỂ MÓC!';
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'WRONG_SIDE' });
      return { success: false, message: msg, reason: 'WRONG_SIDE' };
    }
    if (!isDogOnLeft && playerRoadX < -0.35) {
      const msg = 'QUÁ XA! LÁI SANG PHẢI ĐỂ MÓC!';
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'WRONG_SIDE' });
      return { success: false, message: msg, reason: 'WRONG_SIDE' };
    }

    // Both Timing & Side requirements satisfied!
    nearestDog.setHooked(true);
    const successMsg = '🎯 DÍNH RỒI! KÉO MAU!';
    EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, {
      success: true,
      message: successMsg,
    });

    return {
      success: true,
      message: successMsg,
      dog: nearestDog,
    };
  }
}
