import Phaser from 'phaser';
import { projectRoad } from '../utils/projection';

export class ObstacleEntity {
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;

  public roadX: number;
  public z: number;
  public active = true;

  constructor(scene: Phaser.Scene, roadX: number, z = 1.0) {
    this.roadX = roadX;
    this.z = z;

    this.container = scene.add.container(0, 0);
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.renderObstacle();
    this.updatePosition();
  }

  public update(dt: number, speed: number): void {
    this.z -= speed * dt;
    if (this.z < -0.05) {
      this.active = false;
    }
    this.updatePosition();
  }

  private updatePosition(): void {
    const pt = projectRoad(this.roadX, this.z);
    this.container.setPosition(pt.x, pt.y);
    this.container.setScale(pt.scale);
    this.container.setDepth(10 + Math.floor((1 - this.z) * 80));
  }

  private renderObstacle(): void {
    this.graphics.clear();

    this.graphics.fillStyle(0x000000, 0.4);
    this.graphics.fillEllipse(0, 4, 70, 20);

    this.graphics.fillStyle(0xd90429, 1);
    this.graphics.fillRoundedRect(-32, -45, 64, 45, 6);

    this.graphics.fillStyle(0xffb703, 1);
    this.graphics.fillRect(-24, -38, 12, 30);
    this.graphics.fillRect(0, -38, 12, 30);
    this.graphics.fillRect(16, -38, 10, 30);

    const label = this.container.scene.add.text(0, -22, '🚧', {
      fontSize: '22px',
    });
    label.setOrigin(0.5);
    this.container.add(label);
  }

  public checkCollision(playerScreenBounds: { x: number; y: number; radiusX: number; radiusY: number }): boolean {
    if (this.z > 0.22 || this.z < 0.05) return false;

    const pt = projectRoad(this.roadX, this.z);
    const obsY = pt.y - 20 * pt.scale;
    const obsRadiusX = 32 * pt.scale;
    const obsRadiusY = 22 * pt.scale;

    const dx = Math.abs(pt.x - playerScreenBounds.x);
    const dy = Math.abs(obsY - playerScreenBounds.y);

    return dx < (obsRadiusX + playerScreenBounds.radiusX) &&
           dy < (obsRadiusY + playerScreenBounds.radiusY);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
