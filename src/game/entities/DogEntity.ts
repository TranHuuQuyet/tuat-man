import Phaser from 'phaser';
import type { DogConfig } from '../data/dogs';
import { projectRoad } from '../utils/projection';

export class DogEntity {
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private statusText: Phaser.GameObjects.Text;
  private rangeIndicator: Phaser.GameObjects.Graphics;

  public config: DogConfig;
  public roadX: number;
  public z: number;
  public active = true;
  public hooked = false;

  constructor(scene: Phaser.Scene, config: DogConfig, roadX: number, z = 1.0) {
    this.config = config;
    this.roadX = roadX;
    this.z = z;

    this.container = scene.add.container(0, 0);

    this.rangeIndicator = scene.add.graphics();
    this.container.add(this.rangeIndicator);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.statusText = scene.add.text(0, -65, '🐕 CHÓ', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffd23f',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
    });
    this.statusText.setOrigin(0.5);
    this.container.add(this.statusText);

    this.renderDog();
    this.updatePosition();
  }

  public update(dt: number, speed: number): void {
    if (!this.hooked) {
      this.z -= speed * dt;
      if (this.z < -0.1) {
        this.active = false;
      }
    }
    this.updatePosition();
  }

  public isInHookRange(): boolean {
    return this.z >= this.config.hookMinZ && this.z <= this.config.hookMaxZ;
  }

  private updatePosition(): void {
    const pt = projectRoad(this.roadX, this.z);
    this.container.setPosition(pt.x, pt.y);
    this.container.setScale(pt.scale);
    this.container.setDepth(10 + Math.floor((1 - this.z) * 80));

    this.rangeIndicator.clear();
    if (this.isInHookRange() && !this.hooked) {
      this.rangeIndicator.lineStyle(3, 0x00ff88, 0.9);
      this.rangeIndicator.strokeCircle(0, -20, 48);

      this.statusText.setText('🎯 VÀO TẦM MÓC!');
      this.statusText.setColor('#00ff88');
    } else {
      this.statusText.setText(`🐕 ${this.config.name}`);
      this.statusText.setColor('#ffd23f');
    }
  }

  private renderDog(): void {
    this.graphics.clear();

    this.graphics.fillStyle(0x000000, 0.35);
    this.graphics.fillEllipse(0, 2, 54, 18);

    this.graphics.fillStyle(0xd4a373, 1);
    this.graphics.fillRoundedRect(-24, -34, 48, 28, 8);

    const headX = this.roadX > 0 ? -18 : 18;
    this.graphics.fillStyle(0xcc8b55, 1);
    this.graphics.fillCircle(headX, -38, 16);

    const snoutX = this.roadX > 0 ? headX - 10 : headX + 10;
    this.graphics.fillStyle(0x332211, 1);
    this.graphics.fillCircle(snoutX, -36, 5);

    this.graphics.fillStyle(0x99582a, 1);
    this.graphics.fillTriangle(headX - 10, -48, headX - 2, -62, headX + 6, -48);

    this.graphics.fillStyle(0xbc6c25, 1);
    this.graphics.fillRect(-18, -12, 8, 14);
    this.graphics.fillRect(10, -12, 8, 14);

    const tailX = this.roadX > 0 ? 22 : -22;
    this.graphics.lineStyle(4, 0xcc8b55, 1);
    this.graphics.lineBetween(tailX, -30, tailX + (this.roadX > 0 ? 10 : -10), -45);
  }

  public setHooked(hooked: boolean): void {
    this.hooked = hooked;
    if (hooked) {
      this.statusText.setText('⚡ ĐANG KÉO!');
      this.statusText.setColor('#ff3b3b');
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
