import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGame } from '../game/createGame';

/**
 * Mounts a single Phaser.Game instance into a div and destroys it on unmount.
 * Safe under React StrictMode (mount → unmount → mount in dev).
 */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || gameRef.current) return;

    gameRef.current = createGame(container);
    (window as any).__PHASER_GAME__ = gameRef.current;

    return () => {
      delete (window as any).__PHASER_GAME__;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="phaser-container" />;
}
