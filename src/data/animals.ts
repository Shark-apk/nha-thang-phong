// Vật nuôi, chuồng trại và sản phẩm của chúng.
import ICONS from '../../assets/Custom/icons.json';
import { ITEMS } from './items';

export type BuildingId = 'coop' | 'barn' | 'shed' | 'pond';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  cost: number;
  capacity: number;
  /** Lô đất trên nông trại (ô): góc trên-trái + kích thước; cửa ở giữa hàng dưới. */
  lot: { x: number; y: number; w: number; h: number };
}

export interface AnimalDef {
  kind: string;
  name: string;
  home: 'coop' | 'barn' | 'shed';
  price: number;
  /** Sản phẩm; null = không cho sản phẩm (trâu kéo cày). */
  product: string | null;
  /** Bao nhiêu ngày (đã được cho ăn) ra 1 sản phẩm. */
  every: number;
  /** Chỉ ra sản phẩm khi được thả ra đồng (heo đào nấm). */
  grazeOnly?: boolean;
  /** Hình: texture + frame đứng yên (+ đi) và cỡ khung. */
  sprite: { tex: string; idle: number[]; walk?: number[]; size: number };
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  coop: { id: 'coop', name: 'Chuồng gà', cost: 800, capacity: 4, lot: { x: 3, y: 10, w: 3, h: 3 } },
  barn: { id: 'barn', name: 'Chuồng bò', cost: 1500, capacity: 4, lot: { x: 2, y: 15, w: 5, h: 4 } },
  shed: { id: 'shed', name: 'Chuồng trâu', cost: 3000, capacity: 2, lot: { x: 3, y: 22, w: 4, h: 3 } },
  pond: { id: 'pond', name: 'Ao cá', cost: 5000, capacity: 0, lot: { x: 36, y: 3, w: 4, h: 3 } },
};

const ic = (n: keyof typeof ICONS) => ({ tex: 'icons', idle: [ICONS[n]], size: 16 });

export const ANIMALS: Record<string, AnimalDef> = {
  chicken: { kind: 'chicken', name: 'Gà', home: 'coop', price: 800, product: 'egg', every: 1, sprite: { tex: 'chicken', idle: [0, 1], walk: [4, 5, 6, 7], size: 16 } },
  duck: { kind: 'duck', name: 'Vịt', home: 'coop', price: 1200, product: 'duck_egg', every: 2, sprite: ic('duck') },
  rabbit: { kind: 'rabbit', name: 'Thỏ', home: 'coop', price: 2500, product: 'rabbit_fur', every: 4, sprite: ic('rabbit') },
  cow: { kind: 'cow', name: 'Bò', home: 'barn', price: 1500, product: 'milk', every: 1, sprite: { tex: 'cow', idle: [0, 1, 2], walk: [3, 4], size: 32 } },
  goat: { kind: 'goat', name: 'Dê', home: 'barn', price: 2000, product: 'goat_milk', every: 2, sprite: ic('goat') },
  sheep: { kind: 'sheep', name: 'Cừu', home: 'barn', price: 3000, product: 'wool', every: 3, sprite: ic('sheep') },
  pig: { kind: 'pig', name: 'Heo', home: 'barn', price: 4000, product: 'truffle', every: 1, grazeOnly: true, sprite: ic('pig') },
  buffalo: { kind: 'buffalo', name: 'Trâu', home: 'shed', price: 3500, product: null, every: 1, sprite: ic('buffalo') },
};

export const ANIMAL_NAMES = ['Mimi', 'Bông', 'Mập', 'Đốm', 'Nâu', 'Sữa', 'Mơ', 'Na', 'Cốm', 'Tí', 'Bé Ba', 'Kem', 'Mít', 'Xoài', 'Bơ', 'Gạo'];

// ---------------------------------------------------------------- đồ vật liên quan
const add = (id: string, name: string, kind: 'product' | 'animal_food' | 'machine', sell: number, buy: number, icon: [string, number], energy?: number) => {
  ITEMS[id] = { id, name, kind, sell, buy, icon, energy };
};
add('hay', 'Cỏ khô', 'animal_food', 0, 5, ['milkgrass', 3]);
add('egg', 'Trứng gà', 'product', 50, 0, ['egg', 0], 10);
add('duck_egg', 'Trứng vịt', 'product', 90, 0, ['icons', ICONS.duck_egg], 12);
add('milk', 'Sữa bò', 'product', 125, 0, ['milkgrass', 1], 12);
add('goat_milk', 'Sữa dê', 'product', 225, 0, ['icons', ICONS.goat_milk], 15);
add('wool', 'Len cừu', 'product', 340, 0, ['icons', ICONS.wool]);
add('truffle', 'Nấm truffle', 'product', 600, 0, ['icons', ICONS.truffle]);
add('rabbit_fur', 'Lông thỏ', 'product', 450, 0, ['icons', ICONS.rabbit_fur]);
add('honey', 'Mật ong', 'product', 100, 0, ['icons', ICONS.honey], 15);
add('flower_honey', 'Mật hoa', 'product', 200, 0, ['icons', ICONS.honey], 20);
add('fish', 'Cá rô', 'product', 75, 0, ['icons', ICONS.fish], 15);
add('beehive', 'Tổ ong', 'machine', 0, 1000, ['icons', ICONS.beehive]);

/** Cây có hoa: gần tổ ong → mật hoa. */
export const FLOWER_CROPS = new Set(['sunflower', 'chrysanthemum', 'apricot_blossom', 'peach_blossom']);
