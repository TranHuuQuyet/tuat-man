import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';

/**
 * BootScene: handles asset preloading and title display.
 * When START_GAME event is received, transitions to RideScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .text(centerX, centerY - 140, 'TUẤT MAN', {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: '110px',
        color: toCss(COLORS.neonYellow),
        stroke: '#000000',
        strokeThickness: 14,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 30, 'ĐÊM NAY CÓ KÈO', {
        fontFamily: '"Arial Black", sans-serif',
        fontSize: '38px',
        color: toCss(COLORS.neonRed),
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    // Decorative motorbike icon
    this.add
      .text(centerX, centerY + 80, '🏍️ 🐕 💨', {
        fontSize: '48px',
      })
      .setOrigin(0.5);
  }
}

function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
