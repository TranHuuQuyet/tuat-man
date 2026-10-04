import { EventBus, GAME_EVENTS } from '../game/EventBus';
import type { GameState, PullProgressData, RunStats } from '../game/EventBus';

interface GameHudOverlayProps {
  stats: RunStats;
  gameState: GameState;
  pullProgress: PullProgressData | null;
}

export const GameHudOverlay: React.FC<GameHudOverlayProps> = ({
  stats,
  gameState,
  pullProgress,
}) => {
  const isPulling = gameState === 'PULLING';

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
    EventBus.emit(GAME_EVENTS.INPUT_HOOK);
  };

  const handlePullClick = () => {
    EventBus.emit(GAME_EVENTS.INPUT_PULL);
  };

  return (
    <div className="ui-overlay hud-overlay">
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
          <span className="stat-label">🛣️ QUÃNG ĐƯỜNG</span>
          <span className="stat-val">{stats.distance}m</span>
        </div>
      </header>

      {isPulling && pullProgress && (
        <div className="pull-container">
          <div className="pull-card">
            <div className="pull-header">
              <span className="pull-title">⚡ KÉO THẬT NHANH!</span>
              <span className="pull-timer">⏳ {pullProgress.timeLeft.toFixed(1)}s</span>
            </div>

            <div className="circular-progress">
              <svg viewBox="0 0 120 120" className="circular-svg">
                <circle cx="60" cy="60" r="50" className="circle-bg" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="circle-fill"
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
                {pullProgress.rating}
              </div>
            )}
          </div>
        </div>
      )}

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
              className="btn-control btn-action btn-hook"
              onClick={handleHookClick}
            >
              🎯 MÓC (SPACE)
            </button>
          ) : (
            <button
              type="button"
              className="btn-control btn-action btn-pull"
              onClick={handlePullClick}
            >
              🔥 KÉO LIÊN TỤC!
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
