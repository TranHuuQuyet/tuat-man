import type { Lane } from '../data/tuning';
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

  public attemptHook(dogs: DogEntity[], playerLane: Lane, playerRoadX: number, currentTime: number): HookResult {
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

    // PRIORITY 1: Check for hookable candidates in the player's lane
    const sameLaneHookable = candidateDogs.filter(
      (d) => d.lane === playerLane && d.getHookState() === 'HOOKABLE',
    );

    if (sameLaneHookable.length > 0) {
      // Pick best candidate: closest in depth (z ascending)
      sameLaneHookable.sort((a, b) => a.z - b.z);
      const targetDog = sameLaneHookable[0]!;

      // Transition check: ensure player is physically aligned with the lane (scaled by dog targetSize)
      const targetSize = targetDog.config.targetSize ?? 1.0;
      const maxOffset = 0.22 * targetSize;
      if (Math.abs(playerRoadX - targetDog.roadX) > maxOffset) {
        const msg = 'CHƯA VÀO ĐỦ LÀN!';
        EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'WRONG_SIDE' });
        return { success: false, message: msg, reason: 'WRONG_SIDE' };
      }

      // Valid candidate in player lane hooked!
      targetDog.setHooked(true);
      const successMsg = '🎯 DÍNH RỒI! KÉO MAU!';
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, {
        success: true,
        message: successMsg,
      });

      return {
        success: true,
        message: successMsg,
        dog: targetDog,
      };
    }

    // PRIORITY 2: Check other dogs in player's lane (approaching or passed)
    const sameLaneAny = candidateDogs.filter((d) => d.lane === playerLane);
    if (sameLaneAny.length > 0) {
      sameLaneAny.sort((a, b) => a.z - b.z);
      const nearestSameLane = sameLaneAny[0]!;
      const state = nearestSameLane.getHookState();

      if (state === 'OUT_OF_RANGE' || state === 'APPROACHING') {
        const msg = 'CHƯA TỚI! (CÒN Ở XA)';
        EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'TOO_FAR' });
        return { success: false, message: msg, reason: 'TOO_FAR' };
      }

      if (state === 'PASSED') {
        const msg = 'QUÁ TRỄ! (CHÓ ĐÃ QUA)';
        EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'TOO_LATE' });
        return { success: false, message: msg, reason: 'TOO_LATE' };
      }
    }

    // PRIORITY 3: No dogs in player's lane, check dogs in other lanes
    const otherLaneDogs = candidateDogs.filter((d) => d.lane !== playerLane);
    if (otherLaneDogs.length > 0) {
      otherLaneDogs.sort((a, b) => a.z - b.z);
      const nearestOther = otherLaneDogs[0]!;
      const otherState = nearestOther.getHookState();

      if (otherState === 'HOOKABLE' || otherState === 'APPROACHING') {
        const dirText = nearestOther.lane < playerLane ? 'TRÁI' : 'PHẢI';
        const msg = `SAI LÀN! QUA ${dirText} ĐỂ MÓC!`;
        EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'WRONG_SIDE' });
        return { success: false, message: msg, reason: 'WRONG_SIDE' };
      }

      if (otherState === 'PASSED') {
        const msg = 'QUÁ TRỄ! (CHÓ ĐÃ QUA)';
        EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'TOO_LATE' });
        return { success: false, message: msg, reason: 'TOO_LATE' };
      }

      const msg = 'CHƯA TỚI! (CÒN Ở XA)';
      EventBus.emit(GAME_EVENTS.HOOK_FEEDBACK, { success: false, message: msg, reason: 'TOO_FAR' });
      return { success: false, message: msg, reason: 'TOO_FAR' };
    }

    return { success: false, message: 'KHÔNG CÓ CHÓ!', reason: 'NO_DOG' };
  }
}
