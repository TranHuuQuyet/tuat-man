import Phaser from 'phaser';
import { EventBus, GAME_EVENTS } from '../EventBus';

export class InputController {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keyA: Phaser.Input.Keyboard.Key | null = null;
  private keyD: Phaser.Input.Keyboard.Key | null = null;
  private keySpace: Phaser.Input.Keyboard.Key | null = null;

  private uiSteerLeft = false;
  private uiSteerRight = false;
  private unsubscribers: (() => void)[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupEventBus();
  }

  private setupKeyboard(): void {
    if (!this.scene.input.keyboard) return;
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.keyA = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private setupEventBus(): void {
    this.unsubscribers.push(
      EventBus.on(GAME_EVENTS.INPUT_STEER_LEFT, (active: boolean) => {
        this.uiSteerLeft = active;
      }),
      EventBus.on(GAME_EVENTS.INPUT_STEER_RIGHT, (active: boolean) => {
        this.uiSteerRight = active;
      }),
    );
  }

  public getSteerDirection(): number {
    let dir = 0;
    const isLeft = (this.cursors?.left.isDown ?? false) || (this.keyA?.isDown ?? false) || this.uiSteerLeft;
    const isRight = (this.cursors?.right.isDown ?? false) || (this.keyD?.isDown ?? false) || this.uiSteerRight;
    if (isLeft) dir -= 1;
    if (isRight) dir += 1;
    return dir;
  }

  public isSpaceJustDown(): boolean {
    return !!this.keySpace && Phaser.Input.Keyboard.JustDown(this.keySpace);
  }

  public destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}
