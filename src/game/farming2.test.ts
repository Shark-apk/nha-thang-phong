import { describe, expect, it } from 'vitest';
import { countItem, key, newFarm, sleep, useOnTile, type FarmState } from './farm';
import { beautyOf, giantAt, harvestGiant, nightCrops } from './farming2';
import { placeObject, useObject } from './resources';
import { CROPS, HYBRIDS, ITEMS, QUALITY_NAME } from '../data';

const farm = () => { const s = newFarm({ x: 0, y: 0 }); s.weather = 'sunny'; s.tomorrow = 'sunny'; return s; };
const night = (s: FarmState) => { s.tomorrow = 'sunny'; return sleep(s); };
const give = (s: FarmState, item: string, qty = 1) => { const i = s.inventory.indexOf(null); s.inventory[i] = { item, qty }; return i; };
const env = (soil?: 'sand' | 'clay' | 'red') => ({ tillable: true, nearWater: false, soil, rng: () => 0.99 });
const ripe = (id: string) => ({ id, grown: CROPS[id].stageDays.at(-1)! });

describe('đất', () => {
  it('cuốc ghi nhận loại đất; cà phê chỉ trồng đất đỏ; phân hữu cơ cải tạo thành đất thịt', () => {
    const s = farm();
    s.day = 15; // mùa hè
    useOnTile(s, 0, 1, 1, env('red'));
    useOnTile(s, 0, 2, 1, env());
    expect(s.tilled[key(1, 1)].soil).toBe('red');
    expect(s.tilled[key(2, 1)].soil).toBeUndefined();
    const seed = give(s, 'seed_ca_phe', 2);
    expect(useOnTile(s, seed, 2, 1, env()).ok).toBe(false);
    expect(useOnTile(s, seed, 1, 1, env()).ok).toBe(true);
    useOnTile(s, 0, 3, 1, env('clay'));
    const c = give(s, 'compost', 1);
    expect(useOnTile(s, c, 3, 1, env()).ok).toBe(true);
    expect(s.tilled[key(3, 1)].soil).toBeUndefined();
  });

  it('phân tốt + Trồng trọt cấp 8 mới ra được hạng kim cương', () => {
    expect(QUALITY_NAME[3]).toBe('Kim cương');
    const s = farm();
    s.skills.farming = 2500;
    useOnTile(s, 0, 1, 1, env());
    const f = give(s, 'fertilizer_2', 1);
    expect(useOnTile(s, f, 1, 1, env()).ok).toBe(true);
    s.crops[key(1, 1)] = ripe('carrot');
    expect(useOnTile(s, 0, 1, 1, { ...env(), rng: () => 0.01 })).toMatchObject({ action: 'harvest', q: 3 });
  });
});

describe('sâu bệnh', () => {
  it('cây bị sâu không lớn; bấm vào để bắt sâu; nuôi vịt thì ít sâu hơn', () => {
    const s = farm();
    useOnTile(s, 0, 1, 1, env());
    s.crops[key(1, 1)] = { id: 'carrot', grown: 0, pest: true };
    s.tilled[key(1, 1)].watered = true;
    night(s);
    expect(s.crops[key(1, 1)].grown).toBe(0);
    expect(useOnTile(s, 0, 1, 1, env())).toMatchObject({ ok: true, action: 'pest' });
    expect(s.crops[key(1, 1)].pest).toBe(false);
    const count = (duck: boolean) => {
      let n = 0;
      for (let d = 1; d <= 40; d++) {
        const t = farm();
        t.day = d;
        if (duck) t.animals.push({ id: 1, kind: 'duck', name: 'V', love: 0, daysSince: 0, product: false, fedToday: false, pettedToday: false });
        for (let i = 0; i < 20; i++) t.crops[key(i, 5)] = { id: 'carrot', grown: 0 };
        n += nightCrops(t).pests;
      }
      return n;
    };
    expect(count(true)).toBeLessThan(count(false));
  });
});

describe('cây giàn, khổng lồ, lai giống', () => {
  it('cây giàn thu thêm 1', () => {
    const s = farm();
    useOnTile(s, 0, 1, 1, env());
    s.crops[key(1, 1)] = ripe('cucumber');
    expect(useOnTile(s, 0, 1, 1, env())).toMatchObject({ qty: CROPS.cucumber.yield + 1 });
  });

  it('3×3 dưa hấu chín có thể thành trái khổng lồ, bổ bằng rìu ra 15 trái bạc', () => {
    let s: FarmState | null = null;
    for (let d = 1; d < 200 && !s; d++) {
      const t = farm();
      t.day = d;
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) t.crops[key(x, y)] = ripe('watermelon');
      if (nightCrops(t).giant) s = t;
    }
    expect(s).not.toBeNull();
    if (!s) return;
    expect(Object.keys(s.crops)).toHaveLength(0);
    const k = giantAt(s, 2, 2)!;
    expect(k).toBe(key(0, 0));
    expect(harvestGiant(s, k, 0).ok).toBe(false);
    expect(harvestGiant(s, k, 3)).toMatchObject({ ok: true, qty: 15 });
    expect(countItem(s, 'watermelon')).toBe(15);
    expect(beautyOf(s)).toBe(0);
  });

  it('12 giống lai; hai cây khác loại chín cạnh nhau có lúc ra hạt lai và ghi sổ', () => {
    expect(HYBRIDS).toHaveLength(12);
    for (const h of HYBRIDS) expect(ITEMS[`seed_${h.id}`].buy).toBe(0);
    let s: FarmState | null = null;
    for (let d = 1; d < 400 && !s; d++) {
      const t = farm();
      t.day = d;
      t.crops[key(5, 5)] = ripe('corn');
      t.crops[key(6, 5)] = ripe('sunflower');
      if (nightCrops(t).hybrid) s = t;
    }
    expect(s).not.toBeNull();
    expect(s!.hybrids).toEqual(['bap_cau_vong']);
    expect(countItem(s!, 'seed_bap_cau_vong')).toBe(2);
  });
});

describe('máy mới', () => {
  it('máy sàng chè: 3 búp → trà khô; nhà nấm tự mọc nấm mỗi 2 ngày', () => {
    const s = farm();
    s.objects.a = { kind: 'tea_sifter' };
    const slot = give(s, 'che', 3);
    expect(useObject(s, 'a', slot)).toMatchObject({ ok: true, item: 'tra_kho' });
    const m = give(s, 'mushroom_house', 1);
    expect(placeObject(s, m, 9, 9, true).ok).toBe(true);
    night(s);
    expect(useObject(s, key(9, 9), 0).ok).toBe(false);
    night(s);
    night(s);
    expect(useObject(s, key(9, 9), 0)).toMatchObject({ ok: true, item: 'nam_rom', qty: 2 });
  });
});
