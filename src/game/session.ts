// Phiên chơi: hồ sơ người chơi đang mở + ô lưu đang chơi; nghe sự kiện game để cộng kinh nghiệm cấp và kỹ năng.
import { activeBonus } from '../data';
import { on } from './bus';
import type { FarmState } from './farm';
import { addXp, loadProfile, saveProfile, xpForEvent, type Profile } from './profile';
import { setWorn, SKILL_NAME, skillXpFromEvent } from './skills';
import { checkAchievements, ensureQuests, questEvent, recordStat } from './quests';
import { loadIdentity } from '../net/friends';
import { eventQuestEvent } from './events';
import { guestEvent } from './guests';

export const session: {
  profile: Profile;
  /** Trạng thái ô lưu đang chạy trong game (null khi còn ở sảnh trước lúc chơi). */
  live: FarmState | null;
  toast: ((msg: string) => void) | null;
} = { profile: loadProfile(), live: null, toast: null };

const changed = new Set<() => void>();
export const onProfileChange = (fn: () => void) => {
  changed.add(fn);
  return () => changed.delete(fn);
};

let saveTimer = 0;
/** Lưu hồ sơ (gom nhiều thay đổi liền nhau thành một lần ghi). */
export function touchProfile(now = false) {
  clearTimeout(saveTimer);
  if (now) saveProfile(session.profile);
  else saveTimer = window.setTimeout(() => saveProfile(session.profile), 800);
  for (const fn of changed) fn();
}

/** Hiệu ứng bộ đồ theo ngoại hình đang mặc. */
export const syncWorn = () => setWorn(activeBonus(session.profile.look));

/** Quà thú cưng mang về (đủ 5 tim, 30% mỗi sáng). */
const PET_FINDS: [string, number][] = [['wood', 3], ['stone', 3], ['fertilizer', 2], ['ore_copper', 1], ['seed_radish', 3], ['fish', 1], ['honey', 1]];

let attached = false;
export function attachProfile() {
  if (attached) return;
  attached = true;
  syncWorn();
  on((e, n, detail) => {
    const p = session.profile;
    const s0 = session.live;
    // Nhiệm vụ ngày/tuần theo ngày thật: làm mới nếu vừa qua 0h
    ensureQuests(p, s0, !!loadIdentity());
    for (const q of questEvent(p, e, n)) session.toast?.(`Xong nhiệm vụ: ${q.text} — nhận thưởng ở sảnh (Tab)`);
    for (const t of eventQuestEvent(p, e, n)) session.toast?.(`Xong nhiệm vụ sự kiện: ${t} — nhận tem ở sảnh (Tab)`);
    for (const t of guestEvent(p, s0, e, n)) session.toast?.(t);
    if (s0) {
      recordStat(s0, e, n, detail);
      for (const a of checkAchievements(p, s0)) session.toast?.(`Thành tích mới: ${a.name}${a.title ? ` · danh hiệu "${a.title}"` : ''}`);
    }
    const xp = xpForEvent(e, n);
    if (xp) {
      const ups = addXp(p, xp);
      if (ups.length) session.toast?.(`Lên cấp ${ups.at(-1)}! Quà mừng ở hòm thư — bấm Tab mở sảnh`);
    }
    touchProfile();
    const s = session.live;
    if (!s) return;
    for (const [sk, lv] of skillXpFromEvent(s, e, n)) {
      session.toast?.(`${SKILL_NAME[sk]} lên cấp ${lv}!${lv === 5 || lv === 10 ? ' Được chọn nghề: Tab → bấm vào nhân vật → Kỹ năng' : ''}`);
    }
    if (e === 'sleep' && p.look.pet && p.pet.love >= 500 && Math.random() < 0.3) {
      const [item, qty] = PET_FINDS[Math.floor(Math.random() * PET_FINDS.length)];
      s.mailbox.push({ item, qty, from: p.pet.name });
    }
  });
  window.addEventListener('beforeunload', () => saveProfile(session.profile));
}
