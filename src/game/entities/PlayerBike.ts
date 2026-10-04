import Phaser from 'phaser';
import { TUNING } from '../data/tuning';
import { projectRoad } from '../utils/projection';

export class PlayerBike {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;

  public roadX = 0;
  public z = TUNING.PLAYER_Z;
  public currentLean = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(100);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.renderBikeGraphics();
    this.updatePosition();
  }

  public update(dt: number, steerInput: number): void {
    this.roadX += steerInput * TUNING.PLAYER_STEER_SPEED * dt;
    const maxRoadX = 0.82;
    if (this.roadX < -maxRoadX) this.roadX = -maxRoadX;
    if (this.roadX > maxRoadX) this.roadX = maxRoadX;

    const targetLean = steerInput * TUNING.PLAYER_LEAN_MAX_ANGLE;
    this.currentLean = Phaser.Math.Linear(this.currentLean, targetLean, TUNING.TILT_LERP);

    this.container.setRotation(this.currentLean);
    this.updatePosition();
  }

  private updatePosition(): void {
    const pt = projectRoad(this.roadX, this.z);
    this.container.setPosition(pt.x, pt.y);
    this.container.setScale(pt.scale);
  }

  private renderBikeGraphics(): void {
    this.graphics.clear();

    this.graphics.fillStyle(0x000000, 0.45);
    this.graphics.fillEllipse(0, 4, 90, 24);

    this.graphics.fillStyle(0x111111, 1);
    this.graphics.fillRoundedRect(-14, -40, 28, 44, 8);
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(-6, -34, 12, 32);

    this.graphics.fillStyle(0x777777, 1);
    this.graphics.fillRoundedRect(12, -26, 12, 32, 4);
    this.graphics.fillStyle(0x222222, 1);
    this.graphics.fillCircle(18, 4, 5);

    this.graphics.fillStyle(0xd62828, 1);
    this.graphics.fillRoundedRect(-28, -80, 56, 48, 10);

    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillRect(-15, -45, 30, 16);

    this.graphics.fillStyle(0xff1e00, 1);
    this.graphics.fillRoundedRect(-18, -62, 36, 12, 3);

    this.graphics.fillStyle(0x003049, 1);
    this.graphics.fillRoundedRect(-26, -135, 52, 55, 12);

    this.graphics.fillStyle(0x002133, 1);
    this.graphics.fillRect(-34, -125, 12, 35);
    this.graphics.fillRect(22, -125, 12, 35);

    this.graphics.fillStyle(0x2a9d8f, 1);
    this.graphics.fillCircle(0, -155, 20);

    this.graphics.fillStyle(0xf77f00, 1);
    this.graphics.fillRoundedRect(-22, -118, 44, 46, 10);

    this.graphics.fillStyle(0xfcb316, 1);
    this.graphics.fillCircle(4, -138, 18);

    this.graphics.lineStyle(4, 0xbcaaa4, 1);
    this.graphics.lineBetween(14, -100, 55, -80);
    this.graphics.lineStyle(2, 0xe0e0e0, 1);
    this.graphics.strokeCircle(58, -76, 7);

    const label = this.scene.add.text(0, -188, '🏍️ 2 NGƯỜI', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffd23f',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
    });
    label.setOrigin(0.5);
    this.container.add(label);
  }

  public getScreenBounds(): { x: number; y: number; radiusX: number; radiusY: number } {
    const pt = projectRoad(this.roadX, this.z);
    return {
      x: pt.x,
      y: pt.y - 45 * pt.scale,
      radiusX: TUNING.PLAYER_COLLISION_RADIUS_X * pt.scale,
      radiusY: TUNING.PLAYER_COLLISION_RADIUS_Y * pt.scale,
    };
  }

  public destroy(): void {
    this.container.destroy();
  }
}
