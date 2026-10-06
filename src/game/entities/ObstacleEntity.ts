import Phaser from 'phaser';
import { getLaneRoadX } from '../data/tuning';
import type { Lane } from '../data/tuning';
import { HAZARD_CONFIGS } from '../data/trafficTypes';
import type { HazardType } from '../data/trafficTypes';
import { projectRoad } from '../utils/projection';

export class ObstacleEntity {
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private blinkLight: Phaser.GameObjects.Graphics;
  private blinkPhase = 0;

  public lane: Lane;
  public roadX: number;
  public z: number;
  public type: HazardType;
  public active = true;
  public hasTriggeredNearMiss = false;

  constructor(scene: Phaser.Scene, lane: Lane, z = 1.0, type: HazardType = 'barricade') {
    this.lane = lane;
    this.roadX = getLaneRoadX(lane);
    this.z = z;
    this.type = type;

    this.container = scene.add.container(0, 0);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.blinkLight = scene.add.graphics();
    this.container.add(this.blinkLight);

    this.renderHazard();
    this.updatePosition();
  }

  /**
   * Reinitializes this pooled entity with a new lane, depth, and hazard type.
   */
  public init(lane: Lane, z: number, type: HazardType): void {
    this.lane = lane;
    this.roadX = getLaneRoadX(lane);
    this.z = z;
    this.type = type;
    this.active = true;
    this.hasTriggeredNearMiss = false;
    this.blinkPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);

    this.container.setVisible(true);
    this.renderHazard();
    this.updatePosition();
  }

  /**
   * Deactivates and hides this entity for recycling back into the pool.
   */
  public deactivate(): void {
    this.active = false;
    this.hasTriggeredNearMiss = false;
    this.container.setVisible(false);
  }

  public update(dt: number, speed: number): void {
    if (!this.active) return;

    const config = HAZARD_CONFIGS[this.type];
    // Dynamic traffic vehicles cruise forward, creating a more gradual relative approach speed
    this.z -= speed * dt * config.speedFactor;
    this.blinkPhase += dt * 10;

    if (this.z < -0.05) {
      this.active = false;
    }
    this.updatePosition();
  }

  private updatePosition(): void {
    if (!this.active) return;

    const pt = projectRoad(this.roadX, this.z);
    this.container.setPosition(pt.x, pt.y);
    this.container.setScale(pt.scale);
    this.container.setDepth(12 + Math.floor((1 - this.z) * 70));

    this.updateTelegraphAndLights();
  }

  private updateTelegraphAndLights(): void {
    this.blinkLight.clear();

    const isLit = Math.sin(this.blinkPhase) > 0;
    const isTrafficVehicle = HAZARD_CONFIGS[this.type].category === 'traffic';

    if (isTrafficVehicle) {
      // Dynamic traffic vehicle tail lights & indicators
      if (this.type === 'taxi') {
        // Taxi roof illuminated sign glow
        this.blinkLight.fillStyle(0xffd166, 0.4);
        this.blinkLight.fillCircle(0, -66, 12);
      } else if (this.type === 'delivery_truck') {
        // Truck top clearance marker amber lights
        this.blinkLight.fillStyle(0xffb703, 0.9);
        this.blinkLight.fillCircle(-34, -76, 2.5);
        this.blinkLight.fillCircle(34, -76, 2.5);
      }
      // Pulsing tail light halo in the night
      const glowAlpha = 0.35 + 0.15 * Math.sin(this.blinkPhase * 0.8);
      if (this.type === 'taxi') {
        this.blinkLight.fillStyle(0xff2222, glowAlpha);
        this.blinkLight.fillCircle(-28, -26, 8);
        this.blinkLight.fillCircle(28, -26, 8);
      } else if (this.type === 'delivery_truck') {
        this.blinkLight.fillStyle(0xff2222, glowAlpha);
        this.blinkLight.fillCircle(-32, -18, 9);
        this.blinkLight.fillCircle(32, -18, 9);
      } else {
        // Motorbike / Delivery bike central red tail light
        this.blinkLight.fillStyle(0xff2222, glowAlpha);
        this.blinkLight.fillCircle(0, -22, 9);
      }
    } else if (this.type === 'barricade') {
      // Construction barricade top flashing amber warning beacon
      if (isLit) {
        this.blinkLight.fillStyle(0xffb703, 1);
        this.blinkLight.fillCircle(0, -56, 7);
        this.blinkLight.fillStyle(0xffd166, 0.4);
        this.blinkLight.fillCircle(0, -56, 14);
      } else {
        this.blinkLight.fillStyle(0x774900, 0.8);
        this.blinkLight.fillCircle(0, -56, 5);
      }
    }

    // Lane danger telegraph indicator when approaching in perspective (z between 0.22 and 0.82)
    if (this.z >= 0.22 && this.z <= 0.82) {
      const pulse = 0.65 + 0.35 * Math.sin(this.blinkPhase * 1.2);
      const chevronY = this.type === 'delivery_truck' ? -98 : this.type === 'taxi' ? -84 : -76;
      this.blinkLight.fillStyle(0xff2222, pulse);
      this.blinkLight.fillTriangle(0, chevronY, -9, chevronY - 14, 9, chevronY - 14);
      this.blinkLight.fillStyle(0xffffff, 0.95);
      this.blinkLight.fillRect(-1.5, chevronY - 12, 3, 6);
      this.blinkLight.fillRect(-1.5, chevronY - 4.5, 3, 2);
    }
  }

  private renderHazard(): void {
    this.graphics.clear();

    switch (this.type) {
      case 'barricade':
        this.renderBarricade();
        break;
      case 'boxes':
        this.renderBoxes();
        break;
      case 'pothole':
        this.renderPothole();
        break;
      case 'street_cart':
        this.renderStreetCart();
        break;
      case 'motorbike':
        this.renderMotorbike();
        break;
      case 'delivery_bike':
        this.renderDeliveryBike();
        break;
      case 'taxi':
        this.renderTaxi();
        break;
      case 'delivery_truck':
        this.renderDeliveryTruck();
        break;
    }
  }

  // --- 1. Construction Barricade ---
  private renderBarricade(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.45);
    gfx.fillEllipse(0, 4, 76, 22);

    // Legs
    gfx.fillStyle(0x222222, 1);
    gfx.fillRect(-28, -12, 6, 14);
    gfx.fillRect(22, -12, 6, 14);

    // Barrier board
    gfx.fillStyle(0xd90429, 1);
    gfx.fillRoundedRect(-34, -48, 68, 38, 6);

    // Reflective yellow diagonal warning stripes
    gfx.fillStyle(0xffd166, 1);
    gfx.fillRect(-24, -44, 12, 30);
    gfx.fillRect(-4, -44, 12, 30);
    gfx.fillRect(16, -44, 12, 30);

    // Top beacon bracket
    gfx.fillStyle(0x333333, 1);
    gfx.fillRect(-4, -54, 8, 8);
  }

  // --- 2. Delivery Boxes & Crates ---
  private renderBoxes(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.45);
    gfx.fillEllipse(0, 4, 70, 20);

    // Bottom cardboard carton
    gfx.fillStyle(0xb5835a, 1);
    gfx.fillRoundedRect(-28, -26, 36, 26, 3);
    // Carton sealing tape
    gfx.fillStyle(0x8c5e39, 1);
    gfx.fillRect(-12, -26, 4, 26);
    // Fragile glass symbol hint
    gfx.fillStyle(0x5c4033, 0.8);
    gfx.fillRect(-22, -18, 4, 6);
    gfx.fillRect(-24, -20, 8, 2);

    // Side cardboard box
    gfx.fillStyle(0x9c6f44, 1);
    gfx.fillRoundedRect(6, -22, 24, 22, 3);
    gfx.fillStyle(0x7a5230, 1);
    gfx.fillRect(16, -22, 3, 22);

    // Top stack: Red & Blue plastic beverage crates
    gfx.fillStyle(0xd90429, 1);
    gfx.fillRoundedRect(-24, -48, 28, 20, 3);
    // Crate grid vents
    gfx.fillStyle(0x1a1a1a, 0.7);
    gfx.fillRect(-20, -44, 5, 5);
    gfx.fillRect(-12, -44, 5, 5);
    gfx.fillRect(-4, -44, 5, 5);
    gfx.fillRect(-20, -36, 5, 5);
    gfx.fillRect(-12, -36, 5, 5);
    gfx.fillRect(-4, -36, 5, 5);

    // Blue crate next to it
    gfx.fillStyle(0x0077b6, 1);
    gfx.fillRoundedRect(6, -42, 22, 18, 3);
    gfx.fillStyle(0x111111, 0.7);
    gfx.fillRect(10, -38, 5, 4);
    gfx.fillRect(19, -38, 5, 4);
  }

  // --- 3. Road Pothole & Rain Puddle ---
  private renderPothole(): void {
    const gfx = this.graphics;
    // Outer asphalt cracked depression
    gfx.fillStyle(0x110f1c, 0.95);
    gfx.fillEllipse(0, -2, 60, 20);

    // Jagged asphalt crack lines
    gfx.lineStyle(2, 0x232030, 0.85);
    gfx.lineBetween(-30, -2, -38, -6);
    gfx.lineBetween(28, -1, 36, -5);
    gfx.lineBetween(0, 8, 4, 14);

    // Deep pit core
    gfx.fillStyle(0x05050a, 1);
    gfx.fillEllipse(0, -2, 46, 14);

    // Water puddle reflection in pothole
    gfx.fillStyle(0x1a263d, 0.85);
    gfx.fillEllipse(-2, -3, 34, 9);
    // Subtle neon puddle sheen
    gfx.fillStyle(0x48cae4, 0.35);
    gfx.fillEllipse(3, -4, 18, 4);
  }

  // --- 4. Street Vendor Food Cart ---
  private renderStreetCart(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.45);
    gfx.fillEllipse(0, 4, 76, 22);

    // Cart wheels
    gfx.fillStyle(0x1f1f1f, 1);
    gfx.fillCircle(-20, -6, 7);
    gfx.fillCircle(20, -6, 7);
    gfx.fillStyle(0xcccccc, 1);
    gfx.fillCircle(-20, -6, 3);
    gfx.fillCircle(20, -6, 3);

    // Lower cabinet body (stainless steel)
    gfx.fillStyle(0x495057, 1);
    gfx.fillRoundedRect(-28, -32, 56, 24, 3);
    gfx.fillStyle(0x343a40, 1);
    gfx.fillRect(-26, -30, 24, 20);
    gfx.fillRect(2, -30, 24, 20);

    // Glass display case with warm interior illuminated food glow
    gfx.fillStyle(0xffb703, 0.4);
    gfx.fillRect(-26, -56, 52, 22);
    gfx.fillStyle(0x81ecec, 0.55);
    gfx.fillRect(-26, -56, 52, 22);
    gfx.lineStyle(1.5, 0xdee2e6, 0.8);
    gfx.strokeRect(-26, -56, 52, 22);

    // Awning striped roof
    gfx.fillStyle(0xd90429, 1);
    gfx.fillRect(-30, -64, 60, 7);
    gfx.fillStyle(0xffd23f, 1);
    gfx.fillRect(-22, -64, 8, 7);
    gfx.fillRect(-6, -64, 8, 7);
    gfx.fillRect(10, -64, 8, 7);
  }

  // --- 5. Civilian Motorbike (Honda Wave / Dream) ---
  private renderMotorbike(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.5);
    gfx.fillEllipse(0, 2, 46, 16);

    // Rear black tire & mudguard
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillRoundedRect(-6, -20, 12, 20, 4);

    // Chrome exhaust pipe on right side
    gfx.fillStyle(0xcccccc, 1);
    gfx.fillRect(6, -14, 6, 14);

    // Bike body chassis (Dark red / blue classic underbone)
    gfx.fillStyle(0x9e2a2b, 1);
    gfx.fillRoundedRect(-14, -30, 28, 14, 4);

    // White license plate
    gfx.fillStyle(0xf8f9fa, 1);
    gfx.fillRect(-7, -26, 14, 7);
    gfx.fillStyle(0x212529, 1);
    gfx.fillRect(-5, -24, 10, 3);

    // Bright glowing red tail light
    gfx.fillStyle(0xff1e1e, 1);
    gfx.fillRoundedRect(-8, -34, 16, 6, 2);

    // Rider torso (jacket)
    gfx.fillStyle(0x2b2d42, 1);
    gfx.fillRoundedRect(-16, -56, 32, 24, 6);

    // Handlebars
    gfx.fillStyle(0x111111, 1);
    gfx.fillRect(-22, -48, 44, 4);

    // Helmet (Cream white with red racing stripe)
    gfx.fillStyle(0xfdf0d5, 1);
    gfx.fillCircle(0, -66, 12);
    gfx.fillStyle(0xd90429, 1);
    gfx.fillRect(-2.5, -78, 5, 24);
    // Dark visor
    gfx.fillStyle(0x111111, 0.85);
    gfx.fillRoundedRect(-9, -68, 18, 6, 2);
  }

  // --- 6. Delivery Shipper Bike (Grab / ShopeeFood style) ---
  private renderDeliveryBike(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.5);
    gfx.fillEllipse(0, 2, 52, 18);

    // Rear tire & exhaust
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillRoundedRect(-7, -20, 14, 20, 4);
    gfx.fillStyle(0xcccccc, 1);
    gfx.fillRect(7, -14, 6, 14);

    // Tail light
    gfx.fillStyle(0xff1e1e, 1);
    gfx.fillRoundedRect(-9, -32, 18, 6, 2);

    // Large cubic insulated delivery box mounted on rear rack (Iconic Green Shipper Box)
    gfx.fillStyle(0x00b14f, 1);
    gfx.fillRoundedRect(-18, -62, 36, 32, 4);
    // Silver reflective safety band
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillRect(-18, -48, 36, 5);
    // Delivery box logo badge hint
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(0, -55, 4);

    // Shipper rider in matching green jacket
    gfx.fillStyle(0x008f3f, 1);
    gfx.fillRoundedRect(-15, -74, 30, 20, 5);

    // Shipper helmet
    gfx.fillStyle(0x00b14f, 1);
    gfx.fillCircle(0, -82, 11);
    // Helmet white stripe
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(-2, -93, 4, 22);
    // Visor
    gfx.fillStyle(0x111111, 0.9);
    gfx.fillRoundedRect(-8, -84, 16, 5, 2);
  }

  // --- 7. Urban Taxi Sedan ---
  private renderTaxi(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.55);
    gfx.fillEllipse(0, 2, 88, 24);

    // Rear tires
    gfx.fillStyle(0x111111, 1);
    gfx.fillRect(-36, -14, 10, 16);
    gfx.fillRect(26, -14, 10, 16);

    // Main taxi car body (Mai Linh emerald green)
    gfx.fillStyle(0x1b4332, 1);
    gfx.fillRoundedRect(-38, -44, 76, 36, 7);

    // Dark rear windshield
    gfx.fillStyle(0x14213d, 0.95);
    gfx.fillRoundedRect(-30, -62, 60, 22, 4);
    // Glass night reflection
    gfx.fillStyle(0xffffff, 0.25);
    gfx.fillTriangle(-20, -60, -28, -42, -14, -42);

    // Dual bright red LED tail light clusters
    gfx.fillStyle(0xff2222, 1);
    gfx.fillRoundedRect(-35, -34, 14, 8, 2);
    gfx.fillRoundedRect(21, -34, 14, 8, 2);

    // License plate in center bumper
    gfx.fillStyle(0xf8f9fa, 1);
    gfx.fillRect(-11, -22, 22, 9);
    gfx.fillStyle(0x212529, 1);
    gfx.fillRect(-8, -20, 16, 5);

    // Rooftop illuminated "TAXI" sign
    gfx.fillStyle(0xffd166, 1);
    gfx.fillRoundedRect(-14, -72, 28, 10, 3);
    gfx.fillStyle(0x111111, 1);
    gfx.fillRect(-8, -69, 16, 4);
  }

  // --- 8. Delivery Truck / Small Van ---
  private renderDeliveryTruck(): void {
    const gfx = this.graphics;
    // Ground shadow
    gfx.fillStyle(0x000000, 0.6);
    gfx.fillEllipse(0, 2, 96, 26);

    // Heavy duty rear dual wheels
    gfx.fillStyle(0x111111, 1);
    gfx.fillRect(-42, -18, 14, 20);
    gfx.fillRect(28, -18, 14, 20);

    // Cargo van / truck rectangular container (Slate grey)
    gfx.fillStyle(0x343a40, 1);
    gfx.fillRoundedRect(-42, -74, 84, 62, 4);

    // Roll-up rear cargo door or double door seam
    gfx.fillStyle(0x212529, 1);
    gfx.fillRect(-38, -70, 76, 50);
    gfx.lineStyle(1.5, 0x495057, 1);
    gfx.lineBetween(0, -70, 0, -20); // Central door seam
    gfx.lineBetween(-38, -55, 38, -55); // Horizontal corrugated fold
    gfx.lineBetween(-38, -38, 38, -38);

    // Chrome lock latch
    gfx.fillStyle(0xcccccc, 1);
    gfx.fillRect(-4, -45, 8, 14);

    // Rear bumper with alternating red & yellow safety chevrons
    gfx.fillStyle(0x111111, 1);
    gfx.fillRect(-44, -14, 88, 10);
    gfx.fillStyle(0xffd166, 1);
    for (let cx = -40; cx < 40; cx += 14) {
      gfx.fillRect(cx, -14, 7, 10);
    }

    // Dual tail lights on bumper edges
    gfx.fillStyle(0xff2222, 1);
    gfx.fillRect(-42, -12, 6, 6);
    gfx.fillRect(36, -12, 6, 6);

    // Top amber clearance marker lights
    gfx.fillStyle(0xffb703, 1);
    gfx.fillCircle(-36, -71, 3);
    gfx.fillCircle(36, -71, 3);
  }

  public checkCollision(
    arg1: number | Lane,
    arg2?: number | Lane | { x: number; y: number; radiusX: number; radiusY: number },
    arg3?: Lane | { x: number; y: number; radiusX: number; radiusY: number },
    _arg4?: boolean,
    arg5?: { x: number; y: number; radiusX: number; radiusY: number },
  ): boolean {
    if (!this.active) return false;

    // Collision perspective depth window
    if (this.z > 0.18 || this.z < 0.05) return false;

    let playerRoadX: number;
    let bounds: { x: number; y: number; radiusX: number; radiusY: number } | undefined;

    if (typeof arg1 === 'number' && typeof arg2 === 'number' && (arg2 === -1 || arg2 === 0 || arg2 === 1)) {
      playerRoadX = arg1;
      bounds = arg5;
    } else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      playerRoadX = arg2;
      bounds = typeof arg3 === 'object' && arg3 !== null && 'radiusX' in arg3 ? (arg3 as { x: number; y: number; radiusX: number; radiusY: number }) : undefined;
    } else if (typeof arg1 === 'number') {
      playerRoadX = arg1;
      bounds = typeof arg2 === 'object' && arg2 !== null && 'radiusX' in arg2 ? (arg2 as { x: number; y: number; radiusX: number; radiusY: number }) : undefined;
    } else {
      playerRoadX = getLaneRoadX(arg1 as Lane);
      bounds = typeof arg2 === 'object' && arg2 !== null && 'radiusX' in arg2 ? (arg2 as { x: number; y: number; radiusX: number; radiusY: number }) : undefined;
    }

    const roadXDist = Math.abs(playerRoadX - this.roadX);
    const config = HAZARD_CONFIGS[this.type];

    // Safe lane clearance check: if lateral distance exceeds safety margin, no collision
    if (roadXDist > config.hitboxRoadXDist + 0.06) {
      return false;
    }

    // Direct physical overlap in road units
    if (roadXDist <= config.hitboxRoadXDist) {
      return true;
    }

    // Secondary screen bounds fallback check
    if (bounds) {
      const pt = projectRoad(this.roadX, this.z);
      const obsY = pt.y - 20 * pt.scale;
      const obsRadiusX = config.hitboxRadiusX * pt.scale;
      const obsRadiusY = config.hitboxRadiusY * pt.scale;

      const dx = Math.abs(pt.x - bounds.x);
      const dy = Math.abs(obsY - bounds.y);

      return dx < (obsRadiusX + bounds.radiusX) && dy < (obsRadiusY + bounds.radiusY);
    }

    return false;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
