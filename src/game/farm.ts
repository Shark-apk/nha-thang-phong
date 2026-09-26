// Trạng thái & luật nông trại — thuần TypeScript, không phụ thuộc Phaser, để test và lưu game dễ.
import { dishEnergyMult, emptySkills, has, maxEnergyOf, sellMult, skillLevel, worn, type SkillId } from './skills';
import { emit } from './bus';
import { CLAY_LOVERS, CROPS, ITEMS, QUALITY_MULT, RED_ONLY, SAND_LOVERS, SEASONS, TREES, TRELLIS, type BuildingId, type CropId, type ItemId, type Season, type SoilType, type ToolId } from '../data';
import { nightCrops, type CropNight } from './farming2';
import { grazingToday, nightAnimals, type Animal, type AnimalNight, type Beehive, type Building } from './animals';
import { maxWater, nightResources, type MineState, type PlacedObject, type ResourceNight } from './resources';
import type { NpcState } from './villagers';
import { isGreenhouseKey, shipBonus } from './activities';
import { emptyStats, type Stats } from './quests';

export const DAY_START = 6 * 60; // 6:00
export const DAY_END = 26 * 60; // 2:00 sáng hôm sau → ngất
export const MAX_ENERGY = 100;
export const HOTBAR = 9;
export const SEASON_DAYS = 14;
/** Nước của bình tưới cấp thường; cấp cao hơn xem maxWater() trong resources.ts. */
export const MAX_WATER = 20;
export const ENERGY_COST: Partial<Record<ItemId, number>> = { hoe: 3, can: 2 };

export type Weather = 'sunny' | 'rain' | 'storm' | 'windy' | 'snow';
export const WEATHER_NAME: Record<Weather, string> = { sunny: 'Nắng', rain: 'Mưa', storm: 'Giông', windy: 'Gió mùa', snow: 'Tuyết' };

export interface Crop {
  id: CropId;
  /** Số ngày đã được tưới kể từ khi gieo. */
  grown: number;
  /** Bị sâu: không lớn, bắt sâu (bấm vào) mới lớn tiếp. */
  pest?: boolean;
}

export interface Tree {
  id: string;
  /** Số ngày tuổi; đủ TREES[id].grow thì ra trái. */
  age: number;
  fruit: number;
}

export interface Slot {
  item: ItemId;
  qty: number;
  /** Chất lượng 0 thường · 1 bạc · 2 vàng (nông sản). */
  q?: number;
}

export interface Soil {
  watered: boolean;
  /** Ruộng nước: luôn ướt, chỉ trồng lúa / rau muống. */
  paddy?: boolean;
  /** Đã bón phân (true/1) hoặc phân tốt (2): tăng tỉ lệ chất lượng. */
  fert?: boolean | number;
  /** Loại đất (không có = đất thịt). */
  soil?: SoilType;
}

export type FarmMap = 'plain' | 'coast' | 'tea' | 'highland' | 'delta';

export type LocationId = 'farm' | 'house' | 'coop' | 'barn' | 'shed' | 'mine' | 'village' | 'greenhouse' | 'town' | 'forest' | 'sea' | 'sky';

export interface FarmState {
  /** Phiên bản cấu trúc bản lưu — xem save.ts (SAVE_VERSION, MIGRATIONS). */
  version: number;
  /** Bản đồ người chơi đang đứng. */
  location: LocationId;
  /** Ngày tuyệt đối từ 1; mùa/năm tính ra từ đây. */
  day: number;
  minutes: number;
  money: number;
  energy: number;
  /** Nước còn trong bình tưới. */
  water: number;
  weather: Weather;
  tomorrow: Weather;
  inventory: (Slot | null)[];
  /** Ô đất đã cuốc, khóa "x,y". */
  tilled: Record<string, Soil>;
  crops: Record<string, Crop>;
  trees: Record<string, Tree>;
  shipping: Slot[];
  buildings: Partial<Record<BuildingId, Building>>;
  animals: Animal[];
  beehives: Record<string, Beehive>;
  /** Cấp dụng cụ 0 thường · 1 đồng · 2 sắt · 3 vàng. */
  tools: Record<ToolId, number>;
  /** Dụng cụ đang gửi thợ rèn. */
  upgrading: { tool: ToolId; readyDay: number } | null;
  /** Máy, vòi tưới, bù nhìn đặt trên nông trại. */
  objects: Record<string, PlacedObject>;
  /** Cây/đá ngoài đồng đã dọn: khóa góc trên-trái → ngày dọn. */
  cleared: Record<string, number>;
  mine: MineState | null;
  /** Quan hệ với dân làng. */
  npcs: Record<string, NpcState>;
  /** Mở khóa từ sự kiện tim (giảm giá, cần câu, công thức…). */
  flags: string[];
  /** Hòm thư cạnh nhà: quà chưa nhận. */
  mailbox: { item: ItemId; qty: number; from: string }[];
  /** Mốc 8: đơn hàng đã giao hôm nay, món đã góp đình làng, ngày có nhà kính, lễ hội, sổ cá. */
  orders: { day: number; done: number[] } | null;
  bundles: Record<string, Record<ItemId, number>>;
  greenhouseDay: number | null;
  festival: { id: string; day: number; gift: boolean; lixi: string[] } | null;
  fishCaught: Record<ItemId, number>;
  /** Bước hướng dẫn đầu game; -1 = xong hoặc bỏ qua. */
  tutorial: number;
  /** Tên nông trại (đặt lúc tạo ô lưu) và kiểu bản đồ (mốc 18 có thêm bản đồ). */
  farmName: string;
  map: FarmMap;
  /** Kinh nghiệm từng kỹ năng và các nghề đã chọn (mốc 12). */
  skills: Record<SkillId, number>;
  professions: string[];
  /** Mốc 13: thống kê việc đã làm, bước cốt truyện, nhiệm vụ dân làng đã xong. */
  stats: Stats;
  story: number;
  npcQuestsDone: string[];
  /** Mốc 17: cây khổng lồ (khóa góc trên-trái 3×3) và giống lai đã tìm ra. */
  giants: Record<string, { id: CropId }>;
  hybrids: CropId[];
  /** Mốc 18: đồ rừng đã hái hôm nay, rác đã góp cho rạn san hô, tầng hang sâu nhất, rương đã mở. */
  forage: { day: number; taken: string[] } | null;
  reefTrash: number;
  mineDeepest: number;
  chests: number[];
  /** Vị trí trên bản đồ `location` (pixel). */
  player: { x: number; y: number };
  lastIncome: number;
}

export const key = (x: number, y: number) => `${x},${y}`;
export const unkey = (k: string) => k.split(',').map(Number) as [number, number];

/** Tăng mỗi khi đổi cấu trúc FarmState, kèm một bước nâng cấp trong save.ts. */
export const SAVE_VERSION = 13;

// ---------------------------------------------------------------- lịch

export const seasonOf = (day: number): Season => SEASONS[Math.floor((day - 1) / SEASON_DAYS) % 4];
export const dayOfSeason = (day: number) => ((day - 1) % SEASON_DAYS) + 1;
export const yearOf = (day: number) => Math.floor((day - 1) / (SEASON_DAYS * 4)) + 1;

/** Ngẫu nhiên có seed — thời tiết của một ngày luôn như nhau với cùng bản lưu. */
export function seeded(n: number) {
  let t = (n * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function weatherFor(day: number): Weather {
  if (dayOfSeason(day) === 1) return 'sunny';
  const r = seeded(day * 7919 + 13);
  switch (seasonOf(day)) {
    case 'spring': return r < 0.28 ? 'rain' : r < 0.33 ? 'storm' : r < 0.43 ? 'windy' : 'sunny';
    case 'summer': return r < 0.18 ? 'rain' : r < 0.32 ? 'storm' : 'sunny';
    case 'fall': return r < 0.25 ? 'rain' : r < 0.45 ? 'windy' : 'sunny';
    case 'winter': return r < 0.3 ? 'snow' : r < 0.4 ? 'windy' : 'sunny';
  }
}
export const isWet = (w: Weather) => w === 'rain' || w === 'storm' || w === 'snow';

export function newFarm(spawn: { x: number; y: number }): FarmState {
  const inventory: (Slot | null)[] = Array(HOTBAR).fill(null);
  inventory[0] = { item: 'hoe', qty: 1 };
  inventory[1] = { item: 'can', qty: 1 };
  inventory[2] = { item: 'seed_carrot', qty: 15 };
  inventory[3] = { item: 'axe', qty: 1 };
  inventory[4] = { item: 'pickaxe', qty: 1 };
  return {
    version: SAVE_VERSION, location: 'farm', day: 1, minutes: DAY_START, money: 150, energy: MAX_ENERGY, water: MAX_WATER,
    weather: weatherFor(1), tomorrow: weatherFor(2),
    inventory, tilled: {}, crops: {}, trees: {}, shipping: [], buildings: {}, animals: [], beehives: {},
    tools: { hoe: 0, can: 0, axe: 0, pickaxe: 0 }, upgrading: null, objects: {}, cleared: {}, mine: null, npcs: {}, flags: [], mailbox: [], orders: null, bundles: {}, greenhouseDay: null, festival: null, fishCaught: {}, tutorial: 0, farmName: 'Nhà Thằng Phong', map: 'plain', skills: emptySkills(), professions: [], stats: emptyStats(), story: 0, npcQuestsDone: [], giants: {}, hybrids: [], forage: null, reefTrash: 0, mineDeepest: 1, chests: [], player: spawn, lastIncome: 0,
  };
}

export function cropStage(c: Crop) {
  const days = CROPS[c.id].stageDays;
  let stage = 0;
  for (let i = 0; i < days.length; i++) if (c.grown >= days[i]) stage = i;
  return stage;
}
export const isRipe = (c: Crop) => cropStage(c) === CROPS[c.id].stageDays.length - 1;
export const treeMature = (t: Tree) => t.age >= TREES[t.id].grow;

// ---------------------------------------------------------------- túi đồ

export function addItem(s: FarmState, item: ItemId, qty: number, q = 0): boolean {
  const same = s.inventory.find((sl) => sl?.item === item && (sl.q ?? 0) === q);
  if (same) {
    same.qty += qty;
    return true;
  }
  const empty = s.inventory.indexOf(null);
  if (empty === -1) return false;
  s.inventory[empty] = q ? { item, qty, q } : { item, qty };
  return true;
}

export function removeFromSlot(s: FarmState, slot: number, qty = 1) {
  const sl = s.inventory[slot];
  if (!sl) return;
  sl.qty -= qty;
  if (sl.qty <= 0) s.inventory[slot] = null;
}

export const countItem = (s: FarmState, item: ItemId) => s.inventory.reduce((n, sl) => n + (sl?.item === item ? sl.qty : 0), 0);

// ---------------------------------------------------------------- hành động trên ô đất

export type UseResult =
  | { ok: true; action: 'till' | 'water' | 'plant' | 'harvest' | 'fertilize' | 'pest'; item?: ItemId; qty?: number; q?: number }
  | { ok: false; reason: string };

/** Thông tin bản đồ quanh ô, do phía hiển thị cung cấp. */
export interface TileEnv {
  /** Cỏ trống, không vật cản. */
  tillable: boolean;
  /** Sát nước (ao) hoặc sát ruộng nước khác → cuốc thành ruộng nước. */
  nearWater: boolean;
  /** Nhà kính: trồng được mọi mùa. */
  anySeason?: boolean;
  /** Loại đất ở ô này (bản đồ quyết định). */
  soil?: SoilType;
  /** Đang ở vườn trên mây. */
  sky?: boolean;
  rng?: () => number;
}

/** Chất lượng khi thu hoạch: phân tốt (2) + Trồng trọt cấp 8 mới có kim cương. */
function rollQuality(fert: number, rng: () => number, good = false, diamondOk = false) {
  const r = rng();
  const diamond = fert >= 2 && diamondOk ? 0.06 : 0;
  const gold = (fert >= 2 ? 0.22 : fert ? 0.15 : 0.04) + (good ? 0.08 : 0);
  const silver = (fert ? 0.45 : 0.2) + (good ? 0.12 : 0);
  return r < diamond ? 3 : r < diamond + gold ? 2 : r < diamond + gold + silver ? 1 : 0;
}

/** Dùng món đang cầm lên ô (x,y). */
export function useOnTile(s: FarmState, slot: number, x: number, y: number, env: TileEnv): UseResult {
  const k = key(x, y);
  const rng = env.rng ?? Math.random;
  const crop = s.crops[k];
  const tree = s.trees[k];

  // Cây ăn trái: hái trái
  if (tree) {
    const def = TREES[tree.id];
    if (!treeMature(tree)) return { ok: false, reason: `${def.name} còn nhỏ — ${def.grow - tree.age} ngày nữa mới ra trái` };
    if (tree.fruit <= 0) return { ok: false, reason: `${def.name} chưa có trái hôm nay` };
    const n = tree.fruit;
    if (!addItem(s, def.fruit, n)) return { ok: false, reason: 'Túi đồ đầy' };
    tree.fruit = 0;
    emit('harvest', n, def.fruit);
    return { ok: true, action: 'harvest', item: def.fruit, qty: n };
  }
  // Sâu: bấm vào (cầm gì cũng được) để bắt sâu
  if (crop?.pest) {
    if (s.energy < 1) return { ok: false, reason: 'Hết sức rồi, ăn gì đó (F) hoặc đi ngủ' };
    crop.pest = false;
    s.energy -= 1;
    return { ok: true, action: 'pest' };
  }
  // Cây chín: thu hoạch bằng bất kỳ món gì
  if (crop && isRipe(crop)) {
    const def = CROPS[crop.id];
    const f = s.tilled[k]?.fert;
    const q = rollQuality(f === 2 ? 2 : f ? 1 : 0, rng, has(s, 'dat_tot'), skillLevel(s.skills?.farming ?? 0) >= 8);
    const n = def.yield + (TRELLIS.has(crop.id) ? 1 : 0);
    if (!addItem(s, def.harvest, n, q)) return { ok: false, reason: 'Túi đồ đầy' };
    if (def.regrow) crop.grown = def.stageDays[def.stageDays.length - 1] - def.regrow;
    else delete s.crops[k];
    emit('harvest', n, def.harvest);
    return { ok: true, action: 'harvest', item: def.harvest, qty: n, q };
  }
  const held = s.inventory[slot];
  if (!held) return { ok: false, reason: 'Tay không' };
  const def = ITEMS[held.item];
  const cost = held.item === 'can' && worn === 'water_saver' ? 1 : ENERGY_COST[held.item] ?? 0;
  if (cost && s.energy < cost) return { ok: false, reason: 'Hết sức rồi, ăn gì đó (F) hoặc đi ngủ' };
  const soil = s.tilled[k];

  if (held.item === 'hoe') {
    if (soil) return { ok: false, reason: 'Đã cuốc rồi' };
    if (!env.tillable) return { ok: false, reason: 'Không cuốc được ở đây' };
    s.tilled[k] = env.nearWater ? { watered: true, paddy: true } : { watered: isWet(s.weather) };
    if (env.soil && env.soil !== 'loam' && !env.nearWater) s.tilled[k].soil = env.soil;
    s.energy -= cost;
    emit('till');
    return { ok: true, action: 'till' };
  }
  if (held.item === 'can') {
    if (!soil) return { ok: false, reason: 'Chỉ tưới đất đã cuốc' };
    if (soil.watered) return { ok: false, reason: soil.paddy ? 'Ruộng nước không cần tưới' : 'Đã tưới rồi' };
    if (s.water <= 0) return { ok: false, reason: 'Bình hết nước — ra giếng hoặc ao để đổ đầy' };
    soil.watered = true;
    s.water--;
    s.energy -= cost;
    emit('water');
    return { ok: true, action: 'water' };
  }
  if (def.kind === 'fertilizer') {
    if (!soil) return { ok: false, reason: 'Bón phân lên đất đã cuốc' };
    if (held.item === 'compost') {
      if (!soil.soil || soil.soil === 'loam') return { ok: false, reason: 'Đất thịt tốt rồi, không cần cải tạo' };
      delete soil.soil;
      removeFromSlot(s, slot);
      return { ok: true, action: 'fertilize' };
    }
    const lv = held.item === 'fertilizer_2' ? 2 : 1;
    if ((soil.fert === 2 ? 2 : soil.fert ? 1 : 0) >= lv) return { ok: false, reason: 'Ô này đã bón phân' };
    soil.fert = lv === 2 ? 2 : true;
    removeFromSlot(s, slot);
    return { ok: true, action: 'fertilize' };
  }
  if (def.kind === 'seed' && def.crop) {
    const c = CROPS[def.crop];
    if (!soil) return { ok: false, reason: 'Phải cuốc đất trước' };
    if (crop) return { ok: false, reason: 'Ô này đã có cây' };
    if (!env.anySeason && !c.seasons.includes(seasonOf(s.day))) return { ok: false, reason: `${c.name} không trồng được mùa này` };
    if (c.paddy && !soil.paddy) return { ok: false, reason: `${c.name} phải trồng ở ruộng nước (cuốc sát mép ao)` };
    if (!c.paddy && soil.paddy) return { ok: false, reason: 'Ruộng nước chỉ trồng lúa, rau muống, sen' };
    if (RED_ONLY.has(def.crop) && soil.soil !== 'red') return { ok: false, reason: `${c.name} chỉ trồng trên đất đỏ` };
    if (c.sky && !env.sky) return { ok: false, reason: `${c.name} chỉ mọc ở vườn trên mây` };
    s.crops[k] = { id: def.crop, grown: 0 };
    removeFromSlot(s, slot);
    emit('plant', 1, def.crop);
    return { ok: true, action: 'plant' };
  }
  if (def.kind === 'sapling' && def.tree) {
    if (soil || crop) return { ok: false, reason: 'Trồng cây giống trên cỏ, không phải đất đã cuốc' };
    if (!env.tillable) return { ok: false, reason: 'Không trồng được ở đây' };
    for (const tk of Object.keys(s.trees)) {
      const [tx, ty] = unkey(tk);
      if (Math.abs(tx - x) <= 1 && Math.abs(ty - y) <= 1) return { ok: false, reason: 'Quá gần cây khác, cách ít nhất 1 ô' };
    }
    s.trees[k] = { id: def.tree, age: 0, fruit: 0 };
    removeFromSlot(s, slot);
    emit('plant', 1, def.tree);
    return { ok: true, action: 'plant' };
  }
  return { ok: false, reason: `Không dùng ${def.name} ở đây được` };
}

export function refillCan(s: FarmState): UseResult {
  if (!s.inventory.some((x) => x?.item === 'can')) return { ok: false, reason: 'Không có bình tưới' };
  if (s.water >= maxWater(s)) return { ok: false, reason: 'Bình đã đầy nước' };
  s.water = maxWater(s);
  return { ok: true, action: 'water' };
}

/** Ăn món đang cầm để hồi sức (chất lượng cao hồi nhiều hơn). */
export function eat(s: FarmState, slot: number): UseResult {
  const held = s.inventory[slot];
  const base = held ? ITEMS[held.item].energy : undefined;
  if (!held || !base) return { ok: false, reason: 'Món này không ăn được' };
  if (s.energy >= maxEnergyOf()) return { ok: false, reason: 'Đang no, sức còn đầy' };
  const gain = Math.round(base * QUALITY_MULT[held.q ?? 0] * (ITEMS[held.item].kind === 'dish' ? dishEnergyMult(s) : 1));
  s.energy = Math.min(maxEnergyOf(), s.energy + gain);
  removeFromSlot(s, slot);
  return { ok: true, action: 'harvest', item: held.item, qty: gain };
}

// ---------------------------------------------------------------- bán & mua

/** Giá bán một món (theo chất lượng; có `s` thì tính cả nghề). */
export const sellPrice = (sl: Slot, s?: FarmState) => Math.round(ITEMS[sl.item].sell * QUALITY_MULT[sl.q ?? 0] * sellMult(s, sl.item));

/** Bỏ cả chồng đang cầm vào thùng giao hàng — tiền nhận khi qua đêm. */
export function ship(s: FarmState, slot: number): UseResult {
  const held = s.inventory[slot];
  if (!held || ITEMS[held.item].sell === 0) return { ok: false, reason: 'Cầm nông sản để bỏ vào thùng' };
  const exist = s.shipping.find((x) => x.item === held.item && (x.q ?? 0) === (held.q ?? 0));
  if (exist) exist.qty += held.qty;
  else s.shipping.push({ ...held });
  s.inventory[slot] = null;
  return { ok: true, action: 'harvest', item: held.item, qty: held.qty };
}

/** Giá mua sau giảm giá (bà Tư 4 tim: hạt & cây giống −10%). */
export function priceOf(s: FarmState, item: ItemId) {
  const it = ITEMS[item];
  const off = s.flags?.includes('discount_seeds') && (it.kind === 'seed' || it.kind === 'sapling');
  return off ? Math.round(it.buy * 0.9) : it.buy;
}

export function buy(s: FarmState, item: ItemId, qty: number): UseResult {
  const price = priceOf(s, item) * qty;
  if (!price) return { ok: false, reason: 'Không bán món này' };
  if (s.money < price) return { ok: false, reason: 'Không đủ tiền' };
  if (!addItem(s, item, qty)) return { ok: false, reason: 'Túi đồ đầy' };
  s.money -= price;
  return { ok: true, action: 'plant', item, qty };
}

// ---------------------------------------------------------------- thời gian & ngủ

/** Cộng thời gian trong ngày; trả về true nếu đã quá 2:00 (phải ngất). */
export function advanceClock(s: FarmState, minutes: number) {
  s.minutes = Math.min(DAY_END, s.minutes + minutes);
  return s.minutes >= DAY_END;
}

export interface NightReport {
  income: number;
  /** Số cây trái mùa bị héo khi sang mùa mới. */
  withered: number;
  /** Cây bị sét đánh trong đêm giông. */
  struck: string | null;
  newSeason: Season | null;
  animals: AnimalNight;
  res: ResourceNight;
  crops: CropNight;
}

/** Qua đêm: cây được tưới lớn thêm, đất khô lại, bán hàng, đổi mùa, thời tiết ngày mai. */
export function sleep(s: FarmState, passedOut = false): NightReport {
  const report: NightReport = { income: 0, withered: 0, struck: null, newSeason: null, animals: { hungry: 0, products: 0, built: [] }, res: { watered: 0, crow: null, tool: null }, crops: { pests: 0, giant: null, hybrid: null } };
  const grazed: Record<string, boolean> = {};
  for (const b of Object.keys(s.buildings) as BuildingId[]) grazed[b] = grazingToday(s, b);
  for (const [k, t] of Object.entries(s.tilled)) {
    const c = s.crops[k];
    if (c && t.watered && !isRipe(c) && !c.pest) {
      c.grown++;
      // Người làm vườn: 15% lớn thêm một ngày; cây hợp đất (cát/sét) thêm 20%
      const r = seeded(s.day * 131 + k.length * 17 + c.grown);
      const soilBonus = (t.soil === 'sand' && SAND_LOVERS.has(c.id)) || (t.soil === 'clay' && CLAY_LOVERS.has(c.id)) ? 0.2 : 0;
      if (!isRipe(c) && r < (has(s, 'lam_vuon') ? 0.15 : 0) + soilBonus) c.grown++;
    }
    // Đất sét giữ ẩm: 50% sáng mai vẫn ướt
    t.watered = !!t.paddy || (t.soil === 'clay' && t.watered && seeded(s.day * 53 + k.length * 3 + (c?.grown ?? 0)) < 0.5);
  }
  report.income = Math.round(s.shipping.reduce((sum, x) => sum + sellPrice(x, s) * x.qty, 0) * shipBonus(s));
  s.money += report.income;
  s.lastIncome = report.income;
  if (report.income) emit('sell', report.income);
  emit('sleep');
  s.shipping = [];

  const before = seasonOf(s.day);
  s.day++;
  const season = seasonOf(s.day);
  if (season !== before) {
    report.newSeason = season;
    for (const [k, c] of Object.entries(s.crops)) {
      if (!isGreenhouseKey(k) && !CROPS[c.id].seasons.includes(season)) {
        delete s.crops[k];
        report.withered++;
      }
    }
  }
  for (const t of Object.values(s.trees)) {
    t.age++;
    if (treeMature(t) && TREES[t.id].seasons.includes(season)) t.fruit = Math.min(3, t.fruit + 1);
    else if (!TREES[t.id].seasons.includes(season)) t.fruit = 0;
  }

  report.crops = nightCrops(s);
  report.animals = nightAnimals(s, grazed);

  s.weather = s.tomorrow ?? weatherFor(s.day);
  s.tomorrow = weatherFor(s.day + 1);
  // Mưa tưới ruộng ngoài trời; nhà kính có tưới nhỏ giọt, sáng nào cũng ướt
  for (const [k, t] of Object.entries(s.tilled)) if (isWet(s.weather) || isGreenhouseKey(k)) t.watered = true;
  if (s.weather === 'storm') {
    const keys = Object.keys(s.crops).filter((k) => !isGreenhouseKey(k));
    if (keys.length >= 6 && seeded(s.day * 31 + 7) < 0.35) {
      const k = keys[Math.floor(seeded(s.day * 17 + 3) * keys.length)];
      report.struck = CROPS[s.crops[k].id].name;
      delete s.crops[k];
    }
  }
  report.res = nightResources(s);

  s.minutes = DAY_START;
  s.energy = passedOut ? Math.round(maxEnergyOf() / 2) : maxEnergyOf();
  return report;
}

export function clockLabel(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
