// Nhiệm vụ: mẫu nhiệm vụ ngày/tuần, cốt truyện "Hồi sinh làng", nhiệm vụ dân làng, thành tích & danh hiệu.
import type { ItemId } from './items';

/** Loại việc đếm được (khớp tên sự kiện trong bus.ts). */
export type QuestEvent = 'till' | 'water' | 'plant' | 'harvest' | 'sell' | 'fish' | 'cook' | 'craft' | 'chop' | 'mine' | 'talk' | 'gift' | 'collect' | 'order' | 'donate' | 'help' | 'forage' | 'dive' | 'slay' | 'deep';

/** Điều kiện mở khóa mẫu nhiệm vụ (theo ô lưu). */
export type Unlock = 'rod' | 'kitchen' | 'animals' | 'village' | 'friends' | null;

export interface QuestTemplate {
  id: string;
  event: QuestEvent;
  /** [ít nhất, nhiều nhất] — chọn ngẫu nhiên có seed theo ngày. */
  range: [number, number];
  text: (n: number) => string;
  need: Unlock;
}

export const DAILY: QuestTemplate[] = [
  { id: 'd_water', event: 'water', range: [15, 30], text: (n) => `Tưới ${n} ô đất`, need: null },
  { id: 'd_plant', event: 'plant', range: [8, 16], text: (n) => `Gieo ${n} hạt giống`, need: null },
  { id: 'd_harvest', event: 'harvest', range: [5, 15], text: (n) => `Thu hoạch ${n} nông sản`, need: null },
  { id: 'd_sell', event: 'sell', range: [300, 1000], text: (n) => `Bán hàng được ${n.toLocaleString('vi-VN')} xu (tính lúc ngủ)`, need: null },
  { id: 'd_chop', event: 'chop', range: [2, 5], text: (n) => `Chặt ${n} cây hoặc bụi`, need: null },
  { id: 'd_mine', event: 'mine', range: [5, 12], text: (n) => `Đập ${n} tảng đá`, need: null },
  { id: 'd_craft', event: 'craft', range: [1, 2], text: (n) => `Chế tạo ${n} món`, need: null },
  { id: 'd_talk', event: 'talk', range: [3, 6], text: (n) => `Trò chuyện với ${n} dân làng`, need: 'village' },
  { id: 'd_gift', event: 'gift', range: [1, 2], text: (n) => `Tặng quà ${n} dân làng`, need: 'village' },
  { id: 'd_fish', event: 'fish', range: [2, 5], text: (n) => `Câu ${n} con cá`, need: 'rod' },
  { id: 'd_collect', event: 'collect', range: [3, 8], text: (n) => `Lấy ${n} sản phẩm vật nuôi`, need: 'animals' },
  { id: 'd_cook', event: 'cook', range: [1, 3], text: (n) => `Nấu ${n} món`, need: 'kitchen' },
];

export const WEEKLY: QuestTemplate[] = [
  { id: 'w_harvest', event: 'harvest', range: [80, 120], text: (n) => `Thu hoạch ${n} nông sản`, need: null },
  { id: 'w_sell', event: 'sell', range: [4000, 8000], text: (n) => `Bán hàng được ${n.toLocaleString('vi-VN')} xu`, need: null },
  { id: 'w_mine', event: 'mine', range: [40, 60], text: (n) => `Đập ${n} tảng đá`, need: null },
  { id: 'w_water', event: 'water', range: [150, 250], text: (n) => `Tưới ${n} ô đất`, need: null },
  { id: 'w_plant', event: 'plant', range: [60, 100], text: (n) => `Gieo ${n} hạt giống`, need: null },
  { id: 'w_chop', event: 'chop', range: [12, 20], text: (n) => `Chặt ${n} cây hoặc bụi`, need: null },
  { id: 'w_craft', event: 'craft', range: [4, 8], text: (n) => `Chế tạo ${n} món`, need: null },
  { id: 'w_gift', event: 'gift', range: [5, 8], text: (n) => `Tặng ${n} món quà cho dân làng`, need: 'village' },
  { id: 'w_order', event: 'order', range: [3, 5], text: (n) => `Giao ${n} đơn ở bảng tin làng`, need: 'village' },
  { id: 'w_fish', event: 'fish', range: [12, 20], text: (n) => `Câu ${n} con cá`, need: 'rod' },
  { id: 'w_cook', event: 'cook', range: [5, 8], text: (n) => `Nấu ${n} món`, need: 'kitchen' },
  { id: 'w_collect', event: 'collect', range: [20, 35], text: (n) => `Lấy ${n} sản phẩm vật nuôi`, need: 'animals' },
  { id: 'w_help', event: 'help', range: [6, 12], text: (n) => `Tưới giúp bạn bè ${n} ô`, need: 'friends' },
];

// ---------------------------------------------------------------- cốt truyện
/** Điều kiện một bước: đọc từ ô lưu (xem quests.ts storyDone). */
export type StoryCheck =
  | { stat: QuestEvent; n: number }
  | { talkedAll: number }
  | { building: string }
  | { animals: number }
  | { toolUpgraded: true }
  | { bundles: number }
  | { hearts: number }
  | { flag: string }
  | { fishKinds: number };

export interface StoryStep { title: string; text: string; check: StoryCheck; reward: { money?: number; items?: [ItemId, number][]; flag?: string } }

export const STORY: { chapter: string; steps: StoryStep[] } = {
  chapter: 'Chương 1 · Hồi sinh làng',
  steps: [
    { title: 'Dọn đất', text: 'Ruộng bỏ hoang lâu rồi. Cuốc 20 ô đất.', check: { stat: 'till', n: 20 }, reward: { money: 150 } },
    { title: 'Gieo mùa đầu', text: 'Gieo 20 hạt giống.', check: { stat: 'plant', n: 20 }, reward: { items: [['fertilizer', 10]] } },
    { title: 'Lứa đầu tiên', text: 'Thu hoạch 15 nông sản.', check: { stat: 'harvest', n: 15 }, reward: { money: 200 } },
    { title: 'Tiền đầu tiên', text: 'Bán hàng được tổng 1.000 xu.', check: { stat: 'sell', n: 1000 }, reward: { items: [['seed_cabbage', 5]] } },
    { title: 'Làm quen', text: 'Chào hỏi đủ 8 dân làng.', check: { talkedAll: 8 }, reward: { money: 300 } },
    { title: 'Tiếng gà gáy', text: 'Xây chuồng gà (anh Hai bán ở nhà anh).', check: { building: 'coop' }, reward: { items: [['hay', 20]] } },
    { title: 'Đàn thú nhỏ', text: 'Nuôi 3 con vật.', check: { animals: 3 }, reward: { money: 400 } },
    { title: 'Tự tay làm', text: 'Chế tạo món đầu tiên (phím K).', check: { stat: 'craft', n: 1 }, reward: { items: [['stone', 20]] } },
    { title: 'Tiếng động dưới hang', text: 'Đập 30 tảng đá trong hang.', check: { stat: 'mine', n: 30 }, reward: { items: [['ore_copper', 5]] } },
    { title: 'Dụng cụ tốt', text: 'Nâng cấp một dụng cụ ở lò rèn.', check: { toolUpgraded: true }, reward: { money: 500 } },
    { title: 'Góp sức cho đình', text: 'Góp đủ 1 bộ sưu tập ở đình làng.', check: { bundles: 1 }, reward: { items: [['sprinkler_2', 2]] } },
    { title: 'Người quen thân', text: 'Kết thân 1 dân làng tới 4 tim.', check: { hearts: 4 }, reward: { money: 600 } },
    { title: 'Bếp lửa', text: 'Làm bếp trong nhà (lò rèn bác Năm).', check: { flag: 'kitchen' }, reward: { items: [['rice_bag', 3]] } },
    { title: 'Sông quê', text: 'Câu được 5 loại cá khác nhau.', check: { fishKinds: 5 }, reward: { money: 800 } },
    { title: 'Đình làng hồi sinh', text: 'Góp đủ 2 bộ ở đình làng. Đường lên chợ huyện sẽ mở!', check: { bundles: 2 }, reward: { money: 1500, flag: 'road_town' } },
  ],
};

// ---------------------------------------------------------------- nhiệm vụ dân làng (mở theo tim)
export interface NpcQuest { id: string; npc: string; hearts: number; text: string; item: ItemId; qty: number; reward: { money?: number; items?: [ItemId, number][]; love: number } }
export const NPC_QUESTS: NpcQuest[] = [
  { id: 'q_tu_1', npc: 'ba_tu', hearts: 1, text: 'Bà Tư muốn 5 củ cà rốt nấu canh cho cháu.', item: 'carrot', qty: 5, reward: { money: 250, love: 60 } },
  { id: 'q_tu_2', npc: 'ba_tu', hearts: 3, text: 'Bà cần 3 hũ mật ong làm bánh cúng.', item: 'honey', qty: 3, reward: { items: [['seed_strawberry', 10]], love: 80 } },
  { id: 'q_tu_3', npc: 'ba_tu', hearts: 5, text: 'Bà muốn 1 cành hoa mai chưng Tết.', item: 'apricot_blossom', qty: 1, reward: { money: 1200, love: 120 } },
  { id: 'q_nam_1', npc: 'bac_nam', hearts: 1, text: 'Bác Năm thiếu 20 cục đá sửa lò.', item: 'stone', qty: 20, reward: { money: 200, love: 60 } },
  { id: 'q_nam_2', npc: 'bac_nam', hearts: 3, text: 'Bác cần 5 quặng sắt rèn cuốc cho làng.', item: 'ore_iron', qty: 5, reward: { items: [['ore_gold', 2]], love: 80 } },
  { id: 'q_nam_3', npc: 'bac_nam', hearts: 5, text: 'Bác muốn thử rèn trang sức: 1 viên đá quý.', item: 'gem', qty: 1, reward: { money: 1500, love: 120 } },
  { id: 'q_lan_1', npc: 'chi_lan', hearts: 1, text: 'Chị Lan hết cà chua cho món canh chua: cần 5 quả.', item: 'tomato', qty: 5, reward: { money: 250, love: 60 } },
  { id: 'q_lan_2', npc: 'chi_lan', hearts: 3, text: 'Quán đông khách, chị cần 5 quả trứng gà.', item: 'egg', qty: 5, reward: { money: 400, love: 80 } },
  { id: 'q_lan_3', npc: 'chi_lan', hearts: 5, text: 'Chị muốn nấu món đặc biệt từ 1 nấm truffle.', item: 'truffle', qty: 1, reward: { money: 1400, love: 120 } },
  { id: 'q_bay_1', npc: 'ong_bay', hearts: 1, text: 'Ông Bảy muốn 3 con cá rô làm mồi.', item: 'fish', qty: 3, reward: { money: 220, love: 60 } },
  { id: 'q_bay_2', npc: 'ong_bay', hearts: 3, text: 'Ông thèm cá lóc nướng trui: cần 2 con.', item: 'ca_loc', qty: 2, reward: { items: [['rod_2', 1]], love: 80 } },
  { id: 'q_bay_3', npc: 'ong_bay', hearts: 5, text: 'Ông muốn nhìn tận mắt 1 con tôm càng.', item: 'tom_cang', qty: 1, reward: { money: 1300, love: 120 } },
  { id: 'q_mai_1', npc: 'co_mai', hearts: 1, text: 'Cô Mai cần 3 bông hướng dương cho giờ vẽ.', item: 'sunflower', qty: 3, reward: { money: 260, love: 60 } },
  { id: 'q_mai_2', npc: 'co_mai', hearts: 3, text: 'Lớp học liên hoan: cô cần 5 quả dâu tây.', item: 'strawberry', qty: 5, reward: { money: 450, love: 80 } },
  { id: 'q_mai_3', npc: 'co_mai', hearts: 5, text: 'Cô muốn tặng học trò 1 hũ mứt dâu.', item: 'pres_strawberry', qty: 1, reward: { money: 1200, love: 120 } },
  { id: 'q_ti_1', npc: 'be_ti', hearts: 1, text: 'Bé Tí muốn 1 quả dưa hấu to!', item: 'watermelon', qty: 1, reward: { money: 200, love: 60 } },
  { id: 'q_ti_2', npc: 'be_ti', hearts: 3, text: 'Bé Tí cần 10 cục đá xây lâu đài.', item: 'stone', qty: 10, reward: { items: [['ore_copper', 5]], love: 80 } },
  { id: 'q_ti_3', npc: 'be_ti', hearts: 5, text: 'Sinh nhật bạn Tí, cần 2 bánh trung thu.', item: 'banh_trung_thu', qty: 2, reward: { money: 1000, love: 120 } },
  { id: 'q_hai_1', npc: 'anh_hai', hearts: 1, text: 'Anh Hai cần 10 bó lúa mì cho trâu.', item: 'wheat', qty: 10, reward: { money: 250, love: 60 } },
  { id: 'q_hai_2', npc: 'anh_hai', hearts: 3, text: 'Anh cần 3 bình sữa bò cho bê con.', item: 'milk', qty: 3, reward: { items: [['hay', 30]], love: 80 } },
  { id: 'q_hai_3', npc: 'anh_hai', hearts: 5, text: 'Anh muốn 3 bao gạo để dành mùa giáp hạt.', item: 'rice_bag', qty: 3, reward: { money: 1300, love: 120 } },
  { id: 'q_lang_1', npc: 'thay_lang', hearts: 1, text: 'Thầy Lang cần 3 củ tỏi làm thuốc.', item: 'garlic', qty: 3, reward: { money: 240, love: 60 } },
  { id: 'q_lang_2', npc: 'thay_lang', hearts: 3, text: 'Thầy cần 2 hũ mật hoa.', item: 'flower_honey', qty: 2, reward: { items: [['tonic', 3]], love: 80 } },
  { id: 'q_lang_3', npc: 'thay_lang', hearts: 5, text: 'Thầy muốn 1 bông cúc để sắc trà.', item: 'chrysanthemum', qty: 1, reward: { money: 1200, love: 120 } },
];

// ---------------------------------------------------------------- thành tích
export type AchCheck =
  | { stat: QuestEvent; n: number }
  | { fishKinds: number }
  | { day: number }
  | { level: number }
  | { hearts: number; count: number }
  | { animals: number }
  | { bundles: number }
  | { dishes: number }
  | { skill: number; count: number }
  | { money: number }
  | { story: number }
  | { checkins: number };

export interface Achievement { id: string; name: string; text: string; check: AchCheck; title?: string }

const tiers = (id: string, name: string, stat: QuestEvent, ns: number[], unit: string, titles: (string | undefined)[] = []): Achievement[] =>
  ns.map((n, i) => ({ id: `${id}_${i + 1}`, name: `${name} ${['I', 'II', 'III', 'IV'][i]}`, text: `${unit.replace('{n}', n.toLocaleString('vi-VN'))}`, check: { stat, n }, title: titles[i] }));

export const ACHIEVEMENTS: Achievement[] = [
  ...tiers('harvest', 'Nhà nông', 'harvest', [10, 100, 1000, 5000], 'Thu hoạch {n} nông sản', [undefined, undefined, 'Nhà nông chính hiệu', 'Vua lúa']),
  ...tiers('plant', 'Người gieo hạt', 'plant', [20, 200, 1000], 'Gieo {n} hạt'),
  ...tiers('water', 'Bình tưới', 'water', [50, 500, 3000], 'Tưới {n} ô'),
  ...tiers('sell', 'Buôn bán', 'sell', [1000, 20000, 200000, 1000000], 'Bán được tổng {n} xu', [undefined, undefined, 'Đại gia làng', 'Tỷ phú nông thôn']),
  ...tiers('fish', 'Tay câu', 'fish', [1, 50, 300], 'Câu {n} con cá'),
  ...tiers('mine', 'Thợ đá', 'mine', [30, 300, 2000], 'Đập {n} tảng đá'),
  ...tiers('chop', 'Tiều phu', 'chop', [10, 100], 'Chặt {n} cây'),
  ...tiers('cook', 'Bếp nhà', 'cook', [1, 30, 150], 'Nấu {n} món'),
  ...tiers('craft', 'Thợ khéo', 'craft', [1, 25, 100], 'Chế tạo {n} món'),
  ...tiers('gift', 'Người chu đáo', 'gift', [10, 100], 'Tặng {n} món quà'),
  ...tiers('collect', 'Chăn nuôi', 'collect', [20, 300], 'Lấy {n} sản phẩm vật nuôi'),
  ...tiers('help', 'Hàng xóm tốt', 'help', [10, 200], 'Tưới giúp bạn bè {n} ô', [undefined, 'Hàng xóm vàng']),
  ...tiers('order', 'Giao hàng', 'order', [5, 50], 'Giao {n} đơn bảng tin'),
  // Mốc 18: vùng xa
  ...tiers('forage', 'Người hái lượm', 'forage', [20, 200], 'Hái {n} món trong rừng'),
  ...tiers('dive', 'Thợ lặn', 'dive', [10, 100], 'Lặn biển {n} lần'),
  ...tiers('slay', 'Dũng sĩ hang', 'slay', [10, 100], 'Hạ {n} con quái trong hang'),
  { id: 'deep_1', name: 'Đáy hang', text: 'Xuống tới tầng 30 hang sâu', check: { stat: 'deep', n: 29 }, title: 'Thợ mỏ gan dạ' },
  { id: 'fishkinds_1', name: 'Sổ tay cá I', text: 'Câu 5 loại cá', check: { fishKinds: 5 } },
  { id: 'fishkinds_2', name: 'Sổ tay cá II', text: 'Câu 12 loại cá', check: { fishKinds: 12 } },
  { id: 'fishkinds_3', name: 'Sổ tay cá III', text: 'Câu đủ 20 loại cá', check: { fishKinds: 20 }, title: 'Vua câu cá' },
  { id: 'days_1', name: 'Tuần đầu', text: 'Sống ở nông trại 7 ngày', check: { day: 7 } },
  { id: 'days_2', name: 'Trọn một mùa', text: 'Sống ở nông trại 14 ngày', check: { day: 15 } },
  { id: 'days_3', name: 'Tròn một năm', text: 'Sống ở nông trại 56 ngày', check: { day: 57 }, title: 'Người làng' },
  { id: 'days_4', name: 'Hai năm gắn bó', text: 'Sống ở nông trại 112 ngày', check: { day: 113 } },
  { id: 'level_1', name: 'Lên cấp', text: 'Nông trại cấp 5', check: { level: 5 } },
  { id: 'level_2', name: 'Nông trại lớn', text: 'Nông trại cấp 15', check: { level: 15 } },
  { id: 'level_3', name: 'Nông trại danh tiếng', text: 'Nông trại cấp 30', check: { level: 30 }, title: 'Chủ trang trại' },
  { id: 'friend_1', name: 'Người quen', text: '1 dân làng 4 tim', check: { hearts: 4, count: 1 } },
  { id: 'friend_2', name: 'Bạn thân', text: '1 dân làng 8 tim', check: { hearts: 8, count: 1 } },
  { id: 'friend_3', name: 'Cả làng thương', text: 'Cả 8 dân làng 8 tim', check: { hearts: 8, count: 8 }, title: 'Bạn thân của cả làng' },
  { id: 'animals_1', name: 'Con vật đầu tiên', text: 'Nuôi 1 con vật', check: { animals: 1 } },
  { id: 'animals_2', name: 'Trang trại', text: 'Nuôi 10 con vật', check: { animals: 10 } },
  { id: 'bundle_1', name: 'Góp đình', text: 'Góp đủ 1 bộ ở đình làng', check: { bundles: 1 } },
  { id: 'bundle_2', name: 'Đình làng mới', text: 'Góp đủ 4 bộ', check: { bundles: 4 }, title: 'Người hồi sinh làng' },
  { id: 'dish_all', name: 'Đầu bếp làng', text: 'Nấu đủ 9 món khác nhau', check: { dishes: 9 }, title: 'Siêu đầu bếp' },
  { id: 'skill_1', name: 'Có nghề', text: '1 kỹ năng cấp 5', check: { skill: 5, count: 1 } },
  { id: 'skill_2', name: 'Thành thạo', text: '1 kỹ năng cấp 10', check: { skill: 10, count: 1 } },
  { id: 'skill_3', name: 'Toàn năng', text: 'Cả 5 kỹ năng cấp 10', check: { skill: 10, count: 5 }, title: 'Toàn năng' },
  { id: 'money_1', name: 'Túi rủng rỉnh', text: 'Có 10.000 xu cùng lúc', check: { money: 10000 } },
  { id: 'money_2', name: 'Két sắt', text: 'Có 100.000 xu cùng lúc', check: { money: 100000 } },
  { id: 'story_1', name: 'Chương 1', text: 'Xong cốt truyện Hồi sinh làng', check: { story: 15 } },
  { id: 'checkin_1', name: 'Chăm chỉ', text: 'Điểm danh 7 ngày', check: { checkins: 7 } },
  { id: 'checkin_2', name: 'Trung thành', text: 'Điểm danh 30 ngày', check: { checkins: 30 }, title: 'Người chăm chỉ' },
];
