import { useEffect, useState } from 'react';
import { GameViewport } from './components/GameViewport';
import { PhaserGame } from './components/PhaserGame';
import { EventBus, GAME_EVENTS } from './game/EventBus';
import type { GameState, PullProgressData, RunStats } from './game/EventBus';
import { getSavedPlayerName, savePlayerName } from './services/storage';
import { GameHudOverlay } from './ui/GameHudOverlay';
import { ResultOverlay } from './ui/ResultOverlay';
import { StartMenuOverlay } from './ui/StartMenuOverlay';

export function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [playerName, setPlayerName] = useState<string>(() => getSavedPlayerName());
  const [stats, setStats] = useState<RunStats>({
    playerName: getSavedPlayerName() || 'Tuất Thủ',
    dogCount: 0,
    money: 0,
    score: 0,
    distance: 0,
  });
  const [pullProgress, setPullProgress] = useState<PullProgressData | null>(null);

  useEffect(() => {
    const unsubState = EventBus.on(GAME_EVENTS.STATE_CHANGE, (state: GameState) => {
      setGameState(state);
      if (state !== 'PULLING') {
        setPullProgress(null);
      }
    });

    const unsubStats = EventBus.on(GAME_EVENTS.STATS_UPDATE, (newStats: RunStats) => {
      setStats(newStats);
    });

    const unsubPull = EventBus.on(GAME_EVENTS.PULL_PROGRESS, (progress: PullProgressData) => {
      setPullProgress(progress);
    });

    const unsubGameOver = EventBus.on(GAME_EVENTS.GAME_OVER, (finalStats: RunStats) => {
      setStats(finalStats);
      setGameState('RESULT');
    });

    return () => {
      unsubState();
      unsubStats();
      unsubPull();
      unsubGameOver();
    };
  }, []);

  const handleStartGame = (name: string) => {
    setPlayerName(name);
    savePlayerName(name);
    EventBus.emit(GAME_EVENTS.START_GAME, { playerName: name });
  };

  const handleRestartGame = () => {
    EventBus.emit(GAME_EVENTS.RESTART_GAME);
  };

  return (
    <GameViewport>
      {/* Phaser Canvas */}
      <PhaserGame />

      {/* React Overlays */}
      {gameState === 'MENU' && (
        <StartMenuOverlay initialName={playerName} onStart={handleStartGame} />
      )}

      {gameState !== 'MENU' && gameState !== 'RESULT' && gameState !== 'GAME_OVER' && (
        <GameHudOverlay stats={stats} gameState={gameState} pullProgress={pullProgress} />
      )}

      {(gameState === 'RESULT' || gameState === 'GAME_OVER') && (
        <ResultOverlay stats={stats} onRestart={handleRestartGame} />
      )}
    </GameViewport>
  );
}
