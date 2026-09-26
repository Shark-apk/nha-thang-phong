import { describe, expect, it } from 'vitest';
import { CROPS, DISHES, ITEMS } from '.';

/** Lời trung bình mỗi ngày của 1 ô đất trồng cây này suốt các mùa của nó. */
function perDay(id: string) {
  const c = CROPS[id];
  const days = c.stageDays.at(-1)!;
  const seed = Object.values(ITEMS).find((i) => i.crop === id)!.buy;
  const sell = ITEMS[c.harvest].sell * c.yield;
  const season = 14 * c.seasons.length;
  const profit = c.regrow ? (1 + Math.floor((season - days) / c.regrow)) * sell - seed : Math.floor(season / days) * (sell - seed);
  return profit / season;
}

describe('cân bằng giá', () => {
  it('không cây nào lỗ hoặc lời quá mức (4–25 xu/ô/ngày)', () => {
    for (const id of Object.keys(CROPS)) {
      const v = perDay(id);
      expect(v, id).toBeGreaterThanOrEqual(4);
      expect(v, id).toBeLessThanOrEqual(25);
    }
  });

  it('món nấu bán được giá hơn tổng nguyên liệu và hồi sức nhiều hơn ăn sống', () => {
    for (const d of DISHES) {
      const raw = d.needs.reduce((n, [it, q]) => n + ITEMS[it].sell * q, 0);
      const rawEnergy = d.needs.reduce((n, [it, q]) => n + (ITEMS[it].energy ?? 0) * q, 0);
      expect(d.sell, d.id).toBeGreaterThan(raw);
      expect(d.energy, d.id).toBeGreaterThan(rawEnergy);
    }
  });
});
