export type GameState =
  | 'MENU'
  | 'RIDE'
  | 'HOOKING'
  | 'PULLING'
  | 'DOG_CAUGHT'
  | 'DOG_ESCAPED'
  | 'CRASH'
  | 'GAME_OVER'
  | 'RESULT';

export interface PullProgressData {
  power: number;
  target: number;
  rating?: 'PERFECT' | 'GOOD' | 'MISS';
  timeLeft: number;
}

export interface RunStats {
  playerName: string;
  dogCount: number;
  money: number;
  score: number;
  distance: number;
}

export interface HookReadyData {
  ready: boolean;
  side?: 'left' | 'right';
  dogName?: string;
}

export type EventCallback<T = any> = (data: T) => void;

class EventEmitter {
  private events: Map<string, Set<EventCallback>> = new Map();

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    const set = this.events.get(event)!;
    set.add(callback as EventCallback);
    return () => {
      set.delete(callback as EventCallback);
    };
  }

  emit<T>(event: string, data?: T): void {
    const set = this.events.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.events.clear();
  }
}

export const EventBus = new EventEmitter();

export const GAME_EVENTS = {
  START_GAME: 'START_GAME',
  RESTART_GAME: 'RESTART_GAME',
  INPUT_STEER_LEFT: 'INPUT_STEER_LEFT',
  INPUT_STEER_RIGHT: 'INPUT_STEER_RIGHT',
  INPUT_HOOK: 'INPUT_HOOK',
  INPUT_PULL: 'INPUT_PULL',
  STATE_CHANGE: 'STATE_CHANGE',
  STATS_UPDATE: 'STATS_UPDATE',
  HOOK_FEEDBACK: 'HOOK_FEEDBACK',
  HOOK_READY_UPDATE: 'HOOK_READY_UPDATE',
  PULL_PROGRESS: 'PULL_PROGRESS',
  GAME_OVER: 'GAME_OVER',
} as const;
