import { describe, expect, it } from 'vitest';
import { buy, countItem, newFarm, priceOf, sleep, type FarmState } from './farm';
import { finishEvent, giveGift, heartsOf, npcHearts, npcState, shopOpen, stopAt, talk, weekday } from './villagers';
import { upgradeTool } from './resources';
import { ITEMS, NPC, NPCS } from '../data';
import VILLAGE from '../maps/village.json';
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

describe('dữ liệu dân làng', () => {
  it('8 dân làng, mọi món quà & điểm hẹn đều tồn tại trên bản đồ', () => {
    expect(NPCS).toHaveLength(8);
    const points = new Set((VILLAGE.layers.find((l) => l.name === 'points') as { objects: { name: string }[] }).objects.map((o) => o.name));
    for (const n of NPCS) {
      for (const it of [...n.loves, ...n.likes, ...n.dislikes]) expect(ITEMS[it], `${n.id}: ${it}`).toBeDefined();
      expect(points.has(n.home), `${n.id} home`).toBe(true);
      for (const sch of Object.values(n.schedule)) for (const [, p] of sch!) expect(p === 'home' || points.has(p), `${n.id} → ${p}`).toBe(true);
      expect(n.events.map((e) => e.hearts)).toEqual([2, 4, 6, 8]);
      for (const e of n.events) if (e.reward?.item) expect(ITEMS[e.reward.item], e.reward.item).toBeDefined();
    }
  });
});

describe('lịch sinh hoạt', () => {
  it('bà Tư sáng ra chợ, chiều ra gốc đa, tối về nhà; mưa về sớm; chợ mở theo bà', () => {
    const s = farm();
    const tu = NPC.ba_tu;
    expect(stopAt(s, tu, 7 * 60)).toBe('home_tu');
    expect(stopAt(s, tu, 9 * 60)).toBe('market');
    expect(stopAt(s, tu, 18 * 60)).toBe('banyan');
    expect(stopAt(s, tu, 20 * 60)).toBe('home');
    s.minutes = 10 * 60;
    expect(shopOpen(s, 'market')).toBe(true);
    s.minutes = 18 * 60;
    expect(shopOpen(s, 'market')).toBe(false);
    s.weather = 'rain';
    expect(stopAt(s, tu, 16 * 60)).toBe('home');
  });

  it('chủ nhật cô Mai không lên lớp', () => {
    const s = farm();
    s.day = 7;
    expect(weekday(s.day)).toBe(6);
    expect(stopAt(s, NPC.co_mai, 10 * 60)).not.toBe('school');
    s.day = 8;
    expect(stopAt(s, NPC.co_mai, 10 * 60)).toBe('school');
  });
});

describe('nói chuyện & quà', () => {
  it('lần đầu chào hỏi, mỗi ngày nói chuyện +tim một lần', () => {
    const s = farm();
    const r = talk(s, 'ba_tu');
    expect(r).toMatchObject({ kind: 'line', first: true });
    expect(r.kind === 'line' && r.text).toContain('Cháu mới về làng');
    expect(talk(s, 'ba_tu')).toMatchObject({ first: false });
    expect(npcState(s, 'ba_tu').love).toBe(20);
  });

  it('quà thích nhất cộng nhiều; 1 lần/ngày, 2 lần/tuần; sinh nhật ×8', () => {
    const s = farm();
    const slot = give(s, 'strawberry', 10);
    expect(giveGift(s, 'ba_tu', slot)).toMatchObject({ ok: true, taste: 'like', points: 45 });
    expect(giveGift(s, 'ba_tu', slot).ok).toBe(false); // cùng ngày
    night(s);
    expect(giveGift(s, 'ba_tu', slot).ok).toBe(true);
    night(s);
    expect(giveGift(s, 'ba_tu', slot)).toMatchObject({ ok: false });
    expect(giveGift(s, 'ba_tu', 0)).toMatchObject({ ok: false }); // dụng cụ không tặng
    // Sinh nhật bà Tư: xuân 5 — sang tuần mới cũng được
    s.day = 5;
    npcState(s, 'ba_tu').giftedDay = 0;
    const p = give(s, 'flower_honey', 1);
    expect(giveGift(s, 'ba_tu', p)).toMatchObject({ ok: true, taste: 'love', points: 640, birthday: true });
  });

  it('nhớ món quà hôm trước', () => {
    const s = farm();
    const slot = give(s, 'flower_honey', 1);
    talk(s, 'ba_tu');
    giveGift(s, 'ba_tu', slot);
    night(s);
    const r = talk(s, 'ba_tu');
    expect(r.kind === 'line' && r.text).toContain('mật hoa');
  });

  it('đủ 2 tim thì có sự kiện, nhận thưởng một lần; 4 tim bà Tư giảm giá hạt', () => {
    const s = farm();
    npcState(s, 'ba_tu').love = 2 * 250;
    npcState(s, 'ba_tu').seen.push('hello');
    const r = talk(s, 'ba_tu');
    expect(r.kind).toBe('event');
    if (r.kind !== 'event') return;
    expect(finishEvent(s, 'ba_tu', r.event)).toContain('hướng dương');
    expect(countItem(s, 'seed_sunflower')).toBe(10);
    expect(finishEvent(s, 'ba_tu', r.event)).toBeNull();
    const before = priceOf(s, 'seed_carrot');
    finishEvent(s, 'ba_tu', NPC.ba_tu.events[1], 30);
    expect(priceOf(s, 'seed_carrot')).toBe(Math.round(before * 0.9));
    s.money = 1000;
    buy(s, 'seed_carrot', 10);
    expect(s.money).toBe(1000 - Math.round(before * 0.9) * 10);
    expect(heartsOf(npcState(s, 'ba_tu').love)).toBe(2);
  });

  it('bác Năm 6 tim: rèn chỉ mất 1 ngày', () => {
    const s = farm();
    finishEvent(s, 'bac_nam', NPC.bac_nam.events[2]);
    s.money = 5000;
    give(s, 'ore_copper', 5);
    upgradeTool(s, 'hoe');
    expect(s.upgrading?.readyDay).toBe(s.day + 1);
  });

  it('tim tối đa 10', () => {
    const s = farm();
    npcState(s, 'be_ti').love = 99999;
    talk(s, 'be_ti');
    expect(npcHearts(s, 'be_ti')).toBe(10);
  });
});

describe('bản lưu v5 → v6', () => {
  it('thêm quan hệ, cờ, hòm thư', () => {
    const v5 = { ...newFarm({ x: 0, y: 0 }), version: 5 } as Record<string, unknown>;
    delete v5.npcs;
    delete v5.flags;
    delete v5.mailbox;
    const s = migrate(v5)!;
    expect(s.npcs).toEqual({});
    expect(s.flags).toEqual([]);
    expect(s.mailbox).toEqual([]);
  });
});
