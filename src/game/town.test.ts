import { describe, expect, it } from 'vitest';
import { countItem, newFarm, sellPrice } from './farm';
import { addXp, newProfile, needFor } from './profile';
import { buyDecor, buyPiece, hotItems, HOT_MULT, regionOpen, rideCart, sellNow } from './town';
import { placeObject, useObject } from './resources';
import { REGIONS } from '../data';

describe('bản đồ thế giới', () => {
  it('chợ huyện mở ở cấp 5 hoặc khi xong cốt truyện; đi xe bò tốn 50 xu và 1 giờ', () => {
    const p = newProfile();
    const s = newFarm({ x: 0, y: 0 });
    expect(regionOpen(p, s, 'village')).toBe(true);
    expect(regionOpen(p, s, 'town')).toBe(false);
    expect(rideCart(p, s, 'town').ok).toBe(false);
    s.flags.push('road_town');
    expect(regionOpen(p, s, 'town')).toBe(true);
    const m = s.money, t = s.minutes;
    expect(rideCart(p, s, 'town').ok).toBe(true);
    expect(s.money).toBe(m - 50);
    expect(s.minutes).toBe(t + 60);
    expect(rideCart(p, s, 'farm').ok).toBe(true);
    expect(s.money).toBe(m - 50);
    let xp = 0;
    for (let l = 1; l < 8; l++) xp += needFor(l);
    addXp(p, xp);
    expect(regionOpen(p, s, 'forest')).toBe(true);
    expect(REGIONS).toHaveLength(7);
  });
});

describe('chợ huyện', () => {
  it('tiệm may bán món vào tủ đồ, không bán trùng', () => {
    const p = newProfile();
    const s = newFarm({ x: 0, y: 0 });
    s.money = 5000;
    expect(buyPiece(p, s, 'hat_cap').ok).toBe(true);
    expect(p.wardrobe).toContain('hat_cap');
    expect(s.money).toBe(3500);
    expect(buyPiece(p, s, 'hat_cap').ok).toBe(false);
  });

  it('đồ trang trí mua được, đặt lên cỏ, cầm rìu nhặt lại', () => {
    const s = newFarm({ x: 0, y: 0 });
    s.money = 1000;
    expect(buyDecor(s, 'deco_pot').ok).toBe(true);
    const slot = s.inventory.findIndex((x) => x?.item === 'deco_pot');
    expect(placeObject(s, slot, 5, 5, true).ok).toBe(true);
    expect(useObject(s, '5,5', 0).ok).toBe(false);
    expect(useObject(s, '5,5', 3)).toMatchObject({ ok: true, action: 'pickup' });
    expect(countItem(s, 'deco_pot')).toBe(1);
  });

  it('vựa thu mua bán ngay; 3 món giá cao mỗi tuần được ×1,5', () => {
    const s = newFarm({ x: 0, y: 0 });
    const hot = hotItems(s, '2026-09-28');
    expect(hot).toHaveLength(3);
    expect(hotItems(s, '2026-09-28')).toEqual(hot);
    s.inventory[5] = { item: hot[0], qty: 4 };
    const m = s.money;
    const r = sellNow(s, 5, '2026-09-28');
    expect(r.ok).toBe(true);
    expect(s.money - m).toBe(Math.round(sellPrice({ item: hot[0], qty: 1 }, s) * 4 * HOT_MULT));
    expect(s.inventory[5]).toBeNull();
  });
});
