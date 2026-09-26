// Luật nhiệm vụ: ngày/tuần (theo ngày thật, lưu ở hồ sơ), cốt truyện & nhiệm vụ dân làng (theo ô lưu), thành tích & danh hiệu.
import {
  ACHIEVEMENTS, BUNDLES, DAILY, DISHES, NPC_QUESTS, RODS, STORY, WEEKLY, ITEMS,
  type AchCheck, type QuestEvent, type QuestTemplate, type StoryCheck, type Unlock,
} from '../data';
import { addItem, countItem, seeded, type FarmState } from './farm';
import { levelOf, today, type Profile, type Reward } from './profile';
import { takeItem } from './resources';
import { skillLevel, SKILLS } from './skills';
import { heartsOf, npcState } from './villagers';
import { addPassPoints, PASS_POINTS } from './events';

export interface QuestProgress { id: string; text: string; event: QuestEvent; target: number; progress: number; claimed: boolean }
export interface QuestBook { day: string; daily: QuestProgress[]; dailyBonus: boolean; week: string; weekly: QuestProgress[] }
export interface Stats { counts: Partial<Record<QuestEvent, number>>; dishes: string[] }

export const emptyStats = (): Stats => ({ counts: {}, dishes: [] });
export const emptyBook = (): QuestBook => ({ day: '', daily: [], dailyBonus: false, week: '', weekly: [] });

export const DAILY_REWARD: Reward = { money: 100, tem: 5 };
export const DAILY_BONUS: Reward = { tem: 10, money: 200 };
export const WEEKLY_REWARD: Reward = { money: 600, tem: 30 };

/** Thứ Hai của tuần chứa ngày `d` (YYYY-MM-DD) — khóa của nhiệm vụ tuần. */
export function weekKey(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return today(dt);
}

const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function unlocked(need: Unlock, s: FarmState | null, friends: boolean) {
  if (!need) return true;
  if (!s) return false;
  switch (need) {
    case 'rod': return s.inventory.some((x) => !!x && !!RODS[x.item]);
    case 'kitchen': return s.flags.includes('kitchen');
    case 'animals': return s.animals.length > 0;
    case 'village': return Object.keys(s.npcs).length > 0;
    case 'friends': return friends;
  }
}

function roll(templates: QuestTemplate[], count: number, key: string, s: FarmState | null, friends: boolean): QuestProgress[] {
  const pool = templates.filter((t) => unlocked(t.need, s, friends));
  const seed = hash(key);
  const picked = [...pool].sort((a, b) => seeded(seed + hash(a.id)) - seeded(seed + hash(b.id))).slice(0, count);
  return picked.map((t, i) => {
    const [lo, hi] = t.range;
    let n = lo + Math.floor(seeded(seed * 7 + i * 13) * (hi - lo + 1));
    if (t.event === 'sell') n = Math.round(n / 50) * 50;
    return { id: t.id, text: t.text(n), event: t.event, target: n, progress: 0, claimed: false };
  });
}

/** Làm mới nhiệm vụ khi sang ngày / tuần thật mới (nhiệm vụ hợp với những gì ô lưu đã mở). */
export function ensureQuests(p: Profile, s: FarmState | null, friends = false, day = today()) {
  const q = p.quests;
  let changed = false;
  if (q.day !== day) {
    q.day = day;
    q.daily = roll(DAILY, 3, `d${day}`, s, friends);
    q.dailyBonus = false;
    changed = true;
  }
  const wk = weekKey(day);
  if (q.week !== wk) {
    q.week = wk;
    q.weekly = roll(WEEKLY, 5, `w${wk}`, s, friends);
    changed = true;
  }
  return changed;
}

/** Cộng tiến độ; trả về các nhiệm vụ vừa hoàn thành. */
export function questEvent(p: Profile, e: string, n: number): QuestProgress[] {
  const done: QuestProgress[] = [];
  for (const q of [...p.quests.daily, ...p.quests.weekly]) {
    if (q.event !== e || q.claimed || q.progress >= q.target) continue;
    q.progress = Math.min(q.target, q.progress + n);
    if (q.progress >= q.target) done.push(q);
  }
  return done;
}

export function claimQuest(p: Profile, kind: 'daily' | 'weekly', i: number): Reward | null {
  const q = p.quests[kind][i];
  if (!q || q.claimed || q.progress < q.target) return null;
  q.claimed = true;
  addPassPoints(p, kind === 'daily' ? PASS_POINTS.daily : PASS_POINTS.weekly);
  return kind === 'daily' ? DAILY_REWARD : WEEKLY_REWARD;
}

export const canClaimBonus = (p: Profile) => !p.quests.dailyBonus && p.quests.daily.length > 0 && p.quests.daily.every((q) => q.claimed);
export function claimBonus(p: Profile): Reward | null {
  if (!canClaimBonus(p)) return null;
  p.quests.dailyBonus = true;
  addPassPoints(p, PASS_POINTS.bonus);
  return DAILY_BONUS;
}

// ---------------------------------------------------------------- thống kê theo ô lưu

export function recordStat(s: FarmState, e: string, n: number, detail?: string) {
  s.stats.counts[e as QuestEvent] = (s.stats.counts[e as QuestEvent] ?? 0) + n;
  if (e === 'cook' && detail && !s.stats.dishes.includes(detail)) s.stats.dishes.push(detail);
}
const stat = (s: FarmState, e: QuestEvent) => s.stats.counts[e] ?? 0;
const bundlesDone = (s: FarmState) => BUNDLES.filter((b) => s.flags.includes(b.flag)).length;
const topHearts = (s: FarmState) => Math.max(0, ...Object.values(s.npcs).map((n) => heartsOf(n.love)));

// ---------------------------------------------------------------- cốt truyện

export function storyCheck(s: FarmState, c: StoryCheck): boolean {
  if ('stat' in c) return stat(s, c.stat) >= c.n;
  if ('talkedAll' in c) return Object.values(s.npcs).filter((n) => n.talkedDay > 0).length >= c.talkedAll;
  if ('building' in c) return !!s.buildings[c.building as 'coop'];
  if ('animals' in c) return s.animals.length >= c.animals;
  if ('toolUpgraded' in c) return Object.values(s.tools).some((t) => t > 0);
  if ('bundles' in c) return bundlesDone(s) >= c.bundles;
  if ('hearts' in c) return topHearts(s) >= c.hearts;
  if ('flag' in c) return s.flags.includes(c.flag);
  if ('fishKinds' in c) return Object.keys(s.fishCaught).length >= c.fishKinds;
  return false;
}

export const storyStep = (s: FarmState) => STORY.steps[s.story];
export const storyReady = (s: FarmState) => !!storyStep(s) && storyCheck(s, storyStep(s).check);

export function claimStory(s: FarmState): string[] | null {
  const st = storyStep(s);
  if (!st || !storyCheck(s, st.check)) return null;
  const got: string[] = [];
  if (st.reward.money) { s.money += st.reward.money; got.push(`${st.reward.money} xu`); }
  for (const [it, n] of st.reward.items ?? []) {
    if (!addItem(s, it, n)) s.mailbox.push({ item: it, qty: n, from: 'Cốt truyện' });
    got.push(`${n} ${ITEMS[it].name.toLowerCase()}`);
  }
  if (st.reward.flag && !s.flags.includes(st.reward.flag)) s.flags.push(st.reward.flag);
  s.story++;
  return got;
}

// ---------------------------------------------------------------- nhiệm vụ dân làng

export const npcQuestsOpen = (s: FarmState) => NPC_QUESTS.filter((q) => !s.npcQuestsDone.includes(q.id) && heartsOf(s.npcs[q.npc]?.love ?? 0) >= q.hearts);

export function deliverNpcQuest(s: FarmState, id: string): string[] | null {
  const q = NPC_QUESTS.find((x) => x.id === id);
  if (!q || s.npcQuestsDone.includes(id) || heartsOf(s.npcs[q.npc]?.love ?? 0) < q.hearts) return null;
  if (countItem(s, q.item) < q.qty) return null;
  takeItem(s, q.item, q.qty);
  s.npcQuestsDone.push(id);
  const st = npcState(s, q.npc);
  st.love = Math.min(2500, st.love + q.reward.love);
  const got: string[] = [];
  if (q.reward.money) { s.money += q.reward.money; got.push(`${q.reward.money} xu`); }
  for (const [it, n] of q.reward.items ?? []) {
    if (!addItem(s, it, n)) s.mailbox.push({ item: it, qty: n, from: 'Dân làng' });
    got.push(`${n} ${ITEMS[it].name.toLowerCase()}`);
  }
  return got;
}

// ---------------------------------------------------------------- thành tích

export function achCheck(p: Profile, s: FarmState, c: AchCheck): boolean {
  if ('stat' in c) return stat(s, c.stat) >= c.n;
  if ('fishKinds' in c) return Object.keys(s.fishCaught).length >= c.fishKinds;
  if ('day' in c) return s.day >= c.day;
  if ('level' in c) return levelOf(p.xp).level >= c.level;
  if ('hearts' in c) return Object.values(s.npcs).filter((n) => heartsOf(n.love) >= c.hearts).length >= c.count;
  if ('animals' in c) return s.animals.length >= c.animals;
  if ('bundles' in c) return bundlesDone(s) >= c.bundles;
  if ('dishes' in c) return s.stats.dishes.filter((d) => DISHES.some((x) => x.id === d)).length >= c.dishes;
  if ('skill' in c) return SKILLS.filter((k) => skillLevel(s.skills[k.id]) >= c.skill).length >= c.count;
  if ('money' in c) return s.money >= c.money;
  if ('story' in c) return s.story >= c.story;
  if ('checkins' in c) return p.checkinCount >= c.checkins;
  return false;
}

/** Mở khóa thành tích mới (lưu ở hồ sơ, dùng cho mọi ô lưu). */
export function checkAchievements(p: Profile, s: FarmState | null) {
  if (!s) return [];
  const fresh = ACHIEVEMENTS.filter((a) => !p.achievements.includes(a.id) && achCheck(p, s, a.check));
  p.achievements.push(...fresh.map((a) => a.id));
  return fresh;
}

export const titlesOf = (p: Profile) => ACHIEVEMENTS.filter((a) => a.title && p.achievements.includes(a.id)).map((a) => a.title!);
