import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { STREET_PALETTE, VIETNAMESE_SIGNS } from '../data/streetPalette';
import { TUNING } from '../data/tuning';
import { projectRoad } from '../utils/projection';

interface BuildingSlot {
  container: Phaser.GameObjects.Container;
  buildingGfx: Phaser.GameObjects.Graphics;
  signContainer: Phaser.GameObjects.Container;
  signGfx: Phaser.GameObjects.Graphics;
  signText: Phaser.GameObjects.Text;
  signSubText: Phaser.GameObjects.Text;
  propGfx: Phaser.GameObjects.Graphics;
  side: 'left' | 'right';
  roadX: number;
  z: number;
  seed: number;
  signIndex: number;
  propType: 'lamp' | 'bike' | 'stools' | 'cart';
}

export class EnvironmentManager {
  private scene: Phaser.Scene;
  private bgGraphics: Phaser.GameObjects.Graphics;
  private cableGraphics: Phaser.GameObjects.Graphics;
  private buildingSlots: BuildingSlot[] = [];
  private parallaxOffset = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Background Layer: Sky, Moon, City Skyline (depth 0)
    this.bgGraphics = scene.add.graphics();
    this.bgGraphics.setDepth(0);

    // Overhead Tangled Power Wires Layer (depth 8)
    this.cableGraphics = scene.add.graphics();
    this.cableGraphics.setDepth(8);

    this.createBuildingSlots();
    this.drawSkyAndDistantSkyline(0);
  }

  private createBuildingSlots(): void {
    // 10 pooled building slots: 5 on the left, 5 on the right, staggered along z (0.1 to 1.0)
    const slotCountPerSide = 5;
    const zStep = 1.05 / slotCountPerSide;

    for (let i = 0; i < slotCountPerSide; i++) {
      const zInitial = 0.05 + i * zStep;

      // Left building slot (roadX = -1.65)
      this.buildingSlots.push(this.createSlot('left', -1.65, zInitial, i));

      // Right building slot (roadX = +1.65)
      this.buildingSlots.push(this.createSlot('right', 1.65, zInitial + (zStep * 0.5) % 1.05, i + 10));
    }
  }

  private createSlot(side: 'left' | 'right', roadX: number, z: number, seed: number): BuildingSlot {
    const container = this.scene.add.container(0, 0);

    const buildingGfx = this.scene.add.graphics();
    container.add(buildingGfx);

    // Sign container
    const signContainer = this.scene.add.container(0, 0);
    const signGfx = this.scene.add.graphics();
    signContainer.add(signGfx);

    const signText = this.scene.add.text(0, -10, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffd23f',
      align: 'center',
    });
    signText.setOrigin(0.5);
    signContainer.add(signText);

    const signSubText = this.scene.add.text(0, 7, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    });
    signSubText.setOrigin(0.5);
    signContainer.add(signSubText);

    container.add(signContainer);

    // Sidewalk Prop Graphics (street lamps, parked bikes, stools)
    const propGfx = this.scene.add.graphics();
    container.add(propGfx);

    const propTypes: Array<'lamp' | 'bike' | 'stools' | 'cart'> = ['lamp', 'bike', 'stools', 'cart'];
    const propType = propTypes[seed % propTypes.length]!;

    const slot: BuildingSlot = {
      container,
      buildingGfx,
      signContainer,
      signGfx,
      signText,
      signSubText,
      propGfx,
      side,
      roadX,
      z,
      seed,
      signIndex: seed % VIETNAMESE_SIGNS.length,
      propType,
    };

    this.renderSlotBuilding(slot);
    this.renderSlotSign(slot);
    this.renderSlotProp(slot);

    return slot;
  }

  private renderSlotBuilding(slot: BuildingSlot): void {
    const gfx = slot.buildingGfx;
    gfx.clear();

    const isLeft = slot.side === 'left';
    const wallColor = STREET_PALETTE.wallColors[slot.seed % STREET_PALETTE.wallColors.length]!;

    // Building Dimensions (scale 1.0 ground units)
    const bWidth = 140;
    const bHeight = 320 + (slot.seed % 3) * 60; // 3 to 5 floors
    const bX = isLeft ? -bWidth : 0;
    const bY = -bHeight;

    // 1. Main Facade Wall (Nhà ống mặt tiền)
    gfx.fillStyle(wallColor, 1);
    gfx.fillRect(bX, bY, bWidth, bHeight);

    // Subtle edge shadow for depth
    gfx.fillStyle(0x0a0914, 0.4);
    gfx.fillRect(isLeft ? bX + bWidth - 8 : bX, bY, 8, bHeight);

    // 2. Ground Floor: Metal Roller Door (Cửa cuốn)
    const doorW = bWidth - 24;
    const doorH = 75;
    const doorX = isLeft ? bX + 12 : bX + 12;
    const doorY = -doorH;

    gfx.fillStyle(STREET_PALETTE.rollerDoorMetal, 1);
    gfx.fillRect(doorX, doorY, doorW, doorH);

    // Horizontal metal grooves on roller door
    gfx.fillStyle(STREET_PALETTE.rollerDoorSeam, 0.9);
    for (let sl = doorY + 6; sl < 0; sl += 8) {
      gfx.fillRect(doorX + 2, sl, doorW - 4, 2);
    }

    // 3. Striped Awning (Mái hiên di động) above ground floor
    const awningChoice = STREET_PALETTE.awningColors[slot.seed % STREET_PALETTE.awningColors.length]!;
    const awningY = doorY - 14;
    const awningH = 20;
    const awningW = bWidth + 10;
    const awningX = isLeft ? bX - 5 : bX - 5;

    // Triangular awning profile
    const stripeWidth = 16;
    for (let sx = 0; sx < awningW; sx += stripeWidth) {
      const color = (Math.floor(sx / stripeWidth) % 2 === 0) ? awningChoice.stripe1 : awningChoice.stripe2;
      gfx.fillStyle(color, 1);
      gfx.fillRect(awningX + sx, awningY, Math.min(stripeWidth, awningW - sx), awningH);
    }

    // Awning scalloped hem line
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillRect(awningX, awningY + awningH, awningW, 3);

    // 4. Floors 2-5: Windows & Balconies (Ban công và cửa sổ sáng đèn)
    const floors = Math.floor(bHeight / 70);
    for (let f = 1; f < floors; f++) {
      const floorBaseY = -doorH - 25 - (f - 1) * 65;

      // Window pair
      const winW = 28;
      const winH = 38;
      const winY = floorBaseY - winH - 6;

      for (let w = 0; w < 2; w++) {
        const winX = bX + 22 + w * 52;

        // Window glow (warm yellow or cool cyan or dark)
        const isLit = ((slot.seed + f + w) % 3) !== 0;
        const litColor = ((slot.seed + f + w) % 5 === 0)
          ? STREET_PALETTE.windowCoolLit
          : STREET_PALETTE.windowWarmLit;

        gfx.fillStyle(isLit ? litColor : STREET_PALETTE.windowUnlit, 1);
        gfx.fillRect(winX, winY, winW, winH);

        // Window frame
        gfx.lineStyle(2, 0x111018, 0.9);
        gfx.strokeRect(winX, winY, winW, winH);

        // Window cross mullion
        gfx.lineBetween(winX + winW / 2, winY, winX + winW / 2, winY + winH);
        gfx.lineBetween(winX, winY + winH / 2, winX + winW, winY + winH / 2);
      }

      // Balcony Railing (Lan can sắt)
      const balW = bWidth - 18;
      const balX = bX + 9;
      const balH = 14;
      gfx.fillStyle(STREET_PALETTE.balconyMetal, 1);
      gfx.fillRect(balX, floorBaseY - balH, balW, balH);
      gfx.lineStyle(1.5, 0x3a364b, 0.8);
      for (let rx = balX + 4; rx < balX + balW - 4; rx += 8) {
        gfx.lineBetween(rx, floorBaseY - balH, rx, floorBaseY);
      }

      // Air Conditioner Outdoor Unit (Cục nóng điều hòa)
      if ((slot.seed + f) % 2 === 0) {
        const acX = bX + 8;
        const acY = floorBaseY - 32;
        gfx.fillStyle(STREET_PALETTE.acUnitGrey, 1);
        gfx.fillRect(acX, acY, 16, 12);
        gfx.fillStyle(0x181622, 1);
        gfx.fillCircle(acX + 8, acY + 6, 4);
      }
    }

    // 5. Rooftop Features: Stainless Steel Water Tank (Bồn nước inox Tân Á) or Antenna
    const roofY = bY;
    if (slot.seed % 2 === 0) {
      // Horizontal water tank cylinder
      const tankX = bX + 24;
      const tankY = roofY - 22;
      gfx.fillStyle(STREET_PALETTE.rooftopTankSilver, 1);
      gfx.fillRoundedRect(tankX, tankY, 44, 18, 4);
      gfx.fillStyle(0x4a4755, 1);
      gfx.fillRect(tankX + 8, tankY + 18, 4, 6);
      gfx.fillRect(tankX + 32, tankY + 18, 4, 6);
    } else {
      // Television aerial / antenna
      const antX = bX + 50;
      gfx.lineStyle(2, 0x555062, 0.9);
      gfx.lineBetween(antX, roofY, antX, roofY - 45);
      gfx.lineBetween(antX - 14, roofY - 35, antX + 14, roofY - 35);
      gfx.lineBetween(antX - 10, roofY - 22, antX + 10, roofY - 22);
    }
  }

  private renderSlotSign(slot: BuildingSlot): void {
    const isLeft = slot.side === 'left';
    const signData = VIETNAMESE_SIGNS[slot.signIndex % VIETNAMESE_SIGNS.length]!;

    const gfx = slot.signGfx;
    gfx.clear();

    const signW = 126;
    const signH = 34;
    const signX = isLeft ? -signW - 12 : 12;
    const signY = -92; // Above roller door, beneath balcony

    slot.signContainer.setPosition(signX + signW / 2, signY + signH / 2);

    // Glowing signboard background
    gfx.fillStyle(signData.bg, 0.95);
    gfx.fillRoundedRect(-signW / 2, -signH / 2, signW, signH, 5);

    // Bright illuminated neon border
    gfx.lineStyle(2.5, STREET_PALETTE.signBorderNeon, 0.95);
    gfx.strokeRoundedRect(-signW / 2, -signH / 2, signW, signH, 5);

    slot.signText.setText(signData.text);
    slot.signText.setColor(signData.textColor);

    slot.signSubText.setText(signData.sub);
  }

  private renderSlotProp(slot: BuildingSlot): void {
    const gfx = slot.propGfx;
    gfx.clear();

    const isLeft = slot.side === 'left';
    // Offset toward the sidewalk curb
    const propBaseX = isLeft ? 15 : -15;

    switch (slot.propType) {
      case 'lamp': {
        // Concrete/Metal Street Lamp Post on sidewalk
        const postH = 145;
        gfx.fillStyle(STREET_PALETTE.lampPost, 1);
        gfx.fillRect(propBaseX - 3, -postH, 6, postH);

        // Curved arm extending toward the roadway
        const armDir = isLeft ? 1 : -1;
        gfx.lineStyle(4, STREET_PALETTE.lampPost, 1);
        gfx.beginPath();
        gfx.moveTo(propBaseX, -postH);
        gfx.lineTo(propBaseX + armDir * 28, -postH - 12);
        gfx.strokePath();

        // Lamp head fixture
        const lampX = propBaseX + armDir * 28;
        const lampY = -postH - 12;
        gfx.fillStyle(0x22202c, 1);
        gfx.fillRect(lampX - 7, lampY, 14, 6);

        // Bright Warm Yellow Street Lamp Bulb
        gfx.fillStyle(STREET_PALETTE.lampBulb, 1);
        gfx.fillCircle(lampX, lampY + 5, 5);

        // Soft Warm Volumetric Streetlight Light Cone cast down onto pavement
        gfx.fillStyle(STREET_PALETTE.lampGlowCore, 0.12);
        gfx.fillTriangle(
          lampX, lampY + 6,
          lampX - 60, 0,
          lampX + 60, 0,
        );
        break;
      }

      case 'bike': {
        // Parked Ambient Motorcycle (Xe máy dựng nghiêng trước cửa)
        const bikeColor = STREET_PALETTE.parkedBikeBodyColors[slot.seed % STREET_PALETTE.parkedBikeBodyColors.length]!;
        const bX = propBaseX + (isLeft ? 10 : -10);

        // Wheels
        gfx.fillStyle(0x111111, 1);
        gfx.fillCircle(bX - 16, -9, 9);
        gfx.fillCircle(bX + 16, -9, 9);
        gfx.fillStyle(0x555555, 1);
        gfx.fillCircle(bX - 16, -9, 4);
        gfx.fillCircle(bX + 16, -9, 4);

        // Bike Frame / Chassis
        gfx.fillStyle(bikeColor, 1);
        gfx.fillRoundedRect(bX - 14, -22, 28, 14, 4);

        // Chrome Exhaust Pipe (Bô xe)
        gfx.fillStyle(0xcccccc, 1);
        gfx.fillRect(bX - 6, -11, 20, 4);

        // Seat & Handlebars
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(bX - 12, -26, 20, 6);
        gfx.fillRect(bX + 10, -32, 4, 10);
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillCircle(bX + 14, -30, 3); // Headlight reflection
        break;
      }

      case 'stools': {
        // Iconic Vietnamese Low Plastic Stools (Ghế nhựa quán cóc)
        const sX = propBaseX + (isLeft ? 15 : -15);

        // Red plastic stools
        gfx.fillStyle(STREET_PALETTE.plasticStoolRed, 1);
        gfx.fillRect(sX - 12, -14, 12, 14);
        gfx.fillRect(sX + 8, -14, 12, 14);

        // Blue plastic stool
        gfx.fillStyle(STREET_PALETTE.plasticStoolBlue, 1);
        gfx.fillRect(sX - 2, -14, 12, 14);

        // Small plastic table
        gfx.fillStyle(STREET_PALETTE.plasticTableRed, 0.9);
        gfx.fillRect(sX - 8, -24, 22, 10);
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(sX + 1, -14, 4, 14);
        break;
      }

      case 'cart': {
        // Street Vendor Glass Cart (Xe bánh mì / xe nước mía)
        const cX = propBaseX + (isLeft ? 15 : -15);

        // Wheels
        gfx.fillStyle(0x222222, 1);
        gfx.fillCircle(cX - 14, -6, 6);
        gfx.fillCircle(cX + 14, -6, 6);

        // Metal Cart Base
        gfx.fillStyle(STREET_PALETTE.vendorCartFrame, 1);
        gfx.fillRect(cX - 20, -28, 40, 22);

        // Illuminated Glass Display Case
        gfx.fillStyle(STREET_PALETTE.vendorCartGlass, 0.7);
        gfx.fillRect(cX - 18, -48, 36, 20);

        // Top Roof / Awning
        gfx.fillStyle(0xd90429, 1);
        gfx.fillRect(cX - 22, -54, 44, 6);
        break;
      }
    }
  }

  private drawSkyAndDistantSkyline(parallaxX: number): void {
    const gfx = this.bgGraphics;
    gfx.clear();

    const horizonY = TUNING.HORIZON_Y;

    // 1. Deep Vietnamese Night Sky Gradient
    gfx.fillStyle(STREET_PALETTE.skyTop, 1);
    gfx.fillRect(0, 0, GAME_WIDTH, horizonY * 0.45);
    gfx.fillStyle(STREET_PALETTE.skyMid, 1);
    gfx.fillRect(0, horizonY * 0.45, GAME_WIDTH, horizonY * 0.35);
    gfx.fillStyle(STREET_PALETTE.skyBottom, 1);
    gfx.fillRect(0, horizonY * 0.8, GAME_WIDTH, horizonY * 0.2);

    // Warm Ambient City Haze above horizon
    gfx.fillStyle(STREET_PALETTE.horizonHaze, 0.85);
    gfx.fillRect(0, horizonY - 55, GAME_WIDTH, 55);
    gfx.fillStyle(STREET_PALETTE.horizonGlowAmber, 0.4);
    gfx.fillRect(0, horizonY - 20, GAME_WIDTH, 20);

    // 2. Glowing Vietnamese Night Crescent Moon
    const moonX = GAME_WIDTH * 0.78 + parallaxX * 0.2;
    const moonY = horizonY * 0.28;

    // Outer soft moon halo
    gfx.fillStyle(STREET_PALETTE.moonGlow, 0.2);
    gfx.fillCircle(moonX, moonY, 32);
    gfx.fillStyle(STREET_PALETTE.moonGlow, 0.35);
    gfx.fillCircle(moonX, moonY, 22);

    // Moon body
    gfx.fillStyle(STREET_PALETTE.moonBody, 0.95);
    gfx.fillCircle(moonX, moonY, 14);
    // Dark cutout for crescent shape
    gfx.fillStyle(STREET_PALETTE.skyTop, 1);
    gfx.fillCircle(moonX - 5, moonY - 3, 12);

    // Night stars (scattered twinkle dots)
    gfx.fillStyle(0xffffff, 0.75);
    const starCoords = [
      [80, 70], [160, 110], [240, 50], [330, 95], [420, 60],
      [510, 120], [600, 75], [120, 180], [380, 160], [560, 190],
    ];
    for (const [sx, sy] of starCoords) {
      gfx.fillCircle((sx! + parallaxX * 0.15 + GAME_WIDTH) % GAME_WIDTH, sy!, 1.5);
    }

    // 3. Distant City Skyline Silhouettes (Parallax Buildings)
    const skylineY = horizonY - 8;
    const buildingWidths = [45, 60, 35, 55, 75, 40, 65, 50, 70, 48, 58, 62];
    const buildingHeights = [65, 95, 45, 80, 110, 55, 90, 70, 105, 60, 85, 75];

    let curX = -40 + parallaxX * 0.4;
    for (let b = 0; b < buildingWidths.length; b++) {
      const bw = buildingWidths[b]!;
      const bh = buildingHeights[b]!;
      const bx = curX;
      const by = skylineY - bh;

      // Silhouette tower
      gfx.fillStyle(b % 2 === 0 ? STREET_PALETTE.skylineBack : STREET_PALETTE.skylineMid, 1);
      gfx.fillRect(bx, by, bw, bh);

      // Distant speckle lit windows
      gfx.fillStyle(STREET_PALETTE.distantWindowGold, 0.6);
      for (let wy = by + 12; wy < skylineY - 10; wy += 14) {
        for (let wx = bx + 6; wx < bx + bw - 6; wx += 10) {
          if ((b + wy + wx) % 3 === 0) {
            gfx.fillRect(wx, wy, 4, 5);
          }
        }
      }

      // Blinking red aviation beacon on tallest towers
      if (bh > 90) {
        gfx.fillStyle(STREET_PALETTE.towerBlinkRed, 0.95);
        gfx.fillCircle(bx + bw / 2, by - 3, 2.5);
        gfx.lineStyle(1.5, 0x333333, 0.7);
        gfx.lineBetween(bx + bw / 2, by, bx + bw / 2, by - 12);
      }

      curX += bw + 6;
    }
  }

  private drawOverheadPowerCables(): void {
    const gfx = this.cableGraphics;
    gfx.clear();

    const horizonY = TUNING.HORIZON_Y;

    // Iconic Vietnamese tangled overhead power wires drooping across street
    gfx.lineStyle(1.8, STREET_PALETTE.powerWire, 0.75);

    const cableConfigs = [
      { startY: horizonY + 20, endY: horizonY + 25, dip: 18 },
      { startY: horizonY + 50, endY: horizonY + 45, dip: 24 },
      { startY: horizonY + 85, endY: horizonY + 95, dip: 32 },
    ];

    for (const cable of cableConfigs) {
      gfx.beginPath();
      const segments = 16;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const x = t * GAME_WIDTH;
        // Parabolic sag: 4 * t * (1 - t) is 0 at ends and 1 at center
        const sag = 4 * t * (1 - t) * cable.dip;
        const y = Phaser.Math.Linear(cable.startY, cable.endY, t) + sag;
        if (s === 0) {
          gfx.moveTo(x, y);
        } else {
          gfx.lineTo(x, y);
        }
      }
      gfx.strokePath();
    }
  }

  public update(dt: number, speed: number, bikeLean: number): void {
    // Parallax background shift based on player motorcycle lean
    this.parallaxOffset = Phaser.Math.Linear(this.parallaxOffset, -bikeLean * 55, 0.08);
    this.drawSkyAndDistantSkyline(this.parallaxOffset);
    this.drawOverheadPowerCables();

    // Stream and project building slots along perspective depth z
    for (const slot of this.buildingSlots) {
      slot.z -= speed * dt;

      // Wrap when building moves past camera
      if (slot.z < 0.015) {
        slot.z += 1.05;
        slot.seed = (slot.seed + 7) % 100;
        slot.signIndex = (slot.signIndex + 1) % VIETNAMESE_SIGNS.length;

        const propTypes: Array<'lamp' | 'bike' | 'stools' | 'cart'> = ['lamp', 'bike', 'stools', 'cart'];
        slot.propType = propTypes[slot.seed % propTypes.length]!;

        this.renderSlotBuilding(slot);
        this.renderSlotSign(slot);
        this.renderSlotProp(slot);
      }

      // Project using ground-truth perspective
      const pt = projectRoad(slot.roadX, slot.z);
      slot.container.setPosition(pt.x, pt.y);
      slot.container.setScale(pt.scale);

      // Depth layer sorting: behind road obstacles and player, but layered by depth
      const depthLayer = 8 + Math.floor((1 - slot.z) * 55);
      slot.container.setDepth(depthLayer);
    }
  }

  public destroy(): void {
    this.bgGraphics.destroy();
    this.cableGraphics.destroy();
    for (const slot of this.buildingSlots) {
      slot.container.destroy();
    }
    this.buildingSlots = [];
  }
}
