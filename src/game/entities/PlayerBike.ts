import Phaser from 'phaser';
import { TUNING } from '../data/tuning';
import { projectRoad } from '../utils/projection';

export class PlayerBike {
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;

  public roadX = 0;
  public z = TUNING.PLAYER_Z;
  public currentLean = 0;
  public poleSide: 'left' | 'right' = 'right';
  private bounceTime = 0;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(100);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.renderBikeGraphics();
    this.updatePosition();
  }

  public setPoleSide(side: 'left' | 'right'): void {
    if (this.poleSide !== side) {
      this.poleSide = side;
      this.renderBikeGraphics();
    }
  }

  public update(dt: number, steerInput: number): void {
    this.roadX += steerInput * TUNING.PLAYER_STEER_SPEED * dt;
    const maxRoadX = 0.85;
    if (this.roadX < -maxRoadX) this.roadX = -maxRoadX;
    if (this.roadX > maxRoadX) this.roadX = maxRoadX;

    const targetLean = steerInput * TUNING.PLAYER_LEAN_MAX_ANGLE;
    this.currentLean = Phaser.Math.Linear(this.currentLean, targetLean, TUNING.TILT_LERP);

    this.bounceTime += dt * 14;
    const bounceOffset = Math.sin(this.bounceTime) * 1.5;

    this.container.setRotation(this.currentLean);
    this.updatePosition(bounceOffset);
  }

  private updatePosition(bounceY = 0): void {
    const pt = projectRoad(this.roadX, this.z);
    this.container.setPosition(pt.x, pt.y + bounceY);
    this.container.setScale(pt.scale);
  }

  private renderBikeGraphics(): void {
    this.graphics.clear();

    // Shadow on asphalt
    this.graphics.fillStyle(0x000000, 0.45);
    this.graphics.fillEllipse(0, 4, 92, 24);

    // Rear Tire
    this.graphics.fillStyle(0x111111, 1);
    this.graphics.fillRoundedRect(-14, -40, 28, 44, 8);
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(-6, -34, 12, 32);

    // Exhaust pipe (Bô xe)
    this.graphics.fillStyle(0x777777, 1);
    this.graphics.fillRoundedRect(12, -26, 12, 32, 4);
    this.graphics.fillStyle(0x222222, 1);
    this.graphics.fillCircle(18, 4, 5);

    // Bike Frame (Wave Alpha Red / Honda Wave red body)
    this.graphics.fillStyle(0xd62828, 1);
    this.graphics.fillRoundedRect(-28, -80, 56, 48, 10);

    // Vietnamese License Plate (Biển số phản quang)
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillRect(-15, -45, 30, 16);
    this.graphics.fillStyle(0x111111, 1);
    this.graphics.fillRect(-11, -41, 22, 8);

    // Tail light (Đèn hậu đỏ)
    this.graphics.fillStyle(0xff1e00, 1);
    this.graphics.fillRoundedRect(-18, -62, 36, 12, 3);

    // 1. FRONT DRIVER (Tài xế ngồi trước, áo xanh thẫm, mũ bảo hiểm xanh)
    this.graphics.fillStyle(0x003049, 1);
    this.graphics.fillRoundedRect(-26, -135, 52, 55, 12);

    // Driver Arms holding handlebars
    this.graphics.fillStyle(0x002133, 1);
    this.graphics.fillRect(-34, -125, 12, 35);
    this.graphics.fillRect(22, -125, 12, 35);

    // Driver Helmet (Mũ bảo hiểm nửa đầu)
    this.graphics.fillStyle(0x2a9d8f, 1);
    this.graphics.fillCircle(0, -155, 20);

    // 2. REAR PASSENGER (Người ngồi sau, áo cam, mũ vàng, cầm cần móc tre)
    this.graphics.fillStyle(0xf77f00, 1);
    this.graphics.fillRoundedRect(-22, -118, 44, 46, 10);

    // Passenger Helmet
    this.graphics.fillStyle(0xfcb316, 1);
    this.graphics.fillCircle(this.poleSide === 'right' ? 4 : -4, -138, 18);

    // Bamboo Hook Pole (Cần móc chó dài)
    const poleEndX = this.poleSide === 'right' ? 68 : -68;
    const poleEndY = -76;
    const poleStartX = this.poleSide === 'right' ? 12 : -12;

    this.graphics.lineStyle(5, 0xc2a649, 1); // Bamboo pole color
    this.graphics.lineBetween(poleStartX, -98, poleEndX, poleEndY);

    // Metal snare loop / hook at tip
    this.graphics.lineStyle(3, 0x00ff88, 1);
    this.graphics.strokeCircle(poleEndX + (this.poleSide === 'right' ? 4 : -4), poleEndY + 2, 8);
  }

  public getHookTipScreenPos(): { x: number; y: number } {
    const pt = projectRoad(this.roadX, this.z);
    const poleOffsetLocalX = this.poleSide === 'right' ? 72 : -72;
    const poleOffsetLocalY = -74;

    // Apply rotation and scale
    const cos = Math.cos(this.currentLean);
    const sin = Math.sin(this.currentLean);
    const rotX = (poleOffsetLocalX * cos - poleOffsetLocalY * sin) * pt.scale;
    const rotY = (poleOffsetLocalX * sin + poleOffsetLocalY * cos) * pt.scale;

    return {
      x: pt.x + rotX,
      y: pt.y + rotY,
    };
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
