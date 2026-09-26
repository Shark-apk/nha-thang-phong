import { describe, expect, it } from 'vitest';
import { countItem, newFarm } from './farm';
import { CHEST_SIZE, chestOf, craft, placeObject, putInChest, sortInventory, stashDuplicates, takeFromChest, useObject } from './resources';
import { migrate } from './save';

const farm = () => newFarm({ x: 0, y: 0 });
const give = (s: ReturnType<typeof farm>, item: string, qty = 5, q?: number) => {
  const i = s.inventory.indexOf(null);
  s.inventory[i] = q ? { item, qty, q } : { item, qty };
  return i;
};

describe('rương gỗ', () => {
  it('chế tạo bằng 50 gỗ, đặt trên cỏ, bấm vào là mở; còn đồ thì không nhặt lên được', () => {
    const s = farm();
    give(s, 'wood', 50);
    expect(craft(s, 'storage').ok).toBe(true);
    const slot = s.inventory.findIndex((x) => x?.item === 'storage');
    expect(placeObject(s, slot, 3, 3, true).ok).toBe(true);
    expect(useObject(s, '3,3', 0)).toMatchObject({ ok: true, action: 'open' });
    expect(chestOf(s, '3,3')).toHaveLength(CHEST_SIZE);
    const egg = give(s, 'egg', 4);
    expect(putInChest(s, '3,3', egg)).toBe(true);
    const axe = s.inventory.findIndex((x) => x?.item === 'axe');
    expect(useObject(s, '3,3', axe).ok).toBe(false);
    expect(takeFromChest(s, '3,3', 0)).toBe(true);
    expect(countItem(s, 'egg')).toBe(4);
    expect(useObject(s, '3,3', axe)).toMatchObject({ ok: true, action: 'pickup' });
    expect(s.storage['3,3']).toBeUndefined();
  });

  it('cất vào dồn chồng cùng loại + cùng chất lượng; lấy ra giữ chất lượng; cất đồ trùng bỏ qua dụng cụ', () => {
    const s = farm();
    const a = give(s, 'strawberry', 3, 2);
    putInChest(s, 'k', a);
    const b = give(s, 'strawberry', 2, 2);
    const c = give(s, 'strawberry', 5);
    give(s, 'egg', 7);
    expect(stashDuplicates(s, 'k')).toBe(1);
    expect(s.inventory[b]).toBeNull();
    expect(s.inventory[c]).not.toBeNull(); // chất lượng khác → không cất
    expect(chestOf(s, 'k')[0]).toEqual({ item: 'strawberry', qty: 5, q: 2 });
    takeFromChest(s, 'k', 0);
    expect(s.inventory.find((x) => x?.item === 'strawberry' && x.q === 2)?.qty).toBe(5);
    expect(countItem(s, 'hoe')).toBe(1);
  });
});

describe('sắp xếp túi', () => {
  it('dụng cụ giữ nguyên chỗ; gom chồng trùng; xếp theo loại', () => {
    const s = farm();
    const tools = s.inventory.map((x, i) => [x?.item, i]).filter(([it]) => it && ['hoe', 'can', 'axe', 'pickaxe'].includes(it as string));
    s.inventory[7] = { item: 'egg', qty: 2 };
    s.inventory.push(...Array(9).fill(null));
    s.inventory[12] = { item: 'egg', qty: 3 };
    s.inventory[15] = { item: 'seed_carrot', qty: 4 };
    sortInventory(s);
    for (const [it, i] of tools) expect(s.inventory[i as number]?.item).toBe(it);
    expect(s.inventory.filter((x) => x?.item === 'egg')).toEqual([{ item: 'egg', qty: 5 }]);
    const order = s.inventory.filter((x) => x && !['hoe', 'can', 'axe', 'pickaxe'].includes(x.item)).map((x) => x!.item);
    expect(order.indexOf('seed_carrot')).toBeLessThan(order.indexOf('egg'));
  });

  it('bản lưu v13 → v14 có rương', () => {
    const v13 = { ...farm(), version: 13 } as Record<string, unknown>;
    delete v13.storage;
    expect(migrate(v13)!.storage).toEqual({});
  });
});
