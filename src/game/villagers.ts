// Luật dân làng: lịch sinh hoạt, nói chuyện (có ghi nhớ), tặng quà, tim, sự kiện tim, phần thưởng mở khóa.
import { emit } from './bus';
import { GIFT_POINTS, GIFTS_PER_WEEK, ITEMS, LOVE_PER_HEART, NPC, NPCS, TALK_POINTS, type HeartEvent, type ItemId, type Line, type NpcDef, type Stop } from '../data';
import { addItem, dayOfSeason, isWet, removeFromSlot, seasonOf, seeded, type FarmState } from './farm';
import { festivalGiftMult, festivalToday } from './activities';

export interface NpcState {
  love: number;
  talkedDay: number;
  giftedDay: number;
  /** Tuần (tính từ ngày 1) của lần đếm quà gần nhất và số quà trong tuần đó. */
  giftWeek: number;
  giftsThisWeek: number;
  /** Lời thoại "một lần" và sự kiện tim đã xem. */
  seen: string[];
  lastGift?: { item: ItemId; day: number; taste: Taste; thanked?: boolean };
}

export type Taste = 'love' | 'like' | 'neutral' | 'dislike';

export const weekday = (day: number) => (day - 1) % 7;
export const weekOf = (day: number) => Math.floor((day - 1) / 7);
export const heartsOf = (love: number) => Math.min(10, Math.floor(love / LOVE_PER_HEART));
export const hasFlag = (s: FarmState, f: string) => s.flags.includes(f);

export function npcState(s: FarmState, id: string): NpcState {
  s.npcs[id] ??= { love: 0, talkedDay: 0, giftedDay: 0, giftWeek: -1, giftsThisWeek: 0, seen: [] };
  return s.npcs[id];
}
export const npcHearts = (s: FarmState, id: string) => heartsOf(s.npcs[id]?.love ?? 0);

// ---------------------------------------------------------------- lịch sinh hoạt

export function scheduleFor(s: FarmState, npc: NpcDef): Stop[] {
  // Ngày hội: cả làng ra sân đình / gốc đa đúng giờ hội
  const f = festivalToday(s);
  if (f) {
    const i = NPCS.indexOf(npc);
    return [[0, 'home'], [f.hours[0] - 60, 'home'], [f.hours[0], `fest_${i}`], [f.hours[1], 'home']];
  }
  if (isWet(s.weather) && npc.schedule.wet) return npc.schedule.wet;
  if (weekday(s.day) === 6 && npc.schedule.sunday) return npc.schedule.sunday;
  return npc.schedule.base;
}

/** Điểm hẹn của dân làng lúc `minutes`: mục cuối cùng đã tới giờ. 'home' = ở trong nhà. */
export function stopAt(s: FarmState, npc: NpcDef, minutes = s.minutes): string {
  const sch = scheduleFor(s, npc);
  let cur = sch[0][1];
  for (const [t, p] of sch) if (minutes >= t) cur = p;
  return cur;
}

/** Tiệm của dân làng mở khi người đó đang ở chỗ bán hàng. */
export const SHOPS: Record<string, { npc: string; point: string; tab: 'seeds' | 'animals' | 'smith' | 'fish' }> = {
  hut_bay: { npc: 'ong_bay', point: 'dock', tab: 'fish' },
  market: { npc: 'ba_tu', point: 'market', tab: 'seeds' },
  smith: { npc: 'bac_nam', point: 'smith', tab: 'smith' },
  house_hai: { npc: 'anh_hai', point: 'field', tab: 'animals' },
};
export function shopOpen(s: FarmState, shop: keyof typeof SHOPS) {
  const sh = SHOPS[shop];
  return stopAt(s, NPC[sh.npc]) === sh.point;
}
/** Giờ mở cửa để báo cho người chơi. */
export function shopHours(s: FarmState, shop: keyof typeof SHOPS) {
  const sh = SHOPS[shop];
  const sch = scheduleFor(s, NPC[sh.npc]);
  const spans: string[] = [];
  sch.forEach(([t, p], i) => {
    if (p !== sh.point) return;
    const end = sch[i + 1]?.[0] ?? 24 * 60;
    spans.push(`${Math.floor(t / 60)}h–${Math.floor(end / 60)}h`);
  });
  return spans.join(', ') || 'hôm nay nghỉ';
}

// ---------------------------------------------------------------- quà

export const isBirthday = (s: FarmState, npc: NpcDef) => seasonOf(s.day) === npc.birthday.season && dayOfSeason(s.day) === npc.birthday.day;

export function tasteOf(npc: NpcDef, item: ItemId): Taste {
  if (npc.loves.includes(item)) return 'love';
  if (npc.likes.includes(item)) return 'like';
  if (npc.dislikes.includes(item)) return 'dislike';
  return 'neutral';
}

const giftable = (item: ItemId) => !['tool', 'machine'].includes(ITEMS[item].kind);

export type GiftResult = { ok: true; taste: Taste; points: number; birthday: boolean; item: ItemId } | { ok: false; reason: string };

export function giveGift(s: FarmState, id: string, slot: number): GiftResult {
  const npc = NPC[id];
  const held = s.inventory[slot];
  if (!held || !giftable(held.item)) return { ok: false, reason: 'Cầm món muốn tặng trên tay' };
  const st = npcState(s, id);
  if (st.giftedDay === s.day) return { ok: false, reason: `Hôm nay đã tặng ${npc.name} rồi` };
  if (st.giftWeek !== weekOf(s.day)) {
    st.giftWeek = weekOf(s.day);
    st.giftsThisWeek = 0;
  }
  const bday = isBirthday(s, npc);
  if (st.giftsThisWeek >= GIFTS_PER_WEEK && !bday) return { ok: false, reason: `Tuần này đã tặng ${npc.name} ${GIFTS_PER_WEEK} lần — tuần sau nhé` };
  const taste = tasteOf(npc, held.item);
  const points = GIFT_POINTS[taste] * (bday ? 8 : 1) * festivalGiftMult(s, held.item);
  st.love = Math.max(0, Math.min(10 * LOVE_PER_HEART, st.love + points));
  st.giftedDay = s.day;
  st.giftsThisWeek++;
  st.lastGift = { item: held.item, day: s.day, taste };
  emit('gift', 1, id);
  removeFromSlot(s, slot);
  return { ok: true, taste, points, birthday: bday, item: held.item };
}

export const GIFT_REACTION: Record<Taste, string> = {
  love: 'Trời ơi, đúng món mình mê nhất! Cảm ơn nhiều lắm!',
  like: 'Ồ, cảm ơn nha. Mình thích cái này.',
  neutral: 'Cảm ơn nha.',
  dislike: 'Ờ… cảm ơn. (Có vẻ không thích lắm)',
};

// ---------------------------------------------------------------- nói chuyện

export type TalkResult = { kind: 'line'; text: string; first: boolean } | { kind: 'event'; event: HeartEvent };

const matches = (s: FarmState, hearts: number, l: Line) =>
  (!l.season || l.season === seasonOf(s.day)) && (l.wet === undefined || l.wet === isWet(s.weather)) && (!l.minHearts || hearts >= l.minHearts);

/** Nói chuyện: ưu tiên sự kiện tim chưa xem → lời chào lần đầu → nhắc món quà gần đây → câu theo mùa/thời tiết/tim. */
export function talk(s: FarmState, id: string): TalkResult {
  const npc = NPC[id];
  const st = npcState(s, id);
  const first = st.talkedDay !== s.day;
  if (first) {
    st.talkedDay = s.day;
    st.love = Math.min(10 * LOVE_PER_HEART, st.love + TALK_POINTS);
    emit('talk', 1, id);
  }
  const hearts = heartsOf(st.love);
  const ev = npc.events.find((e) => hearts >= e.hearts && !st.seen.includes(`ev${e.hearts}`));
  if (ev && first) return { kind: 'event', event: ev };
  const once = npc.lines.find((l) => l.once && !st.seen.includes(l.once) && matches(s, hearts, l));
  if (once) {
    st.seen.push(once.once!);
    return { kind: 'line', text: once.text, first };
  }
  const g = st.lastGift;
  if (g && !g.thanked && g.day < s.day && s.day - g.day <= 3 && g.taste !== 'neutral') {
    g.thanked = true;
    const name = ITEMS[g.item].name.toLowerCase();
    const text = g.taste === 'love' ? `Món ${name} hôm bữa ngon quá trời, mình còn nhớ hoài!` : g.taste === 'like' ? `Cảm ơn vụ ${name} hôm trước nha.` : `Ờ… lần sau đừng tặng ${name} nữa nha.`;
    return { kind: 'line', text, first };
  }
  const pool = npc.lines.filter((l) => !l.once && matches(s, hearts, l));
  // Ưu tiên câu có điều kiện (mùa, mưa, tim) để lời thoại hợp hoàn cảnh
  const special = pool.filter((l) => l.season || l.wet !== undefined || l.minHearts);
  const pick = special.length && seeded(s.day * 13 + npc.sheet) < 0.6 ? special : pool;
  const line = pick[Math.floor(seeded(s.day * 7 + npc.sheet * 3 + (first ? 0 : s.minutes)) * pick.length)];
  return { kind: 'line', text: line?.text ?? '…', first };
}

/** Xem xong sự kiện tim: ghi nhớ, cộng tình cảm theo lựa chọn, nhận thưởng. */
export function finishEvent(s: FarmState, id: string, ev: HeartEvent, choiceLove = 0): string | null {
  const st = npcState(s, id);
  if (st.seen.includes(`ev${ev.hearts}`)) return null;
  st.seen.push(`ev${ev.hearts}`);
  st.love = Math.min(10 * LOVE_PER_HEART, st.love + choiceLove);
  const r = ev.reward;
  if (!r) return null;
  if (r.flag && !s.flags.includes(r.flag)) s.flags.push(r.flag);
  if (r.item) {
    // Túi đầy: gửi vào thùng giao hàng để không mất quà
    if (!addItem(s, r.item, r.qty ?? 1)) s.mailbox.push({ item: r.item, qty: r.qty ?? 1, from: NPC[id].name });
  }
  return r.text;
}

export const allNpcs = () => NPCS;
