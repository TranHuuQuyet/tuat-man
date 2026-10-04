import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from './config';
import { BootScene } from './scenes/BootScene';
import { RideScene } from './scenes/RideScene';
import { EventBus, GAME_EVENTS } from './EventBus';

/** Creates the Phaser game inside the given DOM element. */
export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.nightSky,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
    },
    input: {
      activePointers: 3,
    },
    scene: [BootScene, RideScene],
  });

  // Listen to START_GAME event to transition from BootScene to RideScene
  const unsub = EventBus.on(GAME_EVENTS.START_GAME, (data: { playerName: string }) => {
    if (game.scene.isActive(SCENE_KEYS.boot)) {
      game.scene.stop(SCENE_KEYS.boot);
      game.scene.start(SCENE_KEYS.ride, data);
    }
  });

  // Attach cleanup hook to game instance
  const originalDestroy = game.destroy.bind(game);
  game.destroy = (removeCanvas: boolean, noReturn?: boolean) => {
    unsub();
    return originalDestroy(removeCanvas, noReturn);
  };

  return game;
}
