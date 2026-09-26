// Luật mốc 8: câu cá, nấu ăn, đơn hàng ở bảng tin, bộ sưu tập đình làng, nhà kính, lễ hội.
import { has, worn } from './skills';
import { emit } from './bus';
import {
  BUNDLES, CROPS, DISHES, FESTIVALS, FISH, FISH_ENERGY, ITEMS, KITCHEN, NPC, NPCS, RODS,
  type Festival, type FishDef, type ItemId, type Water,
} from '../data';
import { addItem, countItem, dayOfSeason, seasonOf, seeded, type FarmState, type UseResult } from './farm';
import { takeItem } from './resources';
import { npcState } from './villagers';

// ---------------------------------------------------------------- câu cá

export const heldRod = (s: FarmState, slot: number) => {
  const it = s.inventory[slot]?.item;
  return it && RODS[it] ? it : null;
};

/** Cá có thể cắn câu ở chỗ này lúc này. */
export function fishHere(s: FarmState, water: Water, minutes = s.minutes): FishDef[] {
  const season = seasonOf(s.day);
  return FISH.filter((f) => f.seasons.includes(season) && f.where.includes(water) && minutes >= f.hours[0] && minutes < f.hours[1] && (!f.flag || s.flags.includes(f.flag)));
}

/** Thả câu: tốn sức, chọn con cá sẽ cắn (cá dễ hay gặp hơn). */
export function cast(s: FarmState, slot: number, water: Water, rng: () => number = Math.random): { ok: true; fish: FishDef; bar: number; pull: number } | { ok: false; reason: string } {
  const rod = heldRod(s, slot);
  if (!rod) return { ok: false, reason: 'Cầm cần câu' };
  if (s.energy < FISH_ENERGY) return { ok: false, reason: 'Hết sức rồi, ăn gì đó (F) hoặc đi ngủ' };
  const pool = fishHere(s, water);
  if (!pool.length) return { ok: false, reason: 'Giờ này không có cá cắn câu' };
  s.energy -= FISH_ENERGY;
  const total = pool.reduce((n, f) => n + (110 - f.diff), 0);
  let r = rng() * total;
  const fish = pool.find((f) => (r -= 110 - f.diff) < 0) ?? pool[0];
  const bar = RODS[rod].bar + (has(s, 'di_bien') ? 0.05 : 0) + (worn === 'fisher' ? 0.04 : 0);
  const eased = has(s, 'san_ca') ? { ...fish, diff: Math.max(5, fish.diff - 15) } : fish;
  return { ok: true, fish: eased, bar, pull: has(s, 'tho_lan') ? 1.2 : 1 };
}

/** Kéo được cá: giữ cá trong vùng suốt trận → cá bạc. */
export function landFish(s: FarmState, fish: FishDef, perfect: boolean, rng: () => number = Math.random): UseResult {
  const q = perfect ? 1 : 0;
  const n = has(s, 'thuyen_truong') && rng() < 0.15 ? 2 : 1;
  if (!addItem(s, fish.id, n, q)) return { ok: false, reason: 'Túi đồ đầy — cá sổng mất' };
  s.fishCaught[fish.id] = (s.fishCaught[fish.id] ?? 0) + 1;
  emit('fish', 1, fish.id);
  return { ok: true, action: 'harvest', item: fish.id, qty: n, q };
}

// ---------------------------------------------------------------- bếp

export function buildKitchen(s: FarmState): UseResult {
  if (s.flags.includes('kitchen')) return { ok: false, reason: 'Nhà đã có bếp' };
  if (s.money < KITCHEN.cost) return { ok: false, reason: 'Không đủ tiền' };
  if (countItem(s, 'wood') < KITCHEN.wood) return { ok: false, reason: `Cần ${KITCHEN.wood} gỗ` };
  s.money -= KITCHEN.cost;
  takeItem(s, 'wood', KITCHEN.wood);
  s.flags.push('kitchen');
  return { ok: true, action: 'plant' };
}

export const knowsDish = (s: FarmState, id: ItemId) => {
  const d = DISHES.find((x) => x.id === id)!;
  return !d.flag || s.flags.includes(d.flag);
};
export const canCook = (s: FarmState, id: ItemId) => knowsDish(s, id) && DISHES.find((x) => x.id === id)!.needs.every(([it, n]) => countItem(s, it) >= n);

export function cook(s: FarmState, id: ItemId): UseResult {
  const d = DISHES.find((x) => x.id === id);
  if (!d) return { ok: false, reason: 'Không có món này' };
  if (!s.flags.includes('kitchen')) return { ok: false, reason: 'Nhà chưa có bếp' };
  if (!knowsDish(s, id)) return { ok: false, reason: 'Chưa biết công thức' };
  if (!canCook(s, id)) return { ok: false, reason: 'Thiếu nguyên liệu' };
  // Lấy nguyên liệu trước (có thể trống ra ô), không vừa túi thì trả lại
  const backup = s.inventory.map((x) => (x ? { ...x } : null));
  for (const [it, n] of d.needs) takeItem(s, it, n);
  // Bếp tiết kiệm: 15% không tốn nguyên liệu
  if (has(s, 'tiet_kiem') && Math.random() < 0.15) s.inventory = backup.map((x) => (x ? { ...x } : null));
  if (!addItem(s, id, 1)) {
    s.inventory = backup;
    return { ok: false, reason: 'Túi đồ đầy' };
  }
  emit('cook', 1, id);
  return { ok: true, action: 'harvest', item: id, qty: 1 };
}

// ---------------------------------------------------------------- bảng tin: 3 đơn mỗi sáng

export interface Order { npc: string; item: ItemId; qty: number; reward: number }

/** Món dân làng hay đặt: nông sản đúng mùa, sản phẩm vật nuôi, cá. */
function orderPool(s: FarmState): ItemId[] {
  const season = seasonOf(s.day);
  const crops = Object.values(CROPS).filter((c) => c.seasons.includes(season) && ITEMS[c.harvest].energy).map((c) => c.harvest);
  return [...crops, 'egg', 'milk', 'fish', 'honey', 'wood', 'stone', 'ore_copper'];
}

export function ordersToday(s: FarmState): Order[] {
  const pool = orderPool(s);
  const out: Order[] = [];
  for (let i = 0; out.length < 3 && i < 20; i++) {
    const item = pool[Math.floor(seeded(s.day * 211 + i * 17) * pool.length)];
    if (out.some((o) => o.item === item)) continue;
    const npc = NPCS[Math.floor(seeded(s.day * 97 + i * 5) * NPCS.length)].id;
    const sell = ITEMS[item].sell;
    const qty = sell >= 100 ? 1 : sell >= 40 ? 3 : sell >= 10 ? 5 : 20;
    out.push({ npc, item, qty, reward: Math.max(80, Math.round(sell * qty * 2) + 50) });
  }
  return out;
}

export const ORDER_LOVE = 60;
export const orderDone = (s: FarmState, i: number) => s.orders?.day === s.day && s.orders.done.includes(i);

export function deliverOrder(s: FarmState, i: number): UseResult {
  const o = ordersToday(s)[i];
  if (!o) return { ok: false, reason: 'Không có đơn này' };
  if (s.orders?.day !== s.day) s.orders = { day: s.day, done: [] };
  if (s.orders.done.includes(i)) return { ok: false, reason: 'Đơn đã giao' };
  if (!takeItem(s, o.item, o.qty)) return { ok: false, reason: `Cần ${o.qty} ${ITEMS[o.item].name.toLowerCase()}` };
  s.orders.done.push(i);
  s.money += has(s, 'khach_quen') ? Math.round(o.reward * 1.3) : o.reward;
  const st = npcState(s, o.npc);
  st.love = Math.min(2500, st.love + ORDER_LOVE);
  emit('order', 1, o.item);
  return { ok: true, action: 'harvest', item: o.item, qty: o.reward };
}

// ---------------------------------------------------------------- đình làng

export const bundleDone = (s: FarmState, id: string) => s.flags.includes(BUNDLES.find((b) => b.id === id)!.flag);
export const bundleHave = (s: FarmState, id: string, item: ItemId) => s.bundles[id]?.[item] ?? 0;

/** Góp món vào bộ sưu tập (lấy vừa đủ phần còn thiếu). Đủ hết → nhận thưởng. */
export function donate(s: FarmState, id: string, item: ItemId): { ok: true; qty: number; completed: boolean } | { ok: false; reason: string } {
  const b = BUNDLES.find((x) => x.id === id);
  if (!b) return { ok: false, reason: 'Không có bộ này' };
  if (bundleDone(s, id)) return { ok: false, reason: 'Bộ này đã đủ' };
  const need = b.needs.find(([it]) => it === item);
  if (!need) return { ok: false, reason: 'Bộ này không cần món đó' };
  const missing = need[1] - bundleHave(s, id, item);
  if (missing <= 0) return { ok: false, reason: 'Món này đã đủ' };
  const n = Math.min(missing, countItem(s, item));
  if (n <= 0) return { ok: false, reason: `Không có ${ITEMS[item].name.toLowerCase()}` };
  takeItem(s, item, n);
  s.bundles[id] = { ...s.bundles[id], [item]: bundleHave(s, id, item) + n };
  emit('donate', n, item);
  const completed = b.needs.every(([it, q]) => bundleHave(s, id, it) >= q);
  if (completed) {
    s.flags.push(b.flag);
    if (id === 'garden' && !addItem(s, 'sprinkler_3', 4)) s.mailbox.push({ item: 'sprinkler_3', qty: 4, from: 'Đình làng' });
    if (id === 'river') s.greenhouseDay = s.day + 1;
  }
  return { ok: true, qty: n, completed };
}

/** Xe bò (bộ Thợ khéo): hàng bán thêm 10%. */
export const shipBonus = (s: FarmState) => (s.flags?.includes('b_craft') ? 1.1 : 1);
export const hasGreenhouse = (s: FarmState) => s.greenhouseDay !== null && s.greenhouseDay !== undefined && s.day >= s.greenhouseDay;
/** Ô nhà kính dùng tọa độ x ≥ GH_X để chung bảng đất/cây với nông trại. */
export const GH_X = 100;
export const isGreenhouseKey = (k: string) => Number(k.split(',')[0]) >= GH_X;

// ---------------------------------------------------------------- lễ hội

export function festivalToday(s: FarmState): Festival | undefined {
  const season = seasonOf(s.day);
  const d = dayOfSeason(s.day);
  return FESTIVALS.find((f) => f.season === season && f.day === d);
}
export const festivalNow = (s: FarmState) => {
  const f = festivalToday(s);
  return f && s.minutes >= f.hours[0] && s.minutes < f.hours[1] ? f : undefined;
};

function festState(s: FarmState, f: Festival) {
  if (s.festival?.id !== f.id || s.festival.day !== s.day) s.festival = { id: f.id, day: s.day, gift: false, lixi: [] };
  return s.festival;
}

/** Người lớn lì xì ngày Tết: mỗi người một lần. */
const ELDERS = new Set(['ba_tu', 'bac_nam', 'ong_bay', 'thay_lang']);
export function festivalTalk(s: FarmState, npcId: string): string | null {
  const f = festivalNow(s);
  if (!f) return null;
  const st = festState(s, f);
  if (f.id === 'tet') {
    if (st.lixi.includes(npcId)) return null;
    st.lixi.push(npcId);
    const money = ELDERS.has(npcId) ? 300 : 100;
    s.money += money;
    return `Chúc mừng năm mới! ${NPC[npcId].name} lì xì cho bạn ${money} xu.`;
  }
  if (f.gift && !st.gift) {
    st.gift = true;
    const [item, qty] = f.gift;
    if (!addItem(s, item, qty)) s.mailbox.push({ item, qty, from: f.name });
    return `Mừng ${f.name}! ${NPC[npcId].name} tặng bạn ${qty} ${ITEMS[item].name.toLowerCase()}.`;
  }
  return null;
}

/** Tặng quà trong Trung Thu: bánh trung thu ×3 tim. */
export const festivalGiftMult = (s: FarmState, item: ItemId) => (festivalNow(s)?.id === 'trung_thu' && item === 'banh_trung_thu' ? 3 : 1);

/** Bầu cua: đặt `bet` xu vào `pick`; lắc 3 xúc xắc, trúng mấy con ăn bấy nhiêu lần tiền cược. */
export function bauCua(s: FarmState, pick: number, bet: number, rng: () => number = Math.random): { ok: true; dice: number[]; win: number } | { ok: false; reason: string } {
  if (festivalNow(s)?.id !== 'tet') return { ok: false, reason: 'Bầu cua chỉ chơi ngày Tết' };
  if (s.money < bet) return { ok: false, reason: 'Không đủ tiền cược' };
  const dice = [0, 0, 0].map(() => Math.floor(rng() * 6));
  const hits = dice.filter((d) => d === pick).length;
  const win = hits ? bet * hits : -bet;
  s.money += win;
  return { ok: true, dice, win };
}
