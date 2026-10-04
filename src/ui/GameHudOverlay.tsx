import { useEffect, useState } from 'react';
import { EventBus, GAME_EVENTS } from '../game/EventBus';
import type { GameState, HookReadyData, PullProgressData, RunStats } from '../game/EventBus';

interface GameHudOverlayProps {
  stats: RunStats;
  gameState: GameState;
  pullProgress: PullProgressData | null;
}

type HookButtonVisualState = 'NORMAL' | 'READY' | 'PRESSED' | 'MISS' | 'SUCCESS';

export const GameHudOverlay: React.FC<GameHudOverlayProps> = ({
  stats,
  gameState,
  pullProgress,
}) => {
  const isPulling = gameState === 'PULLING';
  const [isHookReady, setIsHookReady] = useState(false);
  const [hookSide, setHookSide] = useState<'left' | 'right'>('right');
  const [hookVisualState, setHookVisualState] = useState<HookButtonVisualState>('NORMAL');
  const [pullTapAnim, setPullTapAnim] = useState(false);

  useEffect(() => {
    const unsubReady = EventBus.on(GAME_EVENTS.HOOK_READY_UPDATE, (data: HookReadyData) => {
      setIsHookReady(data.ready);
      if (data.side) setHookSide(data.side);
      if (data.ready) {
        setHookVisualState('READY');
      } else {
        setHookVisualState((prev) => (prev === 'READY' ? 'NORMAL' : prev));
      }
    });

    const unsubFeedback = EventBus.on(GAME_EVENTS.HOOK_FEEDBACK, (data: { success: boolean; message: string; reason?: string }) => {
      if (data.success) {
        setHookVisualState('SUCCESS');
      } else if (data.reason !== 'SPAM') {
        setHookVisualState('MISS');
        setTimeout(() => {
          setHookVisualState(isHookReady ? 'READY' : 'NORMAL');
        }, 500);
      }
    });

    return () => {
      unsubReady();
      unsubFeedback();
    };
  }, [isHookReady]);

  const handleSteerLeftStart = () => {
    EventBus.emit(GAME_EVENTS.INPUT_STEER_LEFT, true);
  };
  const handleSteerLeftEnd = () => {
    EventBus.emit(GAME_EVENTS.INPUT_STEER_LEFT, false);
  };

  const handleSteerRightStart = () => {
    EventBus.emit(GAME_EVENTS.INPUT_STEER_RIGHT, true);
  };
  const handleSteerRightEnd = () => {
    EventBus.emit(GAME_EVENTS.INPUT_STEER_RIGHT, false);
  };

  const handleHookClick = () => {
    setHookVisualState('PRESSED');
    EventBus.emit(GAME_EVENTS.INPUT_HOOK);
  };

  const handlePullClick = () => {
    setPullTapAnim(true);
    setTimeout(() => setPullTapAnim(false), 80);
    EventBus.emit(GAME_EVENTS.INPUT_PULL);
  };

  // Determine circular meter urgency class
  let tensionClass = 'tension-normal';
  if (pullProgress) {
    if (pullProgress.power >= 75) tensionClass = 'tension-high';
    else if (pullProgress.power <= 25) tensionClass = 'tension-danger';
  }

  return (
    <div className="ui-overlay hud-overlay">
      {/* Top Header Stats */}
      <header className="hud-top">
        <div className="stat-badge">
          <span className="stat-label">🐕 CHÓ</span>
          <span className="stat-val stat-gold">{stats.dogCount}</span>
        </div>
        <div className="stat-badge">
          <span className="stat-label">💵 TIỀN</span>
          <span className="stat-val stat-green">${stats.money}</span>
        </div>
        <div className="stat-badge">
          <span className="stat-label">🛣️ ĐƯỜNG</span>
          <span className="stat-val">{stats.distance}m</span>
        </div>
      </header>

      {/* Pull Mini-game Circular Gauge */}
      {isPulling && pullProgress && (
        <div className="pull-container">
          <div className={`pull-card ${tensionClass}`}>
            <div className="pull-header">
              <span className="pull-title">
                {pullProgress.power >= 80 ? '🔥 SẮP BẮT ĐƯỢC! KÉO TIẾP!' : '⚡ KÉO GIẰNG CO!'}
              </span>
              <span className="pull-timer">⏳ {pullProgress.timeLeft.toFixed(1)}s</span>
            </div>

            <div className="circular-progress">
              <svg viewBox="0 0 120 120" className="circular-svg">
                <circle cx="60" cy="60" r="50" className="circle-bg" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className={`circle-fill ${tensionClass}`}
                  style={{
                    strokeDasharray: 314,
                    strokeDashoffset: 314 - (314 * Math.min(100, pullProgress.power)) / 100,
                  }}
                />
              </svg>
              <div className="circular-content">
                <span className="pull-number">{pullProgress.power}%</span>
                <span className="pull-sublabel">LỰC KÉO</span>
              </div>
            </div>

            {pullProgress.rating && (
              <div className={`rating-badge rating-${pullProgress.rating.toLowerCase()}`}>
                {pullProgress.rating === 'PERFECT' && '🔥 PERFECT!'}
                {pullProgress.rating === 'GOOD' && '👍 GOOD!'}
                {pullProgress.rating === 'MISS' && '⚠️ TRẬT NHỊP!'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <footer className="hud-bottom">
        <div className="control-group steer-group">
          <button
            type="button"
            className="btn-control btn-steer"
            onPointerDown={handleSteerLeftStart}
            onPointerUp={handleSteerLeftEnd}
            onPointerLeave={handleSteerLeftEnd}
            onPointerCancel={handleSteerLeftEnd}
            aria-label="Trái"
          >
            ◄ TRÁI
          </button>
          <button
            type="button"
            className="btn-control btn-steer"
            onPointerDown={handleSteerRightStart}
            onPointerUp={handleSteerRightEnd}
            onPointerLeave={handleSteerRightEnd}
            onPointerCancel={handleSteerRightEnd}
            aria-label="Phải"
          >
            PHẢI ►
          </button>
        </div>

        <div className="control-group action-group">
          {!isPulling ? (
            <button
              type="button"
              className={`btn-control btn-action btn-hook btn-hook-${hookVisualState.toLowerCase()} ${
                isHookReady ? 'hook-ready-pulse' : ''
              }`}
              onClick={handleHookClick}
            >
              {isHookReady ? (
                <>⚡ MÓC NGAY ({hookSide === 'left' ? 'TRÁI' : 'PHẢI'})! 🎯</>
              ) : hookVisualState === 'MISS' ? (
                <>❌ MÓC HỤT!</>
              ) : (
                <>🎯 MÓC (SPACE)</>
              )}
            </button>
          ) : (
            <button
              type="button"
              className={`btn-control btn-action btn-pull ${pullTapAnim ? 'btn-pull-tapped' : ''}`}
              onClick={handlePullClick}
            >
              🔥 KÉO LIÊN TỤC! (SPAM)
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
