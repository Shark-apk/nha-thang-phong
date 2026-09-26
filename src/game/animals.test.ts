import { describe, expect, it } from 'vitest';
import { build, buyAnimal, collectFish, collectHoney, fillTrough, hearts, placeBeehive, toggleDoor, touchAnimal } from './animals';
import { key, newFarm, sleep, SEASON_DAYS, type FarmState } from './farm';

const farm = () => {
  const s = newFarm({ x: 0, y: 0 });
  s.money = 100000;
  s.weather = s.tomorrow = 'sunny';
  return s;
};
const night = (s: FarmState, w: FarmState['weather'] = 'sunny') => { s.tomorrow = w; return sleep(s); };

describe('chuồng trại & vật nuôi', () => {
  it('xây chuồng mất 1 đêm; chưa xây xong thì chưa mua thú được', () => {
    const s = farm();
    expect(build(s, 'coop').ok).toBe(true);
    expect(buyAnimal(s, 'chicken').ok).toBe(false);
    expect(night(s).animals.built).toContain('coop');
    expect(buyAnimal(s, 'chicken').ok).toBe(true);
    expect(buyAnimal(s, 'cow').ok).toBe(false); // bò ở chuồng bò
  });

  it('cho ăn cỏ khô → ra trứng mỗi ngày; không cho ăn → đói, giảm tim', () => {
    const s = farm();
    build(s, 'coop'); night(s);
    buyAnimal(s, 'chicken');
    s.inventory[3] = { item: 'hay', qty: 1 };
    expect(fillTrough(s, 'coop', 3).ok).toBe(true);
    const r1 = night(s, 'rain');
    expect(r1.animals.products).toBe(1);
    const t = touchAnimal(s, s.animals[0].id);
    expect(t).toMatchObject({ ok: true, item: 'egg', petted: true });
    const love = s.animals[0].love;
    const r2 = night(s, 'rain'); // hết cỏ
    expect(r2.animals.hungry).toBe(1);
    expect(s.animals[0].love).toBeLessThan(love);
  });

  it('mở cửa ngày nắng: thú ra đồng ăn cỏ, không cần cỏ khô; heo chỉ đào nấm khi ra đồng', () => {
    const s = farm();
    build(s, 'barn'); night(s);
    buyAnimal(s, 'pig');
    buyAnimal(s, 'cow');
    toggleDoor(s, 'barn');
    const r = night(s);
    expect(r.animals.hungry).toBe(0);
    expect(r.animals.products).toBe(2);
  });

  it('vuốt ve đều thì tim tăng dần; tim cao ra sản phẩm chất lượng', () => {
    const s = farm();
    build(s, 'barn'); night(s);
    buyAnimal(s, 'cow');
    toggleDoor(s, 'barn');
    for (let d = 0; d < 30; d++) { touchAnimal(s, s.animals[0].id); night(s); }
    expect(hearts(s.animals[0])).toBeGreaterThanOrEqual(8);
    expect(touchAnimal(s, s.animals[0].id)).toMatchObject({ item: 'milk', q: 2 });
  });

  it('tổ ong: 4 ngày ra mật; gần hoa → mật hoa; mùa đông nghỉ', () => {
    const s = farm();
    s.inventory[3] = { item: 'beehive', qty: 2 };
    expect(placeBeehive(s, 3, 5, 5, true).ok).toBe(true);
    s.crops[key(7, 7)] = { id: 'sunflower', grown: 0 };
    for (let d = 0; d < 4; d++) night(s);
    expect(collectHoney(s, key(5, 5))).toMatchObject({ ok: true, item: 'flower_honey' });
  });

  it('ao cá: 2 ngày có thêm 1 con cá', () => {
    const s = farm();
    build(s, 'pond');
    for (let d = 0; d < 5; d++) night(s);
    expect(collectFish(s)).toMatchObject({ ok: true, item: 'fish', qty: 2 });
  });

  it('mùa đông thú không ra đồng được dù mở cửa', () => {
    const s = farm();
    s.day = SEASON_DAYS * 3 + 2;
    build(s, 'coop'); night(s);
    buyAnimal(s, 'chicken');
    toggleDoor(s, 'coop');
    expect(night(s).animals.hungry).toBe(1);
  });
});
