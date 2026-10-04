import Phaser from 'phaser';
import { TUNING } from '../data/tuning';

export class CameraEffects {
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras.main;
  }

  public steerTilt(lean: number): void {
    this.camera.setRotation(lean * 0.25);
  }

  public hookFeedback(): void {
    this.camera.shake(TUNING.SHAKE_SMALL_DURATION, TUNING.SHAKE_SMALL_INTENSITY);
  }

  public pullTapShake(): void {
    this.camera.shake(80, 0.005);
  }

  public catchImpact(): void {
    this.camera.shake(220, 0.012);
    this.camera.flash(180, 255, 210, 63, true);
  }

  public crashImpact(): void {
    this.camera.shake(TUNING.SHAKE_CRASH_DURATION, TUNING.SHAKE_CRASH_INTENSITY);
    this.camera.flash(300, 255, 0, 0, true);
  }

  public reset(): void {
    this.camera.setRotation(0);
    this.camera.setZoom(1);
  }
}
