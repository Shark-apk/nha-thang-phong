// Mốc 14: các vùng trên bản đồ thế giới, đồ trang trí, tiệm may ở chợ huyện.
import ICONS from '../../assets/Custom/icons.json';
import { ITEMS } from './items';
import { FACES, HATS, SHIRT_NAME } from './look';

export type RegionId = 'farm' | 'village' | 'town' | 'mine' | 'forest' | 'sea' | 'sky';

export interface Region {
  id: RegionId;
  name: string;
  /** Cấp nông trại cần để mở (chợ huyện mở sớm hơn nếu xong cốt truyện). */
  level: number;
  /** Toạ độ ghim trên ảnh world.png 320×200. */
  pin: [number, number];
  info: string;
  /** Cảnh + điểm xuất hiện khi đi xe bò tới. */
  scene: string;
  spawn: string;
}

export const REGIONS: Region[] = [
  { id: 'farm', name: 'Nông trại', level: 1, pin: [112, 118], info: 'Nhà của bạn', scene: 'farm', spawn: 'cart' },
  { id: 'village', name: 'Làng', level: 1, pin: [196, 100], info: '8 dân làng, chợ, lò rèn, đình', scene: 'village', spawn: 'cart' },
  { id: 'town', name: 'Chợ huyện', level: 5, pin: [168, 160], info: 'Tiệm may, tiệm trang trí, vựa thu mua, rạp hát', scene: 'town', spawn: 'cart' },
  { id: 'mine', name: 'Hang đá', level: 1, pin: [244, 58], info: 'Đá, quặng; từ cấp 10 mở hang sâu', scene: 'mine', spawn: 'entry' },
  { id: 'forest', name: 'Rừng', level: 8, pin: [64, 70], info: 'Nấm, măng, mật ong rừng, gỗ quý', scene: 'forest', spawn: 'cart' },
  { id: 'sea', name: 'Biển & đảo', level: 15, pin: [292, 164], info: 'Lặn nhặt rác, san hô, cá hiếm', scene: 'sea', spawn: 'cart' },
  { id: 'sky', name: 'Vườn trên mây', level: 20, pin: [96, 18], info: 'Trồng cây trên trời', scene: 'sky', spawn: 'cart' },
];
export const CART_FARE = 50;
export const CART_MINUTES = 60;

// ---------------------------------------------------------------- đồ trang trí (đặt trên nông trại)
export const DECOR: Record<string, { name: string; price: number; beauty: number }> = {
  deco_lamp: { name: 'Đèn đứng', price: 600, beauty: 3 },
  deco_bench: { name: 'Ghế đá', price: 800, beauty: 3 },
  deco_pot: { name: 'Chậu hoa', price: 300, beauty: 2 },
  deco_statue: { name: 'Tượng nghê đá', price: 2500, beauty: 8 },
  deco_bamboo: { name: 'Khóm tre', price: 400, beauty: 2 },
  deco_windmill: { name: 'Cối xay gió nhỏ', price: 1500, beauty: 5 },
};
for (const [id, d] of Object.entries(DECOR)) {
  ITEMS[id] = { id, name: d.name, kind: 'machine', sell: 0, buy: d.price, icon: ['icons', ICONS[id as keyof typeof ICONS]] };
}
export const isDecor = (id: string) => id in DECOR;

// ---------------------------------------------------------------- tiệm may
/** Món tiệm may bán (vào tủ đồ ở hồ sơ). */
export const TAILOR: { id: string; name: string; price: number }[] = [
  ...Object.entries(HATS).filter(([id]) => id !== 'crown').map(([id, n]) => ({ id: `hat_${id}`, name: n, price: id === 'chef' ? 2200 : 1500 })),
  ...Object.entries(FACES).map(([id, n]) => ({ id: `face_${id}`, name: n, price: 800 })),
  ...SHIRT_NAME.map((n, i) => ({ id: `shirt_${i}`, name: `Áo ${n.toLowerCase()}`, price: 600 })),
];
