// Kỹ năng 1–10 (theo ô lưu) và nghề chọn ở cấp 5 / 10; hiệu ứng bộ đồ đang mặc (theo hồ sơ).
import { ITEMS, ANIMALS, type ItemId, type SetBonus } from '../data';
import type { GameEvent } from './bus';
import type { FarmState } from './farm';

export type SkillId = 'farming' | 'ranching' | 'fishing' | 'mining' | 'cooking';

export const SKILLS: { id: SkillId; name: string; xp: Partial<Record<GameEvent, number>> }[] = [
  { id: 'farming', name: 'Trồng trọt', xp: { till: 1, water: 1, plant: 2, harvest: 4 } },
  { id: 'ranching', name: 'Chăn nuôi', xp: { collect: 6, buyAnimal: 10 } },
  { id: 'fishing', name: 'Câu cá', xp: { fish: 12 } },
  { id: 'mining', name: 'Khai khoáng', xp: { mine: 5, chop: 4 } },
  { id: 'cooking', name: 'Nấu ăn', xp: { cook: 10 } },
];
export const SKILL_NAME = Object.fromEntries(SKILLS.map((s) => [s.id, s.name])) as Record<SkillId, string>;

/** Kinh nghiệm tích lũy cần để đạt cấp L (chỉ số L). */
export const SKILL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

export function skillLevel(xp: number) {
  let l = 0;
  while (l < 10 && xp >= SKILL_XP[l + 1]) l++;
  return l;
}

export const emptySkills = (): Record<SkillId, number> => ({ farming: 0, ranching: 0, fishing: 0, mining: 0, cooking: 0 });

/** Cộng kinh nghiệm kỹ năng từ một sự kiện; trả về [kỹ năng, cấp mới] nếu lên cấp. */
export function skillXpFromEvent(s: FarmState, e: GameEvent, n: number): [SkillId, number][] {
  const ups: [SkillId, number][] = [];
  for (const sk of SKILLS) {
    const per = sk.xp[e];
    if (!per) continue;
    const before = skillLevel(s.skills[sk.id]);
    s.skills[sk.id] += per * n;
    const after = skillLevel(s.skills[sk.id]);
    if (after > before) ups.push([sk.id, after]);
  }
  return ups;
}

// ---------------------------------------------------------------- nghề

export interface Profession { id: string; skill: SkillId; tier: 5 | 10; parent?: string; name: string; info: string }
export const PROFESSIONS: Profession[] = [
  { id: 'nong_dan', skill: 'farming', tier: 5, name: 'Nông dân giỏi', info: 'Rau, trái bán thêm 10%' },
  { id: 'lam_vuon', skill: 'farming', tier: 5, name: 'Người làm vườn', info: 'Cây đã tưới 15% lớn nhanh thêm một ngày' },
  { id: 'nghe_nhan', skill: 'farming', tier: 10, parent: 'nong_dan', name: 'Nghệ nhân', info: 'Hàng chế biến (mứt, nước ép, sấy) bán thêm 25%' },
  { id: 'thuong_lai', skill: 'farming', tier: 10, parent: 'nong_dan', name: 'Thương lái', info: 'Rau, trái bán thêm 15% nữa' },
  { id: 'dat_tot', skill: 'farming', tier: 10, parent: 'lam_vuon', name: 'Đất tốt', info: 'Dễ ra nông sản bạc, vàng hơn' },
  { id: 'lai_giong', skill: 'farming', tier: 10, parent: 'lam_vuon', name: 'Nhà lai giống', info: 'Cơ hội ra hạt lai gấp đôi' },
  { id: 'chu_trai', skill: 'ranching', tier: 5, name: 'Chủ trại', info: 'Sản phẩm vật nuôi bán thêm 20%' },
  { id: 'thuong_thu', skill: 'ranching', tier: 5, name: 'Người thương thú', info: 'Tình cảm vật nuôi tăng gấp đôi' },
  { id: 'trai_lon', skill: 'ranching', tier: 10, parent: 'chu_trai', name: 'Trang trại lớn', info: 'Sản phẩm vật nuôi bán thêm 25% nữa' },
  { id: 'bac_si_thu', skill: 'ranching', tier: 10, parent: 'chu_trai', name: 'Bác sĩ thú y', info: 'Thú bị đói không giảm tình cảm' },
  { id: 'chan_dat', skill: 'ranching', tier: 10, parent: 'thuong_thu', name: 'Người chăn giỏi', info: 'Sản phẩm luôn từ bạc trở lên' },
  { id: 'ban_thu', skill: 'ranching', tier: 10, parent: 'thuong_thu', name: 'Bạn của thú', info: '20% lấy được 2 sản phẩm một lần' },
  { id: 'ngu_dan', skill: 'fishing', tier: 5, name: 'Ngư dân', info: 'Cá bán thêm 25%' },
  { id: 'di_bien', skill: 'fishing', tier: 5, name: 'Người đi biển', info: 'Vùng xanh khi câu to hơn' },
  { id: 'vua_ca', skill: 'fishing', tier: 10, parent: 'ngu_dan', name: 'Chủ vựa cá', info: 'Cá bán thêm 25% nữa' },
  { id: 'san_ca', skill: 'fishing', tier: 10, parent: 'ngu_dan', name: 'Thợ săn cá', info: 'Cá giật yếu hơn, dễ kéo' },
  { id: 'tho_lan', skill: 'fishing', tier: 10, parent: 'di_bien', name: 'Tay câu lão luyện', info: 'Kéo cá nhanh hơn 20%' },
  { id: 'thuyen_truong', skill: 'fishing', tier: 10, parent: 'di_bien', name: 'Thuyền trưởng', info: '15% câu một lần được 2 con' },
  { id: 'tho_mo', skill: 'mining', tier: 5, name: 'Thợ mỏ', info: 'Đập quặng được thêm 1 quặng' },
  { id: 'tho_da', skill: 'mining', tier: 5, name: 'Thợ đá quý', info: '5% đập đá ra đá quý' },
  { id: 'tho_ren', skill: 'mining', tier: 10, parent: 'tho_mo', name: 'Bạn của thợ rèn', info: 'Rèn dụng cụ rẻ hơn 25%' },
  { id: 'chuyen_gia', skill: 'mining', tier: 10, parent: 'tho_mo', name: 'Chuyên gia đá', info: 'Mỗi tảng đá cho thêm 1 đá' },
  { id: 'dia_chat', skill: 'mining', tier: 10, parent: 'tho_da', name: 'Nhà địa chất', info: 'Đá quý ra 12%' },
  { id: 'tham_hiem', skill: 'mining', tier: 10, parent: 'tho_da', name: 'Nhà thám hiểm', info: 'Hang có thêm 10 tảng đá mỗi ngày' },
  { id: 'dau_bep', skill: 'cooking', tier: 5, name: 'Đầu bếp', info: 'Món nấu hồi thêm 30% sức' },
  { id: 'chu_quan', skill: 'cooking', tier: 5, name: 'Chủ quán', info: 'Món nấu bán thêm 30%' },
  { id: 'bo_duong', skill: 'cooking', tier: 10, parent: 'dau_bep', name: 'Bếp bổ dưỡng', info: 'Món nấu hồi thêm 30% nữa' },
  { id: 'tiet_kiem', skill: 'cooking', tier: 10, parent: 'dau_bep', name: 'Bếp tiết kiệm', info: '15% nấu xong không tốn nguyên liệu' },
  { id: 'am_thuc', skill: 'cooking', tier: 10, parent: 'chu_quan', name: 'Nhà ẩm thực', info: 'Món nấu bán thêm 20% nữa' },
  { id: 'khach_quen', skill: 'cooking', tier: 10, parent: 'chu_quan', name: 'Khách quen', info: 'Giao đơn bảng tin được thêm 30% tiền' },
];

export const has = (s: FarmState, id: string) => !!s.professions?.includes(id);

/** Kỹ năng đã đủ cấp nhưng chưa chọn nghề ở mốc đó. */
export function pendingChoices(s: FarmState): { skill: SkillId; tier: 5 | 10; options: Profession[] }[] {
  const out: { skill: SkillId; tier: 5 | 10; options: Profession[] }[] = [];
  for (const sk of SKILLS) {
    const lv = skillLevel(s.skills[sk.id]);
    const mine = PROFESSIONS.filter((p) => p.skill === sk.id && has(s, p.id));
    const t5 = mine.find((p) => p.tier === 5);
    if (lv >= 5 && !t5) out.push({ skill: sk.id, tier: 5, options: PROFESSIONS.filter((p) => p.skill === sk.id && p.tier === 5) });
    else if (lv >= 10 && t5 && !mine.some((p) => p.tier === 10)) {
      out.push({ skill: sk.id, tier: 10, options: PROFESSIONS.filter((p) => p.parent === t5.id) });
    }
  }
  return out;
}

export function chooseProfession(s: FarmState, id: string) {
  const p = PROFESSIONS.find((x) => x.id === id);
  if (!p) return false;
  const ok = pendingChoices(s).some((c) => c.options.some((o) => o.id === id));
  if (!ok) return false;
  s.professions.push(id);
  return true;
}

// ---------------------------------------------------------------- hiệu ứng

/** Bộ đồ đang mặc (hồ sơ người chơi) — sảnh/cảnh gán vào đây. */
export let worn: SetBonus | null = null;
export const setWorn = (b: SetBonus | null) => { worn = b; };

const ANIMAL_PRODUCTS = new Set<ItemId>([...Object.values(ANIMALS).map((a) => a.product).filter(Boolean) as ItemId[], 'honey', 'flower_honey']);

/** Hệ số giá bán theo nghề. */
export function sellMult(s: FarmState | undefined, item: ItemId) {
  if (!s) return 1;
  const k = ITEMS[item]?.kind;
  let m = 1;
  if (k === 'crop' || k === 'fruit') m *= (has(s, 'nong_dan') ? 1.1 : 1) * (has(s, 'thuong_lai') ? 1.15 : 1);
  if (k === 'artisan' && has(s, 'nghe_nhan')) m *= 1.25;
  if (ANIMAL_PRODUCTS.has(item)) m *= (has(s, 'chu_trai') ? 1.2 : 1) * (has(s, 'trai_lon') ? 1.25 : 1);
  if (k === 'fish') m *= (has(s, 'ngu_dan') ? 1.25 : 1) * (has(s, 'vua_ca') ? 1.25 : 1);
  if (k === 'dish') m *= (has(s, 'chu_quan') ? 1.3 : 1) * (has(s, 'am_thuc') ? 1.2 : 1);
  return m;
}

/** Hệ số hồi sức khi ăn món nấu. */
export const dishEnergyMult = (s: FarmState) => (has(s, 'dau_bep') ? 1.3 : 1) * (has(s, 'bo_duong') ? 1.3 : 1) * (worn === 'chef' ? 1.1 : 1);
export const maxEnergyOf = () => 100 + (worn === 'winter' ? 20 : 0);
