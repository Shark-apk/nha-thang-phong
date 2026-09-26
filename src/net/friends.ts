// Kết nối server bạn bè (server/index.mjs): đăng ký mã, tải ảnh chụp nông trại, ghé thăm, tưới giúp, gửi quà, nhận thư.
import { ITEMS, QUALITY_MULT, type ItemId } from '../data';
import type { FarmState } from '../game/farm';

import { currentSlot } from '../game/save';
import { addItem } from '../game/farm';
import { beautyOf } from '../game/farming2';
import { levelOf } from '../game/profile';
import { session } from '../game/session';

/** Mỗi ô lưu một mã bạn bè riêng. */
const keyOf = () => (currentSlot() === 0 ? 'nongtrai.friend' : `nongtrai.friend.s${currentSlot()}`);

export interface Identity { url: string; code: string; token: string; name: string }
export interface Friend { code: string; name: string; updated: number; helpedToday: boolean }
export interface InboxMsg { kind: 'water' | 'gift' | 'like' | 'sale'; from: string; data: unknown; created: number }
/** Số liệu cho bảng xếp hạng bạn bè. */
export interface Score { level: number; beauty: number; deepest: number; fishKinds: number; earned: number }
export interface Rank extends Score { code: string; name: string; me: boolean; likes: number }
export interface Entry { code: string; name: string; item: ItemId; q: number; score: number; me: boolean }
export interface Listing { id: number; item: ItemId; q: number; qty: number; price: number; created: number; seller: string; mine: boolean }
/** Phần trạng thái gửi lên cho bạn bè xem (không có túi đồ, tiền, quan hệ). */
export type Snapshot = Pick<FarmState, 'day' | 'tilled' | 'crops' | 'trees' | 'objects' | 'buildings' | 'beehives' | 'cleared' | 'animals' | 'greenhouseDay'> & { name: string; score?: Score };

export const defaultUrl = () => (import.meta.env.VITE_FRIENDS_URL as string | undefined) ?? `http://${location.hostname || 'localhost'}:8787`;

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(keyOf());
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}
export function saveIdentity(id: Identity | null) {
  try {
    if (id) localStorage.setItem(keyOf(), JSON.stringify(id));
    else localStorage.removeItem(keyOf());
  } catch {
    /* bỏ qua */
  }
}

async function call<T>(url: string, path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
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
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`);
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
