import type { RunStats } from '../game/EventBus';

interface ResultOverlayProps {
  stats: RunStats;
  onRestart: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({ stats, onRestart }) => {
  return (
    <div className="ui-overlay result-overlay">
      <div className="result-card">
        <h2 className="result-title">💥 BỊ TAI NẠN!</h2>
        <p className="result-subtitle">KÈO ĐÊM NAY ĐÃ KẾT THÚC</p>

        <div className="result-stats-grid">
          <div className="result-stat-row">
            <span className="result-label">Tên:</span>
            <span className="result-value">{stats.playerName}</span>
          </div>
          <div className="result-stat-row">
            <span className="result-label">🐕 Chó bắt được:</span>
            <span className="result-value result-highlight">{stats.dogCount}</span>
          </div>
          <div className="result-stat-row">
            <span className="result-label">💵 Tiền kiếm được:</span>
            <span className="result-value result-green">${stats.money}</span>
          </div>
          <div className="result-stat-row">
            <span className="result-label">⭐ Điểm số:</span>
            <span className="result-value">{stats.score}</span>
          </div>
          <div className="result-stat-row">
            <span className="result-label">🛣️ Quãng đường:</span>
            <span className="result-value">{stats.distance}m</span>
          </div>
        </div>

        <button type="button" className="btn-primary btn-restart" onClick={onRestart}>
          🔄 CHƠI LẠI
        </button>
      </div>
    </div>
  );
};
