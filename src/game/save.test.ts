import { describe, expect, it } from 'vitest';
import { MAX_WATER, newFarm, SAVE_VERSION } from './farm';
import { migrate } from './save';
import { CROPS, ITEMS, SHOP } from '../data';

describe('bản lưu', () => {
  it('bản lưu v1 (trước khi có bình tưới giới hạn & nhiều bản đồ) nâng lên bản mới nhất', () => {
    const v1 = { version: 1, day: 5, minutes: 400, money: 300, energy: 80, inventory: [], tilled: {}, crops: {}, shipping: [], player: { x: 1, y: 2 }, lastIncome: 0 };
    const s = migrate(v1)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.water).toBe(MAX_WATER);
    expect(s.location).toBe('farm');
    expect(s.trees).toEqual({});
    expect(s.weather).toBe('sunny');
    expect(s.day).toBe(5);
  });

  it('bản mới tạo đã ở phiên bản mới nhất; bản lưu lạ bị từ chối', () => {
    expect(migrate(newFarm({ x: 0, y: 0 }))).not.toBeNull();
    expect(migrate({ version: 999 })).toBeNull();
    expect(migrate({})).toBeNull();
  });
});

describe('dữ liệu nội dung', () => {
  it('mọi cây có hạt giống, sản phẩm và đủ khung hình cho từng giai đoạn', () => {
    for (const c of Object.values(CROPS)) {
      expect(ITEMS[c.harvest], c.id).toBeDefined();
      expect(c.frames.length).toBe(c.stageDays.length);
      expect(Object.values(ITEMS).some((i) => i.crop === c.id), `hạt của ${c.id}`).toBe(true);
    }
  });

  it('mọi món trong quầy đều mua được', () => {
    for (const id of SHOP) expect(ITEMS[id].buy).toBeGreaterThan(0);
  });
});
