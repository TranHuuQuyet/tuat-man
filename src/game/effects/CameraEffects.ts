import Phaser from 'phaser';
import { TUNING } from '../data/tuning';

/**
 * Centralized, normalized Camera Juice & Effects Controller for Phase B.4.
 * Combines lane follow, lane punch, speed zoom response, decaying shakes,
 * and zoom punches without fighting or state corruption.
 */
export class CameraEffects {
  private camera: Phaser.Cameras.Scene2D.Camera;

  // Normalized composite components
  private currentPanX = 0;
  private targetPanX = 0;
  private lanePunchX = 0;
  private zoomPunch = 0;
  private zoomSpeedFactor = 1.0;
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;
  private tiltAngle = 0;

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras.main;
  }

  // --- Impact Hierarchy Triggers (Section 27) ---

  /**
   * Subtle impulse when switching lanes.
   */
  public onLaneChange(direction: -1 | 1): void {
    this.lanePunchX = direction * TUNING.CAMERA_LANE_PUNCH_PX;
  }

  /**
   * Level 2: Small positive impact on precise near-miss dodge.
   */
  public nearMissImpact(): void {
    this.addShake(TUNING.SHAKE_NEAR_MISS_INTENSITY, TUNING.SHAKE_NEAR_MISS_DURATION);
    this.punchZoom(1.02, 120);
  }

  /**
   * Level 3: Hook connect physical anticipation.
   */
  public hookFeedback(): void {
    this.addShake(TUNING.SHAKE_HOOK_INTENSITY, TUNING.SHAKE_HOOK_DURATION);
    this.punchZoom(1.03, 140);
  }

  /**
   * Tug-of-war cadence feedback shake.
   */
  public pullTapShake(rating: 'PERFECT' | 'GOOD' | 'MISS'): void {
    if (rating === 'PERFECT') {
      this.addShake(0.006, 90);
    } else if (rating === 'GOOD') {
      this.addShake(0.003, 60);
    }
  }

  /**
   * Level 1: Strongest positive impact — Dog Catch WOW moment!
   */
  public catchImpact(): void {
    this.addShake(TUNING.SHAKE_CATCH_INTENSITY, TUNING.SHAKE_CATCH_DURATION);
    this.punchZoom(1.055, 200);
    this.camera.flash(180, 255, 210, 63, true);
  }

  /**
   * Level 5: Strong negative impact on crash.
   */
  public crashImpact(): void {
    this.addShake(TUNING.SHAKE_CRASH_INTENSITY, TUNING.SHAKE_CRASH_DURATION);
    this.punchZoom(0.96, 250);
    this.camera.flash(350, 255, 20, 20, true);
  }

  /**
   * Centralized shake adder (Section 28).
   */
  public addShake(intensity: number, durationMs: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = durationMs / 1000;
    this.shakeTimer = this.shakeDuration;
  }

  /**
   * Centralized zoom punch (Section 29).
   */
  public punchZoom(targetZoom: number, _durationMs = 150): void {
    this.zoomPunch = Math.max(this.zoomPunch, targetZoom - 1.0);
  }

  /**
   * Unified composite camera update loop (Section 30).
   * Combines base + follow + punch + speed response + shake + zoom.
   */
  public update(dt: number, playerRoadX: number, playerLean: number, speedRatio: number): void {
    // 1. Subtle horizontal camera follow of the motorcycle (Section 14)
    this.targetPanX = playerRoadX * TUNING.CAMERA_FOLLOW_STRENGTH;
    this.currentPanX = Phaser.Math.Linear(this.currentPanX, this.targetPanX, Math.min(1.0, dt * 8.0));

    // 2. Decay lane punch spring impulse (Section 17)
    this.lanePunchX = Phaser.Math.Linear(this.lanePunchX, 0, Math.min(1.0, dt * 14.0));

    // 3. Speed zoom response: slight wide-angle expansion at high speeds (Section 16)
    const targetSpeedZoom = 1.0 - (speedRatio - 1.0) * TUNING.CAMERA_SPEED_ZOOM_FACTOR;
    this.zoomSpeedFactor = Phaser.Math.Linear(this.zoomSpeedFactor, targetSpeedZoom, Math.min(1.0, dt * 4.0));

    // 4. Decay zoom punch
    this.zoomPunch = Phaser.Math.Linear(this.zoomPunch, 0, Math.min(1.0, dt * 10.0));

    // 5. Decaying camera shake offsets
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const amp = this.shakeIntensity * progress * 390; // scale against mobile width
      shakeOffsetX = (Math.random() * 2 - 1) * amp;
      shakeOffsetY = (Math.random() * 2 - 1) * amp;
    } else {
      this.shakeIntensity = 0;
    }

    // 6. Smooth steer tilt
    this.tiltAngle = Phaser.Math.Linear(this.tiltAngle, playerLean * 0.22, Math.min(1.0, dt * 12.0));

    // 7. Apply composite transformation directly to camera
    const finalScrollX = -(this.currentPanX + this.lanePunchX + shakeOffsetX);
    const finalScrollY = -shakeOffsetY;
    const finalZoom = this.zoomSpeedFactor + this.zoomPunch;

    this.camera.setScroll(finalScrollX, finalScrollY);
    this.camera.setZoom(finalZoom);
    this.camera.setRotation(this.tiltAngle);
  }

  public steerTilt(lean: number): void {
    this.tiltAngle = lean * 0.22;
  }

  public getCurrentPanX(): number {
    return this.currentPanX;
  }

  public getTargetPanX(): number {
    return this.targetPanX;
  }

  public getLanePunchX(): number {
    return this.lanePunchX;
  }

  public getZoomSpeedFactor(): number {
    return this.zoomSpeedFactor;
  }

  public getZoomPunch(): number {
    return this.zoomPunch;
  }

  public getShakeIntensity(): number {
    return this.shakeIntensity;
  }

  public getTiltAngle(): number {
    return this.tiltAngle;
  }

  public reset(): void {
    this.currentPanX = 0;
    this.targetPanX = 0;
    this.lanePunchX = 0;
    this.zoomPunch = 0;
    this.zoomSpeedFactor = 1.0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.tiltAngle = 0;

    this.camera.setScroll(0, 0);
    this.camera.setRotation(0);
    this.camera.setZoom(1);
  }
}

