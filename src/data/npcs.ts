// 8 dân làng: lịch sinh hoạt, sở thích quà, lời thoại có điều kiện, sự kiện tim.
import PORTRAITS from '../../assets/Custom/portraits.json';
import ICONS from '../../assets/Custom/icons.json';
import { ITEMS, type ItemId, type Season } from './items';

/** [giờ (phút từ 0:00), tên điểm hẹn trên bản đồ làng]; 'home' = về nhà (vào trong, không thấy). */
export type Stop = [number, string];

export interface Line {
  text: string;
  season?: Season;
  wet?: boolean;
  minHearts?: number;
  /** Chỉ nói một lần (ghi nhớ đã nói). */
  once?: string;
}

export interface HeartEvent {
  hearts: 2 | 4 | 6 | 8;
  title: string;
  lines: string[];
  choice?: { q: string; options: { label: string; reply: string; love: number }[] };
  reward?: { item?: ItemId; qty?: number; flag?: string; text: string };
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  /** Thứ tự bảng hình trong npcs.png. */
  sheet: number;
  portrait: number;
  birthday: { season: Season; day: number };
  home: string;
  loves: ItemId[];
  likes: ItemId[];
  dislikes: ItemId[];
  schedule: { base: Stop[]; wet?: Stop[]; sunday?: Stop[] };
  lines: Line[];
  events: HeartEvent[];
}

const h = (hh: number, mm = 0) => hh * 60 + mm;
const P = PORTRAITS as Record<string, number>;

export const NPCS: NpcDef[] = [
  {
    id: 'ba_tu', name: 'Bà Tư', role: 'bán hạt giống ở chợ', sheet: 0, portrait: P.npc_ba_tu,
    birthday: { season: 'spring', day: 5 }, home: 'home_tu',
    loves: ['pres_strawberry', 'apricot_blossom', 'peach_blossom', 'flower_honey'], likes: ['strawberry', 'honey', 'egg', 'chrysanthemum', 'sweet_potato'], dislikes: ['chili', 'stone', 'wood'],
    schedule: {
      base: [[h(6), 'home_tu'], [h(8), 'market'], [h(17), 'banyan'], [h(19), 'home']],
      wet: [[h(6), 'home'], [h(9), 'market'], [h(15), 'home']],
      sunday: [[h(6), 'home'], [h(8), 'dinh'], [h(11), 'market'], [h(17), 'home']],
    },
    lines: [
      { text: 'Cháu mới về làng hả? Hạt giống bà có đủ cả, mỗi mùa mỗi khác. Nhớ xem lịch mà gieo nghe con.', once: 'hello' },
      { text: 'Xuân này trồng cải bắp đi con, bán được giá lắm.', season: 'spring' },
      { text: 'Trời hè nắng gắt, tưới cây sớm cho khỏi héo nghe.', season: 'summer' },
      { text: 'Mùa thu gió lên rồi. Bí ngô năm nay chắc to lắm.', season: 'fall' },
      { text: 'Gần Tết rồi, hoa mai hoa đào bán đắt như tôm tươi.', season: 'winter' },
      { text: 'Mưa thế này bà dọn sạp sớm. Già rồi, lạnh là nhức mỏi.', wet: true },
      { text: 'Ngày xưa ông nhà bà cũng làm nông như con. Nhìn con là bà nhớ ổng.', minHearts: 4 },
      { text: 'Có gì cần cứ ghé bà, đừng ngại nghe con.', minHearts: 6 },
      { text: 'Bà bán hạt cả đời ở cái chợ này rồi.' },
      { text: 'Hôm nay trời đẹp, con ra đồng chưa?' },
    ],
    events: [
      { hearts: 2, title: 'Gói hạt cũ', lines: ['Bà Tư lục trong túi ra một gói giấy đã ố vàng.', '"Hạt hướng dương ông nhà bà để dành. Bà già rồi, không trồng nổi nữa… con cầm lấy mà gieo."'], reward: { item: 'seed_sunflower', qty: 10, text: 'Nhận 10 hạt hướng dương' } },
      { hearts: 4, title: 'Khách quen', lines: ['"Con mua hạt nhiều quá, bà bớt cho con một chút. Khách quen mà!"'], choice: { q: 'Bạn nói gì?', options: [{ label: 'Cảm ơn bà nhiều', reply: '"Ừ, ngoan lắm."', love: 30 }, { label: 'Bà đừng lỗ vốn nha', reply: '"Cái thằng/con này, lo cho bà nữa hả. Bà cảm động quá."', love: 60 }] }, reward: { flag: 'discount_seeds', text: 'Hạt giống ở chợ giảm 10%' } },
      { hearts: 6, title: 'Chuyện ngày xưa', lines: ['Bà Tư ngồi dưới gốc đa, kể chuyện làng hồi còn nhỏ.', '"Hồi đó cả làng cấy lúa bằng tay, trâu cày mấy tháng mới xong. Giờ con có trâu có máy, sướng hơn nhiều."', '"Con chăm chỉ lắm. Bà vui vì làng có người trẻ về."'] },
      { hearts: 8, title: 'Cây xoài của ông', lines: ['"Ông nhà bà thích nhất cây xoài. Bà gửi con cây giống này, con trồng giùm bà nghe."'], reward: { item: 'sapling_mango', qty: 1, text: 'Nhận 1 cây giống xoài' } },
    ],
  },
  {
    id: 'bac_nam', name: 'Bác Năm', role: 'thợ rèn', sheet: 1, portrait: P.npc_bac_nam,
    birthday: { season: 'fall', day: 9 }, home: 'home_nam',
    loves: ['ore_gold', 'juice_grape', 'pres_chili'], likes: ['ore_iron', 'ore_copper', 'corn', 'chili', 'milk'], dislikes: ['sunflower', 'chrysanthemum', 'strawberry'],
    schedule: {
      base: [[h(6), 'home'], [h(8), 'smith'], [h(17), 'quan_in'], [h(20), 'home']],
      sunday: [[h(6), 'home'], [h(10), 'river_w'], [h(15), 'quan_in'], [h(20), 'home']],
    },
    lines: [
      { text: 'Muốn rèn dụng cụ thì mang quặng tới. Quặng đồng, sắt, vàng, trong hang phía bắc nông trại có hết.', once: 'hello' },
      { text: 'Lửa lò hôm nay đượm, rèn gì cũng bén.' },
      { text: 'Cuốc chim đồng mới đập nổi tảng đá to với quặng vàng nghe chưa.' },
      { text: 'Mưa thì tốt, khỏi phải tưới nước cho lò nguội.', wet: true },
      { text: 'Hè nóng đứng lò muốn xỉu luôn.', season: 'summer' },
      { text: 'Hồi trẻ bác cũng lên thành phố làm. Rồi cũng về lại với cái lò này.', minHearts: 4 },
      { text: 'Có rảnh ghé quán chị Lan làm ly với bác.', minHearts: 6 },
    ],
    events: [
      { hearts: 2, title: 'Tiếng búa', lines: ['Bác Năm đưa bạn cầm thử cây búa.', '"Nặng không? Cả đời bác cầm nó đó."'], reward: { item: 'ore_iron', qty: 5, text: 'Nhận 5 quặng sắt' } },
      { hearts: 4, title: 'Món quà của thợ', lines: ['"Bác rèn dư mấy cái vòi tưới, cho con đó. Ruộng rộng tưới tay mệt lắm."'], reward: { item: 'sprinkler_2', qty: 2, text: 'Nhận 2 vòi tưới đồng' } },
      { hearts: 6, title: 'Lò rèn đêm', lines: ['Tối muộn, lò rèn vẫn sáng đèn.', '"Con làm ăn được, bác rèn gấp cho con. Một ngày là xong, khỏi chờ."'], reward: { flag: 'fast_smith', text: 'Thợ rèn nâng cấp chỉ mất 1 ngày' } },
      { hearts: 8, title: 'Người kế nghiệp', lines: ['"Bác không có con. Thấy con chịu khó, bác mừng."', '"Làng mình còn người như con là bác yên tâm."'], choice: { q: 'Bạn nói gì?', options: [{ label: 'Con sẽ ghé thường xuyên', reply: '"Ừ. Nhớ đó nghe."', love: 50 }, { label: 'Bác dạy con rèn nha', reply: '"Ha ha! Được, rảnh bác dạy."', love: 80 }] } },
    ],
  },
  {
    id: 'chi_lan', name: 'Chị Lan', role: 'chủ quán ăn', sheet: 2, portrait: P.npc_chi_lan,
    birthday: { season: 'summer', day: 3 }, home: 'home_lan',
    loves: ['truffle', 'pres_mango', 'flower_honey', 'duck_egg'], likes: ['tomato', 'cabbage', 'scallion', 'garlic', 'fish', 'egg'], dislikes: ['stone', 'ore_copper', 'hay'],
    schedule: {
      base: [[h(6), 'home'], [h(7), 'market'], [h(9), 'quan_lan'], [h(21), 'home']],
      wet: [[h(6), 'home'], [h(9), 'quan_lan'], [h(21), 'home']],
    },
    lines: [
      { text: 'Chào em! Quán chị có cơm, có phở, ghé ăn nghe. Mà em trồng rau thì bán cho chị với.', once: 'hello' },
      { text: 'Hành lá với tỏi mùa đông là chị cần nhất.', season: 'winter' },
      { text: 'Dưa hấu mùa hè ướp lạnh, khách mê lắm.', season: 'summer' },
      { text: 'Mưa thế này khách vào quán trú mưa đông ghê.', wet: true },
      { text: 'Hôm nay nồi nước lèo chị nấu từ sáng sớm đó.' },
      { text: 'Em ăn uống đầy đủ vô, làm ruộng hao sức lắm.', minHearts: 3 },
      { text: 'Chị tính mở rộng quán, có em cung cấp rau là yên tâm.', minHearts: 6 },
    ],
    events: [
      { hearts: 2, title: 'Nếm thử', lines: ['Chị Lan múc cho bạn một chén canh.', '"Nếm thử coi, chị mới nấu kiểu mới."'], choice: { q: 'Canh thế nào?', options: [{ label: 'Ngon quá chị ơi', reply: '"Thật hả? Vui ghê!"', love: 40 }, { label: 'Hơi mặn một xíu', reply: '"À… để chị bớt muối. Cảm ơn em nói thật."', love: 60 }] } },
      { hearts: 4, title: 'Hũ muối của mẹ', lines: ['"Hũ sành này mẹ chị để lại. Em làm dưa làm mứt thì dùng đi."'], reward: { item: 'preserves_jar', qty: 1, text: 'Nhận 1 hũ muối' } },
      { hearts: 6, title: 'Công thức gia truyền', lines: ['Chị Lan chép cho bạn công thức món canh chua.', '"Quán chị sống nhờ món này đó. Em giữ kỹ nghe."'], reward: { flag: 'recipe_canh_chua', text: 'Học được công thức canh chua (nấu ở bếp)' } },
      { hearts: 8, title: 'Giấc mơ nhỏ', lines: ['"Hồi nhỏ chị mơ mở nhà hàng trên phố. Giờ có cái quán nhỏ ở làng, chị thấy đủ rồi."', '"Có bạn bè như em, chị thấy đủ thật."'] },
    ],
  },
  {
    id: 'ong_bay', name: 'Ông Bảy', role: 'ngư dân ở bến sông', sheet: 3, portrait: P.npc_ong_bay,
    birthday: { season: 'winter', day: 7 }, home: 'home_bay',
    loves: ['fish', 'rice_bag', 'juice_grape'], likes: ['rice', 'potato', 'sweet_potato', 'corn'], dislikes: ['flower_honey', 'wool'],
    schedule: {
      base: [[h(5), 'dock'], [h(12), 'home'], [h(14), 'dock'], [h(18), 'banyan'], [h(20), 'home']],
      wet: [[h(5), 'dock'], [h(16), 'home']],
    },
    lines: [
      { text: 'Cá sông mình ngon nhất vùng. Chịu khó ngồi là có.', once: 'hello' },
      { text: 'Mưa cá ăn mồi mạnh, ông ra sông từ sớm.', wet: true },
      { text: 'Mùa đông cá ít, ngồi cả buổi mới được vài con.', season: 'winter' },
      { text: 'Sông này ông câu năm mươi năm rồi.' },
      { text: 'Muốn câu thì phải kiên nhẫn. Như làm ruộng vậy đó.' },
      { text: 'Chiều nay ông ra gốc đa đánh cờ, rảnh ghé coi.', minHearts: 3 },
    ],
    events: [
      { hearts: 2, title: 'Cần câu tre', lines: ['Ông Bảy đưa bạn một cây cần câu tre.', '"Ông làm dư. Ra bến sông mà câu, cá nhiều lắm."'], reward: { flag: 'rod', item: 'rod', qty: 1, text: 'Nhận cần câu tre' } },
      { hearts: 4, title: 'Bí quyết', lines: ['"Câu cá sáng sớm với chiều tối là ăn nhất. Trưa nắng cá lặn hết."'], reward: { item: 'fish', qty: 3, text: 'Nhận 3 con cá rô' } },
      { hearts: 6, title: 'Chuyện con nước', lines: ['Ông Bảy kể về trận lụt năm xưa, nước dâng tới gốc đa.', '"Làng mình đùm bọc nhau mà qua hết. Con nhớ nghe, ở làng là phải thương nhau."'] },
      { hearts: 8, title: 'Con cá lớn', lines: ['"Ông nghe nói dưới khúc sông có con cá chép vàng to lắm. Ông già rồi, con thử câu coi."'], reward: { flag: 'legend_fish', text: 'Mở khóa cá chép vàng (câu ở sông mùa xuân)' } },
    ],
  },
  {
    id: 'co_mai', name: 'Cô Mai', role: 'cô giáo trường làng', sheet: 4, portrait: P.npc_co_mai,
    birthday: { season: 'spring', day: 12 }, home: 'home_mai',
    loves: ['chrysanthemum', 'peach_blossom', 'pres_strawberry', 'dried_banana'], likes: ['strawberry', 'grape', 'milk', 'honey', 'watermelon'], dislikes: ['truffle', 'garlic', 'ore_iron'],
    schedule: {
      base: [[h(6), 'home'], [h(7, 30), 'school'], [h(15), 'schoolyard'], [h(16), 'market'], [h(18), 'home']],
      sunday: [[h(6), 'home'], [h(9), 'garden_gate'], [h(12), 'quan_in'], [h(15), 'banyan'], [h(18), 'home']],
    },
    lines: [
      { text: 'Chào em. Cô dạy lớp một ở trường làng. Bé Tí nghịch lắm, gặp nó thì nhắc nó học bài giùm cô.', once: 'hello' },
      { text: 'Mùa xuân hoa nở, học trò cũng lười hẳn.', season: 'spring' },
      { text: 'Trời mưa đường trơn, cô lo tụi nhỏ đi học té.', wet: true },
      { text: 'Chủ nhật cô hay đi dạo vườn thuốc của thầy Lang.' },
      { text: 'Em có thích đọc sách không? Trường có tủ sách nhỏ đó.', minHearts: 3 },
      { text: 'Cảm ơn em hay ghé thăm cô.', minHearts: 6 },
    ],
    events: [
      { hearts: 2, title: 'Giờ ra chơi', lines: ['Cô Mai nhờ bạn trông lũ nhỏ một lát.', 'Tụi nhỏ vây quanh hỏi đủ thứ chuyện về nông trại.'], choice: { q: 'Bạn kể chuyện gì?', options: [{ label: 'Chuyện con trâu', reply: 'Tụi nhỏ cười lăn cười bò.', love: 50 }, { label: 'Cách trồng cây', reply: 'Tụi nhỏ nghe chăm chú. Cô Mai gật gù.', love: 40 }] } },
      { hearts: 4, title: 'Vườn trường', lines: ['"Cô muốn làm vườn rau cho tụi nhỏ học. Em cho cô xin ít hạt nha."', 'Cô Mai tặng lại bạn một túi hạt hoa cúc tự ươm.'], reward: { item: 'seed_chrysanthemum', qty: 10, text: 'Nhận 10 hạt hoa cúc' } },
      { hearts: 6, title: 'Lá thư', lines: ['Cô Mai đưa bạn một lá thư của học trò: "Con muốn lớn lên làm nông dân như anh/chị!"', 'Cô cười: "Em làm gương cho tụi nhỏ rồi đó."'] },
      { hearts: 8, title: 'Buổi chiều bên sông', lines: ['Cô Mai và bạn ngồi bên bến sông ngắm hoàng hôn.', '"Cô từng muốn lên thành phố dạy. Giờ cô thấy ở đây là nhà."'] },
    ],
  },
  {
    id: 'be_ti', name: 'Bé Tí', role: 'con nít nghịch nhất làng', sheet: 5, portrait: P.npc_be_ti,
    birthday: { season: 'summer', day: 10 }, home: 'home_ti',
    loves: ['watermelon', 'pres_strawberry', 'juice_watermelon', 'honey'], likes: ['strawberry', 'corn', 'sweet_potato', 'egg', 'mango'], dislikes: ['cabbage', 'garlic', 'kohlrabi', 'scallion'],
    schedule: {
      base: [[h(6), 'home'], [h(7, 30), 'school'], [h(14), 'banyan'], [h(16), 'dock'], [h(18), 'home']],
      wet: [[h(6), 'home'], [h(7, 30), 'school'], [h(14), 'home']],
      sunday: [[h(6), 'home'], [h(8), 'plaza'], [h(11), 'field'], [h(15), 'dock'], [h(18), 'home']],
    },
    lines: [
      { text: 'Anh/chị là người mới hả? Nông trại có con gà không? Cho em coi với!', once: 'hello' },
      { text: 'Em ghét ăn rau! Rau đắng nghét.' },
      { text: 'Hè em được nghỉ học, sướng ghê!', season: 'summer' },
      { text: 'Mưa không đi chơi được, chán quá à.', wet: true },
      { text: 'Hồi nãy em thấy con cá bự lắm dưới sông!' },
      { text: 'Anh/chị là người lớn tốt nhất làng đó.', minHearts: 5 },
    ],
    events: [
      { hearts: 2, title: 'Kho báu', lines: ['Bé Tí kéo bạn ra sau nhà, chỉ một cái hộp thiếc.', '"Kho báu của em đó! Cho anh/chị một món nè."'], reward: { item: 'ore_copper', qty: 5, text: 'Nhận 5 quặng đồng "kho báu"' } },
      { hearts: 4, title: 'Con diều', lines: ['Diều của bé Tí mắc trên cây. Bạn trèo lên gỡ xuống.', '"Hoan hô! Anh/chị giỏi quá!"'] },
      { hearts: 6, title: 'Bài kiểm tra', lines: ['"Em được 10 điểm toán đó! Cô Mai khen em."'], choice: { q: 'Bạn nói gì?', options: [{ label: 'Giỏi quá, thưởng nè', reply: 'Bé Tí nhảy cẫng lên.', love: 60 }, { label: 'Cố gắng tiếp nha', reply: '"Dạ! Em sẽ học giỏi hơn nữa."', love: 40 }] } },
      { hearts: 8, title: 'Ước mơ', lines: ['"Lớn lên em muốn có nông trại to như của anh/chị."', 'Bé Tí đưa bạn một cục đá lấp lánh.'], reward: { item: 'ore_gold', qty: 3, text: 'Nhận 3 quặng vàng' } },
    ],
  },
  {
    id: 'anh_hai', name: 'Anh Hai', role: 'nông dân chăn trâu, bán vật nuôi', sheet: 6, portrait: P.npc_anh_hai,
    birthday: { season: 'fall', day: 2 }, home: 'home_hai',
    loves: ['rice_bag', 'milk', 'pres_cucumber'], likes: ['hay', 'rice', 'corn', 'wheat', 'egg', 'cucumber'], dislikes: ['flower_honey', 'sunflower'],
    schedule: {
      base: [[h(5), 'field'], [h(12), 'home'], [h(13), 'field'], [h(17), 'quan_in'], [h(19), 'home']],
      wet: [[h(6), 'home'], [h(9), 'field'], [h(14), 'home']],
    },
    lines: [
      { text: 'Muốn nuôi gà nuôi bò thì kiếm anh. Anh bán cả trâu nữa, trâu cày ruộng mau lắm.', once: 'hello' },
      { text: 'Con trâu nhà anh hiền lắm, không có húc ai đâu.' },
      { text: 'Mùa thu gặt lúa, bận tối mặt.', season: 'fall' },
      { text: 'Đông này nhớ đóng cửa chuồng, thú ra ngoài lạnh.', season: 'winter' },
      { text: 'Mưa thì cho thú ăn cỏ khô trong chuồng nghe.', wet: true },
      { text: 'Làm nông cực mà vui. Em thấy không?', minHearts: 4 },
    ],
    events: [
      { hearts: 2, title: 'Cỏ khô', lines: ['"Nhà anh dư cỏ khô, cho em một ít."'], reward: { item: 'hay', qty: 30, text: 'Nhận 30 cỏ khô' } },
      { hearts: 4, title: 'Người làng', lines: ['"Em mua thú của anh hoài, anh bớt cho em. Người làng với nhau."'], reward: { flag: 'discount_animals', text: 'Vật nuôi và công trình giảm 10%' } },
      { hearts: 6, title: 'Trâu đẻ', lines: ['Nửa đêm anh Hai gọi bạn phụ đỡ trâu đẻ.', 'Trâu con ra đời khỏe mạnh. Anh Hai cười rạng rỡ.'], choice: { q: 'Đặt tên cho trâu con?', options: [{ label: 'Ù Ù', reply: '"Ù Ù! Hay đó!"', love: 50 }, { label: 'Mập', reply: '"Ha ha, nó mập thiệt."', love: 50 }] } },
      { hearts: 8, title: 'Mùa gặt', lines: ['Cả làng ra đồng gặt lúa nhà anh Hai. Bạn cũng góp tay.', '"Có em phụ, năm nay gặt nhanh hẳn. Cảm ơn nghe!"'], reward: { item: 'rice_bag', qty: 5, text: 'Nhận 5 bao gạo' } },
    ],
  },
  {
    id: 'thay_lang', name: 'Thầy Lang', role: 'thầy thuốc nam, trồng vườn thuốc', sheet: 7, portrait: P.npc_thay_lang,
    birthday: { season: 'winter', day: 12 }, home: 'home_lang',
    loves: ['garlic', 'truffle', 'chrysanthemum', 'flower_honey'], likes: ['honey', 'scallion', 'kohlrabi', 'goat_milk', 'lychee'], dislikes: ['chili', 'watermelon'],
    schedule: {
      base: [[h(6), 'garden'], [h(11), 'home'], [h(13), 'garden_gate'], [h(16), 'banyan'], [h(18), 'home']],
      wet: [[h(6), 'home']],
    },
    lines: [
      { text: 'Cây thuốc nam trị được nhiều bệnh lắm. Con làm lụng mệt thì ghé thầy.', once: 'hello' },
      { text: 'Tỏi với hành là thuốc quý đó con.' },
      { text: 'Mưa thì thầy ở nhà sắc thuốc.', wet: true },
      { text: 'Đông lạnh nhớ giữ ấm, uống nước gừng.', season: 'winter' },
      { text: 'Vườn thuốc của thầy có hơn trăm loại cây.' },
      { text: 'Con khỏe mạnh là thầy mừng.', minHearts: 4 },
    ],
    events: [
      { hearts: 2, title: 'Chén trà', lines: ['Thầy Lang pha cho bạn chén trà thảo mộc.', 'Uống vào thấy người nhẹ hẳn.'] },
      { hearts: 4, title: 'Thuốc bổ', lines: ['"Thầy sắc cho con mấy thang thuốc bổ. Mệt quá thì uống, hồi sức lắm."'], reward: { item: 'tonic', qty: 5, text: 'Nhận 5 thuốc bổ (hồi 80 sức)' } },
      { hearts: 6, title: 'Bài thuốc', lines: ['"Con có muốn học nhận mặt cây thuốc không?"'], choice: { q: 'Bạn trả lời?', options: [{ label: 'Dạ, con muốn học', reply: 'Thầy Lang dẫn bạn đi khắp vườn, chỉ từng loại cây.', love: 70 }, { label: 'Để khi khác thầy ơi', reply: '"Ừ, lúc nào rảnh thì ghé."', love: 20 }] } },
      { hearts: 8, title: 'Truyền nghề', lines: ['"Thầy già rồi. Cái nghề này mong có người giữ."', '"Con cứ trồng tỏi, trồng cúc — đó cũng là giữ vị thuốc cho làng."'], reward: { item: 'tonic', qty: 10, text: 'Nhận 10 thuốc bổ' } },
    ],
  },
];

export const NPC = Object.fromEntries(NPCS.map((n) => [n.id, n])) as Record<string, NpcDef>;

/** Điểm tình cảm mỗi tim, tối đa 10 tim. */
export const LOVE_PER_HEART = 250;
export const GIFT_POINTS = { love: 80, like: 45, neutral: 20, dislike: -20 };
export const GIFTS_PER_WEEK = 2;
export const TALK_POINTS = 20;
export const WEEKDAY = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

// Đồ vật mới gắn với dân làng
ITEMS.tonic = { id: 'tonic', name: 'Thuốc bổ', kind: 'dish', sell: 60, buy: 0, icon: ['icons', ICONS.tonic], energy: 80 };
ITEMS.rod = { id: 'rod', name: 'Cần câu tre', kind: 'tool', sell: 0, buy: 0, icon: ['icons', ICONS.rod] };
