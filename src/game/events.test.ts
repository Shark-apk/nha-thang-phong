import { describe, expect, it } from 'vitest';
import { newFarm } from './farm';
import { checkin, newProfile } from './profile';
import {
  activeEvent, buyEventItem, claimEventQuest, claimPassTier, EVENTS, eventProgress, eventQuestEvent, nextEvent, PASS, passKey, passState, passTier,
} from './events';
import { claimQuest, ensureQuests, questEvent } from './quests';
import { ITEMS } from '../data';

describe('sự kiện theo ngày thật', () => {
  it('lịch đọc từ events.json; mọi món và nhiệm vụ hợp lệ', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(6);
    for (const e of EVENTS) {
      expect(e.start <= e.end, e.id).toBe(true);
      for (const s of e.shop) if (s.kind === 'item' || s.kind === 'decor') expect(ITEMS[s.id], s.id).toBeDefined();
    }
    for (const t of PASS.tiers) if (t.item) expect(ITEMS[t.item], t.item).toBeDefined();
    expect(PASS.tiers).toHaveLength(30);
  });

  it('Tết diễn ra 20/1–20/2; ngoài đợt thì báo sự kiện sắp tới', () => {
    expect(activeEvent('2027-01-25')?.id).toBe('tet');
    expect(activeEvent('2027-02-21')).toBeUndefined();
    expect(nextEvent('2027-02-21')).toMatchObject({ ev: { id: 'hoa' }, days: 8 });
    expect(nextEvent('2026-12-31')?.ev.id).toBe('tet');
  });

  it('nhiệm vụ sự kiện → tem → đổi đồ; mỗi món đổi một lần', () => {
    const p = newProfile();
    const s = newFarm({ x: 0, y: 0 });
    const day = '2027-01-25';
    expect(eventQuestEvent(p, 'talk', 8, day)).toEqual(['Chúc Tết 8 dân làng']);
    expect(claimEventQuest(p, 1, day)).toBe(15);
    expect(claimEventQuest(p, 1, day)).toBeNull();
    expect(claimEventQuest(p, 0, day)).toBeNull();
    p.tem = 100;
    expect(buyEventItem(p, s, 0, day)).toMatchObject({ ok: true });
    expect(p.wardrobe).toContain('shirt_4');
    expect(buyEventItem(p, s, 4, day)).toMatchObject({ ok: true });
    expect(s.inventory.some((x) => x?.item === 'banh_chung' && x.qty === 2)).toBe(true);
    expect(buyEventItem(p, s, 4, day).ok).toBe(false);
    expect(p.tem).toBe(100 - 40 - 15);
    expect(eventProgress(p, EVENTS[0], '2028-01-25').claimed).toEqual([]); // năm sau làm lại từ đầu
  });
});

describe('sổ mùa', () => {
  it('30 bậc theo quý; điểm từ điểm danh, nhiệm vụ; bậc nào nhận bậc đó', () => {
    const p = newProfile();
    const s = newFarm({ x: 0, y: 0 });
    expect(passKey('2027-05-02')).toBe('2027-Q2');
    checkin(p);
    const ps = passState(p);
    expect(ps.points).toBe(5);
    ensureQuests(p, s);
    const q = p.quests.daily[0];
    questEvent(p, q.event, q.target);
    claimQuest(p, 'daily', 0);
    expect(passState(p).points).toBe(15);
    passState(p).points = 120;
    expect(passTier(120)).toBe(2);
    const m = s.money;
    expect(claimPassTier(p, s, 1)).toBe('200 xu');
    expect(s.money).toBe(m + 200);
    expect(claimPassTier(p, s, 1)).toBeNull();
    expect(claimPassTier(p, s, 3)).toBeNull();
    expect(claimPassTier(p, s, 2)).toBe('5 tem');
  });
});
