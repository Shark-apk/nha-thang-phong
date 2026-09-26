// Luật mốc 14: mở vùng trên bản đồ thế giới, đi xe bò, tiệm may, tiệm trang trí, vựa thu mua.
import { CART_FARE, CART_MINUTES, CROPS, DECOR, ITEMS, REGIONS, TAILOR, type ItemId, type RegionId } from '../data';
import { advanceClock, addItem, seasonOf, seeded, sellPrice, type FarmState, type UseResult } from './farm';
import { levelOf, weekStart, type Profile } from './profile';

/** Vùng đã có bản đồ để tới (vùng khác mở ở mốc sau). */
export const BUILT: RegionId[] = ['farm', 'village', 'town', 'mine', 'forest', 'sea', 'sky'];

export function regionOpen(p: Profile, s: FarmState, id: RegionId) {
  const r = REGIONS.find((x) => x.id === id)!;
  if (id === 'town' && s.flags.includes('road_town')) return true;
  return levelOf(p.xp).level >= r.level;
}

/** Đi xe bò: trả tiền, mất 1 giờ. Về nông trại thì miễn phí. */
export function rideCart(p: Profile, s: FarmState, to: RegionId): UseResult {
  if (!regionOpen(p, s, to)) {
    const r = REGIONS.find((x) => x.id === to)!;
    return { ok: false, reason: `${r.name} mở ở cấp nông trại ${r.level}` };
  }
  if (!BUILT.includes(to)) return { ok: false, reason: 'Đường tới đó chưa làm xong' };
  const fare = to === 'farm' ? 0 : CART_FARE;
  if (s.money < fare) return { ok: false, reason: `Cần ${fare} xu tiền xe` };
  if (s.minutes >= 24 * 60) return { ok: false, reason: 'Khuya rồi, xe bò nghỉ chạy' };
  s.money -= fare;
  advanceClock(s, CART_MINUTES);
  return { ok: true, action: 'plant', qty: fare };
}

// ---------------------------------------------------------------- tiệm may & tiệm trang trí

export function buyPiece(p: Profile, s: FarmState, id: string): UseResult {
  const t = TAILOR.find((x) => x.id === id);
  if (!t) return { ok: false, reason: 'Không có món này' };
  if (p.wardrobe.includes(id)) return { ok: false, reason: 'Đã có rồi' };
  if (s.money < t.price) return { ok: false, reason: 'Không đủ tiền' };
  s.money -= t.price;
  p.wardrobe.push(id);
  return { ok: true, action: 'plant', item: id };
}

export function buyDecor(s: FarmState, id: ItemId): UseResult {
  const d = DECOR[id];
  if (!d) return { ok: false, reason: 'Không có món này' };
  if (s.money < d.price) return { ok: false, reason: 'Không đủ tiền' };
  if (!addItem(s, id, 1)) return { ok: false, reason: 'Túi đồ đầy' };
  s.money -= d.price;
  return { ok: true, action: 'plant', item: id };
}

// ---------------------------------------------------------------- vựa thu mua

/** 3 món được giá cao tuần này (theo tuần thật): nông sản đúng mùa + sản phẩm. */
export function hotItems(s: FarmState, week = weekStart()): ItemId[] {
  const season = seasonOf(s.day);
  const pool = [...Object.values(CROPS).filter((c) => c.seasons.includes(season)).map((c) => c.harvest), 'egg', 'milk', 'wool', 'honey', 'fish', 'jam'];
  const seed = [...week].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
  return [...new Set(pool)].filter((i) => ITEMS[i]).sort((a, b) => seeded(seed + a.length * 97 + a.charCodeAt(0)) - seeded(seed + b.length * 97 + b.charCodeAt(0))).slice(0, 3);
}
export const HOT_MULT = 1.5;

/** Bán ngay cả chồng đang cầm: giá thường, món "giá cao tuần này" ×1,5. */
export function sellNow(s: FarmState, slot: number, week?: string): UseResult {
  const held = s.inventory[slot];
  if (!held || !ITEMS[held.item].sell) return { ok: false, reason: 'Cầm món muốn bán' };
  const hot = hotItems(s, week).includes(held.item);
  const money = Math.round(sellPrice(held, s) * held.qty * (hot ? HOT_MULT : 1));
  s.money += money;
  s.inventory[slot] = null;
  return { ok: true, action: 'harvest', item: held.item, qty: money };
}
