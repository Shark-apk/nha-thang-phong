// Sự kiện theo ngày thật (src/data/events.json) và sổ mùa miễn phí 30 bậc theo quý.
import DATA from '../data/events.json';
import { ITEMS } from '../data';
import { addItem, type FarmState } from './farm';
import { today, weekStart, type Profile } from './profile';

export interface EventQuest { event: string; n: number; text: string; tem: number }
export interface EventShopItem { kind: 'piece' | 'item' | 'decor' | 'pet'; id: string; name: string; price: number; qty?: number }
export interface GameEventDef { id: string; name: string; start: string; end: string; color: string; intro: string; quests: EventQuest[]; shop: EventShopItem[] }
export interface PassTier { money?: number; tem?: number; item?: string; qty?: number; piece?: string }

export const EVENTS = DATA.events as GameEventDef[];
export const PASS = DATA.pass as { pointsPerTier: number; tiers: PassTier[] };

/** Điểm sổ mùa cho từng việc. */
export const PASS_POINTS = { daily: 10, weekly: 30, event: 20, checkin: 5, bonus: 15 };

export interface EventProgress { progress: number[]; claimed: number[]; bought: number[] }
export interface PassState { key: string; points: number; claimed: number[] }

const md = (day: string) => day.slice(5);
/** Sự kiện đang diễn ra hôm nay (ngày thật). */
/** Mã cuộc thi: sự kiện kèm năm, ngoài sự kiện là thi tuần. */
export const contestId = (day = today()) => { const ev = activeEvent(day); return ev ? `${ev.id}-${day.slice(0, 4)}` : `tuan-${weekOf(day)}`; };
const weekOf = (day: string, backDays = 0) => weekStart(new Date(new Date(`${day}T00:00:00`).getTime() - backDays * 86_400_000));
/** Các cuộc thi vừa kết thúc (tuần trước + sự kiện năm nay đã hết) — để trao thưởng cuối kỳ. */
export function endedContests(day = today()): { id: string; name: string }[] {
  const out = [{ id: `tuan-${weekOf(day, 7)}`, name: 'Hội thi tuần trước' }];
  for (const ev of EVENTS) if (md(day) > ev.end) out.push({ id: `${ev.id}-${day.slice(0, 4)}`, name: `Hội thi ${ev.name}` });
  return out;
}

export const activeEvent = (day = today()) => EVENTS.find((e) => md(day) >= e.start && md(day) <= e.end);

/** Sự kiện sắp tới và số ngày còn lại. */
export function nextEvent(day = today()): { ev: GameEventDef; days: number } | null {
  const [y] = day.split('-').map(Number);
  const now = new Date(day + 'T00:00:00');
  let best: { ev: GameEventDef; days: number } | null = null;
  for (const ev of EVENTS) {
    for (const yy of [y, y + 1]) {
      const d = Math.round((new Date(`${yy}-${ev.start}T00:00:00`).getTime() - now.getTime()) / 86400000);
      if (d > 0 && (!best || d < best.days)) best = { ev, days: d };
    }
  }
  return best;
}

/** Số ngày (và giờ) còn lại của sự kiện đang diễn ra. */
export function timeLeft(ev: GameEventDef, now = new Date()) {
  const end = new Date(`${now.getFullYear()}-${ev.end}T23:59:59`);
  const ms = Math.max(0, end.getTime() - now.getTime());
  return { days: Math.floor(ms / 86400000), hours: Math.floor((ms % 86400000) / 3600000) };
}

const evKey = (ev: GameEventDef, day: string) => `${ev.id}-${day.slice(0, 4)}`;

export function eventProgress(p: Profile, ev: GameEventDef, day = today()): EventProgress {
  const k = evKey(ev, day);
  p.events[k] ??= { progress: ev.quests.map(() => 0), claimed: [], bought: [] };
  return p.events[k];
}

/** Cộng tiến độ nhiệm vụ sự kiện đang diễn ra; trả về câu các nhiệm vụ vừa xong. */
export function eventQuestEvent(p: Profile, e: string, n: number, day = today()): string[] {
  const ev = activeEvent(day);
  if (!ev) return [];
  const pr = eventProgress(p, ev, day);
  const done: string[] = [];
  ev.quests.forEach((q, i) => {
    if (q.event !== e || pr.progress[i] >= q.n) return;
    pr.progress[i] = Math.min(q.n, pr.progress[i] + n);
    if (pr.progress[i] >= q.n) done.push(q.text);
  });
  return done;
}

export function claimEventQuest(p: Profile, i: number, day = today()) {
  const ev = activeEvent(day);
  if (!ev) return null;
  const pr = eventProgress(p, ev, day);
  const q = ev.quests[i];
  if (!q || pr.claimed.includes(i) || pr.progress[i] < q.n) return null;
  pr.claimed.push(i);
  p.tem += q.tem;
  addPassPoints(p, PASS_POINTS.event, day);
  return q.tem;
}

/** Đổi tem lấy đồ ở cửa hàng sự kiện (mỗi món một lần). */
export function buyEventItem(p: Profile, s: FarmState | null, i: number, day = today()): { ok: true; name: string } | { ok: false; reason: string } {
  const ev = activeEvent(day);
  if (!ev) return { ok: false, reason: 'Không có sự kiện nào' };
  const it = ev.shop[i];
  const pr = eventProgress(p, ev, day);
  if (!it) return { ok: false, reason: 'Không có món này' };
  if (pr.bought.includes(i)) return { ok: false, reason: 'Đã đổi rồi' };
  if (p.tem < it.price) return { ok: false, reason: `Cần ${it.price} tem` };
  if (it.kind === 'piece' || it.kind === 'pet') {
    if (p.wardrobe.includes(it.id)) return { ok: false, reason: 'Đã có món này' };
    p.wardrobe.push(it.id);
  } else {
    if (!s) return { ok: false, reason: 'Chọn ô lưu trước' };
    if (!addItem(s, it.id, it.qty ?? 1)) s.mailbox.push({ item: it.id, qty: it.qty ?? 1, from: ev.name });
  }
  p.tem -= it.price;
  pr.bought.push(i);
  return { ok: true, name: it.name };
}

// ---------------------------------------------------------------- sổ mùa

/** Khóa sổ mùa: năm + quý thật. */
export const passKey = (day = today()) => `${day.slice(0, 4)}-Q${Math.floor((Number(day.slice(5, 7)) - 1) / 3) + 1}`;

export function passState(p: Profile, day = today()): PassState {
  const k = passKey(day);
  if (p.pass.key !== k) p.pass = { key: k, points: 0, claimed: [] };
  return p.pass;
}
export const passTier = (points: number) => Math.min(PASS.tiers.length, Math.floor(points / PASS.pointsPerTier));

export function addPassPoints(p: Profile, n: number, day = today()) {
  passState(p, day).points += n;
}

/** Nhận thưởng bậc `tier` (1-based) của sổ mùa. */
export function claimPassTier(p: Profile, s: FarmState | null, tier: number, day = today()): string | null {
  const ps = passState(p, day);
  if (tier < 1 || tier > passTier(ps.points) || ps.claimed.includes(tier)) return null;
  const r = PASS.tiers[tier - 1];
  if ((r.money || r.item) && !s) return null;
  ps.claimed.push(tier);
  if (r.money && s) { s.money += r.money; return `${r.money} xu`; }
  if (r.tem) { p.tem += r.tem; return `${r.tem} tem`; }
  if (r.item && s) {
    if (!addItem(s, r.item, r.qty ?? 1)) s.mailbox.push({ item: r.item, qty: r.qty ?? 1, from: 'Sổ mùa' });
    return `${r.qty ?? 1} ${ITEMS[r.item].name.toLowerCase()}`;
  }
  if (r.piece && !p.wardrobe.includes(r.piece)) p.wardrobe.push(r.piece);
  return 'đồ mới vào tủ';
}
