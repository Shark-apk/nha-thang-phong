// Cài đặt người chơi (lưu riêng từng máy): âm lượng, cỡ chữ giao diện, bật/tắt hướng dẫn.
const KEY = 'nongtrai.settings';

export interface Settings {
  music: number;
  sfx: number;
  /** Tỉ lệ phóng giao diện 0.8–1.4. */
  uiScale: number;
  /** Tự lưu nông trại lên mây (server bạn bè) để chơi tiếp ở máy khác. */
  cloud: boolean;
  /** Phím người chơi tự đổi (hành động → mã phím). */
  keys: Record<string, string>;
  /** Tắt rung màn hình, chớp sáng. */
  reduceMotion: boolean;
  /** Một ngày trong game dài bao nhiêu phút thật. */
  dayMinutes: number;
}

const DEFAULTS: Settings = { music: 0.75, sfx: 0.8, uiScale: 1, cloud: true, keys: {}, reduceMotion: false, dayMinutes: 11 };

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

/** Màn nhỏ (điện thoại) tự thu giao diện: giao diện vẽ cho màn ~1200×760.
 *  Màn dọc (điện thoại cầm đứng) chỉ cần vừa bề ngang ~780 (thanh đồ 10 ô) nên không bị thu quá nhỏ. */
export function fitScale() {
  const w = window.innerWidth, h = window.innerHeight;
  if (h > w) return Math.max(0.45, Math.min(1, w / 780, h / 1000));
  return Math.max(0.5, Math.min(1, w / 1200, h / 760));
}

export function applyUiScale() {
  if (typeof document === 'undefined') return;
  const fit = fitScale();
  document.documentElement.style.setProperty('--fit', String(fit));
  document.documentElement.style.setProperty('--ui-scale', String(settings.uiScale * fit));
}

let watching = false;
/** Theo dõi xoay màn / đổi cỡ cửa sổ để thu phóng lại giao diện. */
export function watchUiScale() {
  if (watching) return;
  watching = true;
  window.addEventListener('resize', applyUiScale);
  // Xoay máy: iPhone hay báo cỡ cũ lúc vừa xoay, nên đo lại thêm một nhịp sau và báo Phaser đổi cỡ theo
  window.addEventListener('orientationchange', () => {
    applyUiScale();
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  });
  window.visualViewport?.addEventListener('resize', applyUiScale);
  applyUiScale();
}
