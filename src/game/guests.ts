// Luật khách mời: 2 khách mỗi tuần thật, nhiệm vụ 3 bước, thẻ sưu tập, thưởng đủ bộ, biểu diễn ở rạp hát.
import { FOLK, GUEST, SET_REWARD, STARS, ITEMS, type Guest } from '../data';
import { addItem, countItem, type FarmState } from './farm';
import { today, weekStart, type Profile } from './profile';
import { takeItem } from './resources';

export interface GuestState { step: number; progress: number; accepted: boolean }

const EPOCH = Date.UTC(2026, 0, 5); // một ngày thứ Hai
/** Số thứ tự tuần thật (từ 05/01/2026). */
export function weekIndex(day = today()) {
  const [y, m, d] = weekStart(new Date(day + 'T12:00:00')).split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / (7 * 86400000));
}

/** Hai khách tuần này: một nhân vật dân gian, một nhân vật tự thiết kế; xoay vòng đủ 12 tuần. */
export function weekGuests(day = today()): [Guest, Guest] {
  const w = ((weekIndex(day) % 12) + 12) % 12;
  return [FOLK[w], STARS[(w + 5) % 12]];
}

/** Khách có mặt ở làng từ 8h tới 20h (giờ trong game). */
export const guestAround = (minutes: number) => minutes >= 8 * 60 && minutes < 20 * 60;

export const guestState = (p: Profile, id: string): GuestState => (p.guests[id] ??= { step: 0, progress: 0, accepted: false });
export const currentQuest = (p: Profile, id: string) => GUEST[id].quests[guestState(p, id).step];
export const hasCard = (p: Profile, id: string) => p.cards.includes(id);

export function acceptGuest(p: Profile, id: string) {
  const st = guestState(p, id);
  if (st.accepted || hasCard(p, id)) return false;
  st.accepted = true;
  return true;
}

/** Thưởng mỗi bước: tem theo độ hiếm; xong bước 3 nhận thẻ. */
function completeStep(p: Profile, s: FarmState | null, g: Guest) {
  const st = guestState(p, g.id);
  st.step++;
  st.progress = 0;
  p.tem += 5 * g.rarity;
  if (s) s.money += 150 * g.rarity;
  if (st.step >= 3) {
    st.accepted = false;
    if (!p.cards.includes(g.id)) p.cards.push(g.id);
    return `thẻ ${g.name}!`;
  }
  return `${5 * g.rarity} tem + ${150 * g.rarity} xu`;
}

/** Việc đếm (tưới, câu cá…) cộng vào nhiệm vụ khách đã nhận. Trả về câu báo khi xong bước. */
export function guestEvent(p: Profile, s: FarmState | null, e: string, n: number): string[] {
  const out: string[] = [];
  for (const [id, st] of Object.entries(p.guests)) {
    if (!st.accepted || !GUEST[id]) continue;
    const q = currentQuest(p, id);
    if (!q || q.kind !== 'event' || q.event !== e) continue;
    st.progress = Math.min(q.n, st.progress + n);
    if (st.progress >= q.n) out.push(`${GUEST[id].name}: xong "${q.text}" — ${completeStep(p, s, GUEST[id])}`);
  }
  return out;
}

/** Giao đồ cho khách (bước hiện tại là giao đồ). */
export function deliverGuest(p: Profile, s: FarmState, id: string): string | null {
  const st = guestState(p, id);
  const q = currentQuest(p, id);
  if (!st.accepted || !q || q.kind !== 'deliver') return null;
  if (countItem(s, q.item) < q.qty) return null;
  takeItem(s, q.item, q.qty);
  return completeStep(p, s, GUEST[id]);
}

export const setCount = (p: Profile, set: 'folk' | 'star') => (set === 'folk' ? FOLK : STARS).filter((g) => p.cards.includes(g.id)).length;

export function claimSet(p: Profile, s: FarmState | null, set: 'folk' | 'star') {
  if (setCount(p, set) < 12 || p.setsClaimed.includes(set) || !s) return null;
  p.setsClaimed.push(set);
  const r = SET_REWARD[set];
  s.money += r.money;
  for (const [it, n] of r.items) if (!addItem(s, it, n)) s.mailbox.push({ item: it, qty: n, from: 'Bộ sưu tập' });
  return r.text;
}

/** Rạp hát: tối thứ Bảy (trong game) khách ngôi sao tuần này biểu diễn; xem được thưởng một lần mỗi tuần thật. */
export const showTime = (s: FarmState) => (s.day - 1) % 7 === 5 && s.minutes >= 18 * 60 && s.minutes < 22 * 60;
export function watchShow(p: Profile, day = today()): { guest: Guest; tem: number } | null {
  const star = weekGuests(day)[1];
  const k = weekStart(new Date(day + 'T12:00:00'));
  if (p.theater === k) return null;
  p.theater = k;
  p.tem += 10;
  return { guest: star, tem: 10 };
}

export const questText = (p: Profile, id: string) => {
  const q = currentQuest(p, id);
  if (!q) return 'Đã xong hết';
  const st = guestState(p, id);
  return q.kind === 'deliver' ? `${q.text} (${ITEMS[q.item].name.toLowerCase()} ×${q.qty})` : `${q.text} · ${st.progress}/${q.n}`;
};
