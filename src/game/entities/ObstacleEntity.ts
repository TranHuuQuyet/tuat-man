import Phaser from 'phaser';
import { getLaneRoadX } from '../data/tuning';
import type { Lane } from '../data/tuning';
import { projectRoad } from '../utils/projection';

export class ObstacleEntity {
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private blinkLight: Phaser.GameObjects.Graphics;
  private blinkPhase = 0;

  public lane: Lane;
  public roadX: number;
  public z: number;
  public active = true;

  constructor(scene: Phaser.Scene, lane: Lane, z = 1.0) {
    this.lane = lane;
    this.roadX = getLaneRoadX(lane);
    this.z = z;

    this.container = scene.add.container(0, 0);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.blinkLight = scene.add.graphics();
    this.container.add(this.blinkLight);

    this.renderObstacle();
    this.updatePosition();
  }

  public update(dt: number, speed: number): void {
    this.z -= speed * dt;
    this.blinkPhase += dt * 10;

    if (this.z < -0.05) {
      this.active = false;
    }
    this.updatePosition();
  }

  private updatePosition(): void {
    const pt = projectRoad(this.roadX, this.z);
    this.container.setPosition(pt.x, pt.y);
    this.container.setScale(pt.scale);
    this.container.setDepth(12 + Math.floor((1 - this.z) * 70));

    // Blinking hazard beacon light
    this.blinkLight.clear();
    const isLit = Math.sin(this.blinkPhase) > 0;
    if (isLit) {
      this.blinkLight.fillStyle(0xffb703, 1);
      this.blinkLight.fillCircle(0, -56, 7);
      this.blinkLight.fillStyle(0xffd166, 0.4);
      this.blinkLight.fillCircle(0, -56, 14);
    } else {
      this.blinkLight.fillStyle(0x774900, 0.8);
      this.blinkLight.fillCircle(0, -56, 5);
    }

    // Advance lane hazard telegraph indicator when approaching (z between 0.22 and 0.85)
    if (this.z >= 0.22 && this.z <= 0.85) {
      const pulse = 0.7 + 0.3 * Math.sin(this.blinkPhase * 1.2);
      // Danger triangle/chevron above barrier
      this.blinkLight.fillStyle(0xff2222, pulse);
      this.blinkLight.fillTriangle(0, -68, -10, -84, 10, -84);
      this.blinkLight.fillStyle(0xffffff, 0.95);
      this.blinkLight.fillRect(-2, -82, 4, 7);
      this.blinkLight.fillRect(-2, -73, 4, 2);
    }
  }

  private renderObstacle(): void {
    this.graphics.clear();

    // Road shadow
    this.graphics.fillStyle(0x000000, 0.45);
    this.graphics.fillEllipse(0, 4, 76, 22);

    // Vietnamese Construction Barrier (Rào chắn thi công)
    // Stand legs
    this.graphics.fillStyle(0x222222, 1);
    this.graphics.fillRect(-28, -12, 6, 14);
    this.graphics.fillRect(22, -12, 6, 14);

    // Barrier board
    this.graphics.fillStyle(0xd90429, 1); // Red barricade
    this.graphics.fillRoundedRect(-34, -48, 68, 38, 6);

    // Hazard reflective stripes (Sọc vàng phản quang)
    this.graphics.fillStyle(0xffd166, 1);
    this.graphics.fillRect(-24, -44, 12, 30);
    this.graphics.fillRect(-4, -44, 12, 30);
    this.graphics.fillRect(16, -44, 12, 30);

    // Beacon stand
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(-4, -54, 8, 8);
  }

  public checkCollision(
    playerLane: Lane,
    playerRoadX: number,
    playerScreenBounds?: { x: number; y: number; radiusX: number; radiusY: number },
  ): boolean {
    // Only collide when close in perspective (z roughly between 0.05 and 0.18)
    if (this.z > 0.18 || this.z < 0.05) return false;

    // Primary check: Lane match
    const isSameLane = playerLane === this.lane;
    const roadXDist = Math.abs(playerRoadX - this.roadX);

    // If player is safely in another lane, zero collision
    if (!isSameLane && roadXDist > 0.28) {
      return false;
    }

    // If in same lane or transition distance within hitbox
    if (roadXDist < 0.32) {
      return true;
    }

    if (playerScreenBounds) {
      const pt = projectRoad(this.roadX, this.z);
      const obsY = pt.y - 20 * pt.scale;
      const obsRadiusX = 26 * pt.scale;
      const obsRadiusY = 18 * pt.scale;

      const dx = Math.abs(pt.x - playerScreenBounds.x);
      const dy = Math.abs(obsY - playerScreenBounds.y);

      return dx < (obsRadiusX + playerScreenBounds.radiusX) &&
             dy < (obsRadiusY + playerScreenBounds.radiusY);
    }

    return false;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
