import { describe, expect, it } from 'vitest';
import { newFarm, type FarmState } from './farm';
import { newProfile } from './profile';
import {
  canClaimBonus, checkAchievements, claimBonus, claimQuest, claimStory, deliverNpcQuest, ensureQuests, npcQuestsOpen, questEvent, recordStat,
  storyReady, titlesOf, weekKey,
} from './quests';
import { ACHIEVEMENTS, NPC_QUESTS, STORY, ITEMS } from '../data';
import { npcState } from './villagers';
import { migrate } from './save';

const farm = () => newFarm({ x: 0, y: 0 });
const give = (s: FarmState, item: string, qty: number) => { s.inventory[s.inventory.indexOf(null)] = { item, qty }; };

describe('nhiệm vụ ngày & tuần', () => {
  it('3 nhiệm vụ ngày cố định trong ngày thật, đổi khi sang ngày; tuần tính từ thứ Hai', () => {
    const p = newProfile();
    const s = farm();
    expect(ensureQuests(p, s, false, '2026-09-28')).toBe(true);
    expect(p.quests.daily).toHaveLength(3);
    const a = JSON.stringify(p.quests.daily);
    expect(ensureQuests(p, s, false, '2026-09-28')).toBe(false);
    ensureQuests(p, s, false, '2026-09-29');
    expect(JSON.stringify(p.quests.daily)).not.toBe(a);
    expect(weekKey('2026-09-27')).toBe('2026-09-21'); // chủ nhật → thứ Hai trước đó
    expect(weekKey('2026-09-28')).toBe('2026-09-28');
    expect(p.quests.weekly).toHaveLength(5);
  });

  it('chưa có cần câu, bếp, vật nuôi thì không ra nhiệm vụ đó', () => {
    const p = newProfile();
    for (let d = 10; d < 28; d++) {
      p.quests.day = '';
      ensureQuests(p, farm(), false, `2026-09-${d}`);
      for (const q of p.quests.daily) expect(['fish', 'cook', 'collect', 'talk', 'gift']).not.toContain(q.event);
    }
  });

  it('làm việc cộng tiến độ, đủ thì nhận thưởng; đủ 3 nhiệm vụ ngày có thưởng thêm', () => {
    const p = newProfile();
    ensureQuests(p, farm(), false, '2026-09-28');
    for (const q of p.quests.daily) {
      expect(claimQuest(p, 'daily', p.quests.daily.indexOf(q))).toBeNull();
      const done = questEvent(p, q.event, q.target);
      expect(done.map((d) => d.id)).toContain(q.id);
    }
    expect(canClaimBonus(p)).toBe(false);
    p.quests.daily.forEach((_, i) => expect(claimQuest(p, 'daily', i)).toMatchObject({ money: 100 }));
    expect(claimQuest(p, 'daily', 0)).toBeNull();
    expect(claimBonus(p)).toMatchObject({ tem: 10 });
    expect(claimBonus(p)).toBeNull();
  });
});

describe('cốt truyện', () => {
  it('15 bước, bước sau mở khi xong bước trước; bước cuối mở đường lên chợ huyện', () => {
    expect(STORY.steps).toHaveLength(15);
    const s = farm();
    expect(storyReady(s)).toBe(false);
    recordStat(s, 'till', 20);
    expect(storyReady(s)).toBe(true);
    const m = s.money;
    expect(claimStory(s)).toContain('150 xu');
    expect(s.money).toBe(m + 150);
    expect(s.story).toBe(1);
    expect(claimStory(s)).toBeNull();
    s.story = 14;
    s.flags.push('b_garden', 'b_barn');
    expect(claimStory(s)).not.toBeNull();
    expect(s.flags).toContain('road_town');
  });
});

describe('nhiệm vụ dân làng', () => {
  it('mở theo tim, giao đủ đồ thì nhận thưởng + tình cảm', () => {
    for (const q of NPC_QUESTS) expect(ITEMS[q.item], q.id).toBeDefined();
    const s = farm();
    expect(npcQuestsOpen(s)).toHaveLength(0);
    npcState(s, 'ba_tu').love = 250;
    expect(npcQuestsOpen(s).map((q) => q.id)).toEqual(['q_tu_1']);
    expect(deliverNpcQuest(s, 'q_tu_1')).toBeNull();
    give(s, 'carrot', 5);
    expect(deliverNpcQuest(s, 'q_tu_1')).toContain('250 xu');
    expect(npcState(s, 'ba_tu').love).toBe(310);
    expect(npcQuestsOpen(s)).toHaveLength(0);
  });
});

describe('thành tích', () => {
  it('hơn 50 thành tích; mở một lần, có danh hiệu', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const p = newProfile();
    const s = farm();
    recordStat(s, 'harvest', 12);
    const got = checkAchievements(p, s).map((a) => a.id);
    expect(got).toContain('harvest_1');
    expect(checkAchievements(p, s)).toEqual([]);
    for (const k of ['fish', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's']) s.fishCaught[k] = 1;
    checkAchievements(p, s);
    expect(titlesOf(p)).toContain('Vua câu cá');
    recordStat(s, 'cook', 1, 'com_trang');
    recordStat(s, 'cook', 1, 'com_trang');
    expect(s.stats.dishes).toEqual(['com_trang']);
  });
});

describe('bản lưu v10 → v11', () => {
  it('thêm thống kê, cốt truyện', () => {
    const v10 = { ...newFarm({ x: 0, y: 0 }), version: 10 } as Record<string, unknown>;
    for (const k of ['stats', 'story', 'npcQuestsDone']) delete v10[k];
    const s = migrate(v10)!;
    expect(s.story).toBe(0);
    expect(s.stats.counts).toEqual({});
  });
});
