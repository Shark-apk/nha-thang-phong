// Hồ sơ người chơi — dùng chung cho mọi ô lưu: tên, ngoại hình, cấp nông trại, tem, điểm danh, hòm thư hệ thống, tủ đồ.
import { DEFAULT_LOOK, ITEMS, OUTFITS, outfitPieces, STARTER_WARDROBE, type ItemId, type Look } from '../data';
import { addItem, type FarmState } from './farm';
import type { GameEvent } from './bus';
import { emptyBook, type QuestBook } from './quests';
import { addPassPoints, PASS_POINTS, type EventProgress, type PassState } from './events';
import type { GuestState } from './guests';

export interface Reward {
  money?: number;
  tem?: number;
  items?: [ItemId, number][];
  /** Trang phục vào tủ đồ (mốc 12). */
  outfit?: string;
}

export interface Mail {
  id: number;
  title: string;
  body: string;
  reward?: Reward;
  claimed: boolean;
  /** Ngày thật YYYY-MM-DD. */
  date: string;
}

export interface Profile {
  version: number;
  name: string;
  /** Kiểu ngoại hình dựng sẵn (mốc 12 thay bằng nhân vật nhiều lớp). */
  avatar: number;
  xp: number;
  /** Tem sự kiện. */
  tem: number;
  checkin: { next: number; last: string | null };
  mail: Mail[];
  mailSeq: number;
  /** Món đã có: 'hat_straw', 'shirt_2', 'face_glasses', 'pet_dog'… */
  wardrobe: string[];
  lastSlot: number;
  look: Look;
  /** Thú cưng đi theo (loại chọn ở look.pet). */
  pet: { name: string; love: number; pettedDay: string };
  /** Mốc 13: nhiệm vụ ngày/tuần, thành tích, danh hiệu đang dùng, tổng số lần điểm danh. */
  quests: QuestBook;
  achievements: string[];
  title: string | null;
  checkinCount: number;
  /** Mốc 15: tiến độ sự kiện theo năm (khóa `tet-2027`) và sổ mùa theo quý. */
  events: Record<string, EventProgress>;
  pass: PassState;
  /** Mốc 16: khách mời — tiến độ nhiệm vụ, thẻ đã có, bộ đã nhận thưởng, tuần đã xem biểu diễn. */
  guests: Record<string, GuestState>;
  cards: string[];
  setsClaimed: string[];
  theater: string;
}

export const PROFILE_VERSION = 5;
const KEY = 'nongtrai.profile';

export function newProfile(): Profile {
  return {
    version: PROFILE_VERSION, name: 'Phong', avatar: 0, xp: 0, tem: 0, checkin: { next: 1, last: null },
    mail: [], mailSeq: 0, wardrobe: [...STARTER_WARDROBE], lastSlot: 0,
    look: { ...DEFAULT_LOOK }, pet: { name: 'Mực', love: 0, pettedDay: '' },
    quests: emptyBook(), achievements: [], title: null, checkinCount: 0,
    events: {}, pass: { key: '', points: 0, claimed: [] },
    guests: {}, cards: [], setsClaimed: [], theater: '',
  };
}

/** Thứ Hai của tuần thật hiện tại (YYYY-MM-DD). */
export function weekStart(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return today(x);
}

/** Ngày thật theo giờ máy, dạng YYYY-MM-DD. */
export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- cấp nông trại

/** Kinh nghiệm cho mỗi việc (nhân với số lượng). */
export const XP: Partial<Record<GameEvent, number>> = {
  till: 1, water: 1, plant: 1, harvest: 3, fish: 8, cook: 5, craft: 5, chop: 2, mine: 2,
  talk: 2, gift: 4, collect: 3, order: 12, donate: 4, help: 3, build: 20, buyAnimal: 10,
};
/** Bán hàng: 1 kinh nghiệm mỗi 50 xu. */
export const XP_PER_COIN = 1 / 50;
export const MAX_LEVEL = 50;

/** Kinh nghiệm cần để từ cấp L lên L+1. */
export const needFor = (level: number) => 60 + 40 * level;

export function levelOf(xp: number) {
  let level = 1;
  let rest = xp;
  while (level < MAX_LEVEL && rest >= needFor(level)) {
    rest -= needFor(level);
    level++;
  }
  return { level, into: rest, need: needFor(level) };
}

/** Thưởng khi lên cấp: tiền + tem, gửi vào hòm thư. */
/** Quà đặc biệt ở vài cấp: bộ đồ, nón, đồ trên mặt. */
export const LEVEL_GIFTS: Record<number, string> = {
  3: 'face_glasses', 5: 'outfit_fisher', 7: 'hat_flower', 10: 'outfit_chef', 12: 'face_sunglasses', 15: 'outfit_winter',
  18: 'hat_bow', 20: 'outfit_sport', 25: 'face_mustache', 30: 'outfit_royal', 35: 'pet_crab',
};
export const levelReward = (level: number): Reward => ({ money: 100 * level, tem: 5, outfit: LEVEL_GIFTS[level], items: level === 10 ? [['sword', 1]] : undefined });

export function sendMail(p: Profile, title: string, body: string, reward?: Reward, date = today()) {
  p.mail.unshift({ id: ++p.mailSeq, title, body, reward, claimed: !reward, date });
  if (p.mail.length > 60) p.mail.length = 60;
}

/** Cộng kinh nghiệm; trả về các cấp vừa lên (mỗi cấp một thư thưởng). */
export function addXp(p: Profile, n: number): number[] {
  const before = levelOf(p.xp).level;
  p.xp += Math.max(0, Math.round(n));
  const after = levelOf(p.xp).level;
  const ups: number[] = [];
  for (let l = before + 1; l <= after; l++) {
    ups.push(l);
    sendMail(p, `Lên cấp ${l}!`, `Nông trại lên cấp ${l}. Làng gửi quà mừng.`, levelReward(l));
  }
  return ups;
}

export function xpForEvent(e: GameEvent, n: number) {
  if (e === 'sell') return n * XP_PER_COIN;
  return (XP[e] ?? 0) * n;
}

// ---------------------------------------------------------------- điểm danh 7 ngày

export const CHECKIN_REWARDS: { label: string; reward: Reward }[] = [
  { label: '200 xu', reward: { money: 200 } },
  { label: '5 hạt dưa hấu', reward: { items: [['seed_watermelon', 5]] } },
  { label: '10 tem', reward: { tem: 10 } },
  { label: '10 phân bón', reward: { items: [['fertilizer', 10]] } },
  { label: '500 xu', reward: { money: 500 } },
  { label: 'Cây giống xoài', reward: { items: [['sapling_mango', 1]] } },
  { label: 'Bộ đồ nông dân', reward: { outfit: 'outfit_farmer', tem: 20 } },
];

export const canCheckin = (p: Profile, day = today()) => p.checkin.last !== day;

/** Điểm danh hôm nay: nhận quà ngày `next`, chuỗi đi tiếp (lỡ ngày không mất chuỗi). */
export function checkin(p: Profile, day = today()): { day: number; reward: Reward } | null {
  if (!canCheckin(p, day)) return null;
  const n = p.checkin.next;
  p.checkin = { next: (n % 7) + 1, last: day };
  p.checkinCount = (p.checkinCount ?? 0) + 1;
  addPassPoints(p, PASS_POINTS.checkin, day);
  return { day: n, reward: CHECKIN_REWARDS[n - 1].reward };
}

// ---------------------------------------------------------------- nhận thưởng

/**
 * Nhận thưởng: tiền & đồ vào ô lưu `s` (túi đầy thì vào hòm thư cạnh nhà), tem & trang phục vào hồ sơ.
 * `s` null (chưa chọn ô lưu) thì phần tiền/đồ bị bỏ — sảnh luôn truyền ô lưu đang chọn.
 */
export function applyReward(p: Profile, s: FarmState | null, r: Reward, from = 'Làng') {
  const got: string[] = [];
  if (r.money && s) { s.money += r.money; got.push(`${r.money} xu`); }
  if (r.tem) { p.tem += r.tem; got.push(`${r.tem} tem`); }
  for (const [item, qty] of r.items ?? []) {
    if (!s || !ITEMS[item]) continue;
    if (!addItem(s, item, qty)) s.mailbox.push({ item, qty, from });
    got.push(`${qty} ${ITEMS[item].name.toLowerCase()}`);
  }
  if (r.outfit) {
    const set = OUTFITS.find((o) => o.id === r.outfit);
    const pieces = set ? outfitPieces(set) : [r.outfit];
    const fresh = pieces.filter((x) => !p.wardrobe.includes(x));
    p.wardrobe.push(...fresh);
    if (fresh.length) got.push(set ? set.name.toLowerCase() : 'đồ mới');
  }
  return got;
}

export function claimMail(p: Profile, id: number, s: FarmState | null) {
  const m = p.mail.find((x) => x.id === id);
  if (!m || m.claimed || !m.reward) return null;
  m.claimed = true;
  return applyReward(p, s, m.reward, 'Hòm thư');
}

export const unclaimed = (p: Profile) => p.mail.filter((m) => !m.claimed).length;

// ---------------------------------------------------------------- lưu

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (p: any) => any> = {
  // v1 → v2: ngoại hình nhiều lớp, thú cưng, tủ đồ theo món
  4: (p) => ({ ...p, guests: {}, cards: [], setsClaimed: [], theater: '' }),
  3: (p) => ({ ...p, events: {}, pass: { key: '', points: 0, claimed: [] } }),
  2: (p) => ({ ...p, quests: emptyBook(), achievements: [], title: null, checkinCount: 0 }),
  1: (p) => ({ ...p, look: { ...DEFAULT_LOOK }, pet: { name: 'Mực', love: 0, pettedDay: '' }, wardrobe: [...STARTER_WARDROBE, ...(p.wardrobe ?? []).filter((x: string) => x.includes('_') && !x.startsWith('outfit_'))] }),
};

export function migrateProfile(raw: unknown): Profile {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let p = raw as any;
  if (!p || typeof p !== 'object' || typeof p.version !== 'number') return newProfile();
  while (p.version < PROFILE_VERSION) {
    const step = MIGRATIONS[p.version];
    if (!step) return newProfile();
    p = { ...step(p), version: p.version + 1 };
  }
  return { ...newProfile(), ...p };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrateProfile(JSON.parse(raw)) : newProfile();
  } catch {
    return newProfile();
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* bỏ qua */
  }
}
