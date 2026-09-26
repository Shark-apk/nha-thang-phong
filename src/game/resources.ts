// Luật tài nguyên: chặt/đập vật cản, hang đá, nâng cấp dụng cụ, túi đồ, chế tạo, máy chế biến, vòi tưới, quạ.
import { has } from './skills';
import { emit } from './bus';
import { AUTO_MACHINES, DECOR, isDecor } from '../data';
import { isWet } from './farm';
import {
  BACKPACK, CAN_CAPACITY, CROPS, ITEMS, machineOutput, MACHINES, NODES, RECIPES, SCARECROW_RADIUS, sprinklerArea, TOOL_UPGRADES, UPGRADE_DAYS,
  type ItemId, type MachineId, type ToolId,
} from '../data';
import { addItem, countItem, key, removeFromSlot, seeded, unkey, type FarmState, type UseResult } from './farm';

export interface PlacedObject {
  /** Máy (MachineId) hoặc đồ trang trí (deco_*). */
  kind: MachineId | string;
  /** Số thành phẩm (máy tự làm có thể ra nhiều). */
  qty?: number;
  /** Thành phẩm đang làm / đã xong. */
  out?: ItemId;
  readyDay?: number;
}

export interface MineState {
  /** Ngày của lần sinh đá gần nhất — sang ngày khác thì đá mọc lại. */
  day: number;
  broken: string[];
}

export const toolTier = (s: FarmState, t: ToolId) => s.tools?.[t] ?? 0;
export const maxWater = (s: FarmState) => CAN_CAPACITY[toolTier(s, 'can')];

/** Lấy `qty` món `item` ra khỏi túi (gom từ nhiều ô, mọi chất lượng). */
export function takeItem(s: FarmState, item: ItemId, qty: number) {
  if (countItem(s, item) < qty) return false;
  for (let i = 0; i < s.inventory.length && qty > 0; i++) {
    const sl = s.inventory[i];
    if (sl?.item !== item) continue;
    const n = Math.min(qty, sl.qty);
    removeFromSlot(s, i, n);
    qty -= n;
  }
  return true;
}

// ---------------------------------------------------------------- chặt cây, đập đá

export type StrikeResult =
  | { ok: true; broke: boolean; hp: number; drops: [ItemId, number][] }
  | { ok: false; reason: string };

/**
 * Bổ một nhát vào vật cản `node` đã chịu `damage` sát thương.
 * Sát thương mỗi nhát = 1 + cấp dụng cụ. Trả về đồ rơi khi vỡ.
 */
export function strike(s: FarmState, slot: number, node: string, damage: number, rng: () => number = Math.random): StrikeResult {
  const def = NODES[node];
  const held = s.inventory[slot]?.item;
  const toolName = def.tool === 'axe' ? 'rìu' : 'cuốc chim';
  if (held !== def.tool) return { ok: false, reason: `Cần ${toolName}` };
  const tier = toolTier(s, def.tool);
  if (tier < def.minTier) return { ok: false, reason: `Cứng quá — cần ${toolName} đồng trở lên (nâng ở thợ rèn)` };
  if (s.energy < 4) return { ok: false, reason: 'Hết sức rồi, ăn gì đó (F) hoặc đi ngủ' };
  s.energy -= 4;
  const hp = Math.max(0, def.hp - damage - (1 + tier));
  if (hp > 0) return { ok: true, broke: false, hp, drops: [] };
  const drops: [ItemId, number][] = [];
  for (const [item, lo, hi] of def.drops) {
    const n = lo + Math.floor(rng() * (hi - lo + 1));
    if (n > 0) drops.push([item, n]);
  }
  if (def.bonus && rng() < def.bonus[1]) drops.push([def.bonus[0], 1]);
  if (def.tool === 'pickaxe') {
    const ore = drops.find(([it]) => it.startsWith('ore_'));
    if (ore && has(s, 'tho_mo')) ore[1]++;
    const stone = drops.find(([it]) => it === 'stone');
    if (stone && has(s, 'chuyen_gia')) stone[1]++;
    const gemChance = has(s, 'dia_chat') ? 0.12 : has(s, 'tho_da') ? 0.05 : 0;
    if (gemChance && rng() < gemChance) drops.push(['gem', 1]);
  }
  for (const [item, n] of drops) addItem(s, item, n);
  emit(def.tool === 'axe' ? 'chop' : 'mine', 1, node);
  return { ok: true, broke: true, hp: 0, drops };
}

/** Đá trong hang hôm nay: vị trí + loại, sinh theo ngày (cùng ngày luôn giống nhau). */
export function mineRocks(day: number, spots: [number, number][], count = 34): { x: number; y: number; node: string }[] {
  const out: { x: number; y: number; node: string }[] = [];
  const used = new Set<string>();
  for (let i = 0; out.length < Math.min(count, spots.length) && i < count * 6; i++) {
    const [x, y] = spots[Math.floor(seeded(day * 977 + i * 31) * spots.length)];
    if (used.has(key(x, y))) continue;
    used.add(key(x, y));
    const r = seeded(day * 131 + i * 7 + 5);
    const node = r < 0.04 ? 'mine_gold' : r < 0.14 ? 'mine_iron' : r < 0.32 ? 'mine_copper' : r < 0.42 ? 'mine_big' : 'mine_rock';
    out.push({ x, y, node });
  }
  return out;
}

/** Đá hang đã đập hôm nay (reset khi sang ngày mới). */
export function mineBroken(s: FarmState): Set<string> {
  if (!s.mine || s.mine.day !== s.day) s.mine = { day: s.day, broken: [] };
  return new Set(s.mine.broken);
}

// ---------------------------------------------------------------- vùng tác dụng khi giữ Shift

type Dir = 'down' | 'up' | 'left' | 'right';
const DV: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
/** Cấp 0: 1 ô · đồng: 3 ô thẳng · sắt: 5 ô thẳng · vàng: 3×3 phía trước. */
export function areaTiles(tier: number, t: { x: number; y: number }, dir: Dir): { x: number; y: number }[] {
  const [dx, dy] = DV[dir];
  if (tier <= 0) return [t];
  if (tier === 3) {
    const cx = t.x + dx, cy = t.y + dy;
    const out = [t];
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (cx + x !== t.x || cy + y !== t.y) out.push({ x: cx + x, y: cy + y });
    return out;
  }
  const n = tier === 1 ? 3 : 5;
  return Array.from({ length: n }, (_, i) => ({ x: t.x + dx * i, y: t.y + dy * i }));
}

// ---------------------------------------------------------------- thợ rèn & túi đồ

export function upgradeTool(s: FarmState, tool: ToolId): UseResult {
  if (s.upgrading) return { ok: false, reason: `Thợ rèn đang làm ${ITEMS[s.upgrading.tool].name.toLowerCase()} của bạn` };
  const tier = toolTier(s, tool);
  const up0 = TOOL_UPGRADES[tier];
  const up = up0 && has(s, 'tho_ren') ? { ...up0, cost: Math.round(up0.cost * 0.75) } : up0;
  if (!up) return { ok: false, reason: 'Dụng cụ đã ở cấp cao nhất' };
  if (s.money < up.cost) return { ok: false, reason: 'Không đủ tiền' };
  if (countItem(s, up.ore) < 5) return { ok: false, reason: `Cần 5 ${ITEMS[up.ore].name.toLowerCase()}` };
  const slot = s.inventory.findIndex((x) => x?.item === tool);
  if (slot === -1) return { ok: false, reason: `Bạn không mang theo ${ITEMS[tool].name.toLowerCase()}` };
  s.money -= up.cost;
  takeItem(s, up.ore, 5);
  s.inventory[slot] = null;
  if (tool === 'can') s.water = 0;
  s.upgrading = { tool, readyDay: s.day + (s.flags?.includes('fast_smith') ? 1 : UPGRADE_DAYS) };
  return { ok: true, action: 'plant', item: tool };
}

/** Sáng ngày hẹn: trả dụng cụ đã nâng vào túi (túi đầy thì hẹn hôm sau). */
export function collectUpgrade(s: FarmState): ToolId | null {
  const u = s.upgrading;
  if (!u || s.day < u.readyDay) return null;
  if (!addItem(s, u.tool, 1)) return null;
  s.tools[u.tool] = toolTier(s, u.tool) + 1;
  if (u.tool === 'can') s.water = maxWater(s);
  s.upgrading = null;
  return u.tool;
}

export function upgradeBackpack(s: FarmState): UseResult {
  const next = BACKPACK.find((b) => b.size > s.inventory.length);
  if (!next) return { ok: false, reason: 'Túi đã to nhất rồi' };
  if (s.money < next.cost) return { ok: false, reason: 'Không đủ tiền' };
  s.money -= next.cost;
  while (s.inventory.length < next.size) s.inventory.push(null);
  return { ok: true, action: 'plant', qty: next.size };
}

export function swapSlots(s: FarmState, a: number, b: number) {
  const t = s.inventory[a];
  s.inventory[a] = s.inventory[b];
  s.inventory[b] = t;
}

// ---------------------------------------------------------------- chế tạo

export const canCraft = (s: FarmState, id: ItemId) => RECIPES.find((r) => r.id === id)!.needs.every(([it, n]) => countItem(s, it) >= n);

export function craft(s: FarmState, id: ItemId): UseResult {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) return { ok: false, reason: 'Không có công thức' };
  if (!canCraft(s, id)) return { ok: false, reason: 'Thiếu nguyên liệu' };
  if (!s.inventory.some((x) => x === null || (x.item === id && !x.q))) return { ok: false, reason: 'Túi đồ đầy' };
  for (const [it, n] of r.needs) takeItem(s, it, n);
  addItem(s, id, 1);
  emit('craft', 1, id);
  return { ok: true, action: 'plant', item: id, qty: 1 };
}

// ---------------------------------------------------------------- máy đặt trên đất

export function placeObject(s: FarmState, slot: number, x: number, y: number, free: boolean): UseResult {
  const held = s.inventory[slot];
  if (!held || !(held.item in MACHINES || isDecor(held.item))) return { ok: false, reason: 'Không phải máy' };
  const k = key(x, y);
  if (!free || s.tilled[k] || s.crops[k] || s.trees[k] || s.beehives[k] || s.objects[k]) return { ok: false, reason: 'Đặt máy trên cỏ trống' };
  s.objects[k] = { kind: held.item };
  removeFromSlot(s, slot);
  return { ok: true, action: 'plant', item: held.item };
}

export type ObjectResult =
  | { ok: true; action: 'collect' | 'load' | 'pickup' | 'mill'; item: ItemId; qty: number }
  | { ok: false; reason: string };

/** Bấm vào máy khi đang cầm món ở `slot`: lấy thành phẩm / bỏ nguyên liệu / nhặt máy lên (rìu, cuốc chim). */
export function useObject(s: FarmState, k: string, slot: number): ObjectResult {
  const o = s.objects[k];
  if (!o) return { ok: false, reason: 'Không có máy' };
  if (isDecor(o.kind)) {
    const held = s.inventory[slot]?.item;
    if (held !== 'axe' && held !== 'pickaxe') return { ok: false, reason: `${DECOR[o.kind].name} — cầm rìu để nhặt lên` };
    if (!addItem(s, o.kind, 1)) return { ok: false, reason: 'Túi đồ đầy' };
    delete s.objects[k];
    return { ok: true, action: 'pickup', item: o.kind, qty: 1 };
  }
  const m = MACHINES[o.kind as MachineId];
  if (o.out) {
    if (s.day < o.readyDay!) {
      const d = o.readyDay! - s.day;
      return { ok: false, reason: `${m.name} đang làm ${ITEMS[o.out].name.toLowerCase()} — ${d} ngày nữa` };
    }
    const qty = o.qty ?? 1;
    if (!addItem(s, o.out, qty)) return { ok: false, reason: 'Túi đồ đầy' };
    const item = o.out;
    delete o.out;
    delete o.readyDay;
    delete o.qty;
    return { ok: true, action: 'collect', item, qty };
  }
  const held = s.inventory[slot];
  if (held?.item === 'axe' || held?.item === 'pickaxe') {
    if (!addItem(s, o.kind, 1)) return { ok: false, reason: 'Túi đồ đầy' };
    delete s.objects[k];
    return { ok: true, action: 'pickup', item: o.kind, qty: 1 };
  }
  if (!m.days && o.kind !== 'mill') return { ok: false, reason: `${m.name}: ${m.info}. Cầm rìu để nhặt lên` };
  const recipe = held ? machineOutput(o.kind, held.item) : null;
  if (!held || !recipe) return { ok: false, reason: `${m.name}: ${m.info}` };
  if (held.qty < recipe.need) return { ok: false, reason: `Cần ${recipe.need} ${ITEMS[held.item].name.toLowerCase()} cùng loại` };
  if (o.kind === 'mill') {
    // Cối xay: xay nguyên chồng ngay
    const n = held.qty;
    const free = s.inventory.some((x, i) => x === null || i === slot || (x.item === recipe.out && !x.q));
    if (!free) return { ok: false, reason: 'Túi đồ đầy' };
    removeFromSlot(s, slot, n);
    addItem(s, recipe.out, n);
    return { ok: true, action: 'mill', item: recipe.out, qty: n };
  }
  removeFromSlot(s, slot, recipe.need);
  o.out = recipe.out;
  o.readyDay = s.day + m.days!;
  return { ok: true, action: 'load', item: recipe.out, qty: recipe.need };
}

export const objectReady = (s: FarmState, o: PlacedObject) => !!o.out && s.day >= o.readyDay!;

// ---------------------------------------------------------------- qua đêm

export interface ResourceNight {
  watered: number;
  crow: string | null;
  tool: ToolId | null;
}

/** Gọi trong sleep() sau khi sang ngày mới và sau thời tiết. */
export function nightResources(s: FarmState): ResourceNight {
  const r: ResourceNight = { watered: 0, crow: null, tool: null };
  const scarecrows: [number, number][] = [];
  for (const [k, o] of Object.entries(s.objects)) {
    const [x, y] = unkey(k);
    if (o.kind === 'scarecrow') scarecrows.push([x, y]);
    // Máy tự làm: chưa có hàng thì bắt đầu mẻ mới (ruộng muối cần nắng)
    const auto = AUTO_MACHINES[o.kind as MachineId];
    if (auto && !o.out && (o.kind !== 'salt_pan' || !isWet(s.weather))) {
      o.out = auto.out;
      o.qty = auto.qty;
      o.readyDay = s.day + auto.days;
    }
    if (!o.kind.startsWith('sprinkler')) continue;
    for (const [dx, dy] of sprinklerArea(o.kind)) {
      const t = s.tilled[key(x + dx, y + dy)];
      if (t && !t.watered) {
        t.watered = true;
        r.watered++;
      }
    }
  }
  // Quạ: ruộng từ 12 cây trở lên, mỗi đêm 40% có quạ ăn 1 cây không được bù nhìn che
  const exposed = Object.keys(s.crops).filter((k) => {
    if (Number(k.split(',')[0]) >= 100) return false; // nhà kính
    const [x, y] = unkey(k);
    return !scarecrows.some(([sx, sy]) => Math.hypot(sx - x, sy - y) <= SCARECROW_RADIUS);
  });
  if (exposed.length >= 12 && exposed.length && seeded(s.day * 53 + 11) < 0.4) {
    const k = exposed[Math.floor(seeded(s.day * 29 + 1) * exposed.length)];
    r.crow = CROPS[s.crops[k].id].name;
    delete s.crops[k];
  }
  r.tool = collectUpgrade(s);
  return r;
}
