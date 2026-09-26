// Mốc 18: đồ ở rừng, biển, vườn trên mây; kiếm gỗ; cá rạn san hô.
import ICONS from '../../assets/Custom/icons.json';
import { CROPS, ITEMS, type ItemId, type Season } from './items';
import { FISH } from './activities';

const icon = (n: keyof typeof ICONS): [string, number] => ['icons', ICONS[n]];
const add = (id: string, name: string, kind: 'product' | 'material' | 'tool', sell: number, ic: keyof typeof ICONS, energy?: number) => {
  ITEMS[id] = { id, name, kind, sell, buy: 0, icon: icon(ic), energy };
};

// Rừng
add('nam_rung', 'Nấm rừng', 'product', 80, 'nam_rung', 12);
add('mang', 'Măng tre', 'product', 50, 'mang', 8);
add('mat_ong_rung', 'Mật ong rừng', 'product', 260, 'mat_ong_rung', 25);
add('go_quy', 'Gỗ quý', 'material', 60, 'go_quy');
/** Đồ mọc trong rừng mỗi ngày (tỉ lệ tương đối). */
export const FORAGE: [ItemId, number][] = [['nam_rung', 5], ['mang', 6], ['mat_ong_rung', 1], ['truffle', 1], ['honey', 2]];

// Biển
add('rac', 'Rác biển', 'material', 0, 'rac');
add('vo_so', 'Vỏ sò', 'product', 60, 'vo_so');
add('nhim_bien', 'Nhím biển', 'product', 150, 'nhim_bien', 15);
add('ngoc_trai', 'Ngọc trai', 'product', 1500, 'ngoc_trai');
add('san_ho', 'San hô', 'product', 100, 'san_ho');
/** Lặn một lần được gì (tỉ lệ tương đối). */
export const DIVE_LOOT: [ItemId, number][] = [['rac', 45], ['vo_so', 30], ['nhim_bien', 15], ['san_ho', 6], ['ngoc_trai', 4]];
export const DIVE_ENERGY = 10;
/** Góp bấy nhiêu rác cho trạm cứu hộ thì rạn san hô hồi sinh (mở cá mới). */
export const REEF_TRASH = 30;
const REEF_FISH: [ItemId, string, Season[], number, number, keyof typeof ICONS][] = [
  ['ca_mu', 'Cá mú', ['summer', 'fall'], 60, 350, 'fish_mu'],
  ['ca_hong', 'Cá hồng', ['spring', 'summer', 'fall', 'winter'], 45, 220, 'fish_hong'],
  ['ca_duoi', 'Cá đuối', ['winter', 'spring'], 70, 420, 'fish_duoi'],
];
for (const [id, name, seasons, diff, sell, ic] of REEF_FISH) {
  ITEMS[id] = { id, name, kind: 'fish', sell, buy: 0, icon: icon(ic), energy: Math.round(sell / 8) };
  FISH.push({ id, name, seasons, where: ['sea'], hours: [6 * 60, 26 * 60], diff, sell, flag: 'reef' });
}

// Hang sâu
ITEMS.sword = { id: 'sword', name: 'Kiếm gỗ', kind: 'tool', sell: 0, buy: 800, icon: icon('sword') };

// Vườn trên mây: cây mọc mọi mùa, chỉ trồng được trên mây
const ALL: Season[] = ['spring', 'summer', 'fall', 'winter'];
const SKY_ROWS: [string, string, string, number, number, number, number, number, number][] = [
  // id, tên, cây gốc (mượn hình), ngày, mọc lại, giá hạt, giá bán, nhuộm hình, xoay màu icon
  ['dau_may', 'Dâu mây', 'strawberry', 5, 3, 60, 80, 0xd0e8ff, 200],
  ['bi_may', 'Bí mây', 'pumpkin', 8, 0, 100, 300, 0xe0d0ff, 240],
  ['lua_troi', 'Lúa trời', 'wheat', 4, 0, 20, 60, 0xfff0a0, 40],
];
export const SKY_SEEDS: ItemId[] = [];
for (const [id, name, base, days, regrow, seed, sell, tint, hue] of SKY_ROWS) {
  const b = CROPS[base];
  const st = [0, Math.max(1, Math.round(days * 0.3)), Math.max(2, Math.round(days * 0.65)), days];
  CROPS[id] = { ...b, id, name, seasons: ALL, stageDays: st, regrow: regrow || undefined, paddy: undefined, harvest: id, yield: 1, tint, sky: true };
  ITEMS[`seed_${id}`] = { id: `seed_${id}`, name: `Hạt ${name.toLowerCase()}`, kind: 'seed', sell: 0, buy: seed, icon: ITEMS[`seed_${base}`].icon, crop: id, hue };
  ITEMS[id] = { id, name, kind: 'crop', sell, buy: 0, icon: ITEMS[b.harvest].icon, energy: 15, hue };
  SKY_SEEDS.push(`seed_${id}`);
}
