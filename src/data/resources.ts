// Tài nguyên (gỗ, đá, quặng), dụng cụ nâng cấp, công thức chế tạo, máy chế biến và thành phẩm.
import ICONS from '../../assets/Custom/icons.json';
import { CROPS, ITEMS, TREES, type ItemId } from './items';

const icon = (n: keyof typeof ICONS): [string, number] => ['icons', ICONS[n]];

// ---------------------------------------------------------------- dụng cụ & vật liệu
ITEMS.axe = { id: 'axe', name: 'Rìu', kind: 'tool', sell: 0, buy: 0, icon: ['items', 1] };
ITEMS.pickaxe = { id: 'pickaxe', name: 'Cuốc chim', kind: 'tool', sell: 0, buy: 0, icon: icon('pickaxe') };
const mat = (id: string, name: string, sell: number, ic: [string, number], buy = 0) => (ITEMS[id] = { id, name, kind: 'material', sell, buy, icon: ic });
mat('wood', 'Gỗ', 2, ['items', 5], 10);
mat('stone', 'Đá', 2, ['items', 3], 20);
mat('ore_copper', 'Quặng đồng', 15, icon('ore_copper'));
mat('ore_iron', 'Quặng sắt', 25, icon('ore_iron'));
mat('ore_gold', 'Quặng vàng', 50, icon('ore_gold'));
mat('gem', 'Đá quý', 300, icon('gem'));

export type ToolId = 'hoe' | 'can' | 'axe' | 'pickaxe';
export const TOOLS: ToolId[] = ['hoe', 'can', 'axe', 'pickaxe'];
export const TIER_NAME = ['thường', 'đồng', 'sắt', 'vàng'];
/** Nâng lên cấp i+1: tiền + 5 quặng tương ứng, mất 2 ngày. */
export const TOOL_UPGRADES: { cost: number; ore: ItemId }[] = [
  { cost: 2000, ore: 'ore_copper' },
  { cost: 5000, ore: 'ore_iron' },
  { cost: 10000, ore: 'ore_gold' },
];
export const UPGRADE_DAYS = 2;
export const CAN_CAPACITY = [20, 40, 60, 100];
/** Hình dụng cụ theo cấp (nếu có vẽ riêng). */
export const TOOL_ICONS: Partial<Record<ToolId, [string, number][]>> = {
  hoe: [['items', 2], icon('hoe_copper'), icon('hoe_iron'), icon('hoe_gold')],
  can: [['items', 0], icon('can_copper'), icon('can_iron'), icon('can_gold')],
};
/** Nâng túi: 9 → 18 → 27 ô. */
export const BACKPACK = [
  { size: 18, cost: 2000 },
  { size: 27, cost: 10000 },
];

// ---------------------------------------------------------------- vật cản ngoài đồng & trong hang
export interface NodeDef {
  tool: 'axe' | 'pickaxe';
  hp: number;
  /** Cấp dụng cụ tối thiểu (gốc cây to, tảng đá lớn cần đồng). */
  minTier: number;
  drops: [ItemId, number, number][];
  /** Tỉ lệ rơi thêm (vd. quặng đồng trong đá to). */
  bonus?: [ItemId, number];
}
export const NODES: Record<string, NodeDef> = {
  bigTree: { tool: 'axe', hp: 6, minTier: 0, drops: [['wood', 10, 15]] },
  fruitTree: { tool: 'axe', hp: 6, minTier: 0, drops: [['wood', 10, 15]] },
  smallTree: { tool: 'axe', hp: 3, minTier: 0, drops: [['wood', 3, 5]] },
  bush: { tool: 'axe', hp: 1, minTier: 0, drops: [['wood', 1, 2]] },
  berryBush: { tool: 'axe', hp: 1, minTier: 0, drops: [['wood', 1, 2]] },
  stump: { tool: 'axe', hp: 5, minTier: 1, drops: [['wood', 10, 15]] },
  rock: { tool: 'pickaxe', hp: 1, minTier: 0, drops: [['stone', 2, 3]] },
  bigRock: { tool: 'pickaxe', hp: 4, minTier: 1, drops: [['stone', 10, 15]], bonus: ['ore_copper', 0.5] },
  // trong hang
  mine_rock: { tool: 'pickaxe', hp: 1, minTier: 0, drops: [['stone', 1, 2]] },
  mine_copper: { tool: 'pickaxe', hp: 2, minTier: 0, drops: [['ore_copper', 1, 2], ['stone', 0, 1]] },
  mine_iron: { tool: 'pickaxe', hp: 3, minTier: 0, drops: [['ore_iron', 1, 2], ['stone', 0, 1]] },
  mine_gold: { tool: 'pickaxe', hp: 4, minTier: 1, drops: [['ore_gold', 1, 2], ['stone', 0, 1]] },
  mine_big: { tool: 'pickaxe', hp: 3, minTier: 0, drops: [['stone', 4, 6]], bonus: ['ore_copper', 0.3] },
  mine_gem: { tool: 'pickaxe', hp: 5, minTier: 1, drops: [['gem', 1, 1], ['stone', 1, 2]] },
  forest_tree: { tool: 'axe', hp: 6, minTier: 0, drops: [['wood', 6, 10], ['go_quy', 1, 3]] },
};
/** Cây/đá bị dọn ngoài đồng mọc lại sau bấy nhiêu ngày (nếu chỗ đó còn trống). */
export const REGROW_DAYS = 7;

// ---------------------------------------------------------------- máy & chế tạo
export type MachineId = 'sprinkler' | 'sprinkler_2' | 'sprinkler_3' | 'scarecrow' | 'preserves_jar' | 'keg' | 'dehydrator' | 'mill'
  | 'tea_sifter' | 'roaster' | 'cane_press' | 'mushroom_house' | 'salt_pan';
export const MACHINES: Record<MachineId, { name: string; info: string; days?: number }> = {
  sprinkler: { name: 'Vòi tưới', info: 'tưới 4 ô kề mỗi sáng' },
  sprinkler_2: { name: 'Vòi tưới đồng', info: 'tưới 8 ô xung quanh mỗi sáng' },
  sprinkler_3: { name: 'Vòi tưới vàng', info: 'tưới 24 ô (5×5) mỗi sáng' },
  scarecrow: { name: 'Bù nhìn', info: 'đuổi quạ trong bán kính 8 ô' },
  preserves_jar: { name: 'Hũ muối', info: 'trái → mứt, rau → dưa muối · 2 ngày', days: 2 },
  keg: { name: 'Thùng ủ', info: 'trái/rau → nước ép · 3 ngày', days: 3 },
  dehydrator: { name: 'Nong phơi', info: '5 trái → 1 trái sấy · 1 ngày', days: 1 },
  mill: { name: 'Cối xay', info: 'lúa → gạo, lúa mì → bột mì · xay ngay' },
  tea_sifter: { name: 'Máy sàng chè', info: '3 búp chè → 1 gói trà khô · 1 ngày', days: 1 },
  roaster: { name: 'Lò rang cà phê', info: '3 cà phê → 1 bao cà phê rang · 2 ngày', days: 2 },
  cane_press: { name: 'Máy ép mía', info: '1 cây mía → 1 ly nước mía · 1 ngày', days: 1 },
  mushroom_house: { name: 'Nhà nấm', info: 'tự mọc 2 nấm rơm mỗi 2 ngày' },
  salt_pan: { name: 'Ruộng muối', info: 'tự làm 3 muối mỗi 2 ngày (ngày nắng)' },
};
for (const [id, m] of Object.entries(MACHINES)) ITEMS[id] = { id, name: m.name, kind: 'machine', sell: 0, buy: 0, icon: icon(id as keyof typeof ICONS) };

export interface Recipe { id: ItemId; needs: [ItemId, number][] }
export const RECIPES: Recipe[] = [
  { id: 'sprinkler', needs: [['stone', 5], ['ore_copper', 1]] },
  { id: 'sprinkler_2', needs: [['stone', 5], ['ore_copper', 1], ['ore_iron', 1]] },
  { id: 'sprinkler_3', needs: [['stone', 5], ['ore_iron', 1], ['ore_gold', 1]] },
  { id: 'scarecrow', needs: [['wood', 25], ['hay', 2]] },
  { id: 'preserves_jar', needs: [['wood', 30], ['stone', 10], ['ore_copper', 1]] },
  { id: 'keg', needs: [['wood', 30], ['ore_copper', 1], ['ore_iron', 1]] },
  { id: 'dehydrator', needs: [['wood', 20], ['stone', 20]] },
  { id: 'mill', needs: [['wood', 50], ['stone', 30], ['ore_iron', 2]] },
  { id: 'beehive', needs: [['wood', 40], ['ore_iron', 2]] },
  { id: 'compost', needs: [['hay', 5], ['wood', 5]] },
  { id: 'fertilizer_2', needs: [['compost', 2], ['fertilizer', 1]] },
  { id: 'tea_sifter', needs: [['wood', 30], ['ore_copper', 2]] },
  { id: 'roaster', needs: [['stone', 30], ['ore_iron', 2]] },
  { id: 'cane_press', needs: [['wood', 20], ['ore_iron', 3]] },
  { id: 'mushroom_house', needs: [['wood', 40], ['hay', 10]] },
  { id: 'salt_pan', needs: [['stone', 40], ['wood', 10]] },
];

/** Tầm tưới của từng loại vòi (dx,dy). */
export function sprinklerArea(kind: ItemId): [number, number][] {
  const out: [number, number][] = [];
  const r = kind === 'sprinkler_3' ? 2 : 1;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!dx && !dy) continue;
    if (kind === 'sprinkler' && dx && dy) continue;
    out.push([dx, dy]);
  }
  return out;
}
export const SCARECROW_RADIUS = 8;

// ---------------------------------------------------------------- thành phẩm
ITEMS.rice_bag = { id: 'rice_bag', name: 'Bao gạo', kind: 'artisan', sell: 110, buy: 0, icon: icon('rice_bag') };
ITEMS.flour = { id: 'flour', name: 'Bột mì', kind: 'artisan', sell: 60, buy: 0, icon: icon('flour') };
ITEMS.tra_kho = { id: 'tra_kho', name: 'Trà khô', kind: 'artisan', sell: 260, buy: 0, icon: icon('tra_kho') };
ITEMS.ca_phe_rang = { id: 'ca_phe_rang', name: 'Cà phê rang', kind: 'artisan', sell: 220, buy: 0, icon: icon('ca_phe_rang') };
ITEMS.nuoc_mia = { id: 'nuoc_mia', name: 'Nước mía', kind: 'artisan', sell: 150, buy: 0, icon: icon('nuoc_mia'), energy: 25 };
ITEMS.muoi = { id: 'muoi', name: 'Muối', kind: 'artisan', sell: 60, buy: 0, icon: icon('muoi') };
/** Máy tự làm (không cần bỏ nguyên liệu). */
export const AUTO_MACHINES: Partial<Record<MachineId, { out: ItemId; qty: number; days: number }>> = {
  mushroom_house: { out: 'nam_rom', qty: 2, days: 2 },
  salt_pan: { out: 'muoi', qty: 3, days: 2 },
};

/** Nông sản tính là "trái" (làm mứt, sấy được). */
export const FRUITY = new Set<ItemId>([...Object.values(TREES).map((t) => t.fruit), 'strawberry', 'grape', 'watermelon']);
const lower = (s: string) => s.toLowerCase();

// Đăng ký trước thành phẩm cho mọi nông sản ăn được (hoa, lúa không làm được)
for (const c of Object.values(CROPS)) {
  const it = ITEMS[c.harvest];
  if (!it.energy) continue;
  const fruit = FRUITY.has(it.id);
  ITEMS[`pres_${it.id}`] = { id: `pres_${it.id}`, name: fruit ? `Mứt ${lower(it.name)}` : `${it.name} muối`, kind: 'artisan', sell: it.sell * 2 + 50, buy: 0, icon: icon(fruit ? 'jam' : 'pickle'), energy: Math.round(it.energy * 1.5) };
  ITEMS[`juice_${it.id}`] = { id: `juice_${it.id}`, name: `Nước ép ${lower(it.name)}`, kind: 'artisan', sell: Math.round(it.sell * (fruit ? 3 : 2.25)), buy: 0, icon: icon('juice'), energy: Math.round(it.energy * 2) };
}
for (const id of FRUITY) {
  const it = ITEMS[id];
  if (!ITEMS[`pres_${id}`]) {
    ITEMS[`pres_${id}`] = { id: `pres_${id}`, name: `Mứt ${lower(it.name)}`, kind: 'artisan', sell: it.sell * 2 + 50, buy: 0, icon: icon('jam'), energy: Math.round((it.energy ?? 10) * 1.5) };
    ITEMS[`juice_${id}`] = { id: `juice_${id}`, name: `Nước ép ${lower(it.name)}`, kind: 'artisan', sell: it.sell * 3, buy: 0, icon: icon('juice'), energy: Math.round((it.energy ?? 10) * 2) };
  }
  ITEMS[`dried_${id}`] = { id: `dried_${id}`, name: `${it.name} sấy`, kind: 'artisan', sell: Math.round(it.sell * 5 * 1.5), buy: 0, icon: icon('dried'), energy: (it.energy ?? 10) * 3 };
}

/** Máy nhận món gì, ra món gì, cần bao nhiêu nguyên liệu. null = không nhận. */
export function machineOutput(machine: ItemId, input: ItemId): { out: ItemId; need: number } | null {
  switch (machine) {
    case 'preserves_jar': return ITEMS[`pres_${input}`] ? { out: `pres_${input}`, need: 1 } : null;
    case 'keg': return ITEMS[`juice_${input}`] ? { out: `juice_${input}`, need: 1 } : null;
    case 'dehydrator': return ITEMS[`dried_${input}`] ? { out: `dried_${input}`, need: 5 } : null;
    case 'mill': return input === 'rice' ? { out: 'rice_bag', need: 1 } : input === 'wheat' ? { out: 'flour', need: 1 } : null;
    case 'tea_sifter': return input === 'che' ? { out: 'tra_kho', need: 3 } : null;
    case 'roaster': return input === 'ca_phe' ? { out: 'ca_phe_rang', need: 3 } : null;
    case 'cane_press': return input === 'mia' ? { out: 'nuoc_mia', need: 1 } : null;
  }
  return null;
}
