// Luật mốc 18: hái đồ rừng, lặn biển & rạn san hô, hang sâu 30 tầng có quái.
import { DIVE_ENERGY, DIVE_LOOT, FORAGE, ITEMS, REEF_TRASH, type ItemId } from '../data';
import { addItem, countItem, key, seeded, type FarmState } from './farm';
import { takeItem } from './resources';
import { emit } from './bus';

const pick = (table: [ItemId, number][], r: number) => {
  const total = table.reduce((n, [, w]) => n + w, 0);
  let x = r * total;
  return (table.find(([, w]) => (x -= w) < 0) ?? table[0])[0];
};

/** Ô vườn trên mây dùng tọa độ x ≥ SKY_X (chung bảng đất/cây, được tưới & giữ như nhà kính). */
export const SKY_X = 200;

// ---------------------------------------------------------------- rừng

/** Đồ mọc trong rừng hôm nay: vị trí + món (cùng ngày luôn như nhau). */
export function forageToday(day: number, spots: [number, number][], count = 12, table: [ItemId, number][] = FORAGE) {
  const out: { x: number; y: number; item: ItemId }[] = [];
  const used = new Set<string>();
  for (let i = 0; out.length < Math.min(count, spots.length) && i < count * 6; i++) {
    const [x, y] = spots[Math.floor(seeded(day * 613 + i * 41) * spots.length)];
    if (used.has(key(x, y))) continue;
    used.add(key(x, y));
    out.push({ x, y, item: pick(table, seeded(day * 29 + i * 7 + 3)) });
  }
  return out;
}

export function takenToday(s: FarmState) {
  if (!s.forage || s.forage.day !== s.day) s.forage = { day: s.day, taken: [] };
  return new Set(s.forage.taken);
}

export function pickForage(s: FarmState, x: number, y: number, item: ItemId) {
  const taken = takenToday(s);
  const k = key(x, y);
  if (taken.has(k)) return false;
  if (!addItem(s, item, 1)) return false;
  s.forage!.taken.push(k);
  emit('forage', 1, item);
  return true;
}

// ---------------------------------------------------------------- biển

export function dive(s: FarmState, rng: () => number = Math.random): { ok: true; item: ItemId } | { ok: false; reason: string } {
  if (s.energy < DIVE_ENERGY) return { ok: false, reason: 'Mệt quá, không lặn nổi — ăn gì đó đã' };
  const item = pick(DIVE_LOOT, rng());
  if (!addItem(s, item, 1)) return { ok: false, reason: 'Túi đồ đầy' };
  s.energy -= DIVE_ENERGY;
  emit('dive', 1, item);
  return { ok: true, item };
}

/** Góp rác cho trạm cứu hộ; đủ REEF_TRASH thì rạn san hô hồi sinh (mở cá rạn). */
export function donateTrash(s: FarmState): { ok: true; total: number; revived: boolean } | { ok: false; reason: string } {
  if (s.flags.includes('reef')) return { ok: false, reason: 'Rạn san hô đã hồi sinh — cảm ơn bạn!' };
  const n = countItem(s, 'rac');
  if (!n) return { ok: false, reason: `Mang rác biển tới đây (lặn là nhặt được) — cần ${REEF_TRASH}` };
  const give = Math.min(n, REEF_TRASH - s.reefTrash);
  takeItem(s, 'rac', give);
  s.reefTrash += give;
  const revived = s.reefTrash >= REEF_TRASH;
  if (revived) s.flags.push('reef');
  return { ok: true, total: s.reefTrash, revived };
}

// ---------------------------------------------------------------- hang sâu

export const MINE_FLOORS = 30;
export const DEEP_LEVEL = 10;

export type MonsterKind = 'bat' | 'slime' | 'golem';
export const MONSTERS: Record<MonsterKind, { name: string; hp: number; speed: number; damage: number; row: number; xp: number }> = {
  bat: { name: 'Dơi', hp: 3, speed: 55, damage: 4, row: 0, xp: 4 },
  slime: { name: 'Slime đất', hp: 5, speed: 28, damage: 6, row: 1, xp: 5 },
  golem: { name: 'Người đá', hp: 12, speed: 22, damage: 12, row: 2, xp: 10 },
};

/** Quái trên tầng: tầng 1 không có; sâu hơn đông và mạnh hơn. */
export function monstersForFloor(floor: number, day: number): MonsterKind[] {
  if (floor <= 1) return [];
  const n = Math.min(9, 2 + Math.floor(floor / 4));
  return Array.from({ length: n }, (_, i) => {
    const r = seeded(day * 71 + floor * 13 + i * 5);
    if (floor >= 20 && r < 0.35) return 'golem';
    return r < 0.55 ? 'bat' : 'slime';
  });
}

/** Loại đá theo độ sâu: càng sâu càng nhiều sắt, vàng; tầng ≥ 15 có đá quý. */
export function rockKind(floor: number, r: number) {
  const d = Math.min(1, floor / MINE_FLOORS);
  const gem = floor >= 15 ? 0.03 + d * 0.04 : 0;
  const gold = 0.03 + d * 0.12;
  const iron = 0.1 + d * 0.15;
  const copper = 0.18;
  if (r < gem) return 'mine_gem';
  if (r < gem + gold) return 'mine_gold';
  if (r < gem + gold + iron) return 'mine_iron';
  if (r < gem + gold + iron + copper) return 'mine_copper';
  return r < 0.55 ? 'mine_big' : 'mine_rock';
}

/** Tảng đá giấu lối xuống (chỉ số trong danh sách đá của tầng). */
export const ladderIndex = (floor: number, day: number, count: number) => Math.floor(seeded(day * 37 + floor * 101) * count);

/** Rương báu ở tầng 10, 20, 30 — mỗi rương mở một lần. */
export const CHEST_FLOORS: Record<number, [ItemId, number][]> = {
  10: [['gem', 2], ['ore_iron', 10]],
  20: [['gem', 3], ['ore_gold', 8]],
  30: [['gem', 5], ['ngoc_trai', 1], ['ore_gold', 15]],
};

export function openChest(s: FarmState, floor: number): string[] | null {
  const loot = CHEST_FLOORS[floor];
  if (!loot || s.chests.includes(floor)) return null;
  s.chests.push(floor);
  for (const [it, n] of loot) if (!addItem(s, it, n)) s.mailbox.push({ item: it, qty: n, from: `Rương tầng ${floor}` });
  return loot.map(([it, n]) => `${n} ${ITEMS[it].name.toLowerCase()}`);
}

/** Sát thương kiếm: 2, cộng cấp cuốc chim (luyện tay). */
export const swordDamage = (s: FarmState) => 2 + (s.tools?.pickaxe ?? 0);

/** Hết máu trong hang: ngất, mất 10% tiền (tối đa 1.000 xu), tỉnh dậy ở nhà sau 2 giờ. */
export function faint(s: FarmState) {
  const lost = Math.min(1000, Math.floor(s.money * 0.1));
  s.money -= lost;
  s.minutes = Math.min(25 * 60, s.minutes + 120);
  s.energy = Math.max(10, Math.floor(s.energy / 2));
  return lost;
}
