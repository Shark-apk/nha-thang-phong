import { afterEach, describe, expect, it } from 'vitest';
import { newFarm, sellPrice, sleep, useOnTile, type FarmState } from './farm';
import { chooseProfession, has, maxEnergyOf, pendingChoices, PROFESSIONS, setWorn, SKILL_XP, skillLevel, skillXpFromEvent, SKILLS } from './skills';
import { cast } from './activities';
import { strike, upgradeTool } from './resources';
import { activeBonus, DEFAULT_LOOK, OUTFITS } from '../data';
import { migrate } from './save';

const farm = () => {
  const s = newFarm({ x: 0, y: 0 });
  s.weather = 'sunny';
  s.tomorrow = 'sunny';
  return s;
};
const give = (s: FarmState, item: string, qty = 1) => {
  const i = s.inventory.indexOf(null);
  s.inventory[i] = { item, qty };
  return i;
};
afterEach(() => setWorn(null));

describe('kỹ năng', () => {
  it('cấp 0–10 theo kinh nghiệm tích lũy; việc làm cộng đúng kỹ năng', () => {
    expect(skillLevel(0)).toBe(0);
    expect(skillLevel(SKILL_XP[5])).toBe(5);
    expect(skillLevel(99999)).toBe(10);
    const s = farm();
    skillXpFromEvent(s, 'harvest', 3);
    skillXpFromEvent(s, 'fish', 1);
    expect(s.skills.farming).toBe(12);
    expect(s.skills.fishing).toBe(12);
    s.skills.cooking = SKILL_XP[1] - 5;
    expect(skillXpFromEvent(s, 'cook', 1)).toEqual([['cooking', 1]]);
  });

  it('cấp 5 chọn 1 trong 2 nghề, cấp 10 chọn nhánh con của nghề đã chọn', () => {
    const s = farm();
    expect(pendingChoices(s)).toEqual([]);
    s.skills.fishing = SKILL_XP[5];
    const c = pendingChoices(s);
    expect(c).toHaveLength(1);
    expect(c[0].options.map((o) => o.id)).toEqual(['ngu_dan', 'di_bien']);
    expect(chooseProfession(s, 'vua_ca')).toBe(false);
    expect(chooseProfession(s, 'ngu_dan')).toBe(true);
    expect(pendingChoices(s)).toEqual([]);
    s.skills.fishing = SKILL_XP[10];
    expect(pendingChoices(s)[0].options.map((o) => o.id)).toEqual(['vua_ca', 'san_ca']);
    expect(chooseProfession(s, 'tho_lan')).toBe(false);
    expect(PROFESSIONS).toHaveLength(30);
    expect(SKILLS).toHaveLength(5);
  });
});

describe('hiệu ứng nghề', () => {
  it('nông dân giỏi bán rau thêm 10%; ngư dân bán cá thêm 25%', () => {
    const s = farm();
    const base = sellPrice({ item: 'pumpkin', qty: 1 }, s);
    s.professions.push('nong_dan', 'ngu_dan');
    expect(sellPrice({ item: 'pumpkin', qty: 1 }, s)).toBe(Math.round(base * 1.1));
    expect(sellPrice({ item: 'ca_ngu', qty: 1 }, s)).toBe(Math.round(400 * 1.25));
    s.shipping = [{ item: 'pumpkin', qty: 2 }];
    s.tomorrow = 'sunny';
    expect(sleep(s).income).toBe(Math.round(base * 1.1) * 2);
  });

  it('người đi biển có vùng câu to hơn; thợ mỏ thêm quặng; bạn thợ rèn rèn rẻ hơn', () => {
    const s = farm();
    const rod = give(s, 'rod');
    s.minutes = 600;
    const a = cast(s, rod, 'pond', () => 0);
    s.professions.push('di_bien', 'tho_mo', 'tho_ren');
    const b = cast(s, rod, 'pond', () => 0);
    expect(a.ok && b.ok && b.bar - a.bar).toBeCloseTo(0.05);
    const r = strike(s, 4, 'mine_copper', 99, () => 0);
    expect(r.ok && r.drops.find(([i]) => i === 'ore_copper')?.[1]).toBe(2);
    s.money = 1500;
    give(s, 'ore_copper', 5);
    expect(upgradeTool(s, 'axe').ok).toBe(true);
    expect(s.money).toBe(0);
    expect(has(s, 'tho_mo')).toBe(true);
  });
});

describe('bộ đồ', () => {
  it('mặc đủ nón + áo đúng bộ mới có hiệu ứng', () => {
    const farmer = OUTFITS.find((o) => o.id === 'outfit_farmer')!;
    expect(activeBonus({ ...DEFAULT_LOOK, hat: farmer.hat, shirt: farmer.shirt })).toBe('water_saver');
    expect(activeBonus({ ...DEFAULT_LOOK, hat: farmer.hat, shirt: 3 })).toBeNull();
  });

  it('bộ nông dân: tưới tốn 1 sức; bộ mùa đông: sức tối đa 120', () => {
    const s = farm();
    useOnTile(s, 0, 1, 1, { tillable: true, nearWater: false });
    const e = s.energy;
    setWorn('water_saver');
    useOnTile(s, 1, 1, 1, { tillable: true, nearWater: false });
    expect(e - s.energy).toBe(1);
    setWorn('winter');
    expect(maxEnergyOf()).toBe(120);
    s.tomorrow = 'sunny';
    sleep(s);
    expect(s.energy).toBe(120);
  });
});

describe('bản lưu v9 → v10', () => {
  it('thêm kỹ năng và nghề', () => {
    const v9 = { ...newFarm({ x: 0, y: 0 }), version: 9 } as Record<string, unknown>;
    delete v9.skills;
    delete v9.professions;
    const s = migrate(v9)!;
    expect(s.skills.farming).toBe(0);
    expect(s.professions).toEqual([]);
  });
});
