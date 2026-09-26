// Điều khiển chung: hành động ↔ phím (đổi được, lưu trong cài đặt), nút cảm ứng và tay cầm gọi cùng hành động.
import { settings, saveSettings } from '../ui/settings';

export type Action = 'use' | 'eat' | 'inventory' | 'craft' | 'friends' | 'map' | 'calendar' | 'relations' | 'wiki' | 'minimap' | 'help' | 'lobby' | 'settings';

export const ACTION_NAME: Record<Action, string> = {
  use: 'Dùng món đang cầm', eat: 'Ăn', inventory: 'Túi đồ', craft: 'Chế tạo', friends: 'Bạn bè', map: 'Bản đồ thế giới', calendar: 'Lịch',
  relations: 'Dân làng', wiki: 'Bách khoa', minimap: 'Bản đồ nhỏ', help: 'Bảng phím', lobby: 'Sảnh', settings: 'Cài đặt',
};

/** Phím mặc định (theo mã phím vật lý, không phụ thuộc bộ gõ). Tab và Esc cố định. */
export const DEFAULT_KEYS: Record<Action, string> = {
  use: 'Space', eat: 'KeyF', inventory: 'KeyI', craft: 'KeyK', friends: 'KeyB', map: 'KeyM', calendar: 'KeyC',
  relations: 'KeyR', wiki: 'KeyJ', minimap: 'KeyN', help: 'KeyH', lobby: 'Tab', settings: 'Escape',
};
export const FIXED: Action[] = ['lobby', 'settings'];
export const REMAPPABLE = (Object.keys(DEFAULT_KEYS) as Action[]).filter((a) => !FIXED.includes(a));

export const keyOf = (a: Action) => (FIXED.includes(a) ? DEFAULT_KEYS[a] : settings.keys?.[a] ?? DEFAULT_KEYS[a]);

/** Tên phím cho người đọc: KeyF → F, Digit1 → 1, Space → Space. */
export const keyLabel = (code: string) => code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, 'Mũi tên ').replace(/^Escape$/, 'Esc');

/** Phím vừa bấm ứng với hành động nào (E luôn là Dùng, như trước). */
export function actionOf(e: KeyboardEvent): Action | null {
  if (e.code === 'KeyE' && !Object.values(settings.keys ?? {}).includes('KeyE')) return 'use';
  return (Object.keys(DEFAULT_KEYS) as Action[]).find((a) => keyOf(a) === e.code || (e.code === '' && e.key.toLowerCase() === keyLabel(keyOf(a)).toLowerCase())) ?? null;
}

/** Gán phím `code` cho `a`; nếu phím đó đang của hành động khác thì đổi chỗ cho nhau. */
export function bindKey(a: Action, code: string) {
  if (FIXED.includes(a) || ['Tab', 'Escape'].includes(code) || /^Digit[1-9]$/.test(code)) return false;
  const keys = { ...(settings.keys ?? {}) };
  const other = REMAPPABLE.find((x) => x !== a && keyOf(x) === code);
  if (other) keys[other] = keyOf(a);
  keys[a] = code;
  settings.keys = keys;
  saveSettings();
  return true;
}

export function resetKeys() {
  settings.keys = {};
  saveSettings();
}

/** Gửi một hành động tới cảnh đang chơi (nút cảm ứng, tay cầm). */
export const sendAction = (a: Action) => window.dispatchEvent(new CustomEvent('game:action', { detail: a }));

// ---------------------------------------------------------------- tay cầm (chuẩn Xbox / PlayStation)

/** Hướng đi từ cần trái / D-pad của tay cầm (-1…1). */
export const padInput = { vx: 0, vy: 0 };
const PAD_BUTTONS: Record<number, Action | 'prev' | 'next'> = { 0: 'use', 1: 'eat', 2: 'craft', 3: 'inventory', 4: 'prev', 5: 'next', 8: 'map', 9: 'settings' };
let prev: boolean[] = [];

/** Đọc tay cầm mỗi khung hình; trả về các nút vừa bấm xuống. */
export function pollPad(): (Action | 'prev' | 'next' | 'back')[] {
  const gp = navigator.getGamepads?.().find((g) => g && g.connected);
  if (!gp) { padInput.vx = padInput.vy = 0; prev = []; return []; }
  const dead = (v: number) => (Math.abs(v) < 0.22 ? 0 : v);
  const b = (i: number) => !!gp.buttons[i]?.pressed;
  padInput.vx = dead(gp.axes[0] ?? 0) + (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
  padInput.vy = dead(gp.axes[1] ?? 0) + (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
  const out: (Action | 'prev' | 'next' | 'back')[] = [];
  gp.buttons.forEach((btn, i) => {
    if (btn.pressed && !prev[i]) { if (PAD_BUTTONS[i]) out.push(PAD_BUTTONS[i]); if (i === 1) out.push('back'); }
  });
  prev = gp.buttons.map((x) => x.pressed);
  return out;
}
