import { describe, expect, it } from 'vitest';
import { countItem, key, newFarm, sleep, useOnTile, type FarmState } from './farm';
import {
  areaTiles, craft, maxWater, mineRocks, placeObject, strike, swapSlots, takeItem, upgradeBackpack, upgradeTool, useObject,
} from './resources';
import { ITEMS } from '../data';
import { migrate } from './save';

const farm = () => {
  const s = newFarm({ x: 0, y: 0 });
  s.weather = 'sunny';
  s.tomorrow = 'sunny';
  return s;
};
const night = (s: FarmState) => {
  s.tomorrow = 'sunny';
  return sleep(s);
};
const give = (s: FarmState, item: string, qty: number) => {
  const i = s.inventory.indexOf(null);
  s.inventory[i] = { item, qty };
  return i;
};
const dry = { tillable: true, nearWater: false, rng: () => 0.99 };

describe('chặt cây, đập đá', () => {
  it('rìu chặt cây nhỏ qua nhiều nhát, rơi gỗ; cuốc chim không chặt được cây', () => {
    const s = farm();
    expect(strike(s, 4, 'smallTree', 0)).toMatchObject({ ok: false, reason: 'Cần rìu' });
    const a = strike(s, 3, 'smallTree', 0, () => 0);
    expect(a).toMatchObject({ ok: true, broke: false, hp: 2 });
    const b = strike(s, 3, 'smallTree', 1, () => 0);
    const c = strike(s, 3, 'smallTree', 2, () => 0);
    expect(b).toMatchObject({ broke: false });
    expect(c).toMatchObject({ ok: true, broke: true });
    expect(countItem(s, 'wood')).toBe(3);
    expect(s.energy).toBe(100 - 12);
  });

  it('gốc cây to cần rìu đồng; dụng cụ cấp cao đánh mạnh hơn', () => {
    const s = farm();
    expect(strike(s, 3, 'stump', 0).ok).toBe(false);
    s.tools.axe = 2;
    expect(strike(s, 3, 'stump', 0, () => 0)).toMatchObject({ ok: true, broke: false, hp: 2 });
  });

  it('đá trong hang sinh theo ngày: cùng ngày như nhau, ngày khác khác', () => {
    const spots: [number, number][] = [];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 16; x++) spots.push([x, y]);
    const a = mineRocks(3, spots);
    expect(mineRocks(3, spots)).toEqual(a);
    expect(mineRocks(4, spots)).not.toEqual(a);
    expect(new Set(a.map((r) => key(r.x, r.y))).size).toBe(a.length);
    expect(a.some((r) => r.node !== 'mine_rock')).toBe(true);
  });
});

describe('thợ rèn & túi đồ', () => {
  it('nâng bình tưới: trừ tiền + quặng, mất 2 ngày, về tay thì chứa nhiều nước hơn', () => {
    const s = farm();
    s.money = 3000;
    expect(upgradeTool(s, 'can').ok).toBe(false); // thiếu quặng
    give(s, 'ore_copper', 6);
    expect(upgradeTool(s, 'can')).toMatchObject({ ok: true });
    expect(s.money).toBe(1000);
    expect(countItem(s, 'ore_copper')).toBe(1);
    expect(countItem(s, 'can')).toBe(0);
    expect(night(s).res.tool).toBeNull();
    expect(night(s).res.tool).toBe('can');
    expect(s.tools.can).toBe(1);
    expect(maxWater(s)).toBe(40);
    expect(s.water).toBe(40);
  });

  it('cấp dụng cụ quyết định vùng tác dụng', () => {
    expect(areaTiles(0, { x: 5, y: 5 }, 'down')).toHaveLength(1);
    expect(areaTiles(1, { x: 5, y: 5 }, 'down')).toEqual([{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 }]);
    expect(areaTiles(2, { x: 5, y: 5 }, 'left')).toHaveLength(5);
    const gold = areaTiles(3, { x: 5, y: 5 }, 'right');
    expect(gold).toHaveLength(9);
    expect(new Set(gold.map((t) => key(t.x, t.y))).size).toBe(9);
  });

  it('nâng túi 9 → 18 → 27, đổi chỗ 2 ô', () => {
    const s = farm();
    s.money = 20000;
    expect(upgradeBackpack(s).ok).toBe(true);
    expect(s.inventory).toHaveLength(18);
    expect(upgradeBackpack(s).ok).toBe(true);
    expect(s.inventory).toHaveLength(27);
    expect(upgradeBackpack(s).ok).toBe(false);
    swapSlots(s, 0, 20);
    expect(s.inventory[20]?.item).toBe('hoe');
    expect(s.inventory[0]).toBeNull();
  });

  it('lấy nguyên liệu gom từ nhiều ô', () => {
    const s = farm();
    give(s, 'wood', 10);
    give(s, 'wood', 10);
    expect(takeItem(s, 'wood', 15)).toBe(true);
    expect(countItem(s, 'wood')).toBe(5);
    expect(takeItem(s, 'wood', 6)).toBe(false);
  });
});

describe('chế tạo & máy', () => {
  it('chế tạo vòi tưới, đặt xuống, sáng mai tưới 4 ô kề', () => {
    const s = farm();
    give(s, 'stone', 5);
    expect(craft(s, 'sprinkler').ok).toBe(false);
    give(s, 'ore_copper', 1);
    expect(craft(s, 'sprinkler').ok).toBe(true);
    expect(countItem(s, 'stone')).toBe(0);
    const slot = s.inventory.findIndex((x) => x?.item === 'sprinkler');
    for (const [x, y] of [[5, 4], [5, 6], [4, 5], [6, 5], [6, 6]]) useOnTile(s, 0, x, y, dry);
    expect(placeObject(s, slot, 5, 5, true).ok).toBe(true);
    expect(placeObject(s, 0, 5, 5, true).ok).toBe(false);
    const r = night(s);
    expect(r.res.watered).toBe(4);
    expect(s.tilled[key(5, 4)].watered).toBe(true);
    expect(s.tilled[key(6, 6)].watered).toBe(false);
  });

  it('hũ muối: trái → mứt sau 2 ngày, giá = gốc×2+50; rau → dưa muối', () => {
    const s = farm();
    s.objects[key(1, 1)] = { kind: 'preserves_jar' };
    const slot = give(s, 'mango', 2);
    expect(useObject(s, key(1, 1), slot)).toMatchObject({ ok: true, action: 'load', item: 'pres_mango' });
    expect(ITEMS.pres_mango.sell).toBe(ITEMS.mango.sell * 2 + 50);
    expect(ITEMS.pres_mango.name).toBe('Mứt xoài');
    expect(ITEMS.pres_carrot.name).toBe('Cà rốt muối');
    expect(useObject(s, key(1, 1), slot).ok).toBe(false); // đang làm
    night(s);
    expect(useObject(s, key(1, 1), slot).ok).toBe(false);
    night(s);
    expect(useObject(s, key(1, 1), slot)).toMatchObject({ ok: true, action: 'collect', item: 'pres_mango' });
    expect(countItem(s, 'pres_mango')).toBe(1);
  });

  it('thùng ủ ra nước ép (trái ×3, rau ×2.25); nong phơi cần 5 trái; cối xay xay cả chồng ngay', () => {
    expect(ITEMS.juice_mango.sell).toBe(ITEMS.mango.sell * 3);
    expect(ITEMS.juice_carrot.sell).toBe(Math.round(ITEMS.carrot.sell * 2.25));
    const s = farm();
    s.objects.a = { kind: 'dehydrator' };
    s.objects.b = { kind: 'mill' };
    const f = give(s, 'lychee', 4);
    expect(useObject(s, 'a', f).ok).toBe(false);
    s.inventory[f]!.qty = 5;
    expect(useObject(s, 'a', f)).toMatchObject({ ok: true, item: 'dried_lychee' });
    expect(ITEMS.dried_lychee.sell).toBe(Math.round(ITEMS.lychee.sell * 7.5));
    const r = give(s, 'rice', 9);
    expect(useObject(s, 'b', r)).toMatchObject({ ok: true, action: 'mill', item: 'rice_bag', qty: 9 });
    expect(countItem(s, 'rice_bag')).toBe(9);
    expect(countItem(s, 'rice')).toBe(0);
  });

  it('cầm rìu bấm vào máy trống thì nhặt lên', () => {
    const s = farm();
    s.objects.a = { kind: 'keg' };
    expect(useObject(s, 'a', 3)).toMatchObject({ ok: true, action: 'pickup' });
    expect(s.objects.a).toBeUndefined();
    expect(countItem(s, 'keg')).toBe(1);
  });

  it('quạ ăn cây khi không có bù nhìn; có bù nhìn thì an toàn', () => {
    const run = (withScarecrow: boolean) => {
      let eaten = 0;
      for (let d = 0; d < 20; d++) {
        const s = farm();
        s.day = d + 2;
        for (let i = 0; i < 15; i++) {
          s.tilled[key(i, 0)] = { watered: false };
          s.crops[key(i, 0)] = { id: 'carrot', grown: 0 };
        }
        if (withScarecrow) s.objects[key(7, 1)] = { kind: 'scarecrow' };
        if (night(s).res.crow) eaten++;
      }
      return eaten;
    };
    expect(run(false)).toBeGreaterThan(0);
    expect(run(true)).toBe(0);
  });
});

describe('bản lưu v4 → v5', () => {
  it('thêm rìu và cuốc chim; túi đầy thì nới túi', () => {
    const inv = Array.from({ length: 9 }, () => ({ item: 'seed_carrot', qty: 1 }));
    const v4 = { version: 4, day: 3, minutes: 400, money: 0, energy: 50, water: 3, location: 'farm', weather: 'sunny', tomorrow: 'sunny', inventory: inv, tilled: {}, crops: {}, trees: {}, shipping: [], buildings: {}, animals: [], beehives: {}, player: { x: 0, y: 0 }, lastIncome: 0 };
    const s = migrate(v4)!;
    expect(s.inventory).toHaveLength(18);
    expect(countItem(s, 'axe')).toBe(1);
    expect(countItem(s, 'pickaxe')).toBe(1);
    expect(s.tools).toEqual({ hoe: 0, can: 0, axe: 0, pickaxe: 0 });
    expect(s.objects).toEqual({});
  });
});
