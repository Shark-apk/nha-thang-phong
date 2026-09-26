import { describe, expect, it } from 'vitest';
import { buildWorld, isTillable, soilAt } from './world';
import type { FarmMap } from './farm';

const MAPS: FarmMap[] = ['plain', 'coast', 'tea', 'highland', 'delta'];

describe('5 bản đồ nông trại', () => {
  it.each(MAPS)('%s: chỗ xuất hiện, cửa nhà, lối sang làng đi được; ruộng có đủ ô cuốc', (map) => {
    const w = buildWorld(7, map);
    expect(w.blocked[w.spawn.y][w.spawn.x], 'spawn').toBe(false);
    expect(w.blocked[w.house.door.y + 1][w.house.door.x], 'trước cửa nhà').toBe(false);
    for (let y = w.east.y0; y <= w.east.y1; y++) expect(w.land[y][w.east.x], 'lối sang làng').toBe(true);
    let tillable = 0;
    for (let y = w.farm.y0 + 1; y < w.farm.y1; y++) for (let x = w.farm.x0 + 1; x < w.farm.x1; x++) if (isTillable(w, x, y)) tillable++;
    expect(tillable).toBeGreaterThan(200);
  });

  it('mỗi bản đồ một kiểu đất', () => {
    expect(soilAt(24, 18, 'plain')).toBe('loam');
    expect(soilAt(24, 18, 'coast')).toBe('sand');
    expect(soilAt(24, 12, 'tea')).toBe('red');
    expect(soilAt(24, 18, 'highland')).toBe('red');
    expect(soilAt(16, 24, 'delta')).toBe('clay');
  });

  it('Đồng bằng giữ nguyên bố cục cũ (bản lưu cũ không bị xê dịch)', () => {
    const a = buildWorld();
    const b = buildWorld(7, 'plain');
    expect(JSON.stringify(a.decor)).toBe(JSON.stringify(b.decor));
  });
});
