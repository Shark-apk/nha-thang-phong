// Kết nối server bạn bè (server/index.mjs): đăng ký mã, tải ảnh chụp nông trại, ghé thăm, tưới giúp, gửi quà, nhận thư.
import { ITEMS, QUALITY_MULT, type ItemId } from '../data';
import type { FarmState } from '../game/farm';

import { currentSlot } from '../game/save';
import { addItem } from '../game/farm';
import { beautyOf } from '../game/farming2';
import { levelOf, sendMail, type Profile } from '../game/profile';
import { session } from '../game/session';

/** Mỗi ô lưu một mã bạn bè riêng. */
export const identityKey = (n = currentSlot()) => (n === 0 ? 'nongtrai.friend' : `nongtrai.friend.s${n}`);

export interface Identity { url: string; code: string; token: string; name: string }
export interface Friend { code: string; name: string; updated: number; helpedToday: boolean }
export interface InboxMsg { kind: 'water' | 'gift' | 'like' | 'sale' | 'return'; from: string; data: unknown; created: number }
/** Số liệu cho bảng xếp hạng bạn bè. */
export interface Score { level: number; beauty: number; deepest: number; fishKinds: number; earned: number }
export interface Rank extends Score { code: string; name: string; me: boolean; likes: number }
export interface Entry { code: string; name: string; item: ItemId; q: number; score: number; me: boolean }
export interface Listing { id: number; item: ItemId; q: number; qty: number; price: number; created: number; seller: string; mine: boolean }
/** Phần trạng thái gửi lên cho bạn bè xem (không có túi đồ, tiền, quan hệ). */
export type Snapshot = Pick<FarmState, 'day' | 'tilled' | 'crops' | 'trees' | 'objects' | 'buildings' | 'beehives' | 'cleared' | 'animals' | 'greenhouseDay'> & { name: string; score?: Score };

/** Máy chủ mặc định: bản web (Vercel) dùng API cùng địa chỉ; chạy trên máy thì dùng `npm run server` cổng 8787. */
export const defaultUrl = () => {
  const env = import.meta.env.VITE_FRIENDS_URL as string | undefined;
  if (env) return env;
  const local = !location.hostname || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /^192\.168\.|^10\./.test(location.hostname);
  return local ? `http://${location.hostname || 'localhost'}:8787` : location.origin;
};

export function loadIdentity(n = currentSlot()): Identity | null {
  try {
    const raw = localStorage.getItem(identityKey(n));
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}
export function saveIdentity(id: Identity | null, n = currentSlot()) {
  try {
    if (id) localStorage.setItem(identityKey(n), JSON.stringify(id));
    else localStorage.removeItem(identityKey(n));
  } catch {
    /* bỏ qua */
  }
}

export async function call<T>(url: string, path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url.replace(/\/+$/, '') + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`), { status: res.status });
    return data as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError' || e instanceof TypeError) throw new Error('Không kết nối được máy chủ bạn bè');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const me = () => {
  const id = loadIdentity();
  if (!id) throw new Error('Chưa đăng ký bạn bè');
  return id;
};

export async function register(url: string, name: string) {
  const r = await call<{ code: string; token: string; name: string }>(url, '/api/register', { body: { name } });
  const id = { url, ...r };
  saveIdentity(id);
  return id;
}

export function snapshotOf(s: FarmState, name: string): Snapshot {
  const { day, tilled, crops, trees, objects, buildings, beehives, cleared, animals, greenhouseDay } = s;
  return { name, day, tilled, crops, trees, objects, buildings, beehives, cleared, animals, greenhouseDay, score: scoreOf(s) };
}

export function scoreOf(s: FarmState): Score {
  return {
    level: levelOf(session.profile?.xp ?? 0).level, beauty: beautyOf(s), deepest: s.mineDeepest ?? 1,
    fishKinds: Object.keys(s.fishCaught ?? {}).length, earned: s.stats?.counts.sell ?? 0,
  };
}

export const uploadSnapshot = (s: FarmState) => {
  const id = me();
  return call(id.url, '/api/snapshot', { token: id.token, body: { snapshot: snapshotOf(s, id.name) } });
};
export const listFriends = () => { const id = me(); return call<Friend[]>(id.url, '/api/friends', { token: id.token }); };
export const addFriend = (code: string) => { const id = me(); return call<{ code: string; name: string }>(id.url, '/api/friends', { token: id.token, body: { code } }); };
export const getFarm = (code: string) => { const id = me(); return call<{ code: string; name: string; updated: number; snapshot: Snapshot | null }>(id.url, `/api/farm/${code}`, { token: id.token }); };
export const waterFarm = (code: string, tiles: string[]) => { const id = me(); return call<{ count: number }>(id.url, `/api/farm/${code}/water`, { token: id.token, body: { tiles } }); };
export const sendGift = (code: string, item: ItemId, qty: number) => { const id = me(); return call(id.url, `/api/farm/${code}/gift`, { token: id.token, body: { item, qty } }); };
export const likeFarm = (code: string) => { const id = me(); return call<{ likes: number }>(id.url, `/api/farm/${code}/like`, { token: id.token, body: {} }); };
export const leaderboard = () => { const id = me(); return call<Rank[]>(id.url, '/api/leaderboard', { token: id.token }); };
export const contestBoard = (c: string) => { const id = me(); return call<Entry[]>(id.url, `/api/contest/${c}`, { token: id.token }); };
export const enterContest = (c: string, item: ItemId, q: number, score: number) => { const id = me(); return call<{ best: number; improved: boolean }>(id.url, `/api/contest/${c}`, { token: id.token, body: { item, q, score } }); };
export const marketList = () => { const id = me(); return call<Listing[]>(id.url, '/api/market', { token: id.token }); };
export const marketPost = (item: ItemId, q: number, qty: number, price: number) => { const id = me(); return call<{ id: number }>(id.url, '/api/market', { token: id.token, body: { item, q, qty, price } }); };
export const marketBuy = (lid: number) => { const id = me(); return call<{ item: ItemId; q: number; qty: number; price: number }>(id.url, `/api/market/${lid}/buy`, { token: id.token, body: {} }); };
export const marketCancel = (lid: number) => { const id = me(); return call<{ item: ItemId; q: number; qty: number }>(id.url, `/api/market/${lid}/cancel`, { token: id.token, body: {} }); };
export const removeFriend = (code: string) => { const id = me(); return call(id.url, `/api/friends/${code}/remove`, { token: id.token, body: {} }); };
export const blockFriend = (code: string) => { const id = me(); return call(id.url, `/api/friends/${code}/block`, { token: id.token, body: {} }); };
export const unblockFriend = (code: string) => { const id = me(); return call(id.url, `/api/friends/${code}/unblock`, { token: id.token, body: {} }); };
export const listBlocks = () => { const id = me(); return call<{ code: string; name: string }[]>(id.url, '/api/blocks', { token: id.token }); };
export const fetchInbox = () => { const id = me(); return call<InboxMsg[]>(id.url, '/api/inbox', { token: id.token, body: {} }); };

/**
 * Áp thư bạn bè vào nông trại: tưới giúp → ô còn khô được tưới; quà → hòm thư.
 * Trả về câu báo kiểu "Minh đã tưới 12 cây và gửi 3 quả dâu".
 */
export function applyInbox(s: FarmState, msgs: InboxMsg[]): string[] {
  const by = new Map<string, { watered: number; gifts: string[]; liked: boolean; sold: string[] }>();
  const get = (n: string) => by.get(n) ?? (by.set(n, { watered: 0, gifts: [], liked: false, sold: [] }), by.get(n)!);
  for (const m of msgs) {
    const e = get(m.from);
    if (m.kind === 'water' && Array.isArray(m.data)) {
      for (const k of m.data as string[]) {
        const t = s.tilled[k];
        if (t && !t.watered) { t.watered = true; e.watered++; }
      }
    } else if (m.kind === 'gift') {
      const { item, qty } = m.data as { item: string; qty: number };
      if (!ITEMS[item] || !(qty > 0)) continue;
      s.mailbox.push({ item, qty, from: m.from });
      e.gifts.push(`${qty} ${ITEMS[item].name.toLowerCase()}`);
    } else if (m.kind === 'like') e.liked = true;
    else if (m.kind === 'return') {
      const { item, qty } = m.data as { item: string; qty: number };
      if (!ITEMS[item] || !(qty > 0)) continue;
      s.mailbox.push({ item, qty, from: 'Chợ bạn bè (hết hạn rao)' });
      e.gifts.push(`${qty} ${ITEMS[item].name.toLowerCase()} hết hạn rao, trả về`);
    }
    else if (m.kind === 'sale') {
      const { item, qty, price } = m.data as { item: string; qty: number; price: number };
      if (!(price > 0)) continue;
      s.money += price;
      e.sold.push(`${qty} ${ITEMS[item]?.name.toLowerCase() ?? item} (+${price.toLocaleString('vi-VN')} xu)`);
    }
  }
  return [...by].map(([name, e]) => {
    const parts = [e.watered ? `tưới giúp ${e.watered} ô` : '', e.gifts.length ? `gửi ${e.gifts.join(', ')} (xem hòm thư)` : '', e.liked ? 'thả tim nông trại bạn' : '', e.sold.length ? `mua ở chợ ${e.sold.join(', ')}` : ''].filter(Boolean);
    return parts.length ? `${name} đã ${parts.join(' và ')}` : `${name} đã ghé thăm`;
  });
}

/** Trạng thái dùng khi ghé thăm: đất cát của bạn + túi đồ, sức, giờ của mình. */
export function visitState(home: FarmState, snap: Snapshot): FarmState {
  return {
    ...home,
    tilled: snap.tilled ?? {}, crops: snap.crops ?? {}, trees: snap.trees ?? {}, objects: snap.objects ?? {}, buildings: snap.buildings ?? {},
    beehives: snap.beehives ?? {}, cleared: snap.cleared ?? {}, animals: snap.animals ?? [], greenhouseDay: snap.greenhouseDay ?? null,
    location: 'farm',
  };
}

/** Nhận hàng mua ở chợ / hàng gỡ về: vào túi, đầy thì vào hòm thư. */
export function receive(s: FarmState, item: ItemId, qty: number, q: number, from: string) {
  if (!addItem(s, item, qty, q)) s.mailbox.push({ item, qty, from });
}

/** Điểm dự thi: giá bán gốc × chất lượng. */
export const contestScore = (item: ItemId, q = 0) => Math.round((ITEMS[item]?.sell ?? 0) * QUALITY_MULT[q]);

/** Thưởng cuối kỳ: cuộc thi vừa kết thúc mà mình đứng 1–3 trong nhóm bạn (từ 2 người dự) → thư kèm tem. Trả về các dòng báo. */
export async function claimContestRewards(p: Profile, ended: { id: string; name: string }[]): Promise<string[]> {
  if (!loadIdentity()) return [];
  const lines: string[] = [];
  p.contestsDone ??= [];
  for (const c of ended) {
    if (p.contestsDone.includes(c.id)) continue;
    const board = await contestBoard(c.id).catch(() => null);
    if (!board) continue;
    p.contestsDone.push(c.id);
    const rank = board.findIndex((r) => r.me);
    if (board.length < 2 || rank < 0 || rank > 2) continue;
    const tem = [50, 30, 20][rank];
    sendMail(p, `${c.name}: hạng ${rank + 1}`, `Bạn đứng hạng ${rank + 1}/${board.length} trong nhóm bạn với ${board[rank].score} điểm. Chúc mừng!`, { tem });
    lines.push(`${c.name}: bạn đứng hạng ${rank + 1} — có thư thưởng ${tem} tem ở sảnh`);
  }
  if (p.contestsDone.length > 40) p.contestsDone.splice(0, p.contestsDone.length - 40);
  return lines;
}
