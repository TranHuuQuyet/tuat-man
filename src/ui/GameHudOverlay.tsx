import { useEffect, useRef, useState } from 'react';
import { SFX } from '../game/audio/SoundEffects';
import { EventBus, GAME_EVENTS } from '../game/EventBus';
import type { GameState, HookReadyData, PullProgressData, RewardPopupData, RunStats } from '../game/EventBus';

interface GameHudOverlayProps {
  stats: RunStats;
  gameState: GameState;
  pullProgress: PullProgressData | null;
}

type HookButtonVisualState = 'NORMAL' | 'APPROACHING' | 'READY' | 'PRESSED' | 'MISS' | 'SUCCESS';

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
  const [isMuted, setIsMuted] = useState<boolean>(() => SFX.getMuted());
  const [rewardPopup, setRewardPopup] = useState<RewardPopupData | null>(null);
  const [prevDogCount, setPrevDogCount] = useState(stats.dogCount);
  const [dogPopAnim, setDogPopAnim] = useState(false);

  // Animate dog badge when count increases
  useEffect(() => {
    if (stats.dogCount > prevDogCount) {
      setDogPopAnim(true);
      const timer = setTimeout(() => setDogPopAnim(false), 600);
      setPrevDogCount(stats.dogCount);
      return () => clearTimeout(timer);
    }
  }, [stats.dogCount, prevDogCount]);

  const isHookReadyRef = useRef(false);

  useEffect(() => {
    const unsubReady = EventBus.on(GAME_EVENTS.HOOK_READY_UPDATE, (data: HookReadyData) => {
      isHookReadyRef.current = data.ready;
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
          setHookVisualState(isHookReadyRef.current ? 'READY' : 'NORMAL');
        }, 500);
      }
    });

    const unsubReward = EventBus.on(GAME_EVENTS.REWARD_POPUP, (popup: RewardPopupData) => {
      setRewardPopup(popup);
      setTimeout(() => {
        setRewardPopup(null);
      }, 1800);
    });

    return () => {
      unsubReady();
      unsubFeedback();
      unsubReward();
    };
  }, []);

  const handleToggleSound = () => {
    const newMuted = SFX.toggleMute();
    setIsMuted(newMuted);
    EventBus.emit(GAME_EVENTS.AUDIO_MUTE_TOGGLE, newMuted);
  };

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
    setTimeout(() => setPullTapAnim(false), 90);
    EventBus.emit(GAME_EVENTS.INPUT_PULL);
  };

  // Determine circular meter tension class
  let tensionClass = 'tension-normal';
  if (pullProgress) {
    if (pullProgress.power >= 75) tensionClass = 'tension-high';
    else if (pullProgress.power <= 25) tensionClass = 'tension-danger';
  }

  return (
    <div className="ui-overlay hud-overlay">
      {/* Top Header — Clear Hierarchy: #1 DOGS, #2 MONEY, #3 DISTANCE */}
      <header className="hud-top">
        <div className="hud-badges-row">
          {/* #1 Primary Progression: Dog Count */}
          <div className={`hud-badge badge-primary-dog ${dogPopAnim ? 'badge-pop' : ''}`}>
            <div className="badge-icon-box">🐕</div>
            <div className="badge-info">
              <span className="badge-title">ĐÃ BẮT</span>
              <span className="badge-count-val">{stats.dogCount}</span>
            </div>
          </div>

          {/* #2 Reward: Money Earned */}
          <div className="hud-badge badge-money">
            <span className="badge-money-symbol">💵</span>
            <span className="badge-money-val">${stats.money}</span>
          </div>

          {/* #3 Secondary: Odometer Distance */}
          <div className="hud-badge badge-odometer">
            <span className="odometer-icon">🛣️</span>
            <span className="odometer-val">{stats.distance}m</span>
          </div>

          {/* Sound Mute/Unmute Quick Toggle */}
          <button
            type="button"
            className="btn-sound-toggle"
            onClick={handleToggleSound}
            aria-label="Toggle Sound"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* Center Screen Floating Reward Popup (First WOW Moment) */}
      {rewardPopup && (
        <div className={`reward-popup-center reward-${rewardPopup.type || 'dog'}`}>
          <div className="reward-popup-card">
            <span className="reward-popup-text">{rewardPopup.text}</span>
            {rewardPopup.subtext && (
              <span className="reward-popup-subtext">{rewardPopup.subtext}</span>
            )}
          </div>
        </div>
      )}

      {/* Pull Mini-game Pressure Gauge */}
      {isPulling && pullProgress && (
        <div className="pull-container">
          <div className={`pull-card ${tensionClass}`}>
            <div className="pull-header">
              <span className="pull-title">
                {pullProgress.power >= 80 ? '🔥 SẮP BẮT ĐƯỢC! KÉO MAU!' : '⚡ KÉO GIẰNG CO!'}
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
                {pullProgress.rating === 'PERFECT' && '🔥 PERFECT! +LỰC'}
                {pullProgress.rating === 'GOOD' && '👍 GOOD!'}
                {pullProgress.rating === 'MISS' && '⚠️ TRẬT NHỊP!'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls — Mobile Friendly, Safe Area Aware */}
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
            ◀ TRÁI
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
            PHẢI ▶
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
              🔥 KÉO MẠNH! (SPAM)
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
