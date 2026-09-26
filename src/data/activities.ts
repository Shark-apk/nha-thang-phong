// Mốc 8: cá, cần câu, món ăn & công thức, bộ sưu tập đình làng, lễ hội.
import ICONS from '../../assets/Custom/icons.json';
import { ITEMS, type ItemId, type Season } from './items';

const icon = (n: keyof typeof ICONS): [string, number] => ['icons', ICONS[n]];
const ALL: Season[] = ['spring', 'summer', 'fall', 'winter'];

// ---------------------------------------------------------------- cá
export type Water = 'pond' | 'river' | 'sea';
export interface FishDef {
  id: ItemId;
  name: string;
  seasons: Season[];
  where: Water[];
  /** Giờ cắn câu [từ, đến) theo phút; đến > 24h = qua đêm. */
  hours: [number, number];
  /** Độ khó 0–100: cá càng khó càng giật mạnh. */
  diff: number;
  sell: number;
  /** Cần cờ mở khóa (cá huyền thoại). */
  flag?: string;
}
const H = (h: number) => h * 60;
// [id, tên, mùa, nơi, giờ, độ khó, giá, icon]
const FISH_ROWS: [ItemId, string, Season[], Water[], [number, number], number, number, keyof typeof ICONS][] = [
  ['fish', 'Cá rô', ALL, ['pond', 'river'], [H(6), H(26)], 20, 75, 'fish'],
  ['ca_tre', 'Cá trê', ['spring', 'summer', 'fall'], ['pond'], [H(17), H(26)], 35, 110, 'fish_tre'],
  ['ca_loc', 'Cá lóc', ALL, ['pond', 'river'], [H(6), H(19)], 45, 150, 'fish_loc'],
  ['ca_chep', 'Cá chép', ['spring', 'fall'], ['river', 'pond'], [H(6), H(26)], 40, 120, 'fish_chep'],
  ['ca_tram', 'Cá trắm', ['summer', 'fall'], ['river'], [H(6), H(18)], 50, 180, 'fish_tram'],
  ['ca_me', 'Cá mè', ['spring', 'summer'], ['river'], [H(6), H(26)], 30, 90, 'fish_me'],
  ['ca_basa', 'Cá ba sa', ALL, ['river'], [H(6), H(26)], 35, 130, 'fish_basa'],
  ['ca_linh', 'Cá linh', ['fall'], ['river'], [H(6), H(18)], 25, 100, 'fish_linh'],
  ['luon', 'Lươn', ['summer', 'fall'], ['pond'], [H(18), H(26)], 55, 200, 'luon'],
  ['tom_cang', 'Tôm càng', ['summer'], ['river'], [H(6), H(18)], 40, 220, 'tom_cang'],
  ['cua_dong', 'Cua đồng', ['spring', 'summer'], ['pond'], [H(6), H(26)], 30, 140, 'cua_dong'],
  ['ca_bong', 'Cá bống', ['winter', 'spring'], ['river'], [H(6), H(26)], 25, 85, 'fish_bong'],
  ['ca_ro_phi', 'Cá rô phi', ALL, ['pond'], [H(6), H(26)], 20, 70, 'fish_ro_phi'],
  ['ca_thu', 'Cá thu', ['summer', 'fall'], ['sea'], [H(6), H(18)], 55, 240, 'fish_thu'],
  ['ca_ngu', 'Cá ngừ', ['summer'], ['sea'], [H(6), H(18)], 70, 400, 'fish_ngu'],
  ['muc', 'Mực', ['fall', 'winter'], ['sea'], [H(18), H(26)], 60, 300, 'muc'],
  ['ca_nuc', 'Cá nục', ['spring', 'summer', 'fall'], ['sea'], [H(6), H(26)], 30, 110, 'fish_nuc'],
  ['ca_keo', 'Cá kèo', ['winter'], ['sea', 'pond'], [H(6), H(26)], 35, 120, 'fish_keo'],
  ['ca_bac_ma', 'Cá bạc má', ['winter'], ['sea'], [H(6), H(18)], 45, 180, 'fish_bac_ma'],
  ['ca_chep_vang', 'Cá chép vàng', ['spring'], ['river'], [H(6), H(18)], 90, 2000, 'fish_chep_vang'],
];
export const FISH: FishDef[] = FISH_ROWS.map(([id, name, seasons, where, hours, diff, sell, ic]) => {
  ITEMS[id] = { id, name, kind: 'fish', sell, buy: 0, icon: icon(ic), energy: Math.round(sell / 8) };
  return { id, name, seasons, where, hours, diff, sell, flag: id === 'ca_chep_vang' ? 'legend_fish' : undefined };
});
// Cá rô vẫn giữ hình cũ từ ao cá
ITEMS.fish.kind = 'fish';

/** Cần câu: vùng xanh càng to càng dễ giữ cá. */
export const RODS: Record<ItemId, { name: string; bar: number; price: number }> = {
  rod: { name: 'Cần câu tre', bar: 0.28, price: 500 },
  rod_2: { name: 'Cần câu sợi', bar: 0.36, price: 1800 },
  rod_3: { name: 'Cần câu xịn', bar: 0.46, price: 5000 },
};
ITEMS.rod_2 = { id: 'rod_2', name: RODS.rod_2.name, kind: 'tool', sell: 0, buy: RODS.rod_2.price, icon: icon('rod_2') };
ITEMS.rod_3 = { id: 'rod_3', name: RODS.rod_3.name, kind: 'tool', sell: 0, buy: RODS.rod_3.price, icon: icon('rod_3') };
ITEMS.rod.buy = RODS.rod.price;
export const FISH_ENERGY = 4;

// ---------------------------------------------------------------- nấu ăn
export interface Dish { id: ItemId; name: string; needs: [ItemId, number][]; energy: number; sell: number; flag?: string; icon: keyof typeof ICONS }
export const DISHES: Dish[] = [
  { id: 'com_trang', name: 'Cơm trắng', needs: [['rice_bag', 1]], energy: 45, sell: 150, icon: 'dish_com' },
  { id: 'trung_chien', name: 'Trứng chiên', needs: [['egg', 2]], energy: 45, sell: 130, icon: 'dish_trung' },
  { id: 'ca_kho', name: 'Cá kho tộ', needs: [['fish', 2], ['chili', 1]], energy: 80, sell: 300, icon: 'dish_ca_kho' },
  { id: 'rau_muong_xao', name: 'Rau muống xào tỏi', needs: [['water_spinach', 2], ['garlic', 1]], energy: 55, sell: 160, icon: 'dish_rau_xao' },
  { id: 'banh_bi', name: 'Bánh bí ngô', needs: [['pumpkin', 1], ['flour', 1], ['egg', 1]], energy: 100, sell: 480, icon: 'dish_banh_bi' },
  { id: 'che_khoai', name: 'Chè khoai lang', needs: [['sweet_potato', 2], ['honey', 1]], energy: 75, sell: 280, icon: 'dish_che' },
  { id: 'canh_chua', name: 'Canh chua cá', needs: [['fish', 1], ['tomato', 2]], energy: 90, sell: 320, flag: 'recipe_canh_chua', icon: 'dish_canh_chua' },
  { id: 'banh_chung', name: 'Bánh chưng', needs: [['rice_bag', 2], ['milk', 1]], energy: 120, sell: 520, icon: 'dish_banh_chung' },
  { id: 'banh_trung_thu', name: 'Bánh trung thu', needs: [['flour', 1], ['duck_egg', 1], ['honey', 1]], energy: 110, sell: 500, icon: 'dish_banh_trung_thu' },
];
for (const d of DISHES) ITEMS[d.id] = { id: d.id, name: d.name, kind: 'dish', sell: d.sell, buy: 0, icon: icon(d.icon), energy: d.energy };
/** Nâng nhà có bếp (mua ở lò rèn bác Năm). */
export const KITCHEN = { cost: 8000, wood: 100 };

// ---------------------------------------------------------------- đình làng: 4 bộ sưu tập
export interface Bundle { id: string; name: string; needs: [ItemId, number][]; reward: string; flag: string }
export const BUNDLES: Bundle[] = [
  { id: 'garden', name: 'Vườn bốn mùa', needs: [['carrot', 5], ['tomato', 5], ['pumpkin', 2], ['kohlrabi', 3]], reward: '4 vòi tưới vàng', flag: 'b_garden' },
  { id: 'barn', name: 'Chuồng đầy', needs: [['egg', 10], ['milk', 5], ['wool', 2], ['honey', 3]], reward: 'Máy ấp: chuồng chứa gấp đôi', flag: 'b_barn' },
  { id: 'craft', name: 'Thợ khéo', needs: [['wood', 99], ['stone', 99], ['rice_bag', 5], ['ore_iron', 10]], reward: 'Xe bò chở hàng: bán được thêm 10%', flag: 'b_craft' },
  { id: 'river', name: 'Sông nước', needs: [['fish', 3], ['ca_loc', 2], ['ca_chep', 1], ['tom_cang', 1]], reward: 'Nhà kính trên nông trại (trồng quanh năm)', flag: 'b_river' },
];

// ---------------------------------------------------------------- lễ hội
export interface Festival {
  id: string;
  name: string;
  season: Season;
  day: number;
  /** Giờ hội [bắt đầu, kết thúc]. */
  hours: [number, number];
  full?: boolean;
  intro: string;
  /** Quà mỗi người nhận một lần khi dự hội. */
  gift?: [ItemId, number];
  /** Hàng bán riêng trong hội. */
  shop?: ItemId[];
}
export const FESTIVALS: Festival[] = [
  { id: 'tet', name: 'Tết Nguyên Đán', season: 'spring', day: 3, hours: [H(8), H(16)], full: true, intro: 'Cả làng tụ họp ở đình ăn Tết! Nói chuyện với người lớn để nhận lì xì, chơi bầu cua ở sân đình.', shop: ['banh_chung', 'seed_apricot_blossom', 'seed_peach_blossom'] },
  { id: 'hoi_hoa', name: 'Hội hoa xuân', season: 'spring', day: 10, hours: [H(9), H(15)], intro: 'Làng bày hoa khắp sân đình. Ai mang hoa tới tặng được thưởng.', gift: ['seed_sunflower', 5] },
  { id: 'doan_ngo', name: 'Tết Đoan Ngọ', season: 'summer', day: 5, hours: [H(7), H(12)], intro: 'Mùng năm tháng năm, cả làng ăn trái cây giết sâu bọ.', gift: ['lychee', 3] },
  { id: 'dua_ghe', name: 'Hội đua ghe', season: 'summer', day: 12, hours: [H(9), H(15)], intro: 'Ghe đua trên sông, dân làng ra bến cổ vũ.', gift: ['fish', 3] },
  { id: 'vu_lan', name: 'Lễ Vu Lan', season: 'fall', day: 3, hours: [H(8), H(14)], intro: 'Mùa báo hiếu. Dân làng lên đình thắp hương.', gift: ['chrysanthemum', 1] },
  { id: 'trung_thu', name: 'Tết Trung Thu', season: 'fall', day: 8, hours: [H(17), H(23)], full: true, intro: 'Đêm rằm, trẻ con rước đèn quanh gốc đa! Mua đèn ông sao, tặng bánh trung thu được gấp ba tim.', shop: ['star_lantern', 'banh_trung_thu'] },
  { id: 'com_moi', name: 'Lễ cơm mới', season: 'fall', day: 12, hours: [H(9), H(15)], intro: 'Mừng mùa gặt, cả làng nấu nồi cơm mới đầu tiên.', gift: ['rice_bag', 2] },
  { id: 'ong_tao', name: 'Tiễn ông Táo', season: 'winter', day: 13, hours: [H(9), H(15)], intro: 'Hai mươi ba tháng chạp, thả cá chép tiễn ông Táo về trời.', gift: ['ca_chep', 1] },
];
// Hàng bán trong hội
ITEMS.star_lantern = { id: 'star_lantern', name: 'Đèn ông sao', kind: 'product', sell: 40, buy: 120, icon: icon('star_lantern') };
// Bánh bán trong hội (ngoài hội phải tự nấu)
ITEMS.banh_chung.buy = 400;
ITEMS.banh_trung_thu.buy = 350;

/** Bầu cua tôm cá: 6 mặt xúc xắc. */
export const BAU_CUA: { id: string; name: string; icon: keyof typeof ICONS }[] = [
  { id: 'nai', name: 'Nai', icon: 'bc_nai' }, { id: 'bau', name: 'Bầu', icon: 'bc_bau' }, { id: 'ga', name: 'Gà', icon: 'bc_ga' },
  { id: 'ca', name: 'Cá', icon: 'bc_ca' }, { id: 'cua', name: 'Cua', icon: 'bc_cua' }, { id: 'tom', name: 'Tôm', icon: 'bc_tom' },
];
