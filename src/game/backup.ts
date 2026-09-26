// Sao lưu ra file: cả 3 ô lưu, hồ sơ, mã bạn bè của từng ô và cài đặt — gói trong một file JSON.
import { migrate, saveKey, SLOTS } from './save';
import { identityKey } from '../net/friends';

const PROFILE_KEY = 'nongtrai.profile';
const SETTINGS_KEY = 'nongtrai.settings';
export const BACKUP_KIND = 'nha-thang-phong-backup';

export interface Backup {
  kind: typeof BACKUP_KIND;
  version: 1;
  exported: string;
  profile: string | null;
  settings: string | null;
  slots: (string | null)[];
  friends: (string | null)[];
}

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export function makeBackup(now = new Date()): Backup {
  const n = Array.from({ length: SLOTS }, (_, i) => i);
  return {
    kind: BACKUP_KIND, version: 1, exported: now.toISOString(),
    profile: get(PROFILE_KEY), settings: get(SETTINGS_KEY),
    slots: n.map((i) => get(saveKey(i))), friends: n.map((i) => get(identityKey(i))),
  };
}

/** Kiểm tra file sao lưu; trả về lỗi dễ hiểu, hoặc tóm tắt từng ô để người chơi xác nhận trước khi ghi đè. */
export function readBackup(text: string): { ok: true; backup: Backup; summary: string[] } | { ok: false; reason: string } {
  let b: Backup;
  try { b = JSON.parse(text); } catch { return { ok: false, reason: 'File không đọc được (không phải JSON)' }; }
  if (b?.kind !== BACKUP_KIND || !Array.isArray(b.slots)) return { ok: false, reason: 'Đây không phải file sao lưu Nhà Thằng Phong' };
  const summary: string[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const raw = b.slots[i];
    if (!raw) { summary.push(`Ô ${i + 1}: trống`); continue; }
    const s = (() => { try { return migrate(JSON.parse(raw)); } catch { return null; } })();
    if (!s) return { ok: false, reason: `Ô ${i + 1} trong file bị hỏng hoặc của bản game mới hơn` };
    summary.push(`Ô ${i + 1}: ${s.farmName}, ngày ${s.day}`);
  }
  return { ok: true, backup: b, summary };
}

/** Ghi đè mọi thứ trên máy bằng nội dung file (sau khi người chơi đã xác nhận). */
export function applyBackup(b: Backup) {
  const set = (k: string, v: string | null) => { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); };
  set(PROFILE_KEY, b.profile);
  if (b.settings) set(SETTINGS_KEY, b.settings);
  for (let i = 0; i < SLOTS; i++) {
    set(saveKey(i), b.slots[i] ?? null);
    set(identityKey(i), b.friends?.[i] ?? null);
  }
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(makeBackup())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nha-thang-phong-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
