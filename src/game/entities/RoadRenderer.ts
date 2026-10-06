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

      // 3 Distinct Lane Corridors: Draw Left, Center, and Right lanes with subtle alternating asphalt shades
      const divL = TUNING.LANE_DIVIDER_LEFT;
      const divR = TUNING.LANE_DIVIDER_RIGHT;

      const pNearL = projectRoad(-1.0, zNear);
      const pFarL = projectRoad(-1.0, zFar);
      const pNearDivL = projectRoad(divL, zNear);
      const pFarDivL = projectRoad(divL, zFar);
      const pNearDivR = projectRoad(divR, zNear);
      const pFarDivR = projectRoad(divR, zFar);
      const pNearR = projectRoad(1.0, zNear);
      const pFarR = projectRoad(1.0, zFar);

      // Alternating base segment shade for speed illusion
      const isAlt = i % 2 === 0;
      const sideLaneColor = isAlt ? 0x1f1e2c : 0x1a1924;
      const centerLaneColor = isAlt ? 0x252436 : 0x201f2e;

      // 1. LEFT LANE (-1.0 to -0.33)
      this.graphics.fillStyle(sideLaneColor, 1);
      this.graphics.fillPoints([
        { x: pNearL.x, y: pNearL.y },
        { x: pFarL.x, y: pFarL.y },
        { x: pFarDivL.x, y: pFarDivL.y },
        { x: pNearDivL.x, y: pNearDivL.y },
      ]);

      // 2. CENTER LANE (-0.33 to +0.33)
      this.graphics.fillStyle(centerLaneColor, 1);
      this.graphics.fillPoints([
        { x: pNearDivL.x, y: pNearDivL.y },
        { x: pFarDivL.x, y: pFarDivL.y },
        { x: pFarDivR.x, y: pFarDivR.y },
        { x: pNearDivR.x, y: pNearDivR.y },
      ]);

      // 3. RIGHT LANE (+0.33 to +1.0)
      this.graphics.fillStyle(sideLaneColor, 1);
      this.graphics.fillPoints([
        { x: pNearDivR.x, y: pNearDivR.y },
        { x: pFarDivR.x, y: pFarDivR.y },
        { x: pFarR.x, y: pFarR.y },
        { x: pNearR.x, y: pNearR.y },
      ]);
    }

    // Outer Solid White Road Shoulder Lines (Left & Right asphalt borders)
    const shoulderSegments = 16;
    for (let i = 0; i < shoulderSegments; i++) {
      const zNear = i / shoulderSegments;
      const zFar = (i + 1) / shoulderSegments;

      // Left edge line (-0.97)
      const pNL = projectRoad(-0.97, zNear);
      const pFL = projectRoad(-0.97, zFar);
      const wNL = Math.max(2, pNL.roadWidth * 0.015);
      const wFL = Math.max(1, pFL.roadWidth * 0.015);

      this.graphics.fillStyle(0xdedede, 0.75);
      this.graphics.fillPoints([
        { x: pNL.x - wNL / 2, y: pNL.y },
        { x: pFL.x - wFL / 2, y: pFL.y },
        { x: pFL.x + wFL / 2, y: pFL.y },
        { x: pNL.x + wNL / 2, y: pNL.y },
      ]);

      // Right edge line (+0.97)
      const pNR = projectRoad(0.97, zNear);
      const pFR = projectRoad(0.97, zFar);
      const wNR = Math.max(2, pNR.roadWidth * 0.015);
      const wFR = Math.max(1, pFR.roadWidth * 0.015);

      this.graphics.fillPoints([
        { x: pNR.x - wNR / 2, y: pNR.y },
        { x: pFR.x - wFR / 2, y: pFR.y },
        { x: pFR.x + wFR / 2, y: pFR.y },
        { x: pNR.x + wNR / 2, y: pNR.y },
      ]);
    }

    // Continuous Subtle Divider Seams to ground 3-lane perspective corridors
    const laneDividers = [TUNING.LANE_DIVIDER_LEFT, TUNING.LANE_DIVIDER_RIGHT];
    for (const dividerX of laneDividers) {
      for (let i = 0; i < 16; i++) {
        const zNear = i / 16;
        const zFar = (i + 1) / 16;
        const pNear = projectRoad(dividerX, zNear);
        const pFar = projectRoad(dividerX, zFar);
        const wN = Math.max(2, pNear.roadWidth * 0.012);
        const wF = Math.max(1, pFar.roadWidth * 0.012);

        this.graphics.fillStyle(0x12111c, 0.6);
        this.graphics.fillPoints([
          { x: pNear.x - wN / 2, y: pNear.y },
          { x: pFar.x - wF / 2, y: pFar.y },
          { x: pFar.x + wF / 2, y: pFar.y },
          { x: pNear.x + wN / 2, y: pNear.y },
        ]);
      }
    }

    // High-Contrast Dashed Lane Markers along Lane Dividers
    const stripeCount = 10;
    for (const dividerX of laneDividers) {
      for (let i = 0; i < stripeCount; i++) {
        const zCenter = ((i / stripeCount) + (this.stripeOffset * (1 / stripeCount))) % 1.0;
        if (zCenter < 0.02 || zCenter > 0.96) continue;

        const zStripeNear = Math.max(0.01, zCenter - 0.035);
        const zStripeFar = Math.min(0.98, zCenter + 0.035);

        const pNear = projectRoad(dividerX, zStripeNear);
        const pFar = projectRoad(dividerX, zStripeFar);

        const stripeWNear = Math.max(3, pNear.roadWidth * 0.026);
        const stripeWFar = Math.max(1, pFar.roadWidth * 0.026);

        // Crisp bright white marker with subtle shadow
        this.graphics.fillStyle(0xffffff, 0.95);
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
