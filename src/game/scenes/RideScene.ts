import Phaser from 'phaser';
import { SCENE_KEYS } from '../config';
import { TUNING } from '../data/tuning';
import { CameraEffects } from '../effects/CameraEffects';
import { DogEntity } from '../entities/DogEntity';
import { ObstacleEntity } from '../entities/ObstacleEntity';
import { PlayerBike } from '../entities/PlayerBike';
import { RoadRenderer } from '../entities/RoadRenderer';
import { EventBus, GAME_EVENTS } from '../EventBus';
import type { GameState, RunStats } from '../EventBus';
import { InputController } from '../input/InputController';
import { HookSystem } from '../systems/HookSystem';
import { PullSystem } from '../systems/PullSystem';
import { SpawnerSystem } from '../systems/SpawnerSystem';

export class RideScene extends Phaser.Scene {
  private road!: RoadRenderer;
  private player!: PlayerBike;
  private inputCtrl!: InputController;
  private spawner!: SpawnerSystem;
  private hookSys!: HookSystem;
  private pullSys!: PullSystem;
  private camFx!: CameraEffects;

  private obstacles: ObstacleEntity[] = [];
  private dogs: DogEntity[] = [];

  private currentState: GameState = 'RIDE';
  private stats: RunStats = {
    playerName: '',
    dogCount: 0,
    money: 0,
    score: 0,
    distance: 0,
  };

  private unsubscribers: (() => void)[] = [];
  private feedbackText: Phaser.GameObjects.Text | null = null;
  private floatingFeedbackTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super(SCENE_KEYS.ride);
  }

  init(data: { playerName?: string }): void {
    this.stats.playerName = data?.playerName || 'Tuất Thủ';
    this.stats.dogCount = 0;
    this.stats.money = 0;
    this.stats.score = 0;
    this.stats.distance = 0;
    this.currentState = 'RIDE';
  }

  create(): void {
    this.road = new RoadRenderer(this);
    this.player = new PlayerBike(this);
    this.inputCtrl = new InputController(this);
    this.spawner = new SpawnerSystem(this);
    this.hookSys = new HookSystem();
    this.pullSys = new PullSystem();
    this.camFx = new CameraEffects(this);

    this.feedbackText = this.add.text(this.scale.width / 2, 460, '', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffd23f',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    });
    this.feedbackText.setOrigin(0.5);
    this.feedbackText.setDepth(200);
    this.feedbackText.setAlpha(0);

    this.setupListeners();
    this.changeState('RIDE');
    this.emitStats();
  }

  private setupListeners(): void {
    this.unsubscribers.push(
      EventBus.on(GAME_EVENTS.INPUT_HOOK, () => {
        this.handleHookInput();
      }),
      EventBus.on(GAME_EVENTS.INPUT_PULL, () => {
        this.handlePullInput();
      }),
      EventBus.on(GAME_EVENTS.RESTART_GAME, () => {
        this.restartGame();
      }),
    );
  }

  private changeState(newState: GameState): void {
    this.currentState = newState;
    EventBus.emit(GAME_EVENTS.STATE_CHANGE, newState);
  }

  private emitStats(): void {
    EventBus.emit(GAME_EVENTS.STATS_UPDATE, { ...this.stats });
  }

  private showFeedback(text: string, color = '#ffd23f'): void {
    if (!this.feedbackText) return;

    if (this.floatingFeedbackTween) {
      this.floatingFeedbackTween.stop();
    }

    this.feedbackText.setText(text);
    this.feedbackText.setColor(color);
    this.feedbackText.setPosition(this.scale.width / 2, 490);
    this.feedbackText.setAlpha(1);
    this.feedbackText.setScale(1.2);

    this.floatingFeedbackTween = this.tweens.add({
      targets: this.feedbackText,
      y: 440,
      scale: 1.0,
      alpha: { from: 1, to: 0 },
      duration: 1200,
      ease: 'Power2',
    });
  }

  private handleHookInput(): void {
    if (this.currentState !== 'RIDE') return;

    const res = this.hookSys.attemptHook(this.dogs, this.time.now / 1000);
    if (res.success && res.dog) {
      this.camFx.hookFeedback();
      this.showFeedback('⚡ ĐÃ MÓC TRÚNG! KÉO!', '#00ff88');
      this.changeState('PULLING');
      this.pullSys.startPull(res.dog);
    } else if (res.message !== 'SPAM') {
      this.showFeedback(res.message, '#ff6b6b');
    }
  }

  private handlePullInput(): void {
    if (this.currentState !== 'PULLING') return;

    const tap = this.pullSys.registerTap();
    this.camFx.pullTapShake();

    if (tap.rating === 'PERFECT') {
      this.showFeedback('🔥 PERFECT!', '#00ff88');
    } else if (tap.rating === 'GOOD') {
      this.showFeedback('👍 GOOD!', '#ffd23f');
    }
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);

    if (this.inputCtrl.isSpaceJustDown()) {
      if (this.currentState === 'RIDE') {
        this.handleHookInput();
      } else if (this.currentState === 'PULLING') {
        this.handlePullInput();
      }
    }

    if (this.currentState === 'CRASH' || this.currentState === 'GAME_OVER') {
      return;
    }

    const speedMultiplier = this.currentState === 'PULLING' ? 0.6 : 1.0;
    const currentSpeed = TUNING.BASE_SPEED * speedMultiplier;

    this.stats.distance += Math.round(18 * dt * speedMultiplier);
    this.stats.score += Math.round(5 * dt * speedMultiplier);
    this.emitStats();

    this.road.update(dt, speedMultiplier);

    const steer = this.inputCtrl.getSteerDirection();
    this.player.update(dt, steer);
    this.camFx.steerTilt(this.player.currentLean);

    this.spawner.update(
      dt,
      this.currentState === 'PULLING',
      (obs) => this.obstacles.push(obs),
      (dog) => this.dogs.push(dog),
    );

    const playerBounds = this.player.getScreenBounds();
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]!;
      obs.update(dt, currentSpeed);

      if (obs.checkCollision(playerBounds)) {
        this.handleCrash();
        return;
      }

      if (!obs.active) {
        obs.destroy();
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.dogs.length - 1; i >= 0; i--) {
      const dog = this.dogs[i]!;
      dog.update(dt, currentSpeed);

      if (!dog.active && !dog.hooked) {
        dog.destroy();
        this.dogs.splice(i, 1);
      }
    }

    if (this.currentState === 'PULLING') {
      const pullResult = this.pullSys.update(dt);
      if (pullResult === 'CAUGHT') {
        this.handleDogCaught();
      } else if (pullResult === 'ESCAPED') {
        this.handleDogEscaped();
      }
    }
  }

  private handleDogCaught(): void {
    this.camFx.catchImpact();
    this.showFeedback('🎉 BẮT ĐƯỢC CHÓ! +$150', '#00ff88');

    this.stats.dogCount += 1;
    this.stats.money += 150;
    this.stats.score += 500;
    this.emitStats();

    const hookedIndex = this.dogs.findIndex((d) => d.hooked);
    if (hookedIndex !== -1) {
      this.dogs[hookedIndex]!.destroy();
      this.dogs.splice(hookedIndex, 1);
    }

    this.changeState('DOG_CAUGHT');
    this.time.delayedCall(700, () => {
      if (this.currentState !== 'CRASH') {
        this.changeState('RIDE');
      }
    });
  }

  private handleDogEscaped(): void {
    this.showFeedback('💨 TRƯỢT RỒI! CHÓ CHẠY MẤT', '#ff9f1c');

    const hookedDog = this.dogs.find((d) => d.hooked);
    if (hookedDog) {
      hookedDog.setHooked(false);
      hookedDog.roadX += hookedDog.roadX > 0 ? 0.3 : -0.3;
    }

    this.changeState('DOG_ESCAPED');
    this.time.delayedCall(700, () => {
      if (this.currentState !== 'CRASH') {
        this.changeState('RIDE');
      }
    });
  }

  private handleCrash(): void {
    this.changeState('CRASH');
    this.camFx.crashImpact();
    this.showFeedback('💥 TAI NẠN! GAME OVER', '#ff3b3b');

    this.time.delayedCall(900, () => {
      this.changeState('GAME_OVER');
      EventBus.emit(GAME_EVENTS.GAME_OVER, { ...this.stats });
    });
  }

  private restartGame(): void {
    this.cleanup();
    this.scene.restart({ playerName: this.stats.playerName });
  }

  private cleanup(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.obstacles.forEach((o) => o.destroy());
    this.obstacles = [];
    this.dogs.forEach((d) => d.destroy());
    this.dogs = [];
    this.inputCtrl.destroy();
    this.camFx.reset();
  }

  public cleanupAndShutdown(): void {
    this.cleanup();
  }
}
