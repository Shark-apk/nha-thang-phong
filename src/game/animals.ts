// Luật vật nuôi: xây chuồng, mua thú, cho ăn, vuốt ve, sản phẩm, tổ ong, ao cá.
import { has } from './skills';
import { emit } from './bus';
import { ANIMALS, ANIMAL_NAMES, BUILDINGS, FLOWER_CROPS, type BuildingId } from '../data';
import { addItem, isWet, key, removeFromSlot, seasonOf, seeded, unkey, type FarmState, type UseResult } from './farm';

export interface Animal {
  id: number;
  kind: string;
  name: string;
  /** Điểm tình cảm 0–1000 (10 tim). */
  love: number;
  daysSince: number;
  product: boolean;
  fedToday: boolean;
  pettedToday: boolean;
}

export interface Building {
  /** Ngày xây xong (chưa tới thì đang xây). */
  readyDay: number;
  /** Cửa mở: ngày đẹp trời thú ra đồng ăn cỏ. */
  open: boolean;
  /** Cỏ khô trong máng. */
  hay: number;
  /** Ao cá: số cá đang có. */
  fish: number;
}

export interface Beehive {
  days: number;
  honey: 'honey' | 'flower_honey' | null;
}

export const hearts = (a: Animal) => Math.floor(a.love / 100);
export const isBuilt = (s: FarmState, b: BuildingId) => !!s.buildings[b] && s.buildings[b]!.readyDay <= s.day;
export const animalsIn = (s: FarmState, b: BuildingId) => s.animals.filter((a) => ANIMALS[a.kind].home === b);
/** Hôm nay thú của chuồng này có được thả ra đồng không. */
export function grazingToday(s: FarmState, b: BuildingId) {
  const bd = s.buildings[b];
  return !!bd?.open && seasonOf(s.day) !== 'winter' && !isWet(s.weather);
}
export const ownsWorkingBuffalo = (s: FarmState) => s.animals.some((a) => a.kind === 'buffalo' && a.love >= 200);

/** Anh Hai 4 tim: vật nuôi & công trình −10%. */
export const discounted = (s: FarmState, price: number) => (s.flags?.includes('discount_animals') ? Math.round(price * 0.9) : price);

/** Sức chứa chuồng (máy ấp từ đình làng: gấp đôi). */
export const capacityOf = (s: FarmState, b: BuildingId) => BUILDINGS[b].capacity * (s.flags?.includes('b_barn') ? 2 : 1);

export function build(s: FarmState, b: BuildingId): UseResult {
  const def = BUILDINGS[b];
  if (s.buildings[b]) return { ok: false, reason: `Đã có ${def.name.toLowerCase()}` };
  const cost = discounted(s, def.cost);
  if (s.money < cost) return { ok: false, reason: 'Không đủ tiền' };
  s.money -= cost;
  s.buildings[b] = { readyDay: s.day + 1, open: false, hay: 0, fish: 0 };
  emit('build', 1, b);
  return { ok: true, action: 'plant' };
}

export function buyAnimal(s: FarmState, kind: string): UseResult {
  const def = ANIMALS[kind];
  if (!isBuilt(s, def.home)) return { ok: false, reason: `Cần có ${BUILDINGS[def.home].name.toLowerCase()} trước` };
  if (animalsIn(s, def.home).length >= capacityOf(s, def.home)) return { ok: false, reason: `${BUILDINGS[def.home].name} đã đầy` };
  const price = discounted(s, def.price);
  if (s.money < price) return { ok: false, reason: 'Không đủ tiền' };
  s.money -= price;
  const id = (s.animals.reduce((m, a) => Math.max(m, a.id), 0) || 0) + 1;
  const name = ANIMAL_NAMES[(id * 7) % ANIMAL_NAMES.length];
  emit('buyAnimal', 1, kind);
  s.animals.push({ id, kind, name, love: 100, daysSince: 0, product: false, fedToday: false, pettedToday: false });
  return { ok: true, action: 'plant' };
}

/** Bấm vào con vật: lấy sản phẩm nếu có, và vuốt ve (1 lần/ngày). */
export function touchAnimal(s: FarmState, id: number): { ok: true; petted: boolean; item?: string; q?: number; animal: Animal } | { ok: false; reason: string } {
  const a = s.animals.find((x) => x.id === id);
  if (!a) return { ok: false, reason: 'Không thấy con vật' };
  const def = ANIMALS[a.kind];
  let item: string | undefined;
  let q = 0;
  if (a.product && def.product) {
    q = a.love >= 800 ? 2 : a.love >= 450 ? 1 : 0;
    if (has(s, 'chan_dat')) q = Math.max(1, q);
    const n = has(s, 'ban_thu') && Math.random() < 0.2 ? 2 : 1;
    if (!addItem(s, def.product, n, q)) return { ok: false, reason: 'Túi đồ đầy' };
    a.product = false;
    item = def.product;
    emit('collect', 1, item);
  }
  const petted = !a.pettedToday;
  if (petted) {
    a.pettedToday = true;
    a.love = Math.min(1000, a.love + (has(s, 'thuong_thu') ? 30 : 15));
  }
  return { ok: true, petted, item, q, animal: a };
}

/** Đổ cỏ khô đang cầm vào máng của chuồng. */
export function fillTrough(s: FarmState, b: BuildingId, slot: number): UseResult {
  const held = s.inventory[slot];
  if (held?.item !== 'hay') return { ok: false, reason: 'Cầm cỏ khô (mua ở quầy) để đổ vào máng' };
  const bd = s.buildings[b]!;
  const room = capacityOf(s, b) * 3 - bd.hay;
  if (room <= 0) return { ok: false, reason: 'Máng đã đầy' };
  const n = Math.min(room, held.qty);
  bd.hay += n;
  removeFromSlot(s, slot, n);
  return { ok: true, action: 'plant', qty: n };
}

export function toggleDoor(s: FarmState, b: BuildingId) {
  const bd = s.buildings[b]!;
  bd.open = !bd.open;
  return bd.open;
}

// ---------------------------------------------------------------- tổ ong & ao cá

export function placeBeehive(s: FarmState, slot: number, x: number, y: number, tillable: boolean): UseResult {
  const k = key(x, y);
  if (!tillable || s.tilled[k] || s.trees[k] || s.beehives[k]) return { ok: false, reason: 'Đặt tổ ong trên cỏ trống' };
  s.beehives[k] = { days: 0, honey: null };
  removeFromSlot(s, slot);
  return { ok: true, action: 'plant' };
}

export function collectHoney(s: FarmState, k: string): UseResult {
  const h = s.beehives[k];
  if (!h?.honey) return { ok: false, reason: `Ong đang làm mật (${Math.max(0, 4 - h!.days)} ngày nữa)` };
  if (!addItem(s, h.honey, 1)) return { ok: false, reason: 'Túi đồ đầy' };
  const item = h.honey;
  h.honey = null;
  h.days = 0;
  emit('collect', 1, item);
  return { ok: true, action: 'harvest', item, qty: 1 };
}

export function collectFish(s: FarmState): UseResult {
  const bd = s.buildings.pond;
  if (!bd || bd.fish <= 0) return { ok: false, reason: 'Chưa có cá, mai quay lại' };
  const n = bd.fish;
  if (!addItem(s, 'fish', n)) return { ok: false, reason: 'Túi đồ đầy' };
  bd.fish = 0;
  emit('collect', n, 'fish');
  return { ok: true, action: 'harvest', item: 'fish', qty: n };
}

// ---------------------------------------------------------------- qua đêm

export interface AnimalNight {
  hungry: number;
  products: number;
  built: BuildingId[];
}

/** Gọi trong sleep() sau khi sang ngày mới. `grazed` tính theo thời tiết của ngày vừa qua. */
export function nightAnimals(s: FarmState, grazedYesterday: Record<string, boolean>): AnimalNight {
  const r: AnimalNight = { hungry: 0, products: 0, built: [] };
  for (const [b, bd] of Object.entries(s.buildings) as [BuildingId, Building][]) {
    if (bd.readyDay === s.day) r.built.push(b);
    if (b === 'pond' && bd.readyDay < s.day) {
      if ((s.day - bd.readyDay) % 2 === 0) bd.fish = Math.min(4, bd.fish + 1);
    }
  }
  for (const a of s.animals) {
    const def = ANIMALS[a.kind];
    const bd = s.buildings[def.home]!;
    const grazed = !!grazedYesterday[def.home];
    let fed = grazed;
    if (!fed && bd.hay > 0) {
      bd.hay--;
      fed = true;
    }
    if (fed) {
      const gain = (a.pettedToday ? 12 : -4) + (grazed ? 8 : 0);
      a.love = Math.max(0, Math.min(1000, a.love + (gain > 0 && has(s, 'thuong_thu') ? gain * 2 : gain)));
      a.daysSince++;
      if (def.product && a.daysSince >= def.every && (!def.grazeOnly || grazed)) {
        a.product = true;
        a.daysSince = 0;
        r.products++;
      }
    } else {
      if (!has(s, 'bac_si_thu')) a.love = Math.max(0, a.love - 40);
      r.hungry++;
    }
    a.pettedToday = false;
    a.fedToday = false;
  }
  for (const [k, h] of Object.entries(s.beehives)) {
    if (h.honey || seasonOf(s.day) === 'winter') continue;
    h.days++;
    if (h.days >= 4) {
      const [x, y] = unkey(k);
      const flower = Object.entries(s.crops).some(([ck, c]) => {
        const [cx, cy] = unkey(ck);
        return FLOWER_CROPS.has(c.id) && Math.abs(cx - x) <= 5 && Math.abs(cy - y) <= 5;
      });
      h.honey = flower ? 'flower_honey' : 'honey';
    }
  }
  void seeded;
  return r;
}
