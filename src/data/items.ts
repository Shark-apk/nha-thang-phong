// Dữ liệu nội dung game. Thêm cây/đồ mới = thêm 1 dòng vào bảng; hình lấy từ spritesheet tương ứng.
import ICONS from '../../assets/Custom/icons.json';
import SEASON_ROWS from '../../assets/Custom/crops_season.json';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];
export const SEASON_NAME: Record<Season, string> = { spring: 'Xuân', summer: 'Hạ', fall: 'Thu', winter: 'Đông' };

export type ItemId = string;
export type CropId = string;

export type ItemKind = 'tool' | 'seed' | 'crop' | 'fruit' | 'sapling' | 'fertilizer' | 'material' | 'product' | 'artisan' | 'machine' | 'fish' | 'dish' | 'animal_food';

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: ItemKind;
  /** Giá bán ở thùng giao hàng (0 = không bán được). */
  sell: number;
  /** Giá mua ở cửa hàng (0 = không bán). */
  buy: number;
  /** Ô hình trong spritesheet: [tên texture, frame 16×16]. */
  icon: [string, number];
  /** Hạt giống → cây trồng ra. */
  crop?: CropId;
  /** Cây giống → cây ăn trái. */
  tree?: string;
  /** Ăn được: hồi bao nhiêu sức. */
  energy?: number;
  /** Giống lai: xoay màu icon (độ, CSS hue-rotate). */
  hue?: number;
}

export interface CropDef {
  id: CropId;
  name: string;
  seasons: Season[];
  /** Số ngày được tưới cần có để lên mỗi giai đoạn; phần tử cuối = chín. */
  stageDays: number[];
  /** Thu xong mọc lại, bao nhiêu ngày thì chín tiếp (không có = thu 1 lần). */
  regrow?: number;
  /** Chỉ trồng trên ruộng nước (lúa, rau muống). */
  paddy?: boolean;
  sheet: 'plants' | 'crops' | 'season';
  frames: number[];
  harvest: ItemId;
  yield: number;
  /** Giống lai: nhuộm màu hình cây (Phaser tint). */
  tint?: number;
  /** Chỉ trồng được ở vườn trên mây. */
  sky?: boolean;
}

export interface TreeDef {
  id: string;
  name: string;
  seasons: Season[];
  fruit: ItemId;
  /** Ngày để cây giống thành cây ra trái. */
  grow: number;
}

const icon = (name: keyof typeof ICONS): [string, number] => ['icons', ICONS[name]];

/** 4 mốc ngày cho 4 giai đoạn (mầm → lá → ra hoa → chín) từ tổng số ngày. */
const stagesOf = (days: number) => [0, Math.max(1, Math.round(days * 0.3)), Math.max(2, Math.round(days * 0.65)), days];

export const ITEMS: Record<ItemId, ItemDef> = {
  hoe: { id: 'hoe', name: 'Cuốc', kind: 'tool', sell: 0, buy: 0, icon: ['items', 2] },
  can: { id: 'can', name: 'Bình tưới', kind: 'tool', sell: 0, buy: 0, icon: ['items', 0] },
  fertilizer: { id: 'fertilizer', name: 'Phân bón', kind: 'fertilizer', sell: 0, buy: 20, icon: icon('rice_bag') },
  fertilizer_2: { id: 'fertilizer_2', name: 'Phân tốt', kind: 'fertilizer', sell: 0, buy: 80, icon: icon('fertilizer_2') },
  compost: { id: 'compost', name: 'Phân hữu cơ', kind: 'fertilizer', sell: 0, buy: 0, icon: icon('compost') },
};
export const CROPS: Record<CropId, CropDef> = {};
export const TREES: Record<string, TreeDef> = {};

// ---------------------------------------------------------------- cây trồng
// [id, tên, mùa, ngày chín, mọc lại, giá hạt, giá bán, sản lượng, hồi sức, ruộng nước]
type Row = [string, string, Season[], number, number | 0, number, number, number, number, boolean?];
const ORIGINAL: Row[] = [
  ['wheat', 'Lúa mì', ['summer', 'fall'], 3, 0, 10, 25, 1, 0],
  ['beet', 'Củ dền', ['fall'], 5, 0, 20, 60, 1, 10],
];
const DRAWN: Row[] = [
  ['carrot', 'Cà rốt', ['spring'], 4, 0, 15, 40, 1, 8],
  ['tomato', 'Cà chua', ['summer'], 6, 3, 30, 45, 2, 12],
  ['pumpkin', 'Bí ngô', ['fall'], 8, 0, 50, 220, 1, 20],
  ['strawberry', 'Dâu tây', ['spring'], 5, 3, 40, 45, 2, 15],
];
const SEASONAL: Row[] = [
  ['radish', 'Củ cải trắng', ['spring'], 4, 0, 12, 35, 1, 6],
  ['cabbage', 'Cải bắp', ['spring'], 8, 0, 40, 150, 1, 15],
  ['potato', 'Khoai tây', ['spring'], 6, 0, 25, 70, 2, 10],
  ['water_spinach', 'Rau muống', ['spring', 'summer'], 3, 2, 10, 20, 1, 5, true],
  ['watermelon', 'Dưa hấu', ['summer'], 10, 0, 80, 320, 1, 25],
  ['corn', 'Bắp', ['summer', 'fall'], 8, 4, 40, 60, 1, 10],
  ['chili', 'Ớt', ['summer'], 5, 3, 20, 30, 1, 3],
  ['cucumber', 'Dưa leo', ['summer'], 5, 2, 20, 30, 1, 8],
  ['rice', 'Lúa nước', ['summer'], 10, 0, 20, 45, 3, 0, true],
  ['sweet_potato', 'Khoai lang', ['fall'], 6, 0, 25, 80, 1, 12],
  ['eggplant', 'Cà tím', ['fall'], 5, 4, 20, 60, 1, 10],
  ['grape', 'Nho', ['fall'], 10, 3, 60, 80, 2, 12],
  ['sunflower', 'Hướng dương', ['summer', 'fall'], 7, 0, 30, 80, 1, 0],
  ['kohlrabi', 'Su hào', ['winter'], 5, 0, 25, 85, 1, 10],
  ['garlic', 'Tỏi', ['winter'], 6, 0, 20, 75, 1, 5],
  ['scallion', 'Hành lá', ['winter'], 3, 2, 10, 20, 1, 3],
  ['chrysanthemum', 'Hoa cúc', ['winter'], 6, 0, 30, 90, 1, 0],
  ['apricot_blossom', 'Hoa mai', ['winter'], 12, 0, 100, 400, 1, 0],
  ['peach_blossom', 'Hoa đào', ['winter'], 12, 0, 100, 400, 1, 0],
];

function addCrop(r: Row, sheet: CropDef['sheet'], seedIcon: [string, number], cropIcon: [string, number], frames: number[]) {
  const [id, name, seasons, days, regrow, seed, sell, yld, energy, paddy] = r;
  const isFlower = energy === 0 && !['wheat', 'rice', 'sunflower'].includes(id);
  CROPS[id] = {
    id, name, seasons, stageDays: stagesOf(days), regrow: regrow || undefined, paddy: paddy || undefined,
    sheet, frames, harvest: id, yield: yld,
  };
  ITEMS[`seed_${id}`] = { id: `seed_${id}`, name: `Hạt ${name.toLowerCase()}`, kind: 'seed', sell: 0, buy: seed, icon: seedIcon, crop: id };
  ITEMS[id] = { id, name, kind: 'crop', sell, buy: 0, icon: cropIcon, energy: energy || undefined };
  if (isFlower) ITEMS[id].kind = 'crop';
}

ORIGINAL.forEach((r, i) => addCrop(r, 'plants', ['plants', i * 6], ['plants', i * 6 + 5], [1, 2, 3, 4].map((f) => i * 6 + f)));
// Lúa mì gốc chín nhanh hơn công thức chung
CROPS.wheat.stageDays = [0, 1, 2, 3];
CROPS.beet.stageDays = [0, 2, 3, 5];
DRAWN.forEach((r, i) => addCrop(r, 'crops', ['crops', i * 6], ['crops', i * 6 + 5], [1, 2, 3, 4].map((f) => i * 6 + f)));
for (const r of SEASONAL) {
  const row = (SEASON_ROWS as string[]).indexOf(r[0]);
  if (row === -1) throw new Error(`Thiếu hình giai đoạn cho ${r[0]} — chạy tools/draw_crop_stages.py`);
  addCrop(r, 'season', ['season', row * 6], ['season', row * 6 + 5], [1, 2, 3, 4].map((f) => row * 6 + f));
}

// ---------------------------------------------------------------- mốc 17: cây mới theo vùng
const M17: Row[] = [
  ['che', 'Chè', ['spring', 'summer', 'fall'], 8, 3, 60, 70, 1, 0],
  ['ca_phe', 'Cà phê', ['summer', 'fall'], 10, 4, 80, 45, 3, 0],
  ['ho_tieu', 'Hồ tiêu', ['summer'], 10, 4, 70, 50, 3, 0],
  ['mia', 'Mía', ['summer', 'fall'], 9, 0, 40, 90, 2, 8],
  ['nep_nuong', 'Lúa nếp nương', ['fall'], 10, 0, 30, 55, 3, 0],
  ['mang_tay', 'Măng tây', ['spring'], 7, 3, 60, 70, 1, 10],
  ['nam_rom', 'Nấm rơm', ['fall', 'winter'], 5, 0, 30, 60, 1, 8],
  ['muop_dang', 'Mướp đắng', ['summer'], 6, 3, 30, 40, 1, 5],
  ['muop', 'Mướp', ['summer'], 6, 3, 25, 35, 1, 6],
  ['dau_dua', 'Đậu đũa', ['spring', 'summer'], 5, 2, 25, 25, 1, 5],
  ['dau_phong', 'Đậu phộng', ['spring', 'summer'], 7, 0, 25, 30, 3, 6],
  ['khoai_mon', 'Khoai môn', ['fall'], 8, 0, 35, 110, 1, 12],
  ['sen', 'Sen', ['summer'], 9, 0, 60, 200, 1, 0, true],
  ['ot_chuong', 'Ớt chuông', ['summer'], 6, 3, 40, 50, 1, 6],
  ['bi_dao', 'Bí đao', ['winter'], 8, 0, 40, 150, 1, 10],
  ['rau_den', 'Rau dền', ['spring', 'summer'], 3, 2, 10, 20, 1, 4],
];
for (const r of M17) {
  const row = (SEASON_ROWS as string[]).indexOf(r[0]);
  if (row === -1) throw new Error(`Thiếu hình giai đoạn cho ${r[0]} — chạy tools/draw_crop_stages.py`);
  addCrop(r, 'season', ['season', row * 6], ['season', row * 6 + 5], [1, 2, 3, 4].map((f) => row * 6 + f));
}
/** Cây leo giàn: chặn lối đi, thu thêm 1. Đất: đỏ bắt buộc / cát, sét lớn nhanh hơn. Cây khổng lồ 3×3. */
export const TRELLIS = new Set<CropId>(['cucumber', 'grape', 'ho_tieu', 'muop_dang', 'muop', 'dau_dua']);
export const RED_ONLY = new Set<CropId>(['ca_phe', 'ho_tieu']);
export const SAND_LOVERS = new Set<CropId>(['potato', 'sweet_potato', 'watermelon', 'dau_phong', 'bi_dao']);
export const CLAY_LOVERS = new Set<CropId>(['khoai_mon', 'rice', 'water_spinach', 'cabbage']);
export const GIANT = new Set<CropId>(['watermelon', 'pumpkin', 'cabbage', 'bi_dao']);
export type SoilType = 'loam' | 'sand' | 'clay' | 'red';
export const SOIL_NAME: Record<SoilType, string> = { loam: 'Đất thịt', sand: 'Đất cát', clay: 'Đất sét', red: 'Đất đỏ' };

// ---------------------------------------------------------------- giống lai (hai cây khác loại chín cạnh nhau)
// [id, tên, mùa, ngày, mọc lại, giá, hồi sức, cha, mẹ, xoay màu icon, nhuộm hình cây]
const HYBRID_ROWS: [string, string, Season[], number, number, number, number, CropId, CropId, number, number][] = [
  ['bap_cau_vong', 'Bắp cầu vồng', ['summer', 'fall'], 8, 4, 90, 12, 'corn', 'sunflower', 200, 0xf0a0ff],
  ['dua_khong_hat', 'Dưa hấu không hạt', ['summer'], 10, 0, 330, 25, 'watermelon', 'grape', 60, 0xd0ffa0],
  ['ca_chua_ot', 'Cà chua ớt', ['summer'], 6, 3, 70, 10, 'tomato', 'chili', 30, 0xffc080],
  ['ca_rot_trang', 'Cà rốt trắng', ['spring'], 4, 0, 80, 10, 'carrot', 'radish', 180, 0xfff0e0],
  ['bap_cai_tim', 'Bắp cải tím', ['spring', 'winter'], 8, 0, 220, 15, 'cabbage', 'kohlrabi', 250, 0xd0a0ff],
  ['khoai_tim', 'Khoai tím', ['spring', 'fall'], 6, 0, 150, 12, 'potato', 'sweet_potato', 270, 0xc090ff],
  ['dau_ngot', 'Dâu ngọt', ['spring', 'summer'], 5, 3, 65, 15, 'strawberry', 'watermelon', 320, 0xffa0c0],
  ['bi_ca', 'Bí cà', ['fall'], 8, 0, 300, 20, 'pumpkin', 'eggplant', 240, 0xe0a0ff],
  ['hanh_toi', 'Hành tỏi', ['winter'], 5, 0, 90, 8, 'garlic', 'scallion', 90, 0xc0ffc0],
  ['cuc_mat_troi', 'Cúc mặt trời', ['summer', 'fall', 'winter'], 7, 0, 150, 0, 'chrysanthemum', 'sunflower', 40, 0xffe080],
  ['dao_mai', 'Đào mai', ['winter'], 12, 0, 330, 0, 'peach_blossom', 'apricot_blossom', 30, 0xffd0a0],
  ['nho_dau', 'Nho dâu', ['spring', 'fall'], 10, 3, 90, 12, 'grape', 'strawberry', 300, 0xffa0d0],
];
export const HYBRIDS: { id: CropId; a: CropId; b: CropId }[] = [];
for (const [id, name, seasons, days, regrow, sell, energy, a, b, hue, tint] of HYBRID_ROWS) {
  const pa = CROPS[a];
  CROPS[id] = { ...pa, id, name, seasons, stageDays: stagesOf(days), regrow: regrow || undefined, paddy: undefined, harvest: id, yield: 1, tint };
  ITEMS[`seed_${id}`] = { id: `seed_${id}`, name: `Hạt ${name.toLowerCase()}`, kind: 'seed', sell: 0, buy: 0, icon: ITEMS[`seed_${a}`].icon, crop: id, hue };
  ITEMS[id] = { id, name, kind: 'crop', sell, buy: 0, icon: ITEMS[pa.harvest].icon, energy: energy || undefined, hue };
  HYBRIDS.push({ id, a, b });
}
/** Giống lai của hai cây (không kể thứ tự). */
export const hybridOf = (x: CropId, y: CropId) => HYBRIDS.find((h) => (h.a === x && h.b === y) || (h.a === y && h.b === x));

// ---------------------------------------------------------------- cây ăn trái
// [id, tên, mùa ra trái, giá cây giống, giá trái, hồi sức]
const FRUIT_TREES: [keyof typeof ICONS, string, Season[], number, number, number][] = [
  ['mango', 'Xoài', ['summer'], 500, 120, 15],
  ['lychee', 'Vải', ['summer'], 400, 90, 10],
  ['dragon_fruit', 'Thanh long', ['summer', 'fall'], 600, 110, 12],
  ['pomelo', 'Bưởi', ['fall'], 600, 150, 15],
  ['orange', 'Cam', ['winter'], 450, 80, 12],
  ['banana', 'Chuối', ['spring', 'summer', 'fall', 'winter'], 700, 60, 10],
  // mốc 17
  ['sau_rieng', 'Sầu riêng', ['summer'], 900, 280, 20],
  ['dua', 'Dừa', ['spring', 'summer', 'fall', 'winter'], 800, 70, 12],
  ['mit', 'Mít', ['summer', 'fall'], 800, 180, 15],
  ['man', 'Mận', ['spring'], 500, 100, 10],
];
for (const [id, name, seasons, price, sell, energy] of FRUIT_TREES) {
  TREES[id] = { id, name, seasons, fruit: id, grow: 28 };
  ITEMS[`sapling_${id}`] = { id: `sapling_${id}`, name: `Cây giống ${name.toLowerCase()}`, kind: 'sapling', sell: 0, buy: price, icon: icon(id), tree: id };
  ITEMS[id] = { id, name, kind: 'fruit', sell, buy: 0, icon: icon(id), energy };
}

/** Hàng bày ở quầy hạt giống theo mùa. */
export function shopFor(season: Season): ItemId[] {
  const seeds = Object.values(ITEMS).filter((i) => i.kind === 'seed' && i.buy > 0 && !CROPS[i.crop!].sky && CROPS[i.crop!].seasons.includes(season)).map((i) => i.id);
  const saplings = Object.values(ITEMS).filter((i) => i.kind === 'sapling').map((i) => i.id);
  return [...seeds, 'fertilizer', 'fertilizer_2', ...saplings];
}

/** Giữ để tương thích: mọi hạt có bán (không lọc mùa). */
export const SHOP: ItemId[] = Object.values(ITEMS).filter((i) => i.buy > 0).map((i) => i.id);

export const QUALITY_MULT = [1, 1.25, 1.5, 2];
export const QUALITY_NAME = ['Thường', 'Bạc', 'Vàng', 'Kim cương'];
