export const STORAGE_KEY_PLAYER_NAME = 'tuat_man_player_name';

export function getSavedPlayerName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_PLAYER_NAME) || '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYER_NAME, name);
  } catch {
    // Ignore storage quota or disabled errors
  }
}
