import { describe, expect, it } from 'vitest';
import {
  buy, cropStage, dayOfSeason, eat, isRipe, key, MAX_WATER, newFarm, refillCan, seasonOf, SEASON_DAYS, sellPrice, ship, sleep,
  useOnTile, weatherFor, type FarmState,
} from './farm';
import { CROPS, shopFor } from '../data';

const farm = () => {
  const s = newFarm({ x: 0, y: 0 });
  s.weather = 'sunny';
  s.tomorrow = 'sunny';
  return s;
};
const dry = { tillable: true, nearWater: false, rng: () => 0.99 };
const give = (s: FarmState, slot: number, item: string, qty = 10) => (s.inventory[slot] = { item, qty });
/** Qua đêm mà không để thời tiết can thiệp (luôn nắng). */
const night = (s: FarmState) => {
  s.tomorrow = 'sunny';
  return sleep(s);
};

describe('trồng trọt', () => {
  it('cuốc → gieo → tưới → lớn qua đêm → thu hoạch', () => {
    const s = farm();
    expect(useOnTile(s, 0, 5, 5, dry)).toMatchObject({ ok: true, action: 'till' });
    expect(useOnTile(s, 2, 5, 5, dry)).toMatchObject({ ok: true, action: 'plant' });
    for (let d = 0; d < 4; d++) {
      expect(isRipe(s.crops[key(5, 5)])).toBe(false);
      expect(useOnTile(s, 1, 5, 5, dry)).toMatchObject({ ok: true, action: 'water' });
      night(s);
    }
    expect(useOnTile(s, 0, 5, 5, dry)).toMatchObject({ ok: true, action: 'harvest', item: 'carrot', q: 0 });
    expect(s.crops[key(5, 5)]).toBeUndefined();
  });

  it('không tưới thì cây không lớn; hết sức thì không làm được', () => {
    const s = farm();
    useOnTile(s, 0, 1, 1, dry);
    useOnTile(s, 2, 1, 1, dry);
    night(s);
    expect(s.crops[key(1, 1)].grown).toBe(0);
    s.energy = 2;
    expect(useOnTile(s, 0, 2, 2, dry).ok).toBe(false);
  });

  it('chỉ trồng được cây đúng mùa', () => {
    const s = farm();
    give(s, 3, 'seed_watermelon');
    useOnTile(s, 0, 1, 1, dry);
    expect(useOnTile(s, 3, 1, 1, dry)).toMatchObject({ ok: false });
    s.day = SEASON_DAYS + 1; // sang Hạ
    expect(useOnTile(s, 3, 1, 1, dry).ok).toBe(true);
  });

  it('sang mùa mới: cây trái mùa héo, cây nhiều mùa (bắp) sống tiếp', () => {
    const s = farm();
    s.day = SEASON_DAYS * 2; // ngày cuối mùa Hạ
    give(s, 3, 'seed_watermelon');
    give(s, 4, 'seed_corn');
    for (const x of [1, 2]) useOnTile(s, 0, x, 1, dry);
    useOnTile(s, 3, 1, 1, dry);
    useOnTile(s, 4, 2, 1, dry);
    const r = night(s);
    expect(r.newSeason).toBe('fall');
    expect(r.withered).toBe(1);
    expect(s.crops[key(2, 1)]?.id).toBe('corn');
  });

  it('cây mọc lại: dâu thu xong vẫn còn cây, vài ngày sau chín tiếp', () => {
    const s = farm();
    give(s, 3, 'seed_strawberry');
    useOnTile(s, 0, 1, 1, dry);
    useOnTile(s, 3, 1, 1, dry);
    s.crops[key(1, 1)].grown = 5;
    expect(useOnTile(s, 0, 1, 1, dry)).toMatchObject({ action: 'harvest', qty: 2 });
    const c = s.crops[key(1, 1)];
    expect(c).toBeDefined();
    expect(isRipe(c)).toBe(false);
    for (let d = 0; d < 3; d++) { s.tilled[key(1, 1)].watered = true; night(s); }
    expect(isRipe(c)).toBe(true);
  });

  it('ruộng nước: cuốc sát ao thành ruộng nước, luôn ướt, chỉ trồng lúa / rau muống', () => {
    const s = farm();
    give(s, 3, 'seed_water_spinach');
    useOnTile(s, 0, 1, 1, { ...dry, nearWater: true });
    expect(s.tilled[key(1, 1)]).toMatchObject({ paddy: true, watered: true });
    expect(useOnTile(s, 2, 1, 1, dry)).toMatchObject({ ok: false }); // cà rốt không trồng ruộng nước
    expect(useOnTile(s, 3, 1, 1, dry).ok).toBe(true);
    night(s);
    expect(s.tilled[key(1, 1)].watered).toBe(true);
    useOnTile(s, 0, 2, 2, dry);
    expect(useOnTile(s, 3, 2, 2, dry)).toMatchObject({ ok: false }); // rau muống cần ruộng nước
  });

  it('phân bón tăng chất lượng; chất lượng vàng bán ×1,5', () => {
    const s = farm();
    give(s, 3, 'fertilizer', 1);
    useOnTile(s, 0, 1, 1, dry);
    expect(useOnTile(s, 3, 1, 1, dry)).toMatchObject({ ok: true, action: 'fertilize' });
    useOnTile(s, 2, 1, 1, dry);
    s.crops[key(1, 1)].grown = 99;
    const r = useOnTile(s, 0, 1, 1, { ...dry, rng: () => 0.1 });
    expect(r).toMatchObject({ q: 2 });
    expect(sellPrice({ item: 'carrot', qty: 1, q: 2 })).toBe(60);
  });
});

describe('cây ăn trái', () => {
  it('trồng cây giống, 28 ngày ra trái đúng mùa, hái được tối đa 3', () => {
    const s = farm();
    s.day = SEASON_DAYS + 1; // Hạ
    give(s, 3, 'sapling_mango', 2);
    expect(useOnTile(s, 3, 3, 3, dry).ok).toBe(true);
    expect(useOnTile(s, 3, 4, 4, dry)).toMatchObject({ ok: false }); // quá gần
    for (let d = 0; d < 10; d++) night(s);
    expect(useOnTile(s, 0, 3, 3, dry)).toMatchObject({ ok: false }); // còn nhỏ
    s.trees[key(3, 3)].age = 27;
    s.day = SEASON_DAYS + 2;
    for (let d = 0; d < 4; d++) night(s);
    expect(useOnTile(s, 0, 3, 3, dry)).toMatchObject({ ok: true, item: 'mango', qty: 3 });
  });
});

describe('lịch & thời tiết', () => {
  it('4 mùa × 14 ngày', () => {
    expect(seasonOf(1)).toBe('spring');
    expect(seasonOf(15)).toBe('summer');
    expect(seasonOf(43)).toBe('winter');
    expect(seasonOf(57)).toBe('spring');
    expect(dayOfSeason(16)).toBe(2);
  });

  it('ngày đầu mùa luôn nắng; mưa tự tưới hết ruộng; mùa đông có tuyết, không có mưa', () => {
    for (const d of [1, 15, 29, 43]) expect(weatherFor(d)).toBe('sunny');
    const s = farm();
    useOnTile(s, 0, 1, 1, dry);
    s.tomorrow = 'rain';
    sleep(s);
    expect(s.tilled[key(1, 1)].watered).toBe(true);
    const winter = Array.from({ length: 13 }, (_, i) => weatherFor(44 + i));
    expect(winter).not.toContain('rain');
  });

  it('quầy hạt chỉ bán hạt đúng mùa', () => {
    expect(shopFor('spring')).toContain('seed_carrot');
    expect(shopFor('spring')).not.toContain('seed_watermelon');
    expect(shopFor('winter')).toContain('seed_apricot_blossom');
    for (const id of shopFor('summer')) expect(id.startsWith('seed_') ? CROPS[id.slice(5)].seasons : ['summer']).toContain('summer');
  });
});

describe('kinh tế & sức', () => {
  it('bỏ vào thùng → nhận tiền khi qua đêm; mua hạt', () => {
    const s = farm();
    s.inventory[3] = { item: 'beet', qty: 2 };
    expect(ship(s, 3).ok).toBe(true);
    const before = s.money;
    expect(night(s).income).toBe(120);
    expect(s.money).toBe(before + 120);
    expect(buy(s, 'seed_cabbage', 99).ok).toBe(false);
  });

  it('bình tưới hết nước, đổ đầy lại; ăn hồi sức', () => {
    const s = farm();
    s.water = 0;
    useOnTile(s, 0, 1, 1, dry);
    expect(useOnTile(s, 1, 1, 1, dry).ok).toBe(false);
    expect(refillCan(s).ok).toBe(true);
    expect(s.water).toBe(MAX_WATER);
    s.energy = 50;
    s.inventory[4] = { item: 'pumpkin', qty: 1 };
    expect(eat(s, 4).ok).toBe(true);
    expect(s.energy).toBe(70);
  });

  it('mọi cây: chín đúng số ngày khi tưới đều', () => {
    for (const c of Object.values(CROPS)) {
      const crop = { id: c.id, grown: 0 };
      let d = 0;
      while (!isRipe(crop) && d < 30) { crop.grown++; d++; }
      expect(d, c.id).toBe(c.stageDays[3]);
      expect(cropStage(crop)).toBe(3);
    }
  });
});
