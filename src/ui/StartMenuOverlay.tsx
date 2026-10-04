import { useState } from 'react';
import type { FormEvent } from 'react';
import { savePlayerName } from '../services/storage';

interface StartMenuOverlayProps {
  initialName: string;
  onStart: (name: string) => void;
}

export const StartMenuOverlay: React.FC<StartMenuOverlayProps> = ({ initialName, onStart }) => {
  const [name, setName] = useState(initialName || 'Tuất Thủ Số 1');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Tuất Thủ';
    savePlayerName(finalName);
    onStart(finalName);
  };

  return (
    <div className="ui-overlay menu-overlay">
      <div className="menu-card">
        <h1 className="menu-title">TUẤT MAN</h1>
        <p className="menu-subtitle">ĐÊM NAY CÓ KÈO</p>

        <form onSubmit={handleSubmit} className="menu-form">
          <label className="input-label" htmlFor="player-name">
            TÊN CỦA BẠN:
          </label>
          <input
            id="player-name"
            type="text"
            className="name-input"
            value={name}
            maxLength={18}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên nhân vật..."
            autoFocus
          />

          <button type="submit" className="btn-primary btn-start">
            CHƠI NGAY 🚀
          </button>
        </form>

        <div className="menu-instructions">
          <p>🎮 <strong>PC:</strong> A / D hoặc ◄ / ► để lái xe, <strong>SPACE</strong> để Móc & Kéo</p>
          <p>📱 <strong>Mobile:</strong> Nút bấm cảm ứng dưới màn hình</p>
        </div>
      </div>
    </div>
  );
};
