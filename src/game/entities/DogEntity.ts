import Phaser from 'phaser';
import type { DogConfig } from '../data/dogs';
import { getLaneRoadX, TUNING } from '../data/tuning';
import type { Lane } from '../data/tuning';
import { projectRoad } from '../utils/projection';

export type DogHookState = 'OUT_OF_RANGE' | 'APPROACHING' | 'HOOKABLE' | 'PASSED' | 'HOOKED' | 'ESCAPED';

export class DogEntity {
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private statusText: Phaser.GameObjects.Text;
  private rangeIndicator: Phaser.GameObjects.Graphics;

  public config: DogConfig;
  public lane: Lane;
  public roadX: number;
  public z: number;
  public active = true;
  public hooked = false;
  public escaped = false;
  private pulsePhase = 0;

  constructor(scene: Phaser.Scene, config: DogConfig, lane: Lane, z = 1.0) {
    this.config = config;
    this.lane = lane;
    this.roadX = getLaneRoadX(lane);
    this.z = z;

    this.container = scene.add.container(0, 0);

    this.rangeIndicator = scene.add.graphics();
    this.container.add(this.rangeIndicator);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.statusText = scene.add.text(0, -70, '🐕 CHÓ', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd23f',
      backgroundColor: '#0a0914cc',
      padding: { x: 6, y: 3 },
    });
    this.statusText.setOrigin(0.5);
    this.container.add(this.statusText);

    this.renderDog();
    this.updatePosition();
  }

  public getHookState(): DogHookState {
    if (this.escaped) return 'ESCAPED';
    if (this.hooked) return 'HOOKED';
    if (this.z > TUNING.DOG_APPROACH_Z) return 'OUT_OF_RANGE';
    if (this.z > TUNING.DOG_HOOK_MAX_Z) return 'APPROACHING';
    if (this.z >= TUNING.DOG_HOOK_MIN_Z) return 'HOOKABLE';
    return 'PASSED';
  }

  public isInHookRange(): boolean {
    return this.getHookState() === 'HOOKABLE';
  }

  public update(dt: number, speed: number): void {
    this.pulsePhase += dt * 8;

    if (this.escaped) {
      // Flee away fast towards roadside
      this.roadX += (this.roadX > 0 ? 0.8 : -0.8) * dt;
      this.z -= speed * 0.5 * dt;
      if (Math.abs(this.roadX) > 1.8 || this.z < -0.2) {
        this.active = false;
      }
    } else if (!this.hooked) {
      this.z -= speed * dt;
      if (this.z < -0.1) {
        this.active = false;
      }
    } else {
      // Hooked: dog struggles and resists, jittering near its lane
      const struggleX = Math.sin(this.pulsePhase * 3) * 0.03;
      const targetSide = getLaneRoadX(this.lane) + (this.lane >= 0 ? 0.22 : -0.22);
      this.roadX = Phaser.Math.Linear(this.roadX, targetSide + struggleX, 0.05);
    }

    this.updatePosition();
  }

  public getScreenPos(): { x: number; y: number; scale: number } {
    return projectRoad(this.roadX, this.z);
  }

  private updatePosition(): void {
    const pt = projectRoad(this.roadX, this.z);
    this.container.setPosition(pt.x, pt.y);
    this.container.setScale(pt.scale);
    this.container.setDepth(15 + Math.floor((1 - this.z) * 75));

    this.rangeIndicator.clear();
    const hookState = this.getHookState();

    if (hookState === 'HOOKABLE') {
      // Pulsating bright neon green targeting ring & reticle
      const pulse = 1 + Math.sin(this.pulsePhase) * 0.12;
      const radius = 48 * pulse;

      this.rangeIndicator.lineStyle(3, 0x00ff88, 0.95);
      this.rangeIndicator.strokeCircle(0, -22, radius);

      // Crosshairs
      this.rangeIndicator.lineStyle(2, 0x00ff88, 0.7);
      this.rangeIndicator.lineBetween(-radius - 8, -22, -radius + 4, -22);
      this.rangeIndicator.lineBetween(radius - 4, -22, radius + 8, -22);
      this.rangeIndicator.lineBetween(0, -22 - radius - 8, 0, -22 - radius + 4);
      this.rangeIndicator.lineBetween(0, -22 + radius - 4, 0, -22 + radius + 8);

      this.statusText.setText('🎯 VÀO TẦM MÓC!');
      this.statusText.setColor('#00ff88');
      this.statusText.setScale(1.05);
    } else if (hookState === 'APPROACHING') {
      // Yellow warning indicator
      this.rangeIndicator.lineStyle(2, 0xffd23f, 0.6);
      this.rangeIndicator.strokeCircle(0, -22, 42);

      this.statusText.setText('⏳ ĐANG TỚI...');
      this.statusText.setColor('#ffd23f');
      this.statusText.setScale(0.95);
    } else if (hookState === 'HOOKED') {
      // Red strain indicator
      this.rangeIndicator.lineStyle(3, 0xff3b3b, 0.85);
      this.rangeIndicator.strokeCircle(0, -22, 44);

      this.statusText.setText('⚡ ĐANG GIẰNG CO!');
      this.statusText.setColor('#ff3b3b');
      this.statusText.setScale(1.0);
    } else if (hookState === 'ESCAPED') {
      this.statusText.setText('💨 ĐÃ CHẠY MẤT!');
      this.statusText.setColor('#ff9f1c');
    } else {
      this.statusText.setText(`🐕 ${this.config.name}`);
      this.statusText.setColor('#e0dbcd');
      this.statusText.setScale(0.9);
    }
  }

  private renderDog(): void {
    this.graphics.clear();

    // Ground shadow
    this.graphics.fillStyle(0x000000, 0.4);
    this.graphics.fillEllipse(0, 3, 56, 18);

    // Body
    this.graphics.fillStyle(0xd4a373, 1);
    this.graphics.fillRoundedRect(-24, -34, 48, 28, 8);

    // Head facing road center
    const headX = this.roadX > 0 ? -18 : 18;
    this.graphics.fillStyle(0xcc8b55, 1);
    this.graphics.fillCircle(headX, -38, 16);

    // Snout
    const snoutX = this.roadX > 0 ? headX - 10 : headX + 10;
    this.graphics.fillStyle(0x332211, 1);
    this.graphics.fillCircle(snoutX, -36, 5);

    // Eyes
    this.graphics.fillStyle(0x111111, 1);
    this.graphics.fillCircle(headX - (this.roadX > 0 ? 3 : -3), -42, 3);

    // Ears
    this.graphics.fillStyle(0x99582a, 1);
    this.graphics.fillTriangle(headX - 10, -48, headX - 2, -62, headX + 6, -48);

    // Collar
    this.graphics.fillStyle(0xff3b3b, 1);
    this.graphics.fillRect(headX - (this.roadX > 0 ? 3 : 5), -32, 6, 10);

    // Legs
    this.graphics.fillStyle(0xbc6c25, 1);
    this.graphics.fillRect(-18, -12, 8, 15);
    this.graphics.fillRect(10, -12, 8, 15);

    // Tail
    const tailX = this.roadX > 0 ? 22 : -22;
    this.graphics.lineStyle(4, 0xcc8b55, 1);
    this.graphics.lineBetween(tailX, -30, tailX + (this.roadX > 0 ? 12 : -12), -46);
  }

  public setHooked(hooked: boolean): void {
    this.hooked = hooked;
  }

  public setEscaped(): void {
    this.hooked = false;
    this.escaped = true;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
