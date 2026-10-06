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

    // Dark sky backdrop
    this.graphics.fillStyle(0x0a0914, 1);
    this.graphics.fillRect(0, 0, GAME_WIDTH, horizonY);

    // City glow on horizon
    this.graphics.fillStyle(0x19142b, 1);
    this.graphics.fillRect(0, horizonY - 45, GAME_WIDTH, 45);
    this.graphics.fillStyle(0x2d1a3a, 0.5);
    this.graphics.fillRect(0, horizonY - 15, GAME_WIDTH, 15);

    // Ground / terrain outside road
    this.graphics.fillStyle(0x0f0e1a, 1);
    this.graphics.fillRect(0, horizonY, GAME_WIDTH, GAME_HEIGHT - horizonY);

    // Perspective asphalt segments with alternating shades for speed feel
    const segments = TUNING.ROAD_SEGMENTS;
    for (let i = 0; i < segments; i++) {
      const zNear = i / segments;
      const zFar = (i + 1) / segments;

      const pNear = projectRoad(0, zNear);
      const pFar = projectRoad(0, zFar);

      // Alternating curb stripes (Red & White Vietnamese roadside curb)
      const stripeIndex = Math.floor((zNear * 10 + this.stripeOffset * 5) % 2);
      const curbColor = stripeIndex === 0 ? 0xee2c2c : 0xf0ece1;

      const curbWidthNear = pNear.roadWidth * 0.085;
      const curbWidthFar = pFar.roadWidth * 0.085;

      // Left Curb
      this.graphics.fillStyle(curbColor, 0.95);
      this.graphics.fillPoints([
        { x: pNear.x - pNear.roadWidth / 2 - curbWidthNear, y: pNear.y },
        { x: pFar.x - pFar.roadWidth / 2 - curbWidthFar, y: pFar.y },
        { x: pFar.x - pFar.roadWidth / 2, y: pFar.y },
        { x: pNear.x - pNear.roadWidth / 2, y: pNear.y },
      ]);

      // Right Curb
      this.graphics.fillPoints([
        { x: pNear.x + pNear.roadWidth / 2, y: pNear.y },
        { x: pFar.x + pFar.roadWidth / 2, y: pFar.y },
        { x: pFar.x + pFar.roadWidth / 2 + curbWidthFar, y: pFar.y },
        { x: pNear.x + pNear.roadWidth / 2 + curbWidthNear, y: pNear.y },
      ]);

      // Asphalt roadway surface
      const asphaltColor = i % 2 === 0 ? 0x222230 : 0x1d1d28;
      this.graphics.fillStyle(asphaltColor, 1);
      this.graphics.fillPoints([
        { x: pNear.x - pNear.roadWidth / 2, y: pNear.y },
        { x: pFar.x - pFar.roadWidth / 2, y: pFar.y },
        { x: pFar.x + pFar.roadWidth / 2, y: pFar.y },
        { x: pNear.x + pNear.roadWidth / 2, y: pNear.y },
      ]);
    }

    // 3 Distinct Lanes: Draw 2 dashed divider lines using TUNING source of truth
    const stripeCount = 9;
    const laneDividers = [TUNING.LANE_DIVIDER_LEFT, TUNING.LANE_DIVIDER_RIGHT];

    for (const dividerX of laneDividers) {
      for (let i = 0; i < stripeCount; i++) {
        const zCenter = ((i / stripeCount) + (this.stripeOffset * (1 / stripeCount))) % 1.0;
        if (zCenter < 0.02 || zCenter > 0.96) continue;

        const zStripeNear = Math.max(0.01, zCenter - 0.032);
        const zStripeFar = Math.min(0.98, zCenter + 0.032);

        const pNear = projectRoad(dividerX, zStripeNear);
        const pFar = projectRoad(dividerX, zStripeFar);

        const stripeWNear = Math.max(2, pNear.roadWidth * 0.022);
        const stripeWFar = Math.max(1, pFar.roadWidth * 0.022);

        this.graphics.fillStyle(0xf5f0e6, 0.85);
        this.graphics.fillPoints([
          { x: pNear.x - stripeWNear / 2, y: pNear.y },
          { x: pFar.x - stripeWFar / 2, y: pFar.y },
          { x: pFar.x + stripeWFar / 2, y: pFar.y },
          { x: pNear.x + stripeWNear / 2, y: pNear.y },
        ]);
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
