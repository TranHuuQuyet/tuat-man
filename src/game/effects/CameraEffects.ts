import Phaser from 'phaser';
import { TUNING } from '../data/tuning';

export class CameraEffects {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  public steerTilt(lean: number): void {
    this.camera.setRotation(lean * 0.22);
  }

  public hookFeedback(): void {
    // Punch shake on hook connect
    this.camera.shake(TUNING.SHAKE_HOOK_DURATION, TUNING.SHAKE_HOOK_INTENSITY);
  }

  public pullTapShake(rating: 'PERFECT' | 'GOOD' | 'MISS'): void {
    if (rating === 'PERFECT') {
      this.camera.shake(90, 0.006);
    } else if (rating === 'GOOD') {
      this.camera.shake(60, 0.003);
    }
  }

  public catchImpact(): void {
    // Strong short impact + gold reward flash + zoom punch
    this.camera.shake(TUNING.SHAKE_CATCH_DURATION, TUNING.SHAKE_CATCH_INTENSITY);
    this.camera.flash(180, 255, 210, 63, true);

    this.scene.tweens.add({
      targets: this.camera,
      zoom: 1.04,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });
  }

  public crashImpact(): void {
    this.camera.shake(TUNING.SHAKE_CRASH_DURATION, TUNING.SHAKE_CRASH_INTENSITY);
    this.camera.flash(350, 255, 20, 20, true);
  }

  public reset(): void {
    this.camera.setRotation(0);
    this.camera.setZoom(1);
  }
}
