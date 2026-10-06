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

    this.statusText = scene.add.text(0, -70, `🐕 ${this.config.name}`, {
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

  /**
   * Reinitializes this pooled entity with a new dog config, lane, and depth.
   */
  public init(config: DogConfig, lane: Lane, z: number): void {
    this.config = config;
    this.lane = lane;
    this.roadX = getLaneRoadX(lane);
    this.z = z;
    this.active = true;
    this.hooked = false;
    this.escaped = false;
    this.pulsePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);

    this.container.setVisible(true);
    this.renderDog();
    this.updatePosition();
  }

  /**
   * Deactivates and hides this dog for recycling back into the pool.
   */
  public deactivate(): void {
    this.active = false;
    this.hooked = false;
    this.escaped = false;
    this.container.setVisible(false);
  }

  public getHookState(): DogHookState {
    if (this.escaped) return 'ESCAPED';
    if (this.hooked) return 'HOOKED';
    if (this.z > TUNING.DOG_APPROACH_Z) return 'OUT_OF_RANGE';
    if (this.z > this.config.hookMaxZ) return 'APPROACHING';
    if (this.z >= this.config.hookMinZ) return 'HOOKABLE';
    return 'PASSED';
  }

  public isInHookRange(): boolean {
    return this.getHookState() === 'HOOKABLE';
  }

  public update(dt: number, speed: number): void {
    if (!this.active) return;

    this.pulsePhase += dt * 8;

    if (this.escaped) {
      // Flee away fast towards roadside
      this.roadX += (this.roadX > 0 ? 0.9 : -0.9) * dt;
      this.z -= speed * 0.5 * dt;
      if (Math.abs(this.roadX) > 1.8 || this.z < -0.2) {
        this.active = false;
      }
    } else if (!this.hooked) {
      // Free running dog: velocity scales by archetype speed factor
      this.z -= speed * dt * this.config.speedFactor;
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
    if (!this.active) return;

    const pt = projectRoad(this.roadX, this.z);
    this.container.setPosition(pt.x, pt.y);
    this.container.setScale(pt.scale);
    this.container.setDepth(15 + Math.floor((1 - this.z) * 75));

    this.rangeIndicator.clear();
    const hookState = this.getHookState();

    const targetSize = this.config.targetSize ?? 1.0;
    const isRare = this.config.type === 'phu_quoc';

    if (hookState === 'HOOKABLE') {
      // Pulsating target reticle scaled by dog's target size
      const pulse = 1 + Math.sin(this.pulsePhase) * 0.12;
      const radius = 48 * pulse * targetSize;

      const ringColor = isRare ? 0xffd23f : 0x00ff88;
      this.rangeIndicator.lineStyle(isRare ? 3.5 : 3, ringColor, 0.95);
      this.rangeIndicator.strokeCircle(0, -22, radius);

      // Crosshairs
      this.rangeIndicator.lineStyle(2, ringColor, 0.7);
      this.rangeIndicator.lineBetween(-radius - 8, -22, -radius + 4, -22);
      this.rangeIndicator.lineBetween(radius - 4, -22, radius + 8, -22);
      this.rangeIndicator.lineBetween(0, -22 - radius - 8, 0, -22 - radius + 4);
      this.rangeIndicator.lineBetween(0, -22 + radius - 4, 0, -22 + radius + 8);

      const label = isRare ? '👑 VÀO TẦM MÓC! (HIẾM)' : '🎯 VÀO TẦM MÓC!';
      this.statusText.setText(label);
      this.statusText.setColor(isRare ? '#ffd23f' : '#00ff88');
      this.statusText.setScale(1.05);
    } else if (hookState === 'APPROACHING') {
      // Yellow warning indicator
      this.rangeIndicator.lineStyle(2, 0xffd23f, 0.6);
      this.rangeIndicator.strokeCircle(0, -22, 42 * targetSize);

      this.statusText.setText(`⏳ ĐANG TỚI... (${this.config.name})`);
      this.statusText.setColor('#ffd23f');
      this.statusText.setScale(0.95);
    } else if (hookState === 'HOOKED') {
      // Red strain indicator
      this.rangeIndicator.lineStyle(3, 0xff3b3b, 0.85);
      this.rangeIndicator.strokeCircle(0, -22, 44 * targetSize);

      this.statusText.setText('⚡ ĐANG GIẰNG CO!');
      this.statusText.setColor('#ff3b3b');
      this.statusText.setScale(1.0);
    } else if (hookState === 'ESCAPED') {
      this.statusText.setText('💨 ĐÃ CHẠY MẤT!');
      this.statusText.setColor('#ff9f1c');
    } else {
      const typeBadge = isRare ? '👑' : this.config.type === 'neighborhood_poodle' ? '🐩' : '🐕';
      this.statusText.setText(`${typeBadge} ${this.config.name} (+$${this.config.reward})`);
      this.statusText.setColor(isRare ? '#ffd23f' : '#e0dbcd');
      this.statusText.setScale(0.9);
    }
  }

  private renderDog(): void {
    this.graphics.clear();

    switch (this.config.type) {
      case 'grass_dog':
        this.renderGrassDog();
        break;
      case 'golden_dog':
        this.renderGoldenDog();
        break;
      case 'neighborhood_poodle':
        this.renderPoodle();
        break;
      case 'phu_quoc':
        this.renderPhuQuoc();
        break;
      default:
        this.renderGrassDog();
    }
  }

  // --- 1. Chó Cỏ (Standard Vietnamese mixed-breed) ---
  private renderGrassDog(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.4);
    gfx.fillEllipse(0, 3, 56, 18);

    // Mixed-breed earthy brown coat with white chest patch
    gfx.fillStyle(0x8d5b4c, 1);
    gfx.fillRoundedRect(-24, -34, 48, 28, 8);
    gfx.fillStyle(0xf8f9fa, 0.9);
    gfx.fillEllipse(-4, -24, 18, 14); // White chest patch

    const headX = this.roadX > 0 ? -18 : 18;
    gfx.fillStyle(0x7a4d3f, 1);
    gfx.fillCircle(headX, -38, 16);

    // Snout
    const snoutX = this.roadX > 0 ? headX - 10 : headX + 10;
    gfx.fillStyle(0x2d1a15, 1);
    gfx.fillCircle(snoutX, -36, 5);

    // Eyes
    gfx.fillStyle(0x111111, 1);
    gfx.fillCircle(headX - (this.roadX > 0 ? 3 : -3), -42, 3);

    // Folded / semi-floppy ears
    gfx.fillStyle(0x5c382e, 1);
    gfx.fillTriangle(headX - 10, -48, headX - 2, -58, headX + 6, -46);

    // Red Collar
    gfx.fillStyle(0xd90429, 1);
    gfx.fillRect(headX - (this.roadX > 0 ? 3 : 5), -32, 6, 10);
    gfx.fillStyle(0xffd23f, 1);
    gfx.fillCircle(headX, -27, 2.5); // Bell

    // Legs
    gfx.fillStyle(0x7a4d3f, 1);
    gfx.fillRect(-18, -12, 8, 15);
    gfx.fillRect(10, -12, 8, 15);

    // Tail
    const tailX = this.roadX > 0 ? 22 : -22;
    gfx.lineStyle(4, 0x8d5b4c, 1);
    gfx.lineBetween(tailX, -30, tailX + (this.roadX > 0 ? 12 : -12), -44);
  }

  // --- 2. Chó Vàng (Fast / Mobile with bright golden coat and upright ears) ---
  private renderGoldenDog(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.42);
    gfx.fillEllipse(0, 3, 58, 18);

    // Bright golden-yellow coat
    gfx.fillStyle(0xf4a261, 1);
    gfx.fillRoundedRect(-25, -35, 50, 29, 8);
    gfx.fillStyle(0xffe3b3, 0.85);
    gfx.fillEllipse(-2, -24, 20, 14); // Cream belly

    const headX = this.roadX > 0 ? -19 : 19;
    gfx.fillStyle(0xe76f51, 1);
    gfx.fillCircle(headX, -39, 16.5);

    // Snout
    const snoutX = this.roadX > 0 ? headX - 11 : headX + 11;
    gfx.fillStyle(0x264653, 1);
    gfx.fillCircle(snoutX, -37, 5);

    // Eyes
    gfx.fillStyle(0x111111, 1);
    gfx.fillCircle(headX - (this.roadX > 0 ? 3 : -3), -43, 3);

    // Sharp upright triangular ears
    gfx.fillStyle(0xd94e34, 1);
    gfx.fillTriangle(headX - 11, -49, headX - 2, -66, headX + 7, -49);
    gfx.fillStyle(0xf4a261, 1);
    gfx.fillTriangle(headX - 8, -49, headX - 2, -62, headX + 4, -49); // Inner ear

    // Cyan / Green active sports collar
    gfx.fillStyle(0x2a9d8f, 1);
    gfx.fillRect(headX - (this.roadX > 0 ? 3 : 5), -33, 6, 11);

    // Athletic legs
    gfx.fillStyle(0xe76f51, 1);
    gfx.fillRect(-19, -12, 8, 16);
    gfx.fillRect(11, -12, 8, 16);

    // Energetic upright curled tail
    const tailX = this.roadX > 0 ? 23 : -23;
    gfx.lineStyle(4.5, 0xf4a261, 1);
    gfx.lineBetween(tailX, -30, tailX + (this.roadX > 0 ? 14 : -14), -50);
  }

  // --- 3. Poodle Xóm (Small, fluffy curly poofs, pink collar) ---
  private renderPoodle(): void {
    const gfx = this.graphics;
    // Ground shadow (smaller)
    gfx.fillStyle(0x000000, 0.38);
    gfx.fillEllipse(0, 2, 42, 14);

    // Fluffy cloud body (cream / apricot curls)
    gfx.fillStyle(0xfdf0d5, 1);
    gfx.fillCircle(-12, -26, 13);
    gfx.fillCircle(0, -28, 14);
    gfx.fillCircle(12, -26, 13);
    gfx.fillCircle(-6, -20, 11);
    gfx.fillCircle(6, -20, 11);

    const headX = this.roadX > 0 ? -14 : 14;
    // Head poof ball
    gfx.fillStyle(0xfff3e0, 1);
    gfx.fillCircle(headX, -38, 14);
    gfx.fillCircle(headX, -45, 10); // Top pom-pom

    // Snout
    const snoutX = this.roadX > 0 ? headX - 8 : headX + 8;
    gfx.fillStyle(0x3e2723, 1);
    gfx.fillCircle(snoutX, -36, 4);

    // Shiny cute eyes
    gfx.fillStyle(0x111111, 1);
    gfx.fillCircle(headX - (this.roadX > 0 ? 2.5 : -2.5), -41, 2.5);

    // Fluffy drooping curly ears
    gfx.fillStyle(0xf5ebe0, 1);
    gfx.fillCircle(headX + (this.roadX > 0 ? 9 : -9), -36, 8);

    // Cute pink collar
    gfx.fillStyle(0xff4d6d, 1);
    gfx.fillRect(headX - (this.roadX > 0 ? 2 : 4), -29, 5, 8);

    // Dainty legs with fluffy ankle puffs
    gfx.fillStyle(0xfdf0d5, 1);
    gfx.fillRect(-13, -12, 6, 13);
    gfx.fillRect(7, -12, 6, 13);
    gfx.fillCircle(-10, -3, 5);
    gfx.fillCircle(10, -3, 5);

    // High tail with puffy pom-pom ball
    const tailX = this.roadX > 0 ? 17 : -17;
    gfx.lineStyle(3, 0xfdf0d5, 1);
    gfx.lineBetween(tailX, -28, tailX + (this.roadX > 0 ? 10 : -10), -44);
    gfx.fillCircle(tailX + (this.roadX > 0 ? 11 : -11), -46, 6);
  }

  // --- 4. Chó Phú Quốc (Athletic, pointed ears, prominent ridgeback xoáy lưng) ---
  private renderPhuQuoc(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.45);
    gfx.fillEllipse(0, 3, 62, 20);

    // Deep reddish-brown / brindle coat
    gfx.fillStyle(0x9e2a2b, 1);
    gfx.fillRoundedRect(-26, -36, 52, 30, 8);

    // Tiger brindle stripe accents
    gfx.fillStyle(0x540b0e, 0.7);
    gfx.fillRect(-14, -34, 4, 16);
    gfx.fillRect(-4, -34, 4, 18);
    gfx.fillRect(6, -34, 4, 16);

    // ★ ICONIC PHÚ QUỐC RIDGEBACK (Xoáy lưng dọc sống lưng)
    // Darker dorsal ridge of hair growing backwards with spiral crests
    gfx.fillStyle(0x370617, 1);
    gfx.fillRect(-22, -38, 44, 4); // Ridge stripe
    // Whirl tufts
    gfx.fillTriangle(-18, -38, -14, -42, -10, -38);
    gfx.fillTriangle(-4, -38, 0, -43, 4, -38);
    gfx.fillTriangle(10, -38, 14, -42, 18, -38);
    // Subtle golden champion shimmer along ridgeback
    gfx.fillStyle(0xffd166, 0.6);
    gfx.fillRect(-16, -37, 32, 1.5);

    const headX = this.roadX > 0 ? -20 : 20;
    gfx.fillStyle(0x9e2a2b, 1);
    gfx.fillCircle(headX, -40, 17);

    // Snout
    const snoutX = this.roadX > 0 ? headX - 12 : headX + 12;
    gfx.fillStyle(0x212529, 1);
    gfx.fillCircle(snoutX, -38, 5.5);

    // Piercing eyes
    gfx.fillStyle(0xffd166, 1);
    gfx.fillCircle(headX - (this.roadX > 0 ? 3 : -3), -44, 3.5);
    gfx.fillStyle(0x111111, 1);
    gfx.fillCircle(headX - (this.roadX > 0 ? 3 : -3), -44, 2);

    // Pointed prick ears
    gfx.fillStyle(0x540b0e, 1);
    gfx.fillTriangle(headX - 11, -50, headX - 3, -68, headX + 7, -50);

    // Royal gold bandana / collar
    gfx.fillStyle(0xffd166, 1);
    gfx.fillRect(headX - (this.roadX > 0 ? 4 : 6), -34, 7, 12);
    gfx.fillStyle(0xd90429, 1);
    gfx.fillCircle(headX, -28, 3); // Red gem

    // Powerful muscular legs
    gfx.fillStyle(0x822425, 1);
    gfx.fillRect(-20, -12, 9, 17);
    gfx.fillRect(11, -12, 9, 17);

    // Athletic curved saber tail
    const tailX = this.roadX > 0 ? 24 : -24;
    gfx.lineStyle(5, 0x9e2a2b, 1);
    gfx.lineBetween(tailX, -32, tailX + (this.roadX > 0 ? 16 : -16), -52);
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
