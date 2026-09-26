import { MAX_WATER, SAVE_VERSION, weatherFor, type FarmState } from './farm';

/** 3 ô lưu; ô 0 giữ khóa cũ để bản lưu trước mốc 10 vẫn còn. */
export const SLOTS = 3;
let slot = 0;
const keyOf = (n: number) => (n === 0 ? 'nongtrai.save.v1' : `nongtrai.save.v1.s${n}`);
export const currentSlot = () => slot;
export function useSlot(n: number) {
  slot = Math.max(0, Math.min(SLOTS - 1, n));
}

/**
 * Chuỗi nâng cấp bản lưu: MIGRATIONS[n] biến bản lưu phiên bản n thành n+1.
 * Đổi cấu trúc FarmState → tăng SAVE_VERSION và thêm một bước ở đây; bản lưu cũ không bao giờ hỏng.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
const MIGRATIONS: Record<number, (s: Raw) => Raw> = {
  // v1 → v2: bình tưới giới hạn nước, nhiều bản đồ
  1: (s) => ({ ...s, water: typeof s.water === 'number' ? s.water : MAX_WATER, location: 'farm' }),
  // v2 → v3: mùa, thời tiết, cây ăn trái
  2: (s) => ({ ...s, weather: weatherFor(s.day), tomorrow: weatherFor(s.day + 1), trees: s.trees ?? {} }),
  // v3 → v4: vật nuôi, chuồng trại, tổ ong
  3: (s) => ({ ...s, buildings: {}, animals: [], beehives: {} }),
  // v4 → v5: rìu, cuốc chim, cấp dụng cụ, máy móc, hang đá
  4: (s) => {
    const inventory = [...s.inventory];
    for (const t of ['axe', 'pickaxe']) {
      if (inventory.some((x) => x?.item === t)) continue;
      let i = inventory.indexOf(null);
      if (i === -1) {
        // Túi đầy: nới thêm 9 ô miễn phí cho vừa dụng cụ mới
        i = inventory.length;
        inventory.push(...Array(9).fill(null));
      }
      inventory[i] = { item: t, qty: 1 };
    }
    return { ...s, inventory, tools: { hoe: 0, can: 0, axe: 0, pickaxe: 0 }, upgrading: null, objects: {}, cleared: {}, mine: null };
  },
  // v5 → v6: dân làng, cờ mở khóa, hòm thư
  5: (s) => ({ ...s, npcs: {}, flags: [], mailbox: [] }),
  // v6 → v7: câu cá, nấu ăn, đơn hàng, đình làng, nhà kính, lễ hội
  6: (s) => ({ ...s, orders: null, bundles: {}, greenhouseDay: null, festival: null, fishCaught: {} }),
  // v7 → v8: hướng dẫn đầu game (bản lưu cũ coi như đã chơi quen)
  7: (s) => ({ ...s, tutorial: -1 }),
  // v8 → v9: tên nông trại, kiểu bản đồ
  8: (s) => ({ ...s, farmName: s.farmName ?? 'Nhà Thằng Phong', map: s.map ?? 'plain' }),
  // v9 → v10: kỹ năng và nghề
  9: (s) => ({ ...s, skills: { farming: 0, ranching: 0, fishing: 0, mining: 0, cooking: 0 }, professions: [] }),
  // v10 → v11: thống kê, cốt truyện, nhiệm vụ dân làng
  10: (s) => ({ ...s, stats: { counts: {}, dishes: [] }, story: 0, npcQuestsDone: [] }),
  // v11 → v12: cây khổng lồ, giống lai
  11: (s) => ({ ...s, giants: {}, hybrids: [] }),
  // v12 → v13: rừng, biển, hang sâu
  12: (s) => ({ ...s, forage: null, reefTrash: 0, mineDeepest: 1, chests: [] }),
  // v13 → v14: rương gỗ
  13: (s) => ({ ...s, storage: {} }),
};

export function migrate(raw: Raw): FarmState | null {
  let s = raw;
  if (typeof s.version !== 'number' || s.version < 1 || s.version > SAVE_VERSION) return null;
  while (s.version < SAVE_VERSION) {
    const step = MIGRATIONS[s.version];
    if (!step) return null;
    s = { ...step(s), version: s.version + 1 };
  }
  return s as FarmState;
}

export function loadGame(n = slot): FarmState | null {
  try {
    const raw = localStorage.getItem(keyOf(n));
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export const saveKey = keyOf;

/** Co-op: khi đang làm khách ở nông trại bạn, bản lưu phải là nông trại của mình (không phải đất của chủ phòng). */
let saveHook: ((s: FarmState) => FarmState) | null = null;
export const setSaveHook = (f: typeof saveHook) => { saveHook = f; };
export const forSave = (s: FarmState) => (saveHook ? saveHook(s) : s);

export function saveGame(s: FarmState) {
  try {
    s.savedAt = Date.now();
    localStorage.setItem(keyOf(slot), JSON.stringify(forSave(s)));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(n = slot) {
  try {
    localStorage.removeItem(keyOf(n));
  } catch {
    /* bỏ qua */
  }
}
