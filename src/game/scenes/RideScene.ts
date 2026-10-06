import Phaser from 'phaser';
import { SFX } from '../audio/SoundEffects';
import { getDogConfig } from '../data/dogs';
import type { DogType } from '../data/dogs';
import { TUNING } from '../data/tuning';
import type { Lane } from '../data/tuning';
import type { HazardType } from '../data/trafficTypes';
import { CameraEffects } from '../effects/CameraEffects';
import { DogEntity } from '../entities/DogEntity';
import { EnvironmentManager } from '../entities/EnvironmentManager';
import { ObstacleEntity } from '../entities/ObstacleEntity';
import { PlayerBike } from '../entities/PlayerBike';
import { RoadRenderer } from '../entities/RoadRenderer';
import { EventBus, GAME_EVENTS } from '../EventBus';
import type { GameState, RunStats } from '../EventBus';
import { InputController } from '../input/InputController';
import { HookSystem } from '../systems/HookSystem';
import { PullSystem } from '../systems/PullSystem';
import { SpawnerSystem } from '../systems/SpawnerSystem';

export interface TelemetryData {
  hookAttempts: number;
  hookHits: number;
  hookMisses: number;
  missReasons: Record<string, number>;
  pullTaps: number;
  perfectTaps: number;
  goodTaps: number;
  missTaps: number;
  dogsCaught: number;
  dogsEscaped: number;
  crashes: number;
  laneSwitches: number;
  leftSwitches: number;
  rightSwitches: number;
  startTime: number;
  firstHookTime: number | null;
  firstCatchTime: number | null;
}

export class RideScene extends Phaser.Scene {
  private road!: RoadRenderer;
  private environment!: EnvironmentManager;
  private player!: PlayerBike;
  private inputCtrl!: InputController;
  private spawner!: SpawnerSystem;
  private hookSys!: HookSystem;
  private pullSys!: PullSystem;
  private camFx!: CameraEffects;

  private obstacles: ObstacleEntity[] = [];
  private dogs: DogEntity[] = [];
  private ropeGraphics!: Phaser.GameObjects.Graphics;

  private currentState: GameState = 'RIDE';
  private stats: RunStats = {
    playerName: 'Tuất Thủ',
    dogCount: 0,
    money: 0,
    score: 0,
    distance: 0,
  };

  public telemetry: TelemetryData = {
    hookAttempts: 0,
    hookHits: 0,
    hookMisses: 0,
    missReasons: {},
    pullTaps: 0,
    perfectTaps: 0,
    goodTaps: 0,
    missTaps: 0,
    dogsCaught: 0,
    dogsEscaped: 0,
    crashes: 0,
    laneSwitches: 0,
    leftSwitches: 0,
    rightSwitches: 0,
    startTime: 0,
    firstHookTime: null,
    firstCatchTime: null,
  };

  private unsubscribers: Array<() => void> = [];
  private feedbackText!: Phaser.GameObjects.Text;
  private floatingFeedbackTween?: Phaser.Tweens.Tween;
  private wasHookReady = false;
  private isHitStop = false;

  constructor() {
    super('RideScene');
  }

  init(data: { playerName?: string }): void {
    if (data?.playerName) {
      this.stats.playerName = data.playerName;
    }
    this.stats.dogCount = 0;
    this.stats.money = 0;
    this.stats.score = 0;
    this.stats.distance = 0;
    this.currentState = 'RIDE';

    this.telemetry.laneSwitches = 0;
    this.telemetry.leftSwitches = 0;
    this.telemetry.rightSwitches = 0;
    this.telemetry.startTime = performance.now();
    (window as unknown as { __TUAT_TELEMETRY__: TelemetryData }).__TUAT_TELEMETRY__ = this.telemetry;
  }

  create(): void {
    this.camFx = new CameraEffects(this);
    this.environment = new EnvironmentManager(this);
    this.road = new RoadRenderer(this);
    this.player = new PlayerBike(this);
    this.inputCtrl = new InputController(this);
    this.spawner = new SpawnerSystem(this);
    this.hookSys = new HookSystem();
    this.pullSys = new PullSystem();

    (window as unknown as { __TUAT_SCENE__: RideScene }).__TUAT_SCENE__ = this;

    this.ropeGraphics = this.add.graphics();
    this.ropeGraphics.setDepth(98);

    this.feedbackText = this.add.text(this.scale.width / 2, 490, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd23f',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    });
    this.feedbackText.setOrigin(0.5);
    this.feedbackText.setDepth(150);

    this.setupListeners();
    this.emitStats();
    this.changeState('RIDE');

    // Start Web Audio engine and BGM
    SFX.startBgm();
    SFX.startEngine();
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
    this.feedbackText.setScale(1.25);

    this.floatingFeedbackTween = this.tweens.add({
      targets: this.feedbackText,
      y: 430,
      scale: 1.0,
      alpha: { from: 1, to: 0 },
      duration: 1300,
      ease: 'Power2',
    });
  }

  private handleHookInput(): void {
    if (this.currentState !== 'RIDE') return;

    this.telemetry.hookAttempts++;
    SFX.playHookThrow();

    const res = this.hookSys.attemptHook(this.dogs, this.player.currentLane, this.player.roadX, this.time.now / 1000);

    if (res.success && res.dog) {
      this.telemetry.hookHits++;
      if (this.telemetry.firstHookTime === null) {
        this.telemetry.firstHookTime = (performance.now() - this.telemetry.startTime) / 1000;
      }

      this.camFx.hookFeedback();
      this.showFeedback('⚡ ĐÃ MÓC TRÚNG! KÉO!', '#00ff88');
      this.changeState('PULLING');
      this.pullSys.startPull(res.dog);
    } else if (res.message !== 'SPAM') {
      this.telemetry.hookMisses++;
      const reasonKey = res.reason || 'UNKNOWN';
      this.telemetry.missReasons[reasonKey] = (this.telemetry.missReasons[reasonKey] || 0) + 1;

      SFX.playHookMiss();
      this.showFeedback(res.message, '#ff6b6b');
    }
  }

  private handlePullInput(): void {
    if (this.currentState !== 'PULLING') return;

    const tapResult = this.pullSys.registerTap();
    this.telemetry.pullTaps++;
    if (tapResult.rating === 'PERFECT') this.telemetry.perfectTaps++;
    else if (tapResult.rating === 'GOOD') this.telemetry.goodTaps++;
    else this.telemetry.missTaps++;

    this.camFx.pullTapShake(tapResult.rating);

    if (tapResult.rating === 'PERFECT') {
      this.showFeedback('🔥 PERFECT! +LỰC', '#00ff88');
      this.stats.score += 25;
      this.emitStats();
    } else if (tapResult.rating === 'MISS') {
      this.showFeedback('⚠️ TRẬT NHỊP!', '#ff4444');
    }
  }

  override update(_time: number, delta: number): void {
    if (this.isHitStop) return;

    const dt = Math.min(delta / 1000, 0.05);

    // Keyboard Space Handler
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

    const speedMultiplier = this.currentState === 'PULLING' ? 0.55 : 1.0;
    const currentSpeed = TUNING.BASE_SPEED * speedMultiplier;

    this.stats.distance += Math.round(18 * dt * speedMultiplier);
    this.stats.score += Math.round(5 * dt * speedMultiplier);
    this.emitStats();

    this.road.update(dt, speedMultiplier);
    this.environment.update(dt, currentSpeed, this.player.currentLean);

    const laneChange = this.inputCtrl.consumeLaneChange();
    if (laneChange !== 0) {
      const switched = this.player.moveLane(laneChange);
      if (switched) {
        this.telemetry.laneSwitches++;
        if (laneChange === -1) {
          this.telemetry.leftSwitches++;
        } else {
          this.telemetry.rightSwitches++;
        }
      }
    }

    this.player.update(dt);
    this.camFx.steerTilt(this.player.currentLean);

    // Dynamic engine throttle pitch and revving
    SFX.updateEngine(speedMultiplier, Math.abs(this.player.currentLean) > 0.05);

    this.spawner.update(
      dt,
      this.currentState === 'PULLING',
      this.dogs.filter((d) => d.active && !d.hooked).length,
      (obs) => this.obstacles.push(obs),
      (dog) => this.dogs.push(dog),
    );

    // Check dog hook readiness & orient bamboo pole side (requires player to be physically settled in dog's lane!)
    let isAnyDogReady = false;
    let targetDogSide: 'left' | 'right' = 'right';

    for (const d of this.dogs) {
      if (d.active && !d.escaped) {
        if (d.getHookState() === 'HOOKABLE' && this.player.isSettledInLane(d.lane)) {
          isAnyDogReady = true;
          targetDogSide = d.roadX < 0 ? 'left' : 'right';
          break;
        } else if (d.getHookState() === 'APPROACHING') {
          targetDogSide = d.roadX < 0 ? 'left' : 'right';
        }
      }
    }

    this.player.setPoleSide(targetDogSide);

    if (isAnyDogReady !== this.wasHookReady) {
      this.wasHookReady = isAnyDogReady;
      EventBus.emit(GAME_EVENTS.HOOK_READY_UPDATE, {
        ready: isAnyDogReady,
        side: targetDogSide,
      });
    }

    // Update obstacles and collision check (transition-aware)
    const playerBounds = this.player.getScreenBounds();
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]!;
      obs.update(dt, currentSpeed);

      if (obs.checkCollision(this.player.roadX, this.player.currentLane, this.player.targetLane, this.player.isChangingLane, playerBounds)) {
        this.handleCrash();
        return;
      }

      if (!obs.active) {
        this.spawner.recycleObstacle(obs);
        this.obstacles.splice(i, 1);
      }
    }

    // Update dogs
    for (let i = this.dogs.length - 1; i >= 0; i--) {
      const dog = this.dogs[i]!;
      dog.update(dt, currentSpeed);

      if (!dog.active && !dog.hooked) {
        this.spawner.recycleDog(dog);
        this.dogs.splice(i, 1);
      }
    }

    // Update Pull Mini-Game and Render Tug Rope
    this.ropeGraphics.clear();

    if (this.currentState === 'PULLING') {
      const hookedDog = this.dogs.find((d) => d.hooked);
      if (hookedDog) {
        const poleTip = this.player.getHookTipScreenPos();
        const dogPos = hookedDog.getScreenPos();

        // Draw vibrating tension rope between pole and dog
        const pullProgressPct = this.pullSys.pullPower / 100;
        const ropeColor = pullProgressPct > 0.75 ? 0x00ff88 : pullProgressPct < 0.25 ? 0xff3b3b : 0xffd23f;

        this.ropeGraphics.lineStyle(3, ropeColor, 0.95);
        this.ropeGraphics.lineBetween(poleTip.x, poleTip.y, dogPos.x, dogPos.y - 18 * dogPos.scale);

        // Tension ripple rings along the cord
        const midX = (poleTip.x + dogPos.x) / 2;
        const midY = (poleTip.y + dogPos.y - 18 * dogPos.scale) / 2;
        this.ropeGraphics.lineStyle(2, 0xffffff, 0.7);
        this.ropeGraphics.strokeCircle(midX, midY, 6 + Math.sin(this.time.now * 0.02) * 2);
      }

      const pullResult = this.pullSys.update(dt);
      if (pullResult === 'CAUGHT') {
        this.handleDogCaught();
      } else if (pullResult === 'ESCAPED') {
        this.handleDogEscaped();
      }
    }
  }

  private handleDogCaught(): void {
    this.telemetry.dogsCaught++;
    if (this.telemetry.firstCatchTime === null) {
      this.telemetry.firstCatchTime = (performance.now() - this.telemetry.startTime) / 1000;
    }

    // 60ms hit-stop freeze impact
    this.isHitStop = true;
    setTimeout(() => {
      this.isHitStop = false;
    }, 60);

    this.ropeGraphics.clear();
    this.camFx.catchImpact();

    const hookedIndex = this.dogs.findIndex((d) => d.hooked);
    const hookedDog = hookedIndex !== -1 ? this.dogs[hookedIndex]! : null;
    const rewardValue = hookedDog ? hookedDog.config.reward : 150;
    const dogName = hookedDog ? hookedDog.config.name : 'Chó Cỏ';
    const scoreValue = hookedDog ? hookedDog.config.score : 500;

    this.showFeedback(`🎉 BẮT ĐƯỢC ${dogName.toUpperCase()}! +$${rewardValue}`, '#00ff88');

    // Trigger WOW reward popup in HUD
    EventBus.emit(GAME_EVENTS.REWARD_POPUP, {
      text: `🎉 BẮT ĐƯỢC ${dogName.toUpperCase()}!`,
      subtext: `+$${rewardValue} VÀO TÚI 💵`,
      amount: rewardValue,
      type: 'dog',
    });

    this.stats.dogCount += 1;
    this.stats.money += rewardValue;
    this.stats.score += scoreValue;
    this.emitStats();

    if (hookedDog) {
      this.spawner.recycleDog(hookedDog);
      this.dogs.splice(hookedIndex, 1);
    }

    this.changeState('DOG_CAUGHT');
    setTimeout(() => {
      if (this.currentState !== 'CRASH') {
        this.changeState('RIDE');
      }
    }, 700);
  }

  private handleDogEscaped(): void {
    this.telemetry.dogsEscaped++;
    this.ropeGraphics.clear();
    this.showFeedback('💨 TRƯỢT RỒI! CHÓ CHẠY MẤT', '#ff9f1c');

    const hookedDog = this.dogs.find((d) => d.hooked);
    if (hookedDog) {
      hookedDog.setEscaped();
    }

    this.changeState('DOG_ESCAPED');
    setTimeout(() => {
      if (this.currentState !== 'CRASH') {
        this.changeState('RIDE');
      }
    }, 700);
  }

  public handleCrash(): void {
    this.telemetry.crashes++;
    this.ropeGraphics.clear();
    this.changeState('CRASH');
    SFX.stopEngine();
    SFX.stopBgm();
    SFX.playCrash();
    this.camFx.crashImpact();
    this.showFeedback('💥 TAI NẠN! GAME OVER', '#ff3b3b');

    setTimeout(() => {
      this.changeState('GAME_OVER');
      EventBus.emit(GAME_EVENTS.GAME_OVER, { ...this.stats });
    }, 900);
  }

  private restartGame(): void {
    this.cleanup();
    this.scene.restart({ playerName: this.stats.playerName });
  }

  private cleanup(): void {
    SFX.stopEngine();
    SFX.stopBgm();
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.obstacles.forEach((o) => this.spawner.recycleObstacle(o));
    this.obstacles = [];
    this.dogs.forEach((d) => this.spawner.recycleDog(d));
    this.dogs = [];
    this.environment.destroy();
    this.ropeGraphics.clear();
    this.inputCtrl.destroy();
    this.camFx.reset();
  }

  public cleanupAndShutdown(): void {
    this.cleanup();
  }

  // --- Test & Inspection Helpers ---
  public setStateForTest(state: GameState): void {
    this.changeState(state);
  }

  public getEnvironment(): EnvironmentManager {
    return this.environment;
  }

  public getSpawner(): SpawnerSystem {
    return this.spawner;
  }

  public getPlayer(): PlayerBike {
    return this.player;
  }

  public getDogs(): DogEntity[] {
    return this.dogs;
  }

  public getObstacles(): ObstacleEntity[] {
    return this.obstacles;
  }

  public spawnTestObstacle(lane: Lane, z: number, type: HazardType = 'barricade'): ObstacleEntity {
    const obs = this.spawner.acquireObstacle(lane, z, type);
    this.obstacles.push(obs);
    return obs;
  }

  public spawnTestDog(lane: Lane, z: number, type: DogType = 'grass_dog'): DogEntity {
    const config = getDogConfig(type);
    const dog = this.spawner.acquireDog(config, lane, z);
    this.dogs.push(dog);
    return dog;
  }

  public getTelemetry(): TelemetryData {
    return this.telemetry;
  }
}
