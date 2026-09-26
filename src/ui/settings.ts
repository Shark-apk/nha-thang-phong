// Cài đặt người chơi (lưu riêng từng máy): âm lượng, cỡ chữ giao diện, bật/tắt hướng dẫn.
const KEY = 'nongtrai.settings';

export interface Settings {
  music: number;
  sfx: number;
  /** Tỉ lệ phóng giao diện 0.8–1.4. */
  uiScale: number;
}

const DEFAULTS: Settings = { music: 0.6, sfx: 0.8, uiScale: 1 };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings: Settings = load();

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* bỏ qua */
  }
  applyUiScale();
}

export function applyUiScale() {
  document.documentElement.style.setProperty('--ui-scale', String(settings.uiScale));
}
