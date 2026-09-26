import { describe, expect, it } from 'vitest';
import { newFarm } from './farm';
import {
  addXp, applyReward, canCheckin, checkin, claimMail, levelOf, migrateProfile, needFor, newProfile, today, unclaimed, xpForEvent,
} from './profile';

describe('cấp nông trại', () => {
  it('bắt đầu cấp 1, đủ kinh nghiệm thì lên cấp và có thư thưởng', () => {
    const p = newProfile();
    expect(levelOf(0)).toEqual({ level: 1, into: 0, need: needFor(1) });
    const ups = addXp(p, needFor(1) + needFor(2) + 5);
    expect(ups).toEqual([2, 3]);
    expect(levelOf(p.xp)).toMatchObject({ level: 3, into: 5 });
    expect(unclaimed(p)).toBe(2);
    expect(p.mail[0].title).toBe('Lên cấp 3!');
  });

  it('kinh nghiệm theo việc làm; bán hàng 1 điểm mỗi 50 xu', () => {
    expect(xpForEvent('harvest', 4)).toBe(12);
    expect(xpForEvent('sell', 500)).toBe(10);
    expect(xpForEvent('sleep', 1)).toBe(0);
  });
});

describe('điểm danh', () => {
  it('mỗi ngày thật 1 lần, 7 ngày vòng lại; lỡ ngày không mất chuỗi', () => {
    const p = newProfile();
    expect(checkin(p, '2026-09-27')).toMatchObject({ day: 1, reward: { money: 200 } });
    expect(checkin(p, '2026-09-27')).toBeNull();
    expect(canCheckin(p, '2026-09-30')).toBe(true);
    expect(checkin(p, '2026-09-30')?.day).toBe(2);
    for (let d = 1; d <= 5; d++) checkin(p, `2026-10-0${d}`);
    expect(p.checkin.next).toBe(1);
    expect(today(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('nhận thưởng', () => {
  it('tiền & đồ vào ô lưu, tem & trang phục vào hồ sơ; túi đầy thì vào hòm thư', () => {
    const p = newProfile();
    const s = newFarm({ x: 0, y: 0 });
    for (let i = 0; i < s.inventory.length; i++) s.inventory[i] ??= { item: 'stone', qty: 1 };
    const got = applyReward(p, s, { money: 100, tem: 3, items: [['seed_carrot', 2], ['wood', 5]], outfit: 'outfit_farmer' });
    expect(s.money).toBe(250);
    expect(p.tem).toBe(3);
    expect(p.wardrobe).toContain('hat_straw');
    expect(p.wardrobe).toContain('shirt_1');
    expect(s.mailbox).toEqual([{ item: 'wood', qty: 5, from: 'Làng' }]);
    expect(got).toContain('100 xu');
  });

  it('thư chỉ nhận thưởng một lần', () => {
    const p = newProfile();
    addXp(p, needFor(1));
    const s = newFarm({ x: 0, y: 0 });
    const id = p.mail[0].id;
    expect(claimMail(p, id, s)).toContain('200 xu');
    expect(claimMail(p, id, s)).toBeNull();
  });

  it('hồ sơ hỏng hoặc thiếu trường thì dựng lại đủ', () => {
    expect(migrateProfile(null).name).toBe('Phong');
    expect(migrateProfile({ version: 1, name: 'Tí', wardrobe: ['outfit_basic'] })).toMatchObject({ name: 'Tí', xp: 0, look: { hat: 'straw' } });
  });
});
