import { describe, expect, it } from 'vitest';
import { newFarm } from './farm';
import { newProfile } from './profile';
import { acceptGuest, claimSet, deliverGuest, guestEvent, guestState, setCount, watchShow, weekGuests, weekIndex } from './guests';
import { FOLK, GUESTS, ITEMS, STARS } from '../data';
import VILLAGE from '../maps/village.json';

describe('khách mời', () => {
  it('24 khách, đồ nhiệm vụ đều có thật, chỗ đứng có trên bản đồ làng', () => {
    expect(GUESTS).toHaveLength(24);
    expect(FOLK).toHaveLength(12);
    expect(STARS).toHaveLength(12);
    const points = new Set((VILLAGE.layers.find((l) => l.name === 'points') as { objects: { name: string }[] }).objects.map((o) => o.name));
    for (const g of GUESTS) {
      expect(points.has(g.spot), `${g.id} ${g.spot}`).toBe(true);
      for (const q of g.quests) if (q.kind === 'deliver') expect(ITEMS[q.item], `${g.id} ${q.item}`).toBeDefined();
    }
  });

  it('mỗi tuần thật 2 khách (dân gian + tự thiết kế), 12 tuần thì gặp đủ', () => {
    expect(weekIndex('2026-01-05')).toBe(0);
    expect(weekIndex('2026-01-11')).toBe(0);
    expect(weekIndex('2026-01-12')).toBe(1);
    const [a, b] = weekGuests('2026-09-28');
    expect(a.set).toBe('folk');
    expect(b.set).toBe('star');
    const seen = new Set<string>();
    for (let w = 0; w < 12; w++) {
      const d = new Date(Date.UTC(2026, 0, 5 + w * 7)).toISOString().slice(0, 10);
      weekGuests(d).forEach((g) => seen.add(g.id));
    }
    expect(seen.size).toBe(24);
  });

  it('nhận việc → làm 3 bước (đếm việc, giao đồ) → được thẻ', () => {
    const p = newProfile();
    const s = newFarm({ x: 0, y: 0 });
    const id = 'thang_bom'; // giao cá mè → giao gỗ → thu hoạch 20
    expect(guestEvent(p, s, 'harvest', 50)).toEqual([]); // chưa nhận việc
    expect(acceptGuest(p, id)).toBe(true);
    expect(deliverGuest(p, s, id)).toBeNull();
    s.inventory[6] = { item: 'ca_me', qty: 3 };
    expect(deliverGuest(p, s, id)).toContain('tem');
    s.inventory[6] = { item: 'wood', qty: 20 };
    expect(deliverGuest(p, s, id)).not.toBeNull();
    expect(guestEvent(p, s, 'harvest', 12)).toEqual([]);
    expect(guestEvent(p, s, 'harvest', 8)[0]).toContain('thẻ Thằng Bờm');
    expect(p.cards).toEqual(['thang_bom']);
    expect(guestState(p, id).accepted).toBe(false);
    expect(acceptGuest(p, id)).toBe(false);
  });

  it('đủ 12 thẻ một bộ thì nhận thưởng bộ một lần; xem biểu diễn mỗi tuần một lần', () => {
    const p = newProfile();
    const s = newFarm({ x: 0, y: 0 });
    p.cards = FOLK.slice(0, 11).map((g) => g.id);
    expect(claimSet(p, s, 'folk')).toBeNull();
    p.cards.push(FOLK[11].id);
    expect(setCount(p, 'folk')).toBe(12);
    expect(claimSet(p, s, 'folk')).toContain('20.000');
    expect(claimSet(p, s, 'folk')).toBeNull();
    expect(watchShow(p, '2026-09-28')).toMatchObject({ tem: 10 });
    expect(watchShow(p, '2026-10-01')).toBeNull();
    expect(watchShow(p, '2026-10-05')).not.toBeNull();
  });
});
