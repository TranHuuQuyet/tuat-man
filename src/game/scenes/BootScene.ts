import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';

/**
 * Foundation placeholder scene (Phase 0).
 * Only proves that React + Phaser + the 9:16 viewport work end-to-end.
 * Contains NO gameplay. Will become the real asset preloader in Phase 1.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .text(centerX, centerY - 60, 'TUẤT MAN', {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: '120px',
        color: toCss(COLORS.neonYellow),
        stroke: '#000000',
        strokeThickness: 12,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 50, 'ĐÊM NAY CÓ KÈO', {
        fontFamily: '"Arial Black", sans-serif',
        fontSize: '44px',
        color: toCss(COLORS.neonRed),
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, GAME_HEIGHT - 60, 'Phase 0 — foundation', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: toCss(COLORS.textLight),
      })
      .setOrigin(0.5)
      .setAlpha(0.5);
  }
}

function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
