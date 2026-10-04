import { GameViewport } from './components/GameViewport';
import { PhaserGame } from './components/PhaserGame';

/**
 * App shell. React owns everything outside the game canvas
 * (future: name entry, menus, overlays). Phaser owns the gameplay canvas.
 */
export function App() {
  return (
    <GameViewport>
      <PhaserGame />
    </GameViewport>
  );
}
