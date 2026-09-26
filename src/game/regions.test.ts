import { describe, expect, it } from 'vitest';
import { countItem, key, newFarm, sleep, useOnTile } from './farm';
import { dive, donateTrash, faint, forageToday, monstersForFloor, openChest, pickForage, rockKind, SKY_X, takenToday } from './regions';
import { fishHere } from './activities';
import { migrate } from './save';
import { REEF_TRASH, SKY_SEEDS } from '../data';

const farm = () => {
  const s = newFarm({ x: 0, y: 0 });
  s.weather = s.tomorrow = 'sunny';
  return s;
};
const give = (s: ReturnType<typeof farm>, item: string, qty = 5) => {
  const i = s.inventory.indexOf(null);
  s.inventory[i] = { item, qty };
  return i;
};
const spots: [number, number][] = Array.from({ length: 50 }, (_, i) => [i % 10, Math.floor(i / 10)]);

describe('rừng', () => {
  it('đồ hái cố định trong ngày, đổi theo ngày; hái rồi thì mất tới mai', () => {
    const a = forageToday(3, spots);
    expect(a).toHaveLength(12);
    expect(forageToday(3, spots)).toEqual(a);
    expect(forageToday(4, spots)).not.toEqual(a);
    const s = farm();
    s.day = 3;
    expect(pickForage(s, a[0].x, a[0].y, a[0].item)).toBe(true);
    expect(pickForage(s, a[0].x, a[0].y, a[0].item)).toBe(false);
    expect(countItem(s, a[0].item)).toBe(1);
    s.day = 4;
    expect(takenToday(s).size).toBe(0);
  });
});

describe('biển', () => {
  it('lặn tốn 10 sức, được đồ; hết sức thì không lặn được', () => {
    const s = farm();
    const r = dive(s, () => 0);
    expect(r).toMatchObject({ ok: true, item: 'rac' });
    expect(s.energy).toBe(90);
    s.energy = 5;
    expect(dive(s).ok).toBe(false);
  });

  it(`góp đủ ${REEF_TRASH} rác thì rạn san hô hồi sinh, mở cá rạn`, () => {
    const s = farm();
    s.day = 15; // hè
    s.minutes = 10 * 60;
    expect(fishHere(s, 'sea').map((f) => f.id)).not.toContain('ca_mu');
    give(s, 'rac', 20);
    expect(donateTrash(s)).toMatchObject({ ok: true, total: 20, revived: false });
    give(s, 'rac', 15);
    expect(donateTrash(s)).toMatchObject({ ok: true, total: 30, revived: true });
    expect(countItem(s, 'rac')).toBe(5);
    expect(fishHere(s, 'sea').map((f) => f.id)).toContain('ca_mu');
    expect(donateTrash(s).ok).toBe(false);
  });
});

describe('hang sâu', () => {
  it('tầng 1 không có quái, sâu hơn đông hơn; người đá từ tầng 20', () => {
    expect(monstersForFloor(1, 1)).toEqual([]);
    expect(monstersForFloor(12, 1).length).toBeGreaterThan(monstersForFloor(3, 1).length);
    expect(monstersForFloor(5, 1)).not.toContain('golem');
    const deep = Array.from({ length: 10 }, (_, d) => monstersForFloor(25, d)).flat();
    expect(deep).toContain('golem');
  });

  it('đá quý chỉ từ tầng 15; càng sâu càng nhiều vàng', () => {
    const count = (f: number, k: string) => Array.from({ length: 1000 }, (_, i) => rockKind(f, i / 1000)).filter((x) => x === k).length;
    expect(count(10, 'mine_gem')).toBe(0);
    expect(count(20, 'mine_gem')).toBeGreaterThan(0);
    expect(count(28, 'mine_gold')).toBeGreaterThan(count(3, 'mine_gold'));
  });

  it('rương tầng 10 mở một lần; ngất mất 10% tiền, tối đa 1.000', () => {
    const s = farm();
    expect(openChest(s, 10)).not.toBeNull();
    expect(countItem(s, 'gem')).toBe(2);
    expect(openChest(s, 10)).toBeNull();
    expect(openChest(s, 7)).toBeNull();
    s.money = 3000;
    expect(faint(s)).toBe(300);
    s.money = 50000;
    expect(faint(s)).toBe(1000);
    expect(s.money).toBe(49000);
  });
});

describe('vườn trên mây', () => {
  it('hạt trên mây chỉ trồng trên mây; đất mây sáng nào cũng được tưới', () => {
    const s = farm();
    const env = { tillable: true, nearWater: false, anySeason: true };
    const seed = give(s, SKY_SEEDS[0], 2);
    useOnTile(s, 0, 5, 5, env);
    expect(useOnTile(s, seed, 5, 5, env).ok).toBe(false);
    const x = SKY_X + 5;
    useOnTile(s, 0, x, 5, { ...env, sky: true });
    expect(useOnTile(s, seed, x, 5, { ...env, sky: true }).ok).toBe(true);
    s.day = 14;
    sleep(s);
    expect(s.crops[key(x, 5)]).toBeDefined();
    expect(s.tilled[key(x, 5)].watered).toBe(true);
  });
});

describe('bản lưu v12 → v13', () => {
  it('thêm dữ liệu vùng xa', () => {
    const v12 = { ...newFarm({ x: 0, y: 0 }), version: 12 } as Record<string, unknown>;
    for (const k of ['forage', 'reefTrash', 'mineDeepest', 'chests']) delete v12[k];
    const s = migrate(v12)!;
    expect(s).toMatchObject({ forage: null, reefTrash: 0, mineDeepest: 1, chests: [] });
  });
});
