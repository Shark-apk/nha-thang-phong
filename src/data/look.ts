// Ngoại hình người chơi: màu lông, màu áo, nón, đồ trên mặt, bộ đồ có hiệu ứng, thú cưng.

export interface Look {
  body: number;
  shirt: number;
  hat: string | null;
  face: string | null;
  pet: string | null;
}

/** Màu lông (thay màu kem gốc). */
export const BODY_COLORS = ['#f3f2c0', '#f6dcc0', '#e8c8a0', '#d9a07a', '#b8865a', '#e0dcd6', '#c8d8e8', '#f2c8d8'];
/** Màu áo (thay màu tím gốc). */
export const SHIRT_COLORS = ['#766daa', '#78a158', '#5a8eaa', '#c7474f', '#f0c040', '#f3f4e7', '#3b2a2e', '#b8864a', '#f2a6b8', '#3f7fbf'];
export const SHIRT_NAME = ['Tím', 'Xanh lá', 'Xanh dương', 'Đỏ', 'Vàng', 'Trắng', 'Đen', 'Nâu', 'Hồng', 'Xanh biển'];

export const HATS: Record<string, string> = {
  straw: 'Mũ rơm', non_la: 'Nón lá', beanie: 'Mũ len', cap: 'Mũ lưỡi trai', chef: 'Mũ đầu bếp', crown: 'Vương miện', band: 'Băng đô', flower: 'Hoa cài', bow: 'Nơ xanh',
};
export const FACES: Record<string, string> = { glasses: 'Kính tròn', sunglasses: 'Kính râm', mustache: 'Ria mép', blush: 'Má hồng' };
export const PETS: Record<string, { name: string; row: number }> = {
  dog: { name: 'Chó', row: 0 }, cat: { name: 'Mèo', row: 1 }, duck: { name: 'Vịt', row: 2 }, crab: { name: 'Cua', row: 3 },
};

/** Món trong tủ đồ: 'hat_straw', 'face_glasses', 'shirt_3', 'pet_dog'. */
export const pieceName = (id: string) => {
  const [kind, rest] = [id.slice(0, id.indexOf('_')), id.slice(id.indexOf('_') + 1)];
  if (kind === 'hat') return HATS[rest] ?? rest;
  if (kind === 'face') return FACES[rest] ?? rest;
  if (kind === 'shirt') return `Áo ${SHIRT_NAME[Number(rest)]?.toLowerCase() ?? rest}`;
  if (kind === 'pet') return PETS[rest]?.name ?? rest;
  return id;
};

export type SetBonus = 'water_saver' | 'fisher' | 'chef' | 'winter' | 'speed' | 'none';
export interface Outfit { id: string; name: string; hat: string; shirt: number; bonus: SetBonus; info: string }
/** Bộ đồ: mặc đủ nón + áo đúng màu thì có hiệu ứng. */
export const OUTFITS: Outfit[] = [
  { id: 'outfit_farmer', name: 'Bộ nông dân', hat: 'straw', shirt: 1, bonus: 'water_saver', info: 'Tưới cây tốn 1 sức thay vì 2' },
  { id: 'outfit_fisher', name: 'Bộ ngư dân', hat: 'non_la', shirt: 2, bonus: 'fisher', info: 'Vùng xanh khi câu to hơn' },
  { id: 'outfit_chef', name: 'Bộ đầu bếp', hat: 'chef', shirt: 5, bonus: 'chef', info: 'Món nấu hồi thêm 10% sức' },
  { id: 'outfit_winter', name: 'Bộ mùa đông', hat: 'beanie', shirt: 3, bonus: 'winter', info: 'Sức tối đa +20' },
  { id: 'outfit_sport', name: 'Bộ thể thao', hat: 'cap', shirt: 4, bonus: 'speed', info: 'Đi nhanh hơn 10%' },
  { id: 'outfit_royal', name: 'Bộ vua chúa', hat: 'crown', shirt: 3, bonus: 'none', info: 'Chỉ để đẹp' },
];

export const outfitPieces = (o: Outfit) => [`hat_${o.hat}`, `shirt_${o.shirt}`];

/** Ngoại hình mặc định của Phong. */
export const DEFAULT_LOOK: Look = { body: 0, shirt: 0, hat: 'straw', face: null, pet: null };
/** Tủ đồ ban đầu. */
export const STARTER_WARDROBE = ['hat_straw', 'hat_band', 'face_blush', 'shirt_0', 'shirt_1', 'shirt_2', 'shirt_3', 'pet_dog', 'pet_cat', 'pet_duck'];

export function activeBonus(look: Look): SetBonus | null {
  const o = OUTFITS.find((x) => x.hat === look.hat && x.shirt === look.shirt);
  return o && o.bonus !== 'none' ? o.bonus : null;
}
