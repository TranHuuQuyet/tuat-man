import type { ReactNode } from 'react';

interface GameViewportProps {
  children: ReactNode;
}

/**
 * Fixed 9:16 portrait frame, centered on any screen.
 * - Phone (portrait): fills the screen (letterboxed if the phone is taller than 9:16).
 * - PC / tablet / landscape: a portrait column centered on a dark backdrop.
 * The gameplay area is NEVER stretched to 16:9.
 * React UI overlays (future phases) are rendered as siblings inside this frame.
 */
export function GameViewport({ children }: GameViewportProps) {
  return (
    <div className="viewport-backdrop">
      <div className="viewport-frame">{children}</div>
    </div>
  );
}
