// Lưu lên mây qua server bạn bè: mỗi ô lưu gắn với một danh tính (mã bạn bè). Mã khôi phục lấy lại danh tính ở máy khác.
import type { FarmState } from '../game/farm';
import { currentSlot, forSave, migrate, saveGame, useSlot } from '../game/save';
import { saveProfile, loadProfile, type Profile } from '../game/profile';
import { session } from '../game/session';
import { settings } from '../ui/settings';
import { call, defaultUrl, loadIdentity, register, saveIdentity, type Identity } from './friends';

export interface CloudSave { data: string; profile: string | null; updated: number; prev: number[] }

const me = (n = currentSlot()) => loadIdentity(n);

/** Chưa có danh tính mà đang bật lưu mây → tự đăng ký bằng tên nông trại (không cần vào phím B). */
export async function ensureIdentity(s: FarmState): Promise<Identity | null> {
  const id = me();
  if (id || !settings.cloud) return id;
  try {
    return await register(defaultUrl(), s.farmName || 'Nông trại');
  } catch {
    return null; // không có mạng: lần sau thử lại
  }
}

export async function fetchCloud(n = currentSlot()): Promise<CloudSave | null> {
  const id = me(n);
  if (!id) return null;
  return call<CloudSave | null>(id.url, '/api/save', { token: id.token });
}

/** Đẩy bản lưu lên mây. Trả 'conflict' khi máy khác đã lưu bản mới hơn (không ghi đè, chờ người chơi chọn). */
export async function pushCloud(s: FarmState, force = false): Promise<'ok' | 'conflict' | 'off' | 'error'> {
  const id = me();
  if (!id || !settings.cloud) return 'off';
  try {
    const r = await call<{ updated: number }>(id.url, '/api/save', {
      token: id.token,
      body: { data: JSON.stringify(forSave(s)), profile: JSON.stringify(session.profile), base: s.cloudAt ?? 0, force },
    });
    s.cloudAt = r.updated;
    saveGame(s);
    return 'ok';
  } catch (e) {
    return (e as { status?: number }).status === 409 ? 'conflict' : 'error';
  }
}

/** Hồ sơ trên mây chỉ thay hồ sơ trên máy khi đi xa hơn (nhiều kinh nghiệm hơn). */
function adoptProfile(raw: string | null) {
  if (!raw) return;
  try {
    const cloud = JSON.parse(raw) as Profile;
    if ((cloud.xp ?? 0) < (session.profile.xp ?? 0)) return;
    localStorage.setItem('nongtrai.profile', raw);
    session.profile = loadProfile();
    saveProfile(session.profile);
  } catch { /* hồ sơ hỏng thì giữ hồ sơ trên máy */ }
}

/** Dùng bản trên mây thay bản trên máy (đã hỏi người chơi nếu cần). */
export function adoptCloud(c: CloudSave): FarmState | null {
  const s = (() => { try { return migrate(JSON.parse(c.data)); } catch { return null; } })();
  if (!s) return null;
  s.cloudAt = c.updated;
  saveGame(s);
  adoptProfile(c.profile);
  return s;
}

/**
 * Lúc mở một ô lưu: so với bản trên mây.
 * - không có bản mây / mây không mới hơn → dùng bản máy
 * - mây mới hơn, máy không có gì chưa đẩy lên → tự lấy bản mây
 * - cả hai đều có tiến độ mới → hỏi người chơi (`ask`)
 */
export async function reconcile(local: FarmState, ask: (cloud: CloudSave) => Promise<'cloud' | 'local'>): Promise<FarmState> {
  if (!settings.cloud) return local;
  let c: CloudSave | null = null;
  try { c = await fetchCloud(); } catch { return local; }
  if (!c || c.updated <= (local.cloudAt ?? 0)) return local;
  const localDirty = (local.savedAt ?? 0) > (local.cloudAt ?? 0) + 1000;
  const choice = localDirty ? await ask(c) : 'cloud';
  if (choice === 'cloud') {
    if (localDirty) {
      // Cất bản trên máy vào danh sách bản cũ trên mây: đẩy nó lên rồi lấy lại bản mây làm bản hiện tại
      try {
        await pushCloud(local, true);
        const id = me()!;
        await call(id.url, '/api/save/restore', { token: id.token, body: { updated: c.updated } });
        c = (await fetchCloud()) ?? c;
      } catch { /* không cất được thì vẫn dùng bản mây */ }
    }
    return adoptCloud(c) ?? local;
  }
  // Giữ bản máy: ghi đè lên mây
  local.cloudAt = c.updated;
  await pushCloud(local, true);
  return local;
}

export const newRecoveryCode = (n = currentSlot()) => {
  const id = me(n);
  if (!id) throw new Error('Ô này chưa có tài khoản — chơi một lúc (có mạng) để tự tạo');
  return call<{ recovery: string }>(id.url, '/api/recovery', { token: id.token, body: {} });
};

/** Nhập mã khôi phục vào ô `n`: lấy lại danh tính rồi tải bản trên mây về ô đó. */
export async function recoverInto(n: number, code: string, url = defaultUrl()): Promise<{ name: string; farm: FarmState | null }> {
  const id = await call<{ code: string; token: string; name: string }>(url, '/api/recover', { body: { code } });
  saveIdentity({ url, ...id }, n);
  const c = await fetchCloud(n);
  if (!c) return { name: id.name, farm: null };
  const prevSlot = currentSlot();
  useSlot(n);
  const farm = adoptCloud(c);
  useSlot(prevSlot);
  return { name: id.name, farm };
}
