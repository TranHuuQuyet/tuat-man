import Phaser from 'phaser';
import { TUNING } from '../data/tuning';
import { EventBus, GAME_EVENTS } from '../EventBus';

export class InputController {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keyA: Phaser.Input.Keyboard.Key | null = null;
  private keyD: Phaser.Input.Keyboard.Key | null = null;
  private keySpace: Phaser.Input.Keyboard.Key | null = null;

  private pendingLaneChange: -1 | 0 | 1 = 0;
  private bufferedLaneChange: -1 | 0 | 1 = 0;
  private bufferedTime = 0;
  private lastLaneChangeTime = 0;
  private lastConsumedDirection: -1 | 0 | 1 = 0;

  // Swipe detection
  private touchStartX = 0;
  private touchStartY = 0;
  private isSwiping = false;

  private unsubscribers: (() => void)[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupSwipe();
    this.setupEventBus();
  }

  private setupKeyboard(): void {
    if (!this.scene.input.keyboard) return;
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.keyA = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private setupSwipe(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchStartX = pointer.x;
      this.touchStartY = pointer.y;
      this.isSwiping = true;
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isSwiping) return;
      const dx = pointer.x - this.touchStartX;
      const dy = pointer.y - this.touchStartY;
      const minSwipeDistance = 32;

      if (Math.abs(dx) >= minSwipeDistance && Math.abs(dx) > Math.abs(dy) * 1.2) {
        this.triggerLaneChange(dx < 0 ? -1 : 1);
        this.isSwiping = false; // Consume swipe
      }
    });

    this.scene.input.on('pointerup', () => {
      this.isSwiping = false;
    });
  }

  private setupEventBus(): void {
    this.unsubscribers.push(
      EventBus.on(GAME_EVENTS.INPUT_STEER_LEFT, (active: boolean) => {
        if (active) this.triggerLaneChange(-1);
      }),
      EventBus.on(GAME_EVENTS.INPUT_STEER_RIGHT, (active: boolean) => {
        if (active) this.triggerLaneChange(1);
      }),
    );
  }

  public triggerLaneChange(direction: -1 | 1): void {
    const now = performance.now() / 1000;
    // Immediate direction reversal: if player was moving left and taps right, execute immediately!
    const isReversal = this.lastConsumedDirection !== 0 && this.lastConsumedDirection !== direction;

    if (now - this.lastLaneChangeTime < TUNING.LANE_SWITCH_COOLDOWN && !isReversal) {
      // Buffer input for up to 160ms so rapid consecutive taps aren't lost
      this.bufferedLaneChange = direction;
      this.bufferedTime = now;
      return;
    }

    this.pendingLaneChange = direction;
    this.bufferedLaneChange = 0;
    this.lastLaneChangeTime = now;
  }

  /**
   * Consumes queued lane switch command from keyboard, swipe, or onscreen UI.
   * Returns -1 (LEFT), 1 (RIGHT), or 0 (NONE).
   */
  public consumeLaneChange(): -1 | 0 | 1 {
    // Check keyboard single-press triggers
    const isLeftKey =
      (this.cursors?.left && Phaser.Input.Keyboard.JustDown(this.cursors.left)) ||
      (this.keyA && Phaser.Input.Keyboard.JustDown(this.keyA));
    const isRightKey =
      (this.cursors?.right && Phaser.Input.Keyboard.JustDown(this.cursors.right)) ||
      (this.keyD && Phaser.Input.Keyboard.JustDown(this.keyD));

    if (isLeftKey) {
      this.triggerLaneChange(-1);
    } else if (isRightKey) {
      this.triggerLaneChange(1);
    }

    let change: -1 | 0 | 1 = 0;
    if (this.pendingLaneChange !== 0) {
      change = this.pendingLaneChange;
      this.pendingLaneChange = 0;
    } else if (this.bufferedLaneChange !== 0) {
      const now = performance.now() / 1000;
      if (now - this.bufferedTime <= 0.16) {
        change = this.bufferedLaneChange;
        this.lastLaneChangeTime = now;
      }
      this.bufferedLaneChange = 0;
    }

    if (change !== 0) {
      this.lastConsumedDirection = change;
    }
    return change;
  }

  public isSpaceJustDown(): boolean {
    return !!this.keySpace && Phaser.Input.Keyboard.JustDown(this.keySpace);
  }

  public destroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}
