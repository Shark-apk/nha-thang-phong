import { describe, expect, it } from 'vitest';
import { countItem, key, newFarm, sleep, useOnTile, type FarmState } from './farm';
import {
  bauCua, buildKitchen, canCook, cast, cook, deliverOrder, donate, festivalNow, festivalTalk, festivalToday, fishHere, GH_X, hasGreenhouse,
  landFish, ordersToday,
} from './activities';
import { buyAnimal, build } from './animals';
import { giveGift, npcState, stopAt } from './villagers';
import { BUNDLES, DISHES, FESTIVALS, FISH, ITEMS, NPC } from '../data';
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
const give = (s: FarmState, item: string, qty = 5) => {
  const i = s.inventory.indexOf(null);
  s.inventory[i] = { item, qty };
  return i;
};

describe('câu cá', () => {
  it('20 loại cá, có mùa, chỗ và giờ; cá chép vàng cần mở khóa', () => {
    expect(FISH).toHaveLength(23); // 20 cá gốc + 3 cá rạn san hô (mốc 18)
    for (const f of FISH) expect(ITEMS[f.id].kind).toBe('fish');
    const s = farm();
    s.minutes = 20 * 60;
    expect(fishHere(s, 'pond').map((f) => f.id)).toContain('ca_tre');
    s.minutes = 8 * 60;
    expect(fishHere(s, 'pond').map((f) => f.id)).not.toContain('ca_tre');
    expect(fishHere(s, 'river').map((f) => f.id)).not.toContain('ca_chep_vang');
    s.flags.push('legend_fish');
    expect(fishHere(s, 'river').map((f) => f.id)).toContain('ca_chep_vang');
  });

  it('thả câu tốn sức, cần cầm cần câu; kéo được cá vào túi và ghi sổ', () => {
    const s = farm();
    expect(cast(s, 0, 'pond').ok).toBe(false);
    const slot = give(s, 'rod', 1);
    s.minutes = 9 * 60;
    const r = cast(s, slot, 'pond', () => 0);
    expect(r.ok).toBe(true);
    expect(s.energy).toBe(96);
    if (!r.ok) return;
    expect(landFish(s, r.fish, true)).toMatchObject({ ok: true, q: 1 });
    expect(s.fishCaught[r.fish.id]).toBe(1);
  });
});

describe('nấu ăn', () => {
  it('cần bếp (8.000 xu + 100 gỗ), đủ nguyên liệu; canh chua cần công thức của chị Lan', () => {
    const s = farm();
    give(s, 'egg', 4);
    expect(cook(s, 'trung_chien').ok).toBe(false);
    s.money = 9000;
    give(s, 'wood', 100);
    expect(buildKitchen(s).ok).toBe(true);
    expect(cook(s, 'trung_chien').ok).toBe(true);
    expect(countItem(s, 'egg')).toBe(2);
    expect(countItem(s, 'trung_chien')).toBe(1);
    give(s, 'fish', 1);
    give(s, 'tomato', 2);
    expect(canCook(s, 'canh_chua')).toBe(false);
    s.flags.push('recipe_canh_chua');
    expect(cook(s, 'canh_chua').ok).toBe(true);
    expect(DISHES.length).toBeGreaterThanOrEqual(6);
    for (const d of DISHES) for (const [it] of d.needs) expect(ITEMS[it], it).toBeDefined();
  });
});

describe('bảng tin', () => {
  it('3 đơn mỗi ngày, cố định trong ngày; giao đơn nhận tiền + tim', () => {
    const s = farm();
    const o = ordersToday(s);
    expect(o).toHaveLength(3);
    expect(ordersToday(s)).toEqual(o);
    give(s, o[0].item, o[0].qty);
    const m = s.money;
    expect(deliverOrder(s, 0).ok).toBe(true);
    expect(s.money).toBe(m + o[0].reward);
    expect(npcState(s, o[0].npc).love).toBe(60);
    expect(deliverOrder(s, 0).ok).toBe(false);
    night(s);
    expect(ordersToday(s)).not.toEqual(o);
  });
});

describe('đình làng', () => {
  it('góp đủ bộ thì mở thưởng; bộ chuồng trại làm chuồng chứa gấp đôi', () => {
    const s = farm();
    const b = BUNDLES.find((x) => x.id === 'barn')!;
    for (const [it, n] of b.needs) {
      give(s, it, n - 1);
      expect(donate(s, 'barn', it)).toMatchObject({ ok: true, qty: n - 1, completed: false });
      give(s, it, 5);
      donate(s, 'barn', it);
    }
    expect(s.flags).toContain('b_barn');
    s.money = 99999;
    build(s, 'coop');
    night(s);
    for (let i = 0; i < 8; i++) expect(buyAnimal(s, 'chicken').ok).toBe(true);
    expect(buyAnimal(s, 'chicken').ok).toBe(false);
  });

  it('bộ sông nước → nhà kính: trồng trái mùa, sáng nào cũng được tưới, không héo khi đổi mùa', () => {
    const s = farm();
    const b = BUNDLES.find((x) => x.id === 'river')!;
    for (const [it, n] of b.needs) { give(s, it, n); donate(s, 'river', it); }
    expect(hasGreenhouse(s)).toBe(false);
    night(s);
    expect(hasGreenhouse(s)).toBe(true);
    const x = GH_X + 2, y = 3;
    useOnTile(s, 0, x, y, { tillable: true, nearWater: false, anySeason: true });
    const seed = give(s, 'seed_watermelon', 1); // dưa hấu mùa hè, trồng mùa xuân trong nhà kính
    expect(useOnTile(s, seed, x, y, { tillable: true, nearWater: false, anySeason: true }).ok).toBe(true);
    s.day = 14;
    night(s);
    expect(s.crops[key(x, y)]).toBeDefined();
    expect(s.tilled[key(x, y)].watered).toBe(true);
  });
});

describe('lễ hội', () => {
  it('8 lễ, Tết xuân 3 và Trung Thu thu 8 làm đầy đủ; ngày hội dân làng ra sân đình', () => {
    expect(FESTIVALS).toHaveLength(8);
    expect(FESTIVALS.filter((f) => f.full).map((f) => f.id)).toEqual(['tet', 'trung_thu']);
    const s = farm();
    s.day = 3;
    expect(festivalToday(s)?.id).toBe('tet');
    s.minutes = 10 * 60;
    expect(stopAt(s, NPC.ba_tu)).toBe('fest_0');
    s.minutes = 18 * 60;
    expect(stopAt(s, NPC.ba_tu)).toBe('home');
  });

  it('Tết: người lớn lì xì 300, trẻ 100, mỗi người một lần; bầu cua', () => {
    const s = farm();
    s.day = 3;
    s.minutes = 10 * 60;
    const m = s.money;
    expect(festivalTalk(s, 'ba_tu')).toContain('300');
    expect(festivalTalk(s, 'ba_tu')).toBeNull();
    expect(festivalTalk(s, 'be_ti')).toContain('100');
    expect(s.money).toBe(m + 400);
    const r = bauCua(s, 0, 100, () => 0); // cả 3 mặt là Nai
    expect(r).toMatchObject({ ok: true, win: 300 });
    expect(bauCua(s, 1, 100, () => 0)).toMatchObject({ ok: true, win: -100 });
  });

  it('Trung Thu: tặng bánh trung thu gấp 3; ngoài giờ hội thì không', () => {
    const s = farm();
    s.day = 14 * 2 + 8;
    s.minutes = 19 * 60;
    expect(festivalNow(s)?.id).toBe('trung_thu');
    const slot = give(s, 'banh_trung_thu', 2);
    expect(giveGift(s, 'ba_tu', slot)).toMatchObject({ ok: true, points: 60 });
  });
});

describe('bản lưu v6 → v7', () => {
  it('thêm dữ liệu mốc 8', () => {
    const v6 = { ...newFarm({ x: 0, y: 0 }), version: 6 } as Record<string, unknown>;
    for (const k of ['orders', 'bundles', 'greenhouseDay', 'festival', 'fishCaught']) delete v6[k];
    const s = migrate(v6)!;
    expect(s.bundles).toEqual({});
    expect(s.fishCaught).toEqual({});
    expect(s.greenhouseDay).toBeNull();
  });
});
