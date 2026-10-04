import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { TUNING } from '../data/tuning';
import { projectRoad } from '../utils/projection';

export class RoadRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private stripeOffset = 0;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1);
  }

  public update(dt: number, speedMultiplier: number): void {
    this.stripeOffset = (this.stripeOffset + dt * TUNING.ROAD_STRIPE_SPEED * speedMultiplier) % 1.0;
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    const horizonY = TUNING.HORIZON_Y;

    this.graphics.fillStyle(0x0b0a1a, 1);
    this.graphics.fillRect(0, 0, GAME_WIDTH, horizonY);

    this.graphics.fillStyle(0x1a153a, 1);
    this.graphics.fillRect(0, horizonY - 40, GAME_WIDTH, 40);

    this.graphics.fillStyle(0x13121f, 1);
    this.graphics.fillRect(0, horizonY, GAME_WIDTH, GAME_HEIGHT - horizonY);

    const segments = TUNING.ROAD_SEGMENTS;
    for (let i = 0; i < segments; i++) {
      const zNear = i / segments;
      const zFar = (i + 1) / segments;

      const pNear = projectRoad(0, zNear);
      const pFar = projectRoad(0, zFar);

      const stripeIndex = Math.floor((zNear * 8 + this.stripeOffset * 4) % 2);
      const curbColor = stripeIndex === 0 ? 0xff3b3b : 0xf5f0e6;

      const curbWidthNear = pNear.roadWidth * 0.08;
      const curbWidthFar = pFar.roadWidth * 0.08;

      this.graphics.fillStyle(curbColor, 0.9);
      this.graphics.fillPoints([
        { x: pNear.x - pNear.roadWidth / 2 - curbWidthNear, y: pNear.y },
        { x: pFar.x - pFar.roadWidth / 2 - curbWidthFar, y: pFar.y },
        { x: pFar.x - pFar.roadWidth / 2, y: pFar.y },
        { x: pNear.x - pNear.roadWidth / 2, y: pNear.y },
      ]);
      this.graphics.fillPoints([
        { x: pNear.x + pNear.roadWidth / 2, y: pNear.y },
        { x: pFar.x + pFar.roadWidth / 2, y: pFar.y },
        { x: pFar.x + pFar.roadWidth / 2 + curbWidthFar, y: pFar.y },
        { x: pNear.x + pNear.roadWidth / 2 + curbWidthNear, y: pNear.y },
      ]);

      const asphaltColor = i % 2 === 0 ? 0x242432 : 0x20202d;
      this.graphics.fillStyle(asphaltColor, 1);
      this.graphics.fillPoints([
        { x: pNear.x - pNear.roadWidth / 2, y: pNear.y },
        { x: pFar.x - pFar.roadWidth / 2, y: pFar.y },
        { x: pFar.x + pFar.roadWidth / 2, y: pFar.y },
        { x: pNear.x + pNear.roadWidth / 2, y: pNear.y },
      ]);
    }

    const stripeCount = 8;
    for (let i = 0; i < stripeCount; i++) {
      const zCenter = ((i / stripeCount) + (this.stripeOffset * (1 / stripeCount))) % 1.0;
      if (zCenter < 0.02 || zCenter > 0.95) continue;

      const zStripeNear = Math.max(0.01, zCenter - 0.035);
      const zStripeFar = Math.min(0.98, zCenter + 0.035);

      const pStripeNear = projectRoad(0, zStripeNear);
      const pStripeFar = projectRoad(0, zStripeFar);

      const stripeWNear = Math.max(2, pStripeNear.roadWidth * 0.03);
      const stripeWFar = Math.max(1, pStripeFar.roadWidth * 0.03);

      this.graphics.fillStyle(0xffd23f, 0.95);
      this.graphics.fillPoints([
        { x: pStripeNear.x - stripeWNear / 2, y: pStripeNear.y },
        { x: pStripeFar.x - stripeWFar / 2, y: pStripeFar.y },
        { x: pStripeFar.x + stripeWFar / 2, y: pStripeFar.y },
        { x: pStripeNear.x + stripeWNear / 2, y: pStripeNear.y },
      ]);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
