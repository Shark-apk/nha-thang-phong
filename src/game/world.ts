// Bản đồ nông trại: sinh bằng code (seed cố định) để khỏi cần phần mềm vẽ map lúc đầu.
// Sau này có thể thay bằng map vẽ trong Tiled mà không đổi phần còn lại.
import { BUILDINGS } from '../data/animals';
import type { SoilType } from '../data/items';
import type { FarmMap } from './farm';

export const TILE = 16;
export const MAP_W = 48;
export const MAP_H = 34;

/** Tra ô trong tileset tự nối viền 11 cột (Grass.png, Tilled_Dirt.png) theo 4 hàng xóm: N=1, E=2, S=4, W=8. */
export const AUTOTILE = [36, 25, 33, 22, 3, 14, 0, 11, 35, 24, 34, 23, 2, 13, 1, 12];
/** Hàng rào 4×4 (Fences.png) theo 4 hàng xóm. */
export const FENCE_TILE = [12, 8, 13, 9, 0, 4, 1, 5, 15, 11, 14, 10, 3, 7, 2, 6];
/** Ô cỏ đầy có hoa văn nhỏ để mặt cỏ đỡ đơn điệu. */
export const GRASS_VARIANTS = [55, 56, 57, 66, 67, 68];

export type Decor =
  | { kind: 'bigTree' | 'fruitTree' | 'smallTree' | 'rock' | 'bigRock' | 'bush' | 'berryBush' | 'stump' | 'sunflower'; x: number; y: number }
  | { kind: 'flower' | 'mushroom' | 'sprout'; x: number; y: number; frame: number };

export interface World {
  land: boolean[][];
  /** Ô cỏ đầy dùng hoa văn nào (-1 = ô thường). */
  grassVariant: number[][];
  fence: boolean[][];
  decor: Decor[];
  /** Ô không đi qua được (nước, nhà, cây, đá, rào, thùng). */
  blocked: boolean[][];
  house: { x: number; y: number; w: number; h: number; door: { x: number; y: number } };
  bin: { x: number; y: number };
  /** Quầy hạt giống 3×3 ô và giếng 2×2 ô (góc trên trái). */
  shop: { x: number; y: number };
  well: { x: number; y: number };
  /** Lô nhà kính (thưởng đình làng) 4×3 ô, cửa ở 2 ô giữa hàng dưới. */
  greenhouse: { x: number; y: number; w: number; h: number };
  /** Bến xe bò (2 ô) cạnh nhà. */
  cart: { x: number; y: number };
  /** Hòm thư cạnh nhà. */
  mailbox: { x: number; y: number };
  /** Lối sang làng ở mép đông (các ô đi vào là sang làng). */
  east: { x: number; y0: number; y1: number };
  /** Cửa hang đá 2×2 ô (góc trên trái); vào hang ở hàng dưới. */
  cave: { x: number; y: number };
  farm: { x0: number; y0: number; x1: number; y1: number };
  spawn: { x: number; y: number };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grid = <T,>(v: T) => Array.from({ length: MAP_H }, () => Array<T>(MAP_W).fill(v));

/** Kiểu bản đồ nông trại (mốc 18): nước, số cây cối, màu cỏ. Đồng bằng giữ nguyên như cũ. */
type Tries = [bigTree: number, fruitTree: number, smallTree: number, bigRock: number, rock: number, berryBush: number, bush: number, stump: number, sunflower: number, flower: number];
const MAP_TRIES: Record<FarmMap, Tries> = {
  plain: [60, 12, 30, 10, 14, 8, 10, 6, 6, 70],
  coast: [20, 10, 60, 6, 10, 4, 14, 4, 10, 90],
  tea: [80, 8, 30, 12, 18, 30, 12, 6, 4, 50],
  highland: [40, 6, 50, 20, 30, 6, 10, 12, 4, 40],
  delta: [40, 30, 30, 4, 6, 10, 20, 4, 8, 80],
};
/** Nhân màu cỏ theo bản đồ (cùng với màu mùa). */
export const MAP_TINT: Record<FarmMap, number> = { plain: 0xffffff, coast: 0xfff2d6, tea: 0xd8f0c4, highland: 0xffe2c8, delta: 0xe6fff0 };

export function buildWorld(seed = 7, map: FarmMap = 'plain'): World {
  const r = rng(seed);
  const land = grid(false);
  // Đảo cỏ, mép hơi lượn
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const edge = Math.min(x, y, MAP_W - 1 - x, MAP_H - 1 - y);
      land[y][x] = edge >= 2 || (edge === 1 && r() < 0.35);
    }
  }
  // Ao ở góc dưới phải (bản đồ nhỏ nước hơn / có biển, kênh)
  const pond = map === 'tea' || map === 'highland' ? [2.6, 2] : [4.2, 3];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map !== 'coast' && ((x - 40) / pond[0]) ** 2 + ((y - 26) / pond[1]) ** 2 < 1) land[y][x] = false;
      // Ven biển: biển phía nam
      if (map === 'coast' && y >= 28 - Math.round(1.5 * Math.sin(x / 5))) land[y][x] = false;
      // Miệt vườn: kênh phía nam + đông, hai ao nhỏ trong ruộng
      if (map === 'delta' && ((y >= 30 && y <= 31 && x >= 3 && x <= 44) || (x >= 44 && x <= 45 && y >= 20 && y <= 31)
        || ((x - 16.5) / 1.6) ** 2 + ((y - 12.5) / 1.4) ** 2 < 1 || ((x - 32.5) / 1.6) ** 2 + ((y - 24.5) / 1.4) ** 2 < 1)) land[y][x] = false;
    }
  }

  const house = { x: 5, y: 3, w: 5, h: 5, door: { x: 7, y: 7 } };
  const bin = { x: 11, y: 7 };
  const shop = { x: 12, y: 2 };
  const well = { x: 17, y: 6 };
  const cave = { x: 42, y: 7 };
  const mailbox = { x: 4, y: 7 };
  const greenhouse = { x: 37, y: 11, w: 4, h: 3 };
  const cart = { x: 9, y: 9 };
  const east = { x: MAP_W - 1, y0: 16, y1: 17 };
  const farm = { x0: 14, y0: 10, x1: 34, y1: 26 };
  const spawn = { x: 7, y: 8 };

  const fence = grid(false);
  for (let x = farm.x0; x <= farm.x1; x++) {
    fence[farm.y0][x] = true;
    fence[farm.y1][x] = true;
  }
  for (let y = farm.y0; y <= farm.y1; y++) {
    fence[y][farm.x0] = true;
    fence[y][farm.x1] = true;
  }
  // Cổng vào ruộng
  fence[farm.y0][23] = fence[farm.y0][24] = false;
  fence[farm.y1][23] = fence[farm.y1][24] = false;

  // Vùng không đặt cây cối: quanh nhà, lối đi, ruộng
  const reserved = grid(false);
  const reserve = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(0, y0); y <= Math.min(MAP_H - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(MAP_W - 1, x1); x++) reserved[y][x] = true;
  };
  reserve(house.x - 1, house.y - 2, house.x + house.w + 3, house.y + house.h + 2);
  reserve(farm.x0 - 1, farm.y0 - 1, farm.x1 + 1, farm.y1 + 1);
  reserve(house.door.x - 1, house.door.y, 25, farm.y0);
  reserve(shop.x - 1, shop.y - 1, shop.x + 3, shop.y + 4);
  reserve(well.x - 1, well.y - 1, well.x + 2, well.y + 3);
  // Lô đất cho chuồng trại (mốc 5)
  for (const b of Object.values(BUILDINGS)) reserve(b.lot.x - 1, b.lot.y - 1, b.lot.x + b.lot.w, b.lot.y + b.lot.h + 1);

  const decor: Decor[] = [];
  const blocked = grid(false);
  const free = (x: number, y: number, w = 1, h = 1) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (yy < 0 || xx < 0 || yy >= MAP_H || xx >= MAP_W || !land[yy][xx] || reserved[yy][xx] || blocked[yy][xx]) return false;
    return true;
  };
  const place = (kind: Decor['kind'], w: number, h: number, tries: number, block: boolean, frames?: number[]) => {
    for (let i = 0; i < tries; i++) {
      const x = 2 + Math.floor(r() * (MAP_W - 4));
      const y = 2 + Math.floor(r() * (MAP_H - 4));
      if (!free(x - 1, y - 1, w + 2, h + 2)) continue;
      if (frames) decor.push({ kind: kind as 'flower', x, y, frame: frames[Math.floor(r() * frames.length)] });
      else decor.push({ kind: kind as 'rock', x, y });
      // Cây: chỉ gốc (hàng dưới) chặn đường, tán ở trên cho nhân vật đi ra sau
      if (block) for (let xx = x; xx < x + w; xx++) blocked[y + h - 1][xx] = true;
      else reserved[y][x] = true;
    }
  };
  const T = MAP_TRIES[map];
  place('bigTree', 2, 2, T[0], true);
  place('fruitTree', 2, 2, T[1], true);
  place('smallTree', 1, 2, T[2], true);
  place('bigRock', 1, 1, T[3], true);
  place('rock', 1, 1, T[4], true);
  place('berryBush', 1, 1, T[5], true);
  place('bush', 1, 1, T[6], true);
  place('stump', 1, 1, T[7], true);
  place('sunflower', 1, 2, T[8], true);
  place('flower', 1, 1, T[9], false, [24, 25, 32, 33, 34]);
  place('mushroom', 1, 1, 12, false, [5, 6, 7, 8]);
  place('sprout', 1, 1, 40, false, [14, 15]);

  // Cửa hang (mốc 6): bỏ cây cối đè lên sau khi rải, để bố cục cũ của bản lưu cũ không bị xê dịch
  const overlaps = (d: Decor, x0: number, y0: number, x1: number, y1: number) => {
    const [w, h] = decorSize(d.kind);
    return d.x + w > x0 && d.x <= x1 && d.y + h > y0 && d.y <= y1;
  };
  // Lối sang làng (mốc 7): dải đất nối ra mép đông
  for (let y = east.y0; y <= east.y1; y++) for (let x = MAP_W - 7; x < MAP_W; x++) land[y][x] = true;
  const nearCave = (d: Decor) => overlaps(d, cave.x - 1, cave.y - 1, cave.x + 2, cave.y + 2) || overlaps(d, MAP_W - 8, east.y0 - 1, MAP_W - 1, east.y1 + 1)
    || overlaps(d, greenhouse.x - 1, greenhouse.y - 1, greenhouse.x + greenhouse.w, greenhouse.y + greenhouse.h)
    || overlaps(d, cart.x - 1, cart.y - 1, cart.x + 3, cart.y + 2);
  for (const d of decor.filter(nearCave)) {
    const [w, h] = decorSize(d.kind);
    for (let yy = d.y; yy < d.y + h; yy++) for (let xx = d.x; xx < d.x + w; xx++) blocked[yy][xx] = false;
    decor.splice(decor.indexOf(d), 1);
  }
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (!land[y][x] || fence[y][x]) blocked[y][x] = true;
    }
  for (let y = house.y; y < house.y + house.h; y++)
    for (let x = house.x; x < house.x + house.w; x++) blocked[y][x] = true;
  blocked[bin.y][bin.x] = true;
  blocked[mailbox.y][mailbox.x] = true;
  for (const [x, y] of [[cart.x, cart.y], [cart.x + 1, cart.y]]) blocked[y][x] = true;
  // Quầy hàng: chặn 2 hàng dưới (mái bạt ở trên cho đi ra sau); giếng: chặn cả 2×2
  for (let y = shop.y + 1; y < shop.y + 3; y++) for (let x = shop.x; x < shop.x + 3; x++) blocked[y][x] = true;
  for (let y = well.y; y < well.y + 2; y++) for (let x = well.x; x < well.x + 2; x++) blocked[y][x] = true;
  for (let y = cave.y; y < cave.y + 2; y++) for (let x = cave.x; x < cave.x + 2; x++) blocked[y][x] = true;

  const grassVariant = grid(-1);
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) if (r() < 0.12) grassVariant[y][x] = GRASS_VARIANTS[Math.floor(r() * GRASS_VARIANTS.length)];

  return { land, grassVariant, fence, decor, blocked, house, bin, shop, well, cave, mailbox, east, greenhouse, cart, farm, spawn };
}

/** `outside`: coi ô ngoài lưới là có (vùng xa: mép bản đồ không hiện viền bờ). */
export function neighborMask(grid: boolean[][], x: number, y: number, outside = false) {
  const at = (xx: number, yy: number) => (yy >= 0 && xx >= 0 && yy < grid.length && xx < grid[0].length ? grid[yy][xx] : outside);
  return (at(x, y - 1) ? 1 : 0) | (at(x + 1, y) ? 2 : 0) | (at(x, y + 1) ? 4 : 0) | (at(x - 1, y) ? 8 : 0);
}

/** Ô có cuốc được không: cỏ trống, không bị chặn, không có hoa/nấm. */
export function isTillable(w: World, x: number, y: number) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  if (!w.land[y][x] || w.blocked[y][x]) return false;
  // Không cuốc sát mép nước (ô cỏ viền)
  return neighborMask(w.land, x, y) === 15;
}

export const inShop = (w: World, x: number, y: number) => x >= w.shop.x && x < w.shop.x + 3 && y >= w.shop.y && y < w.shop.y + 3;
export const inWell = (w: World, x: number, y: number) => x >= w.well.x && x < w.well.x + 2 && y >= w.well.y && y < w.well.y + 2;
/**
 * Loại đất theo bản đồ. Đồng bằng: đỏ góc đông bắc ruộng, sét góc tây nam, cát quanh ao.
 * Ven biển: cát gần hết; Đồi chè: đất đỏ nửa bắc; Cao nguyên: đất đỏ gần hết; Miệt vườn: đất sét phù sa.
 */
export function soilAt(x: number, y: number, map: FarmMap = 'plain'): SoilType {
  if (map === 'coast') return x >= 14 && x <= 18 ? 'loam' : 'sand';
  if (map === 'tea') return y <= 17 && x >= 20 ? 'red' : x <= 19 && y >= 21 ? 'clay' : 'loam';
  if (map === 'highland') return x >= 15 && x <= 18 && y >= 22 ? 'clay' : 'red';
  if (map === 'delta') return x >= 22 && x <= 28 && y >= 14 && y <= 20 ? 'loam' : 'clay';
  if (((x - 40) / 7) ** 2 + ((y - 26) / 5.5) ** 2 < 1) return 'sand';
  if (x >= 28 && x <= 33 && y >= 11 && y <= 15) return 'red';
  if (x >= 15 && x <= 19 && y >= 21 && y <= 25) return 'clay';
  return 'loam';
}

export const inCave = (w: World, x: number, y: number) => x >= w.cave.x && x < w.cave.x + 2 && y >= w.cave.y && y < w.cave.y + 2;
/** Số ô (rộng, cao) của từng loại vật trang trí. */
export const DECOR_SIZE: Record<string, [number, number]> = { bigTree: [2, 2], fruitTree: [2, 2], smallTree: [1, 2], sunflower: [1, 2] };
export const decorSize = (kind: string) => DECOR_SIZE[kind] ?? [1, 1];
export const isWater = (w: World, x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && !w.land[y][x];

/** Ô (x,y) thuộc lô chuồng nào. */
export function lotAt(x: number, y: number) {
  return Object.values(BUILDINGS).find((b) => x >= b.lot.x && x < b.lot.x + b.lot.w && y >= b.lot.y && y < b.lot.y + b.lot.h);
}
export const lotDoor = (b: { lot: { x: number; y: number; w: number; h: number } }) => ({ x: b.lot.x + Math.floor(b.lot.w / 2), y: b.lot.y + b.lot.h - 1 });
