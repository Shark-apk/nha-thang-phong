// Mốc 17: sâu bệnh, cây khổng lồ, lai giống, điểm nông trại đẹp.
import { CROPS, DECOR, GIANT, hybridOf, ITEMS, isDecor, type CropId } from '../data';
import { addItem, isRipe, key, seeded, unkey, type FarmState } from './farm';
import { has } from './skills';
import { isGreenhouseKey } from './activities';

export interface CropNight { pests: number; giant: string | null; hybrid: string | null }

/** Sâu mới mỗi đêm: 2,5% mỗi cây chưa chín ngoài trời; nuôi vịt thì vịt ăn sâu, còn 0,8%. */
export const PEST_CHANCE = 0.025;
export const PEST_CHANCE_DUCK = 0.008;
export const GIANT_CHANCE = 0.15;
export const HYBRID_CHANCE = 0.06;

export function nightCrops(s: FarmState): CropNight {
  const r: CropNight = { pests: 0, giant: null, hybrid: null };
  const duck = s.animals.some((a) => a.kind === 'duck');
  const chance = duck ? PEST_CHANCE_DUCK : PEST_CHANCE;
  let i = 0;
  for (const [k, c] of Object.entries(s.crops)) {
    i++;
    if (isGreenhouseKey(k) || c.pest || isRipe(c)) continue;
    if (seeded(s.day * 7331 + i * 97 + k.length) < chance) { c.pest = true; r.pests++; }
  }
  // Cây khổng lồ: 3×3 ô cùng loại đã chín
  for (const [k, c] of Object.entries(s.crops)) {
    if (!GIANT.has(c.id) || !isRipe(c) || isGreenhouseKey(k)) continue;
    const [x, y] = unkey(k);
    const block = [0, 1, 2].flatMap((dy) => [0, 1, 2].map((dx) => key(x + dx, y + dy)));
    if (!block.every((b) => s.crops[b]?.id === c.id && isRipe(s.crops[b]))) continue;
    if (seeded(s.day * 131 + x * 17 + y * 29) >= GIANT_CHANCE) continue;
    for (const b of block) delete s.crops[b];
    s.giants[k] = { id: c.id };
    r.giant = CROPS[c.id].name;
    break;
  }
  // Lai giống: hai cây khác loại chín cạnh nhau (phải/dưới) có giống lai
  const chanceH = HYBRID_CHANCE * (has(s, 'lai_giong') ? 2 : 1);
  for (const [k, c] of Object.entries(s.crops)) {
    if (!isRipe(c)) continue;
    const [x, y] = unkey(k);
    for (const nk of [key(x + 1, y), key(x, y + 1)]) {
      const n = s.crops[nk];
      if (!n || n.id === c.id || !isRipe(n)) continue;
      const h = hybridOf(c.id, n.id);
      if (!h || seeded(s.day * 977 + x * 31 + y * 7) >= chanceH) continue;
      const seed = `seed_${h.id}`;
      if (!addItem(s, seed, 2)) s.mailbox.push({ item: seed, qty: 2, from: 'Sổ lai giống' });
      if (!s.hybrids.includes(h.id)) s.hybrids.push(h.id);
      r.hybrid = CROPS[h.id].name;
      return r;
    }
  }
  return r;
}

/** Ô (x,y) thuộc cây khổng lồ nào (khóa góc trên-trái). */
export function giantAt(s: FarmState, x: number, y: number): string | null {
  for (const k of Object.keys(s.giants)) {
    const [gx, gy] = unkey(k);
    if (x >= gx && x < gx + 3 && y >= gy && y < gy + 3) return k;
  }
  return null;
}

/** Chặt cây khổng lồ bằng rìu: 15 nông sản bạc. */
export function harvestGiant(s: FarmState, k: string, slot: number): { ok: true; item: CropId; qty: number } | { ok: false; reason: string } {
  const g = s.giants[k];
  if (!g) return { ok: false, reason: 'Không có cây khổng lồ' };
  if (s.inventory[slot]?.item !== 'axe') return { ok: false, reason: `${CROPS[g.id].name} khổng lồ! Cầm rìu để bổ ra` };
  const item = CROPS[g.id].harvest;
  if (!addItem(s, item, 15, 1)) return { ok: false, reason: 'Túi đồ đầy' };
  delete s.giants[k];
  return { ok: true, item, qty: 15 };
}

/** Điểm nông trại đẹp: đồ trang trí, cây ăn trái, hoa, vật nuôi, công trình. */
export function beautyOf(s: FarmState) {
  let n = 0;
  for (const o of Object.values(s.objects)) if (isDecor(o.kind)) n += DECOR[o.kind].beauty;
  n += Object.keys(s.trees).length * 2;
  n += Object.values(s.crops).filter((c) => ['sunflower', 'chrysanthemum', 'apricot_blossom', 'peach_blossom', 'sen', 'cuc_mat_troi', 'dao_mai'].includes(c.id)).length;
  n += s.animals.length;
  n += Object.keys(s.buildings).length * 3;
  n += Object.keys(s.giants).length * 5;
  return n;
}

export const giantName = (id: CropId) => `${ITEMS[CROPS[id].harvest].name} khổng lồ`;
